import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import {
  Account,
  Address,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import v1Router from "./v1.js";
import { paidReceiptCapture } from "../middleware/paidReceiptCapture.js";
import {
  confirmPaidResponse,
  resolvePaidReceipt,
  savePaidResponse,
  stagePendingTx,
} from "../services/paidReceiptStore.js";
import { resetKvBackendForTests } from "../services/kvStore.js";
import {
  paymentKeyFromHeader,
  setChainLookupForTests,
  type ChainLookup,
} from "../services/stellarPayment.js";

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
      paymentKey: "GBUYER:1",
    });
    await confirmPaidResponse(id, TX);
    setChainLookupForTests(async () => ({
      kind: "pays_us",
      payer: "GBUYER",
      amount: "1000000",
      payTo,
      paymentKey: null,
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
      paymentKey: "GBUYER:2",
    });
    setChainLookupForTests(async () => ({
      kind: "pays_us",
      payer: "GBUYER",
      amount: "2500000",
      payTo,
      paymentKey: "GBUYER:2",
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
      paymentKey: "GBUYER:3",
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
      paymentKey: "GBUYER:4",
    });
    await confirmPaidResponse(id, TX);
    setChainLookupForTests(async (): Promise<ChainLookup> => ({ kind: "other" }));

    const res = await request(app()).get(`/v1/receipt/tx/${TX}`);
    assert.equal(res.status, 404);
    assert.equal(JSON.stringify(res.body).includes("no-debe-salir"), false);
  });

  it("dos pagos iguales del mismo pagador recuperan cada uno su payload", async () => {
    const txA = "a1".repeat(32);
    const txB = "b2".repeat(32);
    const headerA = signedPaymentHeader(payTo, 11n);
    const headerB = signedPaymentHeader(payTo, 22n);
    const keyA = paymentKeyFromHeader(headerA);
    const keyB = paymentKeyFromHeader(headerB);
    assert.ok(keyA && keyB && keyA !== keyB);

    const capture = express();
    capture.use(paidReceiptCapture());
    capture.get("/quote", (req, res) => {
      const hash = req.get("x-tx") ?? "";
      res.setHeader(
        "payment-response",
        Buffer.from(JSON.stringify({ transaction: hash })).toString("base64url")
      );
      res.json({ ok: true, mark: req.get("x-mark") });
    });

    await request(capture).get("/quote").set("payment-signature", headerA).set("x-tx", txA).set("x-mark", "a");
    await request(capture).get("/quote").set("payment-signature", headerB).set("x-tx", txB).set("x-mark", "b");
    await new Promise((resolve) => setImmediate(resolve));

    setChainLookupForTests(async (txHash) => ({
      kind: "pays_us",
      payer: "GBUYER",
      amount: "2500000",
      payTo,
      paymentKey: txHash === txA ? keyA : txHash === txB ? keyB : null,
    }));

    const gotA = await request(app()).get(`/v1/receipt/tx/${txA}`);
    const gotB = await request(app()).get(`/v1/receipt/tx/${txB}`);
    assert.equal(gotA.status, 200);
    assert.equal(gotA.body.payload.mark, "a");
    assert.equal(gotB.status, 200);
    assert.equal(gotB.body.payload.mark, "b");

    const stranger = "c3".repeat(32);
    const missed = await request(app()).get(`/v1/receipt/tx/${stranger}`);
    assert.equal(missed.status, 404);
  });

  it("un pago sin identificador queda unbound y no se liga a una tx", async () => {
    const warnings: string[] = [];
    const previous = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((part) => String(part)).join(" "));
    };
    try {
      const capture = express();
      capture.use(paidReceiptCapture());
      capture.get("/route", (_req, res) => {
        res.setHeader(
          "payment-response",
          Buffer.from(JSON.stringify({ transaction: OTHER })).toString("base64url")
        );
        res.json({ ok: true, leaked: "no-debe-ligarse" });
      });
      await request(capture).get("/route").set("x-payment", "no-es-un-pago");
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      console.warn = previous;
    }

    assert.equal(warnings.some((line) => line.includes("unbound")), true);
    setChainLookupForTests(async () => ({
      kind: "pays_us",
      payer: "GBUYER",
      amount: "2500000",
      payTo,
      paymentKey: null,
    }));
    const res = await request(app()).get(`/v1/receipt/tx/${OTHER}`);
    assert.equal(res.status, 404);
    assert.equal(JSON.stringify(res.body).includes("no-debe-ligarse"), false);
    assert.equal((await resolvePaidReceipt(OTHER)).status, "missing");
  });
});

const USDC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

function signedPaymentHeader(destination: string, nonce: bigint): string {
  const signer = Keypair.random();
  const contract = new Address(USDC);
  const credentials = new xdr.SorobanAddressCredentials({
    address: new Address(signer.publicKey()).toScAddress(),
    nonce: new xdr.Int64(nonce),
    signatureExpirationLedger: 1000,
    signature: xdr.ScVal.scvBytes(Buffer.from("sig")),
  });
  const entry = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(credentials),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: contract.toScAddress(),
          functionName: "transfer",
          args: [],
        })
      ),
      subInvocations: [],
    }),
  });
  const tx = new TransactionBuilder(new Account(signer.publicKey(), "1"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: contract.toScAddress(),
            functionName: "transfer",
            args: [
              nativeToScVal(signer.publicKey(), { type: "address" }),
              nativeToScVal(destination, { type: "address" }),
              nativeToScVal(2500000n, { type: "i128" }),
            ],
          })
        ),
        auth: [entry],
      })
    )
    .setTimeout(30)
    .build();
  return Buffer.from(
    JSON.stringify({ x402Version: 2, payload: { transaction: tx.toXDR() } })
  ).toString("base64url");
}
