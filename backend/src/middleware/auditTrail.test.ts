import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert";
import express from "express";
import http from "node:http";
import request from "supertest";
import { Keypair } from "@stellar/stellar-sdk";
import { auditTrail } from "./auditTrail.js";
import {
  flushAuditForTests,
  resetAuditForTests,
} from "../services/auditTrail.js";
import { getKvBackend } from "../services/kvStore.js";
import v1Router from "../routes/v1.js";
import { createApp } from "../app.js";

const ENV = [
  "AUDIT_ENABLED",
  "AUDIT_URL",
  "AUDIT_SIGNER_SECRET",
  "AUDIT_AGENT_ID",
  "AUDIT_MAX_PER_MIN",
  "STELLAR_PAY_TO",
  "STELLAR_NETWORK",
  "NIRIUM_X402_ENABLED",
  "X402_FACILITATOR_API_KEY",
  "X402_FACILITATOR_URL",
  "NODE_ENV",
  "VERCEL",
  "PUBLIC_BASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

function snapshot(): Record<string, string | undefined> {
  return Object.fromEntries(ENV.map((key) => [key, process.env[key]]));
}

function restore(prev: Record<string, string | undefined>) {
  for (const key of ENV) {
    const value = prev[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

interface Seen {
  url: string;
  body: Record<string, unknown>;
  init: RequestInit | undefined;
}

function quoteApp() {
  const app = express();
  app.use(express.json());
  app.use("/v1", auditTrail());
  app.get("/v1/quote", (_req, res) => {
    res.json({
      ok: true,
      source: "bitso",
      generatedAt: "2026-10-15T00:00:00.000Z",
      rate: 18.25,
    });
  });
  app.get("/v1/route", (req, res) => {
    if (!req.query.amount) {
      res.status(400).json({ ok: false, error: "amount requerido" });
      return;
    }
    res.json({ ok: true, source: "bitso", amountUsd: Number(req.query.amount) });
  });
  app.post("/v1/alert", (_req, res) => {
    res.status(201).json({
      ok: true,
      alertId: "a1",
      webhookUrl: "https://hooks.example/tia",
    });
  });
  app.get("/v1/boom", (_req, res) => {
    res.status(500).json({ ok: false, message: "nope" });
  });
  app.use("/v1", v1Router);
  return app;
}

describe("auditTrail middleware", { concurrency: 1 }, () => {
  const prev = snapshot();
  const originalFetch: typeof fetch = globalThis.fetch;
  const seen: Seen[] = [];
  let clientReceived = false;
  let script: (call: number) => Response | Promise<Response> = () =>
    new Response("unset", { status: 500 });

  function enable(extra: Record<string, string> = {}) {
    const signer = Keypair.random();
    const payTo = Keypair.random();
    process.env.NODE_ENV = "test";
    process.env.AUDIT_ENABLED = "true";
    process.env.AUDIT_URL = "https://nirium-agent.fly.dev";
    process.env.AUDIT_SIGNER_SECRET = signer.secret();
    process.env.AUDIT_AGENT_ID = "tia-api";
    process.env.AUDIT_MAX_PER_MIN = "15";
    process.env.STELLAR_NETWORK = "testnet";
    process.env.STELLAR_PAY_TO = payTo.publicKey();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.VERCEL;
    for (const [key, value] of Object.entries(extra)) process.env[key] = value;
    resetAuditForTests();
    return signer;
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.timers.reset();
    restore(prev);
    resetAuditForTests();
  });

  function armFetch() {
    seen.length = 0;
    clientReceived = false;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      // `finish` puede disparar el POST antes de que supertest resuelva.
      // Esperar no es un fallo de red: si lanzamos, postOnce lo cuenta como
      // timeout (599) y el reintento se confunde con el primer intento.
      const deadline = Date.now() + 2_000;
      while (!clientReceived) {
        if (Date.now() > deadline) {
          throw new Error("el anclaje corrió antes de que el cliente recibiera la respuesta");
        }
        await new Promise((resolve) => setImmediate(resolve));
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      seen.push({ url: String(input), body, init });
      return script(seen.length);
    }) as typeof fetch;
  }

  function okScript() {
    script = () => {
      const last = seen[seen.length - 1];
      const hash = String(last?.body.hash ?? "");
      return Response.json(
        {
          cid: `bafy${seen.length}`,
          contentSha256: hash.replace(/^sha-256:/, ""),
          gatewayUrl: "https://gateway.pinata.cloud/ipfs/bafy",
          anchoredAt: "2026-10-15T00:00:01.000Z",
          attestedBy: "nirium-test",
        },
        { headers: { "X-RateLimit-Remaining": "10" } }
      );
    };
  }

  async function hit(app: express.Express, path: string, method: "get" | "post" = "get") {
    armFetch();
    okScript();
    const req = request(app)[method](path);
    const res = await req;
    clientReceived = true;
    await flushAuditForTests();
    return res;
  }

  it("AUDIT_ENABLED ausente no pone header ni llama al nodo", async () => {
    enable();
    delete process.env.AUDIT_ENABLED;
    resetAuditForTests();
    const res = await hit(quoteApp(), "/v1/quote");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers["x-tia-audit-hash"], undefined);
    assert.strictEqual(seen.length, 0);
  });

  it("200 en /v1/quote ancla una vez, después de responder, sin txHash ni record", async () => {
    const signer = enable();
    const res = await hit(quoteApp(), "/v1/quote");
    assert.strictEqual(res.status, 200);
    const header = String(res.headers["x-tia-audit-hash"]);
    assert.match(header, /^sha-256:[0-9a-f]{64}$/);
    assert.strictEqual(seen.length, 1);
    const call = seen[0];
    assert.strictEqual(call.url, "https://nirium-agent.fly.dev/api/audit/log");
    assert.strictEqual(call.body.hash, header);
    assert.strictEqual(call.body.tag, "tia-quote");
    assert.strictEqual(call.body.txHash, undefined);
    assert.strictEqual(call.body.record, undefined);
    assert.strictEqual(call.body.network, undefined);
    const agent = call.body.agent as { key: string; signature: string; id: string };
    assert.strictEqual(agent.key, signer.publicKey());
    assert.strictEqual(agent.id, "tia-api");
    assert.strictEqual(
      signer.verify(
        Buffer.from(`nirium-audit-v1:${header.slice("sha-256:".length)}`, "utf8"),
        Buffer.from(agent.signature, "base64")
      ),
      true
    );
    const stored = await getKvBackend().get(`audit:cid:${header.slice("sha-256:".length)}`);
    assert.ok(stored?.includes("bafy1"));
  });

  it("400 y 500 no anclan", async () => {
    enable();
    const missing = await hit(quoteApp(), "/v1/route");
    assert.strictEqual(missing.status, 400);
    assert.strictEqual(missing.headers["x-tia-audit-hash"], undefined);
    assert.strictEqual(seen.length, 0);

    const boom = await hit(quoteApp(), "/v1/boom");
    assert.strictEqual(boom.status, 500);
    assert.strictEqual(boom.headers["x-tia-audit-hash"], undefined);
    assert.strictEqual(seen.length, 0);
  });

  it("500/timeout reintenta una vez y el cliente sigue en 200; 400 no reintenta", async () => {
    enable();
    armFetch();
    script = (n) => (n === 1 ? new Response("no", { status: 500 }) : Response.json({
      cid: "bafyretry",
      contentSha256: String(seen[0]?.body.hash ?? "").replace(/^sha-256:/, ""),
      anchoredAt: "2026-10-15T00:00:01.000Z",
    }, { headers: { "X-RateLimit-Remaining": "3" } }));
    const res = await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(seen.length, 2);

    armFetch();
    let calls = 0;
    script = () => {
      calls += 1;
      if (calls === 1) throw new Error("timeout");
      return Response.json({
        cid: "bafytimeout",
        contentSha256: String(seen[seen.length - 1]?.body.hash ?? "").replace(/^sha-256:/, ""),
      });
    };
    const again = await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(again.status, 200);
    assert.strictEqual(seen.length, 2);

    armFetch();
    script = () => new Response(JSON.stringify({ error: "bad" }), { status: 400 });
    const rejected = await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(rejected.status, 200);
    assert.strictEqual(seen.length, 1);
  });

  it("429 no reintenta y la siguiente llamada espera el backoff", async () => {
    enable();
    armFetch();
    script = () =>
      Response.json({ retryAfter: 60 }, { status: 429, headers: { "X-RateLimit-Remaining": "0" } });
    const first = await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(first.status, 200);
    assert.strictEqual(seen.length, 1);
    const until = Number(await getKvBackend().get("audit:backoff_until"));
    assert.ok(until > Date.now());
    assert.ok(until <= Date.now() + 120_000);

    armFetch();
    const second = await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(second.status, 200);
    assert.strictEqual(seen.length, 0);

    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    mock.timers.tick(61_000);
    armFetch();
    okScript();
    const third = await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(third.status, 200);
    assert.strictEqual(seen.length, 1);
    mock.timers.reset();
  });

  it("retryAfter ausente usa 60 s y Remaining 0 también frena el siguiente", async () => {
    enable();
    armFetch();
    script = () => new Response("{}", { status: 429, headers: { "content-type": "application/json" } });
    await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    const until = Number(await getKvBackend().get("audit:backoff_until"));
    assert.ok(Math.abs(until - Date.now() - 60_000) < 2_000);

    resetAuditForTests();
    enable();
    armFetch();
    okScript();
    script = () => {
      const last = seen[seen.length - 1];
      return Response.json(
        {
          cid: "bafyremain",
          contentSha256: String(last?.body.hash ?? "").replace(/^sha-256:/, ""),
        },
        { headers: { "X-RateLimit-Remaining": "0" } }
      );
    };
    await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(seen.length, 1);
    armFetch();
    const blocked = await request(quoteApp()).get("/v1/quote");
    clientReceived = true;
    await flushAuditForTests();
    assert.strictEqual(blocked.status, 200);
    assert.strictEqual(seen.length, 0);
  });

  it("una llamada es un POST y N llamadas son N POST si el tope alcanza", async () => {
    enable({ AUDIT_MAX_PER_MIN: "5" });
    armFetch();
    okScript();
    for (let i = 0; i < 3; i += 1) {
      clientReceived = false;
      const res = await request(quoteApp()).get("/v1/quote");
      clientReceived = true;
      await flushAuditForTests();
      assert.strictEqual(res.status, 200);
    }
    assert.strictEqual(seen.length, 3);
  });

  it("AUDIT_MAX_PER_MIN=1 deja pasar un solo anclaje", async () => {
    enable({ AUDIT_MAX_PER_MIN: "1" });
    armFetch();
    okScript();
    for (let i = 0; i < 2; i += 1) {
      clientReceived = false;
      await request(quoteApp()).get("/v1/quote");
      clientReceived = true;
      await flushAuditForTests();
    }
    assert.strictEqual(seen.length, 1);
  });

  it("si el signer es payTo la auditoría queda apagada", async () => {
    const signer = Keypair.random();
    enable();
    process.env.AUDIT_SIGNER_SECRET = signer.secret();
    process.env.STELLAR_PAY_TO = signer.publicKey();
    resetAuditForTests();
    const res = await hit(quoteApp(), "/v1/quote");
    assert.strictEqual(res.headers["x-tia-audit-hash"], undefined);
    assert.strictEqual(seen.length, 0);
  });

  it("GET /v1/audit devuelve el cid o 400", async () => {
    enable();
    const res = await hit(quoteApp(), "/v1/quote");
    const header = String(res.headers["x-tia-audit-hash"]);
    const hex = header.slice("sha-256:".length);
    const found = await request(quoteApp()).get(`/v1/audit/${header}`);
    assert.strictEqual(found.status, 200);
    assert.strictEqual(found.body.ok, true);
    assert.strictEqual(found.body.cid, "bafy1");
    assert.strictEqual(found.body.hash, header);
    assert.strictEqual(found.body.signatureStatement, `nirium-audit-v1:${hex}`);
    assert.strictEqual(found.body.gatewayUrl, "https://gateway.pinata.cloud/ipfs/bafy");
    const bad = await request(quoteApp()).get("/v1/audit/nope");
    assert.strictEqual(bad.status, 400);
    const missing = await request(quoteApp()).get(`/v1/audit/${"cd".repeat(32)}`);
    assert.strictEqual(missing.status, 404);
    assert.strictEqual(missing.body.status, "unknown");
  });

  it("GET /v1/audit no lo cobra x402", async () => {
    const facilitator = http.createServer((req, res) => {
      if (req.url?.startsWith("/supported")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            kinds: [{ x402Version: 2, scheme: "exact", network: "stellar:testnet" }],
            extensions: [],
            signers: {},
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    const port = await new Promise<number>((resolve, reject) => {
      facilitator.once("error", reject);
      facilitator.listen(0, "127.0.0.1", () => {
        const address = facilitator.address();
        if (!address || typeof address === "string") {
          reject(new Error("sin puerto"));
          return;
        }
        resolve(address.port);
      });
    });
    enable({
      NIRIUM_X402_ENABLED: "true",
      X402_FACILITATOR_API_KEY: "local-test-facilitator-key",
      X402_FACILITATOR_URL: `http://127.0.0.1:${port}`,
      PUBLIC_BASE_URL: "https://remesa-tia-testnet.vercel.app",
      AUDIT_ENABLED: "false",
    });
    try {
      const app = createApp();
      const audit = await request(app).get(`/v1/audit/${"ab".repeat(32)}`);
      assert.notStrictEqual(audit.status, 402);
      assert.strictEqual(audit.status, 404);
      assert.strictEqual(audit.body.status, "unknown");
      assert.strictEqual(audit.headers["x-tia-free-remaining"], undefined);
      const quote = await request(app).get("/v1/quote");
      assert.strictEqual(quote.status, 402);
    } finally {
      await new Promise<void>((resolve, reject) => {
        facilitator.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
