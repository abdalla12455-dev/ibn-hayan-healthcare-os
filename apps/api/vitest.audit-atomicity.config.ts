import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api audit atomicity rollback
 * tests.
 *
 * These tests verify that every state mutation that emits an audit
 * event rolls back when the outbox insertion fails. They use real
 * PostgreSQL 17 via the disposable cluster bootstrap, and a custom
 * `AuditOutboxPort` that injects failures into the `insert` method
 * when a per-test flag is set.
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
    include: ['test/audit/*.audit-atomicity-spec.ts'],
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
