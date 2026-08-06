/**
 * POST /api/notify/cashout
 *
 * Fire-and-forget after merchant confirms validate_cashout on-chain.
 * Attests the cashout tx reference via Prova (fail-open).
 */
import { ACTIONS_CORS_HEADERS } from "@solana/actions";
import { AttestationBuilder } from "prova-agent-sdk";
import { attestBuiltAction } from "@/lib/prova";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...ACTIONS_CORS_HEADERS,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", ...ACTIONS_CORS_HEADERS },
  });
}

export async function POST(req: Request) {
  try {
    let body: {
      reservationPda?: string;
      txSignature?: string;
      merchant?: string;
    };

    try {
      body = await req.json();
    } catch {
      return json({ ok: false, message: "JSON body inválido." }, 400);
    }

    const { reservationPda, txSignature, merchant } = body;

    if (!reservationPda || !txSignature) {
      return json(
        {
          ok: false,
          message: "Campos requeridos: reservationPda, txSignature.",
        },
        400
      );
    }

    const txPayload = AttestationBuilder.transaction(txSignature, {
      reservationPda,
      merchant,
      action: "validate_cashout",
    });
    const prova = await attestBuiltAction("Transaction", txPayload);

    return json({
      ok: true,
      reservationPda,
      txSignature,
      prova: prova.ok
        ? { ok: true, explorerUrl: prova.explorerUrl }
        : { ok: false, error: prova.error },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/notify/cashout] error:", err);
    return json({ ok: false, message }, 500);
  }
}
