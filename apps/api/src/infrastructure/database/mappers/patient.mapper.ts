import type {
  Patient,
  PatientId,
  PatientLifecycleStatus,
  PatientSex,
  PatientGenderIdentity,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  Patient as PrismaPatient,
  PatientStatus,
  PatientSex as PrismaPatientSex,
  PatientGenderIdentity as PrismaPatientGenderIdentity,
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

function prismaSexToDomain(sex: PrismaPatientSex | null): PatientSex | null {
  return sex;
}

function prismaGenderToDomain(
  gender: PrismaPatientGenderIdentity | null,
): PatientGenderIdentity | null {
  return gender;
}

export function patientFromPrisma(row: PrismaPatient): Patient {
  return {
    id: row.id as PatientId,
    tenantId: row.tenantId as TenantId,
    medicalRecordNumber: row.medicalRecordNumber,
    status: prismaStatusToDomain(row.status),
    legalGivenName: row.legalGivenName,
    legalMiddleName: row.legalMiddleName,
    legalFamilyName: row.legalFamilyName,
    preferredName: row.preferredName,
    // Prisma maps DATE columns to Date objects. Convert to ISO calendar
    // date string (YYYY-MM-DD) for the domain model (architecture gate 6D:
    // exact DOB, no computed age, calendar-date semantics).
    dateOfBirth:
      row.dateOfBirth === null ? null : toIsoCalendarDate(row.dateOfBirth),
    sex: prismaSexToDomain(row.sex),
    genderIdentity: prismaGenderToDomain(row.genderIdentity),
    genderIdentityDetail: row.genderIdentityDetail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Convert a Date (from a Prisma DATE column) to an ISO 8601 calendar
 * date string (YYYY-MM-DD). The DATE column has no timezone; the Date
 * object Prisma produces is at UTC midnight. Formatting with
 * toISOString preserves the calendar date without timezone drift.
 */
function toIsoCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
