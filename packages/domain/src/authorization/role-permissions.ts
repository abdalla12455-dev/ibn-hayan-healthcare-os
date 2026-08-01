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
import { isPermissionCode } from './permissions.js';
import type { PlatformRoleCode } from './role-catalogue.js';
import {
  PLATFORM_ROLE_CODES,
  isPlatformRoleCode,
} from './role-catalogue.js';

// ---------------------------------------------------------------------------
// Explicit permission lists (least-privilege, no future-expansion risk)
// ---------------------------------------------------------------------------

/**
 * The seven context permissions granted to every human role (R01
 * through R13). This list is EXPLICIT: it does NOT use
 * `PERMISSION_CODES.filter(...)`. Adding a future permission to
 * `PERMISSION_CODES` does NOT automatically grant it to any role —
 * the new permission must be explicitly added to this list (or to
 * `CLINIC_ADMIN_PERMISSIONS`) to be granted.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * context permissions are split into per-level codes. R14 Integration
 * Account is denied all seven context permissions: R14 is
 * non-interactive and receives no browser context-selection
 * capability.
 *
 * Per the audit-semantics restoration task Phase 5, this explicit
 * list is the smallest coherent least-privilege correction that
 * eliminates the future privilege-expansion risk created by the
 * previous `PERMISSION_CODES.filter(...)` pattern. The previous
 * pattern would have automatically granted any new permission to
 * R01-R13 (because the filter only excluded
 * `clinic_admin_overview:view`). The explicit list ensures a new
 * permission is granted ONLY when explicitly added to this list.
 */
const HUMAN_CONTEXT_PERMISSIONS: readonly PermissionCode[] = [
  'context:view',
  'context:select',
  'context:clear',
  'context:select_organisation',
  'context:clear_organisation',
  'context:select_facility',
  'context:clear_facility',
] as const;

/**
 * The nine permissions granted to R09 Clinic Administrator: the
 * seven context permissions plus `clinic_admin_overview:view` and
 * `appointments:view`. This list is EXPLICIT: it does NOT use
 * `PERMISSION_CODES` directly. Adding a future permission to
 * `PERMISSION_CODES` does NOT automatically grant it to R09 —
 * the new permission must be explicitly added to this list to be
 * granted.
 *
 * Per the audit-semantics restoration task Phase 5, this explicit
 * list is the smallest coherent least-privilege correction that
 * eliminates the future privilege-expansion risk created by the
 * previous `R09_ADMINISTRATOR: PERMISSION_CODES` pattern. The
 * previous pattern would have automatically granted any new
 * permission to R09, making R09 a "hidden global super-administrator."
 * The explicit list ensures R09 receives ONLY the permissions
 * explicitly listed here.
 */
const CLINIC_ADMIN_PERMISSIONS: readonly PermissionCode[] = [
  ...HUMAN_CONTEXT_PERMISSIONS,
  'clinic_admin_overview:view',
  'appointments:view',
] as const;

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
 *
 * The `clinic_admin_overview:view` permission is granted ONLY to
 * `R09_ADMINISTRATOR` (Clinic Administrator). It is the read-only
 * authorisation gate for the Clinic Administrator Overview surface
 * at `/api/v1/clinic-admin/overview` (per DESIGN_BIBLE.md §12 and
 * §13). It is NOT granted to `R13_SYSTEM_ADMINISTRATOR` (Platform
 * Super Admin) — R13 holds a different surface (§15/§16) and must
 * NOT be silently treated as a Clinic Administrator. Per the
 * Clinic Admin Overview live-data task specification Phase 7 item 6,
 * this structural separation is the enforcement point for "A Platform
 * Super Admin is not silently treated as a Clinic Administrator."
 *
 * The `appointments:view` permission is granted ONLY to
 * `R09_ADMINISTRATOR`. It is the read-only authorisation gate for
 * the "Today's Appointments" endpoint at `GET /api/v1/appointments/today`.
 * It is NOT granted to `R13_SYSTEM_ADMINISTRATOR`. Per the Stage 1B
 * implementation specification, this permission enables the read-only
 * query of appointments for the authenticated facility's current local
 * calendar day. No caller-supplied scope is accepted; all context
 * is derived from the authenticated session.
 *
 * Per the audit-semantics restoration task Phase 5, the matrix uses
 * EXPLICIT permission lists (`HUMAN_CONTEXT_PERMISSIONS` and
 * `CLINIC_ADMIN_PERMISSIONS`) rather than `PERMISSION_CODES` or
 * `PERMISSION_CODES.filter(...)`. This is the smallest coherent
 * least-privilege correction that eliminates the future
 * privilege-expansion risk: adding a new permission to
 * `PERMISSION_CODES` does NOT automatically grant it to any role.
 * Each role receives ONLY the permissions explicitly listed in its
 * matrix entry.
 */
export const ROLE_PERMISSION_MATRIX: Readonly<
  Record<PlatformRoleCode, readonly PermissionCode[]>
> = {
  R01_PHYSICIAN: HUMAN_CONTEXT_PERMISSIONS,
  R02_NURSE: HUMAN_CONTEXT_PERMISSIONS,
  R03_PHARMACIST: HUMAN_CONTEXT_PERMISSIONS,
  R04_TECHNICIAN: HUMAN_CONTEXT_PERMISSIONS,
  R05_ALLIED_HEALTH_PROFESSIONAL: HUMAN_CONTEXT_PERMISSIONS,
  R06_RECEPTIONIST: HUMAN_CONTEXT_PERMISSIONS,
  R07_SCHEDULER: HUMAN_CONTEXT_PERMISSIONS,
  R08_BILLER: HUMAN_CONTEXT_PERMISSIONS,
  // R09 Clinic Administrator is the SOLE holder of the
  // `clinic_admin_overview:view` and `appointments:view` permissions.
  // The Clinic Admin Overview surface at `/clinic-admin` is the
  // canonical application route for this role (per DESIGN_BIBLE.md §17.1).
  // R09 receives CLINIC_ADMIN_PERMISSIONS (explicit 9 permissions),
  // NOT `PERMISSION_CODES` (which would grant ALL future
  // permissions automatically).
  R09_ADMINISTRATOR: CLINIC_ADMIN_PERMISSIONS,
  R10_COMPLIANCE_OFFICER: HUMAN_CONTEXT_PERMISSIONS,
  R11_HR_MANAGER: HUMAN_CONTEXT_PERMISSIONS,
  R12_EXECUTIVE: HUMAN_CONTEXT_PERMISSIONS,
  // R13 System Administrator (Platform Super Admin) is explicitly
  // NOT granted `clinic_admin_overview:view`. R13 has a different
  // product surface (Platform Super Admin Overview, DESIGN_BIBLE.md
  // §15/§16). Allowing R13 to view the Clinic Admin Overview would
  // conflate two distinct surfaces and violate Phase 7 item 6 of
  // the live-data task specification. R13 receives
  // HUMAN_CONTEXT_PERMISSIONS (explicit 7 permissions), NOT
  // `PERMISSION_CODES.filter(...)` (which would grant all future
  // permissions except `clinic_admin_overview:view`).
  R13_SYSTEM_ADMINISTRATOR: HUMAN_CONTEXT_PERMISSIONS,
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
