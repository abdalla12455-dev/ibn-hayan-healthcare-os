import {
  LoginRequestSchema,
  SessionResponseSchema,
  CsrfResponseSchema,
  LogoutResponseSchema,
  type LoginRequest,
  type SessionResponse,
  type CsrfResponse,
  type LogoutResponse,
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
 * Typed client for the authentication API.
 *
 * All authentication requests use `credentials: 'include'` so that the
 * HttpOnly session cookie is sent with every request. The raw session
 * token is NEVER stored in localStorage, sessionStorage, or a readable
 * cookie — the browser holds it only in the HttpOnly cookie, which
 * JavaScript cannot read.
 *
 * The CSRF token is returned by `getCsrfToken()` and held in component
 * memory only. It is sent back via the `X-CSRF-Token` header on
 * logout.
 *
 * Every successful response is parsed through the corresponding shared
 * Zod schema. Every failure mode is classified into a typed
 * {@link ApiError} category so the UI can render an appropriate
 * message without exposing raw error details.
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. The API returns a generic 401 for all login failures; this
 * client surfaces that as an `HTTP_ERROR` with `statusCode: 401`.
 *
 * Design constraints:
 * - Uses the platform `fetch` API — no Axios or other HTTP library.
 * - Does not expose raw network errors, URLs, stack traces, or
 *   response bodies to the UI.
 * - Does not persist session or CSRF values in browser storage.
 */

export type AuthClientResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Login with email and password.
 *
 * Sends `POST /api/v1/auth/login` with `credentials: 'include'`. On
 * success, the API sets the HttpOnly session cookie and returns the
 * session response (user, memberships, expiry). The raw session token
 * is NEVER returned in the JSON body — it lives only in the cookie.
 *
 * On failure, returns `{ ok: false, error }` with the appropriate
 * `ApiError` category. A 401 response indicates invalid credentials
 * (the API does not distinguish between unknown email, wrong
 * password, disabled user, or no active membership).
 */
export async function login(
  input: LoginRequest,
): Promise<AuthClientResult<SessionResponse>> {
  // Validate the input through the shared Zod contract before
  // sending. This catches client-side mistakes early.
  const inputResult = LoginRequestSchema.safeParse(input);
  if (!inputResult.success) {
    return { ok: false, error: contractInvalidError(inputResult.error) };
  }

  const url = joinUrl(getApiBaseUrl(), '/auth/login');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
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

  const result = SessionResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Get the current session.
 *
 * Sends `GET /api/v1/auth/session` with `credentials: 'include'`.
 * The API reads the HttpOnly cookie, validates the session, and
 * returns the session response. If the session was rotated during
 * validation, the API sets a new cookie automatically.
 *
 * Returns `{ ok: false, error: { statusCode: 401 } }` if the session
 * is missing, expired, or revoked.
 */
export async function getSession(): Promise<AuthClientResult<SessionResponse>> {
  const url = joinUrl(getApiBaseUrl(), '/auth/session');

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

  const result = SessionResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Get a CSRF token.
 *
 * Sends `GET /api/v1/auth/csrf` with `credentials: 'include'`.
 * Returns the raw CSRF token in the JSON body. The caller holds this
 * token in component memory only (never in browser storage) and sends
 * it back via the `X-CSRF-Token` header on logout.
 *
 * Returns `{ ok: false, error: { statusCode: 401 } }` if the session
 * is missing, expired, or revoked.
 */
export async function getCsrfToken(): Promise<AuthClientResult<CsrfResponse>> {
  const url = joinUrl(getApiBaseUrl(), '/auth/csrf');

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

  const result = CsrfResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}

/**
 * Logout.
 *
 * Sends `POST /api/v1/auth/logout` with `credentials: 'include'` and
 * the `X-CSRF-Token` header. The API verifies the Origin and the CSRF
 * token, revokes the server-side session, and clears the cookie.
 *
 * Returns `{ ok: false, error }` with `statusCode: 401` if the
 * session is missing, or `statusCode: 403` if the CSRF token is
 * missing/invalid or the Origin is disallowed.
 */
export async function logout(
  csrfToken: string,
): Promise<AuthClientResult<LogoutResponse>> {
  const url = joinUrl(getApiBaseUrl(), '/auth/logout');

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

  const result = LogoutResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}
