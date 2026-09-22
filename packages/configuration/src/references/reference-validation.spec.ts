import test from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyConfigurationRecordReference,
} from '../../dist/references/reference-validation.js';

const scope = {
  tenantId: 'tenant-a',
};

const reference = {
  recordId: 'configuration-record-1',
};

test('accepts an explicitly verified record', async () => {
  await assert.doesNotReject(
    verifyConfigurationRecordReference(
      scope,
      reference,
      {
        async existsActiveInTenant(
          tenantId: string,
          recordId: string,
        ): Promise<boolean> {
          return tenantId === 'tenant-a'
            && recordId === 'configuration-record-1';
        },
      },
    ),
  );
});

test('rejects a missing or disallowed record', async () => {
  await assert.rejects(
    verifyConfigurationRecordReference(
      scope,
      reference,
      {
        async existsActiveInTenant(): Promise<boolean> {
          return false;
        },
      },
    ),
    /CONFIGURATION_REFERENCE_INVALID/,
  );
});

test('rejects a record outside the supplied tenant', async () => {
  const lookup = {
    async existsActiveInTenant(
      tenantId: string,
      recordId: string,
    ): Promise<boolean> {
      return tenantId === 'tenant-b'
        && recordId === 'configuration-record-1';
    },
  };

  await assert.rejects(
    verifyConfigurationRecordReference(
      scope,
      reference,
      lookup,
    ),
    /CONFIGURATION_REFERENCE_INVALID/,
  );
});

test('rejects validation when no lookup exists', async () => {
  await assert.rejects(
    verifyConfigurationRecordReference(
      scope,
      reference,
    ),
    /CONFIGURATION_REFERENCE_VALIDATION_UNAVAILABLE/,
  );
});

test('rejects repository failures', async () => {
  await assert.rejects(
    verifyConfigurationRecordReference(
      scope,
      reference,
      {
        async existsActiveInTenant(): Promise<boolean> {
          throw new Error('Repository unavailable');
        },
      },
    ),
    /CONFIGURATION_REFERENCE_VALIDATION_UNAVAILABLE/,
  );
});

test('rejects invalid reference context', async () => {
  const lookup = {
    async existsActiveInTenant(): Promise<boolean> {
      return true;
    },
  };

  await assert.rejects(
    verifyConfigurationRecordReference(
      { tenantId: '' },
      reference,
      lookup,
    ),
    /CONFIGURATION_REFERENCE_INVALID_INPUT/,
  );

  await assert.rejects(
    verifyConfigurationRecordReference(
      scope,
      { recordId: '' },
      lookup,
    ),
    /CONFIGURATION_REFERENCE_INVALID_INPUT/,
  );
});

test('rejects non-boolean repository results', async () => {
  await assert.rejects(
    verifyConfigurationRecordReference(
      scope,
      reference,
      {
        async existsActiveInTenant(): Promise<boolean> {
          return 'true' as unknown as boolean;
        },
      },
    ),
    /CONFIGURATION_REFERENCE_INVALID/,
  );
});
