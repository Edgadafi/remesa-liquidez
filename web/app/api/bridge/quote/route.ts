/**
 * GET /api/bridge/quote
 *
 * Devuelve un quote de LI.FI para bridgear USDC desde una cadena EVM a Solana,
 * listo para presentar al usuario antes de crear una TurnReservation.
 *
 * Query params:
 *   fromAddress  — wallet EVM del sender (requerido)
 *   toAddress    — wallet Solana del sender (requerido)
 *   fromAmount   — monto en unidades base USDC (requerido, ej. "10000000" = 10 USDC)
 *   fromChain    — cadena origen (opcional, default "ARB"). Soportados: ARB, BASE, POL
 */
import { ACTIONS_CORS_HEADERS } from "@solana/actions";
import { quoteBridgeToSolana } from "@/lib/lifi";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fromAddress = url.searchParams.get("fromAddress");
  const toAddress = url.searchParams.get("toAddress");
  const fromAmount = url.searchParams.get("fromAmount");
  const fromChain = url.searchParams.get("fromChain") ?? "ARB";

  if (!fromAddress || !toAddress || !fromAmount) {
    return json(
      {
        ok: false,
        message:
          "Parámetros requeridos: fromAddress (EVM), toAddress (Solana), fromAmount (USDC base units).",
        example:
          "/api/bridge/quote?fromAddress=0x…&toAddress=<SOL_PUBKEY>&fromAmount=10000000",
      },
      400
    );
  }

  try {
    const result = await quoteBridgeToSolana({
      fromAddress,
      toAddress,
      fromAmount,
      fromChain,
    });

    return json({
      ok: true,
      fromChain,
      fromAmount,
      toChain: "SOL",
      toAmount: result.toAmount,
      toAmountMin: result.toAmountMin,
      toAmountHuman: (parseInt(result.toAmount) / 1_000_000).toFixed(2),
      estimatedSeconds: result.estimatedTime,
      bridge: result.tool,
      feeCostUsd: result.feeCostUsd,
      note: "Fondos llegan a tu wallet Solana — úsalos con initialize_reservation para crear una remesa.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/bridge/quote] error:", err);
    return json({ ok: false, message }, 500);
  }
}
