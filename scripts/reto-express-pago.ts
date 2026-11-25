/**
 * Reto Exprés BAF Ship It - Pago relámpago en Stellar testnet
 * Código del reto: SHIP-S97KF8
 * 
 * Envia un pago en testnet con el código del reto en el memo.
 */
import "dotenv/config";
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  Memo,
} from "@stellar/stellar-sdk";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
const RETO_CODE = "SHIP-S97KF8";

async function main() {
  console.log("[reto-express] 🚀 Pago relámpago BAF Ship It");
  console.log(`[reto-express] Código del reto: ${RETO_CODE}\n`);

  // Usar la cuenta que acabamos de crear con fund-x402-payer
  const secret = process.env.STELLAR_TESTNET_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Set STELLAR_TESTNET_SECRET in .env (output from fund-x402-payer)"
    );
  }

  const sourceKeypair = Keypair.fromSecret(secret);
  const sourcePublic = sourceKeypair.publicKey();
  console.log(`[reto-express] Source: ${sourcePublic}`);

  // Destination: friendbot (devuelve a la comunidad)
  const destination = "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";
  console.log(`[reto-express] Destination: ${destination}\n`);

  const server = new Horizon.Server(HORIZON_TESTNET);
  const account = await server.loadAccount(sourcePublic);

  // Construir transacción con el memo del reto
  const transaction = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount: "1", // 1 XLM
      })
    )
    .addMemo(Memo.text(RETO_CODE))
    .setTimeout(60)
    .build();

  transaction.sign(sourceKeypair);

  console.log("[reto-express] Enviando transacción...");
  const result = await server.submitTransaction(transaction);

  console.log("\n✅ PAGO COMPLETADO\n");
  console.log(`Transaction Hash: ${result.hash}`);
  console.log(`Ledger: ${result.ledger}`);
  console.log(`Memo: ${RETO_CODE}`);
  console.log(
    `\n🔗 Stellar Expert:\nhttps://stellar.expert/explorer/testnet/tx/${result.hash}\n`
  );

  return result.hash;
}

main().catch((err) => {
  console.error("[reto-express] ❌ ERROR:", err.message || err);
  process.exit(1);
});
