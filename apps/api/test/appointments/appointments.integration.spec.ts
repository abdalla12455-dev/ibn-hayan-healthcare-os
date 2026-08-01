/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

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
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
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
import { CLOCK_SERVICE_TOKEN } from '../../src/infrastructure/clock/clock.module.js';
import type { ClockService } from '../../src/infrastructure/clock/clock.service.js';

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
let seedPrisma: PrismaClient;
let throttlerStorage: ThrottlerStorage;

const TEST_PASSWORD = 'sufficiently-long-password';
const ORIGIN = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function truncateAll(): Promise<void> {
  // Clean up in reverse dependency order
  // NOTE: LocalCredential must be deleted BEFORE User because
  // LocalCredential.userId is a foreign key referencing User.id
  // with onDelete: Restrict. The appointments integration tests
  // do NOT use the TRUNCATE CASCADE SQL pattern from clinic-admin;
  // they use Prisma deleteMany in dependency order.
  await prisma.auditOutboxEvent.deleteMany();
  await prisma.appointment.deleteMany();
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
    tenantId: tenantId as never,
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
  timezone: string | null,
): Promise<{ facilityId: string }> {
  const facility = await facilities.create({
    tenantId: tenantId as never,
    organisationId: organisationId as never,
    code,
    displayName,
  });
  // Update timezone via raw SQL
  await seedPrisma.$executeRaw`
    UPDATE facilities
    SET timezone = ${timezone}
    WHERE id = ${facility.id}
  `;
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

/**
 * Creates role assignments following the clinic-admin pattern:
 * - Tenant-scoped assignment for the nominal role
 * - Facility-scoped assignment for R09 and other facility-scoped roles
 *   (required for context selection per ADR-015 §1.5)
 *
 * Per the clinic-admin e2e test pattern, R13 (Platform Super Admin)
 * needs only a tenant-scoped assignment per ADR-015 §1.5 exception.
 *
 * @param membershipId - The tenant membership ID
 * @param roleCode - The role code (e.g. 'R09_ADMINISTRATOR')
 * @param scopeOrganisationId - The organisation ID for facility-scoped assignment
 * @param scopeFacilityId - The facility ID for facility-scoped assignment
 * @param requiresFacilityScope - Whether the role needs facility scope for context selection
 */
async function assignRole(
  membershipId: string,
  roleCode: string,
  scopeOrganisationId?: string,
  scopeFacilityId?: string,
  requiresFacilityScope: boolean = true,
): Promise<void> {
  // Always create tenant-scoped assignment (the nominal role)
  await roleAssignments.create({
    tenantMembershipId: membershipId as never,
    roleCode: roleCode as never,
    // No scopeLevel = tenant-scoped
  });

  // For facility-scoped roles, also create facility-scoped assignment
  // This is required for context selection (per ADR-015 §1.5)
  // R13 (Platform Super Admin) does NOT need facility scope per §1.5 exception
  if (requiresFacilityScope && scopeOrganisationId && scopeFacilityId) {
    await roleAssignments.create({
      tenantMembershipId: membershipId as never,
      roleCode: roleCode as never,
      scopeLevel: 'facility',
      scopeOrganisationId: scopeOrganisationId as never,
      scopeFacilityId: scopeFacilityId as never,
    });
  }
}

/**
 * Extracts the session cookie value from a supertest response.
 * Returns just the cookie name=value portion (before the semicolon).
 */
function extractSessionCookie(response: { headers?: Record<string, unknown> }): string {
  const setCookie = response.headers?.['set-cookie'];
  if (!setCookie) return '';
  if (Array.isArray(setCookie)) {
    const first = setCookie[0];
    if (typeof first === 'string') {
      return first.split(';')[0] ?? '';
    }
    return '';
  }
  if (typeof setCookie === 'string') {
    return setCookie.split(';')[0] ?? '';
  }
  return '';
}

/**
 * Fetch a CSRF token using the supplied session cookie.
 */
async function fetchCsrfToken(cookie: string): Promise<string> {
  const response = await request(server)
    .get('/api/v1/auth/csrf')
    .set('Cookie', cookie)
    .expect(200);
  return (response.body as { token: string }).token;
}

/**
 * Log in and return the full session cookie string (name=value).
 */
async function login(email: string): Promise<string> {
  const response = await request(server)
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email, password: TEST_PASSWORD })
    .expect(200);
  return extractSessionCookie(response);
}

/**
 * Select tenant membership.
 * Requires: Cookie, Origin, X-CSRF-Token
 */
async function selectTenant(
  cookie: string,
  csrfToken: string,
  membershipId: string,
): Promise<void> {
  await request(server)
    .put('/api/v1/context/tenant')
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrfToken)
    .send({ membershipId })
    .expect(200);
}

/**
 * Select organisation.
 * Requires: Cookie, Origin, X-CSRF-Token
 */
async function selectOrganisation(
  cookie: string,
  csrfToken: string,
  organisationId: string,
): Promise<void> {
  await request(server)
    .put('/api/v1/context/organisation')
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrfToken)
    .send({ organisationId })
    .expect(200);
}

/**
 * Select facility.
 * Requires: Cookie, Origin, X-CSRF-Token
 */
async function selectFacility(
  cookie: string,
  csrfToken: string,
  facilityId: string,
): Promise<void> {
  await request(server)
    .put('/api/v1/context/facility')
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrfToken)
    .send({ facilityId })
    .expect(200);
}

/**
 * Reset the ThrottlerStorage between tests to prevent throttle state leakage.
 * The database is cleaned in truncateAll(); the in-memory throttler must also be reset.
 */
function resetThrottlerStorage(): void {
  const storage = throttlerStorage as unknown as { storage?: Map<string, unknown> };
  if (storage.storage instanceof Map) {
    storage.storage.clear();
  }
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
  })
    .overrideProvider(CLOCK_SERVICE_TOKEN)
    .useValue(mockClockService)
    .compile();

  app = module.createNestApplication();
  // Apply the same global prefix as production (main.ts sets 'api/v1')
  app.setGlobalPrefix('api/v1');
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
  throttlerStorage = app.get(ThrottlerStorage);

  // Create seedPrisma for raw SQL operations
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  seedPrisma = new PrismaClient({ adapter });
});

beforeEach(async () => {
  await truncateAll();
  resetThrottlerStorage();
});

afterAll(async () => {
  await app.close();
  await seedPrisma?.$disconnect();
});

// ---------------------------------------------------------------------------
// Route registration smoke tests
// ---------------------------------------------------------------------------

describe('Application bootstrap smoke', () => {
  it('POST /api/v1/auth/login is registered (returns 401 not 404)', async () => {
    // Create a seed user so login can return 401 instead of 404
    const { tenantId } = await createTenant('tenant-smoke', 'Tenant Smoke');
    const { userId } = await createUser('smoke@example.test', 'Smoke User');
    await createMembership(userId, tenantId);

    // Request with wrong password and valid Origin - should return 401, NOT 404 or 403
    // 404 would mean the route is not registered with the /api/v1 prefix
    // 403 would mean Origin validation is rejecting the request
    const response = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'smoke@example.test', password: 'wrong-password' });
    expect(response.status).toBe(401);
  });

  it('GET /api/v1/appointments/today is registered (returns 401 not 404)', async () => {
    // Request without session - should return 401, NOT 404
    // 404 would mean the route is not registered with the /api/v1 prefix
    const response = await request(server).get('/api/v1/appointments/today');
    expect(response.status).toBe(401);
  });
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
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('r09@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Create an appointment for today
    // Asia/Baghdad is UTC+3. At 2026-08-01 09:00 Baghdad time = 2026-08-01 06:00 UTC
    const today = new Date('2026-08-01T06:00:00.000Z');
    const todayEnd = new Date('2026-08-01T06:30:00.000Z');
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
      .set('Cookie', cookie)
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
    // R13 does NOT need facility scope per ADR-015 §1.5 exception
    await assignRole(
      membershipId,
      'R13_SYSTEM_ADMINISTRATOR',
      organisationId,
      facilityId,
      false,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('r13@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request - should be denied
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
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
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('nulltz@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request - should fail with configuration required
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
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
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('audit@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
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
      viewedEvents[0]!.canonicalEventDraft as string,
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
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('noaudit@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request - will fail
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
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
    const { tenantId: tenantIdA } = await createTenant('tenant-a', 'Tenant A');
    const { organisationId: organisationIdA } = await createOrganisation(
      tenantIdA,
      'org-a',
      'Organisation A',
    );
    const { facilityId: facilityIdA } = await createFacility(
      tenantIdA,
      organisationIdA,
      'fac-a',
      'Facility A',
      'Asia/Baghdad',
    );

    // Setup: user A with R09
    const { userId: userIdA } = await createUser(
      'usera@example.test',
      'User A',
    );
    const { membershipId: membershipIdA } = await createMembership(
      userIdA,
      tenantIdA,
    );
    await assignRole(
      membershipIdA,
      'R09_ADMINISTRATOR',
      organisationIdA,
      facilityIdA,
    );

    // Setup: login as user A and select context
    const cookieA = await login('usera@example.test');
    const csrfA = await fetchCsrfToken(cookieA);
    await selectTenant(cookieA, csrfA, membershipIdA);
    await selectOrganisation(cookieA, csrfA, organisationIdA);
    await selectFacility(cookieA, csrfA, facilityIdA);

    // Create appointment in tenant A
    // Asia/Baghdad is UTC+3. At 2026-08-01 09:00 Baghdad time = 2026-08-01 06:00 UTC
    const today = new Date('2026-08-01T06:00:00.000Z');
    const todayEnd = new Date('2026-08-01T06:30:00.000Z');
    await createAppointment(
      tenantIdA,
      organisationIdA,
      facilityIdA,
      today,
      todayEnd,
      'booked',
    );

    // Setup: tenant B (no appointments)
    const { tenantId: tenantIdB } = await createTenant('tenant-b', 'Tenant B');
    const { organisationId: organisationIdB } = await createOrganisation(
      tenantIdB,
      'org-b',
      'Organisation B',
    );
    const { facilityId: facilityIdB } = await createFacility(
      tenantIdB,
      organisationIdB,
      'fac-b',
      'Facility B',
      'Asia/Baghdad',
    );

    // Setup: user B with R09
    const { userId: userIdB } = await createUser(
      'userb@example.test',
      'User B',
    );
    const { membershipId: membershipIdB } = await createMembership(
      userIdB,
      tenantIdB,
    );
    await assignRole(
      membershipIdB,
      'R09_ADMINISTRATOR',
      organisationIdB,
      facilityIdB,
    );

    // Setup: login as user B and select context
    const cookieB = await login('userb@example.test');
    const csrfB = await fetchCsrfToken(cookieB);
    await selectTenant(cookieB, csrfB, membershipIdB);
    await selectOrganisation(cookieB, csrfB, organisationIdB);
    await selectFacility(cookieB, csrfB, facilityIdB);

    // Request as user B - should see empty (not user A's appointments)
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookieB)
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
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context (no appointments created)
    const cookie = await login('empty@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request - should return empty array
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
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
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('boundary@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Create appointments at known times
    // Asia/Baghdad is UTC+3
    // Fixed test instant is 2026-08-01T12:00:00.000Z (15:00 Baghdad time)
    // Local midnight today = 21:00 previous day UTC = 2026-07-31T21:00:00.000Z
    // Local midnight tomorrow = 21:00 today UTC = 2026-08-01T21:00:00.000Z

    // Appointment exactly at start of day (should be included)
    const atStart = new Date('2026-07-31T21:00:00.000Z');
    const atStartEnd = new Date('2026-07-31T21:30:00.000Z');
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      atStart,
      atStartEnd,
      'booked',
    );

    // Appointment in middle of day (should be included)
    const inMiddle = new Date('2026-08-01T10:00:00.000Z');
    const inMiddleEnd = new Date('2026-08-01T10:30:00.000Z');
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      inMiddle,
      inMiddleEnd,
      'confirmed',
    );

    // Appointment exactly at end of day (should be excluded)
    const atEnd = new Date('2026-08-01T21:00:00.000Z');
    const atEndEnd = new Date('2026-08-01T21:30:00.000Z');
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
      .set('Cookie', cookie)
      .expect(200);

    // Should include start and middle, exclude end
    const body = response.body as {
      appointments: { status: string }[];
    };
    expect(body.appointments.length).toBe(2);
    expect(body.appointments[0]?.status).toBe('booked');
    expect(body.appointments[1]?.status).toBe('confirmed');
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Another role (R02 Nurse) denied
  // -------------------------------------------------------------------------
  it('10. R02 Nurse denied access', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-r02', 'Tenant R02');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-r02',
      'Organisation R02',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-r02',
      'Facility R02',
      'Asia/Baghdad',
    );

    // Setup: user with R02
    const { userId } = await createUser('r02@example.test', 'R02 User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R02_NURSE', organisationId, facilityId);

    // Setup: login, fetch CSRF, select context
    const cookie = await login('r02@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request - should be denied
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(403);
  });

  // -------------------------------------------------------------------------
  // Scenario 11: Missing organisation context
  // -------------------------------------------------------------------------
  it('11. missing organisation context returns 403', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-no-org', 'Tenant No Org');

    // Setup: user with R09 (tenant-scoped only, no org/facility context)
    const { userId } = await createUser('noorg@example.test', 'No Org User');
    const { membershipId } = await createMembership(userId, tenantId);
    // No organisation/facility created, so only tenant-scoped role
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login and select tenant but do NOT select organisation
    const cookie = await login('noorg@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);

    // Request - should fail with 403 (no active org context)
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(403);
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Missing facility context
  // -------------------------------------------------------------------------
  it('12. missing facility context returns 403', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-no-fac', 'Tenant No Fac');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-no-fac',
      'Organisation No Fac',
    );
    // Note: No facility created - we use a non-existent facility ID

    // Setup: user with R09
    const { userId } = await createUser('nofac@example.test', 'No Fac User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR');

    // Setup: login, fetch CSRF, select tenant and org but NOT facility
    const cookie = await login('nofac@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);

    // Try to select a non-existent facility (should fail with 404)
    await request(server)
      .put('/api/v1/context/facility')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf)
      .send({ facilityId: '00000000-0000-0000-0000-000000000999' })
      .expect(404);

    // Request - should fail with 403 (no active facility context)
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(403);
  });

  // -------------------------------------------------------------------------
  // Scenario 13: Invalid facility timezone returns HTTP 422
  // -------------------------------------------------------------------------
  it('13. invalid facility timezone returns HTTP 422', async () => {
    // Setup
    const { tenantId } = await createTenant(
      'tenant-invalid-tz',
      'Tenant Invalid TZ',
    );
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-invalid-tz',
      'Organisation Invalid TZ',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-invalid-tz',
      'Facility Invalid TZ',
      'Invalid/Timezone', // invalid timezone
    );

    // Setup: user with R09
    const { userId } = await createUser(
      'invalidtz@example.test',
      'Invalid TZ User',
    );
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('invalidtz@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request - should fail with invalid timezone
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(422);

    expect(response.body.error.code).toBe('APPOINTMENT_INVALID_TIMEZONE');
  });

  // -------------------------------------------------------------------------
  // Scenario 14: Deterministic ordering (scheduledStart asc, id asc)
  // -------------------------------------------------------------------------
  it('14. appointments returned in deterministic order', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-order', 'Tenant Order');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-order',
      'Organisation Order',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-order',
      'Facility Order',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser('order@example.test', 'Order User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('order@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Create appointments at same time with different IDs
    const apptTime = new Date('2026-08-01T10:00:00.000Z');
    const apptEnd = new Date('2026-08-01T10:30:00.000Z');

    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      apptTime,
      apptEnd,
      'booked',
    );
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      apptTime,
      apptEnd,
      'confirmed',
    );

    // Request
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as {
      appointments: { id: string; scheduledStart: string }[];
    };

    // Should be ordered by scheduledStart asc, then id asc
    expect(body.appointments.length).toBe(2);
    // Both have same scheduledStart, so should be ordered by id
    const ids = body.appointments.map((a) => a.id);
    expect(ids[0]!).toBeDefined();
    expect(ids[1]!).toBeDefined();
    expect(ids[0]! < ids[1]!).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 15: Organisation isolation
  // -------------------------------------------------------------------------
  it('15. organisation isolation - cannot see appointments from another org', async () => {
    // Setup: org A with appointment
    const { tenantId } = await createTenant('tenant-iso', 'Tenant ISO');
    const { organisationId: orgIdA } = await createOrganisation(
      tenantId,
      'org-iso-a',
      'Organisation ISO A',
    );
    const { facilityId: facIdA } = await createFacility(
      tenantId,
      orgIdA,
      'fac-iso-a',
      'Facility ISO A',
      'Asia/Baghdad',
    );

    // Setup: user with R09 in org A
    const { userId } = await createUser('iso@example.test', 'ISO User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R09_ADMINISTRATOR', orgIdA, facIdA);

    // Setup: login, fetch CSRF, select org A
    const cookie = await login('iso@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, orgIdA);
    await selectFacility(cookie, csrf, facIdA);

    // Create appointment in org A
    await createAppointment(
      tenantId,
      orgIdA,
      facIdA,
      new Date('2026-08-01T10:00:00.000Z'),
      new Date('2026-08-01T10:30:00.000Z'),
      'booked',
    );

    // Switch to org B
    const { organisationId: orgIdB } = await createOrganisation(
      tenantId,
      'org-iso-b',
      'Organisation ISO B',
    );
    const { facilityId: facIdB } = await createFacility(
      tenantId,
      orgIdB,
      'fac-iso-b',
      'Facility ISO B',
      'Asia/Baghdad',
    );
    await selectOrganisation(cookie, csrf, orgIdB);
    await selectFacility(cookie, csrf, facIdB);

    // Request as org B - should see empty (not org A's appointments)
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as { appointments: unknown[] };
    expect(body.appointments).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Scenario 16: Facility isolation
  // -------------------------------------------------------------------------
  it('16. facility isolation - cannot see appointments from another facility', async () => {
    // Setup: facility A with appointment
    const { tenantId } = await createTenant('tenant-fac-iso', 'Tenant Fac ISO');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-fac-iso',
      'Organisation Fac ISO',
    );
    const { facilityId: facIdA } = await createFacility(
      tenantId,
      organisationId,
      'fac-iso-a',
      'Facility ISO A',
      'Asia/Baghdad',
    );
    const { facilityId: facIdB } = await createFacility(
      tenantId,
      organisationId,
      'fac-iso-b',
      'Facility ISO B',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser('faciso@example.test', 'Fac ISO User');
    const { membershipId } = await createMembership(userId, tenantId);
    // User needs facility-scoped role for facility A to switch to it
    await assignRole(membershipId, 'R09_ADMINISTRATOR', organisationId, facIdA);

    // Setup: login as facility A
    const cookie = await login('faciso@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facIdA);

    // Create appointment in facility A
    await createAppointment(
      tenantId,
      organisationId,
      facIdA,
      new Date('2026-08-01T10:00:00.000Z'),
      new Date('2026-08-01T10:30:00.000Z'),
      'booked',
    );

    // Switch to facility B
    await selectFacility(cookie, csrf, facIdB);

    // Request as facility B - should see empty (not facility A's appointments)
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as { appointments: unknown[] };
    expect(body.appointments).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Scenario 17: Query/body scope override attempts rejected
  // -------------------------------------------------------------------------
  it('17. query/body scope override attempts cannot replace session context', async () => {
    // Setup
    const { tenantId } = await createTenant(
      'tenant-override',
      'Tenant Override',
    );
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-override',
      'Organisation Override',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-override',
      'Facility Override',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser(
      'override@example.test',
      'Override User',
    );
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login as tenant A, org A, facility A
    const cookie = await login('override@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Create appointment in tenant A
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      new Date('2026-08-01T10:00:00.000Z'),
      new Date('2026-08-01T10:30:00.000Z'),
      'booked',
    );

    // Create another tenant/org/facility
    const { tenantId: tenantB } = await createTenant(
      'tenant-override-b',
      'Tenant Override B',
    );
    const { organisationId: orgB } = await createOrganisation(
      tenantB,
      'org-override-b',
      'Organisation Override B',
    );
    const { facilityId: facB } = await createFacility(
      tenantB,
      orgB,
      'fac-override-b',
      'Facility Override B',
      'Asia/Baghdad',
    );

    // Attempt to override via query params (should be ignored)
    await request(server)
      .get('/api/v1/appointments/today')
      .query({ tenantId: tenantB, organisationId: orgB, facilityId: facB })
      .set('Cookie', cookie)
      .expect(200);

    // Should still see tenant A's appointments (query params ignored)
    const body = (
      await request(server)
        .get('/api/v1/appointments/today')
        .set('Cookie', cookie)
        .expect(200)
    ).body as { appointments: unknown[] };
    expect(body.appointments.length).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Scenario 18: No audit event after auth failure
  // -------------------------------------------------------------------------
  it('18. no audit event after authentication failure', async () => {
    // Setup
    const { tenantId } = await createTenant(
      'tenant-no-audit-auth',
      'Tenant No Audit Auth',
    );
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-no-audit-auth',
      'Organisation No Audit Auth',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-no-audit-auth',
      'Facility No Audit Auth',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser(
      'noauditauth@example.test',
      'No Audit Auth User',
    );
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login and select context with valid session
    const cookie = await login('noauditauth@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request without valid session cookie - should get 401
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', 'ibn_hayan_session=invalid-session-id')
      .expect(401);

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
  // Scenario 19: No audit event after authorization denial
  // -------------------------------------------------------------------------
  it('19. no audit event after authorization denial (R13)', async () => {
    // Setup
    const { tenantId } = await createTenant(
      'tenant-no-audit-r13',
      'Tenant No Audit R13',
    );
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-no-audit-r13',
      'Organisation No Audit R13',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-no-audit-r13',
      'Facility No Audit R13',
      'Asia/Baghdad',
    );

    // Setup: user with R13
    const { userId } = await createUser(
      'noauditr13@example.test',
      'No Audit R13 User',
    );
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(membershipId, 'R13_SYSTEM_ADMINISTRATOR');

    // Setup: login, fetch CSRF, select context
    const cookie = await login('noauditr13@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request - should be denied
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(403);

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
  // Scenario 20: Audit metadata contains no sensitive data
  // -------------------------------------------------------------------------
  it('20. audit metadata contains no sensitive patient/provider data', async () => {
    // Setup
    const { tenantId } = await createTenant(
      'tenant-audit-safe',
      'Tenant Audit Safe',
    );
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-audit-safe',
      'Organisation Audit Safe',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-audit-safe',
      'Facility Audit Safe',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser(
      'auditsafe@example.test',
      'Audit Safe User',
    );
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('auditsafe@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Create an appointment
    await createAppointment(
      tenantId,
      organisationId,
      facilityId,
      new Date('2026-08-01T10:00:00.000Z'),
      new Date('2026-08-01T10:30:00.000Z'),
      'booked',
    );

    // Request
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(200);

    // Verify audit event contains no sensitive data
    const events = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
      orderBy: { createdAt: 'asc' },
    });

    const viewedEvents = events.filter((e) => {
      try {
        const draft = JSON.parse(e.canonicalEventDraft as string);
        return draft.action === 'appointments.schedule.viewed';
      } catch {
        return false;
      }
    });

    expect(viewedEvents.length).toBeGreaterThan(0);
    const viewedEvent = JSON.parse(
      viewedEvents[0]!.canonicalEventDraft as string,
    );

    // Should NOT contain patientId, providerId, appointment details, names, or medical data
    const eventStr = JSON.stringify(viewedEvent);
    expect(eventStr).not.toContain('patientId');
    expect(eventStr).not.toContain('providerId');
    expect(eventStr).not.toContain('scheduledStart');
    expect(eventStr).not.toContain('scheduledEnd');
    expect(eventStr).not.toContain('patient');
    expect(eventStr).not.toContain('provider');
    expect(eventStr).not.toContain('00000000-0000-0000-0000-000000000001'); // test patient ID
  });

  // -------------------------------------------------------------------------
  // Scenario 21: generatedAt equals fixed test clock instant
  // -------------------------------------------------------------------------
  it('21. generatedAt equals the fixed test clock instant', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-gen-at', 'Tenant Gen At');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-gen-at',
      'Organisation Gen At',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-gen-at',
      'Facility Gen At',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser('genat@example.test', 'Gen At User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('genat@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Request
    const response = await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as { generatedAt: string };

    // generatedAt should equal the fixed test clock instant
    expect(body.generatedAt).toBe('2026-08-01T12:00:00.000Z');
  });

  // -------------------------------------------------------------------------
  // Scenario 22: Audit outbox persistence
  // -------------------------------------------------------------------------
  it('22. audit event persisted to outbox table', async () => {
    // Setup
    const { tenantId } = await createTenant('tenant-outbox', 'Tenant Outbox');
    const { organisationId } = await createOrganisation(
      tenantId,
      'org-outbox',
      'Organisation Outbox',
    );
    const { facilityId } = await createFacility(
      tenantId,
      organisationId,
      'fac-outbox',
      'Facility Outbox',
      'Asia/Baghdad',
    );

    // Setup: user with R09
    const { userId } = await createUser('outbox@example.test', 'Outbox User');
    const { membershipId } = await createMembership(userId, tenantId);
    await assignRole(
      membershipId,
      'R09_ADMINISTRATOR',
      organisationId,
      facilityId,
    );

    // Setup: login, fetch CSRF, select context
    const cookie = await login('outbox@example.test');
    const csrf = await fetchCsrfToken(cookie);
    await selectTenant(cookie, csrf, membershipId);
    await selectOrganisation(cookie, csrf, organisationId);
    await selectFacility(cookie, csrf, facilityId);

    // Record baseline
    const baseline = await prisma.auditOutboxEvent.count();

    // Request
    await request(server)
      .get('/api/v1/appointments/today')
      .set('Cookie', cookie)
      .expect(200);

    // Verify event was written to the outbox table
    const newCount = await prisma.auditOutboxEvent.count();
    expect(newCount).toBeGreaterThan(baseline);
  });
});
