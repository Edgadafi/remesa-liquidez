import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { Keypair } from "@stellar/stellar-sdk";
import {
  buildAuditEnvelope,
  canonicalJson,
  auditTag,
  envelopeHash,
  isAuditEnabled,
  parseAuditHash,
  resetAuditForTests,
  sha256Hex,
  signAudit,
  verifyAnchor,
} from "./auditTrail.js";
import { getX402V1ServeConfig } from "./x402Config.js";

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
] as const;

function restore(prev: Record<string, string | undefined>) {
  for (const key of ENV) {
    const value = prev[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("auditTrail service", { concurrency: 1 }, () => {
  const prev = Object.fromEntries(ENV.map((key) => [key, process.env[key]]));
  afterEach(() => {
    restore(prev);
    resetAuditForTests();
  });

  it("canonicalJson es estable ante el orden de las llaves", () => {
    const a = canonicalJson({ z: 1, a: { b: 2, a: 1 }, m: [3, { d: 1, c: 2 }] });
    const b = canonicalJson({ a: { a: 1, b: 2 }, m: [3, { c: 2, d: 1 }], z: 1 });
    assert.strictEqual(a, b);
    assert.strictEqual(sha256Hex(a), sha256Hex(b));
  });

  it("el envelope no lleva IP, agente, webhookUrl ni txHash", () => {
    process.env.STELLAR_NETWORK = "testnet";
    const envelope = buildAuditEnvelope({
      endpoint: "GET /v1/quote",
      status: 200,
      body: {
        ok: true,
        source: "bitso",
        generatedAt: "2026-10-15T00:00:00.000Z",
        rate: 18.2,
        webhookUrl: "https://example.invalid/hook",
        txHash: "deadbeef",
      },
      paid: true,
      channel: "x402",
    });
    assert.deepStrictEqual(Object.keys(envelope).sort(), [
      "bodySha256",
      "endpoint",
      "generatedAt",
      "mode",
      "network",
      "source",
      "status",
      "v",
    ]);
    const dumped = JSON.stringify(envelope);
    assert.strictEqual(dumped.includes("webhookUrl"), false);
    assert.strictEqual(dumped.includes("txHash"), false);
    assert.strictEqual(dumped.includes("X-TIA-Agent"), false);
    assert.strictEqual(envelope.mode, "paid");
    assert.strictEqual(envelope.network, "stellar:testnet");
    assert.strictEqual(envelope.generatedAt, "2026-10-15T00:00:00.000Z");
  });

  it("el mismo body produce el mismo hash, y /alert ignora webhookUrl", () => {
    process.env.STELLAR_NETWORK = "testnet";
    const left = buildAuditEnvelope({
      endpoint: "POST /v1/alert",
      status: 201,
      body: {
        ok: true,
        alertId: "a",
        generatedAt: "2026-10-15T00:00:00.000Z",
        webhookUrl: "https://a.example/h",
      },
      paid: false,
    });
    const right = buildAuditEnvelope({
      endpoint: "POST /v1/alert",
      status: 201,
      body: {
        webhookUrl: "https://b.example/h",
        ok: true,
        alertId: "a",
        generatedAt: "2026-10-15T00:00:00.000Z",
      },
      paid: false,
    });
    assert.strictEqual(left.bodySha256, right.bodySha256);
    assert.strictEqual(envelopeHash(left), envelopeHash(right));
    assert.strictEqual(left.mode, "free");
  });

  it("firma el statement sin prefijo y rechaza sha-256:", () => {
    const signer = Keypair.random();
    process.env.AUDIT_SIGNER_SECRET = signer.secret();
    process.env.AUDIT_AGENT_ID = "tia-api";
    const hex = "ab".repeat(32);
    const agent = signAudit(hex);
    assert.strictEqual(agent.key, signer.publicKey());
    assert.strictEqual(agent.id, "tia-api");
    assert.strictEqual(
      signer.verify(
        Buffer.from(`nirium-audit-v1:${hex}`, "utf8"),
        Buffer.from(agent.signature, "base64")
      ),
      true
    );
    assert.strictEqual(
      signer.verify(
        Buffer.from(`nirium-audit-v1:sha-256:${hex}`, "utf8"),
        Buffer.from(agent.signature, "base64")
      ),
      false
    );
    assert.strictEqual(
      signer.verify(
        Buffer.from(`nirium-audit-v1:${hex.toUpperCase()}`, "utf8"),
        Buffer.from(agent.signature, "base64")
      ),
      false
    );
    assert.throws(() => signAudit(`sha-256:${hex}`), /sin prefijo/);
    assert.throws(() => signAudit(hex.toUpperCase()), /sin prefijo/);
  });

  it("el tag público es el mismo para gratis y pagado", () => {
    const cases = [
      ["GET /v1/quote", "tia-quote"],
      ["GET /v1/route", "tia-route"],
      ["POST /v1/alert", "tia-alert"],
    ] as const;
    for (const [endpoint, tag] of cases) {
      assert.strictEqual(auditTag(endpoint, "paid"), tag);
      assert.strictEqual(auditTag(endpoint, "free"), tag);
      assert.strictEqual(auditTag(endpoint, "free").includes("-free"), false);
    }
  });

  it("sin AUDIT_SIGNER_SECRET desactiva la auditoría", () => {
    process.env.AUDIT_ENABLED = "true";
    process.env.AUDIT_URL = "https://nirium-agent.fly.dev";
    process.env.STELLAR_NETWORK = "testnet";
    delete process.env.AUDIT_SIGNER_SECRET;
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (message?: unknown) => {
      warnings.push(String(message));
    };
    try {
      assert.strictEqual(isAuditEnabled(), false);
    } finally {
      console.warn = original;
    }
    assert.deepStrictEqual(warnings, [
      "[TIA audit] sin firma válida — auditoría desactivada",
    ]);
  });

  it("AUDIT_SIGNER_SECRET inválido desactiva la auditoría", () => {
    process.env.AUDIT_ENABLED = "true";
    process.env.AUDIT_URL = "https://nirium-agent.fly.dev";
    process.env.STELLAR_NETWORK = "testnet";
    process.env.AUDIT_SIGNER_SECRET = "no-es-una-llave";
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (message?: unknown) => {
      warnings.push(String(message));
    };
    try {
      assert.strictEqual(isAuditEnabled(), false);
    } finally {
      console.warn = original;
    }
    assert.deepStrictEqual(warnings, [
      "[TIA audit] sin firma válida — auditoría desactivada",
    ]);
  });

  it("verifyAnchor acepta un doc firmado y rechaza hash, llave o txHash/record", async () => {
    const signer = Keypair.random();
    const other = Keypair.random();
    process.env.AUDIT_SIGNER_SECRET = signer.secret();
    const hex = sha256Hex("tia-audit-fixture");
    const agent = signAudit(hex);
    const doc = {
      content_sha256: hex,
      agent: { key: agent.key, signature: agent.signature },
    };
    const ok = await verifyAnchor({
      gatewayUrl: "https://gateway.pinata.cloud/ipfs/cid",
      hex,
      initialDelayMs: 0,
      intervalMs: 1,
      deadlineMs: 1_000,
      fetchImpl: async () => Response.json(doc),
    });
    assert.deepStrictEqual(ok, { ok: true });

    const mismatch = await verifyAnchor({
      gatewayUrl: "https://gateway.pinata.cloud/ipfs/cid",
      hex,
      initialDelayMs: 0,
      deadlineMs: 1_000,
      fetchImpl: async () => Response.json({ ...doc, content_sha256: "cd".repeat(32) }),
    });
    assert.deepStrictEqual(mismatch, { ok: false, step: "content_sha256" });

    const wrongKey = signAudit(hex);
    process.env.AUDIT_SIGNER_SECRET = other.secret();
    const foreign = await verifyAnchor({
      gatewayUrl: "https://gateway.pinata.cloud/ipfs/cid",
      hex,
      initialDelayMs: 0,
      deadlineMs: 1_000,
      fetchImpl: async () =>
        Response.json({
          content_sha256: hex,
          agent: { key: wrongKey.key, signature: wrongKey.signature },
        }),
    });
    assert.deepStrictEqual(foreign, { ok: false, step: "agent.key" });

    process.env.AUDIT_SIGNER_SECRET = signer.secret();
    for (const extra of ["txHash", "record"] as const) {
      const failed = await verifyAnchor({
        gatewayUrl: "https://gateway.pinata.cloud/ipfs/cid",
        hex,
        initialDelayMs: 0,
        deadlineMs: 1_000,
        fetchImpl: async () => Response.json({ ...doc, [extra]: "no" }),
      });
      assert.deepStrictEqual(failed, { ok: false, step: extra });
    }
  });

  it("parseAuditHash acepta prefijo y rechaza basura", () => {
    const hex = "ab".repeat(32);
    assert.strictEqual(parseAuditHash(hex), hex);
    assert.strictEqual(parseAuditHash(`sha-256:${hex}`), hex);
    assert.strictEqual(parseAuditHash(`SHA-256:${hex.toUpperCase()}`), hex);
    assert.strictEqual(parseAuditHash("abc"), null);
    assert.strictEqual(parseAuditHash(`sha-256:${hex}ff`), null);
  });

  it("getX402V1ServeConfig conserva rutas y precios", () => {
    process.env.STELLAR_PAY_TO = Keypair.random().publicKey();
    process.env.X402_FACILITATOR_API_KEY = "local-test-facilitator-key";
    process.env.STELLAR_NETWORK = "testnet";
    delete process.env.NIRIUM_X402_QUOTE_PRICE;
    delete process.env.NIRIUM_X402_ROUTE_PRICE;
    delete process.env.NIRIUM_X402_ALERT_PRICE;
    const cfg = getX402V1ServeConfig();
    assert.deepStrictEqual(
      Object.fromEntries(Object.entries(cfg.routes).map(([k, v]) => [k, v.price])),
      {
        "GET /quote": "$0.10",
        "GET /route": "$0.25",
        "POST /alert": "$0.10",
      }
    );
  });
});
