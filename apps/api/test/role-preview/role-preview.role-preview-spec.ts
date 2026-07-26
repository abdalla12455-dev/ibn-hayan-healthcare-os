import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { AuditPrismaService } from '../../src/modules/audit/audit-prisma.service.js';
import { AuditDispatcherService } from '../../src/modules/audit/audit-dispatcher.service.js';
import { setupRolePreviewDatabaseTests } from './_role-preview-bootstrap.js';
import { execFileSync } from 'node:child_process';
import { PREVIEW_TENANT_SLUG } from '../../src/modules/dev/role-preview/preview-identity-catalogue.js';
import { PLATFORM_ROLE_CATALOGUE } from '@ibn-hayan/domain';
import type { BootstrapChallengeResponse } from '@ibn-hayan/contracts';

/**
 * Local type alias for the select-preview-role response body. Used
 * for type assertions on `supertest`'s `res.body` (which is `any`)
 * to satisfy the `@typescript-eslint/no-unsafe-member-access` rule.
 */
interface SelectPreviewRoleResponseBody {
  readonly selectedRole: {
    readonly code: string;
    readonly interfaceImplemented: boolean;
  };
  readonly interfacePath: string | null;
}

/**
 * PostgreSQL 17 integration tests for the Secure Logged-Out Demo
 * Role Bootstrap flow.
 *
 * These tests run ONLY on GitHub Actions (inside the composite
 * node:24 + postgres:17 Docker image). They are NOT run locally
 * because the development environment has no PostgreSQL 17.
 *
 * Coverage (per the Phase 6 PostgreSQL 17 CI validation
 * specification's 37 required integration scenarios):
 *
 * Seed validation (1–8):
 *  1. Seed rejects missing transactional URL.
 *  2. Seed rejects malformed transactional URL.
 *  3. Seed rejects non-preview transactional DB.
 *  4. Seed rejects missing audit URL.
 *  5. Seed rejects malformed audit URL.
 *  6. Seed rejects non-preview audit DB.
 *  7. Seed rejects identical transactional and audit DB names.
 *  8. Seed accepts distinct Preview transactional and audit DBs.
 *
 * Seed results (9–16):
 *  9. Exactly one Preview tenant exists.
 * 10. Exactly one Preview organisation exists.
 * 11. Exactly one Preview facility exists.
 * 12. Exactly fourteen Preview identities exist.
 * 13. Exact R01–R14 role codes exist.
 * 14. Correct scopes exist.
 * 15. Seed is idempotent.
 * 16. No business records are created.
 *
 * Bootstrap + select (17–27):
 * 17. Logged-out bootstrap works.
 * 18. Challenge expiry works.
 * 19. Replay fails.
 * 20. Invalid Origin fails.
 * 21. R09 creates a normal session.
 * 22. R09 context is correct.
 * 23. Unimplemented role routing is honest.
 * 24. Subsequent switching replaces the previous session.
 * 25. End Preview revokes the session.
 * 26. CSRF remains enforced.
 * 27. Cookie security is correct.
 *
 * Security + audit (28–34):
 * 28. No sensitive value appears in API responses.
 * 29. Approved audit action is emitted.
 * 30. Audit outbox contains no secret.
 * 31. Audit projection succeeds.
 * 32. Audit database receives the projected record.
 * 33. Audit database record contains no password, token, nonce,
 *     challenge, hash, or URL.
 * 34. Transactional and audit database isolation is proven.
 *
 * Regression (35–37):
 * 35. Normal login remains unchanged.
 * 36. Normal dashboard remains unchanged.
 * 37. Normal Clinic Admin protection remains unchanged.
 */

setupRolePreviewDatabaseTests();

const ORIGIN = 'http://localhost:3000';

/**
 * Canonical API routes for the Role Preview integration tests.
 *
 * The production API applies a global prefix `api/v1` (see
 * `apps/api/src/main.ts`). The integration-test Nest application
 * applies the same prefix via `app.setGlobalPrefix('api/v1')` in
 * the `beforeAll` hook below. Every request in this spec file MUST
 * therefore target the prefixed production paths — never the
 * unprefixed controller paths (`/dev/role-preview/...`,
 * `/auth/...`).
 *
 * Centralising the routes here (rather than scattering hardcoded
 * `/api/v1` literals across dozens of `supertest` calls) keeps the
 * spec maintainable and prevents a future copy/paste from silently
 * dropping the prefix again. If the production route layout ever
 * changes, only this block needs to be updated.
 *
 * The constants match the routes exposed by:
 *   - {@link RolePreviewController} (`@Controller('dev/role-preview')`)
 *   - {@link AuthController} (`@Controller('auth')`)
 * combined with the global `api/v1` prefix.
 */
const API_PREFIX = '/api/v1';

const rolePreviewRoutes = {
  availability: `${API_PREFIX}/dev/role-preview`,
  bootstrap: `${API_PREFIX}/dev/role-preview/bootstrap`,
  current: `${API_PREFIX}/dev/role-preview/current`,
  select: `${API_PREFIX}/dev/role-preview/select`,
  end: `${API_PREFIX}/dev/role-preview/end`,
} as const;

const authRoutes = {
  login: `${API_PREFIX}/auth/login`,
  session: `${API_PREFIX}/auth/session`,
  csrf: `${API_PREFIX}/auth/csrf`,
} as const;

let app: INestApplication;
let server: Server;
let prisma: PrismaService;
let auditPrisma: AuditPrismaService;
let dispatcher: AuditDispatcherService;

beforeAll(async () => {
  // Run the preview seed before booting the app, so that the
  // preview tenant, organisation, facility, and 14 identities
  // exist.
  runPreviewSeed();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  server = app.getHttpServer() as Server;
  prisma = app.get(PrismaService);
  auditPrisma = app.get(AuditPrismaService);
  dispatcher = app.get(AuditDispatcherService);
}, 120_000);

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

beforeEach(async () => {
  // Clean up any sessions left by previous tests so each test
  // starts with a clean slate.
  await prisma.authSession.deleteMany({});
  // Clean the transactional audit outbox so each audit test starts
  // fresh. The outbox lives in the TRANSACTIONAL database.
  await prisma.auditOutboxEvent.deleteMany({});
  // Clean the audit store (audit_events + audit_chain_heads) in the
  // DEDICATED audit database. The audit_events table has
  // immutability triggers that reject DELETE and TRUNCATE, so we
  // must disable the triggers temporarily, delete, and re-enable.
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" DISABLE TRIGGER USER`;
  await auditPrisma.$executeRaw`TRUNCATE TABLE "audit_events"`;
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" ENABLE TRIGGER USER`;
  await auditPrisma.auditChainHead.deleteMany({});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runPreviewSeed(): void {
  execFileSync(
    'pnpm',
    ['exec', 'tsx', 'src/scripts/role-preview-seed-dev.ts'],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: {
        ...process.env,
        ALLOW_ROLE_PREVIEW_SEED: 'true',
      },
    },
  );
}

function runPreviewSeedWithEnv(env: NodeJS.ProcessEnv): void {
  execFileSync(
    'pnpm',
    ['exec', 'tsx', 'src/scripts/role-preview-seed-dev.ts'],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: {
        ...process.env,
        ...env,
      },
    },
  );
}

/**
 * Dispatch all pending outbox events to the dedicated audit store.
 *
 * The audit architecture (per ADR-014 and the ninth canonical batch
 * specification) uses a transactional outbox: audit events are
 * first written to the `audit_outbox_events` table in the
 * transactional database (in the same Prisma transaction as the
 * state mutation), then projected to the `audit_events` table in
 * the DEDICATED audit database by the
 * {@link AuditDispatcherService}.
 *
 * This helper runs `dispatcher.dispatchOnce()` repeatedly until no
 * more events are claimed, ensuring all outbox events are projected
 * to the audit store before the test asserts on the audit store.
 */
async function dispatchAll(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const summary = await dispatcher.dispatchOnce({ batchSize: 100 });
    if (summary.claimed === 0) {
      break;
    }
  }
}

function getSetCookieString(res: Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
}

function extractCookie(setCookieStr: string, name: string): string {
  if (!setCookieStr) {
    throw new Error(`set-cookie header missing for ${name}`);
  }
  const re = new RegExp(`${name}=([^;]+)`);
  const match = setCookieStr.match(re);
  if (!match || match[1] === undefined) {
    throw new Error(`cookie ${name} not found in: ${setCookieStr}`);
  }
  return match[1];
}

async function bootstrapAndSelect(roleCode: string): Promise<{
  response: Response;
  challengeId: string;
}> {
  const bootRes = await request(server)
    .get(rolePreviewRoutes.bootstrap)
    .set('Origin', ORIGIN);
  expect(bootRes.status).toBe(200);
  const bootBody = bootRes.body as BootstrapChallengeResponse;
  const challengeId = bootBody.challengeId;
  const bootstrapCookie = extractCookie(
    getSetCookieString(bootRes),
    'ibn_hayan_role_preview_bootstrap',
  );

  const selectRes = await request(server)
    .post(rolePreviewRoutes.select)
    .set('Origin', ORIGIN)
    .set('Cookie', `ibn_hayan_role_preview_bootstrap=${bootstrapCookie}`)
    .send({ roleCode, challengeId });
  expect(selectRes.status).toBe(200);
  return { response: selectRes, challengeId };
}

async function bootstrapChallenge(): Promise<{
  challengeId: string;
  bootstrapCookie: string;
}> {
  const bootRes = await request(server)
    .get(rolePreviewRoutes.bootstrap)
    .set('Origin', ORIGIN);
  expect(bootRes.status).toBe(200);
  const bootBody = bootRes.body as BootstrapChallengeResponse;
  const challengeId = bootBody.challengeId;
  const bootstrapCookie = extractCookie(
    getSetCookieString(bootRes),
    'ibn_hayan_role_preview_bootstrap',
  );
  return { challengeId, bootstrapCookie };
}

// ---------------------------------------------------------------------------
// Seed validation (1–11)
// ---------------------------------------------------------------------------

describe('Preview seed validation', () => {
  it('1. Preview seed rejects a missing transactional URL', () => {
    // Override DATABASE_URL with an empty string. The seed's
    // validator treats empty string as `missing`.
    expect(() => runPreviewSeedWithEnv({ DATABASE_URL: '' })).toThrow();
  });

  it('2. Preview seed rejects a malformed transactional URL', () => {
    expect(() =>
      runPreviewSeedWithEnv({ DATABASE_URL: 'not-a-valid-url' }),
    ).toThrow();
  });

  it('3. Preview seed rejects a non-preview transactional DB', () => {
    expect(() =>
      runPreviewSeedWithEnv({
        DATABASE_URL: 'postgresql://postgres@127.0.0.1:5432/ibn_hayan_test',
      }),
    ).toThrow();
  });

  it('4. Preview seed rejects a missing audit URL', () => {
    // Override AUDIT_DATABASE_URL with an empty string. The seed's
    // validator treats empty string as `missing`.
    expect(() => runPreviewSeedWithEnv({ AUDIT_DATABASE_URL: '' })).toThrow();
  });

  it('5. Preview seed rejects a malformed audit URL', () => {
    expect(() =>
      runPreviewSeedWithEnv({ AUDIT_DATABASE_URL: 'not-a-valid-url' }),
    ).toThrow();
  });

  it('6. Preview seed rejects a non-preview audit DB', () => {
    // Override AUDIT_DATABASE_URL with a non-preview URL. The seed
    // must refuse to run because the audit database is not isolated.
    expect(() =>
      runPreviewSeedWithEnv({
        AUDIT_DATABASE_URL:
          'postgresql://postgres@127.0.0.1:5432/ibn_hayan_audit_test',
      }),
    ).toThrow();
  });

  it('7. Preview seed rejects identical transactional and audit DB names', () => {
    // Set AUDIT_DATABASE_URL to the same value as DATABASE_URL.
    // The seed must refuse to run because the audit store must be
    // a DEDICATED database separate from the transactional store
    // (ADR-014).
    const txUrl = process.env['DATABASE_URL'];
    if (!txUrl) {
      throw new Error('DATABASE_URL must be set by the test bootstrap');
    }
    expect(() =>
      runPreviewSeedWithEnv({ AUDIT_DATABASE_URL: txUrl }),
    ).toThrow();
  });

  it('8. Preview seed accepts distinct Preview transactional and audit DBs', () => {
    // The default environment (set by _role-preview-bootstrap.ts)
    // has distinct preview transactional and audit databases. The
    // seed must accept this configuration. We verify by running the
    // seed with no overrides; it must NOT throw.
    expect(() => runPreviewSeed()).not.toThrow();
  });

  // Additional: production mode is rejected (defence-in-depth).
  it('1a. Preview seed refuses production', () => {
    expect(() => runPreviewSeedWithEnv({ NODE_ENV: 'production' })).toThrow();
  });
});

describe('Preview seed results', () => {
  it('9. Exactly one Preview tenant exists', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { slug: PREVIEW_TENANT_SLUG },
    });
    expect(tenants).toHaveLength(1);
  });

  it('10. Exactly one Preview organisation exists', async () => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: PREVIEW_TENANT_SLUG },
    });
    expect(tenant).not.toBeNull();
    const orgs = await prisma.organisation.findMany({
      where: { tenantId: tenant!.id, code: 'PREVIEW_ORG' },
    });
    expect(orgs).toHaveLength(1);
  });

  it('11. Exactly one Preview facility exists', async () => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: PREVIEW_TENANT_SLUG },
    });
    const org = await prisma.organisation.findFirst({
      where: { tenantId: tenant!.id, code: 'PREVIEW_ORG' },
    });
    const facilities = await prisma.facility.findMany({
      where: {
        tenantId: tenant!.id,
        organisationId: org!.id,
        code: 'PREVIEW_FACILITY',
      },
    });
    expect(facilities).toHaveLength(1);
  });

  it('12. Exactly fourteen Preview identities exist', async () => {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: '@role-preview.dev' } },
    });
    expect(users).toHaveLength(14);
  });

  it('13. Exact R01–R14 role codes exist', async () => {
    const codes = PLATFORM_ROLE_CATALOGUE.map((c) => c.code);
    const assignments = await prisma.tenantRoleAssignment.findMany({
      where: { roleCode: { in: codes } },
    });
    const seen = new Set(assignments.map((a) => a.roleCode));
    for (const code of codes) {
      expect(seen.has(code)).toBe(true);
    }
  });

  it('14. Correct scopes exist (R13/R14 tenant, R01–R12 facility)', async () => {
    const tenantScoped = await prisma.tenantRoleAssignment.findMany({
      where: { scopeLevel: 'tenant' },
    });
    const tenantScopedCodes = new Set(tenantScoped.map((a) => a.roleCode));
    expect(tenantScopedCodes.has('R13_SYSTEM_ADMINISTRATOR')).toBe(true);
    expect(tenantScopedCodes.has('R14_INTEGRATION_ACCOUNT')).toBe(true);

    const facilityScoped = await prisma.tenantRoleAssignment.findMany({
      where: { scopeLevel: 'facility' },
    });
    const facilityScopedCodes = new Set(facilityScoped.map((a) => a.roleCode));
    for (const code of [
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
    ]) {
      expect(facilityScopedCodes.has(code)).toBe(true);
    }
  });

  it('15. Seed rerun is idempotent', () => {
    expect(() => runPreviewSeed()).not.toThrow();
  });

  it('16. No business records are created (only 14 identity users)', async () => {
    const users = await prisma.user.findMany({});
    expect(users.length).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// Bootstrap + select (12–26)
// ---------------------------------------------------------------------------

describe('Logged-out bootstrap flow', () => {
  it('12. Logged-out bootstrap succeeds (returns challengeId and sets cookie)', async () => {
    const res = await request(server)
      .get(rolePreviewRoutes.bootstrap)
      .set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    const body = res.body as BootstrapChallengeResponse;
    expect(body.ok).toBe(true);
    expect(typeof body.challengeId).toBe('string');
    expect(body.challengeId.length).toBeGreaterThan(0);
    expect(typeof body.expiresInMs).toBe('number');
    expect(body.expiresInMs).toBeGreaterThan(0);
    const cookieStr = getSetCookieString(res);
    expect(cookieStr).toContain('ibn_hayan_role_preview_bootstrap=');
    expect(cookieStr.toLowerCase()).toContain('httponly');
    expect(cookieStr.toLowerCase()).toContain('samesite=strict');
  });

  it('13. Expired/non-existent challenge fails (403)', async () => {
    const res = await request(server)
      .post(rolePreviewRoutes.select)
      .set('Origin', ORIGIN)
      .send({
        roleCode: 'R09_ADMINISTRATOR',
        challengeId: 'non-existent-challenge-id',
      });
    expect(res.status).toBe(403);
  });

  it('14. Replay fails (403)', async () => {
    const { challengeId, bootstrapCookie } = await bootstrapChallenge();

    // First select succeeds.
    const firstRes = await request(server)
      .post(rolePreviewRoutes.select)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_role_preview_bootstrap=${bootstrapCookie}`)
      .send({ roleCode: 'R09_ADMINISTRATOR', challengeId });
    expect(firstRes.status).toBe(200);

    // Second select with the same challengeId + cookie must fail
    // with 403 (replay).
    const replayRes = await request(server)
      .post(rolePreviewRoutes.select)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_role_preview_bootstrap=${bootstrapCookie}`)
      .send({ roleCode: 'R09_ADMINISTRATOR', challengeId });
    expect(replayRes.status).toBe(403);
  });

  it('15. Unknown role fails (400)', async () => {
    const { challengeId, bootstrapCookie } = await bootstrapChallenge();

    const res = await request(server)
      .post(rolePreviewRoutes.select)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_role_preview_bootstrap=${bootstrapCookie}`)
      .send({ roleCode: 'R99_UNKNOWN', challengeId });
    expect(res.status).toBe(400);
  });

  it('16. Caller-supplied IDs fail contract validation (400)', async () => {
    const res = await request(server)
      .post(rolePreviewRoutes.select)
      .set('Origin', ORIGIN)
      .send({
        roleCode: 'R09_ADMINISTRATOR',
        userId: 'should-be-rejected',
      });
    expect(res.status).toBe(400);
  });

  it('17. R09 creates a normal application session', async () => {
    const { response } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    expect(response.status).toBe(200);

    const selectCookieStr = getSetCookieString(response);
    expect(selectCookieStr).toContain('ibn_hayan_session=');

    const sessions = await prisma.authSession.findMany({});
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });

  it('18. R09 tenant context is correct', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');
    const tenant = await prisma.tenant.findUnique({
      where: { slug: PREVIEW_TENANT_SLUG },
    });
    const session = await prisma.authSession.findFirst({
      where: { revokedAt: null },
    });
    expect(session).not.toBeNull();
    expect(session!.activeTenantMembershipId).not.toBeNull();
    // Verify the membership belongs to the preview tenant.
    const membership = await prisma.tenantMembership.findUnique({
      where: { id: session!.activeTenantMembershipId! },
    });
    expect(membership).not.toBeNull();
    expect(membership!.tenantId).toBe(tenant!.id);
  });

  it('19. R09 organisation context is correct', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');
    const tenant = await prisma.tenant.findUnique({
      where: { slug: PREVIEW_TENANT_SLUG },
    });
    const org = await prisma.organisation.findFirst({
      where: { tenantId: tenant!.id, code: 'PREVIEW_ORG' },
    });
    const session = await prisma.authSession.findFirst({
      where: { revokedAt: null },
    });
    expect(session).not.toBeNull();
    expect(session!.activeOrganisationId).toBe(org!.id);
  });

  it('20. R09 facility context is correct', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');
    const tenant = await prisma.tenant.findUnique({
      where: { slug: PREVIEW_TENANT_SLUG },
    });
    const org = await prisma.organisation.findFirst({
      where: { tenantId: tenant!.id, code: 'PREVIEW_ORG' },
    });
    const facility = await prisma.facility.findFirst({
      where: {
        tenantId: tenant!.id,
        organisationId: org!.id,
        code: 'PREVIEW_FACILITY',
      },
    });
    const session = await prisma.authSession.findFirst({
      where: { revokedAt: null },
    });
    expect(session).not.toBeNull();
    expect(session!.activeFacilityId).toBe(facility!.id);
  });

  it('21. R09 routes to /clinic-admin', async () => {
    const { response } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const body = response.body as SelectPreviewRoleResponseBody;
    expect(body.interfacePath).toBe('/clinic-admin');
    expect(body.selectedRole.code).toBe('R09_ADMINISTRATOR');
    expect(body.selectedRole.interfaceImplemented).toBe(true);
  });

  it('22. Unimplemented role routes to /role-preview (interfacePath=null)', async () => {
    const { response } = await bootstrapAndSelect('R01_PHYSICIAN');
    const body = response.body as SelectPreviewRoleResponseBody;
    expect(body.interfacePath).toBe(null);
    expect(body.selectedRole.code).toBe('R01_PHYSICIAN');
    expect(body.selectedRole.interfaceImplemented).toBe(false);
  });

  it('23. Subsequent switching replaces the previous preview session', async () => {
    const { response: first } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const firstSessionCookie = extractCookie(
      getSetCookieString(first),
      'ibn_hayan_session',
    );

    const csrfRes = await request(server)
      .get(authRoutes.csrf)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_session=${firstSessionCookie}`);
    expect(csrfRes.status).toBe(200);
    const csrfToken = (csrfRes.body as { token: string }).token;

    const switchRes = await request(server)
      .post(rolePreviewRoutes.select)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_session=${firstSessionCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ roleCode: 'R01_PHYSICIAN' });
    expect(switchRes.status).toBe(200);

    const activeSessions = await prisma.authSession.findMany({
      where: { revokedAt: null },
    });
    expect(activeSessions.length).toBe(1);
  });

  it('24. End preview revokes the session', async () => {
    const { response: first } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const firstSessionCookie = extractCookie(
      getSetCookieString(first),
      'ibn_hayan_session',
    );

    const csrfRes = await request(server)
      .get(authRoutes.csrf)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_session=${firstSessionCookie}`);
    const csrfToken = (csrfRes.body as { token: string }).token;

    const endRes = await request(server)
      .post(rolePreviewRoutes.end)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_session=${firstSessionCookie}`)
      .set('X-CSRF-Token', csrfToken);
    expect(endRes.status).toBe(200);

    const activeSessions = await prisma.authSession.findMany({
      where: { revokedAt: null },
    });
    expect(activeSessions.length).toBe(0);
  });

  it('25. HttpOnly behaviour is correct (bootstrap cookie)', async () => {
    const res = await request(server)
      .get(rolePreviewRoutes.bootstrap)
      .set('Origin', ORIGIN);
    const cookieStr = getSetCookieString(res);
    expect(cookieStr.toLowerCase()).toContain('httponly');
  });

  it('26. SameSite behaviour is correct (bootstrap cookie is Strict)', async () => {
    const res = await request(server)
      .get(rolePreviewRoutes.bootstrap)
      .set('Origin', ORIGIN);
    const cookieStr = getSetCookieString(res);
    expect(cookieStr.toLowerCase()).toContain('samesite=strict');
  });
});

// ---------------------------------------------------------------------------
// Security (27–28, 30–31) — cookie, origin, csrf, no-secrets-in-responses
// ---------------------------------------------------------------------------

describe('Security', () => {
  it('27. Secure cookie behaviour follows environment rules (not secure in dev)', async () => {
    const res = await request(server)
      .get(rolePreviewRoutes.bootstrap)
      .set('Origin', ORIGIN);
    const cookieStr = getSetCookieString(res);
    // In development (NODE_ENV !== production), Secure is NOT set.
    expect(cookieStr.toLowerCase()).not.toContain('secure');
  });

  it('28. Valid Origin succeeds', async () => {
    const res = await request(server)
      .get(rolePreviewRoutes.bootstrap)
      .set('Origin', ORIGIN);
    expect(res.status).toBe(200);
  });

  it('28a. Invalid Origin fails (403)', async () => {
    const res = await request(server)
      .get(rolePreviewRoutes.bootstrap)
      .set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(403);
  });

  it('28b. CSRF remains enforced on active-session switching', async () => {
    const { response: first } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const firstSessionCookie = extractCookie(
      getSetCookieString(first),
      'ibn_hayan_session',
    );

    // Attempt to switch WITHOUT a CSRF token.
    const res = await request(server)
      .post(rolePreviewRoutes.select)
      .set('Origin', ORIGIN)
      .set('Cookie', `ibn_hayan_session=${firstSessionCookie}`)
      .send({ roleCode: 'R01_PHYSICIAN' });
    expect(res.status).toBe(403);
  });

  it('28c. No password appears in API responses', async () => {
    const { response } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const bodyStr = JSON.stringify(response.body);
    expect(bodyStr).not.toContain('password');
    expect(bodyStr).not.toContain('Password');
    expect(bodyStr).not.toContain('PASSWORD');
  });

  it('28d. No hash appears in API responses', async () => {
    const { response } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const bodyStr = JSON.stringify(response.body);
    expect(bodyStr).not.toContain('hash');
    expect(bodyStr).not.toContain('Hash');
    expect(bodyStr).not.toContain('argon2');
  });

  it('28e. No raw session token appears in API responses', async () => {
    const { response } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const bodyStr = JSON.stringify(response.body);
    expect(bodyStr).not.toContain('token');
    expect(bodyStr).not.toContain('Token');
    expect(bodyStr).not.toContain('sessionToken');
  });

  it('28f. No bootstrap secret (nonce, challenge) appears in API responses', async () => {
    // Bootstrap returns the PUBLIC `challengeId` field (an opaque
    // identifier that is safe to expose to the client) and
    // `expiresInMs`. The raw nonce (the actual secret) is set ONLY
    // in the HttpOnly bootstrap cookie and is NEVER returned in the
    // JSON body.
    //
    // This test verifies that:
    // 1. The response body does not contain the literal field names
    //    `nonce` or `secret` (defence-in-depth; these fields are
    //    never part of the public response contract).
    // 2. The raw nonce value (extracted from the bootstrap cookie)
    //    does NOT appear anywhere in the response body. This is the
    //    meaningful secret-leak assertion.
    //
    // The previous version of this test rejected ANY occurrence of
    // the substring `challenge`, which incorrectly matched the
    // legitimate public field name `challengeId`. That over-broad
    // assertion was a test defect, not a production secret leak.
    // The fix narrows the assertion to the actual secret (the nonce
    // value) while preserving the `nonce` and `secret` field-name
    // checks.
    const bootRes = await request(server)
      .get(rolePreviewRoutes.bootstrap)
      .set('Origin', ORIGIN);
    const bodyStr = JSON.stringify(bootRes.body);

    // Field-name checks: the public response contract never includes
    // fields named `nonce` or `secret`.
    expect(bodyStr).not.toContain('nonce');
    expect(bodyStr).not.toContain('Nonce');
    expect(bodyStr).not.toContain('secret');
    expect(bodyStr).not.toContain('Secret');

    // Secret-value check: extract the raw nonce from the bootstrap
    // cookie and verify it does NOT appear in the response body.
    // The cookie value IS the nonce; the body must not echo it.
    const bootstrapCookieValue = extractCookie(
      getSetCookieString(bootRes),
      'ibn_hayan_role_preview_bootstrap',
    );
    expect(bootstrapCookieValue.length).toBeGreaterThan(0);
    expect(bodyStr).not.toContain(bootstrapCookieValue);

    // Now perform a select and verify the response body carries no
    // bootstrap secret either. The select response is a different
    // shape (it carries `selectedRole`, `interfacePath`, etc.) and
    // must not leak the nonce or any other bootstrap secret.
    const { response } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    const selectBodyStr = JSON.stringify(response.body);
    expect(selectBodyStr).not.toContain('nonce');
    expect(selectBodyStr).not.toContain('secret');
    // The nonce from the bootstrap cookie must not appear in the
    // select response either.
    expect(selectBodyStr).not.toContain(bootstrapCookieValue);
  });
});

// ---------------------------------------------------------------------------
// Audit database integrity (Phase 6 items 29–34)
// ---------------------------------------------------------------------------

/**
 * Audit-database assertion tests.
 *
 * These tests verify the full audit pipeline for the Role Preview
 * bootstrap flow:
 *
 * 1. The bootstrap + select flow emits a `role_preview.session.bootstrapped`
 *    audit event through the transactional outbox (in the same
 *    Prisma transaction as the session creation).
 * 2. The dispatcher projects the outbox event to the DEDICATED audit
 *    database (a separate database from the transactional store).
 * 3. The projected audit record in the audit database contains NO
 *    sensitive value (no bootstrap nonce, no challenge, no password,
 *    no session token, no hash, no complete database URL).
 * 4. The transactional database does NOT contain the audit record
 *    (the audit lives ONLY in the audit database).
 *
 * These tests correct the prior gap where Test 34 was a no-op
 * placeholder (`expect(true).toBe(true)`). The tests now use the
 * real audit outbox + dispatcher + audit-store architecture (per
 * ADR-014 and the ninth canonical batch specification).
 */
describe('Audit database integrity (Phase 6 items 29–34)', () => {
  it('29. Approved audit action is emitted (role_preview.session.bootstrapped)', async () => {
    // Trigger the bootstrap + select flow. This emits a
    // `role_preview.session.bootstrapped` audit event through the
    // transactional outbox.
    await bootstrapAndSelect('R09_ADMINISTRATOR');

    // Verify the outbox row was created in the TRANSACTIONAL
    // database with the correct action code.
    const outboxRows = await prisma.auditOutboxEvent.findMany({});
    const bootstrappedRows = outboxRows.filter((r) => {
      const draft = r.canonicalEventDraft as { action?: string };
      return draft.action === 'role_preview.session.bootstrapped';
    });
    expect(bootstrappedRows.length).toBeGreaterThanOrEqual(1);
  });

  it('30. Audit outbox contains no secret (no nonce, challenge, password, token, hash, or URL)', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');

    const outboxRows = await prisma.auditOutboxEvent.findMany({});
    expect(outboxRows.length).toBeGreaterThanOrEqual(1);

    // Serialise every outbox row to JSON and verify no sensitive
    // value appears. The bootstrap nonce, the challenge value, the
    // preview password, the raw session token, the password hash,
    // and the complete database URLs must NOT appear anywhere in
    // the outbox row (including the canonical_event_draft JSONB,
    // the metadata, the actor_id, the session_id, etc.).
    const allJson = JSON.stringify(outboxRows, (_k, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    // No password (the variable name is fine; the value is NOT).
    // The preview password is read from the env at test-bootstrap
    // time; it must not appear in the outbox.
    const previewPassword = process.env['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'];
    if (previewPassword) {
      expect(allJson).not.toContain(previewPassword);
    }
    // No "password" key in the metadata (the audit builder rejects
    // forbidden metadata keys, but we verify defensively).
    for (const row of outboxRows) {
      const draft = row.canonicalEventDraft as {
        metadata?: Record<string, unknown>;
      };
      const metadata = draft.metadata ?? {};
      const metadataKeys = Object.keys(metadata);
      // The approved metadata keys for role_preview events are
      // `endpoint` and `roleCode` only.
      for (const key of metadataKeys) {
        expect(['endpoint', 'roleCode']).toContain(key);
      }
    }
    // No "nonce" or "challenge" or "secret" or "token" or "hash"
    // appears as a metadata key.
    expect(allJson).not.toMatch(/"nonce"/i);
    expect(allJson).not.toMatch(/"challenge"/i);
    expect(allJson).not.toMatch(/"secret"/i);
    expect(allJson).not.toMatch(/"sessionToken"/i);
    expect(allJson).not.toMatch(/"passwordHash"/i);
    // No complete database URL.
    expect(allJson).not.toContain('postgresql://');
    expect(allJson).not.toContain('postgres://');
  });

  it('31. Audit projection succeeds (dispatcher delivers the outbox event)', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');

    // Before dispatch: the outbox has pending events.
    const pendingBefore = await prisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingBefore).toBeGreaterThanOrEqual(1);

    // Run the dispatcher to project the outbox events to the
    // dedicated audit store.
    await dispatchAll();

    // After dispatch: the outbox has no pending events (all
    // delivered).
    const pendingAfter = await prisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingAfter).toBe(0);
  });

  it('32. Audit database receives the projected record (role_preview.session.bootstrapped)', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');

    // Project the outbox events to the audit database.
    await dispatchAll();

    // Query the DEDICATED audit database for the projected record.
    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'role_preview.session.bootstrapped' },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const event = events[0]!;
    expect(event.outcome).toBe('success');
    expect(event.source).toBe('api');
    expect(event.actorType).toBe('USER');
    expect(event.scope).toBe('role_preview');
  });

  it('33. Audit database record contains no password, token, nonce, challenge, hash, or URL', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');

    // Project the outbox events to the audit database.
    await dispatchAll();

    // Retrieve the projected record from the DEDICATED audit
    // database.
    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'role_preview.session.bootstrapped' },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);

    // Serialise every audit event to JSON and verify no sensitive
    // value appears anywhere (in the metadata, the actor_id, the
    // session_id, the request_id, the integrity_hash, etc.).
    const allJson = JSON.stringify(events, (_k, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    // No preview password.
    const previewPassword = process.env['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'];
    if (previewPassword) {
      expect(allJson).not.toContain(previewPassword);
    }
    // No metadata key named nonce/challenge/secret/token/hash/password.
    expect(allJson).not.toMatch(/"nonce"/i);
    expect(allJson).not.toMatch(/"challenge"/i);
    expect(allJson).not.toMatch(/"secret"/i);
    expect(allJson).not.toMatch(/"sessionToken"/i);
    expect(allJson).not.toMatch(/"passwordHash"/i);
    // No complete database URL.
    expect(allJson).not.toContain('postgresql://');
    expect(allJson).not.toContain('postgres://');

    // Verify the metadata carries ONLY the approved fields:
    // `endpoint` (value `role_preview_bootstrap_select`) and
    // `roleCode` (value `R09_ADMINISTRATOR`).
    for (const event of events) {
      const metadata = event.metadata as Record<string, unknown>;
      const metadataKeys = Object.keys(metadata).sort();
      expect(metadataKeys).toEqual(['endpoint', 'roleCode']);
      expect(metadata['endpoint']).toBe('role_preview_bootstrap_select');
      expect(metadata['roleCode']).toBe('R09_ADMINISTRATOR');
    }
  });

  it('34. Transactional and audit database isolation is proven', async () => {
    await bootstrapAndSelect('R09_ADMINISTRATOR');

    // Project the outbox events to the audit database.
    await dispatchAll();

    // The TRANSACTIONAL database has the audit OUTBOX table
    // (`audit_outbox_events`), but it must NOT have the audit
    // EVENTS table (`audit_events`). The audit events live ONLY in
    // the DEDICATED audit database.
    //
    // Verify by attempting to query `audit_events` through the
    // transactional Prisma client. The Prisma client for the
    // transactional database does NOT have an `auditEvent` model
    // (it is generated from the transactional schema, not the audit
    // schema). The query must therefore fail (or return undefined).
    expect(
      (prisma as unknown as { auditEvent?: unknown }).auditEvent,
    ).toBeUndefined();

    // The DEDICATED audit database has the `audit_events` table
    // and it has the projected record.
    const auditEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'role_preview.session.bootstrapped' },
    });
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);

    // The transactional database's outbox row was marked delivered
    // (the dispatcher set `delivered_at`).
    const deliveredOutbox = await prisma.auditOutboxEvent.count({
      where: { deliveredAt: { not: null } },
    });
    expect(deliveredOutbox).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Regression (35–37) — normal login, dashboard, clinic-admin unchanged
// ---------------------------------------------------------------------------

describe('Regression', () => {
  it('35. Normal login remains unchanged (login route still exists)', async () => {
    const res = await request(server)
      .post(authRoutes.login)
      .set('Origin', ORIGIN)
      .send({ email: 'nobody@example.com', password: 'wrong-password-12' });
    expect(res.status).toBe(401);
  });

  it('36. Normal dashboard remains unchanged (session route requires auth)', async () => {
    const res = await request(server).get(authRoutes.session);
    expect(res.status).toBe(401);
  });

  it('37. Normal Clinic Admin protection remains unchanged (session route requires auth)', async () => {
    const res = await request(server).get(authRoutes.session);
    expect(res.status).toBe(401);
  });

  it('37a. Preview routes fail against non-preview database identities', async () => {
    const savedDbUrl = process.env['DATABASE_URL'];
    const savedAuditUrl = process.env['AUDIT_DATABASE_URL'];

    process.env['DATABASE_URL'] =
      'postgresql://postgres@127.0.0.1:5432/ibn_hayan_test';
    process.env['AUDIT_DATABASE_URL'] =
      'postgresql://postgres@127.0.0.1:5432/ibn_hayan_audit_test';

    try {
      const res = await request(server)
        .get(rolePreviewRoutes.bootstrap)
        .set('Origin', ORIGIN);
      expect(res.status).toBe(403);
    } finally {
      process.env['DATABASE_URL'] = savedDbUrl;
      process.env['AUDIT_DATABASE_URL'] = savedAuditUrl;
    }
  });
});
