/**
 * Smoke local del stack de valor v1 (sin pagos reales):
 *   - 402 sin pago en /v1/* y /premium/fx (no-regresión) contra un facilitador
 *     mock — mismo wiring de producción vía X402_FACILITATOR_URL.
 *   - Shape del JSON de los handlers pagados (router montado sin x402).
 *   - Ciclo de alertas: registro → check dispara webhook local → one-shot.
 *   - SSRF: bloqueo de IP decimal/metadata/privadas, reglas prod (https-only,
 *     loopback), redirects nunca seguidos.
 *   - Egress: max retries → drop, TTL → expiry, cuota por cliente → 429.
 *   - Blindaje: replay guard (duplicado en vuelo → 409, replay tras 200 →
 *     409, liberación tras fallo, scope por ruta, fail-closed sin store
 *     durable → 503), header gigante → 400, rate limit sliding-window → 429.
 *   - Cupo gratis Merktop: sin llave → 402, llave+cupo → 200 con
 *     X-TIA-Free-Remaining, cap por agente → 402, total agotado → 402,
 *     vencido → 402, llave inválida → 402, agente inválido → 402 uniforme
 *     (anti-oráculo), revert en 5xx, incremento concurrente atómico,
 *     usage+report con la misma llave.
 *
 * Uso: npm run smoke:v1   (desde backend/)
 */
import express from "express";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";

// Env ANTES de importar la app (x402Config/alerts leen process.env).
process.env.NIRIUM_X402_ENABLED = "true";
// Headroom para el propio smoke (la app principal lee esto al crearse); el
// test de rate limit usa su propia app con límite bajo.
process.env.RATE_LIMIT_MAX = "500";
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

  // 2b) Guardas del X-PAYMENT en la app real (antes del middleware x402)
  const fakePayment = Buffer.from(JSON.stringify({ smoke: "payload" })).toString("base64");
  const first = await fetch(`${base}/v1/quote`, { headers: { "X-PAYMENT": fakePayment } });
  check(
    "X-PAYMENT nuevo NO es 409 (pasa al x402 middleware)",
    first.status !== 409,
    `HTTP ${first.status}`
  );
  // El pago falló (mock sin /verify → no-2xx) → la claim se libera: el mismo
  // proof puede reintentarse porque el pagador nunca recibió el recurso.
  const retryAfterFail = await fetch(`${base}/v1/quote`, {
    headers: { "X-PAYMENT": fakePayment },
  });
  check(
    "proof tras pago fallido se libera (reintento NO es 409)",
    retryAfterFail.status !== 409,
    `HTTP ${retryAfterFail.status}`
  );
  const huge = await fetch(`${base}/v1/quote`, {
    headers: { "X-PAYMENT": "A".repeat(9 * 1024) },
  });
  check("X-PAYMENT > 8KB → 400", huge.status === 400, `HTTP ${huge.status}`);

  // 2c) Semántica del replay guard (handlers controlados: 200 lento y 402)
  const { paymentHeaderLimits, paymentReplayGuard } = await import(
    "../src/middleware/paymentGuard.js"
  );
  const guard = express();
  guard.use(paymentHeaderLimits(), paymentReplayGuard());
  guard.get("/slow", async (_req, res) => {
    await new Promise((r) => setTimeout(r, 250));
    res.json({ ok: true });
  });
  guard.get("/fail", (_req, res) => res.status(402).json({ ok: false }));
  const guardSrv = await listen(guard);
  const gBase = `http://127.0.0.1:${guardSrv.port}`;
  const proof = { headers: { "X-PAYMENT": Buffer.from("guard-proof").toString("base64") } };

  // Duplicado EN VUELO con el mismo proof → exactamente un 200 y un 409.
  const [g1, g2] = await Promise.all([
    fetch(`${gBase}/slow`, proof),
    (async () => {
      await new Promise((r) => setTimeout(r, 60));
      return fetch(`${gBase}/slow`, proof);
    })(),
  ]);
  const inflight = [g1.status, g2.status].sort();
  check(
    "duplicado en vuelo → un 200 y un 409",
    inflight[0] === 200 && inflight[1] === 409,
    `statuses=${inflight.join(",")}`
  );
  // Tras un 200 (recurso servido) la claim persiste el TTL completo.
  const g3 = await fetch(`${gBase}/slow`, proof);
  check("replay tras 200 → 409", g3.status === 409, `HTTP ${g3.status}`);
  // Scope por ruta: el mismo proof en OTRA ruta tiene claim independiente.
  const g4 = await fetch(`${gBase}/fail`, proof);
  check(
    "mismo proof en otra ruta → claim independiente (no 409)",
    g4.status === 402,
    `HTTP ${g4.status}`
  );
  // Tras un fallo (402) la claim se libera y el proof puede reintentarse.
  const g5 = await fetch(`${gBase}/fail`, proof);
  check("replay tras fallo → liberado (402 de nuevo, no 409)", g5.status === 402, `HTTP ${g5.status}`);
  // Fail-closed: en modo estricto sin store durable, request pagado → 503.
  process.env.X402_REPLAY_STRICT = "true";
  const g6 = await fetch(`${gBase}/fail`, proof);
  const g6Body = (await g6.json()) as { error?: string };
  check(
    "strict sin store durable → 503 replay_protection_unavailable",
    g6.status === 503 && g6Body.error === "replay_protection_unavailable",
    `HTTP ${g6.status}`
  );
  delete process.env.X402_REPLAY_STRICT;
  guardSrv.close();

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

  // 11) Cupo gratis del canal Merktop (middleware ANTES del x402 en /v1).
  // La config se lee por request, así que basta setear env aquí; las
  // secciones 1–10 corrieron sin canal configurado (cfg null → next()).
  const MERKTOP_KEY = "merktop-smoke-key";
  process.env.MERKTOP_CHANNEL_KEY_HASH = createHash("sha256")
    .update(MERKTOP_KEY)
    .digest("hex");
  process.env.MERKTOP_FREE_EXPIRES_AT = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  process.env.MERKTOP_FREE_TOTAL = "100";
  // Cap bajo para probar rápido el tope por agente (la lógica del "llamada
  // 21" del spec es idéntica con cualquier N).
  process.env.MERKTOP_FREE_PER_AGENT = "2";

  const AGENT_A = "GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS";
  const AGENT_B = "GB3RZCIAUDTUDLQZTJ3OFVZPS3VNTYKJST3M66NMOXUQFKYFPEN4OII4";
  const AGENT_C = "GA4UK3ODRFEMINSJKAU3Z5QBDVBYCNPBUD5SAKMJ4QWR2NCP54WVEZG5";
  const AGENT_D = "GB5SCLXLPIEY4X6SKYCNPPVOS7YOY27FNV7HTYMWEIKI7JUKEV676UX5";
  const AGENT_E = "GAKPQTQOKFN6PLPLBOYSPZ2K52FGK5VVTSFIFAYJXDJ5WUHEWZR6DCXR";
  // Mismos bytes que AGENT_A con el último carácter cambiado → checksum roto.
  const AGENT_BAD = "GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBX";

  const freeCall = (agent?: string, key: string | null = MERKTOP_KEY) =>
    fetch(`${base}/v1/quote`, {
      headers: {
        ...(key !== null ? { "X-TIA-Channel-Key": key } : {}),
        ...(agent !== undefined ? { "X-TIA-Agent": agent } : {}),
      },
    });
  const usage = (query = "", key: string | null = MERKTOP_KEY) =>
    fetch(`${base}/v1/channel/merktop/usage${query}`, {
      headers: key !== null ? { "X-TIA-Channel-Key": key } : {},
    });

  // Sin llave → el x402 normal cobra (402), aun con el canal configurado.
  const mNoKey = await freeCall(AGENT_A, null);
  check("merktop: sin llave → 402", mNoKey.status === 402, `HTTP ${mNoKey.status}`);

  // Con llave y cupo → 200 sin pago + X-TIA-Free-Remaining.
  const mA1 = await freeCall(AGENT_A);
  const mA1Body = (await mA1.json()) as { ok?: boolean };
  check(
    "merktop: llave + cupo → 200 sin pago",
    mA1.status === 200 && mA1Body.ok === true,
    `HTTP ${mA1.status}`
  );
  check(
    "merktop: header X-TIA-Free-Remaining=1 (min de ambos topes)",
    mA1.headers.get("x-tia-free-remaining") === "1",
    `valor=${mA1.headers.get("x-tia-free-remaining")}`
  );
  const mA2 = await freeCall(AGENT_A);
  check(
    "merktop: segunda llamada del agente → 200, remaining=0",
    mA2.status === 200 && mA2.headers.get("x-tia-free-remaining") === "0",
    `HTTP ${mA2.status} remaining=${mA2.headers.get("x-tia-free-remaining")}`
  );

  // Tope por agente (cap 2 en este smoke; misma lógica que el "21" con 20).
  const mA3 = await freeCall(AGENT_A);
  check(
    "merktop: llamada N+1 del mismo agente → 402 (cap por agente)",
    mA3.status === 402,
    `HTTP ${mA3.status}`
  );

  // Tope total del canal: con el total en el límite, otro agente recibe 402.
  process.env.MERKTOP_FREE_TOTAL = "3";
  const mB1 = await freeCall(AGENT_B);
  check("merktop: agente B llena el total (3) → 200", mB1.status === 200, `HTTP ${mB1.status}`);
  const mC1 = await freeCall(AGENT_C);
  check("merktop: total agotado → 402 para agente C", mC1.status === 402, `HTTP ${mC1.status}`);
  process.env.MERKTOP_FREE_TOTAL = "100";

  // Plazo vencido → 402 aunque la llave sea válida y haya cupo.
  process.env.MERKTOP_FREE_EXPIRES_AT = new Date(Date.now() - 1000).toISOString();
  const mExp = await freeCall(AGENT_C);
  check("merktop: plazo vencido → 402", mExp.status === 402, `HTTP ${mExp.status}`);
  process.env.MERKTOP_FREE_EXPIRES_AT = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Llave inválida → 402 (se cobra; el valor jamás se loguea).
  const mBadKey = await freeCall(AGENT_C, "llave-equivocada");
  check("merktop: llave inválida → 402", mBadKey.status === 402, `HTTP ${mBadKey.status}`);

  // Agente inválido (checksum roto) o ausente → 402 UNIFORME, igual que una
  // llave inválida: un 400 distinto sería un oráculo que confirma la validez
  // de la llave sin gastar cupo (hallazgo Medium del security review).
  const mBadAgent = await freeCall(AGENT_BAD);
  check(
    "merktop: agente con checksum roto → 402 uniforme (anti-oráculo)",
    mBadAgent.status === 402,
    `HTTP ${mBadAgent.status}`
  );
  const mNoAgent = await freeCall(undefined);
  check(
    "merktop: sin X-TIA-Agent → 402 uniforme (anti-oráculo)",
    mNoAgent.status === 402,
    `HTTP ${mNoAgent.status}`
  );

  // Usage: misma llave, constant-time; sin/mala llave → 401.
  const mUsageNoKey = await usage("", null);
  check("merktop: usage sin llave → 401", mUsageNoKey.status === 401, `HTTP ${mUsageNoKey.status}`);
  const mUsage = await usage(`?agent=${AGENT_A}&report=1`);
  const mUsageBody = (await mUsage.json()) as {
    ok?: boolean;
    total?: { limit?: number; used?: number; remaining?: number };
    agent?: { used?: number; remaining?: number };
    report?: Array<{ agent?: string; endpoint?: string; quoteSha256?: string | null }>;
  };
  check(
    "merktop: usage → total used=3 (A×2 + B×1), agente A used=2/remaining=0",
    mUsage.status === 200 &&
      mUsageBody.total?.used === 3 &&
      mUsageBody.total?.remaining === 97 &&
      mUsageBody.agent?.used === 2 &&
      mUsageBody.agent?.remaining === 0,
    `total=${JSON.stringify(mUsageBody.total)} agent=${JSON.stringify(mUsageBody.agent)}`
  );
  check(
    "merktop: report con 3 líneas (agente, endpoint, sha256 de la respuesta)",
    mUsageBody.report?.length === 3 &&
      mUsageBody.report.every(
        (l) =>
          typeof l.agent === "string" &&
          l.endpoint?.endsWith("/quote") === true &&
          typeof l.quoteSha256 === "string"
      ),
    `report=${mUsageBody.report?.length ?? "ausente"} líneas`
  );

  // Revert en 5xx: mini-app con handler que falla (comparte el kv en memoria
  // singleton del proceso) — la llamada NO debe consumir cupo.
  const { merktopFreeTier } = await import("../src/middleware/merktopFreeTier.js");
  const mk = express();
  mk.use(merktopFreeTier());
  mk.get("/quote", (_req, res) => res.status(500).json({ ok: false }));
  const mkSrv = await listen(mk);
  const mFail = await fetch(`http://127.0.0.1:${mkSrv.port}/quote`, {
    headers: { "X-TIA-Channel-Key": MERKTOP_KEY, "X-TIA-Agent": AGENT_D },
  });
  mkSrv.close();
  check("merktop: handler 5xx responde 500", mFail.status === 500, `HTTP ${mFail.status}`);
  await new Promise((r) => setTimeout(r, 150)); // el revert corre en res.finish
  const mAfterFail = await usage(`?agent=${AGENT_D}`);
  const mAfterFailBody = (await mAfterFail.json()) as {
    total?: { used?: number };
    agent?: { used?: number };
  };
  check(
    "merktop: 5xx revierte el incremento (total sigue en 3, agente D en 0)",
    mAfterFailBody.total?.used === 3 && mAfterFailBody.agent?.used === 0,
    `total.used=${mAfterFailBody.total?.used} D.used=${mAfterFailBody.agent?.used}`
  );

  // Incremento concurrente atómico: 6 llamadas simultáneas de un agente
  // fresco con cap 3 → exactamente 3×200 y 3×402 (increment-check-revert:
  // nunca más de 3 concedidas, los overshoots se revierten).
  process.env.MERKTOP_FREE_PER_AGENT = "3";
  const concurrent = await Promise.all(
    Array.from({ length: 6 }, () => freeCall(AGENT_E))
  );
  const granted = concurrent.filter((r) => r.status === 200).length;
  const charged = concurrent.filter((r) => r.status === 402).length;
  check(
    "merktop: 6 llamadas concurrentes, cap 3 → exactamente 3×200 + 3×402",
    granted === 3 && charged === 3,
    `200×${granted} 402×${charged}`
  );
  await new Promise((r) => setTimeout(r, 150));
  const mFinal = await usage(`?agent=${AGENT_E}`);
  const mFinalBody = (await mFinal.json()) as {
    total?: { used?: number };
    agent?: { used?: number };
  };
  check(
    "merktop: contadores exactos tras concurrencia (total=6, E=3)",
    mFinalBody.total?.used === 6 && mFinalBody.agent?.used === 3,
    `total.used=${mFinalBody.total?.used} E.used=${mFinalBody.agent?.used}`
  );

  delete process.env.MERKTOP_CHANNEL_KEY_HASH;
  delete process.env.MERKTOP_FREE_EXPIRES_AT;
  delete process.env.MERKTOP_FREE_TOTAL;
  delete process.env.MERKTOP_FREE_PER_AGENT;

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
