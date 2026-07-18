import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service';

/**
 * Unit tests for {@link HealthService}.
 *
 * These tests do not instantiate the Nest application; they call the
 * service method directly. The service is a pure constructor with no
 * external dependencies, so no DI wiring is required.
 */
describe('HealthService', () => {
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
