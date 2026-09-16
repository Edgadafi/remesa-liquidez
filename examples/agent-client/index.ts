/**
 * Minimal x402 agent client for the TIA Premium API (Stellar mainnet).
 *
 * Flow: unpaid probe (see the 402 + price) → paid fetch (nirium handles
 * 402 → sign USDC payment → retry) → print the JSON payload.
 *
 * Run:  cp .env.example .env  → set STELLAR_SECRET  → npm install && npm run quote
 */
import "dotenv/config";
import { Agent } from "nirium";

const secretKey = process.env.STELLAR_SECRET?.trim();
const base = (process.env.TIA_API_BASE ?? "https://remesa-tia-backend.vercel.app").replace(/\/$/, "");
const path = process.env.TIA_TARGET_PATH ?? "/v1/quote";
const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

if (!secretKey) {
  console.error("Set STELLAR_SECRET in .env (mainnet S... key with a USDC trustline).");
  process.exit(1);
}

// 1) Unpaid probe — inspect what the API charges before paying anything.
const unpaid = await fetch(url);
console.log(`[probe] ${url} → HTTP ${unpaid.status}`);
const header = unpaid.headers.get("payment-required");
if (unpaid.status !== 402 || !header) {
  console.error("Expected 402 with a payment-required header. Is the API up? Check /health.");
  process.exit(1);
}
const offer = JSON.parse(Buffer.from(header, "base64").toString()) as {
  accepts: Array<{ network: string; amount: string; payTo: string }>;
};
const { network, amount, payTo } = offer.accepts[0];
console.log(`[probe] price: ${Number(amount) / 1e7} USDC on ${network} → ${payTo.slice(0, 8)}…`);

// 2) Paid fetch — nirium does 402 → sign → retry in one call.
const agent = new Agent({ apiKey: "unused-for-x402", baseUrl: base });
agent.initX402({ secretKey, network: "stellar:pubnet" });

const res = await agent.x402Fetch(url);
if (!res.ok) {
  console.error(`Paid request failed: HTTP ${res.status}`, await res.text());
  process.exit(1);
}

console.log("[paid] HTTP 200 — payload:");
console.log(JSON.stringify(await res.json(), null, 2));
console.log(
  `\nVerify the payment: https://stellar.expert/explorer/public/account/${payTo}`
);
