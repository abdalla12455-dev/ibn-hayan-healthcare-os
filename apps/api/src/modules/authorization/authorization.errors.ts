import { ForbiddenException } from '@nestjs/common';

/**
 * Authorization-module error helpers.
 *
 * Per the eighth canonical batch specification, authorization
 * failures must NOT reveal internal authorization details through
 * error messages. Every authorization failure returns the same
 * generic 403 with the code `AUTHORIZATION_FORBIDDEN` and a
 * non-revealing message.
 *
 * The internal diagnostic details (which membership, which role,
 * which permission) are logged server-side at `debug` level only;
 * they are never included in the client-facing response. This is
 * the structural enforcement of AUTHORIZATION.md Section 9
 * (Authorization Enforcement) and the eighth canonical batch
 * specification's rule 9: "Do not expose internal authorization
 * details through error messages."
 *
 * The error envelope shape is governed by the `AuthErrorResponseSchema`
 * in `@ibn-hayan/contracts`. The error code is a stable machine-
 * readable string; the message is a generic human-readable string.
 */

/**
 * Return a generic 403 for an authorization failure.
 *
 * This error is returned for ALL authorization failures:
 * - a membership with no role assignments;
 * - a membership whose roles do not grant the required permission;
 * - an unknown role or unknown permission (defensive);
 * - a session with no active context when an active context is
 *   required.
 *
 * The error code is `AUTHORIZATION_FORBIDDEN` so the web client
 * can distinguish it from a CSRF or Origin failure if needed, but
 * the message is generic and does not reveal which condition
 * caused the failure.
 */
export function authorizationForbidden(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'AUTHORIZATION_FORBIDDEN',
      message: 'The request is not authorized.',
    },
  });
}
