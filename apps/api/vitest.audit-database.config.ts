import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api audit-store database
 * integration tests.
 *
 * These tests verify the dedicated audit database: the audit-store
 * schema, the immutability triggers, the integrity chain, the
 * idempotent delivery, and the chain-head locking. They use real
 * PostgreSQL 17 via the disposable cluster bootstrap.
 *
 * Each audit-store test file calls `setupDatabaseTests()` at the top
 * to boot the disposable PG cluster (with both the transactional and
 * audit databases) before any test runs. The `pool: 'forks'` +
 * `singleFork: true` configuration ensures the disposable cluster
 * is shared across all test files in this run.
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
    include: ['test/audit/*.audit-db-spec.ts'],
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
