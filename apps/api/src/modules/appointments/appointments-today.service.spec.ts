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

function makeFacility(timezone: string | null) {
  return {
    id: TEST_FACILITY_ID as never,
    tenantId: TEST_TENANT_ID as never,
    organisationId: TEST_ORG_ID as never,
    name: 'Test Facility',
    code: 'TF001',
    displayName: 'Test Facility',
    status: 'active' as const,
    timezone,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeAppointment(
  overrides: Partial<{
    id: string;
    patientId: string;
    providerId: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    status: string;
    typeCode: string;
  }> = {},
) {
  return {
    id: 'aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as never,
    tenantId: TEST_TENANT_ID as never,
    organisationId: TEST_ORG_ID as never,
    facilityId: TEST_FACILITY_ID as never,
    patientId: 'bbbbbbb0-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as never,
    providerId: 'ccccccc0-cccc-cccc-cccc-cccccccccccc' as never,
    scheduledStart: new Date('2026-08-01T09:00:00.000Z'),
    scheduledEnd: new Date('2026-08-01T09:30:00.000Z'),
    status: 'booked' as const,
    typeCode: 'consultation',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Appointment;
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
    findByScheduledStartRange: vi
      .fn<[never, never, never, Date, Date], Promise<Appointment[]>>()
      .mockResolvedValue(appointments),
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
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppointmentsTodayService', () => {
  describe('loadTodayAppointments', () => {
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
          activeTenantMembershipId: null,
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
          activeOrganisationId: null,
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
          activeFacilityId: null,
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

    it('throws APPOINTMENT_CONFIGURATION_REQUIRED when facility timezone is null', async () => {
      const { service } = makeService({ facility: makeFacility(null) });
      await expect(
        service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('does NOT fall back to UTC when facility timezone is null', async () => {
      const { service } = makeService({ facility: makeFacility(null) });
      try {
        await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        expect((e as UnprocessableEntityException).response).toMatchObject({
          error: {
            code: 'APPOINTMENT_CONFIGURATION_REQUIRED',
          },
        });
      }
    });

    it('returns successful response with appointments', async () => {
      const appointments = [
        makeAppointment({
          id: 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          scheduledStart: new Date('2026-08-01T09:00:00.000Z'),
          scheduledEnd: new Date('2026-08-01T09:30:00.000Z'),
          status: 'booked',
        }),
        makeAppointment({
          id: 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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
      expect(result!.appointments[0].id).toBe(
        'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      );
      expect(result!.appointments[0].scheduledStart).toBe(
        '2026-08-01T09:00:00.000Z',
      );
      expect(result!.appointments[0].status).toBe('booked');
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

    it('does NOT emit audit event when auth result is null', async () => {
      const { service, auditHelper } = makeService({
        authResult: null,
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      expect(auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('queries appointments repository when authenticated', async () => {
      const { service, appointmentsRepo } = makeService({
        clockNow: new Date('2026-08-01T12:00:00.000Z'),
      });

      await service.loadTodayAppointments('cookie', BASE_AUDIT_CONTEXT);

      expect(appointmentsRepo.findByScheduledStartRange).toHaveBeenCalledOnce();
    });
  });
});
