import { afterAll, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
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
 * Apply the committed Prisma migration to the cluster (owned or
 * external). Uses the normal production-style migration command
 * `prisma migrate deploy` via pnpm, run from the API package
 * directory.
 */
function applyMigrations(): void {
  const apiDir = resolve(__dirname, '..', '..');
  runPgSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    env: { ...process.env },
  });
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
