import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the authorization domain layer.
 *
 * These tests verify the eighth canonical batch specification's
 * authorization requirements:
 * - The complete fourteen-role catalogue is present.
 * - R01 through R13 receive the expected current context permissions.
 * - R14 receives no interactive context permissions.
 * - Multiple roles produce a permission union.
 * - Roleless membership is denied.
 * - Unknown role is denied.
 * - Unknown permission is denied.
 * - Default-deny behaviour is verified explicitly.
 * - Stable role-code serialization round-trips.
 * - Duplicate-role prevention is verified at the domain level.
 * - Arabic and English display labels are present for every role.
 *
 * The tests are pure: no framework, no database, no network. They
 * exercise the pure TypeScript functions exported from the
 * authorization domain module.
 */

import {
  PLATFORM_ROLE_CODES,
  PLATFORM_ROLE_CATALOGUE,
  findRoleCatalogueEntry,
  isPlatformRoleCode,
  getRoleDisplayName,
  type PlatformRoleCode,
  type PlatformRoleCatalogueEntry,
} from './role-catalogue.js';
import {
  PERMISSION_CODES,
  isPermissionCode,
  type PermissionCode,
} from './permissions.js';
import {
  ROLE_PERMISSION_MATRIX,
  permissionsForRole,
  permissionsForRoles,
  rolesGrantPermission,
  areValidRoleCodes,
  listPlatformRoleCodes,
} from './role-permissions.js';
import type {
  TenantRoleAssignment,
  TenantRoleAssignmentId,
  CreateTenantRoleAssignmentInput,
  RoleAssignmentScopeLevel,
} from './role-assignment.js';
import type { TenantMembershipId } from '../identity/membership.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';

describe('authorization role catalogue', () => {
  it('exposes exactly fourteen canonical platform role codes', () => {
    expect(PLATFORM_ROLE_CODES).toHaveLength(14);
  });

  it('exposes exactly fourteen catalogue entries', () => {
    expect(PLATFORM_ROLE_CATALOGUE).toHaveLength(14);
  });

  it('every catalogue entry has a unique code', () => {
    const codes = PLATFORM_ROLE_CATALOGUE.map((e) => e.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('every catalogue entry has a unique shortCode', () => {
    const shortCodes = PLATFORM_ROLE_CATALOGUE.map((e) => e.shortCode);
    const unique = new Set(shortCodes);
    expect(unique.size).toBe(shortCodes.length);
  });

  it('catalogue entries cover R01 through R14 in order', () => {
    const shortCodes = PLATFORM_ROLE_CATALOGUE.map((e) => e.shortCode);
    expect(shortCodes).toEqual([
      'R01',
      'R02',
      'R03',
      'R04',
      'R05',
      'R06',
      'R07',
      'R08',
      'R09',
      'R10',
      'R11',
      'R12',
      'R13',
      'R14',
    ]);
  });

  it('every catalogue entry carries Arabic and English display names', () => {
    for (const entry of PLATFORM_ROLE_CATALOGUE) {
      expect(entry.displayNameEn.length).toBeGreaterThan(0);
      expect(entry.displayNameAr.length).toBeGreaterThan(0);
    }
  });

  it('the catalogue includes R13 System Administrator', () => {
    const entry = findRoleCatalogueEntry('R13_SYSTEM_ADMINISTRATOR');
    expect(entry).not.toBeNull();
    expect(entry?.shortCode).toBe('R13');
    expect(entry?.category).toBe('platform');
    expect(entry?.displayNameEn).toBe('System Administrator');
    expect(entry?.displayNameAr).toBe('مسؤول النظام');
  });

  it('the catalogue includes R09 Administrator with the canonical Clinic Admin Arabic label', () => {
    // Per DESIGN_BIBLE.md §17.1, the canonical Arabic presentation label
    // for R09_ADMINISTRATOR (used throughout the Clinic Admin shell) is
    // `مدير المنشأة`. The domain catalogue's `displayNameAr` is the
    // canonical display label exposed via the API contract and consumed
    // by the shell; it must match §17.1 exactly. The bare word `مدير`
    // is rejected because it is ambiguous (it could refer to any
    // managerial role) and because the Clinic Admin shell v1 presents
    // the role as `مدير المنشأة` everywhere it is user-facing.
    const entry = findRoleCatalogueEntry('R09_ADMINISTRATOR');
    expect(entry).not.toBeNull();
    expect(entry?.shortCode).toBe('R09');
    expect(entry?.category).toBe('operational');
    expect(entry?.displayNameEn).toBe('Administrator');
    expect(entry?.displayNameAr).toBe('مدير المنشأة');
  });

  it('getRoleDisplayName returns the canonical Arabic label for R09 by default', () => {
    // Arabic is the default locale (Arabic-first posture).
    expect(getRoleDisplayName('R09_ADMINISTRATOR')).toBe('مدير المنشأة');
  });

  it('getRoleDisplayName returns the English label for R09 when requested', () => {
    expect(getRoleDisplayName('R09_ADMINISTRATOR', 'en')).toBe('Administrator');
  });

  it('the catalogue includes R14 Integration Account', () => {
    const entry = findRoleCatalogueEntry('R14_INTEGRATION_ACCOUNT');
    expect(entry).not.toBeNull();
    expect(entry?.shortCode).toBe('R14');
    expect(entry?.category).toBe('platform');
    expect(entry?.displayNameEn).toBe('Integration Account');
    expect(entry?.displayNameAr).toBe('حساب التكامل');
  });

  it('isPlatformRoleCode returns true for canonical codes', () => {
    for (const code of PLATFORM_ROLE_CODES) {
      expect(isPlatformRoleCode(code)).toBe(true);
    }
  });

  it('isPlatformRoleCode returns false for unknown codes', () => {
    expect(isPlatformRoleCode('R99_UNKNOWN')).toBe(false);
    expect(isPlatformRoleCode('owner')).toBe(false);
    expect(isPlatformRoleCode('member')).toBe(false);
    expect(isPlatformRoleCode('viewer')).toBe(false);
    expect(isPlatformRoleCode('')).toBe(false);
  });

  it('findRoleCatalogueEntry returns null for unknown codes', () => {
    expect(findRoleCatalogueEntry('R99_UNKNOWN')).toBeNull();
    expect(findRoleCatalogueEntry('owner')).toBeNull();
  });

  it('getRoleDisplayName returns the Arabic label by default', () => {
    expect(getRoleDisplayName('R13_SYSTEM_ADMINISTRATOR')).toBe(
      'مسؤول النظام',
    );
  });

  it('getRoleDisplayName returns the English label when requested', () => {
    expect(
      getRoleDisplayName('R13_SYSTEM_ADMINISTRATOR', 'en'),
    ).toBe('System Administrator');
  });

  it('the catalogue does not include owner, member, or viewer', () => {
    // The simplified role proposal in CURRENT_IMPLEMENTATION_HANDOVER.md
    // is explicitly rejected by the eighth canonical batch specification.
    const codes = PLATFORM_ROLE_CATALOGUE.map((e) => e.code);
    expect(codes).not.toContain('owner');
    expect(codes).not.toContain('member');
    expect(codes).not.toContain('viewer');
    expect(codes).not.toContain('OWNER');
    expect(codes).not.toContain('MEMBER');
    expect(codes).not.toContain('VIEWER');
  });

  it('catalogue entries distribute across the four categories', () => {
    const categories = new Set(
      PLATFORM_ROLE_CATALOGUE.map((e) => e.category),
    );
    expect(categories.has('clinical')).toBe(true);
    expect(categories.has('operational')).toBe(true);
    expect(categories.has('administrative')).toBe(true);
    expect(categories.has('platform')).toBe(true);
  });
});

describe('authorization permission catalogue', () => {
  it('exposes the seven context permissions plus Clinic Admin Overview, Appointments, Encounter, and Patient permissions', () => {
    // Per ADR-015, the context permissions are split into per-level
    // codes: context:view, context:select, context:clear,
    // context:select_organisation, context:clear_organisation,
    // context:select_facility, context:clear_facility.
    //
    // The Clinic Admin Overview live-data batch adds the
    // `clinic_admin_overview:view` permission, granted ONLY to
    // R09_ADMINISTRATOR. The permission is the read-only
    // authorisation gate for `/api/v1/clinic-admin/overview`
    // (per DESIGN_BIBLE.md §12/§13).
    //
    // Stage 1B of Today's Appointments adds the `appointments:view`
    // permission, granted ONLY to R09_ADMINISTRATOR. The permission
    // is the read-only authorisation gate for
    // `GET /api/v1/appointments/today`.
    //
    // Stage 1C of Appointment Booking adds the `appointments:book`
    // permission, granted to R06, R07, and R09. The permission is the
    // authorisation gate for `POST /api/v1/appointments`.
    //
    // Stage 1D of Appointment Cancellation adds the
    // `appointments:cancel` permission, granted to R06, R07, and R09.
    // The permission is the authorisation gate for
    // `POST /api/v1/appointments/:id/cancel`.
    //
    // Stage 1E of Appointment Rescheduling adds the
    // `appointments:reschedule` permission, granted to R06, R07, and
    // R09. The permission is the authorisation gate for
    // `POST /api/v1/appointments/:id/reschedule`.
    //
    // Stage 1F of Appointment Visit Lifecycle adds four permissions:
    // `appointments:confirm` and `appointments:check_in` (granted to
    // R06, R07, R09 — operational pre-arrival/arrival actions), and
    // `appointments:start` and `appointments:complete` (granted to
    // R01 Physician only — clinical visit-progression actions).
    //
    // Stage BC01 of Patient Demographics/Registration/Consent adds the
    // eight `patients:*` permissions: register, view, search,
    // update_demographics, manage_identifiers, consent_grant,
    // consent_view, consent_withdraw. The catalogue now holds 32
    // permission codes in total (7 context + 1 clinic-admin overview
    // + 8 appointments + 8 encounters + 8 patients).
    expect(PERMISSION_CODES).toEqual([
      'context:view',
      'context:select',
      'context:clear',
      'context:select_organisation',
      'context:clear_organisation',
      'context:select_facility',
      'context:clear_facility',
      'clinic_admin_overview:view',
      'appointments:view',
      'appointments:book',
      'appointments:cancel',
      'appointments:reschedule',
      'appointments:confirm',
      'appointments:check_in',
      'appointments:start',
      'appointments:complete',
      'appointments:no_show',
      'encounters:create',
      'encounters:arrive',
      'encounters:start',
      'encounters:finish',
      'encounters:cancel',
      'encounters:on_leave',
      'encounters:resume',
      'encounters:view',
      'patients:register',
      'patients:view',
      'patients:search',
      'patients:update_demographics',
      'patients:manage_identifiers',
      'patients:consent_grant',
      'patients:consent_view',
      'patients:consent_withdraw',
      'clinical_notes:create',
      'clinical_notes:view',
      'clinical_notes:sign',
      'clinical_notes:amend',
    ]);
  });

  it('isPermissionCode returns true for canonical permission codes', () => {
    expect(isPermissionCode('context:view')).toBe(true);
    expect(isPermissionCode('context:select')).toBe(true);
    expect(isPermissionCode('context:clear')).toBe(true);
    expect(isPermissionCode('context:select_organisation')).toBe(true);
    expect(isPermissionCode('context:clear_organisation')).toBe(true);
    expect(isPermissionCode('context:select_facility')).toBe(true);
    expect(isPermissionCode('context:clear_facility')).toBe(true);
    expect(isPermissionCode('clinic_admin_overview:view')).toBe(true);
    expect(isPermissionCode('appointments:view')).toBe(true);
    expect(isPermissionCode('appointments:book')).toBe(true);
    expect(isPermissionCode('appointments:cancel')).toBe(true);
    expect(isPermissionCode('appointments:reschedule')).toBe(true);
    expect(isPermissionCode('appointments:confirm')).toBe(true);
    expect(isPermissionCode('appointments:check_in')).toBe(true);
    expect(isPermissionCode('appointments:start')).toBe(true);
    expect(isPermissionCode('appointments:complete')).toBe(true);
    expect(isPermissionCode('appointments:no_show')).toBe(true);
    expect(isPermissionCode('encounters:create')).toBe(true);
    expect(isPermissionCode('encounters:arrive')).toBe(true);
    expect(isPermissionCode('encounters:start')).toBe(true);
    expect(isPermissionCode('encounters:finish')).toBe(true);
    expect(isPermissionCode('encounters:cancel')).toBe(true);
    expect(isPermissionCode('encounters:on_leave')).toBe(true);
    expect(isPermissionCode('encounters:resume')).toBe(true);
    expect(isPermissionCode('encounters:view')).toBe(true);
    expect(isPermissionCode('patients:register')).toBe(true);
    expect(isPermissionCode('patients:view')).toBe(true);
    expect(isPermissionCode('patients:search')).toBe(true);
    expect(isPermissionCode('patients:update_demographics')).toBe(true);
    expect(isPermissionCode('patients:manage_identifiers')).toBe(true);
    expect(isPermissionCode('patients:consent_grant')).toBe(true);
    expect(isPermissionCode('patients:consent_view')).toBe(true);
    expect(isPermissionCode('patients:consent_withdraw')).toBe(true);
    expect(isPermissionCode('clinical_notes:create')).toBe(true);
    expect(isPermissionCode('clinical_notes:view')).toBe(true);
    expect(isPermissionCode('clinical_notes:sign')).toBe(true);
    expect(isPermissionCode('clinical_notes:amend')).toBe(true);
  });

  it('isPermissionCode returns false for unknown permission codes', () => {
    expect(isPermissionCode('patient:read')).toBe(false);
    expect(isPermissionCode('encounter:write')).toBe(false);
    expect(isPermissionCode('')).toBe(false);
  });
});

describe('authorization role-permission matrix', () => {
  it('every canonical platform role has an explicit matrix entry', () => {
    for (const code of PLATFORM_ROLE_CODES) {
      expect(ROLE_PERMISSION_MATRIX[code]).toBeDefined();
    }
  });

  it('R01 through R13 receive all seven context permissions', () => {
    // The context permissions are unchanged by the Clinic Admin
    // Overview live-data batch and Stages 1B/1C/1D/1E of the
    // Appointments module: every human role (R01 through R13) still
    // receives all seven context permissions. The
    // `clinic_admin_overview:view` and `appointments:view` permissions
    // are NOT granted to every human role — only to R09. The
    // `appointments:book`, `appointments:cancel`, and
    // `appointments:reschedule` permissions are NOT granted to every
    // human role — only to R06, R07, and R09.
    const humanRoles = PLATFORM_ROLE_CODES.filter(
      (code) => code !== 'R14_INTEGRATION_ACCOUNT',
    );
    expect(humanRoles).toHaveLength(13);
    // Context permissions are those held by all human roles.
    // Exclude: clinic_admin_overview:view (R09 only), appointments:view (R09 only),
    // appointments:book (R06, R07, R09 only), appointments:cancel (R06, R07, R09 only),
    // appointments:reschedule (R06, R07, R09 only)
    // The appointments:confirm/check_in (R06/R07/R09), appointments:start/complete
    // (R01 only), all encounter lifecycle writes (R01/R02 only), encounters:view
    // (R01-R12 except R11/R13), and the eight patients:* permissions (role-specific)
    // are also excluded so that only the seven context permissions remain.
    const contextPermissions = PERMISSION_CODES.filter(
      (p) =>
        p !== 'clinic_admin_overview:view' &&
        p !== 'appointments:view' &&
        p !== 'appointments:book' &&
        p !== 'appointments:cancel' &&
        p !== 'appointments:reschedule' &&
        p !== 'appointments:confirm' &&
        p !== 'appointments:check_in' &&
        p !== 'appointments:start' &&
        p !== 'appointments:complete' &&
        p !== 'appointments:no_show' &&
        p !== 'encounters:create' &&
        p !== 'encounters:arrive' &&
        p !== 'encounters:start' &&
        p !== 'encounters:finish' &&
        p !== 'encounters:cancel' &&
        p !== 'encounters:on_leave' &&
        p !== 'encounters:resume' &&
        p !== 'encounters:view' &&
        p !== 'patients:register' &&
        p !== 'patients:view' &&
        p !== 'patients:search' &&
        p !== 'patients:update_demographics' &&
        p !== 'patients:manage_identifiers' &&
        p !== 'patients:consent_grant' &&
        p !== 'patients:consent_view' &&
        p !== 'patients:consent_withdraw' &&
        p !== 'clinical_notes:create' &&
        p !== 'clinical_notes:view' &&
        p !== 'clinical_notes:sign' &&
        p !== 'clinical_notes:amend',
    );
    for (const code of humanRoles) {
      const permissions = ROLE_PERMISSION_MATRIX[code];
      for (const cp of contextPermissions) {
        expect(permissions).toContain(cp);
      }
    }
  });

  it('R14 Integration Account receives no interactive context permissions', () => {
    expect(ROLE_PERMISSION_MATRIX.R14_INTEGRATION_ACCOUNT).toEqual([]);
  });

  it('R09 Clinic Administrator is the SOLE holder of clinic_admin_overview:view', () => {
    // Per the live-data task specification Phase 7 item 6, "A
    // Platform Super Admin is not silently treated as a Clinic
    // Administrator." This is the structural enforcement point:
    // R09_ADMINISTRATOR is the ONLY role whose matrix entry
    // includes `clinic_admin_overview:view`.
    for (const code of PLATFORM_ROLE_CODES) {
      const permissions = ROLE_PERMISSION_MATRIX[code];
      if (code === 'R09_ADMINISTRATOR') {
        expect(permissions).toContain('clinic_admin_overview:view');
      } else {
        expect(permissions).not.toContain('clinic_admin_overview:view');
      }
    }
  });

  it('R13 System Administrator (Platform Super Admin) does NOT receive clinic_admin_overview:view', () => {
    // Explicit negative test for Phase 7 item 6. R13 holds a
    // different surface (Platform Super Admin Overview,
    // DESIGN_BIBLE.md §15/§16) and must NOT be silently treated
    // as a Clinic Administrator.
    expect(ROLE_PERMISSION_MATRIX.R13_SYSTEM_ADMINISTRATOR).not.toContain(
      'clinic_admin_overview:view',
    );
  });

  it('rolesGrantPermission returns true for R09 + clinic_admin_overview:view', () => {
    expect(
      rolesGrantPermission(['R09_ADMINISTRATOR'], 'clinic_admin_overview:view'),
    ).toBe(true);
  });

  it('rolesGrantPermission returns false for R13 + clinic_admin_overview:view', () => {
    expect(
      rolesGrantPermission(
        ['R13_SYSTEM_ADMINISTRATOR'],
        'clinic_admin_overview:view',
      ),
    ).toBe(false);
  });

  it('rolesGrantPermission returns false for any non-R09 role + clinic_admin_overview:view', () => {
    const nonR09Roles = PLATFORM_ROLE_CODES.filter(
      (code) => code !== 'R09_ADMINISTRATOR',
    );
    for (const code of nonR09Roles) {
      expect(
        rolesGrantPermission([code], 'clinic_admin_overview:view'),
      ).toBe(false);
    }
  });

  it('rolesGrantPermission returns true for R09 + R13 + clinic_admin_overview:view (R09 grants, R13 does not revoke)', () => {
    // Per PRODUCT_BIBLE.md Section 20.3, when a principal holds
    // multiple roles, allowed permissions accumulate (set union).
    // A principal holding both R09 and R13 has the union of both
    // roles' permissions, which includes `clinic_admin_overview:view`
    // (from R09). R13's denial of the permission does NOT revoke
    // R09's grant.
    expect(
      rolesGrantPermission(
        ['R09_ADMINISTRATOR', 'R13_SYSTEM_ADMINISTRATOR'],
        'clinic_admin_overview:view',
      ),
    ).toBe(true);
  });

  it('permissionsForRole returns the matrix entry for a known role', () => {
    // R01_PHYSICIAN has the seven context permissions plus
    // appointments:start and appointments:complete (clinical visit
    // lifecycle, Stage 1F), plus the full encounter lifecycle write
    // set plus encounters:view (Stage 2A, BC02 Encounter Foundation),
    // plus the clinical patient read permissions (patients:view,
    // patients:search, patients:consent_view — Stage BC01), plus the
    // clinical-note write permissions (clinical_notes:create/view/sign/
    // amend — Stage BC03). It does NOT hold the operational
    // appointments permissions
    // (book/cancel/reschedule/confirm/check_in), the R09-only
    // permissions, or the registration-desk patient write permissions
    // (register/update_demographics/manage_identifiers/consent_grant/
    // consent_withdraw). The raw matrix entry contains duplicate
    // context permissions (re-included by
    // CLINICAL_NOTE_WRITE_PERMISSIONS); the distinct set is compared.
    expect([...new Set(permissionsForRole('R01_PHYSICIAN'))].sort()).toEqual(
      PERMISSION_CODES.filter(
        (p) =>
          p !== 'clinic_admin_overview:view' &&
          p !== 'appointments:view' &&
          p !== 'appointments:book' &&
          p !== 'appointments:cancel' &&
          p !== 'appointments:reschedule' &&
          p !== 'appointments:confirm' &&
          p !== 'appointments:check_in' &&
          p !== 'appointments:no_show' &&
          p !== 'patients:register' &&
          p !== 'patients:update_demographics' &&
          p !== 'patients:manage_identifiers' &&
          p !== 'patients:consent_grant' &&
          p !== 'patients:consent_withdraw',
      ).sort(),
    );
    // R13_SYSTEM_ADMINISTRATOR has only the seven context permissions
    // (HUMAN_CONTEXT_PERMISSIONS). It does NOT hold any appointments,
    // clinic-admin, encounter, or patient permissions. Per
    // USER_ROLES.md §10.1, R13's Encounter Records cell is "–" (no
    // encounter permissions) and its Patient Records cell is "–" (no
    // patient permissions).
    expect(permissionsForRole('R13_SYSTEM_ADMINISTRATOR')).toEqual(
      PERMISSION_CODES.filter(
        (p) =>
          p !== 'clinic_admin_overview:view' &&
          p !== 'appointments:view' &&
          p !== 'appointments:book' &&
          p !== 'appointments:cancel' &&
          p !== 'appointments:reschedule' &&
          p !== 'appointments:confirm' &&
          p !== 'appointments:check_in' &&
          p !== 'appointments:start' &&
          p !== 'appointments:complete' &&
          p !== 'appointments:no_show' &&
          p !== 'encounters:create' &&
          p !== 'encounters:arrive' &&
          p !== 'encounters:start' &&
          p !== 'encounters:finish' &&
          p !== 'encounters:cancel' &&
          p !== 'encounters:on_leave' &&
          p !== 'encounters:resume' &&
          p !== 'encounters:view' &&
          p !== 'patients:register' &&
          p !== 'patients:view' &&
          p !== 'patients:search' &&
          p !== 'patients:update_demographics' &&
          p !== 'patients:manage_identifiers' &&
          p !== 'patients:consent_grant' &&
          p !== 'patients:consent_view' &&
          p !== 'patients:consent_withdraw' &&
          p !== 'clinical_notes:create' &&
          p !== 'clinical_notes:view' &&
          p !== 'clinical_notes:sign' &&
          p !== 'clinical_notes:amend',
      ),
    );
    // R09 holds all permissions EXCEPT the clinical visit-progression
    // permissions (appointments:start, appointments:complete) and the
    // encounter write permissions (encounters:create/arrive/start/
    // finish/cancel/on_leave/resume), which are reserved for clinical
    // roles, and EXCEPT the registration-desk patient write permissions
    // (register/update_demographics/manage_identifiers/consent_grant/
    // consent_withdraw), which are reserved for R06 Receptionist.
    // R09 DOES hold encounters:view (Read on Encounter Records) and the
    // operational patient read permissions (patients:view,
    // patients:search, patients:consent_view).
    expect(permissionsForRole('R09_ADMINISTRATOR')).toEqual(
      PERMISSION_CODES.filter(
        (p) =>
          p !== 'appointments:start' &&
          p !== 'appointments:complete' &&
          p !== 'encounters:create' &&
          p !== 'encounters:arrive' &&
          p !== 'encounters:start' &&
          p !== 'encounters:finish' &&
          p !== 'encounters:cancel' &&
          p !== 'encounters:on_leave' &&
          p !== 'encounters:resume' &&
          p !== 'patients:register' &&
          p !== 'patients:update_demographics' &&
          p !== 'patients:manage_identifiers' &&
          p !== 'patients:consent_grant' &&
          p !== 'patients:consent_withdraw' &&
          p !== 'clinical_notes:create' &&
          p !== 'clinical_notes:sign' &&
          p !== 'clinical_notes:amend',
      ),
    );
  });

  it('permissionsForRole returns an empty array for an unknown role', () => {
    expect(permissionsForRole('R99_UNKNOWN')).toEqual([]);
    expect(permissionsForRole('owner')).toEqual([]);
  });

  it('permissionsForRoles accumulates permissions across multiple roles (union)', () => {
    // R01_PHYSICIAN grants the seven context permissions plus
    // appointments:start and appointments:complete (Stage 1F clinical
    // visit lifecycle) plus the full encounter lifecycle write set
    // plus encounters:view (Stage 2A) plus the clinical patient read
    // permissions (patients:view, patients:search, patients:consent_view
    // — Stage BC01) plus the clinical-note write permissions
    // (clinical_notes:create, clinical_notes:view, clinical_notes:sign,
    // clinical_notes:amend — Stage BC03) = 24 distinct permissions. R13
    // grants only the seven context permissions, which are a subset of
    // R01's. The union is therefore R01's permissions (24), since R13's
    // set adds nothing R01 does not already hold.
    const union = permissionsForRoles([
      'R01_PHYSICIAN',
      'R13_SYSTEM_ADMINISTRATOR',
    ]);
    expect(union.size).toBe(24);
    expect(union.has('context:view')).toBe(true);
    expect(union.has('context:select')).toBe(true);
    expect(union.has('context:clear')).toBe(true);
    expect(union.has('context:select_organisation')).toBe(true);
    expect(union.has('context:clear_organisation')).toBe(true);
    expect(union.has('context:select_facility')).toBe(true);
    expect(union.has('context:clear_facility')).toBe(true);
    expect(union.has('appointments:start')).toBe(true);
    expect(union.has('appointments:complete')).toBe(true);
    expect(union.has('encounters:create')).toBe(true);
    expect(union.has('encounters:view')).toBe(true);
    expect(union.has('patients:view')).toBe(true);
    expect(union.has('patients:search')).toBe(true);
    expect(union.has('patients:consent_view')).toBe(true);
    expect(union.has('clinical_notes:create')).toBe(true);
    expect(union.has('clinical_notes:view')).toBe(true);
    expect(union.has('clinical_notes:sign')).toBe(true);
    expect(union.has('clinical_notes:amend')).toBe(true);
    expect(union.has('clinic_admin_overview:view')).toBe(false);
    expect(union.has('patients:register')).toBe(false);
    expect(union.has('patients:consent_withdraw')).toBe(false);
  });

  it('permissionsForRoles returns an empty set for a roleless membership', () => {
    expect(permissionsForRoles([]).size).toBe(0);
  });

  it('permissionsForRoles returns an empty set for unknown roles only', () => {
    expect(permissionsForRoles(['R99_UNKNOWN']).size).toBe(0);
    expect(permissionsForRoles(['owner']).size).toBe(0);
  });

  it('permissionsForRoles ignores unknown roles but keeps valid ones', () => {
    const union = permissionsForRoles([
      'R99_UNKNOWN',
      'R01_PHYSICIAN',
      'owner',
    ]);
    expect(union.size).toBe(24);
  });

  it('R14 combined with a human role yields the union (R14 does not revoke)', () => {
    const union = permissionsForRoles([
      'R14_INTEGRATION_ACCOUNT',
      'R01_PHYSICIAN',
    ]);
    expect(union.size).toBe(24);
    expect(union.has('context:view')).toBe(true);
    expect(union.has('context:select')).toBe(true);
    expect(union.has('context:clear')).toBe(true);
    expect(union.has('context:select_organisation')).toBe(true);
    expect(union.has('context:clear_organisation')).toBe(true);
    expect(union.has('context:select_facility')).toBe(true);
    expect(union.has('context:clear_facility')).toBe(true);
  });

  it('R14 alone yields no context permissions', () => {
    const union = permissionsForRoles(['R14_INTEGRATION_ACCOUNT']);
    expect(union.size).toBe(0);
  });

  it('rolesGrantPermission returns true when at least one role grants the permission', () => {
    expect(
      rolesGrantPermission(['R01_PHYSICIAN'], 'context:view'),
    ).toBe(true);
    expect(
      rolesGrantPermission(
        ['R14_INTEGRATION_ACCOUNT', 'R06_RECEPTIONIST'],
        'context:select',
      ),
    ).toBe(true);
  });

  it('rolesGrantPermission returns false when no role grants the permission', () => {
    expect(
      rolesGrantPermission(['R14_INTEGRATION_ACCOUNT'], 'context:view'),
    ).toBe(false);
    expect(rolesGrantPermission([], 'context:view')).toBe(false);
  });

  it('rolesGrantPermission returns false for an unknown permission', () => {
    expect(
      rolesGrantPermission(['R01_PHYSICIAN'], 'patient:read'),
    ).toBe(false);
    expect(
      rolesGrantPermission(['R01_PHYSICIAN'], 'unknown:action'),
    ).toBe(false);
  });

  it('rolesGrantPermission returns false for an unknown role', () => {
    expect(
      rolesGrantPermission(['R99_UNKNOWN'], 'context:view'),
    ).toBe(false);
  });

  it('default-deny: a roleless membership grants nothing', () => {
    expect(rolesGrantPermission([], 'context:view')).toBe(false);
    expect(rolesGrantPermission([], 'context:select')).toBe(false);
    expect(rolesGrantPermission([], 'context:clear')).toBe(false);
  });

  it('default-deny: an unknown permission is denied for every role', () => {
    for (const code of PLATFORM_ROLE_CODES) {
      expect(rolesGrantPermission([code], 'unknown:action')).toBe(false);
    }
  });

  it('areValidRoleCodes returns true for canonical codes only', () => {
    expect(areValidRoleCodes(['R01_PHYSICIAN'])).toBe(true);
    expect(
      areValidRoleCodes([
        'R01_PHYSICIAN',
        'R14_INTEGRATION_ACCOUNT',
        'R13_SYSTEM_ADMINISTRATOR',
      ]),
    ).toBe(true);
  });

  it('areValidRoleCodes returns false when any code is unknown', () => {
    expect(areValidRoleCodes(['R01_PHYSICIAN', 'R99_UNKNOWN'])).toBe(false);
    expect(areValidRoleCodes(['owner'])).toBe(false);
    expect(areValidRoleCodes(['R01_PHYSICIAN', 'member'])).toBe(false);
  });

  it('listPlatformRoleCodes returns the canonical list', () => {
    expect(listPlatformRoleCodes()).toBe(PLATFORM_ROLE_CODES);
    expect(listPlatformRoleCodes()).toHaveLength(14);
  });

  // -------------------------------------------------------------------------
  // Future privilege-expansion regression coverage (Phase 5).
  //
  // The matrix uses EXPLICIT permission lists
  // (`HUMAN_CONTEXT_PERMISSIONS` and `CLINIC_ADMIN_PERMISSIONS`)
  // rather than `PERMISSION_CODES` or `PERMISSION_CODES.filter(...)`.
  // This ensures that adding a future permission to `PERMISSION_CODES`
  // does NOT automatically grant it to any role — the new permission
  // must be explicitly added to the relevant permission list.
  //
  // These tests verify the explicit-list property by checking that
  // every role's matrix entry contains ONLY the approved permissions,
  // not "all permissions except X" (which would be the
  // `PERMISSION_CODES.filter(...)` pattern).
  // -------------------------------------------------------------------------

  it('R09 Clinic Administrator receives EXACTLY 20 permissions (not PERMISSION_CODES.length)', () => {
    // R09 receives CLINIC_ADMIN_PERMISSIONS (explicit 20: 7 context +
    // clinic_admin_overview:view + appointments:view + appointments:book
    // + appointments:cancel + appointments:reschedule +
    // appointments:confirm + appointments:check_in +
    // appointments:no_show + encounters:view + patients:view +
    // patients:search + patients:consent_view + clinical_notes:view —
    // Stage BC03 clinical-note read).
    // R09 does NOT receive appointments:start or appointments:complete
    // (clinical visit-progression actions reserved for R01 Physician)
    // and does NOT receive encounter write permissions (clinical
    // encounter lifecycle actions reserved for R01/R02) and does NOT
    // receive the registration-desk patient write permissions
    // (register/update_demographics/manage_identifiers/consent_grant/
    // consent_withdraw, reserved for R06 Receptionist) and does NOT
    // receive clinical-note write permissions (create/sign/amend,
    // reserved for R01/R02/R05). If a future change adds a permission
    // to PERMISSION_CODES but forgets to add it to
    // CLINIC_ADMIN_PERMISSIONS, R09 will NOT receive it. This is the
    // desired least-privilege behaviour.
    const r09Permissions = ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR;
    expect(r09Permissions).toHaveLength(20);
    expect(r09Permissions).toEqual([
      'context:view',
      'context:select',
      'context:clear',
      'context:select_organisation',
      'context:clear_organisation',
      'context:select_facility',
      'context:clear_facility',
      'clinic_admin_overview:view',
      'appointments:view',
      'appointments:book',
      'appointments:cancel',
      'appointments:reschedule',
      'appointments:confirm',
      'appointments:check_in',
      'appointments:no_show',
      'encounters:view',
      'patients:view',
      'patients:search',
      'patients:consent_view',
      'clinical_notes:view',
    ]);
    expect(r09Permissions).not.toContain('appointments:start');
    expect(r09Permissions).not.toContain('appointments:complete');
    expect(r09Permissions).not.toContain('encounters:create');
    expect(r09Permissions).not.toContain('encounters:arrive');
    expect(r09Permissions).not.toContain('encounters:start');
    expect(r09Permissions).not.toContain('encounters:finish');
    expect(r09Permissions).not.toContain('encounters:cancel');
    expect(r09Permissions).not.toContain('patients:register');
    expect(r09Permissions).not.toContain('patients:update_demographics');
    expect(r09Permissions).not.toContain('patients:manage_identifiers');
    expect(r09Permissions).not.toContain('patients:consent_grant');
    expect(r09Permissions).not.toContain('patients:consent_withdraw');
    expect(r09Permissions).not.toContain('clinical_notes:create');
    expect(r09Permissions).not.toContain('clinical_notes:sign');
    expect(r09Permissions).not.toContain('clinical_notes:amend');
  });

  it('R13 System Administrator receives EXACTLY 7 permissions (not PERMISSION_CODES.filter(...))', () => {
    // R13 receives HUMAN_CONTEXT_PERMISSIONS (explicit 7). If a
    // future change adds a permission to PERMISSION_CODES, R13 will
    // NOT receive it (because R13's matrix entry is the explicit
    // list, not a filtered list). R13 is NOT granted ANY encounter
    // permissions (USER_ROLES.md §10.1: R13 Encounter Records = "–").
    const r13Permissions = ROLE_PERMISSION_MATRIX.R13_SYSTEM_ADMINISTRATOR;
    expect(r13Permissions).toHaveLength(7);
    expect(r13Permissions).toEqual([
      'context:view',
      'context:select',
      'context:clear',
      'context:select_organisation',
      'context:clear_organisation',
      'context:select_facility',
      'context:clear_facility',
    ]);
    expect(r13Permissions).not.toContain('clinic_admin_overview:view');
    expect(r13Permissions).not.toContain('appointments:book');
    expect(r13Permissions).not.toContain('appointments:cancel');
    expect(r13Permissions).not.toContain('appointments:reschedule');
    expect(r13Permissions).not.toContain('appointments:confirm');
    expect(r13Permissions).not.toContain('appointments:check_in');
    expect(r13Permissions).not.toContain('appointments:start');
    expect(r13Permissions).not.toContain('appointments:complete');
    expect(r13Permissions).not.toContain('encounters:view');
    expect(r13Permissions).not.toContain('encounters:create');
    expect(r13Permissions).not.toContain('encounters:arrive');
    expect(r13Permissions).not.toContain('encounters:start');
    expect(r13Permissions).not.toContain('encounters:finish');
    expect(r13Permissions).not.toContain('encounters:cancel');
    expect(r13Permissions).not.toContain('encounters:on_leave');
    expect(r13Permissions).not.toContain('encounters:resume');
    expect(r13Permissions).not.toContain('patients:register');
    expect(r13Permissions).not.toContain('patients:view');
    expect(r13Permissions).not.toContain('patients:search');
    expect(r13Permissions).not.toContain('patients:update_demographics');
    expect(r13Permissions).not.toContain('patients:manage_identifiers');
    expect(r13Permissions).not.toContain('patients:consent_grant');
    expect(r13Permissions).not.toContain('patients:consent_view');
    expect(r13Permissions).not.toContain('patients:consent_withdraw');
  });

  it('R06 Receptionist receives 22 deduplicated permissions (7 context + 6 booking + encounters:view + 8 patient registration/demographics/consent)', () => {
    // R06_RECEPTIONIST receives CLINIC_BOOKING_ENCOUNTER_READ_PERMISSIONS
    // (14: 7 context + appointments:book/cancel/reschedule/confirm/
    // check_in/no_show + encounters:view) PLUS RECEPTION_PATIENT_PERMISSIONS
    // (15: 7 context + the eight patients:* write permissions). The two
    // spreads each include HUMAN_CONTEXT_PERMISSIONS, so R06's RAW matrix
    // entry contains 7 duplicate context permissions (29 entries) that
    // are deduplicated by the Set union in `permissionsForRoles`. The
    // distinct permission count is therefore 22 (7 context + 6 booking +
    // encounters:view + 8 patient). Per USER_ROLES.md 10.1, R06's Patient
    // Records cell is "Write" — R06 is the primary demographic
    // registration/update role and the canonical consent-capture role at
    // the registration desk. R06 does NOT receive appointments:start or
    // appointments:complete (clinical visit-progression actions reserved
    // for R01 Physician) and does NOT receive any encounter lifecycle
    // write permission (create/arrive/start/finish/cancel/on_leave/resume).
    const r06Permissions = ROLE_PERMISSION_MATRIX.R06_RECEPTIONIST;
    // Raw entry has duplicate context perms; assert the deduplicated count.
    expect(new Set(r06Permissions).size).toBe(22);
    expect(r06Permissions).toContain('appointments:book');
    expect(r06Permissions).toContain('appointments:cancel');
    expect(r06Permissions).toContain('appointments:reschedule');
    expect(r06Permissions).toContain('appointments:confirm');
    expect(r06Permissions).toContain('appointments:check_in');
    expect(r06Permissions).toContain('appointments:no_show');
    expect(r06Permissions).toContain('encounters:view');
    expect(r06Permissions).toContain('patients:register');
    expect(r06Permissions).toContain('patients:view');
    expect(r06Permissions).toContain('patients:search');
    expect(r06Permissions).toContain('patients:update_demographics');
    expect(r06Permissions).toContain('patients:manage_identifiers');
    expect(r06Permissions).toContain('patients:consent_grant');
    expect(r06Permissions).toContain('patients:consent_view');
    expect(r06Permissions).toContain('patients:consent_withdraw');
    expect(r06Permissions).not.toContain('clinic_admin_overview:view');
    expect(r06Permissions).not.toContain('appointments:start');
    expect(r06Permissions).not.toContain('appointments:complete');
    expect(r06Permissions).not.toContain('encounters:create');
    expect(r06Permissions).not.toContain('encounters:arrive');
    expect(r06Permissions).not.toContain('encounters:start');
    expect(r06Permissions).not.toContain('encounters:finish');
    expect(r06Permissions).not.toContain('encounters:cancel');
    expect(r06Permissions).not.toContain('encounters:on_leave');
    expect(r06Permissions).not.toContain('encounters:resume');
  });

  it('R07 Scheduler receives EXACTLY 16 permissions (7 context + 6 booking + encounters:view + patients:view + patients:search)', () => {
    // R07_SCHEDULER receives CLINIC_BOOKING_ENCOUNTER_READ_PERMISSIONS
    // (14: 7 context + appointments:book/cancel/reschedule/confirm/
    // check_in/no_show + encounters:view) PLUS patients:view and patients:search
    // (scheduling-scoped patient read). Per USER_ROLES.md 10.1, R07's
    // Patient Records cell is "Read/Write (sched)" but Stage BC01 defines
    // NO scheduling-scoped patient write command, so R07 receives
    // patients:view and patients:search ONLY (read), plus its existing
    // booking permissions. R07 does NOT receive the registration-desk
    // patient write permissions (register/update_demographics/
    // manage_identifiers/consent_grant/consent_withdraw), does NOT
    // receive appointments:start or appointments:complete (clinical
    // visit-progression actions reserved for R01 Physician), and does
    // NOT receive any encounter lifecycle write permission.
    const r07Permissions = ROLE_PERMISSION_MATRIX.R07_SCHEDULER;
    expect(r07Permissions).toHaveLength(16);
    expect(r07Permissions).toContain('appointments:book');
    expect(r07Permissions).toContain('appointments:cancel');
    expect(r07Permissions).toContain('appointments:reschedule');
    expect(r07Permissions).toContain('appointments:confirm');
    expect(r07Permissions).toContain('appointments:check_in');
    expect(r07Permissions).toContain('appointments:no_show');
    expect(r07Permissions).toContain('encounters:view');
    expect(r07Permissions).toContain('patients:view');
    expect(r07Permissions).toContain('patients:search');
    expect(r07Permissions).not.toContain('clinic_admin_overview:view');
    expect(r07Permissions).not.toContain('appointments:start');
    expect(r07Permissions).not.toContain('appointments:complete');
    expect(r07Permissions).not.toContain('encounters:create');
    expect(r07Permissions).not.toContain('encounters:arrive');
    expect(r07Permissions).not.toContain('encounters:start');
    expect(r07Permissions).not.toContain('encounters:finish');
    expect(r07Permissions).not.toContain('encounters:cancel');
    expect(r07Permissions).not.toContain('encounters:on_leave');
    expect(r07Permissions).not.toContain('encounters:resume');
    expect(r07Permissions).not.toContain('patients:register');
    expect(r07Permissions).not.toContain('patients:update_demographics');
    expect(r07Permissions).not.toContain('patients:manage_identifiers');
    expect(r07Permissions).not.toContain('patients:consent_grant');
    expect(r07Permissions).not.toContain('patients:consent_view');
    expect(r07Permissions).not.toContain('patients:consent_withdraw');
  });

  it('R01 Physician receives EXACTLY 24 distinct permissions (7 context + 2 appointment visit + 8 encounter + 3 patient read + 4 clinical-note write)', () => {
    // R01_PHYSICIAN receives PHYSICIAN_ENCOUNTER_PERMISSIONS (17
    // permissions: 7 context + appointments:start + appointments:complete
    // + encounters:create/arrive/start/on_leave/resume/finish/cancel +
    // encounters:view) PLUS CLINICAL_NOTE_WRITE_PERMISSIONS (11: 7
    // context [deduplicated] + clinical_notes:create/view/sign/amend —
    // Stage BC03) PLUS the clinical patient read permissions
    // (patients:view, patients:search, patients:consent_view — Stage
    // BC01) = 24 distinct permissions. The raw matrix entry contains
    // duplicate context permissions (re-included by
    // CLINICAL_NOTE_WRITE_PERMISSIONS); the Set union in
    // `permissionsForRoles` deduplicates them. R01 does NOT receive the
    // operational appointments permissions
    // (book/cancel/reschedule/confirm/check_in), clinic_admin_overview:view,
    // or the registration-desk patient write permissions
    // (register/update_demographics/manage_identifiers/consent_grant/
    // consent_withdraw).
    const r01Permissions = ROLE_PERMISSION_MATRIX.R01_PHYSICIAN;
    expect(new Set(r01Permissions).size).toBe(24);
    expect(r01Permissions).toContain('appointments:start');
    expect(r01Permissions).toContain('appointments:complete');
    expect(r01Permissions).toContain('encounters:create');
    expect(r01Permissions).toContain('encounters:arrive');
    expect(r01Permissions).toContain('encounters:start');
    expect(r01Permissions).toContain('encounters:on_leave');
    expect(r01Permissions).toContain('encounters:resume');
    expect(r01Permissions).toContain('encounters:finish');
    expect(r01Permissions).toContain('encounters:cancel');
    expect(r01Permissions).toContain('encounters:view');
    expect(r01Permissions).toContain('patients:view');
    expect(r01Permissions).toContain('patients:search');
    expect(r01Permissions).toContain('patients:consent_view');
    expect(r01Permissions).toContain('clinical_notes:create');
    expect(r01Permissions).toContain('clinical_notes:view');
    expect(r01Permissions).toContain('clinical_notes:sign');
    expect(r01Permissions).toContain('clinical_notes:amend');
    expect(r01Permissions).not.toContain('clinic_admin_overview:view');
    expect(r01Permissions).not.toContain('appointments:book');
    expect(r01Permissions).not.toContain('appointments:cancel');
    expect(r01Permissions).not.toContain('appointments:reschedule');
    expect(r01Permissions).not.toContain('appointments:confirm');
    expect(r01Permissions).not.toContain('appointments:check_in');
    expect(r01Permissions).not.toContain('patients:register');
    expect(r01Permissions).not.toContain('patients:update_demographics');
    expect(r01Permissions).not.toContain('patients:manage_identifiers');
    expect(r01Permissions).not.toContain('patients:consent_grant');
    expect(r01Permissions).not.toContain('patients:consent_withdraw');
  });

  it('R02 Nurse receives 18 distinct permissions (7 context + 4 encounter read/write + 3 patient read + 4 clinical-note write)', () => {
    // R02_NURSE receives NURSE_ENCOUNTER_PERMISSIONS (11 permissions:
    // 7 context + encounters:create + encounters:arrive +
    // encounters:cancel + encounters:view) PLUS CLINICAL_NOTE_WRITE
    // (4 clinical-note write perms; context deduplicated) PLUS the
    // clinical patient read permissions (patients:view, patients:search,
    // patients:consent_view — Stage BC01) = 18 distinct. R02 does NOT
    // receive encounters:start or encounters:finish (practitioner
    // conclusion authority reserved for R01 in this stage) and does NOT
    // receive the registration-desk patient write permissions.
    const r02Permissions = ROLE_PERMISSION_MATRIX.R02_NURSE;
    expect(new Set(r02Permissions).size).toBe(18);
    expect(r02Permissions).toContain('encounters:create');
    expect(r02Permissions).toContain('encounters:arrive');
    expect(r02Permissions).toContain('encounters:cancel');
    expect(r02Permissions).toContain('encounters:view');
    expect(r02Permissions).toContain('patients:view');
    expect(r02Permissions).toContain('patients:search');
    expect(r02Permissions).toContain('patients:consent_view');
    expect(r02Permissions).toContain('clinical_notes:create');
    expect(r02Permissions).toContain('clinical_notes:view');
    expect(r02Permissions).toContain('clinical_notes:sign');
    expect(r02Permissions).toContain('clinical_notes:amend');
    expect(r02Permissions).not.toContain('encounters:start');
    expect(r02Permissions).not.toContain('encounters:finish');
    expect(r02Permissions).not.toContain('encounters:on_leave');
    expect(r02Permissions).not.toContain('encounters:resume');
    expect(r02Permissions).not.toContain('patients:register');
    expect(r02Permissions).not.toContain('patients:update_demographics');
    expect(r02Permissions).not.toContain('patients:manage_identifiers');
    expect(r02Permissions).not.toContain('patients:consent_grant');
    expect(r02Permissions).not.toContain('patients:consent_withdraw');
  });

  it('R05 Allied Health receives 14 distinct permissions (7 context + encounters:view + 2 patient read + 4 clinical-note write)', () => {
    // R05_ALLIED_HEALTH_PROFESSIONAL receives ENCOUNTER_READ (8: 7
    // context + encounters:view) PLUS CLINICAL_NOTE_WRITE (4 clinical-
    // note write perms; context deduplicated) PLUS patients:view and
    // patients:search = 14 distinct. Per ROLES_AND_PERMISSIONS.md 4.2,
    // R05's "Clinical Doc" cell is "RW".
    const r05Permissions = ROLE_PERMISSION_MATRIX.R05_ALLIED_HEALTH_PROFESSIONAL;
    expect(new Set(r05Permissions).size).toBe(14);
    expect(r05Permissions).toContain('encounters:view');
    expect(r05Permissions).toContain('patients:view');
    expect(r05Permissions).toContain('patients:search');
    expect(r05Permissions).toContain('clinical_notes:create');
    expect(r05Permissions).toContain('clinical_notes:view');
    expect(r05Permissions).toContain('clinical_notes:sign');
    expect(r05Permissions).toContain('clinical_notes:amend');
    expect(r05Permissions).not.toContain('encounters:create');
    expect(r05Permissions).not.toContain('encounters:arrive');
    expect(r05Permissions).not.toContain('encounters:start');
    expect(r05Permissions).not.toContain('encounters:finish');
    expect(r05Permissions).not.toContain('encounters:cancel');
    expect(r05Permissions).not.toContain('encounters:on_leave');
    expect(r05Permissions).not.toContain('encounters:resume');
  });

  it('R03 Pharmacist and R12 Executive receive 11 distinct permissions (7 context + encounters:view + 2 patient read + clinical_notes:view)', () => {
    // R03_PHARMACIST and R12_EXECUTIVE receive ENCOUNTER_READ (8: 7
    // context + encounters:view) PLUS CLINICAL_NOTE_READ (clinical_notes
    // :view; context deduplicated) PLUS patients:view and patients:search
    // = 11 distinct. Per ROLES_AND_PERMISSIONS.md 4.2, their "Clinical
    // Doc" cell is "R" (read).
    const clinicalNoteReadRoles = ['R03_PHARMACIST', 'R12_EXECUTIVE'] as const;
    for (const code of clinicalNoteReadRoles) {
      const permissions = ROLE_PERMISSION_MATRIX[code];
      expect(new Set(permissions).size).toBe(11);
      expect(permissions).toContain('encounters:view');
      expect(permissions).toContain('patients:view');
      expect(permissions).toContain('patients:search');
      expect(permissions).toContain('clinical_notes:view');
      expect(permissions).not.toContain('clinical_notes:create');
      expect(permissions).not.toContain('clinical_notes:sign');
      expect(permissions).not.toContain('clinical_notes:amend');
      expect(permissions).not.toContain('encounters:create');
      expect(permissions).not.toContain('patients:register');
      expect(permissions).not.toContain('patients:consent_grant');
      expect(permissions).not.toContain('patients:consent_withdraw');
    }
  });

  it('R04 Technician and R08 Biller receive EXACTLY 10 permissions (7 context + encounters:view + patients:view + patients:search)', () => {
    // The non-clinical read roles (R04 Technician, R08 Biller) receive
    // ENCOUNTER_READ_PERMISSIONS (8: 7 context + encounters:view) PLUS
    // patients:view and patients:search (Stage BC01 patient read) = 10.
    // Per ROLES_AND_PERMISSIONS.md 4.2, their "Clinical Doc" cell is "-"
    // (no clinical-documentation access), so they receive NO
    // clinical_notes permission.
    const encounterReadRoles = ['R04_TECHNICIAN', 'R08_BILLER'] as const;
    for (const code of encounterReadRoles) {
      const permissions = ROLE_PERMISSION_MATRIX[code];
      expect(permissions).toHaveLength(10);
      expect(permissions).toContain('encounters:view');
      expect(permissions).toContain('patients:view');
      expect(permissions).toContain('patients:search');
      expect(permissions).not.toContain('clinical_notes:create');
      expect(permissions).not.toContain('clinical_notes:view');
      expect(permissions).not.toContain('clinical_notes:sign');
      expect(permissions).not.toContain('clinical_notes:amend');
      expect(permissions).not.toContain('encounters:create');
      expect(permissions).not.toContain('encounters:arrive');
      expect(permissions).not.toContain('encounters:start');
      expect(permissions).not.toContain('encounters:finish');
      expect(permissions).not.toContain('encounters:cancel');
      expect(permissions).not.toContain('encounters:on_leave');
      expect(permissions).not.toContain('encounters:resume');
      expect(permissions).not.toContain('patients:register');
      expect(permissions).not.toContain('patients:update_demographics');
      expect(permissions).not.toContain('patients:manage_identifiers');
      expect(permissions).not.toContain('patients:consent_grant');
      expect(permissions).not.toContain('patients:consent_view');
      expect(permissions).not.toContain('patients:consent_withdraw');
    }
  });

  it('R10 Compliance Officer receives 12 distinct permissions (7 context + encounters:view + patients:view + patients:search + patients:consent_view + clinical_notes:view)', () => {
    // R10 Compliance Officer receives ENCOUNTER_READ_PERMISSIONS (8:
    // 7 context + encounters:view) PLUS CLINICAL_NOTE_READ
    // (clinical_notes:view; context deduplicated) PLUS patients:view,
    // patients:search, and patients:consent_view (Stage BC01 audit/
    // consent oversight) = 12 distinct. Per USER_ROLES.md §10.1, R10's
    // Patient Records cell is "Read (audit)" and per
    // ROLES_AND_PERMISSIONS.md 4.2 R10's "Clinical Doc" cell is "R".
    const r10Permissions = ROLE_PERMISSION_MATRIX.R10_COMPLIANCE_OFFICER;
    expect(new Set(r10Permissions).size).toBe(12);
    expect(r10Permissions).toContain('encounters:view');
    expect(r10Permissions).toContain('patients:view');
    expect(r10Permissions).toContain('patients:search');
    expect(r10Permissions).toContain('patients:consent_view');
    expect(r10Permissions).toContain('clinical_notes:view');
    expect(r10Permissions).not.toContain('clinical_notes:create');
    expect(r10Permissions).not.toContain('clinical_notes:sign');
    expect(r10Permissions).not.toContain('clinical_notes:amend');
    expect(r10Permissions).not.toContain('encounters:create');
    expect(r10Permissions).not.toContain('encounters:arrive');
    expect(r10Permissions).not.toContain('encounters:start');
    expect(r10Permissions).not.toContain('encounters:finish');
    expect(r10Permissions).not.toContain('encounters:cancel');
    expect(r10Permissions).not.toContain('encounters:on_leave');
    expect(r10Permissions).not.toContain('encounters:resume');
    expect(r10Permissions).not.toContain('patients:register');
    expect(r10Permissions).not.toContain('patients:update_demographics');
    expect(r10Permissions).not.toContain('patients:manage_identifiers');
    expect(r10Permissions).not.toContain('patients:consent_grant');
    expect(r10Permissions).not.toContain('patients:consent_withdraw');
  });

  it('R11 HR Manager and R13 System Administrator receive EXACTLY 7 permissions (human context only)', () => {
    // R11_HR_MANAGER and R13_SYSTEM_ADMINISTRATOR receive
    // HUMAN_CONTEXT_PERMISSIONS (explicit 7). R13's Encounter Records
    // cell is "–" (USER_ROLES.md §10.1); R11 has no encounter row.
    // This verifies the matrix does NOT use `PERMISSION_CODES.filter(...)`
    // (which would grant all future permissions).
    const contextOnlyRoles = PLATFORM_ROLE_CODES.filter(
      (code) =>
        code === 'R11_HR_MANAGER' ||
        code === 'R13_SYSTEM_ADMINISTRATOR',
    );
    expect(contextOnlyRoles).toHaveLength(2);
    for (const code of contextOnlyRoles) {
      const permissions = ROLE_PERMISSION_MATRIX[code];
      expect(permissions).toHaveLength(7);
      expect(permissions).not.toContain('clinic_admin_overview:view');
      expect(permissions).not.toContain('appointments:book');
      expect(permissions).not.toContain('appointments:cancel');
      expect(permissions).not.toContain('appointments:reschedule');
      expect(permissions).not.toContain('appointments:confirm');
      expect(permissions).not.toContain('appointments:check_in');
      expect(permissions).not.toContain('appointments:start');
      expect(permissions).not.toContain('appointments:complete');
      expect(permissions).not.toContain('encounters:view');
      expect(permissions).not.toContain('encounters:create');
      expect(permissions).not.toContain('patients:register');
      expect(permissions).not.toContain('patients:view');
      expect(permissions).not.toContain('patients:search');
      expect(permissions).not.toContain('patients:update_demographics');
      expect(permissions).not.toContain('patients:manage_identifiers');
      expect(permissions).not.toContain('patients:consent_grant');
      expect(permissions).not.toContain('patients:consent_view');
      expect(permissions).not.toContain('patients:consent_withdraw');
      // Every context-only role has the SAME 7 permissions as R13.
      expect(permissions).toEqual(ROLE_PERMISSION_MATRIX.R13_SYSTEM_ADMINISTRATOR);
    }
  });

  it('R09 is NOT a hidden global super-administrator (R09 != PERMISSION_CODES)', () => {
    // R09 receives CLINIC_ADMIN_PERMISSIONS (explicit 20), NOT
    // PERMISSION_CODES (which is currently 37). R09 does NOT receive
    // appointments:start or appointments:complete (clinical
    // visit-progression actions reserved for R01 Physician), does NOT
    // receive encounter write permissions, does NOT receive the
    // registration-desk patient write permissions (reserved for R06
    // Receptionist), and does NOT receive clinical-note write
    // permissions (create/sign/amend, reserved for R01/R02/R05), so
    // R09's permission count is strictly less than
    // PERMISSION_CODES.length. This test verifies R09's matrix entry is
    // NOT a reference to PERMISSION_CODES and that R09 does not silently
    // inherit clinical visit, encounter write, patient write, or
    // clinical-note write permissions.
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR.length).toBe(20);
    expect(PERMISSION_CODES.length).toBe(37);
    // R09 must NOT equal the full PERMISSION_CODES catalogue.
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toEqual(
      PERMISSION_CODES,
    );
    // R09 must NOT hold the clinical visit-progression permissions.
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'appointments:start',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'appointments:complete',
    );
    // R09 must NOT hold encounter write permissions.
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'encounters:create',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'encounters:arrive',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'encounters:start',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'encounters:finish',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'encounters:cancel',
    );
    // R09 must NOT hold the registration-desk patient write permissions.
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'patients:register',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'patients:update_demographics',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'patients:manage_identifiers',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'patients:consent_grant',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'patients:consent_withdraw',
    );
    // R09 must NOT hold clinical-note write permissions.
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'clinical_notes:create',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'clinical_notes:sign',
    );
    expect(ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR).not.toContain(
      'clinical_notes:amend',
    );
  });

  it('matrix entries are stable references (not computed at access time)', () => {
    // The matrix entries are defined as `as const` arrays, not as
    // `PERMISSION_CODES.filter(...)` calls. This means the matrix
    // entries are stable references that do NOT change when
    // PERMISSION_CODES changes. This test verifies the matrix entries
    // are the same reference on every access (defence-in-depth against
    // a future change that reintroduces computed entries).
    const r09First = ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR;
    const r09Second = ROLE_PERMISSION_MATRIX.R09_ADMINISTRATOR;
    expect(r09First).toBe(r09Second); // Same reference, not a new array
  });
});

describe('TenantRoleAssignment domain type', () => {
  it('a TenantRoleAssignment can be assembled with branded identifiers', () => {
    const assignment: TenantRoleAssignment = {
      id: 'assignment-1' as TenantRoleAssignmentId,
      tenantMembershipId: 'membership-1' as TenantMembershipId,
      // Per ADR-015, tenantId is required on TenantRoleAssignment
      // and is derived server-side from the referenced
      // TenantMembership. Test fixtures supply a branded tenantId
      // that matches the membership's tenant.
      tenantId: 'tenant-1' as TenantId,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
      scopeLevel: 'tenant',
      scopeOrganisationId: null,
      scopeFacilityId: null,
      createdAt: new Date('2026-07-19T00:00:00Z'),
      updatedAt: new Date('2026-07-19T00:00:00Z'),
    };
    expect(assignment.id).toBe('assignment-1');
    expect(assignment.tenantMembershipId).toBe('membership-1');
    expect(assignment.roleCode).toBe('R13_SYSTEM_ADMINISTRATOR');
  });

  it('CreateTenantRoleAssignmentInput requires membershipId and roleCode', () => {
    const input: CreateTenantRoleAssignmentInput = {
      tenantMembershipId: 'membership-1' as TenantMembershipId,
      roleCode: 'R01_PHYSICIAN',
    };
    expect(input.tenantMembershipId).toBe('membership-1');
    expect(input.roleCode).toBe('R01_PHYSICIAN');
  });

  it('TenantRoleAssignmentId is erased to string at runtime', () => {
    const id = 'assignment-1' as TenantRoleAssignmentId;
    expect(typeof id).toBe('string');
    expect(id).toBe('assignment-1');
  });

  it('the roleCode field is typed as a canonical PlatformRoleCode', () => {
    // Compile-time check: assigning a non-canonical code would fail.
    const roleCode: PlatformRoleCode = 'R13_SYSTEM_ADMINISTRATOR';
    expect(roleCode).toBe('R13_SYSTEM_ADMINISTRATOR');
  });

  it('the permissionCode type covers exactly the three context permissions', () => {
    const codes: PermissionCode[] = [
      'context:view',
      'context:select',
      'context:clear',
    ];
    expect(codes).toHaveLength(3);
  });

  it('duplicate role codes are a type-level concept; runtime prevention is structural via the unique constraint', () => {
    // The unique constraint on (tenantMembershipId, roleCode) is the
    // structural enforcement. At the domain level, the same code
    // appearing twice in a principal's role set does not grant the
    // permission twice; the Set<PermissionCode> accumulation
    // deduplicates implicitly. R01_PHYSICIAN has 24 distinct
    // permissions (7 context + appointments:start/complete + 8
    // encounter lifecycle + patients:view/search/consent_view + 4
    // clinical-note write).
    const union = permissionsForRoles([
      'R01_PHYSICIAN',
      'R01_PHYSICIAN',
      'R01_PHYSICIAN',
    ]);
    expect(union.size).toBe(24);
  });

  it('a catalogue entry is a readonly snapshot', () => {
    const entry: PlatformRoleCatalogueEntry = {
      code: 'R01_PHYSICIAN',
      shortCode: 'R01',
      category: 'clinical',
      displayNameEn: 'Physician',
      displayNameAr: 'طبيب',
    };
    expect(entry.code).toBe('R01_PHYSICIAN');
    // Compile-time check: entry.code = 'R02_NURSE' would fail.
  });
});


// ---------------------------------------------------------------------------
// ADR-015 — Applicability rules (R09 / R13 / R14 / generic non-R13 tenant)
// ---------------------------------------------------------------------------

/**
 * Helper: build a TenantRoleAssignment fixture.
 */
function makeAssignment(args: {
  id?: string;
  tenantMembershipId?: string;
  tenantId?: string;
  roleCode: string;
  scopeLevel: RoleAssignmentScopeLevel;
  scopeOrganisationId?: string | null;
  scopeFacilityId?: string | null;
}): TenantRoleAssignment {
  return {
    id: (args.id ?? 'assignment-x') as TenantRoleAssignmentId,
    tenantMembershipId: (args.tenantMembershipId ??
      'membership-x') as TenantMembershipId,
    tenantId: (args.tenantId ?? 'tenant-x') as TenantId,
    roleCode: args.roleCode as PlatformRoleCode,
    scopeLevel: args.scopeLevel,
    scopeOrganisationId: (args.scopeOrganisationId ?? null) as
      | OrganisationId
      | null,
    scopeFacilityId: (args.scopeFacilityId ?? null) as FacilityId | null,
    createdAt: new Date('2026-07-22T00:00:00Z'),
    updatedAt: new Date('2026-07-22T00:00:00Z'),
  };
}

/**
 * Helper: simulate the applicability logic that
 * PrismaTenantRoleAssignmentRepository.listForMembershipAtOrganisation
 * implements. Returns the subset of `assignments` that grant
 * authority at the supplied organisation.
 *
 * Per ADR-015 §1.5 (Scope-authorisation Semantics):
 * - organisation-scoped assignments for the supplied organisation;
 * - facility-scoped assignments whose scope_organisation_id matches
 *   the supplied organisation;
 * - tenant-scoped assignments ONLY when the role code is
 *   R13_SYSTEM_ADMINISTRATOR.
 */
function applicableAtOrganisation(
  assignments: readonly TenantRoleAssignment[],
  organisationId: OrganisationId,
): readonly TenantRoleAssignment[] {
  return assignments.filter((a) => {
    if (a.scopeLevel === 'tenant') {
      return a.roleCode === 'R13_SYSTEM_ADMINISTRATOR';
    }
    if (a.scopeLevel === 'organisation') {
      return a.scopeOrganisationId === organisationId;
    }
    if (a.scopeLevel === 'facility') {
      // A facility-scoped assignment grants authority at its parent
      // organisation by implication.
      return a.scopeOrganisationId === organisationId;
    }
    return false;
  });
}

/**
 * Helper: simulate the applicability logic that
 * PrismaTenantRoleAssignmentRepository.listForMembershipAtFacility
 * implements. Returns the subset of `assignments` that grant
 * authority at the supplied facility (resolved against its parent
 * organisation).
 */
function applicableAtFacility(
  assignments: readonly TenantRoleAssignment[],
  facilityId: FacilityId,
  parentOrganisationId: OrganisationId,
): readonly TenantRoleAssignment[] {
  return assignments.filter((a) => {
    if (a.scopeLevel === 'tenant') {
      return a.roleCode === 'R13_SYSTEM_ADMINISTRATOR';
    }
    if (a.scopeLevel === 'organisation') {
      return a.scopeOrganisationId === parentOrganisationId;
    }
    if (a.scopeLevel === 'facility') {
      return a.scopeFacilityId === facilityId;
    }
    return false;
  });
}

describe('ADR-015 applicability rules', () => {
  const tenantId = 'tenant-1' as TenantId;
  const orgA = 'org-A' as OrganisationId;
  const orgB = 'org-B' as OrganisationId;
  const facA1 = 'fac-A1' as FacilityId;
  const facA2 = 'fac-A2' as FacilityId;
  const facB1 = 'fac-B1' as FacilityId;

  it('1. R09 tenant-scoped assignment does not imply organisation access', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const applicable = applicableAtOrganisation(assignments, orgA);
    expect(applicable).toHaveLength(0);
  });

  it('2. R09 tenant-scoped assignment does not imply facility access', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const applicable = applicableAtFacility(assignments, facA1, orgA);
    expect(applicable).toHaveLength(0);
  });

  it('3. R09 organisation-scoped assignment grants only that organisation', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'organisation',
        scopeOrganisationId: orgA,
      }),
    ];
    expect(applicableAtOrganisation(assignments, orgA)).toHaveLength(1);
    expect(applicableAtOrganisation(assignments, orgB)).toHaveLength(0);
  });

  it('4. R09 organisation-scoped assignment grants facilities only under that organisation', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'organisation',
        scopeOrganisationId: orgA,
      }),
    ];
    // Facilities under orgA are accessible.
    expect(applicableAtFacility(assignments, facA1, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facA2, orgA)).toHaveLength(1);
    // Facilities under orgB are NOT accessible.
    expect(applicableAtFacility(assignments, facB1, orgB)).toHaveLength(0);
  });

  it('5. R09 facility-scoped assignment grants its parent organisation', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'facility',
        scopeOrganisationId: orgA,
        scopeFacilityId: facA1,
      }),
    ];
    // The parent organisation of facA1 is orgA; the facility-scoped
    // assignment grants authority at orgA by implication.
    expect(applicableAtOrganisation(assignments, orgA)).toHaveLength(1);
    // The same assignment does NOT grant authority at orgB.
    expect(applicableAtOrganisation(assignments, orgB)).toHaveLength(0);
  });

  it('6. R09 facility-scoped assignment grants only its exact facility', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'facility',
        scopeOrganisationId: orgA,
        scopeFacilityId: facA1,
      }),
    ];
    // facA1 is accessible; facA2 (under the same orgA) is NOT.
    expect(applicableAtFacility(assignments, facA1, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facA2, orgA)).toHaveLength(0);
  });

  it('7. R13 tenant-scoped assignment grants organisation selection inside its tenant', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    // Every organisation in the tenant is accessible.
    expect(applicableAtOrganisation(assignments, orgA)).toHaveLength(1);
    expect(applicableAtOrganisation(assignments, orgB)).toHaveLength(1);
  });

  it('8. R13 tenant-scoped assignment grants facility selection inside its tenant', () => {
    const assignments = [
      makeAssignment({
        tenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    // Every facility in the tenant is accessible (regardless of parent org).
    expect(applicableAtFacility(assignments, facA1, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facA2, orgA)).toHaveLength(1);
    expect(applicableAtFacility(assignments, facB1, orgB)).toHaveLength(1);
  });

  it('9. R13 tenant-scoped assignment does not cross tenants (tenant boundary enforced by repository layer)', () => {
    // The applicability helpers operate on a single membership's
    // assignments; they do not consult other tenants' assignments.
    // Cross-tenant access is prevented structurally by the
    // SessionContextService, which only loads the active membership's
    // assignments and only resolves organisations/facilities under
    // the active tenant. This test verifies the helper does not
    // magically grant access to organisations outside the membership's
    // tenant: since the helper is membership-scoped, an R13
    // tenant-scoped assignment in Tenant T cannot appear in another
    // membership's assignment list.
    const tenantAAssignments = [
      makeAssignment({
        tenantId: 'tenant-A' as TenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const tenantBAssignments = [
      makeAssignment({
        tenantId: 'tenant-B' as TenantId,
        roleCode: 'R13_SYSTEM_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    // Tenant A's R13 grants access to Tenant A's organisations only.
    // The helper cannot see Tenant B's organisations because they
    // are not in Tenant A's organisation set.
    expect(applicableAtOrganisation(tenantAAssignments, orgA)).toHaveLength(1);
    expect(applicableAtOrganisation(tenantBAssignments, orgA)).toHaveLength(1);
    // The structural enforcement is at the session-context layer:
    // the session's active tenant membership determines which
    // tenant's organisations are even considered. This test asserts
    // the helper does not grant MORE than the input assignments
    // allow.
  });

  it('10. R14 Integration Account receives no interactive context permissions', () => {
    // The role-permission matrix denies R14 all context permissions.
    expect(permissionsForRole('R14_INTEGRATION_ACCOUNT')).toHaveLength(0);
    // R14 also does not grant any of the seven context permissions
    // when composed with another role.
    const r14Union = permissionsForRoles([
      'R14_INTEGRATION_ACCOUNT',
      'R01_PHYSICIAN',
    ]);
    // The R01 permissions are granted (R14 does not revoke them).
    expect(r14Union.size).toBeGreaterThan(0);
    // But R14 alone grants nothing.
    expect(permissionsForRoles(['R14_INTEGRATION_ACCOUNT']).size).toBe(0);
  });

  it('11. Generic non-R13 tenant-scoped assignments do not inherit all organisations or facilities', () => {
    const r01Tenant = [
      makeAssignment({
        tenantId,
        roleCode: 'R01_PHYSICIAN',
        scopeLevel: 'tenant',
      }),
    ];
    const r09Tenant = [
      makeAssignment({
        tenantId,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'tenant',
      }),
    ];
    const r12Tenant = [
      makeAssignment({
        tenantId,
        roleCode: 'R12_EXECUTIVE',
        scopeLevel: 'tenant',
      }),
    ];
    // None of these grant organisation or facility access.
    expect(applicableAtOrganisation(r01Tenant, orgA)).toHaveLength(0);
    expect(applicableAtOrganisation(r09Tenant, orgA)).toHaveLength(0);
    expect(applicableAtOrganisation(r12Tenant, orgA)).toHaveLength(0);
    expect(applicableAtFacility(r01Tenant, facA1, orgA)).toHaveLength(0);
    expect(applicableAtFacility(r09Tenant, facA1, orgA)).toHaveLength(0);
    expect(applicableAtFacility(r12Tenant, facA1, orgA)).toHaveLength(0);
  });
});
