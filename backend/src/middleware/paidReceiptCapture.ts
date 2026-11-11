/**
 * Antes de la liquidación guarda el JSON del handler (quote, route o alert)
 * ligado al pago. Cuando la respuesta 2xx ya trae PAYMENT-RESPONSE, liga
 * ese registro al hash de la tx. Las llamadas gratis de Merktop no se guardan.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { txHashFromPaymentResponse } from "./x402PhaseLog.js";
import { confirmPaidResponse, savePaidResponse } from "../services/paidReceiptStore.js";
import { fingerprintFromPaymentHeader } from "../services/stellarPayment.js";

const CAPTURED = new Set(["GET /quote", "GET /route", "POST /alert"]);

function headerValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export function paidReceiptCapture(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!CAPTURED.has(`${req.method} ${req.path}`) || res.locals.merktopFree === true) {
      next();
      return;
    }
    const paymentHeader = req.get("payment-signature") || req.get("x-payment");
    if (!paymentHeader) {
      next();
      return;
    }

    const previousJson = res.json.bind(res);
    let saved: Promise<string | null> = Promise.resolve(null);

    res.json = ((body: unknown) => {
      const sent = previousJson(body);
      const okStatus = res.statusCode >= 200 && res.statusCode < 300;
      const okBody =
        !!body &&
        typeof body === "object" &&
        (!("ok" in body) || (body as { ok?: unknown }).ok !== false);
      if (!okStatus || !okBody) return sent;

      const fingerprint = fingerprintFromPaymentHeader(paymentHeader);
      const audit = headerValue(res.getHeader("X-TIA-Audit-Hash"));
      saved = savePaidResponse({
        endpoint: `${req.method} ${req.baseUrl}${req.path}`,
        payload: body,
        auditHash: audit,
        payer: fingerprint?.payer ?? null,
        amount: fingerprint?.amount ?? null,
        payTo: fingerprint?.payTo ?? null,
      }).catch((err: unknown) => {
        console.warn(
          "[TIA paid-receipt] no se pudo guardar:",
          err instanceof Error ? err.message : "store"
        );
        return null;
      });
      return sent;
    }) as typeof res.json;

    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const txHash = txHashFromPaymentResponse(
        res.getHeader("payment-response") ?? res.getHeader("x-payment-response")
      );
      if (!txHash) return;
      void saved
        .then((id) => {
          if (!id) return;
          return confirmPaidResponse(id, txHash);
        })
        .catch((err: unknown) => {
          console.warn(
            "[TIA paid-receipt] no se pudo ligar la tx:",
            err instanceof Error ? err.message : "store"
          );
        });
    });

    next();
  };
}
