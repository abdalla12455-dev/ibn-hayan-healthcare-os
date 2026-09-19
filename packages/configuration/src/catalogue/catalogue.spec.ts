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
