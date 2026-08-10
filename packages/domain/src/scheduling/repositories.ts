/**
 * Scheduling repository ports.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * repository interfaces are declared in the domain package and
 * implemented by persistence adapters in
 * `apps/api/src/infrastructure/database/`. The API layer depends on
 * the interface; the Prisma-backed implementation is injected at the
 * composition root.
 *
 * Per CODING_STANDARDS.md §10 (Tenant-Scope Requirements), every
 * database query that touches tenant-scoped data must include a tenant
 * filter. The Appointment repository port below makes the tenant,
 * organisation, and facility filters required parameters. This is the
 * structural enforcement that prevents cross-tenant, cross-organisation,
 * or cross-facility data leakage.
 *
 * The ports return domain values (AppointmentReadProjection), not
 * Prisma-generated row types. The mapping between Prisma types and
 * domain types is explicit and tested in the persistence adapter.
 *
 * No use cases, API DTOs, controllers, or business workflows are
 * declared here. The ports are pure data-access interfaces.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type {
  Appointment,
  AppointmentCancelResult,
  AppointmentCreateInput,
  AppointmentReadProjection,
  AppointmentRescheduleInput,
  AppointmentRescheduleResult,
  AppointmentTransitionInput,
  AppointmentTransitionResult,
} from './appointment.js';
import type { AppointmentId } from './appointment.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';

/**
 * Repository port for the Scheduling bounded context (BC06).
 *
 * Every Appointment read requires tenantId, organisationId, and facilityId.
 * There is no unscoped `findById` method. This is the structural
 * enforcement of CODING_STANDARDS.md §10 and the Stage 1B specification
 * requirement that all scope is derived from the authenticated session.
 *
 * Per Stage 1C, the repository also supports appointment creation with
 * concurrency-safe provider overlap prevention.
 */
export interface AppointmentRepository {
  /**
   * Find all appointments for a specific facility that begin within a
   * given UTC time range (half-open interval: [startUtc, endUtc)).
   *
   * The query is scoped by tenant, organisation, and facility to prevent
   * cross-tenant, cross-organisation, or cross-facility data leakage.
   * All three scope values must match for an appointment to be returned.
   *
   * Results are ordered by `scheduledStart` ascending, with `id` ascending
   * as a stable tie-breaker.
   *
   * @param tenantId The Tenant that owns the facility.
   * @param organisationId The Organisation that owns the facility.
   * @param facilityId The Facility to query appointments for.
   * @param startUtc The start of the UTC time range (inclusive).
   * @param endUtc The end of the UTC time range (exclusive).
   * @returns The list of appointments that begin within the range.
   */
  findByScheduledStartRange(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    startUtc: Date,
    endUtc: Date,
  ): Promise<AppointmentReadProjection[]>;

  /**
   * Create a new appointment.
   *
   * The appointment is scoped to the authenticated session's tenant,
   * organisation, and facility. The caller does NOT supply scope;
   * scope is always derived from the authenticated context.
   *
   * Overlap prevention: the creation atomically checks for provider
   * appointment overlaps within the same tenant, organisation, and
   * facility. If an overlap exists (existingStart < requestedEnd AND
   * existingEnd > requestedStart for the same provider), the creation
   * fails with an overlap error. Adjacent appointments where one ends
   * exactly when another begins are NOT considered overlapping.
   *
   * Concurrency safety: overlap detection is performed within a
   * transaction with SERIALIZABLE isolation to prevent race conditions
   * where two concurrent requests could both create overlapping
   * appointments.
   *
   * @param tenantId The Tenant that owns the facility.
   * @param organisationId The Organisation that owns the facility.
   * @param facilityId The Facility where the appointment occurs.
   * @param input The appointment creation input.
   * @returns The created appointment on success.
   * @throws AppointmentOverlapError if the provider has an overlapping
   *         appointment in the same tenant, organisation, and facility.
   */
  create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: AppointmentCreateInput,
  ): Promise<Appointment>;

  /**
   * Find a single appointment by its identifier, scoped to the
   * authenticated session's tenant, organisation, and facility.
   *
   * There is no unscoped lookup. All three scope values must match for
   * an appointment to be returned; an appointment that exists in
   * another tenant, organisation, or facility returns `null` (not an
   * error), so the caller cannot distinguish "does not exist" from
   * "exists outside scope". This is the structural enforcement of
   * CODING_STANDARDS.md §10 and prevents cross-scope existence leakage.
   *
   * @param tenantId The Tenant that owns the appointment.
   * @param organisationId The Organisation that owns the appointment.
   * @param facilityId The Facility where the appointment occurs.
   * @param appointmentId The appointment's stable identifier.
   * @returns The appointment, or `null` if no appointment matches the
   *          full scoped identifier set.
   */
  findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    appointmentId: AppointmentId,
  ): Promise<Appointment | null>;

  /**
   * Cancel an existing appointment, scoped to the authenticated
   * session's tenant, organisation, and facility.
   *
   * The caller does NOT supply scope; scope is always derived from the
   * authenticated context. The caller does NOT supply the target
   * status; the transition is always `booked → cancelled`.
   *
   * Lifecycle rules (per STATUS_CODES.md §4.1 and APPOINTMENTS.md
   * §16.2):
   * - Only `booked` is canonically cancellable in this stage.
   * - `cancelled` is terminal; re-cancelling an already-cancelled
   *   appointment is an idempotent no-op (no mutation, no audit event).
   * - Any other source state is an invalid transition.
   *
   * Concurrency safety: the lookup, transition validation, and status
   * mutation are performed within a transaction with SERIALIZABLE
   * isolation to prevent race conditions where two concurrent
   * cancellation requests could both transition the same appointment.
   * SERIALIZABLE transaction conflicts (Prisma P2034) are retried with
   * a bounded retry loop; on retry, a concurrently-cancelled
   * appointment is observed as already-cancelled and resolved as an
   * idempotent success.
   *
   * @param tenantId The Tenant that owns the appointment.
   * @param organisationId The Organisation that owns the appointment.
   * @param facilityId The Facility where the appointment occurs.
   * @param appointmentId The appointment's stable identifier.
   * @returns The cancellation result (see {@link AppointmentCancelResult}).
   */
  cancel(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    appointmentId: AppointmentId,
  ): Promise<AppointmentCancelResult>;

  /**
   * Reschedule an existing appointment to a new slot, scoped to the
   * authenticated session's tenant, organisation, and facility.
   *
   * Per STATUS_CODES.md §4.1, rescheduling transitions the original
   * appointment out of its active slot and creates a replacement
   * appointment for the new slot: "New appointment created with
   * Scheduled status; original marked Cancelled." In the implemented
   * lifecycle `booked` is the canonical "Scheduled" status, so the
   * replacement is created as `booked` and the original transitions
   * to `cancelled`.
   *
   * The caller does NOT supply scope; scope is always derived from
   * the authenticated context. The caller does NOT supply patient,
   * provider, type, or status; those are inherited from the original
   * appointment. Only the replacement slot (scheduledStart,
   * scheduledEnd) is supplied via {@link AppointmentRescheduleInput}.
   *
   * Lifecycle rules (per STATUS_CODES.md §4.1):
   * - Only `booked` is canonically reschedulable in this stage.
   * - `cancelled` and `no_show` are terminal ("rebooked as new
   *   appointment", not rescheduled in-place).
   * - Any other source state is an invalid transition.
   *
   * Atomicity: the scoped lookup, source-state validation, overlap
   * check, replacement creation, and original transition are all
   * performed within a single SERIALIZABLE transaction. A failure in
   * any step (overlap, serialization conflict after bounded retries,
   * database error) leaves the original appointment unchanged and no
   * replacement appointment exists. The operation MUST NOT produce
   * the partial state "original cancelled, replacement not created".
   *
   * Overlap: the replacement slot is checked for provider overlap
   * against existing appointments in the same tenant, organisation,
   * and facility, excluding canonical non-blocking statuses
   * (`cancelled`, `no_show`). The original appointment itself does
   * not incorrectly conflict with the replacement: when the overlap
   * check runs, the original is still in the `booked` (blocking)
   * state, so the overlap query explicitly excludes the original
   * appointment's own id from the conflicting set. This scoped
   * exclusion is safe because the original is being transitioned to
   * `cancelled` within the same atomic transaction.
   *
   * Concurrency safety: SERIALIZABLE transaction conflicts (Prisma
   * P2034 and `@prisma/adapter-pg` `DriverAdapterError` with
   * `cause.kind === 'TransactionWriteConflict'`) are retried with a
   * bounded retry loop; on retry, the transaction re-observes
   * committed state. Two concurrent reschedules of the same original
   * cannot create two replacements: under SERIALIZABLE isolation the
   * second reschedule observes the original as already `cancelled`
   * (invalid source state) after the first commits, or one conflicts
   * and is retried to the same outcome.
   *
   * @param tenantId The Tenant that owns the appointment.
   * @param organisationId The Organisation that owns the appointment.
   * @param facilityId The Facility where the appointment occurs.
   * @param appointmentId The original appointment's stable identifier.
   * @param input The replacement slot (scheduledStart, scheduledEnd).
   * @returns The reschedule result (see
   *          {@link AppointmentRescheduleResult}).
   * @throws AppointmentOverlapError if the replacement slot overlaps
   *         an existing blocking appointment for the same provider.
   */
  reschedule(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    appointmentId: AppointmentId,
    input: AppointmentRescheduleInput,
  ): Promise<AppointmentRescheduleResult>;

  /**
   * Transition an existing appointment's status along the canonical
   * forward visit-lifecycle graph (Stage 1F), scoped to the
   * authenticated session's tenant, organisation, and facility.
   *
   * The caller does NOT supply scope; scope is always derived from
   * the authenticated context. The caller does NOT supply an
   * arbitrary target status; the target is fixed per command by the
   * service layer via {@link AppointmentTransitionInput}. The
   * repository enforces that the appointment's current status is one
   * of `allowedSourceStates` before transitioning to `targetStatus`.
   *
   * Lifecycle rules (per STATUS_CODES.md §4.1 and
   * {@link APPOINTMENT_VISIT_TRANSITIONS}):
   * - confirm:  `booked` → `confirmed`
   * - check-in: `booked` | `confirmed` → `arrived`
   * - start:    `arrived` → `in_progress`
   * - complete: `in_progress` → `completed`
   *
   * Idempotency:
   * - For a terminal target (`completed`), re-applying the transition
   *   to an already-`completed` appointment is an idempotent no-op
   *   (`already_at_target`): no mutation, no audit event. This mirrors
   *   the cancellation idempotency for the terminal `cancelled` state.
   * - For a non-terminal target (`confirmed`, `arrived`,
   *   `in_progress`), re-applying the transition to an appointment
   *   already in the target state is an invalid transition
   *   (`invalid_source_state`), because the same-state edge is not in
   *   the canonical transition map.
   *
   * Concurrency safety: the scoped lookup, source-state validation,
   * and status mutation are performed within a transaction with
   * SERIALIZABLE isolation to prevent race conditions where two
   * concurrent transition requests could both transition the same
   * appointment. SERIALIZABLE transaction conflicts (Prisma P2034 and
   * `@prisma/adapter-pg` `DriverAdapterError` with
   * `cause.kind === 'TransactionWriteConflict'`) are retried with a
   * bounded retry loop; on retry, a concurrently-transitioned
   * appointment is re-observed at its committed status and resolved
   * deterministically (one `transitioned` result; the loser resolves
   * as `already_at_target` for terminal targets or
   * `invalid_source_state` for non-terminal targets). No expected
   * serialization conflict escapes as an HTTP 500.
   *
   * @param tenantId The Tenant that owns the appointment.
   * @param organisationId The Organisation that owns the appointment.
   * @param facilityId The Facility where the appointment occurs.
   * @param appointmentId The appointment's stable identifier.
   * @param input The transition specification (allowed sources, target,
   *              idempotency flag).
   * @returns The transition result (see
   *          {@link AppointmentTransitionResult}).
   */
  transitionStatus(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    appointmentId: AppointmentId,
    input: AppointmentTransitionInput,
  ): Promise<AppointmentTransitionResult>;
}
