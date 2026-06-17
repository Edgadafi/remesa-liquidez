import type { Request, Response, NextFunction } from "express";

/**
 * Auth for manual overrides (Do Things That Don't Scale).
 * Uses TIA_MANUAL_OVERRIDE_SECRET, falling back to BOT_INTERNAL_SECRET.
 */
export function requireOverrideSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret =
    process.env.TIA_MANUAL_OVERRIDE_SECRET ?? process.env.BOT_INTERNAL_SECRET ?? "";

  if (!secret) {
    res.status(503).json({
      ok: false,
      agent: "TIA",
      error: "Manual override disabled — set TIA_MANUAL_OVERRIDE_SECRET",
    });
    return;
  }

  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== secret) {
    res.status(401).json({ ok: false, agent: "TIA", error: "Unauthorized" });
    return;
  }

  next();
}
