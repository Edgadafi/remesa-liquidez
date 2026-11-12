#!/usr/bin/env bash
# Paga GET /v1/route?amount=100 y mide el tiempo.
# NETWORK=testnet (default) o NETWORK=pubnet. Cambia la red de Stellar, el
# Horizon y el USDC de Circle. Con pubnet, BASE por defecto es
# https://x402.holatia.app. En pubnet hay que confirmar con y antes de firmar.
#
# La llave se lee en la terminal, no se imprime, no se escribe a disco y se
# borra al salir. No la pases como argumento.
#
# El cliente usa @stellar/stellar-sdk 17. La 16.3.1 del backend no decodifica
# el XDR actual. El backend no firma, así que su dependencia no cambia.
# No uses policy de nirium: con el SDK 17 falla en signAuthEntries
# (pre.switch is not a function). El 402 se vuelve a leer justo antes de pagar.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETWORK="${NETWORK:-testnet}"

case "$NETWORK" in
  testnet)
    STELLAR_NETWORK_ID="stellar:testnet"
    HORIZON="https://horizon-testnet.stellar.org"
    USDC_ASSET="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
    BASE="${BASE:-https://remesa-tia-testnet-xchcw31kn-edgadafis-projects.vercel.app}"
    ;;
  pubnet)
    STELLAR_NETWORK_ID="stellar:pubnet"
    HORIZON="https://horizon.stellar.org"
    USDC_ASSET="CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75"
    BASE="${BASE:-https://x402.holatia.app}"
    ;;
  *)
    echo "NETWORK debe ser testnet o pubnet." >&2
    exit 1
    ;;
esac
BASE="${BASE%/}"
CONFIRMED_PAY_TO=""
CONFIRMED_AMOUNT=""

if [[ ! -r /dev/tty ]]; then
  echo "Ábrelo en una terminal interactiva. La llave no se lee de un archivo." >&2
  exit 1
fi

read -r -s -p "Llave secreta del pagador en ${NETWORK} (no se imprime): " STELLAR_TESTNET_SECRET </dev/tty
printf '\n' >&2

cleanup() {
  unset STELLAR_TESTNET_SECRET
}
trap cleanup EXIT

if [[ -z "${STELLAR_TESTNET_SECRET}" ]]; then
  echo "Falta la llave." >&2
  exit 1
fi

if [[ "$NETWORK" == "pubnet" ]]; then
  probe="$(
    python3 - "$BASE" "$STELLAR_NETWORK_ID" "$USDC_ASSET" "$HORIZON" << 'PY'
import base64
import json
import sys
import urllib.error
import urllib.request

base, network, asset, horizon = sys.argv[1:5]
url = base.rstrip("/") + "/v1/route?amount=100"
request = urllib.request.Request(url, method="GET")
try:
    with urllib.request.urlopen(request, timeout=20) as response:
        status = response.status
        header = response.headers.get("payment-required")
except urllib.error.HTTPError as err:
    status = err.code
    header = err.headers.get("payment-required")
except urllib.error.URLError as err:
    sys.stderr.write(f"No se pudo leer el 402: {err.reason}\n")
    sys.exit(1)

if status != 402 or not header:
    sys.stderr.write(f"Se esperaba 402 con PAYMENT-REQUIRED y llegó {status}.\n")
    sys.exit(1)

pad = header.strip().replace("-", "+").replace("_", "/")
pad += "=" * ((4 - len(pad) % 4) % 4)
try:
    payload = json.loads(base64.b64decode(pad))
except (ValueError, json.JSONDecodeError):
    sys.stderr.write("PAYMENT-REQUIRED no se pudo leer.\n")
    sys.exit(1)

chosen = None
for item in payload.get("accepts") or []:
    if item.get("scheme") == "exact" and item.get("network") == network and item.get("asset") == asset:
        chosen = item
        break
if chosen is None:
    sys.stderr.write(f"El 402 no ofrece USDC de Circle en {network}.\n")
    sys.exit(1)

pay_to = str(chosen.get("payTo") or "")
amount = str(chosen.get("amount") or "")
if len(pay_to) != 56 or pay_to[0] != "G":
    sys.stderr.write("payTo del 402 no es una cuenta Stellar.\n")
    sys.exit(1)
if not amount.isdigit():
    sys.stderr.write("Monto del 402 inválido.\n")
    sys.exit(1)

account_url = horizon.rstrip("/") + "/accounts/" + pay_to
try:
    with urllib.request.urlopen(account_url, timeout=15) as response:
        if response.status != 200:
            raise urllib.error.URLError(f"HTTP {response.status}")
except urllib.error.URLError as err:
    sys.stderr.write(f"payTo no está en Horizon ({horizon}): {err.reason}\n")
    sys.exit(1)

whole, frac = divmod(int(amount), 10_000_000)
shown = str(whole) if frac == 0 else f"{whole}.{frac:06d}".rstrip("0")
sys.stdout.write(f"pay_to={pay_to}\n")
sys.stdout.write(f"amount_atomic={amount}\n")
sys.stdout.write(f"amount_usdc={shown}\n")
sys.stdout.write(f"network={network}\n")
PY
  )" || exit 1
  pay_to="$(printf '%s\n' "$probe" | sed -n 's/^pay_to=//p')"
  amount_atomic="$(printf '%s\n' "$probe" | sed -n 's/^amount_atomic=//p')"
  amount_usdc="$(printf '%s\n' "$probe" | sed -n 's/^amount_usdc=//p')"
  got_network="$(printf '%s\n' "$probe" | sed -n 's/^network=//p')"
  if [[ ! "$pay_to" =~ ^G[A-Z2-7]{55}$ || -z "$amount_usdc" || "$got_network" != "$STELLAR_NETWORK_ID" ]]; then
    echo "No se pudo leer el pago del 402." >&2
    exit 1
  fi
  printf 'Aviso: vas a pagar %s USDC en %s a %s.\n' "$amount_usdc" "$got_network" "$pay_to" >/dev/tty
  printf 'Escribe y para continuar: ' >/dev/tty
  IFS= read -r confirm </dev/tty || confirm=""
  if [[ "$confirm" != "y" ]]; then
    echo "Pago cancelado." >&2
    exit 1
  fi
  CONFIRMED_PAY_TO="$pay_to"
  CONFIRMED_AMOUNT="$amount_atomic"
fi

CLIENT_DIR="$ROOT/scripts/.paid-route-client"
mkdir -p "$CLIENT_DIR"
cat > "$CLIENT_DIR/package.json" << 'EOF'
{
  "private": true,
  "dependencies": {
    "nirium": "0.16.0",
    "@stellar/stellar-sdk": "^17.4.0"
  },
  "overrides": {
    "@stellar/stellar-sdk": "^17.4.0"
  }
}
EOF

sdk_pkg="$CLIENT_DIR/node_modules/@stellar/stellar-sdk/package.json"
nested="$CLIENT_DIR/node_modules/@x402/stellar/node_modules/@stellar/stellar-sdk/package.json"
sdk_version=""
if [[ -f "$sdk_pkg" && ! -e "$nested" ]]; then
  sdk_version="$(node -p "require(process.argv[1]).version" "$sdk_pkg")"
fi
case "$sdk_version" in
  17.*) ;;
  *) npm install --no-fund --no-audit --prefix "$CLIENT_DIR" ;;
esac

export BASE CLIENT_DIR STELLAR_TESTNET_SECRET STELLAR_NETWORK_ID HORIZON USDC_ASSET CONFIRMED_PAY_TO CONFIRMED_AMOUNT
"$ROOT/backend/node_modules/.bin/tsx" --input-type=module <<'EOF'
import { createRequire } from "node:module";

const requireFromClient = createRequire(`${process.env.CLIENT_DIR}/package.json`);
const { Agent } = requireFromClient("nirium");

function redact(value) {
  return String(value).replace(/S[A-Z2-7]{54,}/g, "S…REDACTED");
}

const base = (process.env.BASE ?? "").replace(/\/$/, "");
const network = process.env.STELLAR_NETWORK_ID ?? "";
const horizon = process.env.HORIZON ?? "";
const usdc = process.env.USDC_ASSET ?? "";
const confirmedPayTo = process.env.CONFIRMED_PAY_TO ?? "";
const confirmedAmount = process.env.CONFIRMED_AMOUNT ?? "";
const secret = process.env.STELLAR_TESTNET_SECRET?.trim();
delete process.env.STELLAR_TESTNET_SECRET;
if (!secret) {
  console.error("Falta la llave.");
  process.exit(1);
}
const horizonForNetwork = {
  "stellar:testnet": "https://horizon-testnet.stellar.org",
  "stellar:pubnet": "https://horizon.stellar.org",
};
if (horizonForNetwork[network] !== horizon || !usdc) {
  console.error("La red y el Horizon no coinciden.");
  process.exit(1);
}

const url = `${base}/v1/route?amount=100`;
const agent = new Agent({ apiKey: "paid-route-test", baseUrl: base });
agent.initX402({ secretKey: secret, network });

function paymentRequired(header) {
  if (!header) return null;
  try {
    const pad = header.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(pad, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const probe = await fetch(url);
const requiredHeader =
  probe.headers.get("payment-required") ??
  probe.headers.get("PAYMENT-REQUIRED");
if (probe.status !== 402 || !requiredHeader) {
  console.error(`Se esperaba 402 con PAYMENT-REQUIRED y llegó ${probe.status}.`);
  process.exit(1);
}
const required = paymentRequired(requiredHeader);
const accepts = Array.isArray(required?.accepts) ? required.accepts : [];
const chosen = accepts.find(
  (item) => item?.scheme === "exact" && item?.network === network && item?.asset === usdc,
);
const payTo = String(chosen?.payTo ?? "");
const amount = String(chosen?.amount ?? "");
if (!chosen || chosen.network !== network || chosen.asset !== usdc) {
  console.error(`El 402 no ofrece USDC de Circle en ${network}.`);
  process.exit(1);
}
if (network === "stellar:pubnet") {
  if (!confirmedPayTo || payTo !== confirmedPayTo) {
    console.error("payTo distinto del que confirmaste.");
    process.exit(1);
  }
  if (!confirmedAmount || amount !== confirmedAmount) {
    console.error("Monto distinto del que confirmaste.");
    process.exit(1);
  }
}

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
let attempts = 0;
let state = "";
while (true) {
  attempts += 1;
  const lookup = await fetch(`${base}/v1/receipt/tx/${hash}`);
  let payload = {};
  try {
    payload = await lookup.json();
  } catch {
    payload = {};
  }
  state = lookup.status === 404 ? "404" : (payload.status ?? String(lookup.status));
  console.log(`receipt_tx ${state}`);
  if (state === "404") {
    const remaining = missingUntil - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(3_000, remaining)));
    continue;
  }
  if (state === "pending") {
    const remaining = pendingUntil - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(5_000, remaining)));
    continue;
  }
  break;
}
console.log(`receipt_tx_attempts ${attempts}`);
if (state === "404") process.exit(1);
EOF
