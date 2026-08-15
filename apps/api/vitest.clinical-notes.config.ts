import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for BC03 Clinical Notes integration tests.
 *
 * These tests combine HTTP e2e testing (via supertest) with real
 * PostgreSQL 17 (via the disposable cluster bootstrap). They verify the
 * Clinical Notes Foundation: POST /api/v1/clinical-notes (create draft),
 * GET /api/v1/clinical-notes/:id (view), GET .../:id/history (history),
 * POST .../:id/sign, POST .../:id/amend, POST .../:id/addendum, and
 * POST .../:id/withdraw, the AuthorizationGuard, session-cookie
 * validation, the permission check, tenant/organisation/facility context
 * resolution, signing-authority enforcement, amendment reason enforcement,
 * immutable signed-note history preservation, concurrency-safe state
 * transitions, tenant isolation, and audit event emission (exactly once,
 * no PHI).
 *
 * Each clinical-notes test file calls `setupDatabaseTests()` at the top
 * to boot the disposable PG cluster before any test runs. The
 * `pool: 'forks'` + `singleFork: true` configuration ensures the
 * disposable cluster is shared across all test files in this run.
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
    include: ['test/clinical-notes/**/*.spec.ts'],
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
