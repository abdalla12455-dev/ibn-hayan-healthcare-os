/**
 * Provider repository ports.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * repository interfaces are declared in the domain package and
 * implemented by persistence adapters in
 * `apps/api/src/infrastructure/database/`. The API layer depends on
 * the interface; the Prisma-backed implementation is injected at the
 * composition root.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type {
  Provider,
  ProviderId,
  ProviderFacilityAssignment,
  ProviderFacilityAssignmentId,
} from './provider.js';
import type {
  ProviderScheduleEntry,
  ProviderScheduleEntryId,
  ProviderScheduleEntryCreateInput,
} from './provider-schedule.js';
import type {
  UserProviderBinding,
  UserProviderBindingId,
  ActiveProviderIdentity,
  FacilityScopedActiveProviderIdentity,
  CreateUserProviderBindingInput,
  RevokeUserProviderBindingInput,
} from './user-provider-binding.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { UserId } from '../identity/user.js';

/**
 * Repository port for the Workforce bounded context (BC10).
 *
 * Provides existence checking for providers within a tenant scope and
 * facility assignment validation. Other bounded contexts (especially
 * Appointments) use this to validate that a provider:
 * 1. Exists in the correct tenant
 * 2. Is active (or otherwise eligible per lifecycle rules)
 * 3. Is assigned to the requested authenticated facility
 *
 * Per download/docs/07_MODULES/DOCTORS.md Section 4.1:
 * - Provider data is tenant-isolated by default
 * - A provider registered in tenant A is not visible to tenant B
 *
 * Per DOCTORS.md Section 4.2:
 * - A provider's schedule may span multiple facilities
 * - The appointment context must verify that the provider is assigned
 *   to the requested facility
 *
 * The existence check is the minimum capability required for BC10 to
 * serve as a reference foundation. Full provider CRUD operations will
 * be implemented in subsequent batches.
 */
export interface ProviderRepository {
  /**
   * Check if a provider exists in a given tenant.
   *
   * This method verifies that a provider with the given ID genuinely
   * exists within the specified tenant scope.
   *
   * Security guarantees:
   * - A provider ID from tenant B does NOT return true for tenant A
   * - A non-existent provider ID returns false (not an error)
   * - Caller-supplied tenantId is authoritative (derived from auth context)
   *
   * @param tenantId The tenant to check within.
   * @param providerId The provider ID to check.
   * @returns true if the provider exists in the tenant, false otherwise.
   */
  existsInTenant(tenantId: TenantId, providerId: ProviderId): Promise<boolean>;

  /**
   * Find a provider by their ID within a tenant scope.
   *
   * Returns null if the provider does not exist, belongs to a different
   * tenant, or is not in an eligible status for scheduling.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID to find.
   * @returns The provider if found and eligible, null otherwise.
   */
  findById(tenantId: TenantId, providerId: ProviderId): Promise<Provider | null>;

  /**
   * Check if a provider is eligible for scheduling at a specific facility.
   *
   * A provider is eligible if:
   * 1. They exist in the tenant
   * 2. Their status is 'active'
   * 3. They have an active (non-revoked) assignment to the facility
   *
   * Per DOCTORS.md Section 4.2:
   * - "The appointment context must verify that the provider is assigned
   *   to the requested facility"
   *
   * Security guarantees:
   * - Cross-tenant facility queries return false
   * - Cross-facility queries return false
   * - Caller-supplied tenantId and facilityId are authoritative
   *
   * @param tenantId The tenant to check within.
   * @param providerId The provider ID to check.
   * @param facilityId The facility to check assignment for.
   * @returns true if the provider is eligible for the facility, false otherwise.
   */
  isEligibleForFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
  ): Promise<boolean>;

  /**
   * Find a provider's active facility assignments.
   *
   * Returns all active (non-revoked) assignments for a provider within
   * a tenant. This supports determining which facilities a provider
   * can work at.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID to find assignments for.
   * @returns Array of active assignments, empty array if none exist.
   */
  findActiveFacilityAssignments(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<ProviderFacilityAssignment[]>;

  /**
   * Check if a provider is available at a facility for a given
   * UTC time window, based on the provider's weekly working-hours
   * schedule (BR-BC06-ADM-002: "Practitioner must be available at
   * requested time; if availability cannot be verified, block
   * booking").
   *
   * BC10 Workforce owns provider schedule/availability data. This
   * method is the port through which the Appointments bounded context
   * (BC06) consumes availability without duplicating the logic or
   * cross-BC Prisma coupling.
   *
   * The method converts the UTC `scheduledStart` and `scheduledEnd`
   * to the facility's configured IANA timezone, extracts the ISO day
   * of week and local time-of-day, and checks whether at least one
   * `ProviderScheduleEntry` for `(tenantId, providerId, facilityId,
   * dayOfWeek)` fully contains the appointment's local time window
   * (`entry.startTime <= localStart AND entry.endTime >= localEnd`).
   *
   * Fail-closed posture (per BR-BC06-ADM-002 and AGENTS.md facility
   * timezone rules):
   * - If the facility timezone is null or invalid, availability
   *   cannot be verified → returns `false` (block booking).
   * - If no schedule entry exists for the provider at the facility
   *   on the appointment's day of week → returns `false`.
   * - If the appointment's local time window extends beyond the
   *   schedule entry's working hours → returns `false`.
   * - Cross-tenant/cross-facility queries return `false` (no leak).
   *
   * @param tenantId The tenant scope (from the authenticated session).
   * @param providerId The provider to check availability for.
   * @param facilityId The facility whose timezone and schedule apply.
   * @param scheduledStart The appointment's UTC scheduled start.
   * @param scheduledEnd The appointment's UTC scheduled end.
   * @returns `true` if the provider is available; `false` if not
   *   available or if availability cannot be verified (fail closed).
   */
  isProviderAvailableAtFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
    scheduledStart: Date,
    scheduledEnd: Date,
  ): Promise<boolean>;
}

/**
 * Repository port for ProviderFacilityAssignment.
 *
 * Provides read access to provider facility assignments.
 * This is a subordinate port used by ProviderRepository.
 */
export interface ProviderFacilityAssignmentRepository {
  /**
   * Find an assignment by its ID within a tenant scope.
   *
   * @param tenantId The tenant to search within.
   * @param assignmentId The assignment ID to find.
   * @returns The assignment if found and active, null otherwise.
   */
  findById(
    tenantId: TenantId,
    assignmentId: ProviderFacilityAssignmentId,
  ): Promise<ProviderFacilityAssignment | null>;

  /**
   * Find a provider's assignment to a specific facility.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID.
   * @param facilityId The facility ID.
   * @returns The assignment if found and active, null otherwise.
   */
  findByProviderAndFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
  ): Promise<ProviderFacilityAssignment | null>;

  /**
   * Find all active assignments for a provider within a tenant.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID.
   * @returns Array of active assignments.
   */
  findActiveByProvider(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<ProviderFacilityAssignment[]>;
}

/**
 * Repository port for ProviderScheduleEntry (BC10).
 *
 * BC10 Workforce owns provider schedule/availability data. This port
 * provides write access for schedule administration and read access
 * for availability queries. The Appointments bounded context (BC06)
 * consumes availability through {@link ProviderRepository.isProviderAvailableAtFacility},
 * not through this port directly, to maintain the customer-supplier
 * boundary.
 */
export interface ProviderScheduleRepository {
  /**
   * Create a provider schedule entry (weekly working-hours block).
   *
   * Scope (tenantId, organisationId, facilityId) is derived from the
   * authenticated session at the API boundary; the caller supplies
   * only the provider, day of week, and working-hours window.
   *
   * @param tenantId The tenant scope.
   * @param organisationId The organisation scope.
   * @param facilityId The facility scope.
   * @param input The schedule entry input (provider, day, times).
   * @returns The created schedule entry.
   */
  create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: ProviderScheduleEntryCreateInput,
  ): Promise<ProviderScheduleEntry>;

  /**
   * Find all schedule entries for a provider at a facility, scoped
   * to the authenticated tenant.
   *
   * @param tenantId The tenant scope.
   * @param providerId The provider whose schedule to find.
   * @param facilityId The facility scope.
   * @returns Array of schedule entries, empty if none exist.
   */
  findByProviderAndFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
  ): Promise<ProviderScheduleEntry[]>;

  /**
   * Delete a schedule entry by its ID, scoped to the authenticated
   * tenant. Returns the deleted entry, or null if no entry was found
   * for the given ID in the given tenant (cross-tenant deletes are
   * safe no-ops that return null).
   *
   * @param tenantId The tenant scope.
   * @param entryId The schedule entry ID to delete.
   * @returns The deleted entry, or null if not found.
   */
  delete(
    tenantId: TenantId,
    entryId: ProviderScheduleEntryId,
  ): Promise<ProviderScheduleEntry | null>;
}

/**
 * Repository port for the User→Provider identity binding (BC10).
 *
 * BC10 owns the binding between a platform User and a Provider. This
 * port is the server-side resolver that lets a clinical operation
 * obtain a TRUSTED Provider identity from `(tenantId, userId)` alone,
 * without trusting any caller-supplied Provider identifier.
 *
 * Ratified cardinality:
 * - One active Provider per User per tenant.
 * - One active User per Provider per tenant.
 * - The same global User may bind to different Providers in different
 *   tenants.
 * - NO automatic or backfill binding. Historical Users/Providers
 *   without a binding remain valid but cannot resolve a trusted
 *   Provider identity.
 *
 * Fail-closed posture:
 * - The resolver returns `null` when no active binding exists, when
 *   the User is disabled, when the Provider is suspended or
 *   separated, or (for the facility-scoped variant) when the facility
 *   assignment is missing or revoked.
 * - The resolver NEVER trusts a caller-supplied Provider identity.
 * - The resolver NEVER falls back to a roleCode-derived Provider.
 * - The resolver NEVER resolves a Provider across a tenant boundary;
 *   the lookup is scoped by the caller-supplied `tenantId` (derived
 *   from the authenticated session context).
 *
 * Per the BC10 User→Provider Identity Binding specification, the
 * returned `clinicalAuthorRole` is the trusted attribute stored on the
 * Provider record. It is NOT derived from the platform `roleCode`.
 */
export interface UserProviderBindingRepository {
  /**
   * Resolve the active Provider identity for a User within a tenant.
   *
   * This is the primary server-side clinical-actor resolver. It looks
   * up the active (non-revoked) binding for `(tenantId, userId)`,
   * verifies that the User is active and the Provider is `active`,
   * and returns the trusted Provider identity together with its
   * `clinicalAuthorRole`.
   *
   * Security guarantees:
   * - The lookup is scoped by `tenantId`; a binding in another tenant
   *   is never resolved.
   * - The Provider identity is derived from the binding, never from a
   *   caller-supplied Provider identifier.
   * - Returns `null` (fail closed) when: no binding exists, the
   *   binding is revoked, the User is disabled, or the Provider is
   *   suspended/separated.
   * - No sensitive data is returned beyond the trusted clinical
   *   identity fields.
   *
   * @param tenantId The tenant scope (from the authenticated session).
   * @param userId The authenticated principal's user id.
   * @returns The trusted active Provider identity, or null when fail
   *   closed.
   */
  findActiveProviderForUser(
    tenantId: TenantId,
    userId: UserId,
  ): Promise<ActiveProviderIdentity | null>;

  /**
   * Resolve the active Provider identity for a User within a tenant
   * AND a specific facility.
   *
   * Use this variant for facility-specific clinical actions (for
   * example, authoring a note against an encounter at a facility).
   * It performs every check in
   * {@link findActiveProviderForUser} and additionally requires that
   * the bound Provider has an active (non-revoked) facility
   * assignment to `facilityId` within `tenantId`.
   *
   * Security guarantees:
   * - All guarantees of {@link findActiveProviderForUser}.
   * - Cross-facility resolution returns `null` (fail closed).
   * - Cross-tenant facility resolution returns `null` (fail closed).
   * - The facility assignment is read from the Provider's own
   *   assignment records; no caller-supplied assignment is trusted.
   *
   * @param tenantId The tenant scope (from the authenticated session).
   * @param userId The authenticated principal's user id.
   * @param facilityId The facility the clinical action is scoped to.
   * @returns The trusted facility-scoped active Provider identity, or
   *   null when fail closed.
   */
  findActiveProviderForUserAtFacility(
    tenantId: TenantId,
    userId: UserId,
    facilityId: FacilityId,
  ): Promise<FacilityScopedActiveProviderIdentity | null>;

  /**
   * Create a new active UserProviderBinding.
   *
   * Throws a domain error (translated to 409 Conflict at the API
   * boundary) when the one-active-per-user-per-tenant or
   * one-active-per-provider-per-tenant cardinality would be violated,
   * or when the Provider does not belong to the supplied tenant.
   *
   * Per the ratified rules, binding creation is explicit only; there
   * is no automatic or backfill binding path.
   */
  create(input: CreateUserProviderBindingInput): Promise<UserProviderBinding>;

  /**
   * Revoke the active binding for a User within a tenant.
   *
   * Sets `revokedAt` on the currently-active binding for
   * `(tenantId, userId)`. After revocation a new binding may be
   * created for the same user (re-binding). Returns the revoked
   * binding, or `null` when no active binding existed.
   */
  revoke(input: RevokeUserProviderBindingInput): Promise<UserProviderBinding | null>;

  /**
   * Find a binding by its stable UUID identifier within a tenant
   * scope. Returns `null` when no binding exists with the given id in
   * the given tenant. Used for administration and audit; the
   * clinical-actor resolver path uses
   * {@link findActiveProviderForUser}.
   */
  findById(
    tenantId: TenantId,
    bindingId: UserProviderBindingId,
  ): Promise<UserProviderBinding | null>;
}
