import type {
  Appointment,
  AppointmentId,
  AppointmentStatus,
  FacilityId,
  OrganisationId,
  PatientId,
  ProviderId,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  Appointment as PrismaAppointment,
  AppointmentStatus as PrismaAppointmentStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `Appointment` row type and the
 * framework-independent `Appointment` domain type.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 */

function prismaStatusToDomain(
  status: PrismaAppointmentStatus,
): AppointmentStatus {
  return status;
}

export function appointmentFromPrisma(row: PrismaAppointment): Appointment {
  return {
    id: row.id as AppointmentId,
    tenantId: row.tenantId as TenantId,
    organisationId: row.organisationId as OrganisationId,
    facilityId: row.facilityId as FacilityId,
    patientId: row.patientId as PatientId,
    providerId: row.providerId as ProviderId,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    status: prismaStatusToDomain(row.status),
    typeCode: row.typeCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
