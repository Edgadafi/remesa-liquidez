/**
 * Watcher on-chain del payTo (Capa 6 del blindaje) — vigila la cuenta que
 * cobra el x402 y alerta sobre patrones anómalos:
 *
 *   - SALIDA de fondos: STELLAR_PAY_TO es receive-only para el rail x402;
 *     cualquier pago saliente es señal de clave comprometida → ALERT.
 *   - Monto inusual: pagos entrantes por encima de WATCH_MAX_USDC (default 5;
 *     las llamadas legítimas son $0.10–$0.25) → ALERT.
 *   - Asset desconocido: entradas que no son USDC (spam/scam tokens) → WARN.
 *   - Frecuencia anómala: más de WATCH_MAX_TX_PER_POLL pagos en un ciclo
 *     (default 120) → ALERT.
 *
 * Salida: consola siempre; opcionalmente POST a WATCH_WEBHOOK_URL (https-only,
 * validado con las mismas reglas anti-SSRF del servicio de alertas).
 *
 * Uso:
 *   STELLAR_PAY_TO=G... npm run watch:payto            # loop (default 60s)
 *   STELLAR_PAY_TO=G... npm run watch:payto -- --once  # una pasada (cron)
 *
 * Sin dependencias más allá de fetch: pensado para correr en cualquier caja
 * (Render worker, GitHub Actions schedule, tu laptop durante un demo).
 */
import "dotenv/config";
import { checkWebhookTarget } from "../src/services/alerts.js";

const payTo = process.env.STELLAR_PAY_TO?.trim();
if (!payTo || !/^G[A-Z2-7]{55}$/.test(payTo)) {
  console.error("STELLAR_PAY_TO requerido (cuenta G... que recibe los cobros x402).");
  process.exit(1);
}

const isTestnet =
  process.env.STELLAR_NETWORK !== "mainnet" && process.env.STELLAR_NETWORK !== "pubnet";
const HORIZON = isTestnet
  ? "https://horizon-testnet.stellar.org"
  : "https://horizon.stellar.org";

const once = process.argv.includes("--once");
const intervalMs = envNum("WATCH_INTERVAL_SECONDS", 60) * 1000;
const maxUsdc = envNum("WATCH_MAX_USDC", 5);
const maxTxPerPoll = envNum("WATCH_MAX_TX_PER_POLL", 120);
const webhookUrl = process.env.WATCH_WEBHOOK_URL?.trim() || null;

function envNum(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

interface HorizonPayment {
  id: string;
  paging_token: string;
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  transaction_hash?: string;
  created_at?: string;
}

async function horizonGet(pathname: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${HORIZON}${pathname}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Horizon ${res.status} en ${pathname}`);
  return (await res.json()) as Record<string, unknown>;
}

async function notify(level: "ALERT" | "WARN", message: string, payment?: HorizonPayment) {
  const line = `[watch:payto] ${level}: ${message}`;
  if (level === "ALERT") console.error(line);
  else console.warn(line);

  if (!webhookUrl) return;
  const target = await checkWebhookTarget(webhookUrl);
  if (!target.ok || !target.url) {
    console.warn(`[watch:payto] WATCH_WEBHOOK_URL bloqueada: ${target.error}`);
    return;
  }
  try {
    const res = await fetch(target.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "payto-watch",
        level,
        message,
        account: payTo,
        network: isTestnet ? "testnet" : "pubnet",
        txHash: payment?.transaction_hash,
        at: new Date().toISOString(),
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    await res.body?.cancel().catch(() => undefined);
  } catch (err) {
    console.warn("[watch:payto] webhook falló:", err instanceof Error ? err.message : err);
  }
}

function describe(p: HorizonPayment): string {
  const asset = p.asset_type === "native" ? "XLM" : p.asset_code ?? p.asset_type ?? "?";
  return `${p.amount ?? "?"} ${asset} ${p.from ?? "?"} → ${p.to ?? "?"} (tx ${p.transaction_hash?.slice(0, 8)}…, ${p.created_at})`;
}

async function inspect(p: HorizonPayment) {
  if (p.type !== "payment" && p.type !== "path_payment_strict_send" && p.type !== "path_payment_strict_receive") {
    return;
  }

  if (p.from === payTo) {
    await notify("ALERT", `SALIDA de fondos desde el payTo (cuenta receive-only): ${describe(p)}`, p);
    return;
  }

  const isUsdc = p.asset_code === "USDC";
  if (!isUsdc) {
    await notify("WARN", `Pago entrante con asset distinto de USDC: ${describe(p)}`, p);
    return;
  }

  const amount = Number(p.amount);
  if (Number.isFinite(amount) && amount > maxUsdc) {
    await notify(
      "ALERT",
      `Pago entrante inusualmente grande (> ${maxUsdc} USDC — las llamadas x402 son centavos): ${describe(p)}`,
      p
    );
  }
}

async function latestCursor(): Promise<string> {
  const data = await horizonGet(
    `/accounts/${payTo}/payments?order=desc&limit=1`
  );
  const records = (data._embedded as { records?: HorizonPayment[] } | undefined)?.records ?? [];
  return records[0]?.paging_token ?? "";
}

async function poll(cursor: string): Promise<string> {
  const qs = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
  const data = await horizonGet(
    `/accounts/${payTo}/payments?order=asc&limit=200${qs}`
  );
  const records = (data._embedded as { records?: HorizonPayment[] } | undefined)?.records ?? [];

  if (records.length > maxTxPerPoll) {
    await notify(
      "ALERT",
      `Frecuencia anómala: ${records.length} pagos en un ciclo (umbral ${maxTxPerPoll}).`
    );
  }

  for (const p of records) {
    await inspect(p);
  }

  return records.length > 0 ? records[records.length - 1].paging_token : cursor;
}

console.log(
  `[watch:payto] vigilando ${payTo} en ${isTestnet ? "testnet" : "pubnet"} — salida de fondos / >${maxUsdc} USDC / asset≠USDC / >${maxTxPerPoll} tx por ciclo${webhookUrl ? " · webhook ON" : ""}`
);

let cursor = process.argv.includes("--from-start") ? "" : await latestCursor();

if (once) {
  await poll(cursor);
  console.log("[watch:payto] pasada única completada.");
  process.exit(0);
}

for (;;) {
  try {
    cursor = await poll(cursor);
  } catch (err) {
    console.warn("[watch:payto] poll falló (reintento en el siguiente ciclo):", err instanceof Error ? err.message : err);
  }
  await new Promise((r) => setTimeout(r, intervalMs));
}
