import { describe, expect, it } from 'vitest';
import {
  rolePreviewDisabled,
  rolePreviewRoleUnknown,
  rolePreviewRequestInvalid,
  rolePreviewSessionRequired,
  rolePreviewCsrfInvalid,
  rolePreviewOriginDisallowed,
  rolePreviewNotActive,
  rolePreviewBootstrapExpired,
  rolePreviewBootstrapReplay,
  rolePreviewBootstrapInvalid,
  rolePreviewDatabaseIdentityInvalid,
} from './role-preview.errors.js';

/**
 * Helper-contract regression tests for the Demo Role Preview Mode
 * error helpers.
 *
 * IMPORTANT — scope of these tests:
 *
 * These tests validate the HELPER CONTRACT (the NestJS exception
 * type, HTTP status code, error envelope shape, and structured
 * error code produced by each helper in isolation). They do NOT
 * validate the public controller runtime path, and they do NOT
 * prove which helper the public controller actually invokes for a
 * given input.
 *
 * In particular:
 * - `rolePreviewRoleUnknown()` is a defence-in-depth SERVICE
 *   helper. It is NOT reachable from the current public
 *   `RolePreviewController.selectRole()` for any request, because
 *   the controller's strict Zod boundary
 *   (`SelectPreviewRoleRequestSchema`, whose `roleCode` field is
 *   constrained to the `RoleCodeSchema` enum of the 14 canonical
 *   codes R01–R14) rejects any non-canonical role code at the
 *   controller boundary and throws `rolePreviewRequestInvalid()`
 *   (HTTP 400 + `ROLE_PREVIEW_REQUEST_INVALID`) WITHOUT reaching
 *   the service. The `rolePreviewRoleUnknown()` tests below
 *   validate the helper's contract so that the helper remains
 *   correct for a hypothetical internal or future caller that
 *   bypasses the public Zod boundary. No such caller exists in
 *   the current codebase.
 * - `rolePreviewRequestInvalid()` IS the public controller's
 *   reachable 400 helper. The integration tests
 *   `15. Unknown role fails (400)` and
 *   `16. Caller-supplied IDs fail contract validation (400)` in
 *   `role-preview.role-preview-spec.ts` prove the controller
 *   invokes this helper for non-canonical role codes and for
 *   caller-supplied server-owned identity fields, respectively.
 *   Those integration tests also assert the structured error code
 *   and prove the service is NOT reached.
 *
 * These tests guard against a regression in which
 * `rolePreviewRoleUnknown()` and `rolePreviewRequestInvalid()`
 * incorrectly returned `ForbiddenException` (HTTP 403) instead of
 * `BadRequestException` (HTTP 400). The integration tests caught
 * the contract violation for `rolePreviewRequestInvalid()` (the
 * reachable helper); the unit test for `rolePreviewRoleUnknown()`
 * guards the defence-in-depth helper's contract independently.
 *
 * The tests verify:
 * 1. Each error helper returns the correct NestJS exception type.
 * 2. Each error helper produces the correct HTTP status code when
 *    the exception is serialised by Nest's default exception
 *    filter.
 * 3. The error envelope shape (`{ error: { code, message } }`) is
 *    preserved for every helper.
 * 4. The error code is the stable machine-readable string documented
 *    in the helper's JSDoc.
 *
 * These tests run locally without PostgreSQL 17 and would have
 * failed before the fix (the two helpers returned 403 instead of
 * 400).
 */
describe('role-preview error helpers: HTTP status codes', () => {
  describe('rolePreviewRoleUnknown (defence-in-depth SERVICE helper; NOT reachable from the public controller)', () => {
    it('returns a 400 BadRequestException (not 403 ForbiddenException)', () => {
      const exc = rolePreviewRoleUnknown();
      // The fix: this must be a BadRequestException (HTTP 400), not
      // a ForbiddenException (HTTP 403). An unknown role code is a
      // client-side request error, not an authorisation failure.
      //
      // NOTE: this test validates the HELPER contract only. The
      // public controller does NOT invoke this helper for any
      // request because the strict Zod boundary
      // (SelectPreviewRoleRequestSchema, with roleCode constrained
      // to the RoleCodeSchema enum) rejects non-canonical role
      // codes at the controller boundary and throws
      // rolePreviewRequestInvalid() instead. The integration test
      // `15. Unknown role fails (400)` proves the controller's
      // runtime behaviour. This unit test guards the helper's
      // contract for a hypothetical internal or future caller that
      // bypasses the public Zod boundary.
      expect(exc.constructor.name).toBe('BadRequestException');
      expect(exc.getStatus()).toBe(400);
    });

    it('preserves the ROLE_PREVIEW_ROLE_UNKNOWN error code', () => {
      const exc = rolePreviewRoleUnknown();
      const response = exc.getResponse() as {
        error: { code: string; message: string };
      };
      // Validates the helper's structured error code. This code is
      // NOT produced by the current public controller for any
      // request; it is the defence-in-depth code the service would
      // throw if a caller bypassed the public Zod boundary.
      expect(response.error.code).toBe('ROLE_PREVIEW_ROLE_UNKNOWN');
      expect(response.error.message).toBe('Unknown role code.');
    });
  });

  describe('rolePreviewRequestInvalid (the public controller REACHABLE 400 helper)', () => {
    it('returns a 400 BadRequestException (not 403 ForbiddenException)', () => {
      const exc = rolePreviewRequestInvalid();
      // The fix: this must be a BadRequestException (HTTP 400), not
      // a ForbiddenException (HTTP 403). A malformed request body is
      // a client-side request error, not an authorisation failure.
      expect(exc.constructor.name).toBe('BadRequestException');
      expect(exc.getStatus()).toBe(400);
    });

    it('preserves the ROLE_PREVIEW_REQUEST_INVALID error code', () => {
      const exc = rolePreviewRequestInvalid();
      const response = exc.getResponse() as {
        error: { code: string; message: string };
      };
      expect(response.error.code).toBe('ROLE_PREVIEW_REQUEST_INVALID');
      expect(response.error.message).toBe('Request body is invalid.');
    });
  });

  // The following helpers were already correct; these tests
  // document the existing contract and guard against accidental
  // changes.

  describe('rolePreviewDisabled', () => {
    it('returns a 404 NotFoundException', () => {
      const exc = rolePreviewDisabled();
      expect(exc.constructor.name).toBe('NotFoundException');
      expect(exc.getStatus()).toBe(404);
    });
  });

  describe('rolePreviewSessionRequired', () => {
    it('returns a 401 UnauthorizedException', () => {
      const exc = rolePreviewSessionRequired();
      expect(exc.constructor.name).toBe('UnauthorizedException');
      expect(exc.getStatus()).toBe(401);
    });
  });

  describe('rolePreviewCsrfInvalid', () => {
    it('returns a 403 ForbiddenException', () => {
      const exc = rolePreviewCsrfInvalid();
      expect(exc.constructor.name).toBe('ForbiddenException');
      expect(exc.getStatus()).toBe(403);
    });
  });

  describe('rolePreviewOriginDisallowed', () => {
    it('returns a 403 ForbiddenException', () => {
      const exc = rolePreviewOriginDisallowed();
      expect(exc.constructor.name).toBe('ForbiddenException');
      expect(exc.getStatus()).toBe(403);
    });
  });

  describe('rolePreviewNotActive', () => {
    it('returns a 403 ForbiddenException', () => {
      const exc = rolePreviewNotActive();
      expect(exc.constructor.name).toBe('ForbiddenException');
      expect(exc.getStatus()).toBe(403);
    });
  });

  describe('rolePreviewBootstrapExpired', () => {
    it('returns a 403 ForbiddenException', () => {
      const exc = rolePreviewBootstrapExpired();
      expect(exc.constructor.name).toBe('ForbiddenException');
      expect(exc.getStatus()).toBe(403);
    });
  });

  describe('rolePreviewBootstrapReplay', () => {
    it('returns a 403 ForbiddenException', () => {
      const exc = rolePreviewBootstrapReplay();
      expect(exc.constructor.name).toBe('ForbiddenException');
      expect(exc.getStatus()).toBe(403);
    });
  });

  describe('rolePreviewBootstrapInvalid', () => {
    it('returns a 403 ForbiddenException', () => {
      const exc = rolePreviewBootstrapInvalid();
      expect(exc.constructor.name).toBe('ForbiddenException');
      expect(exc.getStatus()).toBe(403);
    });
  });

  describe('rolePreviewDatabaseIdentityInvalid', () => {
    it('returns a 403 ForbiddenException', () => {
      const exc = rolePreviewDatabaseIdentityInvalid();
      expect(exc.constructor.name).toBe('ForbiddenException');
      expect(exc.getStatus()).toBe(403);
    });
  });

  describe('error envelope shape consistency', () => {
    // All role-preview error helpers MUST produce the same envelope
    // shape: `{ error: { code: string, message: string } }`. This
    // shape is governed by `RolePreviewErrorResponseSchema` in
    // `@ibn-hayan/contracts`. A client can rely on the shape to
    // render a generic error UI without inspecting the HTTP status.
    it('every helper returns { error: { code, message } }', () => {
      const helpers = [
        rolePreviewDisabled(),
        rolePreviewRoleUnknown(),
        rolePreviewRequestInvalid(),
        rolePreviewSessionRequired(),
        rolePreviewCsrfInvalid(),
        rolePreviewOriginDisallowed(),
        rolePreviewNotActive(),
        rolePreviewBootstrapExpired(),
        rolePreviewBootstrapReplay(),
        rolePreviewBootstrapInvalid(),
        rolePreviewDatabaseIdentityInvalid(),
      ];
      for (const exc of helpers) {
        const response = exc.getResponse() as unknown;
        expect(response).toBeInstanceOf(Object);
        const envelope = (response as { error: unknown }).error;
        expect(envelope).toBeInstanceOf(Object);
        const error = envelope as { code: string; message: string };
        expect(typeof error.code).toBe('string');
        expect(error.code.length).toBeGreaterThan(0);
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });
});
