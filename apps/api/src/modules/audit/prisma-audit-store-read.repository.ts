import { Injectable, Inject } from '@nestjs/common';
import type {
  AuditStoreReadPort,
  AuditVerificationEvent,
} from '@ibn-hayan/observability';
import { AUDIT_STORE_READ_PORT } from '@ibn-hayan/observability';
import { AuditPrismaService } from './audit-prisma.service.js';

/**
 * Prisma-backed implementation of the audit-store read port.
 *
 * The verifier reads audit events from the audit store through this
 * port. The port exposes methods for reading a single chain and for
 * listing all chain scopes.
 *
 * The implementation reads events ordered by `chain_sequence`
 * ascending. The verifier uses this ordering to walk the chain and
 * verify integrity continuity.
 */
@Injectable()
export class PrismaAuditStoreReadRepository implements AuditStoreReadPort {
  constructor(
    @Inject(AuditPrismaService)
    private readonly prisma: AuditPrismaService,
  ) {}

  /**
   * Read all events for a chain, ordered by `chain_sequence`
   * ascending.
   */
  async readChain(
    chainScope: string,
  ): Promise<readonly AuditVerificationEvent[]> {
    // Load the full rows because the verifier needs to recompute the
    // payload hash from the canonical event draft, which requires
    // all the draft's fields.
    const fullRows = await this.prisma.auditEvent.findMany({
      where: { chainScope },
      orderBy: { chainSequence: 'asc' },
    });
    return fullRows.map((row) => ({
      eventId: row.eventId,
      tenantId: row.tenantId,
      chainScope: row.chainScope,
      chainSequence: Number(row.chainSequence),
      previousIntegrityHash: row.previousIntegrityHash,
      payloadHash: row.payloadHash,
      integrityHash: row.integrityHash,
      integrityKeyVersion: row.integrityKeyVersion,
      // Reconstruct the canonical event draft from the stored
      // fields. The verifier recomputes the payload hash from
      // this draft and compares it to the stored payload_hash.
      canonicalEventDraft: {
        eventId: row.eventId,
        eventVersion: row.eventVersion,
        occurredAt: row.occurredAt.toISOString(),
        tenantId: row.tenantId,
        category: row.category,
        action: row.action,
        actorType: row.actorType,
        actorId: row.actorId,
        subjectIdentifierHash: row.subjectIdentifierHash,
        sessionId: row.sessionId,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        permissionCode: row.permissionCode,
        roleCodes: row.roleCodes,
        outcome: row.outcome,
        reasonCode: row.reasonCode,
        source: row.source,
        requestId: row.requestId,
        correlationId: row.correlationId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        scope: row.scope,
        previousState: row.previousState,
        newState: row.newState,
        metadata: row.metadata,
      },
    }));
  }

  /**
   * List all chain scopes in the audit store. Used by the `all`
   * verification scope.
   */
  async listChainScopes(): Promise<readonly string[]> {
    const rows = await this.prisma.auditChainHead.findMany({
      select: { chainScope: true },
      orderBy: { chainScope: 'asc' },
    });
    return rows.map((r) => r.chainScope);
  }
}

/**
 * DI token for the audit-store read port.
 */
export { AUDIT_STORE_READ_PORT };
