import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Vitest configuration for @ibn-hayan/api unit tests.
 *
 * - Uses the SWC compiler via `unplugin-swc` because NestJS source files
 *   use TypeScript decorators and `emitDecoratorMetadata`, which the
 *   default Vite esbuild transform does not emit.
 * - Environment: node.
 * - Includes only `*.spec.ts` files under `src/`.
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
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
