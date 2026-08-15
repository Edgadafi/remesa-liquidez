/**
 * Prepara cuenta Stellar testnet para pagar x402 (XLM + trustline USDC).
 * USDC: solicitar manualmente en https://faucet.circle.com/ → Stellar Testnet.
 *
 * Uso:
 *   npm run fund-x402-payer
 *   # luego Circle faucet → pegar la public key impresa
 *   npm run x402:smoke
 */
import "dotenv/config";
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

async function main() {
  let secret = process.env.STELLAR_TESTNET_SECRET?.trim();
  let kp: Keypair;

  if (secret) {
    kp = Keypair.fromSecret(secret);
    console.log("[fund-x402-payer] Reusing STELLAR_TESTNET_SECRET");
  } else {
    kp = Keypair.random();
    secret = kp.secret();
    console.log("[fund-x402-payer] Generated new testnet keypair");
    console.log(`STELLAR_TESTNET_SECRET=${secret}`);
    console.log("(Add to remesa-liquidez/.env and run npm run sync-env)");
  }

  const pub = kp.publicKey();
  console.log(`Public: ${pub}`);

  const fb = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(pub)}`
  );
  const fbText = await fb.text();
  if (!fb.ok && !fbText.includes("already funded")) {
    throw new Error(`Friendbot failed: ${fb.status} ${fbText}`);
  }
  console.log("[fund-x402-payer] Friendbot OK (XLM)");

  await new Promise((r) => setTimeout(r, 2000));

  const server = new Horizon.Server(HORIZON);
  const account = await server.loadAccount(pub);

  const hasUsdcTrust = account.balances.some(
    (b) =>
      "asset_code" in b &&
      b.asset_code === "USDC" &&
      b.asset_issuer === USDC_ISSUER
  );

  if (!hasUsdcTrust) {
    const usdc = new Asset("USDC", USDC_ISSUER);
    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: usdc, limit: "1000" }))
      .setTimeout(60)
      .build();
    tx.sign(kp);
    const res = await server.submitTransaction(tx);
    console.log(`[fund-x402-payer] USDC trustline: ${res.hash}`);
  } else {
    console.log("[fund-x402-payer] USDC trustline already exists");
  }

  const refreshed = await server.loadAccount(pub);
  const usdcBal = refreshed.balances.find(
    (b) => "asset_code" in b && b.asset_code === "USDC"
  );
  const balance = usdcBal && "balance" in usdcBal ? usdcBal.balance : "0";

  console.log(`[fund-x402-payer] USDC balance: ${balance}`);

  // STELLAR_PAY_TO must exist on testnet with USDC trustline or x402 settlement fails.
  const payTo = process.env.STELLAR_PAY_TO?.trim();
  if (payTo && payTo !== pub) {
    console.log(
      `\n[fund-x402-payer] WARN: STELLAR_PAY_TO (${payTo.slice(0, 8)}…) differs from payer.`
    );
    console.log(
      "Ensure payTo is funded on testnet + has USDC trustline, or set STELLAR_PAY_TO to the payer public key for local smoke."
    );
  } else if (!payTo || payTo !== pub) {
    console.log(
      `\n[fund-x402-payer] Tip: set STELLAR_PAY_TO=${pub} for local x402 smoke (same funded account).`
    );
  }

  if (parseFloat(balance) < 0.01) {
    console.log("\n--- Next step (manual, ~1 min) ---");
    console.log("1. Open https://faucet.circle.com/");
    console.log("2. Select network: Stellar Testnet");
    console.log(`3. Paste address: ${pub}`);
    console.log('4. Request USDC → wait ~30s');
    console.log("5. Run: RENDER_BACKEND_URL=http://localhost:3000 npm run x402:smoke");
    process.exit(1);
  }

  console.log("[fund-x402-payer] Ready for x402 smoke (≥0.01 USDC)");
}

main().catch((err) => {
  console.error("[fund-x402-payer] FAILED:", err);
  process.exit(1);
});
