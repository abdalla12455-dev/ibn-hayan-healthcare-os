import {
  PLATFORM_ROLE_CATALOGUE,
  PLATFORM_ROLE_CODES,
  type PlatformRoleCode,
  type PlatformRoleCatalogueEntry,
} from '@ibn-hayan/domain';

/**
 * Canonical preview identity catalogue for Demo Role Preview Mode.
 *
 * This module is the single source of truth for the development-only
 * preview identities that the preview seed creates and that the
 * preview backend consults when switching the authenticated preview
 * session to a different canonical role.
 *
 * Design rules (per the Demo Role Preview Mode v1 specification):
 *
 * 1. **No invented roles.** The catalogue derives every preview
 *    identity from the canonical role catalogue
 *    (`PLATFORM_ROLE_CATALOGUE`). Every canonical role R01 through
 *    R14 receives exactly one preview identity. No role is added,
 *    removed, renamed, or relabelled.
 *
 * 2. **Deterministic, non-sensitive display names.** Each preview
 *    identity carries the display name `Preview Rxx` where `Rxx` is
 *    the role's short code (e.g. `Preview R01`, `Preview R09`). The
 *    display names contain no real patient, employee, customer, or
 *    clinic information.
 *
 * 3. **Deterministic, non-sensitive email addresses.** Each preview
 *    identity carries a deterministic email under a fixed local
 *    development domain (`@role-preview.dev`). The local part is the
 *    role's lowercase machine code (e.g.
 *    `r01_physician@role-preview.dev`). These addresses are NOT real
 *    addresses; they exist only inside the isolated preview
 *    database.
 *
 * 4. **Canonical scope assignment.** Each preview identity's role
 *    assignment is created at the scope level that the role
 *    canonically exercises:
 *    - **R01 through R12 (human tenant roles)**: role assignment at
 *      **facility scope** under the preview tenant → preview
 *      organisation → preview facility. This is the narrowest
 *      canonical scope and exercises the role exactly where it
 *      operates. The preview identity's session is therefore able
 *      to select the preview tenant, the preview organisation, and
 *      the preview facility.
 *    - **R13 System Administrator**: role assignment at **tenant
 *      scope** (no scope-target). R13 is the only role whose
 *      tenant-scoped assignment grants tenant-wide organisation and
 *      facility selection per ADR-015 §1.5. The preview identity's
 *      session is able to select the preview tenant, the preview
 *      organisation, and the preview facility.
 *    - **R14 Integration Account**: role assignment at **tenant
 *      scope** (no scope-target). Per ADR-015 and the
 *      role-permission matrix, R14 is denied all interactive
 *      context permissions. The preview identity is created so the
 *      operator can confirm the role's honest "Interface not
 *      implemented yet" status; the preview session for R14 cannot
 *      select an organisation or facility context (the canonical
 *      context-selection endpoints will deny the request, which is
 *      the correct production behaviour).
 *
 *    The scope assignment is derived directly from the role
 *    catalogue and ADR-015. It is NOT invented here. The preview
 *    seed enforces the same composite-foreign-key and CHECK
 *    constraints that production enforces; an inconsistent scope
 *    assignment would be rejected at the database level.
 *
 * 5. **Isolated preview workspace.** All preview identities belong
 *    to a single preview tenant, a single preview organisation, and
 *    a single preview facility. The preview workspace is
 *    identified by stable, deterministic slugs and codes:
 *    - Tenant slug: `preview-role-tenant`
 *    - Tenant display name: `Preview Role Tenant`
 *    - Organisation code: `PREVIEW_ORG`
 *    - Organisation display name: `Preview Organisation`
 *    - Facility code: `PREVIEW_FACILITY`
 *    - Facility display name: `Preview Facility`
 *
 *    These identifiers are NOT real; they exist only inside the
 *    isolated preview database. The preview tenant's slug is the
 *    stable lookup key that the preview backend uses to confirm a
 *    session belongs to the preview workspace before allowing a
 *    role switch.
 *
 * 6. **No fake business data.** The catalogue contains only
 *    identity, tenancy, membership, and role-assignment records. No
 *    patients, appointments, invoices, payments, inventory,
 *    attendance, waiting-room, or notification records are created
 *    by the preview seed.
 *
 * 7. **Server-only preview password.** Every preview identity
 *    shares a single preview password that the seed reads from
 *    the server-only environment variable
 *    `IBN_HAYAN_ROLE_PREVIEW_PASSWORD`. The password is NOT
 *    tracked in the repository; it lives in a protected file
 *    outside the repository
 *    (`/home/z/.config/ibn-hayan-role-preview/preview.env` in
 *    development, with directory permissions `0700` and file
 *    permissions `0600`). The password is hashed with Argon2id
 *    before persistence, exactly like production credentials. The
 *    plaintext is NEVER printed, NEVER logged, NEVER returned in
 *    any API response, NEVER exposed through a `NEXT_PUBLIC_*`
 *    variable, and NEVER documented in `.env.example` (which
 *    carries only a blank placeholder). When preview mode is
 *    enabled and the password is missing or invalid, the
 *    application refuses to start (fail-safe). When preview mode
 *    is disabled, the password is not required. Production fails
 *    closed regardless of the password. See `preview-password.ts`
 *    for the authoritative validation logic.
 */
export const PREVIEW_EMAIL_DOMAIN = 'role-preview.dev';

/**
 * The deterministic slug of the preview tenant. The preview backend
 * uses this slug to confirm that an authenticated session belongs
 * to the preview workspace before allowing a role switch.
 */
export const PREVIEW_TENANT_SLUG = 'preview-role-tenant';

/**
 * The deterministic display name of the preview tenant.
 */
export const PREVIEW_TENANT_DISPLAY_NAME = 'Preview Role Tenant';

/**
 * The deterministic code of the preview organisation (tenant-scoped).
 */
export const PREVIEW_ORGANISATION_CODE = 'PREVIEW_ORG';

/**
 * The deterministic display name of the preview organisation.
 */
export const PREVIEW_ORGANISATION_DISPLAY_NAME = 'Preview Organisation';

/**
 * The deterministic code of the preview facility
 * (organisation-scoped).
 */
export const PREVIEW_FACILITY_CODE = 'PREVIEW_FACILITY';

/**
 * The deterministic display name of the preview facility.
 */
export const PREVIEW_FACILITY_DISPLAY_NAME = 'Preview Facility';

/**
 * The scope level at which a preview identity's role assignment is
 * created, derived from the role's canonical semantics per ADR-015.
 *
 * - `tenant` for R13 System Administrator (tenant-wide) and for
 *   R14 Integration Account (R14 has no interactive context
 *   permissions; a tenant-scoped assignment is the simplest
 *   well-formed assignment that satisfies the database's CHECK
 *   constraints).
 * - `facility` for R01 through R12 (the human tenant roles). A
 *   facility-scoped assignment exercises the role exactly where it
 *   operates and grants the preview identity the ability to select
 *   the preview tenant → preview organisation → preview facility
 *   context.
 */
export type PreviewRoleScopeLevel = 'tenant' | 'facility';

/**
 * One preview identity entry. Carries the canonical role catalogue
 * entry plus the deterministic preview-only email and display name.
 */
export interface PreviewIdentityEntry {
  /** The canonical role catalogue entry. */
  readonly catalogue: PlatformRoleCatalogueEntry;
  /** The deterministic preview-only email address. */
  readonly email: string;
  /** The deterministic preview-only display name (e.g. `Preview R01`). */
  readonly displayName: string;
  /** The scope level at which the role assignment is created. */
  readonly scopeLevel: PreviewRoleScopeLevel;
}

/**
 * Resolve the scope level for a canonical role code, derived from
 * ADR-015 §1.5 and the role-permission matrix.
 *
 * - R13 System Administrator → tenant scope (tenant-wide org/fac
 *   selection per ADR-015 §1.5).
 * - R14 Integration Account → tenant scope (R14 has no interactive
 *   context permissions; the assignment is the simplest well-formed
 *   one that satisfies the database's CHECK constraints).
 * - R01 through R12 → facility scope (the narrowest canonical
 *   scope; the preview identity can select the preview tenant →
 *   preview organisation → preview facility context).
 */
export function resolvePreviewScopeLevel(
  code: PlatformRoleCode,
): PreviewRoleScopeLevel {
  if (
    code === 'R13_SYSTEM_ADMINISTRATOR' ||
    code === 'R14_INTEGRATION_ACCOUNT'
  ) {
    return 'tenant';
  }
  return 'facility';
}

/**
 * The complete preview identity catalogue. Derived from
 * `PLATFORM_ROLE_CATALOGUE`; contains exactly one entry per
 * canonical role R01 through R14.
 *
 * The catalogue is computed at module-evaluation time so that any
 * change to the canonical role catalogue is reflected here
 * automatically. The catalogue is `readonly` so that consumers
 * cannot mutate it.
 */
export const PREVIEW_IDENTITY_CATALOGUE: readonly PreviewIdentityEntry[] =
  PLATFORM_ROLE_CATALOGUE.map((catalogue) => {
    const localPart = catalogue.code.toLowerCase();
    return {
      catalogue,
      email: `${localPart}@${PREVIEW_EMAIL_DOMAIN}`,
      displayName: `Preview ${catalogue.shortCode}`,
      scopeLevel: resolvePreviewScopeLevel(catalogue.code),
    };
  });

/**
 * Returns `true` if the supplied string is one of the canonical
 * preview role codes (R01 through R14 in machine form, e.g.
 * `R09_ADMINISTRATOR`). Used by the preview backend to reject
 * unknown role codes before any database lookup.
 *
 * This function delegates to the canonical role catalogue; it does
 * NOT invent or accept any non-canonical role code.
 */
export function isCanonicalPreviewRoleCode(code: string): boolean {
  return PLATFORM_ROLE_CODES.includes(code as PlatformRoleCode);
}

/**
 * Find a preview identity entry by its canonical role code. Returns
 * `null` if the code is not a canonical role code. Used by the
 * preview backend to resolve the preview identity for a role-switch
 * request.
 */
export function findPreviewIdentity(code: string): PreviewIdentityEntry | null {
  for (const entry of PREVIEW_IDENTITY_CATALOGUE) {
    if (entry.catalogue.code === code) {
      return entry;
    }
  }
  return null;
}
