/**
 * Best-effort per-isolate rate limiter.
 * Cloudflare isolates are ephemeral; this softens bursts but is not a global quota.
 * Pair with Cloudflare WAF / Rate Limiting rules in production for hard limits.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

/** Returns true when the request is within the allowed rate. */
export function allowRequest(key: string, now = Date.now()): boolean {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_PER_WINDOW) {
    return false;
  }
  existing.count += 1;
  return true;
}

/** Test helper — clears in-memory state between tests. */
export function resetRateLimitState(): void {
  buckets.clear();
}
