import { describe, it, expect, beforeEach } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  ProviderId,
  ProviderRepository,
  TenantId,
  UserId,
  UserRepository,
  UserProviderBindingRepository,
  CreateUserProviderBindingInput,
} from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaProviderRepository } from '../../src/infrastructure/database/repositories/prisma-provider.repository.js';
import { PrismaUserRepository } from '../../src/infrastructure/database/repositories/prisma-user.repository.js';
import { PrismaUserProviderBindingRepository } from '../../src/infrastructure/database/repositories/prisma-user-provider-binding.repository.js';
import { setupDatabaseTests } from './_pg-bootstrap.js';

/**
 * Database integration tests for the User→Provider identity binding
 * (BC10 User→Provider Identity Binding Foundation).
 *
 * These tests exercise the Prisma-backed UserProviderBindingRepository
 * against a real PostgreSQL 17 cluster.
 *
 * Coverage (BC10 spec §6):
 * - valid binding resolution;
 * - no binding => fail closed;
 * - duplicate active User binding rejected (P2002);
 * - duplicate active Provider binding rejected (P2002);
 * - same User in different tenants allowed;
 * - cross-tenant isolation;
 * - inactive/disabled User;
 * - suspended/separated Provider;
 * - revoked/inactive facility assignment;
 * - nullable/valid clinicalAuthorRole;
 * - R05 clinical author role is NOT guessed from roleCode (trusted attr);
 * - Student interactive authoring remains unavailable (value present,
 *   no authoring gate here — deferred to BC03);
 * - concurrency around competing active bindings;
 * - migration applies successfully to PostgreSQL 17;
 * - partial unique indexes enforce one-active-per-user/per-provider.
 */

setupDatabaseTests();

let prisma: PrismaService;
let providerRepo: ProviderRepository;
let usersRepo: UserRepository;
let bindingRepo: UserProviderBindingRepository;

const tenant1 = {
  id: '00000000-0000-0000-0000-000000001101' as TenantId,
  slug: 'tenant-bc10-1.test.invalid',
  displayName: 'Tenant BC10 Test 1',
};
const tenant2 = {
  id: '00000000-0000-0000-0000-000000001102' as TenantId,
  slug: 'tenant-bc10-2.test.invalid',
  displayName: 'Tenant BC10 Test 2',
};
const org1 = {
  id: '00000000-0000-0000-0000-000000002101' as string,
  code: 'ORG-BC10-1',
  displayName: 'Org BC10 Test 1',
};
const facility1 = {
  id: '00000000-0000-0000-0000-000000003101' as FacilityId,
  code: 'FAC-BC10-1',
  displayName: 'Facility BC10 Test 1',
};
const facility2 = {
  id: '00000000-0000-0000-0000-000000003102' as FacilityId,
  code: 'FAC-BC10-2',
  displayName: 'Facility BC10 Test 2',
};

function buildRepos(): void {
  prisma = new PrismaService();
  providerRepo = new PrismaProviderRepository(prisma);
  usersRepo = new PrismaUserRepository(prisma);
  bindingRepo = new PrismaUserProviderBindingRepository(prisma);
}

async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE user_provider_bindings, provider_facility_assignments, providers, users, patients, appointments, facilities, organisations, tenants RESTART IDENTITY CASCADE',
  );
}

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
}

async function createUser(
  email: string,
  status: 'active' | 'disabled' = 'active',
): Promise<UserId> {
  const user = await usersRepo.create({
    email,
    displayName: 'BC10 User',
    status,
  });
  return user.id;
}

async function createProvider(
  tenantId: TenantId,
  status:
    'candidate' | 'onboarded' | 'active' | 'suspended' | 'separated' = 'active',
  clinicalAuthorRole?:
    | 'physician'
    | 'nurse'
    | 'pharmacist'
    | 'therapist'
    | 'midlevel'
    | 'student'
    | null,
): Promise<ProviderId> {
  const provider = await prisma.provider.create({
    data: {
      tenantId,
      status,
      clinicalAuthorRole: clinicalAuthorRole ?? null,
    },
  });
  return provider.id as ProviderId;
}

async function createAssignment(
  tenantId: TenantId,
  providerId: ProviderId,
  facilityId: FacilityId,
  revoked = false,
): Promise<string> {
  const assignment = await prisma.providerFacilityAssignment.create({
    data: {
      tenantId,
      providerId,
      facilityId,
      organisationId: org1.id,
      revokedAt: revoked ? new Date('2026-01-01T00:00:00Z') : null,
    },
  });
  return assignment.id;
}

beforeEach(async () => {
  buildRepos();
  await truncateAll();
});

describe('BC10 UserProviderBindingRepository — valid resolution', () => {
  it('resolves the active Provider identity for a bound active User', async () => {
    await setupTenant1Data();
    const userId = await createUser('bound@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', 'physician');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).not.toBeNull();
    expect(identity!.providerId).toBe(providerId);
    expect(identity!.tenantId).toBe(tenant1.id);
    expect(identity!.providerStatus).toBe('active');
    expect(identity!.clinicalAuthorRole).toBe('physician');
  });

  it('resolves a null clinicalAuthorRole when none is configured', async () => {
    await setupTenant1Data();
    const userId = await createUser('norole@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', null);
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).not.toBeNull();
    expect(identity!.clinicalAuthorRole).toBeNull();
  });

  it('resolves a Student clinicalAuthorRole value (authoring gate deferred to BC03)', async () => {
    await setupTenant1Data();
    const userId = await createUser('student@example.invalid');
    // student is a supported enum value; interactive authoring is
    // deferred. The resolver surfaces the value; no authoring gate here.
    const providerId = await createProvider(tenant1.id, 'active', 'student');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).not.toBeNull();
    expect(identity!.clinicalAuthorRole).toBe('student');
  });
});

describe('BC10 UserProviderBindingRepository — fail closed', () => {
  it('returns null when no binding exists', async () => {
    await setupTenant1Data();
    const userId = await createUser('unbound@example.invalid');
    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).toBeNull();
  });

  it('returns null when the User is disabled', async () => {
    await setupTenant1Data();
    const userId = await createUser('disabled@example.invalid', 'disabled');
    const providerId = await createProvider(tenant1.id, 'active', 'physician');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).toBeNull();
  });

  it('returns null when the Provider is suspended', async () => {
    await setupTenant1Data();
    const userId = await createUser('suspended@example.invalid');
    const providerId = await createProvider(
      tenant1.id,
      'suspended',
      'physician',
    );
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).toBeNull();
  });

  it('returns null when the Provider is separated', async () => {
    await setupTenant1Data();
    const userId = await createUser('separated@example.invalid');
    const providerId = await createProvider(
      tenant1.id,
      'separated',
      'physician',
    );
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).toBeNull();
  });

  it('returns null when the binding is revoked', async () => {
    await setupTenant1Data();
    const userId = await createUser('revoked@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', 'physician');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });
    await bindingRepo.revoke({
      tenantId: tenant1.id,
      userId,
      revokedAt: new Date('2026-01-02T00:00:00Z'),
    });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).toBeNull();
  });
});

describe('BC10 UserProviderBindingRepository — cross-tenant isolation', () => {
  it('does not resolve a binding from another tenant', async () => {
    await setupTenant1Data();
    await setupTenant2Data();
    const userId = await createUser('crosstenant@example.invalid');
    const providerId = await createProvider(tenant2.id, 'active', 'physician');
    await bindingRepo.create({ tenantId: tenant2.id, userId, providerId });

    // The same global User bound in tenant2 must NOT resolve in tenant1.
    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity).toBeNull();
  });

  it('allows the same global User to bind to different Providers in different tenants', async () => {
    await setupTenant1Data();
    await setupTenant2Data();
    const userId = await createUser('multitenant@example.invalid');
    const provider1 = await createProvider(tenant1.id, 'active', 'physician');
    const provider2 = await createProvider(tenant2.id, 'active', 'nurse');

    await bindingRepo.create({
      tenantId: tenant1.id,
      userId,
      providerId: provider1,
    });
    await bindingRepo.create({
      tenantId: tenant2.id,
      userId,
      providerId: provider2,
    });

    const id1 = await bindingRepo.findActiveProviderForUser(tenant1.id, userId);
    const id2 = await bindingRepo.findActiveProviderForUser(tenant2.id, userId);
    expect(id1!.providerId).toBe(provider1);
    expect(id1!.clinicalAuthorRole).toBe('physician');
    expect(id2!.providerId).toBe(provider2);
    expect(id2!.clinicalAuthorRole).toBe('nurse');
  });
});

describe('BC10 cardinality — one active per user/provider per tenant', () => {
  it('rejects a second active binding for the same User in the same tenant (P2002)', async () => {
    await setupTenant1Data();
    const userId = await createUser('dup-user@example.invalid');
    const provider1 = await createProvider(tenant1.id, 'active', 'physician');
    const provider2 = await createProvider(tenant1.id, 'active', 'nurse');
    await bindingRepo.create({
      tenantId: tenant1.id,
      userId,
      providerId: provider1,
    });

    await expect(
      bindingRepo.create({
        tenantId: tenant1.id,
        userId,
        providerId: provider2,
      }),
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      );
    });
  });

  it('rejects a second active binding for the same Provider in the same tenant (P2002)', async () => {
    await setupTenant1Data();
    const user1 = await createUser('dup-prov-1@example.invalid');
    const user2 = await createUser('dup-prov-2@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', 'physician');
    await bindingRepo.create({
      tenantId: tenant1.id,
      userId: user1,
      providerId,
    });

    await expect(
      bindingRepo.create({ tenantId: tenant1.id, userId: user2, providerId }),
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      );
    });
  });

  it('allows re-binding after revocation (revoked bindings do not block new active binding)', async () => {
    await setupTenant1Data();
    const userId = await createUser('rebind@example.invalid');
    const provider1 = await createProvider(tenant1.id, 'active', 'physician');
    const provider2 = await createProvider(tenant1.id, 'active', 'nurse');
    await bindingRepo.create({
      tenantId: tenant1.id,
      userId,
      providerId: provider1,
    });
    await bindingRepo.revoke({
      tenantId: tenant1.id,
      userId,
      revokedAt: new Date('2026-01-02T00:00:00Z'),
    });

    // Re-binding to a different provider after revocation must succeed.
    const rebound = await bindingRepo.create({
      tenantId: tenant1.id,
      userId,
      providerId: provider2,
    });
    expect(rebound.revokedAt).toBeNull();

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity!.providerId).toBe(provider2);
  });
});

describe('BC10 facility-scoped resolution', () => {
  it('resolves the active Provider identity with an active facility assignment', async () => {
    await setupTenant1Data();
    const userId = await createUser('fac@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', 'physician');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });
    await createAssignment(tenant1.id, providerId, facility1.id);

    const identity = await bindingRepo.findActiveProviderForUserAtFacility(
      tenant1.id,
      userId,
      facility1.id,
    );
    expect(identity).not.toBeNull();
    expect(identity!.facilityId).toBe(facility1.id);
    expect(identity!.providerId).toBe(providerId);
  });

  it('fails closed when the facility assignment is revoked', async () => {
    await setupTenant1Data();
    const userId = await createUser('facrevoked@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', 'physician');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });
    await createAssignment(tenant1.id, providerId, facility1.id, true);

    const identity = await bindingRepo.findActiveProviderForUserAtFacility(
      tenant1.id,
      userId,
      facility1.id,
    );
    expect(identity).toBeNull();
  });

  it('fails closed when the Provider is not assigned to the requested facility', async () => {
    await setupTenant1Data();
    const userId = await createUser('facother@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', 'physician');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });
    await createAssignment(tenant1.id, providerId, facility1.id);

    // Assigned to facility1, requested at facility2 => fail closed.
    const identity = await bindingRepo.findActiveProviderForUserAtFacility(
      tenant1.id,
      userId,
      facility2.id,
    );
    expect(identity).toBeNull();
  });
});

describe('BC10 clinicalAuthorRole — trusted, not derived from roleCode', () => {
  it('returns the trusted clinicalAuthorRole stored on the Provider, not a roleCode guess', async () => {
    await setupTenant1Data();
    const userId = await createUser('r05@example.invalid');
    // R05 Allied Health Professional may author only when the bound
    // Provider has a valid clinicalAuthorRole. The clinicalAuthorRole is
    // a trusted attribute set by workforce administration; it is NOT
    // derived from the platform roleCode (R01–R14). We deliberately do
    // NOT read any roleCode here.
    const providerId = await createProvider(tenant1.id, 'active', 'therapist');
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    expect(identity!.clinicalAuthorRole).toBe('therapist');
  });

  it('R05 bound Provider with null clinicalAuthorRole cannot author (null surfaced, no fake fallback)', async () => {
    await setupTenant1Data();
    const userId = await createUser('r05-null@example.invalid');
    const providerId = await createProvider(tenant1.id, 'active', null);
    await bindingRepo.create({ tenantId: tenant1.id, userId, providerId });

    const identity = await bindingRepo.findActiveProviderForUser(
      tenant1.id,
      userId,
    );
    // The resolver surfaces null honestly; there is no fake fallback that
    // guesses a clinicalAuthorRole from the platform roleCode.
    expect(identity!.clinicalAuthorRole).toBeNull();
  });
});

describe('BC10 concurrency — competing active bindings', () => {
  it('only one of two concurrent bindings for the same User wins (partial unique index)', async () => {
    await setupTenant1Data();
    const userId = await createUser('concurrent@example.invalid');
    const provider1 = await createProvider(tenant1.id, 'active', 'physician');
    const provider2 = await createProvider(tenant1.id, 'active', 'nurse');

    const input1: CreateUserProviderBindingInput = {
      tenantId: tenant1.id,
      userId,
      providerId: provider1,
    };
    const input2: CreateUserProviderBindingInput = {
      tenantId: tenant1.id,
      userId,
      providerId: provider2,
    };

    // Fire both creates concurrently. The partial unique index on
    // (tenant_id, user_id) WHERE revoked_at IS NULL guarantees exactly
    // one succeeds; the other raises P2002.
    const results = await Promise.allSettled([
      bindingRepo.create(input1),
      bindingRepo.create(input2),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const rejectedValue: unknown = (rejected[0] as PromiseRejectedResult)
      .reason;
    expect(rejectedValue).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((rejectedValue as Prisma.PrismaClientKnownRequestError).code).toBe(
      'P2002',
    );
  });
});

describe('BC10 provider mapper — clinicalAuthorRole field', () => {
  it('providerRepo.findById maps the clinicalAuthorRole for an active provider', async () => {
    await setupTenant1Data();
    const providerId = await createProvider(tenant1.id, 'active', 'midlevel');

    const found = await providerRepo.findById(tenant1.id, providerId);
    expect(found).not.toBeNull();
    expect(found!.clinicalAuthorRole).toBe('midlevel');
  });
});

describe('BC10 provider tenant integrity (composite FK)', () => {
  it('rejects a binding whose provider belongs to a different tenant', async () => {
    await setupTenant1Data();
    await setupTenant2Data();
    const userId = await createUser('fkmismatch@example.invalid');
    // Provider belongs to tenant2; binding attempts tenant1.
    const providerId = await createProvider(tenant2.id, 'active', 'physician');

    await expect(
      bindingRepo.create({ tenantId: tenant1.id, userId, providerId }),
    ).rejects.toSatisfy((err: unknown) => {
      // The composite FK (tenant_id, provider_id) → providers(tenant_id, id)
      // raises a foreign-key violation (P2003).
      return err instanceof Prisma.PrismaClientKnownRequestError;
    });
  });
});
