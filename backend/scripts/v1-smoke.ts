/**
 * Smoke local del stack de valor v1 (sin pagos reales):
 *   - 402 sin pago en /v1/* y /premium/fx (no-regresión) contra un facilitador
 *     mock — mismo wiring de producción vía X402_FACILITATOR_URL.
 *   - Shape del JSON de los handlers pagados (router montado sin x402).
 *   - Ciclo de alertas: registro → check dispara webhook local → one-shot.
 *
 * Uso: npm run smoke:v1   (desde backend/)
 */
import express from "express";
import type { AddressInfo } from "node:net";

// Env ANTES de importar la app (x402Config/alerts leen process.env).
process.env.NIRIUM_X402_ENABLED = "true";
process.env.STELLAR_NETWORK = "pubnet";
process.env.STELLAR_PAY_TO =
  "GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS";
process.env.X402_FACILITATOR_API_KEY = "test-key-123";
process.env.PUBLIC_BASE_URL = "https://remesa-tia-backend.vercel.app";
process.env.CRON_SECRET = "smoke-cron-secret";
delete process.env.UPSTASH_REDIS_REST_URL; // fuerza store en memoria
delete process.env.UPSTASH_REDIS_REST_TOKEN;

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

function listen(app: express.Express): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const srv = app.listen(0, () => {
      resolve({ port: (srv.address() as AddressInfo).port, close: () => srv.close() });
    });
  });
}

function decodePaymentRequired(res: Response): {
  resourceUrl?: string;
  network?: string;
  amount?: string;
} {
  const header = res.headers.get("payment-required");
  if (!header) return {};
  const d = JSON.parse(Buffer.from(header, "base64").toString()) as {
    resource?: { url?: string };
    accepts?: Array<{ network?: string; amount?: string }>;
  };
  return {
    resourceUrl: d.resource?.url,
    network: d.accepts?.[0]?.network,
    amount: d.accepts?.[0]?.amount,
  };
}

async function main() {
  // ── Mock facilitator (exact/pubnet, exige Bearer) ─────────────────────────
  const mock = express();
  mock.get("/supported", (req, res) => {
    if (req.headers.authorization !== "Bearer test-key-123") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({
      kinds: [{ x402Version: 2, scheme: "exact", network: "stellar:pubnet" }],
    });
  });
  const mockSrv = await listen(mock);
  process.env.X402_FACILITATOR_URL = `http://127.0.0.1:${mockSrv.port}`;

  // ── Receptor de webhooks local ────────────────────────────────────────────
  const received: unknown[] = [];
  const hook = express();
  hook.use(express.json());
  hook.post("/hook", (req, res) => {
    received.push(req.body);
    res.json({ ok: true });
  });
  const hookSrv = await listen(hook);

  // ── App real (mismo createApp de producción) ──────────────────────────────
  const { createApp } = await import("../src/app.js");
  const appSrv = await listen(createApp());
  const base = `http://127.0.0.1:${appSrv.port}`;

  // 1) 402 sin pago + payment-required correcto
  const q = await fetch(`${base}/v1/quote`);
  const qd = decodePaymentRequired(q);
  check("GET /v1/quote sin pago → 402", q.status === 402, `HTTP ${q.status}`);
  check(
    "quote resource.url https + host canónico",
    qd.resourceUrl?.startsWith("https://remesa-tia-backend.vercel.app/v1/quote") === true,
    qd.resourceUrl ?? "sin header"
  );
  check("quote network stellar:pubnet", qd.network === "stellar:pubnet");
  check("quote amount $0.10 (1000000 base 7)", qd.amount === "1000000", qd.amount);

  const r402 = await fetch(`${base}/v1/route?amount=100`);
  check("GET /v1/route sin pago → 402", r402.status === 402, `HTTP ${r402.status}`);
  const a402 = await fetch(`${base}/v1/alert`, { method: "POST" });
  check("POST /v1/alert sin pago → 402", a402.status === 402, `HTTP ${a402.status}`);

  // 2) No-regresión /premium/fx
  const fx = await fetch(`${base}/premium/fx`);
  check("GET /premium/fx sigue → 402", fx.status === 402, `HTTP ${fx.status}`);

  // 3) /health lista las rutas nuevas con precio
  const health = (await (await fetch(`${base}/health`)).json()) as {
    x402: { routes: Record<string, string> };
  };
  for (const [route, price] of [
    ["GET /v1/quote", "$0.10"],
    ["GET /v1/route", "$0.25"],
    ["POST /v1/alert", "$0.10"],
    ["GET /premium/fx", "$0.10"],
  ] as const) {
    check(`/health lista ${route} ${price}`, health.x402.routes[route] === price);
  }

  // 4) Shape de handlers pagados (router sin x402 delante)
  const { default: v1Router } = await import("../src/routes/v1.js");
  const bare = express();
  bare.use(express.json());
  bare.use("/v1", v1Router);
  const bareSrv = await listen(bare);
  const bareBase = `http://127.0.0.1:${bareSrv.port}`;

  const quote = (await (await fetch(`${bareBase}/v1/quote`)).json()) as Record<string, unknown>;
  const quoteKeys = ["pair", "rate", "bid", "ask", "spread", "spreadPct", "volume24hUsd", "isLive"];
  check(
    "shape /v1/quote",
    quote.ok === true && quote.apiVersion === "1" && quoteKeys.every((k) => k in quote),
    `isLive=${quote.isLive} rate=${quote.rate}`
  );

  const route = (await (await fetch(`${bareBase}/v1/route?amount=100`)).json()) as {
    ok: boolean;
    options?: Array<Record<string, unknown>>;
    best?: string;
  };
  const optKeys = ["route", "mxnOut", "effectiveRate", "totalCostUsd", "etaMinutes", "assumptions"];
  check(
    "shape /v1/route (3 opciones + best + assumptions)",
    route.ok &&
      route.options?.length === 3 &&
      typeof route.best === "string" &&
      route.options.every((o) => optKeys.every((k) => k in o)),
    `best=${route.best}`
  );
  const badRoute = await fetch(`${bareBase}/v1/route`);
  check("/v1/route sin amount → 400", badRoute.status === 400);

  // 5) Ciclo de alertas: registro → check → webhook → one-shot
  const reg = await fetch(`${bareBase}/v1/alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      webhookUrl: `http://127.0.0.1:${hookSrv.port}/hook`,
      threshold: 999, // below 999 siempre cruza con tasa real (~18)
      direction: "below",
    }),
  });
  const regBody = (await reg.json()) as { alertId?: string };
  check("registro alerta → 201 + alertId", reg.status === 201 && !!regBody.alertId);

  const badReg = await fetch(`${bareBase}/v1/alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threshold: -1, direction: "sideways" }),
  });
  check("registro inválido → 400", badReg.status === 400);

  const noAuth = await fetch(`${bareBase}/v1/alert/check`, { method: "POST" });
  check("check sin Bearer → 401", noAuth.status === 401, `HTTP ${noAuth.status}`);

  const doCheck = () =>
    fetch(`${bareBase}/v1/alert/check`, {
      method: "POST",
      headers: { Authorization: "Bearer smoke-cron-secret" },
    }).then((r) => r.json() as Promise<{ fired: number; skipped?: string; rateIsLive: boolean }>);

  const c1 = await doCheck();
  if (c1.skipped === "fx_not_live") {
    console.log("⚠ Bitso no accesible — disparo omitido (fail-safe correcto)");
    check("check fail-safe sin tasa viva", c1.fired === 0);
  } else {
    check("check dispara alerta", c1.fired === 1, `fired=${c1.fired}`);
    await new Promise((r) => setTimeout(r, 200));
    const hit = received[0] as Record<string, unknown> | undefined;
    check(
      "webhook recibido con shape",
      !!hit && hit.type === "fx-alert" && hit.alertId === regBody.alertId && "rate" in hit
    );
    const c2 = await doCheck();
    check("one-shot: segundo check no re-dispara", c2.fired === 0, `fired=${c2.fired}`);
  }

  mockSrv.close();
  hookSrv.close();
  appSrv.close();
  bareSrv.close();

  console.log(failures === 0 ? "\nRESULT: PASS" : `\nRESULT: FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[v1-smoke] error:", err);
  process.exit(1);
});
