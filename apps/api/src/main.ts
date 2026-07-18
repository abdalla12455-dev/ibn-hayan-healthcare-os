import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupOpenApi } from './openapi/openapi.setup';

/**
 * Bootstrap entrypoint for the Ibn Hayan API.
 *
 * Configuration:
 * - Global API prefix `api/v1` — every route exposed by the API lives
 *   under `/api/v1/*`. The web client consumes this surface via
 *   `NEXT_PUBLIC_API_BASE_URL`.
 * - CORS origin is taken from the `WEB_ORIGIN` environment variable. When
 *   unset, the local development fallback `http://localhost:3000` is used
 *   so that `pnpm dev:web` and `pnpm dev:api` interoperate out of the box.
 *   Production deployments must set `WEB_ORIGIN` explicitly.
 * - HTTP port is taken from the `API_PORT` environment variable. When unset,
 *   the local development fallback `3001` is used.
 *
 * Security posture:
 * - The bootstrap uses `NestFactory.create` (not `NestFactory.createApplicationContext`).
 * - No environment-variable values are logged.
 * - The ValidationPipe enforces whitelist + forbidNonWhitelisted so that
 *   request bodies cannot carry unexpected fields. This is the structural
 *   expression of CODING_STANDARDS.md Section 6 ("every external boundary
 *   is validated").
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  const webOrigin = readWebOrigin(configService);
  app.enableCors({
    origin: webOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI documentation is mounted only outside production. The setup
  // function is a no-op when NODE_ENV=production.
  setupOpenApi(app);

  const port = readApiPort(configService);
  await app.listen(port);

  new Logger('Bootstrap').log(
    `Ibn Hayan API listening on port ${String(port)} (prefix /api/v1)`,
  );
}

/**
 * Reads `WEB_ORIGIN` from configuration. Falls back to the canonical local
 * development origin `http://localhost:3000` when the variable is absent.
 * Throws if the value is present but not an `http(s)://` URL.
 */
function readWebOrigin(configService: ConfigService): string | string[] {
  const raw = configService.get<string>('WEB_ORIGIN');
  if (raw === undefined || raw.length === 0) {
    return 'http://localhost:3000';
  }
  // Allow a comma-separated list of origins.
  const origins = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  for (const entry of origins) {
    if (!/^https?:\/\//i.test(entry)) {
      throw new Error(
        'WEB_ORIGIN must be an http:// or https:// origin (or a comma-separated list of such origins).',
      );
    }
  }
  return origins.length === 1 ? (origins[0] as string) : origins;
}

/**
 * Reads `API_PORT` from configuration. Falls back to `3001` when the
 * variable is absent. Throws if the value is present but not a positive
 * integer in the valid TCP range.
 */
function readApiPort(configService: ConfigService): number {
  const raw = configService.get<string>('API_PORT');
  if (raw === undefined || raw.length === 0) {
    return 3001;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      'API_PORT must be a positive integer between 1 and 65535 (inclusive).',
    );
  }
  return parsed;
}

void bootstrap();
