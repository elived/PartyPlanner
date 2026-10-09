import "server-only";

/**
 * Fixed-window rate limiting with two backends.
 *
 *  - **Redis (Upstash REST)** when `UPSTASH_REDIS_REST_URL` and
 *    `UPSTASH_REDIS_REST_TOKEN` are set. This is the one that actually works
 *    once the app is deployed globally: serverless functions and horizontally
 *    scaled containers each get their own process, so a per-process counter
 *    means an attacker's real budget is `limit × instances`. A shared counter
 *    is the only way to state a limit and mean it.
 *
 *  - **In-memory** otherwise. Correct for a single long-lived process, and the
 *    right default for development — it needs no infrastructure.
 *
 * If Redis is configured but unreachable, we fall back to the in-memory counter
 * for that call rather than failing the request. Rate limiting is a protective
 * measure; it must not become the reason an RSVP cannot be submitted.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Bound the map so a flood of unique keys cannot grow it without limit.
const MAX_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
  // Still full of live windows: drop the oldest to keep memory bounded.
  if (buckets.size >= MAX_KEYS) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of oldest.slice(0, Math.floor(MAX_KEYS / 4))) buckets.delete(key);
  }
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) sweep(now);
    const window: Window = { count: 1, resetAt: now + windowMs };
    buckets.set(key, window);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt: window.resetAt,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  return {
    success: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

// ---------------------------------------------------------------------------
// Redis backend
// ---------------------------------------------------------------------------

type RedisClient = { incr: (k: string) => Promise<number>; expire: (k: string, s: number) => Promise<unknown> };

let redisPromise: Promise<RedisClient | null> | null = null;

function getRedis(): Promise<RedisClient | null> {
  if (redisPromise) return redisPromise;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisPromise = Promise.resolve(null);
    return redisPromise;
  }

  redisPromise = import("@upstash/redis")
    .then(({ Redis }) => new Redis({ url, token }) as unknown as RedisClient)
    .catch((error) => {
      console.error("[rate-limit] could not initialise Redis:", error);
      return null;
    });

  return redisPromise;
}

async function redisLimit(
  client: RedisClient,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSeconds = Math.ceil(windowMs / 1000);
  // Bucket the key by window so the counter resets without a scheduled job and
  // the TTL is only a safety net for cleanup.
  const bucket = Math.floor(Date.now() / windowMs);
  const namespaced = `pp:rl:${key}:${bucket}`;

  const count = await client.incr(namespaced);
  if (count === 1) {
    // Only the first caller in a window pays for the EXPIRE round-trip.
    await client.expire(namespaced, windowSeconds + 1);
  }

  const resetAt = (bucket + 1) * windowMs;
  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

// ---------------------------------------------------------------------------

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const client = await getRedis();
  if (!client) return memoryLimit(key, limit, windowMs);

  try {
    return await redisLimit(client, key, limit, windowMs);
  } catch (error) {
    console.error("[rate-limit] Redis call failed, falling back to memory:", error);
    return memoryLimit(key, limit, windowMs);
  }
}

/** Headers that tell a well-behaved client when to come back. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "ratelimit-limit": String(result.limit),
    "ratelimit-remaining": String(result.remaining),
    "ratelimit-reset": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
    ...(result.success ? {} : { "retry-after": String(result.retryAfterSeconds) }),
  };
}

/**
 * Best-effort client identity.
 *
 * `x-forwarded-for` is trivially spoofable when the app is exposed directly, so
 * this is only meaningful behind a proxy that overwrites the header — Vercel,
 * Cloudflare, nginx with `proxy_set_header`. The left-most entry is then the
 * real client. `TRUSTED_PROXY_HEADER` lets you name a platform header that
 * cannot be forged end-to-end (e.g. `cf-connecting-ip`) instead.
 */
export function clientKey(request: Request, scope: string): string {
  const preferred = process.env.TRUSTED_PROXY_HEADER;
  const ip =
    (preferred ? request.headers.get(preferred) : null) ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}
