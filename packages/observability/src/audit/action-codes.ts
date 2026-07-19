/**
 * Stable audit action-code catalogue for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per ADR-014 and the ninth canonical batch specification, audit
 * action codes are stable machine-readable strings of the form
 * `<category>.<subject>.<verb>`. They are stored in the `action`
 * column of the `audit_events` table in the dedicated audit database.
 *
 * The catalogue is organized by category. Each category exports its
 * own constant tuple and a type union. The top-level
 * `AUDIT_ACTION_CODES` tuple is the complete catalogue; the
 * `AuditActionCode` type is the complete union.
 *
 * Per the ninth canonical batch specification, action codes are
 * invented ONLY for functionality that exists today. No action codes
 * are invented for patient, encounter, appointment, billing,
 * inventory, configuration, feature-flag, reporting, or
 * audit-management UI functionality. Those arrive in subsequent
 * batches alongside the modules that emit them.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Authentication action codes.
 *
 * Emitted by the auth module (`apps/api/src/modules/auth/`) and by
 * the request-ID middleware for pre-authentication events.
 */
export const AUTHENTICATION_ACTION_CODES = [
  'authentication.login.succeeded',
  'authentication.login.failed',
  'authentication.login.throttled',
  'authentication.logout.succeeded',
  'authentication.session.invalid',
  'authentication.session.expired',
  'authentication.session.rotated',
] as const;

export type AuthenticationActionCode =
  (typeof AUTHENTICATION_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Request security
// ---------------------------------------------------------------------------

/**
 * Request-security action codes.
 *
 * Emitted by the auth module (Origin and CSRF checks) and by the
 * authorization guard (CSRF check).
 */
export const SECURITY_ACTION_CODES = [
  'security.origin.denied',
  'security.csrf.denied',
] as const;

export type SecurityActionCode = (typeof SECURITY_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * Authorization action codes.
 *
 * Emitted by the authorization guard for every allow and deny
 * decision on the existing context permissions.
 */
export const AUTHORIZATION_ACTION_CODES = [
  'authorization.decision.allowed',
  'authorization.decision.denied',
] as const;

export type AuthorizationActionCode =
  (typeof AUTHORIZATION_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Tenant context
// ---------------------------------------------------------------------------

/**
 * Tenant-context action codes.
 *
 * Emitted by the session-context module for context view, selection,
 * and clearing.
 */
export const TENANT_CONTEXT_ACTION_CODES = [
  'tenant_context.viewed',
  'tenant_context.selected',
  'tenant_context.cleared',
] as const;

export type TenantContextActionCode =
  (typeof TENANT_CONTEXT_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

/**
 * RBAC action codes.
 *
 * Emitted by the development bootstrap command when it assigns R13
 * System Administrator to the development membership. Future batches
 * will add codes for role unassignment, role-scope changes, and
 * cross-tenant role-assignment attempts.
 */
export const RBAC_ACTION_CODES = [
  'rbac.role.assigned',
  'rbac.role.assignment.failed',
] as const;

export type RbacActionCode = (typeof RBAC_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Audit system
// ---------------------------------------------------------------------------

/**
 * Audit-system action codes.
 *
 * Emitted by the dispatcher (delivery failure) and by the verifier
 * (integrity verified, integrity verification failed).
 */
export const AUDIT_SYSTEM_ACTION_CODES = [
  'audit.delivery.failed',
  'audit.integrity.verified',
  'audit.integrity.verification_failed',
] as const;

export type AuditSystemActionCode =
  (typeof AUDIT_SYSTEM_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Complete catalogue
// ---------------------------------------------------------------------------

/**
 * The complete audit action-code catalogue for the ninth canonical
 * batch. Used by the metadata validator and the audit-emission API
 * to reject unknown action codes at the boundary.
 */
export const AUDIT_ACTION_CODES = [
  ...AUTHENTICATION_ACTION_CODES,
  ...SECURITY_ACTION_CODES,
  ...AUTHORIZATION_ACTION_CODES,
  ...TENANT_CONTEXT_ACTION_CODES,
  ...RBAC_ACTION_CODES,
  ...AUDIT_SYSTEM_ACTION_CODES,
] as const;

/**
 * The complete audit action-code type union.
 */
export type AuditActionCode = (typeof AUDIT_ACTION_CODES)[number];

/**
 * Verify that a value is a valid audit action code.
 */
export function isAuditActionCode(
  value: unknown,
): value is AuditActionCode {
  if (typeof value !== 'string') {
    return false;
  }
  return (AUDIT_ACTION_CODES as readonly string[]).includes(value);
}

/**
 * Infer the category of an action code from its prefix. Returns the
 * category string or `null` if the action code is unknown.
 *
 * This helper is used by the audit-emission API to cross-check that
 * the supplied category matches the action code's prefix. A mismatch
 * is treated as a defect: the action code's category prefix is the
 * canonical category, and the `category` field on the event must
 * match.
 */
export function inferCategoryFromAction(
  action: string,
): string | null {
  if (action.startsWith('authentication.')) {
    return 'security';
  }
  if (action.startsWith('security.')) {
    return 'security';
  }
  if (action.startsWith('authorization.')) {
    return 'authorization';
  }
  if (action.startsWith('tenant_context.')) {
    return 'tenant_context';
  }
  if (action.startsWith('rbac.')) {
    return 'rbac';
  }
  if (action.startsWith('audit.')) {
    return 'audit';
  }
  return null;
}
