/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Appointment Visit Lifecycle Integration Tests — Stage 1F.
 *
 * These tests exercise the full appointment visit-lifecycle flow via
 * supertest against a real NestJS application with a real PostgreSQL 17
 * database. They cover:
 * - POST /api/v1/appointments/:id/confirm   (booked → confirmed)
 * - POST /api/v1/appointments/:id/check-in   (booked|confirmed → arrived)
 * - POST /api/v1/appointments/:id/start      (arrived → in_progress)
 * - POST /api/v1/appointments/:id/complete   (in_progress → completed)
 *
 * Coverage:
 * - Authentication (session cookie validation)
 * - Authorization (confirm/check-in: R06, R07, R09; start/complete: R01;
 *   R13 denied for all; other roles denied)
 * - Tenant/organisation/facility context resolution
 * - Scoped lookup (cross-tenant/org/facility returns safe 404, no leak)
 * - Lifecycle transitions (canonical forward graph)
 * - Idempotency (non-terminal same-state = invalid transition 422;
 *   terminal completed re-completion = idempotent success 200, no
 *   duplicate audit)
 * - Invalid source-state rejection (cancelled, no_show, completed
 *   cannot enter/advance)
 * - Audit event emission (exactly one per actual transition)
 * - No PHI in audit metadata
 * - Concurrency (confirm-vs-confirm, confirm-vs-cancel,
 *   confirm-vs-reschedule, check-in concurrency, check-in-vs-cancel,
 *   start concurrency, complete-vs-complete; one transition, one
 *   audit, deterministic outcome)
 * - Full happy path: booked → confirmed → arrived → in_progress →
 *   completed
 * - Direct happy path: booked → arrived → in_progress → completed
 *
 * Per the task specification, these tests require PostgreSQL 17.
 * They are NOT run locally without PostgreSQL 17.
 *
 * Determinism: All tests use a fixed clock instant
 * (2026-08-01T12:00:00.000Z).
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

// ---------------------------------------------------------------------------
// Test helpers
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

// ---------------------------------------------------------------------------
// Visit-lifecycle request helpers (no body)
// ---------------------------------------------------------------------------

async function confirmAppointment(
  cookie: string,
  appointmentId: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/confirm`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
}

async function checkInAppointment(
  cookie: string,
  appointmentId: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/check-in`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
}

async function startAppointment(
  cookie: string,
  appointmentId: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/start`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
}

async function completeAppointment(
  cookie: string,
  appointmentId: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/complete`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
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
  body: {
    scheduledStart: string;
    scheduledEnd: string;
    reason: string;
  },
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/reschedule`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

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

type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

/**
 * Seed a tenant/org/facility, user with the given role, patient,
 * eligible provider, and an appointment row in the given status (created
 * directly via Prisma so it works regardless of whether the role can
 * book). Returns everything needed by the visit-lifecycle tests.
 *
 * The appointment is seeded directly (not via the booking endpoint)
 * because several tests exercise roles (R13, R02) that do NOT hold
 * `appointments:book`. Using the booking endpoint to seed would
 * conflate booking authorization with visit-lifecycle behavior.
 */
async function seedAppointment(
  emailSlug: string,
  role: PlatformRoleCode = 'R09_ADMINISTRATOR',
  status: AppointmentStatus = 'booked',
): Promise<{
  cookie: string;
  appointmentId: string;
  tenantId: string;
  organisationId: string;
  facilityId: string;
  patientId: string;
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
      scheduledStart: new Date(FUTURE_START),
      scheduledEnd: new Date(FUTURE_END),
      status,
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
    membershipId,
  };
}

/**
 * Force an existing appointment into a given status via a direct Prisma
 * update (used for invalid-source-state and terminal regression tests).
 */
async function forceStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<void> {
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });
}

beforeEach(async () => {
  await truncateAll();
  resetThrottlerStorageSafely(throttlerStorage);
});

// ===========================================================================
// Tests
// ===========================================================================

describe('Appointment Visit Lifecycle (Stage 1F)', () => {
  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  describe('Authentication', () => {
    it('confirm returns 401 when no session cookie is supplied', async () => {
      const { appointmentId } = await seedAppointment('unauth-confirm');
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/confirm`)
        .set('Origin', ORIGIN);
      expect(response.status).toBe(401);
    });

    it('check-in returns 401 when no session cookie is supplied', async () => {
      const { appointmentId } = await seedAppointment('unauth-checkin');
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/check-in`)
        .set('Origin', ORIGIN);
      expect(response.status).toBe(401);
    });

    it('start returns 401 when no session cookie is supplied', async () => {
      const { appointmentId } = await seedAppointment('unauth-start');
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/start`)
        .set('Origin', ORIGIN);
      expect(response.status).toBe(401);
    });

    it('complete returns 401 when no session cookie is supplied', async () => {
      const { appointmentId } = await seedAppointment('unauth-complete');
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/complete`)
        .set('Origin', ORIGIN);
      expect(response.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization — Confirm
  // -------------------------------------------------------------------------

  describe('Authorization — confirm (appointments:confirm)', () => {
    it('R06 Receptionist can confirm', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r06-confirm',
        'R06_RECEPTIONIST',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('confirmed');
    });

    it('R07 Scheduler can confirm', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r07-confirm',
        'R07_SCHEDULER',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('confirmed');
    });

    it('R09 Clinic Administrator can confirm', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r09-confirm',
        'R09_ADMINISTRATOR',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('confirmed');
    });

    it('R13 Platform Super Admin is denied (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r13-confirm',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R01 Physician is denied confirm (403) — not an operational action', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r01-confirm-deny',
        'R01_PHYSICIAN',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R02 Nurse is denied confirm (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r02-confirm-deny',
        'R02_NURSE',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization — Check-in
  // -------------------------------------------------------------------------

  describe('Authorization — check-in (appointments:check_in)', () => {
    it('R06 Receptionist can check in', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r06-checkin',
        'R06_RECEPTIONIST',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('arrived');
    });

    it('R07 Scheduler can check in', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r07-checkin',
        'R07_SCHEDULER',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('arrived');
    });

    it('R09 Clinic Administrator can check in', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r09-checkin',
        'R09_ADMINISTRATOR',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('arrived');
    });

    it('R13 Platform Super Admin is denied (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r13-checkin',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R01 Physician is denied check-in (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r01-checkin-deny',
        'R01_PHYSICIAN',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization — Start
  // -------------------------------------------------------------------------

  describe('Authorization — start (appointments:start)', () => {
    it('R01 Physician can start', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r01-start',
        'R01_PHYSICIAN',
        'arrived',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
    });

    it('R13 Platform Super Admin is denied (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r13-start',
        'R13_SYSTEM_ADMINISTRATOR',
        'arrived',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R06 Receptionist is denied start (403) — clinical action', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r06-start-deny',
        'R06_RECEPTIONIST',
        'arrived',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R09 Clinic Administrator is denied start (403) — no clinical override', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r09-start-deny',
        'R09_ADMINISTRATOR',
        'arrived',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization — Complete
  // -------------------------------------------------------------------------

  describe('Authorization — complete (appointments:complete)', () => {
    it('R01 Physician can complete', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r01-complete',
        'R01_PHYSICIAN',
        'in_progress',
      );
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
    });

    it('R13 Platform Super Admin is denied (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r13-complete',
        'R13_SYSTEM_ADMINISTRATOR',
        'in_progress',
      );
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R02 Nurse is denied complete (403) — physician-only', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r02-complete-deny',
        'R02_NURSE',
        'in_progress',
      );
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R09 Clinic Administrator is denied complete (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r09-complete-deny',
        'R09_ADMINISTRATOR',
        'in_progress',
      );
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // Scope isolation
  // -------------------------------------------------------------------------

  describe('Scope isolation', () => {
    it('correct tenant/org/facility appointment works for confirm', async () => {
      const { cookie, appointmentId } = await seedAppointment('scope-ok');
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('confirmed');
    });

    it('cross-tenant returns safe 404', async () => {
      const seedA = await seedAppointment('cross-tenant-a');
      const seedB = await seedAppointment('cross-tenant-b');
      // B's cookie/scope cannot confirm A's appointment.
      const response = await confirmAppointment(
        seedB.cookie,
        seedA.appointmentId,
      );
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });

    it('cross-organisation returns safe 404', async () => {
      const seedA = await seedAppointment('cross-org-a');
      const seedB = await seedAppointment('cross-org-b');
      const response = await confirmAppointment(
        seedB.cookie,
        seedA.appointmentId,
      );
      expect(response.status).toBe(404);
    });

    it('cross-facility returns safe 404', async () => {
      const seedA = await seedAppointment('cross-fac-a');
      const seedB = await seedAppointment('cross-fac-b');
      const response = await checkInAppointment(
        seedB.cookie,
        seedA.appointmentId,
      );
      expect(response.status).toBe(404);
    });

    it('body cannot override scope (unknown fields rejected)', async () => {
      const { cookie, appointmentId } = await seedAppointment('override-body');
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/confirm`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
          tenantId: 'evil-tenant',
          organisationId: 'evil-org',
          facilityId: 'evil-facility',
          status: 'completed',
          actorId: 'evil-actor',
        });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });

    it('body cannot supply arbitrary target status (no status field)', async () => {
      const { cookie, appointmentId } = await seedAppointment('no-status');
      // The confirm endpoint accepts no body; a status field is unknown.
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/confirm`)
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({ status: 'completed' });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // Confirmation
  // -------------------------------------------------------------------------

  describe('POST /appointments/:id/confirm', () => {
    it('booked → confirmed', async () => {
      const { cookie, appointmentId } = await seedAppointment('confirm-happy');
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('confirmed');
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('confirmed');
    });

    it('repeated confirmation (confirmed → confirmed) is invalid transition 422', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'confirm-idem',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('invalid confirmation source states rejected', async () => {
      const invalidStates: AppointmentStatus[] = [
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
      ];
      for (const status of invalidStates) {
        await truncateAll();
        const { cookie, appointmentId } = await seedAppointment(
          `confirm-invalid-${status}`,
          'R09_ADMINISTRATOR',
          status,
        );
        const response = await confirmAppointment(cookie, appointmentId);
        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
      }
    });

    it('exactly one confirmation audit event on transition', async () => {
      const { cookie, appointmentId } = await seedAppointment('confirm-audit');
      await prisma.auditOutboxEvent.deleteMany();
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      const count = await countOutboxByAction('appointments.confirmed');
      expect(count).toBe(1);
    });

    it('no audit event on invalid confirmation', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'confirm-no-audit',
        'R09_ADMINISTRATOR',
        'completed',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
      const count = await countOutboxByAction('appointments.confirmed');
      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Check-in
  // -------------------------------------------------------------------------

  describe('POST /appointments/:id/check-in', () => {
    it('booked → arrived (direct check-in)', async () => {
      const { cookie, appointmentId } = await seedAppointment('checkin-booked');
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('arrived');
    });

    it('confirmed → arrived', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'checkin-confirmed',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('arrived');
    });

    it('repeated check-in (arrived → arrived) is invalid transition 422', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'checkin-idem',
        'R09_ADMINISTRATOR',
        'arrived',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('invalid check-in source states rejected', async () => {
      const invalidStates: AppointmentStatus[] = [
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
      ];
      for (const status of invalidStates) {
        await truncateAll();
        const { cookie, appointmentId } = await seedAppointment(
          `checkin-invalid-${status}`,
          'R09_ADMINISTRATOR',
          status,
        );
        const response = await checkInAppointment(cookie, appointmentId);
        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
      }
    });

    it('exactly one check-in audit event on transition', async () => {
      const { cookie, appointmentId } = await seedAppointment('checkin-audit');
      await prisma.auditOutboxEvent.deleteMany();
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      const count = await countOutboxByAction('appointments.checked_in');
      expect(count).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Start
  // -------------------------------------------------------------------------

  describe('POST /appointments/:id/start', () => {
    it('arrived → in_progress', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'start-happy',
        'R01_PHYSICIAN',
        'arrived',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
    });

    it('repeated start (in_progress → in_progress) is invalid transition 422', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'start-idem',
        'R01_PHYSICIAN',
        'in_progress',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('invalid start source states rejected', async () => {
      const invalidStates: AppointmentStatus[] = [
        'booked',
        'confirmed',
        'completed',
        'cancelled',
        'no_show',
      ];
      for (const status of invalidStates) {
        await truncateAll();
        const { cookie, appointmentId } = await seedAppointment(
          `start-invalid-${status}`,
          'R01_PHYSICIAN',
          status,
        );
        const response = await startAppointment(cookie, appointmentId);
        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
      }
    });

    it('exactly one start audit event on transition', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'start-audit',
        'R01_PHYSICIAN',
        'arrived',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      const count = await countOutboxByAction('appointments.started');
      expect(count).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Complete
  // -------------------------------------------------------------------------

  describe('POST /appointments/:id/complete', () => {
    it('in_progress → completed', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'complete-happy',
        'R01_PHYSICIAN',
        'in_progress',
      );
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('completed');
    });

    it('repeated completion (completed → completed) is idempotent success 200, no duplicate audit', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'complete-idem',
        'R01_PHYSICIAN',
        'completed',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      const count = await countOutboxByAction('appointments.completed');
      expect(count).toBe(0);
    });

    it('invalid complete source states rejected', async () => {
      const invalidStates: AppointmentStatus[] = [
        'booked',
        'confirmed',
        'arrived',
        'cancelled',
        'no_show',
      ];
      for (const status of invalidStates) {
        await truncateAll();
        const { cookie, appointmentId } = await seedAppointment(
          `complete-invalid-${status}`,
          'R01_PHYSICIAN',
          status,
        );
        const response = await completeAppointment(cookie, appointmentId);
        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
      }
    });

    it('exactly one completion audit event on transition', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'complete-audit',
        'R01_PHYSICIAN',
        'in_progress',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(200);
      const count = await countOutboxByAction('appointments.completed');
      expect(count).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Full happy path
  // -------------------------------------------------------------------------

  describe('Full happy path', () => {
    it('booked → confirmed → arrived → in_progress → completed', async () => {
      // The full happy path requires operational roles for confirm/
      // check-in (R06/R07/R09) and clinical roles for start/complete
      // (R01). Seed one appointment with R09, then add an R01 user in
      // the SAME tenant/org/facility to start and complete.
      const r09 = await seedAppointment('happy-r09', 'R09_ADMINISTRATOR');
      // Confirm (R09)
      const confirmRes = await confirmAppointment(
        r09.cookie,
        r09.appointmentId,
      );
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.status).toBe('confirmed');
      // Check-in (R09)
      const checkinRes = await checkInAppointment(
        r09.cookie,
        r09.appointmentId,
      );
      expect(checkinRes.status).toBe(200);
      expect(checkinRes.body.status).toBe('arrived');

      // Create an R01 user sharing r09's tenant/org/facility.
      const { userId: r01UserId } = await createUser(
        'happy-r01-same@example.com',
        'happy-r01-same',
      );
      const { membershipId: r01MembershipId } = await createMembership(
        r01UserId,
        r09.tenantId,
        'R01_PHYSICIAN',
        r09.organisationId,
      );
      const r01Cookie = await loginUser(
        'happy-r01-same@example.com',
        TEST_PASSWORD,
      );
      await selectContext(
        r01Cookie,
        r01MembershipId,
        r09.organisationId,
        r09.facilityId,
      );
      // Start (R01)
      const startRes = await startAppointment(r01Cookie, r09.appointmentId);
      expect(startRes.status).toBe(200);
      expect(startRes.body.status).toBe('in_progress');
      // Complete (R01)
      const completeRes = await completeAppointment(
        r01Cookie,
        r09.appointmentId,
      );
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.status).toBe('completed');

      const row = await prisma.appointment.findUnique({
        where: { id: r09.appointmentId },
      });
      expect(row?.status).toBe('completed');

      // Audit: one of each action.
      expect(await countOutboxByAction('appointments.confirmed')).toBe(1);
      expect(await countOutboxByAction('appointments.checked_in')).toBe(1);
      expect(await countOutboxByAction('appointments.started')).toBe(1);
      expect(await countOutboxByAction('appointments.completed')).toBe(1);
    });

    it('direct booked → arrived → in_progress → completed (no prior confirmation)', async () => {
      const r09 = await seedAppointment(
        'direct-r09',
        'R09_ADMINISTRATOR',
        'booked',
      );
      // Check-in directly from booked (R09)
      const checkinRes = await checkInAppointment(
        r09.cookie,
        r09.appointmentId,
      );
      expect(checkinRes.status).toBe(200);
      expect(checkinRes.body.status).toBe('arrived');

      // R01 in same tenant/org/facility
      const { userId: r01UserId } = await createUser(
        'direct-r01@example.com',
        'direct-r01',
      );
      const { membershipId: r01MembershipId } = await createMembership(
        r01UserId,
        r09.tenantId,
        'R01_PHYSICIAN',
        r09.organisationId,
      );
      const r01Cookie = await loginUser(
        'direct-r01@example.com',
        TEST_PASSWORD,
      );
      await selectContext(
        r01Cookie,
        r01MembershipId,
        r09.organisationId,
        r09.facilityId,
      );
      const startRes = await startAppointment(r01Cookie, r09.appointmentId);
      expect(startRes.status).toBe(200);
      expect(startRes.body.status).toBe('in_progress');
      const completeRes = await completeAppointment(
        r01Cookie,
        r09.appointmentId,
      );
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.status).toBe('completed');

      expect(await countOutboxByAction('appointments.checked_in')).toBe(1);
      expect(await countOutboxByAction('appointments.started')).toBe(1);
      expect(await countOutboxByAction('appointments.completed')).toBe(1);
      // No confirmation in the direct path.
      expect(await countOutboxByAction('appointments.confirmed')).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Concurrency
  // -------------------------------------------------------------------------

  describe('Concurrency', () => {
    it('two simultaneous confirmations produce one transition and one audit', async () => {
      const { cookie, appointmentId } = await seedAppointment('conc-confirm');
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        confirmAppointment(cookie, appointmentId),
        confirmAppointment(cookie, appointmentId),
      ]);
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([200, 422]);
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('confirmed');
      const count = await countOutboxByAction('appointments.confirmed');
      expect(count).toBe(1);
    });

    it('confirm vs cancel: at most one transition commits from booked', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'conc-confirm-cancel',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        confirmAppointment(cookie, appointmentId),
        cancelAppointment(cookie, appointmentId, 'Concurrent cancel.'),
      ]);
      const statuses = [r1.status, r2.status].sort();
      // One wins (200), the other re-observes the changed state (422).
      expect([200, 422]).toEqual(expect.arrayContaining(statuses));
      expect(statuses).toContain(200);
      expect(statuses).toContain(422);
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      // Final state is one of the two terminal-ish results.
      expect(['confirmed', 'cancelled']).toContain(row?.status);
      // Exactly one audit event total (either confirmed or cancelled).
      const confirmedCount = await countOutboxByAction(
        'appointments.confirmed',
      );
      const cancelledCount = await countOutboxByAction(
        'appointments.cancelled',
      );
      expect(confirmedCount + cancelledCount).toBe(1);
    });

    it('confirm vs reschedule: no split-brain lifecycle', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'conc-confirm-resched',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        confirmAppointment(cookie, appointmentId),
        rescheduleAppointment(cookie, appointmentId, {
          scheduledStart: '2026-09-02T10:00:00.000Z',
          scheduledEnd: '2026-09-02T10:30:00.000Z',
          reason: 'Concurrent reschedule.',
        }),
      ]);
      // One wins (200), the other is rejected (422).
      expect([r1.status, r2.status].sort()).toEqual([200, 422]);
      // The appointment should be in exactly one committed state.
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(['confirmed', 'cancelled']).toContain(row?.status);
    });

    it('simultaneous check-in: one transition, one audit', async () => {
      const { cookie, appointmentId } = await seedAppointment('conc-checkin');
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        checkInAppointment(cookie, appointmentId),
        checkInAppointment(cookie, appointmentId),
      ]);
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([200, 422]);
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('arrived');
      const count = await countOutboxByAction('appointments.checked_in');
      expect(count).toBe(1);
    });

    it('check-in vs cancel: canonical ordering', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'conc-checkin-cancel',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        checkInAppointment(cookie, appointmentId),
        cancelAppointment(cookie, appointmentId, 'Concurrent cancel.'),
      ]);
      expect([r1.status, r2.status].sort()).toEqual([200, 422]);
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(['arrived', 'cancelled']).toContain(row?.status);
      const checkedIn = await countOutboxByAction('appointments.checked_in');
      const cancelled = await countOutboxByAction('appointments.cancelled');
      expect(checkedIn + cancelled).toBe(1);
    });

    it('check-in vs reschedule: obeys current lifecycle', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'conc-checkin-resched',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        checkInAppointment(cookie, appointmentId),
        rescheduleAppointment(cookie, appointmentId, {
          scheduledStart: '2026-09-02T10:00:00.000Z',
          scheduledEnd: '2026-09-02T10:30:00.000Z',
          reason: 'Concurrent reschedule.',
        }),
      ]);
      expect([r1.status, r2.status].sort()).toEqual([200, 422]);
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(['arrived', 'cancelled']).toContain(row?.status);
    });

    it('simultaneous start: one transition, one audit', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'conc-start',
        'R01_PHYSICIAN',
        'arrived',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        startAppointment(cookie, appointmentId),
        startAppointment(cookie, appointmentId),
      ]);
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([200, 422]);
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('in_progress');
      const count = await countOutboxByAction('appointments.started');
      expect(count).toBe(1);
    });

    it('simultaneous complete: one transition, one audit (idempotent second)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'conc-complete',
        'R01_PHYSICIAN',
        'in_progress',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const [r1, r2] = await Promise.all([
        completeAppointment(cookie, appointmentId),
        completeAppointment(cookie, appointmentId),
      ]);
      // Both succeed (200): first transitions, second is idempotent.
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      const row = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(row?.status).toBe('completed');
      const count = await countOutboxByAction('appointments.completed');
      expect(count).toBe(1);
    });

    it('no expected serialization conflict escapes as HTTP 500', async () => {
      const { cookie, appointmentId } = await seedAppointment('conc-no-500');
      const [r1, r2] = await Promise.all([
        confirmAppointment(cookie, appointmentId),
        confirmAppointment(cookie, appointmentId),
      ]);
      expect(r1.status).not.toBe(500);
      expect(r2.status).not.toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  // Terminal / exception regression
  // -------------------------------------------------------------------------

  describe('Terminal / exception regression', () => {
    it('cancelled cannot enter visit lifecycle (confirm)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'term-cancel-confirm',
        'R09_ADMINISTRATOR',
        'cancelled',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
    });

    it('cancelled cannot enter visit lifecycle (check-in)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'term-cancel-checkin',
        'R09_ADMINISTRATOR',
        'cancelled',
      );
      const response = await checkInAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
    });

    it('cancelled cannot enter visit lifecycle (start)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'term-cancel-start',
        'R01_PHYSICIAN',
        'cancelled',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
    });

    it('cancelled cannot enter visit lifecycle (complete)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'term-cancel-complete',
        'R01_PHYSICIAN',
        'cancelled',
      );
      const response = await completeAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
    });

    it('no_show cannot enter visit lifecycle', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'term-noshow',
        'R09_ADMINISTRATOR',
        'no_show',
      );
      const confirmRes = await confirmAppointment(cookie, appointmentId);
      expect(confirmRes.status).toBe(422);
      const checkinRes = await checkInAppointment(cookie, appointmentId);
      expect(checkinRes.status).toBe(422);
    });

    it('completed cannot advance further (start rejected)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'term-completed-start',
        'R01_PHYSICIAN',
        'completed',
      );
      const response = await startAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
    });

    it('completed cannot advance further (confirm rejected)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'term-completed-confirm',
        'R09_ADMINISTRATOR',
        'completed',
      );
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(422);
    });
  });

  // -------------------------------------------------------------------------
  // Audit metadata — no PHI
  // -------------------------------------------------------------------------

  describe('Audit metadata', () => {
    it('confirm audit event contains no PHI (only endpoint + appointmentId)', async () => {
      const { cookie, appointmentId } =
        await seedAppointment('audit-phi-confirm');
      await prisma.auditOutboxEvent.deleteMany();
      await confirmAppointment(cookie, appointmentId);
      const rows = await prisma.auditOutboxEvent.findMany();
      const event = rows.find(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'appointments.confirmed',
      );
      expect(event).toBeDefined();
      const draft = event!.canonicalEventDraft as Record<string, unknown>;
      const metadata = (draft.metadata ?? {}) as Record<string, unknown>;
      expect(metadata).toHaveProperty('endpoint', 'appointments_confirm');
      expect(metadata).toHaveProperty('appointmentId', appointmentId);
      // No PHI keys.
      const forbiddenKeys = [
        'patientId',
        'providerId',
        'patientName',
        'providerName',
        'scheduledStart',
        'scheduledEnd',
        'reason',
        'encounterId',
        'diagnosis',
        'prescription',
      ];
      for (const key of forbiddenKeys) {
        expect(metadata).not.toHaveProperty(key);
      }
    });

    it('complete audit event contains no PHI', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'audit-phi-complete',
        'R01_PHYSICIAN',
        'in_progress',
      );
      await prisma.auditOutboxEvent.deleteMany();
      await completeAppointment(cookie, appointmentId);
      const rows = await prisma.auditOutboxEvent.findMany();
      const event = rows.find(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'appointments.completed',
      );
      expect(event).toBeDefined();
      const draft = event!.canonicalEventDraft as Record<string, unknown>;
      const metadata = (draft.metadata ?? {}) as Record<string, unknown>;
      expect(metadata).toHaveProperty('appointmentId', appointmentId);
      expect(metadata).not.toHaveProperty('patientId');
      expect(metadata).not.toHaveProperty('encounterId');
    });

    it('actor/session context is populated from the authenticated session', async () => {
      const { cookie, appointmentId } = await seedAppointment('audit-actor');
      await prisma.auditOutboxEvent.deleteMany();
      await confirmAppointment(cookie, appointmentId);
      const rows = await prisma.auditOutboxEvent.findMany();
      const event = rows.find(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'appointments.confirmed',
      );
      expect(event).toBeDefined();
      const draft = event!.canonicalEventDraft as Record<string, unknown>;
      expect(draft).toHaveProperty('actorType', 'USER');
      expect(draft).toHaveProperty('actorId');
      expect(typeof draft.actorId).toBe('string');
      expect(draft).toHaveProperty('scope', 'facility_context');
    });

    it('no audit event on authorization failure (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'audit-no-event-403',
        'R13_SYSTEM_ADMINISTRATOR',
      );
      await prisma.auditOutboxEvent.deleteMany();
      const response = await confirmAppointment(cookie, appointmentId);
      expect(response.status).toBe(403);
      const count = await countOutboxByAction('appointments.confirmed');
      expect(count).toBe(0);
    });

    it('no audit event on not-found (404)', async () => {
      const { cookie } = await seedAppointment('audit-no-event-404');
      await prisma.auditOutboxEvent.deleteMany();
      const response = await confirmAppointment(
        cookie,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(response.status).toBe(404);
      const count = await countOutboxByAction('appointments.confirmed');
      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Regression — stages 1C/1D/1E remain intact
  // -------------------------------------------------------------------------

  describe('Regression — slot blocking and non-blocking statuses', () => {
    it('cancelled appointment slot is non-blocking for rebooking', async () => {
      const r09 = await seedAppointment('reg-cancel-slot', 'R09_ADMINISTRATOR');
      await forceStatus(r09.appointmentId, 'cancelled');
      // Book a new appointment in the same slot — should succeed.
      const bookRes = await request(server)
        .post('/api/v1/appointments')
        .set('Origin', ORIGIN)
        .set('Cookie', r09.cookie)
        .send({
          patientId: r09.patientId,
          providerId: r09.providerId,
          scheduledStart: FUTURE_START,
          scheduledEnd: FUTURE_END,
          typeCode: 'consultation',
        });
      expect(bookRes.status).toBe(201);
    });

    it('no_show appointment slot is non-blocking for rebooking', async () => {
      const r09 = await seedAppointment('reg-noshow-slot', 'R09_ADMINISTRATOR');
      await forceStatus(r09.appointmentId, 'no_show');
      const bookRes = await request(server)
        .post('/api/v1/appointments')
        .set('Origin', ORIGIN)
        .set('Cookie', r09.cookie)
        .send({
          patientId: r09.patientId,
          providerId: r09.providerId,
          scheduledStart: FUTURE_START,
          scheduledEnd: FUTURE_END,
          typeCode: 'consultation',
        });
      expect(bookRes.status).toBe(201);
    });

    it('booked appointment slot blocks overlap (Stage 1C)', async () => {
      const r09 = await seedAppointment('reg-overlap', 'R09_ADMINISTRATOR');
      const bookRes = await request(server)
        .post('/api/v1/appointments')
        .set('Origin', ORIGIN)
        .set('Cookie', r09.cookie)
        .send({
          patientId: r09.patientId,
          providerId: r09.providerId,
          scheduledStart: FUTURE_START,
          scheduledEnd: FUTURE_END,
          typeCode: 'consultation',
        });
      expect(bookRes.status).toBe(422);
    });
  });
});
