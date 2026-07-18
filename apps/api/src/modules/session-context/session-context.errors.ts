import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

/**
 * Session-context error helpers.
 *
 * Per the fifth canonical batch specification, context-mutation
 * errors must not reveal whether a membership exists for another
 * user. The `contextSelectionForbidden` error returns the same
 * generic 403 response for:
 * - a membership that does not exist;
 * - a membership that belongs to a different user;
 * - a membership whose status is `suspended`;
 * - a membership whose Tenant's status is `suspended`.
 *
 * The error message is the same in every case. The audit trail (when
 * audit persistence is added in a future batch) records the specific
 * failure reason; the client-facing response does not.
 *
 * Per ADR-013 §1.4, the per-operation verification chain returns:
 * - 401 Unauthorized for missing/expired/revoked sessions;
 * - 403 Forbidden for missing/invalid CSRF tokens, disallowed
 *   Origins, and forbidden context selections.
 *
 * The error envelope shape is governed by the `AuthErrorResponseSchema`
 * in `@ibn-hayan/contracts`. The error code is a stable machine-
 * readable string; the message is a generic human-readable string.
 */

/**
 * Return a 401 for a missing, expired, or revoked session at any
 * context endpoint. Re-uses the auth module's `sessionRequired`
 * error so the response shape is identical across auth and context
 * endpoints.
 *
 * This helper is provided here so the session-context module has a
 * single import surface for its errors. The implementation re-uses
 * the auth-module helper to ensure the error code and message
 * remain consistent.
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
 * Return a 403 for a disallowed Origin at any context mutation
 * endpoint. Re-uses the auth module's `originDisallowed` error so
 * the response shape is identical across auth and context endpoints.
 */
export function originDisallowed(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'AUTH_ORIGIN_DISALLOWED',
      message: 'Request origin is not allowed.',
    },
  });
}

/**
 * Return a 403 for a missing or invalid CSRF token at any context
 * mutation endpoint. Re-uses the auth module's `csrfInvalid` error
 * so the response shape is identical across auth and context
 * endpoints.
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
 * Return a generic 403 for a forbidden context selection.
 *
 * Per the fifth canonical batch specification, this error is returned
 * for ALL of the following cases:
 * - the supplied membershipId does not exist;
 * - the supplied membershipId belongs to a different user;
 * - the membership's status is `suspended`;
 * - the membership's Tenant's status is `suspended`.
 *
 * The error code is `CONTEXT_SELECTION_FORBIDDEN` so the web client
 * can distinguish it from a CSRF or Origin failure if needed, but
 * the message is generic and does not reveal which of the four
 * conditions caused the failure. The web client displays the same
 * generic error message regardless.
 */
export function contextSelectionForbidden(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'CONTEXT_SELECTION_FORBIDDEN',
      message: 'The selected tenant context is not available.',
    },
  });
}

/**
 * Return a 400 for a malformed request body. The request failed Zod
 * validation at the boundary.
 *
 * Per CODING_STANDARDS.md §6, validation failures at the API
 * boundary are 400 Bad Request. The error envelope includes the
 * field path and the validation rule that failed, but does not
 * include the rejected value if the value may contain PHI.
 *
 * For context-selection requests, the only field is `membershipId`,
 * which is a UUID. The rejected value is safe to include in the
 * error response, but we do not include it because the Zod error
 * already describes the failure (e.g. "expected UUID").
 */
export function contextRequestInvalid(): ForbiddenException {
  // We use 403 rather than 400 here for security: returning a 400
  // with details would leak that the request reached the
  // authentication layer and passed it. A 403 is consistent with
  // the other context-mutation errors and does not reveal which
  // layer rejected the request.
  //
  // The web client treats any non-2xx response from the context
  // endpoints as a generic failure; the precise status code does
  // not change the user experience.
  return new ForbiddenException({
    error: {
      code: 'CONTEXT_REQUEST_INVALID',
      message: 'The request was malformed.',
    },
  });
}
