/**
 * Chain-agnostic types for TIA dual-chain (Solana + Stellar).
 * @see docs/dual-chain-decision.md
 */

export type ChainId = "solana" | "stellar";

export const FEE_BPS = 25;
export const BPS_DENOMINATOR = 10_000;

export interface ChainConfig {
  chain: ChainId;
  network: string;
  usdcAssetId: string;
  explorerBaseUrl: string;
}

export interface ReservationRef {
  chain: ChainId;
  /** Solana: TurnReservation PDA base58 · Stellar: contract reservation id */
  id: string;
  receiverAddress: string;
}

export type ReservationStatus = "pending" | "active" | "verified" | "completed" | "expired";

export interface CashoutQuote {
  grossUsdcBaseUnits: string;
  netUsdcBaseUnits: string;
  protocolFeeBaseUnits: string;
  netUsdcDisplay: string;
  mxnEstimate?: number;
  mxnIsLive?: boolean;
}

export interface ChainAdapter {
  readonly chain: ChainId;
  getConfig(): ChainConfig;
  /** Human-readable label for sender UI */
  getPilotLabel(): string;
  isPilotActive(): boolean;
}

export function computeProtocolFee(grossBaseUnits: bigint): {
  fee: bigint;
  net: bigint;
} {
  const fee = (grossBaseUnits * BigInt(FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  return { fee, net: grossBaseUnits - fee };
}

export function formatUsdcFromBaseUnits(baseUnits: bigint): string {
  return (Number(baseUnits) / 1_000_000).toFixed(2);
}

export function getDefaultChain(): ChainId {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN ?? "solana";
  return raw === "stellar" ? "stellar" : "solana";
}
