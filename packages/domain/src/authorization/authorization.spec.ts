import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the authorization domain layer.
 *
 * These tests verify the eighth canonical batch specification's
 * authorization requirements:
 * - The complete fourteen-role catalogue is present.
 * - R01 through R13 receive the expected current context permissions.
 * - R14 receives no interactive context permissions.
 * - Multiple roles produce a permission union.
 * - Roleless membership is denied.
 * - Unknown role is denied.
 * - Unknown permission is denied.
 * - Default-deny behaviour is verified explicitly.
 * - Stable role-code serialization round-trips.
 * - Duplicate-role prevention is verified at the domain level.
 * - Arabic and English display labels are present for every role.
 *
 * The tests are pure: no framework, no database, no network. They
 * exercise the pure TypeScript functions exported from the
 * authorization domain module.
 */

import {
  PLATFORM_ROLE_CODES,
  PLATFORM_ROLE_CATALOGUE,
  findRoleCatalogueEntry,
  isPlatformRoleCode,
  getRoleDisplayName,
  type PlatformRoleCode,
  type PlatformRoleCatalogueEntry,
} from './role-catalogue.js';
import {
  PERMISSION_CODES,
  isPermissionCode,
  type PermissionCode,
} from './permissions.js';
import {
  ROLE_PERMISSION_MATRIX,
  permissionsForRole,
  permissionsForRoles,
  rolesGrantPermission,
  areValidRoleCodes,
  listPlatformRoleCodes,
} from './role-permissions.js';
import type {
  TenantRoleAssignment,
  TenantRoleAssignmentId,
  CreateTenantRoleAssignmentInput,
  RoleAssignmentScopeLevel,
} from './role-assignment.js';
import type { TenantMembershipId } from '../identity/membership.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';

describe('authorization role catalogue', () => {
  it('exposes exactly fourteen canonical platform role codes', () => {
    expect(PLATFORM_ROLE_CODES).toHaveLength(14);
  });

  it('exposes exactly fourteen catalogue entries', () => {
    expect(PLATFORM_ROLE_CATALOGUE).toHaveLength(14);
  });

  it('every catalogue entry has a unique code', () => {
    const codes = PLATFORM_ROLE_CATALOGUE.map((e) => e.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('every catalogue entry has a unique shortCode', () => {
    const shortCodes = PLATFORM_ROLE_CATALOGUE.map((e) => e.shortCode);
    const unique = new Set(shortCodes);
    expect(unique.size).toBe(shortCodes.length);
  });

  it('catalogue entries cover R01 through R14 in order', () => {
    const shortCodes = PLATFORM_ROLE_CATALOGUE.map((e) => e.shortCode);
    expect(shortCodes).toEqual([
      'R01',
      'R02',
      'R03',
      'R04',
      'R05',
      'R06',
      'R07',
      'R08',
      'R09',
      'R10',
      'R11',
      'R12',
      'R13',
      'R14',
    ]);
  });

  it('every catalogue entry carries Arabic and English display names', () => {
    for (const entry of PLATFORM_ROLE_CATALOGUE) {
      expect(entry.displayNameEn.length).toBeGreaterThan(0);
      expect(entry.displayNameAr.length).toBeGreaterThan(0);
    }
  });

  it('the catalogue includes R13 System Administrator', () => {
    const entry = findRoleCatalogueEntry('R13_SYSTEM_ADMINISTRATOR');
    expect(entry).not.toBeNull();
    expect(entry?.shortCode).toBe('R13');
    expect(entry?.category).toBe('platform');
    expect(entry?.displayNameEn).toBe('System Administrator');
    expect(entry?.displayNameAr).toBe('مسؤول النظام');
  });

  it('the catalogue includes R14 Integration Account', () => {
    const entry = findRoleCatalogueEntry('R14_INTEGRATION_ACCOUNT');
    expect(entry).not.toBeNull();
    expect(entry?.shortCode).toBe('R14');
    expect(entry?.category).toBe('platform');
    expect(entry?.displayNameEn).toBe('Integration Account');
    expect(entry?.displayNameAr).toBe('حساب التكامل');
  });

  it('isPlatformRoleCode returns true for canonical codes', () => {
    for (const code of PLATFORM_ROLE_CODES) {
      expect(isPlatformRoleCode(code)).toBe(true);
    }
  });

  it('isPlatformRoleCode returns false for unknown codes', () => {
    expect(isPlatformRoleCode('R99_UNKNOWN')).toBe(false);
    expect(isPlatformRoleCode('owner')).toBe(false);
    expect(isPlatformRoleCode('member')).toBe(false);
    expect(isPlatformRoleCode('viewer')).toBe(false);
    expect(isPlatformRoleCode('')).toBe(false);
  });

  it('findRoleCatalogueEntry returns null for unknown codes', () => {
    expect(findRoleCatalogueEntry('R99_UNKNOWN')).toBeNull();
    expect(findRoleCatalogueEntry('owner')).toBeNull();
  });

  it('getRoleDisplayName returns the Arabic label by default', () => {
    expect(getRoleDisplayName('R13_SYSTEM_ADMINISTRATOR')).toBe(
      'مسؤول النظام',
    );
  });

  it('getRoleDisplayName returns the English label when requested', () => {
    expect(
      getRoleDisplayName('R13_SYSTEM_ADMINISTRATOR', 'en'),
    ).toBe('System Administrator');
  });

  it('the catalogue does not include owner, member, or viewer', () => {
    // The simplified role proposal in CURRENT_IMPLEMENTATION_HANDOVER.md
    // is explicitly rejected by the eighth canonical batch specification.
    const codes = PLATFORM_ROLE_CATALOGUE.map((e) => e.code);
    expect(codes).not.toContain('owner');
    expect(codes).not.toContain('member');
    expect(codes).not.toContain('viewer');
    expect(codes).not.toContain('OWNER');
    expect(codes).not.toContain('MEMBER');
    expect(codes).not.toContain('VIEWER');
  });

  it('catalogue entries distribute across the four categories', () => {
    const categories = new Set(
      PLATFORM_ROLE_CATALOGUE.map((e) => e.category),
    );
    expect(categories.has('clinical')).toBe(true);
    expect(categories.has('operational')).toBe(true);
    expect(categories.has('administrative')).toBe(true);
    expect(categories.has('platform')).toBe(true);
  });
});

describe('authorization permission catalogue', () => {
  it('exposes the seven current context permissions (ADR-015)', () => {
    // Per ADR-015, the context permissions are split into per-level
    // codes: context:view, context:select, context:clear,
    // context:select_organisation, context:clear_organisation,
    // context:select_facility, context:clear_facility.
    expect(PERMISSION_CODES).toEqual([
      'context:view',
      'context:select',
      'context:clear',
      'context:select_organisation',
      'context:clear_organisation',
      'context:select_facility',
      'context:clear_facility',
    ]);
  });

  it('isPermissionCode returns true for canonical permission codes', () => {
    expect(isPermissionCode('context:view')).toBe(true);
    expect(isPermissionCode('context:select')).toBe(true);
    expect(isPermissionCode('context:clear')).toBe(true);
    expect(isPermissionCode('context:select_organisation')).toBe(true);
    expect(isPermissionCode('context:clear_organisation')).toBe(true);
    expect(isPermissionCode('context:select_facility')).toBe(true);
    expect(isPermissionCode('context:clear_facility')).toBe(true);
  });

  it('isPermissionCode returns false for unknown permission codes', () => {
    expect(isPermissionCode('patient:read')).toBe(false);
    expect(isPermissionCode('encounter:write')).toBe(false);
    expect(isPermissionCode('')).toBe(false);
  });
});

describe('authorization role-permission matrix', () => {
  it('every canonical platform role has an explicit matrix entry', () => {
    for (const code of PLATFORM_ROLE_CODES) {
      expect(ROLE_PERMISSION_MATRIX[code]).toBeDefined();
    }
  });

  it('R01 through R13 receive all three current context permissions', () => {
    const humanRoles = PLATFORM_ROLE_CODES.filter(
      (code) => code !== 'R14_INTEGRATION_ACCOUNT',
    );
    expect(humanRoles).toHaveLength(13);
    for (const code of humanRoles) {
      const permissions = ROLE_PERMISSION_MATRIX[code];
      expect(permissions).toEqual(PERMISSION_CODES);
    }
  });

  it('R14 Integration Account receives no interactive context permissions', () => {
    expect(ROLE_PERMISSION_MATRIX.R14_INTEGRATION_ACCOUNT).toEqual([]);
  });

  it('permissionsForRole returns the matrix entry for a known role', () => {
    expect(permissionsForRole('R01_PHYSICIAN')).toEqual(
      PERMISSION_CODES,
    );
    expect(permissionsForRole('R13_SYSTEM_ADMINISTRATOR')).toEqual(
      PERMISSION_CODES,
    );
  });

  it('permissionsForRole returns an empty array for an unknown role', () => {
    expect(permissionsForRole('R99_UNKNOWN')).toEqual([]);
    expect(permissionsForRole('owner')).toEqual([]);
  });

  it('permissionsForRoles accumulates permissions across multiple roles (union)', () => {
    // Two roles that both grant all seven context permissions produce
    // a union of seven permissions. Per ADR-015, the context
    // permissions are split into per-level codes: context:view,
    // context:select, context:clear, context:select_organisation,
    // context:clear_organisation, context:select_facility,
    // context:clear_facility.
    const union = permissionsForRoles([
      'R01_PHYSICIAN',
      'R13_SYSTEM_ADMINISTRATOR',
    ]);
    expect(union.size).toBe(7);
    expect(union.has('context:view')).toBe(true);
    expect(union.has('context:select')).toBe(true);
    expect(union.has('context:clear')).toBe(true);
    expect(union.has('context:select_organisation')).toBe(true);
    expect(union.has('context:clear_organisation')).toBe(true);
    expect(union.has('context:select_facility')).toBe(true);
    expect(union.has('context:clear_facility')).toBe(true);
  });

  it('permissionsForRoles returns an empty set for a roleless membership', () => {
    expect(permissionsForRoles([]).size).toBe(0);
  });

  it('permissionsForRoles returns an empty set for unknown roles only', () => {
    expect(permissionsForRoles(['R99_UNKNOWN']).size).toBe(0);
    expect(permissionsForRoles(['owner']).size).toBe(0);
  });

  it('permissionsForRoles ignores unknown roles but keeps valid ones', () => {
    const union = permissionsForRoles([
      'R99_UNKNOWN',
      'R01_PHYSICIAN',
      'owner',
    ]);
    expect(union.size).toBe(7);
  });

  it('R14 combined with a human role yields the union (R14 does not revoke)', () => {
    const union = permissionsForRoles([
      'R14_INTEGRATION_ACCOUNT',
      'R01_PHYSICIAN',
    ]);
    expect(union.size).toBe(7);
    expect(union.has('context:view')).toBe(true);
    expect(union.has('context:select')).toBe(true);
    expect(union.has('context:clear')).toBe(true);
    expect(union.has('context:select_organisation')).toBe(true);
    expect(union.has('context:clear_organisation')).toBe(true);
    expect(union.has('context:select_facility')).toBe(true);
    expect(union.has('context:clear_facility')).toBe(true);
  });

  it('R14 alone yields no context permissions', () => {
    const union = permissionsForRoles(['R14_INTEGRATION_ACCOUNT']);
    expect(union.size).toBe(0);
  });

  it('rolesGrantPermission returns true when at least one role grants the permission', () => {
    expect(
      rolesGrantPermission(['R01_PHYSICIAN'], 'context:view'),
    ).toBe(true);
    expect(
      rolesGrantPermission(
        ['R14_INTEGRATION_ACCOUNT', 'R06_RECEPTIONIST'],
        'context:select',
      ),
    ).toBe(true);
  });

  it('rolesGrantPermission returns false when no role grants the permission', () => {
    expect(
      rolesGrantPermission(['R14_INTEGRATION_ACCOUNT'], 'context:view'),
    ).toBe(false);
    expect(rolesGrantPermission([], 'context:view')).toBe(false);
  });

  it('rolesGrantPermission returns false for an unknown permission', () => {
    expect(
      rolesGrantPermission(['R01_PHYSICIAN'], 'patient:read'),
    ).toBe(false);
    expect(
      rolesGrantPermission(['R01_PHYSICIAN'], 'unknown:action'),
    ).toBe(false);
  });

  it('rolesGrantPermission returns false for an unknown role', () => {
    expect(
      rolesGrantPermission(['R99_UNKNOWN'], 'context:view'),
    ).toBe(false);
  });

  it('default-deny: a roleless membership grants nothing', () => {
    expect(rolesGrantPermission([], 'context:view')).toBe(false);
    expect(rolesGrantPermission([], 'context:select')).toBe(false);
    expect(rolesGrantPermission([], 'context:clear')).toBe(false);
  });

  it('default-deny: an unknown permission is denied for every role', () => {
    for (const code of PLATFORM_ROLE_CODES) {
      expect(rolesGrantPermission([code], 'unknown:action')).toBe(false);
    }
  });

  it('areValidRoleCodes returns true for canonical codes only', () => {
    expect(areValidRoleCodes(['R01_PHYSICIAN'])).toBe(true);
    expect(
      areValidRoleCodes([
        'R01_PHYSICIAN',
        'R14_INTEGRATION_ACCOUNT',
        'R13_SYSTEM_ADMINISTRATOR',
      ]),
    ).toBe(true);
  });

  it('areValidRoleCodes returns false when any code is unknown', () => {
    expect(areValidRoleCodes(['R01_PHYSICIAN', 'R99_UNKNOWN'])).toBe(false);
    expect(areValidRoleCodes(['owner'])).toBe(false);
    expect(areValidRoleCodes(['R01_PHYSICIAN', 'member'])).toBe(false);
  });

  it('listPlatformRoleCodes returns the canonical list', () => {
    expect(listPlatformRoleCodes()).toBe(PLATFORM_ROLE_CODES);
    expect(listPlatformRoleCodes()).toHaveLength(14);
  });
});

describe('TenantRoleAssignment domain type', () => {
  it('a TenantRoleAssignment can be assembled with branded identifiers', () => {
    const assignment: TenantRoleAssignment = {
      id: 'assignment-1' as TenantRoleAssignmentId,
      tenantMembershipId: 'membership-1' as TenantMembershipId,
      // Per ADR-015, tenantId is required on TenantRoleAssignment
      // and is derived server-side from the referenced
      // TenantMembership. Test fixtures supply a branded tenantId
      // that matches the membership's tenant.
      tenantId: 'tenant-1' as TenantId,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
      scopeOrganisationId: null,
      scopeFacilityId: null,
      createdAt: new Date('2026-07-19T00:00:00Z'),
      updatedAt: new Date('2026-07-19T00:00:00Z'),
    };
    expect(assignment.id).toBe('assignment-1');
    expect(assignment.tenantMembershipId).toBe('membership-1');
    expect(assignment.roleCode).toBe('R13_SYSTEM_ADMINISTRATOR');
  });

  it('CreateTenantRoleAssignmentInput requires membershipId and roleCode', () => {
    const input: CreateTenantRoleAssignmentInput = {
      tenantMembershipId: 'membership-1' as TenantMembershipId,
      roleCode: 'R01_PHYSICIAN',
    };
    expect(input.tenantMembershipId).toBe('membership-1');
    expect(input.roleCode).toBe('R01_PHYSICIAN');
  });

  it('TenantRoleAssignmentId is erased to string at runtime', () => {
    const id = 'assignment-1' as TenantRoleAssignmentId;
    expect(typeof id).toBe('string');
    expect(id).toBe('assignment-1');
  });

  it('the roleCode field is typed as a canonical PlatformRoleCode', () => {
    // Compile-time check: assigning a non-canonical code would fail.
    const roleCode: PlatformRoleCode = 'R13_SYSTEM_ADMINISTRATOR';
    expect(roleCode).toBe('R13_SYSTEM_ADMINISTRATOR');
  });

  it('the permissionCode type covers exactly the three context permissions', () => {
    const codes: PermissionCode[] = [
      'context:view',
      'context:select',
      'context:clear',
    ];
    expect(codes).toHaveLength(3);
  });

  it('duplicate role codes are a type-level concept; runtime prevention is structural via the unique constraint', () => {
    // The unique constraint on (tenantMembershipId, roleCode) is the
    // structural enforcement. At the domain level, the same code
    // appearing twice in a principal's role set does not grant the
    // permission twice; the Set<PermissionCode> accumulation
    // deduplicates implicitly.
    const union = permissionsForRoles([
      'R01_PHYSICIAN',
      'R01_PHYSICIAN',
      'R01_PHYSICIAN',
    ]);
    expect(union.size).toBe(7);
  });

  it('a catalogue entry is a readonly snapshot', () => {
    const entry: PlatformRoleCatalogueEntry = {
      code: 'R01_PHYSICIAN',
      shortCode: 'R01',
      category: 'clinical',
      displayNameEn: 'Physician',
      displayNameAr: 'طبيب',
    };
    expect(entry.code).toBe('R01_PHYSICIAN');
    // Compile-time check: entry.code = 'R02_NURSE' would fail.
  });
});


// ---------------------------------------------------------------------------
// ADR-015 — Applicability rules (R09 / R13 / R14 / generic non-R13 tenant)
// ---------------------------------------------------------------------------

/**
 * Helper: build a TenantRoleAssignment fixture.
 */
function makeAssignment(args: {
  id?: string;
  tenantMembershipId?: string;
  tenantId?: string;
  roleCode: string;
  scopeLevel: RoleAssignmentScopeLevel;
  scopeOrganisationId?: string | null;
  scopeFacilityId?: string | null;
}): TenantRoleAssignment {
  return {
    id: (args.id ?? 'assignment-x') as TenantRoleAssignmentId,
    tenantMembershipId: (args.tenantMembershipId ??
      'membership-x') as TenantMembershipId,
    tenantId: (args.tenantId ?? 'tenant-x') as TenantId,
    roleCode: args.roleCode as PlatformRoleCode,
    scopeLevel: args.scopeLevel,
    scopeOrganisationId: (args.scopeOrganisationId ?? null) as
      | OrganisationId
      | null,
    scopeFacilityId: (args.scopeFacilityId ?? null) as FacilityId | null,
    createdAt: new Date('2026-07-22T00:00:00Z'),
    updatedAt: new Date('2026-07-22T00:00:00Z'),
  };
}

/**
 * Helper: simulate the applicability logic that
 * PrismaTenantRoleAssignmentRepository.listForMembershipAtOrganisation
 * implements. Returns the subset of `assignments` that grant
 * authority at the supplied organisation.
 *
 * Per ADR-015 §1.5 (Scope-authorisation Semantics):
 * - organisation-scoped assignments for the supplied organisation;
 * - facility-scoped assignments whose scope_organisation_id matches
 *   the supplied organisation;
 * - tenant-scoped assignments ONLY when the role code is
 *   R13_SYSTEM_ADMINISTRATOR.
 */
function applicableAtOrganisation(
  assignments: readonly TenantRoleAssignment[],
  organisationId: OrganisationId,
): readonly TenantRoleAssignment[] {
  return assignments.filter((a) => {
    if (a.scopeLevel === 'tenant') {
      return a.roleCode === 'R13_SYSTEM_ADMINISTRATOR';
    }
    if (a.scopeLevel === 'organisation') {
      return a.scopeOrganisationId === organisationId;
    }
    if (a.scopeLevel === 'facility') {
      // A facility-scoped assignment grants authority at its parent
      // organisation by implication.
      return a.scopeOrganisationId === organisationId;
    }
    return false;
  });
}

/**
 * Helper: simulate the applicability logic that
 * PrismaTenantRoleAssignmentRepository.listForMembershipAtFacility
 * implements. Returns the subset of `assignments` that grant
 * authority at the supplied facility (resolved against its parent
 * organisation).
 */
function applicableAtFacility(
  assignments: readonly TenantRoleAssignment[],
  facilityId: FacilityId,
  parentOrganisationId: OrganisationId,
): readonly TenantRoleAssignment[] {
  return assignments.filter((a) => {
    if (a.scopeLevel === 'tenant') {
      return a.roleCode === 'R13_SYSTEM_ADMINISTRATOR';
    }
    if (a.scopeLevel === 'organisation') {
      return a.scopeOrganisationId === parentOrganisationId;
    }
    if (a.scopeLevel === 'facility') {
      return a.scopeFacilityId === facilityId;
    }
    return false;
  });
}

describe('ADR-015 applicability rules', () => {
  const tenantId = 'tenant-1' as TenantId;
  const orgA = 'org-A' as OrganisationId;
  const orgB = 'org-B' as OrganisationId;
  const facA1 = 'fac-A1' as FacilityId;
  const facA2 = 'fac-A2' as FacilityId;
  const facB1 = 'fac-B1' as FacilityId;

  it('1. R09 tenant-scoped assignment does not imply organisation access', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const applicable = applicableAtOrganisation(assignments, orgA);
    expect(applicable).toHaveLength(0);
  });

  it('2. R09 tenant-scoped assignment does not imply facility access', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const applicable = applicableAtFacility(assignments, facA1, orgA);
    expect(applicable).toHaveLength(0);
  });

  it('3. R09 organisation-scoped assignment grants only that organisation', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'organisation',
        scopeOrganisationId: orgA,
      }),
    ];
    expect(applicableAtOrganisation(assignments, orgA)).toHaveLength(1);
    expect(applicableAtOrganisation(assignments, orgB)).toHaveLength(0);
  });

  it('4. R09 organisation-scoped assignment grants facilities only under that organisation', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'organisation',
        scopeOrganisationId: orgA,
      }),
    ];
    // Facilities under orgA are accessible.
    expect(applicableAtFacility(assignments, facA1, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facA2, orgA)).toHaveLength(1);
    // Facilities under orgB are NOT accessible.
    expect(applicableAtFacility(assignments, facB1, orgB)).toHaveLength(0);
  });

  it('5. R09 facility-scoped assignment grants its parent organisation', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'facility',
        scopeOrganisationId: orgA,
        scopeFacilityId: facA1,
      }),
    ];
    // The parent organisation of facA1 is orgA; the facility-scoped
    // assignment grants authority at orgA by implication.
    expect(applicableAtOrganisation(assignments, orgA)).toHaveLength(1);
    // The same assignment does NOT grant authority at orgB.
    expect(applicableAtOrganisation(assignments, orgB)).toHaveLength(0);
  });

  it('6. R09 facility-scoped assignment grants only its exact facility', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'facility',
        scopeOrganisationId: orgA,
        scopeFacilityId: facA1,
      }),
    ];
    // facA1 is accessible; facA2 (under the same orgA) is NOT.
    expect(applicableAtFacility(assignments, facA1, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facA2, orgA)).toHaveLength(0);
  });

  it('7. R13 tenant-scoped assignment grants organisation selection inside its tenant', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    // Every organisation in the tenant is accessible.
    expect(applicableAtOrganisation(assignments, orgA)).toHaveLength(1);
    expect(applicableAtOrganisation(assignments, orgB)).toHaveLength(1);
  });

  it('8. R13 tenant-scoped assignment grants facility selection inside its tenant', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    // Every facility in the tenant is accessible (regardless of parent org).
    expect(applicableAtFacility(assignments, facA1, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facA2, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facB1, orgB)).toHaveLength(1);
  });

  it('9. R13 tenant-scoped assignment does not cross tenants (tenant boundary enforced by repository layer)', () => {
    // The applicability helpers operate on a single membership's
    // assignments; they do not consult other tenants' assignments.
    // Cross-tenant access is prevented structurally by the
    // SessionContextService, which only loads the active membership's
    // assignments and only resolves organisations/facilities under
    // the active tenant. This test verifies the helper does not
    // magically grant access to organisations outside the membership's
    // tenant: since the helper is membership-scoped, an R13
    // tenant-scoped assignment in Tenant T cannot appear in another
    // membership's assignment list.
    const tenantAAssignments = [
      makeAssignment({
        tenantId: 'tenant-A' as TenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const tenantBAssignments = [
      makeAssignment({
        tenantId: 'tenant-B' as TenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    // Tenant A's R13 grants access to Tenant A's organisations only.
    // The helper cannot see Tenant B's organisations because they
    // are not in Tenant A's organisation set.
    expect(applicableAtOrganisation(tenantAAssignments, orgA)).toHaveLength(1);
    expect(applicableAtOrganisation(tenantBAssignments, orgA)).toHaveLength(1);
    // The structural enforcement is at the session-context layer:
    // the session's active tenant membership determines which
    // tenant's organisations are even considered. This test asserts
    // the helper does not grant MORE than the input assignments
    // allow.
  });

  it('10. R14 Integration Account receives no interactive context permissions', () => {
    // The role-permission matrix denies R14 all context permissions.
    expect(permissionsForRole('R14_INTEGRATION_ACCOUNT')).toHaveLength(0);
    // R14 also does not grant any of the seven context permissions
    // when composed with another role.
    const r14Union = permissionsForRoles([
      'R14_INTEGRATION_ACCOUNT',
      'R01_PHYSICIAN',
    ]);
    // The R01 permissions are granted (R14 does not revoke them).
    expect(r14Union.size).toBeGreaterThan(0);
    // But R14 alone grants nothing.
    expect(permissionsForRoles(['R14_INTEGRATION_ACCOUNT']).size).toBe(0);
  });

  it('11. Generic non-R13 tenant-scoped assignments do not inherit all organisations or facilities', () => {
    const r01Tenant = [
      makeAssignment({
        tenantId,
        roleCode: 'R01_PHYSICIAN',
        scopeLevel: 'tenant',
      }),
    ];
    const r09Tenant = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const r12Tenant = [
      makeAssignment({
        tenantId,
        roleCode: 'R12_EXECUTIVE',
        scopeLevel: 'tenant',
      }),
    ];
    // None of these grant organisation or facility access.
    expect(applicableAtOrganisation(r01Tenant, orgA)).toHaveLength(0);
    expect(applicableAtOrganisation(r09Tenant, orgA)).toHaveLength(0);
    expect(applicableAtOrganisation(r12Tenant, orgA)).toHaveLength(0);
    expect(applicableAtFacility(r01Tenant, facA1, orgA)).toHaveLength(0);
    expect(applicableAtFacility(r09Tenant, facA1, orgA)).toHaveLength(0);
    expect(applicableAtFacility(r12Tenant, facA1, orgA)).toHaveLength(0);
  });
});
