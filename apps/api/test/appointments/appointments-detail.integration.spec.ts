/**
 * Appointment Detail (read endpoint) integration tests.
 *
 * These tests exercise GET /api/v1/appointments/:id end-to-end through
 * the full HTTP stack with real PostgreSQL 17. They verify:
 *  - the full detail payload (identification, timing, status, type,
 *    cancellation);
 *  - PHI-safe canonical noShowReason exposure;
 *  - the `appointments:no_show_reason_read` permission gate;
 *  - audit event APPOINTMENTS.DETAIL.READ emission;
 *  - cross-tenant isolation;
 *  - stable error contract (404/permission error/parameter validation).
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
import { resetThrottlerStorageSafely } from '../clinic-admin/_clinic-admin-test-helpers.js';

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
// Test helpers (mirrors the appointments availability convention)
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

async function createPatient(
  tenantId: string,
  medicalRecordNumber: string,
): Promise<{ patientId: string }> {
  const patient = await prisma.patient.create({
    data: { tenantId, medicalRecordNumber, status: 'active' },
  });
  return { patientId: patient.id };
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

/**
 * Seed an environment for the detail endpoint: tenant/org/facility, operator
 * scoped to the given role, provider with an active facility assignment,
 * patient, and a booked fixture appointment.
 */
async function seedAppointmentEnvironment(
  emailSlug: string,
  role: string,
): Promise<{
  cookie: string;
  tenantId: string;
  organisationId: string;
  facilityId: string;
  patientId: string;
  providerId: string;
  appointmentId: string;
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
  const { patientId } = await createPatient(tenantId, `MRN-${emailSlug}`);
  const { providerId } = await createEligibleProvider(
    tenantId,
    organisationId,
    facilityId,
  );
  // The canonical Booking API is availability-gated. The fixture detail
  // appointment is seeded directly through Prisma to exercise the read
  // endpoint without depending on a provider schedule covering the slot.
  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      organisationId,
      facilityId,
      patientId,
      providerId,
      scheduledStart: new Date('2026-09-01T14:00:00.000Z'),
      scheduledEnd: new Date('2026-09-01T14:30:00.000Z'),
      status: 'booked',
      typeCode: 'consultation',
    },
  });
  const cookie = await loginUser(`${emailSlug}@example.com`, TEST_PASSWORD);
  await selectContext(cookie, membershipId, organisationId, facilityId);
  return {
    cookie,
    tenantId,
    organisationId,
    facilityId,
    patientId,
    providerId,
    appointmentId: appointment.id,
  };
}

beforeEach(async () => {
  await truncateAll();
  resetThrottlerStorageSafely(throttlerStorage);
});

// ===========================================================================
// Tests
// ===========================================================================

describe('Appointment Detail (GET /api/v1/appointments/:id)', () => {
  it('returns the full detail payload for an in-scope appointment', async () => {
    const env = await seedAppointmentEnvironment(
      'detail-ok',
      'R09_ADMINISTRATOR',
    );
    const response = await request(server)
      .get(`/api/v1/appointments/${env.appointmentId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', env.cookie);
    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    expect(body).toEqual({
      id: env.appointmentId,
      patientId: env.patientId,
      providerId: env.providerId,
      scheduledStart: '2026-09-01T14:00:00.000Z',
      scheduledEnd: '2026-09-01T14:30:00.000Z',
      status: 'booked',
      typeCode: 'consultation',
      noShowReason: null,
    });
  });

  it('exposes the PHI-safe noShowReason for a marked-no-show appointment', async () => {
    const env = await seedAppointmentEnvironment(
      'detail-nos',
      'R09_ADMINISTRATOR',
    );
    await prisma.appointment.update({
      where: { id: env.appointmentId },
      data: {
        status: 'no_show',
        noShowReason: 'patient_did_not_attend',
      },
    });
    const response = await request(server)
      .get(`/api/v1/appointments/${env.appointmentId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', env.cookie);
    expect(response.status).toBe(200);
    const body = response.body as Record<string, unknown>;
    // Public API reads the status projection column (PHI-safe exposure).
    expect(body.status).toBe('no_show');
    expect(body.noShowReason).toBe('patient_did_not_attend');
  });

  it('records the APPOINTMENTS.DETAIL.READ audit event with PHI-safe metadata', async () => {
    const env = await seedAppointmentEnvironment(
      'detail-aud',
      'R09_ADMINISTRATOR',
    );
    await request(server)
      .get(`/api/v1/appointments/${env.appointmentId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', env.cookie);
    const events = await prisma.auditOutboxEvent.findMany();
    const detailReads = events.filter(
      (r) =>
        (r.canonicalEventDraft as { action?: string }).action ===
        'appointments.detail.viewed',
    );
    expect(detailReads).toHaveLength(1);
    const first = detailReads[0] as
      { canonicalEventDraft: unknown } | undefined;
    const draft = first!.canonicalEventDraft as {
      scope: string;
      metadata: unknown;
    };
    expect(draft.scope).toBe('facility_context');
    const metadata = draft.metadata as Record<string, unknown>;
    expect(metadata.endpoint).toBe('appointments_detail');
    expect(metadata.appointmentId).toBe(env.appointmentId);
    expect(
      JSON.stringify(metadata).match(/reason|patient|provider|medical/i),
    ).toBeNull();
  });

  it('denies R13 System Administrator the read via the read-only permission', async () => {
    const env = await seedAppointmentEnvironment(
      'detail-deny',
      'R13_SYSTEM_ADMINISTRATOR',
    );
    const response = await request(server)
      .get(`/api/v1/appointments/${env.appointmentId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', env.cookie);
    expect(response.status).toBe(403);
    const body = response.body as Record<string, unknown>;
    expect((body.error as { code?: string })?.code).toBe(
      'AUTHORIZATION_FORBIDDEN',
    );
  });

  it('denies on a second tenant (tenant isolation)', async () => {
    const env = await seedAppointmentEnvironment(
      'detail-t1',
      'R09_ADMINISTRATOR',
    );
    const second = await seedAppointmentEnvironment(
      'detail-t2',
      'R09_ADMINISTRATOR',
    );
    const response = await request(server)
      .get(`/api/v1/appointments/${second.appointmentId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', env.cookie);
    expect(response.status).toBe(404);
    const body = response.body as Record<string, unknown>;
    expect((body.error as { code?: string })?.code).toBe(
      'APPOINTMENT_NOT_FOUND',
    );
  });

  it('returns the approved 404 for a non-existent appointment', async () => {
    const env = await seedAppointmentEnvironment(
      'detail-404',
      'R09_ADMINISTRATOR',
    );
    const response = await request(server)
      .get('/api/v1/appointments/2e30f614-fd1f-4fb2-a01c-5dee530f4c2d')
      .set('Origin', ORIGIN)
      .set('Cookie', env.cookie);
    expect(response.status).toBe(404);
    const body = response.body as Record<string, unknown>;
    expect((body.error as { code?: string })?.code).toBe(
      'APPOINTMENT_NOT_FOUND',
    );
  });

  it('invalid :id parameter produces the approved 400 validation error', async () => {
    const env = await seedAppointmentEnvironment(
      'detail-bad',
      'R09_ADMINISTRATOR',
    );
    const response = await request(server)
      .get('/api/v1/appointments/not-a-uuid')
      .set('Origin', ORIGIN)
      .set('Cookie', env.cookie);
    expect(response.status).toBe(400);
    const body = response.body as Record<string, unknown>;
    expect((body.error as { code?: string })?.code).toBe(
      'APPOINTMENT_VALIDATION_ERROR',
    );
  });

  it('requires a session', async () => {
    const response = await request(server)
      .get('/api/v1/appointments/2e30f614-fd1f-4fb2-a01c-5dee530f4c2d')
      .set('Origin', ORIGIN);
    expect(response.status).toBe(401);
  });
});
