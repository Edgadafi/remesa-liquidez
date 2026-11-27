/**
 * Etherfuse API client for USDC (Stellar) → MXN offramp quotes.
 * 
 * Docs: https://docs.etherfuse.com/v2/quickstart
 * OpenAPI: https://api.etherfuse.com/openapi-v2.json
 * 
 * Requirements for quotes:
 * - API key (env ETHERFUSE_API_KEY) with format: api_sand:key_id:org_id or api_prod:key_id:org_id
 * - Registered payment accounts: source wallet (USDC on Stellar) + destination bank (MXN)
 * - Organization approved (KYC/KYB complete)
 * 
 * Integration mode: QUOTE-ONLY. TIA compares routes; never creates orders or moves money.
 */

const TIMEOUT_MS = 5_000;

function getApiBase(): string {
  return process.env.ETHERFUSE_API_BASE ?? "https://api.sand.etherfuse.com";
}

function getApiKey(): string {
  return process.env.ETHERFUSE_API_KEY ?? "";
}

export interface EtherfuseQuote {
  destinationAmount: string;
  rateAfterFees: string;
  feeBps: number;
  feeAmount: string;
  expiresAt: string;
  fees: Array<{
    type: string;
    amount: string;
    asset: string;
    bps: number | null;
  }>;
}

interface EtherfuseErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

/**
 * Returns whether the Etherfuse integration is available (has an API key).
 */
export function isEtherfuseAvailable(): boolean {
  return getApiKey().trim().length > 0;
}

/**
 * Checks if USDC on Stellar → MXN offramp is supported.
 * 
 * This requires payment accounts to be registered. Without them, quotes fail with
 * 404 not-found or 409 payment-account-not-ready.
 * 
 * Returns null if the check cannot be performed (missing key, network error).
 */
export async function checkEtherfuseSupport(): Promise<boolean | null> {
  if (!isEtherfuseAvailable()) return null;

  try {
    // GET /me to verify the key works
    const res = await fetch(`${getApiBase()}/me`, {
      headers: { Authorization: getApiKey() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) return null;

    // If we get here, the API key works. Actual offramp support depends on
    // having registered payment accounts, which is out of scope for a quote-only
    // integration. Return true to indicate the API is reachable.
    return true;
  } catch {
    return null;
  }
}

/**
 * Gets an offramp quote: USDC on Stellar → MXN.
 * 
 * Requirements (must be set up in Etherfuse dashboard):
 * - Organization approved
 * - Source payment account: USDC wallet on Stellar (registered, rail=stellar, status=ready)
 * - Destination payment account: MXN bank account (SPEI, registered, rail=spei, status=ready)
 * 
 * @param amountUsdc - Amount in USDC (decimal string or number)
 * @param sourceAccountId - Registered wallet payment account ID (UUID)
 * @param destAccountId - Registered bank payment account ID (UUID)
 * @param organizationId - Organization ID (from GET /me)
 * @returns Quote or null if unavailable/error
 */
export async function getEtherfuseQuote(
  amountUsdc: number,
  sourceAccountId: string,
  destAccountId: string,
  organizationId: string
): Promise<EtherfuseQuote | null> {
  if (!isEtherfuseAvailable()) return null;

  try {
    const res = await fetch(`${getApiBase()}/organization/${organizationId}/quote`, {
      method: "POST",
      headers: {
        Authorization: getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: { type: "stored", id: sourceAccountId },
        destination: { type: "stored", id: destAccountId },
        sourceAmount: amountUsdc.toFixed(6),
        sourceAsset: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // USDC on Stellar
        destinationAsset: "MXN",
        sourceRail: "stellar",
        destinationRail: "spei",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const err = (await res.json()) as EtherfuseErrorResponse;
      console.warn(
        `[etherfuse] quote failed: ${res.status} ${err.type} - ${err.detail}`
      );
      return null;
    }

    const quote = (await res.json()) as EtherfuseQuote;
    return quote;
  } catch (err) {
    console.warn(
      "[etherfuse] quote error:",
      err instanceof Error ? err.message : "unknown"
    );
    return null;
  }
}

/**
 * Returns the environment label for display: "sandbox" or "production".
 */
export function getEtherfuseEnvironment(): "sandbox" | "production" {
  const isSandbox = getApiBase().includes("sand.etherfuse.com");
  return isSandbox ? "sandbox" : "production";
}
