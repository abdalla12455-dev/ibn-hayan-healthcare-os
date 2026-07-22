import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { setupDatabaseTests } from '../database/_pg-bootstrap.js';
import { AppModule } from '../../src/app.module.js';
import { AuditPrismaService } from '../../src/modules/audit/audit-prisma.service.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaAuditOutboxRepository } from '../../src/modules/audit/prisma-audit-outbox.repository.js';
import {
  AUDIT_OUTBOX_PORT,
  type AuditOutboxPort,
  type AuditEventDraft,
  type PendingOutboxEvent,
} from '@ibn-hayan/observability';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Audit atomicity rollback tests.
 *
 * Per the ninth canonical batch specification, every state mutation
 * that emits an audit event MUST commit its outbox record in the
 * SAME Prisma transaction as the mutation. If the outbox insertion
 * fails, the mutation MUST roll back.
 *
 * These tests verify the atomicity property for:
 *  1. Login session creation.
 *  2. Session rotation.
 *  3. Logout revocation.
 *  4. Tenant-context selection.
 *  5. Tenant-context clearing.
 *
 * For each mutation, the test:
 *  - Sets a flag that makes the failing outbox port's `insert`
 *    method return `false` (simulating an outbox failure).
 *  - Triggers the mutation through the API.
 *  - Verifies the mutation did NOT commit.
 *  - Verifies no outbox row was persisted.
 */
setupDatabaseTests();

/**
 * A flag that controls whether the failing outbox port's `insert`
 * method returns `false` (simulating an outbox failure) or delegates
 * to the real outbox port. The flag is toggled per test.
 */
let outboxInsertShouldFail = false;

/**
 * The real `PrismaAuditOutboxRepository` instance, constructed
 * AFTER the `PrismaService` is available. The failing outbox port
 * delegates non-`insert` calls to this instance.
 */
let realOutbox: PrismaAuditOutboxRepository;

/**
 * Failing outbox port. Delegates to the real
 * `PrismaAuditOutboxRepository` but injects failures into the
 * `insert` method when the flag is set.
 */
const failingOutbox: AuditOutboxPort = {
  async insert(
    draft: AuditEventDraft,
    options?: { readonly transaction?: unknown },
  ): Promise<boolean> {
    if (outboxInsertShouldFail) {
      return false;
    }
    return realOutbox.insert(draft, options);
  },
  claimPending(
    batchSize: number,
    leaseOwner: string,
    leaseDurationMs: number,
  ): Promise<PendingOutboxEvent[]> {
    return realOutbox.claimPending(batchSize, leaseOwner, leaseDurationMs);
  },
  markDelivered(id: string, leaseOwner: string): Promise<boolean> {
    return realOutbox.markDelivered(id, leaseOwner);
  },
  recordFailure(
    id: string,
    failureCode: string,
    backoffMs: number,
    leaseOwner: string,
  ): Promise<boolean> {
    return realOutbox.recordFailure(id, failureCode, backoffMs, leaseOwner);
  },
  releaseExpiredLeases(now: Date): Promise<number> {
    return realOutbox.releaseExpiredLeases(now);
  },
};

let app: INestApplication;
let server: Server;
let auditPrisma: AuditPrismaService;
let prisma: PrismaService;
let seedPrisma: PrismaClient;

const WEB_ORIGIN = 'http://localhost:3000';
const TEST_EMAIL = 'audit-atomicity@example.invalid';
const TEST_PASSWORD = 'test-password-12345';
const TEST_TENANT_SLUG = 'audit-atomicity-tenant';
const TEST_TENANT_DISPLAY = 'Audit Atomicity Tenant';
const TEST_USER_DISPLAY = 'Audit Atomicity User';

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(AUDIT_OUTBOX_PORT)
    .useValue(failingOutbox)
    .compile();

  // Construct the real outbox repository with the injected
  // PrismaService. This is used by the failing outbox to delegate
  // non-`insert` calls.
  const injectedPrisma = moduleRef.get(PrismaService);
  realOutbox = new PrismaAuditOutboxRepository(injectedPrisma);

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

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  seedPrisma = new PrismaClient({ adapter });

  await seedTestData();
});

afterAll(async () => {
  await seedPrisma?.$disconnect();
  await auditPrisma?.$disconnect();
  await app?.close();
});

beforeEach(async () => {
  outboxInsertShouldFail = false;
  // Clean the audit tables and the outbox.
  await prisma.auditOutboxEvent.deleteMany({});
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" DISABLE TRIGGER USER`;
  await auditPrisma.$executeRaw`TRUNCATE TABLE "audit_events"`;
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" ENABLE TRIGGER USER`;
  await auditPrisma.auditChainHead.deleteMany({});
  // Reset session context.
  await seedPrisma.authSession.updateMany({
    data: { activeTenantMembershipId: null },
  });
});

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
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
        scopeOrganisationId: null,
        scopeFacilityId: null,
      },
    });
  }
}

describe('Audit atomicity rollback', () => {
  it('login session creation rolls back when outbox insertion fails', async () => {
    const sessionsBefore = await seedPrisma.authSession.count();

    outboxInsertShouldFail = true;

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(loginRes.status).not.toBe(200);

    outboxInsertShouldFail = false;

    const sessionsAfter = await seedPrisma.authSession.count();
    expect(sessionsAfter).toBe(sessionsBefore);

    const outboxRows = await prisma.auditOutboxEvent.count();
    expect(outboxRows).toBe(0);
  });

  it('session rotation rolls back when outbox insertion fails', async () => {
    outboxInsertShouldFail = false;
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    if (!cookie) throw new Error('No cookie set');

    const sessions = await seedPrisma.authSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(sessions.length).toBe(1);
    const sessionBefore = sessions[0]!;
    const tokenHashBefore = sessionBefore.tokenHash;

    // Force rotation by updating rotatedAt to be older than
    // the rotation interval (30 minutes).
    const oldRotatedAt = new Date(Date.now() - 31 * 60 * 1000);
    await seedPrisma.authSession.update({
      where: { id: sessionBefore.id },
      data: { rotatedAt: oldRotatedAt },
    });

    // Capture the tokenHash and rotatedAt AFTER the forced-rotation
    // setup. The rotation should NOT change these values if the
    // outbox insertion fails.
    const expectedTokenHash = tokenHashBefore;
    const expectedRotatedAt = oldRotatedAt.getTime();

    outboxInsertShouldFail = true;

    const sessionRes = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', cookie);

    expect(sessionRes.status).not.toBe(200);

    outboxInsertShouldFail = false;

    const sessionAfter = await seedPrisma.authSession.findUnique({
      where: { id: sessionBefore.id },
    });
    expect(sessionAfter).not.toBeNull();
    expect(sessionAfter!.tokenHash).toBe(expectedTokenHash);
    expect(sessionAfter!.rotatedAt?.getTime()).toBe(expectedRotatedAt);
  });

  it('logout revocation rolls back when outbox insertion fails', async () => {
    outboxInsertShouldFail = false;
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    if (!cookie) throw new Error('No cookie set');

    const csrfRes = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', cookie);
    expect(csrfRes.status).toBe(200);
    const csrfToken = (csrfRes.body as { token: string }).token;

    const sessions = await seedPrisma.authSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(sessions.length).toBe(1);
    const sessionId = sessions[0]!.id;

    outboxInsertShouldFail = true;

    const logoutRes = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN);

    expect(logoutRes.status).not.toBe(200);

    outboxInsertShouldFail = false;

    const sessionAfter = await seedPrisma.authSession.findUnique({
      where: { id: sessionId },
    });
    expect(sessionAfter).not.toBeNull();
    expect(sessionAfter!.revokedAt).toBeNull();
  });

  it('tenant-context selection rolls back when outbox insertion fails', async () => {
    outboxInsertShouldFail = false;
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

    outboxInsertShouldFail = true;

    const selectRes = await request(server)
      .put('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN)
      .send({ membershipId });

    expect(selectRes.status).not.toBe(200);

    outboxInsertShouldFail = false;

    const sessions = await seedPrisma.authSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.activeTenantMembershipId).toBeNull();
  });

  it('tenant-context clearing rolls back when outbox insertion fails', async () => {
    outboxInsertShouldFail = false;
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

    const sessions = await seedPrisma.authSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(sessions[0]!.activeTenantMembershipId).toBe(membershipId);

    outboxInsertShouldFail = true;

    const clearRes = await request(server)
      .delete('/api/v1/context/tenant')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', WEB_ORIGIN);

    expect(clearRes.status).not.toBe(200);

    outboxInsertShouldFail = false;

    const sessionsAfter = await seedPrisma.authSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(sessionsAfter[0]!.activeTenantMembershipId).toBe(membershipId);
  });
});
