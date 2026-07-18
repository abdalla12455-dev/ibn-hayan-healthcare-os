import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  HealthResponseSchema,
  type HealthResponse,
} from '@ibn-hayan/contracts';

/**
 * Constructs the health-endpoint response.
 *
 * The service is intentionally simple: it returns a constant, fully-known
 * response object. No environment values, no hostnames, no dependency
 * versions, no database probes. Operational depth (DB ping, cache ping,
 * dependency checks) is deliberately deferred — those concerns belong to a
 * later readiness-probe batch, not to this liveness probe.
 *
 * The response is validated against the shared Zod schema
 * ({@link HealthResponseSchema}) before being returned. This enforces the
 * contract at the producing boundary: if a future change accidentally
 * alters the shape, the validation fails fast in development rather than
 * silently breaking consumers. The schema is the single source of truth
 * defined in `@ibn-hayan/contracts`; no separate authoritative interface
 * is maintained in the API.
 */
@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    const response: unknown = {
      status: 'ok',
      service: 'ibn-hayan-api',
      version: 'development',
    };

    const result = HealthResponseSchema.safeParse(response);
    if (!result.success) {
      // This path is structurally unreachable given the constant above,
      // but it is retained as a defensive guard: if the constant is ever
      // edited to violate the contract, the API fails loudly rather than
      // emitting an invalid response.
      throw new InternalServerErrorException(
        'Health response failed contract validation',
      );
    }

    return result.data;
  }
}
