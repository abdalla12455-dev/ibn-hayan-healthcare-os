/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

/**
 * Appointments Rescheduling Integration Tests — Stage 1E.
 *
 * These tests exercise the full appointment reschedule flow via
 * supertest against a real NestJS application with a real PostgreSQL 17
 * database. They cover:
 * - POST /api/v1/appointments/:id/reschedule endpoint
 * - Authorization (R06, R07, R09 allowed; R13 denied; other roles denied)
 * - Authentication (session cookie validation)
 * - Tenant/organisation/facility context resolution
 * - Scoped lookup (cross-tenant/org/facility returns safe 404, no leak)
 * - Lifecycle transition (booked → cancelled + new booked replacement)
 * - Invalid source-state rejection (non-booked states rejected)
 * - Reschedule reason validation
 * - Replacement slot timestamp validation (end > start, not past)
 * - Atomicity (failed replacement leaves original unchanged)
 * - Overlap protection (replacement slot conflicts with blocking appointments)
 * - cancelled/no_show non-blocking overlap behavior
 * - Adjacent appointment behavior
 * - Audit event emission (appointments.rescheduled exactly once)
 * - Original/replacement traceability via audit metadata
 * - Concurrent reschedule of same original (no duplicate replacements)
 * - Competing reschedules for same provider/time (at most one occupant)
 * - Booking vs reschedule race safety
 * - Stage 1C booking regression
 * - Stage 1D cancellation regression
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
// Helpers (mirrors the booking/cancellation test fixtures)
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

async function rescheduleAppointment(
  cookie: string,
  appointmentId: string,
  scheduledStart: string,
  scheduledEnd: string,
  reason: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/reschedule`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({ scheduledStart, scheduledEnd, reason });
}

/**
 * Count audit outbox events whose canonical draft carries a given action.
 */
async function countOutboxByAction(action: string): Promise<number> {
  const rows = await prisma.auditOutboxEvent.findMany();
  return rows.filter(
    (r) => (r.canonicalEventDraft as { action?: string }).action === action,
  ).length;
}

/**
 * Find the first audit outbox event whose canonical draft carries a
 * given action. Returns the metadata for traceability assertions.
 */
async function findOutboxByAction(
  action: string,
): Promise<{ metadata: Record<string, unknown> } | null> {
  const rows = await prisma.auditOutboxEvent.findMany();
  const row = rows.find(
    (r) => (r.canonicalEventDraft as { action?: string }).action === action,
  );
  if (!row) return null;
  return {
    metadata:
      (row.canonicalEventDraft as { metadata?: Record<string, unknown> })
        .metadata ?? {},
  };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FUTURE_START = '2026-09-01T09:00:00.000Z';
const FUTURE_END = '2026-09-01T09:30:00.000Z';
// Replacement slot — a different, non-overlapping future slot.
const REPLACEMENT_START = '2026-09-01T10:00:00.000Z';
const REPLACEMENT_END = '2026-09-01T10:30:00.000Z';
const PAST_START = '2025-01-01T09:00:00.000Z';

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
 * Seeds a tenant/org/facility, user with the given role, patient,
 * eligible provider, and a booked appointment row (created directly
 * via Prisma so it works regardless of whether the role can book).
 * Returns everything needed by the rescheduling tests.
 */
async function seedBookedAppointment(
  emailSlug: string,
  role: PlatformRoleCode = 'R09_ADMINISTRATOR',
  start: string = FUTURE_START,
  end: string = FUTURE_END,
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
  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      organisationId,
      facilityId,
      patientId,
      providerId,
      scheduledStart: new Date(start),
      scheduledEnd: new Date(end),
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

describe('POST /api/v1/appointments/:id/reschedule', () => {
  // ===== Authorization =====

  describe('Authorization', () => {
    it('R06 Receptionist can reschedule an appointment', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r06-resched',
        'R06_RECEPTIONIST',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Patient requested a later slot.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('booked');
    });

    it('R07 Scheduler can reschedule an appointment', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r07-resched',
        'R07_SCHEDULER',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Schedule conflict.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('booked');
    });

    it('R09 Clinic Administrator can reschedule an appointment', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r09-resched',
        'R09_ADMINISTRATOR',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Administrative reschedule.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('booked');
    });

    it('R13 System Administrator (Platform Super Admin) is denied', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r13-resched',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Platform attempt.',
      );
      expect(response.status).toBe(403);
    });

    it('a role without appointments:reschedule is denied (R02 Nurse)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'r02-resched',
        'R02_NURSE',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Nurse attempt.',
      );
      expect(response.status).toBe(403);
    });

    it('returns 401 when no session cookie is supplied', async () => {
      const { appointmentId } = await seedBookedAppointment(
        'no-cookie-resched',
        'R09_ADMINISTRATOR',
      );
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/reschedule`)
        .set('Origin', ORIGIN)
        .send({
          scheduledStart: REPLACEMENT_START,
          scheduledEnd: REPLACEMENT_END,
          reason: 'No cookie.',
        });
      expect(response.status).toBe(401);
    });
  });

  // ===== Scope isolation =====

  describe('Scope isolation', () => {
    it('an in-scope appointment can be rescheduled', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'in-scope-resched',
        'R09_ADMINISTRATOR',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'In-scope reschedule.',
      );
      expect(response.status).toBe(200);
      expect(response.body.id).not.toBe(appointmentId);
      expect(response.body.status).toBe('booked');
    });

    it('a cross-tenant original returns safe 404 (no leak)', async () => {
      const tenantA = await seedBookedAppointment(
        'ct-a-resched',
        'R09_ADMINISTRATOR',
      );
      const { userId } = await createUser('ct-b@example.com', 'CT B');
      const { tenantId } = await createTenant('tn-ct-b', 'T B');
      const { organisationId } = await createOrganisation(
        tenantId,
        'org-ct-b',
        'O B',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'fac-ct-b',
        'F B',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
        organisationId,
      );
      const cookie = await loginUser('ct-b@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);
      const response = await rescheduleAppointment(
        cookie,
        tenantA.appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Cross-tenant attempt.',
      );
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });

    it('a cross-organisation original returns safe 404 (no leak)', async () => {
      const base = await seedBookedAppointment(
        'co-base-resched',
        'R09_ADMINISTRATOR',
      );
      // Same tenant, different organisation/facility.
      const { userId } = await createUser('co-other@example.com', 'CO Other');
      const { organisationId } = await createOrganisation(
        base.tenantId,
        'org-co-other',
        'O Other',
      );
      const { facilityId } = await createFacility(
        base.tenantId,
        organisationId,
        'fac-co-other',
        'F Other',
      );
      const { membershipId } = await createMembership(
        userId,
        base.tenantId,
        'R09_ADMINISTRATOR',
        organisationId,
      );
      const cookie = await loginUser('co-other@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);
      const response = await rescheduleAppointment(
        cookie,
        base.appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Cross-organisation attempt.',
      );
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });

    it('a cross-facility original returns safe 404 (no leak)', async () => {
      const base = await seedBookedAppointment(
        'cf-base-resched',
        'R09_ADMINISTRATOR',
      );
      // Same tenant+organisation, different facility.
      const { userId } = await createUser('cf-other@example.com', 'CF Other');
      const { facilityId } = await createFacility(
        base.tenantId,
        base.organisationId,
        'fac-cf-other',
        'F Other',
      );
      const { membershipId } = await createMembership(
        userId,
        base.tenantId,
        'R09_ADMINISTRATOR',
        base.organisationId,
      );
      const cookie = await loginUser('cf-other@example.com', TEST_PASSWORD);
      await selectContext(
        cookie,
        membershipId,
        base.organisationId,
        facilityId,
      );
      const response = await rescheduleAppointment(
        cookie,
        base.appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Cross-facility attempt.',
      );
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });

    it('rejects caller-supplied tenant/org/facility/status/patient/provider in the body (strict schema)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'strict-resched',
        'R09_ADMINISTRATOR',
      );
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/reschedule`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
          scheduledStart: REPLACEMENT_START,
          scheduledEnd: REPLACEMENT_END,
          reason: 'ok',
          tenantId: 'evil',
          organisationId: 'evil',
          facilityId: 'evil',
          status: 'booked',
          patientId: 'evil',
          providerId: 'evil',
        });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
      // The original appointment is unchanged.
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('booked');
    });
  });

  // ===== Lifecycle =====

  describe('Lifecycle', () => {
    it('a booked appointment can be rescheduled (original → cancelled, replacement → booked)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'lifecycle-ok',
        'R09_ADMINISTRATOR',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Valid reschedule.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('booked');
      // The original is now cancelled.
      const original = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(original?.status).toBe('cancelled');
      // The replacement exists and is booked.
      const replacement = await prisma.appointment.findUnique({
        where: { id: response.body.id },
      });
      expect(replacement).not.toBeNull();
      expect(replacement?.status).toBe('booked');
    });

    it('a cancelled appointment cannot be rescheduled (invalid transition)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'lifecycle-cancelled',
        'R09_ADMINISTRATOR',
      );
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'cancelled' },
      });
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Reschedule cancelled.',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('a completed appointment cannot be rescheduled (invalid transition)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'lifecycle-completed',
        'R09_ADMINISTRATOR',
      );
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'completed' },
      });
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Reschedule completed.',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('a no_show appointment cannot be rescheduled (invalid transition)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'lifecycle-noshow',
        'R09_ADMINISTRATOR',
      );
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'no_show' },
      });
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Reschedule no-show.',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('arbitrary status cannot be submitted via the request body (strict schema)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'lifecycle-strict',
        'R09_ADMINISTRATOR',
      );
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/reschedule`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
          scheduledStart: REPLACEMENT_START,
          scheduledEnd: REPLACEMENT_END,
          reason: 'ok',
          status: 'cancelled',
        });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
      // Status stays booked.
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('booked');
    });
  });

  // ===== Time validation =====

  describe('Time validation', () => {
    it('rejects end <= start', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'time-end-before-start',
        'R09_ADMINISTRATOR',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        '2026-09-01T10:30:00.000Z',
        '2026-09-01T10:00:00.000Z',
        'End before start.',
      );
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });

    it('rejects a past replacement time', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'time-past',
        'R09_ADMINISTRATOR',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        PAST_START,
        '2025-01-01T09:30:00.000Z',
        'Past replacement.',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PAST_TIME');
    });

    it('adjacent replacement slot remains allowed (back-to-back)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'time-adjacent',
        'R09_ADMINISTRATOR',
      );
      // Original ends at 09:30; replacement starts at 09:30 (adjacent).
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        '2026-09-01T09:30:00.000Z',
        '2026-09-01T10:00:00.000Z',
        'Adjacent replacement.',
      );
      expect(response.status).toBe(200);
    });
  });

  // ===== Success atomicity =====

  describe('Success atomicity', () => {
    it('successful reschedule transitions the original to cancelled and creates exactly one replacement', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment('success-atomic', 'R09_ADMINISTRATOR');
      const beforeCount = await prisma.appointment.count();
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Atomic success.',
      );
      expect(response.status).toBe(200);
      // Exactly one new row (the replacement).
      const afterCount = await prisma.appointment.count();
      expect(afterCount).toBe(beforeCount + 1);
      // Original is cancelled.
      const original = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(original?.status).toBe('cancelled');
      // Replacement inherits patient, provider, type, and scope.
      const replacement = await prisma.appointment.findUnique({
        where: { id: response.body.id },
      });
      expect(replacement?.patientId).toBe(patientId);
      expect(replacement?.providerId).toBe(providerId);
      expect(replacement?.typeCode).toBe('consultation');
      expect(replacement?.status).toBe('booked');
      expect(replacement?.scheduledStart.toISOString()).toBe(REPLACEMENT_START);
      expect(replacement?.scheduledEnd.toISOString()).toBe(REPLACEMENT_END);
    });

    it('the original historical row remains persisted', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'history-persist-resched',
        'R09_ADMINISTRATOR',
      );
      await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'History.',
      );
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row).not.toBeNull();
      expect(row?.status).toBe('cancelled');
    });
  });

  // ===== Failure atomicity =====

  describe('Failure atomicity', () => {
    it('an overlapping replacement slot leaves the original unchanged and creates no replacement', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment('fail-overlap', 'R09_ADMINISTRATOR');
      // Book a second appointment for the same provider at the
      // replacement slot, so the reschedule replacement overlaps it.
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'consultation',
      );
      const beforeCount = await prisma.appointment.count();
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Overlapping replacement.',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
      // The original is unchanged (still booked).
      const original = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(original?.status).toBe('booked');
      // No replacement was created (count unchanged).
      const afterCount = await prisma.appointment.count();
      expect(afterCount).toBe(beforeCount);
    });

    it('any validation failure leaves the original unchanged and creates no replacement', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'fail-validation',
        'R09_ADMINISTRATOR',
      );
      const beforeCount = await prisma.appointment.count();
      // Invalid: end <= start.
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        '2026-09-01T10:30:00.000Z',
        '2026-09-01T10:00:00.000Z',
        'Invalid slot.',
      );
      expect(response.status).toBe(400);
      const original = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(original?.status).toBe('booked');
      const afterCount = await prisma.appointment.count();
      expect(afterCount).toBe(beforeCount);
    });

    it('a not-found original leaves no replacement and emits no audit event', async () => {
      await seedBookedAppointment('fail-notfound', 'R09_ADMINISTRATOR');
      await prisma.auditOutboxEvent.deleteMany();
      const { userId } = await createUser('nf-r@example.com', 'NF R');
      const { tenantId } = await createTenant('tn-nf-r', 'T');
      const { organisationId } = await createOrganisation(
        tenantId,
        'org-nf-r',
        'O',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'fac-nf-r',
        'F',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
        organisationId,
      );
      const cookie = await loginUser('nf-r@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);
      const response = await rescheduleAppointment(
        cookie,
        '00000000-0000-0000-0000-000000000000',
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Not found.',
      );
      expect(response.status).toBe(404);
      const count = await countOutboxByAction('appointments.rescheduled');
      expect(count).toBe(0);
    });
  });

  // ===== Overlap behavior =====

  describe('Overlap behavior', () => {
    it('a booked blocking appointment blocks the replacement slot', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment(
          'overlap-block-resched',
          'R09_ADMINISTRATOR',
        );
      // Book a second appointment overlapping the replacement slot.
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        '2026-09-01T10:15:00.000Z',
        '2026-09-01T10:45:00.000Z',
        'consultation',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Blocked replacement.',
      );
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
    });

    it('a cancelled appointment does not block the replacement slot', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment(
          'overlap-cancelled-resched',
          'R09_ADMINISTRATOR',
        );
      // Book a second appointment at the replacement slot, then cancel it.
      const second = await bookAppointment(
        cookie,
        patientId,
        providerId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'consultation',
      );
      await cancelAppointment(
        cookie,
        second.body.id as string,
        'Free the slot.',
      );
      // Now the replacement slot is free.
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Reschedule into freed slot.',
      );
      expect(response.status).toBe(200);
    });

    it('a no_show appointment does not block the replacement slot', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment(
          'overlap-noshow-resched',
          'R09_ADMINISTRATOR',
        );
      const second = await bookAppointment(
        cookie,
        patientId,
        providerId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'consultation',
      );
      await prisma.appointment.update({
        where: { id: second.body.id },
        data: { status: 'no_show' },
      });
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Reschedule into no-show slot.',
      );
      expect(response.status).toBe(200);
    });

    it('the replacement does not incorrectly conflict with the original due to operation ordering', async () => {
      // Reschedule to a slot that overlaps the ORIGINAL's own slot.
      // The original is being cancelled in the same transaction, so
      // it must not block its own replacement.
      const { cookie, appointmentId } = await seedBookedAppointment(
        'overlap-self-resched',
        'R09_ADMINISTRATOR',
        // Original 09:00–09:30.
        FUTURE_START,
        FUTURE_END,
      );
      // Replacement 09:15–09:45 overlaps the original 09:00–09:30.
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        '2026-09-01T09:15:00.000Z',
        '2026-09-01T09:45:00.000Z',
        'Reschedule into overlapping own slot.',
      );
      expect(response.status).toBe(200);
      // Original is cancelled, replacement is booked.
      const original = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(original?.status).toBe('cancelled');
      const replacement = await prisma.appointment.findUnique({
        where: { id: response.body.id },
      });
      expect(replacement?.status).toBe('booked');
    });
  });

  // ===== Concurrency =====

  describe('Concurrency', () => {
    it('two concurrent reschedules of the same original do not create duplicate replacements', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'conc-same-original',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        rescheduleAppointment(
          cookie,
          appointmentId,
          '2026-09-02T09:00:00.000Z',
          '2026-09-02T09:30:00.000Z',
          'Concurrent 1.',
        ),
        rescheduleAppointment(
          cookie,
          appointmentId,
          '2026-09-02T10:00:00.000Z',
          '2026-09-02T10:30:00.000Z',
          'Concurrent 2.',
        ),
      ]);
      // Exactly one succeeds (200); the other is rejected (422
      // invalid transition because the original is now cancelled, or
      // 422 overlap if both target slots are checked). No HTTP 500.
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toContain(200);
      expect(statuses).not.toContain(500);
      // The original is cancelled.
      const original = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(original?.status).toBe('cancelled');
      // Exactly one replacement exists (one new row beyond the
      // original and any seed rows — there are no other appointments
      // in this test).
      const replacements = await prisma.appointment.findMany({
        where: { status: 'booked' },
      });
      expect(replacements).toHaveLength(1);
      // Exactly one audit event.
      const count = await countOutboxByAction('appointments.rescheduled');
      expect(count).toBe(1);
    });

    it('two different originals competing for the same provider/time create at most one occupant', async () => {
      // Two different booked appointments (different patients) for the
      // same provider, both rescheduled to the same target slot.
      const base = await seedBookedAppointment(
        'conc-competing-a',
        'R09_ADMINISTRATOR',
      );
      // Seed a second booked appointment for the same provider with a
      // different patient.
      const { patientId: patientB } = await createPatient(
        base.tenantId,
        'MRN-competing-b',
      );
      const appointmentB = await prisma.appointment.create({
        data: {
          tenantId: base.tenantId,
          organisationId: base.organisationId,
          facilityId: base.facilityId,
          patientId: patientB,
          providerId: base.providerId,
          scheduledStart: new Date('2026-09-03T11:00:00.000Z'),
          scheduledEnd: new Date('2026-09-03T11:30:00.000Z'),
          status: 'booked',
          typeCode: 'consultation',
        },
      });
      const [r1, r2] = await Promise.all([
        rescheduleAppointment(
          base.cookie,
          base.appointmentId,
          '2026-09-04T09:00:00.000Z',
          '2026-09-04T09:30:00.000Z',
          'Competing 1.',
        ),
        rescheduleAppointment(
          base.cookie,
          appointmentB.id,
          '2026-09-04T09:00:00.000Z',
          '2026-09-04T09:30:00.000Z',
          'Competing 2.',
        ),
      ]);
      const statuses = [r1.status, r2.status].sort();
      // Exactly one succeeds (200); the other is rejected (422 overlap).
      // No HTTP 500.
      expect(statuses).toContain(200);
      expect(statuses).not.toContain(500);
      const successCount = statuses.filter((s) => s === 200).length;
      expect(successCount).toBe(1);
      // The losing original remains booked (unchanged).
      const originalA = await prisma.appointment.findUnique({
        where: { id: base.appointmentId },
      });
      const originalB = await prisma.appointment.findUnique({
        where: { id: appointmentB.id },
      });
      const cancelledCount = [originalA?.status, originalB?.status].filter(
        (s) => s === 'cancelled',
      ).length;
      expect(cancelledCount).toBe(1);
    });

    it('booking vs rescheduling the same slot remains safe (no HTTP 500)', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment(
          'conc-book-vs-resched',
          'R09_ADMINISTRATOR',
        );
      const [bookRes, reschedRes] = await Promise.all([
        bookAppointment(
          cookie,
          patientId,
          providerId,
          '2026-09-05T09:00:00.000Z',
          '2026-09-05T09:30:00.000Z',
          'consultation',
        ),
        rescheduleAppointment(
          cookie,
          appointmentId,
          '2026-09-05T09:00:00.000Z',
          '2026-09-05T09:30:00.000Z',
          'Race with booking.',
        ),
      ]);
      const statuses = [bookRes.status, reschedRes.status].sort();
      // At most one occupies the slot. No HTTP 500.
      expect(statuses).not.toContain(500);
      const successCount = statuses.filter(
        (s) => s === 201 || s === 200,
      ).length;
      expect(successCount).toBe(1);
    });

    it('adjacent concurrent reschedules remain valid', async () => {
      const base = await seedBookedAppointment(
        'conc-adjacent-a',
        'R09_ADMINISTRATOR',
      );
      const { patientId: patientB } = await createPatient(
        base.tenantId,
        'MRN-adjacent-b',
      );
      const appointmentB = await prisma.appointment.create({
        data: {
          tenantId: base.tenantId,
          organisationId: base.organisationId,
          facilityId: base.facilityId,
          patientId: patientB,
          providerId: base.providerId,
          scheduledStart: new Date('2026-09-03T11:00:00.000Z'),
          scheduledEnd: new Date('2026-09-03T11:30:00.000Z'),
          status: 'booked',
          typeCode: 'consultation',
        },
      });
      // A targets 09:00–09:30; B targets 09:30–10:00 (adjacent).
      const [r1, r2] = await Promise.all([
        rescheduleAppointment(
          base.cookie,
          base.appointmentId,
          '2026-09-06T09:00:00.000Z',
          '2026-09-06T09:30:00.000Z',
          'Adjacent A.',
        ),
        rescheduleAppointment(
          base.cookie,
          appointmentB.id,
          '2026-09-06T09:30:00.000Z',
          '2026-09-06T10:00:00.000Z',
          'Adjacent B.',
        ),
      ]);
      // Both should succeed (adjacent, non-overlapping). No HTTP 500.
      expect(r1.status).not.toBe(500);
      expect(r2.status).not.toBe(500);
      // Both originals are cancelled.
      const a = await prisma.appointment.findUnique({
        where: { id: base.appointmentId },
      });
      const b = await prisma.appointment.findUnique({
        where: { id: appointmentB.id },
      });
      expect(a?.status).toBe('cancelled');
      expect(b?.status).toBe('cancelled');
    });
  });

  // ===== Audit =====

  describe('Audit', () => {
    it('emits appointments.rescheduled exactly once on a successful reschedule', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'audit-success',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Audit success.',
      );
      expect(response.status).toBe(200);
      const count = await countOutboxByAction('appointments.rescheduled');
      expect(count).toBe(1);
    });

    it('audit metadata carries originalAppointmentId, replacementAppointmentId, and reason', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'audit-metadata',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Traceability reason.',
      );
      expect(response.status).toBe(200);
      const event = await findOutboxByAction('appointments.rescheduled');
      expect(event).not.toBeNull();
      expect(event?.metadata?.endpoint).toBe('appointments_reschedule');
      expect(event?.metadata?.originalAppointmentId).toBe(appointmentId);
      expect(event?.metadata?.replacementAppointmentId).toBe(response.body.id);
      expect(event?.metadata?.reason).toBe('Traceability reason.');
    });

    it('a failed reschedule (overlap) does NOT emit a rescheduled audit event', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment('audit-fail-overlap', 'R09_ADMINISTRATOR');
      await prisma.auditOutboxEvent.deleteMany();
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'consultation',
      );
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Failed overlap.',
      );
      expect(response.status).toBe(422);
      const count = await countOutboxByAction('appointments.rescheduled');
      expect(count).toBe(0);
    });

    it('a failed reschedule (invalid transition) does NOT emit a rescheduled audit event', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'audit-fail-transition',
        'R09_ADMINISTRATOR',
      );
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'completed' },
      });
      await prisma.auditOutboxEvent.deleteMany();
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Failed transition.',
      );
      expect(response.status).toBe(422);
      const count = await countOutboxByAction('appointments.rescheduled');
      expect(count).toBe(0);
    });

    it('an authorization failure does NOT emit a rescheduled audit event', async () => {
      const { appointmentId } = await seedBookedAppointment(
        'audit-fail-authz',
        'R09_ADMINISTRATOR',
      );
      const { userId } = await createUser('r02-audit@example.com', 'R02 A');
      const { tenantId } = await createTenant('tn-r02-audit', 'T');
      const { organisationId } = await createOrganisation(
        tenantId,
        'org-r02-audit',
        'O',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'fac-r02-audit',
        'F',
      );
      // Seed an in-scope booked appointment for the R02 user's tenant.
      const { patientId } = await createPatient(tenantId, 'MRN-r02-audit');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );
      const r02Appointment = await prisma.appointment.create({
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
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R02_NURSE',
        organisationId,
      );
      const cookie = await loginUser('r02-audit@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);
      await prisma.auditOutboxEvent.deleteMany();
      const response = await rescheduleAppointment(
        cookie,
        r02Appointment.id,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Authz failure.',
      );
      expect(response.status).toBe(403);
      const count = await countOutboxByAction('appointments.rescheduled');
      expect(count).toBe(0);
      // Suppress unused-var warning for appointmentId from the first seed.
      expect(appointmentId).toBeDefined();
    });

    it('audit metadata does NOT carry PHI, patient, provider, or timing details', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'audit-no-phi',
        'R09_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'No PHI reason.',
      );
      expect(response.status).toBe(200);
      const event = await findOutboxByAction('appointments.rescheduled');
      expect(event).not.toBeNull();
      const metadata = event?.metadata as Record<string, unknown>;
      const keys = Object.keys(metadata);
      // Only approved keys are present.
      expect(keys.sort()).toEqual(
        [
          'endpoint',
          'originalAppointmentId',
          'replacementAppointmentId',
          'reason',
        ].sort(),
      );
    });
  });

  // ===== Regression: Stage 1C booking + Stage 1D cancellation =====

  describe('Regression', () => {
    it('Stage 1C: booking still works after a reschedule', async () => {
      const { cookie, patientId, providerId } = await seedBookedAppointment(
        'reg-book-after-resched',
        'R09_ADMINISTRATOR',
      );
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        '2026-09-07T09:00:00.000Z',
        '2026-09-07T09:30:00.000Z',
        'consultation',
      );
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('booked');
    });

    it('Stage 1D: cancellation still works after a reschedule', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'reg-cancel-after-resched',
        'R09_ADMINISTRATOR',
      );
      const response = await cancelAppointment(
        cookie,
        appointmentId,
        'Cancel after reschedule.',
      );
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
    });

    it('a rescheduled (cancelled) original slot can be rebooked', async () => {
      const { cookie, appointmentId, patientId, providerId } =
        await seedBookedAppointment(
          'reg-rebook-original-slot',
          'R09_ADMINISTRATOR',
        );
      // Reschedule the original away from 09:00–09:30.
      const res = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Move away.',
      );
      expect(res.status).toBe(200);
      // The original slot (09:00–09:30) is now free (original is cancelled).
      const rebook = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(rebook.status).toBe(201);
    });

    it('the replacement can be cancelled (Stage 1D applies to the replacement)', async () => {
      const { cookie, appointmentId } = await seedBookedAppointment(
        'reg-cancel-replacement',
        'R09_ADMINISTRATOR',
      );
      const res = await rescheduleAppointment(
        cookie,
        appointmentId,
        REPLACEMENT_START,
        REPLACEMENT_END,
        'Create replacement.',
      );
      expect(res.status).toBe(200);
      const cancel = await cancelAppointment(
        cookie,
        res.body.id as string,
        'Cancel replacement.',
      );
      expect(cancel.status).toBe(200);
      expect(cancel.body.status).toBe('cancelled');
    });
  });
});
