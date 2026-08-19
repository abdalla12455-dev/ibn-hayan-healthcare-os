/**
 * Configuration repository and resolution ports (BC16).
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * these interfaces are declared in the domain package and implemented
 * by persistence adapters in `apps/api/src/infrastructure/database/`.
 * The API layer depends on the ports; the Prisma-backed implementation
 * is injected at the composition root.
 *
 * Two boundaries are declared here:
 * - `ConfigurationValueRepository` — the persistence port for the
 *   generic configuration value store and append-only version history.
 * - `ConfigurationResolutionPort` — the canonical resolution contract
 *   used by consuming modules (e.g. Scheduling). Modules NEVER perform
 *   their own layer resolution; they receive the resolved value from
 *   the resolution port (per CONFIGURATION_ARCHITECTURE.md §2.2).
 *
 * Scope identifiers (tenant/organisation/facility) are always trusted
 * inputs derived server-side; no unscoped access exists by design.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type {
  ConfigurationLayerCode,
  ConfigurationResolution,
  ConfigurationResolutionScope,
  ConfigurationValue,
  ConfigurationValuePutInput,
  ConfigurationValuePutResult,
} from './configuration.js';

// ---------------------------------------------------------------------------
// ConfigurationValueRepository (persistence port)
// ---------------------------------------------------------------------------

export interface ConfigurationValueRepository {
  /**
   * Read every candidate row that participates in resolving `key`
   * within the supplied scope. The first slice's resolution addresses
   * the implemented layers: the single L1 row, the L3 row for the
   * scope's tenant, and the L4 row for the scope's
   * tenant+organisation+facility triple (only when organisation and
   * facility identifiers are present). Each query is scoped inside the
   * tenant hierarchy — cross-tenant rows are never returned.
   */
  findByKeyAndScope(
    key: string,
    scope: ConfigurationResolutionScope,
  ): Promise<readonly ConfigurationValue[]>;

  /**
   * Read a single current-value row addressed by an explicitly
   * addressed layer and normalized scope: L1 rows require all scope
   * identifiers `null`; L3 rows require exactly `tenantId`; L4 rows
   * require the tenant+organisation+facility triple. Used by
   * administration flows when they need the row they are about to
   * replace. Out-of-scope rows return `null` (no existence leak).
   */
  findValue(
    key: string,
    layer: ConfigurationLayerCode,
    scope: ConfigurationResolutionScope,
  ): Promise<ConfigurationValue | null>;

  /**
   * Atomically create or update the current-value row for `key` at the
   * addressed layer/scope and append exactly one immutable version
   * record. When the caller supplies an ambient transaction, the write
   * and the version append join it; otherwise the adapter runs them in
   * its own transaction. Create starts the optimistic `valueVersion`
   * at 1; update increments it. Scope incoherence (see
   * `ConfigurationValuePutInput`) is reported as
   * `scope_incoherent` before any persistence attempt.
   */
  put(
    input: ConfigurationValuePutInput,
    options?: { readonly transaction?: unknown },
  ): Promise<ConfigurationValuePutResult>;
}

// ---------------------------------------------------------------------------
// ConfigurationResolutionPort (consumer contract)
// ---------------------------------------------------------------------------

/**
 * The canonical resolution contract. Module code (e.g. Scheduling)
 * calls this port with a key and trusted scope and receives the
 * resolved value plus provenance metadata; the module never orders
 * candidate rows itself.
 *
 * Fail-closed semantics: unknown keys, incoherent scope, and invalid
 * persisted values throw `ConfigurationResolutionError` — a silent
 * fallback to any default would defeat validation and versioning
 * governance. A fail-closed resolution never emits an audit event:
 * administrative reads are audited by the administration service at
 * the API boundary, and internal resolution deliberately carries no
 * request context.
 */
export interface ConfigurationResolutionPort {
  resolve(
    key: string,
    scope: ConfigurationResolutionScope,
  ): Promise<ConfigurationResolution>;
}
