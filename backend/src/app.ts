import express from "express";
import tiaRouter from "./routes/tia.js";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "12mb" }));

  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
  });

  app.options("*", (_req, res) => res.sendStatus(204));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      agent: "TIA",
      service: "remesa-tia-backend",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>TIA Backend</title></head>
<body style="font-family:system-ui;background:#0b0d12;color:#e7e9ee;padding:2rem">
<h1>Remesa <span style="color:#5eebc4">TIA</span> Backend</h1>
<p>Agente de notificaciones — Bridge Dev3pack</p>
<ul>
<li><code>GET /health</code></li>
<li><code>POST /api/tia/notify</code></li>
<li><code>POST /api/lidia/notify</code> (alias legacy)</li>
</ul>
</body></html>`);
  });

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
