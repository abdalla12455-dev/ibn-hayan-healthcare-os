import type {
  Appointment,
  AppointmentReadProjection,
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
 * framework-independent domain types.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 */

/** Input type: subset of Appointment fields from a SELECT clause */
export type AppointmentRowInput = Pick<
  PrismaAppointment,
  | 'id'
  | 'patientId'
  | 'providerId'
  | 'scheduledStart'
  | 'scheduledEnd'
  | 'status'
  | 'typeCode'
>;

function prismaStatusToDomain(
  status: PrismaAppointmentStatus,
): AppointmentStatus {
  return status;
}

/**
 * Maps a Prisma row to an AppointmentReadProjection.
 *
 * This is the mapper used by the PrismaAppointmentRepository for the
 * "Today's Appointments" read projection. It only maps the fields
 * required by the read contract and does NOT fabricate tenantId,
 * organisationId, facilityId, createdAt, or updatedAt.
 */
export function appointmentRowFromPrisma(
  row: AppointmentRowInput,
): AppointmentReadProjection {
  return {
    id: row.id as AppointmentId,
    patientId: row.patientId as PatientId,
    providerId: row.providerId as ProviderId,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    status: prismaStatusToDomain(row.status),
    typeCode: row.typeCode,
  };
}

/**
 * Maps a Prisma row to a full Appointment domain object.
 *
 * This is used when the complete Appointment aggregate is needed
 * (e.g., for detailed views or write operations that need all fields).
 */
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
