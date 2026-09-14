#!/usr/bin/env npx ts-node
/**
 * Stellar testnet E2E smoke — Accesly + Soroban USDC lock.
 *
 * Prerequisites:
 *   1. cd contracts/remesa-tia-stellar && cargo test
 *   2. soroban contract deploy with constructor: admin, USDC SAC, treasury
 *      Testnet USDC SAC: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUZ2BQN4WFRIE3USCIHMXQDAMAA
 *   3. STELLAR_CONTRACT_ID + NEXT_PUBLIC_ACCESLY_APP_ID
 *   4. Accesly wallet funded + USDC trustline on testnet
 *
 * Run: npm run e2e:stellar:testnet
 * @see docs/accesly-integration.md
 */

import { stellarHealthCheck, acceslyStellarHealthCheck, buildInitializeReservationInvoke } from "../client/stellar/index";

async function main() {
  console.log("[e2e-stellar] Dual-chain + Accesly smoke\n");

  const contractId = process.env.STELLAR_CONTRACT_ID;
  const rpc =
    process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  const network = process.env.STELLAR_NETWORK ?? "testnet";

  console.log("  network:     ", network);
  console.log("  rpc:         ", rpc);
  console.log("  contract_id: ", contractId ?? "(not set)");

  const accesly = await acceslyStellarHealthCheck();
  console.log("\n  accesly:     ", accesly.ok ? "OK" : "SKIP", "—", accesly.message);

  const stellar = await stellarHealthCheck();
  console.log("  soroban:     ", stellar.ok ? "OK" : "SKIP", "—", stellar.message);

  if (!contractId) {
    console.log("\n[e2e-stellar] SKIP invoke — deploy contracts/remesa-tia-stellar first.");
    console.log("  cd contracts/remesa-tia-stellar && soroban contract build");
    console.log("  See contracts/remesa-tia-stellar/README.md\n");
    process.exit(0);
  }

  const spec = buildInitializeReservationInvoke(
    1n,
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    1_000_000n
  );
  console.log("\n[e2e-stellar] Invoke spec (unsigned):");
  console.log("  fn:   ", spec.functionName);
  console.log("  args: ", spec.args);

  console.log("\n[e2e-stellar] Next: sign XDR via Accesly useAccesly().tx.signRawXdr in web UI.");
  console.log("  Flow: initialize_reservation → mark_verified → validate_cashout\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
