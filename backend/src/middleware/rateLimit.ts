import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getKvBackend } from "../services/kvStore.js";

/**
 * Rate limiting sliding-window por IP (blindaje Capa 4).
 *
 * Ventana deslizante real (no fixed-window): cada hit se registra con su
 * timestamp y se cuentan solo los hits vivos dentro de la ventana, así no hay
 * ráfagas dobles en el borde entre dos ventanas.
 *
 * Store: Upstash (ZADD/ZCARD — durable entre invocaciones serverless) o
 * memoria por instancia como fallback dev (ver kvStore.ts).
 *
 * Si el store falla (Upstash caído), el request PASA (fail-open) con warning:
 * el rate limit protege disponibilidad; negar todo el tráfico porque Redis
 * está caído sería un DoS autoinfligido. La autenticación/pago NO depende de
 * esto — x402 y los Bearer secrets siguen aplicando.
 */
export interface RateLimitOptions {
  /** Máx. requests por ventana por IP. */
  max: number;
  /** Ventana en ms. */
  windowMs: number;
  /** Prefijo de clave para aislar contadores por grupo de rutas. */
  keyPrefix: string;
}

export function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function rateLimit(opts: RateLimitOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? "unknown";
    const key = `tia:rl:${opts.keyPrefix}:${ip}`;

    let count: number;
    try {
      const kv = getKvBackend();
      count = await kv.slidingWindowHit(
        key,
        opts.windowMs,
        `${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
      );
    } catch (err) {
      console.warn(
        `[TIA] rateLimit(${opts.keyPrefix}): store falló — request pasa sin contar:`,
        err instanceof Error ? err.message : err
      );
      next();
      return;
    }

    if (count > opts.max) {
      res.setHeader("Retry-After", Math.ceil(opts.windowMs / 1000));
      res.status(429).json({
        ok: false,
        error: "rate_limited",
        message: `Máximo ${opts.max} requests por ${Math.ceil(opts.windowMs / 1000)}s por cliente. Reintenta más tarde.`,
      });
      return;
    }

    next();
  };
}
