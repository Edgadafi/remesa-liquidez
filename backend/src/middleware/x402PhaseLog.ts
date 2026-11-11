/**
 * Una línea JSON por request que llega a /verify o /settle del facilitador.
 * No incluye el header de pago, el body ni la firma: solo tiempos, ruta y
 * el hash de la tx si el facilitador lo devolvió en PAYMENT-RESPONSE.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import type { Request, Response } from "express";

interface Phases {
  startedAt: number;
  verifyMs: number;
  settleMs: number;
  verifyEndedAt: number;
  settleStartedAt: number;
  inFetch: boolean;
}

const als = new AsyncLocalStorage<Phases>();
let installed = false;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function phaseOf(url: string): "verify" | "settle" | null {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    if (path.endsWith("/verify")) return "verify";
    if (path.endsWith("/settle")) return "settle";
  } catch {
    return null;
  }
  return null;
}

function installFetchTiming(): void {
  if (installed) return;
  installed = true;
  const inner = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const phases = als.getStore();
    const phase = phases && !phases.inFetch ? phaseOf(requestUrl(input)) : null;
    if (!phases || !phase) return inner(input, init);
    const started = performance.now();
    if (phase === "settle" && phases.settleStartedAt === 0) {
      phases.settleStartedAt = started;
    }
    phases.inFetch = true;
    try {
      return await inner(input, init);
    } finally {
      phases.inFetch = false;
      const elapsed = performance.now() - started;
      if (phase === "verify") {
        phases.verifyMs += elapsed;
        phases.verifyEndedAt = performance.now();
      } else {
        phases.settleMs += elapsed;
      }
    }
  };
}

/** Hash de liquidación, si el header es un SettleResponse base64. Nunca el payload. */
export function txHashFromPaymentResponse(header: unknown): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const pad = raw.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(Buffer.from(pad, "base64").toString("utf8")) as {
      transaction?: unknown;
    };
    if (typeof parsed.transaction !== "string") return null;
    const hash = parsed.transaction.trim().toLowerCase();
    return /^[0-9a-f]{64}$/.test(hash) ? hash : null;
  } catch {
    return null;
  }
}

export function phaseLogLine(
  phases: Phases,
  route: string,
  txHash: string | null,
  finishedAt = performance.now()
): string | null {
  if (phases.verifyMs === 0 && phases.settleMs === 0) return null;
  let handlerMs = 0;
  if (phases.verifyEndedAt > 0 && phases.settleStartedAt > 0) {
    handlerMs = Math.max(0, phases.settleStartedAt - phases.verifyEndedAt);
  } else if (phases.verifyEndedAt > 0) {
    handlerMs = Math.max(0, finishedAt - phases.verifyEndedAt);
  }
  return JSON.stringify({
    verify_ms: Math.round(phases.verifyMs),
    handler_ms: Math.round(handlerMs),
    settle_ms: Math.round(phases.settleMs),
    total_ms: Math.round(finishedAt - phases.startedAt),
    route,
    tx_hash: txHash,
  });
}

/**
 * Envuelve la llamada a x402Serve. Sin header de pago no mide nada: el 402
 * de descubrimiento no es un request pagado.
 */
export function observePaidPhases(req: Request, res: Response, run: () => unknown): void {
  const presented = req.get("payment-signature") || req.get("x-payment");
  if (!presented) {
    run();
    return;
  }
  installFetchTiming();
  const phases: Phases = {
    startedAt: performance.now(),
    verifyMs: 0,
    settleMs: 0,
    verifyEndedAt: 0,
    settleStartedAt: 0,
    inFetch: false,
  };
  als.run(phases, () => {
    res.on("finish", () => {
      const txHash = txHashFromPaymentResponse(
        res.getHeader("payment-response") ?? res.getHeader("x-payment-response")
      );
      const line = phaseLogLine(phases, `${req.method} ${req.baseUrl}${req.path}`, txHash);
      if (line) console.log(line);
    });
    run();
  });
}
