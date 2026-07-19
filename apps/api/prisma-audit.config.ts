// prisma-audit.config.ts
//
// Prisma 7 configuration for the @ibn-hayan/api DEDICATED AUDIT
// DATABASE.
//
// Per ADR-014, the audit store is a dedicated PostgreSQL 17 database
// separate from the transactional database. This config file is the
// Prisma 7 configuration for the audit store. It mirrors the
// structure of `prisma.config.ts` (the transactional store config)
// but points at `prisma-audit/schema.prisma` and
// `prisma-audit/migrations/`, and sources the datasource URL from
// `process.env.AUDIT_DATABASE_URL`.
//
// The disposable PostgreSQL cluster used by the audit-store tests
// exports `AUDIT_DATABASE_URL` only into the current process
// environment. No password or URL is written into this file or into
// any tracked repository file.
//
// We do NOT `import "dotenv/config"` here. The canonical implementation
// is denied-by-default for environment-variable access; loading
// `.env` here would bypass that posture and would also leak
// credentials into Prisma's process-level environment. Callers that
// need `AUDIT_DATABASE_URL` set it explicitly before invoking
// `prisma migrate deploy`, `prisma generate`, etc.
//
// Per ADR-012 §1.4 (Prisma safeguards) and CODING_STANDARDS.md §13
// (Secrets and Environment-Variable Handling), no secret value ever
// appears in this file.

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma-audit/schema.prisma',
  migrations: {
    path: 'prisma-audit/migrations',
  },
  datasource: {
    url: process.env['AUDIT_DATABASE_URL'],
  },
});
