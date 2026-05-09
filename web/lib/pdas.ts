/**
 * Solo PDAs necesarios para rutas Blink (mirror de constants en programa `client`).
 * Evita dependencia de `@root/client` porque Vercel Root Directory suele ser `web/`.
 */
import { PublicKey } from "@solana/web3.js";

const RESERVATION_SEED = Buffer.from("reservation");
const VAULT_SEED = Buffer.from("vault");
const MERCHANT_SEED = Buffer.from("merchant");
const TREASURY_AUTHORITY_SEED = Buffer.from("treasury");
const TREASURY_VAULT_SEED = Buffer.from("treasury_vault");

export function findReservationPda(
  programId: PublicKey,
  receiver: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RESERVATION_SEED, receiver.toBuffer()],
    programId
  );
}

export function findVaultPda(
  programId: PublicKey,
  reservation: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, reservation.toBuffer()],
    programId
  );
}

export function findMerchantPda(
  programId: PublicKey,
  merchant: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MERCHANT_SEED, merchant.toBuffer()],
    programId
  );
}

export function findTreasuryAuthorityPda(
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TREASURY_AUTHORITY_SEED], programId);
}

export function findTreasuryTokenAccountPda(
  programId: PublicKey,
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TREASURY_VAULT_SEED, mint.toBuffer()],
    programId
  );
}
