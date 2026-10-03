import type { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  try {
    await import("@x402/express");
    await import("@x402/core/server");
    await import("@x402/stellar/exact/server");
    const { createApp } = await import("../src/app.js");
    const app = createApp();
    return app(req, res);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[TIA] boot failed:", error.stack ?? error.message);
    res.status(500).json({
      ok: false,
      boot: error.name,
      message: error.message,
    });
  }
}
