import { createHash } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getKvBackend } from "../services/kvStore.js";
import { envInt } from "./rateLimit.js";

/**
 * Guardas del header X-PAYMENT, montadas ANTES de x402Serve (Capa 3/4).
 *
 * 1. Límite de tamaño: un payload de pago legítimo (JSON base64 con auth
 *    entries Soroban) cabe de sobra en 8 KB; headers gigantes solo sirven
 *    para gastar CPU/memoria antes de llegar al facilitador.
 *
 * 2. Replay guard single-use: el hash de (X-PAYMENT + método + URL del
 *    recurso) se marca como consumido en el PRIMER uso (SET NX atómico,
 *    store durable). Cierra la ventana "free shopping": N requests
 *    concurrentes con la misma prueba de pago → 1 sola pasa al facilitador,
 *    las demás reciben 409 sin tocar /verify ni /settle.
 *
 *    Semántica (hallazgos del security review del PR #8):
 *    - La clave incluye método + originalUrl: quemar un proof contra la ruta
 *      B no bloquea su uso legítimo en la ruta A (el scheme exact ya liga el
 *      pago al resource.url; la clave refleja ese binding).
 *    - Si el request termina SIN servir el recurso (status no-2xx: verify
 *      falló, facilitador caído, etc.) la claim se libera — el pagador nunca
 *      recibió nada y puede reintentar con el mismo proof. El 409 aplica a
 *      duplicados en vuelo y a replays después de un 200.
 *
 * Fallos del store: fail-open SOLO fuera de producción (dev). En producción
 * (NODE_ENV=production / VERCEL, u override X402_REPLAY_STRICT=true|false)
 * el guard es fail-closed: sin store durable o con el store caído, los
 * requests CON X-PAYMENT reciben 503 — nunca se sirve un recurso pagado sin
 * protección anti-replay. Los requests sin pago no se ven afectados (el 402
 * de descubrimiento sigue funcionando).
 */

const MAX_PAYMENT_HEADER_BYTES = 8 * 1024;

export function paymentHeaderLimits(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.headers["x-payment"];

    if (Array.isArray(raw)) {
      res.status(400).json({
        ok: false,
        error: "invalid_payment_header",
        message: "Se recibió más de un header X-PAYMENT.",
      });
      return;
    }

    if (raw && Buffer.byteLength(raw, "utf8") > MAX_PAYMENT_HEADER_BYTES) {
      res.status(400).json({
        ok: false,
        error: "payment_header_too_large",
        message: `X-PAYMENT supera el máximo de ${MAX_PAYMENT_HEADER_BYTES} bytes.`,
      });
      return;
    }

    next();
  };
}

/**
 * Fail-closed en producción; override explícito con X402_REPLAY_STRICT.
 * Leído por request para que un cambio de env en Vercel aplique sin deploy.
 */
function replayStrict(): boolean {
  const override = process.env.X402_REPLAY_STRICT;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export function paymentReplayGuard(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const raw = req.headers["x-payment"];
    if (typeof raw !== "string" || raw.length === 0) {
      // Sin pago: que x402Serve responda el 402 con los términos.
      next();
      return;
    }

    const strict = replayStrict();
    const kv = getKvBackend();

    if (strict && kv.kind !== "upstash") {
      console.error(
        "[TIA] paymentReplayGuard: producción sin store durable — request pagado rechazado (configura UPSTASH_REDIS_REST_URL/TOKEN)"
      );
      res.status(503).json({
        ok: false,
        error: "replay_protection_unavailable",
        message:
          "El servidor no puede garantizar protección anti-replay ahora mismo. Reintenta más tarde.",
      });
      return;
    }

    // La clave liga el proof al recurso concreto (método + URL con query),
    // igual que el binding del scheme exact — un proof quemado en otra ruta
    // no bloquea esta.
    const digest = createHash("sha256")
      .update(raw)
      .update("\n")
      .update(`${req.method} ${req.originalUrl}`)
      .digest("hex");
    const key = `tia:xpay:${digest}`;
    const ttlMs = envInt("X402_REPLAY_TTL_SECONDS", 900) * 1000;

    let first: boolean;
    try {
      first = await kv.claimOnce(key, ttlMs);
    } catch (err) {
      console.warn(
        "[TIA] paymentReplayGuard: store falló:",
        err instanceof Error ? err.message : err
      );
      if (strict) {
        res.status(503).json({
          ok: false,
          error: "replay_protection_unavailable",
          message:
            "El servidor no puede garantizar protección anti-replay ahora mismo. Reintenta más tarde.",
        });
        return;
      }
      // Solo dev: pasa con warning (defensa primaria: facilitador + sequence
      // numbers de Stellar).
      next();
      return;
    }

    if (!first) {
      // Nunca loguear el header: contiene la autorización de pago firmada.
      console.warn(`[TIA] X-PAYMENT reusado bloqueado (sha256=${digest.slice(0, 16)}…)`);
      res.status(409).json({
        ok: false,
        error: "payment_replayed",
        message:
          "Esta prueba de pago ya fue usada. Cada request requiere un pago firmado nuevo.",
      });
      return;
    }

    // Si el request NO terminó en recurso servido (verify falló, facilitador
    // caído…), liberar la claim: el pagador nunca recibió nada y su proof
    // sigue siendo válido para reintentar. Tras un 2xx la claim persiste el
    // TTL completo — ese es exactamente el replay que queremos bloquear.
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        kv.del(key).catch((err) =>
          console.warn(
            "[TIA] paymentReplayGuard: no se pudo liberar la claim:",
            err instanceof Error ? err.message : err
          )
        );
      }
    });

    next();
  };
}
