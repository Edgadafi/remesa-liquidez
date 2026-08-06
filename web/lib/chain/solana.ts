/**
 * Solana chain adapter — wraps existing Anchor / Blinks stack.
 */
import { getCluster, getConnection } from "@/lib/anchor";
import type { ChainAdapter, ChainConfig } from "./types";

const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function explorerBase(cluster: string): string {
  const c = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://solscan.io${c}`;
}

export const solanaAdapter: ChainAdapter = {
  chain: "solana",

  getConfig(): ChainConfig {
    const network = getCluster();
    return {
      chain: "solana",
      network,
      usdcAssetId:
        process.env.NEXT_PUBLIC_USDC_MINT ??
        (network === "mainnet-beta" ? USDC_MAINNET : USDC_DEVNET),
      explorerBaseUrl: explorerBase(network),
    };
  },

  getPilotLabel(): string {
    return "Solana (recommended — active pilot)";
  },

  isPilotActive(): boolean {
    return true;
  },
};

export { getConnection, getCluster };
