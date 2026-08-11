/**
 * Encounter domain model.
 *
 * An Encounter is the central organizing entity for a single clinical
 * event (BC02, M02). It is owned by the Encounter bounded context and
 * references — but does NOT foreign-key to — the Patient (BC01),
 * Workforce/Provider (BC10), and Scheduling/Appointment (BC06)
 * bounded contexts. Those contexts own their own authoritative state;
 * BC02 holds logical identifiers only, per SYSTEM_ARCHITECTURE §7.5
 * and MODULE_ARCHITECTURE §11.3 (state isolation).
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { PatientId, ProviderId, AppointmentId } from '../scheduling/appointment.js';

/**
 * Stable identifier for an Encounter. Branded so it cannot be confused
 * with other IDs at the type level.
 */
export type EncounterId = string & { readonly __brand: 'EncounterId' };

/**
 * Canonical encounter lifecycle status as defined in
 * download/docs/03_DOMAIN/STATUS_CODES.md §5.1 and
 * download/docs/03_DOMAIN/ENUMS.md §4.1 (EncounterStatus, Closed enum).
 *
 * Database values are lowercase (matching the AppointmentStatus
 * convention); the canonical names are Planned, Arrived, InProgress,
 * OnLeave, Finished, Cancelled.
 */
export type EncounterStatus =
  | 'planned'
  | 'arrived'
  | 'in_progress'
  | 'on_leave'
  | 'finished'
  | 'cancelled';

/**
 * Canonical encounter type as defined in ENUMS.md §4.1
 * (EncounterType, Open-with-Council). Default `outpatient`.
 */
export type EncounterType =
  | 'outpatient'
  | 'inpatient'
  | 'emergency'
  | 'telehealth'
  | 'home_health'
  | 'day_care';

/**
 * Canonical encounter priority as defined in ENUMS.md §4.1
 * (EncounterPriority, Closed). Default `routine`.
 */
export type EncounterPriority = 'routine' | 'urgent' | 'emergency';

/**
 * The canonical Encounter domain model. A readonly snapshot of an
 * encounter's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as EncounterId.
 * - `tenantId`: the Tenant that owns this Encounter.
 * - `organisationId`: the Organisation that owns this Encounter.
 * - `facilityId`: the Facility where this Encounter occurs.
 * - `patientId`: logical patient identifier (no FK to Patient module).
 * - `providerId`: logical provider identifier (no FK to Workforce module).
 * - `appointmentId`: logical appointment identifier (no FK to Scheduling
 *   module). Nullable: emergency/walk-in encounters have no appointment
 *   (CLINICAL_WORKFLOWS.md §3.3, WF-ER-001). When present, it is unique
 *   per encounter (one appointment creates at most one encounter).
 * - `encounterType`: the structural encounter type.
 * - `status`: current lifecycle status.
 * - `priority`: queue-routing priority.
 * - `createdAt`: timestamp set by persistence layer.
 * - `updatedAt`: timestamp updated by persistence layer.
 */
export interface Encounter {
  readonly id: EncounterId;
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId;
  readonly facilityId: FacilityId;
  readonly patientId: PatientId;
  readonly providerId: ProviderId;
  readonly appointmentId: AppointmentId | null;
  readonly encounterType: EncounterType;
  readonly status: EncounterStatus;
  readonly priority: EncounterPriority;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input type for creating a new encounter.
 *
 * All scope (tenantId, organisationId, facilityId) is derived from the
 * authenticated session context, NOT from the request body. The caller
 * supplies only the patient, provider, optional appointment, type, and
 * priority.
 *
 * `appointmentId` is optional (nullable) to support emergency/walk-in
 * encounters that have no appointment. When supplied, it must reference
 * an appointment in the authenticated scope (validated by the service
 * via AppointmentRepository.findById); the database enforces uniqueness
 * via a partial unique index so one appointment cannot create two
 * encounters.
 *
 * `emergencyJustification` is required when the encounter is an
 * emergency (encounterType === 'emergency' OR priority === 'emergency')
 * and is the canonical basis for the consent-gate emergency carve-out
 * (BR-BC15-REG-001 "except emergency", BR-BC15-REG-003 "documented with
 * reason"). It is carried in the audit event metadata, not persisted as
 * a clinical record in this minimal foundation.
 */
export interface EncounterCreateInput {
  readonly patientId: PatientId;
  readonly providerId: ProviderId;
  readonly appointmentId: AppointmentId | null;
  readonly encounterType: EncounterType;
  readonly priority: EncounterPriority;
  readonly emergencyJustification: string | null;
}

/**
 * Result of an encounter creation attempt.
 *
 * Discriminated by `outcome`:
 *
 * - `created`: the encounter was created in the `planned` state. The
 *   `transitioned` flag is `true` (always for a fresh creation).
 * - `duplicate_appointment`: an encounter already exists for the
 *   supplied `appointmentId` in the same scope. One appointment creates
 *   at most one encounter (APPOINTMENTS.md §10.1: "Appointment
 *   completion triggers encounter finalization"). The existing
 *   encounter is returned so the service can map the error without a
 *   second read. This never occurs when `appointmentId` is null.
 */
export type EncounterCreateResult =
  | {
      readonly outcome: 'created';
      readonly encounter: Encounter;
      readonly transitioned: true;
    }
  | {
      readonly outcome: 'duplicate_appointment';
      readonly encounter: Encounter;
    };

/**
 * The canonical encounter lifecycle transition graph, derived from
 * STATUS_CODES.md §10.2 (Encounter Transition Map).
 *
 * Edges:
 *   planned     → arrived      (Patient check-in)
 *   planned     → in_progress   (Direct start, e.g. emergency)
 *   planned     → cancelled    (Cancellation request)
 *   arrived     → in_progress  (Practitioner starts encounter)
 *   arrived     → cancelled    (Patient leaves before being seen)
 *   in_progress → on_leave     (Encounter temporarily paused)
 *   on_leave    → in_progress (Encounter resumes)
 *   in_progress → finished     (Practitioner concludes encounter)
 *   in_progress → cancelled    (Encounter cancelled mid-progress, rare)
 *
 * Terminal states: `finished`, `cancelled`. Backward transitions,
 * reopening, and cancellation from `on_leave` are NOT in the canonical
 * map and are therefore not permitted.
 */
export const ENCOUNTER_TRANSITIONS: Readonly<
  Record<EncounterStatus, readonly EncounterStatus[]>
> = {
  planned: ['arrived', 'in_progress', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['on_leave', 'finished', 'cancelled'],
  on_leave: ['in_progress'],
  finished: [],
  cancelled: [],
};

/**
 * Input for a canonical encounter lifecycle status transition.
 *
 * The caller supplies the set of canonically-permitted source states
 * and the single target state. The repository enforces that the
 * encounter's current status is one of `allowedSourceStates` before
 * transitioning to `targetStatus`. The caller NEVER supplies an
 * arbitrary target; the target is fixed per command by the service
 * layer.
 *
 * `idempotentIfAlreadyAtTarget` governs the behaviour when the
 * encounter is already in the target state. For terminal targets
 * (`finished`, `cancelled`), a re-application is an idempotent no-op
 * (returns `already_at_target`, no mutation, no audit event), mirroring
 * the appointment cancellation/completion idempotency. For non-terminal
 * targets (`arrived`, `in_progress`, `on_leave`), a re-application is
 * an invalid transition (the same-state edge is not in the canonical
 * transition map), so the repository returns `invalid_source_state`.
 */
export interface EncounterTransitionInput {
  readonly allowedSourceStates: readonly EncounterStatus[];
  readonly targetStatus: EncounterStatus;
  readonly idempotentIfAlreadyAtTarget: boolean;
}

/**
 * The outcome of an encounter lifecycle status transition attempt.
 *
 * - `not_found`: no encounter matches the supplied scoped identifiers.
 *   The caller MUST treat this identically to a nonexistent encounter
 *   (no cross-tenant/organisation/facility existence leak).
 * - `invalid_source_state`: the encounter exists in scope but is in a
 *   source state that is not canonically permitted for this
 *   transition, including non-terminal same-state re-applications. The
 *   encounter is returned so the service can map the error without a
 *   second read.
 * - `already_at_target`: the encounter is already in the target state
 *   AND the transition is idempotent for that target (terminal
 *   `finished`/`cancelled`). This is an idempotent no-op: no mutation,
 *   no audit event.
 * - `transitioned`: the encounter transitioned from a permitted source
 *   state to the target state. `transitioned` is `true` so the service
 *   emits the audit event exactly once.
 */
export type EncounterTransitionResult =
  | { readonly outcome: 'not_found' }
  | {
      readonly outcome: 'invalid_source_state';
      readonly encounter: Encounter;
    }
  | {
      readonly outcome: 'already_at_target';
      readonly encounter: Encounter;
    }
  | {
      readonly outcome: 'transitioned';
      readonly encounter: Encounter;
      readonly transitioned: true;
    };
