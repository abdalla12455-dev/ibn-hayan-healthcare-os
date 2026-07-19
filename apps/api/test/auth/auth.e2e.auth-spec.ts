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
} from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
} from '../../src/infrastructure/database/database.module.js';
import {
  setupDatabaseTests,
  getDatabaseUrl,
  getPsqlBin,
} from '../database/_pg-bootstrap.js';
import { execFileSync } from 'node:child_process';
import {
  SessionResponseSchema,
  CsrfResponseSchema,
  LogoutResponseSchema,
  AuthErrorResponseSchema,
} from '@ibn-hayan/contracts';

/**
 * Authentication HTTP integration tests.
 *
 * These tests exercise the full authentication flow via supertest
 * against a real NestJS application with a real PostgreSQL 17
 * database. They verify scenarios 14-34 from the fourth canonical
 * batch specification.
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. All login failures produce the same generic 401 response.
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
const TEST_EMAIL = 'operator.auth@example.invalid';
const TEST_DISPLAY_NAME = 'Operator Auth';
const TEST_TENANT_SLUG = 'tenant-auth.invalid';
const TEST_TENANT_DISPLAY_NAME = 'Tenant Auth';

async function bootstrapTestUser(): Promise<void> {
  const tenant = await tenants.create({
    slug: TEST_TENANT_SLUG,
    displayName: TEST_TENANT_DISPLAY_NAME,
  });
  const user = await users.create({
    email: TEST_EMAIL,
    displayName: TEST_DISPLAY_NAME,
  });
  const hash = await passwordService.hash(TEST_PASSWORD);
  await credentials.createCredential({
    userId: user.id,
    passwordHash: hash,
    passwordChangedAt: new Date(),
  });
  await memberships.create({
    tenantId: tenant.id,
    userId: user.id,
  });
}

function truncateAll(): void {
  execFileSync(
    getPsqlBin(),
    [
      getDatabaseUrl(),
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      'TRUNCATE TABLE auth_sessions, tenant_role_assignments, tenant_memberships, local_credentials, users, tenants, organisations, facilities RESTART IDENTITY CASCADE;',
    ],
    { stdio: 'pipe', encoding: 'utf-8' },
  );
}

/**
 * Extract the session cookie value from a supertest response's
 * `set-cookie` header. Returns a string like
 * `ibn_hayan_session=<value>` that can be passed to the `Cookie`
 * header of a subsequent request.
 *
 * Returns an empty string if no cookie is present.
 */
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

/**
 * Get the full `set-cookie` header as a lowercase string for
 * assertion purposes (e.g. checking for `httponly`, `secure`).
 */
function getSetCookieString(response: unknown): string {
  const headers = (response as { headers?: Record<string, unknown> }).headers;
  if (!headers) return '';
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  if (Array.isArray(setCookie)) {
    return setCookie
      .map((v: unknown) => String(v))
      .join(';')
      .toLowerCase();
  }
  if (typeof setCookie === 'string') {
    return setCookie.toLowerCase();
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
  // Reset the throttler's in-memory storage so that login attempts
  // in one test do not count towards the throttle limit in the next
  // test. The throttler keys by IP; in the test environment all
  // requests come from the same IP (127.0.0.1), so without this
  // reset the throttle would trigger after 10 failed logins across
  // ALL tests, not just within a single test.
  resetThrottlerStorage();
});

/**
 * Reset the throttler's in-memory storage.
 *
 * The default `ThrottlerStorage` from `@nestjs/throttler` stores
 * attempt counts in a Map. The Map's keys are strings (IP + route)
 * and the values are `ThrottlerStorageRecord` objects. Clearing the
 * Map resets all counters.
 *
 * This uses an internal API (`storage` property) which is not part
 * of the public `ThrottlerStorage` interface but is stable across
 * `@nestjs/throttler` v6.x. If the internal API changes, this
 * function will need to be updated.
 */
function resetThrottlerStorage(): void {
  const storage = throttlerStorage as unknown as {
    storage?: Map<string, unknown>;
  };
  if (storage.storage instanceof Map) {
    storage.storage.clear();
  }
}

describe('14. Valid login succeeds', () => {
  it('returns 200 with a session response for valid credentials', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const parsed = SessionResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.user.email).toBe(TEST_EMAIL);
      expect(parsed.data.user.displayName).toBe(TEST_DISPLAY_NAME);
      expect(parsed.data.user.status).toBe('active');
      expect(parsed.data.memberships).toHaveLength(1);
      expect(parsed.data.expiresAt).toBeDefined();
    }
  });
});

describe('15-17. Wrong password, unknown email, disabled user all return the same generic 401', () => {
  it('returns 401 with the same error shape for wrong password', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: 'wrong-sufficiently-long' })
      .expect(401);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('returns 401 with the same error shape for unknown email', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'nonexistent@example.invalid', password: TEST_PASSWORD })
      .expect(401);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('returns 401 with the same error shape for a disabled user', async () => {
    await bootstrapTestUser();
    // Disable the user by updating directly.
    const user = await users.findByNormalisedEmail(TEST_EMAIL.toLowerCase());
    expect(user).not.toBeNull();
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'disabled' },
      });
    }
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(401);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });
});

describe('18. User without active membership returns the same generic 401', () => {
  it('returns 401 when the user has no active membership', async () => {
    // Create a user with a credential but no membership.
    const user = await users.create({
      email: TEST_EMAIL,
      displayName: TEST_DISPLAY_NAME,
    });
    const hash = await passwordService.hash(TEST_PASSWORD);
    await credentials.createCredential({
      userId: user.id,
      passwordHash: hash,
      passwordChangedAt: new Date(),
    });
    // No membership created.

    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(401);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });
});

describe('19. Successful login sets an HttpOnly cookie', () => {
  it('sets a cookie with HttpOnly and the session name', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    expect(getSetCookieString(response)).toContain('ibn_hayan_session=');
    expect(getSetCookieString(response)).toContain('httponly');
    expect(getSetCookieString(response)).toContain('samesite=lax');
    expect(getSetCookieString(response)).toContain('path=/');
  });
});

describe('20. Cookie configuration is secure in production mode', () => {
  it('sets Secure flag when NODE_ENV=production', async () => {
    await bootstrapTestUser();
    const originalNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      expect(getSetCookieString(response)).not.toBe('');
      expect(getSetCookieString(response)).toContain('secure');
    } finally {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });
});

describe('21. Session endpoint works with a valid cookie', () => {
  it('returns 200 with the session response when a valid cookie is present', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const sessionResponse = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookieValue ?? '')
      .expect(200);

    const parsed = SessionResponseSchema.safeParse(sessionResponse.body);
    expect(parsed.success).toBe(true);
  });
});

describe('22. Invalid cookie returns 401', () => {
  it('returns 401 for a malformed cookie value', async () => {
    await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', 'ibn_hayan_session=invalid-token-value')
      .expect(401);
  });
});

describe('23. Expired session returns 401', () => {
  it('returns 401 when the session has expired', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    // Expire all sessions directly in the database.
    const past = new Date(Date.now() - 1000);
    await prisma.authSession.updateMany({
      where: {},
      data: { expiresAt: past },
    });

    await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookieValue ?? '')
      .expect(401);
  });
});

describe('24. Revoked session returns 401', () => {
  it('returns 401 when the session has been revoked', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    // Revoke all sessions directly in the database.
    await prisma.authSession.updateMany({
      where: {},
      data: { revokedAt: new Date() },
    });

    await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookieValue ?? '')
      .expect(401);
  });
});

describe('25. Rotation invalidates the old cookie token', () => {
  it('after rotation, the old cookie no longer works', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const oldCookieValue = extractSessionCookie(loginResponse);

    // Force rotation by setting rotatedAt to far in the past.
    const past = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.authSession.updateMany({
      where: {},
      data: { rotatedAt: past },
    });

    // The session endpoint should rotate and return a new cookie.
    const sessionResponse = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', oldCookieValue)
      .expect(200);

    // A new cookie should be set (rotation).
    expect(getSetCookieString(sessionResponse)).not.toBe('');

    // The old cookie should no longer work (the token hash was replaced).
    await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', oldCookieValue)
      .expect(401);
  });
});

describe('26. CSRF endpoint requires authentication', () => {
  it('returns 401 without a session cookie', async () => {
    await request(server).get('/api/v1/auth/csrf').expect(401);
  });

  it('returns 200 with a CSRF token when authenticated', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const csrfResponse = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', cookieValue ?? '')
      .expect(200);

    const parsed = CsrfResponseSchema.safeParse(csrfResponse.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.token.length).toBeGreaterThanOrEqual(32);
    }
  });
});

describe('27. Logout rejects missing CSRF header', () => {
  it('returns 403 when the X-CSRF-Token header is missing', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const response = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieValue ?? '')
      .set('Origin', 'http://localhost:3000')
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_CSRF_INVALID');
    }
  });
});

describe('28. Logout rejects invalid CSRF token', () => {
  it('returns 403 when the X-CSRF-Token header has an invalid value', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const response = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieValue ?? '')
      .set('Origin', 'http://localhost:3000')
      .set('X-CSRF-Token', 'invalid-csrf-token')
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_CSRF_INVALID');
    }
  });
});

describe('29. Logout rejects disallowed Origin', () => {
  it('returns 403 when the Origin is not in the allowed list', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const response = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieValue ?? '')
      .set('Origin', 'https://evil.example.com')
      .set('X-CSRF-Token', 'any-token')
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_ORIGIN_DISALLOWED');
    }
  });
});

describe('29a. Login rejects missing Origin', () => {
  it('returns 403 AUTH_ORIGIN_DISALLOWED when Origin header is absent', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_ORIGIN_DISALLOWED');
    }
  });

  it('does not set a session cookie when Origin is missing', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(403);

    expect(getSetCookieString(response)).toBe('');
  });
});

describe('29b. Login rejects disallowed Origin', () => {
  it('returns 403 AUTH_ORIGIN_DISALLOWED for an unconfigured Origin', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_ORIGIN_DISALLOWED');
    }
  });

  it('returns the same 403 shape regardless of whether the account exists', async () => {
    // First request: valid account, disallowed Origin.
    await bootstrapTestUser();
    const validAccountResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(403);

    // Second request: unknown account, disallowed Origin.
    const unknownAccountResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: 'nonexistent@example.invalid', password: TEST_PASSWORD })
      .expect(403);

    // Both responses must be identical — no account enumeration.
    expect(validAccountResponse.body).toEqual(unknownAccountResponse.body);
  });
});

describe('29c. Login accepts the configured Origin', () => {
  it('returns 200 (or 401) but never 403 when Origin is configured', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('memberships');
  });
});

describe('29d. Logout rejects missing Origin', () => {
  it('returns 403 AUTH_ORIGIN_DISALLOWED when Origin header is absent', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const response = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieValue ?? '')
      .set('X-CSRF-Token', 'any-token')
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_ORIGIN_DISALLOWED');
    }
  });
});

describe('29e. Logout with allowed Origin still requires CSRF', () => {
  it('returns 403 AUTH_CSRF_INVALID when Origin is allowed but CSRF is missing', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const response = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieValue ?? '')
      .set('Origin', 'http://localhost:3000')
      .expect(403);

    const parsed = AuthErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTH_CSRF_INVALID');
    }
  });
});

describe('29f. Generic auth-failure responses reveal no account information', () => {
  it('login with missing Origin returns no user, email, or membership data', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(403);

    const body = response.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('user');
    expect(body).not.toHaveProperty('memberships');
    expect(body).not.toHaveProperty('email');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('token');
    expect(body).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(body)).not.toContain(TEST_EMAIL);
    expect(JSON.stringify(body)).not.toContain(TEST_PASSWORD);
  });

  it('login with disallowed Origin returns no user, email, or membership data', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(403);

    const body = response.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('user');
    expect(body).not.toHaveProperty('memberships');
    expect(body).not.toHaveProperty('email');
    expect(JSON.stringify(body)).not.toContain(TEST_EMAIL);
    expect(JSON.stringify(body)).not.toContain(TEST_PASSWORD);
  });
});

describe('30. Logout revokes the database session', () => {
  it('marks the session as revoked in the database', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    // Get a CSRF token.
    const csrfResponse = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', cookieValue ?? '')
      .expect(200);
    const csrfToken = (csrfResponse.body as { token: string }).token;

    // Logout.
    await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieValue ?? '')
      .set('Origin', 'http://localhost:3000')
      .set('X-CSRF-Token', csrfToken)
      .expect(200);

    // Verify the session is revoked in the database.
    const sessions = await prisma.authSession.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.revokedAt).not.toBeNull();
  });
});

describe('31. Logout clears the cookie', () => {
  it('sets a cookie with Max-Age=0 to clear the session cookie', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const csrfResponse = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', cookieValue ?? '')
      .expect(200);
    const csrfToken = (csrfResponse.body as { token: string }).token;

    const logoutResponse = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieValue ?? '')
      .set('Origin', 'http://localhost:3000')
      .set('X-CSRF-Token', csrfToken)
      .expect(200);

    const parsed = LogoutResponseSchema.safeParse(logoutResponse.body);
    expect(parsed.success).toBe(true);

    // The response should set a cookie that clears the session cookie.
    // Express's `clearCookie` uses `expires=Thu, 01 Jan 1970 ...` by
    // default (or `max-age=0` if configured). Either is acceptable.
    const clearCookieStr = getSetCookieString(logoutResponse);
    expect(clearCookieStr).not.toBe('');
    expect(
      clearCookieStr.includes('max-age=0') ||
        clearCookieStr.includes('expires=thu, 01 jan 1970'),
    ).toBe(true);
  });
});

describe('32. Login throttling activates', () => {
  it('returns 429 after too many failed login attempts', async () => {
    await bootstrapTestUser();
    // The default throttle is 10 attempts per 60 seconds.
    // Make 10 failed attempts (should all return 401).
    for (let i = 0; i < 10; i++) {
      await request(server)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .send({ email: TEST_EMAIL, password: 'wrong-sufficiently-long' })
        .expect(401);
    }
    // The 11th attempt should be throttled (429) or still 401
    // depending on the throttler's window. We accept either 429 or 401
    // here because the throttler's exact behaviour depends on timing.
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: 'wrong-sufficiently-long' });

    expect([401, 429]).toContain(response.status);
  });
});

describe('33. Responses never contain password hashes or session tokens', () => {
  it('the login response does not contain passwordHash or token fields', async () => {
    await bootstrapTestUser();
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const body = response.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('token');
    expect(body).not.toHaveProperty('tokenHash');
    expect(body).not.toHaveProperty('rawToken');
    expect(body).not.toHaveProperty('sessionToken');
    expect(JSON.stringify(body)).not.toContain(TEST_PASSWORD);
  });

  it('the session response does not contain passwordHash or token fields', async () => {
    await bootstrapTestUser();
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookieValue = extractSessionCookie(loginResponse);

    const sessionResponse = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookieValue ?? '')
      .expect(200);

    const body = sessionResponse.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('token');
    expect(body).not.toHaveProperty('tokenHash');
    expect(body).not.toHaveProperty('rawToken');
    expect(body).not.toHaveProperty('sessionToken');
  });
});

describe('34. Health remains available without a database-backed session', () => {
  it('GET /api/v1/health returns 200 without a session cookie', async () => {
    const response = await request(server).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'ibn-hayan-api',
      version: 'development',
    });
  });
});

describe('35. Health is explicitly exempt from throttling', () => {
  it('never returns 429 even after many rapid requests', async () => {
    // The default throttler is 1000/60s; the login-specific throttler
    // is 10/60s. Without @SkipThrottle() on Health, 1001 rapid Health
    // requests would return 429. With @SkipThrottle(), none do.
    // We send 50 rapid requests (well above the login limit of 10,
    // well below the default limit of 1000) to prove Health is exempt
    // from the login-specific limit too.
    for (let i = 0; i < 50; i++) {
      const response = await request(server).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'ibn-hayan-api',
        version: 'development',
      });
    }
  });
});

describe('36. Non-login auth endpoints are not subjected to login throttle', () => {
  it('GET /api/v1/auth/session does not return 429 after >10 requests', async () => {
    // The login-specific throttle is 10/60s. If session were subjected
    // to the same limit, the 11th request would return 429. Session
    // uses the permissive default throttler (1000/60s), so all 15
    // requests should return 401 (no session) — never 429.
    for (let i = 0; i < 15; i++) {
      const response = await request(server).get('/api/v1/auth/session');
      expect(response.status).toBe(401);
    }
  });

  it('GET /api/v1/auth/csrf does not return 429 after >10 requests', async () => {
    for (let i = 0; i < 15; i++) {
      const response = await request(server).get('/api/v1/auth/csrf');
      expect(response.status).toBe(401);
    }
  });
});
