import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  setupDatabaseTests,
  isOwnedCluster,
} from '../database/_pg-bootstrap.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { PrismaAuditOutboxRepository } from '../../src/modules/audit/prisma-audit-outbox.repository.js';
import { AuditPrismaService } from '../../src/modules/audit/audit-prisma.service.js';
import { AuditConfigurationService } from '../../src/modules/audit/audit-configuration.service.js';
import { PrismaAuditStoreAppendRepository } from '../../src/modules/audit/prisma-audit-store-append.repository.js';
import { PrismaAuditStoreReadRepository } from '../../src/modules/audit/prisma-audit-store-read.repository.js';
import { AuditDispatcherService } from '../../src/modules/audit/audit-dispatcher.service.js';
import { AuditIntegrityVerifierService } from '../../src/modules/audit/audit-integrity-verifier.service.js';
import {
  buildAuditEventDraft,
  type AuditEventDraft,
  type AuditStoreAppendPort,
} from '@ibn-hayan/observability';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Audit dispatcher concurrency tests.
 *
 * These tests verify the multi-dispatcher safety properties required
 * by the ninth canonical batch specification:
 *
 *  1. Two dispatchers claim disjoint event sets.
 *  2. Ten concurrent dispatchers process a shared pending set without
 *     duplicate final audit events.
 *  3. A dispatcher crashes after claiming but before delivery.
 *  4. The abandoned lease expires and another dispatcher reclaims it.
 *  5. A stale dispatcher cannot mark an event delivered after its
 *     lease was reassigned.
 *  6. Duplicate delivery attempts create only one immutable audit
 *     event.
 *  7. Every pending event is eventually either delivered or remains
 *     retryable with an explicit failure state.
 *  8. Chain sequence remains continuous and does not fork under
 *     concurrent delivery.
 *
 * These tests use real PostgreSQL 17 (via the disposable cluster
 * bootstrap) and real dispatcher instances (no mocks, no in-memory
 * locks). The dispatchers share the same outbox table and the same
 * audit store; the tests verify that the claiming mechanism
 * (`FOR UPDATE SKIP LOCKED` with atomic lease assignment) prevents
 * double-delivery and lost events.
 */
setupDatabaseTests();

let prisma: PrismaService;
let outbox: PrismaAuditOutboxRepository;
let auditPrisma: AuditPrismaService;
let appendRepo: PrismaAuditStoreAppendRepository;
let readRepo: PrismaAuditStoreReadRepository;
let verifier: AuditIntegrityVerifierService;
let seedPrisma: PrismaClient;

// A short lease duration used by tests that need to verify lease
// expiry and reclamation. The value must be long enough that the
// dispatcher can complete an audit-store append within the lease,
// but short enough that tests do not take too long.
const SHORT_LEASE_MS = 300;

// A normal lease duration used by tests that do not need to verify
// lease expiry.
const NORMAL_LEASE_MS = 5_000;

beforeAll(() => {
  prisma = new PrismaService();
  outbox = new PrismaAuditOutboxRepository(prisma);
  auditPrisma = new AuditPrismaService();
  const config = new AuditConfigurationService();
  appendRepo = new PrismaAuditStoreAppendRepository(auditPrisma, config);
  readRepo = new PrismaAuditStoreReadRepository(auditPrisma);
  verifier = new AuditIntegrityVerifierService(readRepo, config);

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  seedPrisma = new PrismaClient({ adapter });
});

afterAll(async () => {
  await seedPrisma?.$disconnect();
  await prisma?.$disconnect();
  await auditPrisma?.$disconnect();
});

beforeEach(async () => {
  // Clean the outbox and audit tables.
  await seedPrisma.auditOutboxEvent.deleteMany({});
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" DISABLE TRIGGER USER`;
  await auditPrisma.$executeRaw`TRUNCATE TABLE "audit_events"`;
  await auditPrisma.$executeRaw`ALTER TABLE "audit_events" ENABLE TRIGGER USER`;
  await auditPrisma.auditChainHead.deleteMany({});
});

/**
 * Insert N pending outbox events with distinct event IDs.
 *
 * Returns the list of inserted event IDs.
 */
async function insertPendingEvents(
  count: number,
  tenantId: string | null = null,
): Promise<string[]> {
  const eventIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const eventId = randomUUID();
    const buildResult = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      tenantId,
      actorType: 'USER',
      actorId: randomUUID(),
      source: 'api',
      outcome: 'success',
      scope: 'concurrency_test',
      requestId: randomUUID(),
      eventId,
      metadata: { testIndex: i },
    });
    if (!buildResult.ok) {
      throw new Error(`buildAuditEventDraft failed: ${buildResult.reason}`);
    }
    const inserted = await outbox.insert(buildResult.draft);
    if (!inserted) {
      throw new Error(`outbox.insert failed for event ${eventId}`);
    }
    eventIds.push(eventId);
  }
  return eventIds;
}

/**
 * Build a dispatcher instance with its own unique lease owner.
 */
function makeDispatcher(): {
  dispatcher: AuditDispatcherService;
  leaseOwner: string;
} {
  // We construct two dispatchers that share the same outbox and
  // audit-store ports. The dispatcher's constructor generates a
  // unique lease owner for each instance.
  const dispatcher = new AuditDispatcherService(outbox, appendRepo);
  return { dispatcher, leaseOwner: dispatcher.getLeaseOwner() };
}

describe('Audit dispatcher concurrency', () => {
  it('two dispatchers claim disjoint event sets', async () => {
    // Insert 20 pending events.
    const allEventIds = await insertPendingEvents(20);
    expect(allEventIds).toHaveLength(20);

    // Create two dispatchers.
    const { dispatcher: d1 } = makeDispatcher();
    const { dispatcher: d2 } = makeDispatcher();
    expect(d1.getLeaseOwner()).not.toBe(d2.getLeaseOwner());

    // Run both dispatchers concurrently with a small batch size so
    // they have to share the pool of pending events.
    const [s1, s2] = await Promise.all([
      d1.dispatchOnce({ batchSize: 5, leaseDurationMs: NORMAL_LEASE_MS }),
      d2.dispatchOnce({ batchSize: 5, leaseDurationMs: NORMAL_LEASE_MS }),
    ]);

    // Each dispatcher should have claimed 5 events (disjoint sets).
    expect(s1.claimed).toBe(5);
    expect(s2.claimed).toBe(5);
    expect(s1.delivered + s1.idempotent).toBe(5);
    expect(s2.delivered + s2.idempotent).toBe(5);

    // Verify the audit store has exactly 10 events (no duplicates).
    const auditEvents = await auditPrisma.auditEvent.count();
    expect(auditEvents).toBe(10);

    // Verify the outbox has 10 delivered and 10 pending.
    const deliveredCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: { not: null } },
    });
    expect(deliveredCount).toBe(10);
    const pendingCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingCount).toBe(10);
  });

  it('ten concurrent dispatchers process a shared pending set without duplicate final audit events', async () => {
    // Insert 100 pending events.
    await insertPendingEvents(100);

    // Create 10 dispatchers.
    const dispatchers = Array.from({ length: 10 }, () => makeDispatcher());

    // Run all 10 dispatchers concurrently with a batch size of 20.
    // The total batch capacity (10 * 20 = 200) exceeds the pending
    // set (100), so some dispatchers will claim empty batches.
    const summaries = await Promise.all(
      dispatchers.map(({ dispatcher }) =>
        dispatcher.dispatchOnce({
          batchSize: 20,
          leaseDurationMs: NORMAL_LEASE_MS,
        }),
      ),
    );

    // The total claimed across all dispatchers should be exactly 100
    // (each event claimed by exactly one dispatcher).
    const totalClaimed = summaries.reduce((sum, s) => sum + s.claimed, 0);
    expect(totalClaimed).toBe(100);

    // The total delivered should be exactly 100 (no duplicates, no
    // losses).
    const totalDelivered = summaries.reduce(
      (sum, s) => sum + s.delivered + s.idempotent,
      0,
    );
    expect(totalDelivered).toBe(100);

    // The audit store must have exactly 100 events (no duplicates).
    const auditEvents = await auditPrisma.auditEvent.count();
    expect(auditEvents).toBe(100);

    // The outbox must have 100 delivered and 0 pending.
    const deliveredCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: { not: null } },
    });
    expect(deliveredCount).toBe(100);
    const pendingCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingCount).toBe(0);
  });

  it('a dispatcher crashes after claiming but before delivery; the abandoned lease expires and another dispatcher reclaims it', async () => {
    // Insert 5 pending events.
    await insertPendingEvents(5);

    // Create a dispatcher that will "crash" after claiming. We
    // simulate the crash by manually claiming events through the
    // outbox port (which sets the lease) and then NOT calling
    // markDelivered. The lease will expire, and another dispatcher
    // should reclaim the events.
    const crashedLeaseOwner = `crashed-dispatcher-${randomUUID()}`;
    const claimed = await outbox.claimPending(
      5,
      crashedLeaseOwner,
      SHORT_LEASE_MS,
    );
    expect(claimed).toHaveLength(5);

    // At this point, the "crashed" dispatcher has claimed 5 events
    // but has not delivered them. The events are still pending
    // (deliveredAt is null), but their leases are held.
    const pendingAfterCrash = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingAfterCrash).toBe(5);
    const auditEventsAfterCrash = await auditPrisma.auditEvent.count();
    expect(auditEventsAfterCrash).toBe(0);

    // Wait for the lease to expire.
    await new Promise((resolve) => setTimeout(resolve, SHORT_LEASE_MS + 100));

    // Run a second dispatcher. It should release the expired leases
    // and reclaim the events.
    const { dispatcher: recoveryDispatcher } = makeDispatcher();
    const summary = await recoveryDispatcher.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });

    // The recovery dispatcher should have claimed and delivered all
    // 5 events.
    expect(summary.claimed).toBe(5);
    expect(summary.delivered + summary.idempotent).toBe(5);

    // The audit store should have exactly 5 events.
    const auditEventsAfterRecovery = await auditPrisma.auditEvent.count();
    expect(auditEventsAfterRecovery).toBe(5);

    // The outbox should have 5 delivered and 0 pending.
    const deliveredCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: { not: null } },
    });
    expect(deliveredCount).toBe(5);
    const pendingCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: null },
    });
    expect(pendingCount).toBe(0);
  });

  it('a stale dispatcher cannot mark an event delivered after its lease was reassigned', async () => {
    // Insert 1 pending event.
    const eventIds = await insertPendingEvents(1);
    const eventId = eventIds[0]!;
    const outboxRow = await seedPrisma.auditOutboxEvent.findFirst({
      where: { eventId },
    });
    if (!outboxRow) throw new Error('Outbox row not found');

    // Dispatcher A claims the event with a short lease.
    const dispatcherA = `stale-dispatcher-${randomUUID()}`;
    const claimed = await outbox.claimPending(1, dispatcherA, SHORT_LEASE_MS);
    expect(claimed).toHaveLength(1);
    const claimedId = claimed[0]!.id;

    // Wait for the lease to expire.
    await new Promise((resolve) => setTimeout(resolve, SHORT_LEASE_MS + 100));

    // Dispatcher B claims the same event (the expired lease allows
    // re-claiming).
    const dispatcherB = `fresh-dispatcher-${randomUUID()}`;
    const reclaimed = await outbox.claimPending(
      1,
      dispatcherB,
      NORMAL_LEASE_MS,
    );
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0]!.id).toBe(claimedId);

    // Now dispatcher A tries to mark the event delivered. The
    // markDelivered call should FAIL because dispatcher A no longer
    // owns the lease. The call returns false.
    const markedByA = await outbox.markDelivered(claimedId, dispatcherA);
    expect(markedByA).toBe(false);

    // The event should still be pending (not delivered).
    const rowAfterA = await seedPrisma.auditOutboxEvent.findUnique({
      where: { id: claimedId },
    });
    expect(rowAfterA!.deliveredAt).toBeNull();

    // Dispatcher B marks the event delivered. This should succeed.
    const markedByB = await outbox.markDelivered(claimedId, dispatcherB);
    expect(markedByB).toBe(true);

    // The event should now be delivered.
    const rowAfterB = await seedPrisma.auditOutboxEvent.findUnique({
      where: { id: claimedId },
    });
    expect(rowAfterB!.deliveredAt).not.toBeNull();
  });

  it('duplicate delivery attempts create only one immutable audit event', async () => {
    // Insert 1 pending event.
    const eventIds = await insertPendingEvents(1);
    const eventId = eventIds[0]!;

    // Run the dispatcher twice. The first run delivers the event;
    // the second run should claim nothing (the event is already
    // delivered).
    const { dispatcher: d1 } = makeDispatcher();
    const s1 = await d1.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    expect(s1.delivered + s1.idempotent).toBe(1);

    const { dispatcher: d2 } = makeDispatcher();
    const s2 = await d2.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    expect(s2.claimed).toBe(0);
    expect(s2.delivered + s2.idempotent).toBe(0);

    // The audit store must have exactly 1 event.
    const auditEvents = await auditPrisma.auditEvent.count();
    expect(auditEvents).toBe(1);

    // Now simulate a duplicate manual append of the same event ID.
    // The audit store's unique constraint on event_id should reject
    // the duplicate, and the append repository should return
    // `idempotent_success`.
    const draft: AuditEventDraft = {
      ...buildDuplicateDraft(eventId),
    };
    const appendResult = await appendRepo.append(draft);
    expect(appendResult.kind).toBe('idempotent_success');

    // The audit store must STILL have exactly 1 event.
    const auditEventsAfterDup = await auditPrisma.auditEvent.count();
    expect(auditEventsAfterDup).toBe(1);
  });

  /**
   * Helper: build a duplicate draft with the same event ID as an
   * already-delivered event. Used to verify idempotent append.
   */
  function buildDuplicateDraft(eventId: string): AuditEventDraft {
    const buildResult = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      actorType: 'USER',
      actorId: randomUUID(),
      source: 'api',
      outcome: 'success',
      scope: 'concurrency_test',
      requestId: randomUUID(),
      eventId,
      metadata: { duplicate: true },
    });
    if (!buildResult.ok) {
      throw new Error(`buildAuditEventDraft failed: ${buildResult.reason}`);
    }
    return buildResult.draft;
  }

  it('every pending event is eventually either delivered or remains retryable with an explicit failure state', async () => {
    // Insert 10 pending events.
    await insertPendingEvents(10);

    // Run the dispatcher once. All 10 should be delivered on the
    // first attempt (the audit store is healthy).
    const { dispatcher } = makeDispatcher();
    const s1 = await dispatcher.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    expect(s1.delivered + s1.idempotent).toBe(10);

    // All events should be delivered.
    const deliveredCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: { not: null } },
    });
    expect(deliveredCount).toBe(10);

    // No events should have a non-null lastFailureCode.
    const failedCount = await seedPrisma.auditOutboxEvent.count({
      where: { lastFailureCode: { not: null } },
    });
    expect(failedCount).toBe(0);

    // Now insert 5 more events and simulate a transient audit-store
    // failure by appending through a repo whose append always fails.
    // We do this by constructing a fake append port that returns
    // transient_failure for every call.
    await insertPendingEvents(5);

    const failingAppendRepo: AuditStoreAppendPort = {
      append: () =>
        Promise.resolve({
          kind: 'transient_failure' as const,
          failureCode: 'audit_store_unavailable',
        }),
    };
    const failingDispatcher = new AuditDispatcherService(
      outbox,
      failingAppendRepo,
    );
    const s2 = await failingDispatcher.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    // All 5 claimed events should have transient failures.
    expect(s2.claimed).toBe(5);
    expect(s2.transientFailures).toBe(5);

    // The 5 events should still be pending (not delivered), but
    // with a non-null lastFailureCode and an incremented
    // attemptCount.
    const pendingFailed = await seedPrisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null, lastFailureCode: { not: null } },
    });
    expect(pendingFailed).toHaveLength(5);
    for (const row of pendingFailed) {
      expect(row.lastFailureCode).toBe('audit_store_unavailable');
      expect(row.attemptCount).toBe(1);
      // The availableAt should be in the future (backoff).
      expect(row.availableAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('chain sequence remains continuous and does not fork under concurrent delivery', async () => {
    // Insert 50 pending events for the same tenant (so they all
    // append to the same chain).
    const tenantId = randomUUID();
    await insertPendingEvents(50, tenantId);

    // Run 5 concurrent dispatchers.
    const dispatchers = Array.from({ length: 5 }, () => makeDispatcher());
    await Promise.all(
      dispatchers.map(({ dispatcher }) =>
        dispatcher.dispatchOnce({
          batchSize: 20,
          leaseDurationMs: NORMAL_LEASE_MS,
        }),
      ),
    );

    // All 50 events should be delivered.
    const deliveredCount = await seedPrisma.auditOutboxEvent.count({
      where: { deliveredAt: { not: null } },
    });
    expect(deliveredCount).toBe(50);

    // The audit store should have exactly 50 events on the
    // tenant's chain.
    const chainScope = `tenant:${tenantId}`;
    const chainEvents = await auditPrisma.auditEvent.findMany({
      where: { chainScope },
      orderBy: { chainSequence: 'asc' },
    });
    expect(chainEvents).toHaveLength(50);

    // The chain sequence must be 1, 2, 3, ..., 50 with no gaps and
    // no duplicates.
    for (let i = 0; i < 50; i++) {
      expect(Number(chainEvents[i]!.chainSequence)).toBe(i + 1);
    }

    // The previous_integrity_hash of event N must equal the
    // integrity_hash of event N-1. Event 1's
    // previous_integrity_hash must be null.
    expect(chainEvents[0]!.previousIntegrityHash).toBeNull();
    for (let i = 1; i < 50; i++) {
      expect(chainEvents[i]!.previousIntegrityHash).toBe(
        chainEvents[i - 1]!.integrityHash,
      );
    }

    // The integrity verifier must report no defects.
    const result = await verifier.verify({ kind: 'tenant', tenantId });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eventsChecked).toBe(50);
    }
  });

  it('a delivered event is never reclaimed', async () => {
    // Insert 1 pending event.
    const eventIds = await insertPendingEvents(1);
    const eventId = eventIds[0]!;

    // Deliver the event.
    const { dispatcher } = makeDispatcher();
    const s1 = await dispatcher.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    expect(s1.delivered + s1.idempotent).toBe(1);

    // Try to claim pending events again. The delivered event must
    // NOT be re-claimed.
    const { dispatcher: d2 } = makeDispatcher();
    const s2 = await d2.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    expect(s2.claimed).toBe(0);

    // The audit store must still have exactly 1 event.
    const auditEvents = await auditPrisma.auditEvent.count();
    expect(auditEvents).toBe(1);

    // The outbox must have 1 delivered event with a null lease.
    const row = await seedPrisma.auditOutboxEvent.findFirst({
      where: { eventId },
    });
    expect(row).not.toBeNull();
    expect(row!.deliveredAt).not.toBeNull();
    expect(row!.leaseOwner).toBeNull();
    expect(row!.leaseExpiresAt).toBeNull();
  });

  it('one dispatcher cannot mark an event delivered when another dispatcher owns its active lease', async () => {
    // Insert 1 pending event.
    const eventIds = await insertPendingEvents(1);
    const eventId = eventIds[0]!;
    const outboxRow = await seedPrisma.auditOutboxEvent.findFirst({
      where: { eventId },
    });
    if (!outboxRow) throw new Error('Outbox row not found');

    // Dispatcher A claims the event with a long lease.
    const dispatcherA = `lease-holder-${randomUUID()}`;
    const claimed = await outbox.claimPending(1, dispatcherA, NORMAL_LEASE_MS);
    expect(claimed).toHaveLength(1);
    const claimedId = claimed[0]!.id;

    // Dispatcher B tries to mark the event delivered. The
    // markDelivered call should FAIL because dispatcher B does not
    // own the lease.
    const dispatcherB = `lease-stealer-${randomUUID()}`;
    const markedByB = await outbox.markDelivered(claimedId, dispatcherB);
    expect(markedByB).toBe(false);

    // The event should still be pending.
    const rowAfterB = await seedPrisma.auditOutboxEvent.findUnique({
      where: { id: claimedId },
    });
    expect(rowAfterB!.deliveredAt).toBeNull();

    // Dispatcher A (the lease owner) can mark it delivered.
    const markedByA = await outbox.markDelivered(claimedId, dispatcherA);
    expect(markedByA).toBe(true);
  });

  it('failed delivery releases the event through retry or lease expiry', async () => {
    // Insert 1 pending event.
    const eventIds = await insertPendingEvents(1);
    const eventId = eventIds[0]!;

    // Run a dispatcher whose audit-store append always fails. The
    // event should remain pending, with a failure code and an
    // incremented attempt count, but the lease should be CLEARED
    // (so the event is re-claimable after the backoff).
    const failingAppendRepo: AuditStoreAppendPort = {
      append: () =>
        Promise.resolve({
          kind: 'transient_failure' as const,
          failureCode: 'audit_store_unavailable',
        }),
    };
    const failingDispatcher = new AuditDispatcherService(
      outbox,
      failingAppendRepo,
    );
    const s1 = await failingDispatcher.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    expect(s1.transientFailures).toBe(1);

    // The event should be pending with a cleared lease.
    const row = await seedPrisma.auditOutboxEvent.findFirst({
      where: { eventId },
    });
    expect(row).not.toBeNull();
    expect(row!.deliveredAt).toBeNull();
    expect(row!.lastFailureCode).toBe('audit_store_unavailable');
    expect(row!.attemptCount).toBe(1);
    expect(row!.leaseOwner).toBeNull();
    expect(row!.leaseExpiresAt).toBeNull();

    // The availableAt should be in the future (backoff). We can
    // fast-forward by updating availableAt to NOW.
    await seedPrisma.auditOutboxEvent.update({
      where: { id: row!.id },
      data: { availableAt: new Date() },
    });

    // Run a healthy dispatcher. The event should now be delivered.
    const { dispatcher: healthyDispatcher } = makeDispatcher();
    const s2 = await healthyDispatcher.dispatchOnce({
      batchSize: 100,
      leaseDurationMs: NORMAL_LEASE_MS,
    });
    expect(s2.delivered + s2.idempotent).toBe(1);

    // The audit store should have exactly 1 event.
    const auditEvents = await auditPrisma.auditEvent.count();
    expect(auditEvents).toBe(1);
  });

  it('isOwnedCluster reports the disposable cluster is owned (test environment sanity check)', () => {
    // This is a sanity check: the concurrency tests must run on
    // an owned disposable cluster so that the `FOR UPDATE SKIP
    // LOCKED` behaviour is exercised against real PostgreSQL 17.
    expect(isOwnedCluster()).toBe(true);
  });
});
