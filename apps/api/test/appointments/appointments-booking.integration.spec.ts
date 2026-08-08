/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

/**
 * Appointments Booking Integration Tests.
 *
 * These tests exercise the full appointment booking flow via supertest
 * against a real NestJS application with a real PostgreSQL 17 database.
 * They cover:
 * - POST /api/v1/appointments endpoint
 * - Authorization (R06, R07, R09 allowed; R13 denied; other roles denied)
 * - Authentication (session cookie validation)
 * - Tenant/organisation/facility context resolution
 * - BC01 PatientRepository existence validation (Patient must exist in tenant)
 * - BC10 ProviderRepository eligibility validation (Provider must be active
 *   and have active facility assignment)
 * - Timestamp validation (end > start, no past times)
 * - Contract validation (UUID format, required fields)
 * - Provider overlap prevention
 * - Audit event emission
 * - Tenant isolation
 * - Concurrent overlap prevention
 *
 * Per APPOINTMENTS.md Section 2.2 and the BC01/BC10 implementations:
 * - Patient existence is verified via PatientRepository.existsInTenant()
 * - Provider eligibility is verified via ProviderRepository.isEligibleForFacility()
 * - Both use session-derived tenantId; cross-tenant lookups return null/false
 * - No caller-controlled tenant scope is accepted
 *
 * Per the task specification, these tests require PostgreSQL 17.
 * They are NOT run locally without PostgreSQL 17.
 *
 * Determinism: All tests use a fixed clock instant (2026-08-01T12:00:00.000Z)
 * to ensure consistent behavior regardless of execution date or server timezone.
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

/**
 * Fixed test clock that always returns 2026-08-01T12:00:00.000Z.
 * This ensures all tests are deterministic regardless of execution date
 * or server timezone.
 */
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
// Helpers
// ---------------------------------------------------------------------------

async function truncateAll(): Promise<void> {
  // Delete in dependency order: children before parents
  await prisma.auditOutboxEvent.deleteMany();
  await prisma.appointment.deleteMany();
  // BC10: Provider facility assignments must be deleted before providers
  await prisma.providerFacilityAssignment.deleteMany();
  await prisma.provider.deleteMany();
  // BC01: Patients must be deleted before tenants
  await prisma.patient.deleteMany();
  // auth_sessions references tenant_memberships via active_tenant_membership_id FK
  // so delete sessions BEFORE memberships
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
  const user = await users.create({
    email,
    displayName,
  });
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
  const tenant = await tenants.create({
    slug,
    displayName,
  });
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
): Promise<{ membershipId: string }> {
  const membership = await memberships.create({
    userId: userId as UserId,
    tenantId: tenantId as TenantId,
  });
  await roleAssignments.create({
    tenantMembershipId: membership.id,
    roleCode: role as PlatformRoleCode,
  });
  return { membershipId: membership.id };
}

// ---------------------------------------------------------------------------
// BC01 Patient helpers
// ---------------------------------------------------------------------------

async function createPatient(
  tenantId: string,
  medicalRecordNumber: string,
  status: 'active' | 'inactive' | 'archived' = 'active',
): Promise<{ patientId: string }> {
  const patient = await prisma.patient.create({
    data: {
      tenantId,
      medicalRecordNumber,
      status,
    },
  });
  return { patientId: patient.id };
}

// ---------------------------------------------------------------------------
// BC10 Provider helpers
// ---------------------------------------------------------------------------

type ProviderStatus =
  'candidate' | 'onboarded' | 'active' | 'suspended' | 'separated';

async function createProvider(
  tenantId: string,
  status: ProviderStatus = 'active',
): Promise<{ providerId: string }> {
  const provider = await prisma.provider.create({
    data: {
      tenantId,
      status,
    },
  });
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
    data: {
      tenantId,
      organisationId,
      facilityId,
      providerId,
      revokedAt,
    },
  });
  return { assignmentId: assignment.id };
}

/**
 * Creates a fully eligible provider for booking tests:
 * - Active provider
 * - Active (non-revoked) facility assignment
 */
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
    null, // active assignment
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
    // Log error details for debugging
    const error = new Error(
      `No cookie returned from login: status=${response.status}, body=${JSON.stringify(response.body)}`,
    );
    throw error;
  }
  return cookie[0];
}

async function selectContext(
  cookie: string,
  tenantMembershipId: string,
  organisationId: string,
  facilityId: string,
): Promise<void> {
  // Fetch CSRF token first
  const csrfResponse = await request(server)
    .get('/api/v1/auth/csrf')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
  const csrf = csrfResponse.headers['x-csrf-token'] as string;
  if (!csrf) {
    throw new Error('No CSRF token returned');
  }

  // Select tenant membership
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

  // Select organisation
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

  // Select facility
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

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FUTURE_START = '2026-09-01T09:00:00.000Z';
const FUTURE_END = '2026-09-01T09:30:00.000Z';
const FUTURE_START_2 = '2026-09-01T10:00:00.000Z';
const PAST_START = '2025-01-01T09:00:00.000Z';
const PAST_END = '2025-01-01T09:30:00.000Z';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Create test NestJS application with fixed clock
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CLOCK_SERVICE_TOKEN)
    .useValue(mockClockService)
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();

  // Get server instance
  server = app.getHttpServer() as Server;

  // Get services
  prisma = app.get(PrismaService);
  users = app.get(USER_REPOSITORY);
  tenants = app.get(TENANT_REPOSITORY);
  memberships = app.get(TENANT_MEMBERSHIP_REPOSITORY);
  roleAssignments = app.get(TENANT_ROLE_ASSIGNMENT_REPOSITORY);
  organisations = app.get(ORGANISATION_REPOSITORY);
  facilities = app.get(FACILITY_REPOSITORY);
  credentials = app.get(LocalCredentialService);
  passwordService = app.get(PasswordService);

  // Get throttler storage
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

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('POST /api/v1/appointments', () => {
  // ===== Successful booking tests =====

  describe('Successful booking', () => {
    it('R06 Receptionist can create a valid appointment', async () => {
      // Setup: Create user, tenant, organisation, facility, and membership
      const { userId } = await createUser(
        'r06@example.com',
        'Receptionist User',
      );
      const { tenantId } = await createTenant('test-tenant', 'Test Tenant');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org',
        'Test Organisation',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility',
        'Test Facility',
      );
      // R06_RECEPTIONIST role needed for R06 access
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R06_RECEPTIONIST',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-001', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      // Login and select context
      const cookie = await loginUser('r06@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.patientId).toBe(patientId);
      expect(response.body.providerId).toBe(providerId);
      expect(response.body.status).toBe('booked');
      expect(response.body.typeCode).toBe('consultation');
    });

    it('R07 Scheduler can create a valid appointment', async () => {
      const { userId } = await createUser('r07@example.com', 'Scheduler User');
      const { tenantId } = await createTenant('test-tenant-2', 'Test Tenant 2');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-2',
        'Test Organisation 2',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-2',
        'Test Facility 2',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R07_SCHEDULER',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-002', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('r07@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'follow-up',
      );

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('booked');
    });

    it('R09 Clinic Administrator can create a valid appointment', async () => {
      const { userId } = await createUser('r09@example.com', 'Admin User');
      const { tenantId } = await createTenant('test-tenant-3', 'Test Tenant 3');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-3',
        'Test Organisation 3',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-3',
        'Test Facility 3',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-003', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('r09@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'procedure',
      );

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('booked');
    });

    it('The created appointment is persisted', async () => {
      const { userId } = await createUser(
        'persist@example.com',
        'Persist User',
      );
      const { tenantId } = await createTenant('test-tenant-4', 'Test Tenant 4');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-4',
        'Test Organisation 4',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-4',
        'Test Facility 4',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-004', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('persist@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(201);
      const appointmentId = response.body.id;

      // Verify appointment is in database
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appointment).not.toBeNull();
      expect(appointment!.tenantId).toBe(tenantId);
      expect(appointment!.organisationId).toBe(organisationId);
      expect(appointment!.facilityId).toBe(facilityId);
    });

    it('The response follows the canonical contract', async () => {
      const { userId } = await createUser(
        'contract@example.com',
        'Contract User',
      );
      const { tenantId } = await createTenant('test-tenant-5', 'Test Tenant 5');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-5',
        'Test Organisation 5',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-5',
        'Test Facility 5',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-005', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('contract@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('patientId');
      expect(response.body).toHaveProperty('providerId');
      expect(response.body).toHaveProperty('scheduledStart');
      expect(response.body).toHaveProperty('scheduledEnd');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('typeCode');
    });

    it('The audit event is emitted', async () => {
      const { userId } = await createUser('audit@example.com', 'Audit User');
      const { tenantId } = await createTenant('test-tenant-6', 'Test Tenant 6');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-6',
        'Test Organisation 6',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-6',
        'Test Facility 6',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-006', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('audit@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      // Check for audit event (any outbox event proves the audit system is working)
      const outboxEventCount = await prisma.auditOutboxEvent.count();
      expect(outboxEventCount).toBeGreaterThan(0);
    });

    it('Adjacent non-overlapping appointments are permitted', async () => {
      const { userId } = await createUser(
        'adjacent@example.com',
        'Adjacent User',
      );
      const { tenantId } = await createTenant('test-tenant-7', 'Test Tenant 7');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-7',
        'Test Organisation 7',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-7',
        'Test Facility 7',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-007', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('adjacent@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Book first appointment 09:00-09:30
      const response1 = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(response1.status).toBe(201);

      // Book second appointment 09:30-10:00 (adjacent, not overlapping)
      const response2 = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_END, // starts exactly when first ends
        FUTURE_START_2,
        'follow-up',
      );
      expect(response2.status).toBe(201);
    });
  });

  // ===== Authentication and authorization tests =====

  describe('Authentication and authorization', () => {
    it('Unauthenticated request is rejected', async () => {
      const response = await request(server)
        .post('/api/v1/appointments')
        .set('Origin', ORIGIN)
        .send({
          patientId: '00000000-0000-0000-0000-000000000015',
          providerId: '00000000-0000-0000-0000-000000000016',
          scheduledStart: FUTURE_START,
          scheduledEnd: FUTURE_END,
          typeCode: 'consultation',
        });

      expect(response.status).toBe(401);
    });

    it('Unauthorized role is rejected (R13)', async () => {
      const { userId } = await createUser('r13@example.com', 'R13 User');
      const { tenantId } = await createTenant('test-tenant-8', 'Test Tenant 8');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-8',
        'Test Organisation 8',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-8',
        'Test Facility 8',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R13_SYSTEM_ADMINISTRATOR',
      );

      const cookie = await loginUser('r13@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        '00000000-0000-0000-0000-000000000017',
        '00000000-0000-0000-0000-000000000018',
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(403);
    });

    it('R02_NURSE is denied', async () => {
      const { userId } = await createUser('r02@example.com', 'R02 User');
      const { tenantId } = await createTenant('test-tenant-9', 'Test Tenant 9');
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-9',
        'Test Organisation 9',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-9',
        'Test Facility 9',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R02_NURSE',
      );

      const cookie = await loginUser('r02@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        '00000000-0000-0000-0000-000000000019',
        '00000000-0000-0000-0000-000000000020',
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(403);
    });
  });

  // ===== Validation tests =====

  describe('Validation', () => {
    it('End before start is rejected', async () => {
      const { userId } = await createUser(
        'end-start@example.com',
        'End Start User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-10',
        'Test Tenant 10',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-10',
        'Test Organisation 10',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-10',
        'Test Facility 10',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      const cookie = await loginUser('end-start@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // End before start
      const response = await bookAppointment(
        cookie,
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000022',
        FUTURE_END, // end is before start
        FUTURE_START,
        'consultation',
      );

      expect(response.status).toBe(400);
    });

    it('Equal start and end are rejected', async () => {
      const { userId } = await createUser('equal@example.com', 'Equal User');
      const { tenantId } = await createTenant(
        'test-tenant-11',
        'Test Tenant 11',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-11',
        'Test Organisation 11',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-11',
        'Test Facility 11',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      const cookie = await loginUser('equal@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        '00000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000024',
        FUTURE_START,
        FUTURE_START, // equal
        'consultation',
      );

      expect(response.status).toBe(400);
    });

    it('Past appointment time is rejected', async () => {
      const { userId } = await createUser('past@example.com', 'Past User');
      const { tenantId } = await createTenant(
        'test-tenant-12',
        'Test Tenant 12',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-12',
        'Test Organisation 12',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-12',
        'Test Facility 12',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      const cookie = await loginUser('past@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        '00000000-0000-0000-0000-000000000025',
        '00000000-0000-0000-0000-000000000026',
        PAST_START,
        PAST_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PAST_TIME');
    });

    it('Invalid patient ID (not UUID) is rejected', async () => {
      const { userId } = await createUser(
        'invalid-patient@example.com',
        'Invalid Patient User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-13',
        'Test Tenant 13',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-13',
        'Test Organisation 13',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-13',
        'Test Facility 13',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      const cookie = await loginUser(
        'invalid-patient@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await request(server)
        .post('/api/v1/appointments')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
          patientId: 'not-a-uuid',
          providerId: '00000000-0000-0000-0000-000000000028',
          scheduledStart: FUTURE_START,
          scheduledEnd: FUTURE_END,
          typeCode: 'consultation',
        });

      expect(response.status).toBe(400);
    });

    it('Missing required fields are rejected', async () => {
      const { userId } = await createUser(
        'missing@example.com',
        'Missing User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-14',
        'Test Tenant 14',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-14',
        'Test Organisation 14',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-14',
        'Test Facility 14',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      const cookie = await loginUser('missing@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await request(server)
        .post('/api/v1/appointments')
        .set('Origin', ORIGIN)
        .set('Cookie', cookie)
        .send({
          patientId: '00000000-0000-0000-0000-000000000029',
          // missing providerId, scheduledStart, scheduledEnd, typeCode
        });

      expect(response.status).toBe(400);
    });
  });

  // ===== Conflict handling tests =====

  describe('Conflict handling', () => {
    it('Exact overlap is rejected', async () => {
      const { userId } = await createUser(
        'overlap1@example.com',
        'Overlap1 User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-15',
        'Test Tenant 15',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-15',
        'Test Organisation 15',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-15',
        'Test Facility 15',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-015', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('overlap1@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Book first appointment
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      // Try to book exact same time
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'follow-up',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
    });

    it('Partial overlap at the beginning is rejected', async () => {
      const { userId } = await createUser(
        'overlap2@example.com',
        'Overlap2 User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-16',
        'Test Tenant 16',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-16',
        'Test Organisation 16',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-16',
        'Test Facility 16',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-016', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('overlap2@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Book first appointment 09:00-09:30
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      // Try to book 08:45-09:15 (overlapping beginning)
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        '2026-09-01T08:45:00.000Z',
        '2026-09-01T09:15:00.000Z',
        'follow-up',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
    });

    it('Partial overlap at the end is rejected', async () => {
      const { userId } = await createUser(
        'overlap3@example.com',
        'Overlap3 User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-17',
        'Test Tenant 17',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-17',
        'Test Organisation 17',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-17',
        'Test Facility 17',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-017', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('overlap3@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Book first appointment 09:00-09:30
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      // Try to book 09:15-09:45 (overlapping end)
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        '2026-09-01T09:15:00.000Z',
        '2026-09-01T09:45:00.000Z',
        'follow-up',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
    });

    it('A requested appointment containing an existing appointment is rejected', async () => {
      const { userId } = await createUser(
        'overlap4@example.com',
        'Overlap4 User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-18',
        'Test Tenant 18',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-18',
        'Test Organisation 18',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-18',
        'Test Facility 18',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-018', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('overlap4@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Book first appointment 09:00-09:30
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      // Try to book 08:30-10:00 (containing existing)
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        '2026-09-01T08:30:00.000Z',
        '2026-09-01T10:00:00.000Z',
        'follow-up',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
    });

    it('A requested appointment contained inside an existing appointment is rejected', async () => {
      const { userId } = await createUser(
        'overlap5@example.com',
        'Overlap5 User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-19',
        'Test Tenant 19',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-19',
        'Test Organisation 19',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-19',
        'Test Facility 19',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-019', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('overlap5@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Book first appointment 08:30-10:00
      await bookAppointment(
        cookie,
        patientId,
        providerId,
        '2026-09-01T08:30:00.000Z',
        '2026-09-01T10:00:00.000Z',
        'consultation',
      );

      // Try to book 09:00-09:30 (inside existing)
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'follow-up',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_OVERLAP');
    });

    it('Different providers can have appointments at the same time', async () => {
      const { userId } = await createUser(
        'diff-provider@example.com',
        'Diff Provider User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-20',
        'Test Tenant 20',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-20',
        'Test Organisation 20',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-20',
        'Test Facility 20',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures (two providers)
      const { patientId } = await createPatient(tenantId, 'MRN-020', 'active');
      const { providerId: providerId1 } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );
      const { providerId: providerId2 } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser(
        'diff-provider@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Book with provider 1
      const response1 = await bookAppointment(
        cookie,
        patientId,
        providerId1,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(response1.status).toBe(201);

      // Book with provider 2 at the same time (should succeed)
      const response2 = await bookAppointment(
        cookie,
        patientId,
        providerId2,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );
      expect(response2.status).toBe(201);
    });
  });

  // ===== Concurrency tests =====

  describe('Concurrency', () => {
    /**
     * Test that two concurrent overlapping booking requests result in exactly
     * one successful appointment creation.
     *
     * The SERIALIZABLE transaction isolation ensures that only one of the
     * concurrent requests can succeed. The other receives a conflict error.
     *
     * This test verifies:
     * - Exactly one appointment is created
     * - One request succeeds (201) and one fails (422 with OVERLAP)
     * - No database constraint violations occur
     * - No serialization failures result in 500 errors
     */
    it('Concurrent overlapping requests result in exactly one appointment', async () => {
      const { userId } = await createUser(
        'concurrent@example.com',
        'Concurrent User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-21',
        'Test Tenant 21',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-21',
        'Test Organisation 21',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-21',
        'Test Facility 21',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-021', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('concurrent@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Send two concurrent overlapping booking requests
      const [response1, response2] = await Promise.all([
        bookAppointment(
          cookie,
          patientId,
          providerId,
          FUTURE_START,
          FUTURE_END,
          'consultation',
        ),
        bookAppointment(
          cookie,
          patientId,
          providerId,
          FUTURE_START,
          FUTURE_END,
          'consultation',
        ),
      ]);

      // Exactly one should succeed
      const successCount = [response1.status, response2.status].filter(
        (s) => s === 201,
      ).length;
      expect(successCount).toBe(1);

      // Exactly one should fail with OVERLAP
      const conflictCount = [response1, response2].filter(
        (r) => r.status === 422 && r.body.error?.code === 'APPOINTMENT_OVERLAP',
      ).length;
      expect(conflictCount).toBe(1);

      // No internal server errors
      const errorCount = [response1, response2].filter(
        (r) => r.status >= 500,
      ).length;
      expect(errorCount).toBe(0);

      // Exactly one appointment should be in the database
      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId,
          organisationId,
          facilityId,
          providerId,
          scheduledStart: new Date(FUTURE_START),
        },
      });
      expect(appointments.length).toBe(1);
    });

    it('Concurrent requests with adjacent times both succeed', async () => {
      const { userId } = await createUser(
        'concurrent-adjacent@example.com',
        'Concurrent Adjacent User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-22',
        'Test Tenant 22',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-22',
        'Test Organisation 22',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-22',
        'Test Facility 22',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient and BC10 Provider fixtures
      const { patientId } = await createPatient(tenantId, 'MRN-022', 'active');
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser(
        'concurrent-adjacent@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Send two concurrent non-overlapping booking requests
      // First: 09:00-09:30, Second: 09:30-10:00
      const [response1, response2] = await Promise.all([
        bookAppointment(
          cookie,
          patientId,
          providerId,
          FUTURE_START,
          FUTURE_END,
          'consultation',
        ),
        bookAppointment(
          cookie,
          patientId,
          providerId,
          FUTURE_END,
          FUTURE_START_2,
          'follow-up',
        ),
      ]);

      // Both should succeed (adjacent appointments don't overlap)
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Both appointments should be in the database
      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId,
          organisationId,
          facilityId,
          providerId,
        },
      });
      expect(appointments.length).toBe(2);
    });
  });

  // ===== BC01 Patient validation tests =====

  describe('BC01 Patient validation', () => {
    it('Booking succeeds when patient exists in authenticated tenant', async () => {
      const { userId } = await createUser(
        'patient-ok@example.com',
        'Patient OK User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-p1',
        'Test Tenant P1',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-p1',
        'Test Organisation P1',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-p1',
        'Test Facility P1',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-P1', 'active');

      // Create BC10 Provider fixture
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('patient-ok@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

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

    it('Booking fails when patient UUID has no corresponding row', async () => {
      const { userId } = await createUser(
        'patient-missing@example.com',
        'Patient Missing User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-p2',
        'Test Tenant P2',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-p2',
        'Test Organisation P2',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-p2',
        'Test Facility P2',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC10 Provider fixture (but NOT patient)
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser(
        'patient-missing@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Use arbitrary UUID that has no corresponding Patient row
      const nonExistentPatientId = '00000000-0000-0000-0000-000000000099';

      const response = await bookAppointment(
        cookie,
        nonExistentPatientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PATIENT_NOT_FOUND');
    });

    it('Booking fails when patient belongs to different tenant', async () => {
      const { userId } = await createUser(
        'patient-cross-tenant@example.com',
        'Patient Cross Tenant User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-p3',
        'Test Tenant P3',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-p3',
        'Test Organisation P3',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-p3',
        'Test Facility P3',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create a different tenant with a patient
      const { tenantId: otherTenantId } = await createTenant(
        'test-tenant-p3-other',
        'Test Tenant P3 Other',
      );
      const { patientId } = await createPatient(
        otherTenantId,
        'MRN-P3-OTHER',
        'active',
      );

      // Create BC10 Provider fixture in the authenticated tenant
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser(
        'patient-cross-tenant@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Patient belongs to different tenant - should be rejected
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      // Returns same error as missing patient (no existence leak)
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PATIENT_NOT_FOUND');

      // Verify no appointment was created
      const appointmentCount = await prisma.appointment.count({
        where: { tenantId },
      });
      expect(appointmentCount).toBe(0);
    });
  });

  // ===== BC10 Provider validation tests =====

  describe('BC10 Provider validation', () => {
    it('Booking succeeds when provider is active and has active facility assignment', async () => {
      const { userId } = await createUser(
        'provider-ok@example.com',
        'Provider OK User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr1',
        'Test Tenant PR1',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr1',
        'Test Organisation PR1',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr1',
        'Test Facility PR1',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR1', 'active');

      // Create fully eligible BC10 Provider (active + active assignment)
      const { providerId } = await createEligibleProvider(
        tenantId,
        organisationId,
        facilityId,
      );

      const cookie = await loginUser('provider-ok@example.com', TEST_PASSWORD);
      await selectContext(cookie, membershipId, organisationId, facilityId);

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

    it('Booking fails when provider UUID has no corresponding row', async () => {
      const { userId } = await createUser(
        'provider-missing@example.com',
        'Provider Missing User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr2',
        'Test Tenant PR2',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr2',
        'Test Organisation PR2',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr2',
        'Test Facility PR2',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture (but NOT provider)
      const { patientId } = await createPatient(tenantId, 'MRN-PR2', 'active');

      const cookie = await loginUser(
        'provider-missing@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Use arbitrary UUID that has no corresponding Provider row
      const nonExistentProviderId = '00000000-0000-0000-0000-000000000098';

      const response = await bookAppointment(
        cookie,
        patientId,
        nonExistentProviderId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider belongs to different tenant', async () => {
      const { userId } = await createUser(
        'provider-cross-tenant@example.com',
        'Provider Cross Tenant User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr3',
        'Test Tenant PR3',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr3',
        'Test Organisation PR3',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr3',
        'Test Facility PR3',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR3', 'active');

      // Create a different tenant with an active provider
      const { tenantId: otherTenantId } = await createTenant(
        'test-tenant-pr3-other',
        'Test Tenant PR3 Other',
      );
      const { organisationId: otherOrgId } = await createOrganisation(
        otherTenantId,
        'test-org-pr3-other',
        'Test Org PR3 Other',
      );
      const { facilityId: otherFacilityId } = await createFacility(
        otherTenantId,
        otherOrgId,
        'test-facility-pr3-other',
        'Test Facility PR3 Other',
      );
      const { providerId } = await createEligibleProvider(
        otherTenantId,
        otherOrgId,
        otherFacilityId,
      );

      const cookie = await loginUser(
        'provider-cross-tenant@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      // Provider belongs to different tenant - should be rejected
      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      // Returns same error as missing provider (no existence leak)
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider status is candidate', async () => {
      const { userId } = await createUser(
        'provider-candidate@example.com',
        'Provider Candidate User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr4',
        'Test Tenant PR4',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr4',
        'Test Organisation PR4',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr4',
        'Test Facility PR4',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR4', 'active');

      // Create provider with candidate status (not eligible)
      const { providerId } = await createProvider(tenantId, 'candidate');
      await createProviderFacilityAssignment(
        tenantId,
        organisationId,
        facilityId,
        providerId,
        null, // active assignment but candidate status
      );

      const cookie = await loginUser(
        'provider-candidate@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider status is onboarded', async () => {
      const { userId } = await createUser(
        'provider-onboarded@example.com',
        'Provider Onboarded User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr5',
        'Test Tenant PR5',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr5',
        'Test Organisation PR5',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr5',
        'Test Facility PR5',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR5', 'active');

      // Create provider with onboarded status (not eligible)
      const { providerId } = await createProvider(tenantId, 'onboarded');
      await createProviderFacilityAssignment(
        tenantId,
        organisationId,
        facilityId,
        providerId,
        null,
      );

      const cookie = await loginUser(
        'provider-onboarded@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider status is suspended', async () => {
      const { userId } = await createUser(
        'provider-suspended@example.com',
        'Provider Suspended User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr6',
        'Test Tenant PR6',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr6',
        'Test Organisation PR6',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr6',
        'Test Facility PR6',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR6', 'active');

      // Create provider with suspended status
      const { providerId } = await createProvider(tenantId, 'suspended');
      await createProviderFacilityAssignment(
        tenantId,
        organisationId,
        facilityId,
        providerId,
        null,
      );

      const cookie = await loginUser(
        'provider-suspended@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider status is separated', async () => {
      const { userId } = await createUser(
        'provider-separated@example.com',
        'Provider Separated User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr7',
        'Test Tenant PR7',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr7',
        'Test Organisation PR7',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr7',
        'Test Facility PR7',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR7', 'active');

      // Create provider with separated status
      const { providerId } = await createProvider(tenantId, 'separated');
      await createProviderFacilityAssignment(
        tenantId,
        organisationId,
        facilityId,
        providerId,
        null,
      );

      const cookie = await loginUser(
        'provider-separated@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider has no facility assignment', async () => {
      const { userId } = await createUser(
        'provider-no-assignment@example.com',
        'Provider No Assignment User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr8',
        'Test Tenant PR8',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr8',
        'Test Organisation PR8',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr8',
        'Test Facility PR8',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR8', 'active');

      // Create active provider but NO facility assignment
      const { providerId } = await createProvider(tenantId, 'active');
      // Note: NO createProviderFacilityAssignment call

      const cookie = await loginUser(
        'provider-no-assignment@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider is assigned to different facility', async () => {
      const { userId } = await createUser(
        'provider-other-facility@example.com',
        'Provider Other Facility User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr9',
        'Test Tenant PR9',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr9',
        'Test Organisation PR9',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr9',
        'Test Facility PR9',
      );
      const { facilityId: otherFacilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr9-other',
        'Test Facility PR9 Other',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR9', 'active');

      // Create active provider assigned to OTHER facility (not the authenticated one)
      const { providerId } = await createProvider(tenantId, 'active');
      await createProviderFacilityAssignment(
        tenantId,
        organisationId,
        otherFacilityId, // assigned to different facility
        providerId,
        null,
      );

      const cookie = await loginUser(
        'provider-other-facility@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });

    it('Booking fails when provider assignment is revoked', async () => {
      const { userId } = await createUser(
        'provider-revoked@example.com',
        'Provider Revoked User',
      );
      const { tenantId } = await createTenant(
        'test-tenant-pr10',
        'Test Tenant PR10',
      );
      const { organisationId } = await createOrganisation(
        tenantId,
        'test-org-pr10',
        'Test Organisation PR10',
      );
      const { facilityId } = await createFacility(
        tenantId,
        organisationId,
        'test-facility-pr10',
        'Test Facility PR10',
      );
      const { membershipId } = await createMembership(
        userId,
        tenantId,
        'R09_ADMINISTRATOR',
      );

      // Create BC01 Patient fixture
      const { patientId } = await createPatient(tenantId, 'MRN-PR10', 'active');

      // Create active provider with REVOKED assignment
      const { providerId } = await createProvider(tenantId, 'active');
      await createProviderFacilityAssignment(
        tenantId,
        organisationId,
        facilityId,
        providerId,
        new Date('2025-01-01T00:00:00.000Z'), // revokedAt in the past
      );

      const cookie = await loginUser(
        'provider-revoked@example.com',
        TEST_PASSWORD,
      );
      await selectContext(cookie, membershipId, organisationId, facilityId);

      const response = await bookAppointment(
        cookie,
        patientId,
        providerId,
        FUTURE_START,
        FUTURE_END,
        'consultation',
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('APPOINTMENT_PROVIDER_NOT_FOUND');
    });
  });
});
