import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import type { Server } from 'node:http';
import { Client as PgClient } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  setupDatabaseTests,
  isOwnedCluster,
} from '../database/_pg-bootstrap.js';
import { AppModule } from '../../src/app.module.js';
import { AuditPrismaService } from '../../src/modules/audit/audit-prisma.service.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { AuditDispatcherService } from '../../src/modules/audit/audit-dispatcher.service.js';
import { AuditIntegrityVerifierService } from '../../src/modules/audit/audit-integrity-verifier.service.js';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { buildAuditEventDraft } from '@ibn-hayan/observability';

/**
 * Audit integration tests.
 *
 * These tests verify the end-to-end audit instrumentation:
 *  1. Successful login creates the correct audit event.
 *  2. Failed login creates an event without raw email.
 *  3. Invalid Origin creates a denied security event.
 *  4. Invalid CSRF creates a denied security event.
 *  5. Allowed authorization decision is audited.
 *  6. Denied authorization decision is audited.
 *  7. R14 context denial is audited.
 *  8. Context view is audited.
 *  9. Context selection is audited.
 * 10. Context clearing is audited.
 * 11. Logout is audited.
 * 12. Request IDs match between response and audit event.
 * 13. Existing generic error responses remain unchanged.
 * 14. No secrets appear anywhere in persisted audit data.
 * 15. Simulated audit-store outage: pending events survive and
 *     are delivered exactly once after recovery.
 * 16. Throttled login emits `authentication.login.throttled`
 *     without raw email or account-existence leak.
 * 17. Expired session emits `authentication.session.expired`
 *     exactly once.
 * 18. Invalid request IDs are replaced, not trusted.
 * 19. Oversized correlation IDs are normalised.
 * 20. Integrity verification passes after normal operation.
 */
setupDatabaseTests();

let app: INestApplication;
let server: Server;
let auditPrisma: AuditPrismaService;
let prisma: PrismaService;
let dispatcher: AuditDispatcherService;
let verifier: AuditIntegrityVerifierService;
let throttlerStorage: ThrottlerStorage;

// A direct Prisma client for seeding test data (bypassing the NestJS
// DI container so we can set up test fixtures quickly).
let seedPrisma: PrismaClient;

const WEB_ORIGIN = 'http://localhost:3000';
const TEST_EMAIL = 'audit-test@example.invalid';
const TEST_PASSWORD = 'test-password-12345';
const TEST_TENANT_SLUG = 'audit-test-tenant';
const TEST_TENANT_DISPLAY = 'Audit Test Tenant';
const TEST_USER_DISPLAY = 'Audit Test User';

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  server = app.getHttpServer() as Server;

  auditPrisma = moduleRef.get(AuditPrismaService);
  prisma = moduleRef.get(PrismaService);
  dispatcher = moduleRef.get(AuditDispatcherService);
  verifier = moduleRef.get(AuditIntegrityVerifierService);
  throttlerStorage = app.get(ThrottlerStorage);

  // Create a direct Prisma client for seeding.
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  seedPrisma = new PrismaClient({ adapter });

  // Seed the test tenant, user, credential, membership, and role.
  await seedTestData();
});

afterAll(async () => {
  await seedPrisma?.$disconnect();
  await auditPrisma?.$disconnect();
  await app?.close();
});

beforeEach(async () => {
  // Clean the audit tables and the outbox before each test.
  await prisma.auditOutboxEvent.deleteMany({});
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" DISABLE TRIGGER USER`;
  await auditPrisma.$executeRaw`TRUNCATE TABLE "audit_events"`;
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" ENABLE TRIGGER USER`;
  await auditPrisma.auditChainHead.deleteMany({});
  // Reset session context for the test user's sessions.
  await seedPrisma.authSession.updateMany({
    data: { activeTenantMembershipId: null },
  });
  // Reset the throttler's in-memory storage so that login attempts
  // in one test do not trigger the throttle in the next test.
  resetThrottlerStorage();
});

/**
 * Reset the throttler's in-memory storage.
 *
 * The default `ThrottlerStorage` from `@nestjs/throttler` stores
 * hits in a `Map<string, ThrottlerStorageRecord>`. Clearing the
 * Map resets all counters.
 */
function resetThrottlerStorage(): void {
  const storage = throttlerStorage as unknown as {
    storage?: Map<unknown, unknown>;
  };
  if (storage.storage instanceof Map) {
    storage.storage.clear();
  }
}

/**
 * Seed the test tenant, user, credential, membership, and role.
 */
async function seedTestData(): Promise<void> {
  const tenant = await seedPrisma.tenant.upsert({
    where: { slug: TEST_TENANT_SLUG },
    update: {},
    create: {
      slug: TEST_TENANT_SLUG,
      displayName: TEST_TENANT_DISPLAY,
    },
  });

  const normalisedEmail = TEST_EMAIL.toLowerCase();
  const user = await seedPrisma.user.upsert({
    where: { normalisedEmail },
    update: {},
    create: {
      email: TEST_EMAIL,
      normalisedEmail,
      displayName: TEST_USER_DISPLAY,
    },
  });

  const passwordHash = await argon2.hash(TEST_PASSWORD, {
    type: argon2.argon2id,
  });
  await seedPrisma.localCredential.upsert({
    where: { userId: user.id },
    update: { passwordHash, passwordChangedAt: new Date() },
    create: {
      userId: user.id,
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  const membership = await seedPrisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
    },
  });

  // Per ADR-015, the original (tenant_membership_id, role_code)
  // unique constraint was replaced by three partial unique indexes
  // (one per scope level). Prisma 7 cannot represent partial unique
  // indexes as compound `where` clauses; the test seed therefore
  // uses `findFirst` with an explicit filter and a conditional
  // create.
  const existingAssignment = await seedPrisma.tenantRoleAssignment.findFirst({
    where: {
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
      scopeOrganisationId: null,
      scopeFacilityId: null,
    },
  });
  if (existingAssignment === null) {
    await seedPrisma.tenantRoleAssignment.create({
      data: {
        tenantMembershipId: membership.id,
        // Per ADR-015, tenantId is derived server-side from the
        // referenced TenantMembership. The test seed holds the
        // membership row in memory; the derived tenantId is the
        // membership's `tenantId` field.
        tenantId: membership.tenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
        scopeOrganisationId: null,
        scopeFacilityId: null,
      },
    });
  }
}

/**
 * Dispatch all pending outbox events to the audit store.
 * Returns the last dispatch cycle summary.
 */
async function dispatchAll(): Promise<{
  claimed: number;
  delivered: number;
  idempotent: number;
  transientFailures: number;
  permanentFailures: number;
  lostLeases: number;
}> {
  let lastSummary = {
    claimed: 0,
    delivered: 0,
    idempotent: 0,
    transientFailures: 0,
    permanentFailures: 0,
    lostLeases: 0,
  };
  // Run dispatch cycles until no more events are claimed.
  for (let i = 0; i < 10; i++) {
    lastSummary = await dispatcher.dispatchOnce({ batchSize: 100 });
    if (lastSummary.claimed === 0) {
      break;
    }
  }
  return lastSummary;
}

/**
 * Login and return the session cookie and CSRF token.
 */
async function login(): Promise<{
  cookie: string;
  csrfToken: string;
  membershipId: string;
}> {
  const loginRes = await request(server)
    .post('/api/v1/auth/login')
    .set('Origin', WEB_ORIGIN)
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  expect(loginRes.status).toBe(200);
  const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
  if (!cookie) {
    throw new Error('No cookie set');
  }

  // Fetch CSRF token.
  const csrfRes = await request(server)
    .get('/api/v1/auth/csrf')
    .set('Cookie', cookie);
  expect(csrfRes.status).toBe(200);
  const csrfToken: string = (csrfRes.body as { token: string }).token;

  // Get the membership ID from the session response.
  const memberships: Array<{ id: string }> = (
    loginRes.body as { memberships: Array<{ id: string }> }
  ).memberships;
  const membershipId: string = memberships[0]!.id;

  return { cookie, csrfToken, membershipId };
}

/**
 * Connect to the maintenance database (`postgres`) on the test
 * cluster. Used by the simulated-outage test to flip
 * `ALLOW_CONNECTIONS` on the audit database.
 *
 * The maintenance URL is derived from `DATABASE_URL` by replacing
 * the database name with `postgres`. The connection uses the same
 * credentials and host as `DATABASE_URL`.
 */
function getMaintenanceClient(): PgClient {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  // Replace the database name (the last path segment) with `postgres`.
  const maintenanceUrl = databaseUrl.replace(/\/[^/]+$/, '/postgres');
  const client = new PgClient({ connectionString: maintenanceUrl });
  return client;
}

/**
 * The name of the audit database, derived from `AUDIT_DATABASE_URL`.
 */
function getAuditDatabaseName(): string {
  const auditUrl = process.env['AUDIT_DATABASE_URL'];
  if (!auditUrl) {
    throw new Error('AUDIT_DATABASE_URL is not set');
  }
  const match = auditUrl.match(/\/([^/]+)$/);
  if (!match || !match[1]) {
    throw new Error(`Could not parse audit database name from ${auditUrl}`);
  }
  return match[1];
}

/**
 * Simulate the audit database becoming unavailable by:
 * 1. Disconnecting the AuditPrismaService (dropping the pool).
 * 2. Running `ALTER DATABASE <audit> WITH ALLOW_CONNECTIONS false` on
 *    the maintenance database.
 *
 * After this call, any new connection to the audit database will
 * fail with a "database is not accepting connections" error. The
 * dispatcher's `auditStore.append` call will throw, and the outbox
 * row will remain pending.
 *
 * Returns a `restore` function that re-enables connections. The
 * caller MUST call `restore()` before the test completes.
 */
async function makeAuditDatabaseUnavailable(): Promise<{
  restore: () => Promise<void>;
}> {
  const auditDbName = getAuditDatabaseName();
  // Disconnect the AuditPrismaService so its pool does not hold
  // open connections that bypass the ALLOW_CONNECTIONS flag.
  await auditPrisma.$disconnect();
  const mgmtClient = getMaintenanceClient();
  await mgmtClient.connect();
  try {
    await mgmtClient.query(
      `ALTER DATABASE "${auditDbName}" WITH ALLOW_CONNECTIONS false;`,
    );
  } finally {
    await mgmtClient.end();
  }
  return {
    restore: async () => {
      const restoreClient = getMaintenanceClient();
      await restoreClient.connect();
      try {
        await restoreClient.query(
          `ALTER DATABASE "${auditDbName}" WITH ALLOW_CONNECTIONS true;`,
        );
      } finally {
        await restoreClient.end();
      }
      // Reconnect the AuditPrismaService by issuing a trivial
      // query. Prisma's `$transaction` lazy-opens the pool on
      // the next query.
    },
  };
}

describe('Audit integration', () => {
  it('successful login creates the correct audit event', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    // Dispatch the outbox.
    await dispatchAll();

    // Verify the audit event.
    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.succeeded' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe('success');
    expect(events[0]!.source).toBe('api');
    expect(events[0]!.actorType).toBe('USER');
  });

  it('failed login creates an event without raw email', async () => {
    const wrongEmail = 'nonexistent-user-xyz@example.invalid';
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: wrongEmail, password: 'wrong-password-12345' });

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.failed' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe('failure');

    // Verify the raw email is NOT in the audit store.
    const allEvents = await auditPrisma.auditEvent.findMany();
    const allJson = JSON.stringify(allEvents, (_k, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    expect(allJson).not.toContain(wrongEmail);
    expect(allJson).not.toContain('nonexistent-user-xyz');

    // The subject_identifier_hash should be present.
    expect(events[0]!.subjectIdentifierHash).not.toBeNull();
    expect(events[0]!.subjectIdentifierHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('invalid Origin creates a denied security event', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://evil.example.com')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'security.origin.denied' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe('denied');
  });

  it('allowed authorization decision is audited', async () => {
    const { cookie } = await login();

    // GET /context requires the context:view permission. The test
    // user has R13 which grants context:view. The authorization
    // guard should emit an allowed event.
    await request(server).get('/api/v1/context').set('Cookie', cookie);

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authorization.decision.allowed' },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('denied authorization decision is audited (R14 context denial)', async () => {
    // Create a user with a membership but NO role assignments, so
    // context:view is denied.
    const deniedEmail = `denied-user-${randomUUID()}@example.invalid`;
    const deniedUser = await seedPrisma.user.create({
      data: {
        email: deniedEmail,
        normalisedEmail: deniedEmail.toLowerCase(),
        displayName: 'Denied User',
      },
    });
    const tenant = await seedPrisma.tenant.findUnique({
      where: { slug: TEST_TENANT_SLUG },
    });
    if (!tenant) throw new Error('Test tenant not seeded');
    const membership = await seedPrisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: deniedUser.id },
    });
    const deniedPassword = 'denied-password-12345';
    const pwHash = await argon2.hash(deniedPassword, {
      type: argon2.argon2id,
    });
    await seedPrisma.localCredential.create({
      data: {
        userId: deniedUser.id,
        passwordHash: pwHash,
        passwordChangedAt: new Date(),
      },
    });

    try {
      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .set('Origin', WEB_ORIGIN)
        .send({ email: deniedEmail, password: deniedPassword });
      expect(loginRes.status).toBe(200);
      const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
      if (!cookie) throw new Error('No cookie set for denied user');

      // The user has a membership but no roles. context:view requires
      // a role that grants it. The guard should deny.
      const ctxRes = await request(server)
        .get('/api/v1/context')
        .set('Cookie', cookie);
      expect(ctxRes.status).toBe(403);

      await dispatchAll();

      const deniedEvents = await auditPrisma.auditEvent.findMany({
        where: { action: 'authorization.decision.denied' },
      });
      expect(deniedEvents.length).toBeGreaterThanOrEqual(1);
    } finally {
      // Clean up the denied user to avoid affecting other tests.
      await seedPrisma.localCredential.deleteMany({
        where: { userId: deniedUser.id },
      });
      await seedPrisma.tenantMembership.deleteMany({
        where: { id: membership.id },
      });
      await seedPrisma.authSession.deleteMany({
        where: { userId: deniedUser.id },
      });
      await seedPrisma.user.deleteMany({ where: { id: deniedUser.id } });
    }
  });

  it('context view is audited', async () => {
    const { cookie } = await login();

    await request(server).get('/api/v1/context').set('Cookie', cookie);

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'tenant_context.viewed' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe('success');
  });

  it('context selection is audited', async () => {
    const { cookie, csrfToken, membershipId } = await login();

    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN)
      .send({ membershipId });

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'tenant_context.selected' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe('success');
  });

  it('context clearing is audited', async () => {
    const { cookie, csrfToken, membershipId } = await login();

    // Select first.
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN)
      .send({ membershipId });

    // Clear.
    await request(server)
      .delete('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN);

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'tenant_context.cleared' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe('success');
  });

  it('logout is audited', async () => {
    const { cookie, csrfToken } = await login();

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN);

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.logout.succeeded' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe('success');
  });

  it('request IDs match between response and audit event', async () => {
    const clientRequestId = 'test-request-id-1234567890';
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', clientRequestId)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    // The response should include the request ID.
    expect(loginRes.headers['x-request-id']).toBe(clientRequestId);

    await dispatchAll();

    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.succeeded' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.requestId).toBe(clientRequestId);
  });

  it('existing generic error responses remain unchanged', async () => {
    // Failed login returns 401 with the same generic error shape.
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: 'unknown@example.invalid', password: 'wrong-password' });

    expect(res.status).toBe(401);
    const error: { code: string; message: string } = (
      res.body as { error: { code: string; message: string } }
    ).error;
    expect(error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(error.message).toBe('Invalid email or password.');
  });

  it('no secrets appear anywhere in persisted audit data', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    await dispatchAll();

    const allEvents = await auditPrisma.auditEvent.findMany();
    const allJson = JSON.stringify(allEvents, (_k, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    );

    // The password must not appear anywhere.
    expect(allJson).not.toContain(TEST_PASSWORD);
    // The password hash must not appear anywhere.
    expect(allJson).not.toContain('$argon2id');
    // The raw email should not appear in successful-login events
    // (actorId is a UUID, not an email).
    expect(allJson).not.toContain(TEST_EMAIL);
  });

  // ---------------------------------------------------------------------
  // Restored simulated-outage test (was previously simplified).
  // ---------------------------------------------------------------------
  //
  // What was previously simplified: the original outage test was
  // reduced to "run dispatch cycles with short leases and wait for
  // the lease to expire" — it did NOT actually make the audit
  // database unavailable. As a result, it could not verify the
  // central outage guarantee: that an outbox row remains pending
  // (and is NOT marked delivered) when the audit store is down,
  // and that exactly one final audit event exists after recovery.
  //
  // The restored test uses `ALTER DATABASE ... WITH
  // ALLOW_CONNECTIONS false` to genuinely make the audit database
  // unavailable, then verifies the full outage contract:
  // 1. The outbox event remains pending while the audit store is
  //    unavailable.
  // 2. The dispatcher does not mark the event delivered.
  // 3. After recovery, the dispatcher delivers exactly one final
  //    audit event.
  // 4. The outbox event is marked delivered only after successful
  //    persistence.
  // 5. No mutation or audit event is lost.
  it('simulated audit-store outage: pending event survives and is delivered exactly once after recovery', async () => {
    // Skip if running against an externally-supplied cluster that
    // may not allow `ALTER DATABASE`. The test-owned disposable
    // cluster always allows it (the connecting user is the
    // superuser).
    if (!isOwnedCluster()) {
      console.warn(
        'Skipping simulated-outage test: not running on an owned cluster.',
      );
      return;
    }

    // 1. Create a consequential transactional mutation (login)
    //    and its outbox event.
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);

    // Verify the outbox has a pending event.
    const pendingBefore = await prisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingBefore).toBeGreaterThanOrEqual(1);

    // 2. Make the dedicated audit database unavailable.
    const outage = await makeAuditDatabaseUnavailable();
    try {
      // 3. Run the dispatcher. The audit-store append should fail;
      //    the outbox event should remain pending.
      const summary = await dispatcher.dispatchOnce({
        batchSize: 100,
        leaseDurationMs: 5_000,
      });
      // The dispatcher should have claimed and failed to deliver
      // (transient failures). It must NOT have marked the event
      // delivered.
      expect(summary.delivered).toBe(0);
      expect(summary.idempotent).toBe(0);
      // It should have at least one transient failure (the audit
      // store is unavailable). It may also have lostLeases if the
      // claim timed out, but that is acceptable.
      expect(
        summary.transientFailures + summary.lostLeases,
      ).toBeGreaterThanOrEqual(summary.claimed > 0 ? summary.claimed : 1);

      // 4. Verify the outbox event remains pending and is NOT
      //    marked delivered.
      const pendingDuring = await prisma.auditOutboxEvent.count({
        where: { deliveredAt: null },
      });
      expect(pendingDuring).toBeGreaterThanOrEqual(1);
      const deliveredDuring = await prisma.auditOutboxEvent.count({
        where: { deliveredAt: { not: null } },
      });
      expect(deliveredDuring).toBe(0);

      // Verify NO audit event was persisted while the audit store
      // was unavailable. (The audit store should be unreachable,
      // so any append would have failed.)
      // We cannot query the audit store here because we just made
      // it unavailable. We verify this after recovery by checking
      // that the count is exactly one (not more).
    } finally {
      // 5. Restore the audit database.
      await outage.restore();
    }

    // 6. Run the dispatcher again. The pending event should now
    //    be delivered. The failed dispatch during the outage set
    //    `availableAt` to a future time (backoff); reset it to NOW
    //    so the event is immediately claimable. This is a test-only
    //    convenience; in production, the dispatcher would wait for
    //    the backoff to expire.
    await prisma.auditOutboxEvent.updateMany({
      where: { deliveredAt: null },
      data: { availableAt: new Date(), leaseOwner: null, leaseExpiresAt: null },
    });
    await dispatchAll();

    // 7. Verify exactly one final audit event exists for the login.
    const loginEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.succeeded' },
    });
    expect(loginEvents).toHaveLength(1);
    expect(loginEvents[0]!.outcome).toBe('success');

    // 8. Verify the outbox event is marked delivered only after
    //    successful persistence.
    const pendingAfter = await prisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingAfter).toBe(0);
    const deliveredAfter = await prisma.auditOutboxEvent.count({
      where: { deliveredAt: { not: null } },
    });
    expect(deliveredAfter).toBeGreaterThanOrEqual(1);

    // 9. Verify no mutation or audit event is lost: the user's
    //    session was created (login succeeded), and the audit
    //    event was persisted exactly once.
    const allAuditEvents = await auditPrisma.auditEvent.count();
    expect(allAuditEvents).toBeGreaterThanOrEqual(1);
    // The login event must appear exactly once (no duplicates from
    // the failed-then-successful dispatch).
    expect(loginEvents).toHaveLength(1);
  });

  // ---------------------------------------------------------------------
  // Throttled-login auditing.
  // ---------------------------------------------------------------------
  it('throttled login emits authentication.login.throttled without raw email or account-existence leak', async () => {
    // The login endpoint is throttled at 10 attempts per 60s per IP.
    // We make 11 login attempts with a non-existent email. The 11th
    // should be throttled (HTTP 429) and should emit a
    // `authentication.login.throttled` audit event.
    //
    // The test verifies:
    // - The 429 response is the generic throttling response (does
    //   not reveal whether the account exists).
    // - The audit event does NOT contain the raw email.
    // - The audit event does NOT contain the password or request
    //   body.
    // - The audit event's subject_identifier_hash is set (HMAC of
    //   the normalised email).
    // - No `authentication.login.failed` event is double-emitted
    //   for the throttled attempt (the throttled event replaces,
    //   not supplements, the failed event).
    const throttledEmail = 'throttle-test@example.invalid';
    const throttledPassword = 'wrong-password-12345';

    // Make 10 failed login attempts to fill the throttle counter.
    // These should each emit `authentication.login.failed`.
    for (let i = 0; i < 10; i++) {
      await request(server)
        .post('/api/v1/auth/login')
        .set('Origin', WEB_ORIGIN)
        .send({ email: throttledEmail, password: throttledPassword });
    }

    // The 11th attempt should be throttled.
    const throttledRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: throttledEmail, password: throttledPassword });
    expect(throttledRes.status).toBe(429);

    // Dispatch the outbox.
    await dispatchAll();

    // Verify the throttled audit event exists.
    const throttledEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.throttled' },
    });
    expect(throttledEvents.length).toBeGreaterThanOrEqual(1);

    // Verify the raw email is NOT anywhere in the audit store.
    const allEvents = await auditPrisma.auditEvent.findMany();
    const allJson = JSON.stringify(allEvents, (_k, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    expect(allJson).not.toContain(throttledEmail);
    expect(allJson).not.toContain('throttle-test');
    // The password must not appear anywhere.
    expect(allJson).not.toContain(throttledPassword);

    // The throttled event must have a subject_identifier_hash.
    const throttledEvent = throttledEvents[0]!;
    expect(throttledEvent.subjectIdentifierHash).not.toBeNull();
    expect(throttledEvent.subjectIdentifierHash).toMatch(/^[0-9a-f]{64}$/);

    // Verify that the 10 failed-login attempts each emitted an
    // `authentication.login.failed` event, but the 11th (throttled)
    // attempt did NOT also emit a `failed` event. (The throttled
    // event replaces the failed event for the throttled attempt.)
    const failedEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.failed' },
    });
    expect(failedEvents).toHaveLength(10);
  });

  // ---------------------------------------------------------------------
  // Expired-session auditing.
  // ---------------------------------------------------------------------
  it('expired session emits authentication.session.expired exactly once', async () => {
    // 1. Create a session by logging in.
    const { cookie } = await login();

    // 2. Make the session expired by updating its `expires_at` to
    //    the past.
    const sessions = await seedPrisma.authSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(sessions.length).toBe(1);
    const sessionId = sessions[0]!.id;
    await seedPrisma.authSession.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(Date.now() - 60_000) }, // expired 1 min ago
    });

    // 3. Call a protected endpoint with the expired session.
    // 4. Receive the existing generic 401.
    const res = await request(server)
      .get('/api/v1/context')
      .set('Cookie', cookie);
    expect(res.status).toBe(401);

    // 5. Verify exactly one `authentication.session.expired` audit
    //    event is produced.
    await dispatchAll();
    const expiredEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.session.expired' },
    });
    expect(expiredEvents).toHaveLength(1);

    // 6. Verify `authentication.session.invalid` is NOT produced
    //    for the same event (the taxonomy distinguishes expired
    //    from invalid).
    const invalidEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.session.invalid' },
    });
    expect(invalidEvents).toHaveLength(0);
  });

  // ---------------------------------------------------------------------
  // Request-ID and correlation-ID verification.
  // ---------------------------------------------------------------------
  it('invalid request IDs are replaced, not trusted', async () => {
    // An invalid request ID (contains invalid characters) should be
    // replaced with a generated UUID. The response header should
    // NOT contain the invalid value.
    const invalidRequestId = 'this is not a valid request id!!!';
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', invalidRequestId)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    const responseRequestId = res.headers['x-request-id'];
    expect(responseRequestId).not.toBe(invalidRequestId);
    // The replaced value should be a UUID (36 chars with hyphens).
    expect(typeof responseRequestId).toBe('string');
    expect((responseRequestId as string).length).toBe(36);

    // Dispatch and verify the audit event has the REPLACED request
    // ID, not the invalid client-supplied one.
    await dispatchAll();
    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.succeeded' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.requestId).toBe(responseRequestId);
    expect(events[0]!.requestId).not.toBe(invalidRequestId);
  });

  it('oversized request IDs are replaced, not trusted', async () => {
    // A request ID longer than 64 characters should be replaced.
    const oversizedRequestId = 'a'.repeat(100);
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', oversizedRequestId)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    const responseRequestId = res.headers['x-request-id'];
    expect(responseRequestId).not.toBe(oversizedRequestId);
    expect(typeof responseRequestId).toBe('string');
    expect((responseRequestId as string).length).toBeLessThanOrEqual(64);

    await dispatchAll();
    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.succeeded' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.requestId).toBe(responseRequestId);
  });

  it('correlation ID defaults to request ID when absent', async () => {
    const clientRequestId = 'req-id-correlation-test-1234';
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', clientRequestId)
      // No X-Correlation-Id header.
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);

    await dispatchAll();
    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.succeeded' },
    });
    expect(events).toHaveLength(1);
    // The correlation ID should default to the request ID.
    expect(events[0]!.correlationId).toBe(clientRequestId);
  });

  it('oversized correlation IDs are normalised to the request ID', async () => {
    // An oversized correlation ID (longer than 64 chars) should be
    // replaced. Per the request-ID middleware, an invalid
    // correlation ID is replaced by the (validated) request ID.
    const clientRequestId = 'valid-req-id-1234567890';
    const oversizedCorrelationId = 'c'.repeat(100);
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', clientRequestId)
      .set('X-Correlation-Id', oversizedCorrelationId)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);

    await dispatchAll();
    const events = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.login.succeeded' },
    });
    expect(events).toHaveLength(1);
    // The oversized correlation ID should NOT be persisted.
    expect(events[0]!.correlationId).not.toBe(oversizedCorrelationId);
    // It should fall back to the validated request ID.
    expect(events[0]!.correlationId).toBe(clientRequestId);
  });

  it('every API response contains the X-Request-Id header', async () => {
    // The login response, the session response, the CSRF response,
    // and the 401 response should all include the header.
    const endpoints: Array<{
      name: string;
      run: () => Promise<request.Response>;
    }> = [
      {
        name: 'login',
        run: () =>
          request(server)
            .post('/api/v1/auth/login')
            .set('Origin', WEB_ORIGIN)
            .send({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      },
      {
        name: 'session',
        run: () => request(server).get('/api/v1/auth/session'),
      },
      {
        name: 'csrf',
        run: () => request(server).get('/api/v1/auth/csrf'),
      },
      {
        name: 'health',
        run: () => request(server).get('/api/v1/health'),
      },
    ];
    for (const ep of endpoints) {
      const res = await ep.run();
      expect(
        res.headers['x-request-id'],
        `${ep.name} response missing X-Request-Id header`,
      ).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      const rid = res.headers['x-request-id'] as string;
      // The request ID must match the safe format.
      expect(rid).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    }
  });

  it('integrity verification passes after normal operation', async () => {
    // Perform several operations.
    const { cookie, csrfToken, membershipId } = await login();
    await request(server).get('/api/v1/context').set('Cookie', cookie);
    await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN)
      .send({ membershipId });

    await dispatchAll();

    // Verify all chains.
    const result = await verifier.verify({ kind: 'all' });
    expect(result.ok).toBe(true);
  });

  it('session rotation emits authentication.session.rotated', async () => {
    // Log in.
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    if (!cookie) throw new Error('No cookie set');

    // Force rotation by updating rotatedAt to be older than the
    // rotation interval (30 minutes).
    const sessions = await seedPrisma.authSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(sessions.length).toBe(1);
    await seedPrisma.authSession.update({
      where: { id: sessions[0]!.id },
      data: { rotatedAt: new Date(Date.now() - 31 * 60 * 1000) },
    });

    // Call GET /api/v1/auth/session to trigger rotation.
    const sessionRes = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookie);
    expect(sessionRes.status).toBe(200);

    await dispatchAll();

    // Verify the rotation audit event exists.
    const rotatedEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'authentication.session.rotated' },
    });
    expect(rotatedEvents.length).toBeGreaterThanOrEqual(1);
    expect(rotatedEvents[0]!.outcome).toBe('success');
  });

  it('invalid CSRF on logout emits security.csrf.denied', async () => {
    // Log in.
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    if (!cookie) throw new Error('No cookie set');

    // Attempt logout with an invalid CSRF token.
    const logoutRes = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', 'invalid-csrf-token')
      .set('Origin', WEB_ORIGIN);
    expect(logoutRes.status).toBe(403);

    await dispatchAll();

    // Verify the CSRF denied audit event exists.
    const csrfDeniedEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'security.csrf.denied' },
    });
    expect(csrfDeniedEvents.length).toBeGreaterThanOrEqual(1);
    expect(csrfDeniedEvents[0]!.outcome).toBe('denied');
  });

  it('audit.delivery.failed is emitted when delivery permanently fails', async () => {
    // This test verifies that the dispatcher emits an
    // `audit.delivery.failed` event when delivery permanently fails.
    // We trigger this by inserting an outbox event whose canonical
    // draft has invalid metadata (a forbidden key), which causes the
    // audit-store append to return `permanent_failure`. We set the
    // attempt count to MAX_ATTEMPTS - 1 so the next failure triggers
    // the permanent-failure path.
    //
    // We use the real outbox and audit store. The outbox event is
    // inserted directly via the seedPrisma client. The canonical
    // draft is built with a forbidden metadata key, which the
    // audit-store append validates and rejects.
    const eventId = randomUUID();
    // Build a draft with a forbidden metadata key. The builder
    // rejects forbidden keys, so we build a valid draft and then
    // corrupt the metadata in the JSONB before insertion.
    const buildResult = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      actorType: 'USER',
      actorId: randomUUID(),
      source: 'api',
      outcome: 'success',
      scope: 'test',
      requestId: randomUUID(),
      eventId,
      metadata: { test: true },
    });
    if (!buildResult.ok) {
      throw new Error(`buildAuditEventDraft failed: ${buildResult.reason}`);
    }
    // Corrupt the metadata by adding a forbidden key.
    const corruptedDraft = {
      ...buildResult.draft,
      metadata: {
        ...(buildResult.draft.metadata as Record<string, unknown>),
        password: 'secret',
      },
    };

    // Insert the outbox event with attemptCount = 19 (one below
    // MAX_ATTEMPTS = 20). The dispatcher's permanent-failure path
    // is triggered when `event.attemptCount + 1 >= MAX_ATTEMPTS`,
    // i.e. when attemptCount >= 19 and the result is
    // permanent_failure.
    await seedPrisma.auditOutboxEvent.create({
      data: {
        id: randomUUID(),
        eventId,
        eventVersion: corruptedDraft.eventVersion,
        canonicalEventDraft: corruptedDraft as never,
        attemptCount: 19,
      },
    });

    // Run the dispatcher. The append should return
    // permanent_failure (forbidden metadata), and the dispatcher
    // should emit `audit.delivery.failed`.
    await dispatcher.dispatchOnce({ batchSize: 100, leaseDurationMs: 5_000 });

    // Verify the audit.delivery.failed event exists in the audit
    // store. It's emitted directly to the audit store (not through
    // the outbox).
    const deliveryFailedEvents = await auditPrisma.auditEvent.findMany({
      where: { action: 'audit.delivery.failed' },
    });
    expect(deliveryFailedEvents.length).toBeGreaterThanOrEqual(1);
    expect(deliveryFailedEvents[0]!.outcome).toBe('failure');
    expect(deliveryFailedEvents[0]!.source).toBe('dispatcher');

    // The metadata should include the failed event's ID and the
    // failure code, but NOT raw exception messages or secrets.
    const metadata = deliveryFailedEvents[0]!.metadata as Record<
      string,
      unknown
    >;
    expect(metadata['failedEventId']).toBe(eventId);
    expect(metadata['failureCode']).toBeTruthy();
    expect(JSON.stringify(metadata)).not.toContain('secret');
  });
});

// ---------------------------------------------------------------------------
// ADR-015 — Organisation and Facility Context audit integration
// ---------------------------------------------------------------------------

describe('ADR-015 Organisation and Facility Context audit integration', () => {
  /**
   * Helper: look up the seeded tenant, user, and membership, then
   * create an organisation + facility for the test. Returns the
   * IDs needed for context selection.
   */
  async function seedOrgAndFacility(): Promise<{
    tenantId: string;
    userId: string;
    membershipId: string;
    organisationId: string;
    facilityId: string;
  }> {
    const tenant = await seedPrisma.tenant.findFirstOrThrow({
      where: { slug: TEST_TENANT_SLUG },
    });
    const user = await seedPrisma.user.findFirstOrThrow({
      where: { email: TEST_EMAIL },
    });
    const membership = await seedPrisma.tenantMembership.findFirstOrThrow({
      where: { tenantId: tenant.id, userId: user.id },
    });
    const org = await seedPrisma.organisation.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'audit-int-org' } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: 'audit-int-org',
        displayName: 'Audit Integration Org',
      },
    });
    const fac = await seedPrisma.facility.upsert({
      where: {
        tenantId_organisationId_code: {
          tenantId: tenant.id,
          organisationId: org.id,
          code: 'audit-int-fac',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        organisationId: org.id,
        code: 'audit-int-fac',
        displayName: 'Audit Integration Facility',
      },
    });
    return {
      tenantId: tenant.id,
      userId: user.id,
      membershipId: membership.id,
      organisationId: org.id,
      facilityId: fac.id,
    };
  }

  /**
   * Helper: log in, select the tenant, return cookie + csrf + x-request-id.
   */
  async function loginAndSelectTenant(): Promise<{
    cookie: string;
    csrf: string;
    membershipId: string;
  }> {
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    if (!cookie) throw new Error('No cookie set');
    const memberships: Array<{ id: string }> = (
      loginRes.body as { memberships: Array<{ id: string }> }
    ).memberships;
    const membershipId = memberships[0]!.id;

    const csrfRes = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', cookie);
    const csrfToken = (csrfRes.body as { token: string }).token;

    const selectRes = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN)
      .send({ membershipId });
    expect(selectRes.status).toBe(200);

    return { cookie, csrf: csrfToken, membershipId };
  }

  /**
   * Helper: dispatch all pending outbox events to the audit store.
   * (Stub — the existing audit-integration tests cover the full
   * dispatch flow. For these ADR-015 integration tests, we inspect
   * the outbox rows directly to verify the action code, request ID,
   * and metadata.)
   */
  async function dispatchOutbox(): Promise<void> {
    // No-op. The existing audit-integration tests cover the full
    // dispatch flow; the ADR-015 integration tests inspect the
    // outbox rows directly.
  }

  it('organisation_context.selected audit event is emitted with correct action code and no PHI', async () => {
    const { organisationId } = await seedOrgAndFacility();
    const { cookie, csrf } = await loginAndSelectTenant();

    const requestId = 'adr015-org-sel-req-id';
    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', requestId)
      .send({ organisationId })
      .expect(200);

    // Find the outbox event for the organisation_context.selected action.
    const outboxRow = await seedPrisma.auditOutboxEvent.findFirst({
      where: {
        canonicalEventDraft: {
          path: ['action'],
          equals: 'organisation_context.selected',
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // The JSON-path filter may not be supported by all Prisma
    // versions; fall back to a broader filter and inspect the draft.
    const candidates = await seedPrisma.auditOutboxEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const match = candidates.find((row) => {
      const draft = row.canonicalEventDraft as { action?: string };
      return draft.action === 'organisation_context.selected';
    });
    expect(match).toBeDefined();
    if (match) {
      const draft = match.canonicalEventDraft as {
        action: string;
        category?: string;
        requestId?: string;
        metadata?: Record<string, unknown>;
        scope?: string;
      };
      expect(draft.action).toBe('organisation_context.selected');
      expect(draft.category).toBe('organisation_context');
      expect(draft.requestId).toBe(requestId);
      expect(draft.scope).toBe('organisation_context');
      // Verify no PHI, no display names, no credentials in metadata.
      const metadataJson = JSON.stringify(draft.metadata ?? {});
      expect(metadataJson).not.toContain('Audit Integration Org');
      expect(metadataJson).not.toContain('password');
      expect(metadataJson).not.toContain('tokenHash');
      expect(metadataJson).not.toContain('csrfToken');
    }
    void outboxRow;
    void dispatchOutbox;
  });

  it('organisation_context.cleared audit event is emitted with correct action code', async () => {
    const { organisationId } = await seedOrgAndFacility();
    const { cookie, csrf } = await loginAndSelectTenant();

    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .send({ organisationId })
      .expect(200);

    const requestId = 'adr015-org-clr-req-id';
    await request(server)
      .delete('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', requestId)
      .expect(200);

    const candidates = await seedPrisma.auditOutboxEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const match = candidates.find((row) => {
      const draft = row.canonicalEventDraft as { action?: string };
      return draft.action === 'organisation_context.cleared';
    });
    expect(match).toBeDefined();
    if (match) {
      const draft = match.canonicalEventDraft as {
        action: string;
        category?: string;
        requestId?: string;
        metadata?: Record<string, unknown>;
      };
      expect(draft.action).toBe('organisation_context.cleared');
      expect(draft.category).toBe('organisation_context');
      expect(draft.requestId).toBe(requestId);
      const metadataJson = JSON.stringify(draft.metadata ?? {});
      expect(metadataJson).not.toContain('Audit Integration Org');
      expect(metadataJson).not.toContain('password');
    }
  });

  it('facility_context.selected audit event is emitted with correct action code', async () => {
    const { organisationId, facilityId } = await seedOrgAndFacility();
    const { cookie, csrf } = await loginAndSelectTenant();

    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .send({ organisationId })
      .expect(200);

    const requestId = 'adr015-fac-sel-req-id';
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', requestId)
      .send({ facilityId })
      .expect(200);

    const candidates = await seedPrisma.auditOutboxEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const match = candidates.find((row) => {
      const draft = row.canonicalEventDraft as { action?: string };
      return draft.action === 'facility_context.selected';
    });
    expect(match).toBeDefined();
    if (match) {
      const draft = match.canonicalEventDraft as {
        action: string;
        category?: string;
        requestId?: string;
        metadata?: Record<string, unknown>;
      };
      expect(draft.action).toBe('facility_context.selected');
      expect(draft.category).toBe('facility_context');
      expect(draft.requestId).toBe(requestId);
      const metadataJson = JSON.stringify(draft.metadata ?? {});
      expect(metadataJson).not.toContain('Audit Integration Facility');
      expect(metadataJson).not.toContain('password');
    }
  });

  it('facility_context.cleared audit event is emitted with correct action code', async () => {
    const { organisationId, facilityId } = await seedOrgAndFacility();
    const { cookie, csrf } = await loginAndSelectTenant();

    await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .send({ organisationId })
      .expect(200);
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .send({ facilityId })
      .expect(200);

    const requestId = 'adr015-fac-clr-req-id';
    await request(server)
      .delete('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', requestId)
      .expect(200);

    const candidates = await seedPrisma.auditOutboxEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const match = candidates.find((row) => {
      const draft = row.canonicalEventDraft as { action?: string };
      return draft.action === 'facility_context.cleared';
    });
    expect(match).toBeDefined();
    if (match) {
      const draft = match.canonicalEventDraft as {
        action: string;
        category?: string;
        requestId?: string;
        metadata?: Record<string, unknown>;
      };
      expect(draft.action).toBe('facility_context.cleared');
      expect(draft.category).toBe('facility_context');
      expect(draft.requestId).toBe(requestId);
      const metadataJson = JSON.stringify(draft.metadata ?? {});
      expect(metadataJson).not.toContain('Audit Integration Facility');
      expect(metadataJson).not.toContain('password');
    }
  });

  it('an unauthorised organisation-context selection produces no successful-mutation audit event', async () => {
    // Attempt to select a non-existent organisation. The request
    // must fail with 403; no organisation_context.selected event
    // must be emitted.
    const { cookie, csrf } = await loginAndSelectTenant();
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(server)
      .put('/api/v1/context/organisation')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .set('Origin', WEB_ORIGIN)
      .set('X-Request-Id', 'adr015-unauth-org-req')
      .send({ organisationId: nonExistentId })
      .expect(403);

    // The response must be a generic 403 with no scope-target info.
    const bodyJson = JSON.stringify(response.body);
    expect(bodyJson).not.toContain(nonExistentId);

    // Verify no organisation_context.selected outbox event was
    // persisted for this request.
    const candidates = await seedPrisma.auditOutboxEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unauthMatch = candidates.find((row) => {
      const draft = row.canonicalEventDraft as {
        action?: string;
        requestId?: string;
      };
      return (
        draft.action === 'organisation_context.selected' &&
        draft.requestId === 'adr015-unauth-org-req'
      );
    });
    expect(unauthMatch).toBeUndefined();
  });
});
