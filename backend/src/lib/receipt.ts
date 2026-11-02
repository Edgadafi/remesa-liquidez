/**
 * Verifiable receipts for TIA route quotes using Nirium Audit Trail.
 * 
 * Each successful /v1/route response can get a receipt: the canonical JSON
 * payload is hashed (sha256), signed (ed25519 over `nirium-audit-v1:<hex>`),
 * and anchored to IPFS via Nirium. The receipt includes the CID, hash, and
 * signer public key. Anchoring failures never break the paid response.
 * 
 * Payload contains only quote/route data, timestamp, request id — no personal data.
 */

import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { Agent } from "nirium";

const STATEMENT_PREFIX = "nirium-audit-v1:";
const HEX_64 = /^[0-9a-f]{64}$/;

export interface ReceiptPayload {
  v: "tia-receipt-v1";
  endpoint: string;
  requestId: string;
  timestamp: string;
  /** Route comparison data — amount, rates, routes, etc. */
  data: unknown;
}

export interface Receipt {
  /** IPFS CID of the anchored record */
  cid: string;
  /** SHA-256 hash of the canonical JSON payload */
  sha256: string;
  /** Stellar public key (G...) of the signer */
  signer: string;
  /** ISO timestamp when anchored */
  anchoredAt: string;
}

export interface ReceiptModule {
  /**
   * Anchor a receipt for a route response. Returns receipt metadata or null if
   * anchoring failed (never throws — failures are logged).
   */
  anchorReceipt(payload: ReceiptPayload): Promise<Receipt | null>;
  
  /**
   * Verify a receipt by fetching and checking the IPFS document.
   */
  verifyReceipt(cid: string, expectedHash: string): Promise<{ ok: boolean; error?: string }>;
}

/**
 * Canonical JSON: keys sorted, no whitespace, stable number serialization.
 */
function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortValue(source[key]);
    }
    return sorted;
  }
  return value;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function receiptSigner(): Keypair | null {
  const secret = process.env.TIA_RECEIPT_SECRET?.trim();
  if (!secret) {
    console.warn("[receipt] TIA_RECEIPT_SECRET not configured");
    return null;
  }
  try {
    return Keypair.fromSecret(secret);
  } catch (err) {
    console.error("[receipt] Invalid TIA_RECEIPT_SECRET:", err instanceof Error ? err.message : "invalid");
    return null;
  }
}

function niriumNetwork(): "stellar:testnet" | "stellar:pubnet" {
  const env = process.env.NIRIUM_NETWORK?.trim()?.toLowerCase();
  return env === "mainnet" || env === "pubnet" ? "stellar:pubnet" : "stellar:testnet";
}

function niriumBaseUrl(): string {
  const network = niriumNetwork();
  return network === "stellar:pubnet"
    ? "https://nirium-agent-mainnet.fly.dev"
    : "https://nirium-agent.fly.dev";
}

/**
 * Sign the hash with the receipt signing key.
 * Signature is over utf8 `nirium-audit-v1:<hex>`, where <hex> is 64 lowercase hex chars.
 */
function signHash(hex: string, signer: Keypair): string {
  if (!HEX_64.test(hex)) {
    throw new Error("signHash: hex must be 64 lowercase hex chars");
  }
  const message = `${STATEMENT_PREFIX}${hex}`;
  const signature = Buffer.from(signer.sign(Buffer.from(message, "utf8"))).toString("base64");
  return signature;
}

/**
 * Anchor a receipt payload to Nirium Audit Trail.
 */
async function anchorReceipt(payload: ReceiptPayload): Promise<Receipt | null> {
  const signer = receiptSigner();
  if (!signer) {
    return null;
  }

  const canonical = canonicalJson(payload);
  const hash = sha256Hex(canonical);

  let signature: string;
  try {
    signature = signHash(hash, signer);
  } catch (err) {
    console.error("[receipt] Failed to sign:", err instanceof Error ? err.message : "unknown");
    return null;
  }

  const agent = new Agent({
    apiKey: process.env.NIRIUM_API_KEY || "demo",
    baseUrl: niriumBaseUrl(),
  });

  try {
    const anchor = await agent.anchorAuditRecord({
      hash: `sha-256:${hash}`,
      tag: "niriumtober",
      agent: {
        key: signer.publicKey(),
        signature,
        id: "tia-api",
      },
    });

    return {
      cid: anchor.cid,
      sha256: hash,
      signer: signer.publicKey(),
      anchoredAt: anchor.anchoredAt,
    };
  } catch (err) {
    console.error("[receipt] Anchor failed:", err instanceof Error ? err.message : "unknown");
    return null;
  }
}

/**
 * Verify a receipt by fetching the IPFS document and checking the signature.
 */
async function verifyReceipt(cid: string, expectedHash: string): Promise<{ ok: boolean; error?: string }> {
  const signer = receiptSigner();
  if (!signer) {
    return { ok: false, error: "no_signer" };
  }

  const hex = expectedHash.trim().toLowerCase().replace(/^sha-256:/, "");
  if (!HEX_64.test(hex)) {
    return { ok: false, error: "invalid_hash" };
  }

  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
  
  let response: Response;
  try {
    response = await fetch(gatewayUrl, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "gateway_timeout" };
  }

  if (!response.ok) {
    return { ok: false, error: "gateway_error" };
  }

  let doc: Record<string, unknown>;
  try {
    const parsed = await response.json() as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "invalid_doc" };
    }
    doc = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  // Check content_sha256
  if (doc.content_sha256 !== hex) {
    return { ok: false, error: "content_sha256_mismatch" };
  }

  // Check agent signature
  const agent = doc.agent;
  if (!agent || typeof agent !== "object") {
    return { ok: false, error: "no_agent" };
  }

  const agentData = agent as { key?: unknown; signature?: unknown };
  if (typeof agentData.key !== "string" || typeof agentData.signature !== "string") {
    return { ok: false, error: "invalid_agent" };
  }

  if (agentData.key !== signer.publicKey()) {
    return { ok: false, error: "signer_mismatch" };
  }

  // Verify signature
  try {
    const valid = Keypair.fromPublicKey(agentData.key).verify(
      Buffer.from(`${STATEMENT_PREFIX}${hex}`, "utf8"),
      Buffer.from(agentData.signature, "base64")
    );
    if (!valid) {
      return { ok: false, error: "invalid_signature" };
    }
  } catch {
    return { ok: false, error: "verification_failed" };
  }

  return { ok: true };
}

export const receipt: ReceiptModule = {
  anchorReceipt,
  verifyReceipt,
};
