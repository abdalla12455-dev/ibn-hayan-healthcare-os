import { Injectable, Inject, Logger, ForbiddenException } from '@nestjs/common';
import type {
  TenantMembershipId,
  UserId,
  TenantRoleAssignment,
  TenantRoleAssignmentRepository,
  PermissionCode,
  RoleLabelLocale,
} from '@ibn-hayan/domain';
import { rolesGrantPermission, getRoleDisplayName } from '@ibn-hayan/domain';
import { TENANT_ROLE_ASSIGNMENT_REPOSITORY } from '../../infrastructure/database/index.js';
import type { RoleSummary } from '@ibn-hayan/contracts';
import { authorizationForbidden } from './authorization.errors.js';

/**
 * Authorization application service.
 *
 * The authorization service is the single entry point for
 * permission checks in the API. Per the eighth canonical batch
 * specification, role and permission checks are NOT scattered
 * across controllers; controllers declare the required permission
 * via `@RequirePermission(...)` and the `AuthorizationGuard` calls
 * this service.
 *
 * The service is default-deny (per AUTHORIZATION.md Section 2):
 * - A membership with no role assignments has no permissions.
 * - Unknown roles are denied.
 * - Unknown permissions are denied.
 * - Denial is the default for every unresolved case.
 *
 * Per the eighth canonical batch specification's
 * context-resolution requirement, the service exposes three
 * authorization methods that mirror the three context endpoints:
 *
 * - `authorizeForUser`: used by `GET /api/v1/context`. The
 *   decision is evaluated against the user's available active
 *   memberships. It does NOT require an active Tenant context to
 *   already be selected.
 *
 * - `authorizeForTargetedMembership`: used by
 *   `PUT /api/v1/context/tenant`. The decision is evaluated
 *   against the membership being selected (the body's
 *   `membershipId`).
 *
 * - `authorizeForActiveMembership`: used by
 *   `DELETE /api/v1/context/tenant`. The decision is evaluated
 *   against the session's currently active membership.
 *
 * Per ADR-013 §1.1, the authorization service does NOT log
 * plaintext passwords, password hashes, session tokens, CSRF
 * tokens, or email addresses. The service logs only debug-level
 * diagnostic messages that identify the user, the membership, and
 * the permission decision; it never logs the specific failure
 * reason in the client-facing response.
 *
 * Per the eighth canonical batch specification, the service never
 * reveals internal authorization details through error messages.
 * Every authorization failure throws the same generic
 * `authorizationForbidden()` (a 403 with the code
 * `AUTHORIZATION_FORBIDDEN` and a non-revealing message).
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @Inject(TENANT_ROLE_ASSIGNMENT_REPOSITORY)
    private readonly roleAssignments: TenantRoleAssignmentRepository,
  ) {}

  /**
   * Authorize a permission for a user, without requiring an active
   * Tenant context. Used by `GET /api/v1/context` so that the
   * client can list its available workspaces without already
   * having one selected.
   *
   * The authorization decision is:
   * - The user must have at least one membership (caller-supplied;
   *   the caller is responsible for filtering to active
   *   memberships under active Tenants).
   * - At least one of those memberships must have a role
   *   assignment that grants the required permission.
   *
   * Returns the list of role assignments that contributed to the
   * authorization decision (for response enrichment). Throws
   * `authorizationForbidden()` if no membership grants the
   * permission.
   *
   * Per the eighth canonical batch specification, this method does
   * NOT require an active Tenant context. The guard must not
   * create a circular requirement where selecting a Tenant
   * requires already having that Tenant active.
   */
  async authorizeForUser(
    userId: UserId,
    membershipIds: readonly TenantMembershipId[],
    requiredPermission: PermissionCode,
  ): Promise<TenantRoleAssignment[]> {
    if (membershipIds.length === 0) {
      this.logger.debug(
        `Authorization denied for user ${userId}: no memberships supplied ` +
          `(permission=${requiredPermission}).`,
      );
      throw authorizationForbidden();
    }

    // Load the role assignments for each membership. The
    // authorization decision is the union of permissions across
    // all memberships; if any membership's roles grant the
    // required permission, the request is authorized.
    const allAssignments: TenantRoleAssignment[] = [];
    const allRoleCodes: string[] = [];
    for (const membershipId of membershipIds) {
      const assignments =
        await this.roleAssignments.listForMembership(membershipId);
      allAssignments.push(...assignments);
      for (const a of assignments) {
        allRoleCodes.push(a.roleCode);
      }
    }

    if (!rolesGrantPermission(allRoleCodes, requiredPermission)) {
      this.logger.debug(
        `Authorization denied for user ${userId}: no membership grants ` +
          `${requiredPermission} (checked ${membershipIds.length} memberships, ` +
          `${allRoleCodes.length} role assignments).`,
      );
      throw authorizationForbidden();
    }

    return allAssignments;
  }

  /**
   * Authorize a permission for a specific membership that the
   * request is targeting. Used by `PUT /api/v1/context/tenant` so
   * that the authorization decision is evaluated against the
   * membership being selected, not against the session's currently
   * active membership (which may be null).
   *
   * The authorization decision is:
   * - The targeted membership must belong to the authenticated
   *   user (caller-supplied; the caller is responsible for the
   *   ownership check, typically via the existing
   *   `memberships.findById` + `userId` comparison).
   * - The targeted membership's role assignments must grant the
   *   required permission.
   *
   * Returns the targeted membership's role assignments (for
   * response enrichment). Throws `authorizationForbidden()` if
   * the membership's roles do not grant the permission.
   *
   * Per the eighth canonical batch specification, this method
   * does NOT require an active Tenant context. The guard must not
   * create a circular requirement where selecting a Tenant
   * requires already having that Tenant active.
   */
  async authorizeForTargetedMembership(
    userId: UserId,
    membershipId: TenantMembershipId,
    requiredPermission: PermissionCode,
  ): Promise<TenantRoleAssignment[]> {
    const assignments =
      await this.roleAssignments.listForMembership(membershipId);
    const roleCodes = assignments.map((a) => a.roleCode);

    if (!rolesGrantPermission(roleCodes, requiredPermission)) {
      this.logger.debug(
        `Authorization denied for user ${userId}: targeted membership ` +
          `${membershipId} does not grant ${requiredPermission} ` +
          `(${roleCodes.length} role assignments).`,
      );
      throw authorizationForbidden();
    }

    return assignments;
  }

  /**
   * Authorize a permission for the session's currently active
   * membership. Used by `DELETE /api/v1/context/tenant` so that
   * the authorization decision is evaluated against the
   * membership that is currently selected as the active context.
   *
   * The authorization decision is:
   * - The session must have an active membership (caller-supplied;
   *   `null` means no active context, which is denied).
   * - The active membership's role assignments must grant the
   *   required permission.
   *
   * Returns the active membership's role assignments (for
   * response enrichment). Throws `authorizationForbidden()` if
   * the session has no active membership or if the active
   * membership's roles do not grant the permission.
   */
  async authorizeForActiveMembership(
    userId: UserId,
    activeMembershipId: TenantMembershipId | null,
    requiredPermission: PermissionCode,
  ): Promise<TenantRoleAssignment[]> {
    if (activeMembershipId === null) {
      this.logger.debug(
        `Authorization denied for user ${userId}: no active membership ` +
          `(permission=${requiredPermission}).`,
      );
      throw authorizationForbidden();
    }

    const assignments =
      await this.roleAssignments.listForMembership(activeMembershipId);
    const roleCodes = assignments.map((a) => a.roleCode);

    if (!rolesGrantPermission(roleCodes, requiredPermission)) {
      this.logger.debug(
        `Authorization denied for user ${userId}: active membership ` +
          `${activeMembershipId} does not grant ${requiredPermission} ` +
          `(${roleCodes.length} role assignments).`,
      );
      throw authorizationForbidden();
    }

    return assignments;
  }

  /**
   * Convert a list of role assignments to localized role summaries
   * for the API response. The locale is determined by the caller
   * (typically from the `Accept-Language` header); the default is
   * Arabic per the platform's Arabic-first posture.
   *
   * The returned summaries carry the stable machine code (e.g.
   * `R13_SYSTEM_ADMINISTRATOR`) and the localized display name.
   * Authorization decisions use only the code; the display name
   * is for client display only.
   */
  toRoleSummaries(
    assignments: readonly TenantRoleAssignment[],
    locale: RoleLabelLocale = 'ar',
  ): RoleSummary[] {
    return assignments.map((a) => ({
      code: a.roleCode,
      displayName: getRoleDisplayName(a.roleCode, locale),
    }));
  }
}

// Re-export the ForbiddenException type so consumers can catch
// authorization failures without importing NestJS directly.
export type { ForbiddenException };
