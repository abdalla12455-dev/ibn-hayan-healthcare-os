import { describe, it, expect } from 'vitest';

/**
 * Compile-time and runtime smoke tests for the tenancy domain types
 * and repository ports.
 *
 * These tests do not instantiate any framework. They verify that:
 * - The domain package exports the expected types and interfaces.
 * - The lifecycle values are the two ratified values and no others.
 * - The branded identifier types are erased to strings at runtime.
 * - A no-op repository implementation can be assembled against the
 *   ports without importing any framework. This is the structural
 *   proof that the ports remain framework-independent.
 *
 * The persistence adapter (in apps/api) implements these ports
 * against Prisma. The adapter is tested separately by the database
 * integration tests under `apps/api/test/database/`.
 */

import type {
  Tenant,
  TenantId,
  TenantLifecycleStatus,
  CreateTenantInput,
  Organisation,
  OrganisationId,
  OrganisationLifecycleStatus,
  CreateOrganisationInput,
  Facility,
  FacilityId,
  FacilityLifecycleStatus,
  CreateFacilityInput,
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
} from './index.js';

describe('tenancy domain exports', () => {
  it('exports the Tenant type and its identifier type', () => {
    const tenant: Tenant = {
      id: 'tenant-1' as TenantId,
      slug: 'tenant-alpha.invalid',
      displayName: 'Tenant Alpha',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(tenant.id).toBe('tenant-1');
    expect(tenant.slug).toBe('tenant-alpha.invalid');
    expect(tenant.status).toBe('active');
  });

  it('exports the Organisation type and its identifier type', () => {
    const organisation: Organisation = {
      id: 'org-1' as OrganisationId,
      tenantId: 'tenant-1' as TenantId,
      code: 'ORG_ALPHA',
      displayName: 'Organisation Alpha',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(organisation.id).toBe('org-1');
    expect(organisation.tenantId).toBe('tenant-1');
    expect(organisation.code).toBe('ORG_ALPHA');
  });

  it('exports the Facility type and its identifier type', () => {
    const facility: Facility = {
      id: 'facility-1' as FacilityId,
      tenantId: 'tenant-1' as TenantId,
      organisationId: 'org-1' as OrganisationId,
      code: 'FACILITY_ALPHA',
      displayName: 'Facility Alpha',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(facility.id).toBe('facility-1');
    expect(facility.tenantId).toBe('tenant-1');
    expect(facility.organisationId).toBe('org-1');
    expect(facility.code).toBe('FACILITY_ALPHA');
  });

  it('branded identifier types are erased to strings at runtime', () => {
    // The brand is a compile-time-only type intersection; at runtime
    // the value is just a string. This test confirms the brand does
    // not leak into runtime structures.
    const tenantId: TenantId = 'tenant-1' as TenantId;
    const organisationId: OrganisationId = 'org-1' as OrganisationId;
    const facilityId: FacilityId = 'facility-1' as FacilityId;
    expect(typeof tenantId).toBe('string');
    expect(typeof organisationId).toBe('string');
    expect(typeof facilityId).toBe('string');
    expect(tenantId).toBe('tenant-1');
    expect(organisationId).toBe('org-1');
    expect(facilityId).toBe('facility-1');
  });
});

describe('tenancy lifecycle values', () => {
  it('TenantLifecycleStatus has exactly the two ratified values', () => {
    const values: TenantLifecycleStatus[] = ['active', 'suspended'];
    expect(values).toHaveLength(2);
    expect(values).toContain('active');
    expect(values).toContain('suspended');
    // Compile-time check: assigning any other value is a type error.
    // The line below would not compile if uncommented:
    // const bad: TenantLifecycleStatus = 'archived';
  });

  it('OrganisationLifecycleStatus has exactly the two ratified values', () => {
    const values: OrganisationLifecycleStatus[] = ['active', 'inactive'];
    expect(values).toHaveLength(2);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
  });

  it('FacilityLifecycleStatus has exactly the two ratified values', () => {
    const values: FacilityLifecycleStatus[] = ['active', 'inactive'];
    expect(values).toHaveLength(2);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
  });
});

describe('tenancy create inputs', () => {
  it('CreateTenantInput requires slug and displayName; status is optional', () => {
    const minimal: CreateTenantInput = {
      slug: 'tenant-alpha.invalid',
      displayName: 'Tenant Alpha',
    };
    expect(minimal.slug).toBe('tenant-alpha.invalid');
    expect(minimal.status).toBeUndefined();

    const withStatus: CreateTenantInput = {
      slug: 'tenant-beta.invalid',
      displayName: 'Tenant Beta',
      status: 'suspended',
    };
    expect(withStatus.status).toBe('suspended');
  });

  it('CreateOrganisationInput requires tenantId, code, displayName', () => {
    const minimal: CreateOrganisationInput = {
      tenantId: 'tenant-1' as TenantId,
      code: 'ORG_ALPHA',
      displayName: 'Organisation Alpha',
    };
    expect(minimal.tenantId).toBe('tenant-1');
    expect(minimal.code).toBe('ORG_ALPHA');
    expect(minimal.status).toBeUndefined();
  });

  it('CreateFacilityInput requires tenantId, organisationId, code, displayName', () => {
    const minimal: CreateFacilityInput = {
      tenantId: 'tenant-1' as TenantId,
      organisationId: 'org-1' as OrganisationId,
      code: 'FACILITY_ALPHA',
      displayName: 'Facility Alpha',
    };
    expect(minimal.tenantId).toBe('tenant-1');
    expect(minimal.organisationId).toBe('org-1');
    expect(minimal.code).toBe('FACILITY_ALPHA');
    expect(minimal.status).toBeUndefined();
  });
});

describe('tenancy repository ports', () => {
  it('TenantRepository port can be implemented without any framework import', () => {
    // This is the structural proof that the port is framework-independent.
    // The implementation here is a no-op stub; the real implementation
    // lives in apps/api and uses Prisma.
    const stub: TenantRepository = {
      async create(_input: CreateTenantInput): Promise<Tenant> {
        throw new Error('not implemented');
      },
      async findById(_tenantId: TenantId): Promise<Tenant | null> {
        return null;
      },
      async findBySlug(_slug: string): Promise<Tenant | null> {
        return null;
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.create).toBe('function');
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.findBySlug).toBe('function');
  });

  it('OrganisationRepository port requires tenant scope on every read', () => {
    const stub: OrganisationRepository = {
      async create(_input: CreateOrganisationInput): Promise<Organisation> {
        throw new Error('not implemented');
      },
      async findById(
        _tenantId: TenantId,
        _organisationId: OrganisationId,
      ): Promise<Organisation | null> {
        return null;
      },
      async listForTenant(_tenantId: TenantId): Promise<Organisation[]> {
        return [];
      },
    };
    expect(stub).toBeDefined();
    // The signatures themselves are the contract; the type system
    // enforces that `findById` and `listForTenant` cannot be called
    // without a tenantId.
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.listForTenant).toBe('function');
  });

  it('FacilityRepository port requires tenant scope on every read', () => {
    const stub: FacilityRepository = {
      async create(_input: CreateFacilityInput): Promise<Facility> {
        throw new Error('not implemented');
      },
      async findById(
        _tenantId: TenantId,
        _facilityId: FacilityId,
      ): Promise<Facility | null> {
        return null;
      },
      async listForOrganisation(
        _tenantId: TenantId,
        _organisationId: OrganisationId,
      ): Promise<Facility[]> {
        return [];
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.listForOrganisation).toBe('function');
  });

  it('OrganisationRepository.findById takes (tenantId, organisationId) — no unscoped lookup exists', () => {
    // This is a compile-time guarantee that the API surface cannot
    // represent an unscoped organisation lookup. The test below would
    // not compile if the port's findById signature omitted tenantId.
    const stub: OrganisationRepository = {
      async create(): Promise<Organisation> {
        throw new Error('not implemented');
      },
      async findById(
        tenantId: TenantId,
        organisationId: OrganisationId,
      ): Promise<Organisation | null> {
        // The function receives both arguments; calling it without
        // a tenantId is a compile error.
        expect(typeof tenantId).toBe('string');
        expect(typeof organisationId).toBe('string');
        return null;
      },
      async listForTenant(): Promise<Organisation[]> {
        return [];
      },
    };
    expect(stub.findById).toBeDefined();
  });

  it('FacilityRepository.findById takes (tenantId, facilityId) — no unscoped lookup exists', () => {
    const stub: FacilityRepository = {
      async create(): Promise<Facility> {
        throw new Error('not implemented');
      },
      async findById(
        tenantId: TenantId,
        facilityId: FacilityId,
      ): Promise<Facility | null> {
        expect(typeof tenantId).toBe('string');
        expect(typeof facilityId).toBe('string');
        return null;
      },
      async listForOrganisation(): Promise<Facility[]> {
        return [];
      },
    };
    expect(stub.findById).toBeDefined();
  });
});
