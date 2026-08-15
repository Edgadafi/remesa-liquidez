export interface X402Status {
  enabled: boolean;
  network: string;
  payTo: string | null;
  routes: Record<string, string>;
}

function stellarNetworkId(): "stellar:testnet" | "stellar:pubnet" {
  return process.env.STELLAR_NETWORK === "mainnet" ||
    process.env.STELLAR_NETWORK === "pubnet"
    ? "stellar:pubnet"
    : "stellar:testnet";
}

export function getX402Prices() {
  return {
    bridgeQuote: process.env.NIRIUM_X402_BRIDGE_PRICE ?? "0.02",
    fx: process.env.NIRIUM_X402_FX_PRICE ?? "0.01",
  };
}

export function isX402Enabled(): boolean {
  return process.env.NIRIUM_X402_ENABLED === "true";
}

export function getX402Status(): X402Status {
  const prices = getX402Prices();
  const network = stellarNetworkId();
  const payTo = process.env.STELLAR_PAY_TO?.trim() || null;

  return {
    enabled: isX402Enabled(),
    network,
    payTo,
    routes: {
      "GET /premium/bridge-quote": `$${prices.bridgeQuote}`,
      "GET /premium/fx": `$${prices.fx}`,
    },
  };
}

export function getX402ServeConfig() {
  const payTo = process.env.STELLAR_PAY_TO?.trim();
  const facilitatorApiKey = process.env.X402_FACILITATOR_API_KEY?.trim();
  const prices = getX402Prices();
  const network = stellarNetworkId();

  if (!payTo || !facilitatorApiKey) {
    throw new Error(
      "NIRIUM x402 requires STELLAR_PAY_TO and X402_FACILITATOR_API_KEY"
    );
  }

  return {
    payTo,
    facilitatorApiKey,
    network,
    appName: "TIA Premium API",
    routes: {
      "GET /bridge-quote": {
        price: `$${prices.bridgeQuote}`,
        description: "LI.FI cross-chain USDC quote (EVM → Solana)",
      },
      "GET /fx": {
        price: `$${prices.fx}`,
        description: "USD/MXN live rate (Bitso ticker)",
      },
    },
  };
}
