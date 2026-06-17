/**
 * Cliente del bot WhatsApp (Baileys) vía endpoints internos de remesa-blink-bot.
 */

const BOT_URL = (process.env.BOT_INTERNAL_URL ?? "http://localhost:3002").replace(
  /\/$/,
  ""
);
const BOT_SECRET = process.env.BOT_INTERNAL_SECRET ?? "";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (BOT_SECRET) h.Authorization = `Bearer ${BOT_SECRET}`;
  return h;
}

export async function sendWhatsAppText(to: string, text: string): Promise<void> {
  const res = await fetch(`${BOT_URL}/internal/send`, {
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
