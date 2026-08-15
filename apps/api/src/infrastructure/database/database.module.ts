import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';
import { PrismaTenantRepository } from './repositories/prisma-tenant.repository.js';
import { PrismaOrganisationRepository } from './repositories/prisma-organisation.repository.js';
import { PrismaFacilityRepository } from './repositories/prisma-facility.repository.js';
import { PrismaUserRepository } from './repositories/prisma-user.repository.js';
import { PrismaTenantMembershipRepository } from './repositories/prisma-tenant-membership.repository.js';
import { PrismaSessionRepository } from './repositories/prisma-session.repository.js';
import { PrismaTenantRoleAssignmentRepository } from './repositories/prisma-tenant-role-assignment.repository.js';
import { PrismaAppointmentRepository } from './repositories/prisma-appointment.repository.js';
import { PrismaPatientRepository } from './repositories/prisma-patient.repository.js';
import { PrismaPatientIdentifierRepository } from './repositories/prisma-patient-identifier.repository.js';
import { PrismaPatientConsentRepository } from './repositories/prisma-patient-consent.repository.js';
import { PrismaProviderRepository } from './repositories/prisma-provider.repository.js';
import { PrismaEncounterRepository } from './repositories/prisma-encounter.repository.js';
import { PrismaClinicalNoteRepository } from './repositories/prisma-clinical-note.repository.js';
import { ClinicalNoteSigningAuthorityService } from './services/clinical-note-signing-authority.service.js';
import { LocalCredentialService } from './repositories/local-credential.service.js';
import { TreatmentConsentVerificationService } from './services/treatment-consent-verification.service.js';
import { AgeOfMajorityPolicyService } from './services/age-of-majority-policy.service.js';
import {
  AGE_OF_MAJORITY_POLICY_PORT,
  TREATMENT_CONSENT_VERIFICATION_PORT,
} from '@ibn-hayan/domain';

/**
 * Database infrastructure module.
 *
 * Wires the Prisma-backed repository implementations against the
 * repository interfaces declared in `@ibn-hayan/domain`. Feature
 * modules that need persistence depend on the interfaces using
 * `@Inject(TENANT_REPOSITORY)` etc. — they do not depend on
 * `PrismaService` or on the Prisma-backed implementations directly.
 * This is the structural expression of ADR-012 §1.4 safeguard 2
 * (Repository interfaces).
 *
 * The `LocalCredentialService` is an infrastructure-only service that
 * is NOT exposed through a domain port. The auth module consumes it
 * directly (via `@Inject(LocalCredentialService)`) to read and write
 * Argon2id password hashes. The password hash never leaves the
 * infrastructure layer; it is never surfaced through a domain type
 * or an API response.
 *
 * This module is imported by `AppModule` (starting with the fourth
 * canonical batch) so that the auth module can use the user,
 * membership, session, and credential repositories. The Health module
 * does NOT import this module; the API can boot and serve Health
 * without `DATABASE_URL` set, as long as no auth request occurs.
 *
 * Per STEP 11 requirement 10 (third canonical batch): the
 * `PrismaService` does not connect automatically during module
 * construction. The driver adapter opens the connection lazily on the
 * first query. This means the API process can boot successfully even
 * when no database is reachable, as long as no query is issued.
 */

/**
 * DI tokens for the repository interfaces. Feature modules use these
 * tokens in `@Inject(...)` to receive the interface-typed
 * implementation. Using Symbol tokens (rather than the interface
 * itself) avoids TypeScript's structural-identity pitfall where two
 * interfaces with the same shape are treated as interchangeable.
 *
 * The token `const` declarations live in the cycle-free `tokens.ts`
 * module (see that file for the rationale) and are re-exported here so
 * existing imports from `database.module.js` and the
 * `infrastructure/database/index.js` barrel continue to work unchanged.
 */
export {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  USER_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  APPOINTMENT_REPOSITORY,
  PATIENT_REPOSITORY,
  PATIENT_IDENTIFIER_REPOSITORY,
  PATIENT_CONSENT_REPOSITORY,
  WORKFORCE_REPOSITORY,
  ENCOUNTER_REPOSITORY,
  CLINICAL_NOTE_REPOSITORY,
  CLINICAL_NOTE_SIGNING_AUTHORITY_PORT,
} from './tokens.js';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  USER_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  APPOINTMENT_REPOSITORY,
  PATIENT_REPOSITORY,
  PATIENT_IDENTIFIER_REPOSITORY,
  PATIENT_CONSENT_REPOSITORY,
  WORKFORCE_REPOSITORY,
  ENCOUNTER_REPOSITORY,
  CLINICAL_NOTE_REPOSITORY,
  CLINICAL_NOTE_SIGNING_AUTHORITY_PORT,
} from './tokens.js';

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    LocalCredentialService,
    {
      provide: TENANT_REPOSITORY,
      useClass: PrismaTenantRepository,
    },
    {
      provide: ORGANISATION_REPOSITORY,
      useClass: PrismaOrganisationRepository,
    },
    {
      provide: FACILITY_REPOSITORY,
      useClass: PrismaFacilityRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: TENANT_MEMBERSHIP_REPOSITORY,
      useClass: PrismaTenantMembershipRepository,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: PrismaSessionRepository,
    },
    {
      provide: TENANT_ROLE_ASSIGNMENT_REPOSITORY,
      useClass: PrismaTenantRoleAssignmentRepository,
    },
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: PrismaAppointmentRepository,
    },
    {
      provide: PATIENT_REPOSITORY,
      useClass: PrismaPatientRepository,
    },
    {
      provide: PATIENT_IDENTIFIER_REPOSITORY,
      useClass: PrismaPatientIdentifierRepository,
    },
    {
      provide: PATIENT_CONSENT_REPOSITORY,
      useClass: PrismaPatientConsentRepository,
    },
    {
      provide: TREATMENT_CONSENT_VERIFICATION_PORT,
      useClass: TreatmentConsentVerificationService,
    },
    {
      provide: AGE_OF_MAJORITY_POLICY_PORT,
      useClass: AgeOfMajorityPolicyService,
    },
    {
      provide: WORKFORCE_REPOSITORY,
      useClass: PrismaProviderRepository,
    },
    {
      provide: ENCOUNTER_REPOSITORY,
      useClass: PrismaEncounterRepository,
    },
    {
      provide: CLINICAL_NOTE_REPOSITORY,
      useClass: PrismaClinicalNoteRepository,
    },
    {
      provide: CLINICAL_NOTE_SIGNING_AUTHORITY_PORT,
      useClass: ClinicalNoteSigningAuthorityService,
    },
  ],
  // PrismaService and the repository implementations are not exported
  // directly. Feature modules that need persistence inject the
  // repository interfaces via the DI tokens above; they do not
  // inject PrismaService. This keeps Prisma types out of feature
  // modules' signatures.
  //
  // The LocalCredentialService IS exported because it is consumed by
  // the auth module's PasswordService. It is an infrastructure-only
  // service (no domain port); the auth module imports it directly.
  //
  // Per the ninth canonical batch specification (audit primitive
  // foundation), PrismaService is now also exported because the
  // audit outbox repository (which lives in the audit module) needs
  // direct access to the transactional Prisma client to insert
  // outbox rows in the caller's transaction. The audit module
  // imports DatabaseModule; the audit outbox repository injects
  // PrismaService directly. This is a deliberate cross-module
  // dependency: the audit outbox is a transactional-store concern
  // (the outbox table lives in the transactional database), but
  // the audit module owns the outbox-repository implementation.
  exports: [
    PrismaService,
    TENANT_REPOSITORY,
    ORGANISATION_REPOSITORY,
    FACILITY_REPOSITORY,
    USER_REPOSITORY,
    TENANT_MEMBERSHIP_REPOSITORY,
    SESSION_REPOSITORY,
    TENANT_ROLE_ASSIGNMENT_REPOSITORY,
    APPOINTMENT_REPOSITORY,
    PATIENT_REPOSITORY,
    PATIENT_IDENTIFIER_REPOSITORY,
    PATIENT_CONSENT_REPOSITORY,
    TREATMENT_CONSENT_VERIFICATION_PORT,
    AGE_OF_MAJORITY_POLICY_PORT,
    WORKFORCE_REPOSITORY,
    ENCOUNTER_REPOSITORY,
    CLINICAL_NOTE_REPOSITORY,
    CLINICAL_NOTE_SIGNING_AUTHORITY_PORT,
    LocalCredentialService,
  ],
})
export class DatabaseModule {}

/**
 * Type helper for feature modules that inject the repository tokens.
 * The cast is structural: NestJS resolves the token to the
 * Prisma-backed implementation, and the cast asserts that the
 * implementation satisfies the domain interface.
 *
 * Usage:
 *   constructor(
 *     @Inject(USER_REPOSITORY)
 *     private readonly users: UserRepository,
 *   ) {}
 */
export type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
  TenantRoleAssignmentRepository,
  AppointmentRepository,
  PatientRepository,
  PatientIdentifierRepository,
  PatientConsentRepository,
  TreatmentConsentVerificationPort,
  AgeOfMajorityPolicyPort,
  ProviderRepository,
  EncounterRepository,
  ClinicalNoteRepository,
  ClinicalNoteSigningAuthorityPort,
} from '@ibn-hayan/domain';
