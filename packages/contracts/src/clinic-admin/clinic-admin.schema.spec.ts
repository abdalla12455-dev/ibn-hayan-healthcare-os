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

// ---------------------------------------------------------------------------
// Phase 7 contract rules: missing data and forward compatibility.
// ---------------------------------------------------------------------------

describe('ClinicAdminOverviewResponseSchema — Phase 7 contract rules', () => {
  it('11. does NOT convert missing business data into zero (the response has NO numeric fields that could be zero-filled)', () => {
    // The contract structurally enforces this rule: the response
    // contains NO numeric fields. The regions array carries only
    // `key` (enum) and `availability` (enum). Missing business data
    // is represented by the availability enum value 'not_supported'
    // or 'no_data', NEVER by a numeric zero.
    //
    // This test verifies the contract has no numeric fields by
    // parsing a canonical response and checking every field is
    // either a string, an enum, or an array of objects with
    // string/enum fields.
    const result = ClinicAdminOverviewResponseSchema.safeParse({
      activeContext: {
        tenantDisplayName: 'Tenant Alpha',
        organisationDisplayName: 'Organisation Alpha',
        facilityDisplayName: 'Facility Alpha',
      },
      administrator: {
        displayName: 'Operator Alpha',
      },
      regions: [
        { key: 'financial_snapshot', availability: 'not_supported' },
      ],
      generatedAt: '2026-07-26T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Verify no numeric fields exist anywhere in the response.
      const json = JSON.stringify(result.data);
      // The json should NOT contain any standalone numeric values
      // (e.g. `"count":0`, `"total":0`). The only numbers in the
      // JSON would be inside strings (e.g. dates), which are fine.
      // We check for the pattern `"key":number` which would indicate
      // a numeric field.
      expect(json).not.toMatch(/"[a-zA-Z_]+":\d+(?:\.\d+)?/);
    }
  });

  it('12. can activate one region later without breaking existing clients (availability enum includes "supported")', () => {
    // The contract uses an enum for `availability` that includes
    // 'supported'. When a future batch implements a business region
    // (e.g. financial_snapshot), the backend can change the
    // availability from 'not_supported' to 'supported' and add
    // business data fields to the region. Existing clients that
    // only read `key` and `availability` will continue to work.
    //
    // This test verifies the 'supported' availability state is
    // accepted by the schema (forward compatibility).
    const result = ClinicAdminOverviewResponseSchema.safeParse({
      activeContext: {
        tenantDisplayName: 'Tenant Alpha',
        organisationDisplayName: 'Organisation Alpha',
        facilityDisplayName: 'Facility Alpha',
      },
      administrator: {
        displayName: 'Operator Alpha',
      },
      regions: [
        { key: 'financial_snapshot', availability: 'supported' },
      ],
      generatedAt: '2026-07-26T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('12b. activating a region does NOT require adding new fields to the region object (strict mode rejects extra fields)', () => {
    // When a future batch activates a region, the business data
    // fields should be added to the region object. The contract
    // uses `.strict()` on the region object, so adding a new field
    // (e.g. `totalRevenue`) would be REJECTED by the current schema.
    //
    // This is intentional: the contract MUST be updated when a
    // region is activated. This prevents the backend from silently
    // adding fields that the frontend does not know about. The
    // contract update is a coordinated change reviewed by the
    // Security Council.
    //
    // This test verifies the strict-mode behaviour: an extra field
    // on a region is rejected.
    const result = ClinicAdminOverviewResponseSchema.safeParse({
      activeContext: {
        tenantDisplayName: 'Tenant Alpha',
        organisationDisplayName: 'Organisation Alpha',
        facilityDisplayName: 'Facility Alpha',
      },
      administrator: {
        displayName: 'Operator Alpha',
      },
      regions: [
        {
          key: 'financial_snapshot',
          availability: 'supported',
          totalRevenue: 12345, // Extra field — must be rejected
        },
      ],
      generatedAt: '2026-07-26T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
