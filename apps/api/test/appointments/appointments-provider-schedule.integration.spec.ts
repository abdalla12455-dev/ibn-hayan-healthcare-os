/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Provider Schedule / Availability Enforcement Integration Tests —
 * Scheduling Completion Milestone.
 *
 * These tests exercise provider availability enforcement during
 * appointment booking and rescheduling via supertest against a real
 * NestJS application with a real PostgreSQL 17 database.
 *
 * Coverage:
 * - Booking succeeds when the provider has a schedule entry that
 *   covers the requested slot (facility-local day + time window).
 * - Booking is blocked (422 APPOINTMENT_PROVIDER_NOT_AVAILABLE) when:
 *   - The provider has no schedule entry for the appointment's day.
 *   - The appointment's time window extends beyond working hours.
 *   - The facility timezone is null (fail-closed).
 *   - The facility timezone is invalid (fail-closed).
 * - Rescheduling is blocked when the replacement slot is outside
 *   the provider's availability.
 * - Cross-tenant schedule isolation (a schedule in tenant B does not
 *   make a provider "available" in tenant A).
 * - ProviderScheduleRepository CRUD (create, findByProviderAndFacility,
 *   delete) via the DI port.
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
  ProviderScheduleRepository,
  TenantId,
  OrganisationId,
  FacilityId,
  UserId,
  ProviderId,
  PlatformRoleCode,
  ProviderScheduleEntryCreateInput,
} from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  PROVIDER_SCHEDULE_REPOSITORY,
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
let providerSchedules: ProviderScheduleRepository;

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
  providerSchedules = app.get(PROVIDER_SCHEDULE_REPOSITORY);
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

async function setFacilityTimezone(
  facilityId: string,
  timezone: string | null,
): Promise<void> {
  await prisma.$executeRaw`UPDATE facilities SET timezone = ${timezone} WHERE id = ${facilityId}::uuid`;
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

/**
 * Seed a full environment: tenant, org, facility (with timezone),
 * user (R09), patient, eligible provider, and optional schedule entry.
 * Returns everything needed by the tests.
 */
async function seedEnvironment(
  emailSlug: string,
  opts: {
    timezone: string | null;
    schedule?: ProviderScheduleEntryCreateInput;
  },
): Promise<{
  cookie: string;
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
  await setFacilityTimezone(facilityId, opts.timezone);
  const { membershipId } = await createMembership(
    userId,
    tenantId,
    'R09_ADMINISTRATOR',
    organisationId,
  );
  const { patientId } = await createPatient(tenantId, `MRN-${emailSlug}`);
  const { providerId } = await createEligibleProvider(
    tenantId,
    organisationId,
    facilityId,
  );
  if (opts.schedule) {
    await providerSchedules.create(
      tenantId as TenantId,
      organisationId as OrganisationId,
      facilityId as FacilityId,
      {
        providerId: providerId as ProviderId,
        dayOfWeek: opts.schedule.dayOfWeek,
        startTime: opts.schedule.startTime,
        endTime: opts.schedule.endTime,
      },
    );
  }
  const cookie = await loginUser(`${emailSlug}@example.com`, TEST_PASSWORD);
  await selectContext(cookie, membershipId, organisationId, facilityId);
  return {
    cookie,
    tenantId,
    organisationId,
    facilityId,
    patientId,
    providerId,
    membershipId,
  };
}

async function bookAppointment(
  cookie: string,
  body: {
    patientId: string;
    providerId: string;
    scheduledStart: string;
    scheduledEnd: string;
    typeCode: string;
  },
): Promise<request.Response> {
  return request(server)
    .post('/api/v1/appointments')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body);
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

beforeEach(async () => {
  await truncateAll();
  resetThrottlerStorageSafely(throttlerStorage);
});

// ===========================================================================
// Tests
// ===========================================================================

describe('Provider Schedule / Availability Enforcement (Scheduling Completion Milestone)', () => {
  // -------------------------------------------------------------------------
  // Booking — availability enforced
  // -------------------------------------------------------------------------

  describe('Booking — availability enforcement', () => {
    // The fixed test clock is 2026-08-01T12:00:00Z which is a Saturday.
    // 2026-09-01 is a Tuesday (ISO day 2).
    // In Asia/Baghdad (UTC+3): 09:00Z → 12:00 local, 09:30Z → 12:30 local.
    // A schedule entry for Tuesday (day 2) 09:00–17:00 local covers it.
    // A schedule entry for Monday (day 1) does NOT cover a Tuesday slot.

    it('booking succeeds when provider has a covering schedule entry', async () => {
      const env = await seedEnvironment('book-ok', {
        timezone: 'Asia/Baghdad',
        schedule: {
          providerId: '' as ProviderId, // overridden in seedEnvironment
          dayOfWeek: 2, // Tuesday
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });
      const response = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z', // Tue 12:00 Baghdad
        scheduledEnd: '2026-09-01T09:30:00.000Z', // Tue 12:30 Baghdad
        typeCode: 'consultation',
      });
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('booked');
    });

    it('booking is blocked when provider has no schedule entry for the day', async () => {
      // Schedule on Monday (day 1), appointment on Tuesday (day 2).
      const env = await seedEnvironment('book-no-day', {
        timezone: 'Asia/Baghdad',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 1, // Monday
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });
      const response = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z', // Tuesday
        scheduledEnd: '2026-09-01T09:30:00.000Z',
        typeCode: 'consultation',
      });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });

    it('booking is blocked when the slot extends beyond working hours', async () => {
      // Working hours 09:00–12:00 local; appointment 12:00–12:30 local
      // is at the boundary (end 12:30 > 12:00).
      const env = await seedEnvironment('book-beyond', {
        timezone: 'Asia/Baghdad',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2, // Tuesday
          startTime: '09:00:00',
          endTime: '12:00:00',
        },
      });
      const response = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z', // Tue 12:00 Baghdad
        scheduledEnd: '2026-09-01T09:30:00.000Z', // Tue 12:30 > 12:00
        typeCode: 'consultation',
      });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });

    it('booking is blocked when the facility timezone is null (fail closed)', async () => {
      const env = await seedEnvironment('book-null-tz', {
        timezone: null,
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2,
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });
      const response = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z',
        scheduledEnd: '2026-09-01T09:30:00.000Z',
        typeCode: 'consultation',
      });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });

    it('booking is blocked when the facility timezone is invalid (fail closed)', async () => {
      const env = await seedEnvironment('book-bad-tz', {
        timezone: 'Invalid/Timezone',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2,
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });
      const response = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z',
        scheduledEnd: '2026-09-01T09:30:00.000Z',
        typeCode: 'consultation',
      });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });

    it('booking is blocked when the provider has no schedule at all', async () => {
      const env = await seedEnvironment('book-no-schedule', {
        timezone: 'Asia/Baghdad',
      });
      const response = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z',
        scheduledEnd: '2026-09-01T09:30:00.000Z',
        typeCode: 'consultation',
      });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Rescheduling — availability enforced
  // -------------------------------------------------------------------------

  describe('Rescheduling — availability enforcement', () => {
    it('rescheduling succeeds when the new slot is within working hours', async () => {
      // Original slot Tuesday 12:00–12:30 Baghdad; schedule covers
      // Tuesday 09:00–17:00. Reschedule to Tuesday 13:00–13:30 Baghdad
      // (10:00–10:30 UTC), still within working hours.
      const env = await seedEnvironment('resched-ok', {
        timezone: 'Asia/Baghdad',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2, // Tuesday
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });
      const bookRes = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z', // 12:00 Baghdad
        scheduledEnd: '2026-09-01T09:30:00.000Z', // 12:30 Baghdad
        typeCode: 'consultation',
      });
      expect(bookRes.status).toBe(201);
      const reschedRes = await rescheduleAppointment(
        env.cookie,
        bookRes.body.id as string,
        {
          scheduledStart: '2026-09-01T10:00:00.000Z', // 13:00 Baghdad
          scheduledEnd: '2026-09-01T10:30:00.000Z', // 13:30 Baghdad
          reason: 'Patient request',
        },
      );
      expect(reschedRes.status).toBe(200);
    });

    it('rescheduling is blocked when the replacement slot is outside working hours', async () => {
      // Schedule covers Tuesday 09:00–17:00 Baghdad.
      const env = await seedEnvironment('resched-blocked', {
        timezone: 'Asia/Baghdad',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2, // Tuesday
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });

      // Book the original slot inside working hours: Tuesday
      // 12:00–12:30 Baghdad (09:00–09:30 UTC).
      const bookRes = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z', // 12:00 Baghdad
        scheduledEnd: '2026-09-01T09:30:00.000Z', // 12:30 Baghdad
        typeCode: 'consultation',
      });
      expect(bookRes.status).toBe(201);
      const originalId = bookRes.body.id as string;

      // Clear audit outbox so we can verify no reschedule audit is emitted.
      await prisma.auditOutboxEvent.deleteMany();

      // Attempt to reschedule to a slot outside working hours:
      // Tuesday 18:00–18:30 Baghdad (15:00–15:30 UTC), after 17:00.
      const reschedRes = await rescheduleAppointment(env.cookie, originalId, {
        scheduledStart: '2026-09-01T15:00:00.000Z', // 18:00 Baghdad
        scheduledEnd: '2026-09-01T15:30:00.000Z', // 18:30 Baghdad
        reason: 'Patient request',
      });

      // Reschedule must be blocked with 422 APPOINTMENT_PROVIDER_NOT_AVAILABLE.
      expect(reschedRes.status).toBe(422);
      expect(reschedRes.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );

      // The original appointment must remain unchanged (still booked).
      const original = await prisma.appointment.findUnique({
        where: { id: originalId },
      });
      expect(original).not.toBeNull();
      expect(original!.status).toBe('booked');
      expect(original!.scheduledStart.toISOString()).toBe(
        '2026-09-01T09:00:00.000Z',
      );
      expect(original!.scheduledEnd.toISOString()).toBe(
        '2026-09-01T09:30:00.000Z',
      );

      // No replacement appointment must have been created.
      const replacements = await prisma.appointment.findMany({
        where: {
          tenantId: env.tenantId,
          providerId: env.providerId,
          scheduledStart: new Date('2026-09-01T15:00:00.000Z'),
        },
      });
      expect(replacements).toHaveLength(0);

      // No reschedule audit event must have been emitted.
      const auditRows = await prisma.auditOutboxEvent.findMany();
      const rescheduledEvents = auditRows.filter(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'appointments.rescheduled',
      );
      expect(rescheduledEvents).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // ProviderScheduleRepository CRUD
  // -------------------------------------------------------------------------

  describe('ProviderScheduleRepository CRUD', () => {
    it('create, findByProviderAndFacility, and delete work correctly', async () => {
      const { tenantId } = await createTenant('crud-tn', 'CRUD Tenant');
      const { organisationId } = await createOrganisation(
        tenantId,
        'crud-org',
        'CRUD Org',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'crud-fac',
        'CRUD Facility',
      );
      const provider = await prisma.provider.create({
        data: { tenantId, status: 'active' },
      });

      // Create a schedule entry.
      const entry = await providerSchedules.create(
        tenantId as TenantId,
        organisationId as OrganisationId,
        facilityId as FacilityId,
        {
          providerId: provider.id as ProviderId,
          dayOfWeek: 1, // Monday
          startTime: '08:00:00',
          endTime: '12:00:00',
        },
      );
      expect(entry.dayOfWeek).toBe(1);
      expect(entry.startTime).toBe('08:00:00');
      expect(entry.endTime).toBe('12:00:00');

      // Find it.
      const found = await providerSchedules.findByProviderAndFacility(
        tenantId as TenantId,
        provider.id as ProviderId,
        facilityId as FacilityId,
      );
      expect(found).toHaveLength(1);
      expect(found[0]!.id).toBe(entry.id);

      // Delete it — returns the deleted entry (truthful contract).
      const deleted = await providerSchedules.delete(
        tenantId as TenantId,
        organisationId as OrganisationId,
        facilityId as FacilityId,
        entry.id,
      );
      expect(deleted).not.toBeNull();
      expect(deleted!.id).toBe(entry.id);
      expect(deleted!.dayOfWeek).toBe(1);

      // Verify it is gone.
      const afterDelete = await providerSchedules.findByProviderAndFacility(
        tenantId as TenantId,
        provider.id as ProviderId,
        facilityId as FacilityId,
      );
      expect(afterDelete).toHaveLength(0);
    });

    it('delete on a non-existent or cross-tenant entry returns null (no error)', async () => {
      const { tenantId } = await createTenant('crud-tn2', 'CRUD Tenant 2');
      const { organisationId } = await createOrganisation(
        tenantId,
        'crud-org2',
        'CRUD Org 2',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'crud-fac2',
        'CRUD Facility 2',
      );
      const fakeId = '00000000-0000-4000-a000-000000000000';
      const deleted = await providerSchedules.delete(
        tenantId as TenantId,
        organisationId as OrganisationId,
        facilityId as FacilityId,
        fakeId as Parameters<typeof providerSchedules.delete>[3],
      );
      expect(deleted).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Cross-tenant schedule isolation
  // -------------------------------------------------------------------------

  describe('Cross-tenant schedule isolation', () => {
    it('a schedule in tenant B does not make a provider available in tenant A', async () => {
      // Tenant A: provider, facility, no schedule, timezone set.
      const envA = await seedEnvironment('iso-a', {
        timezone: 'Asia/Baghdad',
      });
      // Tenant B: separate provider/facility with a schedule. The
      // schedule is created as a side effect of seedEnvironment; the
      // returned env is not needed for the assertion.
      await seedEnvironment('iso-b', {
        timezone: 'Asia/Baghdad',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2,
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });
      // Booking in tenant A should be blocked (no schedule for A's provider).
      const response = await bookAppointment(envA.cookie, {
        patientId: envA.patientId,
        providerId: envA.providerId,
        scheduledStart: '2026-09-01T09:00:00.000Z',
        scheduledEnd: '2026-09-01T09:30:00.000Z',
        typeCode: 'consultation',
      });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Database tenant/org/facility integrity (composite FK enforcement)
  // -------------------------------------------------------------------------

  describe('Database tenant/org/facility integrity (composite FKs)', () => {
    it('rejects a schedule row with a provider from a different tenant', async () => {
      // Tenant A: provider.
      const { tenantId: tenantA } = await createTenant(
        'fk-tn-a',
        'FK Tenant A',
      );
      const { organisationId: orgA } = await createOrganisation(
        tenantA,
        'fk-org-a',
        'FK Org A',
      );
      await createFacility(tenantA, orgA, 'fk-fac-a', 'FK Facility A');
      const providerA = await prisma.provider.create({
        data: { tenantId: tenantA, status: 'active' },
      });

      // Tenant B: separate tenant with a facility.
      const { tenantId: tenantB } = await createTenant(
        'fk-tn-b',
        'FK Tenant B',
      );
      const { organisationId: orgB } = await createOrganisation(
        tenantB,
        'fk-org-b',
        'FK Org B',
      );
      const { facilityId: facilityB } = await createFacility(
        tenantB,
        orgB,
        'fk-fac-b',
        'FK Facility B',
      );

      // Attempt to insert a schedule row in tenant B that references
      // provider A from tenant A. The composite FK (tenant_id, provider_id)
      // → providers(tenant_id, id) must reject this.
      await expect(
        prisma.providerSchedule.create({
          data: {
            tenantId: tenantB,
            organisationId: orgB,
            facilityId: facilityB,
            providerId: providerA.id,
            dayOfWeek: 1,
            startTime: new Date('1970-01-01T08:00:00Z'),
            endTime: new Date('1970-01-01T12:00:00Z'),
          },
        }),
      ).rejects.toThrow();
    });

    it('rejects a schedule row with a facility from a different organisation', async () => {
      const { tenantId } = await createTenant('fk-org-tn', 'FK Org Tenant');
      // Org A with a facility.
      const { organisationId: orgA } = await createOrganisation(
        tenantId,
        'fk-org-x',
        'FK Org X',
      );
      const { facilityId: facilityInOrgA } = await createFacility(
        tenantId,
        orgA,
        'fk-fac-x',
        'FK Facility X',
      );
      // Org B (different organisation in the same tenant).
      const { organisationId: orgB } = await createOrganisation(
        tenantId,
        'fk-org-y',
        'FK Org Y',
      );
      const provider = await prisma.provider.create({
        data: { tenantId, status: 'active' },
      });

      // Attempt to insert a schedule row claiming org B but pointing
      // at a facility in org A. The composite FK
      // (tenant_id, organisation_id, facility_id) →
      // facilities(tenant_id, organisation_id, id) must reject this.
      await expect(
        prisma.providerSchedule.create({
          data: {
            tenantId,
            organisationId: orgB,
            facilityId: facilityInOrgA,
            providerId: provider.id,
            dayOfWeek: 1,
            startTime: new Date('1970-01-01T08:00:00Z'),
            endTime: new Date('1970-01-01T12:00:00Z'),
          },
        }),
      ).rejects.toThrow();
    });

    it('accepts a schedule row with matching tenant/org/facility/provider', async () => {
      const { tenantId } = await createTenant('fk-ok-tn', 'FK OK Tenant');
      const { organisationId } = await createOrganisation(
        tenantId,
        'fk-ok-org',
        'FK OK Org',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'fk-ok-fac',
        'FK OK Facility',
      );
      const provider = await prisma.provider.create({
        data: { tenantId, status: 'active' },
      });

      // A fully-consistent row must be accepted.
      const row = await prisma.providerSchedule.create({
        data: {
          tenantId,
          organisationId,
          facilityId,
          providerId: provider.id,
          dayOfWeek: 1,
          startTime: new Date('1970-01-01T08:00:00Z'),
          endTime: new Date('1970-01-01T12:00:00Z'),
        },
      });
      expect(row.id).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Cross-midnight fail-closed
  // -------------------------------------------------------------------------

  describe('Cross-midnight fail-closed', () => {
    it('booking is blocked when the slot spans midnight (facility-local)', async () => {
      // America/New_York is UTC-4 in September (EDT).
      // 2026-09-01 is a Tuesday in America/New_York.
      // Slot: Tue 23:00 ET – Wed 00:30 ET (spans midnight).
      // 23:00 EDT = 03:00+1 UTC; 00:30+1 EDT = 04:30+1 UTC.
      const env = await seedEnvironment('xmidnight-book', {
        timezone: 'America/New_York',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2, // Tuesday
          startTime: '22:00:00',
          endTime: '23:59:59',
        },
      });

      // Slot: Tue 23:00 ET – Wed 00:30 ET (spans midnight).
      const response = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-02T03:00:00.000Z', // Tue 23:00 ET
        scheduledEnd: '2026-09-02T04:30:00.000Z', // Wed 00:30 ET
        typeCode: 'consultation',
      });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });

    it('rescheduling is blocked when the replacement slot spans midnight (facility-local)', async () => {
      const env = await seedEnvironment('xmidnight-resched', {
        timezone: 'America/New_York',
        schedule: {
          providerId: '' as ProviderId,
          dayOfWeek: 2, // Tuesday
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      });

      // Book a valid same-day slot: Tue 10:00–10:30 ET
      // = 14:00–14:30 UTC.
      const bookRes = await bookAppointment(env.cookie, {
        patientId: env.patientId,
        providerId: env.providerId,
        scheduledStart: '2026-09-01T14:00:00.000Z', // Tue 10:00 ET
        scheduledEnd: '2026-09-01T14:30:00.000Z', // Tue 10:30 ET
        typeCode: 'consultation',
      });
      expect(bookRes.status).toBe(201);

      // Attempt to reschedule to a cross-midnight slot: Tue 23:00 –
      // Wed 00:30 ET = 03:00–04:30 UTC next day.
      const reschedRes = await rescheduleAppointment(
        env.cookie,
        bookRes.body.id as string,
        {
          scheduledStart: '2026-09-02T03:00:00.000Z', // Tue 23:00 ET
          scheduledEnd: '2026-09-02T04:30:00.000Z', // Wed 00:30 ET
          reason: 'Patient request',
        },
      );
      expect(reschedRes.status).toBe(422);
      expect(reschedRes.body.error.code).toBe(
        'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      );
    });
  });
});
