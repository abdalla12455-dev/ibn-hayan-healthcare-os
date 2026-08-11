import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ConsentGateFeatureConfig } from './consent-gate-feature.config.js';

/**
 * Unit tests for the consent-gate feature configuration (Stage 2A —
 * BC02 Encounter Foundation).
 *
 * Per the operator-ratified product rule, consent is a
 * configuration-gated clinical-safety check with the canonical
 * emergency carve-out. The gate is default-ON (fail-safe) and is
 * enforced unconditionally in production. These tests verify the
 * environment and production safety requirements.
 */

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: <T>(key: string): T | undefined => {
      const v = values[key];
      return v === undefined ? undefined : (v as unknown as T);
    },
  } as unknown as ConfigService;
}

describe('ConsentGateFeatureConfig', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    delete process.env['NODE_ENV'];
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });

  it('defaults to enforced when IBN_HAYAN_CONSENT_GATE_ENABLED is unset (fail-safe)', () => {
    const config = makeConfig({});
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(true);
  });

  it('defaults to enforced when IBN_HAYAN_CONSENT_GATE_ENABLED is empty (fail-safe)', () => {
    const config = makeConfig({ IBN_HAYAN_CONSENT_GATE_ENABLED: '' });
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(true);
  });

  it('is enforced when IBN_HAYAN_CONSENT_GATE_ENABLED is "true"', () => {
    const config = makeConfig({ IBN_HAYAN_CONSENT_GATE_ENABLED: 'true' });
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(true);
  });

  it('is enforced when IBN_HAYAN_CONSENT_GATE_ENABLED is "1" (only exact "false" disables)', () => {
    const config = makeConfig({ IBN_HAYAN_CONSENT_GATE_ENABLED: '1' });
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(true);
  });

  it('is enforced when IBN_HAYAN_CONSENT_GATE_ENABLED is "FALSE" (case-sensitive)', () => {
    const config = makeConfig({ IBN_HAYAN_CONSENT_GATE_ENABLED: 'FALSE' });
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(true);
  });

  it('is disabled only when IBN_HAYAN_CONSENT_GATE_ENABLED is the exact string "false" (non-production)', () => {
    const config = makeConfig({ IBN_HAYAN_CONSENT_GATE_ENABLED: 'false' });
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(false);
  });

  it('is enforced in production regardless of the flag (fail-closed)', () => {
    process.env['NODE_ENV'] = 'production';
    const config = makeConfig({ IBN_HAYAN_CONSENT_GATE_ENABLED: 'false' });
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(true);
  });

  it('is enforced in production when flag is unset', () => {
    process.env['NODE_ENV'] = 'production';
    const config = makeConfig({});
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(true);
  });

  it('trims whitespace before comparing', () => {
    const config = makeConfig({ IBN_HAYAN_CONSENT_GATE_ENABLED: '  false  ' });
    const gate = new ConsentGateFeatureConfig(config);
    expect(gate.isConsentGateEnabled()).toBe(false);
  });
});
