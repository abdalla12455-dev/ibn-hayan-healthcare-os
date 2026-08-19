import { describe, expect, it } from 'vitest';

import {
  CONFIGURATION_LAYER_CODES,
  ConfigurationResolutionError,
  IMPLEMENTED_CONFIGURATION_LAYER_CODES,
} from './configuration.js';

describe('Configuration domain model', () => {
  it('duplicates the canonical eight-layer union (mirrors @ibn-hayan/configuration)', () => {
    expect(CONFIGURATION_LAYER_CODES).toEqual([
      'L1',
      'L2',
      'L3',
      'L4',
      'L5',
      'L6',
      'L7',
      'L8',
    ]);
    expect(IMPLEMENTED_CONFIGURATION_LAYER_CODES).toEqual(['L1', 'L3', 'L4']);
  });

  it('carries a stable fail-closed reason on resolution errors', () => {
    const error = new ConfigurationResolutionError(
      'unknown_key',
      'not registered',
    );
    expect(error.reason).toBe('unknown_key');
    expect(error).toBeInstanceOf(Error);
  });
});
