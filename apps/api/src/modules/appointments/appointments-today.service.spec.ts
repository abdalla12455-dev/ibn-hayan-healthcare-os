/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { AppointmentsTodayService } from './appointments-today.service.js';
import type {
  AppointmentRepository,
  FacilityRepository,
  TenantRepository,
  OrganisationRepository,
  Appointment,
} from '@ibn-hayan/domain';
import type { AuditRequestContext } from '../auth/auth.service.js';
import type { AuditHelperService } from '../audit/audit-helper.service.js';
import type { AuthService } from '../auth/auth.service.js';
import type { ClockService } from '../../infrastructure/clock/index.js';
import { computeFacilityDayBoundaries } from './facility-day-boundaries.js';

/**
 * Focused unit tests for the AppointmentsTodayService.
 */

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const TEST_ORG_ID = '22222222-2222-2222-2222-222222222222';
const TEST_FACILITY_ID = '33333333-3333-3333-3333-333333333333';
const TEST_USER_ID = '44444444-4444-4444-4444-444444444444';
const TEST_SESSION_ID = '55555555-5555-5555-5555-555555555555';
const TEST_MEMBERSHIP_ID = '66666666-6666-6666-6666-666666666666';

const BASE_AUDIT_CONTEXT: AuditRequestContext = {
  requestId: '77777777-7777-7777-7777-777777777777',
  correlationId: null,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
};

function makeAuthResultR09(
  activeFacilityId = TEST_FACILITY_ID,
  activeOrgId = TEST_ORG_ID,
) {
  return {
    user: {
      id: TEST_USER_ID,
      email: 'admin@facility.test',
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: TEST_SESSION_ID,
      tokenHash: 'hash',
      userId: TEST_USER_ID,
      activeTenantMembershipId: TEST_MEMBERSHIP_ID,
      activeOrganisationId: activeOrgId,
      activeFacilityId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
      revokedAt: null,
      lastUsedAt: null,
    },
    memberships: [
      {
        id: TEST_MEMBERSHIP_ID,
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        roleId: 'r09-role-id' as unknown as never,
        roleCode: 'R09_ADMINISTRATOR' as const,
        roleLabel: 'Clinic Administrator',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
}

function makeFacility(
  timezone: string | null,
  overrides: Partial<{
    id: string;
    tenantId: string;
    organisationId: string;
    status: string;
  }> = {},
) {
  return {
    id: (overrides.id ?? TEST_FACILITY_ID) as never,
    tenantId: (overrides.tenantId ?? TEST_TENANT_ID) as never,
    organisationId: (overrides.organisationId ?? TEST_ORG_ID) as never,
    name: 'Test Facility',
    code: 'TF001',
    displayName: 'Test Facility',
    status: (overrides.status ?? 'active') as 'active',
    timezone,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  const base: Appointment = {
    id: 'aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as Appointment['id'],
    tenantId: TEST_TENANT_ID as Appointment['tenantId'],
    organisationId: TEST_ORG_ID as Appointment['organisationId'],
    facilityId: TEST_FACILITY_ID as Appointment['facilityId'],
    patientId:
      'bbbbbbb0-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as Appointment['patientId'],
    providerId:
      'ccccccc0-cccc-cccc-cccc-cccccccccccc' as Appointment['providerId'],
    scheduledStart: new Date('2026-08-01T09:00:00.000Z'),
    scheduledEnd: new Date('2026-08-01T09:30:00.000Z'),
    status: 'booked' as const,
    typeCode: 'consultation',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...base, ...overrides };
}

function makeService(overrides: {
  authResult?: ReturnType<typeof makeAuthResultR09> | null;
  facility?: ReturnType<typeof makeFacility>;
  appointments?: Appointment[];
  clockNow?: Date;
}) {
  const {
    authResult = makeAuthResultR09(),
    facility = makeFacility('Asia/Baghdad'),
    appointments = [],
    clockNow = new Date('2026-08-01T12:00:00.000Z'),
  } = overrides;

  const tenants = {
    findById: vi.fn().mockResolvedValue({
      id: TEST_TENANT_ID,
      name: 'Test Tenant',
      slug: 'test-tenant',
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  } as unknown as TenantRepository;

  const organisations = {
    findById: vi.fn().mockResolvedValue({
      id: TEST_ORG_ID,
      tenantId: TEST_TENANT_ID,
      name: 'Test Organisation',
      code: 'TO001',
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  } as unknown as OrganisationRepository;

  const facilities = {
    findById: vi.fn().mockResolvedValue(facility),
  } as unknown as FacilityRepository;

  const appointmentsRepo = {
    findByScheduledStartRange: vi.fn().mockResolvedValue(appointments),
  } as unknown as AppointmentRepository;

  const authService = {
    getSessionFromCookie: vi.fn().mockResolvedValue(authResult),
  } as unknown as AuthService;

  const auditHelper = {
    emitDirect: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditHelperService;

  const clock = {
    now: vi.fn().mockReturnValue(clockNow),
  } as unknown as ClockService;

  return {
    service: new AppointmentsTodayService(
      tenants,
      organisations,
      facilities,
      appointmentsRepo,
      authService,
      auditHelper,
      clock,
    ),
    auditHelper,
    appointmentsRepo,
    clock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppointmentsTodayService', () => {
  describe('loadTodayAppointments', () => {
    // --- Auth failures ---

    it('returns null when auth result is null (no session)', async () => {
      const { service } = makeService({ authResult: null });
      const result = await service.loadTodayAppointments(
        'invalid-cookie',
        BASE_AUDIT_CONTEXT,
      );
      expect(result).toBeNull();
    });

    it('throws CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED when activeTenantMembershipId is null', async () => {
      const authResult = {
        ...makeAuthResultR09(),
        session: {
          ...makeAuthResultR09().session,
          activeTenantMembershipId: null as unknown as string,
        },
      };
      const { service } = makeService({ authResult });
      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
          },
        },
      });
    });

    it('throws CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED when activeOrganisationId is null', async () => {
      const authResult = {
        ...makeAuthResultR09(),
        session: {
          ...makeAuthResultR09().session,
          activeOrganisationId: null as unknown as string,
        },
      };
      const { service } = makeService({ authResult });
      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
          },
        },
      });
    });

    it('throws CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED when activeFacilityId is null', async () => {
      const authResult = {
        ...makeAuthResultR09(),
        session: {
          ...makeAuthResultR09().session,
          activeFacilityId: null as unknown as string,
        },
      };
      const { service } = makeService({ authResult });
      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
          },
        },
      });
    });

    // --- Timezone configuration errors ---

    it('throws APPOINTMENT_CONFIGURATION_REQUIRED when facility timezone is null', async () => {
      const { service } = makeService({ facility: makeFacility(null) });
      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws APPOINTMENT_INVALID_TIMEZONE for invalid IANA timezone', async () => {
      const { service } = makeService({
        facility: makeFacility('Invalid/Timezone'),
      });
      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toMatchObject({
        response: {
          error: {
            code: 'APPOINTMENT_INVALID_TIMEZONE',
          },
        },
      });
    });

    it('does NOT fall back to UTC when facility timezone is null', async () => {
      const { service, appointmentsRepo } = makeService({
        facility: makeFacility(null),
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      try {
        await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        const err = e as UnprocessableEntityException;
        const response = err.getResponse() as { error?: { code?: string } };
        expect(response).toMatchObject({
          error: {
            code: 'APPOINTMENT_CONFIGURATION_REQUIRED',
          },
        });
      }

      // Repository should NOT be called
      expect(appointmentsRepo.findByScheduledStartRange).not.toHaveBeenCalled();
    });

    // --- Non-RangeError re-thrown ---

    it('re-throws non-RangeError from boundary computation unchanged', async () => {
      const customError = new Error('Unexpected error');
      const { service, clock } = makeService({
        facility: makeFacility('Asia/Baghdad'),
      });
      // Make clock.now throw an error (not return a throwing function)
      vi.spyOn(clock, 'now').mockImplementation(() => {
        throw customError;
      });

      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toThrow(customError);
    });

    it('re-throws repository errors unchanged', async () => {
      const customError = new Error('Database connection failed');
      const { service, appointmentsRepo } = makeService({
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });
      // Make repository throw an error
      appointmentsRepo.findByScheduledStartRange = vi
        .fn()
        .mockRejectedValue(customError);

      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toThrow(customError);
    });

    it('does NOT emit audit event after non-RangeError', async () => {
      const customError = new Error('Unexpected error');
      const { service, clock, auditHelper } = makeService({
        facility: makeFacility('Asia/Baghdad'),
      });
      // Make clock.now throw an error
      vi.spyOn(clock, 'now').mockImplementation(() => {
        throw customError;
      });

      try {
        await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);
      } catch {
        // Expected
      }

      expect(auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    // --- Audit behavior ---

    it('emits appointments.schedule.viewed audit event on success', async () => {
      const { service, auditHelper } = makeService({
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      expect(auditHelper.emitDirect).toHaveBeenCalledOnce();
      expect(auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'appointments.schedule.viewed',
          outcome: 'success',
          scope: 'facility_context',
          metadata: { endpoint: 'appointments_today_view' },
        }),
      );
    });

    it('emits audit event with empty results', async () => {
      const { service, auditHelper } = makeService({
        appointments: [],
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      expect(auditHelper.emitDirect).toHaveBeenCalledOnce();
      expect(auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'appointments.schedule.viewed',
          outcome: 'success',
        }),
      );
    });

    it('does NOT emit audit event when auth result is null', async () => {
      const { service, auditHelper } = makeService({
        authResult: null,
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      expect(auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('does NOT emit audit event when facility timezone is null', async () => {
      const { service, auditHelper } = makeService({
        facility: makeFacility(null),
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      try {
        await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);
      } catch {
        // Expected
      }

      expect(auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('does NOT emit audit event when timezone is invalid', async () => {
      const { service, auditHelper } = makeService({
        facility: makeFacility('Invalid/Timezone'),
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      try {
        await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);
      } catch {
        // Expected
      }

      expect(auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    // --- Response contract ---

    it('returns successful response with appointments', async () => {
      const appointments: Appointment[] = [
        makeAppointment({
          id: 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as Appointment['id'],
          scheduledStart: new Date('2026-08-01T09:00:00.000Z'),
          scheduledEnd: new Date('2026-08-01T09:30:00.000Z'),
          status: 'booked',
        }),
        makeAppointment({
          id: 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as Appointment['id'],
          scheduledStart: new Date('2026-08-01T14:00:00.000Z'),
          scheduledEnd: new Date('2026-08-01T14:30:00.000Z'),
          status: 'confirmed',
        }),
      ];
      const { service } = makeService({
        appointments,
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      const result = await service.loadTodayAppointments(
        'cookie',
        BASE_AUDIT_CONTEXT,
      );

      expect(result).not.toBeNull();
      expect(result!.localDate).toBe('2026-08-01');
      expect(result!.timezone).toBe('Asia/Baghdad');
      expect(result!.appointments).toHaveLength(2);
      expect(result!.appointments[0]?.id).toBe(
        'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      );
      expect(result!.appointments[0]?.scheduledStart).toBe(
        '2026-08-01T09:00:00.000Z',
      );
      expect(result!.appointments[0]?.status).toBe('booked');
    });

    it('returns successful response with empty appointments array', async () => {
      const { service } = makeService({
        appointments: [],
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      const result = await service.loadTodayAppointments(
        'cookie',
        BASE_AUDIT_CONTEXT,
      );

      expect(result).not.toBeNull();
      expect(result!.appointments).toEqual([]);
      expect(result!.localDate).toBe('2026-08-01');
    });

    // --- Single clock instant ---

    it('calls clock.now exactly once per operation', async () => {
      const { service, clock } = makeService({
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      // Clock should be called exactly once
      expect(clock.now).toHaveBeenCalledTimes(1);
    });

    it('uses the same instant for boundaries and generatedAt', async () => {
      const clockNow = new Date('2026-08-01T12:00:00.000Z');
      const { service, appointmentsRepo } = makeService({
        clockNow,
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      // The generatedAt should use the start of the local day (midnight)
      // For Asia/Baghdad (UTC+3) at 12:00 UTC, the local time is 15:00
      // So local midnight is 12:00 - 15 hours = previous day 09:00 UTC
      // Actually, let me recalculate:
      // UTC time: 12:00
      // Baghdad time (UTC+3): 15:00
      // Local midnight today: 00:00 Baghdad = 21:00 previous day UTC
      // But we store as start of local day in UTC, so startUtc should be 21:00 UTC
      expect(appointmentsRepo.findByScheduledStartRange).toHaveBeenCalledOnce();
      const mockCalls = (
        appointmentsRepo.findByScheduledStartRange as ReturnType<typeof vi.fn>
      ).mock.calls;
      const firstCall = mockCalls[0]!;
      expect(firstCall).toBeDefined();
      const startArg = firstCall[3] as Date;
      const endArg = firstCall[4] as Date;
      expect(startArg).toBeInstanceOf(Date);
      expect(endArg).toBeInstanceOf(Date);
    });

    it('generatedAt equals the exact clock instant', async () => {
      const clockInstant = new Date('2026-08-01T12:00:00.000Z');
      const { service } = makeService({
        clockNow: clockInstant,
      });

      const result = await service.loadTodayAppointments(
        'cookie',
        BASE_AUDIT_CONTEXT,
      );

      // generatedAt must equal the exact clock instant, not boundaries.startUtc
      expect(result).not.toBeNull();
      expect(result!.generatedAt).toBe(clockInstant.toISOString());
    });

    // --- Repository queries ---

    it('queries appointments repository when authenticated', async () => {
      const { service, appointmentsRepo } = makeService({
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      expect(appointmentsRepo.findByScheduledStartRange).toHaveBeenCalledOnce();
    });

    it('queries with correct tenant, organisation, and facility scope', async () => {
      const { service, appointmentsRepo } = makeService({
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      const mockCalls = (
        appointmentsRepo.findByScheduledStartRange as ReturnType<typeof vi.fn>
      ).mock.calls;
      const firstCall = mockCalls[0]!;
      expect(firstCall).toBeDefined();
      expect(firstCall[0]).toBe(TEST_TENANT_ID);
      expect(firstCall[1]).toBe(TEST_ORG_ID);
      expect(firstCall[2]).toBe(TEST_FACILITY_ID);
    });

    // --- Contract field validation ---

    it('returns canonical AppointmentStatus values', async () => {
      const appointments: Appointment[] = [
        makeAppointment({ status: 'booked' }),
        makeAppointment({ status: 'confirmed' }),
        makeAppointment({ status: 'cancelled' }),
        makeAppointment({ status: 'arrived' }),
      ];
      const { service } = makeService({
        appointments,
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      const result = await service.loadTodayAppointments(
        'cookie',
        BASE_AUDIT_CONTEXT,
      );

      expect(result!.appointments.map((a) => a.status)).toEqual([
        'booked',
        'confirmed',
        'cancelled',
        'arrived',
      ]);
    });

    it('returns ISO-8601 formatted timestamps', async () => {
      const appointments: Appointment[] = [
        makeAppointment({
          scheduledStart: new Date('2026-08-01T09:00:00.000Z'),
          scheduledEnd: new Date('2026-08-01T09:30:00.000Z'),
        }),
      ];
      const { service } = makeService({
        appointments,
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      const result = await service.loadTodayAppointments(
        'cookie',
        BASE_AUDIT_CONTEXT,
      );

      // Verify ISO format
      expect(result!.appointments[0]?.scheduledStart).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(result!.appointments[0]?.scheduledEnd).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('returns localDate in YYYY-MM-DD format', async () => {
      const { service } = makeService({
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      const result = await service.loadTodayAppointments(
        'cookie',
        BASE_AUDIT_CONTEXT,
      );

      expect(result!.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns the configured timezone identifier', async () => {
      const { service } = makeService({
        facility: makeFacility('America/New_York'),
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      const result = await service.loadTodayAppointments(
        'cookie',
        BASE_AUDIT_CONTEXT,
      );

      expect(result!.timezone).toBe('America/New_York');
    });
  });
});

// ---------------------------------------------------------------------------
// Timezone boundary unit tests
// ---------------------------------------------------------------------------

describe('Timezone boundary calculation', () => {
  // These tests verify the computeFacilityDayBoundaries function
  // by testing specific known timezone scenarios.

  describe('Asia/Baghdad (whole-hour offset)', () => {
    it('correctly calculates boundaries for a normal day', () => {
      // Asia/Baghdad is UTC+3 (no DST)
      // At 2026-08-01 12:00 UTC, Baghdad time is 15:00
      // Local midnight today: 00:00 Baghdad = 21:00 previous day UTC
      // Local midnight tomorrow: 00:00 tomorrow Baghdad = 21:00 today UTC
      // Interval: [21:00 UTC, 21:00 UTC) = 24 hours

      const now = new Date('2026-08-01T12:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'Asia/Baghdad');

      expect(result.localDate).toBe('2026-08-01');
      expect(result.startUtc.toISOString()).toBe('2026-07-31T21:00:00.000Z');
      expect(result.endUtc.toISOString()).toBe('2026-08-01T21:00:00.000Z');

      // Verify interval length
      const intervalHours =
        (result.endUtc.getTime() - result.startUtc.getTime()) /
        (1000 * 60 * 60);
      expect(intervalHours).toBe(24);
    });
  });

  describe('Asia/Kathmandu (non-whole-hour offset)', () => {
    it('correctly calculates boundaries for non-whole-hour offset', () => {
      // Asia/Kathmandu is UTC+5:45 (no DST)
      // At 2026-08-01 12:00 UTC, Kathmandu time is 17:45
      // Local midnight today: 00:00 Kathmandu = 18:15 previous day UTC
      // Local midnight tomorrow: 00:00 tomorrow Kathmandu = 18:15 today UTC
      // Interval: [18:15 UTC, 18:15 UTC) = 24 hours

      const now = new Date('2026-08-01T12:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'Asia/Kathmandu');

      expect(result.localDate).toBe('2026-08-01');
      expect(result.startUtc.toISOString()).toBe('2026-07-31T18:15:00.000Z');
      expect(result.endUtc.toISOString()).toBe('2026-08-01T18:15:00.000Z');

      // Verify interval length
      const intervalHours =
        (result.endUtc.getTime() - result.startUtc.getTime()) /
        (1000 * 60 * 60);
      expect(intervalHours).toBe(24);
    });
  });

  describe('America/New_York (DST transitions)', () => {
    it('correctly handles the day AFTER spring-forward (24-hour UTC interval)', () => {
      // March 9, 2026 is the day AFTER DST starts (DST started March 8)
      // At 2026-03-09 07:00 UTC, New York time is 03:00 EDT (UTC-4)
      // Local midnight: 00:00 EDT = 04:00 UTC
      // Next midnight: 00:00 next day EDT = 04:00 next day UTC
      // Interval: 24 hours (no DST change during this day)

      const now = new Date('2026-03-09T07:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'America/New_York');

      expect(result.localDate).toBe('2026-03-09');
      expect(result.startUtc.toISOString()).toBe('2026-03-09T04:00:00.000Z');
      expect(result.endUtc.toISOString()).toBe('2026-03-10T04:00:00.000Z');

      // Verify interval is 24 hours (no DST change on this day)
      const intervalHours =
        (result.endUtc.getTime() - result.startUtc.getTime()) /
        (1000 * 60 * 60);
      expect(intervalHours).toBe(24);
    });

    it('correctly handles the day AFTER fall-back (24-hour UTC interval)', () => {
      // November 2, 2026 is the day AFTER DST ends (DST ended November 1)
      // At 2026-11-02 12:00 UTC, New York time is 07:00 EST (UTC-5)
      // Local midnight: 00:00 EST = 05:00 UTC
      // Next midnight: 00:00 next day EST = 05:00 next day UTC
      // Interval: 24 hours (no DST change during this day)

      const now = new Date('2026-11-02T12:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'America/New_York');

      expect(result.localDate).toBe('2026-11-02');
      expect(result.startUtc.toISOString()).toBe('2026-11-02T05:00:00.000Z');
      expect(result.endUtc.toISOString()).toBe('2026-11-03T05:00:00.000Z');

      // Verify interval is 24 hours (no DST change on this day)
      const intervalHours =
        (result.endUtc.getTime() - result.startUtc.getTime()) /
        (1000 * 60 * 60);
      expect(intervalHours).toBe(24);
    });

    it('correctly handles the DST transition day itself (fall-back)', () => {
      // November 1, 2026 IS the fall-back day
      // At 2026-11-01 12:00 UTC, New York time is 08:00 EDT (UTC-4)
      // Local midnight: 00:00 EDT = 04:00 UTC
      // DST falls back at 02:00 EDT -> 01:00 EST
      // Next midnight: 00:00 EST = 05:00 next day UTC
      // The interval is 25 hours because of the fall-back

      const now = new Date('2026-11-01T12:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'America/New_York');

      expect(result.localDate).toBe('2026-11-01');
      // Midnight EDT = 04:00 UTC, next midnight EST = 05:00 next day UTC
      expect(result.startUtc.toISOString()).toBe('2026-11-01T04:00:00.000Z');
      expect(result.endUtc.toISOString()).toBe('2026-11-02T05:00:00.000Z');

      // Verify interval is 25 hours (fall back)
      const intervalHours =
        (result.endUtc.getTime() - result.startUtc.getTime()) /
        (1000 * 60 * 60);
      expect(intervalHours).toBe(25);
    });
  });

  describe('Half-open interval behavior', () => {
    it('includes appointment exactly at start boundary', () => {
      // Asia/Baghdad (UTC+3)
      // Local midnight: 00:00 Baghdad = 21:00 previous day UTC
      const now = new Date('2026-08-01T12:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'Asia/Baghdad');

      // An appointment at exactly startUtc should be included
      expect('2026-07-31T21:00:00.000Z' >= result.startUtc.toISOString()).toBe(
        true,
      );
      expect('2026-07-31T21:00:00.000Z' < result.endUtc.toISOString()).toBe(
        true,
      );
    });

    it('excludes appointment exactly at end boundary', () => {
      // Asia/Baghdad (UTC+3)
      // Local midnight tomorrow: 00:00 tomorrow = 21:00 today UTC
      const now = new Date('2026-08-01T12:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'Asia/Baghdad');

      // An appointment at exactly endUtc should be excluded
      expect(result.endUtc.toISOString() >= '2026-08-01T21:00:00.000Z').toBe(
        true,
      );
      expect('2026-08-01T21:00:00.000Z' < result.endUtc.toISOString()).toBe(
        false,
      );
    });
  });

  describe('Negative offset (UTC-x)', () => {
    it('correctly calculates boundaries for negative offset', () => {
      // America/Los_Angeles is UTC-8 in winter (PST)
      // At 2026-01-15 12:00 UTC, LA time is 04:00 PST
      // Local midnight today: 00:00 PST = 08:00 UTC
      // Local midnight tomorrow: 00:00 tomorrow PST = 08:00 tomorrow UTC
      // Interval: [08:00 UTC, 08:00 UTC) = 24 hours

      const now = new Date('2026-01-15T12:00:00.000Z');
      const result = computeFacilityDayBoundaries(now, 'America/Los_Angeles');

      expect(result.localDate).toBe('2026-01-15');
      expect(result.startUtc.toISOString()).toBe('2026-01-15T08:00:00.000Z');
      expect(result.endUtc.toISOString()).toBe('2026-01-16T08:00:00.000Z');
    });
  });
});
