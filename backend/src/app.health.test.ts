import { describe, it } from "node:test";
import assert from "node:assert";
import http from "node:http";
import request from "supertest";
import { createApp } from "./app.js";

/** Dirección pública de testnet ya documentada en los smokes. No es un secreto. */
const PAY_TO = "GB6GCGWLKAMGQI2D7VIO2VLZFREBJBGCAP7E7ZGXHWWNZIXWLPX5YO7Q";
const DUMMY_KEY = "local-test-facilitator-key";

const ENV_KEYS = [
  "NIRIUM_X402_ENABLED",
  "STELLAR_PAY_TO",
  "STELLAR_NETWORK",
  "X402_FACILITATOR_API_KEY",
  "X402_FACILITATOR_URL",
  "PROVA_ENABLED",
  "NODE_ENV",
  "VERCEL",
  "PUBLIC_BASE_URL",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(prev: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    const value = prev[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function applyEnv(values: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("mock facilitator has no port"));
        return;
      }
      resolve(address.port);
    });
  });
}

function paymentNetwork(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as {
    accepts?: Array<{ network?: string }>;
  };
  return decoded.accepts?.[0]?.network;
}

describe("GET /health x402 mount", () => {
  it("dice no montado cuando falta X402_FACILITATOR_API_KEY", async () => {
    const prev = snapshotEnv();
    applyEnv({
      NIRIUM_X402_ENABLED: "true",
      STELLAR_PAY_TO: PAY_TO,
      STELLAR_NETWORK: "testnet",
      NODE_ENV: "test",
    });
    try {
      const app = createApp();
      const health = await request(app).get("/health");
      assert.strictEqual(health.status, 200);
      assert.strictEqual(health.body.x402.enabled, false);
      assert.strictEqual(health.body.x402.mounted, false);
      assert.match(String(health.body.x402.reason), /no montado/);
      assert.match(String(health.body.x402.reason), /X402_FACILITATOR_API_KEY/);
      assert.strictEqual(JSON.stringify(health.body).includes(DUMMY_KEY), false);

      const quote = await request(app).get("/v1/quote");
      assert.notStrictEqual(quote.status, 402);
    } finally {
      restoreEnv(prev);
    }
  });

  it("cobra 402 en stellar:testnet cuando las rutas sí se montan", async () => {
    const facilitator = http.createServer((req, res) => {
      if (req.url?.startsWith("/supported")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            kinds: [
              { x402Version: 2, scheme: "exact", network: "stellar:testnet" },
            ],
            extensions: [],
            signers: {},
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    const port = await listen(facilitator);
    const prev = snapshotEnv();
    applyEnv({
      NIRIUM_X402_ENABLED: "true",
      STELLAR_PAY_TO: PAY_TO,
      STELLAR_NETWORK: "testnet",
      X402_FACILITATOR_API_KEY: DUMMY_KEY,
      X402_FACILITATOR_URL: `http://127.0.0.1:${port}`,
      NODE_ENV: "test",
      PUBLIC_BASE_URL: "https://remesa-tia-testnet.vercel.app",
    });
    try {
      const app = createApp();
      const health = await request(app).get("/health");
      assert.strictEqual(health.status, 200);
      assert.strictEqual(health.body.x402.enabled, true);
      assert.strictEqual(health.body.x402.mounted, true);
      assert.strictEqual(health.body.x402.reason, null);
      assert.strictEqual(health.body.x402.network, "stellar:testnet");
      assert.strictEqual(health.body.x402.payTo, PAY_TO);
      assert.strictEqual(JSON.stringify(health.body).includes(DUMMY_KEY), false);

      for (const path of ["/v1/quote", "/v1/route"]) {
        const res = await request(app).get(path);
        assert.strictEqual(res.status, 402, `${path} → ${res.status}`);
        assert.strictEqual(
          paymentNetwork(res.headers["payment-required"]),
          "stellar:testnet"
        );
        const exposed = String(res.headers["access-control-expose-headers"] ?? "");
        assert.match(exposed, /(?:^|,\s*)PAYMENT-REQUIRED(?:\s*,|$)/i);
        assert.match(exposed, /(?:^|,\s*)PAYMENT-RESPONSE(?:\s*,|$)/i);
        assert.strictEqual(JSON.stringify(res.body).includes(DUMMY_KEY), false);
      }
    } finally {
      restoreEnv(prev);
      await new Promise<void>((resolve, reject) => {
        facilitator.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
