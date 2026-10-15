/**
 * Ancla el hash de respuestas exitosas de /v1 después de que el cliente
 * ya recibió el body. Los 402 no llegan: los corta x402 antes de este
 * middleware. 4xx/5xx no se anclan. El trabajo es fire-and-forget.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { waitUntil } from "@vercel/functions";
import {
  auditTag,
  buildAuditEnvelope,
  envelopeHash,
  isAuditEnabled,
  scheduleAnchor,
} from "../services/auditTrail.js";

const AUDITED = new Set(["GET /quote", "GET /route", "POST /alert"]);

function audited(req: Request): boolean {
  return AUDITED.has(`${req.method} ${req.path}`);
}

export function auditTrail(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!audited(req) || !isAuditEnabled()) {
      next();
      return;
    }

    const endpoint = `${req.method} ${req.baseUrl}${req.path}`;
    const originalJson = res.json.bind(res);
    let pending: { hex: string; mode: "paid" | "free" } | null = null;

    res.json = ((body: unknown) => {
      try {
        const status = res.statusCode;
        const okBody =
          !body ||
          typeof body !== "object" ||
          !("ok" in body) ||
          (body as { ok?: unknown }).ok !== false;
        if ((status === 200 || status === 201) && okBody) {
          const mode = res.locals.merktopFree === true ? "free" : "paid";
          const envelope = buildAuditEnvelope({
            endpoint,
            status,
            body,
            paid: mode === "paid",
            channel: mode === "free" ? "merktop" : "x402",
          });
          const hex = envelopeHash(envelope);
          res.setHeader("X-TIA-Audit-Hash", `sha-256:${hex}`);
          pending = { hex, mode };
        }
      } catch (err) {
        console.warn(
          "[TIA audit]",
          err instanceof Error ? err.message : "no se pudo calcular el hash"
        );
      }
      return originalJson(body);
    }) as typeof res.json;

    res.on("finish", () => {
      if (!pending) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const { hex, mode } = pending;
      const task = scheduleAnchor(hex, auditTag(endpoint, mode), endpoint, mode);
      waitUntil(task);
    });

    next();
  };
}
