/**
 * Audit verification result types.
 *
 * Per ADR-014 §16 and the ninth canonical batch specification, the
 * integrity verifier returns a typed result without exposing
 * integrity keys. The result identifies the chain verified, the
 * number of events checked, and any defects detected.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

/**
 * The scope of a verification run.
 */
export type AuditVerificationScope =
  | { readonly kind: 'platform' }
  | { readonly kind: 'tenant'; readonly tenantId: string }
  | { readonly kind: 'all' };

/**
 * The defects the verifier can detect.
 */
export type AuditVerificationDefect =
  | {
      readonly kind: 'modified_payload';
      readonly chainScope: string;
      readonly chainSequence: number;
      readonly eventId: string;
      readonly detail: string;
    }
  | {
      readonly kind: 'modified_previous_hash';
      readonly chainScope: string;
      readonly chainSequence: number;
      readonly eventId: string;
      readonly detail: string;
    }
  | {
      readonly kind: 'invalid_sequence';
      readonly chainScope: string;
      readonly chainSequence: number;
      readonly eventId: string;
      readonly detail: string;
    }
  | {
      readonly kind: 'missing_sequence';
      readonly chainScope: string;
      readonly expectedSequence: number;
      readonly detail: string;
    }
  | {
      readonly kind: 'duplicated_sequence';
      readonly chainScope: string;
      readonly chainSequence: number;
      readonly detail: string;
    }
  | {
      readonly kind: 'incorrect_key_version';
      readonly chainScope: string;
      readonly chainSequence: number;
      readonly eventId: string;
      readonly keyVersion: number;
      readonly detail: string;
    }
  | {
      readonly kind: 'chain_fork';
      readonly chainScope: string;
      readonly chainSequence: number;
      readonly detail: string;
    }
  | {
      readonly kind: 'unknown_key_version';
      readonly chainScope: string;
      readonly keyVersion: number;
      readonly detail: string;
    };

/**
 * The result of a verification run.
 *
 * On success, `ok` is `true`, `eventsChecked` is the number of
 * events verified, and `chainsChecked` is the list of chain scopes
 * verified.
 *
 * On failure, `ok` is `false` and `defects` is a non-empty array of
 * detected defects. The verifier returns ALL defects found in a
 * single run, not just the first one.
 */
export type AuditVerificationResult =
  | {
      readonly ok: true;
      readonly scope: AuditVerificationScope;
      readonly eventsChecked: number;
      readonly chainsChecked: readonly string[];
    }
  | {
      readonly ok: false;
      readonly scope: AuditVerificationScope;
      readonly eventsChecked: number;
      readonly chainsChecked: readonly string[];
      readonly defects: readonly AuditVerificationDefect[];
    };

/**
 * The audit-store port for verification.
 *
 * The verifier reads audit events from the audit store through this
 * port. The port exposes a single method that returns a cursor of
 * events for a chain, ordered by `chain_sequence` ascending.
 *
 * This port is intentionally minimal: the verifier does not need to
 * append, only to read. The append port is the `AuditStoreAppendPort`
 * used by the dispatcher.
 */
export interface AuditStoreReadPort {
  /**
   * Read all events for a chain, ordered by `chain_sequence`
   * ascending. Returns an empty array if the chain does not exist.
   *
   * The `chainScope` is `platform` or `tenant:<tenantId>`.
   */
  readChain(chainScope: string): Promise<readonly AuditVerificationEvent[]>;

  /**
   * List all chain scopes in the audit store. Used by the `all`
   * verification scope.
   */
  listChainScopes(): Promise<readonly string[]>;
}

/**
 * A read-only audit event used by the verifier. Carries the fields
 * the verifier needs to recompute and compare integrity hashes.
 */
export interface AuditVerificationEvent {
  readonly eventId: string;
  readonly tenantId: string | null;
  readonly chainScope: string;
  readonly chainSequence: number;
  readonly previousIntegrityHash: string | null;
  readonly payloadHash: string;
  readonly integrityHash: string;
  readonly integrityKeyVersion: number;
  /** The canonical event draft, deserialised from the stored form. */
  readonly canonicalEventDraft: unknown;
}

/**
 * DI token for the audit-store read port.
 */
export const AUDIT_STORE_READ_PORT = Symbol('AUDIT_STORE_READ_PORT');
