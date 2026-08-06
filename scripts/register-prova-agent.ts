/**
 * Register TIA agent on Prova (devnet) — one-shot.
 *
 * Usage:
 *   npm run register-prova:devnet
 *
 * Requires KEEPER_PRIVATE_KEY (or PROVA_OPERATOR_SECRET_KEY) funded on devnet.
 * Generates PROVA_AGENT_SECRET_KEY if not set (~0.5 SOL recommended for agent + operator fees).
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { Keypair } from "@solana/web3.js";
import { ProvaClient } from "prova-agent-sdk";

function parseKeypair(raw: string): Keypair {
  const parsed = JSON.parse(raw.trim()) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

function loadOperatorKeypair(): Keypair {
  const raw =
    process.env.PROVA_OPERATOR_SECRET_KEY?.trim() ||
    process.env.KEEPER_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error(
      "Set PROVA_OPERATOR_SECRET_KEY or KEEPER_PRIVATE_KEY (JSON secret key array)."
    );
  }
  return parseKeypair(raw);
}

function loadOrGenerateAgentKeypair(): Keypair {
  const raw = process.env.PROVA_AGENT_SECRET_KEY?.trim();
  if (raw) {
    return parseKeypair(raw);
  }
  const agent = Keypair.generate();
  console.log("\n[prova] Generated new PROVA_AGENT_SECRET_KEY:");
  console.log(JSON.stringify(Array.from(agent.secretKey)));
  return agent;
}

async function main() {
  const rpcUrl =
    process.env.PROVA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";

  console.log("[prova] Register TIA agent on devnet");
  console.log("  RPC:", rpcUrl);

  const operatorKeypair = loadOperatorKeypair();
  const agentKeypair = loadOrGenerateAgentKeypair();

  console.log("  Operator:", operatorKeypair.publicKey.toBase58());
  console.log("  Agent:   ", agentKeypair.publicKey.toBase58());

  const prova = new ProvaClient({ rpcUrl, agentKeypair });

  const alreadyActive = await prova.isAgentActive(operatorKeypair.publicKey);
  if (alreadyActive) {
    const account = await prova.getAgentAccount(operatorKeypair.publicKey);
    console.log("\n[prova] Agent already registered.");
    console.log("  Agent PDA:", account.address.toBase58());
    console.log("  Attestations:", account.attestationCount);
    console.log("\nAdd to .env:");
    console.log(`PROVA_ENABLED=true`);
    console.log(`PROVA_AGENT_SECRET_KEY='${JSON.stringify(Array.from(agentKeypair.secretKey))}'`);
    console.log(`NEXT_PUBLIC_PROVA_AGENT_PDA=${account.address.toBase58()}`);
    return;
  }

  const { txSignature, agentPda, explorerUrl } = await prova.registerAgent({
    operatorKeypair,
  });

  console.log("\n[prova] Agent registered.");
  console.log("  Tx:", txSignature);
  console.log("  Agent PDA:", agentPda.toBase58());
  console.log("  Explorer:", explorerUrl);

  console.log("\nAdd to .env:");
  console.log(`PROVA_ENABLED=true`);
  console.log(`PROVA_RPC_URL=${rpcUrl}`);
  console.log(
    `PROVA_AGENT_SECRET_KEY='${JSON.stringify(Array.from(agentKeypair.secretKey))}'`
  );
  console.log(`NEXT_PUBLIC_PROVA_AGENT_PDA=${agentPda.toBase58()}`);

  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    console.log("\n[prova] Tip: run `npm run sync-env` after updating .env");
  }
}

main().catch((err) => {
  console.error("[prova] Failed:", err);
  process.exit(1);
});
