"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/app.ts
var app_exports = {};
__export(app_exports, {
  createApp: () => createApp
});
module.exports = __toCommonJS(app_exports);
var import_express4 = __toESM(require("express"), 1);
var niriumNs = __toESM(require("nirium"), 1);

// src/routes/tia.ts
var import_express = require("express");

// src/middleware/overrideAuth.ts
function requireOverrideSecret(req, res, next) {
  const secret = process.env.TIA_MANUAL_OVERRIDE_SECRET ?? process.env.BOT_INTERNAL_SECRET ?? "";
  if (!secret) {
    res.status(503).json({
      ok: false,
      agent: "TIA",
      error: "Manual override disabled \u2014 set TIA_MANUAL_OVERRIDE_SECRET"
    });
    return;
  }
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== secret) {
    res.status(401).json({ ok: false, agent: "TIA", error: "Unauthorized" });
    return;
  }
  next();
}
function requireCronSecret(req, res, next) {
  const secrets = [
    process.env.CRON_SECRET,
    process.env.TIA_MANUAL_OVERRIDE_SECRET
  ].filter((s) => Boolean(s));
  if (secrets.length === 0) {
    res.status(503).json({
      ok: false,
      agent: "TIA",
      error: "Alert check disabled \u2014 set CRON_SECRET (o TIA_MANUAL_OVERRIDE_SECRET)"
    });
    return;
  }
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !secrets.includes(token)) {
    res.status(401).json({ ok: false, agent: "TIA", error: "Unauthorized" });
    return;
  }
  next();
}

// src/services/tiaNotify.ts
var import_zod = require("zod");
var import_prova_agent_sdk2 = require("prova-agent-sdk");

// src/services/whatsapp.ts
function resolveBotUrl() {
  const raw = (process.env.BOT_INTERNAL_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error(
      "BOT_INTERNAL_URL is not set. Use a public HTTPS URL for the Baileys bot (not localhost)."
    );
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`BOT_INTERNAL_URL is not a valid URL: ${raw}`);
  }
  const host = parsed.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  if (loopback && process.env.VERCEL) {
    throw new Error(
      "BOT_INTERNAL_URL cannot be localhost on Vercel; the Function cannot reach your WSL. Point it at the public Baileys URL."
    );
  }
  return raw;
}
var BOT_SECRET = process.env.BOT_INTERNAL_SECRET ?? "";
function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (BOT_SECRET) h.Authorization = `Bearer ${BOT_SECRET}`;
  return h;
}
async function sendWhatsAppText(to, text) {
  const res = await fetch(`${resolveBotUrl()}/internal/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to, text }),
    signal: AbortSignal.timeout(15e3)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp text failed ${res.status}: ${body}`);
  }
}

// src/services/tiaMessages.ts
function cashoutBlinkUrl(reservationPda) {
  const site = process.env.BLINK_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_BLINK_BASE_URL;
  if (!site || !reservationPda) return void 0;
  const base = site.replace(/\/$/, "");
  const action = `${base}/api/actions/cashout?pda=${encodeURIComponent(reservationPda)}`;
  return `https://dial.to/?action=solana-action:${action}`;
}
function buildTiaConfirmationText(amountUSDC, reservationPda, storeName) {
  const amount = amountUSDC.toFixed(2);
  const amountMXN = (amountUSDC * 17.2).toFixed(0);
  let body = `\xA1Hola! Soy TIA, tu asistente de remesas.

Tu remesa de *${amount} USDC* (~$${amountMXN} MXN) ya est\xE1 verificada y lista para retirar.`;
  if (storeName) {
    body += `

Dir\xEDgete a *${storeName}* y muestra tu c\xF3digo al cajero.`;
  } else {
    body += `

Acude a cualquier comercio aliado con tu c\xF3digo de retiro.`;
  }
  if (reservationPda) {
    body += `

Ref: \`${reservationPda.slice(0, 8)}\u2026${reservationPda.slice(-6)}\``;
    const blink = cashoutBlinkUrl(reservationPda);
    if (blink) {
      body += `

Retiro (comercio): ${blink}`;
    }
  }
  body += `

\xA1Tu dinero te espera! \u{1F49A}`;
  return body;
}

// src/services/prova.ts
var import_prova_agent_sdk = require("prova-agent-sdk");
var import_web3 = require("@solana/web3.js");
var cachedClient = null;
var cachedOperatorKeypair = null;
function parseKeypair(raw) {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim());
    return import_web3.Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    return null;
  }
}
function loadProvaConfig() {
  if (process.env.PROVA_ENABLED !== "true") return null;
  const rpcUrl = process.env.PROVA_RPC_URL ?? process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const agentKeypair = parseKeypair(process.env.PROVA_AGENT_SECRET_KEY);
  const operatorKeypair = parseKeypair(process.env.PROVA_OPERATOR_SECRET_KEY) ?? parseKeypair(process.env.KEEPER_PRIVATE_KEY);
  if (!agentKeypair || !operatorKeypair) {
    console.warn(
      "[Prova] PROVA_ENABLED but missing PROVA_AGENT_SECRET_KEY or operator keypair"
    );
    return null;
  }
  return { rpcUrl, agentKeypair, operatorKeypair };
}
function getClient() {
  const config = loadProvaConfig();
  if (!config) return null;
  if (!cachedClient) {
    cachedClient = new import_prova_agent_sdk.ProvaClient({
      rpcUrl: config.rpcUrl,
      agentKeypair: config.agentKeypair
    });
    cachedOperatorKeypair = config.operatorKeypair;
  }
  return cachedClient;
}
async function getProvaStatus() {
  const enabled = process.env.PROVA_ENABLED === "true";
  const envAgentPda = process.env.NEXT_PUBLIC_PROVA_AGENT_PDA ?? null;
  if (!enabled) {
    return { enabled: false, active: false, agentPda: envAgentPda };
  }
  const client2 = getClient();
  if (!client2 || !cachedOperatorKeypair) {
    return { enabled: true, active: false, agentPda: envAgentPda };
  }
  try {
    const active = await client2.isAgentActive(cachedOperatorKeypair.publicKey);
    if (!active) {
      return { enabled: true, active: false, agentPda: envAgentPda };
    }
    const account = await client2.getAgentAccount(cachedOperatorKeypair.publicKey);
    return {
      enabled: true,
      active: true,
      agentPda: account.address.toBase58(),
      attestationCount: account.attestationCount
    };
  } catch (err) {
    console.warn("[Prova] getProvaStatus failed:", err);
    return { enabled: true, active: false, agentPda: envAgentPda };
  }
}
async function attestBuiltAction(actionType, builtPayload, privacyMode = false) {
  const client2 = getClient();
  if (!client2 || !cachedOperatorKeypair) {
    return { ok: false, error: "Prova not configured" };
  }
  try {
    const actionHash = await import_prova_agent_sdk.ProvaClient.hashAction(JSON.stringify(builtPayload));
    const { txSignature, explorerUrl } = await client2.attest({
      operatorKeypair: cachedOperatorKeypair,
      actionHash,
      actionType,
      privacyMode
    });
    return { ok: true, explorerUrl, txSignature };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Prova attest failed";
    console.warn("[Prova] attestBuiltAction failed:", error);
    return { ok: false, error };
  }
}

// src/services/tiaNotify.ts
var TiaNotifySchema = import_zod.z.object({
  walletSolana: import_zod.z.string().min(32),
  userWA: import_zod.z.string().min(10),
  amountUSDC: import_zod.z.number().positive(),
  reservationPda: import_zod.z.string().optional(),
  txSignature: import_zod.z.string().nullable().optional(),
  isVerified: import_zod.z.boolean().optional(),
  audioBase64: import_zod.z.string().optional(),
  storeName: import_zod.z.string().optional()
});
async function handleTiaNotify(input) {
  const text = buildTiaConfirmationText(
    input.amountUSDC,
    input.reservationPda,
    input.storeName
  );
  console.log(
    `[TIA] notify \u2192 ${input.userWA} | ${input.amountUSDC} USDC | verified=${input.isVerified ?? "?"}`
  );
  if (input.audioBase64) {
    console.log(
      `[TIA] audioBase64 recibido (${Math.round(input.audioBase64.length / 1024)} KB) \u2014 PTT en Sem 2`
    );
  }
  try {
    await sendWhatsAppText(input.userWA, text);
    console.log(`[TIA] WhatsApp text OK \u2192 ${input.userWA}`);
    const toolPayload = import_prova_agent_sdk2.AttestationBuilder.toolCall("whatsapp.notify", {
      reservationPda: input.reservationPda,
      amountUSDC: input.amountUSDC,
      isVerified: input.isVerified,
      txSignature: input.txSignature
    });
    const prova = await attestBuiltAction("ToolCall", toolPayload, true);
    return {
      ok: true,
      messageSent: true,
      agent: "TIA",
      whatsapp: {
        to: input.userWA,
        textSent: true,
        audioNote: input.audioBase64 ? "audio recibido; nota de voz requiere /internal/send-audio-base64 en bot" : void 0
      },
      prova: prova.ok ? { ok: true, explorerUrl: prova.explorerUrl } : { ok: false, error: prova.error }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "WhatsApp error";
    console.error("[TIA] notify error:", message);
    if (process.env.TIA_ALLOW_NOTIFY_WITHOUT_BOT === "true") {
      return {
        ok: true,
        messageSent: false,
        agent: "TIA",
        error: message
      };
    }
    return { ok: false, messageSent: false, agent: "TIA", error: message };
  }
}

// src/routes/tia.ts
var router = (0, import_express.Router)();
router.post("/notify", async (req, res) => {
  const parsed = TiaNotifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      agent: "TIA",
      error: "Payload inv\xE1lido",
      details: parsed.error.flatten()
    });
  }
  const result = await handleTiaNotify(parsed.data);
  const status = result.ok ? 200 : 502;
  return res.status(status).json(result);
});
router.post(
  "/manual-notify",
  requireOverrideSecret,
  async (req, res) => {
    const parsed = TiaNotifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        agent: "TIA",
        error: "Payload inv\xE1lido",
        details: parsed.error.flatten()
      });
    }
    console.log("[TIA] manual-notify override \u2192", parsed.data.userWA);
    const result = await handleTiaNotify({
      ...parsed.data,
      isVerified: parsed.data.isVerified ?? true
    });
    const status = result.ok ? 200 : 502;
    return res.status(status).json({ ...result, manualOverride: true });
  }
);
router.get("/health", async (_req, res) => {
  const prova = await getProvaStatus();
  res.json({
    ok: true,
    agent: "TIA",
    service: "remesa-tia-backend",
    prova
  });
});
var tia_default = router;

// src/routes/premium.ts
var import_express2 = require("express");
var import_zod2 = require("zod");

// src/services/fxRate.ts
var cache = null;
var CACHE_TTL_MS = 60 * 1e3;
var FALLBACK_USD_MXN = 18.5;
function num(value, field) {
  const n = parseFloat(value ?? "");
  if (Number.isNaN(n) || n < 0) throw new Error(`Bitso: campo '${field}' inv\xE1lido`);
  return n;
}
function fallbackTicker() {
  return {
    pair: "USD/MXN",
    rate: FALLBACK_USD_MXN,
    bid: FALLBACK_USD_MXN,
    ask: FALLBACK_USD_MXN,
    spread: 0,
    spreadPct: 0,
    volume24hUsd: 0,
    vwap24h: FALLBACK_USD_MXN,
    high24h: FALLBACK_USD_MXN,
    low24h: FALLBACK_USD_MXN,
    source: "bitso",
    isLive: false,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function getUsdMxnTicker() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.ticker;
  }
  try {
    const res = await fetch("https://api.bitso.com/v3/ticker/?book=usd_mxn", {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Bitso ticker respondi\xF3 ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.payload?.last) {
      throw new Error("Respuesta del ticker de Bitso sin campo 'last' v\xE1lido");
    }
    const p = data.payload;
    const rate = num(p.last, "last");
    if (rate <= 0) throw new Error("Tasa de Bitso inv\xE1lida");
    const bid = num(p.bid, "bid");
    const ask = num(p.ask, "ask");
    const mid = (bid + ask) / 2;
    const spread = Math.max(ask - bid, 0);
    const ticker = {
      pair: "USD/MXN",
      rate,
      bid,
      ask,
      spread: Number(spread.toFixed(4)),
      spreadPct: mid > 0 ? Number((spread / mid * 100).toFixed(4)) : 0,
      volume24hUsd: num(p.volume, "volume"),
      vwap24h: num(p.vwap, "vwap"),
      high24h: num(p.high, "high"),
      low24h: num(p.low, "low"),
      source: "bitso",
      isLive: true,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    cache = { ticker, fetchedAt: now };
    return ticker;
  } catch (err) {
    console.warn("[fx] Bitso fallback:", err);
    return fallbackTicker();
  }
}
async function getUsdMxnRate() {
  const t = await getUsdMxnTicker();
  return { rate: t.rate, isLive: t.isLive };
}

// src/services/lifiQuote.ts
var import_sdk = require("@lifi/sdk");
var USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
var USDC_BY_CHAIN = {
  ARB: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  POL: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
};
var client = null;
function getLifiClient() {
  if (!client) {
    client = (0, import_sdk.createClient)({ integrator: "remesa-liquidez-ia" });
  }
  return client;
}
async function quoteBridgeToSolana(params) {
  const fromChain = params.fromChain ?? "ARB";
  const fromToken = USDC_BY_CHAIN[fromChain];
  if (!fromToken) {
    throw new Error(
      `Cadena origen no soportada: ${fromChain}. Usa ARB, BASE o POL.`
    );
  }
  const quote = await (0, import_sdk.getQuote)(getLifiClient(), {
    fromChain,
    toChain: "SOL",
    fromToken,
    toToken: USDC_SOLANA,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
    fromAmount: params.fromAmount
  });
  const estimate = quote.estimate;
  if (!estimate) {
    throw new Error("LI.FI quote sin estimate");
  }
  const step = quote.includedSteps?.[0];
  const feeCosts = estimate.feeCosts ?? step?.estimate?.feeCosts ?? [];
  const totalFeeUsd = feeCosts.reduce((acc, f) => acc + parseFloat(f.amountUSD ?? "0"), 0).toFixed(4);
  return {
    ok: true,
    toAmount: estimate.toAmount,
    toAmountMin: estimate.toAmountMin,
    estimatedTime: estimate.executionDuration,
    tool: quote.toolDetails?.name ?? estimate.tool ?? step?.tool ?? "unknown",
    feeCostUsd: totalFeeUsd
  };
}

// src/routes/premium.ts
var router2 = (0, import_express2.Router)();
var BridgeQuoteQuery = import_zod2.z.object({
  fromAddress: import_zod2.z.string().regex(/^0x[a-fA-F0-9]{40}$/, "fromAddress debe ser una direcci\xF3n EVM (0x + 40 hex)"),
  toAddress: import_zod2.z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "toAddress debe ser una pubkey Solana base58"),
  // Unidades base USDC (6 decimales EVM): entero positivo, máx ~10M USDC.
  fromAmount: import_zod2.z.string().regex(/^[1-9]\d{0,12}$/, "fromAmount debe ser un entero positivo en unidades base USDC"),
  fromChain: import_zod2.z.enum(["ARB", "BASE", "POL"]).default("ARB")
});
router2.get("/bridge-quote", async (req, res) => {
  const parsed = BridgeQuoteQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      message: "Par\xE1metros inv\xE1lidos: fromAddress (EVM 0x\u2026), toAddress (Solana base58), fromAmount (USDC base units), fromChain (ARB|BASE|POL).",
      details: parsed.error.flatten().fieldErrors,
      example: "/premium/bridge-quote?fromAddress=0x\u2026&toAddress=<SOL_PUBKEY>&fromAmount=10000000"
    });
    return;
  }
  const { fromAddress, toAddress, fromAmount, fromChain } = parsed.data;
  try {
    const result = await quoteBridgeToSolana({
      fromAddress,
      toAddress,
      fromAmount,
      fromChain
    });
    res.json({
      ok: true,
      fromChain,
      fromAmount,
      toChain: "SOL",
      toAmount: result.toAmount,
      toAmountMin: result.toAmountMin,
      toAmountHuman: (parseInt(result.toAmount, 10) / 1e6).toFixed(2),
      estimatedSeconds: result.estimatedTime,
      bridge: result.tool,
      feeCostUsd: result.feeCostUsd,
      note: "Premium LI.FI quote \u2014 pago x402 verificado on-chain."
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /premium/bridge-quote] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router2.get("/fx", async (_req, res) => {
  try {
    const { rate, isLive } = await getUsdMxnRate();
    res.json({
      ok: true,
      pair: "USD/MXN",
      rate,
      isLive,
      source: "bitso",
      note: "Premium FX tick \u2014 pago x402 verificado on-chain."
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /premium/fx] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
var premium_default = router2;

// src/routes/v1.ts
var import_express3 = require("express");

// src/services/routeEstimator.ts
var BITSO_TAKER_FEE = 65e-4;
var USDC_ONRAMP_FEE = 1e-3;
var USDC_OFFRAMP_FEE = 5e-3;
var USDC_NETWORK_FLAT_USD = 0.01;
var SPEI_FLAT_FEE_USD = 3;
var SPEI_FX_MARGIN = 0.015;
var round2 = (n) => Number(n.toFixed(2));
var round4 = (n) => Number(n.toFixed(4));
async function estimateRoutes(amountUsd) {
  const t = await getUsdMxnTicker();
  const mid = (t.bid + t.ask) / 2;
  const option = (route, label, mxnOut, etaMinutes, assumptions) => {
    const costUsd = amountUsd - mxnOut / mid;
    return {
      route,
      label,
      mxnOut: round2(mxnOut),
      effectiveRate: round4(mxnOut / amountUsd),
      totalCostUsd: round2(costUsd),
      totalCostPct: round4(costUsd / amountUsd * 100),
      etaMinutes,
      assumptions
    };
  };
  const bitso = option(
    "bitso_directo",
    "Bitso usd_mxn spot + retiro SPEI",
    amountUsd * t.bid * (1 - BITSO_TAKER_FEE),
    15,
    [
      `taker fee ${(BITSO_TAKER_FEE * 100).toFixed(2)}% (tier base)`,
      `ejecuta contra bid ${t.bid}`,
      "retiro SPEI MXN sin costo"
    ]
  );
  const usdcNet = Math.max(amountUsd - USDC_NETWORK_FLAT_USD, 0);
  const stablecoin = option(
    "stablecoin_usdc",
    "USDC v\xEDa Stellar + off-ramp MXN",
    usdcNet * (1 - USDC_ONRAMP_FEE) * mid * (1 - USDC_OFFRAMP_FEE),
    10,
    [
      `on-ramp USD\u2192USDC ${(USDC_ONRAMP_FEE * 100).toFixed(2)}%`,
      `off-ramp USDC\u2192MXN ${(USDC_OFFRAMP_FEE * 100).toFixed(2)}% sobre mid`,
      `fees de red Stellar ~$${USDC_NETWORK_FLAT_USD.toFixed(2)}`
    ]
  );
  const speiNet = Math.max(amountUsd - SPEI_FLAT_FEE_USD, 0);
  const spei = option(
    "spei_tradicional",
    "Wire internacional \u2192 SPEI",
    speiNet * mid * (1 - SPEI_FX_MARGIN),
    240,
    [
      `fee fijo $${SPEI_FLAT_FEE_USD.toFixed(2)}`,
      `margen FX ${(SPEI_FX_MARGIN * 100).toFixed(2)}% sobre mid`,
      "acreditaci\xF3n mismo d\xEDa h\xE1bil"
    ]
  );
  const options = [bitso, stablecoin, spei];
  const best = options.reduce((a, b) => b.mxnOut > a.mxnOut ? b : a);
  return {
    apiVersion: "1",
    amountUsd,
    midRate: round4(mid),
    rateIsLive: t.isLive,
    rateSource: "bitso",
    best: best.route,
    options,
    disclaimer: "Estimaci\xF3n con supuestos publicados por opci\xF3n; no es una cotizaci\xF3n ejecutable.",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/services/alerts.ts
var import_node_crypto = require("node:crypto");
var import_promises = require("node:dns/promises");
var import_node_net = require("node:net");
var MAX_ALERTS = 100;
var WEBHOOK_TIMEOUT_MS = 5e3;
var REDIS_KEY = "tia:fx-alerts";
function ttlHours() {
  const n = Number(process.env.ALERTS_TTL_HOURS);
  return Number.isFinite(n) && n >= 0 ? n : 48;
}
function maxRetries() {
  const n = Number(process.env.ALERTS_MAX_RETRIES);
  return Number.isFinite(n) && n >= 1 ? n : 3;
}
function maxPerClient() {
  const n = Number(process.env.ALERTS_MAX_PER_CLIENT);
  return Number.isFinite(n) && n >= 1 ? n : 5;
}
function isBlockedIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}
function isBlockedIPv6(ip) {
  const h = ip.toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (/^fe[89ab]/.test(h)) return true;
  if (/^f[cd]/.test(h)) return true;
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  if (h.startsWith("::ffff:")) return true;
  return false;
}
function isBlockedIp(ip) {
  const kind = (0, import_node_net.isIP)(ip);
  if (kind === 4) return isBlockedIPv4(ip);
  if (kind === 6) return isBlockedIPv6(ip);
  return true;
}
var RAW_LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/?#]|$)/i;
async function checkWebhookTarget(raw, opts) {
  const allowLoopback = opts?.allowLoopback ?? process.env.NODE_ENV !== "production";
  if (typeof raw !== "string" || !raw.trim() || raw.length > 500) {
    return { ok: false, error: "webhookUrl requerida (m\xE1x 500 chars)" };
  }
  const trimmed = raw.trim();
  if (allowLoopback && RAW_LOOPBACK.test(trimmed)) {
    try {
      return { ok: true, url: new URL(trimmed).toString() };
    } catch {
      return { ok: false, error: "webhookUrl inv\xE1lida" };
    }
  }
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "webhookUrl inv\xE1lida" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "webhookUrl debe ser https://" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "webhookUrl no admite credenciales embebidas" };
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if ((0, import_node_net.isIP)(hostname)) {
    if (isBlockedIp(hostname)) {
      return { ok: false, error: "webhookUrl no puede apuntar a IPs privadas/reservadas" };
    }
    return { ok: true, url: url.toString() };
  }
  try {
    const addrs = await (0, import_promises.lookup)(hostname, { all: true });
    if (addrs.length === 0) {
      return { ok: false, error: "webhookUrl no resuelve" };
    }
    for (const { address } of addrs) {
      if (isBlockedIp(address)) {
        return { ok: false, error: "webhookUrl resuelve a una IP privada/reservada" };
      }
    }
  } catch {
    return { ok: false, error: "webhookUrl no resuelve" };
  }
  return { ok: true, url: url.toString() };
}
async function validateAlertInput(body, client2) {
  const b = body ?? {};
  const threshold = Number(b.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1e3) {
    return { ok: false, error: "threshold debe ser un n\xFAmero entre 0 y 1000 (MXN por USD)" };
  }
  const direction = b.direction;
  if (direction !== "above" && direction !== "below") {
    return { ok: false, error: 'direction debe ser "above" o "below"' };
  }
  const target = await checkWebhookTarget(
    typeof b.webhookUrl === "string" ? b.webhookUrl : ""
  );
  if (!target.ok || !target.url) {
    return { ok: false, error: target.error ?? "webhookUrl inv\xE1lida" };
  }
  const now = Date.now();
  return {
    ok: true,
    alert: {
      id: (0, import_node_crypto.randomUUID)(),
      pair: "USD/MXN",
      direction,
      threshold,
      webhookUrl: target.url,
      client: client2,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlHours() * 36e5).toISOString(),
      failures: 0
    }
  };
}
function upstashStore(url, token) {
  async function cmd(command) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command)
    });
    if (!res.ok) throw new Error(`Upstash respondi\xF3 ${res.status}`);
    const data = await res.json();
    return data.result;
  }
  return {
    kind: "upstash",
    async put(alert) {
      await cmd(["HSET", REDIS_KEY, alert.id, JSON.stringify(alert)]);
    },
    async list() {
      const flat = await cmd(["HGETALL", REDIS_KEY]);
      const alerts = [];
      for (let i = 1; i < flat.length; i += 2) {
        try {
          alerts.push(JSON.parse(flat[i]));
        } catch {
        }
      }
      return alerts;
    },
    async remove(id) {
      await cmd(["HDEL", REDIS_KEY, id]);
    },
    async count() {
      return cmd(["HLEN", REDIS_KEY]);
    }
  };
}
function memoryStore() {
  const map = /* @__PURE__ */ new Map();
  return {
    kind: "memory",
    async put(alert) {
      map.set(alert.id, alert);
    },
    async list() {
      return [...map.values()];
    },
    async remove(id) {
      map.delete(id);
    },
    async count() {
      return map.size;
    }
  };
}
var store = null;
function getAlertStore() {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    store = upstashStore(url, token);
  } else {
    console.warn(
      "[TIA] alerts: sin UPSTASH_REDIS_REST_URL/TOKEN \u2014 store en memoria (ef\xEDmero; en Vercel las alertas NO sobreviven entre invocaciones)"
    );
    store = memoryStore();
  }
  return store;
}
async function registerAlert(body, client2) {
  const parsed = await validateAlertInput(body, client2 || "unknown");
  if (!parsed.ok) {
    return { status: 400, payload: { ok: false, error: parsed.error } };
  }
  const s = getAlertStore();
  if (await s.count() >= MAX_ALERTS) {
    return { status: 429, payload: { ok: false, error: `l\xEDmite global de ${MAX_ALERTS} alertas activas` } };
  }
  const mine = (await s.list()).filter((a) => a.client === parsed.alert.client);
  if (mine.length >= maxPerClient()) {
    return {
      status: 429,
      payload: { ok: false, error: `l\xEDmite de ${maxPerClient()} alertas activas por cliente` }
    };
  }
  await s.put(parsed.alert);
  const { id, pair, direction, threshold, webhookUrl, createdAt, expiresAt } = parsed.alert;
  return {
    status: 201,
    payload: {
      ok: true,
      apiVersion: "1",
      alertId: id,
      status: "active",
      pair,
      direction,
      threshold,
      webhookUrl,
      createdAt,
      expiresAt,
      maxRetries: maxRetries(),
      store: s.kind,
      note: "One-shot: dispara una vez al cruzar el umbral y se elimina. Expira sin disparar tras el TTL. El disparo lo ejecuta POST /v1/alert/check (cron \u2014 ver SPEC.md)."
    }
  };
}
async function checkAndFireAlerts() {
  const s = getAlertStore();
  const base = {
    ok: true,
    rate: null,
    rateIsLive: false,
    checked: 0,
    fired: 0,
    expired: 0,
    webhookErrors: 0,
    dropped: 0,
    store: s.kind
  };
  const t = await getUsdMxnTicker();
  if (!t.isLive) {
    return { ...base, skipped: "fx_not_live" };
  }
  const alerts = await s.list();
  const result = { ...base, rate: t.rate, rateIsLive: true, checked: alerts.length };
  const now = Date.now();
  for (const alert of alerts) {
    if (now >= Date.parse(alert.expiresAt)) {
      await s.remove(alert.id);
      result.expired++;
      continue;
    }
    const crossed = alert.direction === "above" ? t.rate >= alert.threshold : t.rate <= alert.threshold;
    if (!crossed) continue;
    const target = await checkWebhookTarget(alert.webhookUrl);
    if (!target.ok) {
      console.warn(`[TIA] alert ${alert.id} destino bloqueado al disparar: ${target.error}`);
      await s.remove(alert.id);
      result.dropped++;
      continue;
    }
    try {
      const res = await fetch(alert.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fx-alert",
          alertId: alert.id,
          pair: alert.pair,
          direction: alert.direction,
          threshold: alert.threshold,
          rate: t.rate,
          source: t.source,
          firedAt: (/* @__PURE__ */ new Date()).toISOString()
        }),
        redirect: "manual",
        // jamás seguir redirects: 3xx cuenta como fallo
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS)
      });
      await res.body?.cancel().catch(() => void 0);
      if (!res.ok) throw new Error(`webhook respondi\xF3 ${res.status}`);
      await s.remove(alert.id);
      result.fired++;
    } catch (err) {
      result.webhookErrors++;
      alert.failures += 1;
      if (alert.failures >= maxRetries()) {
        console.warn(`[TIA] alert ${alert.id} eliminada tras ${alert.failures} fallos:`, err);
        await s.remove(alert.id);
        result.dropped++;
      } else {
        await s.put(alert);
        console.warn(
          `[TIA] alert ${alert.id} webhook fall\xF3 (${alert.failures}/${maxRetries()}):`,
          err
        );
      }
    }
  }
  return result;
}

// src/routes/v1.ts
var router3 = (0, import_express3.Router)();
router3.get("/quote", async (_req, res) => {
  try {
    const t = await getUsdMxnTicker();
    res.json({
      ok: true,
      apiVersion: "1",
      pair: t.pair,
      rate: t.rate,
      bid: t.bid,
      ask: t.ask,
      spread: t.spread,
      spreadPct: t.spreadPct,
      volume24hUsd: t.volume24hUsd,
      vwap24h: t.vwap24h,
      high24h: t.high24h,
      low24h: t.low24h,
      source: t.source,
      isLive: t.isLive,
      generatedAt: t.fetchedAt
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /v1/quote] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router3.get("/route", async (req, res) => {
  const amount = Number(req.query.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 5e4) {
    res.status(400).json({
      ok: false,
      error: "amount requerido en USD, entre 1 y 50000",
      example: "/v1/route?amount=100"
    });
    return;
  }
  try {
    const estimate = await estimateRoutes(amount);
    res.json({ ok: true, ...estimate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /v1/route] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router3.post("/alert", async (req, res) => {
  try {
    const { status, payload } = await registerAlert(req.body, req.ip ?? "unknown");
    res.status(status).json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /v1/alert] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
router3.post("/alert/check", requireCronSecret, async (_req, res) => {
  try {
    const result = await checkAndFireAlerts();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /v1/alert/check] error:", err);
    res.status(500).json({ ok: false, message });
  }
});
var v1_default = router3;

// src/middleware/publicOrigin.ts
function publicOrigin() {
  const raw = process.env.PUBLIC_BASE_URL?.trim();
  let origin = null;
  if (raw) {
    try {
      origin = new URL(raw);
    } catch {
      console.warn(
        `[TIA] PUBLIC_BASE_URL inv\xE1lida ("${raw}") \u2014 fallback a X-Forwarded-Proto`
      );
    }
  }
  return (req, _res, next) => {
    if (origin) {
      Object.defineProperty(req, "protocol", {
        value: origin.protocol.replace(/:$/, ""),
        configurable: true
      });
      req.headers.host = origin.host;
    }
    next();
  };
}

// src/services/kvStore.ts
function hasDurableKv() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}
function upstashBackend(url, token) {
  const base = url.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  async function pipeline(commands) {
    const res = await fetch(`${base}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3e3)
    });
    if (!res.ok) throw new Error(`Upstash pipeline respondi\xF3 ${res.status}`);
    const data = await res.json();
    return data.map((d) => d.result);
  }
  return {
    kind: "upstash",
    async claimOnce(key, ttlMs) {
      const [result] = await pipeline([
        ["SET", key, "1", "NX", "PX", ttlMs]
      ]);
      return result === "OK";
    },
    async del(key) {
      await pipeline([["DEL", key]]);
    },
    async slidingWindowHit(key, windowMs, member) {
      const now = Date.now();
      const [, , count] = await pipeline([
        ["ZREMRANGEBYSCORE", key, 0, now - windowMs],
        ["ZADD", key, now, member],
        ["ZCARD", key],
        ["PEXPIRE", key, windowMs]
      ]);
      return count;
    }
  };
}
function memoryBackend() {
  const claims = /* @__PURE__ */ new Map();
  const windows = /* @__PURE__ */ new Map();
  function gc(now) {
    if (claims.size > 1e4) {
      for (const [k, exp] of claims) if (exp <= now) claims.delete(k);
    }
    if (windows.size > 1e4) {
      for (const [k, hits] of windows) {
        if (hits.length === 0 || hits[hits.length - 1] < now - 3e5) {
          windows.delete(k);
        }
      }
    }
  }
  return {
    kind: "memory",
    async claimOnce(key, ttlMs) {
      const now = Date.now();
      gc(now);
      const existing = claims.get(key);
      if (existing !== void 0 && existing > now) return false;
      claims.set(key, now + ttlMs);
      return true;
    },
    async del(key) {
      claims.delete(key);
    },
    async slidingWindowHit(key, windowMs, _member) {
      const now = Date.now();
      gc(now);
      const hits = (windows.get(key) ?? []).filter((t) => t > now - windowMs);
      hits.push(now);
      windows.set(key, hits);
      return hits.length;
    }
  };
}
var backend = null;
function getKvBackend() {
  if (backend) return backend;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    backend = upstashBackend(url, token);
  } else {
    console.warn(
      "[TIA] kvStore: sin UPSTASH_REDIS_REST_URL/TOKEN \u2014 rate limit y replay guard en memoria POR INSTANCIA (en Vercel cada invocaci\xF3n puede ser una instancia distinta; configura Upstash para que los l\xEDmites sean durables)"
    );
    backend = memoryBackend();
  }
  return backend;
}

// src/middleware/rateLimit.ts
function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
function rateLimit(opts) {
  return async (req, res, next) => {
    const ip = req.ip ?? "unknown";
    const key = `tia:rl:${opts.keyPrefix}:${ip}`;
    let count;
    try {
      const kv = getKvBackend();
      count = await kv.slidingWindowHit(
        key,
        opts.windowMs,
        `${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
      );
    } catch (err) {
      console.warn(
        `[TIA] rateLimit(${opts.keyPrefix}): store fall\xF3 \u2014 request pasa sin contar:`,
        err instanceof Error ? err.message : err
      );
      next();
      return;
    }
    if (count > opts.max) {
      res.setHeader("Retry-After", Math.ceil(opts.windowMs / 1e3));
      res.status(429).json({
        ok: false,
        error: "rate_limited",
        message: `M\xE1ximo ${opts.max} requests por ${Math.ceil(opts.windowMs / 1e3)}s por cliente. Reintenta m\xE1s tarde.`
      });
      return;
    }
    next();
  };
}

// src/middleware/paymentGuard.ts
var import_node_crypto2 = require("node:crypto");
var MAX_PAYMENT_HEADER_BYTES = 8 * 1024;
function getEffectivePaymentHeader(req) {
  const v2 = req.headers["payment-signature"];
  if (typeof v2 === "string" && v2.length > 0) {
    return { header: "payment-signature", value: v2 };
  }
  const v1 = req.headers["x-payment"];
  if (typeof v1 === "string" && v1.length > 0) {
    return { header: "x-payment", value: v1 };
  }
  return null;
}
function paymentHeaderLimits() {
  return (req, res, next) => {
    const v2 = req.headers["payment-signature"];
    const v1 = req.headers["x-payment"];
    if (Array.isArray(v2)) {
      res.status(400).json({
        ok: false,
        error: "invalid_payment_header",
        message: "Se recibi\xF3 m\xE1s de un header payment-signature."
      });
      return;
    }
    if (Array.isArray(v1)) {
      res.status(400).json({
        ok: false,
        error: "invalid_payment_header",
        message: "Se recibi\xF3 m\xE1s de un header x-payment."
      });
      return;
    }
    const hasV2 = typeof v2 === "string" && v2.length > 0;
    const hasV1 = typeof v1 === "string" && v1.length > 0;
    if (hasV2 && hasV1 && v2 !== v1) {
      res.status(400).json({
        ok: false,
        error: "conflicting_payment_headers",
        message: "Se recibieron payment-signature y x-payment con valores diferentes. Env\xEDa solo uno."
      });
      return;
    }
    const effective = getEffectivePaymentHeader(req);
    if (effective && Buffer.byteLength(effective.value, "utf8") > MAX_PAYMENT_HEADER_BYTES) {
      res.status(400).json({
        ok: false,
        error: "payment_header_too_large",
        message: `El header de pago supera el m\xE1ximo de ${MAX_PAYMENT_HEADER_BYTES} bytes.`
      });
      return;
    }
    next();
  };
}
function replayStrict() {
  const override = process.env.X402_REPLAY_STRICT;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}
function paymentReplayGuard() {
  return async (req, res, next) => {
    const effective = getEffectivePaymentHeader(req);
    if (!effective) {
      next();
      return;
    }
    const strict = replayStrict();
    const kv = getKvBackend();
    if (strict && kv.kind !== "upstash") {
      console.error(
        "[TIA] paymentReplayGuard: producci\xF3n sin store durable \u2014 request pagado rechazado (configura UPSTASH_REDIS_REST_URL/TOKEN)"
      );
      res.status(503).json({
        ok: false,
        error: "replay_protection_unavailable",
        message: "El servidor no puede garantizar protecci\xF3n anti-replay ahora mismo. Reintenta m\xE1s tarde."
      });
      return;
    }
    const digest = (0, import_node_crypto2.createHash)("sha256").update(effective.value).update("\n").update(`${req.method} ${req.originalUrl}`).digest("hex");
    const key = `tia:xpay:${digest}`;
    const ttlMs = envInt("X402_REPLAY_TTL_SECONDS", 900) * 1e3;
    let first;
    try {
      first = await kv.claimOnce(key, ttlMs);
    } catch (err) {
      console.warn(
        "[TIA] paymentReplayGuard: store fall\xF3:",
        err instanceof Error ? err.message : err
      );
      if (strict) {
        res.status(503).json({
          ok: false,
          error: "replay_protection_unavailable",
          message: "El servidor no puede garantizar protecci\xF3n anti-replay ahora mismo. Reintenta m\xE1s tarde."
        });
        return;
      }
      next();
      return;
    }
    if (!first) {
      console.warn(
        `[TIA] prueba de pago reusada bloqueada (header=${effective.header}, sha256=${digest.slice(0, 16)}\u2026)`
      );
      res.status(409).json({
        ok: false,
        error: "payment_replayed",
        message: "Esta prueba de pago ya fue usada. Cada request requiere un pago firmado nuevo."
      });
      return;
    }
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        kv.del(key).catch(
          (err) => console.warn(
            "[TIA] paymentReplayGuard: no se pudo liberar la claim:",
            err instanceof Error ? err.message : err
          )
        );
      }
    });
    next();
  };
}

// src/services/x402Config.ts
function stellarNetworkId() {
  return process.env.STELLAR_NETWORK === "mainnet" || process.env.STELLAR_NETWORK === "pubnet" ? "stellar:pubnet" : "stellar:testnet";
}
function getX402Prices() {
  return {
    bridgeQuote: process.env.NIRIUM_X402_BRIDGE_PRICE ?? "0.25",
    fx: process.env.NIRIUM_X402_FX_PRICE ?? "0.10",
    quote: process.env.NIRIUM_X402_QUOTE_PRICE ?? "0.10",
    route: process.env.NIRIUM_X402_ROUTE_PRICE ?? "0.25",
    alert: process.env.NIRIUM_X402_ALERT_PRICE ?? "0.10"
  };
}
function isX402Enabled() {
  return process.env.NIRIUM_X402_ENABLED === "true";
}
function getX402Status() {
  const prices = getX402Prices();
  const network = stellarNetworkId();
  const payTo = process.env.STELLAR_PAY_TO?.trim() || null;
  return {
    enabled: isX402Enabled(),
    network,
    payTo,
    routes: {
      "GET /premium/bridge-quote": `$${prices.bridgeQuote}`,
      "GET /premium/fx": `$${prices.fx}`,
      "GET /v1/quote": `$${prices.quote}`,
      "GET /v1/route": `$${prices.route}`,
      "POST /v1/alert": `$${prices.alert}`
    }
  };
}
function getX402ServeBase() {
  const payTo = process.env.STELLAR_PAY_TO?.trim();
  const facilitatorApiKey = process.env.X402_FACILITATOR_API_KEY?.trim();
  const network = stellarNetworkId();
  if (!payTo || !facilitatorApiKey) {
    throw new Error(
      "NIRIUM x402 requires STELLAR_PAY_TO and X402_FACILITATOR_API_KEY"
    );
  }
  if (network === "stellar:pubnet") {
    console.log(
      "[TIA] x402 pubnet: STELLAR_PAY_TO must be mainnet G\u2026 with USDC trustline; facilitator from channels.openzeppelin.com/gen"
    );
  }
  const facilitatorUrl = process.env.X402_FACILITATOR_URL?.trim();
  return {
    payTo,
    facilitatorApiKey,
    ...facilitatorUrl ? { facilitatorUrl } : {},
    network,
    appName: "TIA Premium API"
  };
}
function getX402ServeConfig() {
  const prices = getX402Prices();
  return {
    ...getX402ServeBase(),
    routes: {
      "GET /bridge-quote": {
        price: `$${prices.bridgeQuote}`,
        description: "LI.FI cross-chain USDC quote (EVM \u2192 Solana)"
      },
      "GET /fx": {
        price: `$${prices.fx}`,
        description: "USD/MXN live rate (Bitso ticker)"
      }
    }
  };
}
function getX402V1ServeConfig() {
  const prices = getX402Prices();
  return {
    ...getX402ServeBase(),
    routes: {
      "GET /quote": {
        price: `$${prices.quote}`,
        description: "USD/MXN + spread + volumen 24h (Bitso)"
      },
      "GET /route": {
        price: `$${prices.route}`,
        description: "Mejor ruta USD\u2192MXN: Bitso / stablecoin / SPEI"
      },
      "POST /alert": {
        price: `$${prices.alert}`,
        description: "Alerta de umbral USD/MXN con webhook"
      }
    }
  };
}

// src/app.ts
function resolveX402Serve() {
  const bag = niriumNs;
  const nested = bag.default && typeof bag.default === "object" ? bag.default : void 0;
  const fn = [bag.x402Serve, nested?.x402Serve].find(
    (candidate) => typeof candidate === "function"
  );
  if (typeof fn !== "function") {
    throw new Error("nirium x402Serve export not found");
  }
  return fn;
}
function createApp() {
  const app = (0, import_express4.default)();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-PAYMENT, Payment-Signature"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.options("*", (_req, res) => res.sendStatus(204));
  const rlWindowMs = envInt("RATE_LIMIT_WINDOW_SECONDS", 60) * 1e3;
  app.use(
    ["/premium", "/v1"],
    rateLimit({
      max: envInt("RATE_LIMIT_MAX", 30),
      windowMs: rlWindowMs,
      keyPrefix: "paid"
    })
  );
  app.use(
    ["/api/tia", "/api/lidia"],
    rateLimit({
      max: envInt("RATE_LIMIT_NOTIFY_MAX", 60),
      windowMs: rlWindowMs,
      keyPrefix: "notify"
    })
  );
  app.use(["/api/tia", "/api/lidia"], import_express4.default.json({ limit: "12mb" }));
  app.use(import_express4.default.json({ limit: "100kb" }));
  app.get("/health", async (_req, res) => {
    const prova = await getProvaStatus();
    const x402 = getX402Status();
    res.json({
      ok: true,
      agent: "TIA",
      service: "remesa-tia-backend",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      prova,
      x402
    });
  });
  const premiumEndpoints = isX402Enabled() ? `<li><code>GET /premium/bridge-quote</code> (x402)</li>
<li><code>GET /premium/fx</code> (x402)</li>
<li><code>GET /v1/quote</code> (x402)</li>
<li><code>GET /v1/route?amount=USD</code> (x402)</li>
<li><code>POST /v1/alert</code> (x402)</li>
<li><code>POST /v1/alert/check</code> (Bearer cron)</li>` : "";
  app.get("/", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>holatia.app \u2014 TIA Backend</title></head>
<body style="font-family:system-ui;background:#0b0d12;color:#e7e9ee;padding:2rem">
<h1>Remesa <span style="color:#5eebc4">TIA</span> Backend</h1>
<p>Agente de notificaciones \u2014 <a href="https://holatia.app" style="color:#5eebc4">holatia.app</a></p>
<ul>
<li><code>GET /health</code></li>
<li><code>POST /api/tia/notify</code></li>
<li><code>POST /api/tia/manual-notify</code> (override, Bearer secret)</li>
<li><code>POST /api/lidia/notify</code> (alias legacy)</li>
${premiumEndpoints}
</ul>
</body></html>`);
  });
  if (isX402Enabled()) {
    try {
      const x402Serve = resolveX402Serve();
      const x402Config = getX402ServeConfig();
      if (!hasDurableKv() && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
        console.error(
          "[TIA] x402 SIN store durable: el replay guard rechazar\xE1 requests pagados (503) hasta configurar UPSTASH_REDIS_REST_URL/TOKEN"
        );
      }
      app.use(["/premium", "/v1"], paymentHeaderLimits(), paymentReplayGuard());
      app.use("/premium", publicOrigin(), x402Serve(x402Config));
      app.use("/premium", premium_default);
      const v1Config = getX402V1ServeConfig();
      app.use("/v1", publicOrigin(), x402Serve(v1Config));
      app.use("/v1", v1_default);
      console.log(
        `[TIA] x402 premium API enabled (${x402Config.network}) \u2192 ${[
          ...Object.keys(x402Config.routes).map((r) => `/premium ${r}`),
          ...Object.keys(v1Config.routes).map((r) => `/v1 ${r}`)
        ].join(", ")}`
      );
    } catch (err) {
      console.error("[TIA] x402 setup failed:", err);
    }
  }
  app.use("/api/tia", tia_default);
  app.use("/api/lidia", tia_default);
  app.use(
    (err, _req, res, _next) => {
      console.error("[TIA] unhandled:", err.stack ?? err.message ?? String(err));
      const status = typeof err.status === "number" && err.status >= 400 && err.status < 500 ? err.status : 500;
      res.status(status).json({
        ok: false,
        agent: "TIA",
        error: status === 500 ? "Internal error" : err.message
      });
    }
  );
  return app;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createApp
});
