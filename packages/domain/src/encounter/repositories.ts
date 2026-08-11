/**
 * Encounter repository port.
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
 * filter. The Encounter repository port below makes the tenant,
 * organisation, and facility filters required parameters. This is the
 * structural enforcement that prevents cross-tenant, cross-organisation,
 * or cross-facility data leakage.
 *
 * The port returns domain values (Encounter), not Prisma-generated row
 * types. The mapping between Prisma types and domain types is explicit
 * and tested in the persistence adapter.
 *
 * No use cases, API DTOs, controllers, or business workflows are
 * declared here. The ports are pure data-access interfaces.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type {
  Encounter,
  EncounterCreateInput,
  EncounterCreateResult,
  EncounterTransitionInput,
  EncounterTransitionResult,
  EncounterId,
} from './encounter.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';

/**
 * Repository port for the Encounter bounded context (BC02).
 *
 * Every Encounter read requires tenantId, organisationId, and facilityId.
 * There is no unscoped `findById` method. This is the structural
 * enforcement of CODING_STANDARDS.md §10: all scope is derived from the
 * authenticated session.
 */
export interface EncounterRepository {
  /**
   * Create a new encounter, scoped to the authenticated session's
   * tenant, organisation, and facility.
   *
   * The encounter is created in the canonical initial `planned` status
   * (STATUS_CODES.md §5.1, ENUMS.md §4.1: default `planned`). The
   * caller does NOT supply scope, status, or actor; scope is always
   * derived from the authenticated context and the status is always
   * `planned` for a fresh encounter.
   *
   * Duplicate prevention: when `input.appointmentId` is non-null, the
   * creation atomically checks for an existing encounter with the same
   * appointmentId in the same scope. If one exists, the creation
   * returns `duplicate_appointment` (the existing encounter is
   * returned). One appointment creates at most one encounter. When
   * `input.appointmentId` is null, no duplicate check is performed
   * (emergency/walk-in encounters are independent).
   *
   * Concurrency safety: the existence check and insert are performed
   * within a transaction with SERIALIZABLE isolation to prevent race
   * conditions where two concurrent requests could both create an
   * encounter for the same appointment. SERIALIZABLE transaction
   * conflicts (Prisma P2034 and `@prisma/adapter-pg`
   * `DriverAdapterError` with `cause.kind ===
   * 'TransactionWriteConflict'`) are retried with a bounded retry loop;
   * on retry, a concurrently-created encounter for the same
   * appointment is observed and resolved as `duplicate_appointment`.
   *
   * @param tenantId The Tenant that owns the encounter.
   * @param organisationId The Organisation that owns the encounter.
   * @param facilityId The Facility where the encounter occurs.
   * @param input The encounter creation input.
   * @returns The creation result (see {@link EncounterCreateResult}).
   */
  create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: EncounterCreateInput,
  ): Promise<EncounterCreateResult>;

  /**
   * Find a single encounter by its identifier, scoped to the
   * authenticated session's tenant, organisation, and facility.
   *
   * There is no unscoped lookup. All three scope values must match for
   * an encounter to be returned; an encounter that exists in another
   * tenant, organisation, or facility returns `null` (not an error), so
   * the caller cannot distinguish "does not exist" from "exists outside
   * scope". This prevents cross-scope existence leakage.
   *
   * @param tenantId The Tenant that owns the encounter.
   * @param organisationId The Organisation that owns the encounter.
   * @param facilityId The Facility where the encounter occurs.
   * @param encounterId The encounter's stable identifier.
   * @returns The encounter, or `null` if no encounter matches the full
   *          scoped identifier set.
   */
  findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    encounterId: EncounterId,
  ): Promise<Encounter | null>;

  /**
   * Transition an existing encounter's status along the canonical
   * lifecycle graph, scoped to the authenticated session's tenant,
   * organisation, and facility.
   *
   * The caller does NOT supply scope; scope is always derived from the
   * authenticated context. The caller does NOT supply an arbitrary
   * target status; the target is fixed per command by the service layer
   * via {@link EncounterTransitionInput}. The repository enforces that
   * the encounter's current status is one of `allowedSourceStates`
   * before transitioning to `targetStatus`.
   *
   * Idempotency:
   * - For terminal targets (`finished`, `cancelled`), re-applying the
   *   transition to an already-terminal encounter is an idempotent no-op
   *   (`already_at_target`): no mutation, no audit event.
   * - For non-terminal targets (`arrived`, `in_progress`, `on_leave`),
   *   re-applying the transition to an encounter already in the target
   *   state is an invalid transition (`invalid_source_state`), because
   *   the same-state edge is not in the canonical transition map.
   *
   * Concurrency safety: the scoped lookup, source-state validation, and
   * status mutation are performed within a transaction with
   * SERIALIZABLE isolation. SERIALIZABLE transaction conflicts (Prisma
   * P2034 and `@prisma/adapter-pg` `DriverAdapterError` with
   * `cause.kind === 'TransactionWriteConflict'`) are retried with a
   * bounded retry loop; on retry, a concurrently-transitioned encounter
   * is re-observed at its committed status and resolved deterministically
   * (one `transitioned` result; the loser resolves as `already_at_target`
   * for terminal targets or `invalid_source_state` for non-terminal
   * targets). No expected serialization conflict escapes as an HTTP 500.
   *
   * @param tenantId The Tenant that owns the encounter.
   * @param organisationId The Organisation that owns the encounter.
   * @param facilityId The Facility where the encounter occurs.
   * @param encounterId The encounter's stable identifier.
   * @param input The transition specification (allowed sources, target,
   *              idempotency flag).
   * @returns The transition result (see
   *          {@link EncounterTransitionResult}).
   */
  transitionStatus(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    encounterId: EncounterId,
    input: EncounterTransitionInput,
  ): Promise<EncounterTransitionResult>;
}
