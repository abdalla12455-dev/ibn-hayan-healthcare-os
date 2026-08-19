/**
 * Configuration domain model for the Ibn Hayan Healthcare Operating
 * System (BC16, per download/docs/03_DOMAIN/CONFIGURATION.md).
 *
 * The canonical eight-layer model (L1 Platform Default → L8 Session)
 * is duplicated here as the `ConfigurationLayerCode` literal union
 * because the domain package cannot import `@ibn-hayan/configuration`
 * (which depends on Zod; the domain package is framework-free). The
 * duplication mirrors the RoleCode duplication between
 * `@ibn-hayan/domain` and `@ibn-hayan/contracts`; divergence is
 * caught by the package and API test suites.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { FacilityId, OrganisationId, TenantId } from '../tenancy/index.js';

// ---------------------------------------------------------------------------
// ConfigurationLayerCode (duplicated canonical layer union)
// ---------------------------------------------------------------------------

/**
 * The canonical eight Configuration layers in precedence order, from
 * L1 (lowest precedence) to L8 (highest precedence). Mirror of the
 * `ConfigurationLayer` union in `@ibn-hayan/configuration`.
 */
export const CONFIGURATION_LAYER_CODES = [
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
  'L7',
  'L8',
] as const;

export type ConfigurationLayerCode =
  (typeof CONFIGURATION_LAYER_CODES)[number];

/**
 * The layers implemented as persistence scopes in the first vertical
 * slice: L1 (read), L3 and L4 (read and write).
 */
export const IMPLEMENTED_CONFIGURATION_LAYER_CODES = [
  'L1',
  'L3',
  'L4',
] as const;

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/**
 * The current value of one Configuration key at one layer within one
 * scope. `value` is the generic decoded JSON value; the Key Registry
 * validates it against the registered Zod schema at read and write
 * time (per the generic persistence model — no per-type columns).
 */
export interface ConfigurationValue {
  readonly id: string;
  readonly key: string;
  readonly layer: ConfigurationLayerCode;
  readonly tenantId: TenantId | null;
  readonly organisationId: OrganisationId | null;
  readonly facilityId: FacilityId | null;
  readonly value: unknown;
  /** Optimistic record version; incremented on every successful update. */
  readonly valueVersion: number;
  /** Actor attribution (logical UUID; null for the platform seed). */
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * An immutable version-history record. Every successful create or
 * update appends exactly one version record in the same transaction as
 * the current-value write. Version records are never updated or
 * deleted (append-only).
 */
export interface ConfigurationValueVersion {
  readonly id: string;
  readonly configurationValueId: string;
  readonly key: string;
  readonly layer: ConfigurationLayerCode;
  readonly tenantId: TenantId | null;
  readonly organisationId: OrganisationId | null;
  readonly facilityId: FacilityId | null;
  readonly value: unknown;
  /** The record version number this entry captures (1 on create). */
  readonly valueVersion: number;
  readonly actorId: string | null;
  readonly createdAt: Date;
}

// ---------------------------------------------------------------------------
// Resolution scope and result
// ---------------------------------------------------------------------------

/**
 * The trusted scope used to resolve a Configuration value. Scope is
 * derived server-side from the authenticated context; callers never
 * supply scope identifiers across the API boundary.
 */
export interface ConfigurationResolutionScope {
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId | null;
  readonly facilityId: FacilityId | null;
}

/**
 * The resolved Configuration value with its provenance metadata.
 * Returned to consumers so a module never performs its own layer
 * resolution (per CONFIGURATION_ARCHITECTURE.md §2.2).
 */
export interface ConfigurationResolution {
  readonly key: string;
  readonly value: unknown;
  readonly sourceLayer: ConfigurationLayerCode;
  readonly valueVersion: number;
  readonly updatedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Resolution failure modes (fail-closed)
// ---------------------------------------------------------------------------

/** Base type for Configuration resolution failure codes. */
export type ConfigurationResolutionFailureReason =
  | 'unknown_key'
  | 'invalid_value'
  | 'unresolvable';

/**
 * Thrown by the ConfigurationResolutionPort on fail-closed results:
 * an unknown/unregistered key, an invalid persisted value (never a
 * silent fallback), or a scope/registry incoherence. Consumers map the
 * failure to their own controlled error envelope.
 */
export class ConfigurationResolutionError extends Error {
  readonly reason: ConfigurationResolutionFailureReason;

  constructor(
    reason: ConfigurationResolutionFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'ConfigurationResolutionError';
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Repository write input and result
// ---------------------------------------------------------------------------

/**
 * Input for an atomic Configuration create/update. Scope is
 * validated for coherence against the layer before persistence:
 * L1 requires all scope identifiers null; L3 requires exactly
 * tenantId; L4 requires tenantId + organisationId + facilityId.
 */
export interface ConfigurationValuePutInput {
  readonly key: string;
  readonly layer: ConfigurationLayerCode;
  readonly tenantId: TenantId | null;
  readonly organisationId: OrganisationId | null;
  readonly facilityId: FacilityId | null;
  readonly value: unknown;
  readonly actorId: string | null;
}

/**
 * The result of an atomic Configuration create/update. A successful
 * put creates the current-value row (version 1) or performs an
 * optimistic check-and-increment update, and appends exactly one
 * immutable version record in the same transaction. Previous value and
 * previous version are returned so the caller can build a
 * previousState/newState audit diff.
 */
export type ConfigurationValuePutResult =
  | {
      readonly outcome: 'created';
      readonly value: ConfigurationValue;
      readonly previousValue: null;
      readonly previousVersion: null;
    }
  | {
      readonly outcome: 'updated';
      readonly value: ConfigurationValue;
      readonly previousValue: unknown;
      readonly previousVersion: number;
    }
  | { readonly outcome: 'scope_incoherent' };
