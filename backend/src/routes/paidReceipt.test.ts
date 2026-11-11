import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { Keypair } from "@stellar/stellar-sdk";
import v1Router from "./v1.js";
import {
  confirmPaidResponse,
  savePaidResponse,
  stagePendingTx,
} from "../services/paidReceiptStore.js";
import { resetKvBackendForTests } from "../services/kvStore.js";
import { setChainLookupForTests, type ChainLookup } from "../services/stellarPayment.js";

const TX = "ab".repeat(32);
const OTHER = "cd".repeat(32);

function app() {
  const server = express();
  server.use("/v1", v1Router);
  return server;
}

describe("GET /v1/receipt/tx/:txHash", () => {
  const prevPayTo = process.env.STELLAR_PAY_TO;
  const prevUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  let payTo = "";

  beforeEach(() => {
    payTo = Keypair.random().publicKey();
    process.env.STELLAR_PAY_TO = payTo;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetKvBackendForTests();
    setChainLookupForTests(null);
  });

  afterEach(() => {
    setChainLookupForTests(null);
    resetKvBackendForTests();
    if (prevPayTo === undefined) delete process.env.STELLAR_PAY_TO;
    else process.env.STELLAR_PAY_TO = prevPayTo;
    if (prevUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUpstashUrl;
    if (prevUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevUpstashToken;
  });

  it("devuelve el payload cuando la tx paga a payTo", async () => {
    const id = await savePaidResponse({
      endpoint: "GET /v1/quote",
      payload: { ok: true, pair: "USD/MXN", rate: 18.2 },
      auditHash: "sha-256:" + "11".repeat(32),
      payer: "GBUYER",
      amount: "1000000",
      payTo,
    });
    await confirmPaidResponse(id, TX);
    setChainLookupForTests(async () => ({
      kind: "pays_us",
      payer: "GBUYER",
      amount: "1000000",
      payTo,
    }));

    const res = await request(app()).get(`/v1/receipt/tx/${TX}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "confirmed");
    assert.equal(res.body.payload.rate, 18.2);
    assert.equal(res.body.endpoint, "GET /v1/quote");
    assert.equal(res.body.auditHash, "sha-256:" + "11".repeat(32));
  });

  it("recupera un pendiente cuando la cadena ya muestra el pago a payTo", async () => {
    await savePaidResponse({
      endpoint: "GET /v1/route",
      payload: { ok: true, amountUsd: 100 },
      auditHash: null,
      payer: "GBUYER",
      amount: "2500000",
      payTo,
    });
    setChainLookupForTests(async () => ({
      kind: "pays_us",
      payer: "GBUYER",
      amount: "2500000",
      payTo,
    }));

    const res = await request(app()).get(`/v1/receipt/tx/${OTHER}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "confirmed");
    assert.equal(res.body.payload.amountUsd, 100);
    assert.equal(res.body.txHash, OTHER);
  });

  it("responde pending si hay registro y la cadena aún no confirma", async () => {
    const id = await savePaidResponse({
      endpoint: "GET /v1/quote",
      payload: { ok: true, rate: 18.2 },
      auditHash: null,
      payer: "GBUYER",
      amount: "1000000",
      payTo,
    });
    await stagePendingTx(id, TX);
    setChainLookupForTests(async (): Promise<ChainLookup> => ({ kind: "missing" }));

    const res = await request(app()).get(`/v1/receipt/tx/${TX}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "pending");
    assert.equal(res.body.payload, undefined);
  });

  it("responde 404 si no hay registro ni tx", async () => {
    setChainLookupForTests(async (): Promise<ChainLookup> => ({ kind: "missing" }));
    const res = await request(app()).get(`/v1/receipt/tx/${TX}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "not_found");
  });

  it("responde 404 si la tx no paga a payTo", async () => {
    const id = await savePaidResponse({
      endpoint: "GET /v1/quote",
      payload: { ok: true, secret: "no-debe-salir" },
      auditHash: null,
      payer: "GBUYER",
      amount: "1000000",
      payTo,
    });
    await confirmPaidResponse(id, TX);
    setChainLookupForTests(async (): Promise<ChainLookup> => ({ kind: "other" }));

    const res = await request(app()).get(`/v1/receipt/tx/${TX}`);
    assert.equal(res.status, 404);
    assert.equal(JSON.stringify(res.body).includes("no-debe-salir"), false);
  });
});
