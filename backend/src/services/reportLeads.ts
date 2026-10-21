/**
 * Lead-gate del reporte de remesas: valida WhatsApp/email, persiste el lead
 * en Upstash y emite un token one-shot para descargar el PDF.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { getKvBackend, hasDurableKv } from "./kvStore.js";

export const REPORT_FILENAME = "reporte-remesas-agenticas-2026.pdf";
export const LEADS_LIST_KEY = "tia:leads:report";
export const LEADS_LIST_MAX = 5_000;
export const DOWNLOAD_TOKEN_TTL_SECONDS = 900;
const DOWNLOAD_KEY_PREFIX = "tia:report:dl:";

export type LeadChannel = "whatsapp" | "email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** E.164: + y 8–15 dígitos (código de país incluido). */
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function normalizeEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(v) || v.length > 254) return null;
  return v;
}

export function normalizeWhatsapp(raw: string): string | null {
  let v = raw.trim().replace(/[\s()-]/g, "");
  // 00… → +… (prefijo internacional); sin + se rechaza (exige código de país).
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (!E164_RE.test(v)) return null;
  return v;
}

export function normalizeLead(
  channel: string,
  value: string
): { channel: LeadChannel; value: string } | null {
  if (channel === "email") {
    const email = normalizeEmail(value);
    return email ? { channel: "email", value: email } : null;
  }
  if (channel === "whatsapp") {
    const phone = normalizeWhatsapp(value);
    return phone ? { channel: "whatsapp", value: phone } : null;
  }
  return null;
}

/**
 * Ruta del PDF en disco. En Vercel el cwd es la raíz del proyecto backend y
 * `assets/reports/**` entra vía includeFiles en vercel.json. Sin import.meta
 * (el bundle api/app.cjs es CJS).
 */
export function resolveReportPdfPath(): string {
  const candidates = [
    path.join(process.cwd(), "assets", "reports", REPORT_FILENAME),
    path.join(process.cwd(), "backend", "assets", "reports", REPORT_FILENAME),
    // Local: tests/dev a veces arrancan con cwd = monorepo root o backend/.
    path.resolve("assets", "reports", REPORT_FILENAME),
    path.resolve("backend", "assets", "reports", REPORT_FILENAME),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`report PDF missing (looked in ${candidates.join(", ")})`);
}

function downloadKey(token: string): string {
  return `${DOWNLOAD_KEY_PREFIX}${token}`;
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function leadsStoreRequired(): boolean {
  return (
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL)
  );
}

export type CreateLeadResult =
  | { ok: true; token: string }
  | { ok: false; status: 400 | 503; error: string };

export async function createReportLead(input: {
  channel: string;
  value: string;
  ip?: string;
  userAgent?: string;
}): Promise<CreateLeadResult> {
  const normalized = normalizeLead(input.channel, input.value);
  if (!normalized) {
    return {
      ok: false,
      status: 400,
      error:
        input.channel === "email"
          ? "email_invalid"
          : input.channel === "whatsapp"
            ? "whatsapp_invalid"
            : "channel_invalid",
    };
  }

  if (leadsStoreRequired() && !hasDurableKv()) {
    return { ok: false, status: 503, error: "store_unavailable" };
  }

  const token = randomBytes(24).toString("base64url");
  const kv = getKvBackend();
  const record = {
    channel: normalized.channel,
    value: normalized.value,
    createdAt: new Date().toISOString(),
    ipHash: input.ip ? shortHash(input.ip) : null,
    uaHash: input.userAgent ? shortHash(input.userAgent) : null,
  };

  await kv.listPush(LEADS_LIST_KEY, JSON.stringify(record), LEADS_LIST_MAX);
  await kv.set(downloadKey(token), "1", DOWNLOAD_TOKEN_TTL_SECONDS);
  return { ok: true, token };
}

export type ConsumeTokenResult =
  | { ok: true }
  | { ok: false; status: 404 | 410 | 503; error: string };

/** One-shot: consume el token o falla si no existe / ya se usó. */
export async function consumeDownloadToken(
  token: string
): Promise<ConsumeTokenResult> {
  if (!token || token.length < 16 || token.length > 128) {
    return { ok: false, status: 404, error: "token_invalid" };
  }
  if (leadsStoreRequired() && !hasDurableKv()) {
    return { ok: false, status: 503, error: "store_unavailable" };
  }

  const kv = getKvBackend();
  const key = downloadKey(token);
  const existing = await kv.get(key);
  if (!existing) {
    return { ok: false, status: 410, error: "token_expired" };
  }
  await kv.del(key);
  return { ok: true };
}

export function publicBaseUrl(): string {
  const raw = process.env.PUBLIC_BASE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://x402.holatia.app";
}
