/**
 * Test script for anchoring a receipt on Nirium testnet.
 * Uses a throwaway key and reports the CID.
 */

import { receipt } from "../src/lib/receipt.js";

// Throwaway testnet keypair (safe to include in code - for testing only)
const THROWAWAY_SECRET = "SDJMRZ32I2JCD3YMC5HMCUNYVSCL7HNWHOPQ7WBQK7YSNIGMGXGQAGWR";
const THROWAWAY_PUBLIC = "GCSVP4X2M222VKUL4AQJC3KFYK772JZ4ZAI5Q5ITC7HGKDQYJLNZX5NM";

// Set up environment for this test
process.env.TIA_RECEIPT_SECRET = THROWAWAY_SECRET;
process.env.NIRIUM_NETWORK = "testnet";
process.env.NIRIUM_API_KEY = "demo";

async function main() {
  console.log("🧪 Testing Nirium receipt anchor on testnet...\n");
  console.log("Public key:", THROWAWAY_PUBLIC);
  console.log("Network: testnet\n");

  const testPayload = {
    v: "tia-receipt-v1" as const,
    endpoint: "GET /v1/route",
    requestId: "test-" + Date.now(),
    timestamp: new Date().toISOString(),
    data: {
      apiVersion: "1",
      amountUsd: 100,
      midRate: 20.15,
      best: "bitso_directo",
      options: [
        { route: "bitso_directo", label: "Bitso", mxnOut: 1995.23 },
        { route: "stablecoin_usdc", label: "USDC", mxnOut: 1990.15 },
      ],
    },
  };

  console.log("📦 Anchoring test receipt...");
  const result = await receipt.anchorReceipt(testPayload);

  if (!result) {
    console.error("\n❌ Failed to anchor receipt");
    console.error("   Check logs above for details");
    process.exit(1);
  }

  console.log("\n✅ Receipt anchored successfully!\n");
  console.log("CID:        ", result.cid);
  console.log("SHA-256:    ", result.sha256);
  console.log("Signer:     ", result.signer);
  console.log("Anchored at:", result.anchoredAt);
  console.log("\nGateway URL:", `https://gateway.pinata.cloud/ipfs/${result.cid}`);
  console.log("\nVerify with:");
  console.log(`  curl https://x402.holatia.app/v1/receipt/${result.cid}`);
  console.log("  (or run this against your local backend)");

  // Verify the receipt
  console.log("\n🔍 Verifying receipt...");
  const verification = await receipt.verifyReceipt(result.cid, result.sha256);

  if (verification.ok) {
    console.log("✅ Verification passed!");
  } else {
    console.log("❌ Verification failed:", verification.error);
  }
}

main().catch((err) => {
  console.error("\n💥 Error:", err);
  process.exit(1);
});
