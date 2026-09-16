/**
 * Smoke local del stack de valor v1 (sin pagos reales):
 *   - 402 sin pago en /v1/* y /premium/fx (no-regresión) contra un facilitador
 *     mock — mismo wiring de producción vía X402_FACILITATOR_URL.
 *   - Shape del JSON de los handlers pagados (router montado sin x402).
 *   - Ciclo de alertas: registro → check dispara webhook local → one-shot.
 *   - SSRF: bloqueo de IP decimal/metadata/privadas, reglas prod (https-only,
 *     loopback), redirects nunca seguidos.
 *   - Egress: max retries → drop, TTL → expiry, cuota por cliente → 429.
 *   - Blindaje: X-PAYMENT reusado → 409, header gigante → 400, rate limit
 *     sliding-window → 429 con Retry-After.
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

  // 2b) Guardas del X-PAYMENT (antes del middleware x402)
  const fakePayment = Buffer.from(JSON.stringify({ smoke: "payload" })).toString("base64");
  const first = await fetch(`${base}/v1/quote`, { headers: { "X-PAYMENT": fakePayment } });
  check(
    "X-PAYMENT nuevo NO es 409 (pasa al x402 middleware)",
    first.status !== 409,
    `HTTP ${first.status}`
  );
  const replayed = await fetch(`${base}/v1/quote`, { headers: { "X-PAYMENT": fakePayment } });
  const replayedBody = (await replayed.json()) as { error?: string };
  check(
    "X-PAYMENT reusado → 409 payment_replayed",
    replayed.status === 409 && replayedBody.error === "payment_replayed",
    `HTTP ${replayed.status}`
  );
  const huge = await fetch(`${base}/v1/quote`, {
    headers: { "X-PAYMENT": "A".repeat(9 * 1024) },
  });
  check("X-PAYMENT > 8KB → 400", huge.status === 400, `HTTP ${huge.status}`);

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
    }).then(
      (r) =>
        r.json() as Promise<{
          fired: number;
          expired: number;
          dropped: number;
          webhookErrors: number;
          checked: number;
          skipped?: string;
        }>
    );

  const c1 = await doCheck();
  let fxLive = true;
  if (c1.skipped === "fx_not_live") {
    fxLive = false;
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

  // 6) SSRF: registros bloqueados (la exención dev es SOLO loopback literal)
  const ssrfCases: Array<[string, string]> = [
    ["IP decimal 2130706433", "https://2130706433/hook"],
    ["IP hex 0x7f000001", "https://0x7f000001/hook"],
    ["metadata 169.254.169.254", "https://169.254.169.254/hook"],
    ["privada 10.0.0.8", "https://10.0.0.8/hook"],
    ["credenciales embebidas", "https://user:pass@example.com/hook"],
  ];
  for (const [name, url] of ssrfCases) {
    const r = await fetch(`${bareBase}/v1/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl: url, threshold: 999, direction: "below" }),
    });
    check(`SSRF bloqueado: ${name} → 400`, r.status === 400, `HTTP ${r.status}`);
  }

  // Reglas de producción (sin exención loopback) directas al validador
  const { checkWebhookTarget } = await import("../src/services/alerts.js");
  const prodHttp = await checkWebhookTarget("http://example.com/hook", { allowLoopback: false });
  check("prod: http:// rechazado", !prodHttp.ok, prodHttp.error);
  const prodLocal = await checkWebhookTarget("https://localhost/hook", { allowLoopback: false });
  check("prod: localhost rechazado (DNS→loopback)", !prodLocal.ok, prodLocal.error);
  const prodOk = await checkWebhookTarget("https://api.bitso.com/hook", { allowLoopback: false });
  check("prod: host público https aceptado", prodOk.ok === true, prodOk.error);

  if (fxLive) {
    // 7) Redirects nunca seguidos + max retries → drop
    let redirectHits = 0;
    hook.post("/redirect", (_req, res) => {
      redirectHits++;
      res.redirect(302, `http://127.0.0.1:${hookSrv.port}/hook`);
    });
    const regRedirect = await fetch(`${bareBase}/v1/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: `http://127.0.0.1:${hookSrv.port}/redirect`,
        threshold: 999,
        direction: "below",
      }),
    });
    check("registro webhook redirector → 201", regRedirect.status === 201);

    const hooksBefore = received.length;
    const r1 = await doCheck();
    check(
      "redirect 302 no seguido → fallo, alerta retenida",
      r1.fired === 0 && r1.webhookErrors === 1 && r1.dropped === 0,
      `errors=${r1.webhookErrors} dropped=${r1.dropped}`
    );
    check("destino del redirect jamás recibió POST", received.length === hooksBefore);
    const r2 = await doCheck();
    const r3 = await doCheck();
    check(
      "max retries (3) → drop de la alerta",
      r2.dropped === 0 && r3.dropped === 1 && redirectHits === 3,
      `r3.dropped=${r3.dropped} hits=${redirectHits}`
    );
    const r4 = await doCheck();
    check("alerta dropeada ya no se revisa", r4.checked === 0, `checked=${r4.checked}`);

    // 8) TTL → expiry sin disparo
    process.env.ALERTS_TTL_HOURS = "0";
    const regTtl = await fetch(`${bareBase}/v1/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: `http://127.0.0.1:${hookSrv.port}/hook`,
        threshold: 999,
        direction: "below",
      }),
    });
    delete process.env.ALERTS_TTL_HOURS;
    check("registro con TTL 0 → 201", regTtl.status === 201);
    await new Promise((r) => setTimeout(r, 50));
    const e1 = await doCheck();
    check("TTL vencido → expira sin disparar", e1.expired === 1 && e1.fired === 0, `expired=${e1.expired}`);
  }

  // 9) Cuota por cliente (default 5) → 429
  const quotaReg = () =>
    fetch(`${bareBase}/v1/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: `http://127.0.0.1:${hookSrv.port}/hook`,
        threshold: 0.01, // nunca cruza: no se dispara entre registros
        direction: "below",
      }),
    });
  let quotaOk = true;
  for (let i = 0; i < 5; i++) {
    const r = await quotaReg();
    if (r.status !== 201) quotaOk = false;
  }
  check("cuota: 5 registros del mismo cliente → 201", quotaOk);
  const overQuota = await quotaReg();
  check("cuota: 6º registro mismo cliente → 429", overQuota.status === 429, `HTTP ${overQuota.status}`);

  // 10) Rate limit sliding-window → 429 con Retry-After.
  // App nueva con límite bajo; el store en memoria es singleton compartido,
  // así que basta con insistir hasta cruzar el umbral.
  process.env.RATE_LIMIT_MAX = "3";
  const rlSrv = await listen(createApp());
  const rlBase = `http://127.0.0.1:${rlSrv.port}`;
  delete process.env.RATE_LIMIT_MAX;
  let limited: Response | null = null;
  for (let i = 0; i < 10; i++) {
    const r = await fetch(`${rlBase}/v1/quote`);
    if (r.status === 429) {
      limited = r;
      break;
    }
  }
  const limitedBody = limited ? ((await limited.json()) as { error?: string }) : null;
  check(
    "rate limit: exceso → 429 rate_limited + Retry-After",
    limited !== null &&
      limitedBody?.error === "rate_limited" &&
      Number(limited.headers.get("retry-after")) > 0,
    limited ? `Retry-After=${limited.headers.get("retry-after")}` : "nunca llegó el 429"
  );
  rlSrv.close();

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
