import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type {
  UserId,
  TenantMembershipId,
  TenantMembership,
  PermissionCode,
} from '@ibn-hayan/domain';
import { AuthService } from '../auth/auth.service.js';
import {
  AUTHORIZATION_PERMISSION_METADATA,
  AUTHORIZATION_CONTEXT_MODE_METADATA,
  type AuthorizationContextMode,
} from './require-permission.decorator.js';
import { AuthorizationService } from './authorization.service.js';
import { authorizationForbidden } from './authorization.errors.js';
import { sessionRequired, originDisallowed } from '../auth/auth.errors.js';
import { SelectTenantContextRequestSchema } from '@ibn-hayan/contracts';

/**
 * Nest guard that enforces the `@RequirePermission(...)` decorator.
 *
 * Per the eighth canonical batch specification, the guard is the
 * server-side enforcement point for authorization. The guard:
 *
 * 1. Reads the required permission and context-resolution mode
 *    from the route handler's metadata (set by
 *    `@RequirePermission(...)`).
 *
 * 2. For state-changing methods (PUT, DELETE), verifies the
 *    `Origin` header BEFORE the session check. This preserves the
 *    existing security posture: an attacker with an invalid Origin
 *    gets a generic 403 that does not reveal whether the session
 *    is valid.
 *
 * 3. Validates the session via `AuthService.getSessionFromCookie`.
 *    A missing/invalid/expired/revoked session returns 401.
 *
 * 4. Performs the authorization check via `AuthorizationService`,
 *    using the context-resolution mode to determine which
 *    membership the decision is evaluated against:
 *    - `for-user`: the user's available active memberships (no
 *      active context required). Used by `GET /api/v1/context`.
 *    - `for-targeted-membership`: the membership identified by
 *      the request body's `membershipId`. Used by
 *      `PUT /api/v1/context/tenant`.
 *    - `for-active-membership`: the session's currently active
 *      membership. Used by `DELETE /api/v1/context/tenant`.
 *
 * 5. Attaches the auth result (session, user, memberships, role
 *    assignments) to the request so the controller can use it
 *    without re-validating the session.
 *
 * The guard is default-deny (per AUTHORIZATION.md Section 2):
 * - A membership with no role assignments has no permissions.
 * - Unknown roles are denied.
 * - Unknown permissions are denied.
 * - Denial is the default for every unresolved case.
 *
 * Per the eighth canonical batch specification, the guard does NOT
 * reveal internal authorization details through error messages.
 * Every authorization failure throws the same generic
 * `authorizationForbidden()` (a 403 with the code
 * `AUTHORIZATION_FORBIDDEN`).
 *
 * CSRF and body validation remain in the controller. The guard
 * handles authentication and authorization; the controller handles
 * transport-layer concerns (CSRF, body) and business logic.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<PermissionCode>(
      AUTHORIZATION_PERMISSION_METADATA,
      context.getHandler(),
    );
    const mode = this.reflector.get<AuthorizationContextMode>(
      AUTHORIZATION_CONTEXT_MODE_METADATA,
      context.getHandler(),
    );

    // If no permission is declared, the guard is a no-op. This
    // allows the guard to be registered globally without affecting
    // routes that do not declare a permission (e.g. health checks).
    if (requiredPermission === undefined || mode === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // For state-changing methods, verify Origin BEFORE the session
    // check. This preserves the existing security posture: an
    // attacker with an invalid Origin gets a generic 403 that does
    // not reveal whether the session is valid.
    if (method === 'PUT' || method === 'DELETE') {
      const origin = request.headers['origin'];
      const webOrigin = process.env['WEB_ORIGIN'] ?? 'http://localhost:3000';
      if (!this.authService.isOriginAllowed(origin, webOrigin)) {
        throw originDisallowed();
      }
    }

    // Validate the session.
    const cookieValue = readCookie(request, 'ibn_hayan_session');
    const authResult = await this.authService.getSessionFromCookie(cookieValue);
    if (authResult === null) {
      throw sessionRequired();
    }

    // Perform the authorization check based on the context-
    // resolution mode.
    let roleAssignments;
    if (mode === 'for-user') {
      // The user's available active memberships. The auth result
      // already filtered to active memberships; we use their IDs.
      const membershipIds = authResult.memberships.map(
        (m: TenantMembership) => m.id,
      );
      roleAssignments = await this.authorizationService.authorizeForUser(
        authResult.user.id,
        membershipIds,
        requiredPermission,
      );
    } else if (mode === 'for-targeted-membership') {
      // The membership identified by the request body's
      // membershipId. The guard validates the body to extract
      // the membershipId; the controller re-validates the body
      // defensively.
      const body = (request as { body?: unknown }).body;
      const parsed = SelectTenantContextRequestSchema.safeParse(body);
      if (!parsed.success) {
        // A malformed body is rejected with a generic 403. The
        // guard does not reveal whether the session is valid
        // (the session has already been validated at this point)
        // or whether the membership exists.
        throw authorizationForbidden();
      }
      const targetMembershipId = parsed.data.membershipId as TenantMembershipId;

      // Verify the targeted membership belongs to the
      // authenticated user. This is the ownership check; a
      // mismatch is denied generically (does not reveal whether
      // the membership exists for another user).
      const targetMembership = authResult.memberships.find(
        (m: TenantMembership) => m.id === targetMembershipId,
      );
      if (targetMembership === undefined) {
        throw authorizationForbidden();
      }

      roleAssignments =
        await this.authorizationService.authorizeForTargetedMembership(
          authResult.user.id,
          targetMembershipId,
          requiredPermission,
        );
    } else {
      // for-active-membership: the session's currently active
      // membership.
      roleAssignments =
        await this.authorizationService.authorizeForActiveMembership(
          authResult.user.id,
          authResult.session.activeTenantMembershipId,
          requiredPermission,
        );
    }

    // Attach the auth result and role assignments to the request
    // so the controller can use them without re-validating the
    // session.
    (request as AuthorizationRequestAugmentation).authorization = {
      session: authResult.session,
      user: authResult.user,
      memberships: authResult.memberships,
      roleAssignments,
      rotatedRawToken: authResult.rotatedRawToken,
      expiresAt: authResult.expiresAt,
    };

    return true;
  }
}

/**
 * The augmentation applied to the Express `Request` object by the
 * `AuthorizationGuard`. The controller reads these fields instead
 * of re-validating the session.
 */
export interface AuthorizationRequestAugmentation extends Request {
  authorization?: {
    session: {
      id: string;
      userId: string;
      activeTenantMembershipId: string | null;
      expiresAt: Date;
      lastSeenAt: Date;
      rotatedAt: Date | null;
      revokedAt: Date | null;
      createdAt: Date;
      tokenHash: string;
    };
    user: {
      id: UserId;
      email: string;
      normalisedEmail: string;
      displayName: string;
      status: 'active' | 'disabled';
      createdAt: Date;
      updatedAt: Date;
    };
    memberships: readonly TenantMembership[];
    roleAssignments: readonly {
      id: string;
      tenantMembershipId: string;
      roleCode: string;
      createdAt: Date;
      updatedAt: Date;
    }[];
    rotatedRawToken: string | null;
    expiresAt: Date;
  };
}

/**
 * Read a cookie value from the request. Returns `undefined` if the
 * cookie is not present.
 *
 * This helper is duplicated from the auth controller's `readCookie`
 * function rather than importing it, because the auth controller's
 * helpers are not exported. The duplication is minimal and keeps
 * the authorization module self-contained.
 */
function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) {
    return undefined;
  }
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}

// Re-export the error helpers so consumers can catch authorization
// failures without importing from multiple modules.
export { authorizationForbidden, sessionRequired, originDisallowed };
