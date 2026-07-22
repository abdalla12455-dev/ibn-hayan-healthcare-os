/**
 * Canonical role-permission matrix for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per PRODUCT_BIBLE.md Section 21.3, permissions are assigned
 * through roles, not directly to users. Per ROLES_AND_PERMISSIONS.md
 * Section 4, the matrix is the canonical reference for what
 * permissions each role holds. A role assignment confers the
 * permissions documented in the matrix.
 *
 * Per the eighth canonical batch specification, the matrix is
 * centrally defined here. Role comparisons are NOT scattered across
 * controllers. Controllers declare the required permission via
 * `@RequirePermission(...)`; the authorization layer consults the
 * matrix to determine whether the principal's roles grant the
 * permission.
 *
 * Per PRODUCT_BIBLE.md Section 20.3, when a principal holds multiple
 * roles, allowed permissions accumulate (set union). The
 * `permissionsForRoles` function implements this accumulation.
 *
 * Per the eighth canonical batch specification:
 * - R01 through R13 (human platform roles) receive the three current
 *   context permissions.
 * - R14 (Integration Account) does NOT receive the interactive
 *   workspace context permissions. The integration account is
 *   non-human and must not use browser workspace-selection endpoints.
 * - A membership with no assigned roles has no permissions.
 * - Unknown roles are denied.
 * - Unknown permissions are denied.
 * - Denial is the default for every unresolved case.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { PermissionCode } from './permissions.js';
import { PERMISSION_CODES, isPermissionCode } from './permissions.js';
import type { PlatformRoleCode } from './role-catalogue.js';
import {
  PLATFORM_ROLE_CODES,
  isPlatformRoleCode,
} from './role-catalogue.js';

// ---------------------------------------------------------------------------
// Matrix definition
// ---------------------------------------------------------------------------

/**
 * The role-permission matrix. The keys are the canonical platform
 * role codes; the values are the sets of permissions granted to each
 * role.
 *
 * The matrix is `as const` so that TypeScript infers the literal
 * types. The runtime value is a readonly record.
 *
 * The matrix is the single source of truth for the platform's
 * default role-permission assignments. Customer-defined custom roles
 * (PRODUCT_BIBLE.md Section 20.5) are not implemented in this batch;
 * when they are added, they will compose existing permissions rather
 * than introducing new ones.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * context permissions are split into per-level codes. The matrix
 * grants all seven context permissions to R01 through R13 (human
 * roles). R14 Integration Account is denied all seven context
 * permissions: R14 is non-interactive and receives no browser
 * context-selection capability.
 *
 * Granting all seven context permissions to a human role does NOT
 * grant automatic access to every organisation or facility. The
 * authorization guard additionally verifies, at every protected
 * operation, that the principal holds an applicable scoped role
 * assignment for the selected organisation or facility. A principal
 * with R09 at tenant scope and no organisation-scoped or
 * facility-scoped assignment cannot select an organisation or
 * facility context; the guard rejects the selection before the
 * permission check is reached.
 */
export const ROLE_PERMISSION_MATRIX: Readonly<
  Record<PlatformRoleCode, readonly PermissionCode[]>
> = {
  R01_PHYSICIAN: PERMISSION_CODES,
  R02_NURSE: PERMISSION_CODES,
  R03_PHARMACIST: PERMISSION_CODES,
  R04_TECHNICIAN: PERMISSION_CODES,
  R05_ALLIED_HEALTH_PROFESSIONAL: PERMISSION_CODES,
  R06_RECEPTIONIST: PERMISSION_CODES,
  R07_SCHEDULER: PERMISSION_CODES,
  R08_BILLER: PERMISSION_CODES,
  R09_ADMINISTRATOR: PERMISSION_CODES,
  R10_COMPLIANCE_OFFICER: PERMISSION_CODES,
  R11_HR_MANAGER: PERMISSION_CODES,
  R12_EXECUTIVE: PERMISSION_CODES,
  R13_SYSTEM_ADMINISTRATOR: PERMISSION_CODES,
  // R14 Integration Account is denied the interactive workspace
  // context permissions. The integration account is non-human and
  // must not use browser workspace-selection endpoints. A principal
  // holding R14 plus an allowed human role receives the union of
  // permissions (the human role's permissions are not revoked by
  // the presence of R14).
  R14_INTEGRATION_ACCOUNT: [],
} as const;

// ---------------------------------------------------------------------------
// Matrix query functions
// ---------------------------------------------------------------------------

/**
 * Returns the set of permissions granted to a single role. Returns
 * an empty array for an unknown role code (default-deny). The
 * caller is responsible for accumulating permissions across multiple
 * roles via `permissionsForRoles`.
 */
export function permissionsForRole(
  roleCode: string,
): readonly PermissionCode[] {
  if (!isPlatformRoleCode(roleCode)) {
    return [];
  }
  return ROLE_PERMISSION_MATRIX[roleCode];
}

/**
 * Compute the union of permissions granted by a set of role codes.
 *
 * Per PRODUCT_BIBLE.md Section 20.3, when a principal holds multiple
 * roles, allowed permissions accumulate. This function implements
 * the accumulation as a set union.
 *
 * Unknown role codes are silently ignored (they contribute no
 * permissions). This is the default-deny behaviour for unknown
 * roles: an unknown role grants no permissions, but it does not
 * revoke permissions granted by other valid roles held by the same
 * principal.
 *
 * A principal with no roles (or with only unknown roles) receives
 * an empty set — no permissions.
 */
export function permissionsForRoles(
  roleCodes: readonly string[],
): Set<PermissionCode> {
  const result = new Set<PermissionCode>();
  for (const code of roleCodes) {
    for (const permission of permissionsForRole(code)) {
      result.add(permission);
    }
  }
  return result;
}

/**
 * Returns `true` if the supplied set of role codes grants the
 * supplied permission.
 *
 * The function is default-deny:
 * - An empty role set grants nothing.
 * - An unknown role grants nothing.
 * - An unknown permission is granted by nothing.
 * - The supplied permission must be a valid canonical permission
 *   code; an unknown permission string returns `false`.
 */
export function rolesGrantPermission(
  roleCodes: readonly string[],
  permission: string,
): boolean {
  if (!isPermissionCode(permission)) {
    return false;
  }
  const granted = permissionsForRoles(roleCodes);
  return granted.has(permission);
}

/**
 * Returns `true` if every role code in the supplied list is a valid
 * canonical platform role code. Used by the persistence layer to
 * validate inputs before insertion and by the contract layer to
 * validate API responses.
 */
export function areValidRoleCodes(
  roleCodes: readonly string[],
): boolean {
  return roleCodes.every(isPlatformRoleCode);
}

/**
 * Returns the list of canonical platform role codes, for use by
 * tests that verify the matrix's completeness against the catalogue.
 */
export function listPlatformRoleCodes(): readonly PlatformRoleCode[] {
  return PLATFORM_ROLE_CODES;
}
