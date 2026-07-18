import { z } from 'zod';

/**
 * Shared Health contract for the Ibn Hayan Healthcare Operating System.
 *
 * This module is the single source of truth for the shape of the health
 * endpoint response. Both `@ibn-hayan/api` (the NestJS backend that
 * produces the response) and `@ibn-hayan/web` (the Next.js thin client
 * that consumes the response) derive their types from the schemas defined
 * here.
 *
 * The contract is intentionally minimal: three literal fields with no
 * environment values, hostnames, dependency versions, database details, or
 * internal configuration. Operational depth (DB ping, cache ping,
 * dependency checks) is deliberately deferred to a future readiness-probe
 * batch; this schema governs only the liveness probe.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. The TypeScript
 * type is inferred from the Zod schema via `z.infer` — no separate
 * authoritative interface is maintained.
 */

/**
 * The canonical health status literal. The API currently reports only
 * `"ok"`; additional literals (`"degraded"`, `"unavailable"`) will be
 * ratified in a future readiness-probe batch.
 */
export const HealthStatusSchema = z.literal('ok');

/**
 * The canonical health response schema.
 *
 * `.strict()` is applied so that extra fields are rejected at the boundary.
 * This enforces the contract on both the producing side (the API validates
 * its own response before sending) and the consuming side (the web client
 * validates the response before trusting it).
 *
 * The three literals are the authoritative values. Changing any of them
 * is a contract change that requires coordinated deployment of both
 * applications.
 */
export const HealthResponseSchema = z
  .object({
    status: HealthStatusSchema,
    service: z.literal('ibn-hayan-api'),
    version: z.literal('development'),
  })
  .strict();

/**
 * The TypeScript type of a validated health response, inferred from the
 * Zod schema. This is the only authoritative type — both applications
 * import it from here and do not define a conflicting interface.
 */
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
