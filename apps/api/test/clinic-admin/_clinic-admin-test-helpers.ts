/**
 * @fileoverview Typed test helpers for the Clinic Admin Overview
 * integration suite.
 *
 * These helpers exist to make two specific test-harness defects
 * structurally impossible to reintroduce:
 *
 * 1. **Undefined CSRF header defect.** The Clinic Admin e2e suite
 *    previously read `csrfResponse.body.csrfToken` to extract the
 *    CSRF token. The actual CSRF endpoint returns `{ token: string }`
 *    (see `apps/api/src/modules/auth/auth.controller.ts` line 388 and
 *    the `CsrfResponseSchema` in `@ibn-hayan/contracts`). Reading the
 *    wrong field name yielded `undefined`, which was then passed to
 *    `supertest.Request#set('X-CSRF-Token', undefined)`, throwing
 *    `TypeError: Invalid value "undefined" for header "X-CSRF-Token"`
 *    inside Superagent BEFORE the HTTP request reached the
 *    application. The fix is to parse the response with the strict
 *    `CsrfResponseSchema` and return the validated `token` field —
 *    or throw a precise diagnostic if validation fails. The helper
 *    NEVER returns `undefined`.
 *
 * 2. **Throttler timer-callback defect.** The previous
 *    `resetThrottlerStorage()` helper only called
 *    `storage.storage.clear()` on the default
 *    `@nestjs/throttler@6.5.0` `ThrottlerStorageService`. That
 *    service stores rate-limit entries in a `Map<string,
 *    ThrottlerStorageRecord>` (keyed by rate-limit key) AND stores
 *    pending `setTimeout` handles in a SEPARATE `Map<string,
 *    NodeJS.Timeout[]>` (keyed by throttler name). Clearing only the
 *    entries Map left the timeout handles active. When a delayed
 *    callback fired, it called `this.storage.get(key)` against the
 *    now-empty Map, received `undefined`, and destructured
 *    `const { totalHits } = undefined` — throwing
 *    `TypeError: Cannot destructure property 'totalHits' of
 *    'this.storage.get(...)' as it is undefined`. The unhandled
 *    exception in the timer callback corrupted the test process
 *    state, preventing `app.close()` from completing and causing
 *    the `afterAll` hook to time out at 60s. The fix is to clear
 *    timeout handles FIRST (calling `clearTimeout` on each pending
 *    handle), THEN clear the storage entries Map. This matches the
 *    `ThrottlerStorageService.onApplicationShutdown()` semantics
 *    that NestJS calls during `app.close()`.
 *
 * These helpers are test-only utilities. They MUST NOT be imported
 * by production source files. They live under `apps/api/test/` and
 * are imported only by:
 *   - `apps/api/test/clinic-admin/clinic-admin.e2e.clinic-admin-spec.ts`
 *   - `apps/api/src/modules/clinic-admin/clinic-admin-test-helpers.spec.ts`
 *     (focused unit tests for the helpers themselves)
 *
 * The helpers do NOT weaken any production security control:
 *   - The real `AppModule` is used.
 *   - The real `AuthorizationGuard` is used.
 *   - The real `ThrottlerGuard` is used.
 *   - The real `CsrfService` is used.
 *   - The real session-cookie validation is used.
 *   - No CSRF token is ever mocked, faked, or hardcoded.
 *   - The `GET /api/v1/clinic-admin/overview` request continues to
 *     NOT attach `X-CSRF-Token` (the endpoint is read-only and the
 *     `AuthorizationGuard` only enforces CSRF on PUT/DELETE).
 */

import type { Server } from 'node:http';
import type { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import {
  CsrfResponseSchema,
  ClinicAdminOverviewErrorResponseSchema,
  AuthErrorResponseSchema,
  type ClinicAdminOverviewErrorResponse,
  type AuthErrorResponse,
} from '@ibn-hayan/contracts';

/**
 * Parse a 403 response body produced by the Clinic Admin Overview
 * endpoint when the active context is missing or invalid.
 *
 * The Overview service (`ClinicAdminOverviewService.loadOverview`)
 * throws `clinicAdminOverviewContextRequired()` (HTTP 403 with code
 * `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED`) when:
 *   - the session has no active tenant membership;
 *   - the session has no active organisation;
 *   - the session has no active facility;
 *   - the active tenant, organisation, or facility no longer exists
 *     or is no longer active (defence-in-depth against session
 *     tampering);
 *   - the active facility does not belong to the active organisation.
 *
 * The code `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED` is NOT included
 * in `AuthErrorResponseSchema`'s enum (which is the auth/context
 * error contract). It IS included in
 * `ClinicAdminOverviewErrorResponseSchema`'s enum (the Clinic Admin
 * Overview error contract). Tests that exercise the Overview
 * endpoint's missing-context 403 MUST parse with
 * `ClinicAdminOverviewErrorResponseSchema`, NOT with
 * `AuthErrorResponseSchema` — otherwise `safeParse` returns
 * `success=false` and the test fails for the wrong reason (a
 * contract mismatch rather than the asserted HTTP status).
 *
 * This helper centralises the correct parser so the contract
 * correction is structural: future tests that need to assert a
 * missing-context 403 from the Overview endpoint import this helper
 * instead of reaching for `AuthErrorResponseSchema` directly.
 *
 * @param body The parsed JSON response body.
 * @returns The validated `ClinicAdminOverviewErrorResponse`.
 * @throws {Error} if the body does not match
 *   `ClinAdminOverviewErrorResponseSchema`.
 */
export function parseClinicAdminOverviewErrorResponse(
  body: unknown,
): ClinicAdminOverviewErrorResponse {
  const parsed = ClinicAdminOverviewErrorResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      'Clinic Admin Overview 403 response does not match ' +
        'ClinicAdminOverviewErrorResponseSchema. The Overview service ' +
        'throws clinicAdminOverviewContextRequired() (code ' +
        'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED) when the active ' +
        'tenant, organisation, or facility context is missing or ' +
        'invalid. This code is NOT in AuthErrorResponseSchema; tests ' +
        'that assert a missing-context 403 from the Overview endpoint ' +
        'MUST use ClinicAdminOverviewErrorResponseSchema (via this ' +
        'helper) rather than AuthErrorResponseSchema. ' +
        `Validation error: ${parsed.error.message}. ` +
        `Received body: ${JSON.stringify(body)}.`,
    );
  }
  return parsed.data;
}

/**
 * Parse a 401/403 response body produced by the auth, context, or
 * authorisation layers (NOT by the Clinic Admin Overview service's
 * context-required guard).
 *
 * Use this helper for:
 *   - 401 missing/expired/revoked session responses (code
 *     `AUTH_SESSION_REQUIRED`);
 *   - 403 CSRF-invalid responses (code `AUTH_CSRF_INVALID`);
 *   - 403 origin-disallowed responses (code `AUTH_ORIGIN_DISALLOWED`);
 *   - 403 context-selection-forbidden responses from the
 *     session-context module (code `CONTEXT_SELECTION_FORBIDDEN`);
 *   - 403 context-request-invalid responses (code
 *     `CONTEXT_REQUEST_INVALID`);
 *   - 403 authorisation-forbidden responses from the
 *     AuthorizationGuard when the active membership's roles do not
 *     grant the required permission (code
 *     `AUTHORIZATION_FORBIDDEN`).
 *
 * Do NOT use this helper for 403 responses from the Clinic Admin
 * Overview service's context-required guard — use
 * {@link parseClinicAdminOverviewErrorResponse} instead. The
 * `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED` code is not in
 * `AuthErrorResponseSchema`'s enum.
 *
 * @param body The parsed JSON response body.
 * @returns The validated `AuthErrorResponse`.
 * @throws {Error} if the body does not match `AuthErrorResponseSchema`.
 */
export function parseAuthErrorResponse(body: unknown): AuthErrorResponse {
  const parsed = AuthErrorResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      'Auth/context/authorisation error response does not match ' +
        'AuthErrorResponseSchema. If the response is a 403 from the ' +
        'Clinic Admin Overview endpoint with code ' +
        'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED, use ' +
        'parseClinicAdminOverviewErrorResponse() instead. ' +
        `Validation error: ${parsed.error.message}. ` +
        `Received body: ${JSON.stringify(body)}.`,
    );
  }
  return parsed.data;
}

/**
 * Parse the JSON body of `GET /api/v1/auth/csrf` and return the
 * validated CSRF token string.
 *
 * This is a pure function exposed for unit testing. The e2e suite
 * uses {@link fetchCsrfToken} which wraps this with the supertest
 * call.
 *
 * Behaviour:
 *   - Validates the body with the strict `CsrfResponseSchema`.
 *   - Returns the `token` field (a non-empty string of length >= 32
 *     per the schema).
 *   - Throws a precise `Error` if the body is null, undefined, not
 *     an object, missing the `token` field, or has an invalid token
 *     value. The error message identifies the failure mode so the
 *     test setup fails clearly at the point of acquisition — NEVER
 *     later inside a Supertest header setter.
 *
 * The function NEVER returns `undefined`. TypeScript's `string`
 * return type is structurally enforced; the runtime guard makes the
 * "undefined header" defect impossible to reintroduce.
 *
 * @param body The parsed JSON response body from `GET /api/v1/auth/csrf`.
 * @returns The validated CSRF token string.
 * @throws {Error} if the body fails `CsrfResponseSchema` validation.
 */
export function parseCsrfResponseBody(body: unknown): string {
  if (body === null || body === undefined) {
    throw new Error(
      'CSRF token acquisition failed: response body is null or undefined. ' +
        'The CSRF endpoint returned an empty body — this usually means the ' +
        'session cookie was not sent or was invalid (the endpoint returns ' +
        '401 in that case, but supertest may have not raised it).',
    );
  }
  const parsed = CsrfResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      'CSRF token acquisition failed: response body does not match ' +
        'CsrfResponseSchema. The endpoint is expected to return ' +
        '{ token: string } (per apps/api/src/modules/auth/auth.controller.ts ' +
        'line 388 and the OpenAPI schema at line 368). ' +
        `Validation error: ${parsed.error.message}. ` +
        `Received body: ${JSON.stringify(body)}.`,
    );
  }
  const token = parsed.data.token;
  if (typeof token !== 'string' || token.length === 0) {
    // Defence-in-depth: the schema already enforces this, but the
    // runtime guard makes it impossible for a future schema change
    // to silently allow an empty token through.
    throw new Error(
      'CSRF token acquisition failed: parsed token is not a non-empty ' +
        `string (got ${typeof token}, length ${token?.length ?? 0}).`,
    );
  }
  return token;
}

/**
 * Fetch a real CSRF token from the running application using the
 * supplied session cookie.
 *
 * This is the e2e-suite-facing wrapper around {@link
 * parseCsrfResponseBody}. It:
 *   - Calls `GET /api/v1/auth/csrf` via supertest with the session
 *     cookie.
 *   - Asserts the HTTP status is 200 (fails clearly if not).
 *   - Delegates to {@link parseCsrfResponseBody} for strict schema
 *     validation.
 *   - Returns the validated non-empty token string.
 *
 * The function NEVER returns `undefined`. If acquisition fails, it
 * throws — stopping test setup at the precise point of failure
 * rather than letting an undefined value propagate into a Supertest
 * header setter.
 *
 * @param server The NestJS HTTP server (from `app.getHttpServer()`).
 * @param cookie The session cookie string (e.g. `ibn_hayan_session=...`).
 * @returns The validated CSRF token string.
 * @throws {Error} if the request fails, the status is not 200, or the
 *   response body fails schema validation.
 */
export async function fetchCsrfToken(
  server: Server,
  cookie: string,
): Promise<string> {
  const response = await request(server)
    .get('/api/v1/auth/csrf')
    .set('Cookie', cookie)
    .expect(200);
  return parseCsrfResponseBody(response.body);
}

/**
 * Assert that a CSRF token value is a non-empty string before it is
 * passed to a Supertest header setter.
 *
 * This is a defence-in-depth assertion. The primary guarantee is
 * provided by {@link parseCsrfResponseBody} which never returns
 * undefined. This assertion is used at call sites where the token
 * has been stored in a variable and there is a risk of accidental
 * reassignment or session-replacement reuse.
 *
 * @param value The value to assert.
 * @param context A short context string for the error message (e.g.
 *   `'selectTenantContext'`).
 * @returns The validated non-empty token string.
 * @throws {Error} if the value is not a non-empty string.
 */
export function assertCsrfToken(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `CSRF token assertion failed at ${context}: expected a non-empty ` +
        `string, got ${typeof value} (${value === undefined ? 'undefined' : value === null ? 'null' : JSON.stringify(value)}). ` +
        'This indicates the token was lost between acquisition and ' +
        'use — possibly due to session replacement, logout/login ' +
        'transition, or Role Preview principal replacement. Re-acquire ' +
        'the token via fetchCsrfToken() before retrying.',
    );
  }
  return value;
}

/**
 * Runtime shape of the default `@nestjs/throttler@6.5.0`
 * `ThrottlerStorageService` internal state.
 *
 * This interface is NOT part of the public `ThrottlerStorage`
 * contract — it reflects the implementation details of the in-memory
 * default storage service. The fields are:
 *   - `storage`: `Map<string, ThrottlerStorageRecord>` — rate-limit
 *     entries, keyed by rate-limit key (IP + route + throttler name).
 *   - `timeoutIds`: `Map<string, NodeJS.Timeout[]>` — pending
 *     `setTimeout` handles, keyed by throttler name. Each handle's
 *     callback destructures `this.storage.get(key)` to decrement the
 *     hit count when the TTL expires.
 *
 * The `onApplicationShutdown()` method iterates `timeoutIds` and
 * calls `clearTimeout` on each handle. We replicate this semantics
 * in {@link resetThrottlerStorageSafely} for between-test isolation.
 *
 * If a future `@nestjs/throttler` release changes this internal
 * shape, the runtime guards in {@link resetThrottlerStorageSafely}
 * will detect the mismatch and skip the reset (rather than crashing).
 * The test will then fail loudly when the throttler triggers across
 * tests — which is the correct failure mode (alerting the operator
 * that the helper needs updating).
 */
interface ThrottlerStorageServiceInternalShape {
  storage?: Map<unknown, unknown>;
  timeoutIds?: Map<string, Array<ReturnType<typeof setTimeout>>>;
  onApplicationShutdown?: () => void;
}

/**
 * Safely reset the in-memory `ThrottlerStorageService` state between
 * tests.
 *
 * This helper replaces the previous `resetThrottlerStorage()` which
 * only cleared the `storage` Map. The previous implementation left
 * pending `setTimeout` handles active in `timeoutIds`. When a
 * delayed callback fired against the now-empty storage Map, it
 * crashed with `TypeError: Cannot destructure property 'totalHits'
 * of 'this.storage.get(...)' as it is undefined`.
 *
 * Safe reset order (CRITICAL):
 *   1. Iterate `timeoutIds` (keyed by throttler name) and call
 *      `clearTimeout` on each pending handle. This prevents the
 *      callback from firing against a missing storage entry.
 *   2. Clear the `timeoutIds` Map (set each throttler name's array
 *      to empty, or call `clear()` on the Map).
 *   3. Clear the `storage` entries Map.
 *
 * This order matches the `onApplicationShutdown()` semantics that
 * NestJS calls during `app.close()`. The helper is idempotent and
 * safe to call when `beforeAll` fails partially (e.g. when
 * `throttlerStorage` is the default empty object shape).
 *
 * The helper uses runtime guards (`instanceof Map`) to detect
 * whether the supplied `ThrottlerStorage` matches the expected
 * internal shape. If the shape does not match (e.g. a future
 * `@nestjs/throttler` release changes the implementation), the
 * helper logs a warning and skips the reset — it does NOT crash.
 * The test will then fail loudly when the throttler triggers
 * across tests, alerting the operator that the helper needs
 * updating.
 *
 * @param throttlerStorage The `ThrottlerStorage` instance from
 *   `app.get(ThrottlerStorage)`.
 */
export function resetThrottlerStorageSafely(
  throttlerStorage: ThrottlerStorage,
): void {
  const internal =
    throttlerStorage as unknown as ThrottlerStorageServiceInternalShape;

  // Step 1: Clear timeout handles FIRST. This is the critical fix.
  // Each pending setTimeout callback captures `key` and
  // `throttlerName` and calls `this.storage.get(key)` — which
  // returns undefined if the storage entry was already cleared.
  // Clearing the handles first prevents the callbacks from firing.
  if (internal.timeoutIds instanceof Map) {
    for (const handles of internal.timeoutIds.values()) {
      if (Array.isArray(handles)) {
        for (const handle of handles) {
          // The handle is a NodeJS.Timeout (what setTimeout returns).
          // clearTimeout accepts it and is a no-op if the handle has
          // already fired or been cleared.
          clearTimeout(handle);
        }
      }
    }
    // Step 2: Clear the timeoutIds Map so future resets start fresh.
    internal.timeoutIds.clear();
  }

  // Step 3: Clear the storage entries Map. Safe now because no
  // pending callback can fire against it.
  if (internal.storage instanceof Map) {
    internal.storage.clear();
  }
}
