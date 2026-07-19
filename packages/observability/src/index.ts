/**
 * @ibn-hayan/observability
 *
 * Framework-agnostic audit emission, canonical serialization,
 * integrity hashing, identifier HMAC, PHI redaction, and audit
 * verification types for the Ibn Hayan Healthcare Operating System.
 *
 * Per ADR-012 (Application Platform and Repository Structure) and
 * ADR-014 (Audit Store and Integrity Strategy), this package is
 * pure TypeScript: it MUST NOT import Prisma, NestJS, React, or
 * generated database types. The API implements the ports declared
 * here; the audit store and outbox are infrastructure adapters.
 *
 * The package exports:
 * - Audit-event categories, actor types, outcomes, source types.
 * - Stable action-code catalogue.
 * - Audit-event draft type and builder.
 * - Canonical serializer (deterministic JSON serialization).
 * - Integrity-hash helper (HMAC-SHA-256 chained).
 * - Identifier-HMAC helper (failed-login privacy).
 * - Safe metadata validator (forbidden-key detector, size limits).
 * - Audit-key validation helpers.
 * - Audit-emitter port, audit-outbox port, audit-store ports.
 * - Audit-verification result types.
 *
 * Per CODING_STANDARDS.md Section 8 (Logging) and Section 9 (Audit),
 * this package is the canonical location for audit emission and
 * PHI-redaction helpers.
 */

export const OBSERVABILITY_PACKAGE_VERSION = '0.0.0' as const;

export const OBSERVABILITY_PACKAGE_NAME = '@ibn-hayan/observability' as const;

// Re-export everything from the audit subpath.
export * from './audit/index.js';
