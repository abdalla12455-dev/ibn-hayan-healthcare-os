import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for @ibn-hayan/observability.
 *
 * The observability package is framework-agnostic pure TypeScript.
 * Its tests are unit tests that verify the canonical serializer, the
 * integrity-hash helper, the identifier-HMAC helper, the forbidden-
 * key detector, and the safe metadata validator. No database, no
 * network, no NestJS.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
