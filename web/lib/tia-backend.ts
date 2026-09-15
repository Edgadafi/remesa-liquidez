/**
 * Cliente HTTP hacia el backend TIA (holatia.app).
 *
 * Rutas:
 *   POST /api/tia/notify   — canónica
 *   POST /api/lidia/notify — alias legacy (remesa-blink en Render hasta migrar)
 *   GET  /health           — status + x402 prices
 */

const DEFAULT_PATHS = ["/api/tia/notify", "/api/lidia/notify"] as const;

export interface TiaNotifyPayload {
  walletSolana: string;
  userWA: string;
  amountUSDC: number;
  reservationPda: string;
  txSignature?: string | null;
  isVerified?: boolean;
  audioBase64?: string;
}

export interface TiaNotifyResult {
  ok: boolean;
  notified: boolean;
  path?: string;
  status?: number;
  error?: string;
}

function getNotifyPaths(): string[] {
  const custom = process.env.TIA_NOTIFY_PATH?.trim();
  if (custom) return [custom, ...DEFAULT_PATHS.filter((p) => p !== custom)];
  return [...DEFAULT_PATHS];
}

/**
 * Notifica al backend TIA (WhatsApp). Prueba /api/tia/notify y cae a /api/lidia/notify.
 */
export async function notifyTiaBackend(
  baseUrl: string,
  payload: TiaNotifyPayload,
  timeoutMs = 15_000
): Promise<TiaNotifyResult> {
  const base = baseUrl.replace(/\/$/, "");
  const paths = getNotifyPaths();
  let lastError: string | undefined;

  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        console.log(`[TIA] WhatsApp notify OK → ${payload.userWA} (${path})`);
        return { ok: true, notified: true, path, status: res.status };
      }

      lastError = `${path} → ${res.status}: ${await res.text()}`;
      console.warn(`[TIA] notify falló en ${path}:`, lastError);

      if (res.status === 404) continue;
      return { ok: false, notified: false, path, status: res.status, error: lastError };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch error";
      console.warn(`[TIA] notify error (${path}):`, lastError);
    }
  }

  return { ok: false, notified: false, error: lastError ?? "Sin respuesta del backend TIA" };
}

export const DEFAULT_TIA_BACKEND = "https://remesa-tia-backend.vercel.app";

export function configuredBackendUrl(): string {
  return (process.env.RENDER_BACKEND_URL ?? DEFAULT_TIA_BACKEND).replace(/\/$/, "");
}

export interface BackendHealth {
  ok: boolean;
  detail: string;
  prova?: {
    enabled: boolean;
    active: boolean;
    agentPda: string | null;
    attestationCount?: number;
  };
  x402?: {
    enabled: boolean;
    network: string;
    payTo: string | null;
    routes: Record<string, string>;
  };
}

async function fetchHealth(url: string): Promise<BackendHealth> {
  try {
    const res = await fetch(`${url}/health`, { next: { revalidate: 60 } });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = (await res.json()) as {
      status?: string;
      agent?: string;
      prova?: BackendHealth["prova"];
      x402?: BackendHealth["x402"];
    };
    return {
      ok: true,
      detail: data.status ?? data.agent ?? "ok",
      prova: data.prova,
      x402: data.x402,
    };
  } catch {
    return { ok: false, detail: "Sin respuesta" };
  }
}

/** Prefer configured URL; if it is down or x402 is off, fall back to the live Vercel API. */
export async function resolveBackendHealth(): Promise<{
  backendUrl: string;
  health: BackendHealth;
}> {
  const configured = configuredBackendUrl();
  const primary = await fetchHealth(configured);
  if (primary.ok && primary.x402?.enabled) {
    return { backendUrl: configured, health: primary };
  }
  if (configured !== DEFAULT_TIA_BACKEND) {
    const fallback = await fetchHealth(DEFAULT_TIA_BACKEND);
    if (fallback.ok) {
      return { backendUrl: DEFAULT_TIA_BACKEND, health: fallback };
    }
  }
  return { backendUrl: configured, health: primary };
}
