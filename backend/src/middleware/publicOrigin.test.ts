import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { publicOrigin } from "./publicOrigin.js";

const PROD = "https://remesa-tia-testnet.vercel.app";
const PREVIEW = "remesa-tia-testnet-ihln37fo1-edgadafis-projects.vercel.app";

function app() {
  const server = express();
  server.use(publicOrigin());
  server.get("/v1/route", (req, res) => {
    res.json({ protocol: req.protocol, host: req.headers.host });
  });
  return server;
}

describe("publicOrigin", () => {
  const prevBase = process.env.PUBLIC_BASE_URL;
  const prevVercel = process.env.VERCEL;

  afterEach(() => {
    if (prevBase === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = prevBase;
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
  });

  it("en un preview de Vercel el 402 usa el host del request", async () => {
    process.env.PUBLIC_BASE_URL = PROD;
    process.env.VERCEL = "1";
    const res = await request(app())
      .get("/v1/route?amount=100")
      .set("x-forwarded-host", PREVIEW);
    assert.equal(res.status, 200);
    assert.equal(res.body.protocol, "https");
    assert.equal(res.body.host, PREVIEW);
  });

  it("el host de producción sigue saliendo de PUBLIC_BASE_URL", async () => {
    process.env.PUBLIC_BASE_URL = PROD;
    process.env.VERCEL = "1";
    const res = await request(app())
      .get("/v1/route")
      .set("x-forwarded-host", "remesa-tia-testnet.vercel.app");
    assert.equal(res.body.protocol, "https");
    assert.equal(res.body.host, "remesa-tia-testnet.vercel.app");
  });

  it("sin VERCEL un host ajeno no pisa PUBLIC_BASE_URL", async () => {
    process.env.PUBLIC_BASE_URL = PROD;
    delete process.env.VERCEL;
    const res = await request(app())
      .get("/v1/route")
      .set("x-forwarded-host", "evil.vercel.app");
    assert.equal(res.body.protocol, "https");
    assert.equal(res.body.host, "remesa-tia-testnet.vercel.app");
  });
});
