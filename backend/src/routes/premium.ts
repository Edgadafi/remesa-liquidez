import { Router, type Request, type Response } from "express";
import { getUsdMxnRate } from "../services/fxRate.js";
import { quoteBridgeToSolana } from "../services/lifiQuote.js";

const router = Router();

/** GET /premium/bridge-quote */
router.get("/bridge-quote", async (req: Request, res: Response) => {
  const fromAddress = req.query.fromAddress as string | undefined;
  const toAddress = req.query.toAddress as string | undefined;
  const fromAmount = req.query.fromAmount as string | undefined;
  const fromChain = (req.query.fromChain as string | undefined) ?? "ARB";

  if (!fromAddress || !toAddress || !fromAmount) {
    res.status(400).json({
      ok: false,
      message:
        "Parámetros requeridos: fromAddress (EVM), toAddress (Solana), fromAmount (USDC base units).",
      example:
        "/premium/bridge-quote?fromAddress=0x…&toAddress=<SOL_PUBKEY>&fromAmount=10000000",
    });
    return;
  }

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
