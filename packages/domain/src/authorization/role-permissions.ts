/**
 * Canonical role-permission matrix for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per PRODUCT_BIBLE.md Section 21.3, permissions are assigned
 * through roles, not directly to users. Per ROLES_AND_PERMISSIONS.md
 * Section 4, the matrix is the canonical reference for what
 * permissions each role holds. A role assignment confers the
 * permissions documented in the matrix.
 *
 * Per the eighth canonical batch specification, the matrix is
 * centrally defined here. Role comparisons are NOT scattered across
 * controllers. Controllers declare the required permission via
 * `@RequirePermission(...)`; the authorization layer consults the
 * matrix to determine whether the principal's roles grant the
 * permission.
 *
 * Per PRODUCT_BIBLE.md Section 20.3, when a principal holds multiple
 * roles, allowed permissions accumulate (set union). The
 * `permissionsForRoles` function implements this accumulation.
 *
 * Per the eighth canonical batch specification:
 * - R01 through R13 (human platform roles) receive the three current
 *   context permissions.
 * - R14 (Integration Account) does NOT receive the interactive
 *   workspace context permissions. The integration account is
 *   non-human and must not use browser workspace-selection endpoints.
 * - A membership with no assigned roles has no permissions.
 * - Unknown roles are denied.
 * - Unknown permissions are denied.
 * - Denial is the default for every unresolved case.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { PermissionCode } from './permissions.js';
import { isPermissionCode } from './permissions.js';
import type { PlatformRoleCode } from './role-catalogue.js';
import {
  PLATFORM_ROLE_CODES,
  isPlatformRoleCode,
} from './role-catalogue.js';

// ---------------------------------------------------------------------------
// Explicit permission lists (least-privilege, no future-expansion risk)
// ---------------------------------------------------------------------------

/**
 * The seven context permissions granted to every human role (R01
 * through R13). This list is EXPLICIT: it does NOT use
 * `PERMISSION_CODES.filter(...)`. Adding a future permission to
 * `PERMISSION_CODES` does NOT automatically grant it to any role —
 * the new permission must be explicitly added to this list (or to
 * `CLINIC_ADMIN_PERMISSIONS`) to be granted.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * context permissions are split into per-level codes. R14 Integration
 * Account is denied all seven context permissions: R14 is
 * non-interactive and receives no browser context-selection
 * capability.
 *
 * Per the audit-semantics restoration task Phase 5, this explicit
 * list is the smallest coherent least-privilege correction that
 * eliminates the future privilege-expansion risk created by the
 * previous `PERMISSION_CODES.filter(...)` pattern. The previous
 * pattern would have automatically granted any new permission to
 * R01-R13 (because the filter only excluded
 * `clinic_admin_overview:view`). The explicit list ensures a new
 * permission is granted ONLY when explicitly added to this list.
 */
const HUMAN_CONTEXT_PERMISSIONS: readonly PermissionCode[] = [
  'context:view',
  'context:select',
  'context:clear',
  'context:select_organisation',
  'context:clear_organisation',
  'context:select_facility',
  'context:clear_facility',
] as const;

/**
 * The ten permissions granted to R06 Receptionist and R07 Scheduler:
 * the seven context permissions plus `appointments:book`,
 * `appointments:cancel`, and `appointments:reschedule`. This list is
 * EXPLICIT: it does NOT use `PERMISSION_CODES` directly.
 *
 * Per the Stage 1C implementation specification, R06 and R07 are the
 * clinic-side roles authorized to create appointments via
 * `POST /api/v1/appointments`. The `appointments:book` permission
 * is NOT granted to R13_SYSTEM_ADMINISTRATOR — platform-level identity
 * must not accidentally gain clinic-booking access through a global
 * permission.
 *
 * Per the Stage 1D implementation specification, R06 and R07 are also
 * authorized to cancel appointments via
 * `POST /api/v1/appointments/:id/cancel`. The `appointments:cancel`
 * permission is NOT granted to R13_SYSTEM_ADMINISTRATOR — platform-level
 * identity must not gain clinic-cancellation access.
 *
 * Per the Stage 1E implementation specification, R06 and R07 are also
 * authorized to reschedule appointments via
 * `POST /api/v1/appointments/:id/reschedule`. Per
 * download/docs/07_MODULES/APPOINTMENTS.md, R06 "Book, reschedule,
 * cancel appointments" and R07 "create, modify, and cancel
 * appointments". The `appointments:reschedule` permission is NOT
 * granted to R13_SYSTEM_ADMINISTRATOR — platform-level identity must
 * not gain clinic-rescheduling access.
 */
const CLINIC_BOOKING_PERMISSIONS: readonly PermissionCode[] = [
  ...HUMAN_CONTEXT_PERMISSIONS,
  'appointments:book',
  'appointments:cancel',
  'appointments:reschedule',
  'appointments:confirm',
  'appointments:check_in',
] as const;

/**
 * The nine permissions granted to R01 Physician: the seven context
 * permissions plus `appointments:start` and `appointments:complete`.
 * This list is EXPLICIT: it does NOT use `PERMISSION_CODES` directly.
 *
 * Per the Stage 1F implementation specification, R01 Physician is the
 * canonical clinical role that progresses a visit from `arrived` to
 * `in_progress` (start) and from `in_progress` to `completed`
 * (complete). Per STATUS_CODES.md §4.1, InProgress means "Patient is
 * being seen by the practitioner" and Completed means "Appointment
 * has concluded" — these are practitioner (clinical) actions, NOT
 * operational actions. They are therefore NOT granted to R06
 * Receptionist, R07 Scheduler, or R09 Clinic Administrator, and NOT
 * granted to R13_SYSTEM_ADMINISTRATOR.
 *
 * Per download/docs/07_MODULES/APPOINTMENTS.md §9.1, R01 Physician's
 * appointment-related responsibilities are "View own schedule, block
 * slots, manage appointment types". The start/complete visit-lifecycle
 * actions are the clinical progression of an appointment the physician
 * is delivering; they are the canonical clinical counterpart to the
 * operational booking/cancellation/rescheduling actions held by
 * R06/R07/R09.
 *
 * R02 Nurse does NOT receive `appointments:start` or
 * `appointments:complete` in this stage: APPOINTMENTS.md §9.1 lists
 * R02 responsibilities as "View clinic schedule, manage room
 * assignments", which does not canonically grant visit start/complete.
 * A future stage may extend clinical visit permissions to R02 if
 * canonical evidence authorizes it; until then the least-privilege
 * choice is R01 only.
 */
const CLINICAL_VISIT_PERMISSIONS: readonly PermissionCode[] = [
  ...HUMAN_CONTEXT_PERMISSIONS,
  'appointments:start',
  'appointments:complete',
] as const;

/**
 * The encounter lifecycle write permissions granted to R01 Physician:
 * the clinical authority to open an encounter, progress it through its
 * canonical lifecycle, and conclude it.
 *
 * Per USER_ROLES.md �10.1 (Role-Permission Matrix), R01 Physician has
 * "Read/Write" on Encounter Records. Per STATUS_CODES.md �10.2
 * (Encounter Transition Map), the encounter lifecycle edges are
 * clinical actions: arrive (patient check-in), start (practitioner
 * starts encounter), on_leave/resume (encounter pause/resume), finish
 * (practitioner concludes encounter), cancel (with reason).
 *
 * The encounter is the platform's central clinical organizing entity
 * (PRODUCT_BIBLE.md �13.3, SYSTEM_ARCHITECTURE.md �12.6). Opening and
 * progressing an encounter is a clinical act; R01 Physician is the
 * canonical clinical role that performs it. These permissions are NOT
 * granted to R13 System Administrator � platform-level identity must
 * not gain clinical-encounter access.
 */
const PHYSICIAN_ENCOUNTER_PERMISSIONS: readonly PermissionCode[] = [
  ...CLINICAL_VISIT_PERMISSIONS,
  'encounters:create',
  'encounters:arrive',
  'encounters:start',
  'encounters:finish',
  'encounters:cancel',
  'encounters:on_leave',
  'encounters:resume',
  'encounters:view',
] as const;

/**
 * The encounter permissions granted to R02 Nurse: clinical read/write
 * on encounter records, per USER_ROLES.md �10.1 (R02 Nurse Encounter
 * Records = "Read/Write"). Nurses participate in encounters (nursing
 * assessment, care delivery, medication administration) and may open,
 * arrive, and cancel encounters. The start/finish transitions are the
 * practitioner's clinical conclusion authority; per the Stage 1F
 * precedent (where appointment start/complete are R01-only), and to
 * preserve least privilege, R02 does NOT receive encounters:start or
 * encounters:finish in this stage. A future stage may extend these if
 * canonical evidence authorizes it.
 *
 * These permissions are NOT granted to R13 System Administrator.
 */
const NURSE_ENCOUNTER_PERMISSIONS: readonly PermissionCode[] = [
  ...HUMAN_CONTEXT_PERMISSIONS,
  'encounters:create',
  'encounters:arrive',
  'encounters:cancel',
  'encounters:view',
] as const;

/**
 * The encounter read-only permissions granted to the clinical and
 * operational read roles (R03 Pharmacist, R04 Technician, R05 Allied
 * Health, R06 Receptionist, R07 Scheduler, R08 Biller, R09
 * Administrator, R10 Compliance Officer, R12 Executive). Per
 * USER_ROLES.md �10.1, each of these roles has a Read variant on
 * Encounter Records ("Read", "Read (med)", "Read (sched)",
 * "Read (bill)", "Read (audit)", "Read (summary)"). The
 * `encounters:view` permission is the read-only authorisation gate for
 * GET /api/v1/encounters/:id.
 *
 * This list is EXPLICIT: it does NOT use `PERMISSION_CODES.filter(...)`.
 * R13 System Administrator is deliberately EXCLUDED: per
 * USER_ROLES.md �10.1, R13's Encounter Records cell is "�" (no
 * encounter permissions). R13 must NOT inherit clinical operational
 * permissions.
 */
const ENCOUNTER_READ_PERMISSIONS: readonly PermissionCode[] = [
  ...HUMAN_CONTEXT_PERMISSIONS,
  'encounters:view',
] as const;

/**
 * The permissions granted to R06 Receptionist and R07 Scheduler: the
 * clinic booking permissions PLUS `encounters:view` (read on Encounter
 * Records). Per USER_ROLES.md 10.1, R06's Encounter Records cell is
 * "Read (sched)" and R07's is "Read/Write (sched)". The "(sched)"
 * qualifier scopes the access to the scheduling context; the
 * `encounters:view` permission is the read-only gate for
 * GET /api/v1/encounters/:id.
 *
 * Stage 2A defines NO scheduling-scoped encounter write command. The
 * encounter lifecycle writes (create/arrive/start/finish/cancel/
 * on_leave/resume) are clinical actions, not scheduling actions, so
 * R07's "Write (sched)" grants NO encounter lifecycle write in
 * Stage 2A. A future stage may define a scheduling-scoped encounter
 * write if canonical evidence authorizes one; until then R06 and R07
 * receive `encounters:view` ONLY (read), plus their existing booking
 * permissions. This list is EXPLICIT.
 */
const CLINIC_BOOKING_ENCOUNTER_READ_PERMISSIONS: readonly PermissionCode[] =
  [
    ...CLINIC_BOOKING_PERMISSIONS,
    'encounters:view',
  ] as const;

/**
 * The twelve permissions granted to R09 Clinic Administrator: the
 * seven context permissions plus `clinic_admin_overview:view`,
 * `appointments:view`, `appointments:book`, `appointments:cancel`,
 * and `appointments:reschedule`. This list is EXPLICIT: it does NOT
 * use `PERMISSION_CODES` directly. Adding a future permission to
 * `PERMISSION_CODES` does NOT automatically grant it to R09 — the
 * new permission must be explicitly added to this list to be granted.
 *
 * Per the audit-semantics restoration task Phase 5, this explicit
 * list is the smallest coherent least-privilege correction that
 * eliminates the future privilege-expansion risk created by the
 * previous `R09_ADMINISTRATOR: PERMISSION_CODES` pattern. The
 * previous pattern would have automatically granted any new
 * permission to R09, making R09 a "hidden global super-administrator."
 * The explicit list ensures R09 receives ONLY the permissions
 * explicitly listed here.
 *
 * Per the Stage 1E specification, R09 receives `appointments:reschedule`
 * alongside `appointments:book` and `appointments:cancel` so that the
 * Clinic Administrator can manage the full appointment lifecycle within
 * the authenticated facility scope.
 */
const CLINIC_ADMIN_PERMISSIONS: readonly PermissionCode[] = [
  ...HUMAN_CONTEXT_PERMISSIONS,
  'clinic_admin_overview:view',
  'appointments:view',
  'appointments:book',
  'appointments:cancel',
  'appointments:reschedule',
  'appointments:confirm',
  'appointments:check_in',
  'encounters:view',
] as const;

// ---------------------------------------------------------------------------
// Matrix definition
// ---------------------------------------------------------------------------

/**
 * The role-permission matrix. The keys are the canonical platform
 * role codes; the values are the sets of permissions granted to each
 * role.
 *
 * The matrix is `as const` so that TypeScript infers the literal
 * types. The runtime value is a readonly record.
 *
 * The matrix is the single source of truth for the platform's
 * default role-permission assignments. Customer-defined custom roles
 * (PRODUCT_BIBLE.md Section 20.5) are not implemented in this batch;
 * when they are added, they will compose existing permissions rather
 * than introducing new ones.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * context permissions are split into per-level codes. The matrix
 * grants all seven context permissions to R01 through R13 (human
 * roles). R14 Integration Account is denied all seven context
 * permissions: R14 is non-interactive and receives no browser
 * context-selection capability.
 *
 * Granting all seven context permissions to a human role does NOT
 * grant automatic access to every organisation or facility. The
 * authorization guard additionally verifies, at every protected
 * operation, that the principal holds an applicable scoped role
 * assignment for the selected organisation or facility. A principal
 * with R09 at tenant scope and no organisation-scoped or
 * facility-scoped assignment cannot select an organisation or
 * facility context; the guard rejects the selection before the
 * permission check is reached.
 *
 * The `clinic_admin_overview:view` permission is granted ONLY to
 * `R09_ADMINISTRATOR` (Clinic Administrator). It is the read-only
 * authorisation gate for the Clinic Administrator Overview surface
 * at `/api/v1/clinic-admin/overview` (per DESIGN_BIBLE.md §12 and
 * §13). It is NOT granted to `R13_SYSTEM_ADMINISTRATOR` (Platform
 * Super Admin) — R13 holds a different surface (§15/§16) and must
 * NOT be silently treated as a Clinic Administrator. Per the
 * Clinic Admin Overview live-data task specification Phase 7 item 6,
 * this structural separation is the enforcement point for "A Platform
 * Super Admin is not silently treated as a Clinic Administrator."
 *
 * The `appointments:view` permission is granted ONLY to
 * `R09_ADMINISTRATOR`. It is the read-only authorisation gate for
 * the "Today's Appointments" endpoint at `GET /api/v1/appointments/today`.
 * It is NOT granted to `R13_SYSTEM_ADMINISTRATOR`. Per the Stage 1B
 * implementation specification, this permission enables the read-only
 * query of appointments for the authenticated facility's current local
 * calendar day. No caller-supplied scope is accepted; all context
 * is derived from the authenticated session.
 *
 * Per the audit-semantics restoration task Phase 5, the matrix uses
 * EXPLICIT permission lists (`HUMAN_CONTEXT_PERMISSIONS` and
 * `CLINIC_ADMIN_PERMISSIONS`) rather than `PERMISSION_CODES` or
 * `PERMISSION_CODES.filter(...)`. This is the smallest coherent
 * least-privilege correction that eliminates the future
 * privilege-expansion risk: adding a new permission to
 * `PERMISSION_CODES` does NOT automatically grant it to any role.
 * Each role receives ONLY the permissions explicitly listed in its
 * matrix entry.
 */
export const ROLE_PERMISSION_MATRIX: Readonly<
  Record<PlatformRoleCode, readonly PermissionCode[]>
> = {
  R01_PHYSICIAN: PHYSICIAN_ENCOUNTER_PERMISSIONS,
  R02_NURSE: NURSE_ENCOUNTER_PERMISSIONS,
  R03_PHARMACIST: ENCOUNTER_READ_PERMISSIONS,
  R04_TECHNICIAN: ENCOUNTER_READ_PERMISSIONS,
  R05_ALLIED_HEALTH_PROFESSIONAL: ENCOUNTER_READ_PERMISSIONS,
  // R06 Receptionist is authorized to create appointments via
  // `POST /api/v1/appointments`. Per the Stage 1C specification, R06
  // receives CLINIC_BOOKING_PERMISSIONS. Per USER_ROLES.md 10.1, R06's
  // Encounter Records cell is "Read (sched)", so R06 additionally
  // receives `encounters:view` (read-only; no encounter lifecycle
  // write). R06 therefore uses
  // CLINIC_BOOKING_ENCOUNTER_READ_PERMISSIONS (13 permissions).
  R06_RECEPTIONIST: CLINIC_BOOKING_ENCOUNTER_READ_PERMISSIONS,
  // R07 Scheduler is authorized to create appointments via
  // `POST /api/v1/appointments`. Per the Stage 1C specification, R07
  // receives CLINIC_BOOKING_PERMISSIONS. Per USER_ROLES.md 10.1, R07's
  // Encounter Records cell is "Read/Write (sched)"; the "(sched)"
  // write is a scheduling-scoped write that Stage 2A does NOT define
  // as an encounter command, so R07 receives `encounters:view` ONLY
  // (read) on encounters, plus its existing booking permissions.
  // R07 therefore uses CLINIC_BOOKING_ENCOUNTER_READ_PERMISSIONS
  // (13 permissions).
  R07_SCHEDULER: CLINIC_BOOKING_ENCOUNTER_READ_PERMISSIONS,
  R08_BILLER: ENCOUNTER_READ_PERMISSIONS,
  // R09 Clinic Administrator is the SOLE holder of the
  // `clinic_admin_overview:view` and `appointments:view` permissions,
  // and also receives `appointments:book` for creating appointments
  // via `POST /api/v1/appointments`. The Clinic Admin Overview surface
  // at `/clinic-admin` is the canonical application route for this role
  // (per DESIGN_BIBLE.md §17.1). R09 receives CLINIC_ADMIN_PERMISSIONS
  // (explicit 10 permissions), NOT `PERMISSION_CODES` (which would
  // grant ALL future permissions automatically).
  R09_ADMINISTRATOR: CLINIC_ADMIN_PERMISSIONS,
  R10_COMPLIANCE_OFFICER: ENCOUNTER_READ_PERMISSIONS,
  R11_HR_MANAGER: HUMAN_CONTEXT_PERMISSIONS,
  R12_EXECUTIVE: ENCOUNTER_READ_PERMISSIONS,
  // R13 System Administrator (Platform Super Admin) is explicitly
  // NOT granted `clinic_admin_overview:view`. R13 has a different
  // product surface (Platform Super Admin Overview, DESIGN_BIBLE.md
  // §15/§16). Allowing R13 to view the Clinic Admin Overview would
  // conflate two distinct surfaces and violate Phase 7 item 6 of
  // the live-data task specification. R13 receives
  // HUMAN_CONTEXT_PERMISSIONS (explicit 7 permissions), NOT
  // `PERMISSION_CODES.filter(...)` (which would grant all future
  // permissions except `clinic_admin_overview:view`).
  R13_SYSTEM_ADMINISTRATOR: HUMAN_CONTEXT_PERMISSIONS,
  // R14 Integration Account is denied the interactive workspace
  // context permissions. The integration account is non-human and
  // must not use browser workspace-selection endpoints. A principal
  // holding R14 plus an allowed human role receives the union of
  // permissions (the human role's permissions are not revoked by
  // the presence of R14).
  R14_INTEGRATION_ACCOUNT: [],
} as const;

// ---------------------------------------------------------------------------
// Matrix query functions
// ---------------------------------------------------------------------------

/**
 * Returns the set of permissions granted to a single role. Returns
 * an empty array for an unknown role code (default-deny). The
 * caller is responsible for accumulating permissions across multiple
 * roles via `permissionsForRoles`.
 */
export function permissionsForRole(
  roleCode: string,
): readonly PermissionCode[] {
  if (!isPlatformRoleCode(roleCode)) {
    return [];
  }
  return ROLE_PERMISSION_MATRIX[roleCode];
}

/**
 * Compute the union of permissions granted by a set of role codes.
 *
 * Per PRODUCT_BIBLE.md Section 20.3, when a principal holds multiple
 * roles, allowed permissions accumulate. This function implements
 * the accumulation as a set union.
 *
 * Unknown role codes are silently ignored (they contribute no
 * permissions). This is the default-deny behaviour for unknown
 * roles: an unknown role grants no permissions, but it does not
 * revoke permissions granted by other valid roles held by the same
 * principal.
 *
 * A principal with no roles (or with only unknown roles) receives
 * an empty set — no permissions.
 */
export function permissionsForRoles(
  roleCodes: readonly string[],
): Set<PermissionCode> {
  const result = new Set<PermissionCode>();
  for (const code of roleCodes) {
    for (const permission of permissionsForRole(code)) {
      result.add(permission);
    }
  }
  return result;
}

/**
 * Returns `true` if the supplied set of role codes grants the
 * supplied permission.
 *
 * The function is default-deny:
 * - An empty role set grants nothing.
 * - An unknown role grants nothing.
 * - An unknown permission is granted by nothing.
 * - The supplied permission must be a valid canonical permission
 *   code; an unknown permission string returns `false`.
 */
export function rolesGrantPermission(
  roleCodes: readonly string[],
  permission: string,
): boolean {
  if (!isPermissionCode(permission)) {
    return false;
  }
  const granted = permissionsForRoles(roleCodes);
  return granted.has(permission);
}

/**
 * Returns `true` if every role code in the supplied list is a valid
 * canonical platform role code. Used by the persistence layer to
 * validate inputs before insertion and by the contract layer to
 * validate API responses.
 */
export function areValidRoleCodes(
  roleCodes: readonly string[],
): boolean {
  return roleCodes.every(isPlatformRoleCode);
}

/**
 * Returns the list of canonical platform role codes, for use by
 * tests that verify the matrix's completeness against the catalogue.
 */
export function listPlatformRoleCodes(): readonly PlatformRoleCode[] {
  return PLATFORM_ROLE_CODES;
}
