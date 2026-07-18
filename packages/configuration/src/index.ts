/**
 * @ibn-hayan/configuration
 *
 * Configuration schema, evaluation helpers, and the eight-layer
 * precedence model ratified by ADR-001 (Configuration-Driven Architecture).
 *
 * In this batch the package contains only a package-boundary marker. The
 * Zod schemas for environment variables and the layer-precedence helpers
 * arrive in a subsequent batch alongside the first vertical slice.
 */

export const CONFIGURATION_PACKAGE_VERSION = '0.0.0' as const;

export const CONFIGURATION_PACKAGE_NAME = '@ibn-hayan/configuration' as const;
