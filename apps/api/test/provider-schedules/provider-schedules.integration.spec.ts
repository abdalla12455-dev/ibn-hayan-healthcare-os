/**
 * Provider Schedule Management endpoint integration tests.
 *
 * These tests exercise the full HTTP stack for the
 * POST / GET / DELETE /api/v1/provider-schedules endpoints with real
 * PostgreSQL 17. They verify:
 *  - creation under the `provider_schedules:manage` permission gate;
 *  - list under the `provider_schedules:read` permission gate;
 *  - canonical error codes (cross-midnight, overlap, time-window,
 *    validation, not-found);
 *  - cross-tenant isolation;
 *  - R13 System Administrator denial (least privilege).
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
  UserRepository,
  TenantRepository,
  TenantMembershipRepository,
  TenantRoleAssignmentRepository,
  OrganisationRepository,
  FacilityRepository,
  UserId,
  TenantId,
  OrganisationId,
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
import {
  resetThrottlerStorageSafely,
  fetchCsrfToken,
} from '../clinic-admin/_clinic-admin-test-helpers.js';

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

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function truncateAll(): Promise<void> {
  await prisma.auditOutboxEvent.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.providerSchedule.deleteMany();
  await prisma.providerFacilityAssignment.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.tenantRoleAssignment.deleteMany();
  await prisma.tenantMembership.deleteMany();
  await prisma.localCredential.deleteMany();
  await prisma.user.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.organisation.deleteMany();
  await prisma.tenant.deleteMany();
}

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

async function createTenant(
  slug: string,
  displayName: string,
): Promise<{ tenantId: string }> {
  const tenant = await tenants.create({ slug, displayName });
  return { tenantId: tenant.id };
}

async function createOrganisation(
  tenantId: string,
  code: string,
  displayName: string,
): Promise<{ organisationId: string }> {
  const organisation = await organisations.create({
    tenantId: tenantId as TenantId,
    code,
    displayName,
  });
  return { organisationId: organisation.id };
}

async function createFacility(
  tenantId: string,
  organisationId: string,
  code: string,
  displayName: string,
): Promise<{ facilityId: string }> {
  const facility = await facilities.create({
    tenantId: tenantId as TenantId,
    organisationId: organisationId as OrganisationId,
    code,
    displayName,
  });
  return { facilityId: facility.id };
}

async function createMembership(
  userId: string,
  tenantId: string,
  role: string,
  organisationId?: string,
): Promise<{ membershipId: string }> {
  const membership = await memberships.create({
    userId: userId as UserId,
    tenantId: tenantId as TenantId,
  });
  const roleData: {
    tenantMembershipId: string;
    roleCode: PlatformRoleCode;
    scopeLevel?: 'tenant' | 'organisation' | 'facility';
    scopeOrganisationId?: string;
  } = {
    tenantMembershipId: membership.id,
    roleCode: role as PlatformRoleCode,
  };
  if (organisationId) {
    roleData.scopeLevel = 'organisation';
    roleData.scopeOrganisationId = organisationId;
  }
  await roleAssignments.create(
    roleData as Parameters<typeof roleAssignments.create>[0],
  );
  return { membershipId: membership.id };
}

async function createEligibleProvider(
  tenantId: string,
  organisationId: string,
  facilityId: string,
): Promise<{ providerId: string }> {
  const provider = await prisma.provider.create({
    data: { tenantId, status: 'active' },
  });
  await prisma.providerFacilityAssignment.create({
    data: {
      tenantId,
      organisationId,
      facilityId,
      providerId: provider.id,
      revokedAt: null,
    },
  });
  return { providerId: provider.id };
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

async function selectContext(
  cookie: string,
  tenantMembershipId: string,
  organisationId: string,
  facilityId: string,
): Promise<void> {
  const csrfResponse = await request(server)
    .get('/api/v1/auth/csrf')
    .set('Cookie', cookie);
  const csrf = (csrfResponse.body as { token: string }).token;
  if (!csrf) {
    throw new Error('No CSRF token returned');
  }
  for (const [path, payload] of [
    ['/api/v1/context/tenant', { membershipId: tenantMembershipId }],
    ['/api/v1/context/organisation', { organisationId }],
    ['/api/v1/context/facility', { facilityId }],
  ] as [string, Record<string, string>][]) {
    const response = await request(server)
      .put(path)
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf)
      .send(payload);
    if (response.status >= 400) {
      throw new Error(
        `selectContext ${path} failed: status=${response.status}, body=${JSON.stringify(response.body)}`,
      );
    }
  }
}

async function seedEnvironment(
  emailSlug: string,
  role: string,
): Promise<{
  cookie: string;
  tenantId: string;
  organisationId: string;
  facilityId: string;
  providerId: string;
  membershipId: string;
}> {
  const { userId } = await createUser(`${emailSlug}@example.com`, emailSlug);
  const { tenantId } = await createTenant(
    `tn-${emailSlug}`,
    `Tenant ${emailSlug}`,
  );
  const { organisationId } = await createOrganisation(
    tenantId,
    `org-${emailSlug}`,
    `Organisation ${emailSlug}`,
  );
  const { facilityId } = await createFacility(
    tenantId,
    organisationId,
    `fac-${emailSlug}`,
    `Facility ${emailSlug}`,
  );
  const { membershipId } = await createMembership(
    userId,
    tenantId,
    role,
    organisationId,
  );
  const { providerId } = await createEligibleProvider(
    tenantId,
    organisationId,
    facilityId,
  );
  const cookie = await loginUser(`${emailSlug}@example.com`, TEST_PASSWORD);
  await selectContext(cookie, membershipId, organisationId, facilityId);
  return {
    cookie,
    tenantId,
    organisationId,
    facilityId,
    providerId,
    membershipId,
  };
}

beforeEach(async () => {
  await truncateAll();
  resetThrottlerStorageSafely(throttlerStorage);
});

// ===========================================================================
// Tests
// ===========================================================================

describe('Provider Schedule Management', () => {
  describe('POST /api/v1/provider-schedules', () => {
    it('creates a schedule entry under provider_schedules:manage (R07)', async () => {
      const env = await seedEnvironment('ps-create', 'R07_SCHEDULER');
      const response = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      expect(response.status).toBe(201);
      const body = response.body as Record<string, unknown>;
      expect(typeof body.id).toBe('string');
      expect(body.providerId).toBe(env.providerId);
      expect(body.dayOfWeek).toBe(2);
      expect(body.startTime).toBe('09:00:00');
      expect(body.endTime).toBe('17:00:00');
    });

    it('creates a schedule entry under R07 Scheduler permissions', async () => {
      const env = await seedEnvironment('ps-create-r07', 'R07_SCHEDULER');
      const response = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '12:00',
        });
      expect(response.status).toBe(201);
    });

    it('rejects schema-invalid input with the approved 422 validation code', async () => {
      const env = await seedEnvironment('ps-invalid', 'R07_SCHEDULER');
      const response = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: 'not-a-uuid',
          dayOfWeek: 99,
          startTime: '09:00',
          endTime: '17:00',
        });
      expect(response.status).toBe(400);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_VALIDATION_ERROR',
      );
    });

    it('rejects cross-midnight windows fail-closed', async () => {
      const env = await seedEnvironment('ps-xmid', 'R07_SCHEDULER');
      const response = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '22:00',
          endTime: '02:00',
        });
      expect(response.status).toBe(400);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_VALIDATION_ERROR',
      );
    });

    it('rejects inverted time windows with the approved code', async () => {
      const env = await seedEnvironment('ps-inv', 'R07_SCHEDULER');
      const response = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '12:00',
          endTime: '09:00',
        });
      expect(response.status).toBe(400);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_VALIDATION_ERROR',
      );
    });

    it('allows overlapping entries (operator-ratified decision)', async () => {
      const env = await seedEnvironment('ps-ov', 'R07_SCHEDULER');
      const first = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '12:00',
        });
      expect(first.status).toBe(201);
      const second = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '11:00',
          endTime: '14:00',
        });
      expect(second.status).toBe(201);
    });

    it('denies R13 System Administrator (least privilege)', async () => {
      const env = await seedEnvironment('ps-deny', 'R13_SYSTEM_ADMINISTRATOR');
      const response = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      expect(response.status).toBe(403);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'AUTHORIZATION_FORBIDDEN',
      );
    });

    it('requires a session', async () => {
      const response = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .send({
          providerId: '2e30f614-fd1f-4fb2-a01c-5dee530f4c2d',
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/provider-schedules', () => {
    it('lists entries for the scoped provider', async () => {
      const env = await seedEnvironment('ps-list', 'R07_SCHEDULER');
      await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      const response = await request(server)
        .get(`/api/v1/provider-schedules?providerId=${env.providerId}`)
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie);
      expect(response.status).toBe(200);
      const body = response.body as { entries: unknown[] };
      expect(body.entries).toHaveLength(1);
    });

    it('denies cross-tenant provider lookup with the approved 422', async () => {
      const first = await seedEnvironment('ps-t1', 'R07_SCHEDULER');
      const second = await seedEnvironment('ps-t2', 'R07_SCHEDULER');
      await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', first.cookie)
        .send({
          providerId: first.providerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      const response = await request(server)
        .get(`/api/v1/provider-schedules?providerId=${first.providerId}`)
        .set('Origin', ORIGIN)
        .set('Cookie', second.cookie);
      expect(response.status).toBe(422);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_PROVIDER_NOT_FOUND',
      );
    });

    it('rejects a non-UUID providerId query with the approved 400 validation error', async () => {
      const env = await seedEnvironment('ps-list-badid', 'R07_SCHEDULER');
      const response = await request(server)
        .get('/api/v1/provider-schedules?providerId=not-a-uuid')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie);
      expect(response.status).toBe(400);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_VALIDATION_ERROR',
      );
    });
  });

  describe('DELETE /api/v1/provider-schedules/:id', () => {
    it('deletes an entry under the manage permission', async () => {
      const env = await seedEnvironment('ps-del', 'R07_SCHEDULER');
      const created = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      const id = (created.body as { id: string }).id;
      const csrf = await fetchCsrfToken(server, env.cookie);
      const response = await request(server)
        .delete(`/api/v1/provider-schedules/${id}`)
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', csrf)
        .set('Cookie', env.cookie);
      expect(response.status).toBe(200);
      const listResponse = await request(server)
        .get(`/api/v1/provider-schedules?providerId=${env.providerId}`)
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie);
      const body = listResponse.body as { entries: unknown[] };
      expect(body.entries).toHaveLength(0);
    });

    it('returns the approved 404 when deleting a foreign-tenant entry', async () => {
      const first = await seedEnvironment('ps-dt1', 'R07_SCHEDULER');
      const second = await seedEnvironment('ps-dt2', 'R07_SCHEDULER');
      const created = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', first.cookie)
        .send({
          providerId: first.providerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      const id = (created.body as { id: string }).id;
      const csrf = await fetchCsrfToken(server, second.cookie);
      const response = await request(server)
        .delete(`/api/v1/provider-schedules/${id}`)
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', csrf)
        .set('Cookie', second.cookie);
      expect(response.status).toBe(404);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_NOT_FOUND',
      );
    });

    it('denies deleting an entry in another facility of the SAME tenant and organisation', async () => {
      const env = await seedEnvironment('ps-df-sameorg', 'R07_SCHEDULER');
      // Second facility in the same tenant + organisation.
      const { facilityId: facilityBId } = await createFacility(
        env.tenantId,
        env.organisationId,
        'fac-ps-df-sameorg-b',
        'Facility B',
      );
      // Create an entry while facility A is active.
      const created = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', env.cookie)
        .send({
          providerId: env.providerId,
          dayOfWeek: 3,
          startTime: '08:00',
          endTime: '14:00',
        });
      expect(created.status).toBe(201);
      const id = (created.body as { id: string }).id;

      // Switch the active context to facility B (same tenant, same
      // organisation) and attempt to delete the facility-A entry.
      await selectContext(
        env.cookie,
        env.membershipId,
        env.organisationId,
        facilityBId,
      );
      const csrf = await fetchCsrfToken(server, env.cookie);
      const response = await request(server)
        .delete(`/api/v1/provider-schedules/${id}`)
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', csrf)
        .set('Cookie', env.cookie);
      expect(response.status).toBe(404);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_NOT_FOUND',
      );

      // The facility-A row must remain unchanged.
      const row = await prisma.providerSchedule.findFirst({
        where: { id },
      });
      expect(row).not.toBeNull();
      expect(row!.facilityId).toBe(env.facilityId);

      // No successful delete audit event must have been emitted.
      const auditRows = await prisma.auditOutboxEvent.findMany();
      const deletedEvents = auditRows.filter(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'provider_schedules.deleted',
      );
      expect(deletedEvents).toHaveLength(0);
    });

    it('denies deleting an entry in another organisation/facility of the SAME tenant', async () => {
      const { userId } = await createUser(
        'ps-df-crossorg@example.com',
        'ps-df-crossorg',
      );
      const { tenantId } = await createTenant(
        'tn-ps-df-crossorg',
        'CrossOrg Tenant',
      );
      const { organisationId: orgAId } = await createOrganisation(
        tenantId,
        'org-ps-df-crossorg-a',
        'Org A',
      );
      const { facilityId: facAId } = await createFacility(
        tenantId,
        orgAId,
        'fac-ps-df-crossorg-a',
        'Facility A',
      );
      const { organisationId: orgBId } = await createOrganisation(
        tenantId,
        'org-ps-df-crossorg-b',
        'Org B',
      );
      const { facilityId: facBId } = await createFacility(
        tenantId,
        orgBId,
        'fac-ps-df-crossorg-b',
        'Facility B',
      );
      // Organisation-scoped R07 assignments at BOTH organisations so
      // the principal can select either organisation context.
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R07_SCHEDULER',
        orgAId,
      );
      await roleAssignments.create({
        tenantMembershipId: membershipId,
        roleCode: 'R07_SCHEDULER',
        scopeLevel: 'organisation',
        scopeOrganisationId: orgBId,
      } as Parameters<typeof roleAssignments.create>[0]);
      const { providerId } = await createEligibleProvider(
        tenantId,
        orgAId,
        facAId,
      );
      const cookie = await loginUser(
        'ps-df-crossorg@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, orgAId, facAId);

      const created = await request(server)
        .post('/api/v1/provider-schedules')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
          providerId,
          dayOfWeek: 4,
          startTime: '08:00',
          endTime: '14:00',
        });
      expect(created.status).toBe(201);
      const id = (created.body as { id: string }).id;

      // Switch the active context to organisation B / facility B and
      // attempt to delete the facility-A entry.
      await selectContext(cookie, membershipId, orgBId, facBId);
      const csrf = await fetchCsrfToken(server, cookie);
      const response = await request(server)
        .delete(`/api/v1/provider-schedules/${id}`)
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', csrf)
        .set('Cookie', cookie);
      expect(response.status).toBe(404);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_NOT_FOUND',
      );

      // The facility-A row must remain unchanged.
      const row = await prisma.providerSchedule.findFirst({
        where: { id },
      });
      expect(row).not.toBeNull();
      expect(row!.organisationId).toBe(orgAId);
      expect(row!.facilityId).toBe(facAId);

      // No successful delete audit event must have been emitted.
      const auditRows = await prisma.auditOutboxEvent.findMany();
      const deletedEvents = auditRows.filter(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'provider_schedules.deleted',
      );
      expect(deletedEvents).toHaveLength(0);
    });

    it('rejects a non-UUID delete id with the approved 400 validation error', async () => {
      const env = await seedEnvironment('ps-del-badid', 'R07_SCHEDULER');
      const csrf = await fetchCsrfToken(server, env.cookie);
      const response = await request(server)
        .delete('/api/v1/provider-schedules/not-a-uuid')
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', csrf)
        .set('Cookie', env.cookie);
      expect(response.status).toBe(400);
      const body = response.body as Record<string, unknown>;
      expect((body.error as { code?: string })?.code).toBe(
        'PROVIDER_SCHEDULE_VALIDATION_ERROR',
      );
    });
  });
});
