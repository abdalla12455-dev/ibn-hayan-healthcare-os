import {
  ContextResponseSchema,
  ClearTenantContextResponseSchema,
  type ContextResponse,
  type ClearTenantContextResponse,
} from '@ibn-hayan/contracts';
import {
  contractInvalidError,
  httpError,
  invalidJsonError,
  networkError,
  type ApiError,
} from '../api-error';
import { getApiBaseUrl, joinUrl } from '../api-url';

/**
 * Typed client for the session-context API.
 *
 * All context requests use `credentials: 'include'` so that the
 * HttpOnly session cookie is sent with every request. The raw
 * session token is NEVER stored in localStorage, sessionStorage,
 * IndexedDB, or a readable cookie — the browser holds it only in
 * the HttpOnly cookie, which JavaScript cannot read.
 *
 * The CSRF token is held in component memory only and is sent via
 * the `X-CSRF-Token` header on PUT and DELETE.
 *
 * Every successful response is parsed through the corresponding
 * shared Zod schema. Every failure mode is classified into a typed
 * {@link ApiError} category so the UI can render an appropriate
 * message without exposing raw error details.
 *
 * Per the fifth canonical batch specification:
 * - Context may exist only in React state and server-side session
 *   state. The client MUST NOT persist context or CSRF values in
 *   localStorage, sessionStorage, IndexedDB, or readable cookies.
 * - Selection is by `membershipId`, never by an arbitrary Tenant ID.
 *
 * Design constraints (mirrors `auth.client.ts`):
 * - Uses the platform `fetch` API — no Axios or other HTTP library.
 * - Does not expose raw network errors, URLs, stack traces, or
 *   response bodies to the UI.
 * - Does not persist session or CSRF values in browser storage.
 */

export type ContextClientResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Get the current context (available options + active context).
 *
 * Sends `GET /api/v1/context` with `credentials: 'include'`.
 *
 * Returns `{ ok: false, error: { statusCode: 401 } }` if the
 * session is missing, expired, or revoked.
 */
export async function getContext(): Promise<ContextClientResult<ContextResponse>> {
  const url = joinUrl(getApiBaseUrl(), '/context');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
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

  const result = ContextResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Select a TenantMembership as the active context.
 *
 * Sends `PUT /api/v1/context/tenant` with `credentials: 'include'`,
 * the `X-CSRF-Token` header, and a JSON body containing the
 * `membershipId` to select.
 *
 * Returns the updated `ContextResponse` on success.
 *
 * Returns `{ ok: false, error: { statusCode: 401 } }` if the session
 * is missing, expired, or revoked.
 * Returns `{ ok: false, error: { statusCode: 403 } }` if the Origin
 * is disallowed, the CSRF token is missing/invalid, or the selection
 * is forbidden (the membership does not exist, belongs to a
 * different user, is suspended, or belongs to a suspended Tenant).
 *
 * The caller obtains a fresh CSRF token immediately before calling
 * this function (typically via `getCsrfToken()` from the auth
 * client). The CSRF token is held in component memory only; it is
 * never persisted to browser storage.
 */
export async function selectTenantContext(
  membershipId: string,
  csrfToken: string,
): Promise<ContextClientResult<ContextResponse>> {
  const url = joinUrl(getApiBaseUrl(), '/context/tenant');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ membershipId }),
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

  const result = ContextResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Clear the active Tenant context.
 *
 * Sends `DELETE /api/v1/context/tenant` with `credentials: 'include'`
 * and the `X-CSRF-Token` header. No request body.
 *
 * Returns the strict clear response (`{ ok: true, active: null }`)
 * on success.
 *
 * Returns `{ ok: false, error: { statusCode: 401 } }` if the session
 * is missing, expired, or revoked.
 * Returns `{ ok: false, error: { statusCode: 403 } }` if the Origin
 * is disallowed or the CSRF token is missing/invalid.
 *
 * The caller obtains a fresh CSRF token immediately before calling
 * this function.
 */
export async function clearTenantContext(
  csrfToken: string,
): Promise<ContextClientResult<ClearTenantContextResponse>> {
  const url = joinUrl(getApiBaseUrl(), '/context/tenant');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
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

  const result = ClearTenantContextResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}
