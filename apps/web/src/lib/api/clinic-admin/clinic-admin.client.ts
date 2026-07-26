import {
  ClinicAdminOverviewResponseSchema,
  type ClinicAdminOverviewResponse,
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
 * Typed client for the Clinic Admin Overview API.
 *
 * All clinic-admin requests use `credentials: 'include'` so that the
 * HttpOnly session cookie is sent with every request. The raw
 * session token is NEVER stored in localStorage, sessionStorage,
 * IndexedDB, or a readable cookie — the browser holds it only in
 * the HttpOnly cookie, which JavaScript cannot read.
 *
 * The Clinic Admin Overview endpoint is a GET; no CSRF token is
 * required (read-only operation, per the existing pattern in
 * `apps/web/src/lib/api/context/context.client.ts`).
 *
 * Every successful response is parsed through the shared Zod schema
 * `ClinicAdminOverviewResponseSchema`. Every failure mode is
 * classified into a typed {@link ApiError} category so the UI can
 * render an appropriate message without exposing raw error details.
 *
 * Per the live-data task specification Phase 6, the client does
 * NOT:
 * - persist the response in browser storage;
 * - supply tenant, organisation, or facility identifiers in the
 *   request body or query string;
 * - expose raw network errors, URLs, stack traces, or response
 *   bodies to the UI.
 *
 * Per the live-data task specification Phase 6, the client MUST
 * surface the following result states to the calling component:
 * - loading (the calling component sets this before invoking the
 *   client);
 * - success with data (`{ ok: true, data }`);
 * - authorisation failure (`{ ok: false, error: { statusCode: 403 } }`);
 * - session expiration (`{ ok: false, error: { statusCode: 401 } }`);
 * - server failure (`{ ok: false, error: { statusCode: 5xx } }`);
 * - network failure (`{ ok: false, error: { category: 'NETWORK_ERROR' } }`);
 * - contract invalid (`{ ok: false, error: { category: 'CONTRACT_INVALID' } }`).
 *
 * The calling component decides how to render each state. The
 * client does NOT render anything itself.
 */

export type ClinicAdminOverviewClientResult =
  | { readonly ok: true; readonly data: ClinicAdminOverviewResponse }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Fetch the Clinic Administrator Overview payload for the
 * authenticated session's active tenant, organisation, and
 * facility context.
 *
 * Sends `GET /api/v1/clinic-admin/overview` with
 * `credentials: 'include'`.
 *
 * Returns `{ ok: false, error: { statusCode: 401 } }` if the
 * session is missing, expired, or revoked.
 * Returns `{ ok: false, error: { statusCode: 403 } }` if the
 * principal does not hold the `clinic_admin_overview:view`
 * permission (i.e. is not R09_ADMINISTRATOR) OR if the active
 * tenant/organisation/facility context is missing or invalid.
 * Returns `{ ok: false, error: { category: 'NETWORK_ERROR' } }` if
 * the network request fails.
 * Returns `{ ok: false, error: { category: 'CONTRACT_INVALID' } }`
 * if the response fails Zod validation.
 */
export async function getClinicAdminOverview(): Promise<ClinicAdminOverviewClientResult> {
  const url = joinUrl(getApiBaseUrl(), '/clinic-admin/overview');

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

  const result = ClinicAdminOverviewResponseSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: contractInvalidError(result.error) };
  }

  return { ok: true, data: result.data };
}
