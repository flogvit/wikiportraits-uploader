/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach per IP address.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 5 * 60_000);

interface RateLimitConfig {
  /** Max requests in the window */
  limit: number;
  /** Window size in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowMs = 60_000 } = config;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    return { success: false, remaining: 0, limit };
  }

  entry.timestamps.push(now);
  return { success: true, remaining: limit - entry.timestamps.length, limit };
}

/**
 * Get a rate limit key from a Request object (uses IP or forwarded-for header).
 */
export function getRateLimitKey(request: Request, routeName: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${routeName}:${ip}`;
}

/**
 * Create a 429 Too Many Requests response.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'Retry-After': '60',
      },
    }
  );
}
