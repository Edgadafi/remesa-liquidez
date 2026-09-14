/**
 * Stellar remesa invoke helpers — USDC SAC lock is on-chain in the contract.
 * Builds Soroban contract calls for remesa-tia-stellar escrow.
 *
 * Requires STELLAR_CONTRACT_ID / NEXT_PUBLIC_STELLAR_CONTRACT_ID after deploy.
 * Constructor already binds Circle USDC SAC + treasury; invoke only passes parties + amount.
 * Signing via Accesly: useAccesly().tx.signRawXdr() after unlockForSigning.
 */
import { getStellarContractId } from "@/lib/chain/stellar";

export interface StellarReservationParams {
  reservationId: bigint;
  receiverAddress: string;
  amountBaseUnits: bigint;
}

export function assertStellarRemesaReady(): string {
  const id = getStellarContractId();
  if (!id) {
    throw new Error(
      "STELLAR_CONTRACT_ID not set. Deploy contracts/remesa-tia-stellar first."
    );
  }
  return id;
}

/**
 * Returns the Soroban function name + args for initialize_reservation.
 * Full XDR assembly lands when contract ABI is frozen post-deploy.
 */
export function buildInitializeReservationSpec(params: StellarReservationParams): {
  contractId: string;
  functionName: string;
  args: Record<string, string | bigint>;
} {
  const contractId = assertStellarRemesaReady();
  return {
    contractId,
    functionName: "initialize_reservation",
    args: {
      receiver: params.receiverAddress,
      amount: params.amountBaseUnits,
      reservation_id: params.reservationId,
    },
  };
}

export function buildMarkVerifiedSpec(reservationId: bigint): {
  contractId: string;
  functionName: string;
  args: { reservation_id: bigint };
} {
  return {
    contractId: assertStellarRemesaReady(),
    functionName: "mark_verified",
    args: { reservation_id: reservationId },
  };
}

export function buildValidateCashoutSpec(reservationId: bigint): {
  contractId: string;
  functionName: string;
  args: { reservation_id: bigint };
} {
  return {
    contractId: assertStellarRemesaReady(),
    functionName: "validate_cashout",
    args: { reservation_id: reservationId },
  };
}
