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
import { CsrfService } from '../auth/csrf.service.js';
import { CSRF_HEADER_NAME } from '../auth/auth.constants.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import type { RequestWithIdentifiers } from '../audit/request-id.middleware.js';
import {
  AUTHORIZATION_PERMISSION_METADATA,
  AUTHORIZATION_CONTEXT_MODE_METADATA,
  type AuthorizationContextMode,
} from './require-permission.decorator.js';
import { AuthorizationService } from './authorization.service.js';
import {
  authorizationForbidden,
  contextSelectionForbidden,
  csrfInvalid,
} from './authorization.errors.js';
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
 * 4. For state-changing methods (PUT, DELETE), verifies the
 *    `X-CSRF-Token` header against the session's stored CSRF
 *    hash. This is the structural enforcement of ADR-013 §1.1:
 *    CSRF protection is mandatory for state-changing browser
 *    requests. The CSRF check runs AFTER session validation
 *    (because the CSRF token is session-bound) but BEFORE the
 *    authorization decision. This ordering is required so that
 *    a missing/invalid CSRF returns `AUTH_CSRF_INVALID` rather
 *    than the generic `AUTHORIZATION_FORBIDDEN` — the CSRF
 *    failure is a transport-layer concern that must be reported
 *    independently of the authorization decision.
 *
 * 5. Performs the authorization check via `AuthorizationService`,
 *    using the context-resolution mode to determine which
 *    membership the decision is evaluated against:
 *    - `for-user`: the user's available active memberships (no
 *      active context required). Used by `GET /api/v1/context`.
 *    - `for-targeted-membership`: the membership identified by
 *      the request body's `membershipId`. Used by
 *      `PUT /api/v1/context/tenant`. If the targeted membership
 *      is not in the user's active memberships, the guard throws
 *      `contextSelectionForbidden()` (NOT the generic
 *      `authorizationForbidden()`). This is the structural
 *      enforcement of the "rejected generically" rule: the same
 *      `CONTEXT_SELECTION_FORBIDDEN` response is returned
 *      regardless of whether the membership does not exist,
 *      exists for another user, is suspended, or belongs to a
 *      suspended Tenant.
 *    - `for-active-membership`: the session's currently active
 *      membership. Used by `DELETE /api/v1/context/tenant`.
 *
 * 6. Attaches the auth result (session, user, memberships, role
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
 * CSRF and body validation remain transport-layer / boundary
 * concerns. The guard performs the CSRF check (because it is
 * session-bound and must run before the authorization decision);
 * the controller re-validates the body defensively and delegates
 * to the service.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly authorizationService: AuthorizationService,
    private readonly csrfService: CsrfService,
    private readonly auditHelper: AuditHelperService,
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
        // Emit a direct, non-mutating security audit event for the
        // denied Origin. Per the ninth canonical batch specification,
        // direct non-mutating security events are persisted first to
        // the transactional outbox.
        await this.auditHelper.emitDirect({
          action: 'security.origin.denied',
          outcome: 'denied',
          reasonCode: 'origin_disallowed',
          source: 'api',
          requestId: readRequestId(request),
          correlationId: readCorrelationId(request),
          ipAddress: readIpAddress(request),
          userAgent: readUserAgent(request),
          scope: 'authorization',
          metadata: { endpoint: request.path, method },
        });
        throw originDisallowed();
      }
    }

    // Validate the session.
    const cookieValue = readCookie(request, 'ibn_hayan_session');
    const authResult = await this.authService.getSessionFromCookie(cookieValue);
    if (authResult === null) {
      throw sessionRequired();
    }

    // For state-changing methods, verify the CSRF token AFTER
    // session validation (the token is session-bound) but BEFORE
    // the authorization decision. This ordering is mandatory:
    // a missing/invalid CSRF must return `AUTH_CSRF_INVALID`
    // rather than being short-circuited by an authorization
    // failure (which would return the generic
    // `AUTHORIZATION_FORBIDDEN`). The CSRF check is a
    // transport-layer concern; the authorization decision is a
    // business-logic concern. The transport-layer concern must
    // be reported first.
    if (method === 'PUT' || method === 'DELETE') {
      const csrfToken = readHeader(request, CSRF_HEADER_NAME);
      if (!csrfToken || csrfToken.length === 0) {
        await this.auditHelper.emitDirect({
          action: 'security.csrf.denied',
          outcome: 'denied',
          reasonCode: 'csrf_missing',
          source: 'api',
          actorType: 'USER',
          actorId: authResult.user.id,
          sessionId: authResult.session.id,
          requestId: readRequestId(request),
          correlationId: readCorrelationId(request),
          ipAddress: readIpAddress(request),
          userAgent: readUserAgent(request),
          scope: 'authorization',
          metadata: { endpoint: request.path, method },
        });
        throw csrfInvalid();
      }
      const csrfOk = this.csrfService.verify(authResult.session.id, csrfToken);
      if (!csrfOk) {
        await this.auditHelper.emitDirect({
          action: 'security.csrf.denied',
          outcome: 'denied',
          reasonCode: 'csrf_invalid',
          source: 'api',
          actorType: 'USER',
          actorId: authResult.user.id,
          sessionId: authResult.session.id,
          requestId: readRequestId(request),
          correlationId: readCorrelationId(request),
          ipAddress: readIpAddress(request),
          userAgent: readUserAgent(request),
          scope: 'authorization',
          metadata: { endpoint: request.path, method },
        });
        throw csrfInvalid();
      }
    }

    // Perform the authorization check based on the context-
    // resolution mode. The audit emission for the authorization
    // decision (allowed/denied) is done after the check.
    let roleAssignments;
    let authorizedTenantId: string | null = null;
    try {
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
        authorizedTenantId = authResult.memberships[0]?.tenantId ?? null;
      } else if (mode === 'for-targeted-membership') {
        // The membership identified by the request body's
        // membershipId. The guard validates the body to extract
        // the membershipId; the controller re-validates the body
        // defensively.
        const body = (request as { body?: unknown }).body;
        const parsed = SelectTenantContextRequestSchema.safeParse(body);
        if (!parsed.success) {
          // A malformed body is rejected with `contextSelectionForbidden`
          // rather than the generic `authorizationForbidden`. This is
          // consistent with the other targeted-membership failures
          // (not found, cross-user, suspended) and does not reveal
          // whether the body would have targeted a real membership.
          await this.emitAuthorizationDenied(
            authResult.user.id,
            authResult.session.id,
            requiredPermission,
            'malformed_body',
            request,
          );
          throw contextSelectionForbidden();
        }
        const targetMembershipId = parsed.data
          .membershipId as TenantMembershipId;

        // Verify the targeted membership belongs to the
        // authenticated user AND is in their active memberships
        // list (which already filters out suspended memberships
        // and memberships under suspended Tenants). A mismatch is
        // denied generically via `contextSelectionForbidden()`:
        // the same response is returned whether the membership
        // does not exist, exists for another user, is suspended,
        // or belongs to a suspended Tenant. This is the
        // "rejected generically" rule.
        const targetMembership = authResult.memberships.find(
          (m: TenantMembership) => m.id === targetMembershipId,
        );
        if (targetMembership === undefined) {
          await this.emitAuthorizationDenied(
            authResult.user.id,
            authResult.session.id,
            requiredPermission,
            'context_selection_forbidden',
            request,
          );
          throw contextSelectionForbidden();
        }

        roleAssignments =
          await this.authorizationService.authorizeForTargetedMembership(
            authResult.user.id,
            targetMembershipId,
            requiredPermission,
          );
        authorizedTenantId = targetMembership.tenantId;
      } else {
        // for-active-membership: the session's currently active
        // membership.
        roleAssignments =
          await this.authorizationService.authorizeForActiveMembership(
            authResult.user.id,
            authResult.session.activeTenantMembershipId,
            requiredPermission,
          );
        // For the active-membership mode, the tenant is the
        // session's active membership's tenant (if any).
        const activeMembership = authResult.memberships.find(
          (m: TenantMembership) =>
            m.id === authResult.session.activeTenantMembershipId,
        );
        authorizedTenantId = activeMembership?.tenantId ?? null;
      }
    } catch (err) {
      // The authorization service throws `authorizationForbidden()`
      // when the permission is not granted. We emit the denied
      // audit event and re-throw.
      if (err instanceof Error && err.constructor.name === 'HttpException') {
        await this.emitAuthorizationDenied(
          authResult.user.id,
          authResult.session.id,
          requiredPermission,
          'permission_denied',
          request,
        );
      }
      throw err;
    }

    // Emit the allowed audit event.
    await this.emitAuthorizationAllowed(
      authResult.user.id,
      authResult.session.id,
      requiredPermission,
      roleAssignments.map((a: { roleCode: string }) => a.roleCode),
      authorizedTenantId,
      request,
    );

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

  /**
   * Emit an `authorization.decision.allowed` audit event. The event
   * is direct (non-transactional) because the authorization decision
   * is not a state mutation.
   */
  private async emitAuthorizationAllowed(
    userId: string,
    sessionId: string,
    permissionCode: string,
    roleCodes: readonly string[],
    tenantId: string | null,
    request: Request,
  ): Promise<void> {
    const result = await this.auditHelper.emitDirect({
      action: 'authorization.decision.allowed',
      outcome: 'success',
      source: 'api',
      tenantId,
      actorType: 'USER',
      actorId: userId,
      sessionId,
      permissionCode,
      roleCodes,
      requestId: readRequestId(request),
      correlationId: readCorrelationId(request),
      ipAddress: readIpAddress(request),
      userAgent: readUserAgent(request),
      scope: 'authorization',
      metadata: { endpoint: request.path, method: request.method },
    });
    if (!result.ok) {
      // Best-effort: do not block the authorized request.
    }
  }

  /**
   * Emit an `authorization.decision.denied` audit event. The event
   * is direct (non-transactional) because the authorization denial
   * is not a state mutation.
   */
  private async emitAuthorizationDenied(
    userId: string,
    sessionId: string,
    permissionCode: string,
    reasonCode: string,
    request: Request,
  ): Promise<void> {
    const result = await this.auditHelper.emitDirect({
      action: 'authorization.decision.denied',
      outcome: 'denied',
      reasonCode,
      source: 'api',
      actorType: 'USER',
      actorId: userId,
      sessionId,
      permissionCode,
      requestId: readRequestId(request),
      correlationId: readCorrelationId(request),
      ipAddress: readIpAddress(request),
      userAgent: readUserAgent(request),
      scope: 'authorization',
      metadata: { endpoint: request.path, method: request.method },
    });
    if (!result.ok) {
      // Best-effort: do not block the denial.
    }
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

/**
 * Read a header value from the request. Returns `undefined` if the
 * header is not present.
 */
function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Read the request ID from the request. Falls back to a nil UUID
 * if the request-ID middleware has not run (defence-in-depth).
 */
function readRequestId(req: Request): string {
  const augmented = req as RequestWithIdentifiers;
  return augmented.requestId ?? '00000000-0000-0000-0000-000000000000';
}

/**
 * Read the correlation ID from the request. Returns `null` if not
 * set.
 */
function readCorrelationId(req: Request): string | null {
  const augmented = req as RequestWithIdentifiers;
  return augmented.correlationId ?? null;
}

/**
 * Read the client IP address from the request.
 */
function readIpAddress(req: Request): string | null {
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  return ip;
}

/**
 * Read the user-agent from the request.
 */
function readUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string') {
    return ua;
  }
  if (Array.isArray(ua)) {
    return ua[0] ?? null;
  }
  return null;
}

// Re-export the error helpers so consumers can catch authorization
// failures without importing from multiple modules.
export {
  authorizationForbidden,
  contextSelectionForbidden,
  csrfInvalid,
  sessionRequired,
  originDisallowed,
};
