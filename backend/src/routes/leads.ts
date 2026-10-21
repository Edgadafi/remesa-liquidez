import { createReadStream } from "node:fs";
import { Router, type Request, type Response } from "express";
import {
  REPORT_FILENAME,
  consumeDownloadToken,
  createReportLead,
  publicBaseUrl,
  resolveReportPdfPath,
} from "../services/reportLeads.js";

const router = Router();

/**
 * POST /v1/leads/report — guarda WhatsApp o email y devuelve URL de descarga
 * con token one-shot (TTL 15 min). Fuera de x402.
 */
router.post("/report", async (req: Request, res: Response) => {
  const body = req.body as { channel?: unknown; value?: unknown };
  const channel = typeof body.channel === "string" ? body.channel : "";
  const value = typeof body.value === "string" ? body.value : "";

  try {
    const result = await createReportLead({
      channel,
      value,
      ip: req.ip,
      userAgent:
        typeof req.headers["user-agent"] === "string"
          ? req.headers["user-agent"]
          : undefined,
    });

    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }

    const downloadUrl = `${publicBaseUrl()}/v1/leads/report/download?token=${encodeURIComponent(result.token)}`;
    res.json({ ok: true, downloadUrl });
  } catch (err: unknown) {
    console.error(
      "[POST /v1/leads/report] error:",
      err instanceof Error ? err.message : "create failed"
    );
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/**
 * GET /v1/leads/report/download?token= — stream del PDF; invalida el token.
 */
router.get("/report/download", async (req: Request, res: Response) => {
  const token =
    typeof req.query.token === "string" ? req.query.token.trim() : "";

  try {
    const consumed = await consumeDownloadToken(token);
    if (!consumed.ok) {
      res.status(consumed.status).json({ ok: false, error: consumed.error });
      return;
    }

    let pdfPath: string;
    try {
      pdfPath = resolveReportPdfPath();
    } catch (err: unknown) {
      console.error(
        "[GET /v1/leads/report/download] PDF missing:",
        err instanceof Error ? err.message : err
      );
      res.status(500).json({ ok: false, error: "report_unavailable" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${REPORT_FILENAME}"`
    );
    res.setHeader("Cache-Control", "no-store");
    createReadStream(pdfPath).pipe(res);
  } catch (err: unknown) {
    console.error(
      "[GET /v1/leads/report/download] error:",
      err instanceof Error ? err.message : "download failed"
    );
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  }
});

export default router;
