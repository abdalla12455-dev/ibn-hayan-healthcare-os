import { describe, it, expect, beforeEach } from 'vitest';
import type {
  PatientId,
  PatientRepository,
  PatientIdentifierRepository,
  PatientConsentRepository,
  TenantId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaPatientRepository } from '../../src/infrastructure/database/repositories/prisma-patient.repository.js';
import { PrismaPatientIdentifierRepository } from '../../src/infrastructure/database/repositories/prisma-patient-identifier.repository.js';
import { PrismaPatientConsentRepository } from '../../src/infrastructure/database/repositories/prisma-patient-consent.repository.js';
import { TreatmentConsentVerificationService } from '../../src/infrastructure/database/services/treatment-consent-verification.service.js';
import { setupDatabaseTests } from './_pg-bootstrap.js';

/**
 * Database integration tests for the Patient repository.
 *
 * These tests exercise the Prisma-backed PatientRepository implementation
 * against a real PostgreSQL 17 cluster.
 *
 * Per STEP 12, the tests cover:
 * 1. Create a patient and verify it exists in the correct tenant.
 * 2. Nonexistent patient returns false for existsInTenant.
 * 3. Cross-tenant patient does not resolve.
 * 4. findById returns the patient within correct tenant scope.
 * 5. findById returns null for cross-tenant lookup.
 * 6. findByMedicalRecordNumber returns the patient within correct tenant scope.
 * 7. findByMedicalRecordNumber returns null for cross-tenant lookup.
 * 8. MRN uniqueness within tenant is enforced.
 * 9. Repository results are domain values, not Prisma-generated types.
 * 10. Timestamps are populated.
 * 11. Database tests clean up their own synthetic data.
 * 12. No real patient data is used.
 */

setupDatabaseTests();

let prisma: PrismaService;
let patientRepo: PatientRepository;
let identifierRepo: PatientIdentifierRepository;
let consentRepo: PatientConsentRepository;
let consentVerification: TreatmentConsentVerificationService;

// Generate unique test identifiers
const tenant1 = {
  id: '00000000-0000-0000-0000-000000000001' as TenantId,
  slug: 'tenant-patient-1.test.invalid',
  displayName: 'Tenant Patient Test 1',
};

const tenant2 = {
  id: '00000000-0000-0000-0000-000000000002' as TenantId,
  slug: 'tenant-patient-2.test.invalid',
  displayName: 'Tenant Patient Test 2',
};

function buildRepos(): void {
  prisma = new PrismaService();
  patientRepo = new PrismaPatientRepository(prisma);
  identifierRepo = new PrismaPatientIdentifierRepository(prisma);
  consentRepo = new PrismaPatientConsentRepository(prisma);
  consentVerification = new TreatmentConsentVerificationService(consentRepo);
}

// Truncate test tables before each test to avoid ID collisions.
// patient_identifiers and patient_consents have FKs to patients, so they
// are truncated first (CASCADE handles the rest, but explicit ordering is
// safer and clearer).
async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE patient_identifiers, patient_consents, patients, facilities, organisations, tenants RESTART IDENTITY CASCADE',
  );
}

beforeEach(async () => {
  buildRepos();
  await truncateAll();
});

describe('PatientRepository', () => {
  describe('existsInTenant', () => {
    it('returns true for existing patient in the correct tenant', async () => {
      // Create tenants
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });

      // Create patient in tenant1
      const patient = await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-PATIENT-TEST-001',
          status: 'active',
        },
      });

      // Verify exists in tenant1
      const exists = await patientRepo.existsInTenant(
        tenant1.id,
        patient.id as PatientId,
      );
      expect(exists).toBe(true);

      // Verify does NOT exist in tenant2 (cross-tenant)
      const crossTenantExists = await patientRepo.existsInTenant(
        tenant2.id,
        patient.id as PatientId,
      );
      expect(crossTenantExists).toBe(false);

      // Verify does NOT exist for non-existent patient
      const nonExistentExists = await patientRepo.existsInTenant(
        tenant1.id,
        '00000000-0000-0000-0000-999999999999' as PatientId,
      );
      expect(nonExistentExists).toBe(false);
    });

    it('returns false for patient in another tenant', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });

      const patient = await prisma.patient.create({
        data: {
          tenantId: tenant2.id,
          medicalRecordNumber: 'MRN-PATIENT-TEST-002',
          status: 'active',
        },
      });

      // Patient exists in tenant2
      const existsInTenant2 = await patientRepo.existsInTenant(
        tenant2.id,
        patient.id as PatientId,
      );
      expect(existsInTenant2).toBe(true);

      // Same patient does NOT exist in tenant1 (cross-tenant isolation)
      const existsInTenant1 = await patientRepo.existsInTenant(
        tenant1.id,
        patient.id as PatientId,
      );
      expect(existsInTenant1).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns patient within correct tenant scope', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });

      const patient = await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-FINDBYID-001',
          status: 'active',
        },
      });

      const found = await patientRepo.findById(
        tenant1.id,
        patient.id as PatientId,
      );
      expect(found).not.toBeNull();
      expect(found!.id).toBe(patient.id);
      expect(found!.tenantId).toBe(tenant1.id);
      expect(found!.medicalRecordNumber).toBe('MRN-FINDBYID-001');
      expect(found!.status).toBe('active');
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    it('returns null for cross-tenant lookup', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });

      const patient = await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-FINDBYID-002',
          status: 'active',
        },
      });

      // Patient is NOT found when querying with tenant2's ID
      const foundInTenant2 = await patientRepo.findById(
        tenant2.id,
        patient.id as PatientId,
      );
      expect(foundInTenant2).toBeNull();

      // Patient IS found when querying with tenant1's ID
      const foundInTenant1 = await patientRepo.findById(
        tenant1.id,
        patient.id as PatientId,
      );
      expect(foundInTenant1).not.toBeNull();
      expect(foundInTenant1!.id).toBe(patient.id);
    });

    it('returns null for non-existent patient', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });

      const found = await patientRepo.findById(
        tenant1.id,
        '00000000-0000-0000-0000-999999999999' as PatientId,
      );
      expect(found).toBeNull();
    });
  });

  describe('findByMedicalRecordNumber', () => {
    it('returns patient within correct tenant scope', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });

      await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-FINDBY-MRN-001',
          status: 'active',
        },
      });

      const found = await patientRepo.findByMedicalRecordNumber(
        tenant1.id,
        'MRN-FINDBY-MRN-001',
      );
      expect(found).not.toBeNull();
      expect(found!.medicalRecordNumber).toBe('MRN-FINDBY-MRN-001');
      expect(found!.tenantId).toBe(tenant1.id);
    });

    it('returns null for cross-tenant MRN lookup', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });

      // Same MRN in different tenants is allowed
      await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-SAME-BOTH-001',
          status: 'active',
        },
      });

      // Find in tenant1
      const foundInTenant1 = await patientRepo.findByMedicalRecordNumber(
        tenant1.id,
        'MRN-SAME-BOTH-001',
      );
      expect(foundInTenant1).not.toBeNull();
      expect(foundInTenant1!.tenantId).toBe(tenant1.id);

      // Same MRN is NOT found in tenant2
      const foundInTenant2 = await patientRepo.findByMedicalRecordNumber(
        tenant2.id,
        'MRN-SAME-BOTH-001',
      );
      expect(foundInTenant2).toBeNull();
    });

    it('returns null for non-existent MRN', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });

      const found = await patientRepo.findByMedicalRecordNumber(
        tenant1.id,
        'MRN-DOES-NOT-EXIST',
      );
      expect(found).toBeNull();
    });
  });

  describe('tenant isolation', () => {
    it('patients are isolated between tenants', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });

      const patient1 = await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-ISO-001',
          status: 'active',
        },
      });

      const patient2 = await prisma.patient.create({
        data: {
          tenantId: tenant2.id,
          medicalRecordNumber: 'MRN-ISO-002',
          status: 'inactive',
        },
      });

      // Each tenant can only see its own patients
      const allTenant1 = await prisma.patient.findMany({
        where: { tenantId: tenant1.id },
      });
      expect(allTenant1).toHaveLength(1);
      expect(allTenant1[0]!.id).toBe(patient1.id);

      const allTenant2 = await prisma.patient.findMany({
        where: { tenantId: tenant2.id },
      });
      expect(allTenant2).toHaveLength(1);
      expect(allTenant2[0]!.id).toBe(patient2.id);

      // Cross-tenant queries return empty
      const crossTenant = await prisma.patient.findMany({
        where: { tenantId: tenant1.id, id: patient2.id },
      });
      expect(crossTenant).toHaveLength(0);
    });
  });

  describe('domain type compliance', () => {
    it('repository returns domain values, not Prisma-generated types', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });

      const patient = await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-DOMAIN-TYPE-001',
          status: 'archived',
        },
      });

      const found = await patientRepo.findById(
        tenant1.id,
        patient.id as PatientId,
      );

      // The returned value is a domain Patient, not a Prisma Patient row
      // This is verified by the type system; at runtime we check the shape
      expect(found).not.toBeNull();
      expect(typeof found!.id).toBe('string');
      expect(typeof found!.tenantId).toBe('string');
      expect(typeof found!.medicalRecordNumber).toBe('string');
      expect(typeof found!.status).toBe('string');
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);

      // Status is the string literal, not the Prisma enum
      expect(found!.status).toBe('archived');
    });
  });

  describe('timestamps', () => {
    it('createdAt and updatedAt are populated', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });

      const patient = await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-TIMESTAMPS-001',
          status: 'active',
        },
      });

      const found = await patientRepo.findById(
        tenant1.id,
        patient.id as PatientId,
      );

      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
      expect(found!.createdAt.getTime()).toBeGreaterThan(0);
      expect(found!.updatedAt.getTime()).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // REGISTRATION (BC01 Demographics / Registration)
  // -------------------------------------------------------------------------

  describe('register', () => {
    it('registers a patient with full demographics and returns the domain patient', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });

      const result = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-REG-001',
        demographics: {
          legalGivenName: 'Ahmad',
          legalFamilyName: 'Hassan',
          dateOfBirth: '1990-05-15',
          sex: 'male',
          genderIdentity: 'male',
        },
      });

      expect(result.outcome).toBe('registered');
      if (result.outcome !== 'registered') return;
      expect(result.patient.medicalRecordNumber).toBe('MRN-REG-001');
      expect(result.patient.status).toBe('active');
      expect(result.patient.legalGivenName).toBe('Ahmad');
      expect(result.patient.legalFamilyName).toBe('Hassan');
      expect(result.patient.dateOfBirth).toBe('1990-05-15');
      expect(result.patient.sex).toBe('male');
      expect(result.patient.genderIdentity).toBe('male');
      expect(result.patient.tenantId).toBe(tenant1.id);
    });

    it('rejects a duplicate MRN in the same tenant', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-DUP-001',
          status: 'active',
        },
      });

      const result = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-DUP-001',
        demographics: {
          legalGivenName: 'Ahmad',
          legalFamilyName: 'Hassan',
          dateOfBirth: '1990-05-15',
          sex: 'male',
        },
      });

      expect(result.outcome).toBe('duplicate_mrn');
    });

    it('allows the same MRN in different tenants', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });

      const r1 = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-SHARED-001',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'female',
        },
      });
      const r2 = await patientRepo.register({
        tenantId: tenant2.id,
        medicalRecordNumber: 'MRN-SHARED-001',
        demographics: {
          legalGivenName: 'C',
          legalFamilyName: 'D',
          dateOfBirth: '1991-01-01',
          sex: 'male',
        },
      });

      expect(r1.outcome).toBe('registered');
      expect(r2.outcome).toBe('registered');
    });

    it('preserves historical minimal Patient rows (no demographic backfill)', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      // A historical minimal patient (no demographics)
      const historical = await prisma.patient.create({
        data: {
          tenantId: tenant1.id,
          medicalRecordNumber: 'MRN-HIST-001',
          status: 'active',
        },
      });

      const found = await patientRepo.findById(
        tenant1.id,
        historical.id as PatientId,
      );
      expect(found).not.toBeNull();
      expect(found!.legalGivenName).toBeNull();
      expect(found!.dateOfBirth).toBeNull();
      expect(found!.sex).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // DEMOGRAPHIC UPDATE
  // -------------------------------------------------------------------------

  describe('updateDemographics', () => {
    it('updates only the supplied demographic fields', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-UPD-001',
        demographics: {
          legalGivenName: 'Old',
          legalFamilyName: 'Name',
          dateOfBirth: '1985-03-10',
          sex: 'female',
        },
      });
      if (created.outcome !== 'registered') return;

      const updated = await patientRepo.updateDemographics(
        tenant1.id,
        created.patient.id,
        { legalGivenName: 'New' },
      );
      expect(updated).not.toBeNull();
      expect(updated!.legalGivenName).toBe('New');
      expect(updated!.legalFamilyName).toBe('Name');
      expect(updated!.dateOfBirth).toBe('1985-03-10');
    });

    it('returns null for a patient in another tenant (no existence leak)', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-UPD-002',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const updated = await patientRepo.updateDemographics(
        tenant2.id,
        created.patient.id,
        { legalGivenName: 'X' },
      );
      expect(updated).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------------------------

  describe('search', () => {
    it('finds a patient by exact MRN within tenant', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-SEARCH-001',
        demographics: {
          legalGivenName: 'Search',
          legalFamilyName: 'Test',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });

      const results = await patientRepo.search(tenant1.id, {
        medicalRecordNumber: 'MRN-SEARCH-001',
      });
      expect(results).toHaveLength(1);
      expect(results[0]!.medicalRecordNumber).toBe('MRN-SEARCH-001');
    });

    it('finds a patient by bounded name prefix', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-NAME-001',
        demographics: {
          legalGivenName: 'UniqueName',
          legalFamilyName: 'Family',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });

      const results = await patientRepo.search(tenant1.id, {
        namePrefix: 'UniqueName',
      });
      expect(results).toHaveLength(1);
      expect(results[0]!.legalGivenName).toBe('UniqueName');
    });

    it('does not leak patients across tenants', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });
      await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CROSS-001',
        demographics: {
          legalGivenName: 'Cross',
          legalFamilyName: 'Tenant',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });

      const results = await patientRepo.search(tenant2.id, {
        medicalRecordNumber: 'MRN-CROSS-001',
      });
      expect(results).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // IDENTIFIERS
  // -------------------------------------------------------------------------

  describe('PatientIdentifierRepository', () => {
    it('adds a NationalID identifier with normalization', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-ID-001',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const result = await identifierRepo.add(
        tenant1.id,
        created.patient.id,
        'national_id',
        '  1234567890  ',
        null,
      );
      expect(result.outcome).toBe('added');
      if (result.outcome !== 'added') return;
      // NationalID is trimmed + uppercased
      expect(result.identifier.normalizedValue).toBe('1234567890');
      expect(result.identifier.type).toBe('national_id');
    });

    it('rejects a duplicate NationalID (deterministic duplicate prevention)', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-ID-002',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      await identifierRepo.add(
        tenant1.id,
        created.patient.id,
        'national_id',
        'ABC123',
        null,
      );
      const dup = await identifierRepo.add(
        tenant1.id,
        created.patient.id,
        'national_id',
        'abc123',
        null,
      );
      expect(dup.outcome).toBe('duplicate');
    });

    it('allows the same NationalID in different tenants', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      await prisma.tenant.create({
        data: {
          id: tenant2.id,
          slug: tenant2.slug,
          displayName: tenant2.displayName,
        },
      });
      const p1 = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-ID-003',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      const p2 = await patientRepo.register({
        tenantId: tenant2.id,
        medicalRecordNumber: 'MRN-ID-004',
        demographics: {
          legalGivenName: 'C',
          legalFamilyName: 'D',
          dateOfBirth: '1990-01-01',
          sex: 'female',
        },
      });
      if (p1.outcome !== 'registered' || p2.outcome !== 'registered') return;

      const r1 = await identifierRepo.add(
        tenant1.id,
        p1.patient.id,
        'national_id',
        'SAME123',
        null,
      );
      const r2 = await identifierRepo.add(
        tenant2.id,
        p2.patient.id,
        'national_id',
        'SAME123',
        null,
      );
      expect(r1.outcome).toBe('added');
      expect(r2.outcome).toBe('added');
    });

    it('lists identifiers for a patient within tenant', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-ID-005',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      await identifierRepo.add(
        tenant1.id,
        created.patient.id,
        'national_id',
        'N1',
        null,
      );
      await identifierRepo.add(
        tenant1.id,
        created.patient.id,
        'passport',
        'P1',
        'US',
      );

      const list = await identifierRepo.listForPatient(
        tenant1.id,
        created.patient.id,
      );
      expect(list).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // CONSENT
  // -------------------------------------------------------------------------

  describe('PatientConsentRepository', () => {
    it('grants an indefinite treatment consent', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CON-001',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const result = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      expect(result.outcome).toBe('granted');
      if (result.outcome !== 'granted') return;
      expect(result.consent.status).toBe('granted');
      expect(result.consent.consentType).toBe('treatment');
      expect(result.consent.duration).toBe('indefinite');
      expect(result.consent.expiresAt).toBeNull();
    });

    it('persists an adult (self) consent with null guardian fields', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CON-ADULT-001',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const result = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
        // An adult grants self-consent: guardian fields are null.
        guardianName: null,
        guardianRelationship: null,
        guardianCaptureMethod: null,
      });
      expect(result.outcome).toBe('granted');
      if (result.outcome !== 'granted') return;
      expect(result.consent.guardianName).toBeNull();
      expect(result.consent.guardianRelationship).toBeNull();
      expect(result.consent.guardianCaptureMethod).toBeNull();
    });

    it('persists a minor consent with guardian authorization fields', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CON-MINOR-001',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '2020-01-01',
          sex: 'female',
        },
      });
      if (created.outcome !== 'registered') return;

      const result = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
        // A minor requires guardian authorization: all three guardian
        // fields are supplied and persisted.
        guardianName: 'Guardian Name',
        guardianRelationship: 'parent',
        guardianCaptureMethod: 'in_person',
      });
      expect(result.outcome).toBe('granted');
      if (result.outcome !== 'granted') return;
      expect(result.consent.guardianName).toBe('Guardian Name');
      expect(result.consent.guardianRelationship).toBe('parent');
      expect(result.consent.guardianCaptureMethod).toBe('in_person');
    });

    it('rejects a second active treatment consent (one-active invariant)', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CON-002',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      const dup = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      expect(dup.outcome).toBe('duplicate_active_consent');
    });

    it('withdraws a granted consent', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CON-003',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const granted = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      if (granted.outcome !== 'granted') return;

      const withdrawn = await consentRepo.withdraw(
        tenant1.id,
        created.patient.id,
        granted.consent.id,
      );
      expect(withdrawn.outcome).toBe('withdrawn');
    });

    it('expired consent does not block re-consent (reconciliation-before-grant)', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CON-004',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      // Grant a fixed-term consent that expires in the past
      const pastExpiry = new Date(Date.now() - 60_000);
      const granted = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'fixed_term',
        expiresAt: pastExpiry,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      if (granted.outcome !== 'granted') return;

      // Re-consent should succeed (the expired granted row is reconciled
      // to expired before the new grant)
      const reConsent = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      expect(reConsent.outcome).toBe('granted');
    });

    it('retains consent history (no destructive delete)', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-CON-005',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const granted = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      if (granted.outcome !== 'granted') return;
      await consentRepo.withdraw(
        tenant1.id,
        created.patient.id,
        granted.consent.id,
      );

      const history = await consentRepo.listForPatient(
        tenant1.id,
        created.patient.id,
      );
      // The withdrawn consent is retained (no destructive delete)
      expect(history).toHaveLength(1);
      expect(history[0]!.status).toBe('withdrawn');
    });
  });

  // -------------------------------------------------------------------------
  // CONSENT VERIFICATION PORT
  // -------------------------------------------------------------------------

  describe('TreatmentConsentVerificationService', () => {
    it('returns granted when an active treatment consent exists', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-VER-001',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });

      const result = await consentVerification.verifyActiveTreatmentConsent(
        tenant1.id,
        created.patient.id,
        new Date(),
      );
      expect(result.status).toBe('granted');
    });

    it('returns not_granted when no consent exists', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-VER-002',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const result = await consentVerification.verifyActiveTreatmentConsent(
        tenant1.id,
        created.patient.id,
        new Date(),
      );
      expect(result.status).toBe('not_granted');
    });

    it('returns expired when the consent is past its expiresAt', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-VER-003',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'fixed_term',
        expiresAt: new Date(Date.now() - 60_000),
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });

      const result = await consentVerification.verifyActiveTreatmentConsent(
        tenant1.id,
        created.patient.id,
        new Date(),
      );
      expect(result.status).toBe('expired');
    });

    it('returns withdrawn when the consent was withdrawn', async () => {
      await prisma.tenant.create({
        data: {
          id: tenant1.id,
          slug: tenant1.slug,
          displayName: tenant1.displayName,
        },
      });
      const created = await patientRepo.register({
        tenantId: tenant1.id,
        medicalRecordNumber: 'MRN-VER-004',
        demographics: {
          legalGivenName: 'A',
          legalFamilyName: 'B',
          dateOfBirth: '1990-01-01',
          sex: 'male',
        },
      });
      if (created.outcome !== 'registered') return;

      const granted = await consentRepo.grant(tenant1.id, {
        patientId: created.patient.id,
        scope: 'general',
        duration: 'indefinite',
        expiresAt: null,
        capturedBy: '00000000-0000-0000-0000-000000000099',
        captureMethod: 'in_person',
        policyVersion: 'v1.0',
      });
      if (granted.outcome !== 'granted') return;
      await consentRepo.withdraw(
        tenant1.id,
        created.patient.id,
        granted.consent.id,
      );

      const result = await consentVerification.verifyActiveTreatmentConsent(
        tenant1.id,
        created.patient.id,
        new Date(),
      );
      expect(result.status).toBe('withdrawn');
    });
  });
});
