import { describe, expect, it } from 'vitest';

import {
  CONFIGURATION_LAYERS,
  IMPLEMENTED_CONFIGURATION_LAYERS,
  compareConfigurationLayerPrecedence,
  configurationLayerPrecedenceIndex,
  highestPrecedenceLayer,
  isConfigurationLayer,
} from './layers.js';

describe('Configuration layer model', () => {
  it('declares exactly the eight canonical layers in precedence order', () => {
    expect(CONFIGURATION_LAYERS).toEqual([
      'L1',
      'L2',
      'L3',
      'L4',
      'L5',
      'L6',
      'L7',
      'L8',
    ]);
  });

  it('implements L1, L3, and L4 as the first slice persistence scopes', () => {
    expect(IMPLEMENTED_CONFIGURATION_LAYERS).toEqual(['L1', 'L3', 'L4']);
  });

  it('recognizes canonical layers and rejects non-canonical values', () => {
    expect(isConfigurationLayer('L1')).toBe(true);
    expect(isConfigurationLayer('L8')).toBe(true);
    expect(isConfigurationLayer('L9')).toBe(false);
    expect(isConfigurationLayer('l1')).toBe(false);
    expect(isConfigurationLayer(1)).toBe(false);
    expect(isConfigurationLayer(undefined)).toBe(false);
  });

  it('orders precedence deterministically from L1 (lowest) to L8 (highest)', () => {
    expect(configurationLayerPrecedenceIndex('L1')).toBe(0);
    expect(configurationLayerPrecedenceIndex('L8')).toBe(7);
    expect(compareConfigurationLayerPrecedence('L4', 'L3')).toBeGreaterThan(0);
    expect(compareConfigurationLayerPrecedence('L3', 'L4')).toBeLessThan(0);
    expect(compareConfigurationLayerPrecedence('L3', 'L3')).toBe(0);
  });

  it('selects the highest-precedence layer', () => {
    expect(highestPrecedenceLayer(['L1'])).toBe('L1');
    expect(highestPrecedenceLayer(['L1', 'L3'])).toBe('L3');
    expect(highestPrecedenceLayer(['L1', 'L3', 'L4'])).toBe('L4');
    expect(highestPrecedenceLayer(['L4', 'L3', 'L1'])).toBe('L4');
    expect(highestPrecedenceLayer([])).toBeUndefined();
  });
});
