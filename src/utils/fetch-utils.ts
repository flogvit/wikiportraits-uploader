/**
 * Fetch wrapper with AbortController timeout support.
 */

const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
const TOKEN_TIMEOUT_MS = 10_000;   // 10 seconds for token requests
const UPLOAD_TIMEOUT_MS = 120_000; // 2 minutes for uploads

export { TOKEN_TIMEOUT_MS, UPLOAD_TIMEOUT_MS };

export function fetchWithTimeout(
  url: string | URL | RequestInfo,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const existingSignal = fetchOptions.signal;

  // If caller already provided a signal, combine them
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort(existingSignal.reason));
  }

  const timeoutId = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);

  return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}
