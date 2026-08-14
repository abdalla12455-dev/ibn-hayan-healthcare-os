import type {
  Patient,
  PatientIdentifier,
  PatientConsent,
} from '@ibn-hayan/domain';
import type {
  PatientResponse,
  PatientIdentifierResponse,
  PatientConsentResponse,
} from '@ibn-hayan/contracts';

/**
 * Maps the framework-independent domain types to the transport-layer
 * contract response types for the Patients module.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested. The
 * domain types are the source of truth; the contract types are the
 * wire shape. The mapper is pure (no side effects, no I/O).
 *
 * Per architecture gate 21 (audit) and 22 (privacy), the response
 * mappers carry only the canonical response fields. Sensitive
 * identifier values are exposed ONLY in the identifier response
 * (the caller is authorized with `patients:manage_identifiers`); they
 * are NEVER present in the patient search response (minimum-necessary
 * output).
 */

function toIsoDate(dob: string | null): string | null {
  // The Patient domain stores dateOfBirth as an ISO 8601 calendar date
  // string (YYYY-MM-DD) or null. The response carries it as-is.
  return dob;
}

export function patientToResponse(patient: Patient): PatientResponse {
  return {
    id: patient.id,
    medicalRecordNumber: patient.medicalRecordNumber,
    status: patient.status,
    legalGivenName: patient.legalGivenName,
    legalMiddleName: patient.legalMiddleName,
    legalFamilyName: patient.legalFamilyName,
    preferredName: patient.preferredName,
    dateOfBirth: toIsoDate(patient.dateOfBirth),
    sex: patient.sex,
    genderIdentity: patient.genderIdentity,
    genderIdentityDetail: patient.genderIdentityDetail,
  };
}

export function patientIdentifierToResponse(
  identifier: PatientIdentifier,
): PatientIdentifierResponse {
  return {
    id: identifier.id,
    patientId: identifier.patientId,
    type: identifier.type,
    normalizedValue: identifier.normalizedValue,
    issuingCountry: identifier.issuingCountry,
    createdAt: identifier.createdAt.toISOString(),
    updatedAt: identifier.updatedAt.toISOString(),
  };
}

export function patientConsentToResponse(
  consent: PatientConsent,
): PatientConsentResponse {
  return {
    id: consent.id,
    patientId: consent.patientId,
    consentType: consent.consentType,
    status: consent.status,
    scope: consent.scope,
    duration: consent.duration,
    grantedAt: consent.grantedAt.toISOString(),
    withdrawnAt:
      consent.withdrawnAt === null ? null : consent.withdrawnAt.toISOString(),
    expiresAt:
      consent.expiresAt === null ? null : consent.expiresAt.toISOString(),
    capturedBy: consent.capturedBy,
    captureMethod: consent.captureMethod,
    policyVersion: consent.policyVersion,
    guardianName: consent.guardianName,
    guardianRelationship: consent.guardianRelationship,
    guardianCaptureMethod: consent.guardianCaptureMethod,
  };
}
