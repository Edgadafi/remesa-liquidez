/**
 * Audit trail de TIA: ancla en Nirium solo el hash de respuestas exitosas
 * de /v1. Un POST por llamada, sin lotes, sin txHash y sin record.
 *
 * La firma es ed25519 sobre el utf8 `nirium-audit-v1:<hex>`, con <hex> en
 * minúsculas y SIN el prefijo `sha-256:`. En modo solo-hash el nodo no
 * recalcula nada: contentSha256 es ese mismo hex.
 *
 * Apagado salvo AUDIT_ENABLED=true y AUDIT_URL. Nunca loguea el secreto
 * ni la firma completa.
 */
import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { getKvBackend, resetKvBackendForTests } from "./kvStore.js";

const STATEMENT_PREFIX = "nirium-audit-v1:";
const CID_TTL_SECONDS = 90 * 24 * 60 * 60;
const PENDING_TTL_SECONDS = 10 * 60;
const RECENT_MAX = 1000;
const BACKOFF_KEY = "audit:backoff_until";
const HEX_64 = /^[0-9a-f]{64}$/;

export interface AuditEnvelope {
  v: "tia-audit-v1";
  endpoint: string;
  status: number;
  generatedAt: string;
  source?: string;
  network: "stellar:testnet" | "stellar:pubnet";
  bodySha256: string;
  mode: "paid" | "free";
}

export interface AuditAgent {
  key: string;
  signature: string;
  id?: string;
}

export interface StoredAudit {
  cid: string;
  endpoint: string;
  mode: "paid" | "free";
  anchoredAt: string;
  attestedBy?: string;
  gatewayUrl?: string;
}

export interface AnchorPostResult {
  status: number;
  retryAfter?: number;
  remaining: string | null;
  contentSha256?: string;
  cid?: string;
  gatewayUrl?: string;
  anchoredAt?: string;
  attestedBy?: string;
}

const warned = new Set<string>();
let inflight: Promise<void> = Promise.resolve();

function warnOnce(key: string, message: string, error = false): void {
  if (warned.has(key)) return;
  warned.add(key);
  if (error) console.error(message);
  else console.warn(message);
}

export function resetAuditForTests(): void {
  warned.clear();
  inflight = Promise.resolve();
  resetKvBackendForTests();
}

export function flushAuditForTests(): Promise<void> {
  return inflight;
}

function track(task: Promise<void>): void {
  inflight = inflight.then(() => task, () => task);
}

/** JSON con llaves ordenadas, sin espacios. Números vía JSON.stringify. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortValue(source[key]);
    }
    return sorted;
  }
  return value;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function stellarAuditNetwork(): "stellar:testnet" | "stellar:pubnet" {
  return process.env.STELLAR_NETWORK === "mainnet" ||
    process.env.STELLAR_NETWORK === "pubnet"
    ? "stellar:pubnet"
    : "stellar:testnet";
}

function redactBody(endpoint: string, body: unknown): unknown {
  // /v1/quote y /v1/route se hashean completos (datos de mercado). El amount
  // de route queda dentro del body, solo como hash. POST /v1/alert: sin
  // webhookUrl. El hash no es reversible en la práctica, pero valores de
  // baja entropía (amount=100) sí pueden adivinarse: por eso el envelope
  // lleva generatedAt y el bodySha256 del body completo, nunca campos sueltos.
  if (!endpoint.endsWith("/alert")) return body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const clone = { ...(body as Record<string, unknown>) };
  delete clone.webhookUrl;
  return clone;
}

export function buildAuditEnvelope(input: {
  endpoint: string;
  status: number;
  body: unknown;
  paid: boolean;
  channel?: string;
}): AuditEnvelope {
  const record =
    input.body && typeof input.body === "object"
      ? (input.body as Record<string, unknown>)
      : undefined;
  const generatedAt =
    typeof record?.generatedAt === "string" && record.generatedAt
      ? record.generatedAt
      : new Date().toISOString();
  const source = typeof record?.source === "string" && record.source ? record.source : undefined;
  const redacted = redactBody(input.endpoint, input.body);
  const envelope: AuditEnvelope = {
    v: "tia-audit-v1",
    endpoint: input.endpoint,
    status: input.status,
    generatedAt,
    ...(source ? { source } : {}),
    network: stellarAuditNetwork(),
    bodySha256: sha256Hex(canonicalJson(redacted)),
    mode: input.paid ? "paid" : "free",
  };
  return envelope;
}

export function envelopeHash(envelope: AuditEnvelope): string {
  return sha256Hex(canonicalJson(envelope));
}

function auditUrl(): string | null {
  const url = process.env.AUDIT_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

function networkMismatch(url: string): boolean {
  const urlMainnet = url.includes("mainnet");
  const envMainnet =
    process.env.STELLAR_NETWORK === "mainnet" || process.env.STELLAR_NETWORK === "pubnet";
  return urlMainnet !== envMainnet;
}

type SignerState = "ok" | "missing" | "invalid" | "payto";

function signerState(): SignerState {
  const secret = process.env.AUDIT_SIGNER_SECRET?.trim();
  if (!secret) return "missing";
  try {
    const signer = Keypair.fromSecret(secret);
    const payTo = process.env.STELLAR_PAY_TO?.trim();
    if (payTo && signer.publicKey() === payTo) return "payto";
    return "ok";
  } catch {
    return "invalid";
  }
}

/** true solo si el anclaje puede correr. No-op silencioso si el flag está apagado. */
export function isAuditEnabled(): boolean {
  if (process.env.AUDIT_ENABLED !== "true") return false;
  const url = auditUrl();
  if (!url) return false;
  if (networkMismatch(url)) {
    warnOnce(
      "network",
      "[TIA audit] AUDIT_URL no coincide con STELLAR_NETWORK — auditoría desactivada"
    );
    return false;
  }
  const signer = signerState();
  if (signer === "payto") {
    warnOnce(
      "payto",
      "[TIA audit] AUDIT_SIGNER_SECRET deriva en la misma cuenta que STELLAR_PAY_TO — auditoría desactivada",
      true
    );
    return false;
  }
  if (signer === "missing" || signer === "invalid") {
    warnOnce(
      "signer",
      signer === "missing"
        ? "[TIA audit] sin AUDIT_SIGNER_SECRET — se ancla sin agent"
        : "[TIA audit] AUDIT_SIGNER_SECRET inválido — se ancla sin agent"
    );
  }
  return true;
}

/**
 * Firma `nirium-audit-v1:<hex>`. <hex> tiene que ser 64 hex en minúsculas,
 * sin prefijo. Recibir `sha-256:…` o mayúsculas es un bug del llamador.
 */
export function signAudit(hex: string): AuditAgent {
  if (!HEX_64.test(hex)) {
    throw new Error(
      "signAudit: hex debe ser 64 caracteres en minúsculas, sin prefijo sha-256:"
    );
  }
  const secret = process.env.AUDIT_SIGNER_SECRET?.trim();
  if (!secret) throw new Error("signAudit: falta AUDIT_SIGNER_SECRET");
  const signer = Keypair.fromSecret(secret);
  const signature = Buffer.from(
    signer.sign(Buffer.from(`${STATEMENT_PREFIX}${hex}`, "utf8"))
  ).toString("base64");
  const id = (process.env.AUDIT_AGENT_ID?.trim() || "tia-api").slice(0, 64);
  return { key: signer.publicKey(), signature, id };
}

function maxPerMin(): number {
  const n = Number(process.env.AUDIT_MAX_PER_MIN);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 15;
}

function clampRetryAfter(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 60;
  return Math.min(120, Math.max(1, Math.floor(n)));
}

async function readBackoff(now: number): Promise<boolean> {
  const raw = await getKvBackend().get(BACKOFF_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && until > now;
}

async function setBackoff(seconds: number): Promise<void> {
  const wait = clampRetryAfter(seconds);
  const until = Date.now() + wait * 1000;
  const kv = getKvBackend();
  await kv.set(BACKOFF_KEY, String(until), wait + 5);
}

async function ownRateAllows(): Promise<boolean> {
  const kv = getKvBackend();
  const key = `audit:rl:${Math.floor(Date.now() / 60_000)}`;
  const n = await kv.incr(key);
  if (n === 1) await kv.expire(key, 120);
  return n <= maxPerMin();
}

function tagFor(endpoint: string, mode: "paid" | "free"): string {
  const base = endpoint.includes("/route")
    ? "tia-route"
    : endpoint.includes("/alert")
      ? "tia-alert"
      : "tia-quote";
  return mode === "free" ? `${base}-free` : base;
}

export function auditTag(endpoint: string, mode: "paid" | "free"): string {
  return tagFor(endpoint, mode);
}

async function postOnce(hex: string, tag: string, agent?: AuditAgent): Promise<AnchorPostResult> {
  const url = auditUrl();
  if (!url) return { status: 0, remaining: null };
  const controller = AbortSignal.timeout(8_000);
  let response: Response;
  try {
    response = await fetch(`${url}/api/audit/log`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        hash: `sha-256:${hex}`,
        tag,
        ...(agent ? { agent } : {}),
      }),
      signal: controller,
    });
  } catch {
    return { status: 599, remaining: null };
  }
  const remaining = response.headers.get("x-ratelimit-remaining");
  if (remaining !== null) {
    console.debug(`[TIA audit] X-RateLimit-Remaining ${remaining}`);
  }
  let payload: Record<string, unknown> = {};
  try {
    const parsed = (await response.json()) as unknown;
    if (parsed && typeof parsed === "object") payload = parsed as Record<string, unknown>;
  } catch {
    payload = {};
  }
  return {
    status: response.status,
    retryAfter:
      response.status === 429 ? clampRetryAfter(payload.retryAfter) : undefined,
    remaining,
    contentSha256:
      typeof payload.contentSha256 === "string" ? payload.contentSha256 : undefined,
    cid: typeof payload.cid === "string" ? payload.cid : undefined,
    gatewayUrl: typeof payload.gatewayUrl === "string" ? payload.gatewayUrl : undefined,
    anchoredAt: typeof payload.anchoredAt === "string" ? payload.anchoredAt : undefined,
    attestedBy: typeof payload.attestedBy === "string" ? payload.attestedBy : undefined,
  };
}

function retryDelayMs(): number {
  if (process.env.NODE_ENV === "test") return 0;
  return 1_000 + Math.floor(Math.random() * 1_000);
}

async function remember(
  hex: string,
  endpoint: string,
  mode: "paid" | "free",
  result: AnchorPostResult
): Promise<void> {
  if (!result.cid || result.contentSha256 !== hex) {
    console.warn("[TIA audit] audit_hash_mismatch");
    await getKvBackend().del(`audit:pending:${hex}`).catch(() => undefined);
    return;
  }
  const stored: StoredAudit = {
    cid: result.cid,
    endpoint,
    mode,
    anchoredAt: result.anchoredAt ?? new Date().toISOString(),
    ...(result.attestedBy ? { attestedBy: result.attestedBy } : {}),
    gatewayUrl: result.gatewayUrl ?? `https://gateway.pinata.cloud/ipfs/${result.cid}`,
  };
  const kv = getKvBackend();
  await kv.set(`audit:cid:${hex}`, JSON.stringify(stored), CID_TTL_SECONDS);
  await kv.del(`audit:pending:${hex}`).catch(() => undefined);
  await kv.listPush(
    "audit:recent",
    JSON.stringify({ hex, cid: result.cid, at: stored.anchoredAt }),
    RECENT_MAX
  );
}

/**
 * Un anclaje. No reintenta 429 en línea: marca backoff y descarta esta
 * llamada. 5xx/timeout: un reintento. 400: no se reintenta.
 */
export async function anchor(hex: string, tag: string, endpoint: string, mode: "paid" | "free"): Promise<void> {
  if (!isAuditEnabled()) return;
  if (!HEX_64.test(hex)) return;
  if (await readBackoff(Date.now())) {
    console.warn("[TIA audit] audit_skipped_backoff");
    return;
  }
  if (!(await ownRateAllows())) {
    console.warn("[TIA audit] audit_skipped_rate");
    return;
  }

  const kv = getKvBackend();
  await kv.set(`audit:pending:${hex}`, endpoint, PENDING_TTL_SECONDS);

  let agent: AuditAgent | undefined;
  if (signerState() === "ok") {
    try {
      agent = signAudit(hex);
    } catch {
      warnOnce("signer", "[TIA audit] no se pudo firmar — se ancla sin agent");
    }
  }

  const send = () => postOnce(hex, tag, agent);
  let result = await send();
  if (result.status === 429) {
    await setBackoff(result.retryAfter ?? 60);
    await kv.del(`audit:pending:${hex}`).catch(() => undefined);
    console.warn("[TIA audit] audit_skipped_429");
    return;
  }
  if (result.status === 400) {
    await kv.del(`audit:pending:${hex}`).catch(() => undefined);
    console.warn("[TIA audit] audit_rejected");
    return;
  }
  if (result.status >= 500 || result.status === 0) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs()));
    result = await send();
  }
  if (result.status === 429) {
    await setBackoff(result.retryAfter ?? 60);
    await kv.del(`audit:pending:${hex}`).catch(() => undefined);
    console.warn("[TIA audit] audit_skipped_429");
    return;
  }
  if (result.status === 400) {
    await kv.del(`audit:pending:${hex}`).catch(() => undefined);
    console.warn("[TIA audit] audit_rejected");
    return;
  }
  if (result.status >= 500 || result.status === 0 || !result.cid) {
    await kv.del(`audit:pending:${hex}`).catch(() => undefined);
    console.warn("[TIA audit] audit_failed");
    return;
  }
  if (result.remaining === "0") await setBackoff(60);
  await remember(hex, endpoint, mode, result);
}

export function scheduleAnchor(
  hex: string,
  tag: string,
  endpoint: string,
  mode: "paid" | "free"
): void {
  const task = anchor(hex, tag, endpoint, mode).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "anchor failed";
    console.warn(`[TIA audit] ${message}`);
  });
  track(task);
  if (process.env.VERCEL) {
    void import("@vercel/functions")
      .then(({ waitUntil }) => waitUntil(task))
      .catch(() => undefined);
  }
}

export function parseAuditHash(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/^sha-256:/, "");
  return HEX_64.test(text) ? text : null;
}

export async function lookupAudit(
  hex: string
): Promise<{ record: StoredAudit } | { pending: true } | null> {
  const kv = getKvBackend();
  const raw = await kv.get(`audit:cid:${hex}`);
  if (raw) {
    try {
      return { record: JSON.parse(raw) as StoredAudit };
    } catch {
      return null;
    }
  }
  const pending = await kv.get(`audit:pending:${hex}`);
  return pending ? { pending: true } : null;
}

export interface VerifyAnchorInput {
  gatewayUrl: string;
  hex: string;
  initialDelayMs?: number;
  intervalMs?: number;
  deadlineMs?: number;
  fetchImpl?: typeof fetch;
}

/** Verificación manual del doc IPFS. No usa nirium-cli (bug #139). */
export async function verifyAnchor(
  input: VerifyAnchorInput
): Promise<{ ok: true } | { ok: false; step: string }> {
  const hex = input.hex.trim().toLowerCase();
  if (!HEX_64.test(hex)) return { ok: false, step: "hex" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const initial = input.initialDelayMs ?? 30_000;
  const interval = input.intervalMs ?? 10_000;
  const deadline = Date.now() + (input.deadlineMs ?? 120_000);
  if (initial > 0) await new Promise((resolve) => setTimeout(resolve, initial));

  let doc: Record<string, unknown> | null = null;
  while (!doc) {
    let response: Response;
    try {
      response = await fetchImpl(input.gatewayUrl);
    } catch {
      if (Date.now() + interval > deadline) return { ok: false, step: "gateway" };
      await new Promise((resolve) => setTimeout(resolve, interval));
      continue;
    }
    if (response.status === 404 || response.status >= 500) {
      if (Date.now() + interval > deadline) return { ok: false, step: "gateway" };
      await new Promise((resolve) => setTimeout(resolve, interval));
      continue;
    }
    if (!response.ok) return { ok: false, step: "gateway_status" };
    const parsed = (await response.json()) as unknown;
    if (!parsed || typeof parsed !== "object") return { ok: false, step: "gateway_body" };
    doc = parsed as Record<string, unknown>;
  }

  if (doc.content_sha256 !== hex) return { ok: false, step: "content_sha256" };
  if ("record" in doc) return { ok: false, step: "record" };
  if ("txHash" in doc) return { ok: false, step: "txHash" };
  const agent = doc.agent;
  if (!agent || typeof agent !== "object") return { ok: false, step: "agent" };
  const signed = agent as { key?: unknown; signature?: unknown };
  if (typeof signed.key !== "string" || typeof signed.signature !== "string") {
    return { ok: false, step: "agent" };
  }
  const secret = process.env.AUDIT_SIGNER_SECRET?.trim();
  if (!secret) return { ok: false, step: "signer" };
  let expectedKey: string;
  try {
    expectedKey = Keypair.fromSecret(secret).publicKey();
  } catch {
    return { ok: false, step: "signer" };
  }
  if (signed.key !== expectedKey) return { ok: false, step: "agent.key" };
  let valid = false;
  try {
    valid = Keypair.fromPublicKey(signed.key).verify(
      Buffer.from(`${STATEMENT_PREFIX}${hex}`, "utf8"),
      Buffer.from(signed.signature, "base64")
    );
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, step: "firma" };
  return { ok: true };
}

/** Un POST de smoke, sin la política de backoff del servidor. */
export async function postAuditForSmoke(hex: string, tag: string): Promise<AnchorPostResult> {
  return postOnce(hex, tag, signAudit(hex));
}
