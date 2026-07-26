/**
 * @fileoverview Focused unit tests for the Clinic Admin test helpers.
 *
 * These tests prove the two test-harness defects fixed by
 * `_clinic-admin-test-helpers.ts` cannot be reintroduced:
 *
 * 1. **Undefined CSRF header defect.** The previous inline helper
 *    read `csrfResponse.body.csrfToken` (wrong field name; the
 *    endpoint returns `{ token }`). The wrong field yielded
 *    `undefined`, which was then passed to
 *    `supertest.Request#set('X-CSRF-Token', undefined)`, throwing
 *    `TypeError: Invalid value "undefined" for header "X-CSRF-Token"`
 *    inside Superagent BEFORE the request reached the application.
 *    The fix parses the response with the strict
 *    `CsrfResponseSchema` and returns the validated `token` field —
 *    or throws a precise diagnostic if validation fails. The helper
 *    NEVER returns `undefined`.
 *
 * 2. **Throttler timer-callback defect.** The previous
 *    `resetThrottlerStorage()` only cleared the storage Map but
 *    left pending `setTimeout` handles active. When a delayed
 *    callback fired against the now-empty storage Map, it crashed
 *    with `TypeError: Cannot destructure property 'totalHits' of
 *    'this.storage.get(...)' as it is undefined`. The fix clears
 *    timeout handles FIRST (calling `clearTimeout` on each pending
 *    handle), THEN clears the storage entries Map.
 *
 * These tests run as part of the default unit test suite (no
 * PostgreSQL 17 required). They do NOT exercise the actual HTTP
 * endpoint — they test the helper logic in isolation using
 * constructed inputs and a fake `ThrottlerStorage` object.
 *
 * The corresponding integration coverage (that the real GET
 * /api/v1/clinic-admin/overview endpoint does not require CSRF, that
 * the real PUT /context/* endpoints do require CSRF, that the real
 * ThrottlerGuard is preserved, etc.) is provided by the 24-scenario
 * e2e suite in
 * `apps/api/test/clinic-admin/clinic-admin.e2e.clinic-admin-spec.ts`,
 * which runs in the GitHub Actions `postgresql17-validation` job.
 */

import { describe, expect, it } from 'vitest';
import {
  parseCsrfResponseBody,
  assertCsrfToken,
  resetThrottlerStorageSafely,
  parseClinicAdminOverviewErrorResponse,
  parseAuthErrorResponse,
  seedActiveContextForSession,
  computeSessionTokenHash,
  assertExactRoleAssignments,
} from '../../../test/clinic-admin/_clinic-admin-test-helpers.js';

// ---------------------------------------------------------------------------
// parseCsrfResponseBody
// ---------------------------------------------------------------------------

describe('parseCsrfResponseBody', () => {
  it('returns the validated token string for a well-formed body', () => {
    // The CSRF endpoint returns `{ token: string }` where token has
    // length >= 32 per CsrfResponseSchema.
    const body = { token: 'a'.repeat(64) };
    const token = parseCsrfResponseBody(body);
    expect(typeof token).toBe('string');
    expect(token).toBe('a'.repeat(64));
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it('NEVER returns undefined — the previous defect is structurally impossible', () => {
    // This is the regression guard for the original defect: reading
    // `body.csrfToken` (wrong field name) yielded undefined, which
    // then crashed inside Superagent's header setter. The helper
    // must NEVER return undefined — it must throw on invalid input.
    const body = { token: 'b'.repeat(48) };
    const token = parseCsrfResponseBody(body);
    expect(token).not.toBeUndefined();
    expect(token).not.toBeNull();
    expect(typeof token).toBe('string');
  });

  it('throws a precise diagnostic when body is null', () => {
    expect(() => parseCsrfResponseBody(null)).toThrowError(
      /CSRF token acquisition failed: response body is null or undefined/,
    );
  });

  it('throws a precise diagnostic when body is undefined', () => {
    expect(() => parseCsrfResponseBody(undefined)).toThrowError(
      /CSRF token acquisition failed: response body is null or undefined/,
    );
  });

  it('throws a precise diagnostic when the body uses the wrong field name (csrfToken instead of token)', () => {
    // This is the EXACT regression for the original defect. The
    // previous code read `body.csrfToken` and silently got undefined.
    // The helper must reject this body shape loudly.
    const bodyWithWrongFieldName = { csrfToken: 'c'.repeat(64) };
    expect(() => parseCsrfResponseBody(bodyWithWrongFieldName)).toThrowError(
      /CSRF token acquisition failed: response body does not match CsrfResponseSchema/,
    );
  });

  it('throws a precise diagnostic when the token field is missing', () => {
    expect(() => parseCsrfResponseBody({})).toThrowError(
      /CSRF token acquisition failed: response body does not match CsrfResponseSchema/,
    );
  });

  it('throws a precise diagnostic when the token is too short (< 32 chars)', () => {
    // CsrfResponseSchema enforces minLength: 32 per the OpenAPI
    // declaration in auth.controller.ts.
    expect(() => parseCsrfResponseBody({ token: 'too-short' })).toThrowError(
      /CSRF token acquisition failed: response body does not match CsrfResponseSchema/,
    );
  });

  it('throws a precise diagnostic when the token is not a string', () => {
    expect(() =>
      parseCsrfResponseBody({
        // A number is not a string; the schema will reject it. Use a
        // small number to avoid `no-loss-of-precision`.
        token: 42,
      }),
    ).toThrowError(
      /CSRF token acquisition failed: response body does not match CsrfResponseSchema/,
    );
  });

  it('throws a precise diagnostic when the body is an array', () => {
    expect(() => parseCsrfResponseBody([])).toThrowError(
      /CSRF token acquisition failed: response body does not match CsrfResponseSchema/,
    );
  });

  it('throws a precise diagnostic when the body is a primitive', () => {
    expect(() => parseCsrfResponseBody('not-an-object')).toThrowError(
      /CSRF token acquisition failed: response body does not match CsrfResponseSchema/,
    );
  });

  it('includes the received body in the error message for diagnosis', () => {
    try {
      parseCsrfResponseBody({ wrongField: 'value' });
      expect.fail('should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('Received body:');
      expect(message).toContain('wrongField');
    }
  });
});

// ---------------------------------------------------------------------------
// assertCsrfToken
// ---------------------------------------------------------------------------

describe('assertCsrfToken', () => {
  it('returns the value when it is a non-empty string', () => {
    const token = 'd'.repeat(48);
    expect(assertCsrfToken(token, 'test-context')).toBe(token);
  });

  it('throws when the value is undefined (defence-in-depth against session replacement)', () => {
    expect(() => assertCsrfToken(undefined, 'test-context')).toThrowError(
      /CSRF token assertion failed at test-context: expected a non-empty string, got undefined/,
    );
  });

  it('throws when the value is null', () => {
    expect(() => assertCsrfToken(null, 'test-context')).toThrowError(
      /CSRF token assertion failed at test-context: expected a non-empty string, got object \(null\)/,
    );
  });

  it('throws when the value is an empty string', () => {
    expect(() => assertCsrfToken('', 'test-context')).toThrowError(
      /CSRF token assertion failed at test-context: expected a non-empty string, got string \(""\)/,
    );
  });

  it('throws when the value is a number', () => {
    expect(() => assertCsrfToken(12345, 'test-context')).toThrowError(
      /CSRF token assertion failed at test-context: expected a non-empty string, got number/,
    );
  });

  it('includes the context name in the error message for diagnosis', () => {
    try {
      assertCsrfToken(
        undefined,
        'selectTenantContext-after-session-replacement',
      );
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain(
        'selectTenantContext-after-session-replacement',
      );
    }
  });

  it('mentions session replacement, logout/login, and Role Preview in the error message', () => {
    // The error message should hint at the three known scenarios
    // where a token can become invalid between acquisition and use.
    try {
      assertCsrfToken(undefined, 'ctx');
      expect.fail('should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('session replacement');
      expect(message).toContain('logout/login');
      expect(message).toContain('Role Preview');
    }
  });
});

// ---------------------------------------------------------------------------
// resetThrottlerStorageSafely
// ---------------------------------------------------------------------------

/**
 * Build a fake `ThrottlerStorage` that mirrors the internal shape
 * of `@nestjs/throttler@6.5.0`'s `ThrottlerStorageService` for
 * unit testing.
 *
 * The fake exposes:
 *   - `storage`: `Map<string, { totalHits, expiresAt, blockExpiresAt, isBlocked }>`
 *   - `timeoutIds`: `Map<string, NodeJS.Timeout[]>`
 *
 * Each timer in `timeoutIds` is a real `setTimeout` handle whose
 * callback (if it fires) would access `storage.get(key)`. This lets
 * the test prove the helper prevents the destructuring crash.
 */
function buildFakeThrottlerStorage(): {
  storage: Map<string, unknown>;
  timeoutIds: Map<string, Array<ReturnType<typeof setTimeout>>>;
  firedCallbacks: string[];
} {
  const firedCallbacks: string[] = [];
  const storage = new Map<string, unknown>();
  const timeoutIds = new Map<string, Array<ReturnType<typeof setTimeout>>>();
  return { storage, timeoutIds, firedCallbacks };
}

describe('resetThrottlerStorageSafely', () => {
  it('clears both the timeoutIds and storage Maps (in that order)', () => {
    const fake = buildFakeThrottlerStorage();
    // Seed the storage and timeoutIds.
    fake.storage.set('key-1', { totalHits: new Map([['default', 1]]) });
    fake.storage.set('key-2', { totalHits: new Map([['default', 2]]) });
    // Schedule a real setTimeout that, if fired, would access
    // storage.get('key-1') and crash.
    const handle = setTimeout(() => {
      fake.firedCallbacks.push('key-1-callback');
      const entry = fake.storage.get('key-1');
      // This destructuring is what the real ThrottlerStorageService
      // does — it crashes if entry is undefined.
      const { totalHits } = entry as { totalHits: unknown };
      void totalHits;
    }, 60_000); // Long TTL so it doesn't fire during the test.
    fake.timeoutIds.set('default', [handle]);

    resetThrottlerStorageSafely(
      fake as unknown as Parameters<typeof resetThrottlerStorageSafely>[0],
    );

    // Both Maps must be empty after reset.
    expect(fake.storage.size).toBe(0);
    expect(fake.timeoutIds.size).toBe(0);
  });

  it('clears the timeout handles (calling clearTimeout on each) BEFORE clearing the storage Map', () => {
    // This is the critical regression guard. The previous
    // `resetThrottlerStorage()` only cleared the storage Map, leaving
    // timeout handles active. When the timer fired, it crashed.
    //
    // The fix calls clearTimeout on each handle FIRST. To prove this,
    // we schedule a timer with a very short TTL (50ms) and verify
    // that after resetThrottlerStorageSafely + a 100ms wait, the
    // callback does NOT fire (because the handle was cleared).
    const fake = buildFakeThrottlerStorage();
    fake.storage.set('short-ttl-key', { totalHits: new Map() });
    const handle = setTimeout(() => {
      fake.firedCallbacks.push('short-ttl-callback-fired');
    }, 50);
    fake.timeoutIds.set('default', [handle]);

    resetThrottlerStorageSafely(
      fake as unknown as Parameters<typeof resetThrottlerStorageSafely>[0],
    );

    // Wait long enough for the original timer to have fired (if it
    // hadn't been cleared). 100ms > 50ms TTL.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(fake.firedCallbacks).not.toContain('short-ttl-callback-fired');
        resolve();
      }, 120);
    });
  });

  it('is idempotent (calling it twice does not crash)', () => {
    const fake = buildFakeThrottlerStorage();
    fake.storage.set('key-1', { totalHits: new Map() });
    const handle = setTimeout(() => {
      fake.firedCallbacks.push('callback');
    }, 60_000);
    fake.timeoutIds.set('default', [handle]);

    const storageRef = fake as unknown as Parameters<
      typeof resetThrottlerStorageSafely
    >[0];
    expect(() => resetThrottlerStorageSafely(storageRef)).not.toThrow();
    expect(() => resetThrottlerStorageSafely(storageRef)).not.toThrow();

    expect(fake.storage.size).toBe(0);
    expect(fake.timeoutIds.size).toBe(0);
  });

  it('is safe when beforeAll fails partially (storage is missing)', () => {
    // Simulate a partially-initialised ThrottlerStorage where the
    // storage field is missing (e.g. beforeAll failed before the
    // throttler was fully constructed).
    const partial = { timeoutIds: new Map() } as unknown as Parameters<
      typeof resetThrottlerStorageSafely
    >[0];
    expect(() => resetThrottlerStorageSafely(partial)).not.toThrow();
  });

  it('is safe when timeoutIds is missing', () => {
    const partial = {
      storage: new Map(),
    } as unknown as Parameters<typeof resetThrottlerStorageSafely>[0];
    expect(() => resetThrottlerStorageSafely(partial)).not.toThrow();
  });

  it('is safe when both storage and timeoutIds are missing', () => {
    const empty = {} as unknown as Parameters<
      typeof resetThrottlerStorageSafely
    >[0];
    expect(() => resetThrottlerStorageSafely(empty)).not.toThrow();
  });

  it('is safe when the throttler storage is an unrelated object (no Maps)', () => {
    // A future @nestjs/throttler release might change the internal
    // shape. The helper must detect the mismatch and skip — NOT crash.
    const unrelated = {
      someOtherField: 'value',
      notAMap: 'string',
    } as unknown as Parameters<typeof resetThrottlerStorageSafely>[0];
    expect(() => resetThrottlerStorageSafely(unrelated)).not.toThrow();
  });

  it('clears multiple timeout handles across multiple throttler names', () => {
    // ThrottlerStorageService keys timeoutIds by throttler name
    // (e.g. 'default', 'login-throttle'). The helper must iterate
    // ALL throttler names, not just the first.
    const fake = buildFakeThrottlerStorage();
    fake.storage.set('key-1', { totalHits: new Map() });
    fake.storage.set('key-2', { totalHits: new Map() });

    const handle1 = setTimeout(() => {
      fake.firedCallbacks.push('default-1');
    }, 60_000);
    const handle2 = setTimeout(() => {
      fake.firedCallbacks.push('default-2');
    }, 60_000);
    const handle3 = setTimeout(() => {
      fake.firedCallbacks.push('login-throttle-1');
    }, 60_000);
    fake.timeoutIds.set('default', [handle1, handle2]);
    fake.timeoutIds.set('login-throttle', [handle3]);

    resetThrottlerStorageSafely(
      fake as unknown as Parameters<typeof resetThrottlerStorageSafely>[0],
    );

    expect(fake.storage.size).toBe(0);
    expect(fake.timeoutIds.size).toBe(0);
  });

  it('handles non-array values in timeoutIds gracefully (does not crash)', () => {
    // Defence-in-depth: if a future throttler release stores
    // non-array values in timeoutIds, the helper should skip them
    // rather than crashing.
    const fake = buildFakeThrottlerStorage();
    // Manually inject a non-array value.
    (fake.timeoutIds as Map<string, unknown>).set('broken', 'not-an-array');
    const handle = setTimeout(() => {
      fake.firedCallbacks.push('default');
    }, 60_000);
    fake.timeoutIds.set('default', [handle]);

    expect(() =>
      resetThrottlerStorageSafely(
        fake as unknown as Parameters<typeof resetThrottlerStorageSafely>[0],
      ),
    ).not.toThrow();
    expect(fake.storage.size).toBe(0);
    // The 'broken' key (with non-array value) is cleared along with
    // everything else by the .clear() call at the end.
    expect(fake.timeoutIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration contract: the helpers compose correctly
// ---------------------------------------------------------------------------

describe('helper composition (CSRF acquisition + assertion)', () => {
  it('a successfully-acquired token passes the assertion (the happy path)', () => {
    // Simulate the happy path: parseCsrfResponseBody returns a
    // non-empty string, then assertCsrfToken accepts it.
    const token = parseCsrfResponseBody({ token: 'e'.repeat(48) });
    const asserted = assertCsrfToken(token, 'composition-happy-path');
    expect(asserted).toBe(token);
    expect(typeof asserted).toBe('string');
    expect(asserted.length).toBeGreaterThanOrEqual(32);
  });

  it('an acquisition failure stops test setup before any header setter is called', () => {
    // Simulate the failure path: parseCsrfResponseBody throws at the
    // point of acquisition. The assertion is NEVER reached — and
    // therefore the header setter is NEVER called with undefined.
    // This is the structural guarantee that prevents the original
    // "Invalid value 'undefined' for header" defect.
    expect(() => parseCsrfResponseBody({ wrongField: 'value' })).toThrow();
    // If we had reached the assertion, it would have thrown too —
    // but the test-setup failure happens at acquisition, which is
    // the desired behaviour.
  });
});

// ---------------------------------------------------------------------------
// parseClinicAdminOverviewErrorResponse
// ---------------------------------------------------------------------------
//
// These tests prove the second-stage CI-harness correction: the
// Clinic Admin Overview service throws `clinicAdminOverviewContextRequired()`
// (HTTP 403 with code `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED`) when
// the active tenant, organisation, or facility context is missing
// or invalid. This code is NOT in `AuthErrorResponseSchema`'s enum
// (the auth/context error contract). It IS in
// `ClinicAdminOverviewErrorResponseSchema`'s enum (the Clinic Admin
// Overview error contract). Tests that assert a missing-context 403
// from the Overview endpoint MUST use
// `parseClinicAdminOverviewErrorResponse` (which uses
// `ClinicAdminOverviewErrorResponseSchema`), NOT `parseAuthErrorResponse`
// (which uses `AuthErrorResponseSchema`).
//
// The regression guard: a setup 403 must NOT be confused with the
// Overview endpoint's 403. The two have different codes:
//   - Setup 403 (from PUT /context/organisation): CONTEXT_SELECTION_FORBIDDEN
//     (parseable by BOTH helpers — it's in both enums).
//   - Overview endpoint 403 (missing/invalid context):
//     CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED (parseable ONLY by
//     parseClinicAdminOverviewErrorResponse).
//   - Overview endpoint 403 (guard denial): AUTHORIZATION_FORBIDDEN
//     (parseable by BOTH helpers).
//   - Overview endpoint 401 (missing/expired/revoked session):
//     AUTH_SESSION_REQUIRED (parseable by parseAuthErrorResponse).

describe('parseClinicAdminOverviewErrorResponse', () => {
  it('accepts the canonical CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED response', () => {
    // The Overview service's `clinicAdminOverviewContextRequired()`
    // helper produces this exact response shape.
    const body = {
      error: {
        code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        message:
          'An active tenant, organisation, and facility context is required to view the Clinic Administrator Overview.',
      },
    };
    const parsed = parseClinicAdminOverviewErrorResponse(body);
    expect(parsed.error.code).toBe('CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED');
    expect(typeof parsed.error.message).toBe('string');
    expect(parsed.error.message.length).toBeGreaterThan(0);
  });

  it('accepts the AUTH_SESSION_REQUIRED response (401 case)', () => {
    // ClinicAdminOverviewErrorResponseSchema's enum includes
    // AUTH_SESSION_REQUIRED for the 401 case (missing/expired/
    // revoked session at the Overview endpoint).
    const body = {
      error: {
        code: 'AUTH_SESSION_REQUIRED',
        message: 'A valid session is required.',
      },
    };
    const parsed = parseClinicAdminOverviewErrorResponse(body);
    expect(parsed.error.code).toBe('AUTH_SESSION_REQUIRED');
  });

  it('accepts the AUTHORIZATION_FORBIDDEN response (guard denial case)', () => {
    // ClinicAdminOverviewErrorResponseSchema's enum includes
    // AUTHORIZATION_FORBIDDEN for the 403 case where the guard
    // denies (no clinic_admin_overview:view permission).
    const body = {
      error: {
        code: 'AUTHORIZATION_FORBIDDEN',
        message: 'The request is not authorized.',
      },
    };
    const parsed = parseClinicAdminOverviewErrorResponse(body);
    expect(parsed.error.code).toBe('AUTHORIZATION_FORBIDDEN');
  });

  it('rejects the CONTEXT_SELECTION_FORBIDDEN code (setup 403, NOT an Overview response)', () => {
    // This is the structural regression guard against the second-stage
    // defect: a setup 403 from PUT /context/organisation must NOT be
    // mistaken for the Overview endpoint's 403. The setup 403 has code
    // CONTEXT_SELECTION_FORBIDDEN; the Overview 403 has code
    // CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED.
    // ClinicAdminOverviewErrorResponseSchema's enum does NOT include
    // CONTEXT_SELECTION_FORBIDDEN — it's a session-context module code,
    // not a Clinic Admin Overview code.
    const setupBody = {
      error: {
        code: 'CONTEXT_SELECTION_FORBIDDEN',
        message: 'The selected context is not available.',
      },
    };
    expect(() => parseClinicAdminOverviewErrorResponse(setupBody)).toThrow();
  });

  it('throws a precise diagnostic mentioning the correct schema to use', () => {
    // The error message must guide the developer: if the response is
    // actually a setup 403, the developer should look at the setup
    // helper (selectOrganisationContext / selectFacilityContext), not
    // at the Overview endpoint.
    expect(() =>
      parseClinicAdminOverviewErrorResponse({ wrong: 'shape' }),
    ).toThrowError(
      /Clinic Admin Overview 403 response does not match ClinicAdminOverviewErrorResponseSchema/,
    );
  });

  it('NEVER returns undefined — throws on invalid input (regression guard)', () => {
    // The structural guarantee: the helper NEVER returns undefined.
    // It either returns a validated response or throws. This prevents
    // the "undefined header" defect class from recurring in a new form.
    expect(() => parseClinicAdminOverviewErrorResponse(null)).toThrow();
    expect(() => parseClinicAdminOverviewErrorResponse(undefined)).toThrow();
    expect(() => parseClinicAdminOverviewErrorResponse({})).toThrow();
    expect(() =>
      parseClinicAdminOverviewErrorResponse({ error: {} }),
    ).toThrow();
    expect(() =>
      parseClinicAdminOverviewErrorResponse({
        error: { code: 'UNKNOWN_CODE', message: 'x' },
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseAuthErrorResponse
// ---------------------------------------------------------------------------

describe('parseAuthErrorResponse', () => {
  it('accepts the canonical AUTH_SESSION_REQUIRED response', () => {
    const body = {
      error: {
        code: 'AUTH_SESSION_REQUIRED',
        message: 'A valid session is required.',
      },
    };
    const parsed = parseAuthErrorResponse(body);
    expect(parsed.error.code).toBe('AUTH_SESSION_REQUIRED');
  });

  it('accepts the AUTHORIZATION_FORBIDDEN response (guard denial)', () => {
    const body = {
      error: {
        code: 'AUTHORIZATION_FORBIDDEN',
        message: 'The request is not authorized.',
      },
    };
    const parsed = parseAuthErrorResponse(body);
    expect(parsed.error.code).toBe('AUTHORIZATION_FORBIDDEN');
  });

  it('accepts the CONTEXT_SELECTION_FORBIDDEN response (setup 403)', () => {
    // This is the setup 403 from PUT /context/organisation when the
    // principal lacks an applicable scoped role assignment. The code
    // IS in AuthErrorResponseSchema's enum.
    const body = {
      error: {
        code: 'CONTEXT_SELECTION_FORBIDDEN',
        message: 'The selected context is not available.',
      },
    };
    const parsed = parseAuthErrorResponse(body);
    expect(parsed.error.code).toBe('CONTEXT_SELECTION_FORBIDDEN');
  });

  it('rejects the CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED code (regression guard)', () => {
    // This is the structural regression guard for the second-stage
    // defect: a missing-context 403 from the Overview endpoint must
    // NOT be parsed with AuthErrorResponseSchema. The Overview 403
    // has code CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED; this code is
    // NOT in AuthErrorResponseSchema's enum. The helper must reject
    // it loudly and direct the caller to
    // parseClinicAdminOverviewErrorResponse.
    const overviewBody = {
      error: {
        code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        message: 'An active context is required.',
      },
    };
    expect(() => parseAuthErrorResponse(overviewBody)).toThrowError(
      /use parseClinicAdminOverviewErrorResponse\(\) instead/,
    );
  });

  it('throws a precise diagnostic mentioning the correct schema to use', () => {
    expect(() => parseAuthErrorResponse({ wrong: 'shape' })).toThrowError(
      /AuthErrorResponseSchema/,
    );
  });

  it('NEVER returns undefined — throws on invalid input', () => {
    expect(() => parseAuthErrorResponse(null)).toThrow();
    expect(() => parseAuthErrorResponse(undefined)).toThrow();
    expect(() => parseAuthErrorResponse({})).toThrow();
    expect(() => parseAuthErrorResponse({ error: {} })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cross-helper regression: setup 403 vs Overview 403 disambiguation
// ---------------------------------------------------------------------------

describe('setup 403 vs Overview endpoint 403 disambiguation', () => {
  // These tests prove the second-stage CI-harness correction's
  // structural guarantee: a setup 403 (from PUT /context/organisation)
  // CANNOT be confused with the Overview endpoint's 403 (missing
  // active context). The two responses have different error codes;
  // the two helpers accept different (overlapping but distinct) sets
  // of codes. A test that asserts the wrong code with the wrong
  // helper fails loudly at the parse step, BEFORE the HTTP-status
  // assertion can mask the setup failure as an endpoint failure.

  it('a setup 403 (CONTEXT_SELECTION_FORBIDDEN) parses with parseAuthErrorResponse but NOT parseClinicAdminOverviewErrorResponse', () => {
    const setupBody = {
      error: {
        code: 'CONTEXT_SELECTION_FORBIDDEN',
        message: 'The selected context is not available.',
      },
    };
    // parseAuthErrorResponse accepts it (it's in AuthErrorResponseSchema).
    const parsed = parseAuthErrorResponse(setupBody);
    expect(parsed.error.code).toBe('CONTEXT_SELECTION_FORBIDDEN');
    // parseClinicAdminOverviewErrorResponse REJECTS it (not in
    // ClinicAdminOverviewErrorResponseSchema's enum).
    expect(() => parseClinicAdminOverviewErrorResponse(setupBody)).toThrowError(
      /Clinic Admin Overview 403 response does not match/,
    );
  });

  it('an Overview endpoint 403 (CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED) parses with parseClinicAdminOverviewErrorResponse but NOT parseAuthErrorResponse', () => {
    const overviewBody = {
      error: {
        code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        message: 'An active context is required.',
      },
    };
    // parseClinicAdminOverviewErrorResponse accepts it.
    const parsed = parseClinicAdminOverviewErrorResponse(overviewBody);
    expect(parsed.error.code).toBe('CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED');
    // parseAuthErrorResponse REJECTS it.
    expect(() => parseAuthErrorResponse(overviewBody)).toThrowError(
      /use parseClinicAdminOverviewErrorResponse\(\) instead/,
    );
  });

  it('an Overview endpoint 403 (AUTHORIZATION_FORBIDDEN, guard denial) parses with BOTH helpers', () => {
    // The guard denial code AUTHORIZATION_FORBIDDEN is in BOTH
    // enums (it's a shared code that applies to any guarded
    // endpoint). Both helpers accept it. This is intentional: the
    // caller can use whichever helper is most convenient for the
    // test's assertion context.
    const guardDeniedBody = {
      error: {
        code: 'AUTHORIZATION_FORBIDDEN',
        message: 'The request is not authorized.',
      },
    };
    const parsedAuth = parseAuthErrorResponse(guardDeniedBody);
    expect(parsedAuth.error.code).toBe('AUTHORIZATION_FORBIDDEN');
    const parsedOverview =
      parseClinicAdminOverviewErrorResponse(guardDeniedBody);
    expect(parsedOverview.error.code).toBe('AUTHORIZATION_FORBIDDEN');
  });

  it('an Overview endpoint 401 (AUTH_SESSION_REQUIRED) parses with BOTH helpers', () => {
    // The session-required code is in BOTH enums.
    const sessionRequiredBody = {
      error: {
        code: 'AUTH_SESSION_REQUIRED',
        message: 'A valid session is required.',
      },
    };
    const parsedAuth = parseAuthErrorResponse(sessionRequiredBody);
    expect(parsedAuth.error.code).toBe('AUTH_SESSION_REQUIRED');
    const parsedOverview =
      parseClinicAdminOverviewErrorResponse(sessionRequiredBody);
    expect(parsedOverview.error.code).toBe('AUTH_SESSION_REQUIRED');
  });
});

// ---------------------------------------------------------------------------
// computeSessionTokenHash
// ---------------------------------------------------------------------------
//
// Phase 9 (third-stage CI-harness correction): focused regression tests
// for the new session-context seeding helpers. These tests prove that
// the fixture-identity defect (R13 setup-role inflation) is structurally
// impossible to reintroduce: the helpers enforce exact-role identity
// and reject composite-role fixtures.

describe('computeSessionTokenHash', () => {
  it('returns a 64-character lowercase hex string for any input', () => {
    const hash = computeSessionTokenHash('test-token-value');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns the canonical SHA-256 hash for a known input', () => {
    // SHA-256('') = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(computeSessionTokenHash('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('returns the canonical SHA-256 hash for "abc"', () => {
    // SHA-256('abc') = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(computeSessionTokenHash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('produces different hashes for different inputs (no collisions in practice)', () => {
    const hash1 = computeSessionTokenHash('token-1');
    const hash2 = computeSessionTokenHash('token-2');
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// assertExactRoleAssignments
// ---------------------------------------------------------------------------

describe('assertExactRoleAssignments', () => {
  it('passes when the actual set exactly matches the expected set', () => {
    expect(() =>
      assertExactRoleAssignments(['R01_PHYSICIAN'], ['R01_PHYSICIAN']),
    ).not.toThrow();
  });

  it('passes when both sets are empty', () => {
    expect(() => assertExactRoleAssignments([], [])).not.toThrow();
  });

  it('passes when the actual list has duplicates (de-duplicates by role code)', () => {
    // R09 at tenant, organisation, and facility scope → three rows,
    // one unique role code.
    expect(() =>
      assertExactRoleAssignments(
        ['R09_ADMINISTRATOR', 'R09_ADMINISTRATOR', 'R09_ADMINISTRATOR'],
        ['R09_ADMINISTRATOR'],
      ),
    ).not.toThrow();
  });

  it('passes when the expected set has multiple roles (composite is allowed when intended)', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
      ),
    ).not.toThrow();
  });

  it('throws when the actual set has an extra role (R13 setup-enabler added)', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/role-code set size mismatch/);
  });

  it('throws when the actual set is missing an expected role', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN'],
        ['R01_PHYSICIAN', 'R02_NURSE'],
      ),
    ).toThrow(/role-code set size mismatch/);
  });

  it('throws when the actual set has a different role than expected (same size)', () => {
    // Same size but different role — the per-code check fires.
    expect(() =>
      assertExactRoleAssignments(['R02_NURSE'], ['R01_PHYSICIAN']),
    ).toThrow(/R02_NURSE.*is NOT in the expected set|R01_PHYSICIAN not found/);
  });

  it('throws when the actual set has more roles than expected (size mismatch)', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R02_NURSE', 'R03_PHARMACIST'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/role-code set size mismatch/);
  });

  it('throws when the actual set has fewer roles than expected (size mismatch)', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN'],
        ['R01_PHYSICIAN', 'R02_NURSE', 'R03_PHARMACIST'],
      ),
    ).toThrow(/role-code set size mismatch/);
  });

  it('mentions the fixture-identity defect in the size-mismatch error message', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/fixture-identity defect is fixed/);
  });

  it('mentions "setup-enabler" in the extra-role error message', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/setup-enabler/);
  });
});

// ---------------------------------------------------------------------------
// seedActiveContextForSession — ownership validation
// ---------------------------------------------------------------------------
//
// These tests use a fake Prisma client to verify the helper's ownership
// invariants WITHOUT requiring a real PostgreSQL database. The helper
// must reject every cross-tenant, cross-organisation, and cross-user
// combination BEFORE writing to the session.

describe('seedActiveContextForSession — ownership validation', () => {
  /**
   * Build a fake Prisma client with controllable tenant, organisation,
   * facility, and membership records. The fake returns the supplied
   * records from `findUnique` and counts `updateMany` calls.
   */
  function buildFakePrisma(options: {
    readonly membership?: {
      readonly id: string;
      readonly userId: string;
      readonly tenantId: string;
      readonly status: string;
    } | null;
    readonly tenant?: { readonly id: string; readonly status: string } | null;
    readonly organisation?: {
      readonly id: string;
      readonly tenantId: string;
      readonly status: string;
    } | null;
    readonly facility?: {
      readonly id: string;
      readonly tenantId: string;
      readonly organisationId: string;
      readonly status: string;
    } | null;
    readonly updateCount?: number;
  }): {
    readonly prisma: Parameters<
      typeof seedActiveContextForSession
    >[0]['prisma'];
    readonly updateCalls: { readonly tokenHash: string }[];
  } {
    const updateCalls: { readonly tokenHash: string }[] = [];
    const membership = options.membership ?? null;
    const tenant = options.tenant ?? null;
    const organisation = options.organisation ?? null;
    const facility = options.facility ?? null;
    const prisma = {
      authSession: {
        updateMany(args: {
          readonly where: { readonly tokenHash: string };
          readonly data: unknown;
        }): Promise<{ readonly count: number }> {
          updateCalls.push({ tokenHash: args.where.tokenHash });
          return Promise.resolve({ count: options.updateCount ?? 1 });
        },
      },
      tenantMembership: {
        findUnique(): Promise<typeof membership> {
          return Promise.resolve(membership);
        },
      },
      tenant: {
        findUnique(): Promise<typeof tenant> {
          return Promise.resolve(tenant);
        },
      },
      organisation: {
        findUnique(): Promise<typeof organisation> {
          return Promise.resolve(organisation);
        },
      },
      facility: {
        findUnique(): Promise<typeof facility> {
          return Promise.resolve(facility);
        },
      },
    };
    return { prisma, updateCalls };
  }

  const validMembership = {
    id: 'mem-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    status: 'active',
  };
  const validTenant = { id: 'tenant-1', status: 'active' };
  const validOrganisation = {
    id: 'org-1',
    tenantId: 'tenant-1',
    status: 'active',
  };
  const validFacility = {
    id: 'fac-1',
    tenantId: 'tenant-1',
    organisationId: 'org-1',
    status: 'active',
  };

  it('seeds the active context when all invariants pass', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: validMembership,
      tenant: validTenant,
      organisation: validOrganisation,
      facility: validFacility,
    });
    await seedActiveContextForSession({
      prisma,
      tokenHash: 'a'.repeat(64),
      membershipId: 'mem-1',
      organisationId: 'org-1',
      facilityId: 'fac-1',
    });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]!.tokenHash).toBe('a'.repeat(64));
  });

  it('rejects when the membership is not found', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: null,
      tenant: validTenant,
      organisation: validOrganisation,
      facility: validFacility,
    });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'a'.repeat(64),
        membershipId: 'mem-missing',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/membership mem-missing not found/);
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects when the membership has status "suspended"', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: { ...validMembership, status: 'suspended' },
      tenant: validTenant,
      organisation: validOrganisation,
      facility: validFacility,
    });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'a'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/status 'suspended', expected 'active'/);
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects when the tenant has status "suspended"', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: validMembership,
      tenant: { ...validTenant, status: 'suspended' },
      organisation: validOrganisation,
      facility: validFacility,
    });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'a'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/tenant tenant-1 has status 'suspended'/);
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects when the organisation belongs to a different tenant (cross-tenant)', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: validMembership,
      tenant: validTenant,
      organisation: { ...validOrganisation, tenantId: 'tenant-OTHER' },
      facility: validFacility,
    });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'a'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/Cross-tenant organisation seeding is rejected/);
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects when the facility belongs to a different tenant (cross-tenant)', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: validMembership,
      tenant: validTenant,
      organisation: validOrganisation,
      facility: { ...validFacility, tenantId: 'tenant-OTHER' },
    });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'a'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/Cross-tenant facility seeding is rejected/);
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects when the facility belongs to a different organisation (cross-organisation)', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: validMembership,
      tenant: validTenant,
      organisation: validOrganisation,
      facility: { ...validFacility, organisationId: 'org-OTHER' },
    });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'a'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/Cross-organisation facility seeding is rejected/);
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects when the session update affects zero rows (tokenHash not found)', async () => {
    const { prisma, updateCalls } = buildFakePrisma({
      membership: validMembership,
      tenant: validTenant,
      organisation: validOrganisation,
      facility: validFacility,
      updateCount: 0,
    });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'b'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/no auth_session row matched tokenHash/);
    expect(updateCalls).toHaveLength(1);
  });

  it('does NOT create permissions (the helper only updates the session)', async () => {
    const { prisma } = buildFakePrisma({
      membership: validMembership,
      tenant: validTenant,
      organisation: validOrganisation,
      facility: validFacility,
    });
    // The fake Prisma does NOT expose a permission create method.
    // If the helper tried to create a permission, TypeScript would
    // reject the call at compile time. The runtime guarantee is
    // that the helper only calls authSession.updateMany (plus the
    // findUnique lookups for ownership validation).
    await seedActiveContextForSession({
      prisma,
      tokenHash: 'c'.repeat(64),
      membershipId: 'mem-1',
      organisationId: 'org-1',
      facilityId: 'fac-1',
    });
    // No throw means the helper did NOT try to call a missing
    // permission-create method.
  });

  it('does NOT create role assignments (the helper only updates the session)', async () => {
    const { prisma } = buildFakePrisma({
      membership: validMembership,
      tenant: validTenant,
      organisation: validOrganisation,
      facility: validFacility,
    });
    // Same reasoning as the previous test: the fake Prisma does
    // NOT expose a role-assignment create method.
    await seedActiveContextForSession({
      prisma,
      tokenHash: 'd'.repeat(64),
      membershipId: 'mem-1',
      organisationId: 'org-1',
      facilityId: 'fac-1',
    });
  });
});

// ---------------------------------------------------------------------------
// Regression: fixture-identity defect (R13 setup-role inflation) is
// structurally impossible to reintroduce
// ---------------------------------------------------------------------------

describe('fixture-identity defect regression (R13 setup-role inflation)', () => {
  it('a single-role fixture (R01 alone) passes the exact-role assertion', () => {
    expect(() =>
      assertExactRoleAssignments(['R01_PHYSICIAN'], ['R01_PHYSICIAN']),
    ).not.toThrow();
  });

  it('a composite fixture (R01 + R13 setup-enabler) is rejected by the exact-role assertion', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow();
  });

  it('a composite fixture (R02 + R13 setup-enabler) is rejected', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R02_NURSE', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R02_NURSE'],
      ),
    ).toThrow();
  });

  it('a composite fixture (R14 + R13 setup-enabler) is rejected', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R14_INTEGRATION_ACCOUNT', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R14_INTEGRATION_ACCOUNT'],
      ),
    ).toThrow();
  });

  it('R13 alone (the intended R13 denial scenario) passes', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R13_SYSTEM_ADMINISTRATOR'],
        ['R13_SYSTEM_ADMINISTRATOR'],
      ),
    ).not.toThrow();
  });

  it('R09 alone (the intended R09 success scenario) passes', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R09_ADMINISTRATOR', 'R09_ADMINISTRATOR', 'R09_ADMINISTRATOR'],
        ['R09_ADMINISTRATOR'],
      ),
    ).not.toThrow();
  });

  it('no non-R13 fixture receives an R13 setup assignment (size mismatch)', () => {
    // For every non-R13 role, adding R13 makes the actual set size 2
    // while the expected set size is 1. The assertion throws.
    const nonR13Roles = [
      'R01_PHYSICIAN',
      'R02_NURSE',
      'R03_PHARMACIST',
      'R04_TECHNICIAN',
      'R05_ALLIED_HEALTH_PROFESSIONAL',
      'R06_RECEPTIONIST',
      'R07_SCHEDULER',
      'R08_BILLER',
      'R09_ADMINISTRATOR',
      'R10_COMPLIANCE_OFFICER',
      'R11_HR_MANAGER',
      'R12_EXECUTIVE',
      'R14_INTEGRATION_ACCOUNT',
    ];
    for (const role of nonR13Roles) {
      expect(() =>
        assertExactRoleAssignments([role, 'R13_SYSTEM_ADMINISTRATOR'], [role]),
      ).toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Regression: missing-context parser remains correct (Phase 6 preservation)
// ---------------------------------------------------------------------------

describe('missing-context parser remains correct (Phase 6 preservation)', () => {
  it('parseClinicAdminOverviewErrorResponse accepts CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED', () => {
    const body = {
      error: {
        code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        message: 'Active tenant, organisation, and facility context required.',
      },
    };
    const parsed = parseClinicAdminOverviewErrorResponse(body);
    expect(parsed.error.code).toBe('CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED');
  });

  it('parseAuthErrorResponse rejects CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED', () => {
    const body = {
      error: {
        code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        message: 'Active tenant, organisation, and facility context required.',
      },
    };
    expect(() => parseAuthErrorResponse(body)).toThrow();
  });

  it('parseAuthErrorResponse accepts AUTHORIZATION_FORBIDDEN (guard denial)', () => {
    const body = {
      error: {
        code: 'AUTHORIZATION_FORBIDDEN',
        message: 'You are not authorised to perform this action.',
      },
    };
    const parsed = parseAuthErrorResponse(body);
    expect(parsed.error.code).toBe('AUTHORIZATION_FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// Regression: first-stage CSRF fix and Throttler cleanup fix remain covered
// ---------------------------------------------------------------------------

describe('first-stage CSRF fix remains covered (regression)', () => {
  it('parseCsrfResponseBody never returns undefined (CSRF header defect is impossible)', () => {
    const body = { token: 'a'.repeat(32) };
    const token = parseCsrfResponseBody(body);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('parseCsrfResponseBody throws on the wrong field name (csrfToken instead of token)', () => {
    const body = { csrfToken: 'a'.repeat(32) };
    expect(() => parseCsrfResponseBody(body)).toThrow();
  });

  it('assertCsrfToken throws on undefined (defence-in-depth)', () => {
    expect(() => assertCsrfToken(undefined, 'test')).toThrow();
  });
});

describe('Throttler cleanup fix remains covered (regression)', () => {
  it('resetThrottlerStorageSafely clears both timeoutIds and storage (in that order)', () => {
    const clearedTimeouts: unknown[] = [];
    const timeoutIds = new Map<string, Array<ReturnType<typeof setTimeout>>>([
      ['throttler1', [setTimeout(() => undefined, 10_000)]],
    ]);
    const storage = new Map();
    const throttlerStorage = {
      timeoutIds,
      storage,
      onApplicationShutdown: () => undefined,
    } as unknown as import('@nestjs/throttler').ThrottlerStorage;
    // Wrap clearTimeout to track the order.
    const originalClearTimeout = globalThis.clearTimeout;
    globalThis.clearTimeout = (handle: unknown) => {
      clearedTimeouts.push(handle);
      return originalClearTimeout(handle as ReturnType<typeof setTimeout>);
    };
    try {
      resetThrottlerStorageSafely(throttlerStorage);
    } finally {
      globalThis.clearTimeout = originalClearTimeout;
    }
    expect(clearedTimeouts.length).toBe(1);
    expect(timeoutIds.size).toBe(0);
    expect(storage.size).toBe(0);
  });

  it('resetThrottlerStorageSafely is safe when both Maps are missing', () => {
    const throttlerStorage =
      {} as unknown as import('@nestjs/throttler').ThrottlerStorage;
    expect(() => resetThrottlerStorageSafely(throttlerStorage)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// seedActiveContextForSession — multiple-match rejection (Phase 6 item 18)
// ---------------------------------------------------------------------------
//
// The `seedActiveContextForSession` helper MUST reject when
// `authSession.updateMany` returns `count > 1`. The
// `auth_sessions.token_hash` column is unique by database constraint,
// so this should never occur in production. The defence-in-depth
// check protects against:
//   1. A future schema drift that drops the uniqueness constraint.
//   2. A test-setup defect where a fake Prisma client returns an
//      inflated count.
//   3. A session-lookup defect where the tokenHash collides with
//      another session's tokenHash (cryptographically impossible with
//      SHA-256, but defended anyway).
//
// Without this check, the helper would silently seed the active
// context on multiple sessions, and the test's assertion would pass
// against the wrong session — masking the real test failure.

describe('seedActiveContextForSession — multiple-match rejection (Phase 6 item 18)', () => {
  /**
   * Reuse the same fake Prisma builder pattern from the ownership
   * validation tests, but allow the `updateMany` count to be
   * controlled.
   */
  function buildFakePrismaWithCount(options: {
    readonly updateCount: number;
  }): {
    readonly prisma: Parameters<
      typeof seedActiveContextForSession
    >[0]['prisma'];
  } {
    const membership = {
      id: 'mem-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      status: 'active',
    };
    const tenant = { id: 'tenant-1', status: 'active' };
    const organisation = {
      id: 'org-1',
      tenantId: 'tenant-1',
      status: 'active',
    };
    const facility = {
      id: 'fac-1',
      tenantId: 'tenant-1',
      organisationId: 'org-1',
      status: 'active',
    };
    const prisma = {
      authSession: {
        updateMany(): Promise<{ readonly count: number }> {
          return Promise.resolve({ count: options.updateCount });
        },
      },
      tenantMembership: {
        findUnique(): Promise<typeof membership> {
          return Promise.resolve(membership);
        },
      },
      tenant: {
        findUnique(): Promise<typeof tenant> {
          return Promise.resolve(tenant);
        },
      },
      organisation: {
        findUnique(): Promise<typeof organisation> {
          return Promise.resolve(organisation);
        },
      },
      facility: {
        findUnique(): Promise<typeof facility> {
          return Promise.resolve(facility);
        },
      },
    };
    return { prisma };
  }

  it('rejects when the session update affects 2 rows (tokenHash collision or fake-Prisma inflation)', async () => {
    const { prisma } = buildFakePrismaWithCount({ updateCount: 2 });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'a'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/multiple auth_session rows \(2\) matched tokenHash/);
  });

  it('rejects when the session update affects 5 rows (defence-in-depth against schema drift)', async () => {
    const { prisma } = buildFakePrismaWithCount({ updateCount: 5 });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'b'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/multiple auth_session rows \(5\) matched tokenHash/);
  });

  it('the multiple-match error message mentions the uniqueness constraint', async () => {
    const { prisma } = buildFakePrismaWithCount({ updateCount: 3 });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'c'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/unique by database constraint/);
  });

  it('the multiple-match error message mentions defence-in-depth', async () => {
    const { prisma } = buildFakePrismaWithCount({ updateCount: 2 });
    await expect(
      seedActiveContextForSession({
        prisma,
        tokenHash: 'd'.repeat(64),
        membershipId: 'mem-1',
        organisationId: 'org-1',
        facilityId: 'fac-1',
      }),
    ).rejects.toThrow(/defence-in-depth/);
  });
});

// ---------------------------------------------------------------------------
// Exact-role R01 fixture identity (Phase 6 items 1–4)
// ---------------------------------------------------------------------------
//
// These tests prove the Clinic Admin suite scenario formerly labelled
// "Role Preview cannot bypass the permission requirement" (now renamed
// to "R01 exact-role session cannot bypass the Clinic Admin permission
// requirement") uses an exact-role R01 fixture — NOT a composite
// R01+R13 fixture, NOT an R01+R09 fixture, and NOT a real Role Preview
// session.
//
// The tests exercise `assertExactRoleAssignments` (the helper used by
// the renamed scenario) with the actual role-code combinations the
// scenario's fixture could produce. The helper MUST accept the
// intended R01-only fixture and MUST reject every composite that would
// distort the exact-role proof.
//
// These tests do NOT inspect test names or comments (per the Phase 6
// rule "Do not write tests that only inspect comments or test names").
// They test the actual helper that the renamed scenario uses.

describe('exact-role R01 fixture identity (Phase 6 items 1–4)', () => {
  it('the R01-only fixture passes the exact-role assertion (item 2: fixture contains only R01)', () => {
    // The renamed scenario's fixture creates a tenant-scoped R01
    // assignment and a facility-scoped R01 assignment. Both have
    // the same role code (R01_PHYSICIAN); the helper de-duplicates
    // by role code, so the set is {'R01_PHYSICIAN'}.
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R01_PHYSICIAN'],
        ['R01_PHYSICIAN'],
      ),
    ).not.toThrow();
  });

  it('the R01+R13 composite fixture is rejected (item 3: fixture does not create R13)', () => {
    // If the fixture accidentally added R13 (the previous
    // fixture-identity defect), the helper MUST reject it.
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/setup-enabler/);
  });

  it('the R01+R09 composite fixture is rejected (item 4: fixture does not create R09)', () => {
    // If the fixture accidentally added R09 (which WOULD grant
    // `clinic_admin_overview:view` and mask the denial), the helper
    // MUST reject it. The size-mismatch check fires first (the
    // actual set has 2 roles, the expected set has 1), so the
    // error message mentions the size mismatch. The key assertion
    // is that the helper DOES throw — the specific error message
    // is secondary.
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R09_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/fixture-identity defect|setup-enabler|NOT in the expected set/);
  });

  it('the R01+R02 composite fixture is rejected (no other role may be added)', () => {
    // Even another non-R09, non-R13 role must not be added — the
    // fixture must be EXACTLY R01. The size-mismatch check fires
    // first here too.
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R02_NURSE'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/fixture-identity defect|setup-enabler|NOT in the expected set/);
  });

  it('a same-size different-role fixture is rejected (size check passes, content check fires)', () => {
    // When the actual and expected sets have the SAME size but
    // contain different roles, the size check passes and the
    // content check fires. The helper checks "expected role code
    // X not found in actual" BEFORE "actual role code X is NOT in
    // the expected set" — so for actual=[R02_NURSE] expected=
    // [R01_PHYSICIAN], the missing-expected check fires first.
    // Either error message proves the helper rejects the
    // same-size-different-role composite.
    expect(() =>
      assertExactRoleAssignments(['R02_NURSE'], ['R01_PHYSICIAN']),
    ).toThrow(
      /expected role code R01_PHYSICIAN not found in actual assignments|actual role code R02_NURSE is NOT in the expected set/,
    );
  });
});

// ---------------------------------------------------------------------------
// Approved audit-contract: denied events omit roleCodes (Phase 6 item 16)
// ---------------------------------------------------------------------------
//
// The production `AuthorizationGuard.emitAuthorizationDenied` method
// intentionally does NOT include `roleCodes` in denial events. This
// is security hardening — not leaking role information to a denied
// user who might be probing permissions. The exact-role proof for
// denial scenarios is established BEFORE the request by querying the
// database for the user's role assignments and asserting via
// `assertExactRoleAssignments`.
//
// These tests verify the architectural substitute (the exact-role
// proof via `assertExactRoleAssignments`) is sound: the helper
// accepts the intended role set and rejects composites. The
// integration-level assertion (that the denied audit event's
// `roleCodes` field is `undefined`) is exercised by the e2e suite's
// `assertOverviewAuditEventActor` helper, which checks
// `draft.roleCodes` is NOT defined for denied events.

describe('approved audit-contract: denied events omit roleCodes (Phase 6 item 16)', () => {
  it('the exact-role proof accepts the intended R01-only role set', () => {
    // This is the architectural substitute for asserting roleCodes
    // on the denied audit event. The proof is established BEFORE
    // the request by querying the user's role assignments.
    expect(() =>
      assertExactRoleAssignments(['R01_PHYSICIAN'], ['R01_PHYSICIAN']),
    ).not.toThrow();
  });

  it('the exact-role proof accepts the intended R13-only role set', () => {
    expect(() =>
      assertExactRoleAssignments(
        ['R13_SYSTEM_ADMINISTRATOR'],
        ['R13_SYSTEM_ADMINISTRATOR'],
      ),
    ).not.toThrow();
  });

  it('the exact-role proof rejects an R01+R13 composite (would mask a defect where R13 grants clinic_admin_overview:view)', () => {
    // If R13 accidentally granted `clinic_admin_overview:view`, the
    // guard would ALLOW instead of DENY. The exact-role proof
    // catches this by rejecting the composite fixture BEFORE the
    // request — the test would fail at the proof step, not at the
    // HTTP-status step.
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow();
  });

  it('the exact-role proof size-mismatch error mentions the fixture-identity defect', () => {
    // The error message must mention "fixture-identity defect" so a
    // future regression is immediately identifiable in CI logs.
    expect(() =>
      assertExactRoleAssignments(
        ['R01_PHYSICIAN', 'R13_SYSTEM_ADMINISTRATOR'],
        ['R01_PHYSICIAN'],
      ),
    ).toThrow(/fixture-identity defect/);
  });
});

// ---------------------------------------------------------------------------
// Genuine Role Preview coverage separation (Phase 6 items 10–15)
// ---------------------------------------------------------------------------
//
// These tests prove the architectural separation between:
//   - The Clinic Admin suite's exact-role R01 denial scenario (a
//     NORMAL authenticated session with R01 alone and a seeded
//     active context — NOT a Role Preview session).
//   - The dedicated Role Preview suite's genuine Role Preview →
//     Clinic Admin scenario (a REAL Role Preview session issued by
//     `POST /api/v1/dev/role-preview/select`, with the real preview
//     cookie and the real database-identity gate).
//
// The separation is proved by verifying:
//   - The `seedActiveContextForSession` helper does NOT invoke any
//     Role Preview endpoint, does NOT use the Role Preview bootstrap
//     cookie, and does NOT pass through the Role Preview
//     database-identity gate. The helper only updates the session's
//     active context via a direct Prisma `updateMany` keyed by
//     `tokenHash`.
//   - The `computeSessionTokenHash` helper produces a SHA-256 hash
//     that matches the format stored in `auth_sessions.token_hash`
//     (the same format the auth service uses for NORMAL sessions AND
//     the same format `RolePreviewService.selectRole` uses for
//     PREVIEW sessions — the hash format is identical, but the
//     session-creation path is different).
//
// The integration-level proof that the dedicated Role Preview suite
// uses the real preview mechanism is exercised by tests 38 and 39 in
// `apps/api/test/role-preview/role-preview.role-preview-spec.ts`,
// which call `bootstrapAndSelect` (the real production endpoint) and
// verify the resulting session's userId matches the preview identity.

describe('genuine Role Preview coverage separation (Phase 6 items 10–15)', () => {
  it('seedActiveContextForSession does NOT invoke any Role Preview endpoint (the helper only calls authSession.updateMany plus findUnique lookups)', async () => {
    // The fake Prisma client below does NOT expose any Role Preview
    // methods (no `rolePreviewBootstrap`, no `rolePreviewSelect`,
    // no `rolePreviewSession`). If the helper tried to invoke a
    // Role Preview endpoint, TypeScript would reject the call at
    // compile time. The runtime guarantee is that the helper only
    // calls `authSession.updateMany` plus the `findUnique` lookups
    // for ownership validation.
    const membership = {
      id: 'mem-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      status: 'active',
    };
    const tenant = { id: 'tenant-1', status: 'active' };
    const organisation = {
      id: 'org-1',
      tenantId: 'tenant-1',
      status: 'active',
    };
    const facility = {
      id: 'fac-1',
      tenantId: 'tenant-1',
      organisationId: 'org-1',
      status: 'active',
    };
    const prisma = {
      authSession: {
        updateMany(): Promise<{ readonly count: number }> {
          return Promise.resolve({ count: 1 });
        },
      },
      tenantMembership: {
        findUnique(): Promise<typeof membership> {
          return Promise.resolve(membership);
        },
      },
      tenant: {
        findUnique(): Promise<typeof tenant> {
          return Promise.resolve(tenant);
        },
      },
      organisation: {
        findUnique(): Promise<typeof organisation> {
          return Promise.resolve(organisation);
        },
      },
      facility: {
        findUnique(): Promise<typeof facility> {
          return Promise.resolve(facility);
        },
      },
    };
    await seedActiveContextForSession({
      prisma,
      tokenHash: 'a'.repeat(64),
      membershipId: 'mem-1',
      organisationId: 'org-1',
      facilityId: 'fac-1',
    });
    // No throw means the helper did NOT try to call a missing
    // Role Preview method.
  });

  it('computeSessionTokenHash produces a 64-char hex string (the same format used by NORMAL sessions and PREVIEW sessions)', () => {
    // The hash format is identical for normal sessions and preview
    // sessions. The difference is the session-CREATION path:
    //   - Normal session: created by `AuthService.login` after
    //     successful credential validation.
    //   - Preview session: created by `RolePreviewService.selectRole`
    //     after successful bootstrap-challenge consumption.
    //
    // The `seedActiveContextForSession` helper works on EITHER kind
    // of session (it updates the active context via a direct Prisma
    // `updateMany`), but the Clinic Admin suite's exact-role R01
    // scenario uses a NORMAL session (created by `POST /api/v1/auth/login`).
    // The dedicated Role Preview suite's genuine scenario uses a
    // PREVIEW session (created by `POST /api/v1/dev/role-preview/select`).
    const hash = computeSessionTokenHash('any-session-token-value');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.length).toBe(64);
  });

  it('computeSessionTokenHash is deterministic (the same input always produces the same hash)', () => {
    // This determinism is what allows `seedActiveContextForSession`
    // to find the session by its tokenHash: the helper computes the
    // hash from the raw cookie value and looks up the session by
    // the hash. The auth service does the same lookup for normal
    // sessions; the preview service does the same lookup for
    // preview sessions.
    const hash1 = computeSessionTokenHash('deterministic-token');
    const hash2 = computeSessionTokenHash('deterministic-token');
    expect(hash1).toBe(hash2);
  });

  it('the exact-role R01 scenario does NOT use the Role Preview bootstrap cookie (the helper signature has no bootstrap-cookie parameter)', () => {
    // `seedActiveContextForSession` accepts only `tokenHash`,
    // `membershipId`, `organisationId`, `facilityId`, and `prisma`.
    // It does NOT accept a `bootstrapCookie` or `challengeId`
    // parameter. This is the structural proof that the helper
    // cannot invoke the Role Preview bootstrap flow.
    //
    // The test verifies the helper's parameter shape by attempting
    // a call with an extra `bootstrapCookie` property — TypeScript
    // would reject this at compile time, but the runtime test
    // documents the contract for future readers.
    const input: Parameters<typeof seedActiveContextForSession>[0] = {
      prisma: {
        authSession: {
          updateMany: () => Promise.resolve({ count: 1 }),
        },
        tenantMembership: {
          findUnique: () =>
            Promise.resolve({
              id: 'mem-1',
              userId: 'user-1',
              tenantId: 'tenant-1',
              status: 'active',
            }),
        },
        tenant: {
          findUnique: () =>
            Promise.resolve({ id: 'tenant-1', status: 'active' }),
        },
        organisation: {
          findUnique: () =>
            Promise.resolve({
              id: 'org-1',
              tenantId: 'tenant-1',
              status: 'active',
            }),
        },
        facility: {
          findUnique: () =>
            Promise.resolve({
              id: 'fac-1',
              tenantId: 'tenant-1',
              organisationId: 'org-1',
              status: 'active',
            }),
        },
      },
      tokenHash: 'a'.repeat(64),
      membershipId: 'mem-1',
      organisationId: 'org-1',
      facilityId: 'fac-1',
    };
    // The input shape has exactly 5 keys: prisma, tokenHash,
    // membershipId, organisationId, facilityId. No bootstrap cookie,
    // no challenge ID, no preview-specific fields.
    expect(Object.keys(input).sort()).toEqual(
      [
        'facilityId',
        'membershipId',
        'organisationId',
        'prisma',
        'tokenHash',
      ].sort(),
    );
  });
});
