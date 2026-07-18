import { HealthResponseSchema, type HealthResponse } from '@ibn-hayan/contracts';
import {
  contractInvalidError,
  httpError,
  invalidJsonError,
  networkError,
  type ApiError,
} from './api-error';
import { getApiBaseUrl, joinUrl } from './api-url';

/**
 * Typed client for the health endpoint.
 *
 * Requests `GET /health` from the API, parses the response as JSON, and
 * validates it against the shared Zod schema
 * ({@link HealthResponseSchema}). Every failure mode is classified into
 * a typed {@link ApiError} category so the UI can render an appropriate
 * message without exposing raw error details.
 *
 * Design constraints:
 * - Uses the platform `fetch` API — no Axios or other HTTP library.
 * - Does not call the API during Next.js build-time static generation.
 *   The caller (the `ApiStatus` component) invokes this function only in
 *   a `useEffect` after the component mounts in the browser.
 * - Does not expose raw network errors, URLs, stack traces, or response
 *   bodies to the UI. The returned `ApiError` carries a category and a
 *   generic message; the raw error detail is discarded.
 */

export type HealthClientResult =
  | { readonly ok: true; readonly data: HealthResponse }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Fetches the health endpoint and validates the response.
 *
 * @returns A typed result: either `{ ok: true, data }` on success, or
 *          `{ ok: false, error }` on any failure. This function never
 *          throws.
 */
export async function fetchHealth(): Promise<HealthClientResult> {
  const url = joinUrl(getApiBaseUrl(), '/health');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    return { ok: false, error: networkError(error) };
  }

  if (!response.ok) {
    return { ok: false, error: httpError(response.status) };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    return { ok: false, error: invalidJsonError(error) };
  }

  const result = HealthResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}
