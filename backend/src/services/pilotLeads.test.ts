import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import { createApp } from "../app.js";
import { getKvBackend, resetKvBackendForTests } from "./kvStore.js";
import { createPilotLead, PILOT_LEADS_LIST_KEY } from "./pilotLeads.js";

const ENV_KEYS = ["NODE_ENV", "VERCEL"] as const;

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
}

function restoreEnv(prev: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    const value = prev[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const valid = {
  name: "Ana Founder",
  email: "ana@fintech.mx",
  company: "Remesas MX",
  role: "founder",
  volume: "100k_1m",
};

describe("createPilotLead", () => {
  let prev: Record<string, string | undefined>;

  beforeEach(() => {
    prev = snapshotEnv();
    delete process.env.VERCEL;
    process.env.NODE_ENV = "test";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetKvBackendForTests();
  });

  afterEach(() => {
    restoreEnv(prev);
    resetKvBackendForTests();
  });

  it("guarda un lead de piloto sin PII de red en claro", async () => {
    const created = await createPilotLead({
      ...valid,
      email: "Ana@Fintech.MX",
      ip: "203.0.113.9",
      userAgent: "pilot-test",
    });
    assert.deepStrictEqual(created, { ok: true });

    const kv = getKvBackend();
    const lines = await kv.listAll(PILOT_LEADS_LIST_KEY);
    assert.ok(lines.length >= 1);
    const last = JSON.parse(lines[lines.length - 1]!) as {
      kind: string;
      email: string;
      role: string;
      volume: string;
      ipHash: string | null;
      ip?: string;
    };
    assert.strictEqual(last.kind, "pilot");
    assert.strictEqual(last.email, "ana@fintech.mx");
    assert.strictEqual(last.role, "founder");
    assert.strictEqual(last.volume, "100k_1m");
    assert.ok(last.ipHash);
    assert.strictEqual(last.ip, undefined);
  });

  it("POST /v1/leads/pilot 200 y 400", async () => {
    const app = createApp();
    const ok = await request(app).post("/v1/leads/pilot").send(valid).expect(200);
    assert.strictEqual(ok.body.ok, true);

    const bad = await request(app)
      .post("/v1/leads/pilot")
      .send({ ...valid, email: "nope" })
      .expect(400);
    assert.strictEqual(bad.body.error, "email_invalid");
  });

  it("rechaza rol y volumen fuera de enum", async () => {
    const app = createApp();
    const role = await request(app)
      .post("/v1/leads/pilot")
      .send({ ...valid, role: "intern" })
      .expect(400);
    assert.strictEqual(role.body.error, "role_invalid");

    const volume = await request(app)
      .post("/v1/leads/pilot")
      .send({ ...valid, volume: "all" })
      .expect(400);
    assert.strictEqual(volume.body.error, "volume_invalid");
  });

  it("503 en producción sin Upstash", async () => {
    process.env.NODE_ENV = "production";
    const app = createApp();
    const res = await request(app).post("/v1/leads/pilot").send(valid).expect(503);
    assert.strictEqual(res.body.error, "store_unavailable");
  });
});
