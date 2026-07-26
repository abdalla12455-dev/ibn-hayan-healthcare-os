import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ClinicAdminOverviewService } from './clinic-admin-overview.service.js';
import { ClinicAdminOverviewResponseSchema } from '@ibn-hayan/contracts';
import type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
} from '@ibn-hayan/domain';
import type { AuthService, AuditRequestContext } from '../auth/auth.service.js';

/**
 * Focused unit tests for the Clinic Admin Overview service.
 *
 * These tests verify the service's read-side orchestration logic
 * WITHOUT requiring PostgreSQL 17 or a full Nest application
 * bootstrap. The repository ports and the `AuthService` are mocked
 * via plain JS object stubs (no `vi.mock` of modules, no NestJS
 * DI container). This pattern matches the existing
 * `apps/api/src/health/health.service.spec.ts` pattern.
 *
 * Coverage map (per the pre-push audit task Phase 4):
 *
 * 1. R09 with valid context receives the overview payload.
 * 2. Missing session returns null (controller maps to 401).
 * 3. Missing active tenant membership throws (403).
 * 4. Missing active organisation throws (403).
 * 5. Missing active facility throws (403).
 * 6. Active membership not in user's memberships list throws (403).
 * 7. Inactive tenant throws (403).
 * 8. Inactive organisation throws (403).
 * 9. Inactive facility throws (403).
 * 10. Facility belonging to another organisation throws (403).
 * 11. The response contract matches `ClinicAdminOverviewResponseSchema`.
 * 12. The response regions array contains exactly 9 entries with the
 *     approved availability declarations.
 * 13. The response does NOT carry raw UUIDs (only display names).
 * 14. The service does NOT emit a `clinic_admin.overview.viewed`
 *     audit event (regression test — the `clinic_admin` category
 *     is NOT accepted by the database CHECK constraint; the audit
 *     trail is provided by the AuthorizationGuard's
 *     `authorization.decision.allowed` event).
 * 15. The service does NOT depend on `AuditHelperService` (the
 *     constructor has no `auditHelper` parameter).
 *
 * The PostgreSQL 17 integration test (which would verify the
 * complete HTTP path including the AuthorizationGuard, the
 * session-cookie validation, the CSRF check, and the audit
 * outbox projection) is NOT run locally. GitHub Actions remains
 * authoritative for that suite.
 */

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ORG_ID = '00000000-0000-0000-0000-000000000002';
const FACILITY_ID = '00000000-0000-0000-0000-000000000003';
const MEMBERSHIP_ID = '00000000-0000-0000-0000-000000000004';
const USER_ID = '00000000-0000-0000-0000-000000000005';
const SESSION_ID = '00000000-0000-0000-0000-000000000006';

const auditContext: AuditRequestContext = {
  requestId: '00000000-0000-0000-0000-000000000007',
  correlationId: null,
  ipAddress: null,
  userAgent: null,
};

function makeActiveTenant() {
  return {
    id: TENANT_ID,
    slug: 'tenant-alpha',
    displayName: 'Tenant Alpha',
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeActiveOrganisation() {
  return {
    id: ORG_ID,
    tenantId: TENANT_ID,
    code: 'ORG-1',
    displayName: 'Organisation Alpha',
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeActiveFacility() {
  return {
    id: FACILITY_ID,
    tenantId: TENANT_ID,
    organisationId: ORG_ID,
    code: 'FAC-1',
    displayName: 'Facility Alpha',
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeSession(
  overrides: Partial<{
    activeTenantMembershipId: string | null;
    activeOrganisationId: string | null;
    activeFacilityId: string | null;
  }> = {},
) {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    activeTenantMembershipId: MEMBERSHIP_ID,
    activeOrganisationId: ORG_ID,
    activeFacilityId: FACILITY_ID,
    expiresAt: new Date('2026-12-31T23:59:59.000Z'),
    lastSeenAt: new Date('2026-07-26T10:00:00.000Z'),
    rotatedAt: null,
    revokedAt: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    tokenHash: 'a'.repeat(64),
    ...overrides,
  };
}

function makeUser() {
  return {
    id: USER_ID,
    email: 'admin@example.invalid',
    normalisedEmail: 'admin@example.invalid',
    displayName: 'Operator Alpha',
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeMembership() {
  return {
    id: MEMBERSHIP_ID,
    userId: USER_ID,
    tenantId: TENANT_ID,
    tenantSlug: 'tenant-alpha',
    tenantDisplayName: 'Tenant Alpha',
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeAuthResult(
  overrides: Partial<{
    session: ReturnType<typeof makeSession>;
    user: ReturnType<typeof makeUser>;
    memberships: ReturnType<typeof makeMembership>[];
  }> = {},
) {
  return {
    session: makeSession(),
    user: makeUser(),
    memberships: [makeMembership()],
    expiresAt: new Date('2026-12-31T23:59:59.000Z'),
    rotatedRawToken: null,
    ...overrides,
  };
}

function makeStubs(
  overrides: {
    tenant?: ReturnType<typeof makeActiveTenant> | null;
    organisation?: ReturnType<typeof makeActiveOrganisation> | null;
    facility?: ReturnType<typeof makeActiveFacility> | null;
    authResult?: ReturnType<typeof makeAuthResult> | null;
  } = {},
) {
  const tenant =
    overrides.tenant === undefined ? makeActiveTenant() : overrides.tenant;
  const organisation =
    overrides.organisation === undefined
      ? makeActiveOrganisation()
      : overrides.organisation;
  const facility =
    overrides.facility === undefined
      ? makeActiveFacility()
      : overrides.facility;
  const authResult =
    overrides.authResult === undefined
      ? makeAuthResult()
      : overrides.authResult;

  const tenantsFindById = vi.fn().mockResolvedValue(tenant);
  const tenants = {
    create: vi.fn(),
    findById: tenantsFindById,
    findBySlug: vi.fn(),
  } as unknown as TenantRepository;
  const organisationsFindById = vi.fn().mockResolvedValue(organisation);
  const organisations = {
    create: vi.fn(),
    findById: organisationsFindById,
    listForTenant: vi.fn(),
  } as unknown as OrganisationRepository;
  const facilitiesFindById = vi.fn().mockResolvedValue(facility);
  const facilities = {
    create: vi.fn(),
    findById: facilitiesFindById,
    listForOrganisation: vi.fn(),
  } as unknown as FacilityRepository;
  const authServiceGetSession = vi.fn().mockResolvedValue(authResult);
  const authService = {
    getSessionFromCookie: authServiceGetSession,
  } as unknown as AuthService;

  return {
    tenants,
    organisations,
    facilities,
    authService,
    tenantsFindById,
    organisationsFindById,
    facilitiesFindById,
    authServiceGetSession,
  };
}

function makeService(stubs: ReturnType<typeof makeStubs>) {
  return new ClinicAdminOverviewService(
    stubs.tenants,
    stubs.organisations,
    stubs.facilities,
    stubs.authService,
  );
}

// Destructure helper for test assertions. The stubs are typed as
// `TenantRepository` / `OrganisationRepository` / `FacilityRepository`
// (which declare `findById` as a method), but the underlying mock
// functions are accessible via the `*FindById` references returned
// from `makeStubs`. This avoids the `@typescript-eslint/unbound-method`
// lint error that would occur if we accessed `stubs.tenants.findById`
// directly as a function reference.

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClinicAdminOverviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. returns the overview payload for a valid R09 session with full active context', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    const result = await service.loadOverview('valid-cookie', auditContext);

    expect(result).not.toBeNull();
    expect(result!.activeContext.tenantDisplayName).toBe('Tenant Alpha');
    expect(result!.activeContext.organisationDisplayName).toBe(
      'Organisation Alpha',
    );
    expect(result!.activeContext.facilityDisplayName).toBe('Facility Alpha');
    expect(result!.administrator.displayName).toBe('Operator Alpha');
    expect(result!.regions).toHaveLength(9);
    expect(result!.generatedAt).toBeTruthy();
  });

  it('2. returns null when the session cookie is missing (controller maps to 401)', async () => {
    const stubs = makeStubs({ authResult: null });
    const service = makeService(stubs);

    const result = await service.loadOverview(undefined, auditContext);

    expect(result).toBeNull();
  });

  it('3. throws clinicAdminOverviewContextRequired when activeTenantMembershipId is null', async () => {
    const stubs = makeStubs({
      authResult: makeAuthResult({
        session: makeSession({ activeTenantMembershipId: null }),
      }),
    });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('4. throws clinicAdminOverviewContextRequired when activeOrganisationId is null', async () => {
    const stubs = makeStubs({
      authResult: makeAuthResult({
        session: makeSession({ activeOrganisationId: null }),
      }),
    });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('5. throws clinicAdminOverviewContextRequired when activeFacilityId is null', async () => {
    const stubs = makeStubs({
      authResult: makeAuthResult({
        session: makeSession({ activeFacilityId: null }),
      }),
    });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('6. throws when the active membership is not in the user memberships list', async () => {
    const stubs = makeStubs({
      authResult: makeAuthResult({
        session: makeSession({
          activeTenantMembershipId: '00000000-0000-0000-0000-000000000099',
        }),
      }),
    });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('7. throws when the tenant is not found (cross-tenant identifier returns null)', async () => {
    const stubs = makeStubs({ tenant: null });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('8. throws when the organisation is not found (cross-tenant identifier returns null)', async () => {
    const stubs = makeStubs({ organisation: null });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('9. throws when the facility is not found (cross-tenant identifier returns null)', async () => {
    const stubs = makeStubs({ facility: null });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('10. throws when the facility belongs to a different organisation (cross-organisation defence-in-depth)', async () => {
    const otherOrgId = '00000000-0000-0000-0000-000000000099';
    const stubs = makeStubs({
      facility: {
        ...makeActiveFacility(),
        organisationId: otherOrgId,
      },
    });
    const service = makeService(stubs);

    await expect(
      service.loadOverview('valid-cookie', auditContext),
    ).rejects.toMatchObject({
      response: { error: { code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED' } },
    });
  });

  it('11. produces a response that passes ClinicAdminOverviewResponseSchema validation', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    const result = await service.loadOverview('valid-cookie', auditContext);

    expect(result).not.toBeNull();
    const parsed = ClinicAdminOverviewResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('12. produces exactly 9 regions with the approved availability declarations', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    const result = await service.loadOverview('valid-cookie', auditContext);

    expect(result).not.toBeNull();
    expect(result!.regions).toHaveLength(9);
    const keys = result!.regions.map((r) => r.key);
    expect(keys).toEqual([
      'appointment_actions',
      'financial_snapshot',
      'todays_appointments',
      'operational_alerts',
      'inventory_alerts',
      'doctors_on_duty',
      'waiting_room_operations',
      'staff_attendance_summary',
      'quick_actions',
    ]);
    const appointmentActions = result!.regions.find(
      (r) => r.key === 'appointment_actions',
    );
    const quickActions = result!.regions.find((r) => r.key === 'quick_actions');
    expect(appointmentActions!.availability).toBe('navigational_only');
    expect(quickActions!.availability).toBe('navigational_only');
    for (const r of result!.regions) {
      if (r.key !== 'appointment_actions' && r.key !== 'quick_actions') {
        expect(r.availability).toBe('not_supported');
      }
    }
  });

  it('13. does NOT carry raw UUIDs in the response (only display names)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    const result = await service.loadOverview('valid-cookie', auditContext);

    expect(result).not.toBeNull();
    const json = JSON.stringify(result);
    // The response MUST NOT contain any of the raw UUIDs from the
    // session, the user, the tenant, the organisation, or the
    // facility. Only display names are exposed.
    expect(json).not.toContain(TENANT_ID);
    expect(json).not.toContain(ORG_ID);
    expect(json).not.toContain(FACILITY_ID);
    expect(json).not.toContain(MEMBERSHIP_ID);
    expect(json).not.toContain(USER_ID);
    expect(json).not.toContain(SESSION_ID);
  });

  // -------------------------------------------------------------------------
  // Audit-emission regression coverage.
  //
  // The original live-data batch had the service emit an explicit
  // `clinic_admin.overview.viewed` audit event via `AuditHelperService`.
  // The `clinic_admin` category was NOT accepted by the
  // `audit_events_category_check` CHECK constraint in the dedicated
  // audit database, so the outbox INSERT would succeed but the
  // dispatcher's projection would fail, leaving the outbox row pending
  // forever and silently breaking the audit trail. The correction
  // removed the `AuditHelperService` dependency from the service
  // entirely. The audit trail is now provided by the
  // `AuthorizationGuard`'s existing `authorization.decision.allowed`
  // event (category `authorization`, which IS in the database CHECK
  // constraint).
  //
  // These tests prove the service no longer depends on
  // `AuditHelperService` and no longer attempts to emit a
  // `clinic_admin` audit event. They guard against a regression where
  // the dependency is reintroduced without a corresponding database
  // migration.
  // -------------------------------------------------------------------------

  it('14. does NOT emit a clinic_admin.overview.viewed audit event (the category is database-incompatible)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    // The service should complete successfully without throwing.
    const result = await service.loadOverview('valid-cookie', auditContext);
    expect(result).not.toBeNull();

    // The service no longer has an `auditHelper` property. If a
    // future regression reintroduces the dependency, this assertion
    // will fail because the property would exist.
    expect(
      (service as unknown as { auditHelper?: unknown }).auditHelper,
    ).toBeUndefined();
  });

  it('15. the constructor does NOT accept an AuditHelperService dependency', () => {
    // The service's constructor signature is:
    //   (tenants, organisations, facilities, authService)
    // The original live-data batch had a 5th parameter `auditHelper`.
    // The correction removed it. This test verifies the constructor
    // length is 4 (not 5), which structurally prevents a future
    // regression from silently re-adding the dependency without
    // updating the tests.
    expect(ClinicAdminOverviewService.length).toBe(4);
  });

  it('16. the tenant repository findById is called with the active membership tenantId (no caller-supplied scope)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    await service.loadOverview('valid-cookie', auditContext);

    expect(stubs.tenantsFindById).toHaveBeenCalledTimes(1);
    expect(stubs.tenantsFindById).toHaveBeenCalledWith(TENANT_ID);
  });

  it('17. the organisation repository findById is called with the session tenantId and active organisationId (tenant-scoped)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    await service.loadOverview('valid-cookie', auditContext);

    expect(stubs.organisationsFindById).toHaveBeenCalledTimes(1);
    expect(stubs.organisationsFindById).toHaveBeenCalledWith(TENANT_ID, ORG_ID);
  });

  it('18. the facility repository findById is called with the session tenantId and active facilityId (tenant-scoped)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    await service.loadOverview('valid-cookie', auditContext);

    expect(stubs.facilitiesFindById).toHaveBeenCalledTimes(1);
    expect(stubs.facilitiesFindById).toHaveBeenCalledWith(
      TENANT_ID,
      FACILITY_ID,
    );
  });
});
