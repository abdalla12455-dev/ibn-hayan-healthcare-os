import { describe, it, expect } from 'vitest';
import {
  ClinicAdminOverviewResponseSchema,
  ClinicAdminOverviewErrorResponseSchema,
  RegionKeySchema,
  RegionAvailabilitySchema,
  RegionStatusSchema,
  ActiveContextIdentitySchema,
  AdministratorIdentitySchema,
} from './clinic-admin.schema';

/**
 * Contract tests for the Clinic Admin Overview response schema.
 *
 * These tests verify that the contract:
 * - Accepts the canonical success payload (active context,
 *   administrator, regions, generatedAt).
 * - Accepts the canonical error payload.
 * - Rejects payloads with missing fields, extra fields, or
 *   invalid field values.
 * - Enforces strict object shape (no extra fields) per
 *   CODING_STANDARDS.md §6.
 *
 * Per the live-data task specification Phase 4, the contract must
 * be:
 * - strictly typed (Zod-validated);
 * - tenant/organisation/facility-scoped (no UUIDs exposed);
 * - authorisation-aware (the response is only produced for R09);
 * - safe for Arabic and English rendering (display-name strings
 *   only, no locale-specific formatting assumptions).
 */
describe('ClinicAdminOverviewResponseSchema', () => {
  const validResponse = {
    activeContext: {
      tenantDisplayName: 'مجموعة الرافدين الصحية',
      organisationDisplayName: 'Al-Rafidain Healthcare Group',
      facilityDisplayName: 'Al-Mansour Specialist Center',
    },
    administrator: {
      displayName: 'Operator Alpha',
    },
    regions: [
      { key: 'appointment_actions', availability: 'navigational_only' },
      { key: 'financial_snapshot', availability: 'not_supported' },
      { key: 'todays_appointments', availability: 'not_supported' },
      { key: 'operational_alerts', availability: 'not_supported' },
      { key: 'inventory_alerts', availability: 'not_supported' },
      { key: 'doctors_on_duty', availability: 'not_supported' },
      { key: 'waiting_room_operations', availability: 'not_supported' },
      { key: 'staff_attendance_summary', availability: 'not_supported' },
      { key: 'quick_actions', availability: 'navigational_only' },
    ],
    generatedAt: '2026-07-26T10:00:00.000Z',
  };

  it('accepts a canonical success payload', () => {
    const result = ClinicAdminOverviewResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('accepts Arabic display names (RTL content)', () => {
    const arabicResponse = {
      ...validResponse,
      activeContext: {
        tenantDisplayName: 'مجموعة الرافدين الصحية',
        organisationDisplayName: 'مجموعة الرافدين',
        facilityDisplayName: 'مركز المنصور التخصصي',
      },
      administrator: {
        displayName: 'مدير المنشأة',
      },
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(arabicResponse);
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing activeContext', () => {
    const payload = { ...validResponse } as Partial<typeof validResponse>;
    delete payload.activeContext;
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing administrator', () => {
    const payload = { ...validResponse } as Partial<typeof validResponse>;
    delete payload.administrator;
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing regions', () => {
    const payload = { ...validResponse } as Partial<typeof validResponse>;
    delete payload.regions;
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing generatedAt', () => {
    const payload = { ...validResponse } as Partial<typeof validResponse>;
    delete payload.generatedAt;
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an extra field on the top-level object (strict mode)', () => {
    const payload = { ...validResponse, extra: 'no' };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an extra field on activeContext (strict mode)', () => {
    const payload = {
      ...validResponse,
      activeContext: { ...validResponse.activeContext, tenantId: 'no' },
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an extra field on administrator (strict mode)', () => {
    const payload = {
      ...validResponse,
      administrator: { ...validResponse.administrator, userId: 'no' },
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an extra field on a region (strict mode)', () => {
    const payload = {
      ...validResponse,
      regions: validResponse.regions.map((r) => ({ ...r, metric: 42 })),
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an empty tenant display name', () => {
    const payload = {
      ...validResponse,
      activeContext: {
        ...validResponse.activeContext,
        tenantDisplayName: '',
      },
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a tenant display name over 200 characters', () => {
    const payload = {
      ...validResponse,
      activeContext: {
        ...validResponse.activeContext,
        tenantDisplayName: 'a'.repeat(201),
      },
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an empty administrator display name', () => {
    const payload = {
      ...validResponse,
      administrator: { displayName: '' },
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid generatedAt (non-ISO-8601)', () => {
    const payload = {
      ...validResponse,
      generatedAt: 'yesterday',
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid region key', () => {
    const payload = {
      ...validResponse,
      regions: [
        ...validResponse.regions.slice(0, 8),
        { key: 'invalid_region', availability: 'not_supported' },
      ],
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid region availability', () => {
    const payload = {
      ...validResponse,
      regions: [
        ...validResponse.regions.slice(0, 8),
        { key: 'quick_actions', availability: 'unsupported_state' },
      ],
    };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts an empty regions array (the frontend handles the absence of declarations)', () => {
    const payload = { ...validResponse, regions: [] };
    const result = ClinicAdminOverviewResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe('ClinicAdminOverviewErrorResponseSchema', () => {
  it('accepts an AUTH_SESSION_REQUIRED error', () => {
    const result = ClinicAdminOverviewErrorResponseSchema.safeParse({
      error: {
        code: 'AUTH_SESSION_REQUIRED',
        message: 'A valid session is required.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts an AUTHORIZATION_FORBIDDEN error', () => {
    const result = ClinicAdminOverviewErrorResponseSchema.safeParse({
      error: {
        code: 'AUTHORIZATION_FORBIDDEN',
        message: 'Authorisation denied.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED error', () => {
    const result = ClinicAdminOverviewErrorResponseSchema.safeParse({
      error: {
        code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        message: 'Active context required.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown error code', () => {
    const result = ClinicAdminOverviewErrorResponseSchema.safeParse({
      error: {
        code: 'UNKNOWN_CODE',
        message: 'Something went wrong.',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an extra field on the error object (strict mode)', () => {
    const result = ClinicAdminOverviewErrorResponseSchema.safeParse({
      error: {
        code: 'AUTHORIZATION_FORBIDDEN',
        message: 'Authorisation denied.',
        detail: 'internal reason',
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('RegionKeySchema', () => {
  it('accepts all nine canonical region keys', () => {
    const keys = [
      'appointment_actions',
      'financial_snapshot',
      'todays_appointments',
      'operational_alerts',
      'inventory_alerts',
      'doctors_on_duty',
      'waiting_room_operations',
      'staff_attendance_summary',
      'quick_actions',
    ];
    for (const key of keys) {
      expect(RegionKeySchema.safeParse(key).success).toBe(true);
    }
  });

  it('rejects an unknown region key', () => {
    expect(RegionKeySchema.safeParse('unknown').success).toBe(false);
  });
});

describe('RegionAvailabilitySchema', () => {
  it('accepts all five canonical availability states', () => {
    const states = [
      'supported',
      'not_supported',
      'navigational_only',
      'no_data',
      'partially_unavailable',
    ];
    for (const state of states) {
      expect(RegionAvailabilitySchema.safeParse(state).success).toBe(true);
    }
  });

  it('rejects an unknown availability state', () => {
    expect(RegionAvailabilitySchema.safeParse('unsupported').success).toBe(
      false,
    );
  });
});

describe('RegionStatusSchema', () => {
  it('accepts a canonical region status', () => {
    expect(
      RegionStatusSchema.safeParse({
        key: 'financial_snapshot',
        availability: 'not_supported',
      }).success,
    ).toBe(true);
  });

  it('rejects a region status with an extra field', () => {
    expect(
      RegionStatusSchema.safeParse({
        key: 'financial_snapshot',
        availability: 'not_supported',
        metric: 42,
      }).success,
    ).toBe(false);
  });
});

describe('ActiveContextIdentitySchema', () => {
  it('accepts canonical display names', () => {
    expect(
      ActiveContextIdentitySchema.safeParse({
        tenantDisplayName: 'Tenant',
        organisationDisplayName: 'Organisation',
        facilityDisplayName: 'Facility',
      }).success,
    ).toBe(true);
  });

  it('rejects an extra field (e.g. tenantId UUID)', () => {
    expect(
      ActiveContextIdentitySchema.safeParse({
        tenantDisplayName: 'Tenant',
        organisationDisplayName: 'Organisation',
        facilityDisplayName: 'Facility',
        tenantId: '11111111-1111-1111-1111-111111111111',
      }).success,
    ).toBe(false);
  });
});

describe('AdministratorIdentitySchema', () => {
  it('accepts a display name only', () => {
    expect(
      AdministratorIdentitySchema.safeParse({
        displayName: 'Operator Alpha',
      }).success,
    ).toBe(true);
  });

  it('rejects an extra field (e.g. userId UUID)', () => {
    expect(
      AdministratorIdentitySchema.safeParse({
        displayName: 'Operator Alpha',
        userId: '11111111-1111-1111-1111-111111111111',
      }).success,
    ).toBe(false);
  });
});
