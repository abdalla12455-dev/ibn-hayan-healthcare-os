import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
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
 */
export function rolePreviewRoleUnknown(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'ROLE_PREVIEW_ROLE_UNKNOWN',
      message: 'Unknown role code.',
    },
  });
}

/**
 * Return a 400 for a malformed request body at the select endpoint.
 */
export function rolePreviewRequestInvalid(): ForbiddenException {
  return new ForbiddenException({
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
