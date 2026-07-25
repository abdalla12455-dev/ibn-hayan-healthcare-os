import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { execFileSync } from 'node:child_process';
import { Logger } from '@nestjs/common';
import {
  PREVIEW_IDENTITY_CATALOGUE,
  PREVIEW_IDENTITY_PASSWORD,
  PREVIEW_TENANT_SLUG,
  PREVIEW_TENANT_DISPLAY_NAME,
  PREVIEW_ORGANISATION_CODE,
  PREVIEW_ORGANISATION_DISPLAY_NAME,
  PREVIEW_FACILITY_CODE,
  PREVIEW_FACILITY_DISPLAY_NAME,
} from '../modules/dev/role-preview/preview-identity-catalogue.js';

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
 * Read and validate the seed environment. Throws if any required
 * variable is missing or if the command is invoked in production
 * or without the explicit allow flag.
 */
function readSeedEnv(): {
  readonly databaseUrl: string;
} {
  const nodeEnv = process.env['NODE_ENV'];
  if (nodeEnv === 'production') {
    throw new Error(
      'role-preview:seed refuses to run when NODE_ENV=production. ' +
        'This command is development-only and must never be used in ' +
        'a production environment.',
    );
  }

  const allowSeed = process.env['ALLOW_ROLE_PREVIEW_SEED'] ?? '';
  if (allowSeed !== 'true') {
    throw new Error(
      'role-preview:seed requires ALLOW_ROLE_PREVIEW_SEED=true to be ' +
        'set explicitly. This is a defence-in-depth measure to prevent ' +
        'accidental execution.',
    );
  }

  const featureFlag = process.env['IBN_HAYAN_ROLE_PREVIEW_ENABLED'] ?? '';
  if (featureFlag !== 'true') {
    throw new Error(
      'role-preview:seed requires IBN_HAYAN_ROLE_PREVIEW_ENABLED=true. ' +
        'The seed creates preview-only identities and must not run ' +
        'when the feature is disabled.',
    );
  }

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      'DATABASE_URL is not set. The seed requires a running PostgreSQL ' +
        'database with the migrations applied.',
    );
  }

  // Defence-in-depth: refuse to seed a database whose URL does not
  // contain the substring 'role_preview' or 'preview_role'. This
  // prevents the seed from accidentally running against a production
  // database whose URL happens to be set in the environment.
  const lower = databaseUrl.toLowerCase();
  if (!lower.includes('role_preview') && !lower.includes('preview_role')) {
    throw new Error(
      'DATABASE_URL must contain the substring "role_preview" or ' +
        '"preview_role". The seed refuses to run against a database ' +
        'whose URL does not identify it as the isolated preview ' +
        'database. This is a defence-in-depth measure to prevent ' +
        'accidental seeding of a production database.',
    );
  }

  return { databaseUrl };
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
    //    is NEVER printed, NEVER logged, and NEVER returned in any
    //    API response.
    const passwordHash = await argon2.hash(PREVIEW_IDENTITY_PASSWORD, {
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
    logger.log('  (Password is NOT printed.)');
    logger.log(
      `  No business-domain data (patients, appointments, invoices, etc.) was created.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Seed failed:', message);
  process.exit(1);
});
