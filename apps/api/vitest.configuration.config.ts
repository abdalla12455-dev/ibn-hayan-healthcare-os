import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for the Configuration (BC16) integration tests.
 *
 * These tests combine HTTP e2e testing (via supertest) with a real
 * PostgreSQL 17 database (via the disposable cluster bootstrap). They
 * verify the first canonical Configuration vertical slice: the
 * administration API, layer-wise authorization (R13 L3 / R09 L4),
 * fail-closed validation via the key registry, and the append-only
 * version-history write that shares one transaction with the value
 * write and the audit event.
 *
 * The `pool: 'forks'` + `singleFork: true` configuration ensures the
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
    include: ['test/configuration/**/*.spec.ts'],
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
