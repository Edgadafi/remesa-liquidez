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
    quote: process.env.NIRIUM_X402_QUOTE_PRICE ?? "0.10",
    route: process.env.NIRIUM_X402_ROUTE_PRICE ?? "0.25",
    alert: process.env.NIRIUM_X402_ALERT_PRICE ?? "0.10",
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
      "GET /v1/quote": `$${prices.quote}`,
      "GET /v1/route": `$${prices.route}`,
      "POST /v1/alert": `$${prices.alert}`,
    },
  };
}

interface X402ServeBase {
  payTo: string;
  facilitatorApiKey: string;
  facilitatorUrl?: string;
  network: "stellar:testnet" | "stellar:pubnet";
  appName: string;
}

function getX402ServeBase(): X402ServeBase {
  const payTo = process.env.STELLAR_PAY_TO?.trim();
  const facilitatorApiKey = process.env.X402_FACILITATOR_API_KEY?.trim();
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

  // Override SOLO para dev/smoke local (facilitador mock). En Vercel debe ir
  // vacío: nirium resuelve la URL de OZ según la red.
  const facilitatorUrl = process.env.X402_FACILITATOR_URL?.trim();

  return {
    payTo,
    facilitatorApiKey,
    ...(facilitatorUrl ? { facilitatorUrl } : {}),
    network,
    appName: "TIA Premium API",
  };
}

export function getX402ServeConfig() {
  const prices = getX402Prices();
  return {
    ...getX402ServeBase(),
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

export function getX402V1ServeConfig() {
  const prices = getX402Prices();
  return {
    ...getX402ServeBase(),
    routes: {
      "GET /quote": {
        price: `$${prices.quote}`,
        description: "USD/MXN + spread + volumen 24h (Bitso)",
      },
      "GET /route": {
        price: `$${prices.route}`,
        description: "Mejor ruta USD→MXN: Bitso / stablecoin / SPEI",
      },
      "POST /alert": {
        price: `$${prices.alert}`,
        description: "Alerta de umbral USD/MXN con webhook",
      },
    },
  };
}
