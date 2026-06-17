import { Router, type Request, type Response } from "express";
import { requireOverrideSecret } from "../middleware/overrideAuth.js";
import { handleTiaNotify, TiaNotifySchema } from "../services/tiaNotify.js";

const router = Router();

/** POST /notify — canónico bajo /api/tia */
router.post("/notify", async (req: Request, res: Response) => {
  const parsed = TiaNotifySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      agent: "TIA",
      error: "Payload inválido",
      details: parsed.error.flatten(),
    });
  }

  const result = await handleTiaNotify(parsed.data);
  const status = result.ok ? 200 : 502;
  return res.status(status).json(result);
});

/**
 * POST /manual-notify — override when webhooks fail during live merchant tests.
 * Requires Authorization: Bearer $TIA_MANUAL_OVERRIDE_SECRET
 */
router.post(
  "/manual-notify",
  requireOverrideSecret,
  async (req: Request, res: Response) => {
    const parsed = TiaNotifySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        agent: "TIA",
        error: "Payload inválido",
        details: parsed.error.flatten(),
      });
    }

    console.log("[TIA] manual-notify override →", parsed.data.userWA);
    const result = await handleTiaNotify({
      ...parsed.data,
      isVerified: parsed.data.isVerified ?? true,
    });
    const status = result.ok ? 200 : 502;
    return res.status(status).json({ ...result, manualOverride: true });
  }
);

/** GET /health — sub-ruta del router TIA */
router.get("/health", (_req, res) => {
  res.json({ ok: true, agent: "TIA", service: "remesa-tia-backend" });
});

export default router;
