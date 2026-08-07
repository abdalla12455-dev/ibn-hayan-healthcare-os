import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ProviderId,
  ProviderRepository,
  TenantId,
} from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaProviderRepository } from '../../src/infrastructure/database/repositories/prisma-provider.repository.js';
import { setupDatabaseTests } from './_pg-bootstrap.js';

/**
 * Database integration tests for the Provider repository.
 *
 * These tests exercise the Prisma-backed ProviderRepository implementation
 * against a real PostgreSQL 17 cluster.
 *
 * Per STEP 13 testing requirements:
 * 1. Valid provider exists in the correct tenant.
 * 2. Nonexistent provider returns the canonical safe result.
 * 3. Cross-tenant provider does not resolve.
 * 4. Active provider is eligible according to canonical rules.
 * 5. Inactive or archived provider behavior matches documentation.
 * 6. Provider assigned to the authenticated facility resolves successfully.
 * 7. Provider not assigned to that facility is rejected safely.
 * 8. Provider assigned to another facility does not become eligible accidentally.
 * 9. Multi-facility assignment works correctly if supported.
 * 10. Cross-organisation behavior matches canonical architecture.
 * 11. Repository returns real database results.
 * 12. UUID syntax alone never counts as existence.
 * 13. Dependency injection resolves the repository.
 * 14. Migration applies successfully to PostgreSQL 17.
 * 15. No sensitive workforce information is exposed.
 */

setupDatabaseTests();

let prisma: PrismaService;
let providerRepo: ProviderRepository;

// Generate unique test identifiers
const tenant1 = {
  id: '00000000-0000-0000-0000-000000001001' as TenantId,
  slug: 'tenant-provider-1.test.invalid',
  displayName: 'Tenant Provider Test 1',
};

const tenant2 = {
  id: '00000000-0000-0000-0000-000000001002' as TenantId,
  slug: 'tenant-provider-2.test.invalid',
  displayName: 'Tenant Provider Test 2',
};

const org1 = {
  id: '00000000-0000-0000-0000-000000002001' as string,
  code: 'ORG-PROV-1',
  displayName: 'Org Provider Test 1',
};

const org2 = {
  id: '00000000-0000-0000-0000-000000002002' as string,
  code: 'ORG-PROV-2',
  displayName: 'Org Provider Test 2',
};

const facility1 = {
  id: '00000000-0000-0000-0000-000000003001' as FacilityId,
  code: 'FAC-PROV-1',
  displayName: 'Facility Provider Test 1',
};

const facility2 = {
  id: '00000000-0000-0000-0000-000000003002' as FacilityId,
  code: 'FAC-PROV-2',
  displayName: 'Facility Provider Test 2',
};

function buildRepos(): void {
  prisma = new PrismaService();
  providerRepo = new PrismaProviderRepository(prisma);
}

// Truncate test tables before each test to avoid ID collisions
async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE provider_facility_assignments, providers, patients, appointments, facilities, organisations, tenants RESTART IDENTITY CASCADE',
  );
}

// Helper to create test tenants, orgs, and facilities
async function setupTenant1Data(): Promise<void> {
  await prisma.tenant.create({
    data: {
      id: tenant1.id,
      slug: tenant1.slug,
      displayName: tenant1.displayName,
    },
  });
  await prisma.organisation.create({
    data: {
      id: org1.id,
      tenantId: tenant1.id,
      code: org1.code,
      displayName: org1.displayName,
    },
  });
  await prisma.facility.create({
    data: {
      id: facility1.id,
      tenantId: tenant1.id,
      organisationId: org1.id,
      code: facility1.code,
      displayName: facility1.displayName,
    },
  });
  await prisma.facility.create({
    data: {
      id: facility2.id,
      tenantId: tenant1.id,
      organisationId: org1.id,
      code: facility2.code,
      displayName: facility2.displayName,
    },
  });
}

async function setupTenant2Data(): Promise<void> {
  await prisma.tenant.create({
    data: {
      id: tenant2.id,
      slug: tenant2.slug,
      displayName: tenant2.displayName,
    },
  });
  await prisma.organisation.create({
    data: {
      id: org2.id,
      tenantId: tenant2.id,
      code: org2.code,
      displayName: org2.displayName,
    },
  });
}

beforeEach(async () => {
  buildRepos();
  await truncateAll();
});

describe('ProviderRepository', () => {
  describe('existsInTenant', () => {
    it('returns true for existing provider in the correct tenant', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      const exists = await providerRepo.existsInTenant(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(exists).toBe(true);

      // Verify does NOT exist in tenant2 (cross-tenant)
      const crossTenantExists = await providerRepo.existsInTenant(
        tenant2.id,
        provider.id as ProviderId,
      );
      expect(crossTenantExists).toBe(false);

      // Verify does NOT exist for non-existent provider
      const nonExistentExists = await providerRepo.existsInTenant(
        tenant1.id,
        '00000000-0000-0000-0000-999999999999' as ProviderId,
      );
      expect(nonExistentExists).toBe(false);
    });

    it('returns false for provider in another tenant', async () => {
      await setupTenant1Data();
      await setupTenant2Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant2.id, status: 'active' },
      });

      const existsInTenant2 = await providerRepo.existsInTenant(
        tenant2.id,
        provider.id as ProviderId,
      );
      expect(existsInTenant2).toBe(true);

      const existsInTenant1 = await providerRepo.existsInTenant(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(existsInTenant1).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns provider within correct tenant scope', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      const found = await providerRepo.findById(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(found).not.toBeNull();
      expect(found!.id).toBe(provider.id);
      expect(found!.tenantId).toBe(tenant1.id);
      expect(found!.status).toBe('active');
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    it('returns null for cross-tenant lookup', async () => {
      await setupTenant1Data();
      await setupTenant2Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      const foundInTenant2 = await providerRepo.findById(
        tenant2.id,
        provider.id as ProviderId,
      );
      expect(foundInTenant2).toBeNull();

      const foundInTenant1 = await providerRepo.findById(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(foundInTenant1).not.toBeNull();
      expect(foundInTenant1!.id).toBe(provider.id);
    });

    it('returns null for non-existent provider', async () => {
      await setupTenant1Data();

      const found = await providerRepo.findById(
        tenant1.id,
        '00000000-0000-0000-0000-999999999999' as ProviderId,
      );
      expect(found).toBeNull();
    });
  });

  describe('isEligibleForFacility', () => {
    it('returns true for active provider with valid facility assignment', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(true);
    });

    it('returns false for provider without facility assignment', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('returns false for inactive provider even with facility assignment', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'suspended' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('returns false for provider with revoked facility assignment', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: new Date(),
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('returns false for cross-tenant facility query', async () => {
      await setupTenant1Data();
      await setupTenant2Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      // Query with tenant2's scope should return false
      const eligible = await providerRepo.isEligibleForFacility(
        tenant2.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('returns false for provider assigned to different facility', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      // Provider assigned to facility1 only
      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      // Check eligibility for facility2
      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility2.id,
      );
      expect(eligible).toBe(false);
    });
  });

  describe('findActiveFacilityAssignments', () => {
    it('returns active assignments for a provider', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility2.id,
          revokedAt: null,
        },
      });

      const assignments = await providerRepo.findActiveFacilityAssignments(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(assignments).toHaveLength(2);
      expect(assignments.map((a) => a.facilityId).sort()).toEqual(
        [facility1.id, facility2.id].sort(),
      );
    });

    it('excludes revoked assignments', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility2.id,
          revokedAt: new Date(),
        },
      });

      const assignments = await providerRepo.findActiveFacilityAssignments(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(assignments).toHaveLength(1);
      expect(assignments[0]!.facilityId).toBe(facility1.id);
    });

    it('returns empty array for provider with no assignments', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      const assignments = await providerRepo.findActiveFacilityAssignments(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(assignments).toHaveLength(0);
    });

    it('returns empty array for cross-tenant query', async () => {
      await setupTenant1Data();
      await setupTenant2Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const assignments = await providerRepo.findActiveFacilityAssignments(
        tenant2.id,
        provider.id as ProviderId,
      );
      expect(assignments).toHaveLength(0);
    });
  });

  describe('tenant isolation', () => {
    it('providers are isolated between tenants', async () => {
      await setupTenant1Data();
      await setupTenant2Data();

      const provider1 = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      const provider2 = await prisma.provider.create({
        data: { tenantId: tenant2.id, status: 'active' },
      });

      const allTenant1 = await prisma.provider.findMany({
        where: { tenantId: tenant1.id },
      });
      expect(allTenant1).toHaveLength(1);
      expect(allTenant1[0]!.id).toBe(provider1.id);

      const allTenant2 = await prisma.provider.findMany({
        where: { tenantId: tenant2.id },
      });
      expect(allTenant2).toHaveLength(1);
      expect(allTenant2[0]!.id).toBe(provider2.id);

      const crossTenant = await prisma.provider.findMany({
        where: { tenantId: tenant1.id, id: provider2.id },
      });
      expect(crossTenant).toHaveLength(0);
    });
  });

  describe('domain type compliance', () => {
    it('repository returns domain values, not Prisma-generated types', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'suspended' },
      });

      const found = await providerRepo.findById(
        tenant1.id,
        provider.id as ProviderId,
      );

      expect(found).not.toBeNull();
      expect(typeof found!.id).toBe('string');
      expect(typeof found!.tenantId).toBe('string');
      expect(typeof found!.status).toBe('string');
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
      expect(found!.status).toBe('suspended');
    });
  });

  describe('timestamps', () => {
    it('createdAt and updatedAt are populated', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      const found = await providerRepo.findById(
        tenant1.id,
        provider.id as ProviderId,
      );

      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
      expect(found!.createdAt.getTime()).toBeGreaterThan(0);
      expect(found!.updatedAt.getTime()).toBeGreaterThan(0);
    });
  });

  describe('uuid syntax alone does not count as existence', () => {
    it('does not match for syntactically valid but non-existent UUID', async () => {
      await setupTenant1Data();

      const nonExistentId =
        '00000000-0000-0000-0000-000000000000' as ProviderId;
      const exists = await providerRepo.existsInTenant(
        tenant1.id,
        nonExistentId,
      );
      expect(exists).toBe(false);

      const findResult = await providerRepo.findById(tenant1.id, nonExistentId);
      expect(findResult).toBeNull();
    });
  });

  describe('database constraint: partial unique index', () => {
    it('allows one active assignment per provider/facility', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const exists = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(exists).toBe(true);
    });

    it('allows revoked assignment followed by new active assignment (reassignment)', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      // Create initial assignment
      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: new Date(),
        },
      });

      // Reassign - should succeed because partial unique index only covers active
      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const assignments = await providerRepo.findActiveFacilityAssignments(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(assignments).toHaveLength(1);
      expect(assignments[0]!.facilityId).toBe(facility1.id);
    });

    it('rejects second active assignment for same provider/facility', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      // Attempting to create second active assignment should fail
      // due to partial unique index constraint
      await expect(
        prisma.providerFacilityAssignment.create({
          data: {
            providerId: provider.id,
            tenantId: tenant1.id,
            organisationId: org1.id,
            facilityId: facility1.id,
            revokedAt: null,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('database constraint: cross-tenant isolation', () => {
    it('rejects assignment where provider tenant differs from assignment tenant', async () => {
      await setupTenant1Data();
      await setupTenant2Data();

      // Provider belongs to tenant1
      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      // Attempting to create assignment with different tenant should fail
      // due to composite FK constraint
      await expect(
        prisma.providerFacilityAssignment.create({
          data: {
            providerId: provider.id,
            tenantId: tenant2.id, // Wrong tenant
            organisationId: org2.id,
            facilityId: facility1.id,
            revokedAt: null,
          },
        }),
      ).rejects.toThrow();
    });

    it('rejects assignment where facility tenant differs from assignment tenant', async () => {
      await setupTenant1Data();
      await setupTenant2Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      // facility1 belongs to tenant1, attempting to assign with tenant2 should fail
      await expect(
        prisma.providerFacilityAssignment.create({
          data: {
            providerId: provider.id,
            tenantId: tenant2.id,
            organisationId: org1.id,
            facilityId: facility1.id,
            revokedAt: null,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('database constraint: organisation owns facility', () => {
    it('rejects assignment where organisation does not own facility', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      // org2 does not own facility1 (facility1 belongs to org1)
      await expect(
        prisma.providerFacilityAssignment.create({
          data: {
            providerId: provider.id,
            tenantId: tenant1.id,
            organisationId: org2.id,
            facilityId: facility1.id,
            revokedAt: null,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('provider lifecycle eligibility', () => {
    it('candidate provider is not eligible', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'candidate' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('onboarded provider is not eligible', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'onboarded' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('suspended provider is not eligible', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'suspended' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('separated provider is not eligible', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'separated' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(false);
    });

    it('active provider with active assignment is eligible', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility1.id,
      );
      expect(eligible).toBe(true);
    });
  });

  describe('multi-facility assignment', () => {
    it('provider can be assigned to multiple facilities', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility2.id,
          revokedAt: null,
        },
      });

      const assignments = await providerRepo.findActiveFacilityAssignments(
        tenant1.id,
        provider.id as ProviderId,
      );
      expect(assignments).toHaveLength(2);
    });

    it('provider assigned to facility1 is not eligible for facility2', async () => {
      await setupTenant1Data();

      const provider = await prisma.provider.create({
        data: { tenantId: tenant1.id, status: 'active' },
      });

      await prisma.providerFacilityAssignment.create({
        data: {
          providerId: provider.id,
          tenantId: tenant1.id,
          organisationId: org1.id,
          facilityId: facility1.id,
          revokedAt: null,
        },
      });

      const eligible = await providerRepo.isEligibleForFacility(
        tenant1.id,
        provider.id as ProviderId,
        facility2.id,
      );
      expect(eligible).toBe(false);
    });
  });
});
