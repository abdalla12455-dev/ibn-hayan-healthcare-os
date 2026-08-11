import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  Encounter,
  EncounterCreateInput,
  EncounterTransitionInput,
  AppointmentRepository,
  PatientRepository,
  ProviderRepository,
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  Tenant,
  Organisation,
  Facility,
  Session,
  User,
  TenantMembership,
} from '@ibn-hayan/domain';
import { EncountersService } from './encounters.service.js';
import type { ConsentGateFeatureConfig } from './consent-gate-feature.config.js';

/**
 * Unit tests for the EncountersService (Stage 2A — BC02 Encounter
 * Foundation).
 *
 * These tests use hand-written mock repositories to verify the
 * service's orchestration logic: scope derivation, consent-gate
 * enforcement, patient/provider/appointment validation, lifecycle
 * transition mapping, idempotency, and audit emission. The
 * concurrency-safe SERIALIZABLE transaction behaviour is verified
 * by the PostgreSQL integration tests (CI), not here.
 *
 * The consent gate is mocked to a fixed decision per test.
 */

const TENANT_ID = '00000000-0000-0000-0000-000000000001' as never;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as never;
const FACILITY_ID = '00000000-0000-0000-0000-000000000003' as never;
const PATIENT_ID = '00000000-0000-0000-0000-000000000010' as never;
const PROVIDER_ID = '00000000-0000-0000-0000-000000000020' as never;
const APPOINTMENT_ID = '00000000-0000-0000-0000-000000000030' as never;
const ENCOUNTER_ID = '00000000-0000-0000-0000-000000000040' as never;
const USER_ID = '00000000-0000-0000-0000-000000000099' as never;
const SESSION_ID = '00000000-0000-0000-0000-000000000098' as never;

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: ENCOUNTER_ID,
    tenantId: TENANT_ID,
    organisationId: ORG_ID,
    facilityId: FACILITY_ID,
    patientId: PATIENT_ID,
    providerId: PROVIDER_ID,
    appointmentId: null,
    encounterType: 'outpatient',
    status: 'planned',
    priority: 'routine',
    createdAt: new Date('2026-08-11T00:00:00Z'),
    updatedAt: new Date('2026-08-11T00:00:00Z'),
    ...overrides,
  };
}

function makeActiveTenant(): Tenant {
  return {
    id: TENANT_ID,
    status: 'active',
  } as unknown as Tenant;
}

function makeActiveOrg(): Organisation {
  return {
    id: ORG_ID,
    tenantId: TENANT_ID,
    status: 'active',
  } as unknown as Organisation;
}

function makeActiveFacility(): Facility {
  return {
    id: FACILITY_ID,
    tenantId: TENANT_ID,
    organisationId: ORG_ID,
    status: 'active',
  } as unknown as Facility;
}

function makeAuthResult() {
  const session: Session = {
    id: SESSION_ID,
    activeTenantMembershipId: 'membership-1',
    activeOrganisationId: ORG_ID,
    activeFacilityId: FACILITY_ID,
  } as unknown as Session;
  const user: User = { id: USER_ID } as unknown as User;
  const membership: TenantMembership = {
    id: 'membership-1',
    tenantId: TENANT_ID,
    status: 'active',
  } as unknown as TenantMembership;
  return {
    session,
    user,
    memberships: [membership],
    expiresAt: new Date(),
    rotatedRawToken: null,
  };
}

function makeMocks() {
  const tenantsMock = {
    findById: vi.fn().mockResolvedValue(makeActiveTenant()),
  };
  const organisationsMock = {
    findById: vi.fn().mockResolvedValue(makeActiveOrg()),
  };
  const facilitiesMock = {
    findById: vi.fn().mockResolvedValue(makeActiveFacility()),
  };
  const appointmentsMock = {
    findById: vi.fn().mockResolvedValue(null),
  };
  const patientsMock = {
    existsInTenant: vi.fn().mockResolvedValue(true),
  };
  const providersMock = {
    isEligibleForFacility: vi.fn().mockResolvedValue(true),
  };
  const encountersMock = {
    create: vi.fn(),
    findById: vi.fn(),
    transitionStatus: vi.fn(),
  };
  const authServiceMock = {
    getSessionFromCookie: vi.fn().mockResolvedValue(makeAuthResult()),
  };
  const auditHelperMock = {
    emitDirect: vi.fn().mockResolvedValue(undefined),
  };
  const consentGateMock = {
    isConsentGateEnabled: vi.fn().mockReturnValue(true),
  };
  const service = new EncountersService(
    tenantsMock as unknown as TenantRepository,
    organisationsMock as unknown as OrganisationRepository,
    facilitiesMock as unknown as FacilityRepository,
    appointmentsMock as unknown as AppointmentRepository,
    patientsMock as unknown as PatientRepository,
    providersMock as unknown as ProviderRepository,
    encountersMock,
    authServiceMock as never,
    auditHelperMock as never,
    consentGateMock as unknown as ConsentGateFeatureConfig,
  );
  return {
    service,
    tenants: tenantsMock,
    organisations: organisationsMock,
    facilities: facilitiesMock,
    appointments: appointmentsMock,
    patients: patientsMock,
    providers: providersMock,
    encounters: encountersMock,
    authService: authServiceMock,
    auditHelper: auditHelperMock,
    consentGate: consentGateMock,
  };
}

const auditContext = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  ipAddress: '127.0.0.1',
  userAgent: 'test',
};

describe('EncountersService', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  // -------------------------------------------------------------------------
  // CONSENT GATE
  // -------------------------------------------------------------------------

  describe('consent gate', () => {
    it('blocks a non-emergency encounter when the gate is enforced (fail-safe)', async () => {
      mocks.consentGate.isConsentGateEnabled.mockReturnValue(true);
      await expect(
        mocks.service.createEncounter(
          {
            patientId: PATIENT_ID,
            providerId: PROVIDER_ID,
            encounterType: 'outpatient',
            priority: 'routine',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toBeDefined();
      // The patient/provider/appointment validation must NOT run after
      // the gate blocks (fail-safe before any reference validation).
      expect(mocks.patients.existsInTenant).not.toHaveBeenCalled();
    });

    it('blocks a non-emergency encounter and throws the canonical consent-required error', async () => {
      mocks.consentGate.isConsentGateEnabled.mockReturnValue(true);
      await expect(
        mocks.service.createEncounter(
          {
            patientId: PATIENT_ID,
            providerId: PROVIDER_ID,
            encounterType: 'outpatient',
            priority: 'urgent',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_CONSENT_REQUIRED' } },
      });
    });

    it('allows an emergency encounter through the enforced gate (carve-out)', async () => {
      mocks.consentGate.isConsentGateEnabled.mockReturnValue(true);
      mocks.encounters.create.mockResolvedValue({
        outcome: 'created',
        encounter: makeEncounter({
          encounterType: 'emergency',
          priority: 'emergency',
        }),
        transitioned: true,
      });
      const result = await mocks.service.createEncounter(
        {
          patientId: PATIENT_ID,
          providerId: PROVIDER_ID,
          encounterType: 'emergency',
          priority: 'emergency',
          emergencyJustification: 'Patient unconscious, no consent available',
        },
        'cookie',
        auditContext,
      );
      expect(result!.encounterType).toBe('emergency');
      // The audit event must carry the emergency justification.
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            emergency: true,
            emergencyJustification: 'Patient unconscious, no consent available',
            consentGateEnforced: true,
          }),
        }),
      );
    });

    it('allows a non-emergency encounter when the gate is disabled (dev only) and audits the disablement', async () => {
      mocks.consentGate.isConsentGateEnabled.mockReturnValue(false);
      mocks.encounters.create.mockResolvedValue({
        outcome: 'created',
        encounter: makeEncounter(),
        transitioned: true,
      });
      const result = await mocks.service.createEncounter(
        {
          patientId: PATIENT_ID,
          providerId: PROVIDER_ID,
          encounterType: 'outpatient',
          priority: 'routine',
        },
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('planned');
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            consentGateEnforced: false,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // CREATION — reference validation
  // -------------------------------------------------------------------------

  describe('createEncounter reference validation', () => {
    beforeEach(() => {
      mocks.consentGate.isConsentGateEnabled.mockReturnValue(false);
    });

    it('throws ENCOUNTER_PATIENT_NOT_FOUND when the patient does not exist in tenant', async () => {
      mocks.patients.existsInTenant.mockResolvedValue(false);
      await expect(
        mocks.service.createEncounter(
          {
            patientId: PATIENT_ID,
            providerId: PROVIDER_ID,
            encounterType: 'outpatient',
            priority: 'routine',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_PATIENT_NOT_FOUND' } },
      });
      expect(mocks.encounters.create).not.toHaveBeenCalled();
    });

    it('throws ENCOUNTER_PROVIDER_NOT_FOUND when the provider is not eligible for the facility', async () => {
      mocks.providers.isEligibleForFacility.mockResolvedValue(false);
      await expect(
        mocks.service.createEncounter(
          {
            patientId: PATIENT_ID,
            providerId: PROVIDER_ID,
            encounterType: 'outpatient',
            priority: 'routine',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_PROVIDER_NOT_FOUND' } },
      });
      expect(mocks.encounters.create).not.toHaveBeenCalled();
    });

    it('throws ENCOUNTER_APPOINTMENT_NOT_FOUND when the appointment is not in scope', async () => {
      mocks.appointments.findById.mockResolvedValue(null);
      await expect(
        mocks.service.createEncounter(
          {
            patientId: PATIENT_ID,
            providerId: PROVIDER_ID,
            appointmentId: APPOINTMENT_ID,
            encounterType: 'outpatient',
            priority: 'routine',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_APPOINTMENT_NOT_FOUND' } },
      });
    });

    it('throws ENCOUNTER_DUPLICATE_APPOINTMENT when an encounter already exists for the appointment', async () => {
      mocks.appointments.findById.mockResolvedValue({});
      mocks.encounters.create.mockResolvedValue({
        outcome: 'duplicate_appointment',
        encounter: makeEncounter({ appointmentId: APPOINTMENT_ID }),
      });
      await expect(
        mocks.service.createEncounter(
          {
            patientId: PATIENT_ID,
            providerId: PROVIDER_ID,
            appointmentId: APPOINTMENT_ID,
            encounterType: 'outpatient',
            priority: 'routine',
          },
          'cookie',
          auditContext,
        ),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_DUPLICATE_APPOINTMENT' } },
      });
    });

    it('creates an encounter and audits encounters.created on success', async () => {
      mocks.encounters.create.mockResolvedValue({
        outcome: 'created',
        encounter: makeEncounter(),
        transitioned: true,
      });
      const result = await mocks.service.createEncounter(
        {
          patientId: PATIENT_ID,
          providerId: PROVIDER_ID,
          encounterType: 'outpatient',
          priority: 'routine',
        },
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('planned');
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledTimes(1);
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'encounters.created',
          scope: 'facility_context',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({ encounterId: ENCOUNTER_ID }),
        }),
      );
    });

    it('creates an encounter without an appointment (walk-in/emergency)', async () => {
      mocks.encounters.create.mockResolvedValue({
        outcome: 'created',
        encounter: makeEncounter(),
        transitioned: true,
      });
      const result = await mocks.service.createEncounter(
        {
          patientId: PATIENT_ID,
          providerId: PROVIDER_ID,
          encounterType: 'outpatient',
          priority: 'routine',
        },
        'cookie',
        auditContext,
      );
      expect(result!.appointmentId).toBeNull();
      expect(mocks.appointments.findById).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------------------

  describe('lifecycle transitions', () => {
    it('arrive: planned → arrived, audits encounters.arrived', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'transitioned',
        encounter: makeEncounter({ status: 'arrived' }),
        transitioned: true,
      });
      const result = await mocks.service.arriveEncounter(
        ENCOUNTER_ID,
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('arrived');
      const spec = mocks.encounters.transitionStatus.mock
        .calls[0]![4] as EncounterTransitionInput;
      expect(spec.targetStatus).toBe('arrived');
      expect(spec.allowedSourceStates).toEqual(['planned']);
      expect(spec.idempotentIfAlreadyAtTarget).toBe(false);
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'encounters.arrived' }),
      );
    });

    it('start: planned | arrived → in_progress, audits encounters.started', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'transitioned',
        encounter: makeEncounter({ status: 'in_progress' }),
        transitioned: true,
      });
      const result = await mocks.service.startEncounter(
        ENCOUNTER_ID,
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('in_progress');
      const spec = mocks.encounters.transitionStatus.mock
        .calls[0]![4] as EncounterTransitionInput;
      expect(spec.targetStatus).toBe('in_progress');
      expect(spec.allowedSourceStates).toEqual(['planned', 'arrived']);
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'encounters.started' }),
      );
    });

    it('on-leave: in_progress → on_leave, audits encounters.on_leave', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'transitioned',
        encounter: makeEncounter({ status: 'on_leave' }),
        transitioned: true,
      });
      const result = await mocks.service.onLeaveEncounter(
        ENCOUNTER_ID,
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('on_leave');
      const spec = mocks.encounters.transitionStatus.mock
        .calls[0]![4] as EncounterTransitionInput;
      expect(spec.allowedSourceStates).toEqual(['in_progress']);
      expect(spec.targetStatus).toBe('on_leave');
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'encounters.on_leave' }),
      );
    });

    it('resume: on_leave → in_progress, audits encounters.resumed', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'transitioned',
        encounter: makeEncounter({ status: 'in_progress' }),
        transitioned: true,
      });
      await mocks.service.resumeEncounter(ENCOUNTER_ID, 'cookie', auditContext);
      const spec = mocks.encounters.transitionStatus.mock
        .calls[0]![4] as EncounterTransitionInput;
      expect(spec.allowedSourceStates).toEqual(['on_leave']);
      expect(spec.targetStatus).toBe('in_progress');
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'encounters.resumed' }),
      );
    });

    it('finish: in_progress → finished (terminal idempotent), audits encounters.finished', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'transitioned',
        encounter: makeEncounter({ status: 'finished' }),
        transitioned: true,
      });
      const result = await mocks.service.finishEncounter(
        ENCOUNTER_ID,
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('finished');
      const spec = mocks.encounters.transitionStatus.mock
        .calls[0]![4] as EncounterTransitionInput;
      expect(spec.targetStatus).toBe('finished');
      expect(spec.idempotentIfAlreadyAtTarget).toBe(true);
    });

    it('finish: re-finishing an already-finished encounter is idempotent (no audit event)', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'already_at_target',
        encounter: makeEncounter({ status: 'finished' }),
      });
      const result = await mocks.service.finishEncounter(
        ENCOUNTER_ID,
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('finished');
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('cancel: planned | arrived | in_progress → cancelled (terminal idempotent), audits encounters.cancelled with reason', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'transitioned',
        encounter: makeEncounter({ status: 'cancelled' }),
        transitioned: true,
      });
      const result = await mocks.service.cancelEncounter(
        ENCOUNTER_ID,
        { reason: 'Patient left before being seen' },
        'cookie',
        auditContext,
      );
      expect(result!.status).toBe('cancelled');
      const spec = mocks.encounters.transitionStatus.mock
        .calls[0]![4] as EncounterTransitionInput;
      expect(spec.allowedSourceStates).toEqual([
        'planned',
        'arrived',
        'in_progress',
      ]);
      expect(spec.targetStatus).toBe('cancelled');
      expect(spec.idempotentIfAlreadyAtTarget).toBe(true);
      expect(mocks.auditHelper.emitDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'encounters.cancelled',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            cancelReason: 'Patient left before being seen',
          }),
        }),
      );
    });

    it('cancel: re-cancelling an already-cancelled encounter is idempotent (no audit event)', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'already_at_target',
        encounter: makeEncounter({ status: 'cancelled' }),
      });
      await mocks.service.cancelEncounter(
        ENCOUNTER_ID,
        {},
        'cookie',
        auditContext,
      );
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // ERROR MAPPING
  // -------------------------------------------------------------------------

  describe('error mapping', () => {
    it('maps not_found to ENCOUNTER_NOT_FOUND', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'not_found',
      });
      await expect(
        mocks.service.arriveEncounter(ENCOUNTER_ID, 'cookie', auditContext),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_NOT_FOUND' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('maps invalid_source_state to ENCOUNTER_INVALID_TRANSITION and emits no audit', async () => {
      mocks.encounters.transitionStatus.mockResolvedValue({
        outcome: 'invalid_source_state',
        encounter: makeEncounter({ status: 'finished' }),
      });
      await expect(
        mocks.service.finishEncounter(ENCOUNTER_ID, 'cookie', auditContext),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_INVALID_TRANSITION' } },
      });
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // VIEW
  // -------------------------------------------------------------------------

  describe('viewEncounter', () => {
    it('returns the encounter when in scope', async () => {
      mocks.encounters.findById.mockResolvedValue(makeEncounter());
      const result = await mocks.service.viewEncounter(
        ENCOUNTER_ID,
        'cookie',
        auditContext,
      );
      expect(result!.id).toBe(ENCOUNTER_ID);
      expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
    });

    it('throws ENCOUNTER_NOT_FOUND when not in scope (no existence leak)', async () => {
      mocks.encounters.findById.mockResolvedValue(null);
      await expect(
        mocks.service.viewEncounter(ENCOUNTER_ID, 'cookie', auditContext),
      ).rejects.toMatchObject({
        response: { error: { code: 'ENCOUNTER_NOT_FOUND' } },
      });
    });
  });

  // -------------------------------------------------------------------------
  // SCOPE DERIVATION — caller cannot override scope
  // -------------------------------------------------------------------------

  describe('scope derivation', () => {
    it('derives tenantId/org/facility from the session, not the request body', async () => {
      mocks.consentGate.isConsentGateEnabled.mockReturnValue(false);
      mocks.encounters.create.mockResolvedValue({
        outcome: 'created',
        encounter: makeEncounter(),
        transitioned: true,
      });
      await mocks.service.createEncounter(
        {
          patientId: PATIENT_ID,
          providerId: PROVIDER_ID,
          encounterType: 'outpatient',
          priority: 'routine',
        },
        'cookie',
        auditContext,
      );
      const createCall = mocks.encounters.create.mock.calls[0]!;
      expect(createCall[0]).toBe(TENANT_ID);
      expect(createCall[1]).toBe(ORG_ID);
      expect(createCall[2]).toBe(FACILITY_ID);
      // The create input carries no scope.
      const input = createCall[3] as EncounterCreateInput;
      expect(input).not.toHaveProperty('tenantId');
      expect(input).not.toHaveProperty('organisationId');
      expect(input).not.toHaveProperty('facilityId');
      expect(input).not.toHaveProperty('status');
    });
  });

  // -------------------------------------------------------------------------
  // NO AUDIT ON FAILURE
  // -------------------------------------------------------------------------

  it('emits no audit event when the session is invalid (null result)', async () => {
    mocks.authService.getSessionFromCookie.mockResolvedValue(null);
    const result = await mocks.service.createEncounter(
      {
        patientId: PATIENT_ID,
        providerId: PROVIDER_ID,
        encounterType: 'outpatient',
        priority: 'routine',
      },
      'cookie',
      auditContext,
    );
    expect(result).toBeNull();
    expect(mocks.auditHelper.emitDirect).not.toHaveBeenCalled();
  });
});
