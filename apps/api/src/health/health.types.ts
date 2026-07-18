/**
 * Public response shape of the health endpoint.
 *
 * The response is intentionally minimal. It must not expose hostnames, file
 * paths, environment-variable values, dependency versions, database state,
 * memory details, or stack traces. The shape is part of the API contract
 * and is consumed by ops tooling and (in later batches) by the web client.
 */
export interface HealthResponse {
  readonly status: 'ok';
  readonly service: 'ibn-hayan-api';
  readonly version: 'development';
}
