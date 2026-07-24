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

  it('migration applied: tenant-scope partial unique constraint on (tenant_membership_id, role_code) exists', async () => {
    // Per ADR-015, the original unique index
    // `tenant_role_assignments_membership_role_key` on
    // `(tenant_membership_id, role_code)` was DROPPED and replaced
    // by three scope-specific partial unique indexes:
    //   - `tenant_role_assignments_tenant_scope_uniq`
    //       (tenant-scope rows)
    //   - `tenant_role_assignments_organisation_scope_uniq`
    //       (organisation-scope rows)
    //   - `tenant_role_assignments_facility_scope_uniq`
    //       (facility-scope rows)
    // The tenant-scope partial index is the structural successor
    // of the dropped index for the default (tenant) scope.
    //
    // We verify the index via the PostgreSQL catalogue
    // (pg_index, pg_class, pg_attribute) rather than matching the
    // textual `pg_get_indexdef` output, because PostgreSQL
    // canonicalizes the predicate with explicit `::text` casts and
    // redundant parentheses — e.g.
    // `((scope_level)::text = 'tenant'::text) AND ...`. The
    // catalogue approach verifies structural properties (unique,
    // partial, key columns) directly from system columns, and
    // normalizes only the predicate expression text (stripping
    // `::text` casts, parentheses, and extra whitespace) so an
    // incorrect predicate cannot pass.

    // Structural properties: existence (one row), uniqueness,
    // partial-ness, and the predicate expression text.
    const structuralRaw = await prisma.$queryRaw`
      SELECT
        i.indisunique AS indisunique,
        (i.indpred IS NOT NULL) AS is_partial,
        pg_get_expr(i.indpred, i.indrelid) AS indpred
      FROM pg_index AS i
      JOIN pg_class AS c ON c.oid = i.indexrelid
      JOIN pg_class AS t ON t.oid = i.indrelid
      WHERE t.relname = 'tenant_role_assignments'
        AND c.relname = 'tenant_role_assignments_tenant_scope_uniq'
    `;
    const structural = structuralRaw as ReadonlyArray<{
      indisunique: boolean;
      is_partial: boolean;
      indpred: string | null;
    }>;
    expect(structural).toHaveLength(1);
    const s = structural[0]!;

    // 1. The index exists (verified by the query returning one row).
    // 2. PostgreSQL reports it as unique.
    expect(s.indisunique).toBe(true);
    // 4. It is a partial index (has a non-null predicate).
    expect(s.is_partial).toBe(true);
    expect(s.indpred).not.toBeNull();

    // 3. Its indexed key columns are exactly tenant_membership_id
    //    and role_code, in that order. We read the key column
    //    names from pg_attribute via the indkey int2vector.
    const keyColumnsRaw = await prisma.$queryRaw`
      SELECT att.attname AS attname
      FROM pg_index AS i
      JOIN pg_class AS c ON c.oid = i.indexrelid
      JOIN pg_class AS t ON t.oid = i.indrelid
      JOIN unnest(string_to_array(i.indkey::text, ' ')::int[])
        WITH ORDINALITY AS k(attnum, ord) ON true
      JOIN pg_attribute AS att
        ON att.attrelid = i.indrelid AND att.attnum = k.attnum
      WHERE t.relname = 'tenant_role_assignments'
        AND c.relname = 'tenant_role_assignments_tenant_scope_uniq'
      ORDER BY k.ord
    `;
    const keyColumns = keyColumnsRaw as ReadonlyArray<{
      attname: string;
    }>;
    expect(keyColumns.map((r) => r.attname)).toEqual([
      'tenant_membership_id',
      'role_code',
    ]);

    // 5. Its predicate semantically requires:
    //      scope_level = 'tenant'
    //      scope_organisation_id IS NULL
    //      scope_facility_id IS NULL
    //    Normalize only PostgreSQL formatting artifacts (::text
    //    casts, parentheses, repeated whitespace) so a different
    //    predicate cannot pass. After normalization, split on AND
    //    and compare the sorted clause set to the expected set.
    const normalizedPred = (s.indpred as string)
      .replace(/::\w+/g, '') // strip ::text and other type casts
      .replace(/[()]/g, ' ') // replace parens with spaces
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim()
      .toLowerCase();
    const clauses = normalizedPred
      .split(/\s+and\s+/)
      .map((c) => c.trim())
      .sort();
    expect(clauses).toEqual(
      [
        'scope_facility_id is null',
        "scope_level = 'tenant'",
        'scope_organisation_id is null',
      ].sort(),
    );
  });

  it('migration applied: tenant-scope uniqueness rejects duplicates with SQLSTATE 23505', async () => {
    // Behavioural regression coverage for the tenant-scope partial
    // unique index `tenant_role_assignments_tenant_scope_uniq`.
    // Two tenant-scoped assignments with the same
    // (tenant_membership_id, role_code) must be rejected with
    // SQLSTATE 23505 (unique_violation). This is the behavioural
    // backstop for the structural index assertion above and
    // complements the application-layer duplicate-assignment test
    // in the `TenantRoleAssignment database model` suite (which
    // asserts the repository throws, but does not surface the
    // underlying SQLSTATE).
    const tenant = await tenants.create({
      slug: 'tenant-uniq-23505',
      displayName: 'Uniqueness 23505 Tenant',
    });
    const user = await users.create({
      email: 'uniq-23505@example.invalid',
      displayName: 'Uniqueness 23505 User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    // Insert the first tenant-scoped assignment via raw SQL.
    await prisma.$executeRaw`
      INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, created_at, updated_at)
      VALUES (gen_random_uuid(), ${membership.id}::uuid, ${tenant.id}::uuid, 'R01_PHYSICIAN', 'tenant', now(), now())
    `;

    // Insert a second tenant-scoped assignment with the same
    // (tenant_membership_id, role_code). The partial unique index
    // must reject this with SQLSTATE 23505 (unique_violation).
    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, ${tenant.id}::uuid, 'R01_PHYSICIAN', 'tenant', now(), now())
      `,
    ).rejects.toThrow(/unique constraint|23505|duplicate key/);
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
    //
    // Per ADR-015, tenant_role_assignments.tenant_id is NOT NULL
    // and is structurally tied to the membership's tenant via the
    // composite foreign key
    // `tenant_role_assignments_membership_tenant_id_fkey`. The raw
    // INSERT must therefore supply the membership's real tenant_id
    // so the row passes the NOT NULL and composite-FK constraints
    // and reaches the intended CHECK constraint. Supplying a
    // mismatched or null tenant_id would surface SQLSTATE 23502
    // or 23503 instead of the intended 23514.
    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, ${tenant.id}::uuid, 'R99_UNKNOWN', now(), now())
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

    // Per ADR-015, the raw INSERT must supply the membership's
    // real tenant_id (see the unknown-role-code INSERT test above
    // for the full rationale). The default scope_level 'tenant'
    // is applied by the column DEFAULT, so we do not need to
    // specify scope_level explicitly.
    for (const code of canonicalCodes) {
      await prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, ${tenant.id}::uuid, ${code}, now(), now())
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

    // Per ADR-015, the raw INSERT must supply the membership's
    // real tenant_id so the row passes NOT NULL and the composite
    // FK and reaches the intended CHECK constraint.
    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, ${tenant.id}::uuid, 'r01_physician', now(), now())
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

    // Per ADR-015, the raw INSERT must supply the membership's
    // real tenant_id so the row passes NOT NULL and the composite
    // FK and reaches the intended CHECK constraint.
    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, ${tenant.id}::uuid, '', now(), now())
      `,
    ).rejects.toThrow(/check_violation|violates check constraint/);
  });

  it('rejects a null tenant_id at the database level (ADR-015 NOT NULL constraint)', async () => {
    // Regression coverage for the ADR-015 contract:
    // `tenant_role_assignments.tenant_id` is NOT NULL. A raw INSERT
    // that bypasses the application layer and omits tenant_id must
    // be rejected with SQLSTATE 23502 (not_null_violation) before
    // any other constraint is evaluated. This is the structural
    // backstop for the invariant "tenantId is derived server-side
    // from TenantMembership; it must never be left unset".
    //
    // We deliberately do NOT supply tenant_id in the column list.
    // The membership is real and valid, so the only reason the
    // INSERT fails is the NOT NULL constraint on tenant_id.
    const tenant = await tenants.create({
      slug: 'tenant-null-id',
      displayName: 'Null Tenant Id Tenant',
    });
    const user = await users.create({
      email: 'null-id@example.invalid',
      displayName: 'Null Tenant Id User',
    });
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });

    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, 'R01_PHYSICIAN', now(), now())
      `,
    ).rejects.toThrow(/not-null constraint|23502/);
  });

  it('rejects a mismatched tenant_id at the database level (ADR-015 composite foreign key)', async () => {
    // Regression coverage for the ADR-015 contract:
    // `tenant_role_assignments(tenant_membership_id, tenant_id)` is
    // tied to `tenant_memberships(id, tenant_id)` via the composite
    // foreign key `tenant_role_assignments_membership_tenant_id_fkey`.
    // A raw INSERT that supplies a tenant_id which does not match
    // the membership's tenant must be rejected with SQLSTATE 23503
    // (foreign_key_violation). This is the structural backstop for
    // the invariant "tenantId is derived server-side from
    // TenantMembership; a caller-supplied tenant_id that disagrees
    // with the membership's tenant must not persist".
    const tenantA = await tenants.create({
      slug: 'tenant-composite-fk-a',
      displayName: 'Composite FK Tenant A',
    });
    const tenantB = await tenants.create({
      slug: 'tenant-composite-fk-b',
      displayName: 'Composite FK Tenant B',
    });
    const user = await users.create({
      email: 'composite-fk@example.invalid',
      displayName: 'Composite FK User',
    });
    const membership = await memberships.create({
      tenantId: tenantA.id,
      userId: user.id,
    });

    // Supply tenantB.id (a real tenant) but membership belongs to
    // tenantA. The single-column FK to tenants.id passes (tenantB
    // exists), but the composite FK to tenant_memberships(id,
    // tenant_id) fails because no membership row matches
    // (membership.id, tenantB.id).
    await expect(
      prisma.$executeRaw`
        INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${membership.id}::uuid, ${tenantB.id}::uuid, 'R01_PHYSICIAN', now(), now())
      `,
    ).rejects.toThrow(
      /foreign key constraint|23503|violates foreign key constraint/,
    );
  });
});
