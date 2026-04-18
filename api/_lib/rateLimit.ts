import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiter distribuido con fallback a memoria.
 *
 * - Si UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN están configurados,
 *   usa @upstash/ratelimit (sliding window) para persistir entre cold starts
 *   y entre instancias serverless.
 * - Si no lo están, hace fallback a un Map en memoria (solo por instancia).
 *   Útil en desarrollo local; en producción conviene configurar Upstash.
 */

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_KNOWN = 6;
const MAX_UNKNOWN = 3;

type Kind = 'known' | 'unknown';

// ---- Upstash (preferido) -----------------------------------------------------

type Limiter = { limit: (key: string) => Promise<{ success: boolean }> };

function buildUpstashLimiters(): { known: Limiter; unknown: Limiter } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const redis = new Redis({ url, token });
    const known = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_KNOWN, '60 s'),
      prefix: 'pba:chat:known',
      analytics: false,
    });
    const unknown = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_UNKNOWN, '60 s'),
      prefix: 'pba:chat:unknown',
      analytics: false,
    });
    return { known, unknown };
  } catch (err) {
    console.warn('[rateLimit] No se pudo inicializar Upstash, usando memoria:', err);
    return null;
  }
}

const upstashLimiters = buildUpstashLimiters();

// ---- Fallback en memoria -----------------------------------------------------

const memoryStore = new Map<string, { count: number; timestamp: number }>();

function checkMemory(key: string, limit: number): boolean {
  const now = Date.now();
  const record = memoryStore.get(key);
  if (!record || now - record.timestamp > WINDOW_MS) {
    memoryStore.set(key, { count: 1, timestamp: now });
    return true;
  }
  if (record.count >= limit) return false;
  record.count++;
  return true;
}

// ---- API pública -------------------------------------------------------------

/**
 * Devuelve true si la petición está permitida, false si se superó el límite.
 * En caso de error de red con Upstash, falla-abierto (permite) para no
 * bloquear el servicio ante caídas del proveedor.
 */
export async function checkRateLimit(ip: string, kind: Kind): Promise<boolean> {
  const max = kind === 'unknown' ? MAX_UNKNOWN : MAX_KNOWN;
  const key = kind === 'unknown' ? 'unknown' : ip;

  if (upstashLimiters) {
    try {
      const limiter = kind === 'unknown' ? upstashLimiters.unknown : upstashLimiters.known;
      const { success } = await limiter.limit(key);
      return success;
    } catch (err) {
      console.warn('[rateLimit] Fallo Upstash, fail-open:', err);
      return true;
    }
  }

  return checkMemory(key, max);
}

export function isUsingUpstash(): boolean {
  return upstashLimiters !== null;
}
