/**
 * Alertas de tipo de cambio para /v1/alert (registro pagado x402) y
 * /v1/alert/check (disparo protegido por Bearer — cron o manual).
 *
 * Persistencia: Upstash Redis REST si hay UPSTASH_REDIS_REST_URL/TOKEN
 * (requerido en Vercel — las functions no comparten memoria); si no, un Map
 * en memoria para dev local, con warning explícito.
 *
 * Seguridad del webhook (hallazgos del security review del PR #6):
 *   - SSRF: https-only; el hostname se resuelve por DNS y se rechazan IPs
 *     privadas/loopback/link-local/metadata (IPv4 e IPv6, incluidas las
 *     v4-mapped). Formas decimal/octal/hex (2130706433, 0x7f000001) quedan
 *     normalizadas por el parser WHATWG de URL y caen en el mismo bloqueo.
 *     La validación corre al registrar Y otra vez antes de cada fetch.
 *     fetch con redirect:"manual": un 3xx cuenta como fallo, nunca se sigue.
 *     El body de la respuesta no se lee (se cancela) — 0 bytes ingeridos.
 *   - Abuso de egress: TTL (default 48 h), máximo de reintentos (default 3,
 *     luego se elimina), cuota por cliente (IP — default 5 activas) además
 *     del cap global de 100. Ownership challenge del webhook: follow-up
 *     explícito en SPEC.md.
 *
 * Una alerta es one-shot: cruza el umbral → webhook POST → se elimina.
 */
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getUsdMxnTicker } from "./fxRate.js";

export interface FxAlert {
  id: string;
  pair: "USD/MXN";
  direction: "above" | "below";
  threshold: number;
  webhookUrl: string;
  /** Clave de cuota — IP del cliente que pagó el registro. */
  client: string;
  createdAt: string;
  expiresAt: string;
  /** Entregas fallidas acumuladas; al llegar a maxRetries se elimina. */
  failures: number;
}

const MAX_ALERTS = 100;
const WEBHOOK_TIMEOUT_MS = 5_000;
const REDIS_KEY = "tia:fx-alerts";

function ttlHours(): number {
  const n = Number(process.env.ALERTS_TTL_HOURS);
  return Number.isFinite(n) && n >= 0 ? n : 48;
}
function maxRetries(): number {
  const n = Number(process.env.ALERTS_MAX_RETRIES);
  return Number.isFinite(n) && n >= 1 ? n : 3;
}
function maxPerClient(): number {
  const n = Number(process.env.ALERTS_MAX_PER_CLIENT);
  return Number.isFinite(n) && n >= 1 ? n : 5;
}

// ── Validación anti-SSRF del destino del webhook ─────────────────────────────

/** Rangos IPv4 no ruteables/reservados/metadata. */
function isBlockedIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 169 && b === 254) return true; // link-local + metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast, reservado, broadcast
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const h = ip.toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (/^fe[89ab]/.test(h)) return true; // link-local fe80::/10
  if (/^f[cd]/.test(h)) return true; // ULA fc00::/7
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  if (h.startsWith("::ffff:")) return true; // v4-mapped en forma hex: bloquear
  return false;
}

function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIPv4(ip);
  if (kind === 6) return isBlockedIPv6(ip);
  return true; // no es IP válida → fail-closed
}

/** Loopback literal en la URL cruda — única exención permitida fuera de prod. */
const RAW_LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/?#]|$)/i;

export interface WebhookTargetCheck {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Valida un destino de webhook. `allowLoopback` (default: NODE_ENV !==
 * "production") exime SOLO loopback escrito literal (localhost/127.0.0.1/::1)
 * para el harness local; todo lo demás sigue las reglas de producción.
 */
export async function checkWebhookTarget(
  raw: string,
  opts?: { allowLoopback?: boolean }
): Promise<WebhookTargetCheck> {
  const allowLoopback = opts?.allowLoopback ?? process.env.NODE_ENV !== "production";

  if (typeof raw !== "string" || !raw.trim() || raw.length > 500) {
    return { ok: false, error: "webhookUrl requerida (máx 500 chars)" };
  }
  const trimmed = raw.trim();

  if (allowLoopback && RAW_LOOPBACK.test(trimmed)) {
    try {
      return { ok: true, url: new URL(trimmed).toString() };
    } catch {
      return { ok: false, error: "webhookUrl inválida" };
    }
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "webhookUrl inválida" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "webhookUrl debe ser https://" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "webhookUrl no admite credenciales embebidas" };
  }

  // WHATWG URL ya normalizó formas decimal/octal/hex (2130706433 → 127.0.0.1).
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      return { ok: false, error: "webhookUrl no puede apuntar a IPs privadas/reservadas" };
    }
    return { ok: true, url: url.toString() };
  }

  // Hostname DNS: resolver y verificar TODAS las direcciones. Fail-closed.
  try {
    const addrs = await lookup(hostname, { all: true });
    if (addrs.length === 0) {
      return { ok: false, error: "webhookUrl no resuelve" };
    }
    for (const { address } of addrs) {
      if (isBlockedIp(address)) {
        return { ok: false, error: "webhookUrl resuelve a una IP privada/reservada" };
      }
    }
  } catch {
    return { ok: false, error: "webhookUrl no resuelve" };
  }

  return { ok: true, url: url.toString() };
}

async function validateAlertInput(body: unknown, client: string): Promise<
  { ok: true; alert: FxAlert } | { ok: false; error: string }
> {
  const b = (body ?? {}) as Record<string, unknown>;

  const threshold = Number(b.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1000) {
    return { ok: false, error: "threshold debe ser un número entre 0 y 1000 (MXN por USD)" };
  }

  const direction = b.direction;
  if (direction !== "above" && direction !== "below") {
    return { ok: false, error: 'direction debe ser "above" o "below"' };
  }

  const target = await checkWebhookTarget(
    typeof b.webhookUrl === "string" ? b.webhookUrl : ""
  );
  if (!target.ok || !target.url) {
    return { ok: false, error: target.error ?? "webhookUrl inválida" };
  }

  const now = Date.now();
  return {
    ok: true,
    alert: {
      id: randomUUID(),
      pair: "USD/MXN",
      direction,
      threshold,
      webhookUrl: target.url,
      client,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlHours() * 3600_000).toISOString(),
      failures: 0,
    },
  };
}

// ── Store: Upstash REST o memoria (dev) ─────────────────────────────────────

interface AlertStore {
  kind: "upstash" | "memory";
  put(alert: FxAlert): Promise<void>;
  list(): Promise<FxAlert[]>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
}

function upstashStore(url: string, token: string): AlertStore {
  async function cmd<T>(command: (string | number)[]): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`Upstash respondió ${res.status}`);
    const data = (await res.json()) as { result: T };
    return data.result;
  }
  return {
    kind: "upstash",
    async put(alert) {
      await cmd(["HSET", REDIS_KEY, alert.id, JSON.stringify(alert)]);
    },
    async list() {
      const flat = await cmd<string[]>(["HGETALL", REDIS_KEY]);
      const alerts: FxAlert[] = [];
      for (let i = 1; i < flat.length; i += 2) {
        try {
          alerts.push(JSON.parse(flat[i]) as FxAlert);
        } catch {
          /* entrada corrupta: se ignora */
        }
      }
      return alerts;
    },
    async remove(id) {
      await cmd(["HDEL", REDIS_KEY, id]);
    },
    async count() {
      return cmd<number>(["HLEN", REDIS_KEY]);
    },
  };
}

function memoryStore(): AlertStore {
  const map = new Map<string, FxAlert>();
  return {
    kind: "memory",
    async put(alert) {
      map.set(alert.id, alert);
    },
    async list() {
      return [...map.values()];
    },
    async remove(id) {
      map.delete(id);
    },
    async count() {
      return map.size;
    },
  };
}

let store: AlertStore | null = null;

export function getAlertStore(): AlertStore {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    store = upstashStore(url, token);
  } else {
    console.warn(
      "[TIA] alerts: sin UPSTASH_REDIS_REST_URL/TOKEN — store en memoria (efímero; en Vercel las alertas NO sobreviven entre invocaciones)"
    );
    store = memoryStore();
  }
  return store;
}

export async function registerAlert(
  body: unknown,
  client: string
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const parsed = await validateAlertInput(body, client || "unknown");
  if (!parsed.ok) {
    return { status: 400, payload: { ok: false, error: parsed.error } };
  }
  const s = getAlertStore();

  if ((await s.count()) >= MAX_ALERTS) {
    return { status: 429, payload: { ok: false, error: `límite global de ${MAX_ALERTS} alertas activas` } };
  }
  const mine = (await s.list()).filter((a) => a.client === parsed.alert.client);
  if (mine.length >= maxPerClient()) {
    return {
      status: 429,
      payload: { ok: false, error: `límite de ${maxPerClient()} alertas activas por cliente` },
    };
  }

  await s.put(parsed.alert);
  const { id, pair, direction, threshold, webhookUrl, createdAt, expiresAt } = parsed.alert;
  return {
    status: 201,
    payload: {
      ok: true,
      apiVersion: "1",
      alertId: id,
      status: "active",
      pair,
      direction,
      threshold,
      webhookUrl,
      createdAt,
      expiresAt,
      maxRetries: maxRetries(),
      store: s.kind,
      note:
        "One-shot: dispara una vez al cruzar el umbral y se elimina. Expira sin disparar tras el TTL. El disparo lo ejecuta POST /v1/alert/check (cron — ver SPEC.md).",
    },
  };
}

// ── Check & fire ─────────────────────────────────────────────────────────────

export interface CheckResult {
  ok: boolean;
  rate: number | null;
  rateIsLive: boolean;
  checked: number;
  fired: number;
  /** Alertas eliminadas por TTL vencido. */
  expired: number;
  webhookErrors: number;
  /** Eliminadas por alcanzar maxRetries o por destino ya no permitido. */
  dropped: number;
  skipped?: string;
  store: AlertStore["kind"];
}

export async function checkAndFireAlerts(): Promise<CheckResult> {
  const s = getAlertStore();
  const base: Omit<CheckResult, "skipped"> = {
    ok: true,
    rate: null,
    rateIsLive: false,
    checked: 0,
    fired: 0,
    expired: 0,
    webhookErrors: 0,
    dropped: 0,
    store: s.kind,
  };

  const t = await getUsdMxnTicker();

  // Nunca disparar con la tasa de fallback: falso positivo garantizado.
  if (!t.isLive) {
    return { ...base, skipped: "fx_not_live" };
  }

  const alerts = await s.list();
  const result: CheckResult = { ...base, rate: t.rate, rateIsLive: true, checked: alerts.length };
  const now = Date.now();

  for (const alert of alerts) {
    if (now >= Date.parse(alert.expiresAt)) {
      await s.remove(alert.id);
      result.expired++;
      continue;
    }

    const crossed =
      alert.direction === "above" ? t.rate >= alert.threshold : t.rate <= alert.threshold;
    if (!crossed) continue;

    // Revalidar el destino en el momento del disparo (DNS puede haber cambiado
    // desde el registro). Destino bloqueado → se elimina, no se reintenta.
    const target = await checkWebhookTarget(alert.webhookUrl);
    if (!target.ok) {
      console.warn(`[TIA] alert ${alert.id} destino bloqueado al disparar: ${target.error}`);
      await s.remove(alert.id);
      result.dropped++;
      continue;
    }

    try {
      const res = await fetch(alert.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fx-alert",
          alertId: alert.id,
          pair: alert.pair,
          direction: alert.direction,
          threshold: alert.threshold,
          rate: t.rate,
          source: t.source,
          firedAt: new Date().toISOString(),
        }),
        redirect: "manual", // jamás seguir redirects: 3xx cuenta como fallo
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      // No ingerimos el body de la respuesta (límite de bytes = 0).
      await res.body?.cancel().catch(() => undefined);
      if (!res.ok) throw new Error(`webhook respondió ${res.status}`);
      await s.remove(alert.id);
      result.fired++;
    } catch (err) {
      result.webhookErrors++;
      alert.failures += 1;
      if (alert.failures >= maxRetries()) {
        console.warn(`[TIA] alert ${alert.id} eliminada tras ${alert.failures} fallos:`, err);
        await s.remove(alert.id);
        result.dropped++;
      } else {
        await s.put(alert); // persistir contador; reintenta al siguiente check
        console.warn(
          `[TIA] alert ${alert.id} webhook falló (${alert.failures}/${maxRetries()}):`,
          err
        );
      }
    }
  }

  return result;
}
