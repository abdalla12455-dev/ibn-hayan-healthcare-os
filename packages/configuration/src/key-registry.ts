/**
 * Canonical Configuration Key Registry for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per CONFIGURATION_ARCHITECTURE.md Sections 2.3 and 7, every
 * Configuration key is declared in a canonical registry entry that
 * defines: the canonical key, the owning bounded context, the value
 * type, the validation schema, the L1 platform default, the allowed
 * override layers, and metadata. Runtime and write-time validation
 * validate the stored generic JSON value against the registered schema
 * before persistence. Unknown or unregistered keys are rejected.
 *
 * Per the operator-ratified first vertical slice decisions, this
 * registry intentionally contains ONLY the first production key:
 * `scheduling.appointment.noShowGracePeriod` (owned by BC06
 * Scheduling). No unrelated keys are added.
 */

import { z } from 'zod';
import type { ConfigurationLayer } from './layers.js';

// ---------------------------------------------------------------------------
// ConfigurationKeyDefinition
// ---------------------------------------------------------------------------

/**
 * The value types supported by the generic value persistence model. In
 * the first vertical slice only `integer` is registered; the
 * persistence model (JSONB) supports any future typed key without a
 * schema change per key.
 */
export type ConfigurationValueType = 'integer';

/**
 * The canonical definition of one registered Configuration key.
 */
export interface ConfigurationKeyDefinition {
  /** The canonical dot-namespaced key (e.g. `scheduling.appointment.noShowGracePeriod`). */
  readonly key: string;
  /** The owning bounded context (e.g. `BC06 Scheduling`). */
  readonly owner: string;
  /** The value type carried in the generic JSONB persistence model. */
  readonly valueType: ConfigurationValueType;
  /** The L1 platform default value (the seeded L1 row). */
  readonly defaultValue: unknown;
  /**
   * The layers at which this key may be overridden, per
   * CONFIGURATION_ARCHITECTURE.md Section 2.3. Layers outside this
   * list inherit the resolved value.
   */
  readonly allowedOverrideLayers: readonly ConfigurationLayer[];
  /**
   * The generic registered value schema. Runtime and write-time
   * validation parse the stored JSON value against this schema before
   * persistence and before resolution (fail-closed). Zod is the
   * validation library ratified by ADR-012 and CODING_STANDARDS.md
   * Section 6.
   */
  readonly schema: z.ZodType<unknown>;
}

/**
 * The validation result of a registered Configuration value.
 */
export type ConfigurationValueValidationResult =
  | { readonly success: true; readonly data: unknown }
  | { readonly success: false; readonly issues: readonly string[] };

// ---------------------------------------------------------------------------
// Registered keys
// ---------------------------------------------------------------------------

/**
 * The canonical ownership code of the Scheduling bounded context
 * (BC06), the owner of the first registered key.
 */
export const SCHEDULING_OWNER = 'BC06 Scheduling';

/**
 * The first production Configuration key: the no-show grace period in
 * minutes, enforced before an appointment may transition to `no_show`.
 * L1 platform default 15 minutes; overridable at L3 (Tenant) and L4
 * (Facility); integer bounds 5..120 minutes (APPOINTMENTS.md §7.1
 * documents a typical 15–30 minute range).
 */
export const NO_SHOW_GRACE_PERIOD_KEY =
  'scheduling.appointment.noShowGracePeriod';

/**
 * The canonical Configuration Key Registry for the first vertical
 * slice. Contains exactly one entry. Future keys are added by
 * ratified decisions only.
 */
export const CONFIGURATION_KEY_REGISTRY: readonly ConfigurationKeyDefinition[] =
  [
    {
      key: NO_SHOW_GRACE_PERIOD_KEY,
      owner: SCHEDULING_OWNER,
      valueType: 'integer',
      defaultValue: 15,
      allowedOverrideLayers: ['L3', 'L4'],
      schema: z.number().int().min(5).max(120),
    },
  ];

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

/**
 * Look up a registered Configuration key definition. Returns `null`
 * when the key is not registered (fail-closed for unknown keys).
 */
export function getConfigurationKeyDefinition(
  key: string,
): ConfigurationKeyDefinition | null {
  const definition = CONFIGURATION_KEY_REGISTRY.find(
    (entry) => entry.key === key,
  );
  return definition ?? null;
}

/**
 * Returns `true` when the supplied key is registered in the canonical
 * registry.
 */
export function isRegisteredConfigurationKey(key: string): boolean {
  return getConfigurationKeyDefinition(key) !== null;
}

/**
 * Validate a generic JSON value against a registered key definition.
 * Returns the parsed value on success, or the Zod issue messages on
 * failure. Used at write time (before persistence) and at read time
 * (before resolution returns the value to a consumer).
 */
export function validateConfigurationValue(
  definition: ConfigurationKeyDefinition,
  value: unknown,
): ConfigurationValueValidationResult {
  const result = definition.schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    issues: result.error.issues.map((issue) => issue.message),
  };
}

/**
 * Returns `true` when the supplied layer is an allowed override layer
 * for the supplied key definition.
 */
export function isOverrideLayerAllowed(
  definition: ConfigurationKeyDefinition,
  layer: ConfigurationLayer,
): boolean {
  return (definition.allowedOverrideLayers as readonly string[]).includes(
    layer,
  );
}
