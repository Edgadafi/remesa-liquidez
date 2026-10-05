/**
 * Hardened x402 agent client for the TIA Premium API (Stellar mainnet).
 *
 * Two modes:
 *   --dry-run : fetch the unpaid 402, print the payment terms, exit. Nothing
 *               is signed and no secret key is needed.
 *   default   : single wrapped-fetch call — the client negotiates the 402 and
 *               signs the terms of THAT response (no separate probe, so there
 *               is no window for a payTo/amount bait-and-switch between two
 *               requests). Verification info comes from the settled payment
 *               (payment-response header), never from an unsigned probe.
 *
 * Client-side spend guards (Capa 5 del blindaje — the client is the vector):
 *   - payTo allowlist: EXPECTED_PAY_TO is REQUIRED to pay. If a compromised
 *     DNS/server returns a 402 pointing at an attacker's account, the policy
 *     filters those terms out and nothing is ever signed.
 *   - Network pin: the payment scheme is registered ONLY for the expected
 *     network — terms on any other network never match.
 *   - Spend cap: MAX_PRICE_USDC (default $0.50) per payment, enforced by the
 *     SDK's spend controls before any signature happens.
 *
 * Run:  cp .env.example .env → set STELLAR_SECRET + EXPECTED_PAY_TO
 *       npm install
 *       npm run dry-run   (inspect terms — including payTo — pays nothing)
 *       npm run quote     (pays and prints the payload)
 */
import "dotenv/config";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import type { PaymentRequirements } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const base = (process.env.TIA_API_BASE ?? "https://remesa-tia-backend.vercel.app").replace(/\/$/, "");
const path = process.env.TIA_TARGET_PATH ?? "/v1/quote";
const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
const dryRun = process.argv.includes("--dry-run");

const NETWORK = (process.env.STELLAR_NETWORK ?? "stellar:pubnet") as `${string}:${string}`;

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
  console.log(
    "[dry-run] no payment was signed. Pin this payTo as EXPECTED_PAY_TO in .env, then remove --dry-run to pay."
  );
  process.exit(0);
}

const secretKey = process.env.STELLAR_SECRET?.trim();
if (!secretKey) {
  console.error(
    "Set STELLAR_SECRET in .env (mainnet S... key with a USDC trustline), or use --dry-run to inspect without paying."
  );
  process.exit(1);
}

// payTo allowlist — REQUIRED to pay. Comma-separated G... accounts.
const expectedPayTo = (process.env.EXPECTED_PAY_TO ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (expectedPayTo.length === 0) {
  console.error(
    "Set EXPECTED_PAY_TO in .env (the server's Stellar G... account). Run `npm run dry-run` to see the payTo the server announces, verify it out-of-band, and pin it. Refusing to sign payments to an unverified recipient."
  );
  process.exit(1);
}

// Per-payment spend cap in USD, enforced by SDK spend controls before signing.
const maxPriceUsdc = Number(process.env.MAX_PRICE_USDC ?? "0.50");
if (!Number.isFinite(maxPriceUsdc) || maxPriceUsdc <= 0 || maxPriceUsdc > 100) {
  console.error("MAX_PRICE_USDC must be a number between 0 and 100.");
  process.exit(1);
}

const signer = createEd25519Signer(secretKey, NETWORK);
const rpcUrl =
  process.env.STELLAR_RPC_URL?.trim() ||
  (NETWORK.includes("testnet")
    ? "https://soroban-testnet.stellar.org"
    : "https://soroban-rpc.mainnet.stellar.gateway.fm");

const client = new x402Client()
  // Network pin: registered ONLY for the expected network — a 402 offering
  // terms on any other network has no matching scheme and is never paid.
  .register(NETWORK, new ExactStellarScheme(signer, { url: rpcUrl }))
  // payTo allowlist: filter out any terms whose recipient is not pinned.
  // If nothing survives, the wrapped fetch fails without signing anything.
  .registerPolicy((_version: number, reqs: PaymentRequirements[]) => {
    const allowed = reqs.filter((r) => expectedPayTo.includes(r.payTo));
    for (const r of reqs) {
      if (!expectedPayTo.includes(r.payTo)) {
        console.warn(
          `[guard] payment terms REJECTED — payTo ${r.payTo} is not in EXPECTED_PAY_TO (possible DNS/server compromise or misconfig)`
        );
      }
    }
    return allowed;
  })
  .setSpendControls({ maxAmountPerPayment: `$${maxPriceUsdc}` });

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Single call: the client receives the 402 and signs those exact terms —
// after the allowlist policy and the spend cap have filtered them.
let res: Response;
try {
  res = await fetchWithPayment(url);
} catch (err) {
  console.error(
    "Payment aborted before signing (allowlist/spend-cap guard or negotiation error):",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
}

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
  const explorer = NETWORK.includes("testnet")
    ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
    : `https://stellar.expert/explorer/public/tx/${txHash}`;
  console.log(`\nSettled on-chain: ${explorer}`);
} else {
  console.log(
    "\nVerify the payment in your own account's recent payments on https://stellar.expert (the settlement receipt header was not present)."
  );
}
