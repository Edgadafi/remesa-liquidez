/**
 * Spike x402-sessions (ADR-0001): deposita una vez (SAC approve), liquida N
 * veces via transfer_from — SIN tocar el backend de producción.
 *
 * TESTNET ONLY. El script se niega a correr contra pubnet: el scheme session
 * no está aprobado para mainnet (ver docs/adr-0001-x402-sessions.md).
 *
 * Prereqs:
 *   - Facilitador de sesiones corriendo (el público de referencia está caído):
 *     git clone https://github.com/x402-sessions/x402-session-facilitator
 *     FACILITATOR_SECRET=S… (testnet, friendbot) npm run dev   # :4021
 *   - STELLAR_TESTNET_SECRET en .env local (nunca Vercel). Con
 *     X402_SESSION_ASSET=native basta friendbot (XLM SAC, sin faucet Circle).
 *
 * Uso: npm run x402:session-smoke
 */
import "dotenv/config";
import { Asset, Keypair, Networks } from "@stellar/stellar-sdk";
import { createSession, decimalToBaseUnits } from "x402-sessions";

const NETWORK = "stellar:testnet" as const;
const USDC_TESTNET_SAC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const DECIMALS = 7;

function fail(msg: string): never {
  console.error(`[session-smoke] ${msg}`);
  process.exit(1);
}

// Guard duro: este spike jamás corre contra mainnet.
if (
  process.env.STELLAR_NETWORK === "pubnet" ||
  process.env.STELLAR_NETWORK === "mainnet" ||
  process.env.X402_SESSION_FACILITATOR_URL?.includes("channels.openzeppelin.com")
) {
  fail(
    "pubnet/mainnet detectado — el spike de sesiones es testnet-only (ADR-0001). " +
      "El facilitador OZ tampoco soporta scheme=session."
  );
}

const facilitatorUrl =
  process.env.X402_SESSION_FACILITATOR_URL?.replace(/\/+$/, "") ??
  "http://localhost:4021";
const secret = process.env.STELLAR_TESTNET_SECRET?.trim();
if (!secret) fail("STELLAR_TESTNET_SECRET requerido (.env local, nunca Vercel)");

const signer = Keypair.fromSecret(secret!);
const asset =
  process.env.X402_SESSION_ASSET === "native"
    ? Asset.native().contractId(Networks.TESTNET)
    : (process.env.X402_SESSION_ASSET ?? USDC_TESTNET_SAC);
// Default: self-transfer — una sola cuenta fondeada basta para el spike.
const recipient = process.env.X402_SESSION_RECIPIENT ?? signer.publicKey();
const cap = process.env.X402_SESSION_CAP ?? "1";
const price = process.env.X402_SESSION_PRICE ?? "0.10";
const calls = Number(process.env.X402_SESSION_CALLS ?? 3);
const expiresIn = Number(process.env.X402_SESSION_EXPIRES_IN ?? 3600);

const priceBase = decimalToBaseUnits(price, DECIMALS).toString();

function requirements(amountBase: string) {
  return {
    scheme: "session",
    network: NETWORK,
    asset,
    amount: amountBase,
    payTo: recipient,
    maxTimeoutSeconds: 300,
    extra: {},
  };
}

async function settle(sessionId: string, amountBase: string) {
  const paymentPayload = {
    x402Version: 2,
    accepted: requirements(amountBase),
    payload: { sessionId },
  };
  const res = await fetch(`${facilitatorUrl}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x402Version: 2,
      paymentPayload,
      paymentRequirements: requirements(amountBase),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

async function main() {
  console.log("━━━ x402-session-smoke (testnet) ━━━");
  console.log(`facilitator: ${facilitatorUrl}`);
  console.log(`user:        ${signer.publicKey()}`);
  console.log(`recipient:   ${recipient}${recipient === signer.publicKey() ? " (self)" : ""}`);
  console.log(`asset:       ${asset}`);
  console.log(`cap:         $${cap} · price/call: $${price} · calls: ${calls} · expiry: ${expiresIn}s`);

  // 1. Abrir sesión: UNA tx on-chain (SAC approve) + POST /sessions.
  const session = await createSession({
    facilitatorUrl,
    network: NETWORK,
    asset,
    spendingCap: cap,
    decimals: DECIMALS,
    expiresIn,
    recipient,
    signer,
  });
  console.log(`\n✓ sesión ${session.sessionId}`);
  console.log(`  spender (facilitador): ${session.spender}`);
  console.log(`  cap: ${session.cap} · expira ledger ${session.expirationLedger}`);

  // 2. N settles — transfer_from on-chain por request, sin firmar nada más.
  for (let i = 1; i <= calls; i++) {
    const r = await settle(session.sessionId, priceBase);
    const tx = (r.body as { transaction?: string }).transaction;
    if (r.status !== 200 || !(r.body as { success?: boolean }).success) {
      fail(`settle #${i} falló (${r.status}): ${JSON.stringify(r.body)}`);
    }
    console.log(`  [${i}/${calls}] settle $${price} ✓ tx ${tx?.slice(0, 12)}…`);
  }

  // 3. Fail-closed: un settle por encima del cap restante DEBE fallar.
  const overCap = decimalToBaseUnits(cap, DECIMALS).toString();
  const rejected = await settle(session.sessionId, overCap);
  const rejectedOk =
    rejected.status !== 200 || !(rejected.body as { success?: boolean }).success;
  console.log(
    rejectedOk
      ? `  over-cap $${cap} rechazado ✓ (${rejected.status})`
      : "  over-cap ACEPTADO ✗ — BUG del facilitador"
  );
  if (!rejectedOk) process.exit(1);

  // 4. Estado final.
  const state = (await (
    await fetch(`${facilitatorUrl}/sessions/${session.sessionId}`)
  ).json()) as { cap: string; spent: string; expirationLedger: number };
  console.log(`\nestado final: cap ${state.cap} · spent ${state.spent} · expiry ${state.expirationLedger}`);

  const expectedSpent = BigInt(priceBase) * BigInt(calls);
  if (BigInt(state.spent) !== expectedSpent) {
    fail(`spent ${state.spent} ≠ esperado ${expectedSpent}`);
  }
  console.log("\nRESULT: PASS — 1 approve, " + calls + " transfer_from, over-cap rechazado");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  fail(msg.replace(/S[A-Z2-7]{54,}/g, "S…REDACTED"));
});
