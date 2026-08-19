import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { configurationValueFromPrisma } from '../mappers/configuration.mapper.js';
import type {
  ConfigurationLayerCode,
  ConfigurationResolutionScope,
  ConfigurationValue,
  ConfigurationValuePutInput,
  ConfigurationValuePutResult,
  ConfigurationValueRepository,
  TenantId,
} from '@ibn-hayan/domain';
import { IMPLEMENTED_CONFIGURATION_LAYER_CODES } from '@ibn-hayan/domain';

/**
 * Prisma-backed implementation of {@link ConfigurationValueRepository}
 * (BC16). Per ADR-012 §1.4 safeguard 1, the mapper converts Prisma row
 * types to domain types before they cross the adapter boundary; Prisma
 * types do not leak through the adapter's public signatures.
 *
 * Scope coherence is re-validated in the adapter (defence-in-depth on
 * top of the database CHECK constraint): L1 requires all scope NULL;
 * L3 requires exactly `tenantId`; L4 requires the
 * tenant+organisation+facility triple. An incoherent put returns
 * `scope_incoherent` without touching the database. Unsupported layers
 * (L2, L5–L8) also return `scope_incoherent` — the database layer
 * CHECK constrains stored rows to L1/L3/L4 (only layers materialised
 * by the migration), matching the domain's implemented-layer list.
 *
 * The `put` operation validates, writes the current-value row, and
 * appends exactly one immutable version record. When the caller
 * supplies an ambient transaction client (e.g. the audit
 * two-database transaction helper), the writes and the version append
 * join it; otherwise a new SERIALIZABLE transaction is opened (the
 * same isolation level used by the Appointments module so the
 * value-version optimistic check is deterministic).
 */
@Injectable()
export class PrismaConfigurationRepository implements ConfigurationValueRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByKeyAndScope(
    key: string,
    scope: ConfigurationResolutionScope,
  ): Promise<readonly ConfigurationValue[]> {
    const filters: Prisma.ConfigurationValueWhereInput[] = [
      {
        layer: 'L1',
        tenantId: null,
        organisationId: null,
        facilityId: null,
      },
      {
        layer: 'L3',
        tenantId: scope.tenantId,
        organisationId: null,
        facilityId: null,
      },
    ];
    if (scope.organisationId !== null && scope.facilityId !== null) {
      filters.push({
        layer: 'L4',
        tenantId: scope.tenantId,
        organisationId: scope.organisationId,
        facilityId: scope.facilityId,
      });
    }
    const rows = await this.prisma.configurationValue.findMany({
      where: {
        key,
        OR: filters,
      },
    });
    return rows.map(configurationValueFromPrisma);
  }

  async findValue(
    key: string,
    layer: ConfigurationLayerCode,
    scope: ConfigurationResolutionScope,
  ): Promise<ConfigurationValue | null> {
    if (!isSupportedLayer(layer)) {
      return null;
    }
    if (!isScopeCoherent(layer, scope)) {
      return null;
    }
    const row = await this.prisma.configurationValue.findFirst({
      where: buildScopeFilter(key, layer, scope),
    });
    if (row === null) {
      return null;
    }
    return configurationValueFromPrisma(row);
  }

  async put(
    input: ConfigurationValuePutInput,
    options?: { readonly transaction?: unknown },
  ): Promise<ConfigurationValuePutResult> {
    // Re-validate scope coherence in the adapter (defence-in-depth on
    // top of the database CHECK constraint).
    if (
      !isSupportedLayer(input.layer) ||
      !isScopeCoherent(input.layer, input)
    ) {
      return { outcome: 'scope_incoherent' };
    }
    const scope: ConfigurationResolutionScope = {
      // L1 rows have no tenant/facility scope; put() only writes L3/L4
      // through the administration API, so the tenant is guaranteed.
      tenantId: input.tenantId as TenantId,
      organisationId: input.organisationId,
      facilityId: input.facilityId,
    };
    const tx = options?.transaction as Prisma.TransactionClient | undefined;
    if (tx !== undefined) {
      return this.putInTransaction(tx, input, scope);
    }
    const result = await this.prisma.$transaction(
      async (inner) => this.putInTransaction(inner, input, scope),
      { isolationLevel: 'Serializable' },
    );
    return result;
  }

  private async putInTransaction(
    tx: Prisma.TransactionClient,
    input: ConfigurationValuePutInput,
    scope: ConfigurationResolutionScope,
  ): Promise<ConfigurationValuePutResult> {
    const valueJson = input.value as Prisma.InputJsonValue;
    const filter = buildScopeFilter(input.key, input.layer, scope);
    const existing = await tx.configurationValue.findFirst({
      where: filter,
    });

    if (existing === null) {
      const created = await tx.configurationValue.create({
        data: {
          key: input.key,
          layer: input.layer,
          tenantId: input.tenantId,
          organisationId: input.organisationId,
          facilityId: input.facilityId,
          value: valueJson,
          valueVersion: 1,
          createdBy: input.actorId,
          updatedBy: input.actorId,
        },
      });
      await tx.configurationValueVersion.create({
        data: {
          configurationValueId: created.id,
          key: input.key,
          layer: input.layer,
          tenantId: input.tenantId,
          organisationId: input.organisationId,
          facilityId: input.facilityId,
          value: valueJson,
          valueVersion: 1,
          actorId: input.actorId,
        },
      });
      return {
        outcome: 'created',
        value: configurationValueFromPrisma(created),
        previousValue: null,
        previousVersion: null,
      };
    }

    // Optimistic check-and-increment: the update matches exactly the
    // observed record version. Under SERIALIZABLE isolation this is
    // deterministic; a concurrent update results in count !== 1 and
    // is treated as an incoherent put.
    const updatedCount = await tx.configurationValue.updateMany({
      where: {
        id: existing.id,
        valueVersion: existing.valueVersion,
      },
      data: {
        value: valueJson,
        valueVersion: existing.valueVersion + 1,
        updatedBy: input.actorId,
      },
    });
    if (updatedCount.count !== 1) {
      return { outcome: 'scope_incoherent' };
    }
    const updated = await tx.configurationValue.findFirstOrThrow({
      where: { id: existing.id },
    });
    await tx.configurationValueVersion.create({
      data: {
        configurationValueId: existing.id,
        key: input.key,
        layer: input.layer,
        tenantId: input.tenantId,
        organisationId: input.organisationId,
        facilityId: input.facilityId,
        value: valueJson,
        valueVersion: updated.valueVersion,
        actorId: input.actorId,
      },
    });
    return {
      outcome: 'updated',
      value: configurationValueFromPrisma(updated),
      previousValue: existing.value,
      previousVersion: existing.valueVersion,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers (adapter-internal scope coherence and filtering)
// ---------------------------------------------------------------------------

/**
 * Determines whether a layer is one of the implemented persistence
 * scopes (L1, L3, L4). Unsupported layers (L2, L5–L8) are rejected
 * before any database access; the database layer CHECK constraint
 * additionally guards persistence.
 */
function isSupportedLayer(layer: ConfigurationLayerCode): boolean {
  return IMPLEMENTED_CONFIGURATION_LAYER_CODES.includes(
    layer as (typeof IMPLEMENTED_CONFIGURATION_LAYER_CODES)[number],
  );
}

/**
 * Re-validates that the scope triple matches the layer requirements:
 * L1 ⇒ all NULL; L3 ⇒ exactly tenantId; L4 ⇒ full triple.
 */
function isScopeCoherent(
  layer: ConfigurationLayerCode,
  scope: {
    readonly tenantId?: unknown;
    readonly organisationId?: unknown;
    readonly facilityId?: unknown;
  },
): boolean {
  switch (layer) {
    case 'L1':
      return (
        scope.tenantId === null &&
        scope.organisationId === null &&
        scope.facilityId === null
      );
    case 'L3':
      return (
        scope.tenantId !== null &&
        scope.tenantId !== undefined &&
        scope.organisationId === null &&
        scope.facilityId === null
      );
    case 'L4':
      return (
        scope.tenantId !== null &&
        scope.tenantId !== undefined &&
        scope.organisationId !== null &&
        scope.organisationId !== undefined &&
        scope.facilityId !== null &&
        scope.facilityId !== undefined
      );
    default:
      return false;
  }
}

/**
 * Builds the normalised scope filter used by both the read and the
 * write paths: for L1 rows all three identifiers are NULL; for L3
 * rows the tenant is bound with organisation/facility NULL; for L4
 * rows the full hierarchy triple is bound. Null-normalising each
 * branch prevents L3/L4 callers from matching unscoped rows.
 */
function buildScopeFilter(
  key: string,
  layer: ConfigurationLayerCode,
  scope: ConfigurationResolutionScope,
): Prisma.ConfigurationValueWhereInput {
  const filter: Prisma.ConfigurationValueWhereInput = { key, layer };
  if (layer === 'L1') {
    return filter;
  }
  if (layer === 'L3') {
    filter.tenantId = scope.tenantId;
    filter.organisationId = null;
    filter.facilityId = null;
  } else if (layer === 'L4') {
    filter.tenantId = scope.tenantId;
    filter.organisationId = scope.organisationId;
    filter.facilityId = scope.facilityId;
  }
  return filter;
}
