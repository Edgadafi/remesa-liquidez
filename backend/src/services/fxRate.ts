/**
 * USD/MXN live rate from Bitso — backend port of web/lib/fx.ts for premium x402 API.
 */

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

let cache: CachedRate | null = null;
const CACHE_TTL_MS = 60 * 1000;
const FALLBACK_USD_MXN = 18.5;

interface BitsoTickerResponse {
  success: boolean;
  payload?: {
    last: string;
  };
}

export async function getUsdMxnRate(): Promise<{ rate: number; isLive: boolean }> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { rate: cache.rate, isLive: true };
  }

  try {
    const res = await fetch("https://api.bitso.com/v3/ticker/?book=usd_mxn", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Bitso ticker respondió ${res.status}`);

    const data = (await res.json()) as BitsoTickerResponse;
    if (!data.success || !data.payload?.last) {
      throw new Error("Respuesta del ticker de Bitso sin campo 'last' válido");
    }

    const rate = parseFloat(data.payload.last);
    if (Number.isNaN(rate) || rate <= 0) throw new Error("Tasa de Bitso inválida");

    cache = { rate, fetchedAt: now };
    return { rate, isLive: true };
  } catch (err) {
    console.warn("[fx] Bitso fallback:", err);
    return { rate: FALLBACK_USD_MXN, isLive: false };
  }
}
