import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { AuditPrismaService } from '../src/modules/audit/audit-prisma.service.js';
import { AuditDispatcherService } from '../src/modules/audit/audit-dispatcher.service.js';
import { setupDatabaseTests } from './database/_pg-bootstrap.js';

if (process.env['DATABASE_URL'] || process.env['AUDIT_DATABASE_URL']) {
  throw new Error('SECURITY_TEST_REQUIRES_ISOLATED_DATABASE');
}

setupDatabaseTests();

let app: INestApplication;
let server: Server;
let db: PrismaService;
let passwords: PasswordService;

const PASSWORD = 'isolated-test-password-2026';
const URLS = [
  '/api/v1/platform-admin/overview',
  '/api/v1/platform-admin/tenants',
];

type Role = 'R09_ADMINISTRATOR' | 'R13_SYSTEM_ADMINISTRATOR';

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();

  server = app.getHttpServer() as Server;
  db = app.get(PrismaService);
  passwords = app.get(PasswordService);
}, 60000);

afterAll(async () => {
  if (app) await app.close();
});

async function createActor(options: { role?: Role; platformGrant?: boolean }) {
  const id = randomUUID();
  const email = `test-${id}@example.invalid`;

  const user = await db.user.create({
    data: {
      email,
      normalisedEmail: email,
      displayName: `Security Test ${id}`,
      status: 'active',
    },
  });

  await db.localCredential.create({
    data: {
      userId: user.id,
      passwordHash: await passwords.hash(PASSWORD),
      passwordChangedAt: new Date(),
    },
  });

  if (options.role) {
    const tenant = await db.tenant.create({
      data: {
        slug: `security-${id}`,
        displayName: 'Security Test Tenant',
      },
    });

    const membership = await db.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
      },
    });

    await db.tenantRoleAssignment.create({
      data: {
        tenantMembershipId: membership.id,
        tenantId: tenant.id,
        roleCode: options.role,
      },
    });
  }

  if (options.platformGrant) {
    await db.platformAdministrator.create({
      data: { userId: user.id },
    });
  }

  const login = await request(server)
    .post('/api/v1/auth/login')
    .set('Origin', 'http://localhost:3000')
    .send({ email, password: PASSWORD })
    .expect(200);

  const header: unknown = (login.headers as Record<string, unknown>)[
    'set-cookie'
  ];
  const raw: unknown = Array.isArray(header)
    ? (header as unknown[])[0]
    : header;

  expect(typeof raw).toBe('string');

  if (typeof raw !== 'string') {
    throw new Error('LOGIN_COOKIE_HEADER_MISSING');
  }

  const cookie = raw.split(';', 1)[0];

  if (!cookie || !cookie.startsWith('ibn_hayan_session=')) {
    throw new Error('LOGIN_SESSION_COOKIE_INVALID');
  }

  expect(cookie.startsWith('ibn_hayan_session=')).toBe(true);

  return { user, cookie };
}

async function expectDenied(cookie: string, status: 401 | 403) {
  for (const url of URLS) {
    const response = await request(server)
      .get(url)
      .set('Cookie', cookie)
      .expect(status);

    expect(response.body).toHaveProperty('error');
    expect(response.body).not.toHaveProperty('items');
    expect(response.body).not.toHaveProperty('administrator');
  }
}

async function verifyPersistedPlatformDecision(
  actor: {
    readonly user: {
      readonly id: string;
      readonly email: string;
    };
    readonly cookie: string;
  },
  action: 'authorization.decision.allowed' | 'authorization.decision.denied',
  expectedOutcome: 'success' | 'denied',
): Promise<void> {
  const dispatcher = app.get(AuditDispatcherService);
  const auditStore = app.get(AuditPrismaService);

  // Deliver all pending events, using the existing dispatcher.
  // No operational database or external audit store is used.
  for (let attempt = 0; attempt < 10; attempt++) {
    const cycle = await dispatcher.dispatchOnce({ batchSize: 100 });

    expect(cycle.transientFailures).toBe(0);
    expect(cycle.permanentFailures).toBe(0);
    expect(cycle.lostLeases).toBe(0);

    if (cycle.claimed === 0) {
      break;
    }
  }

  const persisted = await auditStore.auditEvent.findMany({
    where: {
      actorId: actor.user.id,
      action,
    },
  });

  expect(persisted).toHaveLength(URLS.length);

  for (const url of URLS) {
    const matching = persisted.filter(
      (event) =>
        (
          event.metadata as {
            endpoint?: string;
          } | null
        )?.endpoint === url,
    );

    expect(matching).toHaveLength(1);

    expect(matching[0]).toMatchObject({
      actorId: actor.user.id,
      action,
      tenantId: null,
      scope: 'authorization',
      outcome: expectedOutcome,
      metadata: {
        endpoint: url,
        method: 'GET',
      },
    });

    expect(matching[0]?.sessionId).toBeTruthy();

    if (expectedOutcome === 'denied') {
      expect(matching[0]?.reasonCode).toBe('platform_grant_required');
    }
  }

  // A successfully delivered event must also be acknowledged
  // in the transactional outbox.
  const outbox = await db.auditOutboxEvent.findMany({
    where: {
      eventId: {
        in: persisted.map((event) => event.eventId),
      },
    },
    select: {
      eventId: true,
      deliveredAt: true,
    },
  });

  expect(outbox).toHaveLength(URLS.length);

  for (const record of outbox) {
    expect(record.deliveredAt).not.toBeNull();
  }

  // Repeating a dispatch must not duplicate persisted events.
  await dispatcher.dispatchOnce({ batchSize: 100 });

  const persistedCount = await auditStore.auditEvent.count({
    where: {
      actorId: actor.user.id,
      action,
    },
  });

  expect(persistedCount).toBe(URLS.length);

  const serialized = JSON.stringify(persisted, (_key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  );

  expect(serialized).not.toContain(PASSWORD);
  expect(serialized).not.toContain(actor.cookie);
  expect(serialized).not.toContain(actor.user.email);
}

describe('Platform Admin HTTP security boundaries', () => {
  it('rejects unauthenticated and forged identity requests', async () => {
    for (const url of URLS) {
      await request(server).get(url).expect(401);

      await request(server)
        .get(url)
        .set('X-Role', 'platform-super-admin')
        .set('X-User-Id', 'forged')
        .expect(401);
    }
  });

  it('rejects a real authenticated R09 Clinic Admin', async () => {
    const actor = await createActor({
      role: 'R09_ADMINISTRATOR',
    });

    const session = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', actor.cookie)
      .expect(200);

    expect(session.body).not.toHaveProperty('hasPlatformAdminAccess');

    await expectDenied(actor.cookie, 403);
  });

  it('rejects a real authenticated tenant-scoped R13', async () => {
    const actor = await createActor({
      role: 'R13_SYSTEM_ADMINISTRATOR',
    });

    await expectDenied(actor.cookie, 403);
  });

  it('accepts an independently granted Platform Admin', async () => {
    const actor = await createActor({
      platformGrant: true,
    });

    const session = await request(server)
      .get('/api/v1/auth/session')
      .set('Cookie', actor.cookie)
      .expect(200);

    expect(session.body).toHaveProperty('hasPlatformAdminAccess', true);

    const overview = await request(server)
      .get(URLS[0]!)
      .set('Cookie', actor.cookie)
      .expect(200);

    const overviewBody = overview.body as {
      administrator?: { displayName?: string };
    };

    expect(overviewBody.administrator?.displayName).toBe(
      actor.user.displayName,
    );

    const tenants = await request(server)
      .get(URLS[1]!)
      .set('Cookie', actor.cookie)
      .expect(200);

    const tenantsBody = tenants.body as { items?: unknown; hasMore?: unknown };

    expect(Array.isArray(tenantsBody.items)).toBe(true);
    expect(tenantsBody).toHaveProperty('hasMore');

    // Platform authority does not grant tenant or clinic access.
    // Reuse this authenticated session to avoid exhausting
    // the production login rate limiter during the test suite.
    for (const url of ['/api/v1/context', '/api/v1/clinic-admin/overview']) {
      const response = await request(server)
        .get(url)
        .set('Cookie', actor.cookie)
        .set('X-Role', 'R09_ADMINISTRATOR')
        .set('X-Tenant-Id', 'forged-tenant')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).not.toHaveProperty('activeContext');
      expect(response.body).not.toHaveProperty('regions');
      expect(response.body).not.toHaveProperty('items');
    }
  });

  it('rejects revoked grants even with an active tenant role', async () => {
    const actor = await createActor({
      role: 'R09_ADMINISTRATOR',
      platformGrant: true,
    });

    await request(server).get(URLS[0]!).set('Cookie', actor.cookie).expect(200);

    await db.platformAdministrator.update({
      where: { userId: actor.user.id },
      data: { revokedAt: new Date() },
    });

    await expectDenied(actor.cookie, 403);
  });

  it('rejects revoked platform-only identities', async () => {
    const actor = await createActor({
      platformGrant: true,
    });

    await db.platformAdministrator.update({
      where: { userId: actor.user.id },
      data: { revokedAt: new Date() },
    });

    await expectDenied(actor.cookie, 401);
  });

  it('rejects disabled Platform Admin users', async () => {
    const actor = await createActor({
      platformGrant: true,
    });

    await db.user.update({
      where: { id: actor.user.id },
      data: { status: 'disabled' },
    });

    await expectDenied(actor.cookie, 401);
  });

  it('rejects expired sessions', async () => {
    const actor = await createActor({
      platformGrant: true,
    });

    await db.authSession.updateMany({
      where: { userId: actor.user.id },
      data: { expiresAt: new Date('2020-01-01T00:00:00Z') },
    });

    await expectDenied(actor.cookie, 401);
  });

  it('rejects revoked sessions', async () => {
    const actor = await createActor({
      platformGrant: true,
    });

    await db.authSession.updateMany({
      where: { userId: actor.user.id },
      data: { revokedAt: new Date() },
    });

    await expectDenied(actor.cookie, 401);
  });

  it('records successful platform access for both endpoints', async () => {
    const actor = await createActor({ platformGrant: true });

    for (const url of URLS) {
      await request(server).get(url).set('Cookie', actor.cookie).expect(200);
    }

    const rows = await db.auditOutboxEvent.findMany({
      select: { canonicalEventDraft: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const events = rows
      .map(
        (row) =>
          row.canonicalEventDraft as {
            action?: string;
            actorId?: string;
            sessionId?: string;
            tenantId?: string | null;
            outcome?: string;
            metadata?: { endpoint?: string; method?: string };
          },
      )
      .filter(
        (event) =>
          event.actorId === actor.user.id &&
          event.action === 'authorization.decision.allowed',
      );

    for (const url of URLS) {
      const matching = events.filter(
        (event) => event.metadata?.endpoint === url,
      );

      expect(matching).toHaveLength(1);
      expect(matching[0]).toMatchObject({
        action: 'authorization.decision.allowed',
        actorId: actor.user.id,
        tenantId: null,
        outcome: 'success',
        metadata: { endpoint: url, method: 'GET' },
      });

      expect(matching[0]?.sessionId).toBeTruthy();
    }

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(PASSWORD);
    expect(serialized).not.toContain(actor.cookie);
    expect(serialized).not.toContain(actor.user.email);

    await verifyPersistedPlatformDecision(
      actor,
      'authorization.decision.allowed',
      'success',
    );
  });

  it('records denied platform access for a real Clinic Admin', async () => {
    const actor = await createActor({
      role: 'R09_ADMINISTRATOR',
    });

    await expectDenied(actor.cookie, 403);

    const rows = await db.auditOutboxEvent.findMany({
      select: { canonicalEventDraft: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const events = rows
      .map(
        (row) =>
          row.canonicalEventDraft as {
            action?: string;
            actorId?: string;
            tenantId?: string | null;
            outcome?: string;
            reasonCode?: string;
            metadata?: { endpoint?: string; method?: string };
          },
      )
      .filter(
        (event) =>
          event.actorId === actor.user.id &&
          event.action === 'authorization.decision.denied',
      );

    for (const url of URLS) {
      const matching = events.filter(
        (event) => event.metadata?.endpoint === url,
      );

      expect(matching).toHaveLength(1);
      expect(matching[0]).toMatchObject({
        action: 'authorization.decision.denied',
        actorId: actor.user.id,
        tenantId: null,
        outcome: 'denied',
        reasonCode: 'platform_grant_required',
        metadata: { endpoint: url, method: 'GET' },
      });
    }

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(PASSWORD);
    expect(serialized).not.toContain(actor.cookie);
    expect(serialized).not.toContain(actor.user.email);

    await verifyPersistedPlatformDecision(
      actor,
      'authorization.decision.denied',
      'denied',
    );
  });
});
