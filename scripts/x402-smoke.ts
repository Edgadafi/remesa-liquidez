/**
 * Smoke test: paid x402 call to TIA premium API.
 * Network follows the unpaid 402 (pubnet vs testnet). Do not hardcode testnet.
 *
 * Prereqs:
 *   - NIRIUM_X402_ENABLED=true on backend + STELLAR_PAY_TO + X402_FACILITATOR_API_KEY
 *   - STELLAR_TESTNET_SECRET in local .env only (never Vercel — it signs payments)
 *   - RENDER_BACKEND_URL. Prod: https://remesa-tia-backend.vercel.app
 */
import "dotenv/config";
import { Agent } from "nirium";

const secretKey = process.env.STELLAR_TESTNET_SECRET?.trim();
const backendUrl =
  process.env.RENDER_BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const targetPath = process.env.X402_SMOKE_PATH ?? "/premium/fx";
const premiumUrl = `${backendUrl}${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;

type StellarX402Network = "stellar:testnet" | "stellar:pubnet";

function redact(value: string): string {
  return value.replace(/S[A-Z2-7]{54,}/g, "S…REDACTED");
}

function resolveNetwork(unpaid: Response): StellarX402Network {
  const forced = process.env.X402_SMOKE_NETWORK?.trim();
  if (forced === "stellar:pubnet" || forced === "stellar:testnet") {
    return forced;
  }
  const header = [
    unpaid.headers.get("payment-required"),
    unpaid.headers.get("PAYMENT-REQUIRED"),
  ]
    .filter(Boolean)
    .join(" ");
  if (/stellar:pubnet|pubnet/i.test(header)) return "stellar:pubnet";
  if (/stellar:testnet|testnet/i.test(header)) return "stellar:testnet";
  const env = process.env.STELLAR_NETWORK?.trim();
  if (env === "pubnet" || env === "mainnet") return "stellar:pubnet";
  if (backendUrl.includes("remesa-tia-backend.vercel.app")) {
    return "stellar:pubnet";
  }
  return "stellar:testnet";
}

async function main() {
  if (!secretKey) {
    throw new Error(
      "Set STELLAR_TESTNET_SECRET in local .env only (do not add it to Vercel)."
    );
  }

  console.log(`[x402-smoke] Unpaid probe → ${premiumUrl}`);
  const unpaid = await fetch(premiumUrl);
  console.log(`[x402-smoke] Unpaid status: ${unpaid.status}`);
  if (unpaid.status !== 402) {
    const body = await unpaid.text();
    throw new Error(
      `Expected 402 Payment Required, got ${unpaid.status}: ${redact(body.slice(0, 200))}`
    );
  }

  const network = resolveNetwork(unpaid);
  console.log(`[x402-smoke] Paying on ${network}`);

  const agent = new Agent({
    apiKey: process.env.NIRIUM_API_KEY ?? "smoke-local",
    baseUrl: backendUrl,
  });
  agent.initX402({
    secretKey,
    network,
  });

  console.log(`[x402-smoke] Paid fetch → ${premiumUrl}`);
  let response: Response;
  try {
    response = await agent.x402Fetch(premiumUrl);
  } catch (err: unknown) {
    const msg = redact(err instanceof Error ? err.message : String(err));
    if (/balance|trustline|USDC/i.test(msg)) {
      console.error(
        network === "stellar:pubnet"
          ? "\n[x402-smoke] Payer needs ≥0.01 USDC Circle on Stellar mainnet + trustline.\n"
          : "\n[x402-smoke] Payer needs ≥0.01 USDC on Stellar testnet.\n" +
              "Run: npm run fund-x402-payer\n" +
              "Then request USDC at https://faucet.circle.com/ → Stellar Testnet\n"
      );
    }
    throw new Error(msg);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Paid request failed: ${response.status} ${redact(text)}`);
  }

  const payload = await response.json();
  console.log("[x402-smoke] OK — response:");
  console.log(JSON.stringify(payload, null, 2));
  const explorer =
    network === "stellar:pubnet"
      ? "https://stellar.expert/explorer/public"
      : "https://stellar.expert/explorer/testnet";
  console.log(`\nVerify payment on ${explorer} (source = Freighter payer).`);
}

main().catch((err) => {
  const msg = redact(err instanceof Error ? err.stack ?? err.message : String(err));
  console.error("[x402-smoke] FAILED:", msg);
  process.exit(1);
});
