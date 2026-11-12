/**
 * Lee un pago Stellar (clásico o SAC `transfer`) y dice si el destino es
 * nuestro payTo. Lo usa el recibo gratis: no se devuelve el payload si la
 * tx no paga a esa cuenta.
 */
import {
  Address,
  FeeBumpTransaction,
  Networks,
  Transaction,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

export interface TransferView {
  source: string | null;
  destination: string;
  amount: string;
}

export type ChainLookup =
  | {
      kind: "pays_us";
      payer: string | null;
      amount: string | null;
      payTo: string;
      /** `cuenta:nonce` del auth entry, o null si el envelope no lo trae. */
      paymentKey: string | null;
    }
  | { kind: "other" }
  | { kind: "missing" }
  | { kind: "unavailable" };

type ChainLookupFn = (txHash: string, payTo: string) => Promise<ChainLookup>;

let chainLookupForTests: ChainLookupFn | null = null;

export function setChainLookupForTests(fn: ChainLookupFn | null): void {
  chainLookupForTests = fn;
}

export function stellarNetworkPassphrase(): string {
  return process.env.STELLAR_NETWORK === "mainnet" ||
    process.env.STELLAR_NETWORK === "pubnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

function horizonBase(): string {
  return stellarNetworkPassphrase() === Networks.PUBLIC
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
}

function innerTransaction(envelopeXdr: string): Transaction | null {
  try {
    const parsed = TransactionBuilder.fromXDR(envelopeXdr, stellarNetworkPassphrase());
    if (parsed instanceof FeeBumpTransaction) return parsed.innerTransaction;
    if (parsed instanceof Transaction) return parsed;
    return null;
  } catch {
    return null;
  }
}

function amountOf(value: unknown): string | null {
  if (typeof value === "bigint" || typeof value === "number") return value.toString();
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function readInvokeTransfer(func: xdr.HostFunction): TransferView | null {
  if (func.switch().name !== "hostFunctionTypeInvokeContract") return null;
  const invoke = func.invokeContract();
  if (invoke.functionName().toString() !== "transfer") return null;
  const args = invoke.args();
  if (args.length < 3) return null;
  const from = scValToNative(args[0]);
  const to = scValToNative(args[1]);
  const amount = amountOf(scValToNative(args[2]));
  if (typeof to !== "string" || !amount) return null;
  return {
    source: typeof from === "string" ? from : null,
    destination: to,
    amount,
  };
}

/** Primer pago del envelope. null si el XDR no es una tx de pago legible. */
export function readTransfer(envelopeXdr: string): TransferView | null {
  const tx = innerTransaction(envelopeXdr);
  if (!tx) return null;
  for (const op of tx.operations) {
    if (
      op.type === "payment" ||
      op.type === "pathPaymentStrictReceive" ||
      op.type === "pathPaymentStrictSend"
    ) {
      const amount = "amount" in op ? amountOf(op.amount) : null;
      if (!amount) continue;
      return {
        source: op.source ?? tx.source,
        destination: op.destination,
        amount,
      };
    }
    if (op.type === "invokeHostFunction" && op.func) {
      const transfer = readInvokeTransfer(op.func);
      if (transfer) return transfer;
    }
  }
  return null;
}

export function transferTo(envelopeXdr: string, payTo: string): TransferView | null {
  const transfer = readTransfer(envelopeXdr);
  if (!transfer || transfer.destination !== payTo) return null;
  return transfer;
}

function addressCredentials(
  credentials: xdr.SorobanCredentials
): xdr.SorobanAddressCredentials | null {
  switch (credentials.switch().name) {
    case "sorobanCredentialsAddress":
      return credentials.address();
    case "sorobanCredentialsAddressV2":
      return credentials.addressV2();
    case "sorobanCredentialsAddressWithDelegates":
      return credentials.addressWithDelegates().addressCredentials();
    default:
      return null;
  }
}

/**
 * Identificador del pago: `cuenta:nonce` de cada auth entry de Soroban.
 * El nonce es único por firmante y viaja dentro del auth firmado, así que
 * sigue en el envelope después de que el facilitador reconstruye la tx.
 * null si no hay un nonce legible. No incluye la firma.
 */
export function paymentKeyFromEnvelope(envelopeXdr: string): string | null {
  try {
    const tx = innerTransaction(envelopeXdr);
    if (!tx) return null;
    const parts: string[] = [];
    for (const op of tx.operations) {
      if (op.type !== "invokeHostFunction" || !op.auth) continue;
      for (const entry of op.auth) {
        const creds = addressCredentials(entry.credentials());
        if (!creds) continue;
        const signer = Address.fromScAddress(creds.address()).toString();
        const nonce = creds.nonce().toString();
        if (!signer || !nonce) continue;
        parts.push(`${signer}:${nonce}`);
      }
    }
    return parts.length > 0 ? parts.join(",") : null;
  } catch {
    return null;
  }
}

/** Lee el nonce del XDR que viene en PAYMENT-SIGNATURE o X-PAYMENT. No loguea el header. */
export function paymentKeyFromHeader(header: string): string | null {
  try {
    const pad = header.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(Buffer.from(pad, "base64").toString("utf8")) as {
      payload?: { transaction?: unknown };
    };
    const xdrTx = parsed.payload?.transaction;
    if (typeof xdrTx !== "string" || xdrTx.length === 0) return null;
    return paymentKeyFromEnvelope(xdrTx);
  } catch {
    return null;
  }
}

export interface PaymentFingerprint {
  payer: string | null;
  amount: string | null;
  payTo: string | null;
}

/** Saca from/to/amount del XDR dentro de PAYMENT-SIGNATURE. No loguea el header. */
export function fingerprintFromPaymentHeader(header: string): PaymentFingerprint | null {
  try {
    const pad = header.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(Buffer.from(pad, "base64").toString("utf8")) as {
      payload?: { transaction?: unknown };
    };
    const xdrTx = parsed.payload?.transaction;
    if (typeof xdrTx !== "string" || xdrTx.length === 0) return null;
    const transfer = readTransfer(xdrTx);
    if (!transfer) return null;
    return {
      payer: transfer.source,
      amount: transfer.amount,
      payTo: transfer.destination,
    };
  } catch {
    return null;
  }
}

export async function lookupChainPayment(txHash: string, payTo: string): Promise<ChainLookup> {
  if (chainLookupForTests) return chainLookupForTests(txHash, payTo);
  try {
    const res = await fetch(`${horizonBase()}/transactions/${txHash}`, {
      signal: AbortSignal.timeout(4_000),
    });
    if (res.status === 404) return { kind: "missing" };
    if (!res.ok) return { kind: "unavailable" };
    const body = (await res.json()) as { successful?: unknown; envelope_xdr?: unknown };
    if (body.successful !== true || typeof body.envelope_xdr !== "string") {
      return { kind: "other" };
    }
    const transfer = transferTo(body.envelope_xdr, payTo);
    if (!transfer) return { kind: "other" };
    return {
      kind: "pays_us",
      payer: transfer.source,
      amount: transfer.amount,
      payTo,
      paymentKey: paymentKeyFromEnvelope(body.envelope_xdr),
    };
  } catch {
    return { kind: "unavailable" };
  }
}
