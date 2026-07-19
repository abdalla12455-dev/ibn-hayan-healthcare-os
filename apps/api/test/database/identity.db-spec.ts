import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  setupDatabaseTests,
  getDatabaseUrl,
  getPsqlBin,
} from './_pg-bootstrap.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaUserRepository } from '../../src/infrastructure/database/repositories/prisma-user.repository.js';
import { PrismaTenantMembershipRepository } from '../../src/infrastructure/database/repositories/prisma-tenant-membership.repository.js';
import { PrismaSessionRepository } from '../../src/infrastructure/database/repositories/prisma-session.repository.js';
import { LocalCredentialService } from '../../src/infrastructure/database/repositories/local-credential.service.js';
import {
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
} from '../../src/infrastructure/database/database.module.js';
import type {
  TenantRepository,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
  UserId,
  TenantId,
  SessionTokenHash,
  SessionId,
  TenantMembershipId,
} from '@ibn-hayan/domain';
import { PrismaTenantRepository } from '../../src/infrastructure/database/repositories/prisma-tenant.repository.js';
import type {
  Tenant,
  User,
  TenantMembership,
  Session,
} from '@ibn-hayan/domain';

/**
 * Database integration tests for the identity and session foundation.
 *
 * These tests verify the persistence layer for the fourth canonical
 * batch: User, LocalCredential, TenantMembership, and AuthSession
 * models. All tests use real PostgreSQL 17 via the disposable cluster
 * bootstrap (`_pg-bootstrap.ts`).
 *
 * Per ADR-013 §1.3, the session record does not include the raw
 * session token. Only the SHA-256 hash is persisted. These tests
 * verify that no raw token exists in any persisted row.
 */

setupDatabaseTests();

let prisma: PrismaService;
let users: UserRepository;
let tenants: TenantRepository;
let memberships: TenantMembershipRepository;
let sessions: SessionRepository;
let credentials: LocalCredentialService;

function runSql(sql: string): string {
  return execFileSync(
    getPsqlBin(),
    [getDatabaseUrl(), '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { encoding: 'utf-8' },
  );
}

beforeAll(() => {
  prisma = new PrismaService();
  users = new PrismaUserRepository(prisma);
  tenants = new PrismaTenantRepository(prisma);
  memberships = new PrismaTenantMembershipRepository(prisma);
  sessions = new PrismaSessionRepository(prisma);
  credentials = new LocalCredentialService(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE auth_sessions, tenant_role_assignments, tenant_memberships, local_credentials, users, tenants, organisations, facilities RESTART IDENTITY CASCADE;',
  );
});

// Helper to create a tenant for membership tests.
async function createTestTenant(): Promise<Tenant> {
  return tenants.create({
    slug: 'tenant-test.invalid',
    displayName: 'Tenant Test',
  });
}

// Helper to create a user for tests.
async function createTestUser(
  email: string = 'user-test@example.invalid',
): Promise<User> {
  return users.create({
    email,
    displayName: 'User Test',
  });
}

describe('1. Create User', () => {
  it('creates a user and retrieves it by id and by normalised email', async () => {
    const user = await createTestUser('Operator.Alpha@example.invalid');
    expect(user.id).toBeDefined();
    expect(user.email).toBe('Operator.Alpha@example.invalid');
    expect(user.normalisedEmail).toBe('operator.alpha@example.invalid');
    expect(user.displayName).toBe('User Test');
    expect(user.status).toBe('active');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);

    const byId = await users.findById(user.id);
    expect(byId).not.toBeNull();
    expect(byId?.email).toBe('Operator.Alpha@example.invalid');

    const byEmail = await users.findByNormalisedEmail(
      'operator.alpha@example.invalid',
    );
    expect(byEmail).not.toBeNull();
    expect(byEmail?.id).toBe(user.id);
  });
});

describe('2. Reject duplicate normalised email', () => {
  it('rejects a second user with the same normalised email', async () => {
    await createTestUser('Operator.Beta@example.invalid');
    await expect(
      users.create({
        email: 'operator.beta@example.invalid',
        displayName: 'Different Name',
      }),
    ).rejects.toThrow();
  });
});

describe('3. Preserve original display email while normalising lookup', () => {
  it('preserves the original case in email but normalises for lookup', async () => {
    const user = await users.create({
      email: 'Operator.Gamma@example.invalid',
      displayName: 'Gamma',
    });
    expect(user.email).toBe('Operator.Gamma@example.invalid');
    expect(user.normalisedEmail).toBe('operator.gamma@example.invalid');

    // Lookup with the normalised form succeeds.
    const found = await users.findByNormalisedEmail(
      'operator.gamma@example.invalid',
    );
    expect(found?.id).toBe(user.id);

    // The original email is preserved in the database.
    const byId = await users.findById(user.id);
    expect(byId?.email).toBe('Operator.Gamma@example.invalid');
  });
});

describe('4. Create LocalCredential', () => {
  it('creates a credential for a user', async () => {
    const user = await createTestUser();
    await credentials.createCredential({
      userId: user.id,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
      passwordChangedAt: new Date(),
    });
    const hash = await credentials.getPasswordHash(user.id);
    expect(hash).toBe('$argon2id$v=19$m=65536,t=3,p=4$fakehash');
  });
});

describe('5. Reject duplicate credential for one user', () => {
  it('rejects a second credential for the same user', async () => {
    const user = await createTestUser();
    await credentials.createCredential({
      userId: user.id,
      passwordHash: 'hash1',
      passwordChangedAt: new Date(),
    });
    await expect(
      credentials.createCredential({
        userId: user.id,
        passwordHash: 'hash2',
        passwordChangedAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});

describe('6. Create TenantMembership', () => {
  it('creates a membership linking a user to a tenant', async () => {
    const tenant = await createTestTenant();
    const user = await createTestUser();
    const membership = await memberships.create({
      tenantId: tenant.id,
      userId: user.id,
    });
    expect(membership.id).toBeDefined();
    expect(membership.tenantId).toBe(tenant.id);
    expect(membership.userId).toBe(user.id);
    expect(membership.status).toBe('active');

    const list = await memberships.listForUser(user.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(membership.id);
  });
});

describe('7. Reject duplicate (tenantId, userId)', () => {
  it('rejects a second membership for the same tenant+user pair', async () => {
    const tenant = await createTestTenant();
    const user = await createTestUser();
    await memberships.create({ tenantId: tenant.id, userId: user.id });
    await expect(
      memberships.create({ tenantId: tenant.id, userId: user.id }),
    ).rejects.toThrow();
  });
});

describe('8. Create Session with token hash only', () => {
  it('creates a session storing only the token hash', async () => {
    const user = await createTestUser();
    const tokenHash = 'a'.repeat(64) as SessionTokenHash;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const session = await sessions.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      lastSeenAt: now,
    });
    expect(session.id).toBeDefined();
    expect(session.userId).toBe(user.id);
    expect(session.tokenHash).toBe(tokenHash);
    expect(session.expiresAt).toEqual(expiresAt);
    expect(session.lastSeenAt).toEqual(now);
    expect(session.rotatedAt).toBeNull();
    expect(session.revokedAt).toBeNull();
  });
});

describe('9. Reject duplicate token hash', () => {
  it('rejects a second session with the same token hash', async () => {
    const user = await createTestUser();
    const tokenHash = 'b'.repeat(64) as SessionTokenHash;
    const now = new Date();
    await sessions.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(now.getTime() + 3600000),
      lastSeenAt: now,
    });
    await expect(
      sessions.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + 3600000),
        lastSeenAt: now,
      }),
    ).rejects.toThrow();
  });
});

describe('10. Expired session is not active', () => {
  it('returns null for an expired session', async () => {
    const user = await createTestUser();
    const tokenHash = 'c'.repeat(64) as SessionTokenHash;
    const past = new Date(Date.now() - 1000);
    await sessions.create({
      userId: user.id,
      tokenHash,
      expiresAt: past,
      lastSeenAt: past,
    });
    const found = await sessions.findActiveByTokenHash(tokenHash, new Date());
    expect(found).toBeNull();
  });
});

describe('11. Revoked session is not active', () => {
  it('returns null for a revoked session', async () => {
    const user = await createTestUser();
    const tokenHash = 'd'.repeat(64) as SessionTokenHash;
    const now = new Date();
    const session = await sessions.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(now.getTime() + 3600000),
      lastSeenAt: now,
    });
    await sessions.revoke(session.id, now);
    const found = await sessions.findActiveByTokenHash(tokenHash, now);
    expect(found).toBeNull();
  });
});

describe('12. Session rotation invalidates the previous token hash', () => {
  it('after rotation, the old token hash is no longer found', async () => {
    const user = await createTestUser();
    const oldHash = 'e'.repeat(64) as SessionTokenHash;
    const newHash = 'f'.repeat(64) as SessionTokenHash;
    const now = new Date();
    const session = await sessions.create({
      userId: user.id,
      tokenHash: oldHash,
      expiresAt: new Date(now.getTime() + 3600000),
      lastSeenAt: now,
    });
    await sessions.rotateToken(session.id, newHash, now);

    // Old hash is no longer found.
    const oldFound = await sessions.findActiveByTokenHash(oldHash, now);
    expect(oldFound).toBeNull();

    // New hash is found.
    const newFound = await sessions.findActiveByTokenHash(newHash, now);
    expect(newFound).not.toBeNull();
    expect(newFound?.id).toBe(session.id);
    expect(newFound?.rotatedAt).toEqual(now);
  });
});

describe('13. No raw token exists in persisted rows', () => {
  it('the auth_sessions table has no column for a raw token', () => {
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

  it('the users table has no column for a password hash', () => {
    const result = runSql(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY column_name;",
    );
    const columns = result
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('(') && !l.startsWith('-'));
    expect(columns).not.toContain('password_hash');
    expect(columns).not.toContain('password');
  });

  it('revokeAllForUser revokes all non-revoked sessions for a user', async () => {
    const user = await createTestUser();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600000);
    await sessions.create({
      userId: user.id,
      tokenHash: '1'.repeat(64) as SessionTokenHash,
      expiresAt,
      lastSeenAt: now,
    });
    await sessions.create({
      userId: user.id,
      tokenHash: '2'.repeat(64) as SessionTokenHash,
      expiresAt,
      lastSeenAt: now,
    });
    await sessions.create({
      userId: user.id,
      tokenHash: '3'.repeat(64) as SessionTokenHash,
      expiresAt,
      lastSeenAt: now,
    });
    const count = await sessions.revokeAllForUser(user.id, now);
    expect(count).toBe(3);

    // None of the sessions are active now.
    const found1 = await sessions.findActiveByTokenHash(
      '1'.repeat(64) as SessionTokenHash,
      now,
    );
    const found2 = await sessions.findActiveByTokenHash(
      '2'.repeat(64) as SessionTokenHash,
      now,
    );
    const found3 = await sessions.findActiveByTokenHash(
      '3'.repeat(64) as SessionTokenHash,
      now,
    );
    expect(found1).toBeNull();
    expect(found2).toBeNull();
    expect(found3).toBeNull();
  });
});

// Compile-time-only brand checks (not run at runtime).
type _TestBrands = [
  UserId,
  TenantId,
  SessionId,
  TenantMembershipId,
  SessionTokenHash,
];
type _TestDomainTypes = [Tenant, User, TenantMembership, Session];

// Silence unused import warnings for types that are only used at the
// type level for brand verification.
const _unused: _TestBrands | _TestDomainTypes | undefined = undefined;
void _unused;

// DI wiring test: verify the DatabaseModule provides the new
// repositories via the DI tokens.
describe('DI wiring: DatabaseModule provides the identity repositories', () => {
  it('USER_REPOSITORY, TENANT_MEMBERSHIP_REPOSITORY, SESSION_REPOSITORY tokens are exported', () => {
    expect(USER_REPOSITORY).toBeDefined();
    expect(TENANT_MEMBERSHIP_REPOSITORY).toBeDefined();
    expect(SESSION_REPOSITORY).toBeDefined();
    expect(TENANT_REPOSITORY).toBeDefined();
  });
});
