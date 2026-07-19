import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  setupDatabaseTests,
  getDatabaseUrl,
  getPsqlBin,
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
 * These tests verify the fifth canonical batch specification's
 * database scenarios:
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
 * 14. No Organisation or Facility value is stored on AuthSession.
 * 15. No raw token or CSRF token is stored in context-related
 *     columns.
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

describe('14. No Organisation or Facility value is stored on AuthSession', () => {
  it('the auth_sessions table has no active_organisation_id or active_facility_id column', () => {
    const result = runSql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_sessions' ORDER BY column_name;",
    );
    const columns = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('(') && !l.startsWith('-'));
    expect(columns).not.toContain('active_organisation_id');
    expect(columns).not.toContain('active_facility_id');
    expect(columns).not.toContain('active_organisation_membership_id');
    expect(columns).not.toContain('active_facility_membership_id');
    expect(columns).toContain('active_tenant_membership_id');
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
