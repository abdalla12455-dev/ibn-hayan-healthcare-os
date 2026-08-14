import type {
  PatientConsent,
  PatientConsentId,
  PatientId,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  PatientConsent as PrismaPatientConsent,
  ConsentType as PrismaConsentType,
  ConsentStatus as PrismaConsentStatus,
  ConsentScope as PrismaConsentScope,
  ConsentDuration as PrismaConsentDuration,
  ConsentCaptureMethod as PrismaConsentCaptureMethod,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `PatientConsent` row type and the
 * framework-independent `PatientConsent` domain type.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested. The
 * Prisma enum values are lowercase and map 1:1 to the domain union types.
 */

export function patientConsentFromPrisma(
  row: PrismaPatientConsent,
): PatientConsent {
  return {
    id: row.id as PatientConsentId,
    tenantId: row.tenantId as TenantId,
    patientId: row.patientId as PatientId,
    consentType: row.consentType,
    status: row.status,
    scope: row.scope,
    duration: row.duration,
    grantedAt: row.grantedAt,
    withdrawnAt: row.withdrawnAt,
    expiresAt: row.expiresAt,
    capturedBy: row.capturedBy,
    captureMethod: row.captureMethod,
    policyVersion: row.policyVersion,
    guardianName: row.guardianName,
    guardianRelationship: row.guardianRelationship,
    guardianCaptureMethod:
      row.guardianCaptureMethod === null ? null : row.guardianCaptureMethod,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type {
  PrismaConsentType,
  PrismaConsentStatus,
  PrismaConsentScope,
  PrismaConsentDuration,
  PrismaConsentCaptureMethod,
};
