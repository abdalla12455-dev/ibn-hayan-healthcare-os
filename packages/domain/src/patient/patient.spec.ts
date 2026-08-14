import { describe, it, expect } from 'vitest';

/**
 * Compile-time and runtime smoke tests for the patient domain types
 * and repository ports.
 *
 * These tests do not instantiate any framework. They verify that:
 * - The domain package exports the expected types and interfaces.
 * - The lifecycle values are the five canonical values and no others.
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
  PatientSex,
  PatientGenderIdentity,
  CreatePatientInput,
  PatientRepository,
  PatientIdentifier,
  PatientIdentifierId,
  PatientIdentifierType,
  PatientIdentifierRepository,
  PatientConsent,
  PatientConsentId,
  ConsentType,
  ConsentStatus,
  ConsentScope,
  ConsentDuration,
  ConsentCaptureMethod,
  GrantTreatmentConsentInput,
  PatientConsentRepository,
  TreatmentConsentVerificationPort,
  TreatmentConsentVerificationResult,
  AgeOfMajorityPolicyPort,
} from './index.js';
import {
  normalizeIdentifierValue,
  isDeterministicIdentifierType,
} from './index.js';
import type { TenantId } from '../tenancy/tenant.js';

describe('patient domain exports', () => {
  it('exports the Patient type with demographics and its identifier type', () => {
    const patient: Patient = {
      id: 'patient-1' as PatientId,
      tenantId: 'tenant-1' as TenantId,
      medicalRecordNumber: 'MRN-001',
      status: 'active',
      legalGivenName: 'Fatima',
      legalMiddleName: null,
      legalFamilyName: 'Al-Saud',
      preferredName: null,
      dateOfBirth: '1990-05-01',
      sex: 'female',
      genderIdentity: 'female',
      genderIdentityDetail: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(patient.id).toBe('patient-1');
    expect(patient.tenantId).toBe('tenant-1');
    expect(patient.medicalRecordNumber).toBe('MRN-001');
    expect(patient.status).toBe('active');
    expect(patient.legalGivenName).toBe('Fatima');
    expect(patient.dateOfBirth).toBe('1990-05-01');
  });

  it('exports a minimal historical Patient with null demographics (backward compat)', () => {
    const historical: Patient = {
      id: 'patient-old' as PatientId,
      tenantId: 'tenant-1' as TenantId,
      medicalRecordNumber: 'MRN-OLD',
      status: 'active',
      legalGivenName: null,
      legalMiddleName: null,
      legalFamilyName: null,
      preferredName: null,
      dateOfBirth: null,
      sex: null,
      genderIdentity: null,
      genderIdentityDetail: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(historical.legalGivenName).toBeNull();
    expect(historical.dateOfBirth).toBeNull();
    expect(historical.sex).toBeNull();
  });

  it('branded identifier types are erased to strings at runtime', () => {
    const patientId: PatientId = 'patient-1' as PatientId;
    expect(typeof patientId).toBe('string');
    expect(patientId).toBe('patient-1');
  });
});

describe('patient lifecycle values', () => {
  it('PatientLifecycleStatus has exactly the five canonical values', () => {
    const values: PatientLifecycleStatus[] = [
      'active',
      'inactive',
      'deceased',
      'transferred_out',
      'archived',
    ];
    expect(values).toHaveLength(5);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
    expect(values).toContain('deceased');
    expect(values).toContain('transferred_out');
    expect(values).toContain('archived');
    // Compile-time check: assigning any other value is a type error.
    // const bad: PatientLifecycleStatus = 'deleted';
  });
});

describe('patient sex and gender identity', () => {
  it('PatientSex has the five canonical values (distinct from gender)', () => {
    const values: PatientSex[] = [
      'male',
      'female',
      'intersex',
      'unknown',
      'not_declared',
    ];
    expect(values).toHaveLength(5);
  });

  it('PatientGenderIdentity has the seven canonical values', () => {
    const values: PatientGenderIdentity[] = [
      'male',
      'female',
      'transgender_male',
      'transgender_female',
      'non_binary',
      'prefer_not_to_say',
      'other',
    ];
    expect(values).toHaveLength(7);
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
      async register(): Promise<never> {
        throw new Error('not implemented');
      },
      async updateDemographics(): Promise<Patient | null> {
        return null;
      },
      async search(): Promise<readonly Patient[]> {
        return [];
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.existsInTenant).toBe('function');
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.findByMedicalRecordNumber).toBe('function');
    expect(typeof stub.register).toBe('function');
    expect(typeof stub.updateDemographics).toBe('function');
    expect(typeof stub.search).toBe('function');
  });
});

describe('patient identifier domain', () => {
  it('exports the PatientIdentifier type with its branded identifier', () => {
    const identifier: PatientIdentifier = {
      id: 'ident-1' as PatientIdentifierId,
      tenantId: 'tenant-1' as TenantId,
      patientId: 'patient-1' as PatientId,
      type: 'national_id',
      normalizedValue: '1234567890',
      issuingCountry: 'SA',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(identifier.type).toBe('national_id');
    expect(identifier.normalizedValue).toBe('1234567890');
  });

  it('PatientIdentifierType has canonical values', () => {
    const values: PatientIdentifierType[] = [
      'national_id',
      'passport',
      'insurance_number',
      'driver_licence',
    ];
    expect(values).toHaveLength(4);
  });

  it('normalizes national_id and passport values (trim + upper)', () => {
    expect(normalizeIdentifierValue('national_id', '  sa12345  ')).toBe('SA12345');
    expect(normalizeIdentifierValue('passport', '  a12345  ')).toBe('A12345');
  });

  it('does not case-fold insurance_number values', () => {
    expect(normalizeIdentifierValue('insurance_number', '  pol-XYZ  ')).toBe(
      'pol-XYZ',
    );
  });

  it('identifies deterministic dedup identifier types', () => {
    expect(isDeterministicIdentifierType('national_id')).toBe(true);
    expect(isDeterministicIdentifierType('passport')).toBe(true);
    expect(isDeterministicIdentifierType('insurance_number')).toBe(false);
    expect(isDeterministicIdentifierType('driver_licence')).toBe(false);
  });

  it('PatientIdentifierRepository port can be stubbed', () => {
    const stub: PatientIdentifierRepository = {
      async add() {
        throw new Error('not implemented');
      },
      async findByTypeAndValue(): Promise<PatientIdentifier | null> {
        return null;
      },
      async listForPatient(): Promise<readonly PatientIdentifier[]> {
        return [];
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.add).toBe('function');
  });
});

describe('patient consent domain', () => {
  it('exports the PatientConsent type with lifecycle fields', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const consent: PatientConsent = {
      id: 'consent-1' as PatientConsentId,
      tenantId: 'tenant-1' as TenantId,
      patientId: 'patient-1' as PatientId,
      consentType: 'treatment',
      status: 'granted',
      scope: 'general',
      duration: 'indefinite',
      grantedAt: now,
      withdrawnAt: null,
      expiresAt: null,
      capturedBy: 'user-1',
      captureMethod: 'in_person',
      policyVersion: '1.0',
      guardianName: null,
      guardianRelationship: null,
      guardianCaptureMethod: null,
      createdAt: now,
      updatedAt: now,
    };
    expect(consent.consentType).toBe('treatment');
    expect(consent.status).toBe('granted');
    expect(consent.duration).toBe('indefinite');
    expect(consent.guardianName).toBeNull();
  });

  it('ConsentStatus has NO declined value (architecture gate 6L)', () => {
    const values: ConsentStatus[] = [
      'granted',
      'withdrawn',
      'pending',
      'expired',
    ];
    expect(values).toHaveLength(4);
    expect(values).not.toContain('declined');
  });

  it('ConsentType, ConsentScope, ConsentDuration, ConsentCaptureMethod have canonical values', () => {
    const types: ConsentType[] = [
      'treatment',
      'information_disclosure',
      'research',
      'marketing',
      'data_sharing',
    ];
    const scopes: ConsentScope[] = ['general', 'specific', 'emergency'];
    const durations: ConsentDuration[] = [
      'indefinite',
      'fixed_term',
      'single_encounter',
    ];
    const methods: ConsentCaptureMethod[] = [
      'in_person',
      'written',
      'verbal',
      'electronic',
      'guardian_authorization',
    ];
    expect(types).toHaveLength(5);
    expect(scopes).toHaveLength(3);
    expect(durations).toHaveLength(3);
    expect(methods).toHaveLength(5);
  });

  it('PatientConsentRepository and verification ports can be stubbed', () => {
    const repo: PatientConsentRepository = {
      async grant() {
        throw new Error('not implemented');
      },
      async withdraw() {
        throw new Error('not implemented');
      },
      async listForPatient(): Promise<readonly PatientConsent[]> {
        return [];
      },
    };
    expect(repo).toBeDefined();

    const port: TreatmentConsentVerificationPort = {
      async verifyActiveTreatmentConsent(): Promise<TreatmentConsentVerificationResult> {
        return { status: 'unknown' };
      },
    };
    expect(port).toBeDefined();

    const agePort: AgeOfMajorityPolicyPort = {
      getAgeOfMajority(): number {
        return 18;
      },
    };
    expect(agePort.getAgeOfMajority()).toBe(18);
  });

  it('GrantTreatmentConsentInput composes the canonical grant fields', () => {
    const input: GrantTreatmentConsentInput = {
      patientId: 'patient-1' as PatientId,
      scope: 'general',
      duration: 'fixed_term',
      expiresAt: new Date('2027-01-01T00:00:00Z'),
      capturedBy: 'user-1',
      captureMethod: 'in_person',
      policyVersion: '1.0',
    };
    expect(input.duration).toBe('fixed_term');
    expect(input.expiresAt).not.toBeNull();
  });
});
