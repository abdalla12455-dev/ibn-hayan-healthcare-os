import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for @ibn-hayan/contracts.
 *
 * The contracts package is framework-agnostic and has no path aliases,
 * so this configuration is intentionally minimal. The SWC plugin is not
 * required because the package uses plain TypeScript with no decorators.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
