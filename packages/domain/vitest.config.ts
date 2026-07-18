import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for @ibn-hayan/domain.
 *
 * The domain package is pure TypeScript with no framework, ORM, or UI
 * dependencies (per ADR-012 §1.4 and FOLDER_STRUCTURE.md §4.2). The SWC
 * plugin is not required because the package uses no decorators.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
