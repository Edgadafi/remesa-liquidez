import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  expireFxCacheForTests,
  getUsdMxnTicker,
  resetFxCacheForTests,
} from "./fxRate.js";

const live = {
  success: true,
  payload: {
    last: "18.20",
    bid: "18.10",
    ask: "18.30",
    volume: "1000",
    vwap: "18.15",
    high: "18.40",
    low: "18.00",
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("getUsdMxnTicker Bitso timeout", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetFxCacheForTests();
  });

  it("usa el cache vigente sin llamar a Bitso", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return jsonResponse(live);
    };
    const first = await getUsdMxnTicker();
    const second = await getUsdMxnTicker();
    assert.equal(calls, 1);
    assert.equal(second.rate, first.rate);
    assert.equal(second.isLive, true);
  });

  it("al vencer el timeout cae al fallback si no hay cache", async () => {
    globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("missing abort signal"));
          return;
        }
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });

    const started = Date.now();
    // AbortSignal.timeout no mantiene el event loop (timer unref). Sin esto
    // el runner cierra el proceso antes de los 2.5 s.
    const keepAlive = setInterval(() => undefined, 50);
    let ticker;
    try {
      ticker = await getUsdMxnTicker();
    } finally {
      clearInterval(keepAlive);
    }
    const elapsed = Date.now() - started;

    assert.equal(ticker.isLive, false);
    assert.equal(ticker.rate, 18.5);
    assert.equal(ticker.source, "bitso");
    assert.ok(elapsed < 4_000, `tardó ${elapsed}ms`);
  });

  it("si el fetch falla y hay cache vencido, devuelve ese cache", async () => {
    globalThis.fetch = async () => jsonResponse(live);
    const cached = await getUsdMxnTicker();
    expireFxCacheForTests();

    globalThis.fetch = async () => {
      throw new Error("bitso down");
    };
    const ticker = await getUsdMxnTicker();
    assert.equal(ticker.rate, cached.rate);
    assert.equal(ticker.isLive, true);
  });
});
