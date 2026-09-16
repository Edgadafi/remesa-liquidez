import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Origen canónico (scheme + host) para los middlewares aguas abajo.
 *
 * @x402/express construye el `resource.url` del 402 como
 * `${req.protocol}://${req.headers.host}${req.originalUrl}`, y Vercel termina
 * TLS antes de llegar a Express — sin esto las instrucciones de pago anuncian
 * `http://`.
 *
 * PUBLIC_BASE_URL manda (solo se usan scheme + host; el path viene del
 * request). Si falta o es inválida, el fallback es `trust proxy` +
 * X-Forwarded-Proto, configurado en app.ts.
 */
export function publicOrigin(): RequestHandler {
  const raw = process.env.PUBLIC_BASE_URL?.trim();
  let origin: URL | null = null;

  if (raw) {
    try {
      origin = new URL(raw);
    } catch {
      console.warn(
        `[TIA] PUBLIC_BASE_URL inválida ("${raw}") — fallback a X-Forwarded-Proto`
      );
    }
  }

  return (req: Request, _res: Response, next: NextFunction) => {
    if (origin) {
      // Sombrea el getter de Express solo para este request.
      Object.defineProperty(req, "protocol", {
        value: origin.protocol.replace(/:$/, ""),
        configurable: true,
      });
      req.headers.host = origin.host;
    }
    next();
  };
}
