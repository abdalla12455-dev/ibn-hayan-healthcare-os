import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api audit dispatcher concurrency
 * tests.
 *
 * These tests verify the multi-dispatcher safety properties required
 * by the ninth canonical batch specification: concurrent claiming
 * with `FOR UPDATE SKIP LOCKED`, lease ownership verification,
 * expired-lease reclamation, idempotent delivery, and chain
 * continuity under concurrent append.
 *
 * The tests use real PostgreSQL 17 via the disposable cluster
 * bootstrap. The `pool: 'forks'` + `singleFork: true` configuration
 * ensures the disposable cluster is shared across all test files in
 * this run.
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
    include: ['test/audit/*.audit-concurrency-spec.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
