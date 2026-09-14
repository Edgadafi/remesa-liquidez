import express from "express";
import * as niriumNs from "nirium";
import tiaRouter from "./routes/tia.js";
import premiumRouter from "./routes/premium.js";
import { getProvaStatus } from "./services/prova.js";
import {
  getX402ServeConfig,
  getX402Status,
  isX402Enabled,
} from "./services/x402Config.js";

type X402Serve = (
  config: ReturnType<typeof getX402ServeConfig>
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

  app.use(express.json({ limit: "12mb" }));

  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-PAYMENT"
    );
    next();
  });

  app.options("*", (_req, res) => res.sendStatus(204));

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
<li><code>GET /premium/fx</code> (x402)</li>`
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
      app.use("/premium", x402Serve(x402Config));
      app.use("/premium", premiumRouter);
      console.log(
        `[TIA] x402 premium API enabled (${x402Config.network}) → ${Object.keys(x402Config.routes).join(", ")}`
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
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("[TIA] unhandled:", err);
      res.status(500).json({ ok: false, agent: "TIA", error: err.message });
    }
  );

  return app;
}
