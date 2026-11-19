import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
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
});
