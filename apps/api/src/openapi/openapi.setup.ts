import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  OPENAPI_API_VERSION,
  OPENAPI_DESCRIPTION,
  OPENAPI_JSON_PATH,
  OPENAPI_SWAGGER_UI_PATH,
  OPENAPI_TITLE,
} from './openapi.constants';

/**
 * Sets up OpenAPI documentation on the NestJS application.
 *
 * Documentation routes (Swagger UI and the raw JSON specification) are
 * mounted only when `NODE_ENV` is not `'production'`. In production the
 * function is a no-op: no documentation route is registered, no
 * specification is generated, and no swagger asset is served. This is the
 * structural enforcement of the requirement that API documentation must
 * not be exposed in production.
 *
 * The global API prefix `/api/v1` is applied before this function is
 * called, so the documentation routes are served at `/api/docs` and
 * `/api/docs-json` respectively. The `setGlobalPrefix` call in `main.ts`
 * uses `DocumentBuilder.addServer('/api/v1')` so that the generated
 * specification records the correct base path for every operation.
 *
 * @param app The NestJS application instance. The global prefix must be
 *            set before this function is called.
 */
export function setupOpenApi(app: INestApplication): void {
  if (process.env.NODE_ENV === 'production') {
    // Documentation is not served in production. This is intentional:
    // the specification, the Swagger UI assets, and the documentation
    // routes are all suppressed to reduce the production attack surface.
    return;
  }

  const config = new DocumentBuilder()
    .setTitle(OPENAPI_TITLE)
    .setDescription(OPENAPI_DESCRIPTION)
    .setVersion(OPENAPI_API_VERSION)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(OPENAPI_SWAGGER_UI_PATH, app, document, {
    // The JSON document is available at /api/docs-json (the path below
    // with the `json` suffix) in addition to the Swagger UI.
    jsonDocumentUrl: OPENAPI_JSON_PATH,
  });
}
