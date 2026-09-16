import { Router, type Request, type Response } from "express";
import { getUsdMxnTicker } from "../services/fxRate.js";
import { estimateRoutes } from "../services/routeEstimator.js";
import { checkAndFireAlerts, registerAlert } from "../services/alerts.js";
import { requireCronSecret } from "../middleware/overrideAuth.js";

const router = Router();

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
    res.json({ ok: true, ...estimate });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /v1/route] error:", err);
    res.status(500).json({ ok: false, message });
  }
});

/** POST /v1/alert — registra alerta de umbral USD/MXN (x402 exact). */
router.post("/alert", async (req: Request, res: Response) => {
  try {
    const { status, payload } = await registerAlert(req.body);
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
