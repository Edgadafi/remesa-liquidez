import { z } from "zod";
import { sendWhatsAppText } from "./whatsapp.js";
import { buildTiaConfirmationText } from "./tiaMessages.js";

export const TiaNotifySchema = z.object({
  walletSolana: z.string().min(32),
  userWA: z.string().min(10),
  amountUSDC: z.number().positive(),
  reservationPda: z.string().optional(),
  txSignature: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
  audioBase64: z.string().optional(),
  storeName: z.string().optional(),
});

export type TiaNotifyInput = z.infer<typeof TiaNotifySchema>;

export interface TiaNotifyOutput {
  ok: boolean;
  messageSent: boolean;
  agent: "TIA";
  whatsapp?: { to: string; textSent: boolean; audioNote?: string };
  error?: string;
}

/**
 * Orquestador TIA — Semana 1 Bridge Dev3pack.
 * Envía mensaje WhatsApp (texto). audioBase64 se registra; PTT requiere patch en bot (Sem 2).
 */
export async function handleTiaNotify(
  input: TiaNotifyInput
): Promise<TiaNotifyOutput> {
  const text = buildTiaConfirmationText(
    input.amountUSDC,
    input.reservationPda,
    input.storeName
  );

  console.log(
    `[TIA] notify → ${input.userWA} | ${input.amountUSDC} USDC | verified=${input.isVerified ?? "?"}`
  );

  if (input.audioBase64) {
    console.log(
      `[TIA] audioBase64 recibido (${Math.round(input.audioBase64.length / 1024)} KB) — PTT en Sem 2`
    );
  }

  try {
    await sendWhatsAppText(input.userWA, text);
    console.log(`[TIA] WhatsApp text OK → ${input.userWA}`);

    return {
      ok: true,
      messageSent: true,
      agent: "TIA",
      whatsapp: {
        to: input.userWA,
        textSent: true,
        audioNote: input.audioBase64
          ? "audio recibido; nota de voz requiere /internal/send-audio-base64 en bot"
          : undefined,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "WhatsApp error";
    console.error("[TIA] notify error:", message);

    // Degradar: OK parcial si bot offline (demo sin WhatsApp)
    if (process.env.TIA_ALLOW_NOTIFY_WITHOUT_BOT === "true") {
      return {
        ok: true,
        messageSent: false,
        agent: "TIA",
        error: message,
      };
    }

    return { ok: false, messageSent: false, agent: "TIA", error: message };
  }
}
