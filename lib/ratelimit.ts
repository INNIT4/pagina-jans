import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _ratelimit: Ratelimit | null = null;

export function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
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
    console.error("[ratelimit] Error inicializando Upstash Redis:", err);
    return null; // Si falla, simplemente no se aplica rate limiting
  }
}
