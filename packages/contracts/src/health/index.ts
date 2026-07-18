/**
 * Public health-contract entry point.
 *
 * Re-exports the Zod schemas and the inferred TypeScript type so that
 * consumers import from `@ibn-hayan/contracts/health` (or from the
 * package root) without reaching into internal file paths.
 */
export {
  HealthStatusSchema,
  HealthResponseSchema,
  type HealthResponse,
} from './health.schema.js';
