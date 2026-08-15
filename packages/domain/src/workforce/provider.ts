/**
 * Provider domain model.
 *
 * The Workforce bounded context (BC10) owns provider identity, credentials,
 * scheduling, and clinical capacity. This file implements the minimal canonical
 * Provider persistence and repository foundation required for other bounded contexts,
 * especially Appointments, to verify that a provider reference genuinely exists
 * within the authenticated tenant scope.
 *
 * Per download/docs/07_MODULES/DOCTORS.md Section 2.2 (Provider as Clinical Capacity):
 * - Every appointment, encounter, clinical document, and order carries a provider
 *   attribution that links back to a provider identity owned by this module
 * - The Doctors module is the canonical source of provider identity
 *
 * Per DOCTORS.md Section 4.1 (Provider and Staff Data Scoping):
 * - Provider and staff data is tenant-isolated by default
 * - A provider registered in tenant A is not visible to tenant B
 * - Within a tenant, providers are facility-scoped: a provider may be
 *   credentialed at one facility but not at another
 *
 * Per DOCTORS.md Section 4.2 (Cross-Facility Provider Availability):
 * - A provider's schedule may span multiple facilities
 * - The appointment context must verify that the provider is assigned
 *   to the requested facility
 *
 * Per DOCTORS.md Section 11 (Provider Lifecycle):
 * - The lifecycle stages include: candidate, onboarded, active, suspended, separated
 * - Active providers are fully credentialed and authorized for clinical work
 * - Eligibility for scheduling requires active status and valid facility assignment
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { ClinicalNoteAuthorRole } from './clinical-author-role.js';

/**
 * Stable identifier for a Provider. Branded so it cannot be confused
 * with other IDs at the type level.
 */
export type ProviderId = string & { readonly __brand: 'ProviderId' };

/**
 * Stable identifier for a Provider's assignment to a Facility.
 * Used for facility-specific provider queries.
 */
export type ProviderFacilityAssignmentId = string & {
  readonly __brand: 'ProviderFacilityAssignmentId';
};

/**
 * Provider lifecycle status.
 *
 * Per DOCTORS.md Section 11:
 * - `candidate`: pre-onboarding, not yet authorized for clinical work
 * - `onboarded`: profile created, initial credentialing in progress
 * - `active`: fully credentialed and authorized for clinical work
 * - `suspended`: temporarily not authorized, pending investigation
 * - `separated`: no longer employed, profile preserved for historical reference
 *
 * For appointment eligibility, the provider must be in `active` status
 * AND have a valid facility assignment.
 */
export type ProviderLifecycleStatus =
  | 'candidate'
  | 'onboarded'
  | 'active'
  | 'suspended'
  | 'separated';

/**
 * The canonical Provider domain model. A readonly snapshot of a provider's
 * persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as ProviderId.
 * - `tenantId`: the Tenant that owns this Provider. Per DOCTORS.md,
 *   provider data is tenant-isolated by default.
 * - `status`: current lifecycle status.
 * - `clinicalAuthorRole`: the trusted clinical-note author role for
 *   this Provider, or null when none is configured. The value is a
 *   canonical ClinicalNoteAuthorRole (Physician, Nurse, Pharmacist,
 *   Therapist, Midlevel, Student) per ENUMS.md §4.2. It is a TRUSTED
 *   attribute set by workforce administration on the Provider record;
 *   it MUST NOT be derived from the platform `roleCode` (R01–R14). R05
 *   Allied Health Professional may author clinical notes only when its
 *   bound Provider carries a valid (non-null) `clinicalAuthorRole`.
 *   `student` is a supported value, but interactive Student authoring
 *   is deferred to BC03.
 * - `createdAt`: timezone-aware timestamp; set by persistence layer.
 * - `updatedAt`: timezone-aware timestamp; updated by persistence layer.
 *
 * Deliberately excluded fields (not in this minimal foundation):
 * - Demographics (name, contact information)
 * - Professional identity (license number, NPI, certifications)
 * - Credentials and privileging data
 * - Schedules and availability
 * - Patient panel assignments
 * - Productivity and performance metrics
 * - Compensation data
 *
 * These fields are out of scope for the reference foundation. They will
 * be added in subsequent batches as provider profiles and credentialing
 * are implemented.
 */
export interface Provider {
  readonly id: ProviderId;
  readonly tenantId: TenantId;
  readonly status: ProviderLifecycleStatus;
  readonly clinicalAuthorRole: ClinicalNoteAuthorRole | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * The canonical ProviderFacilityAssignment domain model. A readonly snapshot
 * of a provider's assignment to a specific facility.
 *
 * Per DOCTORS.md Section 4.2, a provider's schedule may span multiple
 * facilities. The appointment context must verify that the provider is
 * assigned to the requested facility before booking.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as ProviderFacilityAssignmentId.
 * - `providerId`: the Provider being assigned.
 * - `tenantId`: the Tenant that owns this assignment.
 * - `organisationId`: the Organisation that owns the Facility.
 * - `facilityId`: the Facility to which the provider is assigned.
 * - `assignedAt`: when the assignment was created.
 * - `revokedAt`: null if active, timestamp if revoked.
 *
 * An active assignment has `revokedAt` set to null.
 */
export interface ProviderFacilityAssignment {
  readonly id: ProviderFacilityAssignmentId;
  readonly providerId: ProviderId;
  readonly tenantId: TenantId;
  readonly organisationId: string;
  readonly facilityId: string;
  readonly assignedAt: Date;
  readonly revokedAt: Date | null;
}

/**
 * Input for creating a new Provider under a specific Tenant.
 *
 * The caller supplies `tenantId`. The persistence layer assigns
 * `id`, `status` (defaulting to `candidate`), `createdAt`,
 * and `updatedAt`.
 */
export interface CreateProviderInput {
  readonly tenantId: TenantId;
  readonly status?: ProviderLifecycleStatus;
  readonly clinicalAuthorRole?: ClinicalNoteAuthorRole | null;
}
