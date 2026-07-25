import { describe, it, expect } from 'vitest';
import {
  RolePreviewAvailabilityResponseSchema,
  RolePreviewRoleCardSchema,
  SelectPreviewRoleRequestSchema,
  SelectPreviewRoleResponseSchema,
  CurrentPreviewRoleResponseSchema,
  EndPreviewRoleResponseSchema,
  RolePreviewErrorResponseSchema,
} from './role-preview.schema.js';

/**
 * Contract tests for the Demo Role Preview Mode schemas.
 *
 * These tests verify Phase 9 items 16–23 (backend security at the
 * contract boundary):
 * - 16. Unknown role code rejected.
 * - 17. Caller cannot supply userId.
 * - 18. Caller cannot supply membershipId.
 * - 19. Caller cannot supply tenantId.
 * - 20. Caller cannot supply organisationId.
 * - 21. Caller cannot supply facilityId.
 * - 22. Caller cannot supply permissions.
 * - 23. (Preview identity must belong to preview tenant — verified
 *   by the backend service tests; the contract enforces only the
 *   shape.)
 *
 * And Phase 9 items 30–33 (response contains no secret):
 * - 30. Response contains no secret.
 * - 31. Response contains no password or hash.
 * - 32. Response contains no session token.
 * - 33. Audit event contains no secret (verified by the audit
 *   action-code catalogue tests; the contract enforces only the
 *   response shape).
 *
 * The tests verify that the `.strict()` modifier on every schema
 * rejects any additional field at the boundary. This is the
 * structural enforcement of "the caller cannot supply arbitrary
 * IDs" and "the response contains no secret".
 */

describe('RolePreviewAvailabilityResponseSchema', () => {
  it('validates a disabled response (enabled=false, empty roles array)', () => {
    const result = RolePreviewAvailabilityResponseSchema.safeParse({
      enabled: false,
      roles: [],
    });
    expect(result.success).toBe(true);
  });

  it('validates an enabled response with all 14 canonical role cards', () => {
    const roles = [
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
    ].map((code) => ({
      code,
      displayNameAr: 'ar',
      displayNameEn: 'en',
      shortCode: code.slice(0, 3),
      category: 'clinical',
      scopeLevel: 'facility',
      interfaceImplemented: code === 'R09_ADMINISTRATOR',
      interfacePath: code === 'R09_ADMINISTRATOR' ? '/clinic-admin' : null,
    }));
    const result = RolePreviewAvailabilityResponseSchema.safeParse({
      enabled: true,
      roles,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an additional `secret` field at the boundary (.strict())', () => {
    const result = RolePreviewAvailabilityResponseSchema.safeParse({
      enabled: true,
      roles: [],
      secret: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an additional `password` field on a role card (.strict())', () => {
    const result = RolePreviewAvailabilityResponseSchema.safeParse({
      enabled: true,
      roles: [
        {
          code: 'R09_ADMINISTRATOR',
          displayNameAr: 'ar',
          displayNameEn: 'en',
          shortCode: 'R09',
          category: 'operational',
          scopeLevel: 'facility',
          interfaceImplemented: true,
          interfacePath: '/clinic-admin',
          password: 'should-be-rejected',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an additional `tokenHash` field on a role card (.strict())', () => {
    const result = RolePreviewAvailabilityResponseSchema.safeParse({
      enabled: true,
      roles: [
        {
          code: 'R09_ADMINISTRATOR',
          displayNameAr: 'ar',
          displayNameEn: 'en',
          shortCode: 'R09',
          category: 'operational',
          scopeLevel: 'facility',
          interfaceImplemented: true,
          interfacePath: '/clinic-admin',
          tokenHash: 'should-be-rejected',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('SelectPreviewRoleRequestSchema', () => {
  it('validates a request with only the roleCode field', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
    });
    expect(result.success).toBe(true);
  });

  it('validates every canonical role code', () => {
    const codes = [
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
    ];
    for (const code of codes) {
      const result = SelectPreviewRoleRequestSchema.safeParse({
        roleCode: code,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown role code (Phase 9 item 16)', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R99_UNKNOWN',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies userId (Phase 9 item 17)', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      userId: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies membershipId (Phase 9 item 18)', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      membershipId: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies tenantId (Phase 9 item 19)', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      tenantId: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies organisationId (Phase 9 item 20)', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      organisationId: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies facilityId (Phase 9 item 21)', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      facilityId: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies permissions (Phase 9 item 22)', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      permissions: ['context:view'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies a session ID', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      sessionId: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a request that supplies a password hash', () => {
    const result = SelectPreviewRoleRequestSchema.safeParse({
      roleCode: 'R09_ADMINISTRATOR',
      passwordHash: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });
});

describe('SelectPreviewRoleResponseSchema', () => {
  it('validates a response for an implemented role (R09)', () => {
    const result = SelectPreviewRoleResponseSchema.safeParse({
      selectedRole: {
        code: 'R09_ADMINISTRATOR',
        displayNameAr: 'مدير المنشأة',
        displayNameEn: 'Administrator',
        shortCode: 'R09',
        category: 'operational',
        scopeLevel: 'facility',
        interfaceImplemented: true,
        interfacePath: '/clinic-admin',
      },
      previewTenant: 'Preview Role Tenant',
      previewOrganisation: 'Preview Organisation',
      previewFacility: 'Preview Facility',
      interfacePath: '/clinic-admin',
    });
    expect(result.success).toBe(true);
  });

  it('validates a response for an unimplemented role', () => {
    const result = SelectPreviewRoleResponseSchema.safeParse({
      selectedRole: {
        code: 'R01_PHYSICIAN',
        displayNameAr: 'طبيب',
        displayNameEn: 'Physician',
        shortCode: 'R01',
        category: 'clinical',
        scopeLevel: 'facility',
        interfaceImplemented: false,
        interfacePath: null,
      },
      previewTenant: 'Preview Role Tenant',
      previewOrganisation: 'Preview Organisation',
      previewFacility: 'Preview Facility',
      interfacePath: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a response that includes a session token (Phase 9 item 32)', () => {
    const result = SelectPreviewRoleResponseSchema.safeParse({
      selectedRole: {
        code: 'R09_ADMINISTRATOR',
        displayNameAr: 'مدير المنشأة',
        displayNameEn: 'Administrator',
        shortCode: 'R09',
        category: 'operational',
        scopeLevel: 'facility',
        interfaceImplemented: true,
        interfacePath: '/clinic-admin',
      },
      previewTenant: 'Preview Role Tenant',
      previewOrganisation: 'Preview Organisation',
      previewFacility: 'Preview Facility',
      interfacePath: '/clinic-admin',
      sessionToken: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a response that includes a password or hash (Phase 9 item 31)', () => {
    const result = SelectPreviewRoleResponseSchema.safeParse({
      selectedRole: {
        code: 'R09_ADMINISTRATOR',
        displayNameAr: 'مدير المنشأة',
        displayNameEn: 'Administrator',
        shortCode: 'R09',
        category: 'operational',
        scopeLevel: 'facility',
        interfaceImplemented: true,
        interfacePath: '/clinic-admin',
      },
      previewTenant: 'Preview Role Tenant',
      previewOrganisation: 'Preview Organisation',
      previewFacility: 'Preview Facility',
      interfacePath: '/clinic-admin',
      password: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a response that includes a raw UUID for the preview identity', () => {
    const result = SelectPreviewRoleResponseSchema.safeParse({
      selectedRole: {
        code: 'R09_ADMINISTRATOR',
        displayNameAr: 'مدير المنشأة',
        displayNameEn: 'Administrator',
        shortCode: 'R09',
        category: 'operational',
        scopeLevel: 'facility',
        interfaceImplemented: true,
        interfacePath: '/clinic-admin',
      },
      previewTenant: 'Preview Role Tenant',
      previewOrganisation: 'Preview Organisation',
      previewFacility: 'Preview Facility',
      interfacePath: '/clinic-admin',
      previewUserId: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });
});

describe('CurrentPreviewRoleResponseSchema', () => {
  it('validates an inactive response (no preview session)', () => {
    const result = CurrentPreviewRoleResponseSchema.safeParse({
      active: false,
      selectedRole: null,
      previewTenant: null,
      previewOrganisation: null,
      previewFacility: null,
    });
    expect(result.success).toBe(true);
  });

  it('validates an active response', () => {
    const result = CurrentPreviewRoleResponseSchema.safeParse({
      active: true,
      selectedRole: {
        code: 'R09_ADMINISTRATOR',
        displayNameAr: 'مدير المنشأة',
        displayNameEn: 'Administrator',
        shortCode: 'R09',
        category: 'operational',
        scopeLevel: 'facility',
        interfaceImplemented: true,
        interfacePath: '/clinic-admin',
      },
      previewTenant: 'Preview Role Tenant',
      previewOrganisation: 'Preview Organisation',
      previewFacility: 'Preview Facility',
    });
    expect(result.success).toBe(true);
  });
});

describe('EndPreviewRoleResponseSchema', () => {
  it('validates the strict ok=true response', () => {
    const result = EndPreviewRoleResponseSchema.safeParse({ ok: true });
    expect(result.success).toBe(true);
  });

  it('rejects an ok=false response', () => {
    const result = EndPreviewRoleResponseSchema.safeParse({ ok: false });
    expect(result.success).toBe(false);
  });

  it('rejects an additional field', () => {
    const result = EndPreviewRoleResponseSchema.safeParse({
      ok: true,
      extra: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });
});

describe('RolePreviewErrorResponseSchema', () => {
  it('validates the disabled error code', () => {
    const result = RolePreviewErrorResponseSchema.safeParse({
      error: {
        code: 'ROLE_PREVIEW_DISABLED',
        message: 'Role Preview Mode is unavailable.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('validates the unknown-role error code', () => {
    const result = RolePreviewErrorResponseSchema.safeParse({
      error: {
        code: 'ROLE_PREVIEW_ROLE_UNKNOWN',
        message: 'Unknown role code.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('validates the session-required error code', () => {
    const result = RolePreviewErrorResponseSchema.safeParse({
      error: {
        code: 'ROLE_PREVIEW_SESSION_REQUIRED',
        message: 'A valid session is required.',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('RolePreviewRoleCardSchema (Phase 9 items 38–39 — interface truth)', () => {
  it('marks R09 as implemented with /clinic-admin', () => {
    // The schema itself is shape-only; the backend's toRoleCard
    // function sets `interfaceImplemented` based on the role code.
    // This test verifies the schema accepts the canonical R09 card
    // shape with interfaceImplemented=true.
    const result = RolePreviewRoleCardSchema.safeParse({
      code: 'R09_ADMINISTRATOR',
      displayNameAr: 'مدير المنشأة',
      displayNameEn: 'Administrator',
      shortCode: 'R09',
      category: 'operational',
      scopeLevel: 'facility',
      interfaceImplemented: true,
      interfacePath: '/clinic-admin',
    });
    expect(result.success).toBe(true);
  });

  it('marks an unimplemented role honestly with interfaceImplemented=false', () => {
    const result = RolePreviewRoleCardSchema.safeParse({
      code: 'R01_PHYSICIAN',
      displayNameAr: 'طبيب',
      displayNameEn: 'Physician',
      shortCode: 'R01',
      category: 'clinical',
      scopeLevel: 'facility',
      interfaceImplemented: false,
      interfacePath: null,
    });
    expect(result.success).toBe(true);
  });
});
