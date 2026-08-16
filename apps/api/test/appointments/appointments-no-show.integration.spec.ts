/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Appointment No-Show Lifecycle Integration Tests —
 * Scheduling Completion Milestone.
 *
 * These tests exercise the no-show recording flow via supertest against
 * a real NestJS application with a real PostgreSQL 17 database. They
 * cover:
 * - POST /api/v1/appointments/:id/no-show
 *   (confirmed|arrived → no_show)
 *
 * Coverage:
 * - Authentication (session cookie validation)
 * - Authorization (R06, R07, R09 granted; R13 denied; R01 denied)
 * - Tenant/organisation/facility context resolution
 * - Scoped lookup (cross-tenant returns safe 404, no leak)
 * - Lifecycle transitions (confirmed → no_show, arrived → no_show)
 * - Idempotency (already-no_show returns 200, no duplicate audit)
 * - Invalid source-state rejection (booked, in_progress, completed,
 *   cancelled cannot transition to no_show)
 * - Audit event emission (exactly one per actual transition)
 * - No PHI in audit metadata
 * - Concurrency (no-show-vs-no-show, no-show-vs-cancel)
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
// No-show request helper
// ---------------------------------------------------------------------------

async function markNoShow(
  cookie: string,
  appointmentId: string,
  body?: { reason?: string },
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/appointments/${appointmentId}/no-show`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body ?? {});
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
 * eligible provider, and an appointment row in the given status.
 */
async function seedAppointment(
  emailSlug: string,
  role: PlatformRoleCode = 'R09_ADMINISTRATOR',
  status: AppointmentStatus = 'confirmed',
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

beforeEach(async () => {
  await truncateAll();
  resetThrottlerStorageSafely(throttlerStorage);
});

// ===========================================================================
// Tests
// ===========================================================================

describe('Appointment No-Show Lifecycle (Scheduling Completion Milestone)', () => {
  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  describe('Authentication', () => {
    it('no-show returns 401 when no session cookie is supplied', async () => {
      const { appointmentId } = await seedAppointment('unauth-noshow');
      const response = await request(server)
        .post(`/api/v1/appointments/${appointmentId}/no-show`)
        .set('Origin', ORIGIN)
        .send({});
      expect(response.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization
  // -------------------------------------------------------------------------

  describe('Authorization — no-show (appointments:no_show)', () => {
    it('R06 Receptionist can mark no-show', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r06-noshow',
        'R06_RECEPTIONIST',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
    });

    it('R07 Clinic Coordinator can mark no-show', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r07-noshow',
        'R07_SCHEDULER',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
    });

    it('R09 Clinic Administrator can mark no-show', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r09-noshow',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
    });

    it('R13 Platform Super Admin is denied (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r13-noshow',
        'R13_SYSTEM_ADMINISTRATOR',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R01 Physician is denied no-show (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r01-noshow-deny',
        'R01_PHYSICIAN',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(403);
    });

    it('R02 Nurse is denied no-show (403)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'r02-noshow-deny',
        'R02_NURSE',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // Valid transitions
  // -------------------------------------------------------------------------

  describe('Valid transitions', () => {
    it('confirmed → no_show succeeds', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'confirmed-noshow',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
      expect(response.body.id).toBe(appointmentId);
      expect(response.body.typeCode).toBe('consultation');
    });

    it('arrived → no_show succeeds (CheckedIn → NoShow)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'arrived-noshow',
        'R09_ADMINISTRATOR',
        'arrived',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
    });

    it('no-show with a reason body succeeds', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'noshow-reason',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId, {
        reason: 'Patient did not arrive for the scheduled appointment.',
      });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
    });

    it('no-show with empty body succeeds (reason optional)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'noshow-empty',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId, {});
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
    });

    it('no-show with strict-schema extra field is rejected (400)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'noshow-extra',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId, {
        reason: 'ok',
        unexpectedField: 'should-be-rejected',
      } as unknown as { reason?: string });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('APPOINTMENT_VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // Invalid transitions
  // -------------------------------------------------------------------------

  describe('Invalid transitions', () => {
    it('booked → no_show is rejected (422)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'booked-noshow',
        'R09_ADMINISTRATOR',
        'booked',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('in_progress → no_show is rejected (422)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'inprogress-noshow',
        'R09_ADMINISTRATOR',
        'in_progress',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('completed → no_show is rejected (422)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'completed-noshow',
        'R09_ADMINISTRATOR',
        'completed',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });

    it('cancelled → no_show is rejected (422)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'cancelled-noshow',
        'R09_ADMINISTRATOR',
        'cancelled',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TRANSITION');
    });
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  describe('Idempotency', () => {
    it('re-marking an already-no_show appointment returns 200 (idempotent)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'idempotent-noshow',
        'R09_ADMINISTRATOR',
        'no_show',
      );
      const response = await markNoShow(cookie, appointmentId);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('no_show');
    });

    it('idempotent re-marking does NOT emit a duplicate audit event', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'idempotent-audit',
        'R09_ADMINISTRATOR',
        'no_show',
      );
      await markNoShow(cookie, appointmentId);
      const count = await countOutboxByAction('appointments.no_show_recorded');
      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Justification persistence (operator-ratified no-show reason storage)
  // -------------------------------------------------------------------------

  describe('Justification persistence', () => {
    it('persists the supplied reason on the first confirmed -> no_show transition', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'reason-persist',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const reason = 'Patient did not arrive for the scheduled appointment.';
      const response = await markNoShow(cookie, appointmentId, { reason });
      expect(response.status).toBe(200);
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.noShowReason).toBe(reason);
    });

    it('omitted reason stores null on the first no_show transition', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'reason-omitted',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const response = await markNoShow(cookie, appointmentId, {});
      expect(response.status).toBe(200);
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.noShowReason).toBeNull();
    });

    it('idempotent re-mark MUST NOT overwrite the original reason', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'reason-no-overwrite',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const originalReason = 'Original no-show justification.';
      const first = await markNoShow(cookie, appointmentId, {
        reason: originalReason,
      });
      expect(first.status).toBe(200);
      // Idempotent re-mark with a DIFFERENT reason.
      const second = await markNoShow(cookie, appointmentId, {
        reason: 'Attempted overwrite reason.',
      });
      expect(second.status).toBe(200);
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.noShowReason).toBe(originalReason);
    });

    it('idempotent re-mark with no reason MUST NOT clear the original reason', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'reason-no-clear',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const originalReason = 'Patient was unreachable.';
      await markNoShow(cookie, appointmentId, { reason: originalReason });
      // Re-mark with no reason body.
      await markNoShow(cookie, appointmentId, {});
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.noShowReason).toBe(originalReason);
    });

    it('invalid transition (booked -> no_show) writes nothing', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'reason-invalid-transition',
        'R09_ADMINISTRATOR',
        'booked',
      );
      const response = await markNoShow(cookie, appointmentId, {
        reason: 'Should not be persisted.',
      });
      expect(response.status).toBe(422);
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.status).toBe('booked');
      expect(appt?.noShowReason).toBeNull();
    });

    it('cross-tenant access cannot alter another appointment reason', async () => {
      // Tenant A has a confirmed appointment.
      const seedA = await seedAppointment(
        'reason-cross-tenant-a',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      // Tenant B is separate.
      const seedB = await seedAppointment(
        'reason-cross-tenant-b',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      // Tenant B tries to mark tenant A's appointment with a reason.
      const response = await markNoShow(seedB.cookie, seedA.appointmentId, {
        reason: 'Cross-tenant attempt.',
      });
      expect(response.status).toBe(404);
      // Tenant A's appointment is unchanged — no reason, status intact.
      const appt = await prisma.appointment.findUnique({
        where: { id: seedA.appointmentId },
      });
      expect(appt?.status).toBe('confirmed');
      expect(appt?.noShowReason).toBeNull();
    });

    it('audit metadata excludes the free-text reason (PHI-safe)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'reason-audit-safe',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const secretReason =
        'Confidential justification text that must not leak.';
      await markNoShow(cookie, appointmentId, { reason: secretReason });
      const rows = await prisma.auditOutboxEvent.findMany();
      const noShowEvent = rows.find(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'appointments.no_show_recorded',
      );
      expect(noShowEvent).toBeDefined();
      const metadata = (
        noShowEvent!.canonicalEventDraft as {
          metadata?: Record<string, unknown>;
        }
      ).metadata;
      expect(metadata).toEqual({
        endpoint: 'appointments_no_show',
        appointmentId,
      });
      const metadataStr = JSON.stringify(metadata);
      expect(metadataStr).not.toContain('Confidential');
      expect(metadataStr).not.toContain('justification');
      // The reason IS persisted on the appointment row.
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.noShowReason).toBe(secretReason);
    });
  });

  // -------------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------------

  describe('Audit', () => {
    it('emits exactly one appointments.no_show_recorded event on a first-time transition', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'audit-noshow',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      await markNoShow(cookie, appointmentId);
      const count = await countOutboxByAction('appointments.no_show_recorded');
      expect(count).toBe(1);
    });

    it('audit metadata contains no PHI (only endpoint + appointmentId)', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'audit-phi-noshow',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      await markNoShow(cookie, appointmentId, {
        reason: 'Patient did not arrive.',
      });
      const rows = await prisma.auditOutboxEvent.findMany();
      const noShowEvent = rows.find(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'appointments.no_show_recorded',
      );
      expect(noShowEvent).toBeDefined();
      const metadata = (
        noShowEvent!.canonicalEventDraft as {
          metadata?: Record<string, unknown>;
        }
      ).metadata;
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({
        endpoint: 'appointments_no_show',
        appointmentId,
      });
      // Ensure no reason/patient/provider text leaked into metadata.
      const metadataStr = JSON.stringify(metadata);
      expect(metadataStr).not.toContain('did not arrive');
      expect(metadataStr).not.toContain('reason');
    });
  });

  // -------------------------------------------------------------------------
  // Tenant / scope isolation
  // -------------------------------------------------------------------------

  describe('Tenant / scope isolation', () => {
    it('cross-tenant no-show returns 404 (safe not-found, no leak)', async () => {
      // Tenant A has the appointment.
      const seedA = await seedAppointment(
        'cross-tenant-a',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      // Tenant B is a separate tenant/org/facility/user.
      const seedB = await seedAppointment(
        'cross-tenant-b',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      // Use tenant B's cookie to mark tenant A's appointment.
      const response = await markNoShow(seedB.cookie, seedA.appointmentId);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
      // Tenant A's appointment status should remain unchanged.
      const appt = await prisma.appointment.findUnique({
        where: { id: seedA.appointmentId },
      });
      expect(appt?.status).toBe('confirmed');
    });

    it('no-show on a non-existent appointment returns 404', async () => {
      const { cookie } = await seedAppointment(
        'nonexistent-noshow',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const fakeId = '00000000-0000-4000-a000-000000000000';
      const response = await markNoShow(cookie, fakeId);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    });
  });

  // -------------------------------------------------------------------------
  // Concurrency
  // -------------------------------------------------------------------------

  describe('Concurrency', () => {
    it('concurrent no-show-vs-no-show: one transition, one audit event', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'concurrent-noshow',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const [r1, r2] = await Promise.all([
        markNoShow(cookie, appointmentId),
        markNoShow(cookie, appointmentId),
      ]);
      // Both should succeed (idempotent terminal semantics): the first
      // transitions confirmed → no_show, the second is an idempotent
      // re-mark of the now-no_show appointment.
      expect([r1.status, r2.status].sort()).toEqual([200, 200]);
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.status).toBe('no_show');
      const count = await countOutboxByAction('appointments.no_show_recorded');
      expect(count).toBe(1);
    });

    it('concurrent no-show-vs-no-show with reasons: one writes, original preserved', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'concurrent-noshow-reason',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const reasonA = 'Concurrent reason A.';
      const reasonB = 'Concurrent reason B.';
      const [r1, r2] = await Promise.all([
        markNoShow(cookie, appointmentId, { reason: reasonA }),
        markNoShow(cookie, appointmentId, { reason: reasonB }),
      ]);
      // Both succeed (one transitioned, one idempotent).
      expect([r1.status, r2.status].sort()).toEqual([200, 200]);
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appt?.status).toBe('no_show');
      // The persisted reason is one of the two (the winner's reason);
      // the idempotent loser did NOT overwrite it. Exactly one audit.
      expect([reasonA, reasonB]).toContain(appt?.noShowReason);
      const count = await countOutboxByAction('appointments.no_show_recorded');
      expect(count).toBe(1);
    });

    it('concurrent no-show-vs-cancel: one wins, appointment is terminal', async () => {
      const { cookie, appointmentId } = await seedAppointment(
        'concurrent-noshow-cancel',
        'R09_ADMINISTRATOR',
        'confirmed',
      );
      const [noshowRes, cancelRes] = await Promise.all([
        markNoShow(cookie, appointmentId),
        cancelAppointment(cookie, appointmentId, 'Cancelled by staff'),
      ]);
      // Exactly one should succeed in transitioning; the other should
      // get an invalid-transition (422) because the source state is
      // no longer 'confirmed'. Both responses should be 2xx/4xx only
      // (no 500).
      const statuses = [noshowRes.status, cancelRes.status].sort();
      expect(statuses).toContain(200);
      // The appointment must be in a terminal state.
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(['no_show', 'cancelled']).toContain(appt?.status);
    });
  });
});
