import type {
  TenantRoleAssignment,
  TenantRoleAssignmentId,
  PlatformRoleCode,
  TenantMembershipId,
  TenantId,
  RoleAssignmentScopeLevel,
} from '@ibn-hayan/domain';
import { isPlatformRoleCode } from '@ibn-hayan/domain';
import type { OrganisationId } from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import type { TenantRoleAssignment as PrismaTenantRoleAssignment } from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `TenantRoleAssignment` row type
 * and the framework-independent `TenantRoleAssignment` domain type.
 *
 * Per CODING_STANDARDS.md §5 ("Persistence mapping is explicit and
 * tested"), the mapping is explicit (no implicit conversion) and is
 * tested. A change to the Prisma schema that breaks the mapping is
 * caught by the mapping tests.
 *
 * The `roleCode` column is `VarChar(40)` in the database. The
 * domain's `PlatformRoleCode` is a closed union of the fourteen
 * canonical codes. The mapper validates that the persisted value is
 * in the canonical catalogue; an unknown code is rejected. This is
 * the structural enforcement of the eighth canonical batch
 * specification: persistence-layer validation rejects unknown role
 * codes before they reach the authorization layer.
 *
 * Per the eighth canonical batch specification, the mapper does NOT
 * silently coerce unknown codes to a default value. An unknown code
 * is a data-integrity defect and is surfaced as a thrown error so
 * the operator can investigate.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * mapper also maps the `scope_level`, `scope_organisation_id`, and
 * `scope_facility_id` columns. The `scope_level` column is
 * `VarChar(20)` in the database; the domain's
 * `RoleAssignmentScopeLevel` is a closed union of 'tenant',
 * 'organisation', 'facility'. The mapper validates that the
 * persisted value is in the ratified catalogue; an unknown scope
 * level is rejected as a data-integrity defect.
 */

/**
 * Validate that a persisted `role_code` value is a canonical
 * platform role code. Returns the code typed as
 * `PlatformRoleCode` if valid; throws if the code is unknown.
 *
 * The throw is intentional: an unknown persisted code is a
 * data-integrity defect (someone inserted a row outside the
 * application layer, or the canonical catalogue was narrowed
 * without a coordinated migration). Surfacing the error here makes
 * the defect visible at the next read rather than silently
 * producing an authorization decision based on a non-canonical
 * code.
 */
function prismaRoleCodeToDomain(code: string): PlatformRoleCode {
  if (!isPlatformRoleCode(code)) {
    throw new Error(
      `Unknown role code persisted in tenant_role_assignments: '${code}'. ` +
        'This is a data-integrity defect. The canonical platform role ' +
        'catalogue is R01_PHYSICIAN through R14_INTEGRATION_ACCOUNT. ' +
        'Investigate how the non-canonical code was inserted.',
    );
  }
  return code;
}

/**
 * Validate that a persisted `scope_level` value is in the ratified
 * ADR-015 catalogue. Returns the value typed as
 * `RoleAssignmentScopeLevel` if valid; throws if the scope level
 * is unknown.
 *
 * The throw is intentional: an unknown persisted scope level is a
 * data-integrity defect. The CHECK constraint on the column should
 * prevent this from ever happening at the database level, but the
 * mapper is the defensive backstop.
 */
function prismaScopeLevelToDomain(
  scopeLevel: string,
): RoleAssignmentScopeLevel {
  if (
    scopeLevel !== 'tenant' &&
    scopeLevel !== 'organisation' &&
    scopeLevel !== 'facility'
  ) {
    throw new Error(
      `Unknown scope level persisted in tenant_role_assignments: '${scopeLevel}'. ` +
        'This is a data-integrity defect. The ratified ADR-015 scope ' +
        "levels are 'tenant', 'organisation', 'facility'. Investigate " +
        'how the non-canonical scope level was inserted.',
    );
  }
  return scopeLevel;
}

/**
 * Map a Prisma-generated `TenantRoleAssignment` row to a
 * framework-independent `TenantRoleAssignment` domain value.
 * Returns a readonly snapshot.
 *
 * The branded `TenantRoleAssignmentId` and `TenantMembershipId` are
 * created by casting the UUID strings. The brands are
 * compile-time-only type intersections; at runtime the values are
 * just strings.
 *
 * Per ADR-015, the mapper also maps the `scope_organisation_id` and
 * `scope_facility_id` columns to their branded domain types when
 * non-null. A null value is preserved as null.
 */
export function tenantRoleAssignmentFromPrisma(
  row: PrismaTenantRoleAssignment,
): TenantRoleAssignment {
  return {
    id: row.id as TenantRoleAssignmentId,
    tenantMembershipId: row.tenantMembershipId as TenantMembershipId,
    tenantId: row.tenantId as TenantId,
    roleCode: prismaRoleCodeToDomain(row.roleCode),
    scopeLevel: prismaScopeLevelToDomain(row.scopeLevel),
    scopeOrganisationId:
      row.scopeOrganisationId === null
        ? null
        : (row.scopeOrganisationId as OrganisationId),
    scopeFacilityId:
      row.scopeFacilityId === null ? null : (row.scopeFacilityId as FacilityId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
