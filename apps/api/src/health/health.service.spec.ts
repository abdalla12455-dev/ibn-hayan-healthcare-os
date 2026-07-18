import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@ibn-hayan/contracts';
import { HealthService } from './health.service';

/**
 * Unit tests for {@link HealthService}.
 *
 * These tests do not instantiate the Nest application; they call the
 * service method directly. The service is a pure constructor with no
 * external dependencies, so no DI wiring is required.
 *
 * The response is validated through the shared Zod schema
 * ({@link HealthResponseSchema}) so that the test enforces the same
 * contract that the web client enforces. If the service ever drifts from
 * the contract, the validation step in these tests fails.
 */
describe('HealthService', () => {
  it('returns a response that passes the shared HealthResponseSchema', () => {
    const service = new HealthService();
    const result = service.getHealth();
    const parsed = HealthResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('ok');
      expect(parsed.data.service).toBe('ibn-hayan-api');
      expect(parsed.data.version).toBe('development');
    }
  });

  it('returns status "ok"', () => {
    const service = new HealthService();
    const result = service.getHealth();
    expect(result.status).toBe('ok');
  });

  it('returns the canonical service identifier', () => {
    const service = new HealthService();
    const result = service.getHealth();
    expect(result.service).toBe('ibn-hayan-api');
  });

  it('returns the "development" version label', () => {
    const service = new HealthService();
    const result = service.getHealth();
    expect(result.version).toBe('development');
  });

  it('returns exactly the three expected keys and no others', () => {
    const service = new HealthService();
    const result = service.getHealth();
    expect(Object.keys(result).sort()).toEqual(
      ['service', 'status', 'version'].sort(),
    );
  });
});
