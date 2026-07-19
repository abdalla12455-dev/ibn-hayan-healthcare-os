/**
 * Canonical platform role catalogue for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per PRODUCT_BIBLE.md Section 20.2 and ROLES_AND_PERMISSIONS.md
 * Section 1.2, the platform's role catalogue comprises 14 roles
 * organized into four categories: clinical, operational,
 * administrative, and platform.
 *
 * Per PRODUCT_BIBLE.md Section 20.3, roles are composable: a
 * principal may hold multiple roles simultaneously, with permissions
 * accumulating per defined rules. The multi-role assignment model is
 * implemented through the `TenantRoleAssignment` persistence model
 * (added in the eighth canonical batch). This file defines the
 * stable, machine-readable role codes that the persistence layer
 * stores and that the authorization layer consults.
 *
 * Per ROLES_AND_PERMISSIONS.md Section 1.6, roles are tenant-scoped.
 * A principal's role assignment is valid only within the tenant for
 * which it was assigned; cross-tenant role assignment is forbidden.
 * The tenant scoping is enforced structurally: every
 * `TenantRoleAssignment` row references a `TenantMembership`, which
 * in turn references exactly one `Tenant`.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. The persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and these domain types.
 *
 * Per the eighth canonical batch specification:
 * - The simplified `owner`, `member`, `viewer` role proposal in
 *   `CURRENT_IMPLEMENTATION_HANDOVER.md` is rejected. It conflicts
 *   with the ratified fourteen-role catalogue.
 * - Customer-defined custom roles are not implemented in this batch.
 *   The catalogue is structured so that they can be added later by
 *   extending the `PlatformRoleCode` union and the role-permission
 *   matrix.
 * - Authorization decisions use the stable machine code (e.g.
 *   `R13_SYSTEM_ADMINISTRATOR`). Localized display labels live
 *   alongside the catalogue but are never inspected by the
 *   authorization layer.
 */

// ---------------------------------------------------------------------------
// Role categories
// ---------------------------------------------------------------------------

/**
 * The four role categories ratified in PRODUCT_BIBLE.md Section 20.2.
 */
export type RoleCategory =
  | 'clinical'
  | 'operational'
  | 'administrative'
  | 'platform';

// ---------------------------------------------------------------------------
// Platform role codes
// ---------------------------------------------------------------------------

/**
 * The stable machine-readable codes for the fourteen canonical
 * platform roles.
 *
 * The codes are SCREAMING_SNAKE_CASE so that they are visually
 * distinct from other identifiers and so that they sort
 * deterministically. The `Rxx_` prefix mirrors the canonical
 * catalogue codes (R01 through R14) used in PRODUCT_BIBLE.md and
 * ROLES_AND_PERMISSIONS.md.
 *
 * The codes are the persistence representation: the
 * `tenant_role_assignments.role_code` column stores these exact
 * strings. Adding a new role is a coordinated change to this union,
 * the role-permission matrix, the persistence layer, and the
 * contract schemas.
 *
 * Per ROLES_AND_PERMISSIONS.md Section 1.4, the role catalogue is
 * stable across the decade horizon. Adding a new role is governed
 * by the Security Council and documented in the role's lifecycle
 * record.
 */
export type PlatformRoleCode =
  | 'R01_PHYSICIAN'
  | 'R02_NURSE'
  | 'R03_PHARMACIST'
  | 'R04_TECHNICIAN'
  | 'R05_ALLIED_HEALTH_PROFESSIONAL'
  | 'R06_RECEPTIONIST'
  | 'R07_SCHEDULER'
  | 'R08_BILLER'
  | 'R09_ADMINISTRATOR'
  | 'R10_COMPLIANCE_OFFICER'
  | 'R11_HR_MANAGER'
  | 'R12_EXECUTIVE'
  | 'R13_SYSTEM_ADMINISTRATOR'
  | 'R14_INTEGRATION_ACCOUNT';

/**
 * The complete list of canonical platform role codes, in catalogue
 * order. Used by tests to verify the catalogue's completeness and
 * by the role-permission matrix to verify that every role has an
 * explicit entry.
 */
export const PLATFORM_ROLE_CODES: readonly PlatformRoleCode[] = [
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
] as const;

// ---------------------------------------------------------------------------
// Role catalogue entries
// ---------------------------------------------------------------------------

/**
 * A catalogue entry for one canonical platform role. The entry
 * carries the stable machine code, the catalogue number, the
 * category, and localized display labels (Arabic and English).
 *
 * The display labels are NOT consulted by the authorization layer.
 * They are exposed through the API contract for client display only.
 * The authorization layer consults only the `code`.
 */
export interface PlatformRoleCatalogueEntry {
  /**
   * The stable machine-readable code. The persistence layer stores
   * this exact string.
   */
  readonly code: PlatformRoleCode;
  /**
   * The short catalogue number (e.g. `R01`). Used for documentation
   * cross-reference with PRODUCT_BIBLE.md and ROLES_AND_PERMISSIONS.md.
   */
  readonly shortCode: 'R01' | 'R02' | 'R03' | 'R04' | 'R05' | 'R06' | 'R07' | 'R08' | 'R09' | 'R10' | 'R11' | 'R12' | 'R13' | 'R14';
  /**
   * The role category. Used for documentation; not consulted by the
   * authorization layer.
   */
  readonly category: RoleCategory;
  /**
   * The English display name. Used by the API contract when the
   * client's preferred locale is English.
   */
  readonly displayNameEn: string;
  /**
   * The Arabic display name. Used by the API contract when the
   * client's preferred locale is Arabic (the default).
   */
  readonly displayNameAr: string;
}

/**
 * The complete canonical platform role catalogue, in catalogue order.
 *
 * Per PRODUCT_BIBLE.md Section 20.2 and ROLES_AND_PERMISSIONS.md
 * Section 2, the catalogue is the canonical reference for what roles
 * exist. Adding a new role is a coordinated change to this array,
 * the `PlatformRoleCode` union, and the role-permission matrix.
 */
export const PLATFORM_ROLE_CATALOGUE: readonly PlatformRoleCatalogueEntry[] = [
  {
    code: 'R01_PHYSICIAN',
    shortCode: 'R01',
    category: 'clinical',
    displayNameEn: 'Physician',
    displayNameAr: 'طبيب',
  },
  {
    code: 'R02_NURSE',
    shortCode: 'R02',
    category: 'clinical',
    displayNameEn: 'Nurse',
    displayNameAr: 'ممرض/ممرضة',
  },
  {
    code: 'R03_PHARMACIST',
    shortCode: 'R03',
    category: 'clinical',
    displayNameEn: 'Pharmacist',
    displayNameAr: 'صيدلي/صيدلانية',
  },
  {
    code: 'R04_TECHNICIAN',
    shortCode: 'R04',
    category: 'clinical',
    displayNameEn: 'Technician',
    displayNameAr: 'فني/فنية',
  },
  {
    code: 'R05_ALLIED_HEALTH_PROFESSIONAL',
    shortCode: 'R05',
    category: 'clinical',
    displayNameEn: 'Allied Health Professional',
    displayNameAr: 'ممارس صحي مساند',
  },
  {
    code: 'R06_RECEPTIONIST',
    shortCode: 'R06',
    category: 'operational',
    displayNameEn: 'Receptionist',
    displayNameAr: 'موظف استقبال',
  },
  {
    code: 'R07_SCHEDULER',
    shortCode: 'R07',
    category: 'operational',
    displayNameEn: 'Scheduler',
    displayNameAr: 'مجدول',
  },
  {
    code: 'R08_BILLER',
    shortCode: 'R08',
    category: 'operational',
    displayNameEn: 'Biller',
    displayNameAr: 'محاسب فواتير',
  },
  {
    code: 'R09_ADMINISTRATOR',
    shortCode: 'R09',
    category: 'operational',
    displayNameEn: 'Administrator',
    displayNameAr: 'مدير',
  },
  {
    code: 'R10_COMPLIANCE_OFFICER',
    shortCode: 'R10',
    category: 'administrative',
    displayNameEn: 'Compliance Officer',
    displayNameAr: 'مسؤول الامتثال',
  },
  {
    code: 'R11_HR_MANAGER',
    shortCode: 'R11',
    category: 'administrative',
    displayNameEn: 'HR Manager',
    displayNameAr: 'مدير الموارد البشرية',
  },
  {
    code: 'R12_EXECUTIVE',
    shortCode: 'R12',
    category: 'administrative',
    displayNameEn: 'Executive',
    displayNameAr: 'تنفيذي',
  },
  {
    code: 'R13_SYSTEM_ADMINISTRATOR',
    shortCode: 'R13',
    category: 'platform',
    displayNameEn: 'System Administrator',
    displayNameAr: 'مسؤول النظام',
  },
  {
    code: 'R14_INTEGRATION_ACCOUNT',
    shortCode: 'R14',
    category: 'platform',
    displayNameEn: 'Integration Account',
    displayNameAr: 'حساب التكامل',
  },
] as const;

/**
 * The locale codes for which the role catalogue carries display names.
 * Arabic is the default per the platform's Arabic-first posture.
 */
export type RoleLabelLocale = 'ar' | 'en';

/**
 * Look up a catalogue entry by its stable machine code. Returns
 * `null` if the code is not in the catalogue (i.e. is an unknown
 * role code).
 *
 * This function is the single source of truth for "is this role code
 * valid?". The authorization layer consults it to reject unknown
 * codes; the persistence layer consults it to validate inputs.
 */
export function findRoleCatalogueEntry(
  code: string,
): PlatformRoleCatalogueEntry | null {
  for (const entry of PLATFORM_ROLE_CATALOGUE) {
    if (entry.code === code) {
      return entry;
    }
  }
  return null;
}

/**
 * Returns `true` if the supplied string is a valid canonical
 * platform role code. Used by the persistence layer to validate
 * inputs before insertion.
 */
export function isPlatformRoleCode(code: string): code is PlatformRoleCode {
  return findRoleCatalogueEntry(code) !== null;
}

/**
 * Resolve the localized display name for a role code. Returns the
 * code itself if the code is not in the catalogue (defensive
 * fallback; the caller should validate the code before calling this
 * function).
 *
 * Arabic is the default locale.
 */
export function getRoleDisplayName(
  code: PlatformRoleCode,
  locale: RoleLabelLocale = 'ar',
): string {
  const entry = findRoleCatalogueEntry(code);
  if (entry === null) {
    return code;
  }
  return locale === 'ar' ? entry.displayNameAr : entry.displayNameEn;
}
