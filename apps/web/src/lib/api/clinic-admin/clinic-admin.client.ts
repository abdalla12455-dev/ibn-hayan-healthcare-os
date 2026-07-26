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
 * In-flight request deduplication (Strict Mode safety)
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
 * To eliminate this risk, the client maintains a tiny in-flight
 * promise registry (`INFLIGHT_OVERVIEW_REQUESTS`). The registry is
 * a `Map<string, Promise<ClinicAdminOverviewClientResult>>` keyed
 * by the canonical request URL (the only varying parameter of the
 * GET request). The registry:
 *
 * 1. Reuses the same Promise for concurrent identical Overview
 *    requests. Two concurrent `getClinicAdminOverview()` calls
 *    share the same underlying `fetch` and the same parsed result.
 * 2. Makes exactly one underlying `fetch` call per in-flight
 *    Promise. The `fetch` is initiated eagerly when the first
 *    caller requests the data; subsequent callers receive the
 *    same Promise without triggering a new `fetch`.
 * 3. Removes the cached in-flight Promise after it settles
 *    (success OR failure). A later navigation/retry can make a
 *    fresh request.
 * 4. Allows an explicit retry after failure to make a fresh
 *    request. Because the failed Promise is removed from the
 *    registry when it settles, the next `getClinicAdminOverview()`
 *    call starts a new `fetch`.
 * 5. Avoids persistent stale-data caching. The registry holds
 *    Promises only while they are in flight; it never holds
 *    resolved data. A successful response is removed from the
 *    registry the moment it resolves, so a later navigation makes
 *    a fresh request.
 * 6. Avoids storing tenant, organisation, or facility identifiers
 *    in the browser. The registry key is the request URL only
 *    (`/clinic-admin/overview` relative to the API base URL); no
 *    business identifiers are stored.
 * 7. Adds NO dependency. The registry is a plain module-level
 *    `Map`.
 * 8. Does NOT change the backend contract. The client's external
 *    signature is unchanged.
 * 9. Does NOT create global business-data state. The registry is
 *    request-Promises only, never business data.
 *
 * The registry is module-level (not exported). It is shared across
 * all callers in the same browser tab, which is the desired
 * behaviour: if two `ClinicAdminOverview` components mount
 * concurrently (e.g. during a route transition), they share the
 * same in-flight Overview load.
 *
 * The registry is NOT a cache. It does not survive the Promise
 * settling. It exists ONLY to prevent duplicate `fetch` calls for
 * the same in-flight request.
 */

export type ClinicAdminOverviewClientResult =
  | { readonly ok: true; readonly data: ClinicAdminOverviewResponse }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Module-level registry of in-flight Overview request Promises.
 *
 * Keyed by the canonical request URL. The value is the Promise
 * returned by `getClinicAdminOverview()` for the in-flight request.
 * The Promise is removed from the registry when it settles (success
 * OR failure), so the registry never holds resolved data and never
 * serves stale data.
 *
 * The registry is intentionally NOT exported. It is an internal
 * implementation detail of the deduplication mechanism.
 */
const INFLIGHT_OVERVIEW_REQUESTS = new Map<
  string,
  Promise<ClinicAdminOverviewClientResult>
>();

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
 * Concurrent calls to this function (e.g. from two `useEffect`
 * executions under React Strict Mode) share the same in-flight
 * Promise and produce exactly one underlying `fetch` call. The
 * in-flight Promise is removed from the registry when it settles,
 * so a later navigation or an explicit retry produces a fresh
 * request.
 */
export function getClinicAdminOverview(): Promise<ClinicAdminOverviewClientResult> {
  const url = joinUrl(getApiBaseUrl(), '/clinic-admin/overview');

  // If a request for the same URL is already in flight, reuse its
  // Promise. This is the deduplication mechanism: concurrent callers
  // (e.g. two `useEffect` executions under React Strict Mode) share
  // the same underlying `fetch` and the same parsed result.
  const existing = INFLIGHT_OVERVIEW_REQUESTS.get(url);
  if (existing !== undefined) {
    return existing;
  }

  // Start a new request. The Promise is created eagerly and stored
  // in the registry BEFORE the first `await` so that any concurrent
  // caller (in the same microtask) sees the in-flight Promise and
  // reuses it.
  const promise = performFetchOverview(url).finally(() => {
    // Remove the in-flight Promise from the registry when it
    // settles. This ensures:
    // - a later navigation makes a fresh request (no persistent
    //   stale-data caching);
    // - an explicit retry after failure makes a fresh request;
    // - the registry never holds resolved data.
    //
    // `finally` is used (instead of `then`/`catch`) so the removal
    // happens regardless of whether the Promise resolved or
    // rejected. The Promise returned by `performFetchOverview`
    // never rejects (it catches all errors and returns an
    // `ApiError` result), but `finally` is the most defensive
    // choice.
    INFLIGHT_OVERVIEW_REQUESTS.delete(url);
  });

  INFLIGHT_OVERVIEW_REQUESTS.set(url, promise);
  return promise;
}

/**
 * Internal helper that performs the actual `fetch` and parses the
 * response. This function NEVER throws — every failure mode is
 * classified into a typed {@link ApiError} and returned as
 * `{ ok: false, error }`.
 *
 * Exposed as a separate function so the deduplication wrapper in
 * {@link getClinicAdminOverview} can store the Promise in the
 * registry before any `await` runs.
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

/**
 * Test-only helper: clear the in-flight request registry. Used by
 * the client unit tests to isolate test cases. NOT exported through
 * the package's public barrel (`apps/web/src/lib/api/clinic-admin/index.ts`).
 *
 * Production code MUST NOT call this function. It exists only so the
 * unit tests can assert the registry's state without coupling to its
 * module identity.
 */
export function __clearInflightOverviewRequestsForTests(): void {
  INFLIGHT_OVERVIEW_REQUESTS.clear();
}

/**
 * Test-only helper: inspect the in-flight request registry size.
 * Used by the client unit tests to assert that the deduplication
 * mechanism removed the entry after the Promise settled. NOT
 * exported through the package's public barrel.
 */
export function __inflightOverviewRequestCountForTests(): number {
  return INFLIGHT_OVERVIEW_REQUESTS.size;
}
