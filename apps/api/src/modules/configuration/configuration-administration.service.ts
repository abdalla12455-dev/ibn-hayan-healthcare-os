import { Injectable, Inject } from '@nestjs/common';
import type {
  EffectiveConfigurationValueResponse,
  ConfigurationValueUpsertResponse,
  UpsertConfigurationValueRequest,
} from '@ibn-hayan/contracts';
import type { AuditRequestContext } from '../auth/auth.service.js';
import type {
  ConfigurationResolutionPort,
  ConfigurationResolutionScope,
  ConfigurationLayerCode,
  ConfigurationValueRepository,
  OrganisationId,
  FacilityId,
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  TenantRoleAssignmentRepository,
} from '@ibn-hayan/domain';
import {
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  CONFIGURATION_REPOSITORY,
  CONFIGURATION_RESOLUTION_PORT,
} from '../../infrastructure/database/index.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import {
  getConfigurationKeyDefinition,
  validateConfigurationValue,
  isOverrideLayerAllowed,
} from '@ibn-hayan/configuration';
import {
  configurationConflict,
  configurationInvalidValue,
  configurationNotAuthorized,
  configurationUnknownKey,
  configurationUnsupportedLayer,
} from './configuration.errors.js';

/**
 * The canonical ratified role → writable-layer mapping (BC16).
 * Authoritative per the operator-ratified matrix: R13 Platform/System
 * Administrator may write L3 tenant overrides; R09 Clinic
 * Administrator may write L4 facility overrides within its authorized
 * facility context. No other role may administer Configuration in
 * this milestone. The active membership's role assignments are
 * resolved server-side (never from the client).
 */
const CONFIGURATION_WRITE_LAYERS_BY_ROLE: Readonly<
  Record<string, readonly ConfigurationLayerCode[]>
> = {
  R13_SYSTEM_ADMINISTRATOR: ['L3'],
  R09_ADMINISTRATOR: ['L4'],
} as const;

/** Sentinel used to unwind the write transaction on incoherent scope. */
class ConfigurationScopeIncoherentError extends Error {
  constructor() {
    super('configuration scope incoherent');
    this.name = 'ConfigurationScopeIncoherentError';
  }
}

/** The resolved session shape after a successful session lookup. */
type ActiveSessionResult = NonNullable<
  Awaited<ReturnType<AuthService['getSessionFromCookie']>>
>;

/**
 * Administrative Configuration service (BC16): the GET effective
 * value and PUT override endpoints. Scope identifiers
 * (tenantId/organisationId/facilityId) are derived ONLY from the
 * authenticated session context; the request body cannot override
 * them. Layer authorization is evaluated from the active membership's
 * role assignments per {@link CONFIGURATION_WRITE_LAYERS_BY_ROLE}.
 *
 * Audit semantics:
 * - GET: emits the safe administrative-read audit event for every
 *   successful read. The internal resolution port never emits
 *   administrative events (consumers such as Scheduling must not be
 *   charged for resolution).
 * - PUT: emits the create/update audit event inside the same
 *   transactional Prisma `TransactionClient` as the data write; an
 *   audit failure rolls back both (the existing transactional audit
 *   guarantee).
 */
@Injectable()
export class ConfigurationAdministrationService {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    @Inject(TENANT_ROLE_ASSIGNMENT_REPOSITORY)
    private readonly roleAssignments: TenantRoleAssignmentRepository,
    @Inject(CONFIGURATION_REPOSITORY)
    private readonly configurationRepository: ConfigurationValueRepository,
    @Inject(CONFIGURATION_RESOLUTION_PORT)
    private readonly configurationResolution: ConfigurationResolutionPort,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
    private readonly prisma: PrismaService,
  ) {}

  /** Administratively resolve the effective value for a key. */
  async getEffectiveValue(
    key: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EffectiveConfigurationValueResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }
    const { session, user } = authResult;

    const definition = getConfigurationKeyDefinition(key);
    if (definition === null) {
      throw configurationUnknownKey();
    }

    const scope = this.deriveScope(authResult);
    const resolved = await this.configurationResolution.resolve(key, scope);

    await this.auditHelper.emitOrFail({
      action: 'configuration.effective_value.viewed',
      outcome: 'success',
      source: 'api',
      tenantId: scope.tenantId,
      actorType: 'USER',
      actorId: user.id,
      sessionId: session.id,
      requestId: auditContext?.requestId,
      correlationId: auditContext?.correlationId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      scope: 'facility_context',
      metadata: {
        endpoint: 'configuration/get',
        key,
        sourceLayer: resolved.sourceLayer,
        valueVersion: resolved.valueVersion,
        valueType: definition.valueType,
      },
    });

    return {
      key,
      value: resolved.value,
      valueType: definition.valueType,
      sourceLayer: resolved.sourceLayer as 'L1' | 'L3' | 'L4',
      resolvedAt: new Date().toISOString(),
      valueVersion: resolved.valueVersion,
    };
  }

  /**
   * Create or update an override at the explicitly requested supported
   * layer for the caller's active scope.
   */
  async upsertOverride(
    key: string,
    body: UpsertConfigurationValueRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ConfigurationValueUpsertResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }
    const { session, user, memberships } = authResult;

    const definition = getConfigurationKeyDefinition(key);
    if (definition === null) {
      throw configurationUnknownKey();
    }
    if (!isOverrideLayerAllowed(definition, body.layer)) {
      throw configurationUnsupportedLayer();
    }
    const validated = validateConfigurationValue(definition, body.value);
    if (!validated.success) {
      throw configurationInvalidValue(validated.issues);
    }

    if (session.activeTenantMembershipId === null) {
      throw configurationNotAuthorized();
    }
    const activeMembership = memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      throw configurationNotAuthorized();
    }
    const assignments = await this.roleAssignments.listForMembership(
      activeMembership.id,
    );
    const authorizedLayers = new Set<ConfigurationLayerCode>();
    for (const assignment of assignments) {
      for (const layer of CONFIGURATION_WRITE_LAYERS_BY_ROLE[
        assignment.roleCode
      ] ?? []) {
        authorizedLayers.add(layer);
      }
    }
    if (!authorizedLayers.has(body.layer)) {
      throw configurationNotAuthorized();
    }

    const layer = body.layer as ConfigurationLayerCode;
    const tenantId = activeMembership.tenantId;
    let organisationId: OrganisationId | null = null;
    let facilityId: FacilityId | null = null;
    if (layer === 'L4') {
      if (
        session.activeOrganisationId === null ||
        session.activeFacilityId === null
      ) {
        throw configurationNotAuthorized();
      }
      organisationId = session.activeOrganisationId;
      facilityId = session.activeFacilityId;
    }

    const [tenant, organisation, facility] = await Promise.all([
      this.tenants.findById(tenantId),
      organisationId !== null
        ? this.organisations.findById(tenantId, organisationId)
        : Promise.resolve(null),
      facilityId !== null
        ? this.facilities.findById(tenantId, facilityId)
        : Promise.resolve(null),
    ]);
    if (
      tenant === null ||
      tenant.status !== 'active' ||
      (layer === 'L4' &&
        (organisation === null ||
          facility === null ||
          organisation.status !== 'active' ||
          facility.status !== 'active'))
    ) {
      throw configurationNotAuthorized();
    }

    try {
      const putResult = await this.prisma.$transaction(async (tx) => {
        const outcome = await this.configurationRepository.put(
          {
            key,
            layer,
            tenantId,
            organisationId,
            facilityId,
            value: validated.data,
            actorId: user.id,
          },
          { transaction: tx },
        );
        if (outcome.outcome === 'scope_incoherent') {
          throw new ConfigurationScopeIncoherentError();
        }
        await this.auditHelper.emitOrFail(
          {
            action:
              outcome.outcome === 'created'
                ? 'configuration.override.created'
                : 'configuration.override.updated',
            outcome: 'success',
            source: 'api',
            tenantId,
            actorType: 'USER',
            actorId: user.id,
            sessionId: session.id,
            requestId: auditContext?.requestId,
            correlationId: auditContext?.correlationId,
            ipAddress: auditContext?.ipAddress,
            userAgent: auditContext?.userAgent,
            scope: 'facility_context',
            metadata: {
              endpoint: 'configuration/put',
              key,
              layer,
              tenantId,
              organisationId,
              facilityId,
              outcome: outcome.outcome,
              previousValue: outcome.previousValue,
              newValue: outcome.value.value,
              valueVersion: outcome.value.valueVersion,
              previousVersion: outcome.previousVersion,
              validationSucceeded: true,
            },
          },
          { transaction: tx },
        );
        return outcome;
      });
      return {
        key,
        layer: putResult.value.layer as 'L3' | 'L4',
        scope: {
          tenantId: putResult.value.tenantId,
          organisationId: putResult.value.organisationId,
          facilityId: putResult.value.facilityId,
        },
        value: putResult.value.value,
        valueVersion: putResult.value.valueVersion,
        outcome: putResult.outcome,
        updatedAt: putResult.value.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ConfigurationScopeIncoherentError) {
        throw configurationConflict();
      }
      throw error;
    }
  }

  /**
   * Derive the trusted resolution scope from the session. Client
   * bodies cannot override tenant/organisation/facility identifiers.
   */
  private deriveScope(
    authResult: ActiveSessionResult,
  ): ConfigurationResolutionScope {
    const { session, memberships } = authResult;
    if (session.activeTenantMembershipId === null) {
      throw configurationNotAuthorized();
    }
    const activeMembership = memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      throw configurationNotAuthorized();
    }
    return {
      tenantId: activeMembership.tenantId,
      organisationId: session.activeOrganisationId ?? null,
      facilityId: session.activeFacilityId ?? null,
    };
  }
}
