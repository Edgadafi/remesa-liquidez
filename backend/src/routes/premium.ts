import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getUsdMxnRate } from "../services/fxRate.js";
import { quoteBridgeToSolana } from "../services/lifiQuote.js";

const router = Router();

/**
 * Validación server-side estricta (Capa 4): nada de castear query params a
 * string y pasarlos crudos al SDK. Formato + rangos acotados antes de que
 * cualquier valor toque LI.FI.
 */
const BridgeQuoteQuery = z.object({
  fromAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "fromAddress debe ser una dirección EVM (0x + 40 hex)"),
  toAddress: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "toAddress debe ser una pubkey Solana base58"),
  // Unidades base USDC (6 decimales EVM): entero positivo, máx ~10M USDC.
  fromAmount: z
    .string()
    .regex(/^[1-9]\d{0,12}$/, "fromAmount debe ser un entero positivo en unidades base USDC"),
  fromChain: z.enum(["ARB", "BASE", "POL"]).default("ARB"),
});

/** GET /premium/bridge-quote */
router.get("/bridge-quote", async (req: Request, res: Response) => {
  const parsed = BridgeQuoteQuery.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      message:
        "Parámetros inválidos: fromAddress (EVM 0x…), toAddress (Solana base58), fromAmount (USDC base units), fromChain (ARB|BASE|POL).",
      details: parsed.error.flatten().fieldErrors,
      example:
        "/premium/bridge-quote?fromAddress=0x…&toAddress=<SOL_PUBKEY>&fromAmount=10000000",
    });
    return;
  }

  const { fromAddress, toAddress, fromAmount, fromChain } = parsed.data;

  try {
    const result = await quoteBridgeToSolana({
      fromAddress,
      toAddress,
      fromAmount,
      fromChain,
    });

    res.json({
      ok: true,
      fromChain,
      fromAmount,
      toChain: "SOL",
      toAmount: result.toAmount,
      toAmountMin: result.toAmountMin,
      toAmountHuman: (parseInt(result.toAmount, 10) / 1_000_000).toFixed(2),
      estimatedSeconds: result.estimatedTime,
      bridge: result.tool,
      feeCostUsd: result.feeCostUsd,
      note: "Premium LI.FI quote — pago x402 verificado on-chain.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /premium/bridge-quote] error:", err);
    res.status(500).json({ ok: false, message });
  }
});

/** GET /premium/fx */
router.get("/fx", async (_req: Request, res: Response) => {
  try {
    const { rate, isLive } = await getUsdMxnRate();
    res.json({
      ok: true,
      pair: "USD/MXN",
      rate,
      isLive,
      source: "bitso",
      note: "Premium FX tick — pago x402 verificado on-chain.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /premium/fx] error:", err);
    res.status(500).json({ ok: false, message });
  }
});

export default router;
