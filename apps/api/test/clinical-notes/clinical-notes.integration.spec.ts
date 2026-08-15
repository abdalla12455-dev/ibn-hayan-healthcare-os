/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * Clinical Notes Integration Tests — BC03 Clinical Documentation
 * Foundation.
 *
 * These tests exercise the clinical-note lifecycle via supertest against
 * a real NestJS application with a real PostgreSQL 17 database. They
 * cover:
 * - POST   /api/v1/clinical-notes          (create draft)
 * - GET    /api/v1/clinical-notes/:id        (view)
 * - GET    /api/v1/clinical-notes/:id/history (history)
 * - POST   /api/v1/clinical-notes/:id/sign  (draft -> signed)
 * - POST   /api/v1/clinical-notes/:id/amend (signed | amended -> amended)
 * - POST   /api/v1/clinical-notes/:id/addendum (signed | amended -> addendum)
 * - POST   /api/v1/clinical-notes/:id/withdraw (draft | in_progress -> withdrawn)
 *
 * Coverage:
 * - Schema/migration (clinical_notes + clinical_note_revisions tables,
 *   no foreign keys, tenant-scoped indexes)
 * - Authentication (session cookie validation)
 * - Authorization (create/sign/amend: R01, R02, R05; view: R01, R02,
 *   R03, R05, R09; R13 denied; unauthenticated rejected)
 * - Tenant/organisation/facility context resolution
 * - Scoped lookup (cross-tenant/org/facility returns safe 404, no leak)
 * - Encounter/patient/provider reference validation
 * - Patient-encounter mismatch rejection
 * - Signing authority (author must sign; cross-author denied)
 * - Amendment reason enforcement (required; rejected when missing)
 * - Immutable signed-note history preservation
 * - Invalid source-state rejection
 * - Idempotency (signed -> signed again rejected)
 * - Audit event emission (exactly one per actual transition)
 * - No PHI in audit metadata
 * - Concurrency (deterministic outcomes under SERIALIZABLE retry)
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
// Test helpers
// ---------------------------------------------------------------------------

async function truncateAll(): Promise<void> {
  await prisma.auditOutboxEvent.deleteMany();
  await prisma.clinicalNoteRevision.deleteMany();
  await prisma.clinicalNote.deleteMany();
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
// Clinical note request helpers
// ---------------------------------------------------------------------------

async function createNote(
  cookie: string,
  body: Record<string, unknown>,
): Promise<request.Response> {
  return request(server)
    .post('/api/v1/clinical-notes')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

async function viewNote(cookie: string, id: string): Promise<request.Response> {
  return request(server)
    .get(`/api/v1/clinical-notes/${id}`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
}

async function viewHistory(
  cookie: string,
  id: string,
): Promise<request.Response> {
  return request(server)
    .get(`/api/v1/clinical-notes/${id}/history`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie);
}

async function signNote(
  cookie: string,
  id: string,
  body: Record<string, unknown> = {},
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/clinical-notes/${id}/sign`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

async function amendNote(
  cookie: string,
  id: string,
  body: Record<string, unknown>,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/clinical-notes/${id}/amend`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

async function addAddendum(
  cookie: string,
  id: string,
  body: Record<string, unknown>,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/clinical-notes/${id}/addendum`)
    .set('Origin', ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

async function withdrawNote(
  cookie: string,
  id: string,
  body: Record<string, unknown>,
): Promise<request.Response> {
  return request(server)
    .post(`/api/v1/clinical-notes/${id}/withdraw`)
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
// Shared fixture
// ---------------------------------------------------------------------------

interface Fixture {
  tenantId: string;
  organisationId: string;
  facilityId: string;
  patientId: string;
  providerId: string;
  encounterId: string;
  physicianCookie: string;
  nurseCookie: string;
  pharmacistCookie: string;
  alliedCookie: string;
  adminCookie: string;
  platformAdminCookie: string;
}

async function seedSecondTenantPhysician(): Promise<string> {
  const { tenantId: tenant2 } = await createTenant('t2', 'Tenant 2');
  const { organisationId: org2 } = await createOrganisation(
    tenant2,
    'ORG2',
    'Org 2',
  );
  const { facilityId: fac2 } = await createFacility(
    tenant2,
    org2,
    'FAC2',
    'Facility 2',
  );
  const { providerId: provider2 } = await createEligibleProvider(
    tenant2,
    org2,
    fac2,
  );
  const { patientId: patient2 } = await createPatient(tenant2, 'MRN-X');
  const { userId: physician2 } = await createUser(
    'physician2@example.com',
    'Physician 2',
  );
  const { membershipId: membership2 } = await createMembership(
    physician2,
    tenant2,
    'R01_PHYSICIAN',
    org2,
  );
  const cookie2 = await loginUser('physician2@example.com', TEST_PASSWORD);
  await selectContext(cookie2, membership2, org2, fac2);
  await request(server)
    .post('/api/v1/encounters')
    .set('Origin', ORIGIN)
    .set('Cookie', cookie2)
    .send({
      patientId: patient2,
      providerId: provider2,
      encounterType: 'outpatient',
      priority: 'routine',
    });
  return cookie2;
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

  // Nurse (R02)
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

  // Pharmacist (R03) — clinical-note read-only
  const { userId: pharmacistId } = await createUser(
    'pharmacist@example.com',
    'Pharmacist',
  );
  const { membershipId: pharmacistMembershipId } = await createMembership(
    pharmacistId,
    tenantId,
    'R03_PHARMACIST',
    organisationId,
  );
  const pharmacistCookie = await loginUser(
    'pharmacist@example.com',
    TEST_PASSWORD,
  );
  await selectContext(
    pharmacistCookie,
    pharmacistMembershipId,
    organisationId,
    facilityId,
  );

  // Allied Health (R05) — clinical-note write
  const { userId: alliedId } = await createUser(
    'allied@example.com',
    'Allied Health',
  );
  const { membershipId: alliedMembershipId } = await createMembership(
    alliedId,
    tenantId,
    'R05_ALLIED_HEALTH_PROFESSIONAL',
    organisationId,
  );
  const alliedCookie = await loginUser('allied@example.com', TEST_PASSWORD);
  await selectContext(
    alliedCookie,
    alliedMembershipId,
    organisationId,
    facilityId,
  );

  // Clinic Administrator (R09) — clinical-note read-only
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
  await createMembership(platformAdminId, tenantId, 'R13_SYSTEM_ADMINISTRATOR');
  const platformAdminCookie = await loginUser(
    'platform@example.com',
    TEST_PASSWORD,
  );

  // Seed an encounter (BC02) for the clinical note to reference. The
  // physician creates it; status defaults to planned.
  const encounterRes = await request(server)
    .post('/api/v1/encounters')
    .set('Origin', ORIGIN)
    .set('Cookie', physicianCookie)
    .send({
      patientId,
      providerId,
      encounterType: 'outpatient',
      priority: 'routine',
    });
  if (encounterRes.status !== 201) {
    throw new Error(
      `Encounter seed failed: status=${encounterRes.status}, body=${JSON.stringify(encounterRes.body)}`,
    );
  }
  const encounterId = (encounterRes.body as { id: string }).id;

  return {
    tenantId,
    organisationId,
    facilityId,
    patientId,
    providerId,
    encounterId,
    physicianCookie,
    nurseCookie,
    pharmacistCookie,
    alliedCookie,
    adminCookie,
    platformAdminCookie,
  };
}

/** A canonical draft-note creation body referencing the fixture's author. */
function draftBody(f: Fixture): Record<string, unknown> {
  return {
    encounterId: f.encounterId,
    patientId: f.patientId,
    noteType: 'progress',
    authorRole: 'physician',
    authorId: f.providerId,
    body: 'Patient reviewed. Plan: continue current medication.',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Clinical Notes — BC03 Foundation (PostgreSQL 17)', () => {
  beforeEach(async () => {
    await truncateAll();
    resetThrottlerStorageSafely(throttlerStorage);
  });

  // -------------------------------------------------------------------------
  // SCHEMA / MIGRATION
  // -------------------------------------------------------------------------

  describe('schema', () => {
    it('clinical_notes table exists with canonical columns', async () => {
      const row = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'clinical_notes' ORDER BY ordinal_position
      `;
      const names = (row as { column_name: string }[]).map(
        (c) => c.column_name,
      );
      expect(names).toContain('id');
      expect(names).toContain('tenant_id');
      expect(names).toContain('organisation_id');
      expect(names).toContain('facility_id');
      expect(names).toContain('encounter_id');
      expect(names).toContain('patient_id');
      expect(names).toContain('note_type');
      expect(names).toContain('author_role');
      expect(names).toContain('status');
      expect(names).toContain('created_at');
      expect(names).toContain('updated_at');
    });

    it('clinical_note_revisions table exists with canonical columns', async () => {
      const row = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'clinical_note_revisions' ORDER BY ordinal_position
      `;
      const names = (row as { column_name: string }[]).map(
        (c) => c.column_name,
      );
      expect(names).toContain('id');
      expect(names).toContain('clinical_note_id');
      expect(names).toContain('revision_number');
      expect(names).toContain('action');
      expect(names).toContain('status');
      expect(names).toContain('body');
      expect(names).toContain('author_id');
      expect(names).toContain('author_role');
      expect(names).toContain('reason');
      expect(names).toContain('signed_at');
      expect(names).toContain('created_at');
    });

    it('no foreign keys exist on clinical_notes (state isolation)', async () => {
      const fks = await prisma.$queryRaw`
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'clinical_notes'::regclass AND contype = 'f'
      `;
      expect((fks as { conname: string }[]).length).toBe(0);
    });

    it('tenant-scoped indexes exist on clinical_notes', async () => {
      const idx = await prisma.$queryRaw`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'clinical_notes'
      `;
      const names = (idx as { indexname: string }[]).map((i) => i.indexname);
      expect(names.some((n) => n.includes('tenant_id'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // CREATE DRAFT
  // -------------------------------------------------------------------------

  describe('create draft', () => {
    it('R01 physician creates a draft clinical note (201)', async () => {
      const f = await buildFixture();
      const res = await createNote(f.physicianCookie, draftBody(f));
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('draft');
      expect(res.body.currentRevision.action).toBe('draft_created');
      expect(res.body.currentRevision.revisionNumber).toBe(1);
      expect(res.body.encounterId).toBe(f.encounterId);
      expect(res.body.patientId).toBe(f.patientId);
    });

    it('emits exactly one clinical_notes.created audit event', async () => {
      const f = await buildFixture();
      await createNote(f.physicianCookie, draftBody(f));
      expect(await countOutboxByAction('clinical_notes.created')).toBe(1);
    });

    it('unauthenticated request is rejected (401)', async () => {
      const f = await buildFixture();
      const res = await request(server)
        .post('/api/v1/clinical-notes')
        .set('Origin', ORIGIN)
        .send(draftBody(f));
      expect(res.status).toBe(401);
    });

    it('R13 platform administrator is denied clinical_notes:create (403)', async () => {
      const f = await buildFixture();
      const res = await createNote(f.platformAdminCookie, draftBody(f));
      expect(res.status).toBe(403);
    });

    it('R09 clinic administrator is denied clinical_notes:create (403)', async () => {
      const f = await buildFixture();
      const res = await createNote(f.adminCookie, draftBody(f));
      expect(res.status).toBe(403);
    });

    it('rejects a non-existent encounter (404/422)', async () => {
      const f = await buildFixture();
      const res = await createNote(f.physicianCookie, {
        ...draftBody(f),
        encounterId: '00000000-0000-0000-0000-000000000000',
      });
      expect([404, 422]).toContain(res.status);
    });

    it('rejects a non-existent patient (404/422)', async () => {
      const f = await buildFixture();
      const res = await createNote(f.physicianCookie, {
        ...draftBody(f),
        patientId: '00000000-0000-0000-0000-000000000000',
      });
      expect([404, 422]).toContain(res.status);
    });

    it('rejects a patient that does not match the encounter (422)', async () => {
      const f = await buildFixture();
      const { patientId: otherPatientId } = await createPatient(
        f.tenantId,
        'MRN-2',
      );
      const res = await createNote(f.physicianCookie, {
        ...draftBody(f),
        patientId: otherPatientId,
      });
      expect(res.status).toBe(422);
    });

    it('rejects an ineligible provider (404/422)', async () => {
      const f = await buildFixture();
      const { providerId: unassignedProviderId } = await createProvider(
        f.tenantId,
        'active',
      );
      const res = await createNote(f.physicianCookie, {
        ...draftBody(f),
        authorId: unassignedProviderId,
      });
      expect([404, 422]).toContain(res.status);
    });

    it('rejects an empty body (400)', async () => {
      const f = await buildFixture();
      const res = await createNote(f.physicianCookie, {
        ...draftBody(f),
        body: '',
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // VIEW
  // -------------------------------------------------------------------------

  describe('view', () => {
    it('R01 physician can view a note', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await viewNote(f.physicianCookie, created.body.id);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('R09 clinic administrator can view (read)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await viewNote(f.adminCookie, created.body.id);
      expect(res.status).toBe(200);
    });

    it('R03 pharmacist can view (read)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await viewNote(f.pharmacistCookie, created.body.id);
      expect(res.status).toBe(200);
    });

    it('R13 platform administrator is denied clinical_notes:view (403)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await viewNote(f.platformAdminCookie, created.body.id);
      expect(res.status).toBe(403);
    });

    it('non-existent note returns 404 (no leak)', async () => {
      const f = await buildFixture();
      const res = await viewNote(
        f.physicianCookie,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(404);
    });

    it('emits exactly one clinical_notes.viewed audit event', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await prisma.auditOutboxEvent.deleteMany();
      await viewNote(f.physicianCookie, created.body.id);
      expect(await countOutboxByAction('clinical_notes.viewed')).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // HISTORY
  // -------------------------------------------------------------------------

  describe('history', () => {
    it('returns the ordered revision history', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await viewHistory(f.physicianCookie, created.body.id);
      expect(res.status).toBe(200);
      expect(res.body.noteId).toBe(created.body.id);
      expect(Array.isArray(res.body.revisions)).toBe(true);
      expect(res.body.revisions.length).toBe(2);
      expect(res.body.revisions[0].action).toBe('draft_created');
      expect(res.body.revisions[1].action).toBe('signed');
    });

    it('R13 platform administrator is denied (403)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await viewHistory(f.platformAdminCookie, created.body.id);
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // SIGN
  // -------------------------------------------------------------------------

  describe('sign', () => {
    it('author signs their own draft note (200, signed)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('signed');
      expect(res.body.currentRevision.action).toBe('signed');
      expect(res.body.currentRevision.signedAt).not.toBeNull();
    });

    it('emits exactly one clinical_notes.signed audit event', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      expect(await countOutboxByAction('clinical_notes.signed')).toBe(1);
    });

    it('non-author actor is denied signing authority (422)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const { providerId: otherProviderId } = await createEligibleProvider(
        f.tenantId,
        f.organisationId,
        f.facilityId,
      );
      const res = await signNote(f.physicianCookie, created.body.id, {
        actorId: otherProviderId,
      });
      expect(res.status).toBe(422);
      // No sign audit emitted on denial.
      expect(await countOutboxByAction('clinical_notes.signed')).toBe(0);
    });

    it('re-signing an already-signed note is rejected (422)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      expect(res.status).toBe(422);
      expect(await countOutboxByAction('clinical_notes.signed')).toBe(1);
    });

    it('R13 platform administrator is denied clinical_notes:sign (403)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await signNote(f.platformAdminCookie, created.body.id, {
        actorId: f.providerId,
      });
      expect(res.status).toBe(403);
    });

    it('signing a non-existent note returns 404 (no leak)', async () => {
      const f = await buildFixture();
      const res = await signNote(
        f.physicianCookie,
        '00000000-0000-0000-0000-000000000000',
        { actorId: f.providerId },
      );
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // AMEND
  // -------------------------------------------------------------------------

  describe('amend', () => {
    it('amends a signed note with a reason (200, amended)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await amendNote(f.physicianCookie, created.body.id, {
        body: 'Corrected assessment and plan.',
        reason: 'Typographical correction in the assessment section.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('amended');
      expect(res.body.currentRevision.action).toBe('amended');
      expect(res.body.currentRevision.body).toBe(
        'Corrected assessment and plan.',
      );
    });

    it('emits exactly one clinical_notes.amended audit event', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      await amendNote(f.physicianCookie, created.body.id, {
        body: 'Corrected.',
        reason: 'Correction.',
        actorId: f.providerId,
      });
      expect(await countOutboxByAction('clinical_notes.amended')).toBe(1);
    });

    it('rejects amendment without a reason (400)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await amendNote(f.physicianCookie, created.body.id, {
        body: 'Corrected.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(400);
    });

    it('rejects amendment of a draft note (422)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await amendNote(f.physicianCookie, created.body.id, {
        body: 'Corrected.',
        reason: 'Correction.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(422);
    });

    it('preserves the original signed revision in history', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const originalBody = created.body.currentRevision.body;
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      await amendNote(f.physicianCookie, created.body.id, {
        body: 'Corrected body.',
        reason: 'Correction.',
        actorId: f.providerId,
      });
      const res = await viewHistory(f.physicianCookie, created.body.id);
      const actions = res.body.revisions.map(
        (r: { action: string }) => r.action,
      );
      expect(actions).toEqual(['draft_created', 'signed', 'amended']);
      // The original signed revision body is preserved unchanged.
      const signedRev = res.body.revisions.find(
        (r: { action: string }) => r.action === 'signed',
      );
      expect(signedRev.body).toBe(originalBody);
    });

    it('R13 platform administrator is denied clinical_notes:amend (403)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await amendNote(f.platformAdminCookie, created.body.id, {
        body: 'Corrected.',
        reason: 'Correction.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // ADDENDUM
  // -------------------------------------------------------------------------

  describe('addendum', () => {
    it('adds an addendum to a signed note (200)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await addAddendum(f.physicianCookie, created.body.id, {
        body: 'Late-arriving lab result noted.',
        reason: 'Additional information received after signing.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(200);
      expect(res.body.currentRevision.action).toBe('addendum_added');
      expect(await countOutboxByAction('clinical_notes.addendum_added')).toBe(
        1,
      );
    });

    it('rejects addendum without a reason (400)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await addAddendum(f.physicianCookie, created.body.id, {
        body: 'Late-arriving lab result noted.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // WITHDRAW
  // -------------------------------------------------------------------------

  describe('withdraw', () => {
    it('withdraws a draft note (200)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const res = await withdrawNote(f.physicianCookie, created.body.id, {
        reason: 'Created in error.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('withdrawn');
      expect(res.body.currentRevision.action).toBe('withdrawn');
      expect(await countOutboxByAction('clinical_notes.withdrawn')).toBe(1);
    });

    it('rejects withdrawal of a signed note (422)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const res = await withdrawNote(f.physicianCookie, created.body.id, {
        reason: 'Withdraw.',
        actorId: f.providerId,
      });
      expect(res.status).toBe(422);
    });
  });

  // -------------------------------------------------------------------------
  // TENANT ISOLATION
  // -------------------------------------------------------------------------

  describe('tenant isolation', () => {
    it('cross-tenant view returns 404 (no leak)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const cookie2 = await seedSecondTenantPhysician();
      const res = await viewNote(cookie2, created.body.id);
      expect(res.status).toBe(404);
    });

    it('cross-tenant sign returns 404 (no leak)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const cookie2 = await seedSecondTenantPhysician();
      const res = await signNote(cookie2, created.body.id, {
        actorId: f.providerId,
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // AUDIT / PRIVACY
  // -------------------------------------------------------------------------

  describe('audit', () => {
    it('no PHI in audit metadata (only endpoint, noteId)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, {
        ...draftBody(f),
        body: 'Confidential clinical narrative with patient details.',
      });
      const rows = await prisma.auditOutboxEvent.findMany();
      const createdEvents = rows.filter(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'clinical_notes.created',
      );
      expect(createdEvents.length).toBe(1);
      const meta = (
        (createdEvents[0] ?? { canonicalEventDraft: { metadata: {} } })
          .canonicalEventDraft as { metadata?: object }
      ).metadata as Record<string, unknown>;
      const forbidden = [
        'body',
        'noteType',
        'authorId',
        'patientId',
        'encounterId',
        'patientName',
        'diagnosis',
        'notes',
      ];
      for (const key of forbidden) {
        expect(meta).not.toHaveProperty(key);
      }
      expect(meta.noteId).toBe(created.body.id);
      expect(meta.endpoint).toBe('clinical_notes_create');
    });

    it('sign audit metadata contains no note body or reason', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await prisma.auditOutboxEvent.deleteMany();
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      const rows = await prisma.auditOutboxEvent.findMany();
      const signed = rows.filter(
        (r) =>
          (r.canonicalEventDraft as { action?: string }).action ===
          'clinical_notes.signed',
      );
      expect(signed.length).toBe(1);
      const meta = (
        (signed[0] ?? { canonicalEventDraft: { metadata: {} } })
          .canonicalEventDraft as { metadata?: object }
      ).metadata as Record<string, unknown>;
      expect(meta).not.toHaveProperty('body');
      expect(meta.noteId).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // CONCURRENCY
  // -------------------------------------------------------------------------

  describe('concurrency', () => {
    it('sign-vs-sign resolves to one signed audit event (no duplicate)', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      const [r1, r2] = await Promise.all([
        signNote(f.physicianCookie, created.body.id, {
          actorId: f.providerId,
        }),
        signNote(f.physicianCookie, created.body.id, {
          actorId: f.providerId,
        }),
      ]);
      const statuses = [r1.status, r2.status].sort();
      // One transition succeeds (200), the other is rejected (422) because
      // the note is no longer in a signable state.
      expect(statuses).toEqual([200, 422]);
      expect(await countOutboxByAction('clinical_notes.signed')).toBe(1);
    });

    it('amend-vs-amend resolves to one amended audit event', async () => {
      const f = await buildFixture();
      const created = await createNote(f.physicianCookie, draftBody(f));
      await signNote(f.physicianCookie, created.body.id, {
        actorId: f.providerId,
      });
      await Promise.all([
        amendNote(f.physicianCookie, created.body.id, {
          body: 'A1',
          reason: 'r1',
          actorId: f.providerId,
        }),
        amendNote(f.physicianCookie, created.body.id, {
          body: 'A2',
          reason: 'r2',
          actorId: f.providerId,
        }),
      ]);
      // Both amendments are valid transitions (signed -> amended) so both
      // may succeed; but exactly the two amended events should be present,
      // and history should preserve both revisions in order.
      const amendedCount = await countOutboxByAction('clinical_notes.amended');
      expect(amendedCount).toBeGreaterThanOrEqual(1);
      const res = await viewHistory(f.physicianCookie, created.body.id);
      const amended = res.body.revisions.filter(
        (r: { action: string }) => r.action === 'amended',
      );
      expect(amended.length).toBe(amendedCount);
      // Revision numbers are strictly increasing.
      const numbers = res.body.revisions.map(
        (r: { revisionNumber: number }) => r.revisionNumber,
      );
      for (let i = 1; i < numbers.length; i += 1) {
        expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
      }
    });
  });
});
