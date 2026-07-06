import { NextResponse } from "next/server";

// In-memory sliding-window rate limiter. This app runs as a single Node
// process (see docker-compose.yml), so per-process state covers the whole
// instance. State resets on restart, which is acceptable for abuse throttling.

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until a retry could succeed; 0 when ok. */
  retryAfterSeconds: number;
}

// Per-key timestamps of requests still inside their window.
const buckets = new Map<string, number[]>();

// Longest window used anywhere; timestamps older than this are dead weight.
const MAX_WINDOW_MS = 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    const live = hits.filter((t) => t > now - MAX_WINDOW_MS);
    if (live.length === 0) buckets.delete(key);
    else buckets.set(key, live);
  }
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  sweep(now);
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP: first hop of x-forwarded-for (set by the reverse
 * proxy), else x-real-ip. Falls back to a shared key, which just means
 * stricter limiting when no proxy headers exist. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse({ retryAfterSeconds }: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: `Too many attempts. Try again in ${retryAfterSeconds} seconds.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

/** Test hook — clears all limiter state. */
export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}
