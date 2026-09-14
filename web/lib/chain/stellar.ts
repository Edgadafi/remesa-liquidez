/**
 * Stellar chain adapter — PoC scaffold + Accesly config.
 * Contract: contracts/remesa-tia-stellar/
 */
import type { ChainAdapter, ChainConfig } from "./types";

const USDC_TESTNET =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"; // Circle testnet USDC issuer
const USDC_MAINNET =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"; // Circle mainnet USDC issuer

export const STELLAR_USDC_ISSUER = USDC_TESTNET;

export type AcceslyEnv = "dev" | "staging" | "prod";

export function getAcceslyConfig(): {
  appId: string;
  env: AcceslyEnv;
  configured: boolean;
} {
  const appId = process.env.NEXT_PUBLIC_ACCESLY_APP_ID ?? "";
  const raw = process.env.NEXT_PUBLIC_ACCESLY_ENV ?? "dev";
  const env: AcceslyEnv =
    raw === "prod" ? "prod" : raw === "staging" ? "staging" : "dev";
  return { appId, env, configured: appId.length > 0 };
}

function getNetwork(): string {
  return process.env.STELLAR_NETWORK ?? process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
}

export const stellarAdapter: ChainAdapter = {
  chain: "stellar",

  getConfig(): ChainConfig {
    const network = getNetwork();
    const isMainnet = network === "mainnet" || network === "public";
    return {
      chain: "stellar",
      network,
      usdcAssetId: isMainnet ? USDC_MAINNET : USDC_TESTNET,
      explorerBaseUrl: isMainnet
        ? "https://stellar.expert/explorer/public"
        : "https://stellar.expert/explorer/testnet",
    };
  },

  getPilotLabel(): string {
    return "Stellar (beta — limited slots)";
  },

  isPilotActive(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_STELLAR_PILOT_ENABLED === "true");
  },
};

export function getStellarContractId(): string | null {
  return process.env.STELLAR_CONTRACT_ID ?? process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID ?? null;
}

export function assertStellarPilotReady(): void {
  if (!getStellarContractId()) {
    throw new Error(
      "Stellar pilot not deployed. Set STELLAR_CONTRACT_ID after Soroban deploy. See contracts/remesa-tia-stellar/README.md"
    );
  }
}
