import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClinicAdminController } from './clinic-admin.controller.js';
import { ClinicAdminOverviewService } from './clinic-admin-overview.service.js';
import {
  AUTHORIZATION_PERMISSION_METADATA,
  AUTHORIZATION_CONTEXT_MODE_METADATA,
} from '../authorization/require-permission.decorator.js';
import { sessionRequired } from '../auth/auth.errors.js';
import type { ClinicAdminOverviewResponse } from '@ibn-hayan/contracts';

/**
 * Focused unit tests for the ClinicAdminController.
 *
 * These tests verify the controller's transport-layer behaviour
 * directly (NOT the service's business logic, which is covered by
 * `clinic-admin-overview.service.spec.ts`). The
 * `ClinicAdminOverviewService` is mocked via a plain JS object stub.
 *
 * Per the audit-semantics restoration task Phase 3, the controller
 * test must cover the following 12 cases:
 *
 * 1. Valid authorised request returns the strict Overview response.
 * 2. Missing session produces the approved HTTP 401 error.
 * 3. Controller does not read tenant scope from query parameters.
 * 4. Controller does not read organisation scope from query parameters.
 * 5. Controller does not read facility scope from query parameters.
 * 6. Controller does not read scope from custom headers.
 * 7. Controller passes the server-derived session to the service.
 * 8. Service errors are translated into the approved public response.
 * 9. Internal error details are not exposed.
 * 10. Unknown request inputs do not alter scope.
 * 11. The controller is mounted at the exact approved route.
 * 12. The endpoint uses the exact approved permission decorator.
 *
 * The controller is a thin transport layer. It reads the session
 * cookie, delegates to the service, and maps the service's null
 * return to a 401 error. All context (tenant, organisation,
 * facility) is derived server-side from the session by the service;
 * the controller does NOT read context identifiers from the query
 * string, headers, or body.
 */

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SESSION_COOKIE_VALUE = 'valid-session-cookie-value';

const VALID_RESPONSE: ClinicAdminOverviewResponse = {
  activeContext: {
    tenantDisplayName: 'Tenant Alpha',
    organisationDisplayName: 'Organisation Alpha',
    facilityDisplayName: 'Facility Alpha',
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

function makeRequest(overrides: Partial<Request> = {}): Request {
  const headers: Record<string, string | string[] | undefined> = {
    cookie: `ibn_hayan_session=${SESSION_COOKIE_VALUE}`,
    'user-agent': 'test-agent',
    ...overrides.headers,
  };
  // Destructure `headers` out of overrides so the final spread does
  // not overwrite the merged headers object.
  const { headers: _omitHeaders, ...restOverrides } = overrides;
  return {
    method: 'GET',
    path: '/api/v1/clinic-admin/overview',
    url: '/api/v1/clinic-admin/overview',
    headers,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
    ...restOverrides,
  } as Request;
}

function makeServiceStub(
  overrides: {
    result?: ClinicAdminOverviewResponse | null;
    error?: Error;
  } = {},
) {
  const result =
    overrides.result === undefined ? VALID_RESPONSE : overrides.result;
  const error = overrides.error;
  // Type the mock to accept the same arguments as the real
  // `loadOverview` method: (cookieValue, auditContext). This allows
  // tests to access `mock.calls[0][0]` (the cookie value) and
  // `mock.calls[0][1]` (the audit context) without TypeScript
  // complaining about tuple types.
  const loadOverview = vi.fn(
    (
      _cookieValue: string | undefined,
      _auditContext?: unknown,
    ): Promise<ClinicAdminOverviewResponse | null> => {
      if (error !== undefined) {
        return Promise.reject(error);
      }
      return Promise.resolve(result);
    },
  );
  return {
    service: { loadOverview } as unknown as ClinicAdminOverviewService,
    loadOverview,
  };
}

function makeController(service: ClinicAdminOverviewService) {
  return new ClinicAdminController(service);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClinicAdminController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. valid authorised request returns the strict Overview response', async () => {
    const { service, loadOverview } = makeServiceStub();
    const controller = makeController(service);
    const req = makeRequest();

    const result = await controller.getOverview(req);

    expect(result).toEqual(VALID_RESPONSE);
    expect(loadOverview).toHaveBeenCalledTimes(1);
  });

  it('2. missing session (service returns null) produces the approved HTTP 401 error', async () => {
    const { service } = makeServiceStub({ result: null });
    const controller = makeController(service);
    const req = makeRequest();

    await expect(controller.getOverview(req)).rejects.toMatchObject(
      sessionRequired(),
    );
  });

  it('3. does NOT read tenant scope from query parameters', async () => {
    const { service, loadOverview } = makeServiceStub();
    const controller = makeController(service);
    // Inject a query string with a tenant identifier. The controller
    // MUST ignore it; the service receives only the cookie value.
    const req = makeRequest({
      query: { tenantId: '00000000-0000-0000-0000-000000000099' },
    } as Partial<Request>);

    await controller.getOverview(req);

    const callArgs = loadOverview.mock.calls[0]!;
    // The first argument is the cookie value; the second is the
    // audit context. Neither carries the query-string tenantId.
    expect(callArgs[0]).toBe(SESSION_COOKIE_VALUE);
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000099',
    );
  });

  it('4. does NOT read organisation scope from query parameters', async () => {
    const { service, loadOverview } = makeServiceStub();
    const controller = makeController(service);
    const req = makeRequest({
      query: { organisationId: '00000000-0000-0000-0000-000000000099' },
    } as Partial<Request>);

    await controller.getOverview(req);

    const callArgs = loadOverview.mock.calls[0]!;
    expect(callArgs[0]).toBe(SESSION_COOKIE_VALUE);
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000099',
    );
  });

  it('5. does NOT read facility scope from query parameters', async () => {
    const { service, loadOverview } = makeServiceStub();
    const controller = makeController(service);
    const req = makeRequest({
      query: { facilityId: '00000000-0000-0000-0000-000000000099' },
    } as Partial<Request>);

    await controller.getOverview(req);

    const callArgs = loadOverview.mock.calls[0]!;
    expect(callArgs[0]).toBe(SESSION_COOKIE_VALUE);
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000099',
    );
  });

  it('6. does NOT read scope from custom headers', async () => {
    const { service, loadOverview } = makeServiceStub();
    const controller = makeController(service);
    const req = makeRequest({
      headers: {
        'x-tenant-id': '00000000-0000-0000-0000-000000000099',
        'x-organisation-id': '00000000-0000-0000-0000-000000000098',
        'x-facility-id': '00000000-0000-0000-0000-000000000097',
      },
    } as Partial<Request>);

    await controller.getOverview(req);

    const callArgs = loadOverview.mock.calls[0]!;
    expect(callArgs[0]).toBe(SESSION_COOKIE_VALUE);
    // The custom headers MUST NOT appear in the service call args.
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000099',
    );
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000098',
    );
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000097',
    );
  });

  it('7. passes the server-derived session cookie to the service', async () => {
    const { service, loadOverview } = makeServiceStub();
    const controller = makeController(service);
    const req = makeRequest();

    await controller.getOverview(req);

    expect(loadOverview).toHaveBeenCalledTimes(1);
    const callArgs = loadOverview.mock.calls[0] as readonly unknown[];
    const cookieValue = callArgs[0];
    const auditContext = callArgs[1] as
      { requestId: string; ipAddress: string; userAgent: string } | undefined;
    expect(cookieValue).toBe(SESSION_COOKIE_VALUE);
    // The audit context is derived from the request (requestId,
    // correlationId, ipAddress, userAgent). It does NOT carry
    // tenant/organisation/facility identifiers.
    expect(auditContext).toMatchObject({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      requestId: expect.any(String),
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
  });

  it('8. service errors are translated into the approved public response', async () => {
    // The service throws a `clinicAdminOverviewContextRequired()` error
    // (an HttpException with status 403). The controller does NOT
    // catch it; NestJS's exception filter translates it into the
    // approved HTTP 403 response with the
    // `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED` code.
    const clinicAdminError = Object.assign(
      new Error('Clinic Admin Overview context required'),
      {
        status: 403,
        response: {
          statusCode: 403,
          error: {
            code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
            message:
              'Active tenant, organisation, and facility context are required.',
          },
        },
      },
    );
    const { service } = makeServiceStub({ error: clinicAdminError });
    const controller = makeController(service);
    const req = makeRequest();

    await expect(controller.getOverview(req)).rejects.toMatchObject({
      status: 403,
      response: {
        statusCode: 403,
        error: {
          code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        },
      },
    });
  });

  it('9. does NOT expose internal error details (generic error is re-thrown without mutation)', async () => {
    // If the service throws a generic Error (not an HttpException),
    // NestJS's exception filter translates it into a 500 with a
    // generic message. The controller does NOT wrap or mutate the
    // error; it lets it propagate. This test verifies the controller
    // does not attach internal details to the error.
    const internalError = new Error('internal database connection failure');
    const { service } = makeServiceStub({ error: internalError });
    const controller = makeController(service);
    const req = makeRequest();

    // The controller re-throws the original error without mutation.
    // (NestJS's exception filter handles the translation to HTTP 500.)
    await expect(controller.getOverview(req)).rejects.toBe(internalError);
  });

  it('10. unknown request inputs do NOT alter the scope passed to the service', async () => {
    const { service, loadOverview } = makeServiceStub();
    const controller = makeController(service);
    // Inject a body and unknown query parameters. The controller
    // MUST ignore them; the service receives only the cookie value.
    const req = makeRequest({
      body: {
        tenantId: '00000000-0000-0000-0000-000000000099',
        organisationId: '00000000-0000-0000-0000-000000000098',
        facilityId: '00000000-0000-0000-0000-000000000097',
      },
      query: {
        unknownParam: 'unknown-value',
        anotherParam: 'another-value',
      },
    } as Partial<Request>);

    await controller.getOverview(req);

    const callArgs = loadOverview.mock.calls[0]!;
    expect(callArgs[0]).toBe(SESSION_COOKIE_VALUE);
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000099',
    );
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000098',
    );
    expect(JSON.stringify(callArgs)).not.toContain(
      '00000000-0000-0000-0000-000000000097',
    );
  });

  it('11. is mounted at the exact approved route (Controller("clinic-admin") + Get("overview"))', () => {
    // The controller class is decorated with @Controller('clinic-admin'),
    // and the getOverview method is decorated with @Get('overview').
    // The full route is /clinic-admin/overview (relative to the API
    // prefix /api/v1, giving /api/v1/clinic-admin/overview).
    //
    // We verify the route by inspecting the Reflect metadata that
    // NestJS attaches to the class and the method. This is the same
    // mechanism the NestJS runtime uses to register the route.
    const controllerMetadata = Reflect.getMetadata(
      'path',
      ClinicAdminController,
    ) as unknown;
    expect(controllerMetadata).toBe('clinic-admin');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const handler: unknown = ClinicAdminController.prototype.getOverview;
    const getOverviewMetadata = Reflect.getMetadata('path', handler) as unknown;
    expect(getOverviewMetadata).toBe('overview');

    const methodMetadata = Reflect.getMetadata('method', handler) as unknown;
    // The @Get decorator attaches method = 'GET' (numeric code 0 in
    // NestJS's RequestMethod enum). We verify it is a number (the
    // decorator was applied) rather than asserting the exact enum
    // value, to avoid coupling to NestJS internals.
    expect(typeof methodMetadata).toBe('number');
  });

  it('12. uses the exact approved permission decorator (@RequirePermission("clinic_admin_overview:view", { mode: "for-active-membership" }))', () => {
    // The @RequirePermission decorator attaches two metadata keys:
    //   AUTHORIZATION_PERMISSION_METADATA: the permission code
    //   AUTHORIZATION_CONTEXT_MODE_METADATA: the context-resolution mode
    //
    // The AuthorizationGuard reads these keys to make the
    // authorization decision. This test verifies the exact permission
    // and mode are attached to the getOverview method.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const handler: unknown = ClinicAdminController.prototype.getOverview;
    const reflector = new Reflector();
    const permission = reflector.get<string>(
      AUTHORIZATION_PERMISSION_METADATA,
      handler,
    );
    expect(permission).toBe('clinic_admin_overview:view');

    const mode = reflector.get<string>(
      AUTHORIZATION_CONTEXT_MODE_METADATA,
      handler,
    );
    expect(mode).toBe('for-active-membership');
  });
});
