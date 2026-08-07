import type {
  Patient,
  PatientId,
  PatientLifecycleStatus,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  Patient as PrismaPatient,
  PatientStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `Patient` row type and the
 * framework-independent `Patient` domain type.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 */

function prismaStatusToDomain(status: PatientStatus): PatientLifecycleStatus {
  return status;
}

export function patientFromPrisma(row: PrismaPatient): Patient {
  return {
    id: row.id as PatientId,
    tenantId: row.tenantId as TenantId,
    medicalRecordNumber: row.medicalRecordNumber,
    status: prismaStatusToDomain(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
