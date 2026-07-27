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
 * Wired into the project command surface by the
 * `fix: wire clinic admin integration and deduplicate overview requests`
 * commit:
 *   - `apps/api/package.json` declares `"test:clinic-admin": "vitest run --config vitest.clinic-admin.config.ts"` (plus the matching `pretest:clinic-admin` prisma-generate hook).
 *   - The root `package.json` declares `"test:clinic-admin": "pnpm run build:shared && pnpm --filter @ibn-hayan/api test:clinic-admin"`.
 *   - `.github/workflows/main-ci.yml` runs `pnpm test:clinic-admin` inside the `postgresql17-validation` job, after `pnpm test:database` and before `pnpm test:role-preview`. The job uses `set -euo pipefail`, so any non-zero exit code from the Clinic Admin suite fails the step and the job.
 *
 * Per the Clinic Admin Overview specification, this suite is NOT run
 * locally (no PostgreSQL 17 in the development environment). It runs
 * on GitHub Actions inside the composite node:24 + postgres:17 Docker
 * image (see `.github/workflows/main-ci.yml`). When run locally without
 * PostgreSQL 17, the suite fails at the `setupDatabaseTests()` bootstrap
 * step (the disposable cluster cannot start) — this is the expected
 * failure mode, NOT a regression.
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
