import {
  RolePreviewAvailabilityResponseSchema,
  BootstrapChallengeResponseSchema,
  SelectPreviewRoleRequestSchema,
  SelectPreviewRoleResponseSchema,
  CurrentPreviewRoleResponseSchema,
  EndPreviewRoleResponseSchema,
  type RolePreviewAvailabilityResponse,
  type BootstrapChallengeResponse,
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
 * session cookie AND the HttpOnly bootstrap cookie are sent with
 * every request. The raw session token and the raw bootstrap nonce
 * are NEVER stored in localStorage, sessionStorage, IndexedDB, or a
 * readable cookie — the browser holds them only in the HttpOnly
 * cookies, which JavaScript cannot read.
 *
 * The CSRF token is held in component memory only and is sent via
 * the `X-CSRF-Token` header on the session-bound switching flow.
 * The logged-out bootstrap flow does NOT require a CSRF token; the
 * bootstrap cookie (SameSite=Strict) is the CSRF defense.
 *
 * Per the Secure Logged-Out Demo Role Bootstrap specification:
 * - The feature is **development-only**. The backend returns 404
 *   when the feature is disabled; this client surfaces that as an
 *   `HTTP_ERROR` with `statusCode: 404`. The frontend renders the
 *   safe unavailable result.
 * - The client NEVER sends `userId`, `membershipId`, `tenantId`,
 *   `organisationId`, `facilityId`, permission codes, role
 *   assignments, session IDs, password hashes, or the raw bootstrap
 *   nonce to the backend. The select request carries only the
 *   canonical role code and the opaque `challengeId`.
 * - The client never receives any credential material in the
 *   response. The raw session token lives only in the HttpOnly
 *   cookie. The raw bootstrap nonce lives only in the HttpOnly
 *   bootstrap cookie.
 *
 * Design constraints (mirrors `auth.client.ts` and
 * `context.client.ts`):
 * - Uses the platform `fetch` API — no Axios or other HTTP library.
 * - Does not expose raw network errors, URLs, stack traces, or
 *   response bodies to the UI.
 * - Does not persist session, CSRF, or bootstrap values in browser
 *   storage.
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
 * Request a one-time bootstrap challenge for the logged-out
 * preview flow.
 *
 * Sends `GET /api/v1/dev/role-preview/bootstrap` with
 * `credentials: 'include'`. The server sets the HttpOnly bootstrap
 * cookie (carrying the raw nonce) in the same response; the
 * response body carries only safe challenge metadata
 * (`challengeId`, `expiresInMs`).
 *
 * Returns `{ ok: false, error: { statusCode: 404 } }` when the
 * feature is disabled.
 * Returns `{ ok: false, error: { statusCode: 403 } }` when the
 * Origin is disallowed or the database-identity gate failed.
 */
export async function requestRolePreviewBootstrap(): Promise<
  RolePreviewClientResult<BootstrapChallengeResponse>
> {
  const url = joinUrl(getApiBaseUrl(), '/dev/role-preview/bootstrap');

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

  const result = BootstrapChallengeResponseSchema.safeParse(body);
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
 * `credentials: 'include'`. Supports TWO flows:
 *
 * 1. **Logged-out bootstrap flow.** When `challengeId` is supplied,
 *    the request body carries `{ roleCode, challengeId }` and NO
 *    `X-CSRF-Token` header. The HttpOnly bootstrap cookie (set by
 *    `requestRolePreviewBootstrap()`) is auto-attached by the
 *    browser. The server verifies the challenge, consumes it
 *    (one-time), creates the first preview session, sets the
 *    HttpOnly application-session cookie, and clears the bootstrap
 *    cookie.
 *
 * 2. **Session-bound switching flow.** When `challengeId` is NOT
 *    supplied, the request body carries `{ roleCode }` and the
 *    `X-CSRF-Token` header is set from the supplied `csrfToken`.
 *    The server requires an existing session cookie and a valid
 *    CSRF token.
 *
 * Returns `{ ok: false, error: { statusCode: 404 } }` when the
 * feature is disabled.
 * Returns `{ ok: false, error: { statusCode: 401 } }` when the
 * session is missing (session-bound flow only).
 * Returns `{ ok: false, error: { statusCode: 403 } }` when the
 * Origin is disallowed, the CSRF token is missing/invalid
 * (session-bound flow only), the bootstrap challenge is
 * expired/replay/invalid (bootstrap flow only), the database-
 * identity gate fails (bootstrap flow only), or the role code is
 * unknown.
 */
export async function selectPreviewRole(
  csrfToken: string | null,
  roleCode: SelectPreviewRoleRequest['roleCode'],
  challengeId?: string,
): Promise<RolePreviewClientResult<SelectPreviewRoleResponse>> {
  // Build the request body via the Zod schema so that any
  // additional field is rejected at the boundary.
  const bodyInput: { roleCode: string; challengeId?: string } = { roleCode };
  if (challengeId !== undefined) {
    bodyInput.challengeId = challengeId;
  }
  const inputResult = SelectPreviewRoleRequestSchema.safeParse(bodyInput);
  if (!inputResult.success) {
    return { ok: false, error: contractInvalidError(inputResult.error) };
  }

  const url = joinUrl(getApiBaseUrl(), '/dev/role-preview/select');

  // Build the headers. The CSRF header is included only for the
  // session-bound switching flow (no challengeId).
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (challengeId === undefined) {
    if (csrfToken === null) {
      // Session-bound flow requires a CSRF token.
      return {
        ok: false,
        error: contractInvalidError(new Error('CSRF token is required for the session-bound switching flow.')),
      };
    }
    headers['X-CSRF-Token'] = csrfToken;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
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
