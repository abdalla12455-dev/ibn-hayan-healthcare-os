import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for authentication integration tests.
 *
 * These tests combine HTTP e2e testing (via supertest) with real
 * PostgreSQL 17 (via the disposable cluster bootstrap). They verify
 * the full authentication flow: login, session, CSRF, logout, and
 * all the security constraints from ADR-013.
 *
 * Each auth test file calls `setupDatabaseTests()` at the top to
 * boot the disposable PG cluster before any test runs. The
 * `pool: 'forks'` + `singleFork: true` configuration ensures the
 * disposable cluster is shared across all test files in this run.
 *
 * The SWC compiler is used because NestJS source files use
 * TypeScript decorators and `emitDecoratorMetadata`.
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
    include: ['test/auth/**/*.auth-spec.ts'],
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
