import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for Clinic Admin Overview integration tests.
 *
 * These tests combine HTTP e2e testing (via supertest) with real
 * PostgreSQL 17 (via the disposable cluster bootstrap). They verify
 * the full Clinic Admin Overview flow: GET /api/v1/clinic-admin/overview,
 * the AuthorizationGuard, the session-cookie validation, the permission
 * check, the tenant/organisation/facility context resolution, and the
 * audit event emission.
 *
 * Each clinic-admin test file calls `setupDatabaseTests()` at the top
 * to boot the disposable PG cluster before any test runs. The
 * `pool: 'forks'` + `singleFork: true` configuration ensures the
 * disposable cluster is shared across all test files in this run.
 *
 * The SWC compiler is used because NestJS source files use
 * TypeScript decorators and `emitDecoratorMetadata`.
 *
 * NOTE: This config is NOT yet wired into package.json scripts or the
 * CI workflow. A future task (with authorisation to modify package.json
 * and CI) should add:
 *   - `"test:clinic-admin": "vitest run --config vitest.clinic-admin.config.ts"`
 *     to apps/api/package.json scripts.
 *   - `pnpm test:clinic-admin` to the PostgreSQL 17 validation workflow.
 * Until then, the test file exists but is not run locally (no PG17)
 * and not run in CI (not wired). GitHub Actions remains authoritative
 * for the test's pass/fail status once it is wired in.
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
    include: ['test/clinic-admin/**/*.clinic-admin-spec.ts'],
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
