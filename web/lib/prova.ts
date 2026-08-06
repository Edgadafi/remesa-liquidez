import { ProvaClient, type ActionType } from "prova-agent-sdk";
import { Keypair } from "@solana/web3.js";

export interface ProvaAttestResult {
  ok: boolean;
  explorerUrl?: string;
  txSignature?: string;
  error?: string;
}

export interface ProvaAttestResponse {
  ok: boolean;
  explorerUrl?: string;
  decisionExplorerUrl?: string;
  error?: string;
}

export interface ProvaStatus {
  enabled: boolean;
  active: boolean;
  agentPda: string | null;
  attestationCount?: number;
}

let cachedClient: ProvaClient | null = null;
let cachedOperatorKeypair: Keypair | null = null;

function parseKeypair(raw: string | undefined): Keypair | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim()) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    return null;
  }
}

function loadProvaConfig(): {
  rpcUrl: string;
  agentKeypair: Keypair;
  operatorKeypair: Keypair;
} | null {
  if (process.env.PROVA_ENABLED !== "true") return null;

  const rpcUrl =
    process.env.PROVA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";

  const agentKeypair = parseKeypair(process.env.PROVA_AGENT_SECRET_KEY);
  const operatorKeypair =
    parseKeypair(process.env.PROVA_OPERATOR_SECRET_KEY) ??
    parseKeypair(process.env.KEEPER_PRIVATE_KEY);

  if (!agentKeypair || !operatorKeypair) {
    console.warn(
      "[Prova] PROVA_ENABLED but missing PROVA_AGENT_SECRET_KEY or operator keypair"
    );
    return null;
  }

  return { rpcUrl, agentKeypair, operatorKeypair };
}

function getClient(): ProvaClient | null {
  const config = loadProvaConfig();
  if (!config) return null;

  if (!cachedClient) {
    cachedClient = new ProvaClient({
      rpcUrl: config.rpcUrl,
      agentKeypair: config.agentKeypair,
    });
    cachedOperatorKeypair = config.operatorKeypair;
  }

  return cachedClient;
}

export async function getProvaStatus(): Promise<ProvaStatus> {
  const enabled = process.env.PROVA_ENABLED === "true";
  const envAgentPda = process.env.NEXT_PUBLIC_PROVA_AGENT_PDA ?? null;

  if (!enabled) {
    return { enabled: false, active: false, agentPda: envAgentPda };
  }

  const client = getClient();
  if (!client || !cachedOperatorKeypair) {
    return { enabled: true, active: false, agentPda: envAgentPda };
  }

  try {
    const active = await client.isAgentActive(cachedOperatorKeypair.publicKey);
    if (!active) {
      return { enabled: true, active: false, agentPda: envAgentPda };
    }

    const account = await client.getAgentAccount(cachedOperatorKeypair.publicKey);
    return {
      enabled: true,
      active: true,
      agentPda: account.address.toBase58(),
      attestationCount: account.attestationCount,
    };
  } catch (err) {
    console.warn("[Prova] getProvaStatus failed:", err);
    return { enabled: true, active: false, agentPda: envAgentPda };
  }
}

/** Fail-open attestation — never throws to caller. */
export async function attestBuiltAction(
  actionType: ActionType,
  builtPayload: unknown,
  privacyMode = false
): Promise<ProvaAttestResult> {
  const client = getClient();
  if (!client || !cachedOperatorKeypair) {
    return { ok: false, error: "Prova not configured" };
  }

  try {
    const actionHash = await ProvaClient.hashAction(JSON.stringify(builtPayload));
    const { txSignature, explorerUrl } = await client.attest({
      operatorKeypair: cachedOperatorKeypair,
      actionHash,
      actionType,
      privacyMode,
    });
    return { ok: true, explorerUrl, txSignature };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Prova attest failed";
    console.warn("[Prova] attestBuiltAction failed:", error);
    return { ok: false, error };
  }
}
