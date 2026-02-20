/**
 * @jest-environment node
 */
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '../rate-limit';

describe('rate-limit', () => {
  describe('checkRateLimit', () => {
    it('allows requests within the limit', () => {
      const result = checkRateLimit('test-allow', { limit: 5, windowMs: 60_000 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('tracks remaining requests', () => {
      const key = 'test-track-' + Date.now();
      checkRateLimit(key, { limit: 3, windowMs: 60_000 });
      checkRateLimit(key, { limit: 3, windowMs: 60_000 });
      const result = checkRateLimit(key, { limit: 3, windowMs: 60_000 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('blocks requests over the limit', () => {
      const key = 'test-block-' + Date.now();
      checkRateLimit(key, { limit: 2, windowMs: 60_000 });
      checkRateLimit(key, { limit: 2, windowMs: 60_000 });
      const result = checkRateLimit(key, { limit: 2, windowMs: 60_000 });
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('uses default window of 60 seconds', () => {
      const key = 'test-default-window-' + Date.now();
      const result = checkRateLimit(key, { limit: 10 });
      expect(result.success).toBe(true);
    });
  });

  describe('getRateLimitKey', () => {
    it('uses x-forwarded-for header when present', () => {
      const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      const request = new Request('http://localhost/api/test', { headers });
      expect(getRateLimitKey(request, 'test-route')).toBe('test-route:1.2.3.4');
    });

    it('falls back to "unknown" when no IP header', () => {
      const request = new Request('http://localhost/api/test');
      expect(getRateLimitKey(request, 'my-route')).toBe('my-route:unknown');
    });
  });

  describe('rateLimitResponse', () => {
    it('returns a 429 response', async () => {
      const result = { success: false, remaining: 0, limit: 10 };
      const response = rateLimitResponse(result);
      expect(response.status).toBe(429);
    });

    it('includes rate limit headers', () => {
      const result = { success: false, remaining: 0, limit: 10 };
      const response = rateLimitResponse(result);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('returns JSON error body', async () => {
      const result = { success: false, remaining: 0, limit: 5 };
      const response = rateLimitResponse(result);
      const body = await response.json();
      expect(body.error).toContain('Too many requests');
    });
  });
});
