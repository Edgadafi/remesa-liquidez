import { createHash, timingSafeEqual } from "node:crypto";
import { StrKey } from "@stellar/stellar-sdk";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getKvBackend } from "../services/kvStore.js";
import { envInt } from "./rateLimit.js";

/**
 * Cupo gratis del canal Merktop — montado ANTES del middleware x402 de /v1,
 * solo sobre las rutas cobradas (GET /quote, GET /route, POST /alert).
 *
 * Reglas:
 *   - Activación por X-TIA-Channel-Key, comparada en TIEMPO CONSTANTE contra
 *     el sha256 guardado en MERKTOP_CHANNEL_KEY_HASH. La llave en claro no
 *     existe en el server ni toca ningún log.
 *   - X-TIA-Agent debe ser una cuenta Stellar válida (StrKey ed25519 con
 *     checksum, no solo regex). Inválida o ausente → 400.
 *   - Cupo durable en Upstash con INCR atómico: total del canal
 *     (MERKTOP_FREE_TOTAL, default 100) y por agente (MERKTOP_FREE_PER_AGENT,
 *     default 20). Patrón increment-check-revert: nunca se sub-cuenta; un
 *     overshoot concurrente se revierte.
 *   - Vencimiento MERKTOP_FREE_EXPIRES_AT (ISO). Vencido, sin cupo, sin
 *     llave o llave inválida → next() y el x402 normal cobra (402). El flujo
 *     de pago existente no cambia.
 *   - Llamada gratis concedida → responde el handler normal (sin pago) con
 *     X-TIA-Free-Remaining. Si termina en 5xx, el incremento se revierte.
 *   - Registro: una línea por llamada gratis (fecha, endpoint, agente,
 *     sha256 de la respuesta) en consola + lista durable exportable vía
 *     GET /v1/channel/merktop/usage?report=1.
 *
 * Fail-safe, no fail-open: ante cualquier duda (config incompleta, store
 * caído, producción sin store durable) NO se regala la llamada — se cobra.
 */

const KEY_TOTAL = "tia:merktop:total";
const KEY_LOG = "tia:merktop:log";
const LOG_MAX = 500;

function agentKey(agent: string): string {
  return `tia:merktop:agent:${agent}`;
}

/** Rutas con cupo gratis, relativas al mount /v1. /alert/check queda fuera. */
const FREE_ROUTES = new Set(["GET /quote", "GET /route", "POST /alert"]);

export interface MerktopConfig {
  hashHex: string;
  expiresAtMs: number;
  total: number;
  perAgent: number;
}

/** null → canal no configurado (hash o vencimiento ausentes/inválidos). */
export function getMerktopConfig(): MerktopConfig | null {
  const hashHex = process.env.MERKTOP_CHANNEL_KEY_HASH?.trim().toLowerCase();
  if (!hashHex || !/^[0-9a-f]{64}$/.test(hashHex)) return null;
  const expiresAtMs = Date.parse(process.env.MERKTOP_FREE_EXPIRES_AT?.trim() ?? "");
  if (!Number.isFinite(expiresAtMs)) return null;
  return {
    hashHex,
    expiresAtMs,
    total: envInt("MERKTOP_FREE_TOTAL", 100),
    perAgent: envInt("MERKTOP_FREE_PER_AGENT", 20),
  };
}

/**
 * Comparación en tiempo constante: se hashea lo presentado (longitud fija de
 * 32 bytes) y se compara con timingSafeEqual. Ni la llave ni su hash
 * presentado se loguean jamás.
 */
export function channelKeyMatches(presented: unknown, hashHex: string): boolean {
  if (typeof presented !== "string" || presented.length === 0 || presented.length > 256) {
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== 32) return false;
  const presentedHash = createHash("sha256").update(presented).digest();
  return timingSafeEqual(presentedHash, expected);
}

function productionLike(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export function merktopFreeTier(): RequestHandler {
  let warnedNoDurable = false;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!FREE_ROUTES.has(`${req.method} ${req.path}`)) {
      next();
      return;
    }

    const cfg = getMerktopConfig();
    if (!cfg) {
      next();
      return;
    }

    const presentedKey = req.headers["x-tia-channel-key"];
    if (presentedKey === undefined) {
      // Sin llave: flujo x402 normal, sin ruido en logs.
      next();
      return;
    }
    if (!channelKeyMatches(presentedKey, cfg.hashHex)) {
      // Llave inválida → se cobra (402 vía x402). Nunca loguear el valor.
      console.warn("[TIA] merktop: X-TIA-Channel-Key inválida — sigue el cobro x402 normal");
      next();
      return;
    }

    // Plazo vencido → se cobra, aunque la llave sea válida.
    if (Date.now() >= cfg.expiresAtMs) {
      next();
      return;
    }

    const agentRaw = req.headers["x-tia-agent"];
    const agent = typeof agentRaw === "string" ? agentRaw.trim() : "";
    if (!StrKey.isValidEd25519PublicKey(agent)) {
      res.status(400).json({
        ok: false,
        error: "invalid_agent",
        message: "X-TIA-Agent debe ser una cuenta pública Stellar válida (G…, StrKey).",
      });
      return;
    }

    const kv = getKvBackend();
    if (productionLike() && kv.kind !== "upstash") {
      // Sin store durable el cupo no es confiable entre instancias: en
      // producción NO se regala — se cobra. (Mismo criterio que el replay
      // guard, pero aquí el fail-safe es el 402, no un 503.)
      if (!warnedNoDurable) {
        warnedNoDurable = true;
        console.error(
          "[TIA] merktop: producción sin UPSTASH_REDIS_REST_URL/TOKEN — cupo gratis deshabilitado, se cobra x402"
        );
      }
      next();
      return;
    }

    // INCR atómico de ambos contadores; si cualquiera se pasa del límite se
    // revierte lo incrementado y el request sigue al x402 (402).
    let total = 0;
    let agentCount = 0;
    let totalIncremented = false;
    let agentIncremented = false;
    try {
      total = await kv.incr(KEY_TOTAL);
      totalIncremented = true;
      agentCount = await kv.incr(agentKey(agent));
      agentIncremented = true;
    } catch (err) {
      console.warn(
        "[TIA] merktop: store falló — se cobra x402:",
        err instanceof Error ? err.message : err
      );
      if (totalIncremented) {
        kv.decrBy(KEY_TOTAL, 1).catch(() => undefined);
      }
      if (agentIncremented) {
        kv.decrBy(agentKey(agent), 1).catch(() => undefined);
      }
      next();
      return;
    }

    if (total > cfg.total || agentCount > cfg.perAgent) {
      try {
        await kv.decrBy(KEY_TOTAL, 1);
        await kv.decrBy(agentKey(agent), 1);
      } catch (err) {
        console.warn(
          "[TIA] merktop: no se pudo revertir el overshoot:",
          err instanceof Error ? err.message : err
        );
      }
      // Cupo agotado (del canal o del agente) → x402 normal.
      next();
      return;
    }

    // ── Llamada gratis concedida ─────────────────────────────────────────
    const remaining = Math.max(0, Math.min(cfg.total - total, cfg.perAgent - agentCount));
    res.setHeader("X-TIA-Free-Remaining", String(remaining));
    res.locals.merktopFree = true;

    // Hash de la cotización servida: interceptar res.json (todos los
    // handlers de /v1 responden JSON).
    let bodySha256: string | null = null;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      try {
        bodySha256 = createHash("sha256").update(JSON.stringify(body)).digest("hex");
      } catch {
        bodySha256 = null;
      }
      return originalJson(body);
    }) as typeof res.json;

    const endpoint = `${req.method} ${req.baseUrl}${req.path}`;
    res.on("finish", () => {
      if (res.statusCode >= 500) {
        // La llamada falló del lado del server: no consume cupo.
        kv.decrBy(KEY_TOTAL, 1).catch(() => undefined);
        kv.decrBy(agentKey(agent), 1).catch(() => undefined);
        return;
      }
      const entry = {
        at: new Date().toISOString(),
        channel: "merktop",
        endpoint,
        agent,
        status: res.statusCode,
        quoteSha256: bodySha256,
        remaining,
      };
      console.log(
        `[TIA] merktop free-call ${entry.at} | ${endpoint} | ${agent} | status=${entry.status} | sha256=${bodySha256 ? `${bodySha256.slice(0, 16)}…` : "n/a"} | remaining=${remaining}`
      );
      kv.listPush(KEY_LOG, JSON.stringify(entry), LOG_MAX).catch((err) =>
        console.warn(
          "[TIA] merktop: no se pudo persistir la línea de registro:",
          err instanceof Error ? err.message : err
        )
      );
    });

    next();
  };
}

/**
 * GET /v1/channel/merktop/usage[?agent=G…][&report=1]
 * Protegido con la misma llave (constant-time). No pasa por x402 porque no
 * está en la tabla de rutas cobradas (mismo mecanismo que /v1/alert/check).
 */
export const merktopUsageHandler: RequestHandler = async (req, res) => {
  const cfg = getMerktopConfig();
  if (!cfg) {
    res.status(503).json({ ok: false, error: "channel_not_configured" });
    return;
  }
  if (!channelKeyMatches(req.headers["x-tia-channel-key"], cfg.hashHex)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  try {
    const kv = getKvBackend();
    const usedTotal = await kv.getNum(KEY_TOTAL);

    let agentInfo: Record<string, unknown> | undefined;
    if (req.query.agent !== undefined) {
      const agent = String(req.query.agent).trim();
      if (!StrKey.isValidEd25519PublicKey(agent)) {
        res.status(400).json({
          ok: false,
          error: "invalid_agent",
          message: "agent debe ser una cuenta pública Stellar válida (G…, StrKey).",
        });
        return;
      }
      const usedAgent = await kv.getNum(agentKey(agent));
      agentInfo = {
        address: agent,
        limit: cfg.perAgent,
        used: usedAgent,
        remaining: Math.max(0, cfg.perAgent - usedAgent),
      };
    }

    const payload: Record<string, unknown> = {
      ok: true,
      channel: "merktop",
      expiresAt: new Date(cfg.expiresAtMs).toISOString(),
      expired: Date.now() >= cfg.expiresAtMs,
      total: {
        limit: cfg.total,
        used: usedTotal,
        remaining: Math.max(0, cfg.total - usedTotal),
      },
      perAgentLimit: cfg.perAgent,
      store: kv.kind,
      ...(agentInfo ? { agent: agentInfo } : {}),
    };

    if (req.query.report !== undefined) {
      const lines = await kv.listAll(KEY_LOG);
      payload.report = lines.flatMap((line) => {
        try {
          return [JSON.parse(line) as Record<string, unknown>];
        } catch {
          return [];
        }
      });
    }

    res.json(payload);
  } catch (err) {
    console.error(
      "[GET /v1/channel/merktop/usage] error:",
      err instanceof Error ? err.message : err
    );
    res.status(500).json({ ok: false, error: "internal_error" });
  }
};
