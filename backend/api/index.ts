import type { Request, Response } from "express";

/**
 * Imports stay inside the handler so a Node 24 boot failure returns JSON
 * instead of FUNCTION_INVOCATION_FAILED with an empty body.
 */
export default async function handler(req: Request, res: Response) {
  const loaded: string[] = [];
  try {
    await import("@x402/express");
    loaded.push("x402-express");
    await import("@x402/core/server");
    loaded.push("x402-core");
    await import("@x402/stellar/exact/server");
    loaded.push("x402-stellar");
    const { createApp } = await import("../src/app.js");
    loaded.push("app");
    const app = createApp();
    return app(req, res);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    res.status(500).json({
      ok: false,
      loaded,
      boot: error.name,
      message: error.message.slice(0, 500),
    });
  }
}
