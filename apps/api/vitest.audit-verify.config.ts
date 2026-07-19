import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api audit integrity-verification
 * CLI tests.
 *
 * These tests verify the `audit:verify` CLI script: exit codes on
 * success and failure, emission of `audit.integrity.verified` and
 * `audit.integrity.verification_failed` events, and absence of
 * recursive auditing.
 *
 * The tests use real PostgreSQL 17 via the disposable cluster
 * bootstrap.
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
    include: ['test/audit/*.audit-verify-spec.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 90_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
