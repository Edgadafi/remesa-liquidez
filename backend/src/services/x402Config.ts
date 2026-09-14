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
    bridgeQuote: process.env.NIRIUM_X402_BRIDGE_PRICE ?? "0.25",
    fx: process.env.NIRIUM_X402_FX_PRICE ?? "0.10",
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

  // Pubnet cobro: payTo must be a mainnet G… with USDC trustline + ~1.5 XLM;
  // facilitator key from channels.openzeppelin.com/gen (not /testnet/gen).
  // Mixing a testnet G address with stellar:pubnet will not settle.
  if (network === "stellar:pubnet") {
    console.log(
      "[TIA] x402 pubnet: STELLAR_PAY_TO must be mainnet G… with USDC trustline; facilitator from channels.openzeppelin.com/gen"
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
