import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for Appointments Today integration tests.
 *
 * These tests combine HTTP e2e testing (via supertest) with real
 * PostgreSQL 17 (via the disposable cluster bootstrap). They verify
 * the full Today's Appointments flow: GET /api/v1/appointments/today,
 * the AuthorizationGuard, the session-cookie validation, the permission
 * check, the tenant/organisation/facility context resolution,
 * facility timezone handling, and the audit event emission.
 *
 * Each appointments test file calls `setupDatabaseTests()` at the top
 * to boot the disposable PG cluster before any test runs. The
 * `pool: 'forks'` + `singleFork: true` configuration ensures the
 * disposable cluster is shared across all test files in this run.
 *
 * The SWC compiler is used because NestJS source files use
 * TypeScript decorators and `emitDecoratorMetadata`.
 *
 * Per the task specification, this suite is NOT run locally without
 * PostgreSQL 17. It runs on GitHub Actions inside the composite
 * node:24 + postgres:17 Docker image (see
 * `.github/workflows/main-ci.yml`).
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: [
      'test/appointments/**/*.spec.ts',
      'test/provider-schedules/**/*.spec.ts',
    ],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
