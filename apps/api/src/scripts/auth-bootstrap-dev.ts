import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { buildAuditEventDraft } from '@ibn-hayan/observability';

/**
 * Development-only bootstrap command.
 *
 * Creates or updates a development user with explicit, environment-
 * supplied credentials. The command is intentionally NOT registered
 * as a NestJS provider or module in the main application; it is a
 * standalone CLI entry point invoked via:
 *
 *   pnpm --filter @ibn-hayan/api auth:bootstrap-dev
 *
 * Per the fourth canonical batch specification:
 * - Refuses to run when `NODE_ENV=production`.
 * - Refuses without the explicit `ALLOW_DEV_AUTH_BOOTSTRAP=true` flag.
 * - Refuses missing values (email, password, display name, tenant
 *   slug, tenant display name).
 * - Does NOT provide default credentials.
 * - Does NOT print the password.
 * - Creates the Tenant only if it does not exist.
 * - Creates or updates the development User safely.
 * - Hashes the password with Argon2id.
 * - Creates an active TenantMembership if absent.
 * - Is idempotent.
 * - Prints only non-secret identifiers and a success message.
 * - Does NOT create organisations or facilities.
 * - Does NOT run automatically during install, build, migration, or
 *   startup.
 *
 * Per the eighth canonical batch specification:
 * - Explicitly assigns R13 System Administrator to the development
 *   TenantMembership. The RBAC migration that introduced
 *   `tenant_role_assignments` did NOT insert any rows; existing
 *   memberships remain without permissions after migration
 *   (fail-closed posture). The bootstrap is responsible for
 *   explicitly assigning roles.
 * - Never relies on an implicit database default role.
 * - Never creates production credentials.
 * - Prints no password, token, session secret, or sensitive
 *   environment value.
 *
 * Usage:
 *   ALLOW_DEV_AUTH_BOOTSTRAP=true \
 *   DEV_AUTH_EMAIL=... \
 *   DEV_AUTH_PASSWORD=... \
 *   DEV_AUTH_DISPLAY_NAME=... \
 *   DEV_AUTH_TENANT_SLUG=... \
 *   DEV_AUTH_TENANT_DISPLAY_NAME=... \
 *   pnpm --filter @ibn-hayan/api auth:bootstrap-dev
 *
 * Implementation note: this script uses the generated Prisma client
 * directly (not through NestJS DI) because the Prisma 7 generated
 * client uses ESM internals that are incompatible with tsx's CommonJS
 * transformation when loaded through NestJS's DI container. Using
 * the client directly avoids the issue and keeps the bootstrap
 * script simple — it only needs to create a few rows, not run the
 * full auth pipeline.
 */

// Import the generated Prisma client. The `.js` extension is required
// by the api's `module: nodenext` tsconfig; tsx resolves it to the
// `.ts` source via its ESM loader.
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Required environment variables for the bootstrap command.
 */
interface BootstrapEnv {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly tenantSlug: string;
  readonly tenantDisplayName: string;
}

/**
 * Minimum password length: 12 characters (per ADR-013 §1.1).
 */
const PASSWORD_MIN_LENGTH = 12;

/**
 * Maximum accepted password length: 128 characters (per ADR-013 §1.1).
 */
const PASSWORD_MAX_LENGTH = 128;

/**
 * Read and validate the bootstrap environment variables. Throws if
 * any required variable is missing or if the command is invoked in
 * production or without the explicit allow flag.
 */
function readBootstrapEnv(): BootstrapEnv {
  const nodeEnv = process.env['NODE_ENV'];
  if (nodeEnv === 'production') {
    throw new Error(
      'auth:bootstrap-dev refuses to run when NODE_ENV=production. ' +
        'This command is development-only and must never be used in ' +
        'a production environment.',
    );
  }

  const allowBootstrap = process.env['ALLOW_DEV_AUTH_BOOTSTRAP'] ?? '';
  if (allowBootstrap !== 'true') {
    throw new Error(
      'auth:bootstrap-dev requires ALLOW_DEV_AUTH_BOOTSTRAP=true to be ' +
        'set explicitly. This is a defence-in-depth measure to prevent ' +
        'accidental execution. The command does NOT provide default ' +
        'credentials; it creates or updates a development user with ' +
        'the credentials supplied via DEV_AUTH_* environment variables.',
    );
  }

  const env: BootstrapEnv = {
    email: process.env['DEV_AUTH_EMAIL'] ?? '',
    password: process.env['DEV_AUTH_PASSWORD'] ?? '',
    displayName: process.env['DEV_AUTH_DISPLAY_NAME'] ?? '',
    tenantSlug: process.env['DEV_AUTH_TENANT_SLUG'] ?? '',
    tenantDisplayName: process.env['DEV_AUTH_TENANT_DISPLAY_NAME'] ?? '',
  };

  const missing: string[] = [];
  if (env.email.length === 0) missing.push('DEV_AUTH_EMAIL');
  if (env.password.length === 0) missing.push('DEV_AUTH_PASSWORD');
  if (env.displayName.length === 0) missing.push('DEV_AUTH_DISPLAY_NAME');
  if (env.tenantSlug.length === 0) missing.push('DEV_AUTH_TENANT_SLUG');
  if (env.tenantDisplayName.length === 0)
    missing.push('DEV_AUTH_TENANT_DISPLAY_NAME');
  if (missing.length > 0) {
    throw new Error(
      'auth:bootstrap-dev requires the following environment variables ' +
        'to be set and non-empty: ' +
        missing.join(', ') +
        '. The command does NOT provide default credentials.',
    );
  }

  if (env.password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `DEV_AUTH_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    );
  }
  if (env.password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(
      `DEV_AUTH_PASSWORD must be at most ${PASSWORD_MAX_LENGTH} characters long.`,
    );
  }

  return env;
}

/**
 * Apply migrations before any bootstrap work.
 */
function applyMigrations(apiDir: string): void {
  const logger = new Logger('auth:bootstrap-dev');
  logger.log('Applying migrations...');
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    stdio: 'inherit',
  });
}

/**
 * Main entry point for the bootstrap command.
 */
async function main(): Promise<void> {
  const env = readBootstrapEnv();
  const apiDir = process.cwd();
  const logger = new Logger('auth:bootstrap-dev');

  applyMigrations(apiDir);

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      'DATABASE_URL is not set. The bootstrap command requires a ' +
        'running PostgreSQL database with the migrations applied.',
    );
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const normalisedEmail = env.email.trim().toLowerCase();
    const now = new Date();

    // 1. Create the Tenant if it does not exist.
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: env.tenantSlug },
    });
    const tenant =
      existingTenant === null
        ? await prisma.tenant.create({
            data: {
              slug: env.tenantSlug,
              displayName: env.tenantDisplayName,
            },
          })
        : existingTenant;
    if (existingTenant === null) {
      logger.log(`Created tenant: id=${tenant.id} slug=${tenant.slug}`);
    } else {
      logger.log(`Tenant already exists: id=${tenant.id} slug=${tenant.slug}`);
    }

    // 2. Create or update the development User.
    const existingUser = await prisma.user.findUnique({
      where: { normalisedEmail },
    });
    const user =
      existingUser === null
        ? await prisma.user.create({
            data: {
              email: env.email,
              normalisedEmail,
              displayName: env.displayName,
            },
          })
        : existingUser;
    if (existingUser === null) {
      logger.log(`Created user: id=${user.id} email=${user.email}`);
    } else {
      logger.log(`User already exists: id=${user.id} email=${user.email}`);
    }

    // 3. Hash the password with Argon2id and create or update the
    //    credential.
    const passwordHash = await argon2.hash(env.password, {
      type: argon2.argon2id,
    });
    const credentialExists = await prisma.localCredential.findUnique({
      where: { userId: user.id },
    });
    if (credentialExists !== null) {
      await prisma.localCredential.update({
        where: { userId: user.id },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      });
      logger.log(`Updated credential for user ${user.id}.`);
    } else {
      await prisma.localCredential.create({
        data: {
          userId: user.id,
          passwordHash,
          passwordChangedAt: now,
        },
      });
      logger.log(`Created credential for user ${user.id}.`);
    }

    // 4. Create an active TenantMembership if absent.
    const existingMembership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    });
    let membershipId: string;
    if (existingMembership === null) {
      const membership = await prisma.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });
      membershipId = membership.id;
      logger.log(
        `Created tenant membership: id=${membership.id} tenantId=${membership.tenantId} userId=${membership.userId}`,
      );
    } else {
      membershipId = existingMembership.id;
      logger.log(
        `Tenant membership already exists: id=${existingMembership.id}`,
      );
    }

    // 5. Explicitly assign R13 System Administrator to the
    //    development membership. Per the eighth canonical batch
    //    specification, the migration that introduced
    //    `tenant_role_assignments` did NOT insert any rows; existing
    //    memberships remain without permissions after migration
    //    (fail-closed posture). The bootstrap is responsible for
    //    explicitly assigning roles to the development membership.
    //
    //    R13 System Administrator is the canonical platform role
    //    for tenant configuration, integration management, and
    //    operational administration (per PRODUCT_BIBLE.md Section
    //    20.2). It grants the three current context permissions
    //    (context:view, context:select, context:clear) per the
    //    role-permission matrix.
    //
    //    The assignment is idempotent: if the assignment already
    //    exists, the bootstrap does not duplicate it. The unique
    //    constraint on (tenant_membership_id, role_code) is the
    //    structural enforcement.
    const existingAssignment = await prisma.tenantRoleAssignment.findUnique({
      where: {
        tenantMembershipId_roleCode: {
          tenantMembershipId: membershipId,
          roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        },
      },
    });
    if (existingAssignment === null) {
      // Per the ninth canonical batch specification, audit the R13
      // role assignment when the development bootstrap creates the
      // role assignment and audit configuration is available. The
      // audit emission is atomic with the role-assignment insert:
      // both are in the same transaction. If the audit outbox
      // insert fails, the role-assignment insert is rolled back
      // (fail-closed). The audit event is emitted to the
      // transactional outbox; the dispatcher will deliver it to the
      // audit store asynchronously.
      const auditEventId = randomUUID();
      const auditDraft = buildAuditEventDraft({
        action: 'rbac.role.assigned',
        outcome: 'success',
        source: 'bootstrap',
        tenantId: tenant.id,
        actorType: 'SYSTEM',
        eventId: auditEventId,
        resourceType: 'tenant_membership',
        resourceId: membershipId,
        roleCodes: ['R13_SYSTEM_ADMINISTRATOR'],
        reasonCode: 'dev_bootstrap',
        requestId: randomUUID(),
        scope: 'rbac',
        metadata: { roleCode: 'R13_SYSTEM_ADMINISTRATOR' },
      });
      if (auditDraft.ok) {
        await prisma.$transaction(async (tx) => {
          await tx.tenantRoleAssignment.create({
            data: {
              tenantMembershipId: membershipId,
              roleCode: 'R13_SYSTEM_ADMINISTRATOR',
            },
          });
          await tx.auditOutboxEvent.create({
            data: {
              eventId: auditEventId,
              eventVersion: auditDraft.draft.eventVersion,
              canonicalEventDraft: auditDraft.draft as never,
              createdAt: new Date(auditDraft.draft.occurredAt),
            },
          });
        });
        logger.log(
          `Assigned role R13_SYSTEM_ADMINISTRATOR to membership ${membershipId} (audit event ${auditEventId}).`,
        );
      } else {
        // If the audit draft build fails, fall back to the
        // non-audited assignment. The role assignment is still
        // created; the audit event is not. This is a best-effort
        // fallback for the development bootstrap only.
        logger.warn(
          `Audit draft build failed (${auditDraft.reason}); creating role assignment without audit event.`,
        );
        await prisma.tenantRoleAssignment.create({
          data: {
            tenantMembershipId: membershipId,
            roleCode: 'R13_SYSTEM_ADMINISTRATOR',
          },
        });
        logger.log(
          `Assigned role R13_SYSTEM_ADMINISTRATOR to membership ${membershipId}.`,
        );
      }
    } else {
      logger.log(
        `Role R13_SYSTEM_ADMINISTRATOR already assigned to membership ${membershipId}.`,
      );
    }

    logger.log('');
    logger.log('Bootstrap complete.');
    logger.log(`  Tenant: ${tenant.slug} (${tenant.id})`);
    logger.log(`  User:   ${user.email} (${user.id})`);
    logger.log(`  Role:   R13_SYSTEM_ADMINISTRATOR`);
    logger.log('  (Password is NOT printed.)');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Bootstrap failed:', message);
  process.exit(1);
});
