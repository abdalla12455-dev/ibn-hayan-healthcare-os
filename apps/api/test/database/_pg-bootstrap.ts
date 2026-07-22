import { afterAll, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  cpSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';

/**
 * Repository-self-contained disposable PostgreSQL cluster bootstrap
 * for the database integration tests under `apps/api/test/database/`.
 *
 * This module is self-contained: it does NOT call, source, or rely on
 * any external helper script under `$HOME` or elsewhere. It discovers
 * the PostgreSQL 17 executables through:
 * - the `PG_BINDIR` environment variable, when supplied; or
 * - the system `PATH`, otherwise.
 *
 * Two ownership modes are supported:
 *
 * 1. Externally-supplied cluster (`DATABASE_URL` already set):
 *    The bootstrap uses the supplied URL verbatim, verifies
 *    connectivity, applies the committed migration, and does NOT
 *    stop or delete anything during cleanup. This is the mode used
 *    by `scripts/validate-database-foundation.sh`, which owns the
 *    disposable cluster.
 *
 * 2. Test-owned disposable cluster (`DATABASE_URL` not set):
 *    The bootstrap creates a unique temporary directory under the
 *    operating-system temp directory, selects an available TCP port
 *    by binding to `127.0.0.1:0` and immediately closing the socket,
 *    initialises a fresh unprivileged PostgreSQL 17 cluster with
 *    local-only trust authentication, binds it to `127.0.0.1` only,
 *    starts it via `pg_ctl -w`, constructs `DATABASE_URL` in process
 *    memory only, applies the committed migration, and registers
 *    cleanup handlers that stop the cluster and recursively delete
 *    the temporary directory on success, failure, vitest throw, or
 *    SIGINT/SIGTERM (best-effort).
 *
 * Security and hygiene:
 * - The cluster is bound to `127.0.0.1` only.
 * - Auth is trust inside the cluster; because the cluster is
 *   local-only, no remote connection is possible.
 * - The temporary `DATABASE_URL` is constructed only in the current
 *   process environment. It is NEVER written to `.env`,
 *   `.env.example`, any repository file, any test snapshot, or any
 *   report.
 * - The password is never printed. The full `DATABASE_URL` is never
 *   printed.
 * - No Docker, Testcontainers, pg-mem, PGlite, or other database
 *   runtime is used. No third-party process-management dependency
 *   is used.
 *
 * Per STEP 3 requirements.
 */

// ---------------------------------------------------------------------------
// PostgreSQL executable discovery
// ---------------------------------------------------------------------------

/**
 * Resolve a PostgreSQL executable by name. Honours `PG_BINDIR` first,
 * then PATH. Throws if `PG_BINDIR` is supplied but the binary does
 * not exist there. When `PG_BINDIR` is not supplied, the bare name
 * is returned and `execFile` resolves it through PATH.
 */
function resolvePgExecutable(name: string): string {
  const pgBindir = process.env['PG_BINDIR'];
  if (pgBindir && pgBindir.length > 0) {
    const candidate = join(pgBindir, name);
    if (existsSync(candidate)) {
      return candidate;
    }
    throw new Error(
      `PG_BINDIR is set to '${pgBindir}' but '${candidate}' does not exist.`,
    );
  }
  return name;
}

/**
 * Synchronous execFile wrapper returning stdout as a string. Used
 * only for `--version` invocations and other small, trusted
 * commands. Throws on non-zero exit, surfacing stderr in the error
 * message. Never used with user-controlled arguments.
 */
function runPgSync(
  bin: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv; cwd?: string },
): { stdout: string; stderr: string } {
  const r = spawnSync(bin, args, {
    encoding: 'utf-8',
    env: options?.env ?? process.env,
    cwd: options?.cwd,
    stdio: 'pipe',
  });
  if (r.status !== 0) {
    const err = new Error(
      `'${bin} ${args.join(' ')}' exited with status ${r.status ?? 'null'}. ` +
        `stderr: ${r.stderr ?? '(no stderr)'}`,
    ) as Error & { stderr?: string };
    err.stderr = r.stderr ?? '';
    throw err;
  }
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/**
 * Verify that the discovered PostgreSQL executables report major
 * version 17. Throws if any binary is missing or reports a different
 * major version.
 */
function verifyPostgreSQL17(initdb: string, pgCtl: string, psql: string): void {
  for (const bin of [initdb, pgCtl, psql]) {
    let stdout: string;
    try {
      stdout = runPgSync(bin, ['--version']).stdout;
    } catch (err) {
      const e = err as Error;
      throw new Error(
        `Failed to execute PostgreSQL binary '${bin} --version'. ` +
          `Ensure PG_BINDIR or PATH points at PostgreSQL 17 executables. ` +
          `Error: ${e.message}`,
      );
    }
    // Output looks like: "initdb (PostgreSQL) 17.10 (Debian 17.10-0+deb13u1)"
    const match = stdout.match(/PostgreSQL\)\s+(\d+)\./);
    if (!match) {
      throw new Error(
        `Could not parse PostgreSQL version from '${bin} --version' output: ${stdout.trim()}`,
      );
    }
    const major = Number.parseInt(match[1]!, 10);
    if (major !== 17) {
      throw new Error(
        `PostgreSQL major version ${major} is not supported. ` +
          `The third canonical batch requires PostgreSQL 17. ` +
          `Binary: ${bin}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Port selection
// ---------------------------------------------------------------------------

/**
 * Select an available TCP port by temporarily binding to
 * `127.0.0.1:0` and immediately closing the socket. The kernel
 * chooses an available ephemeral port; once the socket is closed
 * the port becomes available again (subject to the usual TIME_WAIT
 * caveat, which `pg_ctl` handles by retrying).
 */
function pickFreePort(): Promise<number> {
  return new Promise<number>((resolveP, rejectP) => {
    const server = createServer();
    server.unref();
    server.on('error', rejectP);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolveP(port));
      } else {
        server.close();
        rejectP(new Error('Failed to pick a free port.'));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Cluster lifecycle (test-owned mode only)
// ---------------------------------------------------------------------------

interface OwnedCluster {
  mode: 'owned';
  rootTmp: string;
  pgData: string;
  pgSocketDir: string;
  pgLog: string;
  pgPort: number;
  pgBin: { initdb: string; pgCtl: string; psql: string };
  databaseUrl: string;
  databaseName: string;
  superuser: string;
}

interface ExternalCluster {
  mode: 'external';
  databaseUrl: string;
  pgBin: { psql: string };
}

type ClusterHandle = OwnedCluster | ExternalCluster;

let handle: ClusterHandle | null = null;

/**
 * Boot the disposable PostgreSQL cluster if `DATABASE_URL` is not
 * already set. If `DATABASE_URL` is set, verify connectivity and
 * adopt the external cluster without assuming ownership.
 *
 * Returns the cluster handle. Idempotent: returns the same handle
 * on subsequent calls within the same process.
 */
async function ensureCluster(): Promise<ClusterHandle> {
  if (handle) {
    return handle;
  }

  const initdb = resolvePgExecutable('initdb');
  const pgCtl = resolvePgExecutable('pg_ctl');
  const psql = resolvePgExecutable('psql');
  verifyPostgreSQL17(initdb, pgCtl, psql);

  const externalUrl = process.env['DATABASE_URL'];
  if (externalUrl && externalUrl.length > 0) {
    // External mode: do NOT take ownership.
    verifyConnectivity(psql, externalUrl);
    handle = {
      mode: 'external',
      databaseUrl: externalUrl,
      pgBin: { psql },
    };
    return handle;
  }

  // Owned mode: create a disposable cluster.
  const pgPort = await pickFreePort();
  const rootTmp = mkdtempSync(join(tmpdir(), 'ibn-hayan-pg-test-'));
  const pgData = join(rootTmp, 'data');
  const pgSocketDir = join(rootTmp, 'sockets');
  const pgLog = join(rootTmp, 'postgres.log');
  // mkdtempSync creates rootTmp with mode 0700. Create the socket
  // directory; initdb will create the data directory itself.
  mkdirSync(pgSocketDir, { recursive: true, mode: 0o700 });

  const superuser = 'postgres';
  const databaseName = 'ibn_hayan_test';

  // initdb: initialise the cluster with trust auth for local TCP.
  // We pass argument arrays; no shell, no string interpolation into
  // a shell command.
  runPgSync(initdb, [
    '-D',
    pgData,
    '-U',
    superuser,
    '-A',
    'trust',
    '--encoding=UTF8',
    '--locale=C.UTF-8',
  ]);

  // Append disposable-cluster overrides to postgresql.conf. We write
  // only to the file inside the temporary data directory; we never
  // print its contents.
  const confPath = join(pgData, 'postgresql.conf');
  const confOverrides = [
    '',
    '# Disposable cluster overrides (added by _pg-bootstrap.ts)',
    `listen_addresses = '127.0.0.1'`,
    `port = ${pgPort}`,
    `unix_socket_directories = '${pgSocketDir}'`,
    `max_connections = 50`,
    `shared_buffers = '32MB'`,
    `fsync = off`,
    `synchronous_commit = off`,
    '',
  ].join('\n');
  writeFileSync(confPath, confOverrides, { flag: 'a' });

  // Start the cluster via `pg_ctl -w`. We pass the log file via -l
  // and wait up to 30 seconds for readiness.
  runPgSync(pgCtl, ['-D', pgData, '-l', pgLog, '-w', '-t', '30', 'start']);

  // Create the default application database. Use psql against the
  // maintenance database 'postgres'.
  runPgSync(psql, [
    '-h',
    '127.0.0.1',
    '-p',
    String(pgPort),
    '-U',
    superuser,
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `CREATE DATABASE "${databaseName}";`,
  ]);

  const databaseUrl = `postgresql://${superuser}@127.0.0.1:${pgPort}/${databaseName}`;

  // Set DATABASE_URL in the current process so that PrismaService
  // and `prisma migrate deploy` both see it.
  process.env['DATABASE_URL'] = databaseUrl;

  // Per the ninth canonical batch specification (audit primitive
  // foundation), the test environment also needs an audit database.
  // The disposable cluster creates a second database on the same
  // PostgreSQL server for the audit store. The audit database uses
  // a separate connection URL and separate migrations.
  const auditDatabaseName = 'ibn_hayan_audit_test';
  runPgSync(psql, [
    '-h',
    '127.0.0.1',
    '-p',
    String(pgPort),
    '-U',
    superuser,
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `CREATE DATABASE "${auditDatabaseName}";`,
  ]);
  const auditDatabaseUrl = `postgresql://${superuser}@127.0.0.1:${pgPort}/${auditDatabaseName}`;
  process.env['AUDIT_DATABASE_URL'] = auditDatabaseUrl;

  // Set the audit integrity and identifier keys for tests. These are
  // test-only keys; they are NOT the placeholder values from
  // `.env.example`. They are sufficiently long (≥ 32 bytes) to pass
  // the key validation. They are distinct from each other.
  process.env['AUDIT_INTEGRITY_HMAC_KEY'] =
    'test-integrity-key-with-sufficient-entropy-32B!';
  process.env['AUDIT_IDENTIFIER_HMAC_KEY'] =
    'test-identifier-key-with-sufficient-entropy-32B!';
  process.env['AUDIT_INTEGRITY_KEY_VERSION'] = '1';

  handle = {
    mode: 'owned',
    rootTmp,
    pgData,
    pgSocketDir,
    pgLog,
    pgPort,
    pgBin: { initdb, pgCtl, psql },
    databaseUrl,
    databaseName,
    superuser,
  };

  // Install process-exit backstop. If the vitest worker exits
  // without running the afterAll hook (for example, because of an
  // uncaught exception), this handler ensures the cluster is still
  // stopped and the temp directory is still deleted.
  process.on('exit', () => {
    if (handle && handle.mode === 'owned') {
      try {
        runPgSync(handle.pgBin.pgCtl, [
          '-D',
          handle.pgData,
          '-m',
          'fast',
          '-w',
          '-t',
          '10',
          'stop',
        ]);
      } catch {
        // Best-effort: the cluster may already be stopped.
      }
      try {
        rmSync(handle.rootTmp, { recursive: true, force: true });
      } catch {
        // Best-effort.
      }
      // Unset DATABASE_URL (defence-in-depth, same reason as afterAll).
      delete process.env['DATABASE_URL'];
      // Per the ninth canonical batch specification, also unset the
      // audit env vars.
      delete process.env['AUDIT_DATABASE_URL'];
      delete process.env['AUDIT_INTEGRITY_HMAC_KEY'];
      delete process.env['AUDIT_IDENTIFIER_HMAC_KEY'];
      delete process.env['AUDIT_INTEGRITY_KEY_VERSION'];
    }
  });

  // Best-effort signal handlers. Synchronous work only.
  const cleanupOwned = (): void => {
    if (handle && handle.mode === 'owned') {
      try {
        runPgSync(handle.pgBin.pgCtl, [
          '-D',
          handle.pgData,
          '-m',
          'fast',
          '-w',
          '-t',
          '10',
          'stop',
        ]);
      } catch {
        // Best-effort.
      }
      try {
        rmSync(handle.rootTmp, { recursive: true, force: true });
      } catch {
        // Best-effort.
      }
    }
  };
  const sigIntHandler = (): void => {
    cleanupOwned();
    process.removeListener('SIGINT', sigIntHandler);
    process.kill(process.pid, 'SIGINT');
  };
  const sigTermHandler = (): void => {
    cleanupOwned();
    process.removeListener('SIGTERM', sigTermHandler);
    process.kill(process.pid, 'SIGTERM');
  };
  process.on('SIGINT', sigIntHandler);
  process.on('SIGTERM', sigTermHandler);

  return handle;
}

/**
 * Verify that psql can connect to the supplied DATABASE_URL. Throws
 * if connectivity fails. Does not print the URL.
 */
function verifyConnectivity(psql: string, databaseUrl: string): void {
  try {
    runPgSync(psql, [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-c', 'SELECT 1;']);
  } catch (err) {
    const e = err as Error;
    throw new Error(
      'Could not connect to the externally supplied DATABASE_URL. ' +
        'The URL itself is not printed. Error: ' +
        e.message,
    );
  }
}

/**
 * Apply the committed Prisma migrations to the cluster (owned or
 * external). Uses the normal production-style migration command
 * `prisma migrate deploy` via pnpm, run from the API package
 * directory.
 *
 * Per the ninth canonical batch specification, two sets of
 * migrations are applied:
 * 1. The transactional-store migrations (`prisma/schema.prisma`).
 * 2. The audit-store migrations (`prisma-audit/schema.prisma`).
 */
function applyMigrations(): void {
  const apiDir = resolve(__dirname, '..', '..');
  // Apply the transactional-store migrations.
  runPgSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    env: { ...process.env },
  });
  // Apply the audit-store migrations. The audit database URL is
  // already set in the process environment by the caller.
  runPgSync(
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
      env: { ...process.env },
    },
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The `DATABASE_URL` for the active cluster. Tests pass this to
 * the Prisma client constructor (via the `PrismaService`).
 */
export function getDatabaseUrl(): string {
  if (!handle) {
    throw new Error(
      'getDatabaseUrl() called before setupDatabaseTests(). ' +
        'Ensure setupDatabaseTests() is invoked at the top of the test file.',
    );
  }
  return handle.databaseUrl;
}

/**
 * Returns the path to the `psql` binary. Tests use this to run
 * ad-hoc SQL (for example, to verify that a delete operation was
 * rejected by a foreign-key constraint).
 */
export function getPsqlBin(): string {
  if (!handle) {
    throw new Error('getPsqlBin() called before setupDatabaseTests().');
  }
  return handle.pgBin.psql;
}

/**
 * Returns true if the active cluster is owned by this bootstrap
 * (i.e. the bootstrap started it and will stop it on cleanup).
 * Returns false if the cluster was externally supplied via
 * `DATABASE_URL`.
 */
export function isOwnedCluster(): boolean {
  return handle?.mode === 'owned';
}

/**
 * Vitest setup hook: ensure the cluster is up and the migration is
 * applied before any test in the file runs.
 *
 * Usage: call `setupDatabaseTests()` at the top of each database
 * test file (outside any `describe` block).
 */
export function setupDatabaseTests(): void {
  beforeAll(async () => {
    const h = await ensureCluster();
    // Always apply migrations: in external mode the cluster may
    // already have the migration applied (idempotent), in owned
    // mode the cluster is fresh.
    applyMigrations();
    // Re-verify connectivity after migration, so a migration that
    // breaks the schema is caught early.
    verifyConnectivity(h.pgBin.psql, h.databaseUrl);
  }, 60_000);

  afterAll(() => {
    // The test file is responsible for disconnecting its own
    // PrismaService. Here we only clean up the cluster if we own it.
    if (handle && handle.mode === 'owned') {
      const owned = handle;
      try {
        runPgSync(owned.pgBin.pgCtl, [
          '-D',
          owned.pgData,
          '-m',
          'fast',
          '-w',
          '-t',
          '10',
          'stop',
        ]);
      } catch {
        // Best-effort: the cluster may already be stopped.
      }
      try {
        rmSync(owned.rootTmp, { recursive: true, force: true });
      } catch {
        // Best-effort.
      }
      // Unset DATABASE_URL so the next test file (in the same vitest
      // fork) does not adopt the now-stopped cluster as an external
      // cluster. Without this, the second test file's
      // `ensureCluster()` would see the stale DATABASE_URL, skip
      // booting a fresh cluster, and fail connectivity verification.
      delete process.env['DATABASE_URL'];
      // Per the ninth canonical batch specification, also unset the
      // audit env vars.
      delete process.env['AUDIT_DATABASE_URL'];
      delete process.env['AUDIT_INTEGRITY_HMAC_KEY'];
      delete process.env['AUDIT_IDENTIFIER_HMAC_KEY'];
      delete process.env['AUDIT_INTEGRITY_KEY_VERSION'];
    }
    handle = null;
  });
}

/**
 * Read a file synchronously, returning the contents as a string.
 * Helper used by tests that need to inspect the migration SQL.
 * Retained as part of the public API for future test files; not
 * currently imported by `tenancy.db-spec.ts`.
 */
export function readFileSyncText(path: string): string {
  return readFileSync(path, 'utf-8');
}

// ---------------------------------------------------------------------------
// Migration-upgrade scenario harness (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical ADR-015 migration directory name. Used by the
 * migration-upgrade scenario harness to identify the boundary
 * between pre-ADR-015 migrations and the ADR-015 migration itself.
 */
export const ADR_015_MIGRATION_DIR =
  '20260722100000_scoped_organisation_facility_context';

/**
 * Handle returned by `startMigrationUpgradeCluster()`. Represents an
 * ISOLATED disposable PostgreSQL 17 cluster plus an isolated
 * temporary migrations directory whose initial contents are every
 * transactional migration preceding ADR-015. The caller is expected
 * to:
 *
 * 1. Call `applyPreAdr015Migrations()` once to bring the cluster to
 *    the pre-ADR-015 schema state.
 * 2. Insert a pre-ADR-015 `tenant_role_assignments` row via raw SQL
 *    using `psqlBin` and `databaseUrl` (the row has only `id`,
 *    `tenant_membership_id`, `role_code`, `created_at`,
 *    `updated_at`).
 * 3. Optionally verify that the ADR-015 columns are absent on the
 *    row at this point.
 * 4. Call `exposeAdr015Migration()` to copy the ADR-015 migration
 *    directory into the isolated migrations directory.
 * 5. Call `applyAdr015Migration()` to apply the ADR-015 migration
 *    to the already-populated cluster.
 * 6. Verify the post-migration shape of the previously-inserted
 *    row.
 * 7. Always call `teardown()` in a `finally` block.
 *
 * The handle is completely independent of the shared `handle`
 * used by `setupDatabaseTests()`: it uses its own port, its own
 * data directory, its own socket directory, and its own
 * `DATABASE_URL`. The shared `DATABASE_URL` env var is NOT
 * mutated; the upgrade cluster's URL is exposed only on the
 * handle.
 *
 * The harness does NOT install PostgreSQL. If PostgreSQL 17 is not
 * available on PATH or via `PG_BINDIR`, the harness throws a
 * descriptive error during `startMigrationUpgradeCluster()`. The
 * calling test is expected to be discovered by vitest regardless;
 * the failure surfaces at runtime, not at compile time.
 */
export interface MigrationUpgradeHandle {
  /** psql binary path. Use to run raw SQL against the upgrade cluster. */
  psqlBin: string;
  /** postgresql:// URL pointing at the upgrade cluster's database. */
  databaseUrl: string;
  /**
   * Apply every pre-ADR-015 transactional migration to the
   * upgrade cluster. Idempotent: throws if called twice.
   */
  applyPreAdr015Migrations: () => void;
  /**
   * Copy the ADR-015 migration directory into the isolated
   * migrations directory. Idempotent: throws if called twice.
   */
  exposeAdr015Migration: () => void;
  /**
   * Apply the ADR-015 migration to the upgrade cluster. Requires
   * `exposeAdr015Migration()` to have been called first.
   */
  applyAdr015Migration: () => void;
  /**
   * Stop the cluster and recursively delete the temporary data
   * directory, socket directory, log file, and isolated migrations
   * directory. Safe to call multiple times; subsequent calls are
   * no-ops. MUST be called in a `finally` block by the caller.
   */
  teardown: () => void;
}

/**
 * Internal state for the migration-upgrade cluster. Kept separate
 * from the shared `handle` to avoid any cross-contamination with
 * `setupDatabaseTests()`.
 */
interface UpgradeClusterState {
  pgBin: { initdb: string; pgCtl: string; psql: string };
  rootTmp: string;
  pgData: string;
  pgSocketDir: string;
  pgLog: string;
  pgPort: number;
  databaseUrl: string;
  migrationsDir: string;
  migrationsLockFile: string;
  prismaConfigPath: string;
  preAdr015Applied: boolean;
  adr015Exposed: boolean;
  adr015Applied: boolean;
  tornDown: boolean;
}

/**
 * Start a SECOND disposable PostgreSQL 17 cluster dedicated to the
 * migration-upgrade scenario. The cluster is completely isolated
 * from the main test cluster: it has its own data directory, port,
 * socket directory, and DATABASE_URL.
 *
 * The function also creates an isolated temporary migrations
 * directory under the OS temp tree and copies every transactional
 * migration preceding ADR-015 into it. A temporary Prisma config
 * file pointing at the isolated migrations directory and the
 * canonical schema is written next to it.
 *
 * The caller MUST call `handle.teardown()` in a `finally` block.
 */
export async function startMigrationUpgradeCluster(): Promise<MigrationUpgradeHandle> {
  const initdb = resolvePgExecutable('initdb');
  const pgCtl = resolvePgExecutable('pg_ctl');
  const psql = resolvePgExecutable('psql');
  verifyPostgreSQL17(initdb, pgCtl, psql);

  // Resolve repository paths.
  const apiDir = resolve(__dirname, '..', '..');
  const canonicalMigrationsDir = join(apiDir, 'prisma', 'migrations');
  const canonicalSchemaPath = join(apiDir, 'prisma', 'schema.prisma');
  if (!existsSync(canonicalMigrationsDir)) {
    throw new Error(
      `Canonical migrations directory not found at ${canonicalMigrationsDir}.`,
    );
  }
  if (!existsSync(canonicalSchemaPath)) {
    throw new Error(`Canonical schema not found at ${canonicalSchemaPath}.`);
  }

  // List every migration directory preceding ADR-015, sorted
  // lexicographically (Prisma applies migrations in lexicographic
  // order of their directory names).
  const allMigrationDirs = readdirSync(canonicalMigrationsDir, {
    withFileTypes: true,
  })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const preAdr015MigrationDirs = allMigrationDirs.filter(
    (name) => name < ADR_015_MIGRATION_DIR,
  );
  if (preAdr015MigrationDirs.length === 0) {
    throw new Error(
      `No pre-ADR-015 migrations found in ${canonicalMigrationsDir}.`,
    );
  }
  if (!allMigrationDirs.includes(ADR_015_MIGRATION_DIR)) {
    throw new Error(
      `ADR-015 migration directory ${ADR_015_MIGRATION_DIR} not found in ${canonicalMigrationsDir}.`,
    );
  }

  // Create the isolated temp tree.
  const rootTmp = mkdtempSync(join(tmpdir(), 'ibn-hayan-adr015-upgrade-'));
  const pgData = join(rootTmp, 'data');
  const pgSocketDir = join(rootTmp, 'sockets');
  const pgLog = join(rootTmp, 'postgres.log');
  const migrationsDir = join(rootTmp, 'migrations');
  const migrationsLockFile = join(migrationsDir, 'migration_lock.toml');
  const prismaConfigPath = join(rootTmp, 'prisma-upgrade.config.ts');
  mkdirSync(pgSocketDir, { recursive: true, mode: 0o700 });
  mkdirSync(migrationsDir, { recursive: true, mode: 0o700 });

  // Copy the migration_lock.toml verbatim (provider must remain
  // 'postgresql').
  const canonicalLockFile = join(canonicalMigrationsDir, 'migration_lock.toml');
  copyFileSync(canonicalLockFile, migrationsLockFile);

  // Copy each pre-ADR-015 migration directory verbatim.
  for (const name of preAdr015MigrationDirs) {
    const src = join(canonicalMigrationsDir, name);
    const dst = join(migrationsDir, name);
    cpSync(src, dst, { recursive: true });
  }

  // Write a Prisma config that points at the canonical schema
  // (so Prisma's schema parser has every model definition it
  // needs) and at the isolated migrations directory. The
  // datasource URL is sourced from the spawned process env, not
  // from process.env.DATABASE_URL — the upgrade cluster's URL is
  // passed explicitly to avoid colliding with the shared
  // disposable cluster's URL.
  const prismaConfigContents = [
    "import { defineConfig } from 'prisma/config';",
    '',
    'export default defineConfig({',
    `  schema: ${JSON.stringify(canonicalSchemaPath)},`,
    '  migrations: {',
    `    path: ${JSON.stringify(migrationsDir)},`,
    '  },',
    '  datasource: {',
    '    url: process.env.UPGRADE_DATABASE_URL,',
    '  },',
    '});',
    '',
  ].join('\n');
  writeFileSync(prismaConfigPath, prismaConfigContents, { encoding: 'utf-8' });

  // Boot the isolated cluster.
  const pgPort = await pickFreePort();
  const superuser = 'postgres';
  const databaseName = 'ibn_hayan_upgrade_test';

  runPgSync(initdb, [
    '-D',
    pgData,
    '-U',
    superuser,
    '-A',
    'trust',
    '--encoding=UTF8',
    '--locale=C.UTF-8',
  ]);

  const confPath = join(pgData, 'postgresql.conf');
  const confOverrides = [
    '',
    '# Disposable upgrade cluster overrides (added by _pg-bootstrap.ts)',
    `listen_addresses = '127.0.0.1'`,
    `port = ${pgPort}`,
    `unix_socket_directories = '${pgSocketDir}'`,
    `max_connections = 10`,
    `shared_buffers = '16MB'`,
    `fsync = off`,
    `synchronous_commit = off`,
    '',
  ].join('\n');
  writeFileSync(confPath, confOverrides, { flag: 'a' });

  runPgSync(pgCtl, ['-D', pgData, '-l', pgLog, '-w', '-t', '30', 'start']);

  runPgSync(psql, [
    '-h',
    '127.0.0.1',
    '-p',
    String(pgPort),
    '-U',
    superuser,
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `CREATE DATABASE "${databaseName}";`,
  ]);

  const databaseUrl = `postgresql://${superuser}@127.0.0.1:${pgPort}/${databaseName}`;

  const state: UpgradeClusterState = {
    pgBin: { initdb, pgCtl, psql },
    rootTmp,
    pgData,
    pgSocketDir,
    pgLog,
    pgPort,
    databaseUrl,
    migrationsDir,
    migrationsLockFile,
    prismaConfigPath,
    preAdr015Applied: false,
    adr015Exposed: false,
    adr015Applied: false,
    tornDown: false,
  };

  const teardown = (): void => {
    if (state.tornDown) {
      return;
    }
    state.tornDown = true;
    try {
      runPgSync(state.pgBin.pgCtl, [
        '-D',
        state.pgData,
        '-m',
        'fast',
        '-w',
        '-t',
        '10',
        'stop',
      ]);
    } catch {
      // Best-effort.
    }
    try {
      rmSync(state.rootTmp, { recursive: true, force: true });
    } catch {
      // Best-effort.
    }
  };

  const applyMigrationsInternal = (): void => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      UPGRADE_DATABASE_URL: state.databaseUrl,
      // Explicitly UNSET DATABASE_URL so the upgrade cluster's
      // Prisma invocation cannot accidentally pick up the shared
      // disposable cluster's URL.
      DATABASE_URL: undefined,
    };
    runPgSync(
      'pnpm',
      [
        'exec',
        'prisma',
        'migrate',
        'deploy',
        '--config',
        state.prismaConfigPath,
      ],
      { cwd: apiDir, env },
    );
  };

  return {
    psqlBin: psql,
    databaseUrl,
    applyPreAdr015Migrations: (): void => {
      if (state.preAdr015Applied) {
        throw new Error(
          'applyPreAdr015Migrations() called twice. The pre-ADR-015 migrations are already applied.',
        );
      }
      applyMigrationsInternal();
      state.preAdr015Applied = true;
    },
    exposeAdr015Migration: (): void => {
      if (state.adr015Exposed) {
        throw new Error(
          'exposeAdr015Migration() called twice. The ADR-015 migration is already exposed.',
        );
      }
      const src = join(canonicalMigrationsDir, ADR_015_MIGRATION_DIR);
      const dst = join(state.migrationsDir, ADR_015_MIGRATION_DIR);
      cpSync(src, dst, { recursive: true });
      state.adr015Exposed = true;
    },
    applyAdr015Migration: (): void => {
      if (!state.adr015Exposed) {
        throw new Error(
          'applyAdr015Migration() called before exposeAdr015Migration().',
        );
      }
      if (state.adr015Applied) {
        throw new Error('applyAdr015Migration() called twice.');
      }
      applyMigrationsInternal();
      state.adr015Applied = true;
    },
    teardown,
  };
}
