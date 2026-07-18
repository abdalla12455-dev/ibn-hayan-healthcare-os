import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

/**
 * Auth-module error helpers.
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. The `invalidCredentials` error returns the same generic
 * 401 response for:
 * - unknown email;
 * - wrong password;
 * - disabled user;
 * - no active membership.
 *
 * The error message is the same in every case: "Invalid email or
 * password." The audit trail (when audit persistence is added in a
 * future batch) records the specific failure reason; the client-
 * facing response does not.
 *
 * Per ADR-013 §1.4, the per-operation verification chain returns:
 * - 401 Unauthorized for missing/expired/revoked sessions;
 * - 403 Forbidden for missing/invalid CSRF tokens and disallowed
 *   Origins.
 *
 * The error envelope shape is governed by the `AuthErrorResponseSchema`
 * in `@ibn-hayan/contracts`. The error code is a stable machine-
 * readable string; the message is a generic human-readable string.
 */

/**
 * Return a generic 401 for invalid credentials at login.
 *
 * Per ADR-013 §1.1, the same response is returned for unknown email,
 * wrong password, disabled user, and no active membership. The
 * caller does not pass the specific reason; the error message is
 * always the same.
 */
export function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    error: {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    },
  });
}

/**
 * Return a 401 for a missing, expired, or revoked session at the
 * session endpoint or any authenticated endpoint.
 */
export function sessionRequired(): UnauthorizedException {
  return new UnauthorizedException({
    error: {
      code: 'AUTH_SESSION_REQUIRED',
      message: 'A valid session is required.',
    },
  });
}

/**
 * Return a 403 for a missing or invalid CSRF token at logout.
 */
export function csrfInvalid(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'AUTH_CSRF_INVALID',
      message: 'CSRF token is missing or invalid.',
    },
  });
}

/**
 * Return a 403 for a disallowed Origin at logout (or any state-
 * changing auth endpoint).
 */
export function originDisallowed(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'AUTH_ORIGIN_DISALLOWED',
      message: 'Request origin is not allowed.',
    },
  });
}
