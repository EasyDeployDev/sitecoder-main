// Lightweight in-memory rate limiter for auth endpoints. Single-instance
// deployments (Koyeb small) are the current target; for multi-instance or
// edge deployments this should be backed by Redis / KV.
type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

function nowMs() {
  return Date.now();
}

function prune() {
  const now = nowMs();
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  opts: { maxAttempts: number; windowMs: number },
): RateLimitResult {
  prune();

  const now = nowMs();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + opts.windowMs,
    });
    return { ok: true, remaining: opts.maxAttempts - 1 };
  }

  if (existing.count >= opts.maxAttempts) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true, remaining: opts.maxAttempts - existing.count };
}

export function authRateLimit(identifier: string): RateLimitResult {
  // 10 attempts per 15-minute window per identifier. Tight enough to
  // defeat casual brute force / credential stuffing, loose enough that a
  // single typo-heavy user won't get permanently locked out.
  return rateLimit(identifier, { maxAttempts: 10, windowMs: 15 * 60 * 1000 });
}
