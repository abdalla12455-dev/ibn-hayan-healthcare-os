/**
 * @ibn-hayan/configuration
 *
 * Configuration foundation implementing the eight-layer precedence
 * model ratified by ADR-001 (Configuration-Driven Architecture).
 *
 * Provides a trusted configuration key catalogue, key metadata,
 * schema-based value validation, and catalogue-based resolution.
 *
 * The public API requires registered keys for configuration resolution.
 * The underlying precedence engine remains an internal implementation.
 *
 * This package does not independently provide authorization,
 * tenant-ownership verification, persistent configuration storage,
 * audit integration, or the complete validation framework.
 *
 * Environment-variable schemas and the authoritative Configuration
 * service remain future implementation stages.
 */

export const CONFIGURATION_PACKAGE_VERSION = '0.0.0' as const;

export const CONFIGURATION_PACKAGE_NAME = '@ibn-hayan/configuration' as const;

export type {
  ConfigurationLayer,
  ConfigurationContext,
  ConfigurationDefinition,
  ConfigurationOverride,
  ResolvedConfiguration,
} from './precedence/resolve.js';

export {
  createConfigurationCatalogue,
} from './catalogue/catalogue.js';

export type {
  ConfigurationCatalogue,
  ConfigurationKeyRegistration,
  ConfigurationKeyMetadata,
  ConfigurationKeyStatus,
  ConfigurationValueType,
} from './catalogue/catalogue.js';
