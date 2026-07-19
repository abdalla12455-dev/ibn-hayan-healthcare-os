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
 *
 * The module also owns the `contextSelectionForbidden` and
 * `csrfInvalid` helpers used by the `AuthorizationGuard`. These
 * helpers were originally defined in the session-context module;
 * they have been promoted to the authorization module so that the
 * guard (which lives in the authorization module) can use them
 * without creating a backwards module dependency
 * (authorization -> session-context). The session-context
 * controller now re-uses these helpers from this module.
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

/**
 * Return a generic 403 for a forbidden context selection.
 *
 * Per the fifth and eighth canonical batch specifications, this
 * error is returned for ALL of the following cases:
 * - the supplied membershipId does not exist;
 * - the supplied membershipId belongs to a different user;
 * - the membership's status is `suspended`;
 * - the membership's Tenant's status is `suspended`.
 *
 * The error code is `CONTEXT_SELECTION_FORBIDDEN` so the web client
 * can distinguish it from a CSRF, Origin, or authorization failure
 * if needed, but the message is generic and does not reveal which
 * of the four conditions caused the failure. The web client
 * displays the same generic error message regardless.
 *
 * The `AuthorizationGuard` throws this error from its
 * `for-targeted-membership` mode when the targeted membership is
 * not in the user's active memberships list. This is the
 * structural enforcement of the "rejected generically" rule: the
 * same response is returned regardless of whether the membership
 * does not exist, exists for another user, is suspended, or
 * belongs to a suspended Tenant.
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
 * Return a 403 for a missing or invalid CSRF token at any
 * state-changing endpoint guarded by the `AuthorizationGuard`.
 *
 * The error code is `AUTH_CSRF_INVALID` so the web client can
 * distinguish it from an authorization failure. The message is
 * generic and does not reveal whether the token was missing,
 * malformed, or merely did not match the session's stored hash.
 */
export function csrfInvalid(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'AUTH_CSRF_INVALID',
      message: 'CSRF token is missing or invalid.',
    },
  });
}
