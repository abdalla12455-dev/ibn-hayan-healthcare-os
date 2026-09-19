import test from 'node:test';
import { z } from 'zod';
import assert from 'node:assert/strict';

import {
  resolveConfiguration,
  resolveValidatedConfiguration,
  type ConfigurationContext,
  type ConfigurationOverride,
} from './resolve.ts';

const key = 'scheduling.appointment.defaultDuration';

const context: ConfigurationContext = {
  editionId: 'professional',
  tenantId: 'tenant-a',
  organisationId: 'organisation-a',
  facilityId: 'facility-a',
  departmentId: 'department-a',
  careTeamId: 'team-a',
  userId: 'user-a',
  sessionId: 'session-a',
};

const scopes = [
  {},
  {},
  { editionId: 'professional' },
  { tenantId: 'tenant-a' },
  {
    tenantId: 'tenant-a',
    organisationId: 'organisation-a',
    facilityId: 'facility-a',
  },
  {
    tenantId: 'tenant-a',
    organisationId: 'organisation-a',
    facilityId: 'facility-a',
    departmentId: 'department-a',
  },
  {
    tenantId: 'tenant-a',
    organisationId: 'organisation-a',
    facilityId: 'facility-a',
    departmentId: 'department-a',
    careTeamId: 'team-a',
  },
  { tenantId: 'tenant-a', userId: 'user-a' },
  {
    tenantId: 'tenant-a',
    userId: 'user-a',
    sessionId: 'session-a',
  },
] as const;

function override(
  layer: 2 | 3 | 4 | 5 | 6 | 7 | 8,
  value: number,
): ConfigurationOverride<number> {
  return {
    key,
    layer,
    scope: scopes[layer],
    value,
    modifiedAt: '2026-09-19T12:00:00.000Z',
  };
}

const definition = {
  key,
  defaultValue: 15,
  maxLayer: 8 as const,
};

test('L1 default applies without overrides', () => {
  const result = resolveConfiguration(definition, context, []);

  assert.equal(result.value, 15);
  assert.equal(result.sourceLayer, 1);
  assert.equal(result.modifiedAt, null);
});

test('all eight layers follow canonical precedence', () => {
  const records = ([2, 3, 4, 5, 6, 7, 8] as const)
    .map((layer) => override(layer, layer * 10));

  for (let maximum = 1; maximum <= 8; maximum++) {
    const result = resolveConfiguration(
      definition,
      context,
      records.filter((record) => record.layer <= maximum),
    );

    assert.equal(result.sourceLayer, maximum);
    assert.equal(result.value, maximum === 1 ? 15 : maximum * 10);
  }
});

test('higher layers cannot override a fixed L1 key', () => {
  assert.throws(
    () => resolveConfiguration(
      { ...definition, maxLayer: 1 },
      context,
      [override(3, 30)],
    ),
    /CONFIGURATION_OVERRIDE_NOT_ALLOWED/,
  );
});

test('L2 is allowed while L3 is rejected for an L2-fixed key', () => {
  const fixed = { ...definition, maxLayer: 2 as const };

  assert.equal(
    resolveConfiguration(fixed, context, [override(2, 20)]).value,
    20,
  );

  assert.throws(
    () => resolveConfiguration(fixed, context, [override(3, 30)]),
    /CONFIGURATION_OVERRIDE_NOT_ALLOWED/,
  );
});

test('another tenant override never supplies the requested value', () => {
  const otherTenant = {
    ...override(3, 999),
    scope: { tenantId: 'tenant-b' },
  };

  assert.equal(
    resolveConfiguration(definition, context, [otherTenant]).value,
    15,
  );
});

test('another facility override is not inherited', () => {
  const otherFacility = {
    ...override(4, 999),
    scope: {
      tenantId: 'tenant-a',
      organisationId: 'organisation-a',
      facilityId: 'facility-b',
    },
  };

  assert.equal(
    resolveConfiguration(definition, context, [otherFacility]).value,
    15,
  );
});

test('another user or session cannot supply an override', () => {
  const otherUser = {
    ...override(7, 999),
    scope: { tenantId: 'tenant-a', userId: 'user-b' },
  };

  const otherSession = {
    ...override(8, 999),
    scope: {
      tenantId: 'tenant-a',
      userId: 'user-a',
      sessionId: 'session-b',
    },
  };

  assert.equal(
    resolveConfiguration(
      definition,
      context,
      [otherUser, otherSession],
    ).value,
    15,
  );
});

test('an incomplete facility scope is rejected', () => {
  const incomplete = {
    ...override(4, 999),
    scope: {
      tenantId: 'tenant-a',
      facilityId: 'facility-a',
    },
  };

  assert.throws(
    () => resolveConfiguration(definition, context, [incomplete]),
    /CONFIGURATION_INVALID_SCOPE/,
  );
});

test('higher precedence cannot hide a lower-layer conflict', () => {
  const first = override(4, 20);
  const higher = override(8, 80);
  const duplicate = override(4, 30);

  for (const records of [
    [first, higher, duplicate],
    [first, duplicate, higher],
    [higher, first, duplicate],
    [duplicate, higher, first],
  ]) {
    assert.throws(
      () => resolveConfiguration(definition, context, records),
      /CONFIGURATION_CONFLICT/,
    );
  }
});

test('different facility scopes are not conflicting duplicates', () => {
  const currentFacility = override(4, 30);

  const otherFacility = {
    ...override(4, 90),
    scope: {
      tenantId: 'tenant-a',
      organisationId: 'organisation-a',
      facilityId: 'facility-b',
    },
  };

  const result = resolveConfiguration(
    definition,
    context,
    [currentFacility, otherFacility],
  );

  assert.equal(result.value, 30);
  assert.equal(result.sourceLayer, 4);
});

test('duplicate overrides in the selected layer fail closed', () => {
  assert.throws(
    () => resolveConfiguration(
      definition,
      context,
      [override(4, 20), override(4, 30)],
    ),
    /CONFIGURATION_CONFLICT/,
  );
});

test('missing parent context is rejected', () => {
  assert.throws(
    () => resolveConfiguration(
      definition,
      {
        editionId: 'professional',
        tenantId: 'tenant-a',
        facilityId: 'facility-a',
      },
      [],
    ),
    /CONFIGURATION_INVALID_CONTEXT/,
  );
});

test('an unknown layer fails closed', () => {
  const invalid = {
    ...override(3, 20),
    layer: 9,
  } as unknown as ConfigurationOverride<number>;

  assert.throws(
    () => resolveConfiguration(definition, context, [invalid]),
    /CONFIGURATION_INVALID_LAYER/,
  );
});

test('resolution does not mutate source records', () => {
  const record = override(4, 30);
  const original = JSON.stringify(record);

  resolveConfiguration(definition, context, [record]);

  assert.equal(JSON.stringify(record), original);
});


test('validated resolution accepts a valid value', () => {
  const result = resolveValidatedConfiguration(
    {
      key,
      defaultValue: 15,
      maxLayer: 8,
      valueSchema: z.number().int().min(5).max(120),
    },
    context,
    [override(4, 30)],
  );

  assert.equal(result.value, 30);
  assert.equal(result.sourceLayer, 4);
});

test('validated resolution rejects a string instead of a number', () => {
  assert.throws(
    () => resolveValidatedConfiguration(
      {
        key,
        defaultValue: 15,
        maxLayer: 8,
        valueSchema: z.number().int(),
      },
      context,
      [{ ...override(4, 30), value: '30' }],
    ),
    /CONFIGURATION_INVALID_VALUE/,
  );
});

test('validated resolution rejects an out-of-range number', () => {
  assert.throws(
    () => resolveValidatedConfiguration(
      {
        key,
        defaultValue: 15,
        maxLayer: 8,
        valueSchema: z.number().int().min(5).max(120),
      },
      context,
      [override(4, 999)],
    ),
    /CONFIGURATION_INVALID_VALUE/,
  );
});

test('validated resolution rejects an invalid default', () => {
  assert.throws(
    () => resolveValidatedConfiguration(
      {
        key,
        defaultValue: 999,
        maxLayer: 8,
        valueSchema: z.number().int().min(5).max(120),
      },
      context,
      [],
    ),
    /CONFIGURATION_INVALID_DEFAULT/,
  );
});

test('validated resolution rejects an unknown override key', () => {
  assert.throws(
    () => resolveValidatedConfiguration(
      {
        key,
        defaultValue: 15,
        maxLayer: 8,
        valueSchema: z.number().int(),
      },
      context,
      [{
        ...override(4, 30),
        key: 'unknown.configuration.key',
      }],
    ),
    /CONFIGURATION_UNKNOWN_OVERRIDE_KEY/,
  );
});

test('invalid lower-priority values cannot be hidden', () => {
  assert.throws(
    () => resolveValidatedConfiguration(
      {
        key,
        defaultValue: 15,
        maxLayer: 8,
        valueSchema: z.number().int().min(5).max(120),
      },
      context,
      [
        override(8, 80),
        override(4, 999),
      ],
    ),
    /CONFIGURATION_INVALID_VALUE/,
  );
});

test('validated resolution retains override restrictions', () => {
  assert.throws(
    () => resolveValidatedConfiguration(
      {
        key,
        defaultValue: 15,
        maxLayer: 1,
        valueSchema: z.number().int(),
      },
      context,
      [override(3, 30)],
    ),
    /CONFIGURATION_OVERRIDE_NOT_ALLOWED/,
  );
});

test('validated resolution retains conflict detection', () => {
  assert.throws(
    () => resolveValidatedConfiguration(
      {
        key,
        defaultValue: 15,
        maxLayer: 8,
        valueSchema: z.number().int(),
      },
      context,
      [
        override(4, 20),
        override(8, 80),
        override(4, 30),
      ],
    ),
    /CONFIGURATION_CONFLICT/,
  );
});
