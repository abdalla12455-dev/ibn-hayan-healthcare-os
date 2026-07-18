import { Injectable } from '@nestjs/common';
import type { HealthResponse } from './health.types';

/**
 * Constructs the health-endpoint response.
 *
 * The service is intentionally simple: it returns a constant, fully-known
 * response object. No environment values, no hostnames, no dependency
 * versions, no database probes. Operational depth (DB ping, cache ping,
 * dependency checks) is deliberately deferred — those concerns belong to a
 * later readiness-probe batch, not to this liveness probe.
 */
@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'ibn-hayan-api',
      version: 'development',
    };
  }
}
