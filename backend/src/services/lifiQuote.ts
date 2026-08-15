/**
 * LI.FI bridge quotes — backend port of web/lib/lifi.ts for premium x402 API.
 */
import { createClient, getQuote } from "@lifi/sdk";

export const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const USDC_BY_CHAIN: Record<string, string> = {
  ARB: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  POL: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
};

let client: ReturnType<typeof createClient> | null = null;

function getLifiClient() {
  if (!client) {
    client = createClient({ integrator: "remesa-liquidez-ia" });
  }
  return client;
}

export interface BridgeQuoteParams {
  fromAddress: string;
  toAddress: string;
  fromAmount: string;
  fromChain?: string;
}

export interface BridgeQuoteResult {
  ok: boolean;
  toAmount: string;
  toAmountMin: string;
  estimatedTime: number;
  tool: string;
  feeCostUsd: string;
}

export async function quoteBridgeToSolana(
  params: BridgeQuoteParams
): Promise<BridgeQuoteResult> {
  const fromChain = params.fromChain ?? "ARB";
  const fromToken = USDC_BY_CHAIN[fromChain];

  if (!fromToken) {
    throw new Error(
      `Cadena origen no soportada: ${fromChain}. Usa ARB, BASE o POL.`
    );
  }

  const quote = await getQuote(getLifiClient(), {
    fromChain,
    toChain: "SOL",
    fromToken,
    toToken: USDC_SOLANA,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    fromAmount: params.fromAmount,
  });

  const estimate = quote.estimate;
  if (!estimate) {
    throw new Error("LI.FI quote sin estimate");
  }

  const step = quote.includedSteps?.[0];
  const feeCosts = estimate.feeCosts ?? step?.estimate?.feeCosts ?? [];
  const totalFeeUsd = feeCosts
    .reduce((acc, f) => acc + parseFloat(f.amountUSD ?? "0"), 0)
    .toFixed(4);

  return {
    ok: true,
    toAmount: estimate.toAmount,
    toAmountMin: estimate.toAmountMin,
    estimatedTime: estimate.executionDuration,
    tool: quote.toolDetails?.name ?? estimate.tool ?? step?.tool ?? "unknown",
    feeCostUsd: totalFeeUsd,
  };
}
