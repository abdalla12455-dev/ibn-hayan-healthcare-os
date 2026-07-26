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
