/**
 * Smoke test: paid x402 call to TIA premium API (Stellar testnet).
 *
 * Prereqs:
 *   - NIRIUM_X402_ENABLED=true on backend + valid STELLAR_PAY_TO + X402_FACILITATOR_API_KEY
 *   - STELLAR_TESTNET_SECRET in .env (funded testnet account)
 *   - RENDER_BACKEND_URL or local http://localhost:3000
 */
import "dotenv/config";
import { Agent } from "nirium";

const secretKey = process.env.STELLAR_TESTNET_SECRET?.trim();
const backendUrl =
  process.env.RENDER_BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const targetPath = process.env.X402_SMOKE_PATH ?? "/premium/fx";
const premiumUrl = `${backendUrl}${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;

async function main() {
  if (!secretKey) {
    throw new Error(
      "Set STELLAR_TESTNET_SECRET in .env (funded Stellar testnet secret key)."
    );
  }

  console.log(`[x402-smoke] Unpaid probe → ${premiumUrl}`);
  const unpaid = await fetch(premiumUrl);
  console.log(`[x402-smoke] Unpaid status: ${unpaid.status}`);
  if (unpaid.status !== 402) {
    const body = await unpaid.text();
    throw new Error(
      `Expected 402 Payment Required, got ${unpaid.status}: ${body.slice(0, 200)}`
    );
  }

  const agent = new Agent({
    apiKey: process.env.NIRIUM_API_KEY ?? "smoke-local",
    baseUrl: backendUrl,
  });
  agent.initX402({
    secretKey,
    network: "stellar:testnet",
  });

  console.log(`[x402-smoke] Paid fetch → ${premiumUrl}`);
  let response: Response;
  try {
    response = await agent.x402Fetch(premiumUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/balance|trustline|USDC/i.test(msg)) {
      console.error(
        "\n[x402-smoke] Payer needs ≥0.01 USDC on Stellar testnet.\n" +
          "Run: npm run fund-x402-payer\n" +
          "Then request USDC at https://faucet.circle.com/ → Stellar Testnet\n"
      );
    }
    throw err;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Paid request failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  console.log("[x402-smoke] OK — response:");
  console.log(JSON.stringify(payload, null, 2));
  console.log(
    "\nVerify payment on https://stellar.expert/explorer/testnet (source = your testnet account)."
  );
}

main().catch((err) => {
  console.error("[x402-smoke] FAILED:", err);
  process.exit(1);
});
