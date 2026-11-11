import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { phaseLogLine, txHashFromPaymentResponse } from "./x402PhaseLog.js";

const TX = "ab".repeat(32);

describe("x402 phase log", () => {
  it("una línea JSON con las fases y el hash, sin el payload", () => {
    const header = Buffer.from(
      JSON.stringify({
        success: true,
        transaction: TX,
        payer: "G".repeat(56),
        payload: { signature: "should-not-appear" },
      })
    ).toString("base64");
    const line = phaseLogLine(
      {
        startedAt: 1_000,
        verifyMs: 12.4,
        settleMs: 30.2,
        verifyEndedAt: 1_020,
        settleStartedAt: 1_080,
        inFetch: false,
      },
      "GET /v1/quote",
      txHashFromPaymentResponse(header),
      1_200
    );
    assert.ok(line);
    const parsed = JSON.parse(line) as Record<string, unknown>;
    assert.deepEqual(parsed, {
      verify_ms: 12,
      handler_ms: 60,
      settle_ms: 30,
      total_ms: 200,
      route: "GET /v1/quote",
      tx_hash: TX,
    });
    assert.equal(line.includes("should-not-appear"), false);
    assert.equal(line.includes("signature"), false);
  });

  it("ignora un header que no trae hash de 64 hex", () => {
    assert.equal(txHashFromPaymentResponse("not-base64-json"), null);
    assert.equal(
      txHashFromPaymentResponse(Buffer.from(JSON.stringify({ transaction: "short" })).toString("base64")),
      null
    );
  });

  it("no loguea si no hubo verify ni settle", () => {
    assert.equal(
      phaseLogLine(
        {
          startedAt: 0,
          verifyMs: 0,
          settleMs: 0,
          verifyEndedAt: 0,
          settleStartedAt: 0,
          inFetch: false,
        },
        "GET /v1/quote",
        null,
        10
      ),
      null
    );
  });
});
