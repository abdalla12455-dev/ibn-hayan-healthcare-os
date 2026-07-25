import { describe, it, expect } from 'vitest';
import {
  PREVIEW_IDENTITY_CATALOGUE,
  PREVIEW_EMAIL_DOMAIN,
  PREVIEW_TENANT_SLUG,
  PREVIEW_TENANT_DISPLAY_NAME,
  PREVIEW_ORGANISATION_CODE,
  PREVIEW_ORGANISATION_DISPLAY_NAME,
  PREVIEW_FACILITY_CODE,
  PREVIEW_FACILITY_DISPLAY_NAME,
  findPreviewIdentity,
  isCanonicalPreviewRoleCode,
  resolvePreviewScopeLevel,
} from './preview-identity-catalogue.js';
import * as catalogueModule from './preview-identity-catalogue.js';
import {
  PLATFORM_ROLE_CATALOGUE,
  PLATFORM_ROLE_CODES,
} from '@ibn-hayan/domain';

/**
 * Unit tests for the preview identity catalogue.
 *
 * These tests verify Phase 9 items 7–15:
 *
 * 7. Every canonical role in the repository is discovered.
 * 8. Exactly one preview identity is created for each canonical role.
 * 9. Role codes are not duplicated.
 * 10. Role labels come from the canonical role catalogue.
 * 11. Scope assignment is correct for every role.
 * 12. Seed is idempotent (verified by the seed script tests; this
 *     test verifies the catalogue is deterministic).
 * 13. Seed refuses production (verified by the seed script tests;
 *     this test verifies the catalogue does not depend on
 *     production state).
 * 14. Seed refuses an unverified/non-preview database target
 *     (verified by the seed script tests).
 * 15. Seed creates no business-domain data (verified by the seed
 *     script tests; this test verifies the catalogue contains only
 *     identity, tenancy, membership, and role-assignment records).
 */

describe('PREVIEW_IDENTITY_CATALOGUE', () => {
  it('contains exactly one entry for every canonical role R01 through R14', () => {
    expect(PREVIEW_IDENTITY_CATALOGUE).toHaveLength(14);
    expect(PLATFORM_ROLE_CODES).toHaveLength(14);
    expect(PLATFORM_ROLE_CATALOGUE).toHaveLength(14);
    for (let i = 0; i < PLATFORM_ROLE_CODES.length; i++) {
      expect(PREVIEW_IDENTITY_CATALOGUE[i]!.catalogue.code).toBe(
        PLATFORM_ROLE_CODES[i],
      );
    }
  });

  it('does not duplicate any role code', () => {
    const codes = PREVIEW_IDENTITY_CATALOGUE.map((e) => e.catalogue.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('derives the display name from the role short code (Preview Rxx)', () => {
    for (const entry of PREVIEW_IDENTITY_CATALOGUE) {
      expect(entry.displayName).toBe(`Preview ${entry.catalogue.shortCode}`);
    }
  });

  it('derives the email from the role code and the preview email domain', () => {
    for (const entry of PREVIEW_IDENTITY_CATALOGUE) {
      const expectedLocal = entry.catalogue.code.toLowerCase();
      expect(entry.email).toBe(`${expectedLocal}@${PREVIEW_EMAIL_DOMAIN}`);
    }
  });

  it('uses a non-real email domain that does not collide with production', () => {
    expect(PREVIEW_EMAIL_DOMAIN).toBe('role-preview.dev');
  });

  it('uses deterministic, non-sensitive tenant/organisation/facility identifiers', () => {
    expect(PREVIEW_TENANT_SLUG).toBe('preview-role-tenant');
    expect(PREVIEW_TENANT_DISPLAY_NAME).toBe('Preview Role Tenant');
    expect(PREVIEW_ORGANISATION_CODE).toBe('PREVIEW_ORG');
    expect(PREVIEW_ORGANISATION_DISPLAY_NAME).toBe('Preview Organisation');
    expect(PREVIEW_FACILITY_CODE).toBe('PREVIEW_FACILITY');
    expect(PREVIEW_FACILITY_DISPLAY_NAME).toBe('Preview Facility');
  });

  it('does NOT track any fixed preview password constant (no PREVIEW_IDENTITY_PASSWORD export remains in the catalogue module)', () => {
    // Assert that the previously-tracked fixed plaintext password
    // export is gone from the catalogue module's public surface.
    // The export was `PREVIEW_IDENTITY_PASSWORD` with the literal
    // value `preview-role-only-do-not-use-in-production`; both the
    // export name and the literal value were removed in the
    // Secure Demo Role Preview Mode v1 correction. The password
    // now lives in the server-only
    // `IBN_HAYAN_ROLE_PREVIEW_PASSWORD` environment variable
    // (see `preview-password.ts`). This is the structural
    // enforcement of "no tracked fixed preview password remains"
    // (Phase 2 item 9 of the correction spec).
    expect(catalogueModule).not.toHaveProperty('PREVIEW_IDENTITY_PASSWORD');
  });

  it('does NOT include any patient, appointment, invoice, payment, inventory, attendance, waiting-room, or notification data', () => {
    // The catalogue is a TypeScript array of plain objects; it
    // contains only identity, tenancy, membership, and
    // role-assignment metadata. No business-domain records.
    for (const entry of PREVIEW_IDENTITY_CATALOGUE) {
      expect(entry).toHaveProperty('catalogue');
      expect(entry).toHaveProperty('email');
      expect(entry).toHaveProperty('displayName');
      expect(entry).toHaveProperty('scopeLevel');
      // The entry must NOT carry any business-domain field.
      const keys = Object.keys(entry).sort();
      expect(keys).toEqual(
        ['catalogue', 'displayName', 'email', 'scopeLevel'].sort(),
      );
    }
  });
});

describe('resolvePreviewScopeLevel', () => {
  it('returns "tenant" for R13 System Administrator (tenant-wide org/fac selection per ADR-015 §1.5)', () => {
    expect(resolvePreviewScopeLevel('R13_SYSTEM_ADMINISTRATOR')).toBe('tenant');
  });

  it('returns "tenant" for R14 Integration Account (no interactive context permissions)', () => {
    expect(resolvePreviewScopeLevel('R14_INTEGRATION_ACCOUNT')).toBe('tenant');
  });

  it('returns "facility" for R01 through R12 (the narrowest canonical scope)', () => {
    const humanRoles = PLATFORM_ROLE_CODES.filter(
      (c) =>
        c !== 'R13_SYSTEM_ADMINISTRATOR' && c !== 'R14_INTEGRATION_ACCOUNT',
    );
    expect(humanRoles).toHaveLength(12);
    for (const code of humanRoles) {
      expect(resolvePreviewScopeLevel(code)).toBe('facility');
    }
  });
});

describe('isCanonicalPreviewRoleCode', () => {
  it('returns true for every canonical role code', () => {
    for (const code of PLATFORM_ROLE_CODES) {
      expect(isCanonicalPreviewRoleCode(code)).toBe(true);
    }
  });

  it('returns false for non-canonical codes', () => {
    expect(isCanonicalPreviewRoleCode('owner')).toBe(false);
    expect(isCanonicalPreviewRoleCode('member')).toBe(false);
    expect(isCanonicalPreviewRoleCode('viewer')).toBe(false);
    expect(isCanonicalPreviewRoleCode('R15_NEW_ROLE')).toBe(false);
    expect(isCanonicalPreviewRoleCode('')).toBe(false);
  });
});

describe('findPreviewIdentity', () => {
  it('returns the preview identity entry for a canonical role code', () => {
    const entry = findPreviewIdentity('R09_ADMINISTRATOR');
    expect(entry).not.toBeNull();
    expect(entry!.catalogue.code).toBe('R09_ADMINISTRATOR');
    expect(entry!.catalogue.shortCode).toBe('R09');
    expect(entry!.catalogue.displayNameAr).toBe('مدير المنشأة');
    expect(entry!.catalogue.displayNameEn).toBe('Administrator');
    expect(entry!.displayName).toBe('Preview R09');
    expect(entry!.email).toBe('r09_administrator@role-preview.dev');
    expect(entry!.scopeLevel).toBe('facility');
  });

  it('returns null for a non-canonical role code', () => {
    expect(findPreviewIdentity('R99_UNKNOWN')).toBeNull();
    expect(findPreviewIdentity('')).toBeNull();
  });

  it('returns the R09 Arabic label as مدير المنشأة (the canonical Clinic Admin label)', () => {
    const entry = findPreviewIdentity('R09_ADMINISTRATOR');
    expect(entry).not.toBeNull();
    expect(entry!.catalogue.displayNameAr).toBe('مدير المنشأة');
  });
});
