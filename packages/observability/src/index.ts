/**
 * @ibn-hayan/observability
 *
 * Structured logging, audit-event emission, and PHI-redaction helpers
 * consumed by @ibn-hayan/api and (for client-side logging only) by
 * @ibn-hayan/web. The structural expression of CODING_STANDARDS.md
 * Section 8 (Logging) and Section 9 (Audit).
 *
 * In this batch the package contains only a package-boundary marker. The
 * logger interface, the audit-event emitter, and the redactor arrive in a
 * subsequent batch alongside the first vertical slice.
 */

export const OBSERVABILITY_PACKAGE_VERSION = '0.0.0' as const;

export const OBSERVABILITY_PACKAGE_NAME = '@ibn-hayan/observability' as const;
