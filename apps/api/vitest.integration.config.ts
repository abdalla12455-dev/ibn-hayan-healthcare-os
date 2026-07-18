import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api integration tests.
 *
 * Integration tests instantiate the full Nest application via
 * `@nestjs/testing`'s `Test.createTestingModule(...)` and exercise the
 * HTTP surface via Supertest. These tests do not require PostgreSQL or
 * any other external service in this batch — the only module mounted is
 * the Health module, which has no external dependencies.
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
    include: ['test/**/*.e2e-spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
