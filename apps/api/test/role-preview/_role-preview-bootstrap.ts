import { beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  setupDatabaseTests,
  getDatabaseUrl,
  getPsqlBin,
} from '../database/_pg-bootstrap.js';

/**
 * Role-Preview-specific database bootstrap.
 *
 * Wraps the standard `setupDatabaseTests()` to additionally create
 * isolated databases whose names contain the substring
 * `role_preview` so that the database-identity gate
 * (`isPreviewDatabaseIdentityValid`) passes. The standard bootstrap
 * creates databases named `ibn_hayan_test` and
 * `ibn_hayan_audit_test`; those names do NOT satisfy the gate.
 *
 * This helper:
 * 1. Calls `setupDatabaseTests()` to boot the disposable PG 17
 *    cluster and apply migrations to the default databases.
 * 2. Parses the default `DATABASE_URL` to discover the cluster's
 *    host, port, and superuser.
 * 3. Creates two new databases on the same cluster:
 *    `role_preview_test` (transactional) and
 *    `role_preview_audit_test` (audit).
 * 4. Applies migrations to the new transactional database by
 *    invoking `prisma migrate deploy` with the overridden
 *    `DATABASE_URL`.
 * 5. Applies migrations to the new audit database by invoking
 *    `prisma migrate deploy` with the overridden
 *    `AUDIT_DATABASE_URL` and the audit Prisma config.
 * 6. Overrides `process.env.DATABASE_URL` and
 *    `process.env.AUDIT_DATABASE_URL` to point to the new
 *    databases.
 *
 * The cluster is owned by the standard bootstrap; cleanup happens
 * in the standard bootstrap's `afterAll` hook.
 *
 * Usage: call `setupRolePreviewDatabaseTests()` at the top of each
 * role-preview integration test file (outside any `describe`
 * block).
 */
export function setupRolePreviewDatabaseTests(): void {
  setupDatabaseTests();

  beforeAll(() => {
    const defaultUrl = getDatabaseUrl();
    const parsed = parsePostgresUrl(defaultUrl);
    const psql = getPsqlBin();

    const txDbName = 'role_preview_test';
    const auditDbName = 'role_preview_audit_test';

    tryCreateDatabase(psql, parsed, txDbName);
    tryCreateDatabase(psql, parsed, auditDbName);

    const txUrl = `postgresql://${parsed.user}@${parsed.host}:${parsed.port}/${txDbName}`;
    const auditUrl = `postgresql://${parsed.user}@${parsed.host}:${parsed.port}/${auditDbName}`;

    const apiDir = process.cwd();
    const previousDatabaseUrl = process.env['DATABASE_URL'];
    process.env['DATABASE_URL'] = txUrl;
    try {
      execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
        cwd: apiDir,
        stdio: 'pipe',
      });
    } finally {
      process.env['DATABASE_URL'] = previousDatabaseUrl;
    }

    const previousAuditDatabaseUrl = process.env['AUDIT_DATABASE_URL'];
    process.env['AUDIT_DATABASE_URL'] = auditUrl;
    try {
      execFileSync(
        'pnpm',
        [
          'exec',
          'prisma',
          'migrate',
          'deploy',
          '--config',
          'prisma-audit.config.ts',
        ],
        {
          cwd: apiDir,
          stdio: 'pipe',
        },
      );
    } finally {
      process.env['AUDIT_DATABASE_URL'] = previousAuditDatabaseUrl;
    }

    process.env['DATABASE_URL'] = txUrl;
    process.env['AUDIT_DATABASE_URL'] = auditUrl;

    process.env['IBN_HAYAN_ROLE_PREVIEW_ENABLED'] = 'true';
    process.env['NODE_ENV'] = 'development';
    process.env['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'] =
      'test-preview-password-32chars-long!!';
    process.env['WEB_ORIGIN'] = 'http://localhost:3000';
  }, 60_000);
}

interface ParsedPostgresUrl {
  readonly user: string;
  readonly host: string;
  readonly port: number;
}

function parsePostgresUrl(url: string): ParsedPostgresUrl {
  const match = url.match(/^postgresql:\/\/([^@/:]+)@([^@/:]+):(\d+)\/?/);
  if (
    !match ||
    match[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined
  ) {
    throw new Error(
      `Could not parse DATABASE_URL: ${url.replace(/:[^:@/]+@/, ':***@')}`,
    );
  }
  return {
    user: match[1],
    host: match[2],
    port: parseInt(match[3], 10),
  };
}

function tryCreateDatabase(
  psql: string,
  parsed: ParsedPostgresUrl,
  dbName: string,
): void {
  try {
    execFileSync(
      psql,
      [
        '-h',
        parsed.host,
        '-p',
        String(parsed.port),
        '-U',
        parsed.user,
        '-d',
        'postgres',
        '-v',
        'ON_ERROR_STOP=0',
        '-c',
        `CREATE DATABASE "${dbName}";`,
      ],
      {
        stdio: 'pipe',
      },
    );
  } catch {
    // The database likely already exists. Ignore the error.
  }
}
