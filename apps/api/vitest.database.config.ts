import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api database integration tests.
 *
 * Database tests instantiate the Database module (with the
 * Prisma-backed repositories) against a disposable PostgreSQL 17
 * cluster. The cluster is booted by
 * `apps/api/test/database/_pg-bootstrap.ts` before any test runs.
 *
 * - Uses the SWC compiler because NestJS source files use TypeScript
 *   decorators and `emitDecoratorMetadata`.
 * - Environment: node.
 * - Includes only files matching `test/database/<dir>/<name>.db-spec.ts`.
 *   The `.db-spec.ts` suffix distinguishes database integration tests
 *   from unit tests (`.spec.ts`) and HTTP integration tests
 *   (`.e2e-spec.ts`).
 * - Test timeout: 30 seconds. Database tests issue real network
 *   round-trips to the disposable cluster; the default 5-second
 *   timeout is too short for the first test in a file (which pays
 *   the cluster boot and migration apply cost).
 * - No concurrency across test files within a single worker: the
 *   disposable cluster is shared, and concurrent access from
 *   multiple workers would require a more complex coordination
 *   scheme. `pool: 'forks'` with `singleFork: true` ensures that
 *   all test files in a single vitest invocation share the same
 *   cluster.
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
    include: ['test/database/**/*.db-spec.ts'],
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
