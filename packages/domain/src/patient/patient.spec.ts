import { describe, it, expect } from 'vitest';

/**
 * Compile-time and runtime smoke tests for the patient domain types
 * and repository ports.
 *
 * These tests do not instantiate any framework. They verify that:
 * - The domain package exports the expected types and interfaces.
 * - The lifecycle values are the three ratified values and no others.
 * - The branded identifier types are erased to strings at runtime.
 * - A no-op repository implementation can be assembled against the
 *   ports without importing any framework. This is the structural
 *   proof that the ports remain framework-independent.
 *
 * The persistence adapter (in apps/api) implements these ports
 * against Prisma. The adapter is tested separately by the database
 * integration tests under `apps/api/test/database/`.
 */

import type {
  Patient,
  PatientId,
  PatientLifecycleStatus,
  CreatePatientInput,
  PatientRepository,
} from './index.js';
import type { TenantId } from '../tenancy/tenant.js';

describe('patient domain exports', () => {
  it('exports the Patient type and its identifier type', () => {
    const patient: Patient = {
      id: 'patient-1' as PatientId,
      tenantId: 'tenant-1' as TenantId,
      medicalRecordNumber: 'MRN-001',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(patient.id).toBe('patient-1');
    expect(patient.tenantId).toBe('tenant-1');
    expect(patient.medicalRecordNumber).toBe('MRN-001');
    expect(patient.status).toBe('active');
  });

  it('branded identifier types are erased to strings at runtime', () => {
    const patientId: PatientId = 'patient-1' as PatientId;
    expect(typeof patientId).toBe('string');
    expect(patientId).toBe('patient-1');
  });
});

describe('patient lifecycle values', () => {
  it('PatientLifecycleStatus has exactly the three ratified values', () => {
    const values: PatientLifecycleStatus[] = ['active', 'inactive', 'archived'];
    expect(values).toHaveLength(3);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
    expect(values).toContain('archived');
    // Compile-time check: assigning any other value is a type error.
    // The line below would not compile if uncommented:
    // const bad: PatientLifecycleStatus = 'deleted';
  });
});

describe('patient create inputs', () => {
  it('CreatePatientInput requires tenantId and medicalRecordNumber; status is optional', () => {
    const minimal: CreatePatientInput = {
      tenantId: 'tenant-1' as TenantId,
      medicalRecordNumber: 'MRN-001',
    };
    expect(minimal.tenantId).toBe('tenant-1');
    expect(minimal.medicalRecordNumber).toBe('MRN-001');
    expect(minimal.status).toBeUndefined();

    const withStatus: CreatePatientInput = {
      tenantId: 'tenant-1' as TenantId,
      medicalRecordNumber: 'MRN-002',
      status: 'inactive',
    };
    expect(withStatus.status).toBe('inactive');
  });
});

describe('patient repository ports', () => {
  it('PatientRepository port can be implemented without any framework import', () => {
    const stub: PatientRepository = {
      async existsInTenant(_tenantId: string, _patientId: string): Promise<boolean> {
        return false;
      },
      async findById(_tenantId: string, _patientId: string): Promise<Patient | null> {
        return null;
      },
      async findByMedicalRecordNumber(
        _tenantId: string,
        _medicalRecordNumber: string,
      ): Promise<Patient | null> {
        return null;
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.existsInTenant).toBe('function');
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.findByMedicalRecordNumber).toBe('function');
  });

  it('existsInTenant takes (tenantId, patientId) — tenant scope is required', () => {
    const stub: PatientRepository = {
      async existsInTenant(tenantId: string, patientId: string): Promise<boolean> {
        expect(typeof tenantId).toBe('string');
        expect(typeof patientId).toBe('string');
        return false;
      },
      async findById(): Promise<Patient | null> {
        return null;
      },
      async findByMedicalRecordNumber(): Promise<Patient | null> {
        return null;
      },
    };
    expect(stub.existsInTenant).toBeDefined();
  });

  it('findById takes (tenantId, patientId) — no unscoped lookup exists', () => {
    const stub: PatientRepository = {
      async existsInTenant(): Promise<boolean> {
        return false;
      },
      async findById(tenantId: string, patientId: string): Promise<Patient | null> {
        expect(typeof tenantId).toBe('string');
        expect(typeof patientId).toBe('string');
        return null;
      },
      async findByMedicalRecordNumber(): Promise<Patient | null> {
        return null;
      },
    };
    expect(stub.findById).toBeDefined();
  });

  it('findByMedicalRecordNumber takes (tenantId, medicalRecordNumber)', () => {
    const stub: PatientRepository = {
      async existsInTenant(): Promise<boolean> {
        return false;
      },
      async findById(): Promise<Patient | null> {
        return null;
      },
      async findByMedicalRecordNumber(
        tenantId: string,
        medicalRecordNumber: string,
      ): Promise<Patient | null> {
        expect(typeof tenantId).toBe('string');
        expect(typeof medicalRecordNumber).toBe('string');
        return null;
      },
    };
    expect(stub.findByMedicalRecordNumber).toBeDefined();
  });
});
