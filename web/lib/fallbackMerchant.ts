import { PublicKey } from "@solana/web3.js";

/**
 * Hardcoded merchant fallback for production pilots.
 * Used when automated store routing is unavailable.
 */
export function getFallbackMerchantPubkey(): PublicKey | null {
  const raw = process.env.NEXT_PUBLIC_FALLBACK_MERCHANT_PUBKEY?.trim();
  if (!raw) return null;
  try {
    return new PublicKey(raw);
  } catch {
    console.warn("[TIA] Invalid NEXT_PUBLIC_FALLBACK_MERCHANT_PUBKEY");
    return null;
  }
}
