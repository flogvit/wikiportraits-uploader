/**
 * @jest-environment node
 */
import { fetchWithTimeout, TOKEN_TIMEOUT_MS, UPLOAD_TIMEOUT_MS } from '../fetch-utils';

describe('fetch-utils', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(new Response('ok'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('fetchWithTimeout', () => {
    it('calls fetch with the given URL', async () => {
      await fetchWithTimeout('http://example.com');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://example.com',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('passes through request options', async () => {
      await fetchWithTimeout('http://example.com', {
        method: 'POST',
        body: 'data',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://example.com',
        expect.objectContaining({
          method: 'POST',
          body: 'data',
        })
      );
    });

    it('returns the fetch response', async () => {
      const mockResponse = new Response('hello');
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      const result = await fetchWithTimeout('http://example.com');
      expect(result).toBe(mockResponse);
    });

    it('aborts on timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        (_url: string, opts: RequestInit) =>
          new Promise((_resolve, reject) => {
            opts.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          })
      );

      await expect(
        fetchWithTimeout('http://example.com', { timeoutMs: 50 })
      ).rejects.toThrow();
    });
  });

  describe('exported constants', () => {
    it('exports TOKEN_TIMEOUT_MS', () => {
      expect(TOKEN_TIMEOUT_MS).toBe(10_000);
    });

    it('exports UPLOAD_TIMEOUT_MS', () => {
      expect(UPLOAD_TIMEOUT_MS).toBe(120_000);
    });
  });
});
