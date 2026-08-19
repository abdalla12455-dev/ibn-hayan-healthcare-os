import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Configuration module error helpers (BC16).
 *
 * Fail-closed controlled error codes for the canonical Configuration
 * administration boundary. The envelope shape mirrors the existing
 * `error.code` convention used by the appointments/clinic-admin
 * modules. No details that would enable cross-scope existence
 * probing are exposed (e.g. the generic NOT_AUTHORIZED code is
 * returned for caller-vs-layer mismatches without stating which
 * authority the active context would grant).
 */

/** 400 – the requested key is not registered in the canonical registry. */
export function configurationUnknownKey(): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'CONFIGURATION_UNKNOWN_KEY',
      message: 'The configuration key is not registered.',
    },
  });
}

/**
 * 400 – the supplied value failed the registered Zod schema for the
 * key. The joined issue text is intentionally terse; it is a
 * validation result, never persisted content.
 */
export function configurationInvalidValue(
  issues: readonly string[],
): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'CONFIGURATION_INVALID_VALUE',
      message:
        issues.length > 0
          ? issues.join('; ')
          : 'The value does not satisfy the registered schema.',
    },
  });
}

/**
 * 400 – the requested layer is not an allowed override layer for the
 * key definition (e.g. L1 requested by the client when only L3/L4 are
 * writable).
 */
export function configurationUnsupportedLayer(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'CONFIGURATION_UNSUPPORTED_LAYER',
      message: 'The layer is not an allowed override layer for this key.',
    },
  });
}

/**
 * 403 – the caller's session context does not authorize the requested
 * layer, or the session lacks the facility context required for an
 * L4 operation. The same generic code is returned for every
 * authority/context mismatch so the response cannot enable scope
 * probing.
 */
export function configurationNotAuthorized(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'CONFIGURATION_NOT_AUTHORIZED',
      message:
        'The active context does not authorize this Configuration layer.',
    },
  });
}

/**
 * 409 – the persistence write could not be completed (optimistic
 * concurrency / scope incoherence). For instance a concurrent write
 * racing the record version check or an out-of-band incoherent scope.
 */
export function configurationConflict(): ConflictException {
  return new ConflictException({
    error: {
      code: 'CONFIGURATION_CONFLICT',
      message: 'The configuration write could not be completed.',
    },
  });
}
