import { describe, expect, it } from 'vitest';
import { HealthResponseSchema, HealthStatusSchema } from './health.schema';

/**
 * Unit tests for the shared Health contract.
 *
 * These tests prove that the Zod schema enforces the exact response shape
 * at the boundary: valid responses pass, missing fields fail, extra fields
 * fail (strict mode), and incorrect literal values fail. Both the API
 * (producer) and the web client (consumer) rely on this behaviour.
 */
describe('HealthStatusSchema', () => {
  it('accepts the literal "ok"', () => {
    expect(HealthStatusSchema.parse('ok')).toBe('ok');
  });

  it('rejects any other string', () => {
    expect(() => HealthStatusSchema.parse('degraded')).toThrow();
    expect(() => HealthStatusSchema.parse('OK')).toThrow();
    expect(() => HealthStatusSchema.parse('healthy')).toThrow();
  });

  it('rejects non-string values', () => {
    expect(() => HealthStatusSchema.parse(0)).toThrow();
    expect(() => HealthStatusSchema.parse(true)).toThrow();
    expect(() => HealthStatusSchema.parse(null)).toThrow();
  });
});

describe('HealthResponseSchema', () => {
  const validResponse = {
    status: 'ok',
    service: 'ibn-hayan-api',
    version: 'development',
  };

  it('accepts the canonical valid response', () => {
    const parsed = HealthResponseSchema.parse(validResponse);
    expect(parsed).toEqual(validResponse);
    expect(parsed.status).toBe('ok');
    expect(parsed.service).toBe('ibn-hayan-api');
    expect(parsed.version).toBe('development');
  });

  it('rejects a response missing the status field', () => {
    const missing = { service: 'ibn-hayan-api', version: 'development' };
    expect(() => HealthResponseSchema.parse(missing)).toThrow();
  });

  it('rejects a response missing the service field', () => {
    const missing = { status: 'ok', version: 'development' };
    expect(() => HealthResponseSchema.parse(missing)).toThrow();
  });

  it('rejects a response missing the version field', () => {
    const missing = { status: 'ok', service: 'ibn-hayan-api' };
    expect(() => HealthResponseSchema.parse(missing)).toThrow();
  });

  it('rejects a response with extra fields (strict mode)', () => {
    const extra = {
      status: 'ok',
      service: 'ibn-hayan-api',
      version: 'development',
      hostname: 'prod-server-01',
    };
    expect(() => HealthResponseSchema.parse(extra)).toThrow();
  });

  it('rejects an incorrect status literal', () => {
    const wrongStatus = {
      status: 'degraded',
      service: 'ibn-hayan-api',
      version: 'development',
    };
    expect(() => HealthResponseSchema.parse(wrongStatus)).toThrow();
  });

  it('rejects an incorrect service literal', () => {
    const wrongService = {
      status: 'ok',
      service: 'ibn-hayan-web',
      version: 'development',
    };
    expect(() => HealthResponseSchema.parse(wrongService)).toThrow();
  });

  it('rejects an incorrect version literal', () => {
    const wrongVersion = {
      status: 'ok',
      service: 'ibn-hayan-api',
      version: '1.0.0',
    };
    expect(() => HealthResponseSchema.parse(wrongVersion)).toThrow();
  });

  it('rejects a completely empty object', () => {
    expect(() => HealthResponseSchema.parse({})).toThrow();
  });

  it('rejects null and non-object values', () => {
    expect(() => HealthResponseSchema.parse(null)).toThrow();
    expect(() => HealthResponseSchema.parse('ok')).toThrow();
    expect(() => HealthResponseSchema.parse([])).toThrow();
    expect(() => HealthResponseSchema.parse(42)).toThrow();
  });

  it('returns a safe-parse success result for valid input', () => {
    const result = HealthResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validResponse);
    }
  });

  it('returns a safe-parse failure result for invalid input', () => {
    const result = HealthResponseSchema.safeParse({ status: 'down' });
    expect(result.success).toBe(false);
  });
});
