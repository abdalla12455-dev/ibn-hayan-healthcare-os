import { describe, it, expect } from 'vitest';

/**
 * Contract tests for the authorization schemas.
 *
 * These tests verify the eighth canonical batch specification's
 * contract requirements:
 * - Role codes validate.
 * - Role arrays validate (single-role, multi-role, empty).
 * - Multi-role membership responses validate.
 * - Unknown role codes fail schema validation.
 * - Permission codes validate.
 * - Localized role labels (Arabic, English) validate.
 * - The TenantMembershipSummary schema carries the `roles` array.
 * - The TenantContextOption schema carries the `roles` array.
 * - The ActiveTenantContext schema carries the `roles` array.
 */

import {
  RoleCodeSchema,
  RoleLabelLocaleSchema,
  RoleSummarySchema,
  PermissionCodeSchema,
} from './authorization.schema.js';
import { TenantMembershipSummarySchema } from '../auth/auth.schema.js';
import {
  TenantContextOptionSchema,
  ActiveTenantContextSchema,
} from '../context/context.schema.js';

describe('authorization RoleCodeSchema', () => {
  it('validates every canonical platform role code', () => {
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
    expect(codes).toHaveLength(14);
    for (const code of codes) {
      const result = RoleCodeSchema.safeParse(code);
      expect(result.success).toBe(true);
    }
  });

  it('rejects the simplified owner/member/viewer codes', () => {
    expect(RoleCodeSchema.safeParse('owner').success).toBe(false);
    expect(RoleCodeSchema.safeParse('member').success).toBe(false);
    expect(RoleCodeSchema.safeParse('viewer').success).toBe(false);
    expect(RoleCodeSchema.safeParse('OWNER').success).toBe(false);
    expect(RoleCodeSchema.safeParse('MEMBER').success).toBe(false);
    expect(RoleCodeSchema.safeParse('VIEWER').success).toBe(false);
  });

  it('rejects unknown codes', () => {
    expect(RoleCodeSchema.safeParse('R99_UNKNOWN').success).toBe(false);
    expect(RoleCodeSchema.safeParse('').success).toBe(false);
    expect(RoleCodeSchema.safeParse(123).success).toBe(false);
    expect(RoleCodeSchema.safeParse(null).success).toBe(false);
  });
});

describe('authorization RoleLabelLocaleSchema', () => {
  it('validates Arabic and English locales', () => {
    expect(RoleLabelLocaleSchema.safeParse('ar').success).toBe(true);
    expect(RoleLabelLocaleSchema.safeParse('en').success).toBe(true);
  });

  it('rejects other locales', () => {
    expect(RoleLabelLocaleSchema.safeParse('fr').success).toBe(false);
    expect(RoleLabelLocaleSchema.safeParse('de').success).toBe(false);
    expect(RoleLabelLocaleSchema.safeParse('').success).toBe(false);
  });
});

describe('authorization RoleSummarySchema', () => {
  it('validates a single role summary with Arabic label', () => {
    const summary = {
      code: 'R13_SYSTEM_ADMINISTRATOR',
      displayName: 'مسؤول النظام',
    };
    const result = RoleSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('validates a single role summary with English label', () => {
    const summary = {
      code: 'R01_PHYSICIAN',
      displayName: 'Physician',
    };
    const result = RoleSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('rejects an unknown role code', () => {
    const summary = {
      code: 'R99_UNKNOWN',
      displayName: 'Unknown',
    };
    const result = RoleSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it('rejects a missing displayName', () => {
    const summary = {
      code: 'R01_PHYSICIAN',
    };
    const result = RoleSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it('rejects an empty displayName', () => {
    const summary = {
      code: 'R01_PHYSICIAN',
      displayName: '',
    };
    const result = RoleSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it('rejects an unexpected extra field', () => {
    const summary = {
      code: 'R01_PHYSICIAN',
      displayName: 'Physician',
      category: 'clinical',
    };
    const result = RoleSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });
});

describe('authorization PermissionCodeSchema', () => {
  it('validates every canonical permission code', () => {
    const codes = ['context:view', 'context:select', 'context:clear'];
    for (const code of codes) {
      expect(PermissionCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('rejects unknown permission codes', () => {
    expect(PermissionCodeSchema.safeParse('patient:read').success).toBe(false);
    expect(PermissionCodeSchema.safeParse('encounter:write').success).toBe(false);
    expect(PermissionCodeSchema.safeParse('').success).toBe(false);
  });
});

describe('TenantMembershipSummarySchema with roles', () => {
  it('validates a membership with no roles (fail-closed)', () => {
    const summary = {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [],
    };
    const result = TenantMembershipSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('validates a membership with one role', () => {
    const summary = {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [
        {
          code: 'R13_SYSTEM_ADMINISTRATOR',
          displayName: 'مسؤول النظام',
        },
      ],
    };
    const result = TenantMembershipSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('validates a membership with multiple roles', () => {
    const summary = {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [
        { code: 'R01_PHYSICIAN', displayName: 'طبيب' },
        { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'مسؤول النظام' },
      ],
    };
    const result = TenantMembershipSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('rejects a membership summary without a roles array', () => {
    const summary = {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      // roles is missing
    };
    const result = TenantMembershipSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it('rejects a membership summary with an unknown role code', () => {
    const summary = {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [
        { code: 'R99_UNKNOWN', displayName: 'Unknown' },
      ],
    };
    const result = TenantMembershipSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });
});

describe('TenantContextOptionSchema with roles', () => {
  it('validates an option with roles', () => {
    const option = {
      membershipId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      roles: [
        { code: 'R01_PHYSICIAN', displayName: 'Physician' },
      ],
    };
    const result = TenantContextOptionSchema.safeParse(option);
    expect(result.success).toBe(true);
  });

  it('validates an option with no roles', () => {
    const option = {
      membershipId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      roles: [],
    };
    const result = TenantContextOptionSchema.safeParse(option);
    expect(result.success).toBe(true);
  });

  it('rejects an option without a roles array', () => {
    const option = {
      membershipId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
    };
    const result = TenantContextOptionSchema.safeParse(option);
    expect(result.success).toBe(false);
  });
});

describe('ActiveTenantContextSchema with roles', () => {
  it('validates an active context with roles', () => {
    const active = {
      membershipId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      roles: [
        { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'System Administrator' },
      ],
    };
    const result = ActiveTenantContextSchema.safeParse(active);
    expect(result.success).toBe(true);
  });

  it('validates an active context with multiple roles', () => {
    const active = {
      membershipId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
      roles: [
        { code: 'R01_PHYSICIAN', displayName: 'طبيب' },
        { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'مسؤول النظام' },
      ],
    };
    const result = ActiveTenantContextSchema.safeParse(active);
    expect(result.success).toBe(true);
  });

  it('rejects an active context without a roles array', () => {
    const active = {
      membershipId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha',
      tenantDisplayName: 'Tenant Alpha',
    };
    const result = ActiveTenantContextSchema.safeParse(active);
    expect(result.success).toBe(false);
  });
});
