import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  setupDatabaseTests,
  getDatabaseUrl,
  getPsqlBin,
  startMigrationUpgradeCluster,
  type MigrationUpgradeHandle,
} from './_pg-bootstrap.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaTenantRepository } from '../../src/infrastructure/database/repositories/prisma-tenant.repository.js';
import { PrismaUserRepository } from '../../src/infrastructure/database/repositories/prisma-user.repository.js';
import { PrismaTenantMembershipRepository } from '../../src/infrastructure/database/repositories/prisma-tenant-membership.repository.js';
import { PrismaSessionRepository } from '../../src/infrastructure/database/repositories/prisma-session.repository.js';
import type {
  TenantRepository,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
  Tenant,
  User,
  TenantMembership,
  Session,
  SessionTokenHash,
} from '@ibn-hayan/domain';

/**
 * Database integration tests for the session-context feature.
 *
 * These tests verify the database scenarios for the tenant, organisation,
 * and facility context ratified by the fifth canonical batch specification
 * and ADR-015 (Scoped Organisation and Facility Context).
 *
 * Tenant-context scenarios (fifth canonical batch):
 *  1. New session has null active membership.
 *  2. Session may select an active membership belonging to its user.
 *  3. Session cannot select another user's membership.
 *  4. The composite database foreign key rejects a cross-user
 *     selection through raw SQL.
 *  5. Suspended membership cannot become active context.
 *  6. Membership under a suspended Tenant cannot become active
 *     context.
 *  7. Clearing context sets the field to null.
 *  8. Rotation preserves active context.
 *  9. Touch preserves active context.
 * 10. Different sessions for the same user have independent context.
 * 11. Revoked session cannot use context routes (verified at the
 *     repository level: setting context on a revoked session row
 *     succeeds but the row's `revokedAt` is non-null, so the
 *     application layer would reject it earlier).
 * 12. Expired session cannot use context routes (similarly verified
 *     at the repository level).
 * 13. Deleting a selected membership is restricted while referenced
 *     by an active session.
 * 14. Active organisation and facility columns exist on AuthSession
 *     (added by ADR-015; the obsolete "no such column" assertion was
 *     removed when ADR-015 added the columns).
 * 15. No raw token or CSRF token is stored in context-related
 *     columns.
 *
 * ADR-015 database and migration scenarios:
 * 16. active_organisation_id and active_facility_id exist and are
 *     nullable.
 * 17. Active facility requires active organisation (CHECK constraint).
 * 18. Active facility must belong to active organisation (composite
 *     foreign key).
 * 19. scope_level CHECK accepts only 'tenant', 'organisation',
 *     'facility'.
 * 20. Malformed tenant-scope targets are rejected (CHECK).
 * 21. Malformed organisation-scope targets are rejected (CHECK).
 * 22. Malformed facility-scope targets are rejected (CHECK).
 * 23. Tenant-scoped partial uniqueness works.
 * 24. Organisation-scoped partial uniqueness works.
 * 25. Facility-scoped partial uniqueness works.
 * 26. Membership and assignment tenant IDs must match (composite FK).
 * 27. Organisation assignments cannot reference another tenant
 *     (composite FK).
 * 28. Facility assignments cannot reference another tenant
 *     (composite FK).
 * 29. A facility cannot be paired with the wrong organisation
 *     (composite FK).
 * 30. Active-context foreign keys use RESTRICT behaviour.
 * 31. Existing assignments are backfilled with tenant_id.
 * 32. Existing assignments are backfilled with scope_level = tenant.
 * 33. Existing role codes survive migration.
 * 34. Existing membership associations survive migration.
 * 35. Genuine migration-upgrade test: boot a SECOND disposable
 *     PostgreSQL 17 cluster, apply every pre-ADR-015 migration,
 *     insert a pre-ADR-015 tenant_role_assignments row (no
 *     tenant_id, scope_level, scope_organisation_id, or
 *     scope_facility_id columns), verify those columns are absent,
 *     expose the ADR-015 migration, apply it, verify the row was
 *     backfilled with tenant_id (derived from the membership),
 *     scope_level = 'tenant', NULL scope_organisation_id, NULL
 *     scope_facility_id, unchanged role_code and
 *     tenant_membership_id, and verify the new CHECK constraints,
 *     partial unique indexes, and composite foreign keys exist.
 *
 * All tests use real PostgreSQL 17 via the disposable cluster
 * bootstrap (`_pg-bootstrap.ts`).
 */

setupDatabaseTests();

let prisma: PrismaService;
let tenants: TenantRepository;
let users: UserRepository;
let memberships: TenantMembershipRepository;
let sessions: SessionRepository;

function runSql(sql: string): string {
  return execFileSync(
    getPsqlBin(),
    [getDatabaseUrl(), '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { encoding: 'utf-8' },
  );
}

async function createTenant(
  slug: string,
  displayName: string,
): Promise<Tenant> {
  return tenants.create({ slug, displayName });
}

async function createUser(email: string, displayName: string): Promise<User> {
  return users.create({ email, displayName });
}

async function createMembership(
  tenantId: Tenant['id'],
  userId: User['id'],
): Promise<TenantMembership> {
  return memberships.create({ tenantId, userId });
}

async function createSession(
  userId: User['id'],
  tokenHash: SessionTokenHash,
): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  return sessions.create({
    userId,
    tokenHash,
    expiresAt,
    lastSeenAt: now,
  });
}

function makeTokenHash(char: string): SessionTokenHash {
  return char.repeat(64) as SessionTokenHash;
}

beforeAll(() => {
  prisma = new PrismaService();
  tenants = new PrismaTenantRepository(prisma);
  users = new PrismaUserRepository(prisma);
  memberships = new PrismaTenantMembershipRepository(prisma);
  sessions = new PrismaSessionRepository(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE auth_sessions, tenant_role_assignments, tenant_memberships, local_credentials, users, tenants, organisations, facilities RESTART IDENTITY CASCADE;',
  );
});

describe('1. New session has null active membership', () => {
  it('returns a session with activeTenantMembershipId = null', async () => {
    const user = await createUser('user-1@example.invalid', 'User 1');
    const session = await createSession(user.id, makeTokenHash('1'));
    expect(session.activeTenantMembershipId).toBeNull();
  });
});

describe('2. Session may select an active membership belonging to its user', () => {
  it('sets the activeTenantMembershipId to the membership id', async () => {
    const tenant = await createTenant('tenant-a.invalid', 'Tenant A');
    const user = await createUser('user-2@example.invalid', 'User 2');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('2'));

    const now = new Date();
    const updated = await sessions.setActiveTenantMembership(
      session.id,
      membership.id,
      now,
    );
    expect(updated).not.toBeNull();
    expect(updated?.activeTenantMembershipId).toBe(membership.id);
  });
});

describe('3. Session cannot select another user membership (repository returns null)', () => {
  it('returns null when the membership belongs to a different user', async () => {
    const tenant = await createTenant('tenant-b.invalid', 'Tenant B');
    const userA = await createUser('user-a@example.invalid', 'User A');
    const userB = await createUser('user-b@example.invalid', 'User B');
    const membershipB = await createMembership(tenant.id, userB.id);
    const sessionA = await createSession(userA.id, makeTokenHash('3'));

    const now = new Date();
    const result = await sessions.setActiveTenantMembership(
      sessionA.id,
      membershipB.id,
      now,
    );
    // The repository catches the Prisma foreign-key violation and
    // returns null. The application layer interprets null as
    // "forbidden selection".
    expect(result).toBeNull();

    // Verify the session row's activeTenantMembershipId is still
    // null (the update was rejected).
    const row = await prisma.authSession.findUnique({
      where: { id: sessionA.id },
    });
    expect(row?.activeTenantMembershipId).toBeNull();
  });
});

describe('4. Composite database foreign key rejects cross-user selection via raw SQL', () => {
  it('raises a foreign key violation when raw SQL tries to set a cross-user membership', async () => {
    const tenant = await createTenant('tenant-c.invalid', 'Tenant C');
    const userA = await createUser('user-c-a@example.invalid', 'User C A');
    const userB = await createUser('user-c-b@example.invalid', 'User C B');
    const membershipB = await createMembership(tenant.id, userB.id);
    const sessionA = await createSession(userA.id, makeTokenHash('4'));

    // Attempt the cross-user update through raw SQL. This must
    // fail because the composite foreign key
    // auth_sessions(active_tenant_membership_id, user_id)
    // references tenant_memberships(id, user_id).
    let sqlError: string | null = null;
    try {
      runSql(
        `UPDATE auth_sessions SET active_tenant_membership_id = '${membershipB.id}' WHERE id = '${sessionA.id}';`,
      );
    } catch (err) {
      sqlError = (err as Error).message;
    }
    expect(sqlError).not.toBeNull();
    expect(sqlError).toContain(
      'auth_sessions_active_tenant_membership_id_user_id_fkey',
    );
  });
});

describe('5. Suspended membership cannot become active context (repository still sets, but application layer would reject)', () => {
  it('allows the repository call but the membership is suspended', async () => {
    // This test verifies that the database does not have a CHECK
    // constraint preventing selection of a suspended membership.
    // The application layer (SessionContextService) rejects this
    // case before calling the repository. The database constraint
    // is only the structural backstop for cross-user selection,
    // not for membership status.
    //
    // We test the repository in isolation here: it will set the
    // column even if the membership is suspended. The application
    // layer's rejection is tested in the context API e2e tests.
    const tenant = await createTenant('tenant-d.invalid', 'Tenant D');
    const user = await createUser('user-d@example.invalid', 'User D');
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
      status: 'suspended',
    });
    const session = await createSession(user.id, makeTokenHash('5'));

    const now = new Date();
    // The repository call succeeds because the composite FK only
    // checks (membershipId, userId), not the membership's status.
    const result = await sessions.setActiveTenantMembership(
      session.id,
      membership.id,
      now,
    );
    expect(result).not.toBeNull();
    expect(result?.activeTenantMembershipId).toBe(membership.id);
  });
});

describe('6. Membership under a suspended Tenant can be set (application layer rejects)', () => {
  it('allows the repository call but the Tenant is suspended', async () => {
    // Similar to scenario 5: the database does not enforce Tenant
    // status. The application layer's rejection is tested in the
    // context API e2e tests.
    const tenant = await tenants.create({
      slug: 'tenant-e.invalid',
      displayName: 'Tenant E',
      status: 'suspended',
    });
    const user = await createUser('user-e@example.invalid', 'User E');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('6'));

    const now = new Date();
    const result = await sessions.setActiveTenantMembership(
      session.id,
      membership.id,
      now,
    );
    expect(result).not.toBeNull();
    expect(result?.activeTenantMembershipId).toBe(membership.id);
  });
});

describe('7. Clearing context sets the field to null', () => {
  it('sets activeTenantMembershipId to null after clearing', async () => {
    const tenant = await createTenant('tenant-f.invalid', 'Tenant F');
    const user = await createUser('user-f@example.invalid', 'User F');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('7'));

    const now = new Date();
    await sessions.setActiveTenantMembership(session.id, membership.id, now);

    const cleared = await sessions.clearActiveTenantMembership(
      session.id,
      new Date(),
    );
    expect(cleared).not.toBeNull();
    expect(cleared?.activeTenantMembershipId).toBeNull();
  });
});

describe('8. Rotation preserves active context', () => {
  it('after rotateToken, activeTenantMembershipId is unchanged', async () => {
    const tenant = await createTenant('tenant-g.invalid', 'Tenant G');
    const user = await createUser('user-g@example.invalid', 'User G');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('8'));

    const now = new Date();
    await sessions.setActiveTenantMembership(session.id, membership.id, now);

    const newHash = makeTokenHash('b');
    const rotated = await sessions.rotateToken(session.id, newHash, now);
    expect(rotated).not.toBeNull();
    expect(rotated?.activeTenantMembershipId).toBe(membership.id);
    expect(rotated?.tokenHash).toBe(newHash);
  });
});

describe('9. Touch preserves active context', () => {
  it('after touch, activeTenantMembershipId is unchanged', async () => {
    const tenant = await createTenant('tenant-h.invalid', 'Tenant H');
    const user = await createUser('user-h@example.invalid', 'User H');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('9'));

    const now = new Date();
    await sessions.setActiveTenantMembership(session.id, membership.id, now);

    const touched = await sessions.touch(session.id, new Date());
    expect(touched).not.toBeNull();
    expect(touched?.activeTenantMembershipId).toBe(membership.id);
  });
});

describe('10. Different sessions for the same user have independent context', () => {
  it('session A selects membership A; session B selects membership B; selections do not cross', async () => {
    const tenantA = await createTenant('tenant-i-a.invalid', 'Tenant I A');
    const tenantB = await createTenant('tenant-i-b.invalid', 'Tenant I B');
    const user = await createUser('user-i@example.invalid', 'User I');
    const membershipA = await createMembership(tenantA.id, user.id);
    const membershipB = await createMembership(tenantB.id, user.id);
    const sessionA = await createSession(user.id, makeTokenHash('a'));
    const sessionB = await createSession(user.id, makeTokenHash('b'));

    const now = new Date();
    const aUpdated = await sessions.setActiveTenantMembership(
      sessionA.id,
      membershipA.id,
      now,
    );
    const bUpdated = await sessions.setActiveTenantMembership(
      sessionB.id,
      membershipB.id,
      now,
    );
    expect(aUpdated?.activeTenantMembershipId).toBe(membershipA.id);
    expect(bUpdated?.activeTenantMembershipId).toBe(membershipB.id);

    // Re-read session A to ensure its context was not changed by
    // the session B update.
    const aRow = await prisma.authSession.findUnique({
      where: { id: sessionA.id },
    });
    expect(aRow?.activeTenantMembershipId).toBe(membershipA.id);
    const bRow = await prisma.authSession.findUnique({
      where: { id: sessionB.id },
    });
    expect(bRow?.activeTenantMembershipId).toBe(membershipB.id);
  });
});

describe('11. Revoked session: setting context still succeeds at the repository level (application layer rejects earlier)', () => {
  it('the repository can set activeTenantMembershipId on a revoked session row', async () => {
    // The repository's setActiveTenantMembership does not check
    // revokedAt. The application layer's getSessionFromCookie
    // filters out revoked sessions before the context route is
    // reached. This test verifies the repository's behaviour in
    // isolation: it succeeds even on a revoked row, which is
    // acceptable because the application layer prevents the call.
    const tenant = await createTenant('tenant-j.invalid', 'Tenant J');
    const user = await createUser('user-j@example.invalid', 'User J');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('j'));

    const now = new Date();
    await sessions.revoke(session.id, now);

    const result = await sessions.setActiveTenantMembership(
      session.id,
      membership.id,
      new Date(),
    );
    expect(result).not.toBeNull();
    expect(result?.activeTenantMembershipId).toBe(membership.id);
    expect(result?.revokedAt).not.toBeNull();
  });
});

describe('12. Expired session: setting context still succeeds at the repository level (application layer rejects earlier)', () => {
  it('the repository can set activeTenantMembershipId on an expired session row', async () => {
    const tenant = await createTenant('tenant-k.invalid', 'Tenant K');
    const user = await createUser('user-k@example.invalid', 'User K');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('k'));

    // Expire the session by setting expiresAt to the past.
    const past = new Date(Date.now() - 1000);
    await prisma.authSession.update({
      where: { id: session.id },
      data: { expiresAt: past },
    });

    const result = await sessions.setActiveTenantMembership(
      session.id,
      membership.id,
      new Date(),
    );
    expect(result).not.toBeNull();
    expect(result?.activeTenantMembershipId).toBe(membership.id);
  });
});

describe('13. Deleting a selected membership is restricted while referenced by an active session', () => {
  it('rejects deletion of a membership that is the active context of a session', async () => {
    const tenant = await createTenant('tenant-l.invalid', 'Tenant L');
    const user = await createUser('user-l@example.invalid', 'User L');
    const membership = await createMembership(tenant.id, user.id);
    const session = await createSession(user.id, makeTokenHash('l'));

    const now = new Date();
    await sessions.setActiveTenantMembership(session.id, membership.id, now);

    // Attempt to delete the membership through raw SQL. This must
    // fail because of the ON DELETE RESTRICT foreign key.
    let sqlError: string | null = null;
    try {
      runSql(`DELETE FROM tenant_memberships WHERE id = '${membership.id}';`);
    } catch (err) {
      sqlError = (err as Error).message;
    }
    expect(sqlError).not.toBeNull();
    expect(sqlError).toContain(
      'auth_sessions_active_tenant_membership_id_fkey',
    );
  });
});

describe('14. Active Organisation and Facility columns exist on AuthSession', () => {
  it('the auth_sessions table has active_organisation_id and active_facility_id columns (ADR-015)', () => {
    const result = runSql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions' ORDER BY column_name;",
    );
    const columns = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('(') && !l.startsWith('-'));
    // ADR-015 added these two columns; the obsolete "no such column"
    // assertion is replaced by the positive assertion here.
    expect(columns).toContain('active_organisation_id');
    expect(columns).toContain('active_facility_id');
    expect(columns).toContain('active_tenant_membership_id');
    // No facility-membership or organisation-membership indirection:
    // the active context is by stable organisation/facility ID.
    expect(columns).not.toContain('active_organisation_membership_id');
    expect(columns).not.toContain('active_facility_membership_id');
  });

  it('the auth_sessions table has no role or permission column', () => {
    const result = runSql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions' ORDER BY column_name;",
    );
    const columns = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('(') && !l.startsWith('-'));
    expect(columns).not.toContain('role');
    expect(columns).not.toContain('role_id');
    expect(columns).not.toContain('permissions');
    expect(columns).not.toContain('permission_ids');
  });

  it('the auth_sessions table has no raw tenant slug or display name column', () => {
    const result = runSql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions' ORDER BY column_name;",
    );
    const columns = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('(') && !l.startsWith('-'));
    expect(columns).not.toContain('active_tenant_slug');
    expect(columns).not.toContain('active_tenant_display_name');
    // The active_tenant_id column is intentionally absent: the
    // session references the tenant by membership, not by tenant ID.
    expect(columns).not.toContain('active_tenant_id');
  });
});

describe('15. No raw token or CSRF token is stored in context-related columns', () => {
  it('the auth_sessions table has no csrf_token or csrf_hash column', () => {
    const result = runSql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions' ORDER BY column_name;",
    );
    const columns = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('(') && !l.startsWith('-'));
    expect(columns).not.toContain('csrf_token');
    expect(columns).not.toContain('csrf_hash');
    expect(columns).not.toContain('csrf_token_hash');
  });

  it('the auth_sessions table has no raw session token column (only the hash)', () => {
    const result = runSql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions' ORDER BY column_name;",
    );
    const columns = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('(') && !l.startsWith('-'));
    expect(columns).toContain('token_hash');
    expect(columns).not.toContain('token');
    expect(columns).not.toContain('raw_token');
    expect(columns).not.toContain('session_token');
  });
});

describe('Database constraint verification: composite unique constraint on tenant_memberships(id, user_id)', () => {
  it('the composite unique constraint exists (as a unique index)', () => {
    // The composite unique constraint was created via
    // `CREATE UNIQUE INDEX` in the migration, which registers it
    // in `pg_indexes` rather than `pg_constraint`. We check both
    // locations for robustness.
    const result = runSql(
      `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint WHERE contype = 'u' AND conname = 'tenant_memberships_id_user_id_key'
      ) OR EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'tenant_memberships' AND indexname = 'tenant_memberships_id_user_id_key'
      ) THEN 1 ELSE 0 END;`,
    );
    expect(result.trim()).toBe('1');
  });
});

describe('Database constraint verification: composite foreign key on auth_sessions', () => {
  it('the composite foreign key exists with ON DELETE RESTRICT and ON UPDATE RESTRICT', () => {
    const result = runSql(
      "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND conname = 'auth_sessions_active_tenant_membership_id_user_id_fkey' AND pg_get_constraintdef(oid) LIKE '%ON DELETE RESTRICT%' AND pg_get_constraintdef(oid) LIKE '%ON UPDATE RESTRICT%';",
    );
    expect(result.trim()).toBe('1');
  });

  it('the single-column foreign key exists with ON DELETE RESTRICT and ON UPDATE RESTRICT', () => {
    const result = runSql(
      "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND conname = 'auth_sessions_active_tenant_membership_id_fkey' AND pg_get_constraintdef(oid) LIKE '%ON DELETE RESTRICT%' AND pg_get_constraintdef(oid) LIKE '%ON UPDATE RESTRICT%';",
    );
    expect(result.trim()).toBe('1');
  });
});

describe('Database constraint verification: index on auth_sessions.active_tenant_membership_id', () => {
  it('the index exists', () => {
    const result = runSql(
      "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'auth_sessions' AND indexname = 'auth_sessions_active_tenant_membership_id_idx';",
    );
    expect(result.trim()).toBe('1');
  });
});

describe('Database constraint verification: no seed rows', () => {
  it('all tenancy and identity tables are empty', () => {
    const result = runSql(
      'SELECT (SELECT COUNT(*) FROM tenants) + (SELECT COUNT(*) FROM organisations) + (SELECT COUNT(*) FROM facilities) + (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM local_credentials) + (SELECT COUNT(*) FROM tenant_memberships) + (SELECT COUNT(*) FROM auth_sessions);',
    );
    expect(result.trim()).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// ADR-015 — Database and migration scenarios
// ---------------------------------------------------------------------------

/**
 * Insert a tenant_role_assignments row directly via SQL, bypassing
 * the application-layer validation in PrismaTenantRoleAssignmentRepository.
 * Used to test database-level constraints in isolation.
 */
function insertRoleAssignmentRowDirectly(row: {
  id: string;
  tenantMembershipId: string;
  tenantId: string;
  roleCode: string;
  scopeLevel: string;
  scopeOrganisationId: string | null;
  scopeFacilityId: string | null;
}): void {
  const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, scope_facility_id, created_at, updated_at) VALUES ('${row.id}', '${row.tenantMembershipId}', '${row.tenantId}', '${row.roleCode}', '${row.scopeLevel}', ${row.scopeOrganisationId === null ? 'NULL' : `'${row.scopeOrganisationId}'`}, ${row.scopeFacilityId === null ? 'NULL' : `'${row.scopeFacilityId}'`}, NOW(), NOW());`;
  runSql(sql);
}

/**
 * Run a SQL statement that is expected to fail, and return the
 * error message. Returns null if the statement succeeded.
 */
function runSqlExpectError(sql: string): string | null {
  try {
    execFileSync(
      getPsqlBin(),
      [getDatabaseUrl(), '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    return null;
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    return e.stderr ?? e.message ?? 'unknown error';
  }
}

describe('16. active_organisation_id and active_facility_id exist and are nullable (ADR-015)', () => {
  it('both columns are nullable', () => {
    const result = runSql(
      `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'auth_sessions' AND column_name IN ('active_organisation_id', 'active_facility_id') ORDER BY column_name;`,
    );
    const lines = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    expect(lines).toEqual(['YES', 'YES']);
  });
});

describe('17. Active facility requires active organisation (CHECK constraint)', () => {
  it('rejects a session row with active_facility_id but null active_organisation_id', async () => {
    const user = await createUser('chk17@example.invalid', 'User 17');
    const tenant = await createTenant('tenant-17.invalid', 'Tenant 17');
    const membership = await createMembership(tenant.id, user.id);
    // Insert a session with active_facility_id set but
    // active_organisation_id NULL. The CHECK constraint must reject.
    const sql = `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, last_seen_at, rotated_at, active_tenant_membership_id, active_organisation_id, active_facility_id) VALUES ('11111111-1111-1111-1111-111111111117', '${user.id}', '${'a'.repeat(64)}', NOW() + INTERVAL '12 hours', NOW(), NOW(), '${membership.id}', NULL, '22222222-2222-2222-2222-222222222222');`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain('auth_sessions_facility_requires_organisation_check');
  });
});

describe('18. Active facility must belong to active organisation (composite FK)', () => {
  it('rejects a session row where active_facility_id belongs to a different organisation than active_organisation_id', async () => {
    const user = await createUser('chk18@example.invalid', 'User 18');
    const tenant = await createTenant('tenant-18.invalid', 'Tenant 18');
    const membership = await createMembership(tenant.id, user.id);
    const orgA = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-a-18', displayName: 'Org A 18' },
    });
    const orgB = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-b-18', displayName: 'Org B 18' },
    });
    const facB = await prisma.facility.create({
      data: {
        tenantId: tenant.id,
        organisationId: orgB.id,
        code: 'fac-b-18',
        displayName: 'Fac B 18',
      },
    });
    // Active org = orgA, active facility = facB (which belongs to orgB).
    // The composite FK auth_sessions(active_facility_id, active_organisation_id)
    // -> facilities(id, organisation_id) must reject.
    const sql = `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, last_seen_at, rotated_at, active_tenant_membership_id, active_organisation_id, active_facility_id) VALUES ('11111111-1111-1111-1111-111111111118', '${user.id}', '${'b'.repeat(64)}', NOW() + INTERVAL '12 hours', NOW(), NOW(), '${membership.id}', '${orgA.id}', '${facB.id}');`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'auth_sessions_active_facility_id_active_organisation_id_fkey',
    );
  });
});

describe('19. scope_level CHECK accepts only tenant, organisation, facility', () => {
  it('rejects an unknown scope_level value', async () => {
    const user = await createUser('chk19@example.invalid', 'User 19');
    const tenant = await createTenant('tenant-19.invalid', 'Tenant 19');
    const membership = await createMembership(tenant.id, user.id);
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111119', '${membership.id}', '${tenant.id}', 'R13_SYSTEM_ADMINISTRATOR', 'department', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain('tenant_role_assignments_scope_level_check');
  });
});

describe('20. Malformed tenant-scope targets are rejected (CHECK)', () => {
  it('rejects a tenant-scope row with non-null scope_organisation_id', async () => {
    const user = await createUser('chk20@example.invalid', 'User 20');
    const tenant = await createTenant('tenant-20.invalid', 'Tenant 20');
    const membership = await createMembership(tenant.id, user.id);
    const org = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-20', displayName: 'Org 20' },
    });
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111120', '${membership.id}', '${tenant.id}', 'R13_SYSTEM_ADMINISTRATOR', 'tenant', '${org.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'tenant_role_assignments_scope_target_consistency_check',
    );
  });
});

describe('21. Malformed organisation-scope targets are rejected (CHECK)', () => {
  it('rejects an organisation-scope row with null scope_organisation_id', async () => {
    const user = await createUser('chk21@example.invalid', 'User 21');
    const tenant = await createTenant('tenant-21.invalid', 'Tenant 21');
    const membership = await createMembership(tenant.id, user.id);
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111121', '${membership.id}', '${tenant.id}', 'R09_ADMINISTRATOR', 'organisation', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'tenant_role_assignments_scope_target_consistency_check',
    );
  });

  it('rejects an organisation-scope row with non-null scope_facility_id', async () => {
    const user = await createUser('chk21b@example.invalid', 'User 21b');
    const tenant = await createTenant('tenant-21b.invalid', 'Tenant 21b');
    const membership = await createMembership(tenant.id, user.id);
    const org = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-21b', displayName: 'Org 21b' },
    });
    const fac = await prisma.facility.create({
      data: {
        tenantId: tenant.id,
        organisationId: org.id,
        code: 'fac-21b',
        displayName: 'Fac 21b',
      },
    });
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, scope_facility_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-11111111112b', '${membership.id}', '${tenant.id}', 'R09_ADMINISTRATOR', 'organisation', '${org.id}', '${fac.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'tenant_role_assignments_scope_target_consistency_check',
    );
  });
});

describe('22. Malformed facility-scope targets are rejected (CHECK)', () => {
  it('rejects a facility-scope row with null scope_facility_id', async () => {
    const user = await createUser('chk22@example.invalid', 'User 22');
    const tenant = await createTenant('tenant-22.invalid', 'Tenant 22');
    const membership = await createMembership(tenant.id, user.id);
    const org = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-22', displayName: 'Org 22' },
    });
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111122', '${membership.id}', '${tenant.id}', 'R09_ADMINISTRATOR', 'facility', '${org.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'tenant_role_assignments_scope_target_consistency_check',
    );
  });
});

describe('23. Tenant-scoped partial uniqueness works', () => {
  it('rejects a duplicate (tenant_membership_id, role_code) at tenant scope', async () => {
    const user = await createUser('chk23@example.invalid', 'User 23');
    const tenant = await createTenant('tenant-23.invalid', 'Tenant 23');
    const membership = await createMembership(tenant.id, user.id);
    insertRoleAssignmentRowDirectly({
      id: '11111111-1111-1111-1111-111111111123',
      tenantMembershipId: membership.id,
      tenantId: tenant.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
      scopeOrganisationId: null,
      scopeFacilityId: null,
    });
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, created_at, updated_at) VALUES ('11111111-1111-1111-1111-11111111112a', '${membership.id}', '${tenant.id}', 'R13_SYSTEM_ADMINISTRATOR', 'tenant', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain('tenant_role_assignments_tenant_scope_uniq');
  });
});

describe('24. Organisation-scoped partial uniqueness works', () => {
  it('rejects a duplicate (tenant_membership_id, role_code, scope_organisation_id) at organisation scope', async () => {
    const user = await createUser('chk24@example.invalid', 'User 24');
    const tenant = await createTenant('tenant-24.invalid', 'Tenant 24');
    const membership = await createMembership(tenant.id, user.id);
    const org = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-24', displayName: 'Org 24' },
    });
    insertRoleAssignmentRowDirectly({
      id: '11111111-1111-1111-1111-111111111124',
      tenantMembershipId: membership.id,
      tenantId: tenant.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: org.id,
      scopeFacilityId: null,
    });
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-11111111112c', '${membership.id}', '${tenant.id}', 'R09_ADMINISTRATOR', 'organisation', '${org.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain('tenant_role_assignments_organisation_scope_uniq');
  });
});

describe('25. Facility-scoped partial uniqueness works', () => {
  it('rejects a duplicate (tenant_membership_id, role_code, scope_organisation_id, scope_facility_id) at facility scope', async () => {
    const user = await createUser('chk25@example.invalid', 'User 25');
    const tenant = await createTenant('tenant-25.invalid', 'Tenant 25');
    const membership = await createMembership(tenant.id, user.id);
    const org = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-25', displayName: 'Org 25' },
    });
    const fac = await prisma.facility.create({
      data: {
        tenantId: tenant.id,
        organisationId: org.id,
        code: 'fac-25',
        displayName: 'Fac 25',
      },
    });
    insertRoleAssignmentRowDirectly({
      id: '11111111-1111-1111-1111-111111111125',
      tenantMembershipId: membership.id,
      tenantId: tenant.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'facility',
      scopeOrganisationId: org.id,
      scopeFacilityId: fac.id,
    });
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, scope_facility_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-11111111112d', '${membership.id}', '${tenant.id}', 'R09_ADMINISTRATOR', 'facility', '${org.id}', '${fac.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain('tenant_role_assignments_facility_scope_uniq');
  });
});

describe('26. Membership and assignment tenant IDs must match (composite FK)', () => {
  it('rejects an assignment whose tenant_id differs from the membership tenant_id', async () => {
    const user = await createUser('chk26@example.invalid', 'User 26');
    const tenantA = await createTenant('tenant-26a.invalid', 'Tenant 26A');
    const tenantB = await createTenant('tenant-26b.invalid', 'Tenant 26B');
    const membershipA = await createMembership(tenantA.id, user.id);
    // Try to insert an assignment referencing membershipA but with
    // tenantB.id as the tenant_id. The composite FK
    // (tenant_membership_id, tenant_id) -> tenant_memberships(id, tenant_id)
    // must reject.
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111126', '${membershipA.id}', '${tenantB.id}', 'R13_SYSTEM_ADMINISTRATOR', 'tenant', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain('tenant_role_assignments_membership_tenant_id_fkey');
  });
});

describe('27. Organisation assignments cannot reference another tenant (composite FK)', () => {
  it('rejects an organisation-scoped assignment whose scope_organisation_id belongs to a different tenant than the assignment tenant_id', async () => {
    const user = await createUser('chk27@example.invalid', 'User 27');
    const tenantA = await createTenant('tenant-27a.invalid', 'Tenant 27A');
    const tenantB = await createTenant('tenant-27b.invalid', 'Tenant 27B');
    const membershipA = await createMembership(tenantA.id, user.id);
    const orgB = await prisma.organisation.create({
      data: { tenantId: tenantB.id, code: 'org-b-27', displayName: 'Org B 27' },
    });
    // Assignment tenant_id = tenantA, but scope_organisation_id = orgB
    // (which belongs to tenantB). The composite FK
    // (tenant_id, scope_organisation_id) -> organisations(tenant_id, id)
    // must reject.
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111127', '${membershipA.id}', '${tenantA.id}', 'R09_ADMINISTRATOR', 'organisation', '${orgB.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'tenant_role_assignments_tenant_organisation_id_fkey',
    );
  });
});

describe('28. Facility assignments cannot reference another tenant (composite FK)', () => {
  it('rejects a facility-scoped assignment whose scope_facility_id belongs to a different tenant', async () => {
    const user = await createUser('chk28@example.invalid', 'User 28');
    const tenantA = await createTenant('tenant-28a.invalid', 'Tenant 28A');
    const tenantB = await createTenant('tenant-28b.invalid', 'Tenant 28B');
    const membershipA = await createMembership(tenantA.id, user.id);
    const orgA = await prisma.organisation.create({
      data: { tenantId: tenantA.id, code: 'org-a-28', displayName: 'Org A 28' },
    });
    const orgB = await prisma.organisation.create({
      data: { tenantId: tenantB.id, code: 'org-b-28', displayName: 'Org B 28' },
    });
    const facB = await prisma.facility.create({
      data: {
        tenantId: tenantB.id,
        organisationId: orgB.id,
        code: 'fac-b-28',
        displayName: 'Fac B 28',
      },
    });
    // Assignment tenant_id = tenantA, scope_organisation_id = orgA
    // (mismatched pairing to defeat the org FK check), but
    // scope_facility_id = facB (belongs to tenantB). The composite FK
    // (tenant_id, scope_organisation_id, scope_facility_id)
    // -> facilities(tenant_id, organisation_id, id) must reject
    // because facB belongs to (tenantB, orgB), not (tenantA, orgA).
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, scope_facility_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111128', '${membershipA.id}', '${tenantA.id}', 'R09_ADMINISTRATOR', 'facility', '${orgA.id}', '${facB.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'tenant_role_assignments_tenant_organisation_facility_id_fkey',
    );
  });
});

describe('29. A facility cannot be paired with the wrong organisation (composite FK)', () => {
  it('rejects a facility-scoped assignment where scope_facility_id belongs to a different organisation than scope_organisation_id', async () => {
    const user = await createUser('chk29@example.invalid', 'User 29');
    const tenant = await createTenant('tenant-29.invalid', 'Tenant 29');
    const membership = await createMembership(tenant.id, user.id);
    const orgA = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-a-29', displayName: 'Org A 29' },
    });
    const orgB = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-b-29', displayName: 'Org B 29' },
    });
    const facB = await prisma.facility.create({
      data: {
        tenantId: tenant.id,
        organisationId: orgB.id,
        code: 'fac-b-29',
        displayName: 'Fac B 29',
      },
    });
    // Assignment says facility=facB but organisation=orgA. facB
    // belongs to orgB, not orgA. The composite FK
    // (tenant_id, scope_organisation_id, scope_facility_id)
    // -> facilities(tenant_id, organisation_id, id) must reject.
    const sql = `INSERT INTO tenant_role_assignments (id, tenant_membership_id, tenant_id, role_code, scope_level, scope_organisation_id, scope_facility_id, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111129', '${membership.id}', '${tenant.id}', 'R09_ADMINISTRATOR', 'facility', '${orgA.id}', '${facB.id}', NOW(), NOW());`;
    const err = runSqlExpectError(sql);
    expect(err).not.toBeNull();
    expect(err).toContain(
      'tenant_role_assignments_tenant_organisation_facility_id_fkey',
    );
  });
});

describe('30. Active-context foreign keys use RESTRICT behaviour', () => {
  it('deleting an organisation referenced by an active session is rejected', async () => {
    const user = await createUser('chk30@example.invalid', 'User 30');
    const tenant = await createTenant('tenant-30.invalid', 'Tenant 30');
    const membership = await createMembership(tenant.id, user.id);
    const org = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-30', displayName: 'Org 30' },
    });
    await prisma.authSession.create({
      data: {
        id: '11111111-1111-1111-1111-111111111130',
        userId: user.id,
        tokenHash: 'c'.repeat(64),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
        rotatedAt: new Date(),
        activeTenantMembershipId: membership.id,
        activeOrganisationId: org.id,
      },
    });
    const err = runSqlExpectError(
      `DELETE FROM organisations WHERE id = '${org.id}';`,
    );
    expect(err).not.toBeNull();
    expect(err).toContain('auth_sessions_active_organisation_id_fkey');
  });

  it('deleting a facility referenced by an active session is rejected', async () => {
    const user = await createUser('chk30b@example.invalid', 'User 30b');
    const tenant = await createTenant('tenant-30b.invalid', 'Tenant 30b');
    const membership = await createMembership(tenant.id, user.id);
    const org = await prisma.organisation.create({
      data: { tenantId: tenant.id, code: 'org-30b', displayName: 'Org 30b' },
    });
    const fac = await prisma.facility.create({
      data: {
        tenantId: tenant.id,
        organisationId: org.id,
        code: 'fac-30b',
        displayName: 'Fac 30b',
      },
    });
    await prisma.authSession.create({
      data: {
        id: '11111111-1111-1111-1111-11111111113b',
        userId: user.id,
        tokenHash: 'd'.repeat(64),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
        rotatedAt: new Date(),
        activeTenantMembershipId: membership.id,
        activeOrganisationId: org.id,
        activeFacilityId: fac.id,
      },
    });
    const err = runSqlExpectError(
      `DELETE FROM facilities WHERE id = '${fac.id}';`,
    );
    expect(err).not.toBeNull();
    expect(err).toContain('auth_sessions_active_facility_id_fkey');
  });
});

describe('31-34. Migration backfill verification', () => {
  // The migration-upgrade test (describe 35 below) verifies the
  // backfill invariants end-to-end. The four assertions here are
  // minimal smoke checks against the current schema; the
  // migration-upgrade test is the authoritative verification.

  it('31. existing assignments have tenant_id populated (smoke check)', async () => {
    const user = await createUser('chk31@example.invalid', 'User 31');
    const tenant = await createTenant('tenant-31.invalid', 'Tenant 31');
    const membership = await createMembership(tenant.id, user.id);
    insertRoleAssignmentRowDirectly({
      id: '11111111-1111-1111-1111-111111111131',
      tenantMembershipId: membership.id,
      tenantId: tenant.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
      scopeOrganisationId: null,
      scopeFacilityId: null,
    });
    const result = runSql(
      `SELECT tenant_id FROM tenant_role_assignments WHERE id = '11111111-1111-1111-1111-111111111131';`,
    );
    expect(result.trim()).toBe(tenant.id);
  });

  it('32. existing assignments have scope_level = tenant (smoke check)', () => {
    const result = runSql(
      `SELECT scope_level FROM tenant_role_assignments WHERE id = '11111111-1111-1111-1111-111111111131';`,
    );
    expect(result.trim()).toBe('tenant');
  });

  it('33. existing role codes survive migration (smoke check)', () => {
    const result = runSql(
      `SELECT role_code FROM tenant_role_assignments WHERE id = '11111111-1111-1111-1111-111111111131';`,
    );
    expect(result.trim()).toBe('R13_SYSTEM_ADMINISTRATOR');
  });

  it('34. existing membership associations survive migration (smoke check)', async () => {
    const user = await createUser('chk34@example.invalid', 'User 34');
    const tenant = await createTenant('tenant-34.invalid', 'Tenant 34');
    const membership = await createMembership(tenant.id, user.id);
    insertRoleAssignmentRowDirectly({
      id: '11111111-1111-1111-1111-111111111134',
      tenantMembershipId: membership.id,
      tenantId: tenant.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'tenant',
      scopeOrganisationId: null,
      scopeFacilityId: null,
    });
    const result = runSql(
      `SELECT tenant_membership_id FROM tenant_role_assignments WHERE id = '11111111-1111-1111-1111-111111111134';`,
    );
    expect(result.trim()).toBe(membership.id);
  });
});

describe('35. Genuine migration-upgrade test (disposable PostgreSQL harness)', () => {
  // This test exercises the ADR-015 migration's backfill behaviour
  // against a real pre-ADR-015 database state. It does NOT run
  // against the already-migrated shared cluster; it boots a second
  // disposable PostgreSQL 17 cluster via
  // `startMigrationUpgradeCluster()`, applies ONLY the pre-ADR-015
  // migrations to it, inserts a pre-ADR-015 tenant_role_assignments
  // row (whose shape is exactly what the
  // 20260719110000_rbac_authorization_foundation migration created:
  // id, tenant_membership_id, role_code, created_at, updated_at —
  // NO tenant_id, scope_level, scope_organisation_id, or
  // scope_facility_id columns), verifies those columns are absent,
  // then exposes and applies the ADR-015 migration, and verifies
  // the row was backfilled correctly.
  //
  // The test cannot pass without applying the ADR-015 migration:
  // the post-migration assertions query columns that exist only
  // after the migration has run. The pre-migration assertions
  // query information_schema for columns that must NOT exist
  // before the migration runs. The test queries the SAME row id
  // before and after migration, preserving the original IDs and
  // role code across the upgrade.
  //
  // The cluster is completely isolated from the shared disposable
  // cluster: its own port, data directory, and migrations
  // directory. The shared DATABASE_URL env var is NOT mutated;
  // the upgrade cluster's URL is exposed only on the handle and
  // passed explicitly to the spawned prisma process via
  // UPGRADE_DATABASE_URL.
  //
  // PostgreSQL 17 being unavailable in the current environment
  // causes this test to fail at runtime (the harness throws when
  // initdb/pg_ctl/psql cannot be discovered). The test is still
  // discovered by vitest, and the failure surfaces as a single
  // clear error rather than a silent skip.

  it('backfills a pre-ADR-015 row with derived tenant_id and tenant scope on ADR-015 migration', async () => {
    // Deterministic IDs for the pre-ADR-015 row and its
    // dependencies. These IDs are stable across the migration
    // boundary; the test verifies they are unchanged.
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
    const userId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
    const membershipId = 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
    const assignmentId = 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
    const roleCode = 'R09_ADMINISTRATOR';

    let upgrade: MigrationUpgradeHandle | null = null;
    try {
      upgrade = await startMigrationUpgradeCluster();

      // 1. Apply every pre-ADR-015 migration. After this call the
      //    upgrade cluster has the schema shape that existed
      //    immediately before ADR-015 was applied.
      upgrade.applyPreAdr015Migrations();

      // Helper: run a SQL statement against the upgrade cluster.
      const runUpgradeSql = (sql: string): string =>
        execFileSync(
          upgrade!.psqlBin,
          [
            upgrade!.databaseUrl,
            '-t',
            '-A',
            '-v',
            'ON_ERROR_STOP=1',
            '-c',
            sql,
          ],
          { encoding: 'utf-8' },
        );

      // 2. Insert the pre-ADR-015 dependency rows: tenant, user,
      //    tenant_membership. The shapes match the
      //    20260718170628_tenancy_foundation and
      //    20260718194955_identity_session_foundation migrations.
      runUpgradeSql(
        `INSERT INTO tenants (id, slug, display_name, status, created_at, updated_at) ` +
          `VALUES ('${tenantId}', 'upgrade-tenant', 'Upgrade Tenant', 'active', NOW(), NOW());`,
      );
      runUpgradeSql(
        `INSERT INTO users (id, email, normalised_email, display_name, status, created_at, updated_at) ` +
          `VALUES ('${userId}', 'upgrade@example.invalid', 'upgrade@example.invalid', 'Upgrade User', 'active', NOW(), NOW());`,
      );
      runUpgradeSql(
        `INSERT INTO tenant_memberships (id, tenant_id, user_id, status, created_at, updated_at) ` +
          `VALUES ('${membershipId}', '${tenantId}', '${userId}', 'active', NOW(), NOW());`,
      );

      // 3. Insert the pre-ADR-015 tenant_role_assignments row.
      //    This is the OLD table shape: only id,
      //    tenant_membership_id, role_code, created_at,
      //    updated_at. No tenant_id, no scope_level, no
      //    scope_organisation_id, no scope_facility_id.
      runUpgradeSql(
        `INSERT INTO tenant_role_assignments (id, tenant_membership_id, role_code, created_at, updated_at) ` +
          `VALUES ('${assignmentId}', '${membershipId}', '${roleCode}', NOW(), NOW());`,
      );

      // 4. Confirm that the ADR-015 columns do NOT yet exist on
      //    tenant_role_assignments. information_schema.columns
      //    must return zero rows for each of the four new
      //    columns. This is the structural pre-condition that
      //    proves the test is exercising the upgrade path, not
      //    an already-migrated schema.
      const preColumns = runUpgradeSql(
        `SELECT column_name FROM information_schema.columns ` +
          `WHERE table_name = 'tenant_role_assignments' ` +
          `AND column_name IN ('tenant_id', 'scope_level', 'scope_organisation_id', 'scope_facility_id') ` +
          `ORDER BY column_name;`,
      );
      expect(preColumns.trim()).toBe('');

      // 5. Expose the ADR-015 migration into the isolated
      //    migrations directory.
      upgrade.exposeAdr015Migration();

      // 6. Apply the ADR-015 migration to the populated cluster.
      //    Prisma migrate deploy will run the ADR-015 migration
      //    as the only pending migration; the pre-ADR-015
      //    migrations are already recorded as applied in the
      //    cluster's _prisma_migrations table.
      upgrade.applyAdr015Migration();

      // 7. Verify the previously-inserted row was backfilled
      //    correctly. We query the SAME row id that was inserted
      //    before the migration; the IDs and role_code must be
      //    unchanged.
      const postRow = runUpgradeSql(
        `SELECT tenant_id, scope_level, scope_organisation_id, scope_facility_id, role_code, tenant_membership_id ` +
          `FROM tenant_role_assignments WHERE id = '${assignmentId}';`,
      );
      const parts = postRow.split('|').map((s) => s.trim());
      expect(parts[0]).toBe(tenantId); // tenant_id derived from membership
      expect(parts[1]).toBe('tenant'); // scope_level = 'tenant'
      expect(parts[2]).toBe(''); // scope_organisation_id NULL
      expect(parts[3]).toBe(''); // scope_facility_id NULL
      expect(parts[4]).toBe(roleCode); // role_code unchanged
      expect(parts[5]).toBe(membershipId); // tenant_membership_id unchanged

      // 8. Verify the new CHECK constraints exist on
      //    tenant_role_assignments.
      const checkConstraints = runUpgradeSql(
        `SELECT con.conname ` +
          `FROM pg_constraint con ` +
          `JOIN pg_class cls ON cls.oid = con.conrelid ` +
          `WHERE cls.relname = 'tenant_role_assignments' ` +
          `AND con.contype = 'c' ` +
          `AND con.conname IN (` +
          `'tenant_role_assignments_scope_level_check', ` +
          `'tenant_role_assignments_scope_target_consistency_check'` +
          `) ORDER BY con.conname;`,
      );
      const checkNames = checkConstraints
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(checkNames).toEqual([
        'tenant_role_assignments_scope_level_check',
        'tenant_role_assignments_scope_target_consistency_check',
      ]);

      // 9. Verify the three partial unique indexes exist.
      const partialIndexes = runUpgradeSql(
        `SELECT indexname FROM pg_indexes ` +
          `WHERE tablename = 'tenant_role_assignments' ` +
          `AND indexname IN (` +
          `'tenant_role_assignments_tenant_scope_uniq', ` +
          `'tenant_role_assignments_organisation_scope_uniq', ` +
          `'tenant_role_assignments_facility_scope_uniq'` +
          `) ORDER BY indexname;`,
      );
      const indexNames = partialIndexes
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(indexNames).toEqual([
        'tenant_role_assignments_facility_scope_uniq',
        'tenant_role_assignments_organisation_scope_uniq',
        'tenant_role_assignments_tenant_scope_uniq',
      ]);

      // 10. Verify the three composite foreign keys exist on
      //     tenant_role_assignments.
      const compositeFks = runUpgradeSql(
        `SELECT con.conname ` +
          `FROM pg_constraint con ` +
          `JOIN pg_class cls ON cls.oid = con.conrelid ` +
          `WHERE cls.relname = 'tenant_role_assignments' ` +
          `AND con.contype = 'f' ` +
          `AND con.conname IN (` +
          `'tenant_role_assignments_membership_tenant_id_fkey', ` +
          `'tenant_role_assignments_tenant_organisation_id_fkey', ` +
          `'tenant_role_assignments_tenant_organisation_facility_id_fkey'` +
          `) ORDER BY con.conname;`,
      );
      const fkNames = compositeFks
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(fkNames).toEqual([
        'tenant_role_assignments_membership_tenant_id_fkey',
        'tenant_role_assignments_tenant_organisation_facility_id_fkey',
        'tenant_role_assignments_tenant_organisation_id_fkey',
      ]);

      // 11. Verify the supporting composite unique constraints
      //     required by the composite FKs exist on
      //     tenant_memberships and facilities.
      const membershipUniq = runUpgradeSql(
        `SELECT indexname FROM pg_indexes ` +
          `WHERE tablename = 'tenant_memberships' ` +
          `AND indexname = 'tenant_memberships_id_tenant_id_key';`,
      );
      expect(membershipUniq.trim()).toBe('tenant_memberships_id_tenant_id_key');

      const facilitiesUniq = runUpgradeSql(
        `SELECT indexname FROM pg_indexes ` +
          `WHERE tablename = 'facilities' ` +
          `AND indexname IN (` +
          `'facilities_tenant_id_organisation_id_id_key', ` +
          `'facilities_id_organisation_id_key'` +
          `) ORDER BY indexname;`,
      );
      const facilityIndexNames = facilitiesUniq
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(facilityIndexNames).toEqual([
        'facilities_id_organisation_id_key',
        'facilities_tenant_id_organisation_id_id_key',
      ]);
    } finally {
      // Always tear down the upgrade cluster, even on assertion
      // failure. The shared disposable cluster is unaffected.
      if (upgrade) {
        upgrade.teardown();
      }
    }
  });
});
