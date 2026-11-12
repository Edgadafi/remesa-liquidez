/**
 * Guarda el JSON que el handler ya produjo, antes de que x402 liquide.
 * La clave es el nonce del auth entry (`cuenta:nonce`), no el pagador ni
 * el monto. Al confirmarse la liquidación se liga ese mismo identificador
 * al hash de la tx. Sin nonce el registro queda unbound y no se liga.
 * El store es el KV que ya usa la API (Upstash si hay credenciales; memoria
 * por instancia si no). No guarda el header de pago ni la firma.
 */
import { randomUUID } from "node:crypto";
import { getKvBackend } from "./kvStore.js";
import { lookupChainPayment, type ChainLookup } from "./stellarPayment.js";

const TTL_SECONDS = 7 * 24 * 60 * 60;

function idKey(id: string): string {
  return `tia:x402:id:${id}`;
}

function txKey(hash: string): string {
  return `tia:x402:tx:${hash}`;
}

function payKey(paymentKey: string): string {
  return `tia:x402:pay:${paymentKey}`;
}

export interface PaidReceiptRecord {
  id: string;
  status: "pending" | "confirmed" | "unbound";
  endpoint: string;
  payload: unknown;
  auditHash: string | null;
  storedAt: string;
  payer: string | null;
  amount: string | null;
  payTo: string | null;
  paymentKey: string | null;
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
    if (
      !parsed ||
      parsed.id !== id ||
      (parsed.status !== "pending" && parsed.status !== "confirmed" && parsed.status !== "unbound")
    ) {
      return null;
    }
    if (typeof parsed.paymentKey !== "string") parsed.paymentKey = null;
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
  paymentKey: string | null;
}): Promise<string> {
  const id = randomUUID();
  const paymentKey = input.paymentKey?.trim() || null;
  const record: PaidReceiptRecord = {
    id,
    status: paymentKey ? "pending" : "unbound",
    endpoint: input.endpoint,
    payload: input.payload,
    auditHash: input.auditHash,
    storedAt: new Date().toISOString(),
    payer: input.payer,
    amount: input.amount,
    payTo: input.payTo,
    paymentKey,
    txHash: null,
  };
  const kv = getKvBackend();
  await kv.set(idKey(id), JSON.stringify(record), TTL_SECONDS);
  if (paymentKey) await kv.set(payKey(paymentKey), id, TTL_SECONDS);
  return id;
}

export async function confirmPaidResponse(id: string, txHash: string): Promise<void> {
  const record = await readRecord(id);
  if (!record || record.status === "unbound" || !record.paymentKey) return;
  if (record.txHash && record.txHash !== txHash) return;
  record.status = "confirmed";
  record.txHash = txHash;
  const kv = getKvBackend();
  await kv.set(idKey(id), JSON.stringify(record), TTL_SECONDS);
  await kv.set(txKey(txHash), id, TTL_SECONDS);
  await kv.set(payKey(record.paymentKey), id, TTL_SECONDS);
}

/** Tests y el caso "hay registro, la cadena todavía no confirma". */
export async function stagePendingTx(id: string, txHash: string): Promise<void> {
  const record = await readRecord(id);
  if (!record || record.status === "unbound" || !record.paymentKey) return;
  if (record.txHash && record.txHash !== txHash) return;
  record.txHash = txHash;
  record.status = "pending";
  const kv = getKvBackend();
  await kv.set(idKey(id), JSON.stringify(record), TTL_SECONDS);
  await kv.set(txKey(txHash), id, TTL_SECONDS);
}

async function recordByTx(txHash: string): Promise<PaidReceiptRecord | null> {
  const id = await getKvBackend().get(txKey(txHash));
  if (!id) return null;
  const record = await readRecord(id);
  if (!record || record.status === "unbound") return null;
  if (record.txHash && record.txHash !== txHash) return null;
  return record;
}

async function recordByPaymentKey(paymentKey: string): Promise<PaidReceiptRecord | null> {
  const id = await getKvBackend().get(payKey(paymentKey));
  if (!id) return null;
  const record = await readRecord(id);
  if (!record || record.status === "unbound" || record.paymentKey !== paymentKey) return null;
  return record;
}

export async function resolvePaidReceipt(txHash: string): Promise<PaidReceiptLookup> {
  const payTo = process.env.STELLAR_PAY_TO?.trim() || "";
  const direct = await recordByTx(txHash);
  const chain: ChainLookup = payTo
    ? await lookupChainPayment(txHash, payTo)
    : { kind: "unavailable" };

  if (chain.kind === "pays_us") {
    const byKey =
      !direct && chain.paymentKey ? await recordByPaymentKey(chain.paymentKey) : null;
    const record = direct ?? byKey;
    if (!record || record.status === "unbound") return { status: "missing" };
    if (record.txHash && record.txHash !== txHash) return { status: "missing" };
    if (record.status !== "confirmed" || record.txHash !== txHash) {
      await confirmPaidResponse(record.id, txHash);
    }
    const fresh = (await readRecord(record.id)) ?? record;
    if (fresh.status === "unbound" || fresh.txHash !== txHash) return { status: "missing" };
    return { status: "confirmed", record: fresh };
  }

  if (chain.kind === "other") return { status: "missing" };
  if (direct) return { status: "pending" };
  return { status: "missing" };
}
