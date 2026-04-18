/**
 * Rate limiter distribuido con fallback a memoria.
 *
 * - Si UPSTASH_REDIS_REST_URL/KV_REST_API_URL y UPSTASH_REDIS_REST_TOKEN/
 *   KV_REST_API_TOKEN están configurados, usa @upstash/ratelimit (sliding
 *   window) para persistir entre cold starts y entre instancias serverless.
 * - Si no lo están (o si la inicialización falla), hace fallback a un Map
 *   en memoria (solo por instancia). Útil en desarrollo local.
 *
 * La inicialización de Upstash es LAZY: se intenta en la primera llamada
 * a checkRateLimit(). Así, cualquier fallo al importar o instanciar el
 * cliente de Upstash queda capturado en el handler en vez de romper el
 * load del módulo serverless con FUNCTION_INVOCATION_FAILED.
 */

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_KNOWN = 6;
const MAX_UNKNOWN = 3;

type Kind = 'known' | 'unknown';

// ---- Upstash (preferido, lazy) ----------------------------------------------

type Limiter = { limit: (key: string) => Promise<{ success: boolean }> };
type UpstashState =
  | { status: 'uninitialized' }
  | { status: 'unavailable' }
  | { status: 'ready'; known: Limiter; unknown: Limiter };

let upstashState: UpstashState = { status: 'uninitialized' };

async function getUpstashLimiters(): Promise<{ known: Limiter; unknown: Limiter } | null> {
  if (upstashState.status === 'ready') {
    return { known: upstashState.known, unknown: upstashState.unknown };
  }
  if (upstashState.status === 'unavailable') {
    return null;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    upstashState = { status: 'unavailable' };
    return null;
  }

  try {
    // Import dinámico: si el módulo no está disponible en runtime, no rompe el load.
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ]);

    const redis = new Redis({ url, token });
    const known: Limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_KNOWN, '60 s'),
      prefix: 'pba:chat:known',
      analytics: false,
    });
    const unknown: Limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_UNKNOWN, '60 s'),
      prefix: 'pba:chat:unknown',
      analytics: false,
    });
    upstashState = { status: 'ready', known, unknown };
    return { known, unknown };
  } catch (err) {
    console.warn('[rateLimit] No se pudo inicializar Upstash, usando memoria:', err);
    upstashState = { status: 'unavailable' };
    return null;
  }
}

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

  const limiters = await getUpstashLimiters();
  if (limiters) {
    try {
      const limiter = kind === 'unknown' ? limiters.unknown : limiters.known;
      const { success } = await limiter.limit(key);
      return success;
    } catch (err) {
      console.warn('[rateLimit] Fallo Upstash, fail-open:', err);
      return true;
    }
  }

  return checkMemory(key, max);
}

/**
 * Indica si el rate limiter está usando Upstash. Solo es informativo para
 * logs; como la init es lazy, puede devolver false hasta la primera llamada.
 */
export function isUsingUpstash(): boolean {
  return upstashState.status === 'ready';
}
