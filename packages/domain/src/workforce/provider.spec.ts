import { describe, it, expect } from 'vitest';

/**
 * Compile-time and runtime smoke tests for the provider domain types
 * and repository ports.
 *
 * These tests do not instantiate any framework. They verify that:
 * - The domain package exports the expected types and interfaces.
 * - The lifecycle values are the five ratified values and no others.
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
  Provider,
  ProviderId,
  ProviderLifecycleStatus,
  ProviderFacilityAssignment,
  ProviderFacilityAssignmentId,
  CreateProviderInput,
  ProviderRepository,
  ClinicalNoteAuthorRole,
} from './index.js';
import {
  CLINICAL_NOTE_AUTHOR_ROLES,
  isClinicalNoteAuthorRole,
} from './index.js';
import type { TenantId } from '../tenancy/tenant.js';

describe('provider domain exports', () => {
  it('exports the Provider type and its identifier type', () => {
    const provider: Provider = {
      id: 'provider-1' as ProviderId,
      tenantId: 'tenant-1' as TenantId,
      status: 'active',
      clinicalAuthorRole: 'physician',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(provider.id).toBe('provider-1');
    expect(provider.tenantId).toBe('tenant-1');
    expect(provider.status).toBe('active');
    expect(provider.clinicalAuthorRole).toBe('physician');
  });

  it('branded identifier types are erased to strings at runtime', () => {
    const providerId: ProviderId = 'provider-1' as ProviderId;
    expect(typeof providerId).toBe('string');
    expect(providerId).toBe('provider-1');

    const assignmentId: ProviderFacilityAssignmentId =
      'assignment-1' as ProviderFacilityAssignmentId;
    expect(typeof assignmentId).toBe('string');
    expect(assignmentId).toBe('assignment-1');
  });

  it('exports the ProviderFacilityAssignment type', () => {
    const assignment: ProviderFacilityAssignment = {
      id: 'assignment-1' as ProviderFacilityAssignmentId,
      providerId: 'provider-1' as ProviderId,
      tenantId: 'tenant-1' as TenantId,
      organisationId: 'org-1',
      facilityId: 'facility-1',
      assignedAt: new Date('2026-01-01T00:00:00Z'),
      revokedAt: null,
    };
    expect(assignment.id).toBe('assignment-1');
    expect(assignment.providerId).toBe('provider-1');
    expect(assignment.revokedAt).toBeNull();
  });
});

describe('provider lifecycle values', () => {
  it('ProviderLifecycleStatus has exactly the five ratified values', () => {
    const values: ProviderLifecycleStatus[] = [
      'candidate',
      'onboarded',
      'active',
      'suspended',
      'separated',
    ];
    expect(values).toHaveLength(5);
    expect(values).toContain('candidate');
    expect(values).toContain('onboarded');
    expect(values).toContain('active');
    expect(values).toContain('suspended');
    expect(values).toContain('separated');
    // Compile-time check: assigning any other value is a type error.
    // The line below would not compile if uncommented:
    // const bad: ProviderLifecycleStatus = 'deleted';
  });
});

describe('provider create inputs', () => {
  it('CreateProviderInput requires tenantId; status is optional', () => {
    const minimal: CreateProviderInput = {
      tenantId: 'tenant-1' as TenantId,
    };
    expect(minimal.tenantId).toBe('tenant-1');
    expect(minimal.status).toBeUndefined();

    const withStatus: CreateProviderInput = {
      tenantId: 'tenant-1' as TenantId,
      status: 'active',
    };
    expect(withStatus.status).toBe('active');
  });
});

describe('clinical note author role', () => {
  it('CLINICAL_NOTE_AUTHOR_ROLES has exactly the six canonical values', () => {
    const values: readonly ClinicalNoteAuthorRole[] = CLINICAL_NOTE_AUTHOR_ROLES;
    expect(values).toHaveLength(6);
    expect([...values]).toEqual([
      'physician',
      'nurse',
      'pharmacist',
      'therapist',
      'midlevel',
      'student',
    ]);
  });

  it('isClinicalNoteAuthorRole accepts canonical values and rejects others', () => {
    expect(isClinicalNoteAuthorRole('physician')).toBe(true);
    expect(isClinicalNoteAuthorRole('student')).toBe(true);
    expect(isClinicalNoteAuthorRole('deleted')).toBe(false);
    expect(isClinicalNoteAuthorRole(null)).toBe(false);
    expect(isClinicalNoteAuthorRole(undefined)).toBe(false);
  });

  it('CreateProviderInput accepts an optional clinicalAuthorRole (including null)', () => {
    const withRole: CreateProviderInput = {
      tenantId: 'tenant-1' as TenantId,
      clinicalAuthorRole: 'midlevel',
    };
    expect(withRole.clinicalAuthorRole).toBe('midlevel');

    const nullRole: CreateProviderInput = {
      tenantId: 'tenant-1' as TenantId,
      clinicalAuthorRole: null,
    };
    expect(nullRole.clinicalAuthorRole).toBeNull();

    const minimal: CreateProviderInput = {
      tenantId: 'tenant-1' as TenantId,
    };
    expect(minimal.clinicalAuthorRole).toBeUndefined();
  });
});

describe('provider repository ports', () => {
  it('ProviderRepository port can be implemented without any framework import', () => {
    const stub: ProviderRepository = {
      async existsInTenant(
        _tenantId: string,
        _providerId: string,
      ): Promise<boolean> {
        return false;
      },
      async findById(
        _tenantId: string,
        _providerId: string,
      ): Promise<Provider | null> {
        return null;
      },
      async isEligibleForFacility(
        _tenantId: string,
        _providerId: string,
        _facilityId: string,
      ): Promise<boolean> {
        return false;
      },
      async findActiveFacilityAssignments(
        _tenantId: string,
        _providerId: string,
      ): Promise<ProviderFacilityAssignment[]> {
        return [];
      },
      async isProviderAvailableAtFacility(
        _tenantId: string,
        _providerId: string,
        _facilityId: string,
        _scheduledStart: Date,
        _scheduledEnd: Date,
      ): Promise<boolean> {
        return false;
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.existsInTenant).toBe('function');
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.isEligibleForFacility).toBe('function');
    expect(typeof stub.findActiveFacilityAssignments).toBe('function');
  });

  it('existsInTenant takes (tenantId, providerId) — tenant scope is required', () => {
    const stub: ProviderRepository = {
      async existsInTenant(
        tenantId: string,
        providerId: string,
      ): Promise<boolean> {
        expect(typeof tenantId).toBe('string');
        expect(typeof providerId).toBe('string');
        return false;
      },
      async findById(): Promise<Provider | null> {
        return null;
      },
      async isEligibleForFacility(): Promise<boolean> {
        return false;
      },
      async findActiveFacilityAssignments(): Promise<
        ProviderFacilityAssignment[]
      > {
        return [];
      },
      async isProviderAvailableAtFacility(
        _tenantId: string,
        _providerId: string,
        _facilityId: string,
        _scheduledStart: Date,
        _scheduledEnd: Date,
      ): Promise<boolean> {
        return false;
      },
    };
    expect(stub.existsInTenant).toBeDefined();
  });

  it('isEligibleForFacility takes (tenantId, providerId, facilityId) — facility scope is required', () => {
    const stub: ProviderRepository = {
      async existsInTenant(): Promise<boolean> {
        return false;
      },
      async findById(): Promise<Provider | null> {
        return null;
      },
      async isEligibleForFacility(
        tenantId: string,
        providerId: string,
        facilityId: string,
      ): Promise<boolean> {
        expect(typeof tenantId).toBe('string');
        expect(typeof providerId).toBe('string');
        expect(typeof facilityId).toBe('string');
        return false;
      },
      async findActiveFacilityAssignments(): Promise<
        ProviderFacilityAssignment[]
      > {
        return [];
      },
      async isProviderAvailableAtFacility(
        _tenantId: string,
        _providerId: string,
        _facilityId: string,
        _scheduledStart: Date,
        _scheduledEnd: Date,
      ): Promise<boolean> {
        return false;
      },
    };
    expect(stub.isEligibleForFacility).toBeDefined();
  });

  it('findActiveFacilityAssignments returns array of assignments', () => {
    const stub: ProviderRepository = {
      async existsInTenant(): Promise<boolean> {
        return false;
      },
      async findById(): Promise<Provider | null> {
        return null;
      },
      async isEligibleForFacility(): Promise<boolean> {
        return false;
      },
      async findActiveFacilityAssignments(
        tenantId: string,
        providerId: string,
      ): Promise<ProviderFacilityAssignment[]> {
        expect(typeof tenantId).toBe('string');
        expect(typeof providerId).toBe('string');
        return [];
      },
      async isProviderAvailableAtFacility(
        _tenantId: string,
        _providerId: string,
        _facilityId: string,
        _scheduledStart: Date,
        _scheduledEnd: Date,
      ): Promise<boolean> {
        return false;
      },
    };
    expect(stub.findActiveFacilityAssignments).toBeDefined();
  });
});
