/**
 * Rate limiter dual: usa Upstash Redis si hay credenciales, si no, memoria local.
 *
 * - Producción (con Upstash): contador compartido entre instancias serverless.
 * - Dev / fallback: contador por instancia (puede ser "poroso" si hay varias).
 *
 * Toda la integración con Upstash es lazy y tolerante a fallos: si el import
 * dinámico o la inicialización del cliente fallan, el módulo cae al rate limit
 * en memoria en vez de tirar FUNCTION_INVOCATION_FAILED.
 */

type Kind = 'known' | 'unknown';

const LIMITS: Record<Kind, { max: number; windowMs: number }> = {
  known: { max: 6, windowMs: 60_000 },
  unknown: { max: 3, windowMs: 60_000 },
};

// ---- Fallback en memoria -----------------------------------------------------

const memoryStore: Record<Kind, Map<string, { count: number; resetAt: number }>> = {
  known: new Map(),
  unknown: new Map(),
};

function checkMemory(key: string, kind: Kind): boolean {
  const { max, windowMs } = LIMITS[kind];
  const now = Date.now();
  const map = memoryStore[kind];
  const entry = map.get(key);
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

// ---- Upstash Redis (lazy) ----------------------------------------------------

type RedisLike = {
  incr: (key: string) => Promise<number>;
  pexpire: (key: string, ms: number) => Promise<number | string>;
};
type RedisState =
  | { status: 'uninitialized' }
  | { status: 'unavailable' }
  | { status: 'ready'; redis: RedisLike };

let redisState: RedisState = { status: 'uninitialized' };

async function getRedis(): Promise<RedisLike | null> {
  if (redisState.status === 'ready') return redisState.redis;
  if (redisState.status === 'unavailable') return null;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisState = { status: 'unavailable' };
    return null;
  }

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url, token }) as unknown as RedisLike;
    redisState = { status: 'ready', redis };
    return redis;
  } catch (err) {
    console.warn('[rateLimit] No se pudo inicializar Upstash, usando memoria:', err);
    redisState = { status: 'unavailable' };
    return null;
  }
}

// ---- API pública -------------------------------------------------------------

/**
 * Devuelve true si la petición está permitida, false si se superó el límite.
 *
 * Algoritmo en Redis: fixed window de 60s con INCR + PEXPIRE. Si Redis falla
 * durante el check, cae al limitador en memoria (no fail-open absoluto).
 */
export async function checkRateLimit(ip: string, kind: Kind): Promise<boolean> {
  const { max, windowMs } = LIMITS[kind];
  const key = kind === 'unknown' ? 'unknown' : ip;

  const redis = await getRedis();
  if (redis) {
    const windowKey = Math.floor(Date.now() / windowMs);
    const redisKey = `pba:chat:${kind}:${key}:${windowKey}`;
    try {
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      return count <= max;
    } catch (err) {
      console.warn('[rateLimit] Fallo Redis, cayendo a memoria:', err);
      return checkMemory(key, kind);
    }
  }

  return checkMemory(key, kind);
}

/**
 * Indica si el rate limiter está usando Upstash. Informativo (lazy init).
 */
export function isUsingUpstash(): boolean {
  return redisState.status === 'ready';
}
