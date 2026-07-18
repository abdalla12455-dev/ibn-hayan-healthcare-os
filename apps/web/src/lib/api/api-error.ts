/**
 * Typed error categories for the web API client.
 *
 * Every failure mode of the health client (and future API clients) is
 * classified into one of these categories. The UI consumes the
 * `ApiError` type and renders a user-appropriate message; raw error
 * details (network error messages, response bodies, stack traces) are
 * never exposed to the user.
 *
 * Per ADR-012 and CODING_STANDARDS.md, untrusted data (HTTP responses,
 * JSON payloads) is typed as `unknown` until validated by a Zod schema.
 * A response that fails Zod validation is classified as
 * `CONTRACT_INVALID`, which is distinct from a network failure or a
 * non-2xx HTTP response.
 */

export type ApiErrorCategory =
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_JSON'
  | 'CONTRACT_INVALID';

export interface ApiError {
  readonly category: ApiErrorCategory;
  readonly message: string;
  readonly statusCode?: number;
}

/**
 * Creates a typed network-error result. The raw error message is captured
 * for internal diagnostics but the UI should display only the generic
 * `message` from this object, never the raw error detail.
 */
export function networkError(error: unknown): ApiError {
  const message =
    error instanceof Error ? error.message : 'Network request failed';
  return {
    category: 'NETWORK_ERROR',
    message,
  };
}

/**
 * Creates a typed HTTP-error result for non-2xx responses.
 */
export function httpError(statusCode: number): ApiError {
  return {
    category: 'HTTP_ERROR',
    message: `Request failed with status ${String(statusCode)}`,
    statusCode,
  };
}

/**
 * Creates a typed invalid-JSON result for responses that cannot be parsed
 * as JSON.
 */
export function invalidJsonError(error: unknown): ApiError {
  const message =
    error instanceof Error ? error.message : 'Response was not valid JSON';
  return {
    category: 'INVALID_JSON',
    message,
  };
}

/**
 * Creates a typed contract-invalid result for responses that pass JSON
 * parsing but fail Zod schema validation.
 */
export function contractInvalidError(error: unknown): ApiError {
  const message =
    error instanceof Error ? error.message : 'Response failed contract validation';
  return {
    category: 'CONTRACT_INVALID',
    message,
  };
}
