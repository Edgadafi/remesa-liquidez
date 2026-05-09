/**
 * Full on-chain demo on devnet: mint SPL → reservation → markVerified → cashout (fee split).
 *
 * Prerequisites:
 *   anchor build
 *   Program deployed on devnet
 *   yarn register-merchants:devnet → scripts/.merchants-demo-devnet.json
 *
 * PAYERS:
 *   - Admin (~/.config/solana/id.json): creates mint + funds sender SOL + ATA rent assists
 *   - Sender/receiver/new keypairs ephemeral
 *   - Merchant from demo JSON (must have SOL; transfers from admin topped them up earlier)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { AnchorProvider, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

import idl from "../target/idl/remesa_liquidez.json";
import type { RemesaProgram } from "../client/index";
import {
  BPS_DENOMINATOR,
  FEE_BPS,
  buildInitializeReservationIx,
  buildMarkVerifiedIx,
  buildValidateCashoutIx,
  findMerchantPda,
  findTreasuryTokenAccountPda,
  findReservationPda,
} from "../client/index";

type DemoFile = {
  merchants: Array<{ label: string; secretKey: number[] }>;
};

function loadSecretKeypair(absPath: string): Keypair {
  const parsed = JSON.parse(fs.readFileSync(absPath, "utf8"));
  const arr = parsed as unknown;
  let secret: number[];
  if (Array.isArray(arr)) {
    secret = arr as number[];
  } else if (
    arr &&
    typeof arr === "object" &&
    "secretKey" in arr &&
    Array.isArray((arr as { secretKey: number[] }).secretKey)
  ) {
    secret = (arr as { secretKey: number[] }).secretKey;
  } else {
    throw new Error(`Unsupported keypair format in ${absPath}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function sendTx(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[],
  feePayer: Keypair
): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = feePayer.publicKey;
  tx.sign(...signers);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
  });
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  return sig;
}

async function main() {
  const rpc =
    process.env.SOLANA_RPC_URL ??
    clusterApiUrl("devnet");

  const adminPath =
    process.env.ADMIN_KEYPAIR ??
    path.join(os.homedir(), ".config/solana/id.json");
  const admin = loadSecretKeypair(adminPath);

  const demoPath = path.join(__dirname, ".merchants-demo-devnet.json");
  if (!fs.existsSync(demoPath)) {
    throw new Error(
      `Missing ${demoPath}. Run: yarn register-merchants:devnet`
    );
  }
  const demo = JSON.parse(
    fs.readFileSync(demoPath, "utf8")
  ) as DemoFile;
  const mIdx =
    typeof process.env.MERCHANT_INDEX === "string"
      ? parseInt(process.env.MERCHANT_INDEX, 10)
      : 0;
  const m = demo.merchants[mIdx];
  if (!m) throw new Error(`No merchant demo index ${mIdx}`);
  const merchant = Keypair.fromSecretKey(Uint8Array.from(m.secretKey));

  const sender = Keypair.generate();
  const receiver = Keypair.generate();

  const amountRaw = BigInt(process.env.AMOUNT_RAW ?? "100000000");
  const expirySeconds = BigInt(
    process.env.EXPIRY_SECONDS ?? String(7 * 24 * 60 * 60)
  );

  const connection = new Connection(rpc, "confirmed");

  console.log("[e2e] rpc", rpc);
  console.log("[e2e] admin", admin.publicKey.toBase58());
  console.log("[e2e] sender", sender.publicKey.toBase58());
  console.log("[e2e] receiver", receiver.publicKey.toBase58());
  console.log(
    "[e2e] merchant",
    merchant.publicKey.toBase58(),
    `(${m.label ?? "merchant"})`
  );
  console.log("[e2e] lock amount_raw", amountRaw.toString());

  const providerWallet = new Wallet(admin);
  const provider = new AnchorProvider(connection, providerWallet, {
    commitment: "confirmed",
  });

  const program = new Program(
    idl as Idl,
    provider
  ) as unknown as RemesaProgram;

  // 1) SOL to sender — pays reservation + escrow vault rents
  console.log("[e2e] fund sender with ~0.12 SOL...");
  await sendTx(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: admin.publicKey,
        toPubkey: sender.publicKey,
        lamports: 120_000_000,
      })
    ),
    [admin],
    admin
  );

  const mintPk = await createMint(
    connection,
    admin,
    admin.publicKey,
    null,
    6
  );
  console.log("[e2e] mint", mintPk.toBase58());

  const senderAta = await getOrCreateAssociatedTokenAccount(
    connection,
    admin,
    mintPk,
    sender.publicKey
  ).then((x) => x.address);
  console.log("[e2e] sender ATA", senderAta.toBase58());

  const tokensToMint = 10_000n * 1_000_000n; // 10_000 with 6 decimals
  await mintTo(
    connection,
    admin,
    mintPk,
    senderAta,
    admin,
    tokensToMint
  ).then((s) => console.log("[e2e] mintTo sender sig", s));

  const merchantAta = (
    await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      mintPk,
      merchant.publicKey
    )
  ).address;

  console.log("[e2e] merchant ATA", merchantAta.toBase58());

  const [whitelistPda] = findMerchantPda(
    program.programId,
    merchant.publicKey
  );
  const wh = await connection.getAccountInfo(whitelistPda);
  if (!wh) {
    throw new Error(
      `Merchant whitelist account missing ${whitelistPda.toBase58()}. Register first.`
    );
  }

  // 4) Initialize reservation — sender signs
  const initIx = await buildInitializeReservationIx({
    program,
    sender: sender.publicKey,
    receiver: receiver.publicKey,
    mint: mintPk,
    senderTokenAccount: senderAta,
    amount: amountRaw,
    expirySeconds,
    preferredMerchant: null,
  });

  console.log("[e2e] initializeReservation...");
  const sigInit = await sendTx(
    connection,
    new Transaction().add(initIx),
    [sender],
    sender
  );
  console.log("[e2e] init tx", sigInit);

  const [reservationPk] = findReservationPda(
    program.programId,
    receiver.publicKey
  );
  console.log("[e2e] reservation PDA", reservationPk.toBase58());

  // 5) markVerified — sender signs
  const verifyIx = await buildMarkVerifiedIx({
    program,
    sender: sender.publicKey,
    receiver: receiver.publicKey,
  });
  console.log("[e2e] markVerified...");
  const sigMv = await sendTx(
    connection,
    new Transaction().add(verifyIx),
    [sender],
    sender
  );
  console.log("[e2e] markVerified tx", sigMv);

  const resAcc = await program.account.turnReservation.fetch(reservationPk);
  if (!(resAcc as unknown as { isVerified: boolean }).isVerified) {
    throw new Error("is_verified not set after markVerified");
  }

  const merchantBalBefore = (
    await getAccount(connection, merchantAta)
  ).amount;
  console.log("[e2e] merchant ATA before cashout", merchantBalBefore.toString());

  // 6) validateCashout — merchant signs (+ may pay treasury_vault rent)
  const cashIx = await buildValidateCashoutIx({
    program,
    receiver: receiver.publicKey,
    merchant: merchant.publicKey,
    mint: mintPk,
    merchantTokenAccount: merchantAta,
  });
  console.log("[e2e] validateCashout...");
  const sigCo = await sendTx(
    connection,
    new Transaction().add(cashIx),
    [merchant],
    merchant
  );
  console.log("[e2e] cashout tx", sigCo);

  const amt = amountRaw as bigint;
  const fee = (amt * BigInt(FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  const net = amt - fee;

  const merchantBalAfter = (await getAccount(connection, merchantAta)).amount;
  console.log("[e2e] merchant ATA after cashout", merchantBalAfter.toString());

  const [treasuryAtaPk] = findTreasuryTokenAccountPda(program.programId, mintPk);
  const treasuryAmt = BigInt((await getAccount(connection, treasuryAtaPk)).amount);

  console.log("[e2e] treasury ATA", treasuryAtaPk.toBase58(), "balance", treasuryAmt.toString());

  const gained = merchantBalAfter - merchantBalBefore;

  console.log("");
  console.log("[e2e] Done");
  console.log(
    `[e2e] expected net=${
      typeof net === "bigint" ? net.toString() : net
    }, fee=${fee.toString()}, merchant gained=${gained.toString()}`
  );

  if (BigInt(gained) !== BigInt(net)) {
    console.warn("[e2e] WARNING: merchant ATA delta differs from computed net.");
  }

  console.log("");
  console.log("[e2e] Blink URLs / PDAs:");
  console.log(`  reservation PDA: ${reservationPk.toBase58()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
