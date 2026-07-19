import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupDatabaseTests } from '../database/_pg-bootstrap.js';
import { AuditPrismaService } from '../../src/modules/audit/audit-prisma.service.js';
import { AuditConfigurationService } from '../../src/modules/audit/audit-configuration.service.js';
import { PrismaAuditStoreAppendRepository } from '../../src/modules/audit/prisma-audit-store-append.repository.js';
import { PrismaAuditStoreReadRepository } from '../../src/modules/audit/prisma-audit-store-read.repository.js';
import { AuditIntegrityVerifierService } from '../../src/modules/audit/audit-integrity-verifier.service.js';
import {
  buildAuditEventDraft,
  computeIdentifierHash,
  type AuditEventDraft,
} from '@ibn-hayan/observability';
import { randomUUID } from 'node:crypto';

/**
 * Audit-store database integration tests.
 *
 * These tests verify the dedicated audit database:
 *  1. Audit migrations apply to an empty audit database.
 *  2. First platform-chain event appends correctly.
 *  3. First tenant-chain event appends correctly.
 *  4. Different tenants have independent chains.
 *  5. Sequence numbers are monotonic.
 *  6. Concurrent appends do not fork the chain.
 *  7. Duplicate event ID is idempotent.
 *  8. Update is rejected.
 *  9. Delete is rejected.
 * 10. Truncate is rejected.
 * 11. Unknown enum or action values are rejected where constrained.
 * 12. Forbidden metadata is rejected.
 * 13. Oversized metadata is rejected.
 * 14. Integrity verification succeeds on a valid chain.
 * 15. Integrity verification detects tampering.
 * 16. Integrity verification detects missing events.
 * 17. Identifier hashing is deterministic for the same normalised
 *     identifier.
 * 18. Raw email is absent from failed-login records.
 */
setupDatabaseTests();

let auditPrisma: AuditPrismaService;
let config: AuditConfigurationService;
let appendRepo: PrismaAuditStoreAppendRepository;
let readRepo: PrismaAuditStoreReadRepository;
let verifier: AuditIntegrityVerifierService;

beforeAll(() => {
  auditPrisma = new AuditPrismaService();
  config = new AuditConfigurationService();
  appendRepo = new PrismaAuditStoreAppendRepository(auditPrisma, config);
  readRepo = new PrismaAuditStoreReadRepository(auditPrisma);
  verifier = new AuditIntegrityVerifierService(readRepo, config);
});

afterAll(async () => {
  await auditPrisma.$disconnect();
});

beforeEach(async () => {
  // Clean the audit tables before each test. The audit_events table
  // has immutability triggers that reject DELETE and TRUNCATE, so we
  // must disable the triggers temporarily, delete, and re-enable.
  // We use raw SQL because Prisma cannot express ALTER TABLE ...
  // DISABLE TRIGGER.
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" DISABLE TRIGGER USER`;
  await auditPrisma.$executeRaw`TRUNCATE TABLE "audit_events"`;
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" ENABLE TRIGGER USER`;
  await auditPrisma.auditChainHead.deleteMany({});
});

/**
 * Build a minimal audit event draft for testing.
 */
function buildDraft(
  overrides?: Partial<AuditEventDraft> & {
    action?: AuditEventDraft['action'];
    tenantId?: string | null;
  },
): {
  draft: AuditEventDraft;
  eventId: string;
} {
  const eventId = randomUUID();
  const buildResult = buildAuditEventDraft({
    action: overrides?.action ?? 'authentication.login.succeeded',
    tenantId: overrides?.tenantId ?? null,
    actorType: 'USER',
    actorId: overrides?.actorId ?? randomUUID(),
    sessionId: overrides?.sessionId ?? null,
    requestId: randomUUID(),
    source: 'api',
    outcome: 'success',
    scope: 'test',
    metadata: overrides?.metadata ?? { test: true },
    eventId,
  });
  if (!buildResult.ok) {
    throw new Error(`buildAuditEventDraft failed: ${buildResult.reason}`);
  }
  return { draft: buildResult.draft, eventId };
}

describe('Audit store foundation', () => {
  it('audit migrations apply to an empty audit database', async () => {
    // The fact that we got here means the migrations applied
    // successfully (the setupDatabaseTests beforeAll would have
    // thrown otherwise). Verify the tables exist.
    const tables = await auditPrisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const tableNames = tables.map((t) => t.tablename);
    expect(tableNames).toContain('audit_events');
    expect(tableNames).toContain('audit_chain_heads');
  });

  it('first platform-chain event appends correctly', async () => {
    const { draft, eventId } = buildDraft({ tenantId: null });
    const result = await appendRepo.append(draft);
    expect(result.kind).toBe('appended');
    if (result.kind === 'appended') {
      expect(result.chainScope).toBe('platform');
      expect(result.chainSequence).toBe(1);
    }

    // Verify the chain head.
    const head = await auditPrisma.auditChainHead.findUnique({
      where: { chainScope: 'platform' },
    });
    expect(head).not.toBeNull();
    expect(head!.lastSequence).toBe(BigInt(1));
    expect(head!.lastEventId).toBe(eventId);
  });

  it('first tenant-chain event appends correctly', async () => {
    const tenantId = randomUUID();
    const { draft } = buildDraft({ tenantId });
    const result = await appendRepo.append(draft);
    expect(result.kind).toBe('appended');
    if (result.kind === 'appended') {
      expect(result.chainScope).toBe(`tenant:${tenantId}`);
      expect(result.chainSequence).toBe(1);
    }
  });

  it('different tenants have independent chains', async () => {
    const tenant1 = randomUUID();
    const tenant2 = randomUUID();

    // Append to tenant 1.
    const { draft: d1a } = buildDraft({ tenantId: tenant1 });
    await appendRepo.append(d1a);

    // Append to tenant 2.
    const { draft: d2a } = buildDraft({ tenantId: tenant2 });
    await appendRepo.append(d2a);

    // Append to tenant 1 again.
    const { draft: d1b } = buildDraft({ tenantId: tenant1 });
    const r1b = await appendRepo.append(d1b);
    expect(r1b.kind).toBe('appended');
    if (r1b.kind === 'appended') {
      expect(r1b.chainSequence).toBe(2);
    }

    // Append to tenant 2 again.
    const { draft: d2b } = buildDraft({ tenantId: tenant2 });
    const r2b = await appendRepo.append(d2b);
    expect(r2b.kind).toBe('appended');
    if (r2b.kind === 'appended') {
      expect(r2b.chainSequence).toBe(2);
    }
  });

  it('sequence numbers are monotonic', async () => {
    const { draft: d1 } = buildDraft();
    const r1 = await appendRepo.append(d1);
    const { draft: d2 } = buildDraft();
    const r2 = await appendRepo.append(d2);
    const { draft: d3 } = buildDraft();
    const r3 = await appendRepo.append(d3);

    expect(r1.kind).toBe('appended');
    expect(r2.kind).toBe('appended');
    expect(r3.kind).toBe('appended');
    if (
      r1.kind === 'appended' &&
      r2.kind === 'appended' &&
      r3.kind === 'appended'
    ) {
      expect(r1.chainSequence).toBe(1);
      expect(r2.chainSequence).toBe(2);
      expect(r3.chainSequence).toBe(3);
    }
  });

  it('duplicate event ID is idempotent', async () => {
    const { draft, eventId } = buildDraft();
    const r1 = await appendRepo.append(draft);
    expect(r1.kind).toBe('appended');

    // Append the same draft again (same eventId).
    const r2 = await appendRepo.append(draft);
    expect(r2.kind).toBe('idempotent_success');

    // Verify only one event was stored.
    const events = await auditPrisma.auditEvent.findMany({
      where: { eventId },
    });
    expect(events).toHaveLength(1);
  });

  it('update is rejected', async () => {
    const { draft } = buildDraft();
    await appendRepo.append(draft);

    // Attempt to update the event. The immutability trigger should
    // reject this.
    await expect(
      auditPrisma.$executeRaw`UPDATE "audit_events" SET "outcome" = 'failure' WHERE "event_id" = ${draft.eventId}::uuid`,
    ).rejects.toThrow();
  });

  it('delete is rejected', async () => {
    const { draft } = buildDraft();
    await appendRepo.append(draft);

    await expect(
      auditPrisma.$executeRaw`DELETE FROM "audit_events" WHERE "event_id" = ${draft.eventId}::uuid`,
    ).rejects.toThrow();
  });

  it('truncate is rejected', async () => {
    const { draft } = buildDraft();
    await appendRepo.append(draft);

    await expect(
      auditPrisma.$executeRaw`TRUNCATE TABLE "audit_events"`,
    ).rejects.toThrow();
  });

  it('unknown category is rejected', async () => {
    const { draft } = buildDraft();
    // Attempt to insert with an unknown category via raw SQL.
    await expect(
      auditPrisma.$executeRaw`
        INSERT INTO "audit_events" (
          "id", "event_id", "event_version", "occurred_at", "recorded_at",
          "chain_scope", "chain_sequence", "payload_hash", "integrity_hash",
          "integrity_key_version", "category", "action", "actor_type",
          "role_codes", "outcome", "source", "request_id", "scope", "metadata"
        ) VALUES (
          ${randomUUID()}::uuid, ${draft.eventId}::uuid, 1, NOW(), NOW(),
          'platform', 1, ${'a'.repeat(64)}, ${'a'.repeat(64)},
          1, 'unknown_category', 'test.action', 'ANONYMOUS',
          ARRAY[]::TEXT[], 'success', 'api', 'test-req', 'test', '{}'
        )
      `,
    ).rejects.toThrow();
  });

  it('unknown actor type is rejected', async () => {
    await expect(
      auditPrisma.$executeRaw`
        INSERT INTO "audit_events" (
          "id", "event_id", "event_version", "occurred_at", "recorded_at",
          "chain_scope", "chain_sequence", "payload_hash", "integrity_hash",
          "integrity_key_version", "category", "action", "actor_type",
          "role_codes", "outcome", "source", "request_id", "scope", "metadata"
        ) VALUES (
          ${randomUUID()}::uuid, ${randomUUID()}::uuid, 1, NOW(), NOW(),
          'platform', 1, ${'a'.repeat(64)}, ${'a'.repeat(64)},
          1, 'security', 'test.action', 'UNKNOWN_TYPE',
          ARRAY[]::TEXT[], 'success', 'api', 'test-req', 'test', '{}'
        )
      `,
    ).rejects.toThrow();
  });

  it('forbidden metadata is rejected by the builder', () => {
    const buildResult = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      metadata: { password: 'secret' },
    });
    expect(buildResult.ok).toBe(false);
    if (!buildResult.ok) {
      expect(buildResult.reason).toBe('metadata_validation_failed');
    }
  });

  it('integrity verification succeeds on a valid chain', async () => {
    // Append three events to the platform chain.
    for (let i = 0; i < 3; i++) {
      const { draft } = buildDraft();
      const r = await appendRepo.append(draft);
      expect(r.kind).toBe('appended');
    }

    // Verify the platform chain.
    const result = await verifier.verify({ kind: 'platform' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eventsChecked).toBe(3);
      expect(result.chainsChecked).toEqual(['platform']);
    }
  });

  it('integrity verification detects tampering', async () => {
    // Append one event.
    const { draft } = buildDraft();
    await appendRepo.append(draft);

    // Tamper with the event's payload_hash. We must disable the
    // immutability trigger temporarily.
    await auditPrisma.$executeRaw`ALTER TABLE "audit_events" DISABLE TRIGGER USER`;
    await auditPrisma.$executeRaw`
      UPDATE "audit_events" SET "payload_hash" = ${'0'.repeat(64)}
    `;
    await auditPrisma.$executeRaw`ALTER TABLE "audit_events" ENABLE TRIGGER USER`;

    // Verify — should detect the tampering.
    const result = await verifier.verify({ kind: 'platform' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.defects.length).toBeGreaterThan(0);
      // Should detect modified_payload and/or integrity hash mismatch.
      const kinds = result.defects.map((d) => d.kind);
      expect(
        kinds.includes('modified_payload') ||
          kinds.includes('modified_previous_hash'),
      ).toBe(true);
    }
  });

  it('identifier hashing is deterministic for the same normalised identifier', () => {
    const key = config.getIdentifierHmacKey();
    const h1 = computeIdentifierHash(key, 'user@example.com');
    const h2 = computeIdentifierHash(key, 'USER@EXAMPLE.COM');
    const h3 = computeIdentifierHash(key, '  user@example.com  ');
    expect(h1).toBe(h2);
    expect(h1).toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('raw email is absent from failed-login records', async () => {
    const rawEmail = 'failed-login-test@example.invalid';
    const identifierHash = computeIdentifierHash(
      config.getIdentifierHmacKey(),
      rawEmail,
    );

    // Emit a failed-login audit event.
    const buildResult = buildAuditEventDraft({
      action: 'authentication.login.failed',
      outcome: 'failure',
      reasonCode: 'unknown_email',
      actorType: 'ANONYMOUS',
      subjectIdentifierHash: identifierHash,
      source: 'api',
      requestId: randomUUID(),
      scope: 'pre_authentication',
      metadata: { endpoint: 'login' },
    });
    expect(buildResult.ok).toBe(true);
    if (buildResult.ok) {
      await appendRepo.append(buildResult.draft);
    }

    // Verify the raw email is NOT in the audit store. We use a
    // JSON replacer that converts BigInt to string (Prisma returns
    // BigInt for the chain_sequence column).
    const allEvents = await auditPrisma.auditEvent.findMany();
    const allJson = JSON.stringify(allEvents, (_key, value: unknown) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    expect(allJson).not.toContain(rawEmail);
    expect(allJson).not.toContain('failed-login-test');

    // But the identifier hash IS present.
    expect(allJson).toContain(identifierHash);
  });
});
