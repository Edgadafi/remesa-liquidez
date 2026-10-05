import express from "express";
import * as niriumNs from "nirium";
import tiaRouter from "./routes/tia.js";
import premiumRouter from "./routes/premium.js";
import v1Router from "./routes/v1.js";
import { publicOrigin } from "./middleware/publicOrigin.js";
import { envInt, rateLimit } from "./middleware/rateLimit.js";
import {
  paymentHeaderLimits,
  paymentReplayGuard,
} from "./middleware/paymentGuard.js";
import { hasDurableKv } from "./services/kvStore.js";
import { getProvaStatus } from "./services/prova.js";
import {
  getX402ServeConfig,
  getX402Status,
  getX402V1ServeConfig,
  isX402Enabled,
} from "./services/x402Config.js";

type X402Serve = (
  config:
    | ReturnType<typeof getX402ServeConfig>
    | ReturnType<typeof getX402V1ServeConfig>
) => express.RequestHandler;

function resolveX402Serve(): X402Serve {
  const bag = niriumNs as Record<string, unknown> & { default?: unknown };
  const nested =
    bag.default && typeof bag.default === "object"
      ? (bag.default as Record<string, unknown>)
      : undefined;
  const fn = [bag.x402Serve, nested?.x402Serve].find(
    (candidate) => typeof candidate === "function"
  );
  if (typeof fn !== "function") {
    throw new Error("nirium x402Serve export not found");
  }
  return fn as X402Serve;
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // Vercel termina TLS antes de Express: sin esto req.protocol es "http".
  // Es solo el fallback del resource.url del 402 — el mecanismo principal
  // es PUBLIC_BASE_URL (middleware/publicOrigin.ts).
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

  // Rate limiting sliding-window por IP, ANTES de parsear body (rechazo
  // barato). Durable con Upstash; en memoria por instancia sin él.
  const rlWindowMs = envInt("RATE_LIMIT_WINDOW_SECONDS", 60) * 1000;
  app.use(
    ["/premium", "/v1"],
    rateLimit({
      max: envInt("RATE_LIMIT_MAX", 30),
      windowMs: rlWindowMs,
      keyPrefix: "paid",
    })
  );
  app.use(
    ["/api/tia", "/api/lidia"],
    rateLimit({
      max: envInt("RATE_LIMIT_NOTIFY_MAX", 60),
      windowMs: rlWindowMs,
      keyPrefix: "notify",
    })
  );

  // Límites de body por superficie: 12mb SOLO para notify (audioBase64 TTS);
  // el resto de la API opera con payloads chicos — 100kb es de sobra.
  app.use(["/api/tia", "/api/lidia"], express.json({ limit: "12mb" }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", async (_req, res) => {
    const prova = await getProvaStatus();
    const x402 = getX402Status();
    res.json({
      ok: true,
      agent: "TIA",
      service: "remesa-tia-backend",
      timestamp: new Date().toISOString(),
      prova,
      x402,
    });
  });

  const premiumEndpoints = isX402Enabled()
    ? `<li><code>GET /premium/bridge-quote</code> (x402)</li>
<li><code>GET /premium/fx</code> (x402)</li>
<li><code>GET /v1/quote</code> (x402)</li>
<li><code>GET /v1/route?amount=USD</code> (x402)</li>
<li><code>POST /v1/alert</code> (x402)</li>
<li><code>POST /v1/alert/check</code> (Bearer cron)</li>`
    : "";

  app.get("/", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>holatia.app — TIA Backend</title></head>
<body style="font-family:system-ui;background:#0b0d12;color:#e7e9ee;padding:2rem">
<h1>Remesa <span style="color:#5eebc4">TIA</span> Backend</h1>
<p>Agente de notificaciones — <a href="https://holatia.app" style="color:#5eebc4">holatia.app</a></p>
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

      // Guardas del X-PAYMENT antes del middleware de cobro: tamaño acotado
      // y single-use (replay/free-shopping) — ver middleware/paymentGuard.ts.
      // En producción el replay guard es fail-closed: sin Upstash, los
      // requests pagados reciben 503. Avisar en el arranque, no al primer 503.
      if (
        !hasDurableKv() &&
        (process.env.NODE_ENV === "production" || process.env.VERCEL)
      ) {
        console.error(
          "[TIA] x402 SIN store durable: el replay guard rechazará requests pagados (503) hasta configurar UPSTASH_REDIS_REST_URL/TOKEN"
        );
      }
      app.use(["/premium", "/v1"], paymentHeaderLimits(), paymentReplayGuard());

      app.use("/premium", publicOrigin(), x402Serve(x402Config));
      app.use("/premium", premiumRouter);

      // Stack de valor v1 — mismo x402 exact + facilitador; solo cambian rutas
      // y precios. /v1/alert/check no está en las rutas cobradas: pasa el
      // middleware x402 sin pago y lo protege su propio Bearer (cron).
      const v1Config = getX402V1ServeConfig();
      app.use("/v1", publicOrigin(), x402Serve(v1Config));
      app.use("/v1", v1Router);

      console.log(
        `[TIA] x402 premium API enabled (${x402Config.network}) → ${[
          ...Object.keys(x402Config.routes).map((r) => `/premium ${r}`),
          ...Object.keys(v1Config.routes).map((r) => `/v1 ${r}`),
        ].join(", ")}`
      );
    } catch (err) {
      console.error("[TIA] x402 setup failed:", err);
    }
  }

  app.use("/api/tia", tiaRouter);
  // Alias legacy — mismo handler hasta deprecar remesa-blink routes
  app.use("/api/lidia", tiaRouter);

  app.use(
    (
      err: Error & { status?: number; type?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      // Solo message + stack: volcar el objeto entero puede arrastrar el
      // request adjunto en errores de fetch/SDK — y con él los headers
      // X-PAYMENT / Authorization, que nunca deben tocar logs.
      console.error("[TIA] unhandled:", err.stack ?? err.message ?? String(err));

      // Errores del body-parser (413 payload too large, 400 JSON inválido)
      // conservan su status; el resto es 500 genérico sin detalles internos.
      const status =
        typeof err.status === "number" && err.status >= 400 && err.status < 500
          ? err.status
          : 500;
      res.status(status).json({
        ok: false,
        agent: "TIA",
        error: status === 500 ? "Internal error" : err.message,
      });
    }
  );

  return app;
}
