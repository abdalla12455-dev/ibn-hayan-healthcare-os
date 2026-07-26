/**
 * Public Clinic Admin Overview contract entry point.
 *
 * Re-exports the Zod schemas and the inferred TypeScript types so
 * that consumers import from `@ibn-hayan/contracts` (or from the
 * package root) without reaching into internal file paths.
 */

export {
  RegionAvailabilitySchema,
  RegionKeySchema,
  RegionStatusSchema,
  ActiveContextIdentitySchema,
  AdministratorIdentitySchema,
  ClinicAdminOverviewResponseSchema,
  ClinicAdminOverviewErrorResponseSchema,
  type RegionAvailability,
  type RegionKey,
  type RegionStatus,
  type ActiveContextIdentity,
  type AdministratorIdentity,
  type ClinicAdminOverviewResponse,
  type ClinicAdminOverviewErrorResponse,
} from './clinic-admin.schema.js';
