/**
 * PrismaTenantRoleAssignmentRepository.create safety tests.
 *
 * Per ADR-015 §1.4 and §1.5, the repository's `create` method:
 *  - loads the tenant membership;
 *  - derives tenantId from the membership (never trusts caller input);
 *  - validates that any scope-organisation belongs to the derived tenant;
 *  - validates that any scope-facility belongs to the derived tenant AND
 *    to the supplied organisation;
 *  - rejects malformed scope targets before insertion;
 *  - persists the derived tenantId.
 *
 * These tests verify the validation logic in isolation by injecting
 * a stub PrismaClient that records calls and returns canned
 * responses. No real PostgreSQL cluster is required.
 */

import { describe, expect, it } from 'vitest';
import { PrismaTenantRoleAssignmentRepository } from '../../src/infrastructure/database/repositories/prisma-tenant-role-assignment.repository.js';
import type { PrismaService } from '../../src/infrastructure/database/prisma.service.js';

/**
 * A minimal stub PrismaService. The repository only uses four
 * properties: `tenantMembership.findUnique`, `organisation.findUnique`,
 * `facility.findUnique`, and `tenantRoleAssignment.create`. We
 * implement only those.
 */
function makeStubPrisma(args: {
  membership?: { id: string; tenantId: string } | null;
  organisation?: { id: string; tenantId: string } | null;
  facility?: { id: string; tenantId: string; organisationId: string } | null;
  createdRow?: {
    id: string;
    tenantMembershipId: string;
    tenantId: string;
    roleCode: string;
    scopeLevel: string;
    scopeOrganisationId: string | null;
    scopeFacilityId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}): PrismaService {
  const stub = {
    tenantMembership: {
      findUnique: () => Promise.resolve(args.membership ?? null),
    },
    organisation: {
      findUnique: () => Promise.resolve(args.organisation ?? null),
    },
    facility: {
      findUnique: () => Promise.resolve(args.facility ?? null),
    },
    tenantRoleAssignment: {
      create: () =>
        Promise.resolve(
          args.createdRow ?? {
            id: 'new-assignment-id',
            tenantMembershipId: args.membership?.id ?? 'membership-x',
            tenantId: args.membership?.tenantId ?? 'tenant-x',
            roleCode: 'R09_ADMINISTRATOR',
            scopeLevel: 'tenant',
            scopeOrganisationId: null,
            scopeFacilityId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ),
    },
  };
  return stub as unknown as PrismaService;
}

describe('ADR-015 PrismaTenantRoleAssignmentRepository.create safety', () => {
  it('12. derives tenantId from the TenantMembership (never trusts caller input)', async () => {
    const membership = { id: 'membership-1', tenantId: 'tenant-1' };
    let capturedCreateData: Record<string, unknown> | null = null;
    const stub = {
      tenantMembership: { findUnique: () => Promise.resolve(membership) },
      organisation: { findUnique: () => Promise.resolve(null) },
      facility: { findUnique: () => Promise.resolve(null) },
      tenantRoleAssignment: {
        create: async (args2: { data: Record<string, unknown> }) => {
          await Promise.resolve();
          capturedCreateData = args2.data;
          return {
            id: 'new-id',
            tenantMembershipId: args2.data['tenantMembershipId'] as string,
            tenantId: args2.data['tenantId'] as string,
            roleCode: args2.data['roleCode'] as string,
            scopeLevel: args2.data['scopeLevel'] as string,
            scopeOrganisationId:
              (args2.data['scopeOrganisationId'] as string | null) ?? null,
            scopeFacilityId:
              (args2.data['scopeFacilityId'] as string | null) ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
      },
    } as unknown as PrismaService;
    const repo = new PrismaTenantRoleAssignmentRepository(stub);
    const result = await repo.create({
      tenantMembershipId: 'membership-1' as never,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    expect(result.tenantId).toBe('tenant-1');
    expect(capturedCreateData).not.toBeNull();
    expect(capturedCreateData!['tenantId']).toBe('tenant-1');
  });

  it('13. rejects a cross-tenant organisation target', async () => {
    const membership = { id: 'membership-1', tenantId: 'tenant-A' };
    // organisation lookup returns null because the organisation is
    // in a different tenant (the where clause is tenantId_id).
    const stub = makeStubPrisma({
      membership,
      organisation: null,
    });
    const repo = new PrismaTenantRoleAssignmentRepository(stub);
    await expect(
      repo.create({
        tenantMembershipId: 'membership-1' as never,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'organisation',
        scopeOrganisationId: 'org-from-tenant-B' as never,
      }),
    ).rejects.toThrow(/does not belong to tenant/);
  });

  it('14. rejects a cross-tenant facility target', async () => {
    const membership = { id: 'membership-1', tenantId: 'tenant-A' };
    // organisation lookup succeeds (org is in tenant-A), but facility
    // lookup returns null because the facility is in tenant-B.
    const stub = makeStubPrisma({
      membership,
      organisation: { id: 'org-A', tenantId: 'tenant-A' },
      facility: null,
    });
    const repo = new PrismaTenantRoleAssignmentRepository(stub);
    await expect(
      repo.create({
        tenantMembershipId: 'membership-1' as never,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'facility',
        scopeOrganisationId: 'org-A' as never,
        scopeFacilityId: 'fac-from-tenant-B' as never,
      }),
    ).rejects.toThrow(/does not belong to organisation/);
  });

  it('15. rejects a facility paired with the wrong organisation', async () => {
    const membership = { id: 'membership-1', tenantId: 'tenant-A' };
    // Both organisation and facility exist in tenant-A, but the
    // facility belongs to a different organisation. The composite
    // unique lookup `tenantId_organisationId_id` returns null.
    const stub = makeStubPrisma({
      membership,
      organisation: { id: 'org-A', tenantId: 'tenant-A' },
      facility: null, // null because the (tenantId, orgA, facB) lookup misses
    });
    const repo = new PrismaTenantRoleAssignmentRepository(stub);
    await expect(
      repo.create({
        tenantMembershipId: 'membership-1' as never,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'facility',
        scopeOrganisationId: 'org-A' as never,
        scopeFacilityId: 'fac-belonging-to-org-B' as never,
      }),
    ).rejects.toThrow(/does not belong to organisation/);
  });

  it('16. persists valid tenant, organisation, and facility scopes', async () => {
    const membership = { id: 'membership-1', tenantId: 'tenant-A' };
    const organisation = { id: 'org-A', tenantId: 'tenant-A' };
    const facility = {
      id: 'fac-A1',
      tenantId: 'tenant-A',
      organisationId: 'org-A',
    };
    let capturedCreateData: Record<string, unknown> | null = null;
    const stub = {
      tenantMembership: { findUnique: () => Promise.resolve(membership) },
      organisation: { findUnique: () => Promise.resolve(organisation) },
      facility: { findUnique: () => Promise.resolve(facility) },
      tenantRoleAssignment: {
        create: async (args2: { data: Record<string, unknown> }) => {
          await Promise.resolve();
          capturedCreateData = args2.data;
          return {
            id: 'new-id',
            tenantMembershipId: args2.data['tenantMembershipId'] as string,
            tenantId: args2.data['tenantId'] as string,
            roleCode: args2.data['roleCode'] as string,
            scopeLevel: args2.data['scopeLevel'] as string,
            scopeOrganisationId:
              (args2.data['scopeOrganisationId'] as string | null) ?? null,
            scopeFacilityId:
              (args2.data['scopeFacilityId'] as string | null) ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
      },
    } as unknown as PrismaService;
    const repo = new PrismaTenantRoleAssignmentRepository(stub);

    // Tenant scope
    const tenantResult = await repo.create({
      tenantMembershipId: 'membership-1' as never,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    expect(tenantResult.scopeLevel).toBe('tenant');
    expect(tenantResult.scopeOrganisationId).toBeNull();
    expect(tenantResult.scopeFacilityId).toBeNull();
    expect(tenantResult.tenantId).toBe('tenant-A');

    // Organisation scope
    const orgResult = await repo.create({
      tenantMembershipId: 'membership-1' as never,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: 'org-A' as never,
    });
    expect(orgResult.scopeLevel).toBe('organisation');
    expect(orgResult.scopeOrganisationId).toBe('org-A');
    expect(orgResult.scopeFacilityId).toBeNull();
    expect(orgResult.tenantId).toBe('tenant-A');

    // Facility scope
    const facResult = await repo.create({
      tenantMembershipId: 'membership-1' as never,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'facility',
      scopeOrganisationId: 'org-A' as never,
      scopeFacilityId: 'fac-A1' as never,
    });
    expect(facResult.scopeLevel).toBe('facility');
    expect(facResult.scopeOrganisationId).toBe('org-A');
    expect(facResult.scopeFacilityId).toBe('fac-A1');
    expect(facResult.tenantId).toBe('tenant-A');

    // Verify the captured create data always had the derived tenantId.
    expect(capturedCreateData).not.toBeNull();
    expect(capturedCreateData!['tenantId']).toBe('tenant-A');
  });
});
