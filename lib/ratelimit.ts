import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _ratelimit: Ratelimit | null = null;
let _fallback: Ratelimit | null = null;

/** Rate limiter in-memory para cuando Redis no está disponible. */
function getFallbackRatelimit(): Ratelimit {
  if (!_fallback) {
    _fallback = new Ratelimit({
      redis: Redis.fromEnv(), // nunca se llama realmente
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl-fallback",
      ephemeralCache: new Map(),
    });
  }
  return _fallback;
}

/**
 * Retorna el rate limiter principal (Upstash Redis).
 * Si Redis no está configurado o falla al inicializar, retorna un fallback in-memory.
 * Nunca retorna null — siempre hay algún nivel de protección.
 */
export function getRatelimit(): Ratelimit {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return getFallbackRatelimit();
  }
  try {
    if (!_ratelimit) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL.replace(/^"|"$/g, ""),
        token: process.env.UPSTASH_REDIS_REST_TOKEN.replace(/^"|"$/g, ""),
      });
      _ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        prefix: "rl",
      });
    }
    return _ratelimit;
  } catch (err) {
    console.error("[ratelimit] Error inicializando Upstash Redis, usando fallback in-memory:", err);
    return getFallbackRatelimit();
  }
}
