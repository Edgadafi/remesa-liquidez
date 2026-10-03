import type { Request, Response } from "express";

const specs = [
  "zod",
  "@x402/express",
  "@x402/core/server",
  "@x402/stellar/exact/server",
  "../src/app.js",
];

export default async function handler(_req: Request, res: Response) {
  const results: { spec: string; ok: boolean; message?: string }[] = [];
  for (const spec of specs) {
    try {
      await import(spec);
      results.push({ spec, ok: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      results.push({ spec, ok: false, message: error.message.slice(0, 300) });
    }
  }
  res.status(200).json({ ok: true, results });
}
