import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

/**
 * Demo Role Preview Mode error helpers.
 *
 * Per the Demo Role Preview Mode v1 specification, the feature is
 * development-only and MUST fail-closed in production. The error
 * helpers here return the same generic shape for related conditions
 * so the client cannot distinguish between them (defence-in-depth).
 *
 * The error envelope shape is governed by the
 * `RolePreviewErrorResponseSchema` in `@ibn-hayan/contracts`. The
 * error code is a stable machine-readable string; the message is a
 * generic human-readable string that does NOT reveal internal
 * details.
 *
 * HTTP status mapping:
 * - 404 `ROLE_PREVIEW_DISABLED`: the feature is unavailable
 *   (production or flag off). The endpoint returns a 404 so that
 *   the route's existence is not advertised in production.
 * - 400 `ROLE_PREVIEW_ROLE_UNKNOWN`: the supplied role code is not
 *   a canonical role code.
 * - 400 `ROLE_PREVIEW_REQUEST_INVALID`: the request body failed
 *   contract validation.
 * - 401 `ROLE_PREVIEW_SESSION_REQUIRED`: the session is missing,
 *   expired, or revoked.
 * - 403 `ROLE_PREVIEW_CSRF_INVALID`: the CSRF token is missing or
 *   invalid.
 * - 403 `ROLE_PREVIEW_ORIGIN_DISALLOWED`: the Origin is missing or
 *   disallowed.
 * - 403 `ROLE_PREVIEW_NOT_ACTIVE`: the caller is not currently in
 *   a preview session (for the end endpoint).
 */

/**
 * Return a 404 for the role-preview feature being unavailable
 * (production or flag off). The 404 status deliberately does NOT
 * advertise the route's existence in production.
 */
export function rolePreviewDisabled(): NotFoundException {
  return new NotFoundException({
    error: {
      code: 'ROLE_PREVIEW_DISABLED',
      message: 'Role Preview Mode is unavailable.',
    },
  });
}

/**
 * Return a 400 for an unknown role code at the select endpoint.
 *
 * Per HTTP semantics and the Role Preview contract, an unknown role
 * code is a client-side request error (the caller supplied a value
 * that does not match any canonical role code). The correct status
 * is 400 Bad Request, NOT 403 Forbidden. A 403 would imply the
 * caller is authenticated but not authorised to perform the
 * operation; a 400 correctly communicates that the request itself
 * is malformed.
 *
 * The previous implementation incorrectly used `ForbiddenException`
 * (403). The integration test `15. Unknown role fails (400)`
 * catches this contract violation. This helper now returns
 * `BadRequestException` (400) to match the documented contract.
 */
export function rolePreviewRoleUnknown(): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'ROLE_PREVIEW_ROLE_UNKNOWN',
      message: 'Unknown role code.',
    },
  });
}

/**
 * Return a 400 for a malformed request body at the select endpoint.
 *
 * Per HTTP semantics and the Role Preview contract, a request body
 * that fails Zod `.strict()` contract validation (unknown keys,
 * wrong types, missing required fields) is a client-side request
 * error. The correct status is 400 Bad Request, NOT 403 Forbidden.
 *
 * The previous implementation incorrectly used `ForbiddenException`
 * (403). The integration test
 * `16. Caller-supplied IDs fail contract validation (400)` catches
 * this contract violation. This helper now returns
 * `BadRequestException` (400) to match the documented contract.
 */
export function rolePreviewRequestInvalid(): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'ROLE_PREVIEW_REQUEST_INVALID',
      message: 'Request body is invalid.',
    },
  });
}

/**
 * Return a 401 for a missing, expired, or revoked session at the
 * current / select / end endpoints.
 */
export function rolePreviewSessionRequired(): UnauthorizedException {
  return new UnauthorizedException({
    error: {
      code: 'ROLE_PREVIEW_SESSION_REQUIRED',
      message: 'A valid session is required.',
    },
  });
}

/**
 * Return a 403 for a missing or invalid CSRF token at the select /
 * end endpoints.
 */
export function rolePreviewCsrfInvalid(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_CSRF_INVALID',
      message: 'CSRF token is missing or invalid.',
    },
  });
}

/**
 * Return a 403 for a disallowed Origin at the select / end
 * endpoints.
 */
export function rolePreviewOriginDisallowed(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_ORIGIN_DISALLOWED',
      message: 'Request origin is not allowed.',
    },
  });
}

/**
 * Return a 403 for the end endpoint when the caller is not
 * currently in a preview session.
 */
export function rolePreviewNotActive(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_NOT_ACTIVE',
      message: 'No active preview session.',
    },
  });
}

/**
 * Return a 403 for the bootstrap / select endpoint when the
 * supplied bootstrap challenge has expired. The challenge may have
 * expired because the bootstrap cookie's Max-Age (5 minutes) has
 * elapsed, or because the server-side challenge state was
 * garbage-collected.
 *
 * The same generic shape is used for "expired", "not found", and
 * "replay" so that the client cannot distinguish between them
 * (defence-in-depth). The code is stable so that the frontend can
 * render an honest "expired challenge" message that prompts the
 * operator to request a fresh bootstrap.
 */
export function rolePreviewBootstrapExpired(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_BOOTSTRAP_EXPIRED',
      message: 'Bootstrap challenge is expired or not found.',
    },
  });
}

/**
 * Return a 403 for the select endpoint when the supplied bootstrap
 * challenge has already been consumed. Each challenge is one-time
 * use; a second call with the same challenge is a replay.
 *
 * The same generic shape is used for "expired", "not found", and
 * "replay" so that the client cannot distinguish between them.
 */
export function rolePreviewBootstrapReplay(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_BOOTSTRAP_REPLAY',
      message: 'Bootstrap challenge is expired or not found.',
    },
  });
}

/**
 * Return a 403 for the select endpoint when the supplied bootstrap
 * challenge is invalid. This is the proof-of-possession failure:
 * the `challengeId` exists in the store, but the nonce read from
 * the bootstrap cookie does not match the stored nonce hash. This
 * happens when:
 * - the bootstrap cookie was not sent (e.g. the operator cleared
 *   cookies);
 * - the wrong cookie was sent (e.g. a stale cookie from a previous
 *   bootstrap);
 * - the cookie value was tampered with.
 *
 * The same generic shape is used so that the client cannot
 * distinguish between "invalid", "expired", and "replay".
 */
export function rolePreviewBootstrapInvalid(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_BOOTSTRAP_INVALID',
      message: 'Bootstrap challenge is expired or not found.',
    },
  });
}

/**
 * Return a 403 for the bootstrap / select endpoint when the
 * bootstrap flow is unavailable because the preview database
 * identity could not be verified. This is the database-identity
 * gate: the role-preview feature is only available when
 * `DATABASE_URL` positively identifies an isolated role-preview
 * transactional database AND `AUDIT_DATABASE_URL` positively
 * identifies an isolated role-preview audit database.
 *
 * The same generic shape is used so that the client cannot
 * distinguish this from the general "disabled" condition.
 */
export function rolePreviewDatabaseIdentityInvalid(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_DATABASE_IDENTITY_INVALID',
      message: 'Role Preview Mode is unavailable.',
    },
  });
}
