/**
 * Canonical Configuration layer model for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per ADR-001 (Configuration-Driven Architecture) and
 * CONFIGURATION_ARCHITECTURE.md Section 2, Configuration is organized
 * into eight layers with explicit precedence, from `L1` (platform
 * default, lowest precedence) to `L8` (session, highest precedence).
 * The first vertical slice implements persistence only for `L1`
 * (Platform Default), `L3` (Tenant), and `L4` (Facility): layers `L2`
 * and `L5` through `L8` remain part of the canonical type model but
 * are NOT persistence scopes in this slice.
 *
 * This file is pure TypeScript apart from the Zod schema used for the
 * layer boundary validation. Zod is the validation library ratified by
 * ADR-012 and CODING_STANDARDS.md Section 6.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// ConfigurationLayer
// ---------------------------------------------------------------------------

/**
 * The complete eight-layer canonical Configuration model. Ordered from
 * lowest precedence (`L1` platform default) to highest precedence
 * (`L8` session). This tuple is the single source of truth for the
 * layer enumeration; ordering in this tuple defines precedence.
 */
export const CONFIGURATION_LAYERS = [
  'L1', // Platform Default
  'L2', // Edition
  'L3', // Tenant
  'L4', // Facility
  'L5', // Department
  'L6', // Care Team
  'L7', // User
  'L8', // Session
] as const;

export type ConfigurationLayer = (typeof CONFIGURATION_LAYERS)[number];

/**
 * The layers implemented as persistence scopes in the first vertical
 * slice. `L1` (Platform Default), `L3` (Tenant), and `L4` (Facility)
 * are read; `L3` and `L4` are writable through the administration API.
 * `L2` and `L5` through `L8` are declared in the canonical model but
 * are NOT persisted in this slice.
 */
export const IMPLEMENTED_CONFIGURATION_LAYERS = [
  'L1',
  'L3',
  'L4',
] as const;

export type ImplementedConfigurationLayer =
  (typeof IMPLEMENTED_CONFIGURATION_LAYERS)[number];

/**
 * Zod schema for the canonical layer enumeration. Used at API
 * boundaries to reject non-canonical layer values.
 */
export const ConfigurationLayerSchema = z.enum(CONFIGURATION_LAYERS);

/**
 * Zod schema for the layers implemented as persistence scopes in the
 * first vertical slice. The administration API uses this schema to
 * reject unsupported layers fail-closed.
 */
export const ImplementedConfigurationLayerSchema = z.enum(
  IMPLEMENTED_CONFIGURATION_LAYERS,
);

/**
 * Returns `true` if the supplied value is a canonical Configuration
 * layer.
 */
export function isConfigurationLayer(
  value: unknown,
): value is ConfigurationLayer {
  return ConfigurationLayerSchema.safeParse(value).success;
}

/**
 * The precedence index of a layer: `L1` → `0` (lowest precedence),
 * `L8` → `7` (highest precedence). Higher precedence layers override
 * lower precedence layers for the same key (per
 * CONFIGURATION_ARCHITECTURE.md Section 2.2).
 */
export function configurationLayerPrecedenceIndex(
  layer: ConfigurationLayer,
): number {
  return (CONFIGURATION_LAYERS as readonly string[]).indexOf(layer);
}

/**
 * Compare two layers by precedence. Returns a negative number when `a`
 * has lower precedence than `b`, zero when equal, and a positive
 * number otherwise. Deterministic per CONFIGURATION_ARCHITECTURE.md
 * Section 2.2 ("Override semantics are deterministic").
 */
export function compareConfigurationLayerPrecedence(
  a: ConfigurationLayer,
  b: ConfigurationLayer,
): number {
  return (
    configurationLayerPrecedenceIndex(a) -
    configurationLayerPrecedenceIndex(b)
  );
}

/**
 * Select the highest-precedence layer from the supplied candidate
 * layers. Returns `undefined` when the candidate list is empty. The
 * selection is deterministic: for any given candidate list the result
 * is uniquely determined.
 */
export function highestPrecedenceLayer(
  candidates: readonly ConfigurationLayer[],
): ConfigurationLayer | undefined {
  let winner: ConfigurationLayer | undefined;
  for (const candidate of candidates) {
    if (
      winner === undefined ||
      compareConfigurationLayerPrecedence(candidate, winner) > 0
    ) {
      winner = candidate;
    }
  }
  return winner;
}
