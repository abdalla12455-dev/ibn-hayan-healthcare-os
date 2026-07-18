#!/usr/bin/env bash
# validate-database-foundation.sh
#
# Validates the third canonical batch's PostgreSQL tenancy foundation
# against a disposable PostgreSQL 17 cluster.
#
# This script is repository-self-contained: it does NOT source, call,
# or rely on any external helper script under `$HOME` or elsewhere.
# The complete disposable-PostgreSQL orchestration logic lives in
# this file.
#
# Behaviour:
# 1. Discovers `initdb`, `pg_ctl`, and `psql` through `PG_BINDIR`
#    when supplied, otherwise through PATH. Verifies PostgreSQL major
#    version 17.
# 2. Creates a unique temporary directory under `$(mktemp -d)` for
#    the cluster data, socket, and log files.
# 3. Selects an available local TCP port by temporarily binding to
#    `127.0.0.1:0` via the Node.js runtime (the repository's
#    required runtime) and immediately closing the socket.
# 4. Initialises a fresh unprivileged PostgreSQL 17 cluster with
#    local-only trust authentication. The cluster is bound to
#    `127.0.0.1` only.
# 5. Constructs `DATABASE_URL` only as a process environment
#    variable. The URL is NEVER written to a file, NEVER printed.
# 6. Installs cleanup handlers for EXIT, INT, TERM. Cleanup stops
#    PostgreSQL (if started), removes the temporary data directory,
#    socket directory, and log files, and preserves the original
#    exit status.
# 7. Applies all migrations to the disposable cluster through
#    `pnpm --filter @ibn-hayan/api db:migrate:deploy`.
# 8. Generates the Prisma client through the committed command.
# 9. Runs database integration tests using the same disposable
#    database. Because `DATABASE_URL` is supplied, the TypeScript
#    test bootstrap reuses this cluster rather than starting a
#    nested one.
# 10. Verifies the expected tables, enums, constraints, indexes,
#     column types, and absence of forbidden objects by querying
#     `information_schema` and `pg_catalog` directly through psql.
# 11. On success and on deliberate failure, leaves no PostgreSQL
#     process, listener, data directory, socket directory, or log
#     behind.
#
# This script never prints the password or the full DATABASE_URL.
# It does NOT modify any repository file. It works from a clean
# source-only checkout after `pnpm install`.

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration and discovery
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
export NEXT_TELEMETRY_DISABLED=1

if [[ ! -d "$API_DIR" ]]; then
  echo "ERROR: API directory not found at: $API_DIR" >&2
  exit 1
fi

# Resolve PostgreSQL executables. Prefer PG_BINDIR, fall back to PATH.
resolve_pg_bin() {
  local name="$1"
  if [[ -n "${PG_BINDIR:-}" ]]; then
    local candidate="$PG_BINDIR/$name"
    if [[ -x "$candidate" || -f "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
    echo "ERROR: PG_BINDIR is set to '$PG_BINDIR' but '$candidate' does not exist." >&2
    exit 1
  fi
  # Fall back to PATH. Use `command -v` to locate the binary.
  local resolved
  if ! resolved="$(command -v "$name" 2>/dev/null)"; then
    echo "ERROR: PostgreSQL executable '$name' not found in PATH." >&2
    echo "       Set PG_BINDIR to a directory containing the PostgreSQL 17" >&2
    echo "       executables (initdb, pg_ctl, psql), or add them to PATH." >&2
    exit 1
  fi
  echo "$resolved"
}

INITDB_BIN="$(resolve_pg_bin initdb)"
PG_CTL_BIN="$(resolve_pg_bin pg_ctl)"
PSQL_BIN="$(resolve_pg_bin psql)"

# Verify PostgreSQL major version 17.
verify_pg_version() {
  local bin="$1"
  local name="$2"
  local version_output
  if ! version_output="$("$bin" --version 2>&1)"; then
    echo "ERROR: Failed to execute '$bin --version'." >&2
    echo "       stderr: $version_output" >&2
    exit 1
  fi
  # Output looks like: "initdb (PostgreSQL) 17.10 (Debian 17.10-0+deb13u1)"
  local major
  if ! [[ "$version_output" =~ PostgreSQL\)\ ([0-9]+)\. ]]; then
    echo "ERROR: Could not parse PostgreSQL version from '$bin --version' output:" >&2
    echo "       $version_output" >&2
    exit 1
  fi
  major="${BASH_REMATCH[1]}"
  if [[ "$major" != "17" ]]; then
    echo "ERROR: $name reports PostgreSQL major version $major; version 17 is required." >&2
    exit 1
  fi
}

verify_pg_version "$INITDB_BIN" initdb
verify_pg_version "$PG_CTL_BIN" pg_ctl
verify_pg_version "$PSQL_BIN" psql

# ---------------------------------------------------------------------------
# Temporary paths and port selection
# ---------------------------------------------------------------------------

ROOT_TMP="$(mktemp -d -t ibn-hayan-pg-validate-XXXXXX)"
PG_DATA="$ROOT_TMP/data"
PG_SOCKET_DIR="$ROOT_TMP/sockets"
PG_LOG="$ROOT_TMP/postgres.log"
INITDB_LOG="$ROOT_TMP/initdb.log"
PG_SUPERUSER="postgres"
PG_DATABASE="ibn_hayan_test"
PG_PORT=""
PG_STARTED="no"
DATABASE_URL=""

mkdir -p "$PG_SOCKET_DIR"
chmod 700 "$PG_SOCKET_DIR"

# Pick a free local TCP port by temporarily binding to 127.0.0.1:0
# via the Node.js runtime (the repository's required runtime) and
# immediately closing the socket. We pass the port back via stdout.
pick_free_port() {
  node -e '
    const net = require("net");
    const s = net.createServer();
    s.on("error", (err) => { console.error(err.message); process.exit(1); });
    s.listen(0, "127.0.0.1", () => {
      const port = s.address().port;
      s.close(() => { console.log(port); });
    });
  '
}

PG_PORT="$(pick_free_port)"

# ---------------------------------------------------------------------------
# Cleanup handlers
# ---------------------------------------------------------------------------

PG_EXIT_STATUS=0

cleanup() {
  local rc=$?
  if [[ "$PG_EXIT_STATUS" != "0" ]]; then
    rc="$PG_EXIT_STATUS"
  fi
  # Stop PostgreSQL if we started it. Best-effort.
  if [[ "$PG_STARTED" == "yes" ]]; then
    "$PG_CTL_BIN" -D "$PG_DATA" -m fast -w -t 10 stop >/dev/null 2>&1 || true
  fi
  # Remove the temporary directory tree (data, sockets, logs).
  rm -rf "$ROOT_TMP" 2>/dev/null || true
  # Do not print DATABASE_URL.
  exit "$rc"
}

trap cleanup EXIT
trap 'PG_EXIT_STATUS=130; cleanup' INT
trap 'PG_EXIT_STATUS=143; cleanup' TERM

# ---------------------------------------------------------------------------
# Initialise and start the disposable cluster
# ---------------------------------------------------------------------------

echo "===BOOTING DISPOSABLE POSTGRESQL 17 CLUSTER==="

# initdb: initialise the cluster with trust auth for local TCP.
"$INITDB_BIN" \
  -D "$PG_DATA" \
  -U "$PG_SUPERUSER" \
  -A trust \
  --encoding=UTF8 \
  --locale=C.UTF-8 \
  >"$INITDB_LOG" 2>&1

# Append disposable-cluster overrides to postgresql.conf. We write
# only to the file inside the temporary data directory.
cat >> "$PG_DATA/postgresql.conf" <<EOF

# Disposable cluster overrides (added by validate-database-foundation.sh)
listen_addresses = '127.0.0.1'
port = $PG_PORT
unix_socket_directories = '$PG_SOCKET_DIR'
max_connections = 50
shared_buffers = '32MB'
fsync = off
synchronous_commit = off
EOF

# Start the cluster via pg_ctl -w. Wait up to 30 seconds for readiness.
"$PG_CTL_BIN" \
  -D "$PG_DATA" \
  -l "$PG_LOG" \
  -w \
  -t 30 \
  start \
  >/dev/null 2>&1

PG_STARTED="yes"

# Create the application database.
"$PSQL_BIN" \
  -h 127.0.0.1 \
  -p "$PG_PORT" \
  -U "$PG_SUPERUSER" \
  -d postgres \
  -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"$PG_DATABASE\";" \
  >/dev/null 2>&1

# Construct DATABASE_URL only in the process environment.
DATABASE_URL="postgresql://$PG_SUPERUSER@127.0.0.1:$PG_PORT/$PG_DATABASE"
export DATABASE_URL

echo "Cluster booted on 127.0.0.1:$PG_PORT (local-only, trust auth)."

# ---------------------------------------------------------------------------
# Apply migrations and generate the Prisma client
# ---------------------------------------------------------------------------

echo "===APPLYING MIGRATIONS==="
pnpm --filter @ibn-hayan/api db:migrate:deploy

echo "===GENERATING PRISMA CLIENT==="
pnpm --filter @ibn-hayan/api db:generate

# ---------------------------------------------------------------------------
# Run database integration tests
# ---------------------------------------------------------------------------

echo "===RUNNING DATABASE INTEGRATION TESTS==="
# DATABASE_URL is already exported; the TypeScript test bootstrap
# reuses this cluster rather than starting a nested one.
pnpm test:database

# ---------------------------------------------------------------------------
# Verify the expected schema objects exist by querying the catalog
# directly through psql.
# ---------------------------------------------------------------------------

echo "===VERIFYING SCHEMA OBJECTS==="

# Helper: run a SQL statement that must return exactly one row whose
# first column is 1. The query text and a description are printed on
# failure; DATABASE_URL is never printed.
verify_count_one() {
  local query="$1"
  local description="$2"
  local result
  if ! result="$("$PSQL_BIN" "$DATABASE_URL" -t -A -c "$query" 2>&1)"; then
    echo "ERROR: Schema verification failed: $description" >&2
    echo "  Query: $query" >&2
    echo "  psql output: $result" >&2
    exit 1
  fi
  if [[ "$result" != "1" ]]; then
    echo "ERROR: Schema verification failed: $description" >&2
    echo "  Query: $query" >&2
    echo "  Result: $result" >&2
    exit 1
  fi
  echo "  OK: $description"
}

# Helper: run a SQL statement that must return exactly zero. Used
# for negative assertions (no CASCADE, no RLS, no forbidden tables).
verify_count_zero() {
  local query="$1"
  local description="$2"
  local result
  result="$("$PSQL_BIN" "$DATABASE_URL" -t -A -c "$query" 2>&1)" || true
  if [[ "$result" != "0" ]]; then
    echo "ERROR: Schema verification failed: $description" >&2
    echo "  Query: $query" >&2
    echo "  Result: $result" >&2
    exit 1
  fi
  echo "  OK: $description"
}

# Tables
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants';" \
  "tenants table exists"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organisations';" \
  "organisations table exists"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'facilities';" \
  "facilities table exists"

# Enums (PostgreSQL stores enums as user-defined types)
verify_count_one \
  "SELECT COUNT(*) FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typname = 'TenantStatus';" \
  "TenantStatus enum exists"
verify_count_one \
  "SELECT COUNT(*) FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typname = 'OrganisationStatus';" \
  "OrganisationStatus enum exists"
verify_count_one \
  "SELECT COUNT(*) FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typname = 'FacilityStatus';" \
  "FacilityStatus enum exists"

# UUID column types
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'id' AND data_type = 'uuid';" \
  "tenants.id is UUID"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'id' AND data_type = 'uuid';" \
  "organisations.id is UUID"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'id' AND data_type = 'uuid';" \
  "facilities.id is UUID"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'tenant_id' AND data_type = 'uuid';" \
  "organisations.tenant_id is UUID"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'tenant_id' AND data_type = 'uuid';" \
  "facilities.tenant_id is UUID"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'organisation_id' AND data_type = 'uuid';" \
  "facilities.organisation_id is UUID"

# timestamptz columns
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'created_at' AND data_type = 'timestamp with time zone';" \
  "tenants.created_at is timestamptz"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'updated_at' AND data_type = 'timestamp with time zone';" \
  "tenants.updated_at is timestamptz"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'created_at' AND data_type = 'timestamp with time zone';" \
  "organisations.created_at is timestamptz"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'updated_at' AND data_type = 'timestamp with time zone';" \
  "organisations.updated_at is timestamptz"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'created_at' AND data_type = 'timestamp with time zone';" \
  "facilities.created_at is timestamptz"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'updated_at' AND data_type = 'timestamp with time zone';" \
  "facilities.updated_at is timestamptz"

# Maximum string lengths
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'slug' AND character_maximum_length = 80;" \
  "tenants.slug is varchar(80)"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'display_name' AND character_maximum_length = 200;" \
  "tenants.display_name is varchar(200)"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'code' AND character_maximum_length = 50;" \
  "organisations.code is varchar(50)"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'display_name' AND character_maximum_length = 200;" \
  "organisations.display_name is varchar(200)"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'code' AND character_maximum_length = 50;" \
  "facilities.code is varchar(50)"
verify_count_one \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'display_name' AND character_maximum_length = 200;" \
  "facilities.display_name is varchar(200)"

# Foreign keys (must all be ON DELETE RESTRICT and ON UPDATE RESTRICT)
verify_count_one \
  "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND conname = 'organisations_tenant_id_fkey' AND pg_get_constraintdef(oid) LIKE '%ON DELETE RESTRICT%' AND pg_get_constraintdef(oid) LIKE '%ON UPDATE RESTRICT%';" \
  "organisations.tenant_id FK exists with ON DELETE/UPDATE RESTRICT"
verify_count_one \
  "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND conname = 'facilities_organisation_id_fkey' AND pg_get_constraintdef(oid) LIKE '%ON DELETE RESTRICT%' AND pg_get_constraintdef(oid) LIKE '%ON UPDATE RESTRICT%';" \
  "facilities.organisation_id FK exists with ON DELETE/UPDATE RESTRICT"
verify_count_one \
  "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND conname = 'facilities_tenant_id_organisation_id_fkey' AND pg_get_constraintdef(oid) LIKE '%ON DELETE RESTRICT%' AND pg_get_constraintdef(oid) LIKE '%ON UPDATE RESTRICT%';" \
  "facilities composite FK (tenant_id, organisation_id) exists with ON DELETE/UPDATE RESTRICT"

# Unique constraints / indexes
verify_unique_exists() {
  local name="$1"
  local description="$2"
  local result
  result="$("$PSQL_BIN" "$DATABASE_URL" -t -A -c "SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'u' AND conname = '${name}') OR EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = '${name}') THEN 1 ELSE 0 END;")"
  if [[ "$result" != "1" ]]; then
    echo "ERROR: Schema verification failed: $description" >&2
    echo "  Constraint/index name: $name" >&2
    echo "  Result: $result" >&2
    exit 1
  fi
  echo "  OK: $description"
}

verify_unique_exists "tenants_slug_key" \
  "tenants.slug unique constraint exists"
verify_unique_exists "organisations_tenant_id_code_key" \
  "organisations(tenant_id, code) unique constraint exists"
verify_unique_exists "organisations_tenant_id_id_key" \
  "organisations(tenant_id, id) composite unique constraint exists (required for composite FK)"
verify_unique_exists "facilities_tenant_id_organisation_id_code_key" \
  "facilities(tenant_id, organisation_id, code) unique constraint exists"

# Indexes
verify_count_one \
  "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'organisations' AND indexname = 'organisations_tenant_id_idx';" \
  "organisations.tenant_id index exists"
verify_count_one \
  "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'facilities' AND indexname = 'facilities_tenant_id_idx';" \
  "facilities.tenant_id index exists"
verify_count_one \
  "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'facilities' AND indexname = 'facilities_tenant_id_organisation_id_idx';" \
  "facilities(tenant_id, organisation_id) index exists"

# No CASCADE anywhere
verify_count_zero \
  "SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND pg_get_constraintdef(oid) LIKE '%ON DELETE CASCADE%';" \
  "no ON DELETE CASCADE foreign keys exist"

# No RLS policies
verify_count_zero \
  "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" \
  "no RLS policies exist"

# No forbidden tables
verify_count_zero \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('patients', 'users', 'user_sessions', 'audit_logs', 'audit_events', 'appointments', 'billing_accounts', 'inventory_items', 'notifications', 'memberships', 'roles', 'permissions', 'encounters', 'configurations');" \
  "no patient/user/audit/billing/scheduling/inventory/notification/identity tables exist"

# No extensions except plpgsql
verify_count_zero \
  "SELECT COUNT(*) FROM pg_extension WHERE extname != 'plpgsql';" \
  "no non-default PostgreSQL extensions are enabled"

# No seed rows in any tenancy table
verify_count_zero \
  "SELECT (SELECT COUNT(*) FROM tenants) + (SELECT COUNT(*) FROM organisations) + (SELECT COUNT(*) FROM facilities);" \
  "no seed rows exist in tenancy tables"

# ---------------------------------------------------------------------------
# Success
# ---------------------------------------------------------------------------

echo "===DATABASE FOUNDATION VALIDATION PASSED==="
echo "All schema objects verified. Database integration tests passed."
echo "The disposable cluster will be destroyed on script exit."

# The cleanup trap fires on exit and destroys the cluster.
exit 0
