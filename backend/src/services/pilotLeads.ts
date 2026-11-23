/**
 * Lead-gate del piloto de 30 días: valida el formulario B2B y persiste en
 * Upstash. Fuera de x402 — mismo store que el reporte, lista aparte.
 */
import { createHash } from "node:crypto";
import { getKvBackend, hasDurableKv } from "./kvStore.js";
import { leadsStoreRequired, normalizeEmail } from "./reportLeads.js";

export const PILOT_LEADS_LIST_KEY = "tia:leads:pilot";
export const PILOT_LEADS_LIST_MAX = 5_000;

export const PILOT_ROLES = ["founder", "cto", "product", "compliance"] as const;
export type PilotRole = (typeof PILOT_ROLES)[number];

export const PILOT_VOLUMES = ["under_100k", "100k_1m", "over_1m"] as const;
export type PilotVolume = (typeof PILOT_VOLUMES)[number];

const NAME_MAX = 120;
const COMPANY_MAX = 120;

function isPilotRole(v: string): v is PilotRole {
  return (PILOT_ROLES as readonly string[]).includes(v);
}

function isPilotVolume(v: string): v is PilotVolume {
  return (PILOT_VOLUMES as readonly string[]).includes(v);
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function normalizeName(raw: string, max: number): string | null {
  const v = raw.trim().replace(/\s+/g, " ");
  if (v.length < 2 || v.length > max) return null;
  return v;
}

export type CreatePilotLeadResult =
  | { ok: true }
  | { ok: false; status: 400 | 503; error: string };

export async function createPilotLead(input: {
  name: string;
  email: string;
  company: string;
  role: string;
  volume: string;
  ip?: string;
  userAgent?: string;
}): Promise<CreatePilotLeadResult> {
  const name = normalizeName(input.name, NAME_MAX);
  if (!name) return { ok: false, status: 400, error: "name_invalid" };

  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, status: 400, error: "email_invalid" };

  const company = normalizeName(input.company, COMPANY_MAX);
  if (!company) return { ok: false, status: 400, error: "company_invalid" };

  const role = input.role.trim().toLowerCase();
  if (!isPilotRole(role)) return { ok: false, status: 400, error: "role_invalid" };

  const volume = input.volume.trim().toLowerCase();
  if (!isPilotVolume(volume)) {
    return { ok: false, status: 400, error: "volume_invalid" };
  }

  if (leadsStoreRequired() && !hasDurableKv()) {
    return { ok: false, status: 503, error: "store_unavailable" };
  }

  const kv = getKvBackend();
  const record = {
    kind: "pilot" as const,
    name,
    email,
    company,
    role,
    volume,
    createdAt: new Date().toISOString(),
    ipHash: input.ip ? shortHash(input.ip) : null,
    uaHash: input.userAgent ? shortHash(input.userAgent) : null,
  };

  await kv.listPush(PILOT_LEADS_LIST_KEY, JSON.stringify(record), PILOT_LEADS_LIST_MAX);
  return { ok: true };
}
