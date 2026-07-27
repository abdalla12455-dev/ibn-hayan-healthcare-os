import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { clinicAdminOverviewContextRequired } from './clinic-admin.errors.js';

/**
 * Helper-contract regression tests for the Clinic Admin Overview
 * error helpers.
 *
 * IMPORTANT — scope of these tests:
 *
 * These tests validate the HELPER CONTRACT (the NestJS exception
 * type, HTTP status code, error envelope shape, and structured
 * error code produced by the helper in isolation). They do NOT
 * validate the public controller runtime path, and they do NOT
 * prove which helper the public controller actually invokes for a
 * given input.
 *
 * The integration with the controller and service is verified in
 * `clinic-admin-overview.service.spec.ts` (which proves the service
 * throws `clinicAdminOverviewContextRequired()` for missing/invalid
 * context) and would be further verified by a PostgreSQL 17
 * integration test that exercises the full HTTP path (not run
 * locally; GitHub Actions remains authoritative).
 *
 * These tests guard against a regression in which
 * `clinicAdminOverviewContextRequired()` returned the wrong HTTP
 * status (e.g. 400 instead of 403) or the wrong error code (e.g.
 * `AUTHORIZATION_FORBIDDEN` instead of
 * `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED`). The Clinic Admin
 * Overview endpoint must return 403 for missing/invalid context
 * because:
 * - 401 is reserved for missing/invalid/expired/revoked sessions
 *   (handled by the controller via `sessionRequired()`).
 * - 403 is the correct status for an authenticated principal who
 *   lacks the required active context (the session is valid, but
 *   the active tenant/organisation/facility is missing or
 *   invalid).
 * - 400 would imply the request was malformed, which is not the
 *   case (the request has no body or query string; the context is
 *   read from the session).
 *
 * Per the live-data task specification Phase 7, the error response
 * is generic: it does NOT reveal which dimension of context is
 * missing (tenant, organisation, or facility). The same response is
 * returned for every missing/invalid dimension.
 */
describe('clinicAdminOverviewContextRequired', () => {
  it('returns a ForbiddenException (HTTP 403)', () => {
    const exc = clinicAdminOverviewContextRequired();
    expect(exc).toBeInstanceOf(ForbiddenException);
    expect(exc.getStatus()).toBe(403);
  });

  it('returns the CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED error code', () => {
    const exc = clinicAdminOverviewContextRequired();
    const response = exc.getResponse() as {
      error: { code: string; message: string };
    };
    expect(response.error.code).toBe('CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED');
  });

  it('returns a non-empty message that does not reveal which context dimension is missing', () => {
    const exc = clinicAdminOverviewContextRequired();
    const response = exc.getResponse() as {
      error: { code: string; message: string };
    };
    expect(response.error.message.length).toBeGreaterThan(0);
    // The message MUST NOT mention "tenant", "organisation", or
    // "facility" individually in a way that reveals which
    // dimension is missing. The approved message mentions all
    // three together so the caller cannot distinguish which one is
    // the missing dimension.
    expect(response.error.message).toContain('tenant');
    expect(response.error.message).toContain('organisation');
    expect(response.error.message).toContain('facility');
  });

  it('produces the exact approved error envelope shape', () => {
    const exc = clinicAdminOverviewContextRequired();
    const response = exc.getResponse() as {
      error: { code: string; message: string };
    };
    // The envelope MUST be { error: { code, message } } with no
    // extra fields. This matches the existing auth/context error
    // envelope so the frontend can use a single error-handling
    // code path.
    expect(response.error.code).toBe('CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED');
    expect(typeof response.error.message).toBe('string');
    expect(response.error.message.length).toBeGreaterThan(0);
    expect(Object.keys(response)).toEqual(['error']);
    expect(Object.keys(response.error).sort()).toEqual(['code', 'message']);
  });
});
