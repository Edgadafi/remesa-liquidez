/**
 * LI.FI integration — cross-chain bridge para llevar USDC desde cadenas EVM
 * (Arbitrum, Base, Polygon, etc.) a Solana antes de crear una TurnReservation.
 *
 * Docs: https://docs.li.fi/introduction/solana-ecosystem
 * SDK:  https://github.com/lifinance/sdk
 */
import { createConfig, getQuote, getChains, ChainType, type Route } from "@lifi/sdk";

/** USDC en Solana (SPL native) */
export const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** USDC en Arbitrum */
export const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

/** USDC en Base */
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** USDC en Polygon */
export const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

/** LI.FI chain identifiers */
export const CHAIN = {
  ARBITRUM: "ARB",
  BASE: "BASE",
  POLYGON: "POL",
  SOLANA: "SOL",
} as const;

/** USDC address map por cadena origen */
export const USDC_BY_CHAIN: Record<string, string> = {
  ARB: USDC_ARBITRUM,
  BASE: USDC_BASE,
  POL: USDC_POLYGON,
};

let configured = false;

function ensureConfig() {
  if (!configured) {
    createConfig({ integrator: "remesa-liquidez-ia" });
    configured = true;
  }
}

export interface BridgeQuoteParams {
  /** Wallet EVM del sender (cadena origen) */
  fromAddress: string;
  /** Wallet Solana del sender (destino — recibirá USDC SPL) */
  toAddress: string;
  /** Monto en unidades base USDC (6 decimales). Ej: "10000000" = 10 USDC */
  fromAmount: string;
  /** Cadena origen. Default: "ARB" */
  fromChain?: string;
}

export interface BridgeQuoteResult {
  ok: boolean;
  toAmount: string;       // USDC en Solana recibido (6 decimales)
  toAmountMin: string;    // mínimo garantizado
  estimatedTime: number;  // segundos estimados
  tool: string;           // bridge utilizado (ej. "mayan", "relay")
  feeCostUsd: string;     // costo total de fees en USD
  route: Route;           // objeto completo para ejecutar la tx
}

/**
 * Solicita un quote para bridgear USDC desde una cadena EVM a Solana.
 * El resultado incluye la ruta completa lista para ejecutar con `executeRoute()`.
 */
export async function quoteBridgeToSolana(
  params: BridgeQuoteParams
): Promise<BridgeQuoteResult> {
  ensureConfig();

  const fromChain = params.fromChain ?? CHAIN.ARBITRUM;
  const fromToken = USDC_BY_CHAIN[fromChain];

  if (!fromToken) {
    throw new Error(
      `Cadena origen no soportada: ${fromChain}. Usa ARB, BASE o POL.`
    );
  }

  const quote = await getQuote({
    fromChain,
    toChain: CHAIN.SOLANA,
    fromToken,
    toToken: USDC_SOLANA,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    fromAmount: params.fromAmount,
  });

  const step = quote.includedSteps?.[0];
  const feeCosts = step?.estimate?.feeCosts ?? [];
  const totalFeeUsd = feeCosts
    .reduce((acc, f) => acc + parseFloat(f.amountUSD ?? "0"), 0)
    .toFixed(4);

  return {
    ok: true,
    toAmount: quote.estimate.toAmount,
    toAmountMin: quote.estimate.toAmountMin,
    estimatedTime: quote.estimate.executionDuration,
    tool: quote.toolDetails?.name ?? step?.tool ?? "unknown",
    feeCostUsd: totalFeeUsd,
    route: quote as unknown as Route,
  };
}

/**
 * Devuelve las cadenas origen soportadas por LI.FI con soporte SVM (Solana).
 * Útil para renderizar un selector de cadena en el frontend.
 */
export async function getSupportedSourceChains() {
  ensureConfig();
  const chains = await getChains({ chainTypes: [ChainType.EVM] });
  return chains.map((c) => ({
    id: c.key,
    name: c.name,
    logoUrl: c.logoURI,
  }));
}
