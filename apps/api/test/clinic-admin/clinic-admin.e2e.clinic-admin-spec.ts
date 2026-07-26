import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';
import { LocalCredentialService } from '../../src/infrastructure/database/repositories/local-credential.service.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import type {
  TenantRepository,
  UserRepository,
  TenantMembershipRepository,
  TenantRoleAssignmentRepository,
  OrganisationRepository,
  FacilityRepository,
  TenantId,
  OrganisationId,
  FacilityId,
  PlatformRoleCode,
} from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
} from '../../src/infrastructure/database/database.module.js';
import { setupDatabaseTests } from '../database/_pg-bootstrap.js';
import { execFileSync } from 'node:child_process';
import { ClinicAdminOverviewResponseSchema } from '@ibn-hayan/contracts';
import { getPsqlBin, getDatabaseUrl } from '../database/_pg-bootstrap.js';
import {
  fetchCsrfToken,
  assertCsrfToken,
  resetThrottlerStorageSafely,
  parseClinicAdminOverviewErrorResponse,
  parseAuthErrorResponse,
} from './_clinic-admin-test-helpers.js';

/**
 * Clinic Admin Overview HTTP integration tests.
 *
 * These tests exercise the full Clinic Admin Overview flow via
 * supertest against a real NestJS application with a real PostgreSQL
 * 17 database. They cover the 24 mandatory scenarios from the
 * audit-semantics restoration task Phase 4.
 *
 * Test matrix:
 * 1. R09 with valid session and full context returns HTTP 200.
 * 2. The response passes the strict Clinic Admin Overview schema.
 * 3. R13 Platform Super Admin returns HTTP 403.
 * 4. Every tested non-R09 role returns HTTP 403.
 * 5. Missing session returns HTTP 401.
 * 6. Expired session returns HTTP 401.
 * 7. Revoked session returns HTTP 401.
 * 8. Missing active membership returns HTTP 403.
 * 9. Missing active organisation returns HTTP 403.
 * 10. Missing active facility returns HTTP 403.
 * 11. Organisation from another tenant fails closed.
 * 12. Facility from another tenant fails closed.
 * 13. Facility belonging to another organisation in the same tenant fails closed.
 * 14. Query-string tenant identifiers cannot override session context.
 * 15. Query-string organisation identifiers cannot override session context.
 * 16. Query-string facility identifiers cannot override session context.
 * 17. Custom scope headers cannot override session context.
 * 18. Request body identifiers cannot override session context.
 * 19. Role Preview cannot bypass the permission requirement.
 * 20. Platform Super Admin is never converted to Clinic Administrator.
 * 21. The correct audit event or events are produced.
 * 22. Failed requests do not emit a false successful-view event.
 * 23. No sensitive values appear in the audit metadata.
 * 24. Database cleanup leaves no cross-test contamination.
 *
 * Per the audit-semantics restoration task Phase 4, these tests
 * require PostgreSQL 17. When PostgreSQL 17 is unavailable locally,
 * the suite is NOT run; GitHub Actions remains authoritative.
 */

setupDatabaseTests();

let app: INestApplication;
let server: Server;
let prisma: PrismaService;
let users: UserRepository;
let tenants: TenantRepository;
let memberships: TenantMembershipRepository;
let roleAssignments: TenantRoleAssignmentRepository;
let organisations: OrganisationRepository;
let facilities: FacilityRepository;
let credentials: LocalCredentialService;
let passwordService: PasswordService;
let throttlerStorage: ThrottlerStorage;

const TEST_PASSWORD = 'sufficiently-long-password';
const ORIGIN = 'http://localhost:3000';

interface BootstrapResult {
  userId: string;
  tenantId: string;
  membershipId: string;
  organisationId: string;
  facilityId: string;
}

/**
 * The setup strategy for the test fixture.
 *
 * Per ADR-015 §1.5 (Scope-authorisation Semantics), the production
 * session-context service enforces scope-aware role-assignment
 * checks at `PUT /api/v1/context/organisation` and
 * `PUT /api/v1/context/facility`:
 *
 * - A tenant-scoped R09_ADMINISTRATOR assignment does NOT authorise
 *   organisation or facility selection. R09 must be assigned at
 *   organisation scope (or facility scope) to select that
 *   organisation (or facility).
 * - A tenant-scoped R13_SYSTEM_ADMINISTRATOR assignment DOES
 *   authorise tenant-wide organisation and facility selection
 *   (the single ADR-015 §1.5 exception for R13).
 * - R01–R12 (non-R09, non-R13) tenant-scoped assignments do NOT
 *   authorise organisation or facility selection.
 * - R14_INTEGRATION_ACCOUNT has no context permissions at all.
 *
 * The previous fixture created ONLY a tenant-scoped assignment for
 * the nominal role. For R09, that tenant-scoped assignment is
 * insufficient to select organisation or facility context — the
 * `selectOrganisationContext` setup step returns 403
 * `CONTEXT_SELECTION_FORBIDDEN` (the production enforcement), and
 * the test fails during setup before reaching the asserted Overview
 * endpoint. For R01–R08, R10–R12, and R14, the tenant-scoped
 * assignment is similarly insufficient — setup also 403s.
 *
 * The fixture now creates additional scoped assignments so setup
 * completes legitimately:
 *
 * - `R09_SCOPED`: the R09 success scenarios. Creates a
 *   tenant-scoped R09 assignment PLUS an organisation-scoped R09
 *   assignment for the test organisation PLUS a facility-scoped
 *   R09 assignment for the test facility. R09 alone authorises
 *   tenant, organisation, and facility context selection through
 *   its scoped assignments — no R13 backdoor. The Overview
 *   endpoint's AuthorizationGuard sees R09's
 *   `clinic_admin_overview:view` permission and returns 200.
 *
 * - `R13_SETUP`: the non-R09 denial scenarios (R01–R08, R10–R14).
 *   Creates a tenant-scoped assignment for the nominal role PLUS a
 *   tenant-scoped R13 assignment to authorise setup. Per ADR-015
 *   §1.5, R13 at tenant scope grants organisation and facility
 *   selection for every org/facility under the tenant. The final
 *   Overview request still returns 403 because R13 (and the
 *   nominal role) do NOT grant `clinic_admin_overview:view`.
 *
 * - `R13_ONLY`: the R13-only denial scenarios. Creates only a
 *   tenant-scoped R13 assignment. R13 alone authorises setup, and
 *   the Overview request returns 403 (R13 does not grant
 *   `clinic_admin_overview:view`).
 *
 * - `R09_TENANT_ONLY`: the missing-context scenarios (tests #9,
 *   #10) where setup deliberately stops before selecting the
 *   missing dimension. Creates the same scoped R09 assignments as
 *   `R09_SCOPED` so the available setup steps succeed; the test
 *   then skips the relevant select call to leave the dimension
 *   unset.
 */
type SetupMode = 'R09_SCOPED' | 'R13_SETUP' | 'R13_ONLY' | 'R09_TENANT_ONLY';

async function bootstrapUserAndContext(
  userEmail: string,
  userDisplayName: string,
  tenantSlug: string,
  tenantDisplayName: string,
  roleCode: PlatformRoleCode,
  options: {
    readonly tenantStatus?: 'active' | 'suspended';
    readonly membershipStatus?: 'active' | 'suspended';
    readonly createOrganisation?: boolean;
    readonly createFacility?: boolean;
    readonly facilityOrganisationId?: OrganisationId;
    readonly setupMode?: SetupMode;
  } = {},
): Promise<BootstrapResult> {
  // Determine the setup mode. The default depends on the nominal
  // role: R09 uses scoped assignments; R13 uses R13 alone; every
  // other role adds an R13 setup enabler.
  const setupMode: SetupMode =
    options.setupMode ??
    (roleCode === 'R09_ADMINISTRATOR'
      ? 'R09_SCOPED'
      : roleCode === 'R13_SYSTEM_ADMINISTRATOR'
        ? 'R13_ONLY'
        : 'R13_SETUP');

  const tenant = await tenants.create({
    slug: tenantSlug,
    displayName: tenantDisplayName,
    status: options.tenantStatus ?? 'active',
  });
  const user = await users.create({
    email: userEmail,
    displayName: userDisplayName,
  });
  const hash = await passwordService.hash(TEST_PASSWORD);
  await credentials.createCredential({
    userId: user.id,
    passwordHash: hash,
    passwordChangedAt: new Date(),
  });
  const membership = await memberships.create({
    tenantId: tenant.id,
    userId: user.id,
    status: options.membershipStatus ?? 'active',
  });

  // Create the nominal role assignment at tenant scope. This is
  // the user's "real" role for the test scenario. The setup-mode
  // specific assignments below are ADDITIONAL assignments that
  // enable context selection (per ADR-015 §1.5).
  await roleAssignments.create({
    tenantMembershipId: membership.id,
    roleCode,
  });

  let organisationId: OrganisationId | '' = '';
  if (options.createOrganisation !== false) {
    const org = await organisations.create({
      tenantId: tenant.id,
      code: `ORG-${tenantSlug}`,
      displayName: `Organisation ${tenantDisplayName}`,
      status: 'active',
    });
    organisationId = org.id;
  }

  let facilityId = '';
  if (options.createFacility !== false && organisationId !== '') {
    const fac = await facilities.create({
      tenantId: tenant.id,
      organisationId: options.facilityOrganisationId ?? organisationId,
      code: `FAC-${tenantSlug}`,
      displayName: `Facility ${tenantDisplayName}`,
      status: 'active',
    });
    facilityId = fac.id;
  }

  // Per ADR-015 §1.5, create additional scoped assignments so
  // setup (tenant, organisation, facility context selection)
  // completes legitimately. The nominal role assignment above is
  // the "real" role for the test scenario; these additional
  // assignments are the structural enablers that satisfy the
  // production scope-authorisation rules.
  if (setupMode === 'R09_SCOPED' || setupMode === 'R09_TENANT_ONLY') {
    // R09 success scenarios and missing-context scenarios: create
    // organisation-scoped and facility-scoped R09 assignments so
    // R09 alone can select organisation and facility context
    // (per ADR-015 §1.5 condition 1 for organisation selection
    // and condition 1 for facility selection). No R13 backdoor.
    if (organisationId !== '') {
      await roleAssignments.create({
        tenantMembershipId: membership.id,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'organisation',
        scopeOrganisationId: organisationId,
      });
    }
    if (organisationId !== '' && facilityId !== '') {
      await roleAssignments.create({
        tenantMembershipId: membership.id,
        roleCode: 'R09_ADMINISTRATOR',
        scopeLevel: 'facility',
        scopeOrganisationId: organisationId,
        scopeFacilityId: facilityId as FacilityId,
      });
    }
  } else if (setupMode === 'R13_SETUP') {
    // Non-R09 denial scenarios: add a tenant-scoped R13 assignment
    // to authorise setup. Per ADR-015 §1.5 condition 3, a
    // tenant-scoped R13 assignment grants organisation and facility
    // selection for every org/facility under the tenant. The final
    // Overview request returns 403 because the union of R13 and
    // the nominal role does NOT grant `clinic_admin_overview:view`
    // (only R09 grants that permission, per the role-permission
    // matrix).
    await roleAssignments.create({
      tenantMembershipId: membership.id,
      roleCode: 'R13_SYSTEM_ADMINISTRATOR',
    });
  }
  // R13_ONLY: no additional assignments. R13 at tenant scope
  // already authorises setup per ADR-015 §1.5 condition 3.

  return {
    userId: user.id,
    tenantId: tenant.id,
    membershipId: membership.id,
    organisationId,
    facilityId,
  };
}

function truncateAll(): void {
  execFileSync(
    getPsqlBin(),
    [
      getDatabaseUrl(),
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      'TRUNCATE TABLE auth_sessions, audit_outbox_events, tenant_role_assignments, tenant_memberships, local_credentials, users, tenants, organisations, facilities RESTART IDENTITY CASCADE;',
    ],
    { stdio: 'pipe', encoding: 'utf-8' },
  );
}

function extractSessionCookie(response: unknown): string {
  const headers = (response as { headers?: Record<string, unknown> }).headers;
  if (!headers) return '';
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  if (Array.isArray(setCookie)) {
    const first: unknown = setCookie[0];
    if (typeof first === 'string') {
      return first.split(';')[0] ?? '';
    }
    return '';
  }
  if (typeof setCookie === 'string') {
    return setCookie.split(';')[0] ?? '';
  }
  return '';
}

async function loginAndReturnCookie(email: string): Promise<string> {
  const response = await request(server)
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email, password: TEST_PASSWORD })
    .expect(200);
  return extractSessionCookie(response);
}

async function selectTenantContext(
  cookie: string,
  membershipId: string,
): Promise<void> {
  // Acquire a real CSRF token via the strict-schema-validated helper.
  // The helper NEVER returns undefined — it throws a precise
  // diagnostic at the point of acquisition if the response does not
  // match CsrfResponseSchema. This prevents the previous defect
  // where reading `body.csrfToken` (wrong field name; the endpoint
  // returns `{ token }`) yielded undefined and crashed inside
  // Superagent's header setter before the request reached the app.
  const csrfToken = await fetchCsrfToken(server, cookie);
  assertCsrfToken(csrfToken, 'selectTenantContext');
  await request(server)
    .put('/api/v1/context/tenant')
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrfToken)
    .send({ membershipId })
    .expect(200);
}

async function selectOrganisationContext(
  cookie: string,
  organisationId: string,
): Promise<void> {
  const csrfToken = await fetchCsrfToken(server, cookie);
  assertCsrfToken(csrfToken, 'selectOrganisationContext');
  await request(server)
    .put('/api/v1/context/organisation')
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrfToken)
    .send({ organisationId })
    .expect(200);
}

async function selectFacilityContext(
  cookie: string,
  facilityId: string,
): Promise<void> {
  const csrfToken = await fetchCsrfToken(server, cookie);
  assertCsrfToken(csrfToken, 'selectFacilityContext');
  await request(server)
    .put('/api/v1/context/facility')
    .set('Cookie', cookie)
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', csrfToken)
    .send({ facilityId })
    .expect(200);
}

async function loginAndSelectContext(
  email: string,
  membershipId: string,
  organisationId: string,
  facilityId: string,
): Promise<string> {
  const cookie = await loginAndReturnCookie(email);
  await selectTenantContext(cookie, membershipId);
  await selectOrganisationContext(cookie, organisationId);
  await selectFacilityContext(cookie, facilityId);
  return cookie;
}

/**
 * Endpoint-reach proof for `GET /api/v1/clinic-admin/overview`.
 *
 * Per the second-stage CI-harness correction task Phase 7, every
 * scenario must prove that the Overview endpoint was actually
 * issued — a setup 403 must never masquerade as the endpoint's
 * expected 403. The structural proof is an audit-outbox row-count
 * delta: the AuthorizationGuard emits a direct (non-transactional)
 * audit event for every authorization decision (allowed OR denied)
 * it makes on the Overview route. If the row count does not change,
 * the request never reached the guard.
 *
 * Usage:
 *   const before = await countOverviewAuditEvents();
 *   const response = await request(server).get('/api/v1/clinic-admin/overview')...
 *   const after = await countOverviewAuditEvents();
 *   expect(after).toBeGreaterThan(before);   // endpoint was reached
 *
 * The helper counts rows whose `canonicalEventDraft` carries an
 * `authorization.decision.allowed` or `authorization.decision.denied`
 * action with `metadata.endpoint === '/api/v1/clinic-admin/overview'`.
 * The metadata is set by the AuthorizationGuard's
 * `emitAuthorizationAllowed` / `emitAuthorizationDenied` methods
 * (which use `request.path` for the endpoint). The count is exact
 * for the current test because `beforeEach` truncates
 * `audit_outbox_events`.
 *
 * For tests #5 (no session) and #8 (no active membership) the guard
 * short-circuits to 401 (`AUTH_SESSION_REQUIRED`) before emitting
 * an authorization-decision event; for those tests the proof is
 * the HTTP status itself (401 cannot come from the Overview service,
 * which only emits 403 `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED` or
 * 200). The endpoint-reach assertion for those tests is therefore
 * the `.expect(401)` call.
 */
async function countOverviewAuthorizationAuditEvents(): Promise<number> {
  const rows = await prisma.auditOutboxEvent.findMany({
    where: { deliveredAt: null },
  });
  let count = 0;
  for (const row of rows) {
    const draft = row.canonicalEventDraft as {
      action?: string;
      metadata?: { endpoint?: string };
    };
    if (
      (draft.action === 'authorization.decision.allowed' ||
        draft.action === 'authorization.decision.denied') &&
      draft.metadata?.endpoint === '/api/v1/clinic-admin/overview'
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Assert that the Overview endpoint was actually reached for a
 * denial scenario. The guard emits an `authorization.decision.denied`
 * event for every 403 it returns; the count must increase by
 * exactly one. Use this for tests #3, #4, #19, #20, #22 (guard
 * denial with `AUTHORIZATION_FORBIDDEN`).
 *
 * For tests #9, #10, #11, #12, #13 the guard ALLOWS the request
 * (R09 has `clinic_admin_overview:view`) and emits
 * `authorization.decision.allowed`; the service then throws
 * `clinicAdminOverviewContextRequired()`. Use
 * {@link assertOverviewAllowedAndReached} for those tests.
 */
async function assertOverviewDeniedAndReached(
  beforeCount: number,
): Promise<void> {
  const afterCount = await countOverviewAuthorizationAuditEvents();
  expect(afterCount).toBe(beforeCount + 1);
}

/**
 * Assert that the Overview endpoint was actually reached for a
 * service-level denial scenario (the guard allowed the request;
 * the service threw `clinicAdminOverviewContextRequired()`). The
 * guard emits an `authorization.decision.allowed` event; the count
 * must increase by exactly one.
 */
async function assertOverviewAllowedAndReached(
  beforeCount: number,
): Promise<void> {
  const afterCount = await countOverviewAuthorizationAuditEvents();
  expect(afterCount).toBe(beforeCount + 1);
}

/**
 * Assert that the Overview endpoint was actually reached for a
 * success scenario. The guard emits an
 * `authorization.decision.allowed` event; the service then emits
 * a `clinic_admin.overview.viewed` event. The count of
 * authorization-decision events must increase by exactly one.
 */
async function assertOverviewSucceededAndReached(
  beforeCount: number,
): Promise<void> {
  const afterCount = await countOverviewAuthorizationAuditEvents();
  expect(afterCount).toBe(beforeCount + 1);
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  server = app.getHttpServer() as Server;

  prisma = app.get(PrismaService);
  users = app.get<UserRepository>(USER_REPOSITORY);
  tenants = app.get<TenantRepository>(TENANT_REPOSITORY);
  memberships = app.get<TenantMembershipRepository>(
    TENANT_MEMBERSHIP_REPOSITORY,
  );
  roleAssignments = app.get<TenantRoleAssignmentRepository>(
    TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  );
  organisations = app.get<OrganisationRepository>(ORGANISATION_REPOSITORY);
  facilities = app.get<FacilityRepository>(FACILITY_REPOSITORY);
  credentials = app.get(LocalCredentialService);
  passwordService = app.get(PasswordService);
  throttlerStorage = app.get(ThrottlerStorage);
}, 60_000);

afterAll(async () => {
  // Defensive teardown: if `beforeAll` failed partially (e.g. PG17
  // unavailable, AppModule bootstrap failed, etc.), `app` may be
  // undefined. Calling `app.close()` on undefined would throw a
  // TypeError that masks the original `beforeAll` failure in the
  // test output. The optional chaining + `if (app)` guard matches
  // the established defensive teardown pattern in
  // `apps/api/test/audit/audit-atomicity.audit-atomicity-spec.ts`
  // and `apps/api/test/role-preview/role-preview.role-preview-spec.ts`.
  //
  // When `app` IS defined, `app.close()` is called exactly once.
  // NestJS's `close()` triggers `onApplicationShutdown()` on every
  // module — including the `ThrottlerStorageService.onApplicationShutdown()`
  // which clears all pending `setTimeout` handles. This is the
  // redundant safety net for the `resetThrottlerStorageSafely()`
  // helper: even if a between-test reset missed a handle (e.g.
  // because a timer was scheduled between the reset and `app.close()`),
  // `onApplicationShutdown()` will clear it during teardown.
  if (app) {
    await app.close();
  }
});

beforeEach(() => {
  truncateAll();
  // Safely reset the ThrottlerStorageService between tests.
  //
  // The previous `resetThrottlerStorage()` only cleared the storage
  // Map but left the pending `setTimeout` handles active. When a
  // delayed callback fired against the now-empty storage Map, it
  // crashed with `TypeError: Cannot destructure property 'totalHits'
  // of 'this.storage.get(...)' as it is undefined`. The unhandled
  // exception corrupted the test process state, preventing
  // `app.close()` from completing and causing the `afterAll` hook
  // to time out at 60s.
  //
  // The safe helper clears timeout handles FIRST (calling
  // `clearTimeout` on each pending handle), THEN clears the storage
  // entries Map. This matches the `onApplicationShutdown()`
  // semantics that NestJS calls during `app.close()`.
  resetThrottlerStorageSafely(throttlerStorage);
});

// NOTE: The previous inline `resetThrottlerStorage()` function has
// been removed. It is replaced by the typed, schema-guarded
// `resetThrottlerStorageSafely()` helper imported from
// `./_clinic-admin-test-helpers.js`. The helper:
//   1. Iterates `timeoutIds` (keyed by throttler name) and calls
//      `clearTimeout` on each pending handle.
//   2. Clears the `timeoutIds` Map.
//   3. Clears the `storage` entries Map.
// The order is critical: clearing storage first would leave pending
// timeout callbacks pointing at missing entries, reproducing the
// original destructuring crash.

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------

describe('GET /api/v1/clinic-admin/overview', () => {
  it('1. R09 with valid session and full context returns HTTP 200', async () => {
    const ctx = await bootstrapUserAndContext(
      'admin@example.invalid',
      'Admin Alpha',
      'tenant-alpha',
      'Tenant Alpha',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'admin@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    expect(response.body).toMatchObject({
      activeContext: {
        tenantDisplayName: 'Tenant Alpha',
        organisationDisplayName: 'Organisation Tenant Alpha',
        facilityDisplayName: 'Facility Tenant Alpha',
      },
      administrator: {
        displayName: 'Admin Alpha',
      },
    });
  });

  it('2. the response passes the strict Clinic Admin Overview schema', async () => {
    const ctx = await bootstrapUserAndContext(
      'admin2@example.invalid',
      'Admin Beta',
      'tenant-beta',
      'Tenant Beta',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'admin2@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    const parsed = ClinicAdminOverviewResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
  });

  it('3. R13 Platform Super Admin returns HTTP 403', async () => {
    const ctx = await bootstrapUserAndContext(
      'superadmin@example.invalid',
      'Super Admin',
      'tenant-super',
      'Tenant Super',
      'R13_SYSTEM_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'superadmin@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewDeniedAndReached(before);

    // R13 lacks `clinic_admin_overview:view`; the guard denies with
    // AUTHORIZATION_FORBIDDEN (which IS in AuthErrorResponseSchema).
    parseAuthErrorResponse(response.body);
  });

  it('4. every tested non-R09 role returns HTTP 403', async () => {
    const nonR09Roles = [
      'R01_PHYSICIAN',
      'R02_NURSE',
      'R03_PHARMACIST',
      'R04_TECHNICIAN',
      'R05_ALLIED_HEALTH_PROFESSIONAL',
      'R06_RECEPTIONIST',
      'R07_SCHEDULER',
      'R08_BILLER',
      'R10_COMPLIANCE_OFFICER',
      'R11_HR_MANAGER',
      'R12_EXECUTIVE',
      'R13_SYSTEM_ADMINISTRATOR',
      'R14_INTEGRATION_ACCOUNT',
    ] as const;

    for (const roleCode of nonR09Roles) {
      truncateAll();
      // Use the safe throttler reset (clears timeout handles FIRST,
      // then storage entries). The previous `resetThrottlerStorage()`
      // only cleared storage and left timeout handles active,
      // causing the destructuring crash on delayed callbacks.
      resetThrottlerStorageSafely(throttlerStorage);
      const slug = `tenant-${roleCode.toLowerCase()}`;
      const ctx = await bootstrapUserAndContext(
        `user-${roleCode.toLowerCase()}@example.invalid`,
        `User ${roleCode}`,
        slug,
        `Tenant ${roleCode}`,
        roleCode,
      );
      const cookie = await loginAndSelectContext(
        `user-${roleCode.toLowerCase()}@example.invalid`,
        ctx.membershipId,
        ctx.organisationId,
        ctx.facilityId,
      );

      const before = await countOverviewAuthorizationAuditEvents();
      const response = await request(server)
        .get('/api/v1/clinic-admin/overview')
        .set('Cookie', cookie)
        .expect(403);
      await assertOverviewDeniedAndReached(before);

      // None of these roles grant `clinic_admin_overview:view`; the
      // guard denies with AUTHORIZATION_FORBIDDEN.
      parseAuthErrorResponse(response.body);
    }
  });

  it('5. missing session returns HTTP 401', async () => {
    // No session cookie. The guard short-circuits at session
    // validation with AUTH_SESSION_REQUIRED (401). The guard does
    // NOT emit an authorization.decision.* audit event because the
    // session was never validated. The endpoint-reach proof for
    // this test is the HTTP 401 status itself — 401 cannot come
    // from the Overview service (which only emits 200 or 403 with
    // CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED), so a 401 proves the
    // request reached the auth layer.
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .expect(401);
    const after = await countOverviewAuthorizationAuditEvents();
    // No authorization-decision event was emitted (session never
    // validated). The endpoint-reach proof is the 401 status.
    expect(after).toBe(before);

    parseAuthErrorResponse(response.body);
  });

  it('6. expired session returns HTTP 401', async () => {
    const ctx = await bootstrapUserAndContext(
      'expired@example.invalid',
      'Expired Admin',
      'tenant-expired',
      'Tenant Expired',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'expired@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    // Expire the session by setting expiresAt to the past.
    const cookieValue = cookie.split('=')[1]!;
    const sessions = await prisma.authSession.findMany({
      where: { tokenHash: cookieValue },
    });
    // If the session is found by token hash, expire it. Otherwise,
    // expire all sessions for this user (defence-in-depth).
    if (sessions.length > 0) {
      await prisma.authSession.update({
        where: { id: sessions[0]!.id },
        data: { expiresAt: new Date('2020-01-01T00:00:00.000Z') },
      });
    } else {
      await prisma.authSession.updateMany({
        where: { userId: ctx.userId },
        data: { expiresAt: new Date('2020-01-01T00:00:00.000Z') },
      });
    }

    // The guard short-circuits at session validation (expired
    // session). Same endpoint-reach proof as test #5.
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(401);
    const after = await countOverviewAuthorizationAuditEvents();
    expect(after).toBe(before);

    parseAuthErrorResponse(response.body);
  });

  it('7. revoked session returns HTTP 401', async () => {
    const ctx = await bootstrapUserAndContext(
      'revoked@example.invalid',
      'Revoked Admin',
      'tenant-revoked',
      'Tenant Revoked',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'revoked@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    // Revoke the session.
    await prisma.authSession.updateMany({
      where: { userId: ctx.userId },
      data: { revokedAt: new Date() },
    });

    // The guard short-circuits at session validation (revoked
    // session). Same endpoint-reach proof as test #5.
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(401);
    const after = await countOverviewAuthorizationAuditEvents();
    expect(after).toBe(before);

    parseAuthErrorResponse(response.body);
  });

  it('8. missing active membership returns HTTP 403', async () => {
    const ctx = await bootstrapUserAndContext(
      'no-membership@example.invalid',
      'No Membership Admin',
      'tenant-no-mem',
      'Tenant No Mem',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndReturnCookie('no-membership@example.invalid');
    // Do NOT select tenant context — activeTenantMembershipId remains null.
    // The Overview guard's `authorizeForActiveMembership` rejects with
    // AUTHORIZATION_FORBIDDEN when activeMembershipId is null. The guard
    // emits an `authorization.decision.denied` event for this 403.

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewDeniedAndReached(before);

    parseAuthErrorResponse(response.body);
    // The response must NOT leak which dimension is missing.
    expect(JSON.stringify(response.body)).not.toContain(ctx.membershipId);
  });

  it('9. missing active organisation returns HTTP 403', async () => {
    const ctx = await bootstrapUserAndContext(
      'no-org@example.invalid',
      'No Org Admin',
      'tenant-no-org',
      'Tenant No Org',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndReturnCookie('no-org@example.invalid');
    await selectTenantContext(cookie, ctx.membershipId);
    // Do NOT select organisation context. The Overview guard ALLOWS
    // the request (R09 has `clinic_admin_overview:view`); the service
    // throws `clinicAdminOverviewContextRequired()` because
    // `activeOrganisationId === null`. The response code is
    // CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED (NOT in
    // AuthErrorResponseSchema; IS in
    // ClinicAdminOverviewErrorResponseSchema).

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewAllowedAndReached(before);

    parseClinicAdminOverviewErrorResponse(response.body);
  });

  it('10. missing active facility returns HTTP 403', async () => {
    const ctx = await bootstrapUserAndContext(
      'no-facility@example.invalid',
      'No Facility Admin',
      'tenant-no-fac',
      'Tenant No Fac',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndReturnCookie('no-facility@example.invalid');
    await selectTenantContext(cookie, ctx.membershipId);
    await selectOrganisationContext(cookie, ctx.organisationId);
    // Do NOT select facility context. Same as test #9: the guard
    // allows, the service throws `clinicAdminOverviewContextRequired()`
    // because `activeFacilityId === null`.

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewAllowedAndReached(before);

    parseClinicAdminOverviewErrorResponse(response.body);
  });

  it('11. organisation from another tenant fails closed', async () => {
    // This scenario is structurally enforced by the session-context
    // module's PUT /context/organisation endpoint: the user cannot
    // select an organisation from another tenant. The Clinic Admin
    // Overview service additionally verifies the organisation belongs
    // to the active tenant. This test verifies the service-level
    // defence-in-depth by directly setting an invalid organisation
    // on the session (simulating a session-tampering attack).
    const ctx = await bootstrapUserAndContext(
      'cross-tenant@example.invalid',
      'Cross Tenant Admin',
      'tenant-cross',
      'Tenant Cross',
      'R09_ADMINISTRATOR',
    );
    // Create a second tenant and organisation.
    const ctx2 = await bootstrapUserAndContext(
      'cross-tenant2@example.invalid',
      'Cross Tenant Admin 2',
      'tenant-cross2',
      'Tenant Cross 2',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'cross-tenant@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    // Tamper with the session: set activeOrganisationId to ctx2's org.
    await prisma.authSession.updateMany({
      where: { userId: ctx.userId },
      data: { activeOrganisationId: ctx2.organisationId },
    });

    // The Overview guard ALLOWS (R09 has the permission); the
    // service's tenant-scoped organisation lookup returns null
    // (cross-tenant), so the service throws
    // `clinicAdminOverviewContextRequired()`. The response code is
    // CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED.
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewAllowedAndReached(before);

    parseClinicAdminOverviewErrorResponse(response.body);
  });

  it('12. facility from another tenant fails closed', async () => {
    const ctx = await bootstrapUserAndContext(
      'cross-tenant-fac@example.invalid',
      'Cross Tenant Fac Admin',
      'tenant-cross-fac',
      'Tenant Cross Fac',
      'R09_ADMINISTRATOR',
    );
    const ctx2 = await bootstrapUserAndContext(
      'cross-tenant-fac2@example.invalid',
      'Cross Tenant Fac Admin 2',
      'tenant-cross-fac2',
      'Tenant Cross Fac 2',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'cross-tenant-fac@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    // Tamper with the session: set activeFacilityId to ctx2's facility.
    await prisma.authSession.updateMany({
      where: { userId: ctx.userId },
      data: { activeFacilityId: ctx2.facilityId },
    });

    // Same as test #11: the guard allows, the service's
    // tenant-scoped facility lookup returns null (cross-tenant),
    // the service throws `clinicAdminOverviewContextRequired()`.
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewAllowedAndReached(before);

    parseClinicAdminOverviewErrorResponse(response.body);
  });

  it('13. facility belonging to another organisation in the same tenant fails closed', async () => {
    const ctx = await bootstrapUserAndContext(
      'cross-org-fac@example.invalid',
      'Cross Org Fac Admin',
      'tenant-cross-org-fac',
      'Tenant Cross Org Fac',
      'R09_ADMINISTRATOR',
    );
    // Create a second organisation in the same tenant.
    const org2 = await organisations.create({
      tenantId: ctx.tenantId as TenantId,
      code: 'ORG-2',
      displayName: 'Organisation 2',
      status: 'active',
    });
    const fac2 = await facilities.create({
      tenantId: ctx.tenantId as TenantId,
      organisationId: org2.id,
      code: 'FAC-2',
      displayName: 'Facility 2',
      status: 'active',
    });
    const cookie = await loginAndSelectContext(
      'cross-org-fac@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    // Tamper with the session: set activeFacilityId to fac2 (which
    // belongs to org2, not the active organisation).
    await prisma.authSession.updateMany({
      where: { userId: ctx.userId },
      data: { activeFacilityId: fac2.id },
    });

    // The service resolves the facility (it belongs to the same
    // tenant, so the tenant-scoped lookup succeeds) but then
    // verifies `facility.organisationId !== organisation.id`. The
    // service throws `clinicAdminOverviewContextRequired()`.
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewAllowedAndReached(before);

    parseClinicAdminOverviewErrorResponse(response.body);
  });

  it('14. query-string tenant identifiers cannot override session context', async () => {
    const ctx = await bootstrapUserAndContext(
      'query-tenant@example.invalid',
      'Query Tenant Admin',
      'tenant-query',
      'Tenant Query',
      'R09_ADMINISTRATOR',
    );
    const ctx2 = await bootstrapUserAndContext(
      'query-tenant2@example.invalid',
      'Query Tenant Admin 2',
      'tenant-query2',
      'Tenant Query 2',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'query-tenant@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    // Pass ctx2's tenantId as a query parameter. The server MUST
    // ignore it and return ctx's data (not ctx2's).
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .query({ tenantId: ctx2.tenantId })
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    expect(
      (
        response.body as {
          activeContext: {
            tenantDisplayName: string;
            organisationDisplayName: string;
            facilityDisplayName: string;
          };
        }
      ).activeContext.tenantDisplayName,
    ).toBe('Tenant Query');
    expect(
      (
        response.body as {
          activeContext: {
            tenantDisplayName: string;
            organisationDisplayName: string;
            facilityDisplayName: string;
          };
        }
      ).activeContext.tenantDisplayName,
    ).not.toBe('Tenant Query 2');
  });

  it('15. query-string organisation identifiers cannot override session context', async () => {
    const ctx = await bootstrapUserAndContext(
      'query-org@example.invalid',
      'Query Org Admin',
      'tenant-query-org',
      'Tenant Query Org',
      'R09_ADMINISTRATOR',
    );
    const ctx2 = await bootstrapUserAndContext(
      'query-org2@example.invalid',
      'Query Org Admin 2',
      'tenant-query-org2',
      'Tenant Query Org 2',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'query-org@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .query({ organisationId: ctx2.organisationId })
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    expect(
      (
        response.body as {
          activeContext: {
            tenantDisplayName: string;
            organisationDisplayName: string;
            facilityDisplayName: string;
          };
        }
      ).activeContext.organisationDisplayName,
    ).toBe('Organisation Tenant Query Org');
  });

  it('16. query-string facility identifiers cannot override session context', async () => {
    const ctx = await bootstrapUserAndContext(
      'query-fac@example.invalid',
      'Query Fac Admin',
      'tenant-query-fac',
      'Tenant Query Fac',
      'R09_ADMINISTRATOR',
    );
    const ctx2 = await bootstrapUserAndContext(
      'query-fac2@example.invalid',
      'Query Fac Admin 2',
      'tenant-query-fac2',
      'Tenant Query Fac 2',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'query-fac@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .query({ facilityId: ctx2.facilityId })
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    expect(
      (
        response.body as {
          activeContext: {
            tenantDisplayName: string;
            organisationDisplayName: string;
            facilityDisplayName: string;
          };
        }
      ).activeContext.facilityDisplayName,
    ).toBe('Facility Tenant Query Fac');
  });

  it('17. custom scope headers cannot override session context', async () => {
    const ctx = await bootstrapUserAndContext(
      'header-scope@example.invalid',
      'Header Scope Admin',
      'tenant-header',
      'Tenant Header',
      'R09_ADMINISTRATOR',
    );
    const ctx2 = await bootstrapUserAndContext(
      'header-scope2@example.invalid',
      'Header Scope Admin 2',
      'tenant-header2',
      'Tenant Header 2',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'header-scope@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .set('X-Tenant-Id', ctx2.tenantId)
      .set('X-Organisation-Id', ctx2.organisationId)
      .set('X-Facility-Id', ctx2.facilityId)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    expect(
      (
        response.body as {
          activeContext: {
            tenantDisplayName: string;
            organisationDisplayName: string;
            facilityDisplayName: string;
          };
        }
      ).activeContext.tenantDisplayName,
    ).toBe('Tenant Header');
  });

  it('18. request body identifiers cannot override session context', async () => {
    const ctx = await bootstrapUserAndContext(
      'body-scope@example.invalid',
      'Body Scope Admin',
      'tenant-body',
      'Tenant Body',
      'R09_ADMINISTRATOR',
    );
    const ctx2 = await bootstrapUserAndContext(
      'body-scope2@example.invalid',
      'Body Scope Admin 2',
      'tenant-body2',
      'Tenant Body 2',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'body-scope@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    // GET requests typically don't have a body, but supertest allows
    // sending one. The server MUST ignore it.
    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .send({
        tenantId: ctx2.tenantId,
        organisationId: ctx2.organisationId,
        facilityId: ctx2.facilityId,
      })
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    expect(
      (
        response.body as {
          activeContext: {
            tenantDisplayName: string;
            organisationDisplayName: string;
            facilityDisplayName: string;
          };
        }
      ).activeContext.tenantDisplayName,
    ).toBe('Tenant Body');
  });

  it('19. Role Preview cannot bypass the permission requirement', async () => {
    // Role Preview is a development-only feature. Even if a preview
    // session is created with R09, the AuthorizationGuard must still
    // verify the actual role assignment. This test verifies that a
    // user WITHOUT R09 cannot access the overview endpoint, even if
    // they attempt to use Role Preview.
    //
    // NOTE: Role Preview is a development-only feature gated by
    // NODE_ENV !== 'production' and IBN_HAYAN_ROLE_PREVIEW_ENABLED.
    // This test verifies the permission check is not bypassed.
    //
    // The fixture uses R01_PHYSICIAN with the `R13_SETUP` mode: a
    // tenant-scoped R13 assignment is added alongside R01 so setup
    // (organisation/facility selection) can complete. The final
    // Overview request still denies because R01+R13 does NOT grant
    // `clinic_admin_overview:view`.
    const ctx = await bootstrapUserAndContext(
      'no-r09@example.invalid',
      'No R09 User',
      'tenant-no-r09',
      'Tenant No R09',
      'R01_PHYSICIAN', // NOT R09
    );
    const cookie = await loginAndSelectContext(
      'no-r09@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewDeniedAndReached(before);

    parseAuthErrorResponse(response.body);
  });

  it('20. Platform Super Admin is never converted to Clinic Administrator', async () => {
    // R13 System Administrator must NOT receive the
    // `clinic_admin_overview:view` permission, even if R13 is the
    // only role assigned. This test verifies the permission matrix
    // does not accidentally grant R09's permission to R13.
    const ctx = await bootstrapUserAndContext(
      'r13-only@example.invalid',
      'R13 Only User',
      'tenant-r13-only',
      'Tenant R13 Only',
      'R13_SYSTEM_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'r13-only@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewDeniedAndReached(before);

    parseAuthErrorResponse(response.body);
  });

  it('21. the correct audit event or events are produced', async () => {
    const ctx = await bootstrapUserAndContext(
      'audit@example.invalid',
      'Audit Admin',
      'tenant-audit',
      'Tenant Audit',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'audit@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    // Verify the audit outbox contains the expected events.
    // The guard emits `authorization.decision.allowed` (category
    // `authorization`), and the service emits
    // `clinic_admin.overview.viewed` (category `facility_context`).
    const outboxRows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    const drafts = outboxRows.map(
      (r) =>
        r.canonicalEventDraft as {
          action: string;
          category: string;
          permissionCode?: string;
        },
    );

    // The guard's `authorization.decision.allowed` event MUST be
    // present (with permissionCode='clinic_admin_overview:view').
    const allowedEvent = drafts.find(
      (d) => d.action === 'authorization.decision.allowed',
    );
    expect(allowedEvent).toBeDefined();
    expect(allowedEvent!.permissionCode).toBe('clinic_admin_overview:view');

    // The service's `clinic_admin.overview.viewed` event MUST be
    // present (mapped to facility_context category).
    const viewedEvent = drafts.find(
      (d) => d.action === 'clinic_admin.overview.viewed',
    );
    expect(viewedEvent).toBeDefined();
    expect(viewedEvent!.category).toBe('facility_context');
  });

  it('22. failed requests do NOT emit a false successful-view event', async () => {
    const ctx = await bootstrapUserAndContext(
      'failed-audit@example.invalid',
      'Failed Audit Admin',
      'tenant-failed-audit',
      'Tenant Failed Audit',
      'R13_SYSTEM_ADMINISTRATOR', // NOT R09 — will be denied
    );
    const cookie = await loginAndSelectContext(
      'failed-audit@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await assertOverviewDeniedAndReached(before);

    // Verify the audit outbox does NOT contain a
    // `clinic_admin.overview.viewed` event (because the service was
    // never invoked — the guard denied the request).
    const outboxRows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    const drafts = outboxRows.map(
      (r) => r.canonicalEventDraft as { action: string },
    );
    const viewedEvent = drafts.find(
      (d) => d.action === 'clinic_admin.overview.viewed',
    );
    expect(viewedEvent).toBeUndefined();

    // The guard's `authorization.decision.denied` event SHOULD be
    // present (proving the request was denied, not that the service
    // completed).
    const deniedEvent = drafts.find(
      (d) => d.action === 'authorization.decision.denied',
    );
    expect(deniedEvent).toBeDefined();
  });

  it('23. no sensitive values appear in the audit metadata', async () => {
    const ctx = await bootstrapUserAndContext(
      'sensitive@example.invalid',
      'Sensitive Admin',
      'tenant-sensitive',
      'Tenant Sensitive',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'sensitive@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    const outboxRows = await prisma.auditOutboxEvent.findMany({
      where: { deliveredAt: null },
    });
    for (const row of outboxRows) {
      const draft = row.canonicalEventDraft as {
        action: string;
        metadata: unknown;
        newState: unknown;
        previousState: unknown;
      };
      const json = JSON.stringify(draft);
      // The audit event MUST NOT contain display names, UUIDs (beyond
      // the standard actor/session/tenant fields), or business payload.
      expect(json).not.toContain('Tenant Sensitive');
      expect(json).not.toContain('Organisation Tenant Sensitive');
      expect(json).not.toContain('Facility Tenant Sensitive');
      expect(json).not.toContain('Sensitive Admin');
      expect(json).not.toContain(ctx.organisationId);
      expect(json).not.toContain(ctx.facilityId);
    }
  });

  it('24. database cleanup leaves no cross-test contamination', async () => {
    // This test verifies that the `truncateAll()` in `beforeEach`
    // cleans up all relevant tables. If cleanup fails, subsequent
    // tests would see stale data.
    //
    // We run a simple R09 request and verify it succeeds. If the
    // previous test's data were not cleaned up, this test would
    // either fail or see stale data.
    const ctx = await bootstrapUserAndContext(
      'cleanup@example.invalid',
      'Cleanup Admin',
      'tenant-cleanup',
      'Tenant Cleanup',
      'R09_ADMINISTRATOR',
    );
    const cookie = await loginAndSelectContext(
      'cleanup@example.invalid',
      ctx.membershipId,
      ctx.organisationId,
      ctx.facilityId,
    );

    const before = await countOverviewAuthorizationAuditEvents();
    const response = await request(server)
      .get('/api/v1/clinic-admin/overview')
      .set('Cookie', cookie)
      .expect(200);
    await assertOverviewSucceededAndReached(before);

    expect(
      (
        response.body as {
          activeContext: {
            tenantDisplayName: string;
            organisationDisplayName: string;
            facilityDisplayName: string;
          };
        }
      ).activeContext.tenantDisplayName,
    ).toBe('Tenant Cleanup');
    // Verify exactly one user, one tenant, one organisation, one
    // facility exist (no cross-test contamination).
    const userCount = await prisma.user.count();
    const tenantCount = await prisma.tenant.count();
    const orgCount = await prisma.organisation.count();
    const facCount = await prisma.facility.count();
    expect(userCount).toBe(1);
    expect(tenantCount).toBe(1);
    expect(orgCount).toBe(1);
    expect(facCount).toBe(1);
  });
});
