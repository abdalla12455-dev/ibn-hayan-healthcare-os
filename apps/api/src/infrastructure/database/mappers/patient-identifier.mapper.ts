import type {
  PatientIdentifier,
  PatientIdentifierId,
  PatientIdentifierType,
  PatientId,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  PatientIdentifier as PrismaPatientIdentifier,
  PatientIdentifierType as PrismaPatientIdentifierType,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `PatientIdentifier` row type and the
 * framework-independent `PatientIdentifier` domain type.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested. The
 * Prisma enum values are lowercase and map 1:1 to the domain union types.
 */

export function patientIdentifierFromPrisma(
  row: PrismaPatientIdentifier,
): PatientIdentifier {
  return {
    id: row.id as PatientIdentifierId,
    tenantId: row.tenantId as TenantId,
    patientId: row.patientId as PatientId,
    type: row.type as PatientIdentifierType,
    normalizedValue: row.normalizedValue,
    issuingCountry: row.issuingCountry,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Re-export the Prisma identifier-type enum for the repository to use in
 * `where` clauses without importing the generated client directly.
 */
export type { PrismaPatientIdentifierType };
