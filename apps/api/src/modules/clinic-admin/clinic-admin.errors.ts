import { ForbiddenException } from '@nestjs/common';

/**
 * Clinic Admin module error helpers.
 *
 * Per the live-data task specification Phase 7, the Clinic Admin
 * Overview endpoint must fail closed when the active context is
 * missing or invalid. The endpoint must NOT reveal:
 * - whether the user holds roles in another tenant;
 * - whether the active organisation or facility is invalid;
 * - any internal stack trace or environment detail.
 *
 * The error envelope shape mirrors the existing auth/context error
 * envelope (see `apps/api/src/modules/auth/auth.errors.ts`) so that
 * the frontend can use a single error-handling code path.
 */

/**
 * Return a 403 for a missing active context (tenant, organisation,
 * or facility) at the Clinic Admin Overview endpoint.
 *
 * Per the live-data task specification Phase 5, the endpoint requires
 * an active tenant + organisation + facility context. The shell
 * redirects to `/dashboard` when the context is missing, but the
 * API must fail closed independently so that a direct API call
 * without context is rejected.
 *
 * Per the live-data task specification Phase 7, the response is
 * generic: it does NOT reveal which dimension of context is missing.
 * The same response is returned whether the missing dimension is the
 * tenant, the organisation, or the facility. This is the structural
 * enforcement of "Missing context fails closed" and "Invalid context
 * fails closed" without revealing internal state.
 */
export function clinicAdminOverviewContextRequired(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
      message:
        'An active tenant, organisation, and facility context is required to view the Clinic Administrator Overview.',
    },
  });
}
