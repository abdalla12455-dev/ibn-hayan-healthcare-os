import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { execFileSync } from 'node:child_process';
import { Logger } from '@nestjs/common';
import {
  PREVIEW_IDENTITY_CATALOGUE,
  PREVIEW_TENANT_SLUG,
  PREVIEW_TENANT_DISPLAY_NAME,
  PREVIEW_ORGANISATION_CODE,
  PREVIEW_ORGANISATION_DISPLAY_NAME,
  PREVIEW_FACILITY_CODE,
  PREVIEW_FACILITY_DISPLAY_NAME,
} from '../modules/dev/role-preview/preview-identity-catalogue.js';
import {
  readPreviewPasswordFromEnv,
  PREVIEW_PASSWORD_ENV_VAR,
} from '../modules/dev/role-preview/preview-password.js';
import {
  validatePreviewDatabaseIdentity,
  type PreviewDatabaseIdentityResult,
} from '../modules/dev/role-preview/preview-database-identity.js';

/**
 * Development-only Demo Role Preview Mode seed command.
 *
 * Creates the isolated preview workspace (one preview tenant, one
 * preview organisation, one preview facility) and one preview
 * identity for every canonical role R01 through R14. Each preview
 * identity receives an active TenantMembership under the preview
 * tenant and a TenantRoleAssignment at the canonical scope level
 * for its role.
 *
 * Per the Demo Role Preview Mode v1 specification:
 * - Refuses to run when `NODE_ENV=production`.
 * - Refuses without the explicit `ALLOW_ROLE_PREVIEW_SEED=true` flag.
 * - Refuses when `IBN_HAYAN_ROLE_PREVIEW_ENABLED != 'true'`.
 * - Refuses when the target database's identity cannot be verified
 *   as the isolated preview database (the database URL must contain
 *   the substring `role_preview` or `preview_role`).
 * - Applies migrations before any seed work.
 * - Is idempotent: running the seed twice produces the same end
 *   state. Existing rows are reused; missing rows are created.
 * - Creates NO patient, appointment, invoice, payment, inventory,
 *   attendance, waiting-room, or notification records.
 * - Hashes the preview password with Argon2id exactly like
 *   production credentials.
 * - NEVER prints the password, the password hash, the session
 *   token, or any credential material.
 * - Prints only non-sensitive identifiers (tenant slug, role codes,
 *   preview identity display names) and a success message.
 * - Does NOT run automatically during install, build, migration, or
 *   startup.
 *
 * Usage:
 *   ALLOW_ROLE_PREVIEW_SEED=true \
 *   IBN_HAYAN_ROLE_PREVIEW_ENABLED=true \
 *   IBN_HAYAN_ROLE_PREVIEW_PASSWORD=<loaded-from-protected-preview.env> \
 *   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/role_preview_db \
 *   NODE_ENV=development \
 *   pnpm --filter @ibn-hayan/api role-preview:seed
 *
 * Implementation note: this script uses the generated Prisma client
 * directly (not through NestJS DI) for the same reason as
 * `auth-bootstrap-dev.ts`: the Prisma 7 generated client uses ESM
 * internals that are incompatible with tsx's CommonJS transformation
 * when loaded through NestJS's DI container.
 */

// Import the generated Prisma client. The `.js` extension is required
// by the api's `module: nodenext` tsconfig; tsx resolves it to the
// `.ts` source via its ESM loader.
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Error thrown by `readSeedEnv()` when the seed environment fails
 * validation. The error message is SAFE: it identifies which
 * variable failed and a short reason code, but it NEVER includes
 * the URL value, the credentials, the username, the password, the
 * hostname, the query string, or the database password.
 *
 * The error is a plain `Error` (not a NestJS exception) so that it
 * can be thrown from the standalone seed script without pulling in
 * NestJS runtime dependencies, and so that it can be caught and
 * inspected by unit tests.
 */
export class RolePreviewSeedEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RolePreviewSeedEnvError';
    // Restore the prototype chain after the super call; required
    // for `instanceof` to work correctly when targeting ES2022+.
    Object.setPrototypeOf(this, RolePreviewSeedEnvError.prototype);
  }
}

/**
 * The validated seed environment. Returned by `readSeedEnv()` when
 * every validation passes.
 *
 * - `databaseUrl`: the raw transactional `DATABASE_URL`. The seed
 *   needs the raw URL to construct the Prisma adapter. The URL is
 *   NEVER printed, NEVER logged, NEVER returned in any API
 *   response, and NEVER persisted in any audit event.
 * - `auditDatabaseUrl`: the raw `AUDIT_DATABASE_URL`. The seed does
 *   NOT write to the audit database (the audit outbox + dispatcher
 *   handle that at runtime), but the seed MUST verify the audit
 *   database is an isolated preview database so that subsequent
 *   runtime audit emissions do not land in a production audit
 *   database.
 * - `previewPassword`: the validated preview password. The seed
 *   hashes this with Argon2id before persistence. It is NEVER
 *   printed, NEVER logged, and NEVER returned in any API response.
 * - `databaseIdentity`: the safe structured database-identity
 *   validation result. Carries only safe fields (no credential,
 *   no full URL). The seed MAY log the `databaseName` fields.
 */
export interface SeedEnv {
  readonly databaseUrl: string;
  readonly auditDatabaseUrl: string;
  readonly previewPassword: string;
  readonly databaseIdentity: PreviewDatabaseIdentityResult;
}

/**
 * Read and validate the seed environment. Throws
 * {@link RolePreviewSeedEnvError} when any required variable is
 * missing, malformed, or invalid; when the feature is disabled;
 * when the seed authorisation flag is missing; when production mode
 * is active; or when the transactional and audit databases are not
 * distinct isolated preview databases.
 *
 * Per the Secure Demo Role Preview Mode v1 correction specification,
 * the seed requires ALL of the following before it writes a single
 * entity:
 *
 * 1. `NODE_ENV !== 'production'` — production fails closed.
 * 2. `ALLOW_ROLE_PREVIEW_SEED=true` — explicit defence-in-depth
 *    flag to prevent accidental execution.
 * 3. `IBN_HAYAN_ROLE_PREVIEW_ENABLED=true` — the feature gate.
 * 4. `IBN_HAYAN_ROLE_PREVIEW_PASSWORD` present and valid (≥ 12
 *    characters, non-whitespace) — read through
 *    {@link readPreviewPasswordFromEnv}.
 * 5. `DATABASE_URL` parses as a PostgreSQL URL whose database name
 *    contains an approved preview identifier (`role_preview` or
 *    `preview_role`).
 * 6. `AUDIT_DATABASE_URL` parses as a PostgreSQL URL whose database
 *    name contains an approved preview identifier.
 * 7. The transactional and audit database names are DISTINCT
 *    (per ADR-014, the audit store is a dedicated database
 *    separate from the transactional store).
 *
 * The validation is fail-before-write: every check runs BEFORE any
 * Prisma query, BEFORE any migration, and BEFORE any entity
 * creation. A failure throws {@link RolePreviewSeedEnvError} and
 * the seed exits without touching the database.
 *
 * The error messages are SAFE: they identify which variable failed
 * and a short reason code, but they NEVER include the URL value,
 * the credentials, the username, the password, the hostname, the
 * query string, or the database password. The seed's top-level
 * error handler prints the error message to stderr; the message
 * is therefore the only thing an operator or a log aggregator
 * might see, and it is deliberately safe.
 *
 * The function is pure: it does NOT read `process.env` directly.
 * Callers pass the environment record explicitly so that the
 * function is unit-testable without mutating global state. The
 * seed's `main()` passes `process.env`; unit tests pass a
 * constructed record.
 *
 * @param env The environment record (typically `process.env`).
 * @returns The validated seed environment.
 * @throws {RolePreviewSeedEnvError} When any validation fails.
 */
export function readSeedEnv(env: NodeJS.ProcessEnv = process.env): SeedEnv {
  const nodeEnv = env['NODE_ENV'];
  if (nodeEnv === 'production') {
    throw new RolePreviewSeedEnvError(
      'role-preview:seed refuses to run when NODE_ENV=production. ' +
        'This command is development-only and must never be used in ' +
        'a production environment.',
    );
  }

  const allowSeed = env['ALLOW_ROLE_PREVIEW_SEED'] ?? '';
  if (allowSeed !== 'true') {
    throw new RolePreviewSeedEnvError(
      'role-preview:seed requires ALLOW_ROLE_PREVIEW_SEED=true to be ' +
        'set explicitly. This is a defence-in-depth measure to prevent ' +
        'accidental execution.',
    );
  }

  const featureFlag = env['IBN_HAYAN_ROLE_PREVIEW_ENABLED'] ?? '';
  if (featureFlag !== 'true') {
    throw new RolePreviewSeedEnvError(
      'role-preview:seed requires IBN_HAYAN_ROLE_PREVIEW_ENABLED=true. ' +
        'The seed creates preview-only identities and must not run ' +
        'when the feature is disabled.',
    );
  }

  // Read and validate the server-only preview password. Throws
  // PreviewPasswordMissingError when the value is missing, empty,
  // whitespace-only, or too short. The plaintext is returned to
  // the caller (the seed) so that it can be hashed with Argon2id;
  // it is NEVER printed, logged, or returned in any API response.
  let previewPassword: string;
  try {
    previewPassword = readPreviewPasswordFromEnv(env);
  } catch (err) {
    // Wrap the password error in a seed-env error so the seed's
    // top-level handler prints a single, consistent message. The
    // underlying error message is safe (it names only the variable
    // and the minimum length, never the value).
    const detail = err instanceof Error ? err.message : String(err);
    throw new RolePreviewSeedEnvError(
      `role-preview:seed requires a valid ${PREVIEW_PASSWORD_ENV_VAR}. ` +
        `${detail}`,
    );
  }

  // Database-identity gate: validate BOTH the transactional URL
  // and the audit URL, and verify they resolve to distinct
  // database names. The validation is pure (no DB connection, no
  // logging of the URL); it parses the URL with the native `URL`
  // parser and checks the database NAME only.
  //
  // This corrects the prior gap where the seed validated ONLY
  // `DATABASE_URL` (never `AUDIT_DATABASE_URL`) using an unsafe
  // substring match across the entire URL. The new check:
  // - parses both URLs with the native `URL` parser;
  // - derives the database name from `url.pathname` only;
  // - rejects when either database name does not contain an
  //   approved preview identifier;
  // - rejects when the two database names are identical (ADR-014
  //   requires a dedicated audit database).
  //
  // The error messages identify which check failed and a short
  // reason code, but NEVER include the URL value, credentials,
  // hostname, or query string.
  const databaseIdentity = validatePreviewDatabaseIdentity(env);
  if (!databaseIdentity.ok) {
    throw new RolePreviewSeedEnvError(
      formatDatabaseIdentityError(databaseIdentity),
    );
  }

  // Both URLs are valid and distinct. Read the raw URLs from the
  // environment; the seed needs them to construct the Prisma
  // adapter (transactional) and to log the audit database name
  // (audit). The raw URLs are NEVER printed, NEVER logged, NEVER
  // returned in any API response, and NEVER persisted in any
  // audit event.
  const databaseUrl = env['DATABASE_URL'];
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    // Defensive: the validator already confirmed the URL is a
    // non-empty string. This branch is unreachable in practice.
    throw new RolePreviewSeedEnvError(
      'DATABASE_URL is not set. The seed requires a running PostgreSQL ' +
        'database with the migrations applied.',
    );
  }
  const auditDatabaseUrl = env['AUDIT_DATABASE_URL'];
  if (typeof auditDatabaseUrl !== 'string' || auditDatabaseUrl.length === 0) {
    // Defensive: same as above.
    throw new RolePreviewSeedEnvError(
      'AUDIT_DATABASE_URL is not set. The seed requires an isolated ' +
        'audit database whose name contains "role_preview" or ' +
        '"preview_role".',
    );
  }

  return { databaseUrl, auditDatabaseUrl, previewPassword, databaseIdentity };
}

/**
 * Format a safe error message for a failed database-identity
 * validation. The message identifies which check failed and a short
 * reason code, but NEVER includes the URL value, credentials,
 * hostname, or query string.
 */
function formatDatabaseIdentityError(
  result: PreviewDatabaseIdentityResult,
): string {
  switch (result.reason) {
    case 'transactional_invalid':
      return (
        'DATABASE_URL failed the preview database-identity check: ' +
        `${result.transactional.reason ?? 'unknown'}. ` +
        'The transactional database URL must parse as a PostgreSQL URL ' +
        'whose database name contains "role_preview" or "preview_role".'
      );
    case 'audit_invalid':
      return (
        'AUDIT_DATABASE_URL failed the preview database-identity check: ' +
        `${result.audit.reason ?? 'unknown'}. ` +
        'The audit database URL must parse as a PostgreSQL URL whose ' +
        'database name contains "role_preview" or "preview_role".'
      );
    case 'databases_not_distinct':
      return (
        'DATABASE_URL and AUDIT_DATABASE_URL resolve to the same ' +
        'database name. Per ADR-014, the audit store must be a ' +
        'dedicated database separate from the transactional store. ' +
        'Use distinct database names for the transactional and audit ' +
        'preview databases.'
      );
    default:
      return (
        'The preview database-identity check failed. Both DATABASE_URL ' +
        'and AUDIT_DATABASE_URL must parse as PostgreSQL URLs whose ' +
        'database names contain "role_preview" or "preview_role", and ' +
        'the two database names must be distinct.'
      );
  }
}

/**
 * Apply migrations before any seed work. Mirrors the
 * `auth-bootstrap-dev` script.
 */
function applyMigrations(apiDir: string): void {
  const logger = new Logger('role-preview:seed');
  logger.log('Applying migrations...');
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    stdio: 'inherit',
  });
}

/**
 * Main entry point for the seed command.
 */
async function main(): Promise<void> {
  const env = readSeedEnv();
  const apiDir = process.cwd();
  const logger = new Logger('role-preview:seed');

  applyMigrations(apiDir);

  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const now = new Date();

    // 1. Create the preview tenant if it does not exist.
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: PREVIEW_TENANT_SLUG },
    });
    const tenant =
      existingTenant === null
        ? await prisma.tenant.create({
            data: {
              slug: PREVIEW_TENANT_SLUG,
              displayName: PREVIEW_TENANT_DISPLAY_NAME,
            },
          })
        : existingTenant;
    if (existingTenant === null) {
      logger.log(
        `Created preview tenant: slug=${tenant.slug} displayName=${tenant.displayName}`,
      );
    } else {
      logger.log(
        `Preview tenant already exists: slug=${tenant.slug} displayName=${tenant.displayName}`,
      );
    }

    // 2. Create the preview organisation if it does not exist.
    const existingOrganisation = await prisma.organisation.findFirst({
      where: { tenantId: tenant.id, code: PREVIEW_ORGANISATION_CODE },
    });
    const organisation =
      existingOrganisation === null
        ? await prisma.organisation.create({
            data: {
              tenantId: tenant.id,
              code: PREVIEW_ORGANISATION_CODE,
              displayName: PREVIEW_ORGANISATION_DISPLAY_NAME,
            },
          })
        : existingOrganisation;
    if (existingOrganisation === null) {
      logger.log(
        `Created preview organisation: code=${organisation.code} displayName=${organisation.displayName}`,
      );
    } else {
      logger.log(
        `Preview organisation already exists: code=${organisation.code}`,
      );
    }

    // 3. Create the preview facility if it does not exist.
    const existingFacility = await prisma.facility.findFirst({
      where: {
        tenantId: tenant.id,
        organisationId: organisation.id,
        code: PREVIEW_FACILITY_CODE,
      },
    });
    const facility =
      existingFacility === null
        ? await prisma.facility.create({
            data: {
              tenantId: tenant.id,
              organisationId: organisation.id,
              code: PREVIEW_FACILITY_CODE,
              displayName: PREVIEW_FACILITY_DISPLAY_NAME,
            },
          })
        : existingFacility;
    if (existingFacility === null) {
      logger.log(
        `Created preview facility: code=${facility.code} displayName=${facility.displayName}`,
      );
    } else {
      logger.log(`Preview facility already exists: code=${facility.code}`);
    }

    // 4. Hash the preview password once. The same hash is reused
    //    for every preview identity's LocalCredential. The password
    //    is read from the server-only environment variable
    //    `IBN_HAYAN_ROLE_PREVIEW_PASSWORD` (validated by
    //    `readSeedEnv`); it is NEVER printed, NEVER logged, and
    //    NEVER returned in any API response.
    const passwordHash = await argon2.hash(env.previewPassword, {
      type: argon2.argon2id,
    });

    // 5. Create one preview identity for every canonical role R01
    //    through R14.
    let createdCount = 0;
    let reusedCount = 0;
    for (const entry of PREVIEW_IDENTITY_CATALOGUE) {
      const normalisedEmail = entry.email.trim().toLowerCase();

      // 5a. Create or reuse the preview User.
      const existingUser = await prisma.user.findUnique({
        where: { normalisedEmail },
      });
      const user =
        existingUser === null
          ? await prisma.user.create({
              data: {
                email: entry.email,
                normalisedEmail,
                displayName: entry.displayName,
              },
            })
          : existingUser;

      // 5b. Create or update the preview LocalCredential. The
      //     credential is updated to keep the password hash
      //     deterministic across seed runs (the password is a
      //     constant; the hash should be the same after every
      //     seed).
      const existingCredential = await prisma.localCredential.findUnique({
        where: { userId: user.id },
      });
      if (existingCredential === null) {
        await prisma.localCredential.create({
          data: {
            userId: user.id,
            passwordHash,
            passwordChangedAt: now,
          },
        });
      } else {
        await prisma.localCredential.update({
          where: { userId: user.id },
          data: {
            passwordHash,
            passwordChangedAt: now,
          },
        });
      }

      // 5c. Create or reuse the preview TenantMembership.
      const existingMembership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      });
      const membership =
        existingMembership === null
          ? await prisma.tenantMembership.create({
              data: {
                tenantId: tenant.id,
                userId: user.id,
              },
            })
          : existingMembership;

      // 5d. Create or reuse the preview TenantRoleAssignment at
      //     the canonical scope level for the role.
      //
      //     Per the preview identity catalogue:
      //     - R13 System Administrator and R14 Integration Account
      //       receive a tenant-scoped assignment (no scope-target).
      //     - R01 through R12 receive a facility-scoped assignment
      //       under the preview tenant → preview organisation →
      //       preview facility.
      //
      //     The assignment is idempotent: if the assignment already
      //     exists, the seed does not duplicate it. The partial
      //     unique indexes (one per scope level) enforce this at
      //     the database level; the seed uses `findFirst` with an
      //     explicit filter to avoid relying on Prisma's `findUnique`
      //     for partial indexes.
      if (entry.scopeLevel === 'tenant') {
        const existingAssignment = await prisma.tenantRoleAssignment.findFirst({
          where: {
            tenantMembershipId: membership.id,
            roleCode: entry.catalogue.code,
            scopeLevel: 'tenant',
            scopeOrganisationId: null,
            scopeFacilityId: null,
          },
        });
        if (existingAssignment === null) {
          await prisma.tenantRoleAssignment.create({
            data: {
              tenantMembershipId: membership.id,
              tenantId: tenant.id,
              roleCode: entry.catalogue.code,
              scopeLevel: 'tenant',
              scopeOrganisationId: null,
              scopeFacilityId: null,
            },
          });
          createdCount++;
        } else {
          reusedCount++;
        }
      } else {
        // facility scope
        const existingAssignment = await prisma.tenantRoleAssignment.findFirst({
          where: {
            tenantMembershipId: membership.id,
            roleCode: entry.catalogue.code,
            scopeLevel: 'facility',
            scopeOrganisationId: organisation.id,
            scopeFacilityId: facility.id,
          },
        });
        if (existingAssignment === null) {
          await prisma.tenantRoleAssignment.create({
            data: {
              tenantMembershipId: membership.id,
              tenantId: tenant.id,
              roleCode: entry.catalogue.code,
              scopeLevel: 'facility',
              scopeOrganisationId: organisation.id,
              scopeFacilityId: facility.id,
            },
          });
          createdCount++;
        } else {
          reusedCount++;
        }
      }
    }

    logger.log('');
    logger.log('Seed complete.');
    logger.log(`  Preview tenant:        ${tenant.slug}`);
    logger.log(`  Preview organisation:  ${organisation.code}`);
    logger.log(`  Preview facility:      ${facility.code}`);
    logger.log(
      `  Preview identities:    ${String(PREVIEW_IDENTITY_CATALOGUE.length)} (R01 through R14)`,
    );
    logger.log(`  Role assignments created: ${String(createdCount)}`);
    logger.log(`  Role assignments reused:  ${String(reusedCount)}`);
    logger.log(`  (Password from ${PREVIEW_PASSWORD_ENV_VAR} is NOT printed.)`);
    logger.log(
      `  No business-domain data (patients, appointments, invoices, etc.) was created.`,
    );
    // Log the validated database names (safe: the database name is
    // the pathname of the URL, never a credential). The raw URLs
    // are NEVER logged.
    if (env.databaseIdentity.transactional.databaseName !== undefined) {
      logger.log(
        `  Transactional database name: ${env.databaseIdentity.transactional.databaseName}`,
      );
    }
    if (env.databaseIdentity.audit.databaseName !== undefined) {
      logger.log(
        `  Audit database name:         ${env.databaseIdentity.audit.databaseName}`,
      );
    }
    logger.log('  (Raw DATABASE_URL and AUDIT_DATABASE_URL are NOT printed.)');
  } finally {
    await prisma.$disconnect();
  }
}

// ---------------------------------------------------------------------------
// Entry-point guard
// ---------------------------------------------------------------------------

// The seed's `main()` is invoked ONLY when this file is the Node.js
// entry point. When the file is imported by a unit test (e.g.
// `role-preview-seed-dev.spec.ts`), `main()` is NOT invoked; the
// test imports `readSeedEnv` and `RolePreviewSeedEnvError` directly.
//
// The guard checks whether `process.argv[1]` (the entry-point
// script path) ends with this file's name. When the seed is run as
// `pnpm exec tsx src/scripts/role-preview-seed-dev.ts`,
// `process.argv[1]` is the path to this script and the guard
// invokes `main()`. When the file is imported by a test,
// `process.argv[1]` is the test runner binary and the guard skips
// `main()`.
//
// This pattern avoids `import.meta.url`, which is not allowed in
// files that compile to CommonJS output (the api package does not
// declare `"type": "module"`).
const SCRIPT_FILENAME = 'role-preview-seed-dev.ts';
const isMainModule =
  process.argv[1] !== undefined && process.argv[1].endsWith(SCRIPT_FILENAME);

if (isMainModule) {
  void main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Seed failed:', message);
    process.exit(1);
  });
}
