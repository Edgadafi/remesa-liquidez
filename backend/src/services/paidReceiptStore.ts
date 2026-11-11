/**
 * Guarda el JSON que el handler ya produjo, antes de que x402 liquide.
 * Al confirmarse la liquidación se liga al hash de la tx. El store es el
 * KV que ya usa la API (Upstash si hay credenciales; memoria por instancia
 * si no). No guarda el header de pago ni la firma.
 */
import { randomUUID } from "node:crypto";
import { getKvBackend } from "./kvStore.js";
import { lookupChainPayment, type ChainLookup } from "./stellarPayment.js";

const TTL_SECONDS = 7 * 24 * 60 * 60;
const OPEN_MAX = 100;
const OPEN_KEY = "tia:x402:open";

function idKey(id: string): string {
  return `tia:x402:id:${id}`;
}

function txKey(hash: string): string {
  return `tia:x402:tx:${hash}`;
}

export interface PaidReceiptRecord {
  id: string;
  status: "pending" | "confirmed";
  endpoint: string;
  payload: unknown;
  auditHash: string | null;
  storedAt: string;
  payer: string | null;
  amount: string | null;
  payTo: string | null;
  txHash: string | null;
}

export type PaidReceiptLookup =
  | { status: "missing" }
  | { status: "pending" }
  | { status: "confirmed"; record: PaidReceiptRecord };

async function readRecord(id: string): Promise<PaidReceiptRecord | null> {
  const raw = await getKvBackend().get(idKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PaidReceiptRecord;
    if (!parsed || parsed.id !== id || (parsed.status !== "pending" && parsed.status !== "confirmed")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function savePaidResponse(input: {
  endpoint: string;
  payload: unknown;
  auditHash: string | null;
  payer: string | null;
  amount: string | null;
  payTo: string | null;
}): Promise<string> {
  const id = randomUUID();
  const record: PaidReceiptRecord = {
    id,
    status: "pending",
    endpoint: input.endpoint,
    payload: input.payload,
    auditHash: input.auditHash,
    storedAt: new Date().toISOString(),
    payer: input.payer,
    amount: input.amount,
    payTo: input.payTo,
    txHash: null,
  };
  const kv = getKvBackend();
  await kv.set(idKey(id), JSON.stringify(record), TTL_SECONDS);
  await kv.listPush(OPEN_KEY, id, OPEN_MAX);
  return id;
}

export async function confirmPaidResponse(id: string, txHash: string): Promise<void> {
  const record = await readRecord(id);
  if (!record) return;
  record.status = "confirmed";
  record.txHash = txHash;
  const kv = getKvBackend();
  await kv.set(idKey(id), JSON.stringify(record), TTL_SECONDS);
  await kv.set(txKey(txHash), id, TTL_SECONDS);
}

/** Tests y el caso "hay registro, la cadena todavía no confirma". */
export async function stagePendingTx(id: string, txHash: string): Promise<void> {
  const record = await readRecord(id);
  if (!record) return;
  record.txHash = txHash;
  record.status = "pending";
  const kv = getKvBackend();
  await kv.set(idKey(id), JSON.stringify(record), TTL_SECONDS);
  await kv.set(txKey(txHash), id, TTL_SECONDS);
}

async function recordByTx(txHash: string): Promise<PaidReceiptRecord | null> {
  const id = await getKvBackend().get(txKey(txHash));
  if (!id) return null;
  return readRecord(id);
}

async function matchOpen(
  payer: string | null,
  amount: string | null,
  payTo: string
): Promise<PaidReceiptRecord | null> {
  if (!payer || !amount) return null;
  const ids = await getKvBackend().listAll(OPEN_KEY);
  let best: PaidReceiptRecord | null = null;
  for (const id of ids) {
    const record = await readRecord(id);
    if (!record || record.status === "confirmed") continue;
    if (record.payTo !== payTo || record.payer !== payer || record.amount !== amount) continue;
    if (!best || record.storedAt > best.storedAt) best = record;
  }
  return best;
}

export async function resolvePaidReceipt(txHash: string): Promise<PaidReceiptLookup> {
  const payTo = process.env.STELLAR_PAY_TO?.trim() || "";
  const direct = await recordByTx(txHash);
  const chain: ChainLookup = payTo
    ? await lookupChainPayment(txHash, payTo)
    : { kind: "unavailable" };

  if (chain.kind === "pays_us") {
    const record = direct ?? (await matchOpen(chain.payer, chain.amount, chain.payTo));
    if (!record) return { status: "missing" };
    if (record.status !== "confirmed" || record.txHash !== txHash) {
      await confirmPaidResponse(record.id, txHash);
    }
    const fresh = (await readRecord(record.id)) ?? record;
    return { status: "confirmed", record: fresh };
  }

  if (chain.kind === "other") return { status: "missing" };
  if (direct) return { status: "pending" };
  return { status: "missing" };
}
