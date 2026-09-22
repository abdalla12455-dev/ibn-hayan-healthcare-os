import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import {
  createConfigurationCatalogue,
  type ConfigurationKeyRegistration,
} from '../../dist/catalogue/catalogue.js';

const key = 'example.capability.setting';

const registration: ConfigurationKeyRegistration = {
  key,
  displayName: 'Example Setting',
  description: 'A numeric setting for catalogue testing.',
  owningModule: 'example',
  owningBoundedContext: 'BC-TEST',
  valueType: 'integer',
  defaultValue: 15,
  maxLayer: 4,
  version: '1.0.0',
  status: 'active',
  ratifiedByAdr: 'ADR-TEST',
  valueSchema: z.number().int().min(5).max(120),
};

const context = {
  editionId: 'professional',
  tenantId: 'tenant-a',
  organisationId: 'organisation-a',
  facilityId: 'facility-a',
};

const scope = {
  tenantId: 'tenant-a',
  organisationId: 'organisation-a',
  facilityId: 'facility-a',
};

function override(value: unknown) {
  return {
    key,
    layer: 4 as const,
    scope,
    value,
    modifiedAt: '2026-09-19T12:00:00Z',
  };
}

test('a registered key resolves its default', () => {
  const catalogue =
    createConfigurationCatalogue([registration]);

  const result = catalogue.resolve(key, context, []);

  assert.equal(result.value, 15);
  assert.equal(result.sourceLayer, 1);
});

test('a registered key resolves a valid override', () => {
  const catalogue =
    createConfigurationCatalogue([registration]);

  const result = catalogue.resolve(
    key,
    context,
    [override(30)],
  );

  assert.equal(result.value, 30);
  assert.equal(result.sourceLayer, 4);
});

test('unknown configuration keys are rejected', () => {
  const catalogue =
    createConfigurationCatalogue([registration]);

  assert.throws(
    () => catalogue.resolve(
      'unknown.capability.setting',
      context,
      [],
    ),
    /CONFIGURATION_UNKNOWN_KEY/,
  );
});

test('duplicate registrations are rejected', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      registration,
      { ...registration },
    ]),
    /CONFIGURATION_DUPLICATE_KEY/,
  );
});

test('invalid default values are rejected', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      { ...registration, defaultValue: 'invalid' },
    ]),
    /CONFIGURATION_INVALID_DEFAULT/,
  );
});

test('invalid registration metadata is rejected', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        key: 'unrelated.capability.setting',
      },
    ]),
    /CONFIGURATION_INVALID_REGISTRATION/,
  );
});

test('retired keys cannot be resolved', () => {
  const catalogue =
    createConfigurationCatalogue([
      { ...registration, status: 'retired' },
    ]);

  assert.throws(
    () => catalogue.resolve(key, context, []),
    /CONFIGURATION_KEY_RETIRED/,
  );
});

test('registered values retain schema validation', () => {
  const catalogue =
    createConfigurationCatalogue([registration]);

  assert.throws(
    () => catalogue.resolve(
      key,
      context,
      [override('30')],
    ),
    /CONFIGURATION_INVALID_VALUE/,
  );
});

test('registered keys retain override restrictions', () => {
  const catalogue =
    createConfigurationCatalogue([
      { ...registration, maxLayer: 3 },
    ]);

  assert.throws(
    () => catalogue.resolve(
      key,
      context,
      [override(30)],
    ),
    /CONFIGURATION_OVERRIDE_NOT_ALLOWED/,
  );
});

test('registration metadata cannot be replaced', () => {
  const original = { ...registration };

  const catalogue =
    createConfigurationCatalogue([original]);

  original.maxLayer = 8;
  original.status = 'retired';

  const metadata = catalogue.getMetadata(key);

  assert.equal(metadata?.maxLayer, 4);
  assert.equal(metadata?.status, 'active');
  assert.equal(Object.isFrozen(metadata), true);

  const result = catalogue.resolve(
    key,
    context,
    [override(30)],
  );

  assert.equal(result.value, 30);
});

test('registration never mutates caller metadata', () => {
  const before = registration.maxLayer;

  createConfigurationCatalogue([registration]);

  assert.equal(registration.maxLayer, before);
});


test('public API exposes only catalogue-based resolution', async () => {
  const publicApi = await import('../../dist/index.js');

  assert.equal(
    typeof publicApi.createConfigurationCatalogue,
    'function',
  );

  assert.equal(
    Object.hasOwn(
      publicApi,
      'resolveValidatedConfiguration',
    ),
    false,
  );

  assert.equal(
    Object.hasOwn(
      publicApi,
      'resolveConfiguration',
    ),
    false,
  );

  const catalogue = publicApi.createConfigurationCatalogue([]);

  assert.throws(
    () => catalogue.resolve(
      'unknown.capability.setting',
      {
        editionId: 'professional',
        tenantId: 'tenant-a',
      },
      [],
    ),
    /CONFIGURATION_UNKNOWN_KEY/,
  );
});


test('boolean metadata rejects a numeric default', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'boolean',
        defaultValue: 15,
        valueSchema: z.number().int(),
      },
    ]),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('integer metadata rejects a boolean default', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'integer',
        defaultValue: true,
        valueSchema: z.boolean(),
      },
    ]),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('string metadata rejects a numeric default', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'string',
        defaultValue: 15,
        valueSchema: z.number(),
      },
    ]),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('integer metadata rejects fractional defaults', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'integer',
        defaultValue: 15.5,
        valueSchema: z.number(),
      },
    ]),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('decimal metadata accepts finite numeric values', () => {
  const catalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'decimal',
      defaultValue: 1.5,
      valueSchema: z.number().finite(),
    },
  ]);

  assert.equal(
    catalogue.resolve(key, context, []).value,
    1.5,
  );
});

test('schema-valid overrides must match the declared type', () => {
  const catalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'boolean',
      defaultValue: true,
      valueSchema: z.union([
        z.boolean(),
        z.number().int(),
      ]),
    },
  ]);

  assert.throws(
    () => catalogue.resolve(
      key,
      context,
      [override(30)],
    ),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('higher-priority values cannot hide a type mismatch', () => {
  const catalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'boolean',
      defaultValue: true,
      valueSchema: z.union([
        z.boolean(),
        z.number().int(),
      ]),
    },
  ]);

  const lower = {
    ...override(30),
    layer: 3 as const,
    scope: { tenantId: 'tenant-a' },
  };

  const higher = override(true);

  for (const records of [
    [lower, higher],
    [higher, lower],
  ]) {
    assert.throws(
      () => catalogue.resolve(key, context, records),
      /CONFIGURATION_VALUE_TYPE_MISMATCH/,
    );
  }
});


test('lowercase keys are accepted', () => {
  const catalogue = createConfigurationCatalogue([
    registration,
  ]);

  assert.equal(catalogue.has(key), true);
});

test('uppercase letters in any key segment are rejected', () => {
  const invalidKeys = [
    'Example.capability.setting',
    'example.Capability.setting',
    'example.capability.Setting',
    'example.capability.defaultDuration',
  ];

  for (const invalidKey of invalidKeys) {
    assert.throws(
      () => createConfigurationCatalogue([
        {
          ...registration,
          key: invalidKey,
          owningModule: invalidKey.split('.')[0],
        },
      ]),
      /CONFIGURATION_INVALID_REGISTRATION/,
    );
  }
});

test('numeric characters remain valid in lowercase keys', () => {
  const catalogue = createConfigurationCatalogue([
    {
      ...registration,
      key: 'example.capability.setting2',
    },
  ]);

  assert.equal(
    catalogue.has('example.capability.setting2'),
    true,
  );
});


test('enum registrations require declared values', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'enum',
        defaultValue: 'en',
        valueSchema: z.string(),
      },
    ]),
    /CONFIGURATION_INVALID_ENUM_VALUES/,
  );
});

test('enum registrations reject duplicate and empty options', () => {
  for (const values of [
    [],
    ['en', 'en'],
    ['en', ''],
  ]) {
    assert.throws(
      () => createConfigurationCatalogue([
        {
          ...registration,
          valueType: 'enum',
          defaultValue: 'en',
          valueSchema: z.string(),
          allowedValues: values,
        },
      ]),
      /CONFIGURATION_INVALID_ENUM_VALUES/,
    );
  }
});

test('enum defaults must belong to the registered options', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'enum',
        defaultValue: 'fr',
        valueSchema: z.string(),
        allowedValues: ['en', 'ar'],
      },
    ]),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('enum options must satisfy the declared schema', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'enum',
        defaultValue: 'en',
        valueSchema: z.enum(['en', 'ar']),
        allowedValues: ['en', 'ar', 'fr'],
      },
    ]),
    /CONFIGURATION_INVALID_ENUM_VALUES/,
  );
});

test('enum resolution accepts registered options only', () => {
  const enumCatalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'enum',
      defaultValue: 'en',
      valueSchema: z.string(),
      allowedValues: ['en', 'ar'],
    },
  ]);

  assert.equal(
    enumCatalogue.resolve(key, context, []).value,
    'en',
  );

  assert.equal(
    enumCatalogue.resolve(
      key,
      context,
      [override('ar')],
    ).value,
    'ar',
  );

  assert.throws(
    () => enumCatalogue.resolve(
      key,
      context,
      [override('fr')],
    ),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('higher priority cannot hide an invalid enum option', () => {
  const enumCatalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'enum',
      defaultValue: 'en',
      valueSchema: z.string(),
      allowedValues: ['en', 'ar'],
    },
  ]);

  const lower = {
    ...override('fr'),
    layer: 3 as const,
    scope: { tenantId: 'tenant-a' },
  };

  const higher = override('ar');

  for (const records of [
    [lower, higher],
    [higher, lower],
  ]) {
    assert.throws(
      () => enumCatalogue.resolve(key, context, records),
      /CONFIGURATION_VALUE_TYPE_MISMATCH/,
    );
  }
});

test('enum options cannot be changed after registration', () => {
  const allowedValues = ['en', 'ar'];

  const enumCatalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'enum',
      defaultValue: 'en',
      valueSchema: z.string(),
      allowedValues,
    },
  ]);

  allowedValues.push('fr');

  assert.throws(
    () => enumCatalogue.resolve(
      key,
      context,
      [override('fr')],
    ),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );

  const metadata = enumCatalogue.getMetadata(key);

  assert.equal(
    Object.isFrozen(metadata?.allowedValues),
    true,
  );
});


test('enum rejects coerced numeric defaults and overrides', () => {
  const definition = {
    ...registration,
    valueType: 'enum' as const,
    defaultValue: '1',
    valueSchema: z.coerce.string(),
    allowedValues: ['1', '2'],
  };

  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...definition,
        defaultValue: 1,
      },
    ]),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );

  const catalogue = createConfigurationCatalogue([
    definition,
  ]);

  assert.equal(
    catalogue.resolve(key, context, []).value,
    '1',
  );

  assert.equal(
    catalogue.resolve(
      key,
      context,
      [override('2')],
    ).value,
    '2',
  );

  assert.throws(
    () => catalogue.resolve(
      key,
      context,
      [override(1)],
    ),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('enum rejects values transformed into allowed options', () => {
  const definition = {
    ...registration,
    valueType: 'enum' as const,
    defaultValue: 'en',
    valueSchema: z.string().trim(),
    allowedValues: ['en', 'ar'],
  };

  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...definition,
        defaultValue: ' en ',
      },
    ]),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );

  const catalogue = createConfigurationCatalogue([
    definition,
  ]);

  assert.throws(
    () => catalogue.resolve(
      key,
      context,
      [override(' en ')],
    ),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('enum rejects schema transformations between allowed options', () => {
  const schema = z.string().transform(
    value => value === 'en' ? 'ar' : value,
  );

  const catalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'enum',
      defaultValue: 'ar',
      valueSchema: schema,
      allowedValues: ['ar'],
    },
  ]);

  // The registered option "ar" itself is unchanged.
  assert.equal(
    catalogue.resolve(key, context, []).value,
    'ar',
  );

  assert.throws(
    () => catalogue.resolve(
      key,
      context,
      [override('en')],
    ),
    /CONFIGURATION_VALUE_TYPE_MISMATCH/,
  );
});

test('a higher layer cannot hide a coerced enum value', () => {
  const catalogue = createConfigurationCatalogue([
    {
      ...registration,
      valueType: 'enum',
      defaultValue: '1',
      valueSchema: z.coerce.string(),
      allowedValues: ['1', '2'],
    },
  ]);

  const lower = {
    ...override(1),
    layer: 3 as const,
    scope: { tenantId: 'tenant-a' },
  };

  const higher = override('2');

  for (const records of [
    [lower, higher],
    [higher, lower],
  ]) {
    assert.throws(
      () => catalogue.resolve(key, context, records),
      /CONFIGURATION_VALUE_TYPE_MISMATCH/,
    );
  }
});


test('reference registration fails closed without validation', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'reference',
        defaultValue: '550e8400-e29b-41d4-a716-446655440000',
        valueSchema: z.string().uuid(),
      },
    ]),
    /CONFIGURATION_REFERENCE_VALIDATION_UNAVAILABLE/,
  );
});

test('reference registration cannot rely on a permissive schema', () => {
  assert.throws(
    () => createConfigurationCatalogue([
      {
        ...registration,
        valueType: 'reference',
        defaultValue: 'unverified-record',
        valueSchema: z.string(),
      },
    ]),
    /CONFIGURATION_REFERENCE_VALIDATION_UNAVAILABLE/,
  );
});
