/**
 * Alertas de tipo de cambio para /v1/alert (registro pagado x402) y
 * /v1/alert/check (disparo protegido por Bearer — cron o manual).
 *
 * Persistencia: Upstash Redis REST si hay UPSTASH_REDIS_REST_URL/TOKEN
 * (requerido en Vercel — las functions no comparten memoria); si no, un Map
 * en memoria para dev local, con warning explícito.
 *
 * Una alerta es one-shot: cruza el umbral → webhook POST → se elimina.
 * Si el webhook falla se conserva y se reintenta en el siguiente check.
 */
import { randomUUID } from "node:crypto";
import { getUsdMxnTicker } from "./fxRate.js";

export interface FxAlert {
  id: string;
  pair: "USD/MXN";
  direction: "above" | "below";
  threshold: number;
  webhookUrl: string;
  createdAt: string;
}

const MAX_ALERTS = 100;
const WEBHOOK_TIMEOUT_MS = 5_000;
const REDIS_KEY = "tia:fx-alerts";

// ── Validación de registro (borde del sistema) ──────────────────────────────

const PRIVATE_HOST =
  /^(localhost|.*\.local|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i;

export function validateAlertInput(body: unknown):
  | { ok: true; alert: FxAlert }
  | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const threshold = Number(b.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1000) {
    return { ok: false, error: "threshold debe ser un número entre 0 y 1000 (MXN por USD)" };
  }

  const direction = b.direction;
  if (direction !== "above" && direction !== "below") {
    return { ok: false, error: 'direction debe ser "above" o "below"' };
  }

  const rawUrl = typeof b.webhookUrl === "string" ? b.webhookUrl.trim() : "";
  if (!rawUrl || rawUrl.length > 500) {
    return { ok: false, error: "webhookUrl requerida (máx 500 chars)" };
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "webhookUrl inválida" };
  }
  const httpsOnly = process.env.NODE_ENV === "production";
  if (url.protocol !== "https:" && (httpsOnly || url.protocol !== "http:")) {
    return { ok: false, error: "webhookUrl debe ser https://" };
  }
  if (httpsOnly && PRIVATE_HOST.test(url.hostname)) {
    return { ok: false, error: "webhookUrl no puede apuntar a hosts privados" };
  }

  return {
    ok: true,
    alert: {
      id: randomUUID(),
      pair: "USD/MXN",
      direction,
      threshold,
      webhookUrl: url.toString(),
      createdAt: new Date().toISOString(),
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
  body: unknown
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const parsed = validateAlertInput(body);
  if (!parsed.ok) {
    return { status: 400, payload: { ok: false, error: parsed.error } };
  }
  const s = getAlertStore();
  if ((await s.count()) >= MAX_ALERTS) {
    return { status: 429, payload: { ok: false, error: `límite de ${MAX_ALERTS} alertas activas` } };
  }
  await s.put(parsed.alert);
  const { id, pair, direction, threshold, webhookUrl, createdAt } = parsed.alert;
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
      store: s.kind,
      note:
        "One-shot: dispara una vez al cruzar el umbral y se elimina. El disparo lo ejecuta POST /v1/alert/check (cron — ver SPEC.md).",
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
  webhookErrors: number;
  skipped?: string;
  store: AlertStore["kind"];
}

export async function checkAndFireAlerts(): Promise<CheckResult> {
  const s = getAlertStore();
  const t = await getUsdMxnTicker();

  // Nunca disparar con la tasa de fallback: falso positivo garantizado.
  if (!t.isLive) {
    return {
      ok: true,
      rate: null,
      rateIsLive: false,
      checked: 0,
      fired: 0,
      webhookErrors: 0,
      skipped: "fx_not_live",
      store: s.kind,
    };
  }

  const alerts = await s.list();
  let fired = 0;
  let webhookErrors = 0;

  for (const alert of alerts) {
    const crossed =
      alert.direction === "above" ? t.rate >= alert.threshold : t.rate <= alert.threshold;
    if (!crossed) continue;

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
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`webhook respondió ${res.status}`);
      await s.remove(alert.id);
      fired++;
    } catch (err) {
      // Se conserva la alerta y se reintenta en el siguiente check.
      webhookErrors++;
      console.warn(`[TIA] alert ${alert.id} webhook falló:`, err);
    }
  }

  return {
    ok: true,
    rate: t.rate,
    rateIsLive: true,
    checked: alerts.length,
    fired,
    webhookErrors,
    store: s.kind,
  };
}
