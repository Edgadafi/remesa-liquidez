/**
 * Stellar client — invoke spec builders + health (Phase B).
 * @see contracts/remesa-tia-stellar/
 */

export const STELLAR_FEE_BPS = 25;
export const STELLAR_BPS_DENOMINATOR = 10_000;

export type StellarNetwork = "testnet" | "mainnet";

export function getStellarRpcUrl(): string {
  return (
    process.env.STELLAR_RPC_URL ??
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
    "https://soroban-testnet.stellar.org"
  );
}

export function getStellarNetwork(): StellarNetwork {
  const n = process.env.STELLAR_NETWORK ?? "testnet";
  return n === "mainnet" || n === "public" ? "mainnet" : "testnet";
}

export function getStellarContractId(): string | null {
  return process.env.STELLAR_CONTRACT_ID ?? process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID ?? null;
}

export interface InvokeSpec {
  contractId: string;
  functionName: string;
  args: Record<string, string | bigint | boolean>;
}

export function buildInitializeReservationInvoke(
  reservationId: bigint,
  receiver: string,
  amount: bigint
): InvokeSpec {
  const contractId = getStellarContractId();
  if (!contractId) {
    throw new Error("STELLAR_CONTRACT_ID not configured");
  }
  return {
    contractId,
    functionName: "initialize_reservation",
    args: { reservation_id: reservationId, receiver, amount },
  };
}

export async function stellarHealthCheck(): Promise<{ ok: boolean; message: string }> {
  if (!getStellarContractId()) {
    return {
      ok: false,
      message: "STELLAR_CONTRACT_ID not set — Soroban escrow not deployed",
    };
  }
  return {
    ok: true,
    message: "Contract ID configured — invoke via Accesly tx.signRawXdr (Phase B)",
  };
}

export async function acceslyStellarHealthCheck(): Promise<{
  ok: boolean;
  message: string;
}> {
  const appId = process.env.NEXT_PUBLIC_ACCESLY_APP_ID ?? "";
  if (!appId) {
    return { ok: false, message: "NEXT_PUBLIC_ACCESLY_APP_ID not set" };
  }
  return {
    ok: true,
    message: `Accesly app ${appId.slice(0, 10)}… · env ${process.env.NEXT_PUBLIC_ACCESLY_ENV ?? "dev"}`,
  };
}
