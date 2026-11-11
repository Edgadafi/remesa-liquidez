import { Router, type Request, type Response } from "express";
import { getUsdMxnTicker } from "../services/fxRate.js";
import { estimateRoutes } from "../services/routeEstimator.js";
import { checkAndFireAlerts, registerAlert } from "../services/alerts.js";
import { requireCronSecret } from "../middleware/overrideAuth.js";
import { merktopUsageHandler } from "../middleware/merktopFreeTier.js";
import { lookupAudit, parseAuditHash } from "../services/auditTrail.js";
import { resolvePaidReceipt } from "../services/paidReceiptStore.js";
import { receipt, type ReceiptPayload } from "../lib/receipt.js";
import { waitUntil } from "@vercel/functions";
import { randomUUID } from "node:crypto";

/** Tope del anclaje en segundo plano. No bloquea la respuesta. */
const RECEIPT_ANCHOR_BUDGET_MS = 8_000;

/**
 * Ancla el recibo después de responder. waitUntil mantiene la función viva
 * en Vercel sin retener el body; a los 8 s se suelta aunque Nirium no conteste.
 */
function anchorRouteReceipt(payload: ReceiptPayload): void {
  const task = new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      console.warn("[GET /v1/route] receipt anchor exceeded 8s");
      resolve();
    }, RECEIPT_ANCHOR_BUDGET_MS);
    void receipt.anchorReceipt(payload).finally(() => {
      clearTimeout(timer);
      resolve();
    });
  });
  waitUntil(task);
}

const router = Router();

/**
 * GET /v1/channel/merktop/usage — restante por agente y del canal + venci-
 * miento (+?report=1 exporta el registro de llamadas gratis). Protegido con
 * X-TIA-Channel-Key (constant-time); no está en la tabla x402, así que no
 * se cobra — mismo mecanismo que /v1/alert/check.
 */
router.get("/channel/merktop/usage", merktopUsageHandler);

/**
 * GET /v1/audit/:hash — CID de un anclaje ya guardado. No está en la tabla
 * x402 (no se cobra) y merktopFreeTier no lo cuenta. Acepta sha-256:<hex>
 * o <hex>. No sugiere nirium-cli verify (bug #139 en modo solo hash).
 */
router.get("/audit/:hash", async (req: Request, res: Response) => {
  const hex = parseAuditHash(req.params.hash ?? "");
  if (!hex) {
    res.status(400).json({ ok: false, error: "hash inválido" });
    return;
  }
  try {
    const found = await lookupAudit(hex);
    if (!found) {
      res.status(404).json({ ok: false, status: "unknown" });
      return;
    }
    if ("pending" in found) {
      res.status(404).json({ ok: false, status: "pending" });
      return;
    }
    const { record } = found;
    res.json({
      ok: true,
      hash: `sha-256:${hex}`,
      cid: record.cid,
      gatewayUrl:
        record.gatewayUrl ?? `https://gateway.pinata.cloud/ipfs/${record.cid}`,
      anchoredAt: record.anchoredAt,
      attestedBy: record.attestedBy ?? null,
      signatureStatement: `nirium-audit-v1:${hex}`,
    });
  } catch (err: unknown) {
    console.error(
      "[GET /v1/audit] error:",
      err instanceof Error ? err.message : "lookup failed"
    );
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

const TX_HASH = /^[0-9a-fA-F]{64}$/;

/**
 * GET /v1/receipt/tx/:txHash — payload que el handler ya había producido
 * para un pago liquidado. Gratis: no está en la tabla x402.
 *
 * 200 confirmed: la tx existe y paga a STELLAR_PAY_TO, y tenemos el JSON.
 * 200 pending: hay registro pero la cadena aún no confirma ese pago.
 * 404: no hay tx, no paga a payTo, o no guardamos payload.
 */
router.get("/receipt/tx/:txHash", async (req: Request, res: Response) => {
  const txHash = (req.params.txHash ?? "").trim().toLowerCase();
  if (!TX_HASH.test(txHash)) {
    res.status(400).json({ ok: false, error: "invalid_tx_hash" });
    return;
  }
  try {
    const found = await resolvePaidReceipt(txHash);
    if (found.status === "missing") {
      res.status(404).json({ ok: false, error: "not_found" });
      return;
    }
    if (found.status === "pending") {
      res.json({ ok: true, status: "pending", txHash });
      return;
    }
    const { record } = found;
    res.json({
      ok: true,
      status: "confirmed",
      txHash,
      endpoint: record.endpoint,
      auditHash: record.auditHash,
      storedAt: record.storedAt,
      payload: record.payload,
    });
  } catch (err: unknown) {
    console.error(
      "[GET /v1/receipt/tx] error:",
      err instanceof Error ? err.message : "lookup failed"
    );
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/**
 * GET /v1/receipt/:cid — Verify and return a Nirium receipt by CID.
 * Free endpoint (not charged via x402 or merktop).
 */
router.get("/receipt/:cid", async (req: Request, res: Response) => {
  const { cid } = req.params;
  if (!cid?.trim()) {
    res.status(400).json({ ok: false, error: "cid required" });
    return;
  }

  try {
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    
    // Fetch the IPFS document
    let fetchResponse: globalThis.Response;
    try {
      fetchResponse = await fetch(gatewayUrl, {
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      res.status(504).json({ ok: false, error: "gateway_timeout" });
      return;
    }

    if (!fetchResponse.ok) {
      res.status(404).json({ ok: false, error: "not_found" });
      return;
    }

    let doc: Record<string, unknown>;
    try {
      const parsed = await fetchResponse.json() as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        res.status(500).json({ ok: false, error: "invalid_document" });
        return;
      }
      doc = parsed as Record<string, unknown>;
    } catch {
      res.status(500).json({ ok: false, error: "invalid_json" });
      return;
    }

    // Extract hash for verification
    const hash = typeof doc.content_sha256 === "string" ? doc.content_sha256 : null;
    if (!hash) {
      res.status(500).json({ ok: false, error: "missing_hash" });
      return;
    }

    // Verify the receipt
    const verification = await receipt.verifyReceipt(cid, hash);

    res.json({
      ok: true,
      cid,
      hash: `sha-256:${hash}`,
      gatewayUrl,
      verified: verification.ok,
      verificationError: verification.error ?? null,
      document: doc,
    });
  } catch (err: unknown) {
    console.error(
      "[GET /v1/receipt] error:",
      err instanceof Error ? err.message : "verification failed"
    );
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/** GET /v1/quote — USD/MXN + spread + volumen 24h (x402 exact). */
router.get("/quote", async (_req: Request, res: Response) => {
  try {
    const t = await getUsdMxnTicker();
    res.json({
      ok: true,
      apiVersion: "1",
      pair: t.pair,
      rate: t.rate,
      bid: t.bid,
      ask: t.ask,
      spread: t.spread,
      spreadPct: t.spreadPct,
      volume24hUsd: t.volume24hUsd,
      vwap24h: t.vwap24h,
      high24h: t.high24h,
      low24h: t.low24h,
      source: t.source,
      isLive: t.isLive,
      generatedAt: t.fetchedAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /v1/quote] error:", err);
    res.status(500).json({ ok: false, message });
  }
});

/** GET /v1/route?amount=100 — monto en USD; compara rieles USD→MXN (x402 exact). */
router.get("/route", async (req: Request, res: Response) => {
  const amount = Number(req.query.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 50_000) {
    res.status(400).json({
      ok: false,
      error: "amount requerido en USD, entre 1 y 50000",
      example: "/v1/route?amount=100",
    });
    return;
  }

  try {
    const estimate = await estimateRoutes(amount);
    const requestId = randomUUID();
    // receipt null y receiptStatus "pending": el anclaje sigue en waitUntil
    // y no forma parte del camino que x402 retiene hasta liquidar.
    res.json({
      ok: true,
      requestId,
      ...estimate,
      receipt: null,
      receiptStatus: "pending",
    });
    anchorRouteReceipt({
      v: "tia-receipt-v1",
      endpoint: "GET /v1/route",
      requestId,
      timestamp: estimate.generatedAt,
      data: estimate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /v1/route] error:", err);
    res.status(500).json({ ok: false, message });
  }
});

/** POST /v1/alert — registra alerta de umbral USD/MXN (x402 exact). */
router.post("/alert", async (req: Request, res: Response) => {
  try {
    // Cuota por cliente: IP (trust proxy ya configurado para Vercel).
    const { status, payload } = await registerAlert(req.body, req.ip ?? "unknown");
    res.status(status).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /v1/alert] error:", err);
    res.status(500).json({ ok: false, message });
  }
});

/**
 * POST /v1/alert/check — evalúa umbrales y dispara webhooks.
 * NO es x402 (no está en las rutas cobradas): lo invoca el cron o un operador
 * con Bearer CRON_SECRET / TIA_MANUAL_OVERRIDE_SECRET. Ver SPEC.md.
 */
router.post("/alert/check", requireCronSecret, async (_req: Request, res: Response) => {
  try {
    const result = await checkAndFireAlerts();
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /v1/alert/check] error:", err);
    res.status(500).json({ ok: false, message });
  }
});

export default router;
