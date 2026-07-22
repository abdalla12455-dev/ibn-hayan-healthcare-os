import { z } from 'zod';

/**
 * Shared authorization contracts for the Ibn Hayan Healthcare
 * Operating System.
 *
 * This module is the single source of truth for the shape of
 * role-related data that crosses the API boundary. Both
 * `@ibn-hayan/api` (the NestJS backend that produces the responses)
 * and `@ibn-hayan/web` (the Next.js thin client that consumes them)
 * derive their types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript
 * types are inferred from the Zod schemas via `z.infer` — no separate
 * authoritative interfaces are maintained.
 *
 * Per the eighth canonical batch specification:
 * - The role catalogue is the canonical fourteen platform roles
 *   (R01 through R14). The simplified `owner`/`member`/`viewer`
 *   proposal in `CURRENT_IMPLEMENTATION_HANDOVER.md` is explicitly
 *   rejected.
 * - Membership summaries expose `roles` as an array (not a singular
 *   role), because a principal may hold multiple roles
 *   simultaneously per PRODUCT_BIBLE.md Section 20.3.
 * - The API contract exposes both the stable machine code and the
 *   localized display name. Authorization decisions use only the
 *   stable machine code; the display name is for client display
 *   only.
 * - The contract never includes password hashes, session tokens, CSRF
 *   tokens, or any credential material.
 *
 * All objects use `.strict()` so that adding an unexpected field at
 * any boundary is rejected by the Zod parse. This is the structural
 * enforcement of "every external boundary is validated" per
 * CODING_STANDARDS.md §6.
 */

// ---------------------------------------------------------------------------
// RoleCode
// ---------------------------------------------------------------------------

/**
 * The canonical Zod schema for a platform role code. The enum is the
 * complete list of fourteen canonical codes; any other string is
 * rejected at the boundary.
 *
 * The codes mirror the `PlatformRoleCode` union in
 * `packages/domain/src/authorization/role-catalogue.ts`. The two
 * definitions are intentionally separate (rather than one importing
 * the other) because the contracts package is framework-agnostic
 * and must not import from the domain package (the domain package
 * has its own build chain and is not a dependency of contracts).
 * Divergence between the two definitions is caught by the contract
 * tests, which verify that every canonical code is in the schema
 * and that the schema rejects non-canonical codes.
 */
export const RoleCodeSchema = z.enum([
  'R01_PHYSICIAN',
  'R02_NURSE',
  'R03_PHARMACIST',
  'R04_TECHNICIAN',
  'R05_ALLIED_HEALTH_PROFESSIONAL',
  'R06_RECEPTIONIST',
  'R07_SCHEDULER',
  'R08_BILLER',
  'R09_ADMINISTRATOR',
  'R10_COMPLIANCE_OFFICER',
  'R11_HR_MANAGER',
  'R12_EXECUTIVE',
  'R13_SYSTEM_ADMINISTRATOR',
  'R14_INTEGRATION_ACCOUNT',
]);

export type RoleCode = z.infer<typeof RoleCodeSchema>;

// ---------------------------------------------------------------------------
// RoleLabelLocale
// ---------------------------------------------------------------------------

/**
 * The locale codes for which the role catalogue carries display
 * names. Arabic is the default per the platform's Arabic-first
 * posture.
 */
export const RoleLabelLocaleSchema = z.enum(['ar', 'en']);

export type RoleLabelLocale = z.infer<typeof RoleLabelLocaleSchema>;

// ---------------------------------------------------------------------------
// RoleSummary
// ---------------------------------------------------------------------------

/**
 * The canonical RoleSummary schema. Represents one role assigned to
 * a membership, with its stable machine code and localized display
 * name.
 *
 * Fields:
 * - `code`: the stable machine-readable code (e.g.
 *   `R13_SYSTEM_ADMINISTRATOR`). Authorization decisions use this
 *   field; the display name is for client display only.
 * - `displayName`: the localized display name (Arabic or English,
 *   depending on the `Accept-Language` header of the request).
 *
 * The schema excludes:
 * - the role's category (clinical/operational/administrative/platform);
 * - the role's short code (R01 through R14);
 * - any permission information (the client must not duplicate the
 *   role-permission matrix);
 * - any internal database identifier.
 *
 * The schema is `.strict()` so that adding an unexpected field at
 * the boundary is rejected by the Zod parse.
 */
export const RoleSummarySchema = z
  .object({
    code: RoleCodeSchema,
    displayName: z.string().min(1).max(200),
  })
  .strict();

export type RoleSummary = z.infer<typeof RoleSummarySchema>;

// ---------------------------------------------------------------------------
// PermissionCode
// ---------------------------------------------------------------------------

/**
 * The canonical Zod schema for a permission code. The enum is the
 * complete list of canonical permission codes for the functionality
 * that exists today. New permissions are added through architectural
 * decision (per ROLES_AND_PERMISSIONS.md Section 3.6).
 *
 * The contract exposes the permission codes so that the frontend
 * can use them for usability enhancements (e.g. hiding a button
 * when the principal lacks the relevant permission). The frontend
 * MUST NOT treat the presence or absence of a permission as a
 * security control; the API remains authoritative.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * context permissions are split into per-level codes. The split is
 * structural: each context-selection endpoint declares its specific
 * permission. The `context:view` permission remains a single code
 * because viewing the available context options is a single read
 * operation.
 */
export const PermissionCodeSchema = z.enum([
  'context:view',
  'context:select',
  'context:clear',
  'context:select_organisation',
  'context:clear_organisation',
  'context:select_facility',
  'context:clear_facility',
]);

export type PermissionCode = z.infer<typeof PermissionCodeSchema>;
