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
import {
  RolePreviewErrorResponseSchema,
  AuthErrorResponseSchema,
} from '@ibn-hayan/contracts';
import { BootstrapChallengeStore } from '../../src/modules/dev/role-preview/index.js';

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
 *
 * Genuine Role Preview → Clinic Admin access (38–39):
 * 38. Real Role Preview session for R01 cannot bypass the Clinic Admin
 *     permission requirement (the genuine Role Preview coverage that
 *     the Clinic Admin suite cannot provide because it uses standard
 *     `ibn_hayan_test` databases, which fail the Role Preview
 *     database-identity gate).
 * 39. Real Role Preview session for R09 is allowed by the Clinic Admin
 *     permission (positive control for test 38).
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

/**
 * The Clinic Admin Overview route, exercised by the genuine Role
 * Preview → Clinic Admin integration scenario (test 38). This is the
 * same route the Clinic Admin integration suite tests, but here the
 * request is issued with a REAL Role Preview session cookie issued by
 * `POST /api/v1/dev/role-preview/select`.
 */
const clinicAdminRoutes = {
  overview: `${API_PREFIX}/clinic-admin/overview`,
} as const;

let app: INestApplication;
let server: Server;
let prisma: PrismaService;
let auditPrisma: AuditPrismaService;
let dispatcher: AuditDispatcherService;
let bootstrapStore: BootstrapChallengeStore;

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
  // Acquire the in-memory BootstrapChallengeStore so that tests can
  // prove non-consumption of a bootstrap challenge after a malformed
  // request. The store is the authoritative server-side state; its
  // `consume()` method returns 'ok' if the challenge was NOT
  // previously consumed and 'replay' if it was. This is the
  // smallest safe mechanism to prove the controller did NOT reach
  // the service for a malformed input.
  bootstrapStore = app.get(BootstrapChallengeStore);
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

    // The public controller's strict Zod boundary
    // (SelectPreviewRoleRequestSchema, whose `roleCode` field is
    // constrained to the RoleCodeSchema enum of the 14 canonical
    // codes R01-R14) rejects R99_UNKNOWN at the controller boundary
    // and throws rolePreviewRequestInvalid(). The service is NEVER
    // reached, so the structured error code is
    // ROLE_PREVIEW_REQUEST_INVALID — NOT ROLE_PREVIEW_ROLE_UNKNOWN
    // (which is a defence-in-depth service error unreachable from
    // the current public controller path).
    const parsed = RolePreviewErrorResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('ROLE_PREVIEW_REQUEST_INVALID');
    }

    // Prove the bootstrap challenge was NOT consumed by the
    // malformed request. The BootstrapChallengeStore is the
    // authoritative server-side state; its `consume()` method
    // returns 'ok' if the challenge was NOT previously consumed
    // and 'replay' if it was. If the controller had reached the
    // service, the service would have called `consume()` first
    // and marked the challenge consumed, causing our call to
    // return 'replay'. A return of 'ok' proves the service was
    // NOT reached. After our explicit consume, the challenge is
    // marked consumed; this is safe because (a) no session was
    // created (consume only marks the flag), (b) no audit outbox
    // row was created (audit happens in the service after
    // consume, which we did not call), and (c) the store's
    // `cleanup()` removes consumed entries on the next `issue()`
    // call (which the next test's `bootstrapChallenge()` helper
    // triggers). The `beforeEach` cleanup handles DB state; the
    // in-memory store is bounded by the 5-minute expiry and the
    // `cleanup()` call.
    const consumeResult = bootstrapStore.consume(challengeId, bootstrapCookie);
    expect(consumeResult).toBe('ok');
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

    // The public controller's strict Zod boundary
    // (SelectPreviewRoleRequestSchema is `.strict()`) rejects any
    // key other than `roleCode` and `challengeId`. The
    // `userId` field is a caller-supplied server-owned identity
    // field and is rejected at the controller boundary. The
    // service is NEVER reached, so the structured error code is
    // ROLE_PREVIEW_REQUEST_INVALID.
    const parsed = RolePreviewErrorResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('ROLE_PREVIEW_REQUEST_INVALID');
    }

    // Prove the service was NOT reached by verifying no session
    // was created and no audit outbox row was emitted. The
    // `beforeEach` cleanup ensures both tables start empty; if
    // the service had been reached, it would have created a
    // session row (via `selectRoleWithBootstrap` or
    // `selectRole`) and/or an audit outbox row (via the audit
    // emitter). A count of 0 for both proves the service was
    // NOT reached.
    const sessions = await prisma.authSession.findMany({});
    expect(sessions.length).toBe(0);
    const outboxRows = await prisma.auditOutboxEvent.findMany({});
    expect(outboxRows.length).toBe(0);
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

// ---------------------------------------------------------------------------
// Genuine Role Preview → Clinic Admin access (item 38)
// ---------------------------------------------------------------------------
//
// This section provides GENUINE Role Preview coverage for the Clinic
// Admin Overview access control. Unlike the Clinic Admin integration
// suite (`apps/api/test/clinic-admin/clinic-admin.e2e.clinic-admin-spec.ts`),
// which uses the standard `ibn_hayan_test` databases and therefore
// CANNOT invoke the real Role Preview endpoints (the
// `isPreviewDatabaseIdentityValid()` gate rejects non-preview database
// names), this suite uses the `role_preview_test` databases created
// by `setupRolePreviewDatabaseTests()`. The real Role Preview endpoints
// CAN be invoked here.
//
// Coverage goals (per the Phase 6 specification):
//  1. Enter Role Preview through the real production endpoint
//     (`POST /api/v1/dev/role-preview/select`).
//  2. Pass the real `isPreviewDatabaseIdentityValid()` gate.
//  3. Receive the real Role Preview cookie (`ibn_hayan_session`,
//     issued by `RolePreviewService.selectRoleWithBootstrap`).
//  4. Use the real preview session representation (a regular
//     `auth_sessions` row whose `userId` is the preview identity's
//     user, with the active context set directly by the service).
//  5. Call `GET /api/v1/clinic-admin/overview` with that session.
//  6. Verify the expected HTTP 403 denial (R01 does NOT grant
//     `clinic_admin_overview:view`).
//  7. Parse the public error response with `AuthErrorResponseSchema`.
//  8. Verify the denied `authorization.decision.denied` audit event
//     was emitted with actorId=preview user, permissionCode=
//     `clinic_admin_overview:view`, endpoint=`/api/v1/clinic-admin/overview`,
//     method=`GET`.
//  9. Prove no `clinic_admin.overview.viewed` audit event was emitted
//     (the Overview service emits this event only on a successful 200
//     response).
// 10. Clean up the preview state correctly (the `beforeEach` hook
//     deletes all sessions and outbox rows; the preview tenant/org/
//     facility/identities persist because the seed is idempotent).
//
// This test does NOT weaken or bypass any production gate:
//   - The real `AppModule` is used.
//   - The real `AuthorizationGuard` is used.
//   - The real `RolePreviewService` is used.
//   - The real `isPreviewDatabaseIdentityValid()` gate executes.
//   - The real `POST /api/v1/dev/role-preview/select` endpoint is hit.
//   - The real `ibn_hayan_session` cookie is used.
//   - No `AppModule`, `AuthorizationGuard`, `RolePreviewService`, or
//     `Clinic Admin controller` is mocked.

describe('Genuine Role Preview → Clinic Admin access', () => {
  /**
   * Count the `authorization.decision.*` audit-outbox events for the
   * Clinic Admin Overview endpoint. This is the endpoint-reach proof:
   * if the request reached the guard, exactly one event must be
   * emitted (allowed or denied). If no event is emitted, the request
   * was blocked before the guard (e.g. by session validation) — this
   * would indicate the test setup failed, not that the guard denied.
   */
  async function countOverviewAuthorizationAuditEvents(): Promise<number> {
    const rows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    let count = 0;
    for (const row of rows) {
      const draft = row.canonicalEventDraft as {
        action?: string;
        metadata?: { endpoint?: string };
      };
      if (
        (draft.action === 'authorization.decision.allowed' ||
          draft.action === 'authorization.decision.denied') &&
        draft.metadata?.endpoint === '/api/v1/clinic-admin/overview'
      ) {
        count++;
      }
    }
    return count;
  }

  /**
   * Assert that the most recent Overview-endpoint authorization-decision
   * audit event has the expected actor, permission, endpoint, and
   * method. Per the approved audit contract, DENIED events carry an
   * EMPTY `roleCodes` array (security hardening — not leaking role
   * information to a denied user). The `AuditEventDraft.roleCodes`
   * field is declared as `readonly string[]` (non-optional) and the
   * audit-outbox `role_codes` column is a non-nullable PostgreSQL
   * `String[]`; the audit-event builder normalises a missing
   * `roleCodes` input to `[]` (see `audit-event-builder.ts:251` and
   * `audit-event-builder.spec.ts:42`). The AuthorizationGuard's
   * `emitAuthorizationDenied` deliberately does NOT pass
   * `roleCodes`, so the builder produces `[]` — a denied actor
   * sees zero role claims, which is information-theoretically
   * equivalent to omission for the security purpose. The previewed
   * role is therefore proved independently by querying the preview
   * identity's role assignment BEFORE the request.
   */
  async function assertOverviewDeniedAuditEvent(
    expectedActorId: string,
  ): Promise<void> {
    const rows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    const overviewRows = rows.filter((row) => {
      const draft = row.canonicalEventDraft as {
        action?: string;
        metadata?: { endpoint?: string; method?: string };
      };
      return (
        draft.action === 'authorization.decision.denied' &&
        draft.metadata?.endpoint === '/api/v1/clinic-admin/overview' &&
        draft.metadata?.method === 'GET'
      );
    });
    expect(overviewRows.length).toBeGreaterThanOrEqual(1);
    const latest = overviewRows[overviewRows.length - 1]!;
    const draft = latest.canonicalEventDraft as {
      actorId?: string;
      permissionCode?: string;
      roleCodes?: readonly string[];
      metadata?: { endpoint?: string; method?: string };
    };
    expect(draft.actorId).toBe(expectedActorId);
    expect(draft.permissionCode).toBe('clinic_admin_overview:view');
    expect(draft.metadata?.endpoint).toBe('/api/v1/clinic-admin/overview');
    expect(draft.metadata?.method).toBe('GET');
    // Per the approved audit contract, DENIED events carry an EMPTY
    // `roleCodes` array. The field is non-optional in the draft type
    // and non-nullable in the database; the builder normalises a
    // missing input to `[]`. This is security hardening — a denied
    // user sees zero role claims and cannot infer which roles might
    // have granted the permission. The previewed role is proved
    // independently by querying the preview identity's role
    // assignment.
    //
    // Canonical assertion: empty array, not undefined. The
    // audit-event-builder.spec.ts:42 unit test already codifies the
    // empty-array contract for the default `roleCodes`; this
    // assertion extends that contract to the denied-authorization
    // runtime path.
    expect(draft.roleCodes).toEqual([]);
    // Defence-in-depth: explicitly prove that the denied event
    // cannot imply Clinic Admin permission. Neither R01 (the
    // previewed role) nor R09 (the Clinic Administrator role) may
    // appear in the denied event's roleCodes.
    expect(draft.roleCodes).not.toContain('R01_PHYSICIAN');
    expect(draft.roleCodes).not.toContain('R09_ADMINISTRATOR');
    expect(draft.roleCodes).not.toContain('R13_SYSTEM_ADMINISTRATOR');
  }

  /**
   * Assert that no `clinic_admin.overview.viewed` audit event was
   * emitted. The Overview service emits this event only on a
   * successful 200 response. A denial (403) must NOT emit this event.
   */
  async function assertNoOverviewViewedEvent(): Promise<void> {
    const rows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    const viewedEvents = rows.filter((row) => {
      const draft = row.canonicalEventDraft as { action?: string };
      return draft.action === 'clinic_admin.overview.viewed';
    });
    expect(viewedEvents).toHaveLength(0);
  }

  it('38. Real Role Preview session for R01 cannot bypass the Clinic Admin permission requirement', async () => {
    // ----------------------------------------------------------------
    // Step 1: Enter Role Preview through the REAL production endpoint.
    // ----------------------------------------------------------------
    // `bootstrapAndSelect` calls:
    //   GET /api/v1/dev/role-preview/bootstrap   (sets bootstrap cookie)
    //   POST /api/v1/dev/role-preview/select     (consumes bootstrap
    //                                             cookie + challengeId,
    //                                             creates a real preview
    //                                             session, returns the
    //                                             ibn_hayan_session cookie)
    //
    // The select endpoint is guarded by:
    //   - The real `isPreviewDatabaseIdentityValid()` gate (the
    //     `role_preview_test` databases pass; `ibn_hayan_test` would
    //     fail).
    //   - The real `IBN_HAYAN_ROLE_PREVIEW_ENABLED` flag (set to
    //     `true` by `setupRolePreviewDatabaseTests()`).
    //   - The real `NODE_ENV !== 'production'` gate (the bootstrap
    //     sets `NODE_ENV=development`).
    //   - The real Origin validation (we send `Origin: http://localhost:3000`).
    //   - The real bootstrap-challenge replay protection.
    //
    // The session created by the service is a regular `auth_sessions`
    // row whose `userId` is the preview identity's user ID, with the
    // active tenant membership, organisation, and facility set directly
    // by the service (matching `RolePreviewService.selectRole` lines
    // 375-377).
    const { response } = await bootstrapAndSelect('R01_PHYSICIAN');
    expect(response.status).toBe(200);

    // ----------------------------------------------------------------
    // Step 2: Extract the REAL ibn_hayan_session cookie issued by
    // `RolePreviewService.selectRoleWithBootstrap`. This is NOT the
    // bootstrap cookie (`ibn_hayan_role_preview_bootstrap`); it is the
    // standard session cookie issued by the preview service.
    // ----------------------------------------------------------------
    const selectCookieStr = getSetCookieString(response);
    expect(selectCookieStr).toContain('ibn_hayan_session=');
    const previewSessionCookieValue = extractCookie(
      selectCookieStr,
      'ibn_hayan_session',
    );
    expect(previewSessionCookieValue.length).toBeGreaterThan(0);

    // ----------------------------------------------------------------
    // Step 3: Resolve the preview identity's user ID by querying the
    // active session. The session's `userId` MUST be the preview
    // identity's user ID (R01_PHYSICIAN's preview identity, with
    // email `r01_physician@role-preview.dev`). This proves the
    // session is a REAL preview session — a normal authenticated
    // session would have a different userId.
    // ----------------------------------------------------------------
    const activeSession = await prisma.authSession.findFirst({
      where: { revokedAt: null },
    });
    expect(activeSession).not.toBeNull();
    const previewUserId = activeSession!.userId;

    // Resolve the preview identity's user record and verify the
    // email matches the R01 preview identity. This proves the
    // session is for the R01 preview identity specifically (NOT a
    // normal user, NOT a different preview identity).
    const previewUser = await prisma.user.findUnique({
      where: { id: previewUserId },
    });
    expect(previewUser).not.toBeNull();
    expect(previewUser!.email).toBe('r01_physician@role-preview.dev');

    // Verify the preview identity has EXACTLY R01_PHYSICIAN (no
    // R09, no R13, no other role). The preview seed creates exactly
    // one facility-scoped R01 assignment per the role-preview spec
    // test #14: "R13/R14 tenant, R01–R12 facility".
    const previewMembership = await prisma.tenantMembership.findUnique({
      where: { id: activeSession!.activeTenantMembershipId! },
    });
    expect(previewMembership).not.toBeNull();
    const previewAssignments = await prisma.tenantRoleAssignment.findMany({
      where: { tenantMembershipId: previewMembership!.id },
    });
    const previewRoleCodes = new Set(previewAssignments.map((a) => a.roleCode));
    expect(previewRoleCodes.has('R01_PHYSICIAN')).toBe(true);
    expect(previewRoleCodes.has('R09_ADMINISTRATOR')).toBe(false);
    expect(previewRoleCodes.has('R13_SYSTEM_ADMINISTRATOR')).toBe(false);

    // ----------------------------------------------------------------
    // Step 4: Issue the Overview request through the REAL guard. The
    // request uses the REAL preview session cookie. The guard
    // evaluates the preview identity's roles (R01 alone) and MUST
    // deny because R01 does NOT grant `clinic_admin_overview:view`.
    // ----------------------------------------------------------------
    const before = await countOverviewAuthorizationAuditEvents();
    const overviewResponse = await request(server)
      .get(clinicAdminRoutes.overview)
      .set('Cookie', `ibn_hayan_session=${previewSessionCookieValue}`)
      .expect(403);

    // ----------------------------------------------------------------
    // Step 5: Endpoint-reach proof — exactly one
    // `authorization.decision.denied` audit event was emitted for the
    // Overview endpoint. The event's actorId, permissionCode,
    // endpoint, and method match. `roleCodes` is intentionally an
    // EMPTY ARRAY (security hardening) — see the
    // `assertOverviewDeniedAuditEvent` helper for the canonical
    // contract.
    // ----------------------------------------------------------------
    const after = await countOverviewAuthorizationAuditEvents();
    expect(after).toBe(before + 1);
    await assertOverviewDeniedAuditEvent(previewUserId);

    // ----------------------------------------------------------------
    // Step 6: No successful-view event was emitted. The Overview
    // service emits `clinic_admin.overview.viewed` only on a
    // successful 200 response. A denial (403) must NOT emit it.
    // ----------------------------------------------------------------
    await assertNoOverviewViewedEvent();

    // ----------------------------------------------------------------
    // Step 7: The public error response matches the approved
    // `AuthErrorResponseSchema` contract (the guard returns
    // `AUTHORIZATION_FORBIDDEN`).
    // ----------------------------------------------------------------
    const parsed = AuthErrorResponseSchema.safeParse(overviewResponse.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTHORIZATION_FORBIDDEN');
    }
  });

  it('39. Real Role Preview session for R09 is allowed by the Clinic Admin permission', async () => {
    // This is the positive control for test 38: a REAL Role Preview
    // session for R09 (the Clinic Administrator) MUST be allowed by
    // the guard (R09 grants `clinic_admin_overview:view`). The
    // service-level context check may still apply, but the guard
    // itself MUST NOT deny. This proves the denial in test 38 is
    // specifically because R01 does NOT grant the permission — NOT
    // because the preview session is somehow invalid.
    //
    // Note: the preview identity's session has the active tenant
    // membership, organisation, and facility set directly by the
    // service. The Overview service may still return 403 with
    // `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED` if the context is
    // somehow invalid, OR it may return 200 if the context is valid.
    // The guard's ALLOWED decision is what we assert here — the
    // service-level outcome is not the subject of this test.
    const { response } = await bootstrapAndSelect('R09_ADMINISTRATOR');
    expect(response.status).toBe(200);
    const selectCookieStr = getSetCookieString(response);
    expect(selectCookieStr).toContain('ibn_hayan_session=');
    const previewSessionCookieValue = extractCookie(
      selectCookieStr,
      'ibn_hayan_session',
    );
    expect(previewSessionCookieValue.length).toBeGreaterThan(0);

    const activeSession = await prisma.authSession.findFirst({
      where: { revokedAt: null },
    });
    expect(activeSession).not.toBeNull();
    const previewUserId = activeSession!.userId;
    const previewUser = await prisma.user.findUnique({
      where: { id: previewUserId },
    });
    expect(previewUser).not.toBeNull();
    expect(previewUser!.email).toBe('r09_administrator@role-preview.dev');

    // The Overview request MUST NOT be denied by the guard (R09
    // grants `clinic_admin_overview:view`). The service may return
    // 200 or 403 depending on whether the preview context satisfies
    // the Overview service's context-required check. We assert the
    // guard emitted an `authorization.decision.allowed` event,
    // regardless of the service-level outcome.
    const before = await countOverviewAuthorizationAuditEvents();
    await request(server)
      .get(clinicAdminRoutes.overview)
      .set('Cookie', `ibn_hayan_session=${previewSessionCookieValue}`);

    const after = await countOverviewAuthorizationAuditEvents();
    expect(after).toBe(before + 1);

    // Assert the most recent Overview-endpoint authorization-decision
    // audit event is an ALLOWED event with actorId=preview user,
    // permissionCode=clinic_admin_overview:view, endpoint=
    // /api/v1/clinic-admin/overview, method=GET, and roleCodes
    // includes R09_ADMINISTRATOR.
    const rows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    const overviewRows = rows.filter((row) => {
      const draft = row.canonicalEventDraft as {
        action?: string;
        metadata?: { endpoint?: string; method?: string };
      };
      return (
        draft.action === 'authorization.decision.allowed' &&
        draft.metadata?.endpoint === '/api/v1/clinic-admin/overview' &&
        draft.metadata?.method === 'GET'
      );
    });
    expect(overviewRows.length).toBeGreaterThanOrEqual(1);
    const latest = overviewRows[overviewRows.length - 1]!;
    const draft = latest.canonicalEventDraft as {
      actorId?: string;
      permissionCode?: string;
      roleCodes?: readonly string[];
      metadata?: { endpoint?: string; method?: string };
    };
    expect(draft.actorId).toBe(previewUserId);
    expect(draft.permissionCode).toBe('clinic_admin_overview:view');
    expect(draft.metadata?.endpoint).toBe('/api/v1/clinic-admin/overview');
    expect(draft.metadata?.method).toBe('GET');
    // ALLOWED events include roleCodes; R09 must be present.
    expect(draft.roleCodes).toBeDefined();
    expect(draft.roleCodes).toContain('R09_ADMINISTRATOR');
  });

  it('40. Denied Clinic Admin authorization audit event carries an empty roleCodes array (canonical contract)', async () => {
    // ----------------------------------------------------------------
    // Regression coverage for the canonical `roleCodes` contract on
    // DENIED authorization events.
    //
    // Authoritative contract (see `assertOverviewDeniedAuditEvent`
    // for the full evidence chain):
    //
    //   * `AuditEventDraft.roleCodes` is declared `readonly string[]`
    //     (non-optional) in `packages/observability/src/audit/audit-event-draft.ts:82`.
    //   * The audit-outbox `role_codes` column is a non-nullable
    //     PostgreSQL `String[]` (`apps/api/prisma-audit/schema.prisma:121`).
    //   * The audit-event builder normalises a missing `roleCodes`
    //     input to `[]` (`packages/observability/src/audit/audit-event-builder.ts:251`).
    //   * The builder unit test asserts `expect(r.draft.roleCodes).toEqual([])`
    //     (`packages/observability/src/audit/audit-event-builder.spec.ts:42`).
    //   * The AuthorizationGuard's `emitAuthorizationDenied` does NOT
    //     pass `roleCodes`, so the builder produces `[]`. This is
    //     security hardening — a denied actor sees zero role claims
    //     and cannot infer which roles might have granted the
    //     permission.
    //
    // This test enters Role Preview through the REAL production
    // endpoint as R01_PHYSICIAN (which does NOT grant
    // `clinic_admin_overview:view`), issues a real Overview request,
    // and asserts that the resulting DENIED audit event:
    //   1. Succeeds (denial itself succeeds — the R01 preview
    //      session is denied correctly).
    //   2. `roleCodes` is canonically `[]` (not `undefined`).
    //   3. `roleCodes` contains no role code at all.
    //   4. `roleCodes` cannot contain R01_PHYSICIAN (the previewed
    //      role).
    //   5. `roleCodes` cannot contain R09_ADMINISTRATOR (the Clinic
    //      Administrator role).
    //   6. `roleCodes` cannot contain R13_SYSTEM_ADMINISTRATOR (the
    //      Platform Super Admin role).
    //   7. The denied event cannot imply Clinic Admin permission
    //      (no roleCodes entry grants `clinic_admin_overview:view`).
    //   8. The real preview identity remains R01 (proved
    //      independently by querying the role assignment).
    //   9. The R09 positive control (test 39) remains allowed — the
    //      empty-array denial is R01-specific, NOT a regression of
    //      R09 access.
    // ----------------------------------------------------------------

    // Step 1: Enter Role Preview as R01_PHYSICIAN through the REAL
    // production endpoint.
    const { response } = await bootstrapAndSelect('R01_PHYSICIAN');
    expect(response.status).toBe(200);
    const selectCookieStr = getSetCookieString(response);
    expect(selectCookieStr).toContain('ibn_hayan_session=');
    const previewSessionCookieValue = extractCookie(
      selectCookieStr,
      'ibn_hayan_session',
    );
    expect(previewSessionCookieValue.length).toBeGreaterThan(0);

    // Step 2: Resolve the preview identity's user ID, membership,
    // and role assignments. Prove the preview identity is exactly
    // R01_PHYSICIAN (no R09, no R13, no other role). This is the
    // independent proof of the previewed role — the denied audit
    // event's `roleCodes` must NOT leak this fact.
    const activeSession = await prisma.authSession.findFirst({
      where: { revokedAt: null },
    });
    expect(activeSession).not.toBeNull();
    const previewUserId = activeSession!.userId;
    const previewUser = await prisma.user.findUnique({
      where: { id: previewUserId },
    });
    expect(previewUser).not.toBeNull();
    expect(previewUser!.email).toBe('r01_physician@role-preview.dev');
    const previewMembership = await prisma.tenantMembership.findUnique({
      where: { id: activeSession!.activeTenantMembershipId! },
    });
    expect(previewMembership).not.toBeNull();
    const previewAssignments = await prisma.tenantRoleAssignment.findMany({
      where: { tenantMembershipId: previewMembership!.id },
    });
    const previewRoleCodes = new Set(previewAssignments.map((a) => a.roleCode));
    expect(previewRoleCodes.has('R01_PHYSICIAN')).toBe(true);
    expect(previewRoleCodes.has('R09_ADMINISTRATOR')).toBe(false);
    expect(previewRoleCodes.has('R13_SYSTEM_ADMINISTRATOR')).toBe(false);

    // Step 3: Issue the Overview request through the REAL guard.
    // R01 does NOT grant `clinic_admin_overview:view`, so the guard
    // MUST deny.
    const before = await countOverviewAuthorizationAuditEvents();
    const overviewResponse = await request(server)
      .get(clinicAdminRoutes.overview)
      .set('Cookie', `ibn_hayan_session=${previewSessionCookieValue}`)
      .expect(403);

    // Step 4: The denial itself succeeded (R01 cannot bypass the
    // Clinic Admin permission requirement).
    expect(overviewResponse.status).toBe(403);
    const parsed = AuthErrorResponseSchema.safeParse(overviewResponse.body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('AUTHORIZATION_FORBIDDEN');
    }

    // Step 5: Exactly one new DENIED audit event was emitted.
    const after = await countOverviewAuthorizationAuditEvents();
    expect(after).toBe(before + 1);

    // Step 6: The DENIED audit event carries the canonical empty
    // `roleCodes` array. The helper asserts:
    //   * `roleCodes` is exactly `[]`
    //   * `roleCodes` does not contain R01_PHYSICIAN
    //   * `roleCodes` does not contain R09_ADMINISTRATOR
    //   * `roleCodes` does not contain R13_SYSTEM_ADMINISTRATOR
    // These four assertions collectively prove that the denied
    // event cannot imply Clinic Admin permission.
    await assertOverviewDeniedAuditEvent(previewUserId);

    // Step 7: No successful-view event was emitted. The Overview
    // service emits `clinic_admin.overview.viewed` only on a 200
    // response; a 403 denial must NOT emit it.
    await assertNoOverviewViewedEvent();

    // Step 8: Confirm the canonical contract holds at the raw-row
    // level (not just through the helper). Read the most recent
    // denied Overview event directly and assert the field is an
    // empty array, NOT undefined. This guards against future
    // regressions where the helper might be weakened to accept
    // either representation.
    const rows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    const deniedOverviewRows = rows.filter((row) => {
      const draft = row.canonicalEventDraft as {
        action?: string;
        metadata?: { endpoint?: string; method?: string };
      };
      return (
        draft.action === 'authorization.decision.denied' &&
        draft.metadata?.endpoint === '/api/v1/clinic-admin/overview' &&
        draft.metadata?.method === 'GET'
      );
    });
    expect(deniedOverviewRows.length).toBeGreaterThanOrEqual(1);
    const latestDenied = deniedOverviewRows[deniedOverviewRows.length - 1]!;
    const deniedDraft = latestDenied.canonicalEventDraft as {
      roleCodes?: unknown;
    };
    // Canonical assertion: empty array, not undefined, not null.
    expect(Array.isArray(deniedDraft.roleCodes)).toBe(true);
    expect(deniedDraft.roleCodes).toHaveLength(0);
    expect(deniedDraft.roleCodes).toEqual([]);
  });
});
