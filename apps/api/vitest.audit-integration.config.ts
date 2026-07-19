import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api audit integration tests.
 *
 * These tests verify the end-to-end audit instrumentation: login,
 * logout, session rotation, context selection, context clearing,
 * authorization decisions, Origin/CSRF denials, and request-ID
 * propagation. They combine HTTP e2e testing (via supertest) with
 * real PostgreSQL 17 (via the disposable cluster bootstrap) and
 * real audit-store inspection.
 *
 * Each audit integration test file calls `setupDatabaseTests()` at
 * the top to boot the disposable PG cluster (with both the
 * transactional and audit databases) before any test runs.
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
    include: ['test/audit/*.audit-integration-spec.ts'],
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
