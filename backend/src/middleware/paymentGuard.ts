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
 * 2. Replay guard single-use: el hash del X-PAYMENT se marca como consumido
 *    en el PRIMER uso (SET NX atómico, store durable si hay Upstash), no
 *    después del settlement. Cierra la ventana "free shopping": N requests
 *    concurrentes con la misma prueba de pago → 1 sola pasa al facilitador,
 *    las demás reciben 409 sin tocar /verify ni /settle. Los reintentos
 *    legítimos del SDK cliente firman un pago NUEVO (header distinto), así
 *    que no les afecta.
 *
 * Si el store falla, el request pasa (fail-open) con warning: esta guarda es
 * defensa en profundidad — la defensa primaria sigue siendo el facilitador +
 * los sequence numbers de Stellar, que impiden re-settlear la misma tx.
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

export function paymentReplayGuard(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const raw = req.headers["x-payment"];
    if (typeof raw !== "string" || raw.length === 0) {
      // Sin pago: que x402Serve responda el 402 con los términos.
      next();
      return;
    }

    const digest = createHash("sha256").update(raw).digest("hex");
    const ttlMs = envInt("X402_REPLAY_TTL_SECONDS", 900) * 1000;

    let first: boolean;
    try {
      first = await getKvBackend().claimOnce(`tia:xpay:${digest}`, ttlMs);
    } catch (err) {
      console.warn(
        "[TIA] paymentReplayGuard: store falló — request pasa (defensa primaria: facilitador + sequence numbers):",
        err instanceof Error ? err.message : err
      );
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

    next();
  };
}
