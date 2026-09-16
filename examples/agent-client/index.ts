/**
 * Minimal x402 agent client for the TIA Premium API (Stellar mainnet).
 *
 * Two modes:
 *   --dry-run : fetch the unpaid 402, print the payment terms, exit. Nothing
 *               is signed and no secret key is needed.
 *   default   : single agent.x402Fetch() call — the SDK negotiates the 402 and
 *               signs the terms of THAT response (no separate probe, so there
 *               is no window for a payTo/amount bait-and-switch between two
 *               requests). Verification info comes from the settled payment
 *               (payment-response header), never from an unsigned probe.
 *
 * Run:  cp .env.example .env → set STELLAR_SECRET → npm install
 *       npm run dry-run   (inspect terms, pays nothing)
 *       npm run quote     (pays and prints the payload)
 */
import "dotenv/config";
import { Agent } from "nirium";

const base = (process.env.TIA_API_BASE ?? "https://remesa-tia-backend.vercel.app").replace(/\/$/, "");
const path = process.env.TIA_TARGET_PATH ?? "/v1/quote";
const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
const dryRun = process.argv.includes("--dry-run");

function decodeB64Json(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64").toString()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

if (dryRun) {
  // Inspect-only: print the 402 terms and EXIT — nothing is ever signed here.
  const unpaid = await fetch(url);
  console.log(`[dry-run] ${url} → HTTP ${unpaid.status}`);
  const offer = decodeB64Json(unpaid.headers.get("payment-required"));
  if (unpaid.status !== 402 || !offer) {
    console.error("Expected 402 with a payment-required header. Is the API up? Check /health.");
    process.exit(1);
  }
  const accepts = (offer.accepts as Array<Record<string, unknown>> | undefined)?.[0] ?? {};
  console.log("[dry-run] payment terms offered:");
  console.log(
    JSON.stringify(
      {
        resourceUrl: (offer.resource as { url?: string } | undefined)?.url,
        network: accepts.network,
        asset: accepts.asset,
        amountBaseUnits: accepts.amount,
        amountUsdc: Number(accepts.amount) / 1e7,
        payTo: accepts.payTo,
      },
      null,
      2
    )
  );
  console.log("[dry-run] no payment was signed. Remove --dry-run to pay.");
  process.exit(0);
}

const secretKey = process.env.STELLAR_SECRET?.trim();
if (!secretKey) {
  console.error(
    "Set STELLAR_SECRET in .env (mainnet S... key with a USDC trustline), or use --dry-run to inspect without paying."
  );
  process.exit(1);
}

// Single call: the SDK receives the 402 and signs those exact terms.
const agent = new Agent({ apiKey: "unused-for-x402", baseUrl: base });
agent.initX402({ secretKey, network: "stellar:pubnet" });

const res = await agent.x402Fetch(url);
if (!res.ok) {
  console.error(`Paid request failed: HTTP ${res.status}`, await res.text());
  process.exit(1);
}

console.log("[paid] HTTP 200 — payload:");
console.log(JSON.stringify(await res.json(), null, 2));

// Verification from the settled payment itself (not from any probe).
const receipt =
  decodeB64Json(res.headers.get("payment-response")) ??
  decodeB64Json(res.headers.get("x-payment-response"));
const txHash = [receipt?.transaction, receipt?.txHash, receipt?.hash].find(
  (v): v is string => typeof v === "string" && v.length > 0
);
if (txHash) {
  console.log(`\nSettled on-chain: https://stellar.expert/explorer/public/tx/${txHash}`);
} else {
  console.log(
    "\nVerify the payment in your own account's recent payments on https://stellar.expert (the settlement receipt header was not present)."
  );
}
