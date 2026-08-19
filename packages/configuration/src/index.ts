/**
 * @ibn-hayan/configuration
 *
 * Canonical Configuration package for the Ibn Hayan Healthcare
 * Operating System: the eight-layer precedence model ratified by
 * ADR-001 (Configuration-Driven Architecture) and the canonical
 * Configuration Key Registry.
 *
 * The first vertical slice implements:
 * - the canonical `ConfigurationLayer` type (L1–L8) and precedence
 *   helpers (layers L2 and L5–L8 are declared but not yet persistence
 *   scopes);
 * - the canonical `ConfigurationKeyDefinition` contract with a generic
 *   Zod value schema, owner, default, and allowed override layers;
 * - the canonical Key Registry with the first production key
 *   `scheduling.appointment.noShowGracePeriod` (L1 default 15, integer
 *   bounds 5..120, overridable at L3 Tenant and L4 Facility);
 * - registry lookup and registered-value validation helpers.
 *
 * Clinic-type representation is intentionally deferred until a
 * canonical clinic-type representation is ratified; the first slice
 * resolves L4 → L3 → L1 only.
 */

export * from './layers.js';
export * from './key-registry.js';
