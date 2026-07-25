import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for the Demo Role Preview Mode PostgreSQL 17
 * integration tests.
 *
 * These tests combine HTTP e2e testing (via supertest) with real
 * PostgreSQL 17 (via the disposable cluster bootstrap). They
 * verify the full Secure Logged-Out Demo Role Bootstrap flow:
 *
 * - `GET /api/v1/dev/role-preview` — availability
 * - `GET /api/v1/dev/role-preview/bootstrap` — issue one-time challenge
 * - `GET /api/v1/dev/role-preview/current` — current preview role
 * - `POST /api/v1/dev/role-preview/select` — logged-out bootstrap flow
 *   AND session-bound switching flow
 * - `POST /api/v1/dev/role-preview/end` — end preview session
 *
 * Plus the preview seed (`role-preview:seed`) and the
 * database-identity gate.
 *
 * Each test file calls `setupDatabaseTests()` at the top to boot
 * the disposable PG cluster before any test runs. The
 * `pool: 'forks'` + `singleFork: true` configuration ensures the
 * disposable cluster is shared across all test files in this run.
 *
 * The SWC compiler is used because NestJS source files use
 * TypeScript decorators and `emitDecoratorMetadata`.
 *
 * Per the Secure Logged-Out Demo Role Bootstrap specification,
 * these tests are NOT run locally (no PostgreSQL 17 in the
 * development environment). They run on GitHub Actions inside the
 * composite node:24 + postgres:17 Docker image (see
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
    include: ['test/role-preview/**/*.role-preview-spec.ts'],
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
