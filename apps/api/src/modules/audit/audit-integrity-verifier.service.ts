import { Injectable, Inject } from '@nestjs/common';
import type {
  AuditStoreReadPort,
  AuditVerificationDefect,
  AuditVerificationResult,
  AuditVerificationScope,
  AuditVerificationEvent,
} from '@ibn-hayan/observability';
import {
  AUDIT_STORE_READ_PORT,
  canonicalPayloadHash,
  verifyIntegrityHash,
} from '@ibn-hayan/observability';
import { AuditConfigurationService } from './audit-configuration.service.js';

/**
 * The audit integrity verifier.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * verifier can:
 *
 * - Verify a single tenant chain.
 * - Verify the platform chain.
 * - Verify all chains.
 *
 * The verifier detects:
 * - Modified payload (the stored payload_hash does not match the
 *   recomputed payload_hash).
 * - Modified previous hash (the stored previous_integrity_hash does
 *   not match the integrity_hash of the preceding event).
 * - Invalid sequence (the chain_sequence is not a positive integer).
 * - Missing sequence (the chain has a gap in chain_sequence).
 * - Duplicated sequence (the chain has two events with the same
 *   chain_sequence).
 * - Incorrect key version (the integrity_key_version is not a known
 *   version).
 * - Chain fork (the chain has two events with the same
 *   previous_integrity_hash but different chain_sequences, or two
 *   events with consecutive chain_sequences but different
 *   previous_integrity_hash continuity).
 *
 * The verifier returns a typed result without exposing integrity
 * keys. The verifier does NOT log the integrity key.
 *
 * `audit:verify` exits non-zero when verification fails.
 *
 * Every completed verification should itself produce an audit event
 * when the audit store is healthy. The verifier avoids infinite
 * recursion by not auditing verification-of-verification: the
 * verifier does not emit an audit event for its own audit-store
 * append, only for explicit verifier invocations. (The
 * `audit.integrity.verified` event is emitted by the CLI script
 * after the verifier returns, not by the verifier itself.)
 */
@Injectable()
export class AuditIntegrityVerifierService {
  constructor(
    @Inject(AUDIT_STORE_READ_PORT)
    private readonly auditStore: AuditStoreReadPort,
    @Inject(AuditConfigurationService)
    private readonly config: AuditConfigurationService,
  ) {}

  /**
   * Verify the integrity of one or more chains.
   */
  async verify(
    scope: AuditVerificationScope,
  ): Promise<AuditVerificationResult> {
    // Determine the chain scopes to verify.
    const chainScopes = await this.resolveChainScopes(scope);
    const allDefects: AuditVerificationDefect[] = [];
    let eventsChecked = 0;
    const chainsChecked: string[] = [];

    for (const chainScope of chainScopes) {
      const events = await this.auditStore.readChain(chainScope);
      eventsChecked += events.length;
      chainsChecked.push(chainScope);
      const defects = this.verifyChain(chainScope, events);
      allDefects.push(...defects);
    }

    if (allDefects.length === 0) {
      return {
        ok: true,
        scope,
        eventsChecked,
        chainsChecked,
      };
    }
    return {
      ok: false,
      scope,
      eventsChecked,
      chainsChecked,
      defects: allDefects,
    };
  }

  /**
   * Resolve the list of chain scopes to verify for a given scope.
   */
  private async resolveChainScopes(
    scope: AuditVerificationScope,
  ): Promise<readonly string[]> {
    switch (scope.kind) {
      case 'platform':
        return ['platform'];
      case 'tenant':
        return [`tenant:${scope.tenantId}`];
      case 'all':
        return await this.auditStore.listChainScopes();
    }
  }

  /**
   * Verify a single chain. Returns the list of defects detected.
   */
  private verifyChain(
    chainScope: string,
    events: readonly AuditVerificationEvent[],
  ): AuditVerificationDefect[] {
    const defects: AuditVerificationDefect[] = [];

    if (events.length === 0) {
      // An empty chain has no defects.
      return defects;
    }

    // The known integrity key versions. In this batch, only the
    // current version is known. Future key-rotation workflows may
    // add more known versions.
    const knownKeyVersions = new Set<number>([
      this.config.getIntegrityKeyVersion(),
    ]);

    let expectedSequence = 1;
    let previousIntegrityHash: string | null = null;
    const seenSequences = new Set<number>();

    for (const event of events) {
      // --- Invalid sequence ---
      if (
        !Number.isSafeInteger(event.chainSequence) ||
        event.chainSequence <= 0
      ) {
        defects.push({
          kind: 'invalid_sequence',
          chainScope,
          chainSequence: event.chainSequence,
          eventId: event.eventId,
          detail: `chain_sequence is not a positive integer: ${event.chainSequence}`,
        });
        // Skip further checks for this event; the chain is broken.
        continue;
      }

      // --- Duplicated sequence ---
      if (seenSequences.has(event.chainSequence)) {
        defects.push({
          kind: 'duplicated_sequence',
          chainScope,
          chainSequence: event.chainSequence,
          detail: `chain_sequence ${event.chainSequence} appears more than once`,
        });
      }
      seenSequences.add(event.chainSequence);

      // --- Missing sequence ---
      // We walk the events in chain_sequence order (the repository
      // returns them sorted). If the sequence skips a number, that
      // is a missing-sequence defect.
      if (event.chainSequence !== expectedSequence) {
        // If the event's sequence is greater than expected, there
        // is a gap.
        if (event.chainSequence > expectedSequence) {
          defects.push({
            kind: 'missing_sequence',
            chainScope,
            expectedSequence,
            detail: `expected chain_sequence ${expectedSequence} but got ${event.chainSequence}`,
          });
          // Update expected to the next sequence after the current
          // event's.
          expectedSequence = event.chainSequence + 1;
        } else {
          // The event's sequence is less than expected — this is a
          // duplicated-sequence or out-of-order event. We've
          // already recorded the duplicated-sequence defect above
          // (if applicable); do not update expected.
        }
      } else {
        expectedSequence = event.chainSequence + 1;
      }

      // --- Incorrect key version ---
      if (!knownKeyVersions.has(event.integrityKeyVersion)) {
        defects.push({
          kind: 'incorrect_key_version',
          chainScope,
          chainSequence: event.chainSequence,
          eventId: event.eventId,
          keyVersion: event.integrityKeyVersion,
          detail: `integrity_key_version ${event.integrityKeyVersion} is not a known version`,
        });
      }

      // --- Modified payload ---
      const recomputedPayloadHash = canonicalPayloadHash(
        event.canonicalEventDraft,
      );
      if (recomputedPayloadHash !== event.payloadHash) {
        defects.push({
          kind: 'modified_payload',
          chainScope,
          chainSequence: event.chainSequence,
          eventId: event.eventId,
          detail: `stored payload_hash ${event.payloadHash} does not match recomputed ${recomputedPayloadHash}`,
        });
      }

      // --- Modified previous hash ---
      // The stored previous_integrity_hash should match the
      // previous event's integrity_hash (which we tracked as
      // `previousIntegrityHash`).
      if (event.previousIntegrityHash !== previousIntegrityHash) {
        defects.push({
          kind: 'modified_previous_hash',
          chainScope,
          chainSequence: event.chainSequence,
          eventId: event.eventId,
          detail: `stored previous_integrity_hash ${event.previousIntegrityHash} does not match expected ${previousIntegrityHash}`,
        });
      }

      // --- Integrity hash verification ---
      // Recompute the integrity hash and compare it to the stored
      // integrity_hash. If they don't match, the integrity hash
      // itself has been modified (or the bound fields have been
      // modified, which would also produce a modified_payload
      // defect).
      const keyVersionOk = knownKeyVersions.has(event.integrityKeyVersion);
      if (keyVersionOk) {
        const integrityKey = this.config.getIntegrityHmacKey();
        const integrityOk = verifyIntegrityHash(
          integrityKey,
          {
            integrityKeyVersion: event.integrityKeyVersion,
            chainScope: event.chainScope,
            chainSequence: event.chainSequence,
            previousIntegrityHash: event.previousIntegrityHash,
            payloadHash: event.payloadHash,
          },
          event.integrityHash,
        );
        if (!integrityOk) {
          // The integrity hash does not match. This is a
          // modified-payload or modified-previous-hash defect
          // (already recorded above) OR a direct integrity-hash
          // modification. We record a modified_payload defect
          // with a specific detail if neither of the above was
          // recorded.
          const alreadyRecorded =
            defects.some(
              (d) =>
                d.kind === 'modified_payload' &&
                d.chainSequence === event.chainSequence,
            ) ||
            defects.some(
              (d) =>
                d.kind === 'modified_previous_hash' &&
                d.chainSequence === event.chainSequence,
            );
          if (!alreadyRecorded) {
            defects.push({
              kind: 'modified_payload',
              chainScope,
              chainSequence: event.chainSequence,
              eventId: event.eventId,
              detail: `stored integrity_hash does not match recomputed integrity_hash`,
            });
          }
        }
      }

      // Track the previous integrity hash for the next event.
      previousIntegrityHash = event.integrityHash;
    }

    return defects;
  }
}
