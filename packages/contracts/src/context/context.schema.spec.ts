import { describe, it, expect } from 'vitest';
import {
  TenantContextOptionSchema,
  ActiveTenantContextSchema,
  ContextResponseSchema,
  SelectTenantContextRequestSchema,
  ClearTenantContextResponseSchema,
} from './context.schema.js';

/**
 * Contract tests for the tenant-context schemas.
 *
 * These tests verify the schemas accept valid values, reject missing
 * required fields, reject extra fields (because every schema is
 * `.strict()`), and reject malformed values. The schemas are the
 * single source of truth for the shape of the tenant-context API
 * boundary; both `@ibn-hayan/api` and `@ibn-hayan/web` derive their
 * types from them.
 *
 * Per the fifth canonical batch specification, the contracts:
 * - never include `passwordHash`, `token`, `tokenHash`, `csrfHash`,
 *   or any credential material;
 * - never include Organisation or Facility fields;
 *
 * Per the eighth canonical batch specification, the contracts:
 * - include a `roles` array on TenantContextOption and
 *   ActiveTenantContext (a principal may hold multiple roles
 *   simultaneously per PRODUCT_BIBLE.md Section 20.3);
 * - never include a singular `role` field (rejected by strict mode);
 * - never include permission information (the client must not
 *   duplicate the role-permission matrix);
 * - use `.strict()` on every object so extra fields are rejected at
 *   the boundary.
 */

const VALID_ROLES_EMPTY: never[] = [];
const VALID_ROLES_SINGLE = [
  { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'System Administrator' },
] as const;

const VALID_MEMBERSHIP_ID = '11111111-1111-1111-1111-111111111111';
const VALID_TENANT_ID = '22222222-2222-2222-2222-222222222222';

describe('TenantContextOptionSchema', () => {
  it('accepts a valid option with all five fields (including roles array)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid option with multiple roles', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: [
        { code: 'R01_PHYSICIAN', displayName: 'Physician' },
        { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'System Administrator' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing membershipId', () => {
    const result = TenantContextOptionSchema.safeParse({
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing tenantId', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing tenantSlug', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing tenantDisplayName', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing roles array', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an extra field (strict mode)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
      status: 'active',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an Organisation field (strict mode)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
      organisationId: '33333333-3333-3333-3333-333333333333',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a Facility field (strict mode)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
      facilityId: '44444444-4444-4444-4444-444444444444',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a singular role field (strict mode — the schema uses roles, not role)', () => {
    // The schema uses a `roles` array, never a singular `role` field.
    // A singular `role` field is rejected by strict mode. This is
    // the structural enforcement of the multi-role assignment model.
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown role code in the roles array', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: [{ code: 'R99_UNKNOWN', displayName: 'Unknown' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed membershipId (not a UUID)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: 'not-a-uuid',
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed tenantId (not a UUID)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: 'not-a-uuid',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a tenantSlug that is too long (> 80)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'x'.repeat(81),
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a tenantDisplayName that is too long (> 200)', () => {
    const result = TenantContextOptionSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'x'.repeat(201),
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });
});

describe('ActiveTenantContextSchema', () => {
  it('accepts a valid active context with all five fields (including roles array)', () => {
    const result = ActiveTenantContextSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_SINGLE,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an active context with an empty roles array (fail-closed)', () => {
    const result = ActiveTenantContextSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing field', () => {
    const result = ActiveTenantContextSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      roles: VALID_ROLES_EMPTY,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing roles array', () => {
    const result = ActiveTenantContextSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an extra field (strict mode)', () => {
    const result = ActiveTenantContextSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      roles: VALID_ROLES_EMPTY,
      expiresAt: '2026-01-01T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('ContextResponseSchema', () => {
  it('accepts a response with options and active = null', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: null,
      organisationOptions: [],
      activeOrganisation: null,
      facilityOptions: [],
      activeFacility: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a response with options and a valid active context', () => {
    const result = ContextResponseSchema.safeParse({
      options: [
        {
          membershipId: VALID_MEMBERSHIP_ID,
          tenantId: VALID_TENANT_ID,
          tenantSlug: 'tenant-alpha.invalid',
          tenantDisplayName: 'Tenant Alpha',
          roles: VALID_ROLES_EMPTY,
        },
      ],
      active: {
        membershipId: VALID_MEMBERSHIP_ID,
        tenantId: VALID_TENANT_ID,
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
        roles: VALID_ROLES_SINGLE,
      },
      organisationOptions: [],
      activeOrganisation: null,
      facilityOptions: [],
      activeFacility: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a response with active organisation and facility contexts (ADR-015)', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: {
        membershipId: VALID_MEMBERSHIP_ID,
        tenantId: VALID_TENANT_ID,
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
        roles: VALID_ROLES_SINGLE,
      },
      organisationOptions: [
        {
          organisationId: '55555555-5555-5555-5555-555555555555',
          code: 'ORG-1',
          displayName: 'Organisation Alpha',
          status: 'active',
        },
      ],
      activeOrganisation: {
        organisationId: '55555555-5555-5555-5555-555555555555',
        code: 'ORG-1',
        displayName: 'Organisation Alpha',
      },
      facilityOptions: [
        {
          facilityId: '66666666-6666-6666-6666-666666666666',
          organisationId: '55555555-5555-5555-5555-555555555555',
          code: 'FAC-1',
          displayName: 'Facility Alpha',
          status: 'active',
        },
      ],
      activeFacility: {
        facilityId: '66666666-6666-6666-6666-666666666666',
        organisationId: '55555555-5555-5555-5555-555555555555',
        code: 'FAC-1',
        displayName: 'Facility Alpha',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing organisationOptions field (ADR-015)', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: null,
      activeOrganisation: null,
      facilityOptions: [],
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing activeOrganisation field (ADR-015)', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: null,
      organisationOptions: [],
      facilityOptions: [],
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing facilityOptions field (ADR-015)', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: null,
      organisationOptions: [],
      activeOrganisation: null,
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing activeFacility field (ADR-015)', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: null,
      organisationOptions: [],
      activeOrganisation: null,
      facilityOptions: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing options field', () => {
    const result = ContextResponseSchema.safeParse({
      active: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing active field', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an extra field (strict mode)', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: null,
      expiresAt: '2026-01-01T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed option inside the options array', () => {
    const result = ContextResponseSchema.safeParse({
      options: [
        {
          membershipId: 'not-a-uuid',
          tenantId: VALID_TENANT_ID,
          tenantSlug: 'tenant-alpha.invalid',
          tenantDisplayName: 'Tenant Alpha',
          roles: VALID_ROLES_EMPTY,
        },
      ],
      active: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed active context (not null, not a valid context)', () => {
    const result = ContextResponseSchema.safeParse({
      options: [],
      active: {
        membershipId: 'not-a-uuid',
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('SelectTenantContextRequestSchema', () => {
  it('accepts a valid request with membershipId', () => {
    const result = SelectTenantContextRequestSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing membershipId', () => {
    const result = SelectTenantContextRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an extra field (strict mode)', () => {
    const result = SelectTenantContextRequestSchema.safeParse({
      membershipId: VALID_MEMBERSHIP_ID,
      tenantId: VALID_TENANT_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a tenantId field instead of membershipId (strict mode)', () => {
    // The client must select by membershipId, not by an arbitrary
    // tenantId. This test is the structural enforcement of that
    // requirement at the contract boundary.
    const result = SelectTenantContextRequestSchema.safeParse({
      tenantId: VALID_TENANT_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed membershipId (not a UUID)', () => {
    const result = SelectTenantContextRequestSchema.safeParse({
      membershipId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string membershipId', () => {
    const result = SelectTenantContextRequestSchema.safeParse({
      membershipId: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe('ClearTenantContextResponseSchema', () => {
  it('accepts a valid clear response with ok=true and active=null', () => {
    const result = ClearTenantContextResponseSchema.safeParse({
      ok: true,
      active: null,
      activeOrganisation: null,
      activeFacility: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects ok=false', () => {
    const result = ClearTenantContextResponseSchema.safeParse({
      ok: false,
      active: null,
      activeOrganisation: null,
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing ok field', () => {
    const result = ClearTenantContextResponseSchema.safeParse({
      active: null,
      activeOrganisation: null,
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing active field', () => {
    const result = ClearTenantContextResponseSchema.safeParse({
      ok: true,
      activeOrganisation: null,
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing activeOrganisation field (ADR-015)', () => {
    const result = ClearTenantContextResponseSchema.safeParse({
      ok: true,
      active: null,
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing activeFacility field (ADR-015)', () => {
    const result = ClearTenantContextResponseSchema.safeParse({
      ok: true,
      active: null,
      activeOrganisation: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-null active field', () => {
    // The clear response always returns active = null. A non-null
    // active would mean the clear failed silently, which is a bug.
    const result = ClearTenantContextResponseSchema.safeParse({
      ok: true,
      active: {
        membershipId: VALID_MEMBERSHIP_ID,
        tenantId: VALID_TENANT_ID,
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
      },
      activeOrganisation: null,
      activeFacility: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an extra field (strict mode)', () => {
    const result = ClearTenantContextResponseSchema.safeParse({
      ok: true,
      active: null,
      activeOrganisation: null,
      activeFacility: null,
      clearedAt: '2026-01-01T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
