/**
 * Constants for OpenAPI documentation setup.
 *
 * Centralised so that the documentation metadata and route paths are
 * defined in one place and can be referenced by both the setup function
 * and the integration tests.
 */

/**
 * The title of the OpenAPI document.
 */
export const OPENAPI_TITLE = 'Ibn Hayan Healthcare Operating System API';

/**
 * A restrained description identifying this as the canonical platform API.
 */
export const OPENAPI_DESCRIPTION =
  'Canonical platform API for the Ibn Hayan Healthcare Operating System. This is the authoritative backend; the web application is a thin client that consumes these contracts.';

/**
 * The API version documented in the OpenAPI specification.
 */
export const OPENAPI_API_VERSION = '1.0';

/**
 * The route at which Swagger UI is served (outside production only).
 */
export const OPENAPI_SWAGGER_UI_PATH = 'api/docs';

/**
 * The route at which the raw OpenAPI JSON document is served (outside
 * production only).
 */
export const OPENAPI_JSON_PATH = 'api/docs-json';
