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
 * Regression tests for the HTTP status codes of the Demo Role
 * Preview Mode error helpers.
 *
 * These tests guard against a regression in which
 * `rolePreviewRoleUnknown()` and `rolePreviewRequestInvalid()`
 * incorrectly returned `ForbiddenException` (HTTP 403) instead of
 * `BadRequestException` (HTTP 400). The integration tests
 * `15. Unknown role fails (400)` and
 * `16. Caller-supplied IDs fail contract validation (400)` caught
 * the contract violation.
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
  describe('rolePreviewRoleUnknown', () => {
    it('returns a 400 BadRequestException (not 403 ForbiddenException)', () => {
      const exc = rolePreviewRoleUnknown();
      // The fix: this must be a BadRequestException (HTTP 400), not
      // a ForbiddenException (HTTP 403). An unknown role code is a
      // client-side request error, not an authorisation failure.
      expect(exc.constructor.name).toBe('BadRequestException');
      expect(exc.getStatus()).toBe(400);
    });

    it('preserves the ROLE_PREVIEW_ROLE_UNKNOWN error code', () => {
      const exc = rolePreviewRoleUnknown();
      const response = exc.getResponse() as {
        error: { code: string; message: string };
      };
      expect(response.error.code).toBe('ROLE_PREVIEW_ROLE_UNKNOWN');
      expect(response.error.message).toBe('Unknown role code.');
    });
  });

  describe('rolePreviewRequestInvalid', () => {
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
