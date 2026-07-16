/**
 * Tipo de cambio USD/MXN en vivo — solo para mostrar un estimado informativo
 * al comerciante antes de entregar el efectivo. NO se usa para ningún cálculo
 * on-chain (el monto real que se mueve siempre es en USDC, on-chain); esto es
 * puramente para que el comerciante tenga una referencia de cuántos pesos
 * corresponden aproximadamente al monto que va a recibir.
 *
 * Fuente: ticker público de Bitso (GET /v3/ticker/?book=usd_mxn) — es un
 * endpoint público, sin necesidad de API key. Se eligió Bitso en vez de una
 * fuente genérica (ej. tasas del Banco Central Europeo) porque es el mismo
 * exchange donde eventualmente se haría la conversión real vía Juno/Bitso —
 * la referencia queda coherente con el resto del flujo de pago.
 * Docs: https://docs.bitso.com/bitso-api/docs/ticker
 */

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

let cache: CachedRate | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minuto — el ticker de Bitso se mueve en vivo,
// a diferencia de una tasa de referencia diaria, así que aquí sí conviene
// refrescar más seguido.

// Tipo de cambio de respaldo si la API externa falla — evita que la demo se
// caiga por completo si el ticker de Bitso no responde. Ajusta este número
// de vez en cuando para que no quede muy desactualizado.
const FALLBACK_USD_MXN = 18.5;

interface BitsoTickerResponse {
  success: boolean;
  payload?: {
    book: string;
    last: string;
    ask: string;
    bid: string;
    high: string;
    low: string;
    vwap: string;
    volume: string;
    created_at: string;
  };
}

export async function getUsdMxnRate(): Promise<{ rate: number; isLive: boolean }> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { rate: cache.rate, isLive: true };
  }

  try {
    const res = await fetch("https://api.bitso.com/v3/ticker/?book=usd_mxn", {
      // Se evita el cache de Next.js — queremos el valor más reciente posible
      // dentro de nuestra propia ventana de cache de 1 minuto, no uno viejo.
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
    console.warn("[fx] No se pudo obtener el tipo de cambio en vivo de Bitso, usando respaldo:", err);
    return { rate: FALLBACK_USD_MXN, isLive: false };
  }
}

/** Convierte un monto de USDC en unidades base (6 decimales) a pesos estimados. */
export function usdcBaseUnitsToMxnEstimate(amountBaseUnits: bigint, usdMxnRate: number): number {
  const usd = Number(amountBaseUnits) / 1_000_000;
  return usd * usdMxnRate;
}

