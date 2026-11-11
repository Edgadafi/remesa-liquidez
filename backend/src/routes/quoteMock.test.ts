import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { Keypair } from "@stellar/stellar-sdk";
import v1Router from "./v1.js";
import { getX402Prices, getX402V1ServeConfig } from "../services/x402Config.js";

const PRICE_ENV = [
  "NIRIUM_X402_QUOTE_PRICE",
  "NIRIUM_X402_ROUTE_PRICE",
  "NIRIUM_X402_ALERT_PRICE",
  "STELLAR_PAY_TO",
  "X402_FACILITATOR_API_KEY",
] as const;

describe("GET /v1/quote/mock", () => {
  const prev = Object.fromEntries(PRICE_ENV.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of PRICE_ENV) {
      const value = prev[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("responde la forma de quote con mock true, sin llamar a Bitso", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("mock must not fetch");
    };
    try {
      const server = express();
      server.use("/v1", v1Router);
      const res = await request(server).get("/v1/quote/mock");
      assert.equal(res.status, 200);
      assert.equal(res.body.mock, true);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.pair, "USD/MXN");
      assert.equal(res.body.source, "mock");
      assert.equal(res.body.isLive, false);
      assert.equal(typeof res.body.rate, "number");
      assert.equal(res.body.apiVersion, "1");
      assert.equal(res.headers["payment-response"], undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("no entra en la tabla x402 y no cambia los precios", () => {
    process.env.STELLAR_PAY_TO = Keypair.random().publicKey();
    process.env.X402_FACILITATOR_API_KEY = "test-key";
    delete process.env.NIRIUM_X402_QUOTE_PRICE;
    delete process.env.NIRIUM_X402_ROUTE_PRICE;
    delete process.env.NIRIUM_X402_ALERT_PRICE;

    const routes = getX402V1ServeConfig().routes;
    assert.equal(Object.hasOwn(routes, "GET /quote/mock"), false);
    assert.equal(routes["GET /quote"].price, "$0.10");
    assert.equal(routes["GET /route"].price, "$0.25");
    assert.equal(routes["POST /alert"].price, "$0.10");
    const prices = getX402Prices();
    assert.equal(prices.quote, "0.10");
    assert.equal(prices.route, "0.25");
    assert.equal(prices.alert, "0.10");
  });
});
