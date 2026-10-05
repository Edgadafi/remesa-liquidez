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

/**
 * Auth for the alert check/fire hook (POST /v1/alert/check).
 * Accepts CRON_SECRET (Vercel Cron lo manda como Bearer automáticamente)
 * or TIA_MANUAL_OVERRIDE_SECRET (disparo manual de operador).
 */
export function requireCronSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secrets = [
    process.env.CRON_SECRET,
    process.env.TIA_MANUAL_OVERRIDE_SECRET,
  ].filter((s): s is string => Boolean(s));

  if (secrets.length === 0) {
    res.status(503).json({
      ok: false,
      agent: "TIA",
      error: "Alert check disabled — set CRON_SECRET (o TIA_MANUAL_OVERRIDE_SECRET)",
    });
    return;
  }

  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token || !secrets.includes(token)) {
    res.status(401).json({ ok: false, agent: "TIA", error: "Unauthorized" });
    return;
  }

  next();
}
