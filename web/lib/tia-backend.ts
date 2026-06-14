/**
 * Cliente HTTP hacia el backend Render del agente TIA.
 *
 * Rutas:
 *   POST /api/tia/notify   — canónica (Bridge Dev3pack)
 *   POST /api/lidia/notify — alias legacy (remesa-blink en Render hasta migrar)
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

      // 404 en ruta nueva → probar legacy
      if (res.status === 404) continue;
      return { ok: false, notified: false, path, status: res.status, error: lastError };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch error";
      console.warn(`[TIA] notify error (${path}):`, lastError);
    }
  }

  return { ok: false, notified: false, error: lastError ?? "Sin respuesta del backend TIA" };
}
