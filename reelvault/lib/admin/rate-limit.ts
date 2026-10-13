// Fixed-window attempt limiter for the login form. In-memory: per server instance, resets on restart (serverless
// deployments get a weaker guarantee; Supabase also rate-limits password sign-ins on its side).

export interface Limiter {
  /** Records an attempt. ok=false once `max` attempts were made inside the window. */
  hit(key: string, now?: number): { ok: boolean; retryAfterSeconds: number };
  reset(key: string): void;
}

export function createLimiter(max: number, windowMs: number): Limiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(key, now = Date.now()) {
      if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      const b = buckets.get(key);
      if (!b || b.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfterSeconds: 0 };
      }
      b.count += 1;
      return { ok: b.count <= max, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}
