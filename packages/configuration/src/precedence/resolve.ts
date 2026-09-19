/**
 * Pure configuration precedence engine.
 *
 * ADR-001: platform defaults (L1) through session overrides (L8).
 *
 * This package does not authorize callers, verify database ownership,
 * validate configuration value schemas, or persist changes.
 * Those checks belong to the future authoritative configuration
 * service and its validated repository adapters.
 */

export type ConfigurationLayer = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type OverrideLayer = Exclude<ConfigurationLayer, 1>;

export interface ConfigurationContext {
  readonly editionId: string;
  readonly tenantId: string;
  readonly organisationId?: string;
  readonly facilityId?: string;
  readonly departmentId?: string;
  readonly careTeamId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

export interface ConfigurationDefinition<T> {
  readonly key: string;
  readonly defaultValue: T;
  readonly maxLayer: ConfigurationLayer;
}

export interface ConfigurationOverride<T> {
  readonly key: string;
  readonly layer: OverrideLayer;
  readonly scope: Readonly<Record<string, string>>;
  readonly value: T;
  readonly modifiedAt: string;
}

export interface ResolvedConfiguration<T> {
  readonly key: string;
  readonly value: T;
  readonly sourceLayer: ConfigurationLayer;
  readonly modifiedAt: string | null;
}

const scopeFields: Readonly<
  Record<OverrideLayer, readonly (keyof ConfigurationContext)[]>
> = {
  2: ['editionId'],
  3: ['tenantId'],
  4: ['tenantId', 'organisationId', 'facilityId'],
  5: [
    'tenantId',
    'organisationId',
    'facilityId',
    'departmentId',
  ],
  6: [
    'tenantId',
    'organisationId',
    'facilityId',
    'departmentId',
    'careTeamId',
  ],
  7: ['tenantId', 'userId'],
  8: ['tenantId', 'userId', 'sessionId'],
};

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateContext(context: ConfigurationContext): void {
  if (
    !validIdentifier(context.editionId) ||
    !validIdentifier(context.tenantId)
  ) {
    throw new Error('CONFIGURATION_INVALID_CONTEXT');
  }

  const hierarchy: readonly (keyof ConfigurationContext)[] = [
    'organisationId',
    'facilityId',
    'departmentId',
    'careTeamId',
  ];

  let parentMissing = false;

  for (const field of hierarchy) {
    const value = context[field];

    if (value === undefined) {
      parentMissing = true;
    } else if (!validIdentifier(value) || parentMissing) {
      throw new Error('CONFIGURATION_INVALID_CONTEXT');
    }
  }

  if (
    context.userId !== undefined &&
    !validIdentifier(context.userId)
  ) {
    throw new Error('CONFIGURATION_INVALID_CONTEXT');
  }

  if (
    context.sessionId !== undefined &&
    (
      !validIdentifier(context.sessionId) ||
      !validIdentifier(context.userId)
    )
  ) {
    throw new Error('CONFIGURATION_INVALID_CONTEXT');
  }
}

function validateScope<T>(
  record: ConfigurationOverride<T>,
): readonly (keyof ConfigurationContext)[] {
  const fields = scopeFields[record.layer];

  if (!fields) {
    throw new Error('CONFIGURATION_INVALID_LAYER');
  }

  const actual = Object.keys(record.scope);

  if (
    actual.length !== fields.length ||
    actual.some(
      (field) =>
        !fields.includes(field as keyof ConfigurationContext) ||
        !validIdentifier(record.scope[field]),
    )
  ) {
    throw new Error('CONFIGURATION_INVALID_SCOPE');
  }

  return fields;
}

/**
 * Resolve one registered, previously schema-validated configuration key.
 *
 * The authoritative service must supply an authenticated, ownership-
 * verified context and correctly validated configuration records.
 * This function performs deterministic precedence and exact
 * scope matching; it never establishes database ownership itself.
 *
 * Conflicting active overrides in the same selected scope fail closed.
 */
export function resolveConfiguration<T>(
  definition: ConfigurationDefinition<T>,
  context: ConfigurationContext,
  overrides: readonly ConfigurationOverride<T>[],
): ResolvedConfiguration<T> {
  validateContext(context);

  if (
    !validIdentifier(definition.key) ||
    !Number.isInteger(definition.maxLayer) ||
    definition.maxLayer < 1 ||
    definition.maxLayer > 8
  ) {
    throw new Error('CONFIGURATION_INVALID_DEFINITION');
  }

  let selected: ConfigurationOverride<T> | undefined;

  // Track matching layers independently of the winning override.
  // A higher-priority record must not hide a same-layer conflict.
  const matchedLayers = new Set<OverrideLayer>();

  for (const record of overrides) {
    if (record.key !== definition.key) {
      continue;
    }

    const fields = validateScope(record);

    const matches = fields.every(
      (field) => record.scope[field] === context[field],
    );

    if (!matches) {
      continue;
    }

    if (record.layer > definition.maxLayer) {
      throw new Error('CONFIGURATION_OVERRIDE_NOT_ALLOWED');
    }

    if (matchedLayers.has(record.layer)) {
      throw new Error('CONFIGURATION_CONFLICT');
    }

    matchedLayers.add(record.layer);

    if (!selected || record.layer > selected.layer) {
      selected = record;
    }
  }

  return {
    key: definition.key,
    value: selected ? selected.value : definition.defaultValue,
    sourceLayer: selected ? selected.layer : 1,
    modifiedAt: selected ? selected.modifiedAt : null,
  };
}


/**
 * Schema-validated entry point for configuration resolution.
 *
 * The caller must supply a definition from the trusted configuration
 * key catalogue and an authenticated, ownership-verified context.
 *
 * Every supplied override for the requested key is validated before
 * precedence evaluation. Invalid values fail closed, including
 * lower-priority and non-selected records.
 *
 * This function does not perform authorization, verify database
 * ownership, persist changes, or emit audit events.
 */

export interface ValidatedConfigurationDefinition<T>
  extends ConfigurationDefinition<T> {
  readonly valueSchema: import('zod').ZodType<T>;
}

export function resolveValidatedConfiguration<T>(
  definition: ValidatedConfigurationDefinition<T>,
  context: ConfigurationContext,
  overrides: readonly ConfigurationOverride<unknown>[],
): ResolvedConfiguration<T> {
  const parsedDefault = definition.valueSchema.safeParse(
    definition.defaultValue,
  );

  if (!parsedDefault.success) {
    throw new Error('CONFIGURATION_INVALID_DEFAULT');
  }

  const validatedOverrides: ConfigurationOverride<T>[] = [];

  for (const record of overrides) {
    if (record.key !== definition.key) {
      throw new Error('CONFIGURATION_UNKNOWN_OVERRIDE_KEY');
    }

    const parsedValue = definition.valueSchema.safeParse(
      record.value,
    );

    if (!parsedValue.success) {
      throw new Error('CONFIGURATION_INVALID_VALUE');
    }

    validatedOverrides.push({
      ...record,
      value: parsedValue.data,
    });
  }

  return resolveConfiguration(
    {
      key: definition.key,
      defaultValue: parsedDefault.data,
      maxLayer: definition.maxLayer,
    },
    context,
    validatedOverrides,
  );
}
