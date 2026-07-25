import {
  RolePreviewAvailabilityResponseSchema,
  SelectPreviewRoleRequestSchema,
  SelectPreviewRoleResponseSchema,
  CurrentPreviewRoleResponseSchema,
  EndPreviewRoleResponseSchema,
  type RolePreviewAvailabilityResponse,
  type SelectPreviewRoleRequest,
  type SelectPreviewRoleResponse,
  type CurrentPreviewRoleResponse,
  type EndPreviewRoleResponse,
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
 * Typed client for the Demo Role Preview Mode API.
 *
 * All requests use `credentials: 'include'` so that the HttpOnly
 * session cookie is sent with every request. The raw session token
 * is NEVER stored in localStorage, sessionStorage, IndexedDB, or a
 * readable cookie — the browser holds it only in the HttpOnly
 * cookie, which JavaScript cannot read.
 *
 * The CSRF token is held in component memory only and is sent via
 * the `X-CSRF-Token` header on POST requests.
 *
 * Per the Demo Role Preview Mode v1 specification:
 * - The feature is **development-only**. The backend returns 404
 *   when the feature is disabled; this client surfaces that as an
 *   `HTTP_ERROR` with `statusCode: 404`. The frontend renders the
 *   safe unavailable result.
 * - The client NEVER sends `userId`, `membershipId`, `tenantId`,
 *   `organisationId`, `facilityId`, permission codes, role
 *   assignments, session IDs, or password hashes to the backend.
 *   The select request carries only the canonical role code.
 * - The client never receives any credential material in the
 *   response. The raw session token lives only in the HttpOnly
 *   cookie.
 *
 * Design constraints (mirrors `auth.client.ts` and
 * `context.client.ts`):
 * - Uses the platform `fetch` API — no Axios or other HTTP library.
 * - Does not expose raw network errors, URLs, stack traces, or
 *   response bodies to the UI.
 * - Does not persist session or CSRF values in browser storage.
 */

export type RolePreviewClientResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Get the role-preview availability response.
 *
 * Sends `GET /api/v1/dev/role-preview` with `credentials: 'include'`.
 *
 * Returns `{ ok: false, error: { statusCode: 404 } }` when the
 * feature is disabled (production or flag off).
 */
export async function getRolePreviewAvailability(): Promise<
  RolePreviewClientResult<RolePreviewAvailabilityResponse>
> {
  const url = joinUrl(getApiBaseUrl(), '/dev/role-preview');

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

  const result = RolePreviewAvailabilityResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Get the current preview role metadata.
 *
 * Sends `GET /api/v1/dev/role-preview/current` with
 * `credentials: 'include'`.
 *
 * Returns `{ ok: false, error: { statusCode: 404 } }` when the
 * feature is disabled.
 * Returns `{ ok: false, error: { statusCode: 401 } }` when the
 * session is missing, expired, or revoked.
 */
export async function getCurrentPreviewRole(): Promise<
  RolePreviewClientResult<CurrentPreviewRoleResponse>
> {
  const url = joinUrl(getApiBaseUrl(), '/dev/role-preview/current');

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

  const result = CurrentPreviewRoleResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Select a canonical role for the preview session.
 *
 * Sends `POST /api/v1/dev/role-preview/select` with
 * `credentials: 'include'` and the `X-CSRF-Token` header. The API
 * verifies the Origin and the CSRF token, creates a fresh preview
 * session for the corresponding preview identity, establishes the
 * preview tenant/organisation/facility context, revokes the
 * previous session atomically, and sets the new HttpOnly cookie.
 *
 * Returns `{ ok: false, error: { statusCode: 404 } }` when the
 * feature is disabled.
 * Returns `{ ok: false, error: { statusCode: 401 } }` when the
 * session is missing.
 * Returns `{ ok: false, error: { statusCode: 403 } }` when the
 * Origin is disallowed, the CSRF token is missing/invalid, or the
 * role code is unknown.
 */
export async function selectPreviewRole(
  csrfToken: string,
  roleCode: SelectPreviewRoleRequest['roleCode'],
): Promise<RolePreviewClientResult<SelectPreviewRoleResponse>> {
  const inputResult = SelectPreviewRoleRequestSchema.safeParse({ roleCode });
  if (!inputResult.success) {
    return { ok: false, error: contractInvalidError(inputResult.error) };
  }

  const url = joinUrl(getApiBaseUrl(), '/dev/role-preview/select');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify(inputResult.data),
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

  const result = SelectPreviewRoleResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * End the current preview session.
 *
 * Sends `POST /api/v1/dev/role-preview/end` with
 * `credentials: 'include'` and the `X-CSRF-Token` header. The API
 * verifies the Origin and the CSRF token, revokes the preview
 * session, and clears the cookie.
 *
 * Returns `{ ok: false, error: { statusCode: 404 } }` when the
 * feature is disabled.
 * Returns `{ ok: false, error: { statusCode: 401 } }` when the
 * session is missing.
 * Returns `{ ok: false, error: { statusCode: 403 } }` when the
 * Origin is disallowed, the CSRF token is missing/invalid, or the
 * session is not a preview session.
 */
export async function endPreviewRole(
  csrfToken: string,
): Promise<RolePreviewClientResult<EndPreviewRoleResponse>> {
  const url = joinUrl(getApiBaseUrl(), '/dev/role-preview/end');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
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

  const result = EndPreviewRoleResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}
