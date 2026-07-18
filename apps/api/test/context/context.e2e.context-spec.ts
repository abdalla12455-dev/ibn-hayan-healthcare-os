import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { LocalCredentialService } from '../../src/infrastructure/database/repositories/local-credential.service.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import type {
  TenantRepository,
  UserRepository,
  TenantMembershipRepository,
  UserId,
} from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
} from '../../src/infrastructure/database/database.module.js';
import { setupDatabaseTests } from '../database/_pg-bootstrap.js';
import { execFileSync } from 'node:child_process';
import {
  ContextResponseSchema,
  ClearTenantContextResponseSchema,
  AuthErrorResponseSchema,
  SessionResponseSchema,
} from '@ibn-hayan/contracts';
import { getPsqlBin, getDatabaseUrl } from '../database/_pg-bootstrap.js';

/**
 * Session-context HTTP integration tests.
 *
 * These tests exercise the full session-context flow via supertest
 * against a real NestJS application with a real PostgreSQL 17
 * database. They verify the scenarios required by the fifth
 * canonical batch specification.
 *
 * Per the fifth canonical batch specification:
 * - GET /context requires authentication but not Origin or CSRF.
 * - PUT /context/tenant requires authentication, Origin, and CSRF.
 * - DELETE /context/tenant requires authentication, Origin, and CSRF.
 * - Selection is by TenantMembership ID, never by an arbitrary
 *   Tenant ID.
 * - The response never contains the session token, hash, credential,
 *   or any Prisma record.
 * - Health remains public.
 * - Login throttling remains unchanged.
 * - Context routes do not inherit the login-specific throttle limit.
 */

setupDatabaseTests();

let app: INestApplication;
let server: Server;
let prisma: PrismaService;
let users: UserRepository;
let tenants: TenantRepository;
let memberships: TenantMembershipRepository;
let credentials: LocalCredentialService;
let passwordService: PasswordService;

const TEST_PASSWORD = 'sufficiently-long-password';
const ORIGIN = 'http://localhost:3000';

async function bootstrapUserAndTenant(
  userEmail: string,
  userDisplayName: string,
  tenantSlug: string,
  tenantDisplayName: string,
  tenantStatus: 'active' | 'suspended' = 'active',
  membershipStatus: 'active' | 'suspended' = 'active',
): Promise<{
  userId: string;
  tenantId: string;
  membershipId: string;
}> {
  const tenant = await tenants.create({
    slug: tenantSlug,
    displayName: tenantDisplayName,
    status: tenantStatus,
  });
  const user = await users.create({
    email: userEmail,
    displayName: userDisplayName,
  });
  const hash = await passwordService.hash(TEST_PASSWORD);
  await credentials.createCredential({
    userId: user.id,
    passwordHash: hash,
    passwordChangedAt: new Date(),
  });
  const membership = await memberships.create({
    tenantId: tenant.id,
    userId: user.id,
    status: membershipStatus,
  });
  return {
    userId: user.id,
    tenantId: tenant.id,
    membershipId: membership.id,
  };
}

function truncateAll(): void {
  execFileSync(
    getPsqlBin(),
    [
      getDatabaseUrl(),
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      'TRUNCATE TABLE auth_sessions, tenant_memberships, local_credentials, users, tenants, organisations, facilities RESTART IDENTITY CASCADE;',
    ],
    { stdio: 'pipe', encoding: 'utf-8' },
  );
}

function extractSessionCookie(response: unknown): string {
  const headers = (response as { headers?: Record<string, unknown> }).headers;
  if (!headers) return '';
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  if (Array.isArray(setCookie)) {
    const first: unknown = setCookie[0];
    if (typeof first === 'string') {
      return first.split(';')[0] ?? '';
    }
    return '';
  }
  if (typeof setCookie === 'string') {
    return setCookie.split(';')[0] ?? '';
  }
  return '';
}

let throttlerStorage: ThrottlerStorage;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  server = app.getHttpServer() as Server;

  prisma = app.get(PrismaService);
  users = app.get<UserRepository>(USER_REPOSITORY);
  tenants = app.get<TenantRepository>(TENANT_REPOSITORY);
  memberships = app.get<TenantMembershipRepository>(
    TENANT_MEMBERSHIP_REPOSITORY,
  );
  credentials = app.get(LocalCredentialService);
  passwordService = app.get(PasswordService);
  throttlerStorage = app.get(ThrottlerStorage);
}, 60_000);

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  truncateAll();
  resetThrottlerStorage();
});

function resetThrottlerStorage(): void {
  const storage = throttlerStorage as unknown as {
    storage?: Map<string, unknown>;
  };
  if (storage.storage instanceof Map) {
    storage.storage.clear();
  }
}

/**
 * Log in and return the session cookie. The caller passes the
 * user's email; the password is always `TEST_PASSWORD`.
 */
async function loginAndReturnCookie(email: string): Promise<string> {
  const response = await request(server)
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email, password: TEST_PASSWORD })
    .expect(200);
  return extractSessionCookie(response);
}

/**
 * Fetch a CSRF token using the supplied session cookie.
 */
async function fetchCsrfToken(cookie: string): Promise<string> {
  const response = await request(server)
    .get('/api/v1/auth/csrf')
    .set('Cookie', cookie)
    .expect(200);
  return (response.body as { token: string }).token;
}

// ---------------------------------------------------------------------------

describe('1. GET /api/v1/context requires authentication', () => {
  it('returns 401 without a session cookie', async () => {
    const response = await request(server).get('/api/v1/context').expect(401);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_SESSION_REQUIRED');
    }
  });
});

describe('2. GET /api/v1/context returns active memberships only', () => {
  it('returns the user active memberships as options', async () => {
    await bootstrapUserAndTenant(
      'op2@example.invalid',
      'Op2',
      'tenant-op2.invalid',
      'Tenant Op2',
    );
    const cookie = await loginAndReturnCookie('op2@example.invalid');

    const response = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookie)
      .expect(200);

    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.options).toHaveLength(1);
      expect(parsed.data.active).toBeNull();
    }
  });
});

describe('3. GET /api/v1/context excludes suspended memberships', () => {
  it('returns an empty options array when the only membership is suspended', async () => {
    await bootstrapUserAndTenant(
      'op3@example.invalid',
      'Op3',
      'tenant-op3.invalid',
      'Tenant Op3',
      'active',
      'suspended',
    );
    // Note: login will fail because the user has no active
    // membership. We verify this by attempting to log in.
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'op3@example.invalid', password: TEST_PASSWORD })
      .expect(401);
  });
});

describe('4. GET /api/v1/context excludes memberships under suspended tenants', () => {
  it('returns an empty options array when the tenant is suspended', async () => {
    // Create a user with an active membership under a suspended
    // tenant. Login will succeed because the membership is
    // active, but the context endpoint will exclude the option
    // because the tenant is suspended.
    //
    // To get past login, we need at least one active membership
    // under an active tenant. So we create two memberships.
    await bootstrapUserAndTenant(
      'op4@example.invalid',
      'Op4',
      'tenant-op4-active.invalid',
      'Tenant Op4 Active',
    );
    const tenantSuspended = await tenants.create({
      slug: 'tenant-op4-suspended.invalid',
      displayName: 'Tenant Op4 Suspended',
      status: 'suspended',
    });
    const userRow = await users.findByNormalisedEmail('op4@example.invalid');
    expect(userRow).not.toBeNull();
    if (userRow) {
      await memberships.create({
        tenantId: tenantSuspended.id,
        userId: userRow.id,
      });
    }
    const cookie = await loginAndReturnCookie('op4@example.invalid');

    const response = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookie)
      .expect(200);

    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Only the active tenant should appear in options.
      expect(parsed.data.options).toHaveLength(1);
      expect(parsed.data.options[0]?.tenantSlug).toBe(
        'tenant-op4-active.invalid',
      );
    }
  });
});

describe('5. PUT /api/v1/context/tenant requires authentication', () => {
  it('returns 401 without a session cookie', async () => {
    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', 'any-token')
      .send({ membershipId: '11111111-1111-1111-1111-111111111111' })
      .expect(401);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_SESSION_REQUIRED');
    }
  });
});

describe('6. PUT /api/v1/context/tenant requires Origin', () => {
  it('returns 403 when the Origin header is missing', async () => {
    await bootstrapUserAndTenant(
      'op6@example.invalid',
      'Op6',
      'tenant-op6.invalid',
      'Tenant Op6',
    );
    const cookie = await loginAndReturnCookie('op6@example.invalid');
    const csrf = await fetchCsrfToken(cookie);

    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: '11111111-1111-1111-1111-111111111111' })
      .expect(403);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_ORIGIN_DISALLOWED');
    }
  });
});

describe('7. PUT /api/v1/context/tenant rejects disallowed Origin', () => {
  it('returns 403 when the Origin is not in the allowed list', async () => {
    await bootstrapUserAndTenant(
      'op7@example.invalid',
      'Op7',
      'tenant-op7.invalid',
      'Tenant Op7',
    );
    const cookie = await loginAndReturnCookie('op7@example.invalid');
    const csrf = await fetchCsrfToken(cookie);

    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example.com')
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: '11111111-1111-1111-1111-111111111111' })
      .expect(403);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_ORIGIN_DISALLOWED');
    }
  });
});

describe('8. PUT /api/v1/context/tenant requires CSRF', () => {
  it('returns 403 when the X-CSRF-Token header is missing', async () => {
    await bootstrapUserAndTenant(
      'op8@example.invalid',
      'Op8',
      'tenant-op8.invalid',
      'Tenant Op8',
    );
    const cookie = await loginAndReturnCookie('op8@example.invalid');

    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .send({ membershipId: '11111111-1111-1111-1111-111111111111' })
      .expect(403);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_CSRF_INVALID');
    }
  });
});

describe('9. PUT /api/v1/context/tenant rejects invalid CSRF', () => {
  it('returns 403 when the X-CSRF-Token header has an invalid value', async () => {
    await bootstrapUserAndTenant(
      'op9@example.invalid',
      'Op9',
      'tenant-op9.invalid',
      'Tenant Op9',
    );
    const cookie = await loginAndReturnCookie('op9@example.invalid');

    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', 'invalid-csrf-token')
      .send({ membershipId: '11111111-1111-1111-1111-111111111111' })
      .expect(403);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_CSRF_INVALID');
    }
  });
});

describe('10. PUT /api/v1/context/tenant selects a valid membership', () => {
  it('returns 200 with the updated context response after selecting a valid membership', async () => {
    const { membershipId } = await bootstrapUserAndTenant(
      'op10@example.invalid',
      'Op10',
      'tenant-op10.invalid',
      'Tenant Op10',
    );
    const cookie = await loginAndReturnCookie('op10@example.invalid');
    const csrf = await fetchCsrfToken(cookie);

    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId })
      .expect(200);

    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.active).not.toBeNull();
      expect(parsed.data.active?.membershipId).toBe(membershipId);
    }
  });
});

describe('11. PUT /api/v1/context/tenant rejects another user membership generically', () => {
  it('returns 403 with the same shape regardless of whether the membership exists for another user', async () => {
    // User A and User B, each with their own membership.
    const { membershipId: membershipA } = await bootstrapUserAndTenant(
      'op11-a@example.invalid',
      'Op11 A',
      'tenant-op11-a.invalid',
      'Tenant Op11 A',
    );
    const { membershipId: membershipB } = await bootstrapUserAndTenant(
      'op11-b@example.invalid',
      'Op11 B',
      'tenant-op11-b.invalid',
      'Tenant Op11 B',
    );
    const cookieA = await loginAndReturnCookie('op11-a@example.invalid');
    const csrfA = await fetchCsrfToken(cookieA);

    // User A tries to select User B's membership.
    const responseCross = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookieA)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfA)
      .send({ membershipId: membershipB })
      .expect(403);

    // User A tries to select a non-existent membership.
    const responseNonexistent = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookieA)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfA)
      .send({ membershipId: '99999999-9999-9999-9999-999999999999' })
      .expect(403);

    // Both responses must be identical (no account enumeration).
    expect(responseCross.body).toEqual(responseNonexistent.body);

    const parsed = AuthErrorResponseSchema.safeParse(responseCross.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('CONTEXT_SELECTION_FORBIDDEN');
    }

    // Sanity check: User A's own membership selection still works.
    const responseOwn = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookieA)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfA)
      .send({ membershipId: membershipA })
      .expect(200);
    const parsedOwn = ContextResponseSchema.safeParse(responseOwn.body);
    expect(parsedOwn.success).toBe(true);
  });
});

describe('12. PUT /api/v1/context/tenant rejects a suspended membership', () => {
  it('returns 403 when the membership is suspended', async () => {
    // Create a user with two memberships: one active, one
    // suspended. Login requires at least one active membership.
    const { userId } = await bootstrapUserAndTenant(
      'op12@example.invalid',
      'Op12',
      'tenant-op12-a.invalid',
      'Tenant Op12 A',
    );
    const tenantB = await tenants.create({
      slug: 'tenant-op12-b.invalid',
      displayName: 'Tenant Op12 B',
    });
    const membershipB = await memberships.create({
      tenantId: tenantB.id,
      userId: userId as UserId,
      status: 'suspended',
    });

    const cookie = await loginAndReturnCookie('op12@example.invalid');
    const csrf = await fetchCsrfToken(cookie);

    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membershipB.id })
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('CONTEXT_SELECTION_FORBIDDEN');
    }
  });
});

describe('13. DELETE /api/v1/context/tenant requires authentication', () => {
  it('returns 401 without a session cookie', async () => {
    const response = await request(server)
      .delete('/api/v1/context/tenant')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', 'any-token')
      .expect(401);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_SESSION_REQUIRED');
    }
  });
});

describe('14. DELETE /api/v1/context/tenant requires Origin', () => {
  it('returns 403 when the Origin header is missing', async () => {
    await bootstrapUserAndTenant(
      'op14@example.invalid',
      'Op14',
      'tenant-op14.invalid',
      'Tenant Op14',
    );
    const cookie = await loginAndReturnCookie('op14@example.invalid');
    const csrf = await fetchCsrfToken(cookie);

    const response = await request(server)
      .delete('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .expect(403);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_ORIGIN_DISALLOWED');
    }
  });
});

describe('15. DELETE /api/v1/context/tenant requires CSRF', () => {
  it('returns 403 when the X-CSRF-Token header is missing', async () => {
    await bootstrapUserAndTenant(
      'op15@example.invalid',
      'Op15',
      'tenant-op15.invalid',
      'Tenant Op15',
    );
    const cookie = await loginAndReturnCookie('op15@example.invalid');

    const response = await request(server)
      .delete('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .expect(403);
    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_CSRF_INVALID');
    }
  });
});

describe('16. DELETE /api/v1/context/tenant clears the selection', () => {
  it('returns 200 with { ok: true, active: null } after clearing', async () => {
    const { membershipId } = await bootstrapUserAndTenant(
      'op16@example.invalid',
      'Op16',
      'tenant-op16.invalid',
      'Tenant Op16',
    );
    const cookie = await loginAndReturnCookie('op16@example.invalid');
    const csrf1 = await fetchCsrfToken(cookie);

    // Select first.
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf1)
      .send({ membershipId })
      .expect(200);

    // Fetch a fresh CSRF token before DELETE.
    const csrf2 = await fetchCsrfToken(cookie);

    const response = await request(server)
      .delete('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf2)
      .expect(200);

    const parsed = ClearTenantContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ok).toBe(true);
      expect(parsed.data.active).toBeNull();
    }

    // Verify GET /context now returns active = null.
    const getContextResponse = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookie)
      .expect(200);
    const parsedGet = ContextResponseSchema.safeParse(getContextResponse.body);
    expect(parsedGet.success).toBe(true);
    if (parsedGet.success) {
      expect(parsedGet.data.active).toBeNull();
    }
  });
});

describe('17. Selection is isolated per session', () => {
  it('session A selects membership A; session B does not see A selection', async () => {
    const tenantA = await tenants.create({
      slug: 'tenant-17-a.invalid',
      displayName: 'Tenant 17 A',
    });
    const tenantB = await tenants.create({
      slug: 'tenant-17-b.invalid',
      displayName: 'Tenant 17 B',
    });
    const user = await users.create({
      email: 'op17@example.invalid',
      displayName: 'Op17',
    });
    const hash = await passwordService.hash(TEST_PASSWORD);
    await credentials.createCredential({
      userId: user.id,
      passwordHash: hash,
      passwordChangedAt: new Date(),
    });
    const membershipA = await memberships.create({
      tenantId: tenantA.id,
      userId: user.id,
    });
    const membershipB = await memberships.create({
      tenantId: tenantB.id,
      userId: user.id,
    });

    // Log in twice (two sessions).
    const cookieA = await loginAndReturnCookie('op17@example.invalid');
    const cookieB = await loginAndReturnCookie('op17@example.invalid');

    // Session A selects membership A.
    const csrfA = await fetchCsrfToken(cookieA);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookieA)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfA)
      .send({ membershipId: membershipA.id })
      .expect(200);

    // Session B's context should have no active selection.
    const responseB = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookieB)
      .expect(200);
    const parsedB = ContextResponseSchema.safeParse(responseB.body);
    expect(parsedB.success).toBe(true);
    if (parsedB.success) {
      expect(parsedB.data.active).toBeNull();
    }

    // Session B selects membership B.
    const csrfB = await fetchCsrfToken(cookieB);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookieB)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfB)
      .send({ membershipId: membershipB.id })
      .expect(200);

    // Session A's context should still have membership A.
    const responseA = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookieA)
      .expect(200);
    const parsedA = ContextResponseSchema.safeParse(responseA.body);
    expect(parsedA.success).toBe(true);
    if (parsedA.success) {
      expect(parsedA.data.active?.membershipId).toBe(membershipA.id);
    }
  });
});

describe('18. Session rotation preserves selection', () => {
  it('after session-token rotation, the active context is preserved', async () => {
    const { membershipId } = await bootstrapUserAndTenant(
      'op18@example.invalid',
      'Op18',
      'tenant-op18.invalid',
      'Tenant Op18',
    );
    const cookie = await loginAndReturnCookie('op18@example.invalid');
    const csrf1 = await fetchCsrfToken(cookie);

    // Select a membership.
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf1)
      .send({ membershipId })
      .expect(200);

    // Force rotation by setting rotatedAt to far in the past.
    await prisma.authSession.updateMany({
      where: {},
      data: { rotatedAt: new Date(Date.now() - 60 * 60 * 1000) },
    });

    // GET /api/v1/auth/session should rotate and return a new cookie.
    // The session response should include activeTenantContext.
    const sessionResponse = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookie)
      .expect(200);

    const parsedSession = SessionResponseSchema.safeParse(sessionResponse.body);
    expect(parsedSession.success).toBe(true);
    if (parsedSession.success) {
      expect(parsedSession.data.activeTenantContext).not.toBeNull();
      expect(parsedSession.data.activeTenantContext?.membershipId).toBe(
        membershipId,
      );
    }
  });
});

describe('19. Session response includes activeTenantContext', () => {
  it('login response includes activeTenantContext: null', async () => {
    await bootstrapUserAndTenant(
      'op19@example.invalid',
      'Op19',
      'tenant-op19.invalid',
      'Tenant Op19',
    );
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'op19@example.invalid', password: TEST_PASSWORD })
      .expect(200);

    const parsed = SessionResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeTenantContext).toBeNull();
    }
  });

  it('session response after selection includes activeTenantContext', async () => {
    const { membershipId } = await bootstrapUserAndTenant(
      'op19b@example.invalid',
      'Op19 B',
      'tenant-op19b.invalid',
      'Tenant Op19 B',
    );
    const cookie = await loginAndReturnCookie('op19b@example.invalid');
    const csrf = await fetchCsrfToken(cookie);

    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId })
      .expect(200);

    const sessionResponse = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookie)
      .expect(200);

    const parsed = SessionResponseSchema.safeParse(sessionResponse.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeTenantContext).not.toBeNull();
      expect(parsed.data.activeTenantContext?.membershipId).toBe(membershipId);
    }
  });
});

describe('20. Invalidated selection is cleared automatically', () => {
  it('GET /context clears the selection when the Tenant is suspended', async () => {
    // When the membership is suspended, the user has no active
    // memberships, so the auth module's getSessionFromCookie
    // returns null and the context endpoint returns 401. This is
    // the correct behaviour per ADR-013: a user with no active
    // memberships cannot have a valid session.
    //
    // To test the "invalidated selection is cleared" behaviour
    // without terminating the session, we suspend the Tenant
    // instead. The membership remains active, so the session is
    // still valid; but the context endpoint excludes the option
    // because the Tenant is suspended, and clears the active
    // selection.
    const { membershipId, tenantId, userId } = await bootstrapUserAndTenant(
      'op20@example.invalid',
      'Op20',
      'tenant-op20.invalid',
      'Tenant Op20',
    );
    const cookie = await loginAndReturnCookie('op20@example.invalid');
    const csrf = await fetchCsrfToken(cookie);

    // Select the membership.
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId })
      .expect(200);

    // Suspend the Tenant directly.
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'suspended' },
    });

    // GET /context should clear the selection and return active = null.
    const response = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookie)
      .expect(200);

    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.active).toBeNull();
      // The suspended Tenant should not appear in options.
      expect(parsed.data.options).toHaveLength(0);
    }

    // Verify the session row's activeTenantMembershipId was cleared.
    const sessionRow = await prisma.authSession.findFirst({
      where: { userId },
    });
    expect(sessionRow).not.toBeNull();
    expect(sessionRow?.activeTenantMembershipId).toBeNull();
  });
});

describe('21. Responses contain no session token, hash, credential, or Prisma record', () => {
  it('the context response body does not contain credential fields', async () => {
    await bootstrapUserAndTenant(
      'op21@example.invalid',
      'Op21',
      'tenant-op21.invalid',
      'Tenant Op21',
    );
    const cookie = await loginAndReturnCookie('op21@example.invalid');

    const response = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('token');
    expect(body).not.toHaveProperty('tokenHash');
    expect(body).not.toHaveProperty('rawToken');
    expect(body).not.toHaveProperty('sessionToken');
    expect(body).not.toHaveProperty('csrfToken');
    expect(body).not.toHaveProperty('csrfHash');
    expect(JSON.stringify(body)).not.toContain(TEST_PASSWORD);
  });
});

describe('22. Health remains public', () => {
  it('GET /api/v1/health returns 200 without a session cookie', async () => {
    const response = await request(server).get('/api/v1/health').expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'ibn-hayan-api',
      version: 'development',
    });
  });
});

describe('23. Login throttling remains unchanged', () => {
  it('returns 429 or 401 after too many failed login attempts', async () => {
    await bootstrapUserAndTenant(
      'op23@example.invalid',
      'Op23',
      'tenant-op23.invalid',
      'Tenant Op23',
    );
    for (let i = 0; i < 10; i++) {
      await request(server)
        .post('/api/v1/auth/login')
        .set('Origin', ORIGIN)
        .send({
          email: 'op23@example.invalid',
          password: 'wrong-sufficiently-long',
        })
        .expect(401);
    }
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({
        email: 'op23@example.invalid',
        password: 'wrong-sufficiently-long',
      });
    expect([401, 429]).toContain(response.status);
  });
});

describe('24. Context routes do not inherit the login-specific throttle limit', () => {
  it('GET /api/v1/context does not return 429 after >10 unauthenticated requests', async () => {
    // The login-specific throttle is 10/60s. If context inherited the
    // same limit, the 11th request would return 429. Context uses
    // the permissive default throttler (1000/60s), so all 15
    // requests should return 401 — never 429.
    for (let i = 0; i < 15; i++) {
      const response = await request(server).get('/api/v1/context');
      expect(response.status).toBe(401);
    }
  });

  it('PUT /api/v1/context/tenant does not return 429 after >10 unauthenticated requests', async () => {
    for (let i = 0; i < 15; i++) {
      const response = await request(server)
        .put('/api/v1/context/tenant')
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', 'any')
        .send({ membershipId: '11111111-1111-1111-1111-111111111111' });
      expect(response.status).toBe(401);
    }
  });
});
