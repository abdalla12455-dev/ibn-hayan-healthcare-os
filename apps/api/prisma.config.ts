// prisma.config.ts
//
// Prisma 7 configuration for @ibn-hayan/api.
//
// Prisma 7 moved from a `.env`-only datasource URL convention to an
// explicit `prisma.config.ts` file that imports `defineConfig` from the
// `prisma/config` module. This is the current officially supported
// configuration structure; it is not the deprecated `prisma` section in
// `package.json`, and it is not the older `.env`-only pattern.
//
// The configuration:
// - Points Prisma at `prisma/schema.prisma` (the canonical schema
//   location ratified in FOLDER_STRUCTURE.md §3.2).
// - Points migrations at `prisma/migrations/`.
// - Sources the datasource URL from `process.env.DATABASE_URL`. The
//   disposable PostgreSQL cluster used by `scripts/validate-database-foundation.sh`
//   exports `DATABASE_URL` only into the current process environment.
//   No password or URL is written into this file or into any tracked
//   repository file.
//
// We do NOT `import "dotenv/config"` here. The canonical implementation
// is denied-by-default for environment-variable access (see
// `apps/api/src/app.module.ts`'s `ConfigModule.forRoot({ envFilePath:
// ['.env'] })`); loading `.env` here would bypass that posture and
// would also leak credentials into Prisma's process-level environment.
// Callers that need `DATABASE_URL` set it explicitly before invoking
// `prisma migrate deploy`, `prisma generate`, etc.
//
// Per ADR-012 §1.4 (Prisma safeguards) and CODING_STANDARDS.md §13
// (Secrets and Environment-Variable Handling), no secret value ever
// appears in this file.

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
