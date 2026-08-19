import { z } from 'zod';

/**
 * Configuration administration contracts (BC16).
 *
 * The Configuration administration API is intentionally minimal in
 * this first vertical slice:
 *
 * - `GET /api/v1/configuration/{key}` — effective value + source
 *   layer for the authenticated session's trusted scope.
 * - `PUT /api/v1/configuration/{key}` — upsert an override at the
 *   explicitly requested supported layer (L3 tenant or L4 facility).
 *
 * Scope is NEVER caller-controlled: the API derives
 * tenant/organisation/facility from the authenticated session. The
 * request body only selects the LAYER (L3 or L4). L1 platform
 * defaults are seeded by migrations and cannot be written through
 * this endpoint; L2 and L5–L8 are not implemented as persistence
 * scopes in v1.
 */

/** Layers that may be requested through the write API as of v1. */
export const CONFIGURATION_WRITABLE_LAYERS = ['L3', 'L4'] as const;
export type ConfigurationWritableLayer =
  (typeof CONFIGURATION_WRITABLE_LAYERS)[number];

/** Layers materialised by the resolution stack (L1 platform default). */
export const CONFIGURATION_RESOLVED_LAYERS = ['L1', 'L3', 'L4'] as const;
export type ConfigurationResolvedLayer =
  (typeof CONFIGURATION_RESOLVED_LAYERS)[number];

/**
 * PUT request body. `value` is unconstrained JSON; the server
 * validates it against the registered key's Zod schema before
 * persistence. `layer` selects the intended persistence scope and is
 * cross-checked against the caller's session scope server-side.
 */
export const UpsertConfigurationValueRequestSchema = z.object({
  layer: z.enum(CONFIGURATION_WRITABLE_LAYERS),
  value: z.unknown(),
});
export type UpsertConfigurationValueRequest = z.infer<
  typeof UpsertConfigurationValueRequestSchema
>;

/** GET response: effective value + provenance metadata. */
export const EffectiveConfigurationValueResponseSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  valueType: z.string(),
  sourceLayer: z.enum(CONFIGURATION_RESOLVED_LAYERS),
  resolvedAt: z.string(),
  valueVersion: z.number().int().nullable(),
});
export type EffectiveConfigurationValueResponse = z.infer<
  typeof EffectiveConfigurationValueResponseSchema
>;

/** PUT response: the persisted override and its version. */
export const ConfigurationValueUpsertResponseSchema = z.object({
  key: z.string(),
  layer: z.enum(CONFIGURATION_WRITABLE_LAYERS),
  scope: z.object({
    tenantId: z.string().nullable(),
    organisationId: z.string().nullable(),
    facilityId: z.string().nullable(),
  }),
  value: z.unknown(),
  valueVersion: z.number().int(),
  outcome: z.enum(['created', 'updated']),
  updatedAt: z.string(),
});
export type ConfigurationValueUpsertResponse = z.infer<
  typeof ConfigurationValueUpsertResponseSchema
>;
