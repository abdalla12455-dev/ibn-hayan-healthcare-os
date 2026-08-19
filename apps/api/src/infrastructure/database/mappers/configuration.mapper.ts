import type {
  ConfigurationValue,
  ConfigurationValueVersion,
  ConfigurationLayerCode,
  FacilityId,
  OrganisationId,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  ConfigurationValue as PrismaConfigurationValue,
  ConfigurationValueVersion as PrismaConfigurationValueVersion,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `ConfigurationValue` and
 * `ConfigurationValueVersion` row types and the framework-independent
 * domain types of the Configuration bounded context (BC16).
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 */
export function configurationValueFromPrisma(
  row: PrismaConfigurationValue,
): ConfigurationValue {
  return {
    id: row.id,
    key: row.key,
    layer: row.layer as ConfigurationLayerCode,
    tenantId: (row.tenantId ?? null) as TenantId | null,
    organisationId: (row.organisationId ?? null) as OrganisationId | null,
    facilityId: (row.facilityId ?? null) as FacilityId | null,
    value: row.value,
    valueVersion: row.valueVersion,
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function configurationValueVersionFromPrisma(
  row: PrismaConfigurationValueVersion,
): ConfigurationValueVersion {
  return {
    id: row.id,
    configurationValueId: row.configurationValueId,
    key: row.key,
    layer: row.layer as ConfigurationLayerCode,
    tenantId: (row.tenantId ?? null) as TenantId | null,
    organisationId: (row.organisationId ?? null) as OrganisationId | null,
    facilityId: (row.facilityId ?? null) as FacilityId | null,
    value: row.value,
    valueVersion: row.valueVersion,
    actorId: row.actorId ?? null,
    createdAt: row.createdAt,
  };
}
