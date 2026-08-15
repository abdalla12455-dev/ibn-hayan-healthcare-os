import { describe, it, expect } from 'vitest';

/**
 * Compile-time and runtime smoke tests for the User→Provider identity
 * binding domain types and the UserProviderBindingRepository port.
 *
 * These tests do not instantiate any framework. They verify that:
 * - The domain package exports the expected binding types and the
 *   resolver port.
 * - The resolver port can be assembled against a no-op stub without
 *   importing any framework (structural proof of framework
 *   independence).
 * - The branded identifier types are erased to strings at runtime.
 * - The fail-closed contract is expressible: a stub resolver returns
 *   null without trusting any caller-supplied Provider identity.
 *
 * The persistence adapter (in apps/api) is tested separately by the
 * database integration tests under `apps/api/test/database/`.
 */

import type {
  UserProviderBinding,
  UserProviderBindingId,
  ActiveProviderIdentity,
  FacilityScopedActiveProviderIdentity,
  CreateUserProviderBindingInput,
  RevokeUserProviderBindingInput,
  UserProviderBindingRepository,
} from './index.js';
import type { ProviderId } from './index.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { UserId } from '../identity/user.js';

describe('user-provider binding domain exports', () => {
  it('exports the UserProviderBinding type with its identifier type', () => {
    const binding: UserProviderBinding = {
      id: 'binding-1' as UserProviderBindingId,
      tenantId: 'tenant-1' as TenantId,
      userId: 'user-1' as UserId,
      providerId: 'provider-1' as ProviderId,
      activatedAt: new Date('2026-01-01T00:00:00Z'),
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(binding.id).toBe('binding-1');
    expect(binding.tenantId).toBe('tenant-1');
    expect(binding.userId).toBe('user-1');
    expect(binding.providerId).toBe('provider-1');
    expect(binding.revokedAt).toBeNull();
  });

  it('branded identifier types are erased to strings at runtime', () => {
    const bindingId: UserProviderBindingId = 'binding-1' as UserProviderBindingId;
    expect(typeof bindingId).toBe('string');
    expect(bindingId).toBe('binding-1');
  });
});

describe('active provider identity result', () => {
  it('ActiveProviderIdentity carries trusted provider identity + clinicalAuthorRole', () => {
    const identity: ActiveProviderIdentity = {
      bindingId: 'binding-1' as UserProviderBindingId,
      providerId: 'provider-1' as ProviderId,
      tenantId: 'tenant-1' as TenantId,
      providerStatus: 'active',
      clinicalAuthorRole: 'physician',
    };
    expect(identity.providerStatus).toBe('active');
    expect(identity.clinicalAuthorRole).toBe('physician');
  });

  it('ActiveProviderIdentity permits a null clinicalAuthorRole', () => {
    const identity: ActiveProviderIdentity = {
      bindingId: 'binding-1' as UserProviderBindingId,
      providerId: 'provider-1' as ProviderId,
      tenantId: 'tenant-1' as TenantId,
      providerStatus: 'active',
      clinicalAuthorRole: null,
    };
    expect(identity.clinicalAuthorRole).toBeNull();
  });

  it('FacilityScopedActiveProviderIdentity extends the active identity', () => {
    const scoped: FacilityScopedActiveProviderIdentity = {
      bindingId: 'binding-1' as UserProviderBindingId,
      providerId: 'provider-1' as ProviderId,
      tenantId: 'tenant-1' as TenantId,
      providerStatus: 'active',
      clinicalAuthorRole: 'nurse',
      facilityAssignmentId: 'assignment-1',
      facilityId: 'facility-1' as FacilityId,
      organisationId: 'org-1',
    };
    expect(scoped.facilityId).toBe('facility-1');
    expect(scoped.clinicalAuthorRole).toBe('nurse');
  });
});

describe('binding inputs', () => {
  it('CreateUserProviderBindingInput requires tenantId, userId, providerId', () => {
    const input: CreateUserProviderBindingInput = {
      tenantId: 'tenant-1' as TenantId,
      userId: 'user-1' as UserId,
      providerId: 'provider-1' as ProviderId,
    };
    expect(input.tenantId).toBe('tenant-1');
    expect(input.userId).toBe('user-1');
    expect(input.providerId).toBe('provider-1');
  });

  it('RevokeUserProviderBindingInput requires tenantId, userId, revokedAt', () => {
    const input: RevokeUserProviderBindingInput = {
      tenantId: 'tenant-1' as TenantId,
      userId: 'user-1' as UserId,
      revokedAt: new Date('2026-01-02T00:00:00Z'),
    };
    expect(input.revokedAt).toBeInstanceOf(Date);
  });
});

describe('user-provider binding repository port', () => {
  it('UserProviderBindingRepository port can be implemented without any framework import', () => {
    const stub: UserProviderBindingRepository = {
      async findActiveProviderForUser(): Promise<ActiveProviderIdentity | null> {
        return null;
      },
      async findActiveProviderForUserAtFacility(): Promise<FacilityScopedActiveProviderIdentity | null> {
        return null;
      },
      async create(): Promise<UserProviderBinding> {
        throw new Error('not implemented');
      },
      async revoke(): Promise<UserProviderBinding | null> {
        return null;
      },
      async findById(): Promise<UserProviderBinding | null> {
        return null;
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.findActiveProviderForUser).toBe('function');
    expect(typeof stub.findActiveProviderForUserAtFacility).toBe('function');
    expect(typeof stub.create).toBe('function');
    expect(typeof stub.revoke).toBe('function');
    expect(typeof stub.findById).toBe('function');
  });

  it('findActiveProviderForUser takes (tenantId, userId) — no provider identity is supplied by the caller', () => {
    const stub: UserProviderBindingRepository = {
      async findActiveProviderForUser(
        tenantId: TenantId,
        userId: UserId,
      ): Promise<ActiveProviderIdentity | null> {
        expect(typeof tenantId).toBe('string');
        expect(typeof userId).toBe('string');
        // Fail closed by default.
        return null;
      },
      async findActiveProviderForUserAtFacility(): Promise<FacilityScopedActiveProviderIdentity | null> {
        return null;
      },
      async create(): Promise<UserProviderBinding> {
        throw new Error('not implemented');
      },
      async revoke(): Promise<UserProviderBinding | null> {
        return null;
      },
      async findById(): Promise<UserProviderBinding | null> {
        return null;
      },
    };
    expect(stub.findActiveProviderForUser).toBeDefined();
  });
});
