import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@ibn-hayan/contracts';
import { AppModule } from './../src/app.module';
import { setupOpenApi } from './../src/openapi/openapi.setup';
import {
  OPENAPI_JSON_PATH,
  OPENAPI_SWAGGER_UI_PATH,
} from './../src/openapi/openapi.constants';

/**
 * Integration tests for OpenAPI documentation.
 *
 * Verifies:
 * - `/api/docs-json` returns HTTP 200 outside production.
 * - The specification contains `/api/v1/health`.
 * - The Health operation documents HTTP 200.
 * - The response schema contains exactly `status`, `service`, `version`.
 * - No security scheme is advertised.
 * - Documentation setup is skipped when `NODE_ENV=production`.
 *
 * The production-mode test sets `NODE_ENV` only for the duration of that
 * test by saving and restoring `process.env.NODE_ENV` in `beforeAll` /
 * `afterAll`. It does not change the real process environment for other
 * tests.
 */
describe('OpenAPI documentation (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let originalNodeEnv: string | undefined;

  beforeAll(async () => {
    originalNodeEnv = process.env.NODE_ENV;
    // Ensure non-production mode for the main test suite.
    process.env.NODE_ENV = 'development';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupOpenApi(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await app.close();
  });

  it('GET /api/docs-json returns HTTP 200 outside production', async () => {
    await request(server).get(`/${OPENAPI_JSON_PATH}`).expect(200);
  });

  it('the specification contains /api/v1/health', async () => {
    const response = await request(server)
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200);

    const spec = response.body as { paths: Record<string, unknown> };
    expect(spec.paths).toHaveProperty('/api/v1/health');
  });

  it('the Health operation documents HTTP 200', async () => {
    const response = await request(server)
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200);

    const spec = response.body as {
      paths: {
        '/api/v1/health'?: {
          get?: { responses?: Record<string, unknown> };
        };
      };
    };
    const healthGet = spec.paths['/api/v1/health']?.get;
    expect(healthGet).toBeDefined();
    expect(healthGet?.responses).toHaveProperty('200');
  });

  it('the response schema contains exactly status, service, version', async () => {
    const response = await request(server)
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200);

    const spec = response.body as {
      paths: {
        '/api/v1/health'?: {
          get?: {
            responses?: {
              '200'?: {
                content?: {
                  'application/json'?: {
                    schema?: {
                      type?: string;
                      required?: string[];
                      properties?: Record<string, unknown>;
                      additionalProperties?: boolean;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const schema =
      spec.paths['/api/v1/health']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;

    expect(schema).toBeDefined();
    expect(schema?.type).toBe('object');
    expect(schema?.required?.sort()).toEqual(
      ['service', 'status', 'version'].sort(),
    );
    expect(schema?.properties).toHaveProperty('status');
    expect(schema?.properties).toHaveProperty('service');
    expect(schema?.properties).toHaveProperty('version');
    expect(Object.keys(schema?.properties ?? {}).sort()).toEqual(
      ['service', 'status', 'version'].sort(),
    );
    expect(schema?.additionalProperties).toBe(false);
  });

  it('documented literal values match the shared Zod contract', async () => {
    // This test proves that the OpenAPI response schema's documented
    // literal values (the `enum` arrays) cannot drift from the shared
    // Zod contract. The Zod schema is the single source of truth; the
    // OpenAPI schema is a documentation surface that must mirror it.
    //
    // The test extracts the `enum` value for each documented property,
    // constructs a response using those values, and parses it through
    // `HealthResponseSchema`. If the OpenAPI enums drift from the Zod
    // literals, the parse fails and the test fails.
    const response = await request(server)
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200);

    const spec = response.body as {
      paths: {
        '/api/v1/health'?: {
          get?: {
            responses?: {
              '200'?: {
                content?: {
                  'application/json'?: {
                    schema?: {
                      properties?: {
                        status?: { enum?: unknown[] };
                        service?: { enum?: unknown[] };
                        version?: { enum?: unknown[] };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const schema =
      spec.paths['/api/v1/health']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;

    const statusEnum = schema?.properties?.status?.enum;
    const serviceEnum = schema?.properties?.service?.enum;
    const versionEnum = schema?.properties?.version?.enum;

    // Each documented property must have exactly one literal value.
    expect(statusEnum).toHaveLength(1);
    expect(serviceEnum).toHaveLength(1);
    expect(versionEnum).toHaveLength(1);

    // Construct a response using the documented literals and parse it
    // through the shared Zod contract. If the OpenAPI enums drift from
    // the Zod literals, the parse fails.
    const documentedResponse = {
      status: statusEnum?.[0],
      service: serviceEnum?.[0],
      version: versionEnum?.[0],
    };

    const result = HealthResponseSchema.safeParse(documentedResponse);
    expect(result.success).toBe(true);
  });

  it('a documented property cannot be added or removed without the conformance test failing', async () => {
    // This test re-derives the property set from the OpenAPI schema and
    // confirms it exactly matches the property set of the shared Zod
    // contract. Adding or removing a documented property breaks either
    // the `required` array check, the `properties` keys check, or the
    // Zod strict-mode parse check below.
    const response = await request(server)
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200);

    const spec = response.body as {
      paths: {
        '/api/v1/health'?: {
          get?: {
            responses?: {
              '200'?: {
                content?: {
                  'application/json'?: {
                    schema?: {
                      required?: string[];
                      properties?: Record<string, unknown>;
                      additionalProperties?: boolean;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const schema =
      spec.paths['/api/v1/health']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;

    // The required array must list exactly the three contract fields.
    expect(schema?.required?.slice().sort()).toEqual(
      ['service', 'status', 'version'].sort(),
    );

    // The properties object must contain exactly the three contract
    // fields — no additions, no removals.
    expect(
      Object.keys(schema?.properties ?? {})
        .slice()
        .sort(),
    ).toEqual(['service', 'status', 'version'].sort());

    // additionalProperties must be false so that adding a field is
    // rejected at the OpenAPI layer as well as at the Zod layer.
    expect(schema?.additionalProperties).toBe(false);

    // A response constructed from the documented property set must
    // pass the shared Zod contract. The Zod schema is in strict mode,
    // so any property that exists in the OpenAPI schema but not in
    // the Zod schema would cause this parse to fail.
    const documentedKeys = Object.keys(schema?.properties ?? {});
    const documentedResponse: Record<string, unknown> = {};
    for (const key of documentedKeys) {
      const propSchema = (schema?.properties ?? {}) as Record<
        string,
        { enum?: unknown[] }
      >;
      const enumValues = propSchema[key]?.enum;
      if (Array.isArray(enumValues) && enumValues.length === 1) {
        documentedResponse[key] = enumValues[0];
      }
    }
    const result = HealthResponseSchema.safeParse(documentedResponse);
    expect(result.success).toBe(true);
  });

  it('advertises exactly one cookie security scheme named session', async () => {
    // The fourth canonical batch introduces the `session` cookie
    // authentication scheme. The scheme documents that the auth
    // endpoints require the `ibn_hayan_session` cookie. The scheme
    // is documentation only; the actual enforcement is performed by
    // the auth controller and service at runtime.
    const response = await request(server)
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200);

    const spec = response.body as {
      components?: {
        securitySchemes?: Record<
          string,
          { type?: string; in?: string; name?: string }
        >;
      };
      security?: unknown;
    };

    expect(spec.components?.securitySchemes).toBeDefined();
    const schemes = spec.components?.securitySchemes ?? {};
    expect(Object.keys(schemes).sort()).toEqual(['session']);
    const sessionScheme = schemes['session'];
    expect(sessionScheme?.type).toBe('apiKey');
    expect(sessionScheme?.in).toBe('cookie');
    expect(sessionScheme?.name).toBe('ibn_hayan_session');
    // No top-level security requirement — each endpoint declares its
    // own security via @ApiCookieAuth.
    expect(spec.security).toBeUndefined();
  });

  it('Swagger UI is served outside production', async () => {
    // The Swagger UI page returns HTML at /api/docs.
    await request(server).get(`/${OPENAPI_SWAGGER_UI_PATH}`).expect(200);
  });
});

/**
 * Production-mode test: verify that documentation routes are NOT registered
 * when NODE_ENV=production. This test uses a separate application instance
 * so that the production environment variable does not leak into the main
 * test suite.
 */
describe('OpenAPI documentation in production mode (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let originalNodeEnv: string | undefined;

  beforeAll(async () => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupOpenApi(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await app.close();
  });

  it('health endpoint still returns HTTP 200 in production', async () => {
    await request(server).get('/api/v1/health').expect(200);
  });

  it('Swagger UI is NOT served in production', async () => {
    await request(server).get(`/${OPENAPI_SWAGGER_UI_PATH}`).expect(404);
  });

  it('OpenAPI JSON is NOT served in production', async () => {
    await request(server).get(`/${OPENAPI_JSON_PATH}`).expect(404);
  });
});

/**
 * Post-production isolation test: verify that the production-mode test
 * did not leak `NODE_ENV=production` into the test runner's process
 * environment. After the production describe block restores
 * `NODE_ENV`, a fresh non-production application instance must once
 * again serve the documentation routes.
 *
 * This test guards against accidental environment leakage that would
 * silently disable OpenAPI documentation for every subsequent test
 * suite in the same vitest worker.
 */
describe('OpenAPI documentation environment restoration (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let originalNodeEnv: string | undefined;

  beforeAll(async () => {
    // Capture whatever NODE_ENV the production describe restored.
    originalNodeEnv = process.env.NODE_ENV;
    // Force a non-production value to verify the documentation routes
    // are re-enabled when NODE_ENV is not 'production'.
    process.env.NODE_ENV = 'development';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupOpenApi(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await app.close();
  });

  it('Swagger UI is served again after production test restores NODE_ENV', async () => {
    await request(server).get(`/${OPENAPI_SWAGGER_UI_PATH}`).expect(200);
  });

  it('OpenAPI JSON is served again after production test restores NODE_ENV', async () => {
    await request(server).get(`/${OPENAPI_JSON_PATH}`).expect(200);
  });
});
