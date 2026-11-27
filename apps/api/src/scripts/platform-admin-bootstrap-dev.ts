import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { buildAuditEventDraft } from '@ibn-hayan/observability';
import argon2 from 'argon2';
import pg from 'pg';

import {
  validatePlatformBootstrapEnvironment,
  PlatformBootstrapPolicyError,
} from '../modules/platform-admin/platform-admin-bootstrap-policy.js';

/**
 * First-account bootstrap for isolated local development only.
 *
 * Creates exactly:
 * - One active platform-scoped User
 * - One Argon2id LocalCredential
 * - One independent PlatformAdministrator grant
 * - One platform-scoped audit outbox event
 *
 * These four writes commit or roll back as one transaction.
 *
 * No Tenant, TenantMembership or tenant role is created.
 * No existing credential or grant is changed.
 * No migrations are executed.
 */

async function main(): Promise<void> {
  const config = validatePlatformBootstrapEnvironment(process.env);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: config.databaseUrl,
    }),
  });

  const auditClient = new pg.Client({
    connectionString: config.auditDatabaseUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    const appIdentity = await prisma.$queryRaw<
      Array<{ database_name: string }>
    >`SELECT current_database() AS database_name`;

    if (appIdentity[0]?.database_name !== 'ibn_hayan_app_dev') {
      throw new PlatformBootstrapPolicyError(
        'APPLICATION_DATABASE_IDENTITY_MISMATCH',
      );
    }

    await auditClient.connect();

    const auditIdentity = await auditClient.query<{
      database_name: string;
    }>('SELECT current_database() AS database_name');

    if (auditIdentity.rows[0]?.database_name !== 'ibn_hayan_audit_dev') {
      throw new PlatformBootstrapPolicyError(
        'AUDIT_DATABASE_IDENTITY_MISMATCH',
      );
    }

    const auditHistory = await auditClient.query<{
      events: number;
      heads: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::integer
         FROM public.audit_events) AS events,
        (SELECT COUNT(*)::integer
         FROM public.audit_chain_heads) AS heads
    `);

    if (
      auditHistory.rows[0]?.events !== 0 ||
      auditHistory.rows[0]?.heads !== 0
    ) {
      throw new PlatformBootstrapPolicyError(
        'EXISTING_AUDIT_HISTORY_REQUIRES_REVIEW',
      );
    }

    const passwordHash = await argon2.hash(config.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.$transaction(async (tx) => {
      // Serialize concurrent executions of THIS bootstrap.
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(1705, 1449)::text AS lock_result
      `;

      const [users, tenants, grants, credentials, outbox] = await Promise.all([
        tx.user.count(),
        tx.tenant.count(),
        tx.platformAdministrator.count(),
        tx.localCredential.count(),
        tx.auditOutboxEvent.count(),
      ]);

      if (
        users !== 0 ||
        tenants !== 0 ||
        grants !== 0 ||
        credentials !== 0 ||
        outbox !== 0
      ) {
        throw new PlatformBootstrapPolicyError(
          'DATABASE_NOT_EMPTY_BOOTSTRAP_REFUSED',
        );
      }

      const user = await tx.user.create({
        data: {
          email: config.email,
          normalisedEmail: config.email,
          displayName: config.displayName,
          status: 'active',
        },
      });

      await tx.localCredential.create({
        data: {
          userId: user.id,
          passwordHash,
          passwordChangedAt: new Date(),
        },
      });

      await tx.platformAdministrator.create({
        data: {
          userId: user.id,
        },
      });

      const event = buildAuditEventDraft({
        action: 'rbac.platform_administrator.granted',
        outcome: 'success',
        source: 'bootstrap',
        tenantId: null,
        actorType: 'SYSTEM',
        resourceType: 'platform_administrator',
        resourceId: user.id,
        scope: 'platform',
        reasonCode: 'initial_local_development_bootstrap',
        metadata: {
          operation: 'platform_admin_bootstrap_dev',
        },
      });

      if (!event.ok) {
        throw new PlatformBootstrapPolicyError('AUDIT_EVENT_VALIDATION_FAILED');
      }

      await tx.auditOutboxEvent.create({
        data: {
          eventId: event.draft.eventId,
          eventVersion: event.draft.eventVersion,
          canonicalEventDraft: event.draft as never,
          createdAt: new Date(event.draft.occurredAt),
        },
      });
    });

    console.log('BOOTSTRAP=SUCCESS');
    console.log('PLATFORM_ADMIN_USER=CREATED');
    console.log('INDEPENDENT_PLATFORM_GRANT=CREATED');
    console.log('TENANT_CREATED=NO');
    console.log('TENANT_ROLE_ASSIGNED=NO');
    console.log('AUDIT_OUTBOX_EVENT=CREATED_ATOMICALLY');
    console.log('PASSWORD_PRINTED=NO');
  } finally {
    await auditClient.end().catch(() => undefined);
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error('BOOTSTRAP=FAILED');

  if (error instanceof PlatformBootstrapPolicyError) {
    console.error(`REASON_CODE=${error.code}`);
  } else {
    // Database exceptions can contain connection information.
    // Do not print the original exception or credential material.
    console.error('REASON_CODE=DATABASE_OR_RUNTIME_FAILURE');
  }

  process.exitCode = 1;
});
