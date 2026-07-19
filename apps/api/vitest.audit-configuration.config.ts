import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api audit configuration unit
 * tests.
 *
 * These tests verify that `AuditConfigurationService` and the
 * `validateAuditKey` / `validateAuditKeyPair` helpers enforce the
 * production fail-closed posture required by the ninth canonical
 * batch specification. They run without a database (pure unit
 * tests), so the default Vitest configuration is sufficient.
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
    include: ['test/audit/audit-configuration.spec.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
