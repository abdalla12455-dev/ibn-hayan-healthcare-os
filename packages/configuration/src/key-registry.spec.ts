import { describe, expect, it } from 'vitest';

import {
  CONFIGURATION_KEY_REGISTRY,
  NO_SHOW_GRACE_PERIOD_KEY,
  getConfigurationKeyDefinition,
  isOverrideLayerAllowed,
  isRegisteredConfigurationKey,
  validateConfigurationValue,
} from './key-registry.js';

const definition = getConfigurationKeyDefinition(NO_SHOW_GRACE_PERIOD_KEY);

describe('Configuration key registry', () => {
  it('registers the first production key exactly once', () => {
    expect(CONFIGURATION_KEY_REGISTRY).toHaveLength(1);
    expect(definition?.key).toBe('scheduling.appointment.noShowGracePeriod');
    expect(definition?.owner).toBe('BC06 Scheduling');
    expect(definition?.valueType).toBe('integer');
    expect(definition?.defaultValue).toBe(15);
    expect(definition?.allowedOverrideLayers).toEqual(['L3', 'L4']);
  });

  it('rejects unknown keys', () => {
    expect(getConfigurationKeyDefinition('unknown.key')).toBeNull();
    expect(isRegisteredConfigurationKey('unknown.key')).toBe(false);
    expect(isRegisteredConfigurationKey('')).toBe(false);
  });

  it('enforces the integer type', () => {
    expect(validateConfigurationValue(definition!, '15').success).toBe(false);
    expect(validateConfigurationValue(definition!, 15.5).success).toBe(false);
    expect(validateConfigurationValue(definition!, true).success).toBe(false);
    expect(validateConfigurationValue(definition!, null).success).toBe(false);
    expect(validateConfigurationValue(definition!, { minutes: 15 }).success)
      .toBe(false);
  });

  it('rejects values below 5 and above 120', () => {
    expect(validateConfigurationValue(definition!, 4).success).toBe(false);
    expect(validateConfigurationValue(definition!, 121).success).toBe(false);
    expect(validateConfigurationValue(definition!, 0).success).toBe(false);
    expect(validateConfigurationValue(definition!, -5).success).toBe(false);
  });

  it('accepts exactly 5 and exactly 120 at the bounds', () => {
    expect(validateConfigurationValue(definition!, 5).success).toBe(true);
    expect(validateConfigurationValue(definition!, 120).success).toBe(true);
    expect(validateConfigurationValue(definition!, 15).success).toBe(true);
  });

  it('enforces the allowed override layers', () => {
    expect(isOverrideLayerAllowed(definition!, 'L3')).toBe(true);
    expect(isOverrideLayerAllowed(definition!, 'L4')).toBe(true);
    expect(isOverrideLayerAllowed(definition!, 'L1')).toBe(false);
    expect(isOverrideLayerAllowed(definition!, 'L2')).toBe(false);
    expect(isOverrideLayerAllowed(definition!, 'L5')).toBe(false);
  });
});
