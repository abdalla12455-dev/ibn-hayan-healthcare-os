/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */

/**
 * Appointments Today Integration Tests.
 *
 * These tests exercise the full Today's Appointments flow via supertest
 * against a real NestJS application with a real PostgreSQL 17 database.
 * They cover:
 * - GET /api/v1/appointments/today endpoint
 * - Authorization (R09 allowed, R13 denied, other roles denied)
 * - Authentication (session cookie validation)
 * - Tenant/organisation/facility context resolution
 * - Facility timezone configuration (null/invalid handling)
 * - Audit event emission
 * - Facility-local day boundary filtering
 * - Tenant isolation
 *
 * Per the task specification, these tests require PostgreSQL 17.
 * They are NOT run locally without PostgreSQL 17.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
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
  FacilityId,
  TenantMembershipId,
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
import { TodayAppointmentsResponseSchema } from '@ibn-hayan/contracts';

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
  // Clean up in reverse dependency order
  await prisma.auditOutboxEvent.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.tenantRoleAssignment.deleteMany();
  await prisma.tenantMembership.deleteMany();
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
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const user = await users.create({
    email,
    passwordHash,
    displayName,
    status: 'active',
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
    status: 'active',
  });
  return { tenantId: tenant.id };
}

async function createOrganisation(
  tenantId: string,
  slug: string,
  displayName: string,
): Promise<{ organisationId: string }> {
  const organisation = await organisations.create({
    tenantId: tenantId as never,
    slug,
    displayName,
    status: 'active',
  });
  return { organisationId: organisation.id };
}

async function createFacility(
  tenantId: string,
  organisationId: string,
  slug: string,
  displayName: string,
  timezone: string | null,
): Promise<{ facilityId: string }> {
  const facility = await facilities.create({
    tenantId: tenantId as never,
    organisationId: organisationId as never,
    slug,
    displayName,
    status: 'active',
    timezone,
  });
  return { facilityId: facility.id };
}

async function createMembership(
  userId: string,
  tenantId: string,
): Promise<{ membershipId: string }> {
  const membership = await memberships.create({
    userId: userId as never,
    tenantId: tenantId as never,
  });
  return { membershipId: membership.id };
}

async function assignRole(
  membershipId: string,
  roleCode: string,
): Promise<void> {
  await roleAssignments.create({
    tenantMembershipId: membershipId as never,
    roleCode: roleCode as never,
    scopeLevel: 'facility',
  });
}

async function login(
  email: string,
): Promise<{ sessionId: string; token: string }> {
  const credential = await credentials.create({
    userEmail: email,
    password: TEST_PASSWORD,
    origin: ORIGIN,
  });
  return {
    sessionId: credential.sessionId,
    token: credential.token,
  };
}

async function selectOrganisation(
  sessionId: string,
  organisationId: string,
): Promise<void> {
  await request(server)
    .put('/api/v1/context/organisation')
    .set('Cookie', `ibn_hayan_session=${sessionId}`)
    .send({ organisationId })
    .expect(200);
}

async function selectFacility(
  sessionId: string,
  facilityId: string,
): Promise<void> {
  await request(server)
    .put('/api/v1/context/facility')
    .set('Cookie', `ibn_hayan_session=${sessionId}`)
    .send({ facilityId })
    .expect(200);
}

async function createAppointment(
  tenantId: string,
  organisationId: string,
  facilityId: string,
  scheduledStart: Date,
  scheduledEnd: Date,
  status: string,
): Promise<{ appointmentId: string }> {
  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenantId as never,
      organisationId: organisationId as never,
      facilityId: facilityId as never,
      patientId: '00000000-0000-0000-0000-000000000001' as never,
      providerId: '00000000-0000-0000-0000-000000000002' as never,
      scheduledStart,
      scheduledEnd,
      status: status as never,
      typeCode: 'consultation',
    },
    select: { id: true },
  });
  return { appointmentId: appointment.id };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();
  server = app.getHttpServer() as Server;

  prisma = module.get(PrismaService);
  users = module.get(USER_REPOSITORY);
  tenants = module.get(TENANT_REPOSITORY);
  memberships = module.get(TENANT_MEMBERSHIP_REPOSITORY);
  roleAssignments = module.get(TENANT_ROLE_ASSIGNMENT_REPOSITORY);
  organisations = module.get(ORGANISATION_REPOSITORY);
  facilities = module.get(FACILITY_REPOSITORY);
  credentials = module.get(LocalCredentialService);
  passwordService = module.get(PasswordService);
  throttlerStorage = module.get(ThrottlerStorage);
});

beforeEach(async () => {
  await truncateAll();
  // Clear throttler storage
  throttlerStorage.storage.clear();
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Appointments Today Integration', () => {
  // -------------------------------------------------------------------------
  // Scenario 1: R09 with valid session and full context returns HTTP 200
  // -------------------------------------------------------------------------
  it('1. R09 with valid session and full context returns HTTP 200', async () => {
    // Setup: tenant, org, facility with timezone
    const { tenantId } = await createTenant('tenant-r09', 'Tenant R09');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-r09',
      'Organisation R09',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-r09',
      'Facility R09',
      'Asia/Baghdad',
    );

    // Setup: user and membership
    const { userId } = await createUser('r09@example.test', 'R09 User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login and select context
    const { sessionId } = await login('r09@example.test');
    await selectOrganisation(sessionId, organisationId);
    await selectFacility(sessionId, facilityId);

    // Create an appointment for today
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(9, 30, 0, 0);
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      today,
      todayEnd,
      'booked',
    );

    // Request
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionId}`)
      .expect(200);

    // Validate response shape
    const parsed = TodayAppointmentsResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.data!.timezone).toBe('Asia/Baghdad');
    expect(parsed.data!.generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(Array.isArray(parsed.data!.appointments)).toBe(true);
    expect(parsed.data!.appointments.length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: R13 Platform Super Admin returns HTTP 403
  // -------------------------------------------------------------------------
  it('2. R13 Platform Super Admin returns HTTP 403', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-r13', 'Tenant R13');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-r13',
      'Organisation R13',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-r13',
      'Facility R13',
      'Asia/Baghdad',
    );

    // Setup: user with R13
    const { userId } = await createUser('r13@example.test', 'R13 User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R13_SYSTEM_ADMINISTRATOR');

    // Setup: login and select context
    const { sessionId } = await login('r13@example.test');
    await selectOrganisation(sessionId, organisationId);
    await selectFacility(sessionId, facilityId);

    // Request - should be denied
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionId}`)
      .expect(403);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Missing session returns HTTP 401
  // -------------------------------------------------------------------------
  it('3. Missing session returns HTTP 401', async () => {
    await request(server).get('/api/v1/appointments/today').expect(401);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Facility with null timezone returns HTTP 422
  // -------------------------------------------------------------------------
  it('4. Facility with null timezone returns HTTP 422', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-null-tz', 'Tenant Null TZ');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-null-tz',
      'Organisation Null TZ',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-null-tz',
      'Facility Null TZ',
      null, // null timezone
    );

    // Setup: user with R09
    const { userId } = await createUser('nulltz@example.test', 'Null TZ User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login and select context
    const { sessionId } = await login('nulltz@example.test');
    await selectOrganisation(sessionId, organisationId);
    await selectFacility(sessionId, facilityId);

    // Request - should fail with configuration required
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionId}`)
      .expect(422);

    expect(response.body.error.code).toBe('APPOINTMENT_CONFIGURATION_REQUIRED');
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Audit event emitted after successful response
  // -------------------------------------------------------------------------
  it('5. audit event emitted after successful response', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-audit', 'Tenant Audit');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-audit',
      'Organisation Audit',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-audit',
      'Facility Audit',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser('audit@example.test', 'Audit User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login and select context
    const { sessionId } = await login('audit@example.test');
    await selectOrganisation(sessionId, organisationId);
    await selectFacility(sessionId, facilityId);

    // Record baseline
    const baseline = await prisma.auditOutboxEvent.count();

    // Request
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionId}`)
      .expect(200);

    // Verify audit event was emitted
    const newEvents = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
      orderBy: { createdAt: 'asc' },
    });

    // Find the appointments.schedule.viewed event
    const viewedEvents = newEvents.filter((e) => {
      try {
        const draft = JSON.parse(e.canonicalEventDraft as string);
        return draft.action === 'appointments.schedule.viewed';
      } catch {
        return false;
      }
    });

    expect(viewedEvents.length).toBeGreaterThan(0);
    const viewedEvent = JSON.parse(
      viewedEvents[0].canonicalEventDraft as string,
    );
    expect(viewedEvent.outcome).toBe('success');
    expect(viewedEvent.metadata?.endpoint).toBe('appointments_today_view');
  });

  // -------------------------------------------------------------------------
  // Scenario 6: No false audit event on configuration error
  // -------------------------------------------------------------------------
  it('6. no false audit event on configuration error', async () => {
    // Setup
    const { tenantId } = await createTenant(
      'tenant-no-audit',
      'Tenant No Audit',
    );
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-no-audit',
      'Organisation No Audit',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-no-audit',
      'Facility No Audit',
      null, // null timezone - will fail
    );

    // Setup: user with R09
    const { userId } = await createUser(
      'noaudit@example.test',
      'No Audit User',
    );
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login and select context
    const { sessionId } = await login('noaudit@example.test');
    await selectOrganisation(sessionId, organisationId);
    await selectFacility(sessionId, facilityId);

    // Request - will fail
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionId}`)
      .expect(422);

    // Verify no appointments.schedule.viewed event was emitted
    const events = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });

    const viewedEvents = events.filter((e) => {
      try {
        const draft = JSON.parse(e.canonicalEventDraft as string);
        return draft.action === 'appointments.schedule.viewed';
      } catch {
        return false;
      }
    });

    expect(viewedEvents.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Tenant isolation - cannot see appointments from another tenant
  // -------------------------------------------------------------------------
  it('7. tenant isolation - cannot see appointments from another tenant', async () => {
    // Setup: tenant A with appointment
    const { tenantIdA } = await createTenant('tenant-a', 'Tenant A');
    const { organisationIdA } = await createOrganisation(
      tenantIdA,
      'org-a',
      'Organisation A',
    );
    const { facilityIdA } = await createFacility(
      tenantIdA,
      organisationIdA,
      'fac-a',
      'Facility A',
      'Asia/Baghdad',
    );

    // Setup: user A with R09
    const { userIdA } = await createUser('usera@example.test', 'User A');
    const { membershipIdA } = await createMembership(userIdA, tenantIdA);
    await assignRole(membershipIdA, 'R09_ADMINISTRATOR');

    // Setup: login as user A and select context
    const { sessionIdA } = await login('usera@example.test');
    await selectOrganisation(sessionIdA, organisationIdA);
    await selectFacility(sessionIdA, facilityIdA);

    // Create appointment in tenant A
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(9, 30, 0, 0);
    await createAppointment(
      tenantIdA,
      organisationIdA,
      facilityIdA,
      today,
      todayEnd,
      'booked',
    );

    // Setup: tenant B (no appointments)
    const { tenantIdB } = await createTenant('tenant-b', 'Tenant B');
    const { organisationIdB } = await createOrganisation(
      tenantIdB,
      'org-b',
      'Organisation B',
    );
    const { facilityIdB } = await createFacility(
      tenantIdB,
      organisationIdB,
      'fac-b',
      'Facility B',
      'Asia/Baghdad',
    );

    // Setup: user B with R09
    const { userIdB } = await createUser('userb@example.test', 'User B');
    const { membershipIdB } = await createMembership(userIdB, tenantIdB);
    await assignRole(membershipIdB, 'R09_ADMINISTRATOR');

    // Setup: login as user B and select context
    const { sessionIdB } = await login('userb@example.test');
    await selectOrganisation(sessionIdB, organisationIdB);
    await selectFacility(sessionIdB, facilityIdB);

    // Request as user B - should see empty (not user A's appointments)
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionIdB}`)
      .expect(200);

    const body = response.body as { appointments: unknown[] };
    expect(body.appointments).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Empty day returns successful response with empty array
  // -------------------------------------------------------------------------
  it('8. empty day returns successful response with empty array', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-empty', 'Tenant Empty');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-empty',
      'Organisation Empty',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-empty',
      'Facility Empty',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser('empty@example.test', 'Empty User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login and select context (no appointments created)
    const { sessionId } = await login('empty@example.test');
    await selectOrganisation(sessionId, organisationId);
    await selectFacility(sessionId, facilityId);

    // Request - should return empty array
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionId}`)
      .expect(200);

    const body = response.body as {
      appointments: unknown[];
      localDate: string;
      timezone: string;
    };
    expect(body.appointments).toEqual([]);
    expect(body.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.timezone).toBe('Asia/Baghdad');
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Correct facility-local day boundary filtering
  // -------------------------------------------------------------------------
  it('9. correct facility-local day boundary filtering', async () => {
    // Setup
    const { tenantId } = await createTenant(
      'tenant-boundary',
      'Tenant Boundary',
    );
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-boundary',
      'Organisation Boundary',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-boundary',
      'Facility Boundary',
      'Asia/Baghdad', // UTC+3
    );

    // Setup: user with R09
    const { userId } = await createUser(
      'boundary@example.test',
      'Boundary User',
    );
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login and select context
    const { sessionId } = await login('boundary@example.test');
    await selectOrganisation(sessionId, organisationId);
    await selectFacility(sessionId, facilityId);

    // Create appointments at known times
    // Asia/Baghdad is UTC+3
    // Local midnight today = 21:00 previous day UTC
    // Local midnight tomorrow = 21:00 today UTC
    const today = new Date();
    const baseDate = new Date(today);
    baseDate.setHours(21, 0, 0, 0); // Start of local day in UTC

    // Appointment exactly at start of day (should be included)
    const atStart = new Date(baseDate.getTime());
    const atStartEnd = new Date(atStart.getTime() + 30 * 60 * 1000);
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      atStart,
      atStartEnd,
      'booked',
    );

    // Appointment in middle of day (should be included)
    const inMiddle = new Date(baseDate.getTime() + 12 * 60 * 60 * 1000);
    const inMiddleEnd = new Date(inMiddle.getTime() + 30 * 60 * 1000);
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      inMiddle,
      inMiddleEnd,
      'confirmed',
    );

    // Appointment exactly at end of day (should be excluded)
    const atEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    const atEndEnd = new Date(atEnd.getTime() + 30 * 60 * 1000);
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      atEnd,
      atEndEnd,
      'cancelled',
    );

    // Request
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', `ibn_hayan_session=${sessionId}`)
      .expect(200);

    // Should include start and middle, exclude end
    const body = response.body as {
      appointments: { status: string }[];
    };
    expect(body.appointments.length).toBe(2);
    expect(body.appointments[0].status).toBe('booked');
    expect(body.appointments[1].status).toBe('confirmed');
  });
});
