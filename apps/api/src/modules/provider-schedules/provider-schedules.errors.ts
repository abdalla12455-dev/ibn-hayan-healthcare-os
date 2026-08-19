import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Provider Schedules module error helpers.
 *
 * Error codes are stable and safe:
 * - `PROVIDER_SCHEDULE_VALIDATION_ERROR` (400): invalid time window,
 *   missing fields, unexpected scope in the body.
 * - `PROVIDER_SCHEDULE_PROVIDER_NOT_FOUND` (422): the provider does
 *   not exist in the tenant, is not active, or has no active
 *   assignment to the authenticated active facility. The error is
 *   identical for existence and eligibility failures so the boundary
 *   does not leak which dimension failed (no existence leak).
 * - `PROVIDER_SCHEDULE_NOT_FOUND` (404): the schedule entry does not
 *   exist (or exists in another tenant) at delete time.
 */
export function providerScheduleValidationError(
  message: string,
): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'PROVIDER_SCHEDULE_VALIDATION_ERROR',
      message,
    },
  });
}

export function providerScheduleProviderNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PROVIDER_SCHEDULE_PROVIDER_NOT_FOUND',
      message:
        'The provider was not found or is not eligible for the authenticated facility.',
    },
  });
}

export function providerScheduleNotFound(): NotFoundException {
  return new NotFoundException({
    error: {
      code: 'PROVIDER_SCHEDULE_NOT_FOUND',
      message: 'The schedule entry was not found in the current context.',
    },
  });
}
