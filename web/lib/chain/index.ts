/**
 * Chain adapter registry — dual-chain entry point for web UI.
 */
import { solanaAdapter } from "./solana";
import { stellarAdapter } from "./stellar";
import type { ChainAdapter, ChainId } from "./types";
import { getDefaultChain } from "./types";

export * from "./types";
export { solanaAdapter } from "./solana";
export { stellarAdapter, getStellarContractId, assertStellarPilotReady, getAcceslyConfig, STELLAR_USDC_ISSUER } from "./stellar";

const adapters: Record<ChainId, ChainAdapter> = {
  solana: solanaAdapter,
  stellar: stellarAdapter,
};

export function getChainAdapter(chain: ChainId = getDefaultChain()): ChainAdapter {
  return adapters[chain];
}

export function getActivePilotChains(): ChainAdapter[] {
  return Object.values(adapters).filter((a) => a.isPilotActive());
}

export function getSelectableChains(): ChainAdapter[] {
  return [solanaAdapter, stellarAdapter];
}
