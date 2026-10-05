/**
 * Estimador de rutas USD → MXN para GET /v1/route.
 *
 * Compara tres rieles con la tasa viva de Bitso como benchmark. Las comisiones
 * son SUPUESTOS documentados (constantes abajo), no cotizaciones ejecutables —
 * cada opción lista sus assumptions y la respuesta lleva disclaimer.
 */
import { getUsdMxnTicker } from "./fxRate.js";

// ── Supuestos por riel (documentados en cada respuesta) ─────────────────────
/** Bitso taker fee del libro usd_mxn (tier base). */
const BITSO_TAKER_FEE = 0.0065;
/** Riel stablecoin: on-ramp USD→USDC + off-ramp USDC→MXN (exchange local). */
const USDC_ONRAMP_FEE = 0.001;
const USDC_OFFRAMP_FEE = 0.005;
/** Fees de red Stellar por el par de txs — centavos, redondeado arriba. */
const USDC_NETWORK_FLAT_USD = 0.01;
/** Wire/SPEI internacional tradicional: fee fijo + margen FX sobre mid. */
const SPEI_FLAT_FEE_USD = 3;
const SPEI_FX_MARGIN = 0.015;

export interface RouteOption {
  route: "bitso_directo" | "stablecoin_usdc" | "spei_tradicional";
  label: string;
  mxnOut: number;
  effectiveRate: number;
  totalCostUsd: number;
  totalCostPct: number;
  etaMinutes: number;
  assumptions: string[];
}

export interface RouteEstimate {
  apiVersion: "1";
  amountUsd: number;
  midRate: number;
  rateIsLive: boolean;
  rateSource: "bitso";
  best: RouteOption["route"];
  options: RouteOption[];
  disclaimer: string;
  generatedAt: string;
}

const round2 = (n: number) => Number(n.toFixed(2));
const round4 = (n: number) => Number(n.toFixed(4));

export async function estimateRoutes(amountUsd: number): Promise<RouteEstimate> {
  const t = await getUsdMxnTicker();
  const mid = (t.bid + t.ask) / 2;

  const option = (
    route: RouteOption["route"],
    label: string,
    mxnOut: number,
    etaMinutes: number,
    assumptions: string[]
  ): RouteOption => {
    const costUsd = amountUsd - mxnOut / mid;
    return {
      route,
      label,
      mxnOut: round2(mxnOut),
      effectiveRate: round4(mxnOut / amountUsd),
      totalCostUsd: round2(costUsd),
      totalCostPct: round4((costUsd / amountUsd) * 100),
      etaMinutes,
      assumptions,
    };
  };

  // Vender USD contra el bid del libro, menos taker fee; payout SPEI MX incluido.
  const bitso = option(
    "bitso_directo",
    "Bitso usd_mxn spot + retiro SPEI",
    amountUsd * t.bid * (1 - BITSO_TAKER_FEE),
    15,
    [
      `taker fee ${(BITSO_TAKER_FEE * 100).toFixed(2)}% (tier base)`,
      `ejecuta contra bid ${t.bid}`,
      "retiro SPEI MXN sin costo",
    ]
  );

  const usdcNet = Math.max(amountUsd - USDC_NETWORK_FLAT_USD, 0);
  const stablecoin = option(
    "stablecoin_usdc",
    "USDC vía Stellar + off-ramp MXN",
    usdcNet * (1 - USDC_ONRAMP_FEE) * mid * (1 - USDC_OFFRAMP_FEE),
    10,
    [
      `on-ramp USD→USDC ${(USDC_ONRAMP_FEE * 100).toFixed(2)}%`,
      `off-ramp USDC→MXN ${(USDC_OFFRAMP_FEE * 100).toFixed(2)}% sobre mid`,
      `fees de red Stellar ~$${USDC_NETWORK_FLAT_USD.toFixed(2)}`,
    ]
  );

  const speiNet = Math.max(amountUsd - SPEI_FLAT_FEE_USD, 0);
  const spei = option(
    "spei_tradicional",
    "Wire internacional → SPEI",
    speiNet * mid * (1 - SPEI_FX_MARGIN),
    240,
    [
      `fee fijo $${SPEI_FLAT_FEE_USD.toFixed(2)}`,
      `margen FX ${(SPEI_FX_MARGIN * 100).toFixed(2)}% sobre mid`,
      "acreditación mismo día hábil",
    ]
  );

  const options = [bitso, stablecoin, spei];
  const best = options.reduce((a, b) => (b.mxnOut > a.mxnOut ? b : a));

  return {
    apiVersion: "1",
    amountUsd,
    midRate: round4(mid),
    rateIsLive: t.isLive,
    rateSource: "bitso",
    best: best.route,
    options,
    disclaimer:
      "Estimación con supuestos publicados por opción; no es una cotización ejecutable.",
    generatedAt: new Date().toISOString(),
  };
}
