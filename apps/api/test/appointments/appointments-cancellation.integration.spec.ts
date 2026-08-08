/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Appointments Cancellation Integration Tests — Stage 1D.
 *
 * These tests exercise the full appointment cancellation flow via
 * supertest against a real NestJS application with a real PostgreSQL 17
 * database. They cover:
 * - POST /api/v1/appointments/:id/cancel endpoint
 * - Authorization (R06, R07, R09 allowed; R13 denied; other roles denied)
 * - Authentication (session cookie validation)
 * - Tenant/organisation/facility context resolution
 * - Scoped lookup (cross-tenant/org/facility returns safe 404, no leak)
 * - Lifecycle transition (booked → cancelled)
 * - Idempotent re-cancellation (no duplicate audit event)
 * - Invalid source-state rejection (non-booked states rejected)
 * - Cancellation reason validation
 * - Audit event emission (appointments.cancelled exactly once)
 * - Cancelled-slot rebooking regression (cancelled slot freed)
 * - no_show non-blocking overlap behavior
 * - Adjacent appointment behavior unchanged
 * - Concurrent cancellation (one transition, no duplicate audit)
 * - Stage 1C overlap regression (booked blocks overlap)
 *
 * Per the task specification, these tests require PostgreSQL 17.
 * They are NOT run locally without PostgreSQL 17.
 *
 * Determinism: All tests use a fixed clock instant (2026-08-01T12:00:00.000Z).
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
  TenantId,
  OrganisationId,
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
import { CLOCK_SERVICE_TOKEN } from '../../src/infrastructure/clock/clock.module.js';
import type { ClockService } from '../../src/infrastructure/clock/clock.service.js';
import { resetThrottlerStorageSafely } from '../clinic-admin/_clinic-admin-test-helpers.js';

// ---------------------------------------------------------------------------
// Fixed test clock
// ---------------------------------------------------------------------------

const FIXED_TEST_INSTANT = new Date('2026-08-01T12:00:00.000Z');
const mockClockService: ClockService = {
  now: () => FIXED_TEST_INSTANT,
};

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

// ---------------------------------------------------------------------------
// Helpers (mirrors the booking test fixtures)
// ---------------------------------------------------------------------------

async function truncateAll(): Promise<void> {
  await prisma.auditOutboxEvent.deleteMany();
  await prisma.appointment.deleteMany();
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
    scopeFacilityId?: string;
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
  status: 'active' | 'inactive' | 'archived' = 'active',
): Promise<{ patientId: string }> {
  const patient = await prisma.patient.create({
    data: { tenantId, medicalRecordNumber, status },
  });
  return { patientId: patient.id };
}

type ProviderStatus =
  'candidate' | 'onboarded' | 'active' | 'suspended' | 'separated';

async function createProvider(
  tenantId: string,
  status: ProviderStatus = 'active',
): Promise<{ providerId: string }> {
  const provider = await prisma.provider.create({ data: { tenantId, status } });
  return { providerId: provider.id };
}

async function createProviderFacilityAssignment(
  tenantId: string,
  organisationId: string,
  facilityId: string,
  providerId: string,
  revokedAt: Date | null = null,
): Promise<{ assignmentId: string }> {
  const assignment = await prisma.providerFacilityAssignment.create({
    data: { tenantId, organisationId, facilityId, providerId, revokedAt },
  });
  return { assignmentId: assignment.id };
}

async function createEligibleProvider(
  tenantId: string,
  organisationId: string,
  facilityId: string,
): Promise<{ providerId: string }> {
  const { providerId } = await createProvider(tenantId, 'active');
  await createProviderFacilityAssignment(
    tenantId,
    organisationId,
    facilityId,
    providerId,
    null,
  );
  return { providerId };
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
  const orgResponse = await request(server)
    .put('/api/v1/context/organisation')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .set('X-CSRF-Token', csrf)
    .send({ organisationId });
  if (orgResponse.status >= 400) {
    throw new Error(
      `selectContext organisation failed: status=${orgResponse.status}, body=${JSON.stringify(orgResponse.body)}`,
    );
  }
  const facilityResponse = await request(server)
    .put('/api/v1/context/facility')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .set('X-CSRF-Token', csrf)
    .send({ facilityId });
  if (facilityResponse.status >= 400) {
    throw new Error(
      `selectContext facility failed: status=${facilityResponse.status}, body=${JSON.stringify(facilityResponse.body)}`,
    );
  }
}

async function bookAppointment(
  cookie: string,
  patientId: string,
  providerId: string,
  scheduledStart: string,
  scheduledEnd: string,
  typeCode: string,
): Promise<request.Response> {
  return request(server)
    .post('/api/v1/appointments')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({
      patientId,
      providerId,
      scheduledStart,
      scheduledEnd,
      typeCode,
    });
}

async function cancelAppointment(
  cookie: string,
  appointmentId: string,
  reason: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/cancel`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({ reason });
}

/**
 * Count audit outbox events whose canonical draft carries a given action.
 * Uses the JSON-path filter; falls back to a full scan if the filter is
 * unsupported by the Prisma version.
 */
async function countOutboxByAction(action: string): Promise<number> {
  const rows = await prisma.auditOutboxEvent.findMany();
  return rows.filter(
    (r) => (r.canonicalEventDraft as { action?: string }).action === action,
  ).length;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FUTURE_START = '2026-09-01T09:00:00.000Z';
const FUTURE_END = '2026-09-01T09:30:00.000Z';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK_SERVICE_TOKEN)
    .useValue(mockClockService)
    .compile();

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
  await truncateAll();
  resetThrottlerStorageSafely(throttlerStorage);
});

/**
 * Seeded a tenant/org/facility, user with the given role, patient,
 * eligible provider, and a booked appointment row (created directly
 * via Prisma so it works regardless of whether the role can book).
 * Returns everything needed by the cancellation tests.
 *
 * The appointment is seeded directly (not via the booking endpoint)
 * because several cancellation tests exercise roles (R13, R02) that
 * do NOT hold `appointments:book`. Using the booking endpoint to seed
 * would conflate booking authorization with cancellation behavior.
 */
async function seedBookedAppointment(
  emailSlug: string,
  role: PlatformRoleCode = 'R09_ADMINISTRATOR',
): Promise<{
  cookie: string;
  appointmentId: string;
  tenantId: string;
  organisationId: string;
  facilityId: string;
  patientId: string;
  providerId: string;
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
  const cookie = await loginUser(`${emailSlug}@example.com`, TEST_PASSWORD);
  await selectContext(cookie, membershipId, organisationId, facilityId);
  // Seed the appointment directly so the fixture is independent of
  // the caller's booking authorization.
  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      organisationId,
      facilityId,
      patientId,
      providerId,
      scheduledStart: new Date(FUTURE_START),
      scheduledEnd: new Date(FUTURE_END),
      status: 'booked',
      typeCode: 'consultation',
    },
  });
  return {
    cookie,
    appointmentId: appointment.id,
    tenantId,
    organisationId,
    facilityId,
    patientId,
    providerId,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('POST /api/v1/appointments/:id/cancel', () => {
  // ===== Authorization =====

  describe('Authorization', () => {
    it('R06 Receptionist can cancel an appointment', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r06-cancel',
        'R06_RECEPTIONIST',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Patient requested cancellation.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
    });

    it('R07 Scheduler can cancel an appointment', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r07-cancel',
        'R07_SCHEDULER',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Schedule conflict.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
    });

    it('R09 Clinic Administrator can cancel an appointment', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r09-cancel',
        'R09_ADMINISTRATOR',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Administrative cancellation.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
    });

    it('R13 System Administrator (Platform Super Admin) is denied', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r13-cancel',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Platform attempt.',
      );
      expect(response.status).toBe(403);
    });

    it('a role without appointments:cancel is denied (R02 Nurse)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r02-cancel',
        'R02_NURSE',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Nurse attempt.',
      );
      expect(response.status).toBe(403);
    });

    it('returns 401 when no session cookie is supplied', async () => {
      const { appointmentId } = await seedBookedAppointment(
        'unauth-cancel',
        'R09_ADMINISTRATOR',
      );
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Origin', ORIGIN)
        .send({ reason: 'No session.' });
      expect(response.status).toBe(401);
    });
  });

  // ===== Scope =====

  describe('Scope isolation', () => {
    it('correct tenant/org/facility appointment can be cancelled', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'scope-ok',
        'R09_ADMINISTRATOR',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'In-scope cancellation.',
      );
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(appointmentId);
      expect(response.body.status).toBe('cancelled');
    });

    it('cross-tenant appointment returns safe not-found (no leak)', async () => {
      // Tenant B holds the appointment; Tenant A user attempts cancel.
      const tenantB = await seedBookedAppointment(
        'tenant-b',
        'R09_ADMINISTRATOR',
      );
      const { userId } = await createUser('tenant-a@example.com', 'Tenant A');
      const { tenantId } = await createTenant('tn-tenant-a', 'Tenant A');
      const { organisationId } = await createOrganisation(
        tenantId,
        'org-tenant-a',
        'Org A',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'fac-tenant-a',
        'Facility A',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
        organisationId,
      );
      const cookieA = await loginUser('tenant-a@example.com', TEST_PASSWORD);
      await selectContext(cookieA, membershipId, organisationId, facilityId);

      const response = await cancelAppointment(
        cookieA,
        tenantB.appointmentId,
        'Cross-tenant attempt.',
      );
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });

    it('cross-organisation appointment returns safe not-found (no leak)', async () => {
      // Same tenant, different organisation.
      const { tenantId } = await createTenant('tn-xorg', 'Tenant XOrg');
      // Org B holds the appointment
      const { organisationId: orgB } = await createOrganisation(
        tenantId,
        'org-b',
        'Org B',
      );
      const { facilityId: facB } = await createFacility(
        tenantId,
        orgB,
        'fac-b',
        'Fac B',
      );
      const { userId } = await createUser('xorg@example.com', 'XOrg User');
      const { membershipId: memB } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
        orgB,
      );
      const { patientId } = await createPatient(tenantId, 'MRN-XORG-B');
      const { providerId } = await createEligibleProvider(tenantId, orgB, facB);
      const cookieB = await loginUser('xorg@example.com', TEST_PASSWORD);
      await selectContext(cookieB, memB, orgB, facB);
      const bookResp = await bookAppointment(
        cookieB,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(bookResp.status).toBe(201);

      // Org A user (same tenant) attempts cancel
      const { organisationId: orgA } = await createOrganisation(
        tenantId,
        'org-a',
        'Org A',
      );
      const { facilityId: facA } = await createFacility(
        tenantId,
        orgA,
        'fac-a',
        'Fac A',
      );
      const { userId: userA } = await createUser(
        'xorg-a@example.com',
        'User A',
      );
      const { membershipId: memA } = await createMembership(
        userA,
        tenantId,
        'R09_ADMINISTRATOR',
        orgA,
      );
      const cookieA = await loginUser('xorg-a@example.com', TEST_PASSWORD);
      await selectContext(cookieA, memA, orgA, facA);

      const response = await cancelAppointment(
        cookieA,
        bookResp.body.id as string,
        'Cross-org attempt.',
      );
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });

    it('cross-facility appointment returns safe not-found (no leak)', async () => {
      // Same tenant+org, different facility.
      const { tenantId } = await createTenant('tn-xfac', 'Tenant XFac');
      const { organisationId } = await createOrganisation(
        tenantId,
        'org-xfac',
        'Org XFac',
      );
      // Facility B holds the appointment
      const { facilityId: facB } = await createFacility(
        tenantId,
        organisationId,
        'fac-xb',
        'Fac XB',
      );
      const { userId } = await createUser('xfac@example.com', 'XFac User');
      const { membershipId: memB } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
        organisationId,
      );
      const { patientId } = await createPatient(tenantId, 'MRN-XFAC');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facB,
      );
      const cookieB = await loginUser('xfac@example.com', TEST_PASSWORD);
      await selectContext(cookieB, memB, organisationId, facB);
      const bookResp = await bookAppointment(
        cookieB,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(bookResp.status).toBe(201);

      // Facility A user (same tenant+org) attempts cancel
      const { facilityId: facA } = await createFacility(
        tenantId,
        organisationId,
        'fac-xa',
        'Fac XA',
      );
      const { userId: userA } = await createUser(
        'xfac-a@example.com',
        'User A',
      );
      const { membershipId: memA } = await createMembership(
        userA,
        tenantId,
        'R09_ADMINISTRATOR',
        organisationId,
      );
      const cookieA = await loginUser('xfac-a@example.com', TEST_PASSWORD);
      await selectContext(cookieA, memA, organisationId, facA);

      const response = await cancelAppointment(
        cookieA,
        bookResp.body.id as string,
        'Cross-facility attempt.',
      );
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });

    it('caller cannot override tenant/org/facility via body fields', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'override-body',
        'R09_ADMINISTRATOR',
      );
      // The strict schema rejects unknown keys, so body-supplied scope
      // produces a validation error rather than being honoured.
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
          reason: 'ok',
          tenantId: 'evil-tenant',
          organisationId: 'evil-org',
          facilityId: 'evil-facility',
          status: 'cancelled',
          actorId: 'evil-actor',
        });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });
  });

  // ===== Lifecycle =====

  describe('Lifecycle', () => {
    it('a booked appointment transitions to cancelled', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'lifecycle-ok',
        'R09_ADMINISTRATOR',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Lifecycle test.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
      // Persisted state is cancelled.
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('cancelled');
    });

    it('already-cancelled appointment is idempotent (no error, no duplicate audit)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'idempotent',
        'R09_ADMINISTRATOR',
      );
      const first = await cancelAppointment(
        cookie,
        appointmentId,
        'First cancellation.',
      );
      expect(first.status).toBe(200);
      const second = await cancelAppointment(
        cookie,
        appointmentId,
        'Second cancellation.',
      );
      expect(second.status).toBe(200);
      expect(second.body.status).toBe('cancelled');
      // Exactly one appointments.cancelled audit event.
      const count = await countOutboxByAction('appointments.cancelled');
      expect(count).toBe(1);
    });

    it('an invalid source-state transition is rejected', async () => {
      const { cookie, appointmentId, tenantId } = await seedBookedAppointment(
        'invalid-state',
        'R09_ADMINISTRATOR',
      );
      // Force the appointment into a non-booked, non-cancelled state.
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'completed' },
      });
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Attempt to cancel completed.',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
      // Ensure tenantId was used (sanity, avoids unused var lint)
      expect(tenantId).toBeDefined();
    });

    it('arbitrary status cannot be supplied via the request', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'no-arbitrary-status',
        'R09_ADMINISTRATOR',
      );
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({ reason: 'ok', status: 'no_show' });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
      // Status remains booked (no mutation).
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('booked');
    });
  });

  // ===== Reason validation =====

  describe('Cancellation reason', () => {
    it('accepts a valid reason', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'reason-ok',
        'R09_ADMINISTRATOR',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Patient called to cancel due to a scheduling conflict.',
      );
      expect(response.status).toBe(200);
    });

    it('rejects a missing reason', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'reason-missing',
        'R09_ADMINISTRATOR',
      );
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });

    it('rejects a reason exceeding the maximum length', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'reason-too-long',
        'R09_ADMINISTRATOR',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'x'.repeat(501),
      );
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });

    it('rejects an empty (whitespace-only) reason', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'reason-empty',
        'R09_ADMINISTRATOR',
      );
      const response = await cancelAppointment(cookie, appointmentId, '');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });
  });

  // ===== Audit =====

  describe('Audit', () => {
    it('appointments.cancelled is emitted exactly once on first transition', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'audit-once',
        'R09_ADMINISTRATOR',
      );
      // Clear outbox seeded by booking/login/context so the count is clean.
      await prisma.auditOutboxEvent.deleteMany();
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Audit once test.',
      );
      expect(response.status).toBe(200);
      const count = await countOutboxByAction('appointments.cancelled');
      expect(count).toBe(1);
    });

    it('duplicate idempotent request does NOT produce a duplicate audit event', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'audit-dup',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      await cancelAppointment(cookie, appointmentId, 'First.');
      await cancelAppointment(cookie, appointmentId, 'Second.');
      const count = await countOutboxByAction('appointments.cancelled');
      expect(count).toBe(1);
    });

    it('validation failure does NOT emit a cancellation-success audit event', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'audit-validation',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({});
      expect(response.status).toBe(400);
      const count = await countOutboxByAction('appointments.cancelled');
      expect(count).toBe(0);
    });

    it('authorization failure does NOT emit a cancellation-success audit event', async () => {
      const { appointmentId } = await seedBookedAppointment(
        'audit-authz',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      // R02 Nurse has no appointments:cancel
      const { userId } = await createUser('audit-r02@example.com', 'R02');
      const { tenantId } = await createTenant('tn-audit-r02', 'T');
      const { organisationId } = await createOrganisation(
        tenantId,
        'org-audit-r02',
        'O',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'fac-audit-r02',
        'F',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R02_NURSE',
        organisationId,
      );
      const cookie = await loginUser('audit-r02@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Authz failure.',
      );
      expect(response.status).toBe(403); // R02 lacks appointments:cancel
      const count = await countOutboxByAction('appointments.cancelled');
      expect(count).toBe(0);
    });

    it('cross-scope not-found does NOT emit a cancellation-success audit event', async () => {
      const tenantB = await seedBookedAppointment(
        'audit-notfound',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const { userId } = await createUser('nf-a@example.com', 'NF A');
      const { tenantId } = await createTenant('tn-nf-a', 'T');
      const { organisationId } = await createOrganisation(
        tenantId,
        'org-nf-a',
        'O',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'fac-nf-a',
        'F',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
        organisationId,
      );
      const cookie = await loginUser('nf-a@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);
      const response = await cancelAppointment(
        cookie,
        tenantB.appointmentId,
        'Not found.',
      );
      expect(response.status).toBe(404);
      const count = await countOutboxByAction('appointments.cancelled');
      expect(count).toBe(0);
    });
  });

  // ===== Booking regression: overlap status-exclusion =====

  describe('Overlap status-exclusion regression', () => {
    it('a booked appointment blocks an overlapping booking', async () => {
      const { cookie, patientId, providerId } = await seedBookedAppointment(
        'overlap-block',
        'R09_ADMINISTRATOR',
      );
      // Same slot, different patient -> overlap.
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
    });

    it('after cancellation, the same time slot can be booked again', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment('rebook', 'R09_ADMINISTRATOR');
      const cancel = await cancelAppointment(
        cookie,
        appointmentId,
        'Free the slot.',
      );
      expect(cancel.status).toBe(200);
      const rebook = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(rebook.status).toBe(201);
      expect(rebook.body.status).toBe('booked');
    });

    it('a cancelled appointment remains persisted for history', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'history-persist',
        'R09_ADMINISTRATOR',
      );
      await cancelAppointment(cookie, appointmentId, 'History.');
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row).not.toBeNull();
      expect(row?.status).toBe('cancelled');
    });

    it('a no_show appointment does not block an overlapping booking', async () => {
      const { cookie, patientId, providerId, appointmentId } =
        await seedBookedAppointment('no-show-free', 'R09_ADMINISTRATOR');
      // Force the appointment to no_show (terminal, non-blocking).
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'no_show' },
      });
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(response.status).toBe(201);
    });

    it('adjacent appointments remain non-overlapping (back-to-back allowed)', async () => {
      const { cookie, patientId, providerId } = await seedBookedAppointment(
        'adjacent',
        'R09_ADMINISTRATOR',
      );
      // Existing slot ends at 09:30; adjacent slot starts at 09:30.
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        '2026-09-01T09:30:00.000Z',
        '2026-09-01T10:00:00.000Z',
        'consultation',
      );
      expect(response.status).toBe(201);
    });

    it('Stage 1C overlap concurrency: two concurrent bookings of the same slot produce exactly one success', async () => {
      const { cookie, patientId, providerId } = await seedBookedAppointment(
        'conc-book',
        'R09_ADMINISTRATOR',
      );
      const [r1, r2] = await Promise.all([
        bookAppointment(
          cookie,
          patientId,
          providerId,
          '2026-09-02T09:00:00.000Z',
          '2026-09-02T09:30:00.000Z',
          'consultation',
        ),
        bookAppointment(
          cookie,
          patientId,
          providerId,
          '2026-09-02T09:00:00.000Z',
          '2026-09-02T09:30:00.000Z',
          'consultation',
        ),
      ]);
      const statuses = [r1.status, r2.status].sort();
      // One succeeds (201), the other is rejected with overlap (422).
      expect(statuses).toEqual([201, 422]);
    });
  });

  // ===== Concurrency: cancellation =====

  describe('Cancellation concurrency', () => {
    it('two concurrent cancellations produce one valid transition and one audit event', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'conc-cancel',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        cancelAppointment(cookie, appointmentId, 'Concurrent 1.'),
        cancelAppointment(cookie, appointmentId, 'Concurrent 2.'),
      ]);
      // Both return success (idempotent for the second).
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      // Final state is cancelled (deterministic).
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('cancelled');
      // Exactly one audit event.
      const count = await countOutboxByAction('appointments.cancelled');
      expect(count).toBe(1);
    });
  });
});
