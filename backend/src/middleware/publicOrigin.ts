import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Origen (scheme + host) para el `resource.url` del 402.
 *
 * @x402/express arma esa URL como
 * `${req.protocol}://${req.headers.host}${req.originalUrl}`. Vercel termina
 * TLS antes de Express, así que sin un host https el 402 anunciaría `http://`.
 *
 * `PUBLIC_BASE_URL` sigue siendo el respaldo (scheme + host; el path sale del
 * request). En Vercel, si `x-forwarded-host` es otro `*.vercel.app` —el
 * preview—, ese host gana: el 402 describe la URL que el cliente acaba de
 * llamar. Producción no cambia cuando el host reenviado es el de la env var.
 *
 * El facilitador Stellar no valida ese host. Verifica la transacción
 * (`payTo`, monto, activo). El matching del servidor es scheme, red y monto.
 * No hace falta otra variable de entorno. Solo se acepta el host de Vercel
 * cuando `VERCEL` está definido, porque la plataforma escribe
 * `x-forwarded-host`; un host arbitrario sigue cayendo en `PUBLIC_BASE_URL`.
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
    const forwarded = vercelDeploymentHost(req);
    if (forwarded && process.env.VERCEL && forwarded !== origin?.hostname) {
      Object.defineProperty(req, "protocol", {
        value: "https",
        configurable: true,
      });
      req.headers.host = forwarded;
      next();
      return;
    }

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

function vercelDeploymentHost(req: Request): string | null {
  const raw = req.get("x-forwarded-host") || req.get("host") || "";
  const host = raw.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (!host.endsWith(".vercel.app")) return null;
  if (host.startsWith(".") || host.includes("..")) return null;
  return host;
}
