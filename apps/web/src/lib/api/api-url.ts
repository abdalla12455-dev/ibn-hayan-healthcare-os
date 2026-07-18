/**
 * Safe resolution of the API base URL for the web client.
 *
 * The base URL is read only from `NEXT_PUBLIC_API_BASE_URL`, with a safe
 * development fallback of `http://localhost:3001/api/v1`. The value is
 * normalised to remove any accidental trailing slash so that
 * concatenation with a path (e.g. `/health`) never produces a double
 * slash.
 *
 * Per ADR-012, the web application is a thin client that consumes
 * published API contracts. It reads no environment secrets; the
 * `NEXT_PUBLIC_` prefix ensures the value is safe to expose to the
 * browser.
 */

const DEVELOPMENT_FALLBACK = 'http://localhost:3001/api/v1';

/**
 * Returns the normalised API base URL.
 *
 * Normalisation rules:
 * 1. If `NEXT_PUBLIC_API_BASE_URL` is set and non-empty, use it.
 * 2. Otherwise, use `http://localhost:3001/api/v1`.
 * 3. Trim leading whitespace.
 * 4. Remove any trailing slash so that path concatenation is safe.
 *
 * This function does NOT read `process.env` at module-evaluation time
 * when called from the test suite; tests can mock `process.env` before
 * calling `getApiBaseUrl()`.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  const value =
    raw !== undefined && raw.length > 0 ? raw : DEVELOPMENT_FALLBACK;
  return normaliseBaseUrl(value);
}

/**
 * Normalises a base URL by trimming whitespace and removing trailing
 * slashes. Leading slashes are preserved (they are part of the path).
 *
 * Exported separately so that unit tests can verify the normalisation
 * logic without mocking `process.env`.
 */
export function normaliseBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return DEVELOPMENT_FALLBACK;
  }
  // Remove one or more trailing slashes so path concatenation is safe.
  return trimmed.replace(/\/+$/, '');
}

/**
 * Joins a base URL and a path, ensuring exactly one slash between them.
 * The path must start with `/` (e.g. `/health`).
 */
export function joinUrl(baseUrl: string, path: string): string {
  const base = normaliseBaseUrl(baseUrl);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
