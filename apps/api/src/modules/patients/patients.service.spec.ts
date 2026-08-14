import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  Patient,
  PatientIdentifier,
  PatientConsent,
  Session,
  User,
  TenantMembership,
} from '@ibn-hayan/domain';
import { PatientsService } from './patients.service.js';
import type { AuditRequestContext } from '../auth/auth.service.js';

/**
 * Unit tests for the PatientsService (BC01 — Demographics / Registration /
 * Consent).
 *
 * These tests use hand-written mock repositories to verify the service's
 * orchestration logic:
 * - tenant context derivation from the authenticated session (no caller
 *   tenantId/status/actorId override)
 * - deterministic duplicate mapping (MRN, identifier)
 * - minor/guardian policy via the AgeOfMajorityPolicyPort (NOT hard-coded)
 * - consent grant/withdraw outcome mapping
 * - audit emission (exactly once on success, no PHI in metadata)
 * - tenant isolation (cross-tenant returns not-found, no existence leak)
 *
 * The concurrency-safe SERIALIZABLE transaction behaviour is verified by
 * the PostgreSQL integration tests (CI), not here.
 */

const TENANT_ID = '00000000-0000-0000-0000-000000000001' as never;
const PATIENT_ID = '00000000-0000-0000-0000-000000000010' as never;
const CONSENT_ID = '00000000-0000-0000-0000-000000000020' as never;
const USER_ID = '00000000-0000-0000-0000-000000000099' as never;
const SESSION_ID = '00000000-0000-0000-0000-000000000098' as never;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as never;
const FACILITY_ID = '00000000-0000-0000-0000-000000000003' as never;

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: PATIENT_ID,
    tenantId: TENANT_ID,
    medicalRecordNumber: 'MRN-001',
    status: 'active',
    legalGivenName: 'Ahmad',
    legalMiddleName: null,
    legalFamilyName: 'Hassan',
    preferredName: null,
    dateOfBirth: '1990-01-01',
    sex: 'male',
    genderIdentity: 'male',
    genderIdentityDetail: null,
    createdAt: new Date('2026-08-11T00:00:00Z'),
    updatedAt: new Date('2026-08-11T00:00:00Z'),
    ...overrides,
  };
}

function makeConsent(overrides: Partial<PatientConsent> = {}): PatientConsent {
  return {
    id: CONSENT_ID,
    tenantId: TENANT_ID,
    patientId: PATIENT_ID,
    consentType: 'treatment',
    status: 'granted',
    scope: 'general',
    duration: 'indefinite',
    grantedAt: new Date('2026-08-11T00:00:00Z'),
    withdrawnAt: null,
    expiresAt: null,
    capturedBy: USER_ID,
    captureMethod: 'in_person',
    policyVersion: 'v1.0',
    guardianName: null,
    guardianRelationship: null,
    guardianCaptureMethod: null,
    createdAt: new Date('2026-08-11T00:00:00Z'),
    updatedAt: new Date('2026-08-11T00:00:00Z'),
    ...overrides,
  };
}

function makeAuthResult() {
  const session: Session = {
    id: SESSION_ID,
    activeTenantMembershipId: 'membership-1',
    activeOrganisationId: ORG_ID,
    activeFacilityId: FACILITY_ID,
  } as unknown as Session;
  const user: User = { id: USER_ID } as unknown as User;
  const membership: TenantMembership = {
    id: 'membership-1',
    tenantId: TENANT_ID,
    status: 'active',
  } as unknown as TenantMembership;
  return {
    session,
    user,
    memberships: [membership],
    expiresAt: new Date(),
    rotatedRawToken: null,
  };
}

const auditContext: AuditRequestContext = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  ipAddress: '127.0.0.1',
  userAgent: 'test',
};

function makeMocks(ageOfMajority = 18) {
  const patientsMock = {
    existsInTenant: vi.fn().mockResolvedValue(true),
    findById: vi.fn().mockResolvedValue(makePatient()),
    findByMedicalRecordNumber: vi.fn().mockResolvedValue(null),
    register: vi.fn().mockResolvedValue({
      outcome: 'registered',
      patient: makePatient(),
      transitioned: true as const,
    }),
    updateDemographics: vi.fn().mockResolvedValue(makePatient()),
    search: vi.fn().mockResolvedValue([]),
  };
  const identifiersMock = {
    add: vi.fn().mockResolvedValue({
      outcome: 'added',
      identifier: {
        id: 'id-1',
        tenantId: TENANT_ID,
        patientId: PATIENT_ID,
        type: 'national_id',
        value: '1234567890',
        normalizedValue: '1234567890',
        issuingCountry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PatientIdentifier,
    }),
    findByTypeAndValue: vi.fn().mockResolvedValue(null),
    listForPatient: vi.fn().mockResolvedValue([]),
  };
  const consentsMock = {
    grant: vi.fn().mockResolvedValue({
      outcome: 'granted',
      consent: makeConsent(),
      transitioned: true as const,
    }),
    withdraw: vi.fn().mockResolvedValue({
      outcome: 'withdrawn',
      consent: makeConsent({ status: 'withdrawn' }),
      transitioned: true as const,
    }),
    listForPatient: vi.fn().mockResolvedValue([]),
  };
  const ageOfMajorityMock = {
    getAgeOfMajority: vi.fn().mockReturnValue(ageOfMajority),
  };
  const authServiceMock = {
    getSessionFromCookie: vi.fn().mockResolvedValue(makeAuthResult()),
  };
  const auditHelperMock = {
    emitDirect: vi.fn().mockResolvedValue(undefined),
  };
  const service = new PatientsService(
    patientsMock,
    identifiersMock,
    consentsMock,
    ageOfMajorityMock,
    authServiceMock as never,
    auditHelperMock as never,
  );
  return {
    service,
    patients: patientsMock,
    identifiers: identifiersMock,
    consents: consentsMock,
    ageOfMajority: ageOfMajorityMock,
    authService: authServiceMock,
    auditHelper: auditHelperMock,
  };
}

describe('PatientsService', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  // -------------------------------------------------------------------------
  // REGISTRATION
  // -------------------------------------------------------------------------

  describe('registerPatient', () => {
    it('registers a patient and derives tenantId from the session (no caller override)', async () => {
      const result = await mocks.service.registerPatient(
        {
          medicalRecordNumber: 'MRN-001',
          legalGivenName: 'Ahmad',
          legalFamilyName: 'Hassan',
          dateOfBirth: '1990-01-01',
          sex: 'male',
          genderIdentity: 'male',
        },
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      // The register input must use the session-derived tenantId, not a
      // caller-supplied value (the request has no tenantId field).
      expect(mocks.patients.register).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID }),
      );
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
    });

    it('returns null when the session is missing (401)', async () => {
      mocks.authService.getSessionFromCookie.mockResolvedValue(null);
      const result = await mocks.service.registerPatient(
        {
          medicalRecordNumber: 'MRN-001',
          legalGivenName: 'Ahmad',
          legalFamilyName: 'Hassan',
          dateOfBirth: '1990-01-01',
          sex: 'male',
          genderIdentity: 'prefer_not_to_say',
        },
        'cookie',
        auditContext,
      );
      expect(result).toBeNull();
      expect(mocks.patients.register).not.toHaveBeenCalled();
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('maps a duplicate MRN to the canonical error (no audit event)', async () => {
      mocks.patients.register.mockResolvedValue({
        outcome: 'duplicate_mrn',
        patient: makePatient(),
      });
      await expect(
        mocks.service.registerPatient(
          {
            medicalRecordNumber: 'MRN-DUP',
            legalGivenName: 'A',
            legalFamilyName: 'B',
            dateOfBirth: '1990-01-01',
            sex: 'male',
            genderIdentity: 'prefer_not_to_say',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_DUPLICATE_MRN' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('maps a duplicate identifier to the canonical error (no audit event)', async () => {
      mocks.patients.register.mockResolvedValue({
        outcome: 'duplicate_identifier',
        patient: makePatient(),
        identifierType: 'national_id',
      });
      await expect(
        mocks.service.registerPatient(
          {
            medicalRecordNumber: 'MRN-DUP-ID',
            legalGivenName: 'A',
            legalFamilyName: 'B',
            dateOfBirth: '1990-01-01',
            sex: 'male',
            genderIdentity: 'prefer_not_to_say',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_DUPLICATE_IDENTIFIER' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('emits audit with no PHI in metadata', async () => {
      await mocks.service.registerPatient(
        {
          medicalRecordNumber: 'MRN-001',
          legalGivenName: 'Ahmad',
          legalFamilyName: 'Hassan',
          dateOfBirth: '1990-01-01',
          sex: 'male',
          genderIdentity: 'prefer_not_to_say',
        },
        'cookie',
        auditContext,
      );
      const call = mocks.auditHelper.emitDirect.mock.calls[0]![0] as {
        metadata: Record<string, unknown>;
      };
      const metadataStr = JSON.stringify(call.metadata);
      // No names, DOB, or MRN value in the audit metadata.
      expect(metadataStr).not.toContain('Ahmad');
      expect(metadataStr).not.toContain('Hassan');
      expect(metadataStr).not.toContain('1990-01-01');
      expect(metadataStr).not.toContain('MRN-001');
    });
  });

  // -------------------------------------------------------------------------
  // DEMOGRAPHIC UPDATE
  // -------------------------------------------------------------------------

  describe('updateDemographics', () => {
    it('updates demographics and audits once', async () => {
      const result = await mocks.service.updateDemographics(
        PATIENT_ID,
        { legalGivenName: 'NewName' },
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      expect(mocks.patients.updateDemographics).toHaveBeenCalledWith(
        TENANT_ID,
        PATIENT_ID,
        expect.objectContaining({ legalGivenName: 'NewName' }),
      );
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
    });

    it('throws not-found when the patient does not exist in tenant', async () => {
      mocks.patients.updateDemographics.mockResolvedValue(null);
      await expect(
        mocks.service.updateDemographics(
          PATIENT_ID as string,
          { legalGivenName: 'X' },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_NOT_FOUND' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------------------------

  describe('searchPatients', () => {
    it('returns tenant-scoped search results and audits once', async () => {
      mocks.patients.search.mockResolvedValue([makePatient()]);
      const result = await mocks.service.searchPatients(
        { medicalRecordNumber: 'MRN-001' },
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      expect(result!.results).toHaveLength(1);
      expect(mocks.patients.search).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ medicalRecordNumber: 'MRN-001' }),
      );
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // IDENTIFIERS
  // -------------------------------------------------------------------------

  describe('addIdentifier', () => {
    it('adds an identifier and audits once', async () => {
      const result = await mocks.service.addIdentifier(
        PATIENT_ID,
        {
          type: 'national_id',
          value: '1234567890',
        },
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      expect(mocks.identifiers.add).toHaveBeenCalled();
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
    });

    it('maps a duplicate identifier to the canonical error (no audit)', async () => {
      mocks.identifiers.add.mockResolvedValue({
        outcome: 'duplicate',
        identifier: {
          id: 'id-1',
          tenantId: TENANT_ID,
          patientId: PATIENT_ID,
          type: 'national_id',
          value: '1234567890',
          normalizedValue: '1234567890',
          issuingCountry: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as PatientIdentifier,
      });
      await expect(
        mocks.service.addIdentifier(
          PATIENT_ID as string,
          { type: 'national_id', value: '1234567890' },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_DUPLICATE_IDENTIFIER' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // CONSENT
  // -------------------------------------------------------------------------

  describe('grantConsent', () => {
    it('grants an adult consent without guardian fields', async () => {
      const result = await mocks.service.grantConsent(
        PATIENT_ID,
        {
          consentType: 'treatment',
          scope: 'general',
          duration: 'indefinite',
          captureMethod: 'in_person',
          policyVersion: 'v1.0',
        },
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      expect(mocks.consents.grant).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          guardianName: null,
          guardianRelationship: null,
          guardianCaptureMethod: null,
        }),
      );
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
    });

    it('rejects guardian fields supplied for an adult patient (self-consent only)', async () => {
      // The default patient (DOB 1990-01-01) is an adult under the
      // default age-of-majority (18). Supplying guardian authorization
      // fields for an adult must be rejected, not silently discarded.
      await expect(
        mocks.service.grantConsent(
          PATIENT_ID,
          {
            consentType: 'treatment',
            scope: 'general',
            duration: 'indefinite',
            captureMethod: 'in_person',
            policyVersion: 'v1.0',
            guardianName: 'Guardian Name',
            guardianRelationship: 'parent',
            guardianCaptureMethod: 'in_person',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_GUARDIAN_FIELDS_FOR_ADULT' } },
      });
      // The grant must not proceed, and no audit event is emitted for
      // a rejected grant.
      expect(mocks.consents.grant).not.toHaveBeenCalled();
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('requires guardian authorization for a minor (age-of-majority from the policy port)', async () => {
      // A patient born recently → a minor under age of majority 18.
      mocks = makeMocks(18);
      mocks.patients.findById.mockResolvedValue(
        makePatient({ dateOfBirth: '2020-01-01' }),
      );
      await expect(
        mocks.service.grantConsent(
          PATIENT_ID as string,
          {
            consentType: 'treatment',
            scope: 'general',
            duration: 'indefinite',
            captureMethod: 'in_person',
            policyVersion: 'v1.0',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_MINOR_GUARDIAN_REQUIRED' } },
      });
      // The age-of-majority was resolved from the policy port, not hard-coded.
      expect(mocks.ageOfMajority.getAgeOfMajority).toHaveBeenCalled();
      expect(mocks.consents.grant).not.toHaveBeenCalled();
    });

    it('accepts guardian authorization for a minor', async () => {
      mocks = makeMocks(18);
      mocks.patients.findById.mockResolvedValue(
        makePatient({ dateOfBirth: '2020-01-01' }),
      );
      const result = await mocks.service.grantConsent(
        PATIENT_ID,
        {
          consentType: 'treatment',
          scope: 'general',
          duration: 'indefinite',
          captureMethod: 'in_person',
          policyVersion: 'v1.0',
          guardianName: 'Guardian Name',
          guardianRelationship: 'parent',
          guardianCaptureMethod: 'in_person',
        },
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      expect(mocks.consents.grant).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          guardianName: 'Guardian Name',
          guardianRelationship: 'parent',
        }),
      );
    });

    it('rejects consent when the patient has no DOB (minority cannot be determined, fail-safe)', async () => {
      mocks.patients.findById.mockResolvedValue(
        makePatient({ dateOfBirth: null }),
      );
      await expect(
        mocks.service.grantConsent(
          PATIENT_ID as string,
          {
            consentType: 'treatment',
            scope: 'general',
            duration: 'indefinite',
            captureMethod: 'in_person',
            policyVersion: 'v1.0',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_MINOR_GUARDIAN_REQUIRED' } },
      });
    });

    it('maps a duplicate active consent to the canonical error (no audit)', async () => {
      mocks.consents.grant.mockResolvedValue({
        outcome: 'duplicate_active_consent',
        consent: makeConsent(),
      });
      await expect(
        mocks.service.grantConsent(
          PATIENT_ID as string,
          {
            consentType: 'treatment',
            scope: 'general',
            duration: 'indefinite',
            captureMethod: 'in_person',
            policyVersion: 'v1.0',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_CONSENT_DUPLICATE' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('emits audit with no consent text or guardian name in metadata', async () => {
      mocks = makeMocks(18);
      mocks.patients.findById.mockResolvedValue(
        makePatient({ dateOfBirth: '2020-01-01' }),
      );
      await mocks.service.grantConsent(
        PATIENT_ID,
        {
          consentType: 'treatment',
          scope: 'general',
          duration: 'indefinite',
          captureMethod: 'in_person',
          policyVersion: 'v1.0',
          guardianName: 'SecretGuardian',
          guardianRelationship: 'parent',
          guardianCaptureMethod: 'in_person',
        },
        'cookie',
        auditContext,
      );
      const call = mocks.auditHelper.emitDirect.mock.calls[0]![0] as {
        metadata: Record<string, unknown>;
      };
      const metadataStr = JSON.stringify(call.metadata);
      // Guardian name is PII — must not appear in audit metadata.
      expect(metadataStr).not.toContain('SecretGuardian');
      expect(metadataStr).not.toContain('parent');
    });
  });

  describe('withdrawConsent', () => {
    it('withdraws a granted consent and audits once', async () => {
      const result = await mocks.service.withdrawConsent(
        PATIENT_ID,
        CONSENT_ID,
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      expect(mocks.consents.withdraw).toHaveBeenCalled();
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
    });

    it('maps a not-found consent to the canonical error (no existence leak)', async () => {
      mocks.consents.withdraw.mockResolvedValue({ outcome: 'not_found' });
      await expect(
        mocks.service.withdrawConsent(
          PATIENT_ID as string,
          CONSENT_ID as string,
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_CONSENT_NOT_FOUND' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('maps a non-granted consent to the canonical error', async () => {
      mocks.consents.withdraw.mockResolvedValue({ outcome: 'not_granted' });
      await expect(
        mocks.service.withdrawConsent(
          PATIENT_ID as string,
          CONSENT_ID as string,
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'PATIENT_CONSENT_NOT_GRANTED' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('does not audit an already-withdrawn idempotent no-op', async () => {
      mocks.consents.withdraw.mockResolvedValue({
        outcome: 'already_withdrawn',
        consent: makeConsent({ status: 'withdrawn' }),
      });
      const result = await mocks.service.withdrawConsent(
        PATIENT_ID,
        CONSENT_ID,
        'cookie',
        auditContext,
      );
      expect(result).not.toBeNull();
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });
  });
});
