import type { Request, Response } from "express";

// Node 24 on Vercel loads traced .ts as CommonJS. api/app.cjs is the esbuild
// bundle of src/app.ts (packages left external). Imports stay inside the
// handler so a boot failure is returned as JSON.
export default async function handler(req: Request, res: Response) {
  const loaded: string[] = [];
  try {
    await import("@x402/express");
    loaded.push("x402-express");
    await import("@x402/core/server");
    loaded.push("x402-core");
    await import("@x402/stellar/exact/server");
    loaded.push("x402-stellar");
    const mod = (await import("./app.cjs")) as { createApp: () => (req: Request, res: Response) => unknown };
    loaded.push("app");
    const app = mod.createApp();
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
