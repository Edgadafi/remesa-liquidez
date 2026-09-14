/**
 * Cliente del bot WhatsApp (Baileys) vía endpoints internos de remesa-blink-bot.
 *
 * En Vercel, BOT_INTERNAL_URL tiene que ser HTTPS público (Render, túnel, etc.).
 * localhost / 127.0.0.1 no es alcanzable desde las Functions.
 */

function resolveBotUrl(): string {
  const raw = (process.env.BOT_INTERNAL_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error(
      "BOT_INTERNAL_URL is not set. Use a public HTTPS URL for the Baileys bot (not localhost)."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`BOT_INTERNAL_URL is not a valid URL: ${raw}`);
  }

  const host = parsed.hostname.toLowerCase();
  const loopback =
    host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  if (loopback && process.env.VERCEL) {
    throw new Error(
      "BOT_INTERNAL_URL cannot be localhost on Vercel; the Function cannot reach your WSL. Point it at the public Baileys URL."
    );
  }

  return raw;
}

const BOT_SECRET = process.env.BOT_INTERNAL_SECRET ?? "";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (BOT_SECRET) h.Authorization = `Bearer ${BOT_SECRET}`;
  return h;
}

export async function sendWhatsAppText(to: string, text: string): Promise<void> {
  const res = await fetch(`${resolveBotUrl()}/internal/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to, text }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp text failed ${res.status}: ${body}`);
  }
}
