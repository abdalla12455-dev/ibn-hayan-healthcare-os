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
 *
 * ────────────────────────────────────────────────────────────────────
 * Request isolation (Strict Mode safety + authenticated-context safety)
 * ────────────────────────────────────────────────────────────────────
 *
 * React Strict Mode (development) and React 18+ concurrent rendering
 * (production) can both execute a component's `useEffect` body twice
 * for a single logical mount cycle. Without deduplication, the
 * `ClinicAdminOverview` component would call
 * `getClinicAdminOverview()` twice in rapid succession, producing
 * two backend `fetch` calls. Even though the component's `cancelled`
 * flag prevents the first response from being applied to UI state,
 * the first REQUEST still reaches the server. Two backend requests
 * for a single user navigation is a correctness bug: it can emit two
 * `clinic_admin.overview.viewed` successful-view audit events for
 * one navigation, double-count the request in any per-request
 * throttler, and waste server resources.
 *
 * An earlier revision of this client used a module-level in-flight
 * registry (`INFLIGHT_OVERVIEW_REQUESTS`) keyed by the canonical
 * request URL. That design successfully eliminated the Strict Mode
 * duplicate-fetch, but introduced a CROSS-CONTEXT ISOLATION RISK:
 * because the registry was keyed only by URL (the only varying
 * parameter of the GET request), the same in-flight Promise was
 * shared across every authenticated session, every tenant, every
 * organisation, every facility, every Role Preview state, and every
 * concurrently mounted Clinic Admin surface in the same browser tab.
 * A request started under one authenticated session could still be
 * pending when another session began, and the new session would
 * reuse the prior session's Promise — rendering the prior session's
 * response (administrator display name, tenant/organisation/facility
 * display names, and any future business metrics) under the new
 * authenticated context.
 *
 * The current design REMOVES the module-level registry entirely.
 * `getClinicAdminOverview()` now performs a fresh `fetch` on every
 * call. The deduplication responsibility has moved INTO the mounted
 * `ClinicAdminOverview` component, which owns a component-scoped
 * `useRef<Promise<...> | null>`. The ref:
 *
 * 1. Is created fresh for each mounted component instance (no
 *    sharing across components, no sharing across navigations).
 * 2. Survives the React Strict Mode effect replay (the component
 *    instance is NOT destroyed during Strict Mode cleanup — only
 *    the effect's cleanup function runs).
 * 3. Is reused for the second effect execution, so Strict Mode
 *    produces exactly ONE underlying `fetch` per mount cycle.
 * 4. Is cleared when the Promise settles (via `.finally()`), so a
 *    later navigation or an explicit retry produces a fresh request.
 * 5. Is cleared before an explicit retry (the retry handler sets
 *    the ref to `null` before incrementing `fetchTrigger`).
 * 6. Is destroyed on genuine unmount, so a later remount produces a
 *    fresh request.
 * 7. Does NOT cross authenticated contexts (each component instance
 *    owns its own ref; a new session/tenant/organisation/facility/
 *    Role Preview state produces a new component instance).
 *
 * This design satisfies the Strict Mode safety requirement (one
 * underlying fetch per mount cycle) WITHOUT introducing a
 * module-global registry that could share a Promise across
 * authenticated contexts.
 *
 * The client itself is now stateless: it holds no module-level
 * mutable state. All deduplication state lives inside the mounted
 * component's `useRef`.
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
 *
 * Every call to this function performs a fresh `fetch`. The function
 * holds NO module-level mutable state. Strict Mode deduplication is
 * the responsibility of the calling component, which owns a
 * component-scoped `useRef` to reuse the in-flight Promise across
 * the Strict Mode effect replay. See the docstring above for the
 * full rationale.
 */
export function getClinicAdminOverview(): Promise<ClinicAdminOverviewClientResult> {
  const url = joinUrl(getApiBaseUrl(), '/clinic-admin/overview');
  return performFetchOverview(url);
}

/**
 * Internal helper that performs the actual `fetch` and parses the
 * response. This function NEVER throws — every failure mode is
 * classified into a typed {@link ApiError} and returned as
 * `{ ok: false, error }`.
 */
async function performFetchOverview(
  url: string,
): Promise<ClinicAdminOverviewClientResult> {
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
