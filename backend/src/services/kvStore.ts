/**
 * KV mínimo para middlewares de seguridad (rate limit + replay guard).
 *
 * Upstash Redis REST cuando hay UPSTASH_REDIS_REST_URL/TOKEN — requerido en
 * Vercel para que los límites sean reales entre invocaciones serverless.
 * Sin Upstash: fallback en memoria por instancia (dev local), con warning.
 */

export interface KvBackend {
  kind: "upstash" | "memory";
  /**
   * Claim atómico single-use: SET key NX PX ttl.
   * true → esta invocación ganó la clave (primera vez que se ve).
   */
  claimOnce(key: string, ttlMs: number): Promise<boolean>;
  /** Libera una claim (p. ej. cuando el pago no terminó en recurso servido). */
  del(key: string): Promise<void>;
  /**
   * Sliding window: registra un hit y devuelve cuántos hits vivos hay en la
   * ventana (incluido este).
   */
  slidingWindowHit(key: string, windowMs: number, member: string): Promise<number>;
}

/** true si hay store durable (Upstash) configurado — requerido en producción. */
export function hasDurableKv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

type UpstashResult<T> = { result: T };

function upstashBackend(url: string, token: string): KvBackend {
  const base = url.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  async function pipeline<T extends unknown[]>(
    commands: (string | number)[][]
  ): Promise<T> {
    const res = await fetch(`${base}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) throw new Error(`Upstash pipeline respondió ${res.status}`);
    const data = (await res.json()) as UpstashResult<unknown>[];
    return data.map((d) => d.result) as T;
  }

  return {
    kind: "upstash",
    async claimOnce(key, ttlMs) {
      const [result] = await pipeline<[string | null]>([
        ["SET", key, "1", "NX", "PX", ttlMs],
      ]);
      return result === "OK";
    },
    async del(key) {
      await pipeline([["DEL", key]]);
    },
    async slidingWindowHit(key, windowMs, member) {
      const now = Date.now();
      const [, , count] = await pipeline<[number, number, number, number]>([
        ["ZREMRANGEBYSCORE", key, 0, now - windowMs],
        ["ZADD", key, now, member],
        ["ZCARD", key],
        ["PEXPIRE", key, windowMs],
      ]);
      return count;
    },
  };
}

function memoryBackend(): KvBackend {
  const claims = new Map<string, number>(); // key → expiresAt
  const windows = new Map<string, number[]>(); // key → timestamps

  function gc(now: number) {
    if (claims.size > 10_000) {
      for (const [k, exp] of claims) if (exp <= now) claims.delete(k);
    }
    if (windows.size > 10_000) {
      for (const [k, hits] of windows) {
        if (hits.length === 0 || hits[hits.length - 1] < now - 300_000) {
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
      if (existing !== undefined && existing > now) return false;
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
    },
  };
}

let backend: KvBackend | null = null;

export function getKvBackend(): KvBackend {
  if (backend) return backend;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    backend = upstashBackend(url, token);
  } else {
    console.warn(
      "[TIA] kvStore: sin UPSTASH_REDIS_REST_URL/TOKEN — rate limit y replay guard en memoria POR INSTANCIA (en Vercel cada invocación puede ser una instancia distinta; configura Upstash para que los límites sean durables)"
    );
    backend = memoryBackend();
  }
  return backend;
}
