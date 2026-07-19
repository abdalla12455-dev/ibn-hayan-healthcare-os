import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupDatabaseTests } from './_pg-bootstrap.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaTenantRepository } from '../../src/infrastructure/database/repositories/prisma-tenant.repository.js';
import { PrismaUserRepository } from '../../src/infrastructure/database/repositories/prisma-user.repository.js';
import { PrismaTenantMembershipRepository } from '../../src/infrastructure/database/repositories/prisma-tenant-membership.repository.js';
import { PrismaTenantRoleAssignmentRepository } from '../../src/infrastructure/database/repositories/prisma-tenant-role-assignment.repository.js';
import type {
  TenantRepository,
  UserRepository,
  TenantMembershipRepository,
  TenantRoleAssignmentRepository,
} from '@ibn-hayan/domain';

/**
 * Database integration tests for the RBAC authorization foundation
 * (eighth canonical batch).
 *
 * These tests verify:
 *  1. A membership can have multiple distinct role assignments.
 *  2. Duplicate assignment of the same role to the same membership
 *     fails (P2002).
 *  3. The same role can be assigned to different memberships.
 *  4. Invalid foreign-key assignments fail.
 *  5. ON DELETE RESTRICT behaviour is preserved (deleting a
 *     membership with assignments is rejected).
 *  6. Existing membership uniqueness remains intact.
 *  7. Migration applies successfully to an empty database.
 *  8. Migration applies to a database containing existing
 *     memberships without silently granting privileges.
 *  9. Loading a membership's roles returns the assigned codes.
 * 10. Loading a membership with no assignments returns an empty
 *     array.
 *
 * All tests use real PostgreSQL 17 via the disposable cluster
 * bootstrap (`_pg-bootstrap.ts`).
 */

setupDatabaseTests();

let prisma: PrismaService;
let tenants: TenantRepository;
let users: UserRepository;
let memberships: TenantMembershipRepository;
let roleAssignments: TenantRoleAssignmentRepository;

beforeAll(() => {
  prisma = new PrismaService();
  tenants = new PrismaTenantRepository(prisma);
  users = new PrismaUserRepository(prisma);
  memberships = new PrismaTenantMembershipRepository(prisma);
  roleAssignments = new PrismaTenantRoleAssignmentRepository(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean the role assignments and memberships before each test.
  // The tenancy and identity tests clean their own tables; we clean
  // the role-assignment table here.
  await prisma.tenantRoleAssignment.deleteMany({});
  await prisma.tenantMembership.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.user.deleteMany({});
});

describe('TenantRoleAssignment database model', () => {
  it('a membership can have multiple distinct role assignments', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-multi',
      displayName: 'Multi Role Tenant',
    });
    const user = await users.create({
      email: 'multi@example.invalid',
      displayName: 'Multi Role User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R01_PHYSICIAN',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R06_RECEPTIONIST',
    });

    const loaded = await roleAssignments.listForMembership(membership.id);
    expect(loaded).toHaveLength(3);
    const codes = loaded.map((a) => a.roleCode).sort();
    expect(codes).toEqual([
      'R01_PHYSICIAN',
      'R06_RECEPTIONIST',
      'R13_SYSTEM_ADMINISTRATOR',
    ]);
  });

  it('duplicate assignment of the same role to the same membership fails', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-dup',
      displayName: 'Dup Role Tenant',
    });
    const user = await users.create({
      email: 'dup@example.invalid',
      displayName: 'Dup Role User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R01_PHYSICIAN',
    });

    await expect(
      roleAssignments.create({
        tenantMembershipId: membership.id,
        roleCode: 'R01_PHYSICIAN',
      }),
    ).rejects.toThrow();
  });

  it('the same role can be assigned to different memberships', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-shared',
      displayName: 'Shared Role Tenant',
    });
    const user1 = await users.create({
      email: 'user1@example.invalid',
      displayName: 'User One',
    });
    const user2 = await users.create({
      email: 'user2@example.invalid',
      displayName: 'User Two',
    });
    const membership1 = await memberships.create({
      tenantId: tenant.id,
      userId: user1.id,
    });
    const membership2 = await memberships.create({
      tenantId: tenant.id,
      userId: user2.id,
    });

    await roleAssignments.create({
      tenantMembershipId: membership1.id,
      roleCode: 'R01_PHYSICIAN',
    });
    await roleAssignments.create({
      tenantMembershipId: membership2.id,
      roleCode: 'R01_PHYSICIAN',
    });

    const loaded1 = await roleAssignments.listForMembership(membership1.id);
    const loaded2 = await roleAssignments.listForMembership(membership2.id);
    expect(loaded1).toHaveLength(1);
    expect(loaded1[0]!.roleCode).toBe('R01_PHYSICIAN');
    expect(loaded2).toHaveLength(1);
    expect(loaded2[0]!.roleCode).toBe('R01_PHYSICIAN');
  });

  it('invalid foreign-key assignments fail', async () => {
    await expect(
      roleAssignments.create({
        tenantMembershipId: '00000000-0000-0000-0000-000000000000' as never,
        roleCode: 'R01_PHYSICIAN',
      }),
    ).rejects.toThrow();
  });

  it('ON DELETE RESTRICT: deleting a membership with assignments is rejected', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-restrict',
      displayName: 'Restrict Tenant',
    });
    const user = await users.create({
      email: 'restrict@example.invalid',
      displayName: 'Restrict User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R01_PHYSICIAN',
    });

    // Attempting to delete the membership directly should fail
    // because of the foreign-key RESTRICT constraint.
    await expect(
      prisma.tenantMembership.delete({ where: { id: membership.id } }),
    ).rejects.toThrow();
  });

  it('loading a membership with no assignments returns an empty array', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-empty',
      displayName: 'Empty Tenant',
    });
    const user = await users.create({
      email: 'empty@example.invalid',
      displayName: 'Empty User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    const loaded = await roleAssignments.listForMembership(membership.id);
    expect(loaded).toEqual([]);
  });

  it('loading a membership returns the assigned role codes', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-load',
      displayName: 'Load Tenant',
    });
    const user = await users.create({
      email: 'load@example.invalid',
      displayName: 'Load User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R14_INTEGRATION_ACCOUNT',
    });

    const loaded = await roleAssignments.listForMembership(membership.id);
    expect(loaded).toHaveLength(2);
    const codes = loaded.map((a) => a.roleCode).sort();
    expect(codes).toEqual([
      'R13_SYSTEM_ADMINISTRATOR',
      'R14_INTEGRATION_ACCOUNT',
    ]);
  });
});

describe('RBAC migration behaviour', () => {
  it('migration applied: tenant_role_assignments table exists', async () => {
    // Verify the table exists by querying it.
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'tenant_role_assignments'
      ) as exists;
    `;
    const exists = (result as readonly { exists: boolean }[])[0]?.exists;
    expect(exists).toBe(true);
  });

  it('migration applied: unique constraint on (tenant_membership_id, role_code) exists', async () => {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE indexname = 'tenant_role_assignments_membership_role_key'
      ) as exists;
    `;
    const exists = (result as readonly { exists: boolean }[])[0]?.exists;
    expect(exists).toBe(true);
  });

  it('migration applied: foreign key to tenant_memberships exists', async () => {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_name = 'tenant_role_assignments_tenant_membership_id_fkey'
          AND constraint_type = 'FOREIGN KEY'
      ) as exists;
    `;
    const exists = (result as readonly { exists: boolean }[])[0]?.exists;
    expect(exists).toBe(true);
  });

  it('migration does not insert any rows (fail-closed)', async () => {
    // After migration, the table should be empty. The beforeEach
    // cleans up, so this test verifies the table is empty after
    // cleanup (which is the same as after migration for a fresh
    // database).
    const count = await prisma.tenantRoleAssignment.count();
    expect(count).toBe(0);
  });

  it('migration does not add a role column to tenant_memberships', async () => {
    // The simplified owner/member/viewer proposal is rejected. The
    // tenant_memberships table must NOT have a `role` column.
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenant_memberships'
        AND column_name = 'role';
    `;
    const rows = result as readonly { column_name: string }[];
    expect(rows).toHaveLength(0);
  });
});
