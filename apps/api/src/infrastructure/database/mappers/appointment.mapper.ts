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
 *
 * The input type accepts the full Prisma row (for general queries) or
 * a partial row with only selected fields (for optimized read queries).
 */

/** Input type: subset of Appointment fields that can come from a SELECT clause */
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

export function appointmentFromPrisma(row: AppointmentRowInput): Appointment {
  return {
    id: row.id as AppointmentId,
    tenantId: undefined as unknown as TenantId,
    organisationId: undefined as unknown as OrganisationId,
    facilityId: undefined as unknown as FacilityId,
    patientId: row.patientId as PatientId,
    providerId: row.providerId as ProviderId,
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    status: prismaStatusToDomain(row.status),
    typeCode: row.typeCode,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
