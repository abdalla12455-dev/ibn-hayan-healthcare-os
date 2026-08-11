import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for BC02 Encounter integration tests.
 *
 * These tests combine HTTP e2e testing (via supertest) with real
 * PostgreSQL 17 (via the disposable cluster bootstrap). They verify
 * the full Encounter foundation: POST /api/v1/encounters and the
 * lifecycle transition endpoints (arrive, start, on-leave, resume,
 * finish, cancel), the AuthorizationGuard, the session-cookie
 * validation, the permission check, the tenant/organisation/facility
 * context resolution, the consent gate, the emergency carve-out,
 * concurrency-safe state transitions, and the audit event emission.
 *
 * Each encounters test file calls `setupDatabaseTests()` at the top
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
    include: ['test/encounters/**/*.spec.ts'],
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
