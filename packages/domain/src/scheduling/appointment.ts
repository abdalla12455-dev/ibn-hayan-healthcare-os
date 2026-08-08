/**
 * Appointment domain model.
 *
 * An Appointment is the operational scheduling record for a patient
 * encounter at a facility. It is owned by the Scheduling bounded
 * context (BC06) and is the persistence foundation for the R09
 * Clinic Administrator "Today's Appointments" read-only feature.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';

/**
 * Stable identifier for an Appointment. Branded so it cannot be
 * confused with other IDs at the type level.
 */
export type AppointmentId = string & { readonly __brand: 'AppointmentId' };

/**
 * Stable identifier for a Patient. This is a logical identifier that
 * references the Patient bounded context (BC01). The Patient module
 * owns the patient identity; this type is a reference only.
 */
export type PatientId = string & { readonly __brand: 'PatientId' };

/**
 * Stable identifier for a Provider (doctor, clinician, or other
 * clinical staff). This is a logical identifier that references the
 * Workforce bounded context (BC10). The Workforce module owns the
 * provider identity; this type is a reference only.
 */
export type ProviderId = string & { readonly __brand: 'ProviderId' };

/**
 * Canonical appointment lifecycle statuses as defined in
 * download/docs/07_MODULES/APPOINTMENTS.md Section 1.
 */
export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

/**
 * The canonical Appointment domain model. A readonly snapshot of an
 * appointment's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as AppointmentId.
 * - `tenantId`: the Tenant that owns this Appointment.
 * - `organisationId`: the Organisation that owns this Appointment.
 * - `facilityId`: the Facility where this Appointment occurs.
 * - `patientId`: logical patient identifier (no FK to Patient module).
 * - `providerId`: logical provider identifier (no FK to Workforce module).
 * - `scheduledStart`: the appointment's scheduled start time in UTC.
 * - `scheduledEnd`: the appointment's scheduled end time in UTC.
 * - `status`: current lifecycle status.
 * - `typeCode`: the appointment type code (e.g. 'consultation',
 *   'follow-up', 'procedure').
 * - `createdAt`: timestamp set by persistence layer.
 * - `updatedAt`: timestamp updated by persistence layer.
 */
export interface Appointment {
  readonly id: AppointmentId;
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId;
  readonly facilityId: FacilityId;
  readonly patientId: PatientId;
  readonly providerId: ProviderId;
  readonly scheduledStart: Date;
  readonly scheduledEnd: Date;
  readonly status: AppointmentStatus;
  readonly typeCode: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Read projection for the "Today's Appointments" query.
 *
 * This projection contains ONLY the fields required for the read contract.
 * It is NOT the full Appointment aggregate. Fields that are only needed
 * for write operations (tenantId, organisationId, facilityId, createdAt,
 * updatedAt) are excluded to avoid fabricating values.
 *
 * Used by:
 * - `AppointmentRepository.findByScheduledStartRange()` return type
 * - `PrismaAppointmentRepository` mapper input type
 */
export interface AppointmentReadProjection {
  readonly id: AppointmentId;
  readonly patientId: PatientId;
  readonly providerId: ProviderId;
  readonly scheduledStart: Date;
  readonly scheduledEnd: Date;
  readonly status: AppointmentStatus;
  readonly typeCode: string;
}

/**
 * Input type for creating a new appointment.
 *
 * All scope (tenantId, organisationId, facilityId) is derived from
 * the authenticated session context, NOT from the request body.
 * The caller supplies only the patient, provider, timing, and type.
 *
 * Per the Stage 1C specification:
 * - `patientId`: the patient for the appointment. Must exist in the
 *   authenticated tenant.
 * - `providerId`: the provider for the appointment. Must exist in the
 *   authenticated tenant.
 * - `scheduledStart`: the appointment start time in UTC.
 * - `scheduledEnd`: the appointment end time in UTC. Must be after
 *   scheduledStart.
 * - `typeCode`: the appointment type code (e.g. 'consultation',
 *   'follow-up', 'procedure').
 */
export interface AppointmentCreateInput {
  readonly patientId: PatientId;
  readonly providerId: ProviderId;
  readonly scheduledStart: Date;
  readonly scheduledEnd: Date;
  readonly typeCode: string;
}

/**
 * Result of a successful appointment creation.
 *
 * Contains the created appointment's persistent state.
 */
export interface AppointmentCreated {
  readonly appointment: Appointment;
}
