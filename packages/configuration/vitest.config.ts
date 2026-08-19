import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for @ibn-hayan/configuration.
 *
 * The package contains the canonical Configuration layer model and key
 * registry. The SWC plugin is not required because the package uses no
 * decorators.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
