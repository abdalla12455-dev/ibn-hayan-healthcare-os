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

/**
 * The outcome of an appointment cancellation attempt.
 *
 * Per STATUS_CODES.md §4.1, `cancelled` is a terminal status
 * ("Terminal (or rebooked as new appointment)"). The canonical
 * appointment lifecycle permits cancellation from the `booked`
 * (Scheduled) source state. Per APPOINTMENTS.md §16.2, commands are
 * "idempotent where the operation supports idempotency"; re-cancelling
 * an already-cancelled appointment is therefore an idempotent no-op.
 *
 * The result is discriminated by `outcome`:
 *
 * - `not_found`: no appointment matches the supplied scoped identifiers.
 *   The caller MUST treat this identically to a nonexistent appointment
 *   (no cross-tenant/organisation/facility existence leak).
 * - `invalid_source_state`: the appointment exists in scope but is in a
 *   source state that is not canonically cancellable in this stage
 *   (only `booked` is cancellable). The appointment is returned so the
 *   service can map the error without a second read.
 * - `cancelled`: the appointment is now in the `cancelled` state. The
 *   `transitioned` flag is `true` when the appointment actually
 *   transitioned from `booked` to `cancelled` (the audit event MUST be
 *   emitted exactly once for this case). The `transitioned` flag is
 *   `false` when the appointment was already `cancelled` (idempotent
 *   re-cancellation; NO audit event is emitted and NO state mutation
 *   occurs).
 *
 * The repository performs the transition atomically within a
 * SERIALIZABLE transaction with bounded P2034 retry, so concurrent
 * cancellation attempts produce exactly one `transitioned: true` result
 * and one or more `transitioned: false` (idempotent) results.
 */
export type AppointmentCancelResult =
  | { readonly outcome: 'not_found' }
  | {
      readonly outcome: 'invalid_source_state';
      readonly appointment: Appointment;
    }
  | {
      readonly outcome: 'cancelled';
      readonly appointment: Appointment;
      readonly transitioned: boolean;
    };

/**
 * Input type for rescheduling an existing appointment.
 *
 * Stage 1E rescheduling is a time-only operation: the replacement
 * appointment inherits patientId, providerId, typeCode, tenantId,
 * organisationId, and facilityId from the original appointment. Only
 * the scheduled slot (scheduledStart, scheduledEnd) changes. The
 * reschedule reason is carried in the audit event metadata, not in
 * this input (mirroring the cancellation-reason persistence decision).
 *
 * Per STATUS_CODES.md §4.1, the canonical reschedule transition is:
 * "New appointment created with Scheduled status; original marked
 * Cancelled." In the implemented lifecycle the `booked` status is the
 * canonical "Scheduled" status (the implemented enum does not contain
 * a literal `scheduled` value), so the replacement is created as
 * `booked` and the original transitions to `cancelled`.
 */
export interface AppointmentRescheduleInput {
  readonly scheduledStart: Date;
  readonly scheduledEnd: Date;
}

/**
 * The outcome of an appointment reschedule attempt.
 *
 * Per STATUS_CODES.md §4.1, rescheduling transitions the original
 * appointment out of its active slot and creates a replacement
 * appointment for the new slot: "New appointment created with
 * Scheduled status; original marked Cancelled." The operation is
 * atomic: a failure in creating the replacement MUST NOT leave the
 * original cancelled.
 *
 * The result is discriminated by `outcome`:
 *
 * - `not_found`: no appointment matches the supplied scoped
 *   identifiers. The caller MUST treat this identically to a
 *   nonexistent appointment (no cross-tenant/organisation/facility
 *   existence leak).
 * - `invalid_source_state`: the appointment exists in scope but is in
 *   a source state that is not canonically reschedulable in this
 *   stage (only `booked` is reschedulable). The appointment is
 *   returned so the service can map the error without a second read.
 * - `rescheduled`: the original appointment is now `cancelled` and a
 *   new replacement appointment has been created as `booked`. Both
 *   appointments are returned for the response and audit correlation.
 *
 * The repository performs the lookup, source-state validation, overlap
 * check, replacement creation, and original transition atomically
 * within a single SERIALIZABLE transaction with bounded P2034 /
 * DriverAdapterError retry, so a failure in any step leaves the
 * original appointment unchanged and no replacement exists.
 */
export type AppointmentRescheduleResult =
  | { readonly outcome: 'not_found' }
  | {
      readonly outcome: 'invalid_source_state';
      readonly appointment: Appointment;
    }
  | {
      readonly outcome: 'rescheduled';
      readonly original: Appointment;
      readonly replacement: Appointment;
    };

/**
 * The canonical forward visit-lifecycle transition graph for Stage 1F,
 * derived from STATUS_CODES.md §4.1 (AppointmentStatus transition map).
 *
 * The implemented enum uses `booked` for the canonical "Scheduled"
 * status, `arrived` for "CheckedIn", and `in_progress` for
 * "InProgress" (see STATUS_CODES.md §4.1 display-name mapping).
 *
 * Stage 1F forward edges (excluding cancellation, rescheduling, and
 * no-show, which belong to other stages):
 *
 *   booked      → confirmed   (confirm)
 *   booked      → arrived     (check-in, direct check-in without prior confirmation)
 *   confirmed   → arrived     (check-in)
 *   arrived     → in_progress (start)
 *   in_progress → completed   (complete)
 *
 * Backward transitions (e.g. confirmed → booked, an "unconfirm") are
 * NOT part of Stage 1F's approved forward visit lifecycle and are
 * excluded from this stage.
 */
export const APPOINTMENT_VISIT_TRANSITIONS: Readonly<
  Record<AppointmentStatus, readonly AppointmentStatus[]>
> = {
  booked: ['confirmed', 'arrived'],
  confirmed: ['arrived', 'no_show'],
  arrived: ['in_progress', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/**
 * Input for a canonical appointment visit-lifecycle status transition.
 *
 * The caller supplies the set of canonically-permitted source states
 * and the single target state. The repository enforces that the
 * appointment's current status is one of `allowedSourceStates` before
 * transitioning to `targetStatus`. The caller NEVER supplies an
 * arbitrary target; the target is fixed per command by the service
 * layer (confirm → `confirmed`, check-in → `arrived`, start →
 * `in_progress`, complete → `completed`).
 *
 * The `idempotentIfAlreadyAtTarget` flag governs the behaviour when
 * the appointment is already in the target state. For a terminal
 * target (`completed`), a re-application is an idempotent no-op
 * (returns `already_at_target`, no mutation, no audit event), mirroring
 * the cancellation idempotency for the terminal `cancelled` state.
 * For a non-terminal target (`confirmed`, `arrived`, `in_progress`),
 * a re-application is an invalid transition (the same-state edge is
 * not in the canonical transition map), so the repository returns
 * `invalid_source_state`.
 */
export interface AppointmentTransitionInput {
  readonly allowedSourceStates: readonly AppointmentStatus[];
  readonly targetStatus: AppointmentStatus;
  readonly idempotentIfAlreadyAtTarget: boolean;
}

/**
 * The outcome of an appointment visit-lifecycle status transition
 * attempt.
 *
 * The result is discriminated by `outcome`:
 *
 * - `not_found`: no appointment matches the supplied scoped
 *   identifiers. The caller MUST treat this identically to a
 *   nonexistent appointment (no cross-tenant/organisation/facility
 *   existence leak).
 * - `invalid_source_state`: the appointment exists in scope but is in
 *   a source state that is not canonically permitted for this
 *   transition. This includes non-terminal same-state re-applications
 *   (e.g. confirming an already-`confirmed` appointment) and any
 *   state outside `allowedSourceStates`. The appointment is returned
 *   so the service can map the error without a second read.
 * - `already_at_target`: the appointment is already in the target
 *   state AND the transition is idempotent for that target (terminal
 *   `completed`). This is an idempotent no-op: no mutation, no audit
 *   event. The appointment is returned so the service can build the
 *   canonical success response.
 * - `transitioned`: the appointment transitioned from a permitted
 *   source state to the target state. The `transitioned` flag is
 *   `true` so the service emits the audit event exactly once.
 *
 * The repository performs the transition atomically within a
 * SERIALIZABLE transaction with bounded P2034 /
 * DriverAdapterError retry, so concurrent transition attempts produce
 * exactly one `transitioned` result and at most one idempotent
 * `already_at_target` result (for terminal targets) or one
 * `invalid_source_state` result (for non-terminal targets).
 */
export type AppointmentTransitionResult =
  | { readonly outcome: 'not_found' }
  | {
      readonly outcome: 'invalid_source_state';
      readonly appointment: Appointment;
    }
  | {
      readonly outcome: 'already_at_target';
      readonly appointment: Appointment;
    }
  | {
      readonly outcome: 'transitioned';
      readonly appointment: Appointment;
      readonly transitioned: true;
    };
