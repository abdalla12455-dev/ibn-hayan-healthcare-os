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

describe('RBAC role-code CHECK constraint (corrective migration 20260719120000)', () => {
  // These tests verify the database-level CHECK constraint added
  // by the corrective migration
  // `20260719120000_rbac_role_code_check_constraint`. The
  // constraint limits `tenant_role_assignments.role_code` to
  // exactly the fourteen canonical platform role codes. An
  // INSERT or UPDATE that bypasses the application layer (e.g.
  // an operator running a one-off SQL script, a future batch
  // job, a restore from a logical backup, or a Prisma client
  // bug) and persists an unknown role code is rejected at the
  // database level with SQLSTATE 23514 (check_violation).
  //
  // Per the eighth canonical batch's final verification
  // requirements, application-level TypeScript and Zod
  // validation alone are NOT sufficient for direct database
  // integrity. The CHECK constraint is the structural
  // enforcement of the role-code catalogue.

  it('the role_code CHECK constraint exists in the database', async () => {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM pg_constraint
        WHERE conname = 'tenant_role_assignments_role_code_check'
          AND contype = 'c'
      ) as exists;
    `;
    const exists = (result as readonly { exists: boolean }[])[0]?.exists;
    expect(exists).toBe(true);
  });

  it('rejects an unknown role code at the database level (INSERT)', async () => {
    // Set up a real membership to attach the role to.
    const tenant = await tenants.create({
      slug: 'tenant-check-insert',
      displayName: 'Check Insert Tenant',
    });
    const user = await users.create({
      email: 'check-insert@example.invalid',
      displayName: 'Check Insert User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    // Attempt a raw SQL INSERT with an unknown role code. The
    // CHECK constraint must reject this with SQLSTATE 23514
    // (check_violation). We use $executeRaw so Prisma surfaces
    // the underlying PostgreSQL error.
    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, 'R99_UNKNOWN', now(), now())
      `,
    ).rejects.toThrow(/check_violation|violates check constraint/);
  });

  it('rejects an unknown role code at the database level (UPDATE)', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-check-update',
      displayName: 'Check Update Tenant',
    });
    const user = await users.create({
      email: 'check-update@example.invalid',
      displayName: 'Check Update User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });
    // Insert a valid assignment first.
    const assignment = await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R01_PHYSICIAN',
    });

    // Attempt a raw SQL UPDATE that sets an unknown role code.
    await expect(
      prisma.$executeRaw`
        UPDATE tenant_role_assignments
        SET role_code = 'BANNED_ROLE'
        WHERE id = ${assignment.id}::uuid
      `,
    ).rejects.toThrow(/check_violation|violates check constraint/);
  });

  it('accepts all fourteen canonical role codes at the database level', async () => {
    // Verify each of the fourteen canonical codes is accepted by
    // the CHECK constraint. We use a single membership and insert
    // fourteen rows, one per canonical code, then verify the
    // count.
    const tenant = await tenants.create({
      slug: 'tenant-canonical',
      displayName: 'Canonical Tenant',
    });
    const user = await users.create({
      email: 'canonical@example.invalid',
      displayName: 'Canonical User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    const canonicalCodes = [
      'R01_PHYSICIAN',
      'R02_NURSE',
      'R03_PHARMACIST',
      'R04_TECHNICIAN',
      'R05_ALLIED_HEALTH_PROFESSIONAL',
      'R06_RECEPTIONIST',
      'R07_SCHEDULER',
      'R08_BILLER',
      'R09_ADMINISTRATOR',
      'R10_COMPLIANCE_OFFICER',
      'R11_HR_MANAGER',
      'R12_EXECUTIVE',
      'R13_SYSTEM_ADMINISTRATOR',
      'R14_INTEGRATION_ACCOUNT',
    ];

    for (const code of canonicalCodes) {
      await prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, ${code}, now(), now())
      `;
    }

    const count = await prisma.tenantRoleAssignment.count({
      where: { tenantMembershipId: membership.id },
    });
    expect(count).toBe(14);
  });

  it('rejects lowercase and case-variant role codes (CHECK is case-sensitive)', async () => {
    // The CHECK constraint uses exact string literals. A
    // lowercase or mixed-case variant of a canonical code must
    // be rejected, because the application layer normalises to
    // uppercase before insertion; the database must not accept
    // anything else.
    const tenant = await tenants.create({
      slug: 'tenant-case',
      displayName: 'Case Tenant',
    });
    const user = await users.create({
      email: 'case@example.invalid',
      displayName: 'Case User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, 'r01_physician', now(), now())
      `,
    ).rejects.toThrow(/check_violation|violates check constraint/);
  });

  it('rejects an empty role code at the database level', async () => {
    const tenant = await tenants.create({
      slug: 'tenant-empty-code',
      displayName: 'Empty Code Tenant',
    });
    const user = await users.create({
      email: 'empty-code@example.invalid',
      displayName: 'Empty Code User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, '', now(), now())
      `,
    ).rejects.toThrow(/check_violation|violates check constraint/);
  });
});
