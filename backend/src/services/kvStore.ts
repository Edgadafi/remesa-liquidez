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
  /** INCR atómico; devuelve el valor resultante. */
  incr(key: string): Promise<number>;
  /** DECRBY atómico (revertir incrementos). */
  decrBy(key: string, n: number): Promise<void>;
  /** Lee un contador (0 si no existe). */
  getNum(key: string): Promise<number>;
  /** RPUSH + LTRIM a maxLen (listas de reporte/auditoría). */
  listPush(key: string, value: string, maxLen: number): Promise<void>;
  /** Lista completa (para export de reportes acotados). */
  listAll(key: string): Promise<string[]>;
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
    async incr(key) {
      const [n] = await pipeline<[number]>([["INCR", key]]);
      return n;
    },
    async decrBy(key, n) {
      await pipeline([["DECRBY", key, n]]);
    },
    async getNum(key) {
      const [v] = await pipeline<[string | null]>([["GET", key]]);
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    },
    async listPush(key, value, maxLen) {
      await pipeline([
        ["RPUSH", key, value],
        ["LTRIM", key, -maxLen, -1],
      ]);
    },
    async listAll(key) {
      const [items] = await pipeline<[string[]]>([["LRANGE", key, 0, -1]]);
      return items ?? [];
    },
  };
}

function memoryBackend(): KvBackend {
  const claims = new Map<string, number>(); // key → expiresAt
  const windows = new Map<string, number[]>(); // key → timestamps
  const counters = new Map<string, number>();
  const lists = new Map<string, string[]>();

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
    async incr(key) {
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      return n;
    },
    async decrBy(key, n) {
      counters.set(key, (counters.get(key) ?? 0) - n);
    },
    async getNum(key) {
      return counters.get(key) ?? 0;
    },
    async listPush(key, value, maxLen) {
      const list = lists.get(key) ?? [];
      list.push(value);
      if (list.length > maxLen) list.splice(0, list.length - maxLen);
      lists.set(key, list);
    },
    async listAll(key) {
      return [...(lists.get(key) ?? [])];
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
