#!/usr/bin/env bash
# Paga GET /v1/route?amount=100 en un preview de testnet y mide el tiempo.
# La llave se lee en la terminal, no se imprime, no se escribe a disco y se
# borra al salir. No la pases como argumento.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE:-https://remesa-tia-testnet-xchcw31kn-edgadafis-projects.vercel.app}"
BASE="${BASE%/}"

if [[ ! -r /dev/tty ]]; then
  echo "Ábrelo en una terminal interactiva. La llave no se lee de un archivo." >&2
  exit 1
fi

read -r -s -p "Llave secreta del pagador de testnet (no se imprime): " STELLAR_TESTNET_SECRET </dev/tty
printf '\n' >&2

cleanup() {
  unset STELLAR_TESTNET_SECRET
}
trap cleanup EXIT

if [[ -z "${STELLAR_TESTNET_SECRET}" ]]; then
  echo "Falta la llave." >&2
  exit 1
fi

cd "$ROOT/backend"
export BASE
export STELLAR_TESTNET_SECRET
npx tsx --input-type=module <<'EOF'
import { Agent } from "nirium";

function redact(value) {
  return String(value).replace(/S[A-Z2-7]{54,}/g, "S…REDACTED");
}

const base = (process.env.BASE ?? "").replace(/\/$/, "");
const secret = process.env.STELLAR_TESTNET_SECRET?.trim();
delete process.env.STELLAR_TESTNET_SECRET;
if (!secret) {
  console.error("Falta la llave.");
  process.exit(1);
}

const url = `${base}/v1/route?amount=100`;
const agent = new Agent({ apiKey: "paid-route-test", baseUrl: base });
agent.initX402({ secretKey: secret, network: "stellar:testnet" });

const started = Date.now();
let response;
try {
  response = await agent.x402Fetch(url);
} catch (err) {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(redact(msg));
  process.exit(1);
}
const seconds = ((Date.now() - started) / 1000).toFixed(3);
const text = await response.text();
let body = {};
try {
  body = JSON.parse(text);
} catch {
  body = {};
}

function txHash(header) {
  if (!header) return null;
  try {
    const pad = header.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(Buffer.from(pad, "base64").toString("utf8"));
    const hash = String(parsed.transaction ?? "").trim().toLowerCase();
    return /^[0-9a-f]{64}$/.test(hash) ? hash : null;
  } catch {
    return null;
  }
}

const payment =
  response.headers.get("payment-response") ??
  response.headers.get("PAYMENT-RESPONSE");
const hash = txHash(payment);
const audit = response.headers.get("x-tia-audit-hash");

console.log(`http ${response.status}`);
console.log(`seconds ${seconds}`);
console.log(`receipt ${JSON.stringify(body.receipt ?? null)}`);
console.log(`receiptStatus ${body.receiptStatus ?? ""}`);
console.log(`tx ${hash ?? ""}`);
console.log(`audit ${audit ?? ""}`);

if (!response.ok) {
  console.error(redact(text).slice(0, 500));
  process.exit(1);
}
if (!hash) {
  console.log("receipt_tx skipped");
  process.exit(0);
}

const pendingUntil = Date.now() + 30_000;
const missingUntil = Date.now() + 15_000;
while (true) {
  const lookup = await fetch(`${base}/v1/receipt/tx/${hash}`);
  let payload = {};
  try {
    payload = await lookup.json();
  } catch {
    payload = {};
  }
  const state = lookup.status === 404 ? "404" : (payload.status ?? String(lookup.status));
  console.log(`receipt_tx ${state}`);
  const until = state === "pending" ? pendingUntil : state === "404" ? missingUntil : 0;
  if (Date.now() >= until) break;
  await new Promise((resolve) => setTimeout(resolve, Math.min(5_000, until - Date.now())));
}
EOF
