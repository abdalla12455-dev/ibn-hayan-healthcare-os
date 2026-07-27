import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ClinicAdminOverviewService } from './clinic-admin-overview.service.js';
import { ClinicAdminOverviewResponseSchema } from '@ibn-hayan/contracts';
import type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
} from '@ibn-hayan/domain';
import type { AuthService, AuditRequestContext } from '../auth/auth.service.js';
import type { AuditHelperService } from '../audit/audit-helper.service.js';

/**
 * Focused unit tests for the Clinic Admin Overview service.
 *
 * These tests verify the service's read-side orchestration logic
 * WITHOUT requiring PostgreSQL 17 or a full Nest application
 * bootstrap. The repository ports, the `AuthService`, and the
 * `AuditHelperService` are mocked via plain JS object stubs (no
 * `vi.mock` of modules, no NestJS DI container). This pattern matches
 * the existing `apps/api/src/health/health.service.spec.ts` pattern.
 *
 * Coverage map (per the audit-semantics restoration task Phase 2):
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
 * 14. The service emits `clinic_admin.overview.viewed` (mapped to
 *     `facility_context` category) AFTER the operation succeeds.
 * 15. The constructor accepts an `AuditHelperService` dependency.
 * 16-18. Repository findById calls use session-derived tenantId.
 * 19-21. The audit event is NOT emitted on failure paths.
 * 22. The audit event metadata carries only the endpoint name.
 * 23. The audit event uses session-derived actor/session/tenant.
 * 24. The audit event is NOT emitted when auditContext is undefined.
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

  // AuditHelperService mock: capture the emitDirect calls so tests
  // can assert the audit event is emitted (or NOT emitted) on each
  // code path. The mock returns `{ ok: true }` to simulate a
  // successful outbox INSERT.
  //
  // The mock is typed to accept an `AuditEventBuildInput`-shaped
  // argument so tests can access `mock.calls[0][0]` without
  // `@typescript-eslint/no-unsafe-member-access` errors.
  type EmitCallArg = {
    readonly action: string;
    readonly outcome: string;
    readonly source: string;
    readonly tenantId?: string;
    readonly actorType?: string;
    readonly actorId?: string;
    readonly sessionId?: string;
    readonly requestId?: string;
    readonly correlationId?: string | null;
    readonly ipAddress?: string | null;
    readonly userAgent?: string | null;
    readonly scope?: string;
    readonly metadata?: unknown;
  };
  const auditHelperEmitDirect = vi.fn(
    (_input: EmitCallArg): Promise<{ ok: true }> =>
      Promise.resolve({ ok: true }),
  );
  const auditHelper = {
    emitDirect: auditHelperEmitDirect,
    emit: auditHelperEmitDirect,
    emitOrFail: vi.fn().mockResolvedValue(undefined),
    computeFailedLoginIdentifierHash: vi.fn(),
  } as unknown as AuditHelperService;

  return {
    tenants,
    organisations,
    facilities,
    authService,
    auditHelper,
    tenantsFindById,
    organisationsFindById,
    facilitiesFindById,
    authServiceGetSession,
    auditHelperEmitDirect,
  };
}

function makeService(stubs: ReturnType<typeof makeStubs>) {
  return new ClinicAdminOverviewService(
    stubs.tenants,
    stubs.organisations,
    stubs.facilities,
    stubs.authService,
    stubs.auditHelper,
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
  // Audit-emission coverage (restored explicit successful-view event).
  //
  // The service emits `clinic_admin.overview.viewed` via
  // `auditHelper.emitDirect(...)` AFTER the Overview operation
  // completes successfully. The action is mapped to the existing
  // `facility_context` category by `inferCategoryFromAction` (see
  // `packages/observability/src/audit/action-codes.ts`). The
  // `facility_context` category IS accepted by the
  // `audit_events_category_check` CHECK constraint — no migration is
  // required.
  //
  // These tests prove:
  //   14. The event IS emitted after a successful operation.
  //   15. The constructor accepts an `AuditHelperService` dependency.
  //   19. The event is NOT emitted when context resolution fails
  //       (null return for missing session).
  //   20. The event is NOT emitted when the service throws
  //       (missing active context).
  //   21. The event is NOT emitted when the facility belongs to
  //       another organisation.
  //   22. The event metadata carries only `{ endpoint: 'clinic_admin_overview_view' }`.
  //   23. The event uses session-derived actorId, sessionId, tenantId.
  //   24. The event is NOT emitted when auditContext is undefined.
  // -------------------------------------------------------------------------

  it('14. emits clinic_admin.overview.viewed AFTER the operation succeeds (mapped to facility_context category)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    const result = await service.loadOverview('valid-cookie', auditContext);
    expect(result).not.toBeNull();

    // The audit event MUST be emitted exactly once.
    expect(stubs.auditHelperEmitDirect).toHaveBeenCalledTimes(1);
    const call = stubs.auditHelperEmitDirect.mock.calls[0]![0];
    expect(call.action).toBe('clinic_admin.overview.viewed');
    expect(call.outcome).toBe('success');
    expect(call.source).toBe('api');
    // The metadata MUST carry only the endpoint name.
    expect(call.metadata).toEqual({
      endpoint: 'clinic_admin_overview_view',
    });
  });

  it('15. the constructor accepts an AuditHelperService dependency (5 parameters)', () => {
    // The service's constructor signature is:
    //   (tenants, organisations, facilities, authService, auditHelper)
    // The audit-semantics restoration re-added the 5th parameter.
    // This test verifies the constructor length is 5.
    expect(ClinicAdminOverviewService.length).toBe(5);
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

  it('19. does NOT emit the audit event when context resolution fails (missing session returns null)', async () => {
    const stubs = makeStubs({ authResult: null });
    const service = makeService(stubs);

    const result = await service.loadOverview(undefined, auditContext);
    expect(result).toBeNull();

    // The audit event MUST NOT be emitted on the null-return path.
    expect(stubs.auditHelperEmitDirect).not.toHaveBeenCalled();
  });

  it('20. does NOT emit the audit event when the service throws (missing active context)', async () => {
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

    // The audit event MUST NOT be emitted on the throw path.
    expect(stubs.auditHelperEmitDirect).not.toHaveBeenCalled();
  });

  it('21. does NOT emit the audit event when the facility belongs to another organisation', async () => {
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

    // The audit event MUST NOT be emitted on the cross-organisation
    // throw path. A successful-view event would be misleading if the
    // operation actually failed.
    expect(stubs.auditHelperEmitDirect).not.toHaveBeenCalled();
  });

  it('22. the audit event metadata carries only the endpoint name (no sensitive business payload)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    await service.loadOverview('valid-cookie', auditContext);

    expect(stubs.auditHelperEmitDirect).toHaveBeenCalledTimes(1);
    const call = stubs.auditHelperEmitDirect.mock.calls[0]![0];
    const metadata = call.metadata as Record<string, unknown>;
    const metadataKeys = Object.keys(metadata).sort();
    expect(metadataKeys).toEqual(['endpoint']);
    expect(metadata.endpoint).toBe('clinic_admin_overview_view');
    // The metadata MUST NOT contain display names, UUIDs, or business
    // payload. The standard actor/session/tenant fields are passed as
    // top-level fields (not inside metadata).
    const metadataJson = JSON.stringify(metadata);
    expect(metadataJson).not.toContain('Tenant Alpha');
    expect(metadataJson).not.toContain('Organisation Alpha');
    expect(metadataJson).not.toContain('Facility Alpha');
    expect(metadataJson).not.toContain('Operator Alpha');
    expect(metadataJson).not.toContain(TENANT_ID);
    expect(metadataJson).not.toContain(ORG_ID);
    expect(metadataJson).not.toContain(FACILITY_ID);
    expect(metadataJson).not.toContain(USER_ID);
    expect(metadataJson).not.toContain(SESSION_ID);
  });

  it('23. the audit event uses session-derived actorId, sessionId, and tenantId (no caller-supplied scope)', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    await service.loadOverview('valid-cookie', auditContext);

    expect(stubs.auditHelperEmitDirect).toHaveBeenCalledTimes(1);
    const call = stubs.auditHelperEmitDirect.mock.calls[0]![0];
    // The actorId MUST be the authenticated user's id (from the
    // session), not a caller-supplied value.
    expect(call.actorId).toBe(USER_ID);
    // The sessionId MUST be the authenticated session's id.
    expect(call.sessionId).toBe(SESSION_ID);
    // The tenantId MUST be the active membership's tenant id (resolved
    // from the session), not a caller-supplied value.
    expect(call.tenantId).toBe(TENANT_ID);
    // The actorType MUST be 'USER' (the authenticated principal).
    expect(call.actorType).toBe('USER');
  });

  it('24. does NOT emit the audit event when auditContext is undefined', async () => {
    const stubs = makeStubs();
    const service = makeService(stubs);

    // Call without auditContext. The service should still return the
    // overview payload, but the audit event is NOT emitted (because
    // the service cannot construct the audit request context).
    const result = await service.loadOverview('valid-cookie', undefined);
    expect(result).not.toBeNull();

    // The audit event MUST NOT be emitted when auditContext is
    // undefined. This matches the session-context module's pattern
    // (see `if (auditContext !== undefined)` guard in
    // `session-context.service.ts`).
    expect(stubs.auditHelperEmitDirect).not.toHaveBeenCalled();
  });
});
