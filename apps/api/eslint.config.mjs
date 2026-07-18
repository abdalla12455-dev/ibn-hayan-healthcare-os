// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // The generated Prisma client is excluded from linting because it
    // is machine-generated, ships with `// @ts-nocheck`, and is
    // owned by Prisma rather than by this repository. The schema
    // and migrations under `prisma/` ARE reviewed and committed; only
    // the generated TypeScript client is excluded.
    ignores: ['eslint.config.mjs', 'generated/**', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        // Vitest injects describe/it/expect/etc. globally at runtime.
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      // Allow underscore-prefixed parameters to be unused. This is
      // the standard convention for parameters that are required by
      // an interface contract but are intentionally not consumed by
      // the implementation. For example, the SessionRepository port
      // declares `setActiveTenantMembership(sessionId, membershipId,
      // selectedAt)`; the Prisma-backed implementation does not
      // persist `selectedAt` separately because Prisma's
      // `@updatedAt` mechanism records the modification time. The
      // parameter is prefixed `_selectedAt` to signal intent.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
