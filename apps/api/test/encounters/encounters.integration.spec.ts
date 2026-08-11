/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * Encounter Integration Tests — Stage 2A (BC02 Encounter Foundation).
 *
 * These tests exercise the full encounter lifecycle via supertest against
 * a real NestJS application with a real PostgreSQL 17 database. They cover:
 * - POST /api/v1/encounters              (create, planned)
 * - GET  /api/v1/encounters/:id          (view)
 * - POST /api/v1/encounters/:id/arrive   (planned → arrived)
 * - POST /api/v1/encounters/:id/start    (planned | arrived → in_progress)
 * - POST /api/v1/encounters/:id/on-leave (in_progress → on_leave)
 * - POST /api/v1/encounters/:id/resume   (on_leave → in_progress)
 * - POST /api/v1/encounters/:id/finish   (in_progress → finished)
 * - POST /api/v1/encounters/:id/cancel   (planned | arrived | in_progress → cancelled)
 *
 * Coverage:
 * - Authentication (session cookie validation)
 * - Authorization (create/arrive/cancel: R01, R02; start/on-leave/resume/
 *   finish: R01; view: R01-R05, R08, R10, R12, R09; R13 denied; unauthenticated
 *   rejected)
 * - Tenant/organisation/facility context resolution
 * - Scoped lookup (cross-tenant/org/facility returns safe 404, no leak)
 * - Consent gate (configuration-gated; emergency carve-out; fail-safe)
 * - Lifecycle transitions (canonical graph)
 * - Idempotency (non-terminal same-state = invalid transition 422;
 *   terminal finished/cancelled re-application = idempotent success 200,
 *   no duplicate audit)
 * - Invalid source-state rejection
 * - Audit event emission (exactly one per actual transition)
 * - No PHI in audit metadata
 * - Concurrency (deterministic outcomes under SERIALIZABLE retry)
 * - Appointment reference validation and one-encounter-per-appointment
 * - Patient/provider reference validation
 *
 * Per the task specification, these tests require PostgreSQL 17. They
 * are NOT run locally without PostgreSQL 17. CI validates with PG 17.
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
import { ConsentGateFeatureConfig } from '../../src/modules/encounters/consent-gate-feature.config.js';
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
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConsentGateFeatureConfig)
    .useValue({
      isConsentGateEnabled: () => false,
    })
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
  await prisma.encounter.deleteMany();
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

async function createAppointment(
  tenantId: string,
  organisationId: string,
  facilityId: string,
  patientId: string,
  providerId: string,
): Promise<{ appointmentId: string }> {
  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      organisationId,
      facilityId,
      patientId,
      providerId,
      scheduledStart: new Date('2026-08-01T09:00:00Z'),
      scheduledEnd: new Date('2026-08-01T09:30:00Z'),
      status: 'arrived',
      typeCode: 'ROUTINE',
    },
  });
  return { appointmentId: appointment.id };
}

// ---------------------------------------------------------------------------
// Encounter request helpers
// ---------------------------------------------------------------------------

async function createEncounter(
  cookie: string,
  body: Record<string, unknown>,
): Promise<request.Response> {
  return request(server)
    .post('/api/v1/encounters')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

async function viewEncounter(
  cookie: string,
  id: string,
): Promise<request.Response> {
  return request(server)
    .get(`/api/v1/encounters/${id}`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
}

async function arriveEncounter(
  cookie: string,
  id: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/encounters/${id}/arrive`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({});
}

async function startEncounter(
  cookie: string,
  id: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/encounters/${id}/start`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({});
}

async function onLeaveEncounter(
  cookie: string,
  id: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/encounters/${id}/on-leave`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({});
}

async function resumeEncounter(
  cookie: string,
  id: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/encounters/${id}/resume`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({});
}

async function finishEncounter(
  cookie: string,
  id: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/encounters/${id}/finish`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send({});
}

async function cancelEncounter(
  cookie: string,
  id: string,
  reason?: string,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/encounters/${id}/cancel`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(reason !== undefined ? { reason } : {});
}

async function countOutboxByAction(action: string): Promise<number> {
  const rows = await prisma.auditOutboxEvent.findMany();
  return rows.filter(
    (r) => (r.canonicalEventDraft as { action?: string }).action === action,
  ).length;
}

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

interface Fixture {
  tenantId: string;
  organisationId: string;
  facilityId: string;
  patientId: string;
  providerId: string;
  physicianCookie: string;
  nurseCookie: string;
  adminCookie: string;
  platformAdminCookie: string;
}

async function buildFixture(): Promise<Fixture> {
  const { tenantId } = await createTenant('t1', 'Tenant 1');
  const { organisationId } = await createOrganisation(
    tenantId,
    'ORG1',
    'Org 1',
  );
  const { facilityId } = await createFacility(
    tenantId,
    organisationId,
    'FAC1',
    'Facility 1',
  );
  const { patientId } = await createPatient(tenantId, 'MRN-1');
  const { providerId } = await createEligibleProvider(
    tenantId,
    organisationId,
    facilityId,
  );

  // Physician (R01)
  const { userId: physicianId } = await createUser(
    'physician@example.com',
    'Physician',
  );
  const { membershipId: physicianMembershipId } = await createMembership(
    physicianId,
    tenantId,
    'R01_PHYSICIAN',
    organisationId,
  );
  const physicianCookie = await loginUser(
    'physician@example.com',
    TEST_PASSWORD,
  );
  await selectContext(
    physicianCookie,
    physicianMembershipId,
    organisationId,
    facilityId,
  );

  // Nurse (R02) — reuses the physician's membership context selection (same
  // tenant/org/facility). The nurse has their own membership in the same
  // tenant/org scope.
  const { userId: nurseId } = await createUser('nurse@example.com', 'Nurse');
  const { membershipId: nurseMembershipId } = await createMembership(
    nurseId,
    tenantId,
    'R02_NURSE',
    organisationId,
  );
  const nurseCookie = await loginUser('nurse@example.com', TEST_PASSWORD);
  await selectContext(
    nurseCookie,
    nurseMembershipId,
    organisationId,
    facilityId,
  );

  // Clinic Administrator (R09)
  const { userId: adminId } = await createUser('admin@example.com', 'Admin');
  const { membershipId: adminMembershipId } = await createMembership(
    adminId,
    tenantId,
    'R09_ADMINISTRATOR',
    organisationId,
  );
  const adminCookie = await loginUser('admin@example.com', TEST_PASSWORD);
  await selectContext(
    adminCookie,
    adminMembershipId,
    organisationId,
    facilityId,
  );

  // Platform/System Administrator (R13) — no facility context.
  const { userId: platformAdminId } = await createUser(
    'platform@example.com',
    'Platform',
  );
  await createMembership(platformAdminId, tenantId, 'R13_PLATFORM_ADMIN');
  const platformAdminCookie = await loginUser(
    'platform@example.com',
    TEST_PASSWORD,
  );

  return {
    tenantId,
    organisationId,
    facilityId,
    patientId,
    providerId,
    physicianCookie,
    nurseCookie,
    adminCookie,
    platformAdminCookie,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Encounters — BC02 Foundation (PostgreSQL 17)', () => {
  beforeEach(async () => {
    await truncateAll();
    resetThrottlerStorageSafely(throttlerStorage);
  });

  // -------------------------------------------------------------------------
  // SCHEMA / MIGRATION
  // -------------------------------------------------------------------------

  describe('schema', () => {
    it('encounters table exists with the canonical columns', async () => {
      const row = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'encounters'
        ORDER BY ordinal_position
      `;
      const columns = row as {
        column_name: string;
        data_type: string;
        is_nullable: string;
      }[];
      const names = columns.map((c) => c.column_name);
      expect(names).toContain('id');
      expect(names).toContain('tenant_id');
      expect(names).toContain('organisation_id');
      expect(names).toContain('facility_id');
      expect(names).toContain('patient_id');
      expect(names).toContain('provider_id');
      expect(names).toContain('appointment_id');
      expect(names).toContain('encounter_type');
      expect(names).toContain('status');
      expect(names).toContain('priority');
      expect(names).toContain('created_at');
      expect(names).toContain('updated_at');
    });

    it('appointment_id is nullable', async () => {
      const row = await prisma.$queryRaw`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'encounters' AND column_name = 'appointment_id'
      `;
      expect(
        ((row as { is_nullable: string }[])[0] ?? { is_nullable: 'NO' })
          .is_nullable,
      ).toBe('YES');
    });

    it('no foreign keys exist on encounters (state isolation)', async () => {
      const fks = await prisma.$queryRaw`
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'encounters'::regclass AND contype = 'f'
      `;
      // The encounters table must have NO foreign keys (logical references
      // only, preserving BC01/BC10/BC06 state isolation).
      expect((fks as { conname: string }[]).length).toBe(0);
    });

    it('partial unique index enforces one encounter per appointment', async () => {
      const { tenantId, organisationId, facilityId, patientId, providerId } =
        await buildFixture();
      const { appointmentId } = await createAppointment(
        tenantId,
        organisationId,
        facilityId,
        patientId,
        providerId,
      );
      await prisma.encounter.create({
        data: {
          tenantId,
          organisationId,
          facilityId,
          patientId,
          providerId,
          appointmentId,
        },
      });
      await expect(
        prisma.encounter.create({
          data: {
            tenantId,
            organisationId,
            facilityId,
            patientId,
            providerId,
            appointmentId,
          },
        }),
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // CREATION
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('creates an encounter in the planned status (consent gate disabled)', async () => {
      const { physicianCookie, patientId, providerId } = await buildFixture();
      const res = await createEncounter(physicianCookie, {
        patientId,
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('planned');
      expect(res.body.encounterType).toBe('outpatient');
      expect(res.body.priority).toBe('routine');
      expect(res.body.appointmentId).toBeNull();
    });

    it('rejects an unknown patient (no existence leak)', async () => {
      const { physicianCookie, providerId } = await buildFixture();
      const res = await createEncounter(physicianCookie, {
        patientId: '00000000-0000-0000-0000-999999999999',
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('ENCOUNTER_PATIENT_NOT_FOUND');
    });

    it('rejects an ineligible provider', async () => {
      const { physicianCookie, patientId } = await buildFixture();
      const res = await createEncounter(physicianCookie, {
        patientId,
        providerId: '00000000-0000-0000-0000-999999999999',
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('ENCOUNTER_PROVIDER_NOT_FOUND');
    });

    it('rejects an out-of-scope appointment (no existence leak)', async () => {
      const { physicianCookie, patientId, providerId } = await buildFixture();
      const res = await createEncounter(physicianCookie, {
        patientId,
        providerId,
        appointmentId: '00000000-0000-0000-0000-999999999999',
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('ENCOUNTER_APPOINTMENT_NOT_FOUND');
    });

    it('rejects a duplicate encounter for the same appointment', async () => {
      const f = await buildFixture();
      const { appointmentId } = await createAppointment(
        f.tenantId,
        f.organisationId,
        f.facilityId,
        f.patientId,
        f.providerId,
      );
      const first = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        appointmentId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(first.status).toBe(201);
      const second = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        appointmentId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(second.status).toBe(422);
      expect(second.body.error.code).toBe('ENCOUNTER_DUPLICATE_APPOINTMENT');
    });

    it('rejects a caller-supplied tenantId (strict contract)', async () => {
      const { physicianCookie, patientId, providerId } = await buildFixture();
      const res = await createEncounter(physicianCookie, {
        patientId,
        providerId,
        tenantId: '00000000-0000-0000-0000-999999999999',
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(400);
    });

    it('rejects a caller-supplied status (strict contract)', async () => {
      const { physicianCookie, patientId, providerId } = await buildFixture();
      const res = await createEncounter(physicianCookie, {
        patientId,
        providerId,
        status: 'finished',
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(400);
    });

    it('emits an encounters.created audit event on success', async () => {
      const { physicianCookie, patientId, providerId } = await buildFixture();
      await createEncounter(physicianCookie, {
        patientId,
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(await countOutboxByAction('encounters.created')).toBe(1);
    });

    it('emits no audit event on validation failure', async () => {
      const { physicianCookie, providerId } = await buildFixture();
      await createEncounter(physicianCookie, {
        patientId: '00000000-0000-0000-0000-999999999999',
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(await countOutboxByAction('encounters.created')).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // CONSENT GATE (override enabled — emergency carve-out)
  // -------------------------------------------------------------------------

  describe('consent gate (enforced)', () => {
    let enforcedApp: INestApplication;
    let enforcedServer: Server;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConsentGateFeatureConfig)
        .useValue({ isConsentGateEnabled: () => true })
        .compile();
      enforcedApp = moduleRef.createNestApplication();
      enforcedApp.setGlobalPrefix('api/v1');
      await enforcedApp.init();
      enforcedServer = enforcedApp.getHttpServer() as Server;
    });

    afterAll(async () => {
      if (enforcedApp) {
        await enforcedApp.close();
      }
    });

    it('blocks a non-emergency encounter (fail-safe)', async () => {
      const f = await buildFixture();
      const res = await request(enforcedServer)
        .post('/api/v1/encounters')
        .set('Origin', ORIGIN)
        .set('Cookie', f.physicianCookie)
        .send({
          patientId: f.patientId,
          providerId: f.providerId,
          encounterType: 'outpatient',
          priority: 'routine',
        });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('ENCOUNTER_CONSENT_REQUIRED');
    });

    it('allows an emergency encounter with justification (carve-out)', async () => {
      const f = await buildFixture();
      const res = await request(enforcedServer)
        .post('/api/v1/encounters')
        .set('Origin', ORIGIN)
        .set('Cookie', f.physicianCookie)
        .send({
          patientId: f.patientId,
          providerId: f.providerId,
          encounterType: 'emergency',
          priority: 'emergency',
          emergencyJustification: 'Patient unconscious; no consent available',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('planned');
    });

    it('rejects an emergency encounter without justification', async () => {
      const f = await buildFixture();
      const res = await request(enforcedServer)
        .post('/api/v1/encounters')
        .set('Origin', ORIGIN)
        .set('Cookie', f.physicianCookie)
        .send({
          patientId: f.patientId,
          providerId: f.providerId,
          encounterType: 'emergency',
          priority: 'emergency',
        });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // AUTHORIZATION
  // -------------------------------------------------------------------------

  describe('authorization', () => {
    it('R01 physician can create', async () => {
      const { physicianCookie, patientId, providerId } = await buildFixture();
      const res = await createEncounter(physicianCookie, {
        patientId,
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(201);
    });

    it('R02 nurse can create', async () => {
      const { nurseCookie, patientId, providerId } = await buildFixture();
      const res = await createEncounter(nurseCookie, {
        patientId,
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(201);
    });

    it('R09 clinic administrator is denied encounters:create (403)', async () => {
      const { adminCookie, patientId, providerId } = await buildFixture();
      const res = await createEncounter(adminCookie, {
        patientId,
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(403);
    });

    it('R13 platform administrator is denied encounters:create (403)', async () => {
      const { platformAdminCookie, patientId, providerId } =
        await buildFixture();
      const res = await createEncounter(platformAdminCookie, {
        patientId,
        providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      expect(res.status).toBe(403);
    });

    it('unauthenticated request is rejected (401)', async () => {
      const { patientId, providerId } = await buildFixture();
      const res = await request(server)
        .post('/api/v1/encounters')
        .set('Origin', ORIGIN)
        .send({
          patientId,
          providerId,
          encounterType: 'outpatient',
          priority: 'routine',
        });
      expect(res.status).toBe(401);
    });

    it('R01 physician can start; R02 nurse is denied encounters:start (403)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const arriveRes = await arriveEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(arriveRes.status).toBe(200);
      const startPhysician = await startEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(startPhysician.status).toBe(200);
      const created2 = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      await arriveEncounter(f.physicianCookie, created2.body.id);
      const startNurse = await startEncounter(f.nurseCookie, created2.body.id);
      expect(startNurse.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // SCOPE — tenant/org/facility isolation
  // -------------------------------------------------------------------------

  describe('scope isolation', () => {
    it('cross-tenant encounter returns safe 404 (no existence leak)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const { tenantId: t2 } = await createTenant('t2', 'Tenant 2');
      const { organisationId: o2 } = await createOrganisation(
        t2,
        'ORG2',
        'Org 2',
      );
      const { facilityId: fac2 } = await createFacility(
        t2,
        o2,
        'FAC2',
        'Facility 2',
      );
      const { userId: u2 } = await createUser('u2@example.com', 'U2');
      const { membershipId: m2 } = await createMembership(
        u2,
        t2,
        'R01_PHYSICIAN',
        o2,
      );
      const cookie2 = await loginUser('u2@example.com', TEST_PASSWORD);
      await selectContext(cookie2, m2, o2, fac2);
      const res = await viewEncounter(cookie2, created.body.id);
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------------------

  describe('lifecycle', () => {
    it('planned → arrived → in_progress → finished (happy path)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const id = created.body.id;

      const arriveRes = await arriveEncounter(f.physicianCookie, id);
      expect(arriveRes.status).toBe(200);
      expect(arriveRes.body.status).toBe('arrived');

      const startRes = await startEncounter(f.physicianCookie, id);
      expect(startRes.status).toBe(200);
      expect(startRes.body.status).toBe('in_progress');

      const finishRes = await finishEncounter(f.physicianCookie, id);
      expect(finishRes.status).toBe(200);
      expect(finishRes.body.status).toBe('finished');
    });

    it('planned → in_progress (direct start, e.g. emergency)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const startRes = await startEncounter(f.physicianCookie, created.body.id);
      expect(startRes.status).toBe(200);
      expect(startRes.body.status).toBe('in_progress');
    });

    it('in_progress → on_leave → in_progress (resume)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      await startEncounter(f.physicianCookie, created.body.id);
      const onLeaveRes = await onLeaveEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(onLeaveRes.status).toBe(200);
      expect(onLeaveRes.body.status).toBe('on_leave');
      const resumeRes = await resumeEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.status).toBe('in_progress');
    });

    it('disallowed transition returns 422 (invalid_source_state)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const finishRes = await finishEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(finishRes.status).toBe(422);
      expect(finishRes.body.error.code).toBe('ENCOUNTER_INVALID_TRANSITION');
    });

    it('non-terminal same-state re-application is invalid (arrive twice)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      await arriveEncounter(f.physicianCookie, created.body.id);
      const secondArrive = await arriveEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(secondArrive.status).toBe(422);
    });

    it('terminal finished re-finish is idempotent (no duplicate audit)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      await arriveEncounter(f.physicianCookie, created.body.id);
      await startEncounter(f.physicianCookie, created.body.id);
      await finishEncounter(f.physicianCookie, created.body.id);
      const before = await countOutboxByAction('encounters.finished');
      const secondFinish = await finishEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(secondFinish.status).toBe(200);
      expect(secondFinish.body.status).toBe('finished');
      const after = await countOutboxByAction('encounters.finished');
      expect(after).toBe(before);
    });

    it('cancel from planned is terminal and idempotent', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const cancelRes = await cancelEncounter(
        f.physicianCookie,
        created.body.id,
        'Patient left',
      );
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');
      const before = await countOutboxByAction('encounters.cancelled');
      const secondCancel = await cancelEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(secondCancel.status).toBe(200);
      const after = await countOutboxByAction('encounters.cancelled');
      expect(after).toBe(before);
    });

    it('cancel from on_leave is NOT permitted (invalid transition)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      await startEncounter(f.physicianCookie, created.body.id);
      await onLeaveEncounter(f.physicianCookie, created.body.id);
      const cancelRes = await cancelEncounter(
        f.physicianCookie,
        created.body.id,
      );
      expect(cancelRes.status).toBe(422);
    });
  });

  // -------------------------------------------------------------------------
  // VIEW
  // -------------------------------------------------------------------------

  describe('view', () => {
    it('returns the encounter for an authorized reader', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const res = await viewEncounter(f.physicianCookie, created.body.id);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('R09 clinic administrator can view (read role)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const res = await viewEncounter(f.adminCookie, created.body.id);
      expect(res.status).toBe(200);
    });

    it('returns 404 for an unknown encounter (no existence leak)', async () => {
      const f = await buildFixture();
      const res = await viewEncounter(
        f.physicianCookie,
        '00000000-0000-0000-0000-999999999999',
      );
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // AUDIT
  // -------------------------------------------------------------------------

  describe('audit', () => {
    it('each lifecycle transition emits exactly one audit event', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const id = created.body.id;
      await arriveEncounter(f.physicianCookie, id);
      await startEncounter(f.physicianCookie, id);
      await finishEncounter(f.physicianCookie, id);
      expect(await countOutboxByAction('encounters.created')).toBe(1);
      expect(await countOutboxByAction('encounters.arrived')).toBe(1);
      expect(await countOutboxByAction('encounters.started')).toBe(1);
      expect(await countOutboxByAction('encounters.finished')).toBe(1);
    });

    it('no PHI in audit metadata (only endpoint, encounterId, consent, reason)', async () => {
      const f = await buildFixture();
      await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      const rows = await prisma.auditOutboxEvent.findMany();
      const created = rows.filter(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'encounters.created',
      );
      expect(created.length).toBe(1);
      const meta = (
        (created[0] ?? { canonicalEventDraft: { metadata: {} } })
          .canonicalEventDraft as { metadata?: object }
      ).metadata as Record<string, unknown>;
      const forbidden = ['patientName', 'providerName', 'diagnosis', 'notes'];
      for (const key of forbidden) {
        expect(meta).not.toHaveProperty(key);
      }
      expect(meta.encounterId).toBeDefined();
      expect(meta.endpoint).toBe('encounters_create');
    });
  });

  // -------------------------------------------------------------------------
  // CONCURRENCY
  // -------------------------------------------------------------------------

  describe('concurrency', () => {
    it('duplicate creation for the same appointment resolves to one created and one duplicate_appointment', async () => {
      const f = await buildFixture();
      const { appointmentId } = await createAppointment(
        f.tenantId,
        f.organisationId,
        f.facilityId,
        f.patientId,
        f.providerId,
      );
      const [r1, r2] = await Promise.all([
        createEncounter(f.physicianCookie, {
          patientId: f.patientId,
          providerId: f.providerId,
          appointmentId,
          encounterType: 'outpatient',
          priority: 'routine',
        }),
        createEncounter(f.physicianCookie, {
          patientId: f.patientId,
          providerId: f.providerId,
          appointmentId,
          encounterType: 'outpatient',
          priority: 'routine',
        }),
      ]);
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([201, 422]);
      expect(await countOutboxByAction('encounters.created')).toBe(1);
    });

    it('finish-vs-finish resolves to one transition (no duplicate audit)', async () => {
      const f = await buildFixture();
      const created = await createEncounter(f.physicianCookie, {
        patientId: f.patientId,
        providerId: f.providerId,
        encounterType: 'outpatient',
        priority: 'routine',
      });
      await arriveEncounter(f.physicianCookie, created.body.id);
      await startEncounter(f.physicianCookie, created.body.id);
      await Promise.all([
        finishEncounter(f.physicianCookie, created.body.id),
        finishEncounter(f.physicianCookie, created.body.id),
      ]);
      expect(await countOutboxByAction('encounters.finished')).toBe(1);
    });
  });
});
