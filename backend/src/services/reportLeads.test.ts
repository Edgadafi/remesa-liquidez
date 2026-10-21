import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import request from "supertest";
import { createApp } from "../app.js";
import { getKvBackend, resetKvBackendForTests } from "./kvStore.js";
import {
  DOWNLOAD_TOKEN_TTL_SECONDS,
  LEADS_LIST_KEY,
  REPORT_FILENAME,
  consumeDownloadToken,
  createReportLead,
  normalizeEmail,
  normalizeLead,
  normalizeWhatsapp,
  resolveReportPdfPath,
} from "./reportLeads.js";

const ENV_KEYS = ["NODE_ENV", "VERCEL", "PUBLIC_BASE_URL"] as const;

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

describe("reportLeads validators", () => {
  it("normaliza email", () => {
    assert.strictEqual(normalizeEmail("  Foo@Bar.COM "), "foo@bar.com");
    assert.strictEqual(normalizeEmail("not-an-email"), null);
  });

  it("normaliza WhatsApp E.164", () => {
    assert.strictEqual(normalizeWhatsapp("+52 55 1234 5678"), "+525512345678");
    assert.strictEqual(normalizeWhatsapp("00525512345678"), "+525512345678");
    assert.strictEqual(normalizeWhatsapp("525512345678"), null); // falta +
    assert.strictEqual(normalizeWhatsapp("55 1234 5678"), null);
    assert.strictEqual(normalizeWhatsapp("+0123"), null);
  });

  it("normalizeLead rechaza canal desconocido", () => {
    assert.strictEqual(normalizeLead("sms", "a@b.co"), null);
  });
});

describe("reportLeads store + download", () => {
  let prev: Record<string, string | undefined>;

  beforeEach(() => {
    prev = snapshotEnv();
    delete process.env.VERCEL;
    process.env.NODE_ENV = "test";
    process.env.PUBLIC_BASE_URL = "https://x402.holatia.app";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetKvBackendForTests();
  });

  afterEach(() => {
    restoreEnv(prev);
    resetKvBackendForTests();
  });

  it("resuelve el PDF en assets/reports", () => {
    const p = resolveReportPdfPath();
    assert.match(p, /reporte-remesas-agenticas-2026\.pdf$/);
    const buf = readFileSync(p);
    assert.ok(buf.length > 1_000);
    assert.strictEqual(buf.subarray(0, 4).toString("ascii"), "%PDF");
  });

  it("crea lead, consume token one-shot y lista el contacto", async () => {
    const created = await createReportLead({
      channel: "email",
      value: "Lead@Test.example",
      ip: "203.0.113.9",
      userAgent: "reportLeads-test",
    });
    assert.strictEqual(created.ok, true);
    if (!created.ok) return;

    const kv = getKvBackend();
    const lines = await kv.listAll(LEADS_LIST_KEY);
    assert.ok(lines.length >= 1);
    const last = JSON.parse(lines[lines.length - 1]!) as {
      channel: string;
      value: string;
    };
    assert.strictEqual(last.channel, "email");
    assert.strictEqual(last.value, "lead@test.example");

    const first = await consumeDownloadToken(created.token);
    assert.deepStrictEqual(first, { ok: true });
    const second = await consumeDownloadToken(created.token);
    assert.strictEqual(second.ok, false);
    if (!second.ok) assert.strictEqual(second.status, 410);
  });

  it("POST + GET HTTP: descarga PDF y el segundo GET falla", async () => {
    const app = createApp();
    const post = await request(app)
      .post("/v1/leads/report")
      .send({ channel: "whatsapp", value: "+5215512345678" })
      .expect(200);

    assert.strictEqual(post.body.ok, true);
    assert.match(String(post.body.downloadUrl), /\/v1\/leads\/report\/download\?token=/);

    const url = new URL(post.body.downloadUrl as string);
    const token = url.searchParams.get("token")!;
    assert.ok(token.length >= 16);

    const dl = await request(app)
      .get("/v1/leads/report/download")
      .query({ token })
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    assert.match(String(dl.headers["content-type"]), /pdf/);
    assert.match(
      String(dl.headers["content-disposition"]),
      new RegExp(REPORT_FILENAME)
    );
    const body = dl.body as Buffer;
    assert.strictEqual(body.subarray(0, 4).toString("ascii"), "%PDF");

    await request(app)
      .get("/v1/leads/report/download")
      .query({ token })
      .expect(410);

    // TTL documentado (smoke de constante; el store en memoria usa el mismo EX).
    assert.strictEqual(DOWNLOAD_TOKEN_TTL_SECONDS, 900);
  });

  it("503 en producción sin Upstash", async () => {
    process.env.NODE_ENV = "production";
    const app = createApp();
    const res = await request(app)
      .post("/v1/leads/report")
      .send({ channel: "email", value: "a@b.co" })
      .expect(503);
    assert.strictEqual(res.body.error, "store_unavailable");
  });

  it("400 con email inválido", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/v1/leads/report")
      .send({ channel: "email", value: "nope" })
      .expect(400);
    assert.strictEqual(res.body.error, "email_invalid");
  });
});
