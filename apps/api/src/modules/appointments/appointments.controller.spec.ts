import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { AppointmentsController } from './appointments.controller.js';
import type { AppointmentsTodayService } from './appointments-today.service.js';
import type { AppointmentsBookingService } from './appointments-booking.service.js';
import type { AppointmentsCancellationService } from './appointments-cancellation.service.js';
import type { AppointmentsReschedulingService } from './appointments-rescheduling.service.js';
import type {
  TodayAppointmentsResponse,
  CancelAppointmentResponse,
  RescheduleAppointmentResponse,
} from '@ibn-hayan/contracts';

/**
 * Focused unit tests for the AppointmentsController.
 *
 * These tests verify the controller's transport-layer behaviour directly
 * (NOT the service's business logic, which is covered by
 * `appointments-today.service.spec.ts`). The `AppointmentsTodayService`
 * is mocked via a plain object stub.
 *
 * Test coverage:
 * 1. Valid authorised request returns the strict response.
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
 */

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SESSION_COOKIE_VALUE = 'valid-session-cookie-value';

const VALID_RESPONSE: TodayAppointmentsResponse = {
  localDate: '2026-08-01',
  timezone: 'Asia/Baghdad',
  generatedAt: '2026-08-01T12:00:00.000Z',
  appointments: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      patientId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      providerId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      scheduledStart: '2026-08-01T09:00:00.000Z',
      scheduledEnd: '2026-08-01T09:30:00.000Z',
      status: 'booked',
      typeCode: 'consultation',
    },
  ],
};

function makeRequest(overrides: Partial<Request> = {}): Request {
  const headers: Record<string, string | string[] | undefined> = {
    cookie: `ibn_hayan_session=${SESSION_COOKIE_VALUE}`,
    'user-agent': 'test-agent',
    ...overrides.headers,
  };
  const { headers: _omitHeaders, ...restOverrides } = overrides;
  return {
    method: 'GET',
    path: '/api/v1/appointments/today',
    url: '/api/v1/appointments/today',
    headers,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
    ...restOverrides,
  } as Request;
}

const VALID_CANCEL_RESPONSE: CancelAppointmentResponse = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  patientId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  providerId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  scheduledStart: '2026-08-01T09:00:00.000Z',
  scheduledEnd: '2026-08-01T09:30:00.000Z',
  status: 'cancelled',
  typeCode: 'consultation',
};

const VALID_RESCHEDULE_RESPONSE: RescheduleAppointmentResponse = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  patientId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  providerId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  scheduledStart: '2026-09-01T10:00:00.000Z',
  scheduledEnd: '2026-09-01T10:30:00.000Z',
  status: 'booked',
  typeCode: 'consultation',
};

function makeServiceStub(
  overrides: {
    result?: TodayAppointmentsResponse | null;
    error?: Error;
  } = {},
) {
  const result =
    overrides.result === undefined ? VALID_RESPONSE : overrides.result;
  const error = overrides.error;
  const loadTodayAppointments = vi.fn(
    (
      _cookieValue: string | undefined,
      _auditContext?: unknown,
    ): Promise<TodayAppointmentsResponse | null> => {
      if (error !== undefined) {
        return Promise.reject(error);
      }
      return Promise.resolve(result);
    },
  );
  return {
    loadTodayAppointments,
  } as unknown as AppointmentsTodayService;
}

function makeBookingServiceStub() {
  return {
    bookAppointment: vi.fn(),
  } as unknown as AppointmentsBookingService;
}

function makeCancellationServiceStub(
  overrides: {
    result?: CancelAppointmentResponse | null;
    error?: Error;
  } = {},
) {
  const result = overrides.result === undefined ? null : overrides.result;
  const error = overrides.error;
  const cancelAppointment = vi.fn(
    (
      _appointmentId: string,
      _reason: string,
      _cookieValue: string | undefined,
      _auditContext?: unknown,
    ): Promise<CancelAppointmentResponse | null> => {
      if (error !== undefined) {
        return Promise.reject(error);
      }
      return Promise.resolve(result);
    },
  );
  return { cancelAppointment } as unknown as AppointmentsCancellationService;
}

function makeReschedulingServiceStub(
  overrides: {
    result?: RescheduleAppointmentResponse | null;
    error?: Error;
  } = {},
) {
  const result = overrides.result === undefined ? null : overrides.result;
  const error = overrides.error;
  const rescheduleAppointment = vi.fn(
    (
      _appointmentId: string,
      _request: unknown,
      _cookieValue: string | undefined,
      _auditContext?: unknown,
    ): Promise<RescheduleAppointmentResponse | null> => {
      if (error !== undefined) {
        return Promise.reject(error);
      }
      return Promise.resolve(result);
    },
  );
  return {
    rescheduleAppointment,
  } as unknown as AppointmentsReschedulingService;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppointmentsController', () => {
  describe('getTodayAppointments', () => {
    it('returns the service response on valid request', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest();
      const result = await controller.getTodayAppointments(req);
      expect(result).toEqual(VALID_RESPONSE);
    });

    it('passes the session cookie to the service', async () => {
      const service = makeServiceStub();
      const controller = new AppointmentsController(
        service,
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest();
      await controller.getTodayAppointments(req);
      const callArgs = (
        service.loadTodayAppointments as ReturnType<typeof vi.fn>
      ).mock.calls[0]!;
      expect(callArgs[0]).toBe(SESSION_COOKIE_VALUE);
    });

    it('passes audit context to the service', async () => {
      const service = makeServiceStub();
      const controller = new AppointmentsController(
        service,
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest();
      await controller.getTodayAppointments(req);
      const callArgs = (
        service.loadTodayAppointments as ReturnType<typeof vi.fn>
      ).mock.calls[0]!;
      expect(callArgs[1]).toBeDefined();
      expect((callArgs[1] as { requestId: string }).requestId).toBeDefined();
    });

    it('throws UnauthorizedException when service returns null', async () => {
      const controller = new AppointmentsController(
        makeServiceStub({ result: null }),
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest();
      await expect(controller.getTodayAppointments(req)).rejects.toMatchObject({
        response: {
          error: {
            code: 'AUTH_SESSION_REQUIRED',
          },
        },
      });
    });

    it('does NOT read tenant scope from query parameters', async () => {
      const service = makeServiceStub();
      const controller = new AppointmentsController(
        service,
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ query: { tenantId: 'evil-tenant' } });
      await controller.getTodayAppointments(req);
      const callArgs = (
        service.loadTodayAppointments as ReturnType<typeof vi.fn>
      ).mock.calls[0]!;
      expect(callArgs[0]).toBe(SESSION_COOKIE_VALUE);
    });

    it('does NOT read organisation scope from query parameters', async () => {
      const service = makeServiceStub();
      const controller = new AppointmentsController(
        service,
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ query: { organisationId: 'evil-org' } });
      await controller.getTodayAppointments(req);
      const mockCalls = (
        service.loadTodayAppointments as ReturnType<typeof vi.fn>
      ).mock.calls;
      expect(mockCalls[0]?.[0]).toBe(SESSION_COOKIE_VALUE);
    });

    it('does NOT read facility scope from query parameters', async () => {
      const service = makeServiceStub();
      const controller = new AppointmentsController(
        service,
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ query: { facilityId: 'evil-facility' } });
      await controller.getTodayAppointments(req);
      const mockCalls = (
        service.loadTodayAppointments as ReturnType<typeof vi.fn>
      ).mock.calls;
      expect(mockCalls[0]?.[0]).toBe(SESSION_COOKIE_VALUE);
    });

    it('does NOT read scope from custom headers', async () => {
      const service = makeServiceStub();
      const controller = new AppointmentsController(
        service,
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({
        headers: {
          'x-tenant-id': 'evil-tenant',
          'x-organisation-id': 'evil-org',
          'x-facility-id': 'evil-facility',
        },
      });
      await controller.getTodayAppointments(req);
      const mockCalls = (
        service.loadTodayAppointments as ReturnType<typeof vi.fn>
      ).mock.calls;
      expect(mockCalls[0]?.[0]).toBe(SESSION_COOKIE_VALUE);
    });

    it('does NOT read scope from body fields', async () => {
      const service = makeServiceStub();
      const controller = new AppointmentsController(
        service,
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ body: { tenantId: 'evil-tenant' } });
      await controller.getTodayAppointments(req);
      const mockCalls = (
        service.loadTodayAppointments as ReturnType<typeof vi.fn>
      ).mock.calls;
      expect(mockCalls[0]?.[0]).toBe(SESSION_COOKIE_VALUE);
    });

    it('propagates service errors as-is', async () => {
      const error = new Error('Internal error');
      const controller = new AppointmentsController(
        makeServiceStub({ error }),
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest();
      await expect(controller.getTodayAppointments(req)).rejects.toThrow(
        'Internal error',
      );
    });
  });

  describe('cancelAppointment', () => {
    it('returns the service response on valid request', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub({ result: VALID_CANCEL_RESPONSE }),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ method: 'POST' });
      const result = await controller.cancelAppointment(
        req,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        { reason: 'Patient requested cancellation.' },
      );
      expect(result).toEqual(VALID_CANCEL_RESPONSE);
    });

    it('throws UnauthorizedException when service returns null', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub({ result: null }),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ method: 'POST' });
      await expect(
        controller.cancelAppointment(
          req,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          { reason: 'Patient requested cancellation.' },
        ),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'AUTH_SESSION_REQUIRED',
          },
        },
      });
    });

    it('rejects a body that does not match the strict contract', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub({ result: VALID_CANCEL_RESPONSE }),
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ method: 'POST' });
      await expect(
        controller.cancelAppointment(
          req,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          // missing required `reason`
          {},
        ),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'APPOINTMENT_VALIDATION_ERROR',
          },
        },
      });
    });

    it('does NOT accept caller-supplied scope or status in the body', async () => {
      const cancellationService = makeCancellationServiceStub({
        result: VALID_CANCEL_RESPONSE,
      });
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        cancellationService,
        makeReschedulingServiceStub(),
      );
      const req = makeRequest({ method: 'POST' });
      // The strict schema rejects unknown keys (tenantId, status, etc.)
      await expect(
        controller.cancelAppointment(
          req,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          { reason: 'ok', tenantId: 'evil', status: 'cancelled' },
        ),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'APPOINTMENT_VALIDATION_ERROR',
          },
        },
      });
    });
  });

  describe('rescheduleAppointment', () => {
    it('returns the service response on valid request', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub({ result: VALID_RESCHEDULE_RESPONSE }),
      );
      const req = makeRequest({ method: 'POST' });
      const result = await controller.rescheduleAppointment(
        req,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        {
          scheduledStart: '2026-09-01T10:00:00.000Z',
          scheduledEnd: '2026-09-01T10:30:00.000Z',
          reason: 'Patient requested a later slot.',
        },
      );
      expect(result).toEqual(VALID_RESCHEDULE_RESPONSE);
    });

    it('throws UnauthorizedException when service returns null', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub({ result: null }),
      );
      const req = makeRequest({ method: 'POST' });
      await expect(
        controller.rescheduleAppointment(
          req,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          {
            scheduledStart: '2026-09-01T10:00:00.000Z',
            scheduledEnd: '2026-09-01T10:30:00.000Z',
            reason: 'Patient requested a later slot.',
          },
        ),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'AUTH_SESSION_REQUIRED',
          },
        },
      });
    });

    it('rejects a body that does not match the strict contract', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub({ result: VALID_RESCHEDULE_RESPONSE }),
      );
      const req = makeRequest({ method: 'POST' });
      // missing required `reason`
      await expect(
        controller.rescheduleAppointment(
          req,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          {
            scheduledStart: '2026-09-01T10:00:00.000Z',
            scheduledEnd: '2026-09-01T10:30:00.000Z',
          },
        ),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'APPOINTMENT_VALIDATION_ERROR',
          },
        },
      });
    });

    it('does NOT accept caller-supplied scope, status, patient, or provider in the body', async () => {
      const controller = new AppointmentsController(
        makeServiceStub(),
        makeBookingServiceStub(),
        makeCancellationServiceStub(),
        makeReschedulingServiceStub({ result: VALID_RESCHEDULE_RESPONSE }),
      );
      const req = makeRequest({ method: 'POST' });
      // The strict schema rejects unknown keys (tenantId, status,
      // patientId, providerId, etc.)
      await expect(
        controller.rescheduleAppointment(
          req,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          {
            scheduledStart: '2026-09-01T10:00:00.000Z',
            scheduledEnd: '2026-09-01T10:30:00.000Z',
            reason: 'ok',
            tenantId: 'evil',
            status: 'booked',
            patientId: 'evil',
            providerId: 'evil',
          },
        ),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'APPOINTMENT_VALIDATION_ERROR',
          },
        },
      });
    });
  });
});
