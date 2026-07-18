import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@ibn-hayan/contracts';
import { AppModule } from './../src/app.module';

/**
 * HTTP integration test for the health endpoint.
 *
 * Verifies:
 * - HTTP 200 status.
 * - The exact JSON response shape `{ status, service, version }`.
 * - The global API prefix `/api/v1` is applied to all routes.
 * - The response passes the shared Zod contract validation.
 *
 * Does NOT require PostgreSQL or any other external service: the only
 * module mounted is the Health module, which has no external dependencies.
 */
describe('Health endpoint (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns HTTP 200 with the exact response shape', async () => {
    const response = await request(server).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'ibn-hayan-api',
      version: 'development',
    });
  });

  it('returns a response that passes the shared Zod contract', async () => {
    const response = await request(server).get('/api/v1/health').expect(200);

    const result = HealthResponseSchema.safeParse(response.body);
    expect(result.success).toBe(true);
  });

  it('applies the global /api/v1 prefix (route without prefix is 404)', async () => {
    await request(server).get('/health').expect(404);
  });

  it('returns exactly the three expected keys and no others', async () => {
    const response = await request(server).get('/api/v1/health').expect(200);

    const keys = Object.keys(response.body as object).sort();
    expect(keys).toEqual(['service', 'status', 'version'].sort());
  });
});
