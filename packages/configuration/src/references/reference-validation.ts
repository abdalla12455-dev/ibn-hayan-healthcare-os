/**
 * Configuration-record reference validation contract.
 *
 * This module does not access a database or authorize actors.
 * The future backend service must supply a trusted tenant
 * context and an authoritative tenant-scoped repository.
 *
 * Do not remove the catalogue's reference-registration guard
 * until the complete validation and authorization workflow
 * is implemented and tested.
 */

export interface ConfigurationReferenceScope {
  readonly tenantId: string;
}

export interface ConfigurationRecordReference {
  readonly recordId: string;
}

export interface ConfigurationRecordLookup {
  readonly existsActiveInTenant: (
    tenantId: string,
    recordId: string,
  ) => Promise<boolean>;
}

/**
 * Verify one configuration-record reference.
 *
 * The supplied lookup must reject missing, inactive, archived,
 * purged, and cross-tenant records.
 *
 * A successful result from this function does not authorize
 * the caller to read or modify configuration.
 */
export async function verifyConfigurationRecordReference(
  scope: ConfigurationReferenceScope,
  reference: ConfigurationRecordReference,
  lookup?: ConfigurationRecordLookup,
): Promise<void> {
  if (
    typeof scope?.tenantId !== 'string'
    || scope.tenantId.trim().length === 0
    || typeof reference?.recordId !== 'string'
    || reference.recordId.trim().length === 0
  ) {
    throw new Error(
      'CONFIGURATION_REFERENCE_INVALID_INPUT',
    );
  }

  if (
    !lookup
    || typeof lookup.existsActiveInTenant !== 'function'
  ) {
    throw new Error(
      'CONFIGURATION_REFERENCE_VALIDATION_UNAVAILABLE',
    );
  }

  let valid: boolean;

  try {
    valid = await lookup.existsActiveInTenant(
      scope.tenantId,
      reference.recordId,
    );
  } catch {
    throw new Error(
      'CONFIGURATION_REFERENCE_VALIDATION_UNAVAILABLE',
    );
  }

  if (valid !== true) {
    throw new Error(
      'CONFIGURATION_REFERENCE_INVALID',
    );
  }
}
