/**
 * User→Provider identity binding domain model.
 *
 * The Workforce bounded context (BC10) owns the binding between a
 * platform User (an authenticated identity, owned by the Identity
 * bounded context) and a Provider (a clinical-capacity identity,
 * owned by BC10). The binding is the structural guarantee that lets
 * a clinical operation resolve, from an authenticated principal
 * alone, the trusted Provider identity that authored or will author
 * clinical work — without trusting any caller-supplied Provider
 * identifier.
 *
 * Ratified cardinality (BC10 User→Provider Identity Binding
 * Foundation):
 * - The active relationship is one-to-one INSIDE each tenant:
 *   one active Provider per User per tenant, and one active User per
 *   Provider per tenant.
 * - The same global User may bind to different Providers in different
 *   tenants. Uniqueness is therefore per-tenant, not global.
 * - NO automatic or backfill binding is performed. Historical
 *   Users and Providers remain valid without a binding; they simply
 *   cannot resolve a trusted Provider identity until a binding is
 *   explicitly created.
 * - Clinical operations requiring provider identity MUST fail closed
 *   when no active binding exists (see {@link ActiveProviderIdentity}
 *   and the {@link UserProviderBindingRepository} resolver port).
 *
 * Lifecycle:
 * - An active binding has `revokedAt` set to null.
 * - Revoking a binding sets `revokedAt`. A revoked binding is never
 *   returned by the active-resolution port. Historical revoked
 *   bindings are preserved for audit.
 * - Re-binding after revocation is allowed (the per-tenant uniqueness
 *   is enforced only over active bindings via a partial unique index).
 *
 * The binding does NOT itself carry clinical author role. The trusted
 * `clinicalAuthorRole` lives on the Provider (see `provider.ts`); the
 * resolver returns it alongside the Provider identity so that the
 * caller receives a single trusted, server-resolved clinical actor.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { ClinicalNoteAuthorRole } from './clinical-author-role.js';
import type {
  ProviderId,
  ProviderLifecycleStatus,
} from './provider.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { UserId } from '../identity/user.js';

/**
 * Stable identifier for a UserProviderBinding. Branded so it cannot be
 * confused with other IDs at the type level.
 */
export type UserProviderBindingId = string & {
  readonly __brand: 'UserProviderBindingId';
};

/**
 * The canonical UserProviderBinding domain model. A readonly snapshot
 * of a binding's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as UserProviderBindingId.
 * - `tenantId`: the Tenant within which the binding is active. The
 *   binding is tenant-scoped even though the User is global; this is
 *   what allows the same global User to bind to different Providers
 *   in different tenants.
 * - `userId`: the global platform User bound to the Provider.
 * - `providerId`: the Provider bound to the User, within `tenantId`.
 * - `activatedAt`: when the binding became active.
 * - `revokedAt`: null if the binding is active; a timestamp if revoked.
 * - `createdAt` / `updatedAt`: persistence timestamps.
 *
 * The `Provider`'s own lifecycle status and `clinicalAuthorRole` are
 * NOT duplicated here. They are read from the Provider at resolution
 * time so that a status change (suspend/separate) or a role change is
 * reflected immediately without rewriting the binding.
 */
export interface UserProviderBinding {
  readonly id: UserProviderBindingId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly providerId: ProviderId;
  readonly activatedAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * The trusted, server-resolved active Provider identity for a User
 * within a tenant. Returned by
 * {@link UserProviderBindingRepository.findActiveProviderForUser}.
 *
 * This is the ONLY shape a clinical operation should accept as the
 * authoring/acting Provider identity. It is produced by the
 * server-side resolver from `(tenantId, userId)` alone; the caller
 * never supplies a Provider identifier that the resolver trusts.
 *
 * Field semantics:
 * - `bindingId`: the active binding row that grounded the resolution.
 *   Present so the caller can reference the binding in audit metadata
 *   without re-resolving. Audit metadata MUST NOT include sensitive
 *   data; the binding id is a non-sensitive operational identifier.
 * - `providerId`: the bound Provider's stable identifier.
 * - `tenantId`: the tenant within which the binding is active.
 *   Always equal to the `tenantId` passed to the resolver.
 * - `providerStatus`: the Provider's current lifecycle status. The
 *   resolver only returns a non-null result when the Provider is
 *   `active`; the field is present for caller visibility.
 * - `clinicalAuthorRole`: the Provider's trusted clinical author
 *   role, or null when none is configured. Per the ratified rules,
 *   R05 Allied Health may author only when this is non-null; the
 *   clinical author role is NEVER derived from the platform
 *   `roleCode`.
 *
 * The resolver returns null (fail closed) when any of the following
 * holds: no binding exists for the user in the tenant; the binding is
 * revoked; the User is disabled; the Provider is suspended or
 * separated. For facility-specific clinical actions, the
 * facility-scoped resolver additionally requires an active
 * (non-revoked) facility assignment and returns
 * {@link FacilityScopedActiveProviderIdentity}.
 */
export interface ActiveProviderIdentity {
  readonly bindingId: UserProviderBindingId;
  readonly providerId: ProviderId;
  readonly tenantId: TenantId;
  readonly providerStatus: ProviderLifecycleStatus;
  readonly clinicalAuthorRole: ClinicalNoteAuthorRole | null;
}

/**
 * The trusted active Provider identity for a User within a tenant AND
 * facility. Returned by
 * {@link UserProviderBindingRepository.findActiveProviderForUserAtFacility}.
 *
 * Carries everything in {@link ActiveProviderIdentity} plus the
 * `facilityAssignmentId` that grounded the facility-scoped resolution.
 * The resolver returns null (fail closed) when the facility assignment
 * is missing or revoked, in addition to all the
 * {@link ActiveProviderIdentity} fail-closed conditions.
 */
export interface FacilityScopedActiveProviderIdentity
  extends ActiveProviderIdentity {
  readonly facilityAssignmentId: string;
  readonly facilityId: FacilityId;
  readonly organisationId: string;
}

/**
 * Input for creating a new active UserProviderBinding.
 *
 * The caller supplies `tenantId`, `userId`, and `providerId`. The
 * persistence layer assigns `id`, `activatedAt` (defaulting to now),
 * `revokedAt` (defaulting to null), `createdAt`, and `updatedAt`.
 *
 * The persistence layer enforces the one-active-per-user-per-tenant
 * and one-active-per-provider-per-tenant cardinality through partial
 * unique indexes; a violating insert raises a Prisma
 * `PrismaClientKnownRequestError` with code `P2002`, which the API
 * exception layer translates to a 409 Conflict.
 *
 * The persistence layer also enforces tenant integrity: the Provider
 * must belong to the same tenant as the binding (composite foreign
 * key). The User is global, so no tenant integrity check applies to
 * `userId`.
 */
export interface CreateUserProviderBindingInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly providerId: ProviderId;
}

/**
 * Input for revoking (deactivating) an active UserProviderBinding.
 *
 * Revocation sets `revokedAt` on the currently-active binding for
 * `(tenantId, userId)`. After revocation a new binding may be created
 * for the same user (re-binding), subject to the per-provider
 * cardinality.
 */
export interface RevokeUserProviderBindingInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly revokedAt: Date;
}
