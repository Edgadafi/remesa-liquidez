/**
 * USD/MXN live data from Bitso — backend port of web/lib/fx.ts for premium x402 API.
 * getUsdMxnRate() keeps its original shape (used by /premium/fx);
 * getUsdMxnTicker() adds bid/ask/spread/volumen 24h for /v1/quote.
 */

export interface UsdMxnTicker {
  pair: "USD/MXN";
  /** Último precio operado (last). */
  rate: number;
  bid: number;
  ask: number;
  /** ask - bid, en MXN. */
  spread: number;
  /** spread / mid, en %. */
  spreadPct: number;
  /** Volumen 24 h del libro usd_mxn, en USD (moneda mayor del libro). */
  volume24hUsd: number;
  vwap24h: number;
  high24h: number;
  low24h: number;
  source: "bitso";
  isLive: boolean;
  fetchedAt: string;
}

let cache: { ticker: UsdMxnTicker; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;
const FALLBACK_USD_MXN = 18.5;

interface BitsoTickerResponse {
  success: boolean;
  payload?: {
    last: string;
    bid: string;
    ask: string;
    volume: string;
    vwap: string;
    high: string;
    low: string;
  };
}

function num(value: string | undefined, field: string): number {
  const n = parseFloat(value ?? "");
  if (Number.isNaN(n) || n < 0) throw new Error(`Bitso: campo '${field}' inválido`);
  return n;
}

function fallbackTicker(): UsdMxnTicker {
  return {
    pair: "USD/MXN",
    rate: FALLBACK_USD_MXN,
    bid: FALLBACK_USD_MXN,
    ask: FALLBACK_USD_MXN,
    spread: 0,
    spreadPct: 0,
    volume24hUsd: 0,
    vwap24h: FALLBACK_USD_MXN,
    high24h: FALLBACK_USD_MXN,
    low24h: FALLBACK_USD_MXN,
    source: "bitso",
    isLive: false,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getUsdMxnTicker(): Promise<UsdMxnTicker> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.ticker;
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

    const p = data.payload;
    const rate = num(p.last, "last");
    if (rate <= 0) throw new Error("Tasa de Bitso inválida");
    const bid = num(p.bid, "bid");
    const ask = num(p.ask, "ask");
    const mid = (bid + ask) / 2;
    const spread = Math.max(ask - bid, 0);

    const ticker: UsdMxnTicker = {
      pair: "USD/MXN",
      rate,
      bid,
      ask,
      spread: Number(spread.toFixed(4)),
      spreadPct: mid > 0 ? Number(((spread / mid) * 100).toFixed(4)) : 0,
      volume24hUsd: num(p.volume, "volume"),
      vwap24h: num(p.vwap, "vwap"),
      high24h: num(p.high, "high"),
      low24h: num(p.low, "low"),
      source: "bitso",
      isLive: true,
      fetchedAt: new Date().toISOString(),
    };

    cache = { ticker, fetchedAt: now };
    return ticker;
  } catch (err) {
    console.warn("[fx] Bitso fallback:", err);
    return fallbackTicker();
  }
}

export async function getUsdMxnRate(): Promise<{ rate: number; isLive: boolean }> {
  const t = await getUsdMxnTicker();
  return { rate: t.rate, isLive: t.isLive };
}
