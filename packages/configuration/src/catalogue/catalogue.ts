import type { ZodType } from 'zod';

import {
  resolveValidatedConfiguration,
  type ConfigurationContext,
  type ConfigurationDefinition,
  type ConfigurationOverride,
  type ResolvedConfiguration,
} from '../precedence/resolve.js';

/**
 * Canonical configuration key metadata.
 *
 * Registrations are supplied by trusted, project-owned code.
 * No runtime user-registration endpoint exists in this foundation.
 */

export type ConfigurationValueType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'enum'
  | 'reference'
  | 'complex';

export type ConfigurationKeyStatus =
  | 'active'
  | 'deprecated'
  | 'retired';

export interface ConfigurationKeyRegistration
  extends ConfigurationDefinition<unknown> {
  readonly displayName: string;
  readonly description: string;
  readonly owningModule: string;
  readonly owningBoundedContext: string;
  readonly valueType: ConfigurationValueType;
  readonly version: string;
  readonly status: ConfigurationKeyStatus;
  readonly ratifiedByAdr: string;
  readonly valueSchema: ZodType<unknown>;
}

export type ConfigurationKeyMetadata = Readonly<
  Omit<
    ConfigurationKeyRegistration,
    'valueSchema' | 'defaultValue'
  >
>;

export interface ConfigurationCatalogue {
  readonly has: (key: string) => boolean;

  readonly getMetadata: (
    key: string
  ) => ConfigurationKeyMetadata | undefined;

  readonly resolve: (
    key: string,
    context: ConfigurationContext,
    overrides: readonly ConfigurationOverride<unknown>[],
  ) => ResolvedConfiguration<unknown>;
}

const KEY_PATTERN =
  /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,}$/;

const VALUE_TYPES: readonly ConfigurationValueType[] = [
  'string',
  'integer',
  'decimal',
  'boolean',
  'enum',
  'reference',
  'complex',
];

const STATUSES: readonly ConfigurationKeyStatus[] = [
  'active',
  'deprecated',
  'retired',
];

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0;
}

/**
 * Validate the runtime representation of primitive configuration
 * values independently of the registered Zod schema.
 *
 * Enum, reference, and complex values require their own canonical
 * contracts and are intentionally not classified by this helper.
 */
function matchesDeclaredPrimitiveType(
  valueType: ConfigurationValueType,
  value: unknown,
): boolean {
  switch (valueType) {
    case 'string':
      return typeof value === 'string';

    case 'integer':
      return typeof value === 'number'
        && Number.isSafeInteger(value);

    case 'decimal':
      return typeof value === 'number'
        && Number.isFinite(value);

    case 'boolean':
      return typeof value === 'boolean';

    default:
      return true;
  }
}

/**
 * Create a fixed, read-only catalogue of trusted key definitions.
 *
 * This foundation does not register actual healthcare configuration
 * keys or implement configuration write authorization.
 *
 * Value-type-specific, referential, semantic, regulatory and
 * contextual validation remain separate implementation stages.
 */
export function createConfigurationCatalogue(
  registrations: readonly ConfigurationKeyRegistration[],
): ConfigurationCatalogue {
  const definitions =
    new Map<string, ConfigurationKeyRegistration>();

  const metadata =
    new Map<string, ConfigurationKeyMetadata>();

  for (const registration of registrations) {
    if (
      !nonEmpty(registration.key)
      || !KEY_PATTERN.test(registration.key)
      || !nonEmpty(registration.owningModule)
      || !registration.key.startsWith(
        registration.owningModule + '.'
      )
      || !nonEmpty(registration.owningBoundedContext)
      || !nonEmpty(registration.displayName)
      || !nonEmpty(registration.description)
      || !nonEmpty(registration.version)
      || !nonEmpty(registration.ratifiedByAdr)
      || !VALUE_TYPES.includes(registration.valueType)
      || !STATUSES.includes(registration.status)
      || !Number.isInteger(registration.maxLayer)
      || registration.maxLayer < 1
      || registration.maxLayer > 8
      || !registration.valueSchema
      || typeof registration.valueSchema.safeParse
        !== 'function'
    ) {
      throw new Error('CONFIGURATION_INVALID_REGISTRATION');
    }

    if (definitions.has(registration.key)) {
      throw new Error('CONFIGURATION_DUPLICATE_KEY');
    }

    const parsedDefault =
      registration.valueSchema.safeParse(
        registration.defaultValue
      );

    if (!parsedDefault.success) {
      throw new Error('CONFIGURATION_INVALID_DEFAULT');
    }

    if (!matchesDeclaredPrimitiveType(
      registration.valueType,
      parsedDefault.data,
    )) {
      throw new Error('CONFIGURATION_VALUE_TYPE_MISMATCH');
    }

    // Snapshot registration metadata. External changes to the
    // original registration object cannot replace its fields.
    const stored = Object.freeze({
      ...registration,
      defaultValue: parsedDefault.data,
    });

    definitions.set(stored.key, stored);

    const {
      valueSchema: _valueSchema,
      defaultValue: _defaultValue,
      ...publicMetadata
    } = stored;

    metadata.set(
      stored.key,
      Object.freeze(publicMetadata),
    );
  }

  return Object.freeze({
    has(key: string): boolean {
      return definitions.has(key);
    },

    getMetadata(
      key: string,
    ): ConfigurationKeyMetadata | undefined {
      return metadata.get(key);
    },

    resolve(
      key: string,
      context: ConfigurationContext,
      overrides: readonly ConfigurationOverride<unknown>[],
    ): ResolvedConfiguration<unknown> {
      const definition = definitions.get(key);

      if (!definition) {
        throw new Error('CONFIGURATION_UNKNOWN_KEY');
      }

      if (definition.status === 'retired') {
        throw new Error('CONFIGURATION_KEY_RETIRED');
      }

      // Validate every supplied value for the requested key.
      // A higher-priority override must not conceal a type mismatch
      // in a lower-priority record.
      for (const record of overrides) {
        if (record.key !== key) {
          continue;
        }

        const parsedValue = definition.valueSchema.safeParse(
          record.value,
        );

        if (
          parsedValue.success
          && !matchesDeclaredPrimitiveType(
            definition.valueType,
            parsedValue.data,
          )
        ) {
          throw new Error('CONFIGURATION_VALUE_TYPE_MISMATCH');
        }
      }

      return resolveValidatedConfiguration(
        definition,
        context,
        overrides,
      );
    },
  });
}
