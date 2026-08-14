/**
 * Database-layer dependency-injection tokens for repository interfaces.
 *
 * These Symbol tokens are declared in a dedicated, dependency-free module
 * (no imports of NestJS, Prisma, or repository implementations) so that
 * infrastructure services that are themselves wired by `DatabaseModule`
 * (e.g. `TreatmentConsentVerificationService`) can import a token without
 * forming a runtime circular import with `database.module.ts`. Under ESM
 * depth-first evaluation, a service that re-imports a token from
 * `database.module.ts` while `database.module.ts` is still initialising
 * would observe the token `const` as `undefined`; sourcing the token from
 * this cycle-free module avoids that.
 *
 * Feature modules use these tokens in `@Inject(...)` to receive the
 * interface-typed implementation. Using Symbol tokens (rather than the
 * interface itself) avoids TypeScript's structural-identity pitfall where
 * two interfaces with the same shape are treated as interchangeable.
 *
 * `database.module.ts` re-exports these tokens so existing imports from
 * `database.module.js` and the `infrastructure/database/index.js` barrel
 * continue to work unchanged.
 */
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
export const ORGANISATION_REPOSITORY = Symbol('ORGANISATION_REPOSITORY');
export const FACILITY_REPOSITORY = Symbol('FACILITY_REPOSITORY');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const TENANT_MEMBERSHIP_REPOSITORY = Symbol(
  'TENANT_MEMBERSHIP_REPOSITORY',
);
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const TENANT_ROLE_ASSIGNMENT_REPOSITORY = Symbol(
  'TENANT_ROLE_ASSIGNMENT_REPOSITORY',
);
export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');
export const PATIENT_REPOSITORY = Symbol('PATIENT_REPOSITORY');
export const PATIENT_IDENTIFIER_REPOSITORY = Symbol(
  'PATIENT_IDENTIFIER_REPOSITORY',
);
export const PATIENT_CONSENT_REPOSITORY = Symbol('PATIENT_CONSENT_REPOSITORY');
export const WORKFORCE_REPOSITORY = Symbol('WORKFORCE_REPOSITORY');
export const ENCOUNTER_REPOSITORY = Symbol('ENCOUNTER_REPOSITORY');
