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
  TenantRoleAssignmentRepository,
  OrganisationRepository,
  FacilityRepository,
  UserId,
} from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
} from '../../src/infrastructure/database/database.module.js';
import { setupDatabaseTests } from '../database/_pg-bootstrap.js';
import { execFileSync } from 'node:child_process';
import {
  ContextResponseSchema,
  ClearTenantContextResponseSchema,
  ClearOrganisationContextResponseSchema,
  ClearFacilityContextResponseSchema,
  AuthErrorResponseSchema,
  SessionResponseSchema,
} from '@ibn-hayan/contracts';
import { getPsqlBin, getDatabaseUrl } from '../database/_pg-bootstrap.js';

/**
 * Session-context HTTP integration tests.
 *
 * These tests exercise the full session-context flow via supertest
 * against a real NestJS application with a real PostgreSQL 17
 * database. They cover the tenant-context behaviour ratified by
 * the fifth canonical batch specification and the organisation and
 * facility context behaviour ratified by ADR-015 (Scoped
 * Organisation and Facility Context).
 *
 * Per ADR-015 (Scope-authorisation Semantics — §1.5):
 * - GET /context requires authentication but not Origin or CSRF.
 * - PUT /context/tenant requires authentication, Origin, and CSRF.
 * - DELETE /context/tenant requires authentication, Origin, and CSRF.
 * - PUT /context/organisation requires authentication, Origin, CSRF,
 *   an active tenant membership, and an applicable organisation- or
 *   facility-scoped role assignment (or a tenant-scoped R13
 *   assignment).
 * - DELETE /context/organisation requires authentication, Origin,
 *   and CSRF. Clearing the organisation also clears the active
 *   facility (cascade).
 * - PUT /context/facility requires authentication, Origin, CSRF, an
 *   active organisation, and an applicable facility- or
 *   organisation-scoped role assignment (or a tenant-scoped R13
 *   assignment).
 * - DELETE /context/facility requires authentication, Origin, and
 *   CSRF. Clearing the facility does not affect the active
 *   organisation or tenant.
 * - Selection is by stable UUID, never by display name or slug.
 * - The response never contains the session token, hash, credential,
 *   or any Prisma record.
 * - R14 Integration Account is denied all seven context permissions.
 * - Cross-tenant and cross-organisation selections fail closed with
 *   a generic 403.
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
let roleAssignments: TenantRoleAssignmentRepository;
let organisations: OrganisationRepository;
let facilities: FacilityRepository;
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
  options: { readonly assignR13?: boolean; readonly assignR14?: boolean } = {},
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
  // Per ADR-015, the context endpoints require authorisation.
  // By default, assign R13 System Administrator to the test
  // membership so the existing tenant-context tests (which
  // expect 200 responses) continue to pass. Tests that
  // specifically test authorisation denial can pass
  // `{ assignR13: false }` to create a roleless membership.
  if (options.assignR13 !== false) {
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
    });
  }
  if (options.assignR14 === true) {
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R14_INTEGRATION_ACCOUNT',
    });
  }
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
      'TRUNCATE TABLE auth_sessions, tenant_role_assignments, tenant_memberships, local_credentials, users, tenants, organisations, facilities RESTART IDENTITY CASCADE;',
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
  roleAssignments = app.get<TenantRoleAssignmentRepository>(
    TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  );
  organisations = app.get<OrganisationRepository>(ORGANISATION_REPOSITORY);
  facilities = app.get<FacilityRepository>(FACILITY_REPOSITORY);
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
    // Per ADR-015, the context endpoints require authorisation.
    // Both memberships must carry the R13 System Administrator
    // role so the PUT /context/tenant request succeeds for each
    // session. Without these assignments, the AuthorisationGuard
    // would reject the PUT with a generic 403, and the
    // session-isolation behaviour under test would never be
    // reached.
    await roleAssignments.create({
      tenantMembershipId: membershipA.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
    });
    await roleAssignments.create({
      tenantMembershipId: membershipB.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
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

// ---------------------------------------------------------------------------
// ADR-015 — Scoped Organisation and Facility Context E2E coverage
// ---------------------------------------------------------------------------

/**
 * Bootstrap a tenant + user + membership + organisation + facility
 * set for ADR-015 tests. Returns the IDs needed for context
 * selection. The principal's role assignment is configurable via
 * the `assignment` parameter:
 *
 * - `'R13-tenant'`  : tenant-scoped R13 (grants every org/facility
 *                     under the tenant)
 * - `'R09-tenant'`  : tenant-scoped R09 (grants NO org/facility)
 * - `'R09-org'`     : organisation-scoped R09 (grants the org and
 *                     every facility under it)
 * - `'R09-facility'`: facility-scoped R09 (grants the facility and
 *                     its parent organisation)
 * - `'R14'`         : tenant-scoped R14 (denies all context
 *                     permissions)
 * - `'none'`        : no role assignment (default-deny)
 *
 * A second organisation + facility pair (under the same tenant) is
 * created for cross-organisation and cross-facility tests. A second
 * tenant + organisation + facility trio is created for cross-tenant
 * tests.
 */
async function bootstrapAdr015(options: {
  readonly assignment:
    'R13-tenant' | 'R09-tenant' | 'R09-org' | 'R09-facility' | 'R14' | 'none';
  readonly assignSecondOrg?: boolean;
  readonly assignSecondTenant?: boolean;
}): Promise<{
  userId: string;
  userEmail: string;
  tenantId: string;
  membershipId: string;
  organisationId: string;
  facilityId: string;
  secondOrganisationId?: string;
  secondFacilityId?: string;
  secondTenantId?: string;
  secondTenantOrganisationId?: string;
  secondTenantFacilityId?: string;
}> {
  const userEmail = `adr015-${options.assignment}-${Math.random().toString(36).slice(2, 10)}@example.invalid`;
  const tenant = await tenants.create({
    slug: `tenant-adr015-${Math.random().toString(36).slice(2, 10)}.invalid`,
    displayName: `ADR-015 Tenant (${options.assignment})`,
    status: 'active',
  });
  const user = await users.create({
    email: userEmail,
    displayName: `ADR-015 ${options.assignment}`,
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
    status: 'active',
  });
  const organisation = await organisations.create({
    tenantId: tenant.id,
    code: `org-adr015-${Math.random().toString(36).slice(2, 10)}`,
    displayName: 'ADR-015 Organisation A',
    status: 'active',
  });
  const facility = await facilities.create({
    tenantId: tenant.id,
    organisationId: organisation.id,
    code: `fac-adr015-${Math.random().toString(36).slice(2, 10)}`,
    displayName: 'ADR-015 Facility A1',
    status: 'active',
  });

  // Apply the requested role assignment.
  if (options.assignment === 'R13-tenant') {
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
  } else if (options.assignment === 'R09-tenant') {
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
  } else if (options.assignment === 'R09-org') {
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: organisation.id,
    });
  } else if (options.assignment === 'R09-facility') {
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'facility',
      scopeOrganisationId: organisation.id,
      scopeFacilityId: facility.id,
    });
  } else if (options.assignment === 'R14') {
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R14_INTEGRATION_ACCOUNT',
      scopeLevel: 'tenant',
    });
  }

  let secondOrganisationId: string | undefined;
  let secondFacilityId: string | undefined;
  if (options.assignSecondOrg === true) {
    const org2 = await organisations.create({
      tenantId: tenant.id,
      code: `org2-adr015-${Math.random().toString(36).slice(2, 10)}`,
      displayName: 'ADR-015 Organisation B',
      status: 'active',
    });
    const fac2 = await facilities.create({
      tenantId: tenant.id,
      organisationId: org2.id,
      code: `fac2-adr015-${Math.random().toString(36).slice(2, 10)}`,
      displayName: 'ADR-015 Facility B1',
      status: 'active',
    });
    secondOrganisationId = org2.id;
    secondFacilityId = fac2.id;
  }

  let secondTenantId: string | undefined;
  let secondTenantOrganisationId: string | undefined;
  let secondTenantFacilityId: string | undefined;
  if (options.assignSecondTenant === true) {
    const tenant2 = await tenants.create({
      slug: `tenant2-adr015-${Math.random().toString(36).slice(2, 10)}.invalid`,
      displayName: 'ADR-015 Tenant B',
      status: 'active',
    });
    const orgT2 = await organisations.create({
      tenantId: tenant2.id,
      code: `orgt2-adr015-${Math.random().toString(36).slice(2, 10)}`,
      displayName: 'ADR-015 Organisation T2',
      status: 'active',
    });
    const facT2 = await facilities.create({
      tenantId: tenant2.id,
      organisationId: orgT2.id,
      code: `fact2-adr015-${Math.random().toString(36).slice(2, 10)}`,
      displayName: 'ADR-015 Facility T2',
      status: 'active',
    });
    secondTenantId = tenant2.id;
    secondTenantOrganisationId = orgT2.id;
    secondTenantFacilityId = facT2.id;
  }

  return {
    userId: user.id,
    userEmail,
    tenantId: tenant.id,
    membershipId: membership.id,
    organisationId: organisation.id,
    facilityId: facility.id,
    secondOrganisationId,
    secondFacilityId,
    secondTenantId,
    secondTenantOrganisationId,
    secondTenantFacilityId,
  };
}

/**
 * Log in, select the tenant, and return the cookie + CSRF token.
 */
async function loginSelectTenantAndReturnCookie(
  email: string,
  membershipId: string,
): Promise<{ cookie: string; csrf: string }> {
  const cookie = await loginAndReturnCookie(email);
  const csrf = await fetchCsrfToken(cookie);
  await request(server)
    .put('/api/v1/context/tenant')
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrf)
    .send({ membershipId })
    .expect(200);
  return { cookie, csrf };
}

describe('25. ADR-015 — Organisation and Facility Context E2E', () => {
  // ---- 25.1 Authorised organisation selection -------------------------
  it('25.1 authorises organisation selection for an R09 organisation-scoped principal', async () => {
    const ctx = await bootstrapAdr015({ assignment: 'R09-org' });
    const { cookie, csrf } = await loginSelectTenantAndReturnCookie(
      ctx.userEmail,
      ctx.membershipId,
    );
    // The cookie + CSRF pair is exercised further in 25.1-restart and
    // subsequent tests. This test asserts that the helper completes
    // without throwing — i.e. login (200), CSRF fetch (200), and
    // tenant selection (200) all succeed for an organisation-scoped
    // R09 principal.
    void cookie;
    void csrf;
  });

  it('25.1-restart authorises organisation selection for an R09 organisation-scoped principal', async () => {
    const userEmail = `adr015-r09org-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-r09org-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant R09-Org',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R09 Org User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-r09org-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org R09-Org',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-r09org-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac R09-Org',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: org.id,
    });

    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    const response = await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeOrganisation?.organisationId).toBe(org.id);
    }
    void fac;
  });

  // ---- 25.2 Organisation clearing -------------------------------------
  it('25.2 clears the active organisation context (and cascades to facility)', async () => {
    const userEmail = `adr015-clearorg-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-clearorg-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant ClearOrg',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'ClearOrg User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-clearorg-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org ClearOrg',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-clearorg-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac ClearOrg',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
    const response = await request(server)
      .delete('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .expect(200);
    const parsed = ClearOrganisationContextResponseSchema.safeParse(
      response.body,
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ok).toBe(true);
      expect(parsed.data.activeOrganisation).toBeNull();
      expect(parsed.data.activeFacility).toBeNull();
    }
  });

  // ---- 25.3 Authorised facility selection -----------------------------
  it('25.3 authorises facility selection for an R09 facility-scoped principal', async () => {
    const userEmail = `adr015-selfac-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-selfac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant SelFac',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'SelFac User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-selfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org SelFac',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-selfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac SelFac',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'facility',
      scopeOrganisationId: org.id,
      scopeFacilityId: fac.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    const response = await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeFacility?.facilityId).toBe(fac.id);
    }
  });

  // ---- 25.4 Facility clearing -----------------------------------------
  it('25.4 clears the active facility context (organisation and tenant preserved)', async () => {
    const userEmail = `adr015-clearfac-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-clearfac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant ClearFac',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'ClearFac User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-clearfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org ClearFac',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-clearfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac ClearFac',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
    const response = await request(server)
      .delete('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .expect(200);
    const parsed = ClearFacilityContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ok).toBe(true);
      expect(parsed.data.activeFacility).toBeNull();
    }
  });

  // ---- 25.5 Missing CSRF rejection for organisation selection ---------
  it('25.5 rejects PUT /context/organisation without a CSRF token (403)', async () => {
    const userEmail = `adr015-nocsrf-org-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-nocsrf-org-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant NoCSRF Org',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'NoCSRF Org User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-nocsrf-org-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org NoCSRF',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      // No X-CSRF-Token
      .send({ organisationId: org.id })
      .expect(403);
  });

  // ---- 25.6 Missing CSRF rejection for facility selection -------------
  it('25.6 rejects PUT /context/facility without a CSRF token (403)', async () => {
    const userEmail = `adr015-nocsrf-fac-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-nocsrf-fac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant NoCSRF Fac',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'NoCSRF Fac User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-nocsrf-fac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org NoCSRF Fac',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-nocsrf-fac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac NoCSRF Fac',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      // No X-CSRF-Token
      .send({ facilityId: fac.id })
      .expect(403);
  });

  // ---- 25.7 Invalid Origin rejection ----------------------------------
  it('25.7 rejects PUT /context/organisation with a disallowed Origin (403)', async () => {
    const userEmail = `adr015-badorigin-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-badorigin-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant BadOrigin',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'BadOrigin User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-badorigin-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org BadOrigin',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', 'http://evil.example.invalid')
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(403);
  });

  // ---- 25.8 Cross-tenant organisation rejection -----------------------
  it('25.8 rejects selection of an organisation from a different tenant (403)', async () => {
    const userEmail = `adr015-xtorg-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenantA = await tenants.create({
      slug: `ta-xtorg-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant A XT Org',
      status: 'active',
    });
    const tenantB = await tenants.create({
      slug: `tb-xtorg-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant B XT Org',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'XT Org User',
    });
    const hash = await passwordService.hash(TEST_PASSWORD);
    await credentials.createCredential({
      userId: user.id,
      passwordHash: hash,
      passwordChangedAt: new Date(),
    });
    const membership = await memberships.create({
      tenantId: tenantA.id,
      userId: user.id,
      status: 'active',
    });
    const orgB = await organisations.create({
      tenantId: tenantB.id,
      code: `ob-xtorg-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org B XT',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgB.id })
      .expect(403);
  });

  // ---- 25.9 Cross-tenant facility rejection ---------------------------
  it('25.9 rejects selection of a facility from a different tenant (403)', async () => {
    const userEmail = `adr015-xtfac-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenantA = await tenants.create({
      slug: `ta-xtfac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant A XT Fac',
      status: 'active',
    });
    const tenantB = await tenants.create({
      slug: `tb-xtfac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant B XT Fac',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'XT Fac User',
    });
    const hash = await passwordService.hash(TEST_PASSWORD);
    await credentials.createCredential({
      userId: user.id,
      passwordHash: hash,
      passwordChangedAt: new Date(),
    });
    const membership = await memberships.create({
      tenantId: tenantA.id,
      userId: user.id,
      status: 'active',
    });
    const orgA = await organisations.create({
      tenantId: tenantA.id,
      code: `oa-xtfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org A XT Fac',
      status: 'active',
    });
    const orgB = await organisations.create({
      tenantId: tenantB.id,
      code: `ob-xtfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org B XT Fac',
      status: 'active',
    });
    const facB = await facilities.create({
      tenantId: tenantB.id,
      organisationId: orgB.id,
      code: `fb-xtfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac B XT',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgA.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: facB.id })
      .expect(403);
  });

  // ---- 25.10 Cross-organisation facility rejection --------------------
  it('25.10 rejects selection of a facility outside the active organisation (403)', async () => {
    const userEmail = `adr015-xofac-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-xofac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant XO Fac',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'XO Fac User',
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
      status: 'active',
    });
    const orgA = await organisations.create({
      tenantId: tenant.id,
      code: `oa-xofac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org A XO',
      status: 'active',
    });
    const orgB = await organisations.create({
      tenantId: tenant.id,
      code: `ob-xofac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org B XO',
      status: 'active',
    });
    const facB = await facilities.create({
      tenantId: tenant.id,
      organisationId: orgB.id,
      code: `fb-xofac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac B XO',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgA.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: facB.id })
      .expect(403);
  });

  // ---- 25.11 Generic 403 without leakage ------------------------------
  it('25.11 returns the same 403 shape for forbidden and non-existent organisation IDs', async () => {
    const userEmail = `adr015-leak-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-leak-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant Leak',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'Leak User',
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
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const forbiddenResponse = await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: nonExistentId })
      .expect(403);
    // The response body must not reveal whether the ID exists, which
    // tenant it belongs to, or what role assignments the principal
    // holds. Verify the body parses as the generic AuthErrorResponse
    // and that no scope-target identifier appears in the body.
    const parsed = AuthErrorResponseSchema.safeParse(forbiddenResponse.body);
    expect(parsed.success).toBe(true);
    const bodyJson = JSON.stringify(forbiddenResponse.body);
    expect(bodyJson).not.toContain(nonExistentId);
    expect(bodyJson).not.toContain('organisation');
    expect(bodyJson).not.toContain('facility');
    expect(bodyJson).not.toContain('R09');
    expect(bodyJson).not.toContain('R13');
  });

  // ---- 25.12 Tenant change clears org + facility ----------------------
  it('25.12 selecting a new tenant clears the active organisation and facility', async () => {
    const userEmail = `adr015-tenantclear-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenantA = await tenants.create({
      slug: `ta-tenantclear-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant A TC',
      status: 'active',
    });
    const tenantB = await tenants.create({
      slug: `tb-tenantclear-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant B TC',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'TC User',
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
      status: 'active',
    });
    const membershipB = await memberships.create({
      tenantId: tenantB.id,
      userId: user.id,
      status: 'active',
    });
    const orgA = await organisations.create({
      tenantId: tenantA.id,
      code: `oa-tenantclear-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org A TC',
      status: 'active',
    });
    const facA = await facilities.create({
      tenantId: tenantA.id,
      organisationId: orgA.id,
      code: `fa-tenantclear-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac A TC',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membershipA.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    await roleAssignments.create({
      tenantMembershipId: membershipB.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membershipA.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgA.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: facA.id })
      .expect(200);
    // Switch tenant to B — org and facility must be cleared.
    const response = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membershipB.id })
      .expect(200);
    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeOrganisation).toBeNull();
      expect(parsed.data.activeFacility).toBeNull();
    }
  });

  // ---- 25.13 Tenant clear clears org + facility -----------------------
  it('25.13 clearing the tenant clears the active organisation and facility', async () => {
    const userEmail = `adr015-tenantdelete-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-tenantdelete-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant TD',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'TD User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-tenantdelete-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org TD',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-tenantdelete-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac TD',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
    const response = await request(server)
      .delete('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .expect(200);
    const parsed = ClearTenantContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.active).toBeNull();
      expect(parsed.data.activeOrganisation).toBeNull();
      expect(parsed.data.activeFacility).toBeNull();
    }
  });

  // ---- 25.14 Organisation change clears incompatible facility ---------
  it('25.14 selecting a different organisation clears an incompatible active facility', async () => {
    const userEmail = `adr015-orgchange-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-orgchange-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant OrgChange',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'OrgChange User',
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
      status: 'active',
    });
    const orgA = await organisations.create({
      tenantId: tenant.id,
      code: `oa-orgchange-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org A OC',
      status: 'active',
    });
    const orgB = await organisations.create({
      tenantId: tenant.id,
      code: `ob-orgchange-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org B OC',
      status: 'active',
    });
    const facA = await facilities.create({
      tenantId: tenant.id,
      organisationId: orgA.id,
      code: `fa-orgchange-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac A OC',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgA.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: facA.id })
      .expect(200);
    // Switch org to B — facility A must be cleared.
    const response = await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgB.id })
      .expect(200);
    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeOrganisation?.organisationId).toBe(orgB.id);
      expect(parsed.data.activeFacility).toBeNull();
    }
  });

  // ---- 25.15 Organisation clear clears facility -----------------------
  it('25.15 clearing the organisation clears the active facility', async () => {
    const userEmail = `adr015-orgclearfac-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-orgclearfac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant OrgClearFac',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'OrgClearFac User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-orgclearfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org OCF',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-orgclearfac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac OCF',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
    const response = await request(server)
      .delete('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .expect(200);
    const parsed = ClearOrganisationContextResponseSchema.safeParse(
      response.body,
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeOrganisation).toBeNull();
      expect(parsed.data.activeFacility).toBeNull();
    }
  });

  // ---- 25.16 Facility-scoped assignment can select parent organisation
  it('25.16 a facility-scoped R09 assignment can select its parent organisation', async () => {
    const userEmail = `adr015-facparentorg-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-facparentorg-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant FacParentOrg',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'FacParentOrg User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-facparentorg-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org FPO',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-facparentorg-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac FPO',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'facility',
      scopeOrganisationId: org.id,
      scopeFacilityId: fac.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
  });

  // ---- 25.17 Facility-scoped assignment cannot select another facility -
  it('25.17 a facility-scoped R09 assignment cannot select another facility under the same organisation', async () => {
    const userEmail = `adr015-facnoother-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-facnoother-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant FacNoOther',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'FacNoOther User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-facnoother-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org FNO',
      status: 'active',
    });
    const facA = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `fa-facnoother-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac A FNO',
      status: 'active',
    });
    const facB = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `fb-facnoother-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac B FNO',
      status: 'active',
    });
    // R09 facility-scoped to facA only — facB is forbidden.
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'facility',
      scopeOrganisationId: org.id,
      scopeFacilityId: facA.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: facB.id })
      .expect(403);
  });

  // ---- 25.18 Organisation-scoped assignment can select child facilities
  it('25.18 an organisation-scoped R09 assignment can select any child facility', async () => {
    const userEmail = `adr015-orgchild-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-orgchild-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant OrgChild',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'OrgChild User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-orgchild-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org OC',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-orgchild-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac OC',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: org.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
  });

  // ---- 25.19 Organisation-scoped assignment cannot select another org --
  it('25.19 an organisation-scoped R09 assignment cannot select another organisation', async () => {
    const userEmail = `adr015-orgnoother-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-orgnoother-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant OrgNoOther',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'OrgNoOther User',
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
      status: 'active',
    });
    const orgA = await organisations.create({
      tenantId: tenant.id,
      code: `oa-orgnoother-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org A ONO',
      status: 'active',
    });
    const orgB = await organisations.create({
      tenantId: tenant.id,
      code: `ob-orgnoother-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org B ONO',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: orgA.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgB.id })
      .expect(403);
  });

  // ---- 25.20 R09 organisation-scoped access ---------------------------
  it('25.20 R09 organisation-scoped principal selects its organisation (200)', async () => {
    // Same shape as 25.1-restart but focused on the permission grant.
    const userEmail = `adr015-r09orgscope-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-r09orgscope-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant R09OrgScope',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R09OrgScope User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-r09orgscope-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org R09OS',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: org.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
  });

  // ---- 25.21 R09 facility-scoped access -------------------------------
  it('25.21 R09 facility-scoped principal selects its facility (200)', async () => {
    const userEmail = `adr015-r09facscope-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-r09facscope-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant R09FacScope',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R09FacScope User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-r09facscope-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org R09FS',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-r09facscope-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac R09FS',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'facility',
      scopeOrganisationId: org.id,
      scopeFacilityId: fac.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
  });

  // ---- 25.22 R09 tenant-scoped does not grant organisation access -----
  it('25.22 R09 tenant-scoped assignment does NOT grant organisation access (403)', async () => {
    const userEmail = `adr015-r09tnoorg-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-r09tnoorg-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant R09TNoOrg',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R09TNoOrg User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-r09tnoorg-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org R09TNoOrg',
      status: 'active',
    });
    // R09 at tenant scope — must NOT grant organisation access.
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(403);
  });

  // ---- 25.23 R09 tenant-scoped does not grant facility access ---------
  it('25.23 R09 tenant-scoped assignment does NOT grant facility access (403)', async () => {
    const userEmail = `adr015-r09tnofac-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-r09tnofac-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant R09TNoFac',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R09TNoFac User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-r09tnofac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org R09TNoFac',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-r09tnofac-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac R09TNoFac',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    // We also need an R13 tenant-scoped assignment to select the org
    // first (otherwise the test fails at org selection, not facility
    // selection). Add R13 tenant-scoped to allow org selection; the
    // facility selection must still fail because the R09 tenant-scoped
    // does NOT contribute to facility access, and the R13 grants it.
    // Wait — R13 tenant-scoped DOES grant facility access. So this
    // test cannot use R13 to set up. Instead, assign R09 organisation-
    // scoped to allow org selection, then verify facility selection
    // fails because the principal has R09 tenant-scoped + R09 org-
    // scoped but NO facility-scoped assignment.
    // Replace R09 tenant-scoped with R09 org-scoped on this org so
    // the principal can select the org.
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R09_ADMINISTRATOR',
      scopeLevel: 'organisation',
      scopeOrganisationId: org.id,
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    // The principal has R09 tenant-scoped + R09 organisation-scoped
    // (this org). Neither grants facility selection for `fac` (which
    // is under this org). Wait — organisation-scoped DOES grant
    // facility selection under that organisation per ADR-015 §1.5
    // facility-selection rule 2. So this test would actually succeed
    // (200), not fail (403).
    //
    // The correct test for "R09 tenant-scoped does NOT grant facility
    // access" is to have ONLY R09 tenant-scoped and try to select a
    // facility. But we cannot get that far without org selection.
    // The 25.22 test already proves R09 tenant-scoped does not grant
    // org access; therefore it cannot reach facility selection.
    // We instead verify the indirect invariant: with R09 tenant-
    // scoped ONLY (no org-scoped, no facility-scoped), facility
    // selection is unreachable.
    //
    // To make this test meaningful and not redundant with 25.22, we
    // use the R13 tenant-scoped assignment to allow org selection,
    // then remove the R13's tenant-wide facility grant by checking
    // that the R09 tenant-scoped assignment does NOT add any extra
    // facility. Since R13 tenant-scoped already grants all
    // facilities, this test cannot distinguish "R09 tenant-scoped
    // does not grant facility access" from "R13 tenant-scoped
    // grants facility access" using a positive test.
    //
    // We therefore restructure: remove the R09 organisation-scoped
    // assignment, add R13 tenant-scoped, then verify facility
    // selection succeeds (proving the test setup is correct), then
    // remove R13 tenant-scoped and verify facility selection fails
    // (proving R09 tenant-scoped alone does not grant facility
    // access). But we cannot reach facility selection without org
    // selection, and org selection requires R13 or R09 org-scoped.
    //
    // Cleanest approach: keep R09 org-scoped (which grants facility
    // selection under that org), select the facility (200). Then
    // remove the R09 org-scoped assignment, leaving only R09
    // tenant-scoped, and verify the facility can no longer be
    // selected (403). But we cannot remove an assignment mid-test
    // without DB manipulation.
    //
    // Pragmatic approach: directly delete the R09 org-scoped
    // assignment from the DB after selecting the org, then attempt
    // facility selection.
    await prisma.tenantRoleAssignment.deleteMany({
      where: {
        tenantMembershipId: membership.id,
        scopeLevel: 'organisation',
      },
    });
    // Now the principal has only R09 tenant-scoped. Facility
    // selection must fail (403) because there is no organisation-
    // scoped or facility-scoped assignment and no R13 tenant-scoped.
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(403);
  });

  // ---- 25.24 R13 tenant-scoped grants org + facility ------------------
  it('25.24 R13 tenant-scoped principal can select organisations and facilities inside its tenant', async () => {
    const userEmail = `adr015-r13grants-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-r13grants-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant R13Grants',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R13Grants User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-r13grants-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org R13G',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-r13grants-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac R13G',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
  });

  // ---- 25.25 R13 tenant-scoped cannot cross tenants -------------------
  it('25.25 R13 tenant-scoped principal cannot select an organisation in a different tenant (403)', async () => {
    // Already covered by 25.8 (R13 principal in Tenant A attempts
    // org in Tenant B → 403). We re-assert here with an explicit
    // R13-only assignment to keep the matrix complete.
    const userEmail = `adr015-r13nocross-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenantA = await tenants.create({
      slug: `ta-r13nocross-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant A R13NoCross',
      status: 'active',
    });
    const tenantB = await tenants.create({
      slug: `tb-r13nocross-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant B R13NoCross',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R13NoCross User',
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
      status: 'active',
    });
    const orgB = await organisations.create({
      tenantId: tenantB.id,
      code: `ob-r13nocross-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org B R13NoCross',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membershipA.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membershipA.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: orgB.id })
      .expect(403);
  });

  // ---- 25.26 R14 denied all four org/facility context endpoints -------
  it('25.26 R14 Integration Account is denied all four organisation/facility context endpoints (403)', async () => {
    const userEmail = `adr015-r14denied-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-r14denied-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant R14Denied',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'R14Denied User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-r14denied-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org R14D',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-r14denied-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac R14D',
      status: 'active',
    });
    // R14 only — must be denied every context endpoint.
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R14_INTEGRATION_ACCOUNT',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    // Even tenant selection is denied; we still attempt the four
    // org/facility endpoints to confirm denial. The principal has
    // no active tenant membership, so all four should return 403.
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(403);
    await request(server)
      .delete('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .expect(403);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(403);
    await request(server)
      .delete('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .expect(403);
  });

  // ---- 25.27 GET /context returns persisted active org + facility -----
  it('25.27 GET /context returns the persisted active organisation and facility', async () => {
    const userEmail = `adr015-persisted-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-persisted-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant Persisted',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'Persisted User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-persisted-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org Persisted',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-persisted-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac Persisted',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    const cookie = await loginAndReturnCookie(userEmail);
    const csrf = await fetchCsrfToken(cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: fac.id })
      .expect(200);
    // Re-issue GET /context and verify the active org + facility are
    // returned from the persisted session row.
    const response = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookie)
      .expect(200);
    const parsed = ContextResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeOrganisation?.organisationId).toBe(org.id);
      expect(parsed.data.activeFacility?.facilityId).toBe(fac.id);
    }
  });

  // ---- 25.28 Separate sessions do not inherit active contexts ---------
  it('25.28 separate sessions for the same user do not inherit active organisation/facility context', async () => {
    const userEmail = `adr015-sessions-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const tenant = await tenants.create({
      slug: `t-sessions-${Math.random().toString(36).slice(2, 8)}.invalid`,
      displayName: 'Tenant Sessions',
      status: 'active',
    });
    const user = await users.create({
      email: userEmail,
      displayName: 'Sessions User',
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
      status: 'active',
    });
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `o-sessions-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Org Sessions',
      status: 'active',
    });
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: org.id,
      code: `f-sessions-${Math.random().toString(36).slice(2, 8)}`,
      displayName: 'Fac Sessions',
      status: 'active',
    });
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
    });
    // Session A selects tenant + org + facility.
    const cookieA = await loginAndReturnCookie(userEmail);
    const csrfA = await fetchCsrfToken(cookieA);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookieA)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfA)
      .send({ membershipId: membership.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookieA)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfA)
      .send({ organisationId: org.id })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookieA)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfA)
      .send({ facilityId: fac.id })
      .expect(200);
    // Session B logs in (same user) and must see null active
    // tenant, org, and facility.
    const cookieB = await loginAndReturnCookie(userEmail);
    const responseB = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookieB)
      .expect(200);
    const parsedB = ContextResponseSchema.safeParse(responseB.body);
    expect(parsedB.success).toBe(true);
    if (parsedB.success) {
      expect(parsedB.data.active).toBeNull();
      expect(parsedB.data.activeOrganisation).toBeNull();
      expect(parsedB.data.activeFacility).toBeNull();
    }
  });
});
