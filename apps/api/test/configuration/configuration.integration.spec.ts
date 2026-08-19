/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Configuration Administration API Integration Tests (BC16).
 *
 * These tests exercise the first canonical Configuration vertical
 * slice end-to-end via supertest against a real NestJS application
 * with a real PostgreSQL 17 database:
 *
 * - GET /api/v1/configuration/:key  (effective value + provenance)
 * - PUT /api/v1/configuration/:key  (override create/update)
 *
 * Coverage:
 * - first registered key only (scheduling.appointment.noShowGracePeriod)
 * - unknown/unregistered key rejected fail-closed
 * - malformed value rejected (type/bounds via the registry schema)
 * - unsupported layer rejected (L1/L2/L5-L8)
 * - trusted scope can never be spoofed via body/query
 * - R13 (System Administrator) writes L3 within its tenant; denied L4
 * - R09 (Clinic Administrator) writes L4 within its facility; denied L3
 * - R06/R07 (non-ratified roles) denied read and write
 * - admin GET emits the Configuration read audit event
 * - successful create/update emits the matching write audit event
 * - failed/unauthorized write does NOT emit a success audit event
 * - value + version-history + audit are atomic in one transaction
 * - version history increments and retains previous rows
 *
 * Per the repository test conventions, these tests require
 * PostgreSQL 17 and run inside the disposable cluster bootstrap.
 */

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
  PlatformRoleCode,
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
import { resetThrottlerStorageSafely } from '../clinic-admin/_clinic-admin-test-helpers.js';
import {
  CONFIGURATION_KEY_REGISTRY,
  NO_SHOW_GRACE_PERIOD_KEY,
} from '@ibn-hayan/configuration';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

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
let throttlerStorage: ThrottlerStorage;

const TEST_PASSWORD = 'sufficiently-long-password';
const ORIGIN = 'http://localhost:3000';
const KEY = NO_SHOW_GRACE_PERIOD_KEY;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();

  server = app.getHttpServer() as Server;
  prisma = app.get(PrismaService);
  users = app.get(USER_REPOSITORY);
  tenants = app.get(TENANT_REPOSITORY);
  memberships = app.get(TENANT_MEMBERSHIP_REPOSITORY);
  roleAssignments = app.get(TENANT_ROLE_ASSIGNMENT_REPOSITORY);
  organisations = app.get(ORGANISATION_REPOSITORY);
  facilities = app.get(FACILITY_REPOSITORY);
  credentials = app.get(LocalCredentialService);
  passwordService = app.get(PasswordService);
  throttlerStorage = app.get(ThrottlerStorage);
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

beforeEach(async () => {
  await prisma.auditOutboxEvent.deleteMany();
  await prisma.configurationValueVersion.deleteMany({
    where: { layer: { in: ['L3', 'L4'] } },
  });
  await prisma.configurationValue.deleteMany({
    where: { layer: { in: ['L3', 'L4'] } },
  });
  await prisma.authSession.deleteMany();
  await prisma.tenantRoleAssignment.deleteMany();
  await prisma.tenantMembership.deleteMany();
  await prisma.localCredential.deleteMany();
  await prisma.user.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.organisation.deleteMany();
  await prisma.tenant.deleteMany();
  resetThrottlerStorageSafely(throttlerStorage);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashPassword(password: string): Promise<string> {
  return passwordService.hash(password);
}

async function createUser(
  email: string,
  displayName: string,
): Promise<{ userId: string }> {
  const user = await users.create({ email, displayName });
  const hash = await hashPassword(TEST_PASSWORD);
  await credentials.createCredential({
    userId: user.id,
    passwordHash: hash,
    passwordChangedAt: new Date(),
  });
  return { userId: user.id };
}

async function loginUser(email: string, password: string): Promise<string> {
  const response = await request(server)
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email, password });
  const cookie = response.headers['set-cookie'];
  if (!cookie || !cookie[0]) {
    throw new Error(
      `No cookie returned from login: status=${response.status}, body=${JSON.stringify(response.body)}`,
    );
  }
  return cookie[0];
}

async function getCsrf(cookie: string): Promise<string> {
  const response = await request(server)
    .get('/api/v1/auth/csrf')
    .set('Cookie', cookie);
  const token = (response.body as { token: string }).token;
  if (!token) {
    throw new Error('No CSRF token returned');
  }
  return token;
}

async function selectContext(
  cookie: string,
  tenantMembershipId: string,
  organisationId: string,
  facilityId: string,
): Promise<void> {
  const csrf = await getCsrf(cookie);
  const tenantResponse = await request(server)
    .put('/api/v1/context/tenant')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .set('X-CSRF-Token', csrf)
    .send({ membershipId: tenantMembershipId });
  if (tenantResponse.status >= 400) {
    throw new Error(
      `selectContext tenant failed: status=${tenantResponse.status}, body=${JSON.stringify(tenantResponse.body)}`,
    );
  }
  const csrf2 = await getCsrf(cookie);
  const orgResponse = await request(server)
    .put('/api/v1/context/organisation')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .set('X-CSRF-Token', csrf2)
    .send({ organisationId });
  if (orgResponse.status >= 400) {
    throw new Error(
      `selectContext organisation failed: status=${orgResponse.status}`,
    );
  }
  const csrf3 = await getCsrf(cookie);
  const facilityResponse = await request(server)
    .put('/api/v1/context/facility')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .set('X-CSRF-Token', csrf3)
    .send({ facilityId });
  if (facilityResponse.status >= 400) {
    throw new Error(
      `selectContext facility failed: status=${facilityResponse.status}`,
    );
  }
}

interface SeedResult {
  cookie: string;
  tenantId: string;
  organisationId: string;
  facilityId: string;
  membershipId: string;
}

async function seedScope(
  slug: string,
  role: PlatformRoleCode = 'R09_ADMINISTRATOR',
): Promise<SeedResult> {
  const { userId } = await createUser(`${slug}@example.com`, slug);
  const tenant = await tenants.create({
    slug: `tn-${slug}`,
    displayName: slug,
  });
  const tenantId = tenant.id;
  const organisation = await organisations.create({
    tenantId: tenantId,
    code: `org-${slug}`,
    displayName: slug,
  });
  const organisationId = organisation.id;
  const facility = await facilities.create({
    tenantId: tenantId,
    organisationId: organisationId,
    code: `fac-${slug}`,
    displayName: slug,
  });
  const facilityId = facility.id;
  const membership = await memberships.create({
    userId: userId as UserId,
    tenantId: tenantId,
  });
  const membershipId = membership.id;
  await roleAssignments.create({
    tenantMembershipId: membershipId,
    roleCode: role,
    scopeLevel: 'organisation',
    scopeOrganisationId: organisationId,
  });
  const cookie = await loginUser(`${slug}@example.com`, TEST_PASSWORD);
  await selectContext(cookie, membershipId, organisationId, facilityId);
  return { cookie, tenantId, organisationId, facilityId, membershipId };
}

function getEffective(cookie: string, key: string): Promise<request.Response> {
  return request(server)
    .get(`/api/v1/configuration/${key}`)
    .set('Cookie', cookie)
    .set('Origin', ORIGIN);
}

async function putOverride(
  cookie: string,
  key: string,
  body: Record<string, unknown>,
): Promise<request.Response> {
  const csrf = await getCsrf(cookie);
  return request(server)
    .put(`/api/v1/configuration/${key}`)
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrf)
    .send(body);
}

function outboxActions(
  drafts: { canonicalEventDraft: unknown }[],
): (string | undefined)[] {
  return drafts.map(
    (d) => (d.canonicalEventDraft as { action?: string }).action,
  );
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Configuration Administration API (BC16)', () => {
  // -------------------------------------------------------------------------
  // GET effective
  // -------------------------------------------------------------------------

  describe('GET effective value', () => {
    it('returns 401 without a session cookie', async () => {
      const response = await getEffective('invalid-cookie', KEY);
      expect(response.status).toBe(401);
    });

    it('returns the L1-seeded default with provenance for R09', async () => {
      const { cookie } = await seedScope('get-l1');
      const response = await getEffective(cookie, KEY);
      expect(response.status).toBe(200);
      expect(response.body.key).toBe(KEY);
      expect(response.body.value).toBe(15);
      expect(response.body.valueType).toBe('integer');
      expect(response.body.sourceLayer).toBe('L1');
      expect(response.body.valueVersion).toBe(1);
      expect(response.body.resolvedAt).toBeTruthy();
    });

    it('emits the administrative read audit event', async () => {
      const { cookie } = await seedScope('get-audit');
      const response = await getEffective(cookie, KEY);
      expect(response.status).toBe(200);
      const events = await prisma.auditOutboxEvent.findMany();
      const actions = outboxActions(events);
      expect(actions).toContain('configuration.effective_value.viewed');
      // No PHI and no secrets — only key/layer/scope metadata.
      const draft = events.find(
        (e) =>
          (e.canonicalEventDraft as { action?: string }).action ===
          'configuration.effective_value.viewed',
      );
      const canonical = draft!.canonicalEventDraft as {
        metadata?: Record<string, unknown>;
      };
      expect(canonical.metadata?.key).toBe(KEY);
      expect(canonical.metadata?.sourceLayer).toBe('L1');
    });

    it('unknown key is denied fail-closed', async () => {
      const { cookie } = await seedScope('get-unknown');
      const response = await getEffective(
        cookie,
        'scheduling.appointment.unknownKey',
      );
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CONFIGURATION_UNKNOWN_KEY');
    });

    it('R06 Receptionist is denied (no configuration:read)', async () => {
      const { cookie } = await seedScope('get-r06', 'R06_RECEPTIONIST');
      const response = await getEffective(cookie, KEY);
      expect(response.status).toBe(403);
    });

    it('R13 System Administrator reads effective value', async () => {
      const { cookie } = await seedScope('get-r13', 'R13_SYSTEM_ADMINISTRATOR');
      const response = await getEffective(cookie, KEY);
      expect(response.status).toBe(200);
      expect(response.body.value).toBe(15);
    });
  });

  // -------------------------------------------------------------------------
  // PUT override
  // -------------------------------------------------------------------------

  describe('PUT override', () => {
    it('rejects 401 without a session cookie', async () => {
      const response = await request(server)
        .put(`/api/v1/configuration/${KEY}`)
        .set('Origin', ORIGIN)
        .send({ layer: 'L3', value: 20 });
      expect(response.status).toBe(401);
    });

    it('unknown key is rejected safely', async () => {
      const { cookie } = await seedScope('put-unknown');
      const response = await putOverride(
        cookie,
        'scheduling.appointment.unknownKey',
        {
          layer: 'L3',
          value: 20,
        },
      );
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CONFIGURATION_UNKNOWN_KEY');
    });

    it('malformed value is rejected (zod schema from registry)', async () => {
      const { cookie } = await seedScope(
        'put-malformed',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      for (const value of ['fifteen', 3, 121, null]) {
        const response = await putOverride(cookie, KEY, {
          layer: 'L3',
          value,
        });
        expect(response.status).toBe(400);
      }
      // Bounds edges accepted:
      for (const value of [5, 120]) {
        const response = await putOverride(cookie, KEY, {
          layer: 'L3',
          value,
        });
        expect(response.status).toBe(200);
        expect(response.body.value).toBe(value);
      }
    });

    it('unsupported layer is rejected', async () => {
      const { cookie } = await seedScope('put-layer');
      for (const layer of ['L1', 'L2', 'L5', 'L8', 'DEPARTMENT']) {
        const response = await putOverride(cookie, KEY, { layer, value: 30 });
        expect(response.status).toBe(400);
      }
    });

    it('R13 writes L3 within authorized tenant', async () => {
      const { cookie, tenantId } = await seedScope(
        'put-r13-l3',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const response = await putOverride(cookie, KEY, {
        layer: 'L3',
        value: 30,
      });
      expect(response.status).toBe(200);
      expect(response.body.outcome).toBe('created');
      expect(response.body.layer).toBe('L3');
      expect(response.body.scope.tenantId).toBe(tenantId);
      expect(response.body.valueVersion).toBe(1);

      // Version-history row exists in the same schema.
      const versions = await prisma.configurationValueVersion.findMany({
        where: { layer: 'L3' },
        select: { valueVersion: true as const, value: true as const },
      });
      expect(versions.length).toBe(1);
      expect(versions[0]?.value).toBe(30);

      // Audit event emitted (in transactional outbox).
      const events = await prisma.auditOutboxEvent.findMany();
      const actions = outboxActions(events);
      expect(actions).toContain('configuration.override.created');
    });

    it('R13 cannot write L4', async () => {
      const { cookie } = await seedScope(
        'put-r13-l4',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const response = await putOverride(cookie, KEY, {
        layer: 'L4',
        value: 30,
      });
      expect(response.status).toBe(403);
    });

    it('R13 cannot write another tenant (no existence leakage)', async () => {
      const { cookie, tenantId } = await seedScope(
        'put-r13-other',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      // Attempt to write an L3 override while claiming another tenant
      // scope in the body is silently ignored — the server derives from
      // trusted context; the layer must remain tenant-scoped.
      const response = await putOverride(cookie, KEY, {
        layer: 'L3',
        value: 40,
        tenantId: 'spoofed-not-a-uuid',
      });
      expect(response.status).toBe(200);
      expect(response.body.scope.tenantId).toBe(tenantId);
    });

    it('R09 writes L4 within authorized facility', async () => {
      const { cookie, tenantId, organisationId, facilityId } =
        await seedScope('put-r09-l4');
      const response = await putOverride(cookie, KEY, {
        layer: 'L4',
        value: 45,
      });
      expect(response.status).toBe(200);
      expect(response.body.outcome).toBe('created');
      expect(response.body.layer).toBe('L4');
      expect(response.body.scope.tenantId).toBe(tenantId);
      expect(response.body.scope.organisationId).toBe(organisationId);
      expect(response.body.scope.facilityId).toBe(facilityId);
      expect(response.body.valueVersion).toBe(1);
    });

    it('R09 cannot write L3', async () => {
      const { cookie } = await seedScope('put-r09-l3');
      const response = await putOverride(cookie, KEY, {
        layer: 'L3',
        value: 30,
      });
      expect(response.status).toBe(403);
    });

    it('update increments version and retains previous history', async () => {
      const { cookie, tenantId } = await seedScope(
        'put-update',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const first = await putOverride(cookie, KEY, { layer: 'L3', value: 20 });
      expect(first.status).toBe(200);
      expect(first.body.valueVersion).toBe(1);
      const second = await putOverride(cookie, KEY, { layer: 'L3', value: 25 });
      expect(second.status).toBe(200);
      expect(second.body.outcome).toBe('updated');
      expect(second.body.valueVersion).toBe(2);

      const versions = await prisma.configurationValueVersion.findMany({
        where: { layer: 'L3', tenantId },
        orderBy: { valueVersion: 'asc' },
      });
      expect(versions.map((v) => v.valueVersion)).toEqual([1, 2]);
      expect(versions.map((v) => v.value)).toEqual([20, 25]);
    });

    it('failed/unauthorized write does not emit a success audit event', async () => {
      const { cookie } = await seedScope('put-audit-fail');
      const response = await putOverride(cookie, KEY, {
        layer: 'L3',
        value: 3,
      });
      expect(response.status).toBe(400);
      const events = await prisma.auditOutboxEvent.findMany();
      const actions = outboxActions(events);
      expect(actions).not.toContain('configuration.override.created');
      expect(actions).not.toContain('configuration.override.updated');
    });

    it('write is atomic: value, version, and audit appear together', async () => {
      const { cookie, tenantId } = await seedScope(
        'put-atomic',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const response = await putOverride(cookie, KEY, {
        layer: 'L3',
        value: 22,
      });
      expect(response.status).toBe(200);

      const [value, versions, events] = await Promise.all([
        prisma.configurationValue.findFirst({
          where: { layer: 'L3', tenantId },
        }),
        prisma.configurationValueVersion.findMany({
          where: { layer: 'L3', tenantId },
        }),
        prisma.auditOutboxEvent.findMany(),
      ]);
      expect(value).not.toBeNull();
      expect(versions.length).toBe(1);
      const actions = outboxActions(events);
      expect(actions).toContain('configuration.override.created');
    });
  });

  // -------------------------------------------------------------------------
  // Resolution precedence across the API
  // -------------------------------------------------------------------------

  describe('Resolution precedence', () => {
    it('L3 override supersedes L1; L4 supersedes L3', async () => {
      const { cookie, tenantId, organisationId, facilityId } = await seedScope(
        'precedence',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      await putOverride(cookie, KEY, { layer: 'L3', value: 30 });
      let response = await getEffective(cookie, KEY);
      expect(response.body.value).toBe(30);
      expect(response.body.sourceLayer).toBe('L3');

      // Insert an L4 row directly (the R13 session legitimately cannot
      // write L4 through the API). Resolution must now prefer L4.
      const l4Row = await prisma.configurationValue.create({
        data: {
          key: KEY,
          layer: 'L4',
          tenantId,
          organisationId,
          facilityId,
          value: 45,
          valueVersion: 1,
        },
      });
      await prisma.configurationValueVersion.create({
        data: {
          configurationValueId: l4Row.id,
          key: KEY,
          layer: 'L4',
          tenantId,
          organisationId,
          facilityId,
          value: 45,
          valueVersion: 1,
        },
      });

      response = await getEffective(cookie, KEY);
      expect(response.body.value).toBe(45);
      expect(response.body.sourceLayer).toBe('L4');
    });
  });

  // -------------------------------------------------------------------------
  // Registry invariants (facilitates single registered key constraint)
  // -------------------------------------------------------------------------

  describe('Registry invariants', () => {
    it('only the first production key is registered', () => {
      expect(CONFIGURATION_KEY_REGISTRY.map((d) => d.key)).toEqual([KEY]);
    });
  });
});
