/**
 * PatientConsent domain model.
 *
 * A dedicated consent model (NOT a boolean field on Patient), per
 * architecture gate 6I. Consent is a first-class, history-preserving
 * lifecycle entity owned by BC01. This stage implements Treatment consent
 * only (ConsentType = `treatment`); other consent types
 * (InformationDisclosure, Research, Marketing, DataSharing) are
 * canonical but deferred to subsequent stages.
 *
 * Per download/docs/03_DOMAIN/ENUMS.md §3, the canonical consent enums
 * are:
 * - ConsentType (Treatment, InformationDisclosure, Research, Marketing,
 *   DataSharing)
 * - ConsentStatus (Granted, Withdrawn, Pending, Expired) — NO "Declined"
 *   value exists canonically (architecture gate 6L). Refusal is
 *   represented by the absence of an active granted consent, NOT by a
 *   Declined status.
 * - ConsentScope (General, Specific, Emergency)
 * - ConsentDuration (Indefinite, FixedTerm, SingleEncounter)
 *
 * Consent history semantics (architecture gate 6P): consent records are
 * history-preserving MUTABLE lifecycle records, NOT append-only events.
 * The `status` field transitions (Granted → Withdrawn, Granted → Expired)
 * within a record. Every record is retained (no destructive delete).
 * Every status transition is audited. The `grantedAt`, `withdrawnAt`,
 * and `expiresAt` timestamps are preserved across transitions. This is
 * "history-preserving mutable lifecycle records" — NOT "append-only
 * consent events." The distinction is documented precisely to avoid the
 * terminology conflict flagged in the architecture gate.
 *
 * Consent expiry / unique-constraint gate (architecture gate 6J): the
 * one-active-treatment-consent invariant is enforced by a partial unique
 * index on `(tenant_id, patient_id) WHERE consent_type = 'Treatment' AND
 * status = 'granted'`. The conflict between "status = granted uniqueness"
 * and "expiresAt < now treated as expired even if status remains granted"
 * is resolved by a transactional reconciliation-before-grant strategy:
 * before inserting a new granted treatment consent, the grant command
 * (within the same SERIALIZABLE transaction) transitions any existing
 * granted treatment consent whose `expiresAt < now` to `status = 'expired'`.
 * This guarantees that an expired row transitions durably to
 * `status = 'expired'` BEFORE the new granted record is inserted, so the
 * expired row no longer occupies the partial unique index and does not
 * block legitimate re-consent. Concurrent grant requests cannot create
 * two active treatment consents: the partial unique index catches the
 * second insert, the SERIALIZABLE retry re-observes the committed granted
 * row, and the second grant resolves as `duplicate_active_consent`. No
 * database predicate involving NOW()/current time is used in the partial
 * unique index (the predicate is `status = 'granted'`, which is immutable
 * per-row state, not time-dependent).
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { PatientId } from './patient.js';

/**
 * Stable identifier for a PatientConsent row. Branded so it cannot be
 * confused with other IDs at the type level.
 */
export type PatientConsentId = string & {
  readonly __brand: 'PatientConsentId';
};

/**
 * Canonical consent type per download/docs/03_DOMAIN/ENUMS.md §3
 * (ConsentType). The database stores lowercase values. This stage
 * implements `treatment` only; the other types are canonical but the
 * BC01 API rejects them (deferred to subsequent stages where the
 * type-specific enforcement can be truthfully implemented).
 */
export type ConsentType =
  | 'treatment'
  | 'information_disclosure'
  | 'research'
  | 'marketing'
  | 'data_sharing';

/**
 * Canonical consent status per download/docs/03_DOMAIN/ENUMS.md §3
 * (ConsentStatus). NO `declined` value exists (architecture gate 6L).
 *
 * - `granted`: the patient (or guardian for a minor) has granted consent.
 *   An active granted treatment consent permits a non-emergency encounter.
 * - `withdrawn`: the patient has withdrawn a previously-granted consent.
 *   A withdrawn consent does NOT permit a non-emergency encounter. The
 *   record is retained for history.
 * - `pending`: consent capture is in progress (e.g. awaiting guardian
 *   authorization for a minor). Pending is NOT declined and is NOT
 *   granted; a non-emergency encounter is blocked while consent is
 *   pending. This stage does NOT use `pending` (the grant command creates
 *   a `granted` record directly), but the value is canonical and the
 *   database enum includes it for forward compatibility.
 * - `expired`: a FixedTerm consent whose `expiresAt` has passed, OR a
 *   consent that was transitioned to expired by the reconciliation
 *   step. Expired consent does NOT block re-consent because it is no
 *   longer `granted` (it is removed from the partial unique index).
 */
export type ConsentStatus =
  | 'granted'
  | 'withdrawn'
  | 'pending'
  | 'expired';

/**
 * Canonical consent scope per download/docs/03_DOMAIN/ENUMS.md §3
 * (ConsentScope). The database stores lowercase values.
 *
 * - `general`: consent covers general treatment within the tenant.
 * - `specific`: consent covers a specific treatment or procedure (the
 *   scope detail is carried in the audit event, not persisted as
 *   structured data in this stage).
 * - `emergency`: consent captured under the emergency carve-out basis.
 *   This is distinct from an emergency encounter that proceeds WITHOUT
 *   consent under BR-BC15-REG-003; an emergency-scope consent is an
 *   explicitly-captured consent, not an absence of consent.
 */
export type ConsentScope = 'general' | 'specific' | 'emergency';

/**
 * Canonical consent duration per download/docs/03_DOMAIN/ENUMS.md §3
 * (ConsentDuration). The database stores lowercase values.
 *
 * - `indefinite`: the consent does not expire (no `expiresAt`).
 * - `fixed_term`: the consent expires at a specific `expiresAt`
 *   timestamp. After expiry, the consent transitions to `expired` and
 *   no longer blocks re-consent.
 * - `single_encounter`: DEFERRED in this stage (architecture gate 6K).
 *   The enum value exists in the database catalogue, but the BC01 API
 *   REJECTS it because no canonical, reliable integration event exists
 *   to expire a SingleEncounter consent at encounter completion (no
 *   ConsentExpired event). SingleEncounter is NOT simulated using an
 *   arbitrary short expiration, a guessed TTL, or a fake completion
 *   timestamp. A future stage wires the encounter-completion event and
 *   enables SingleEncounter truthfully.
 */
export type ConsentDuration =
  | 'indefinite'
  | 'fixed_term'
  | 'single_encounter';

/**
 * The canonical method by which consent was captured. Used for
 * compliance provenance (the audit trail must record HOW consent was
 * captured, not just THAT it was captured).
 */
export type ConsentCaptureMethod =
  | 'in_person'
  | 'written'
  | 'verbal'
  | 'electronic'
  | 'guardian_authorization';

/**
 * The canonical PatientConsent domain model. A readonly snapshot of a
 * consent record's persistent state.
 *
 * Field semantics:
 * - `id`: stable UUID. Branded as PatientConsentId.
 * - `tenantId`: the Tenant that owns this consent.
 * - `patientId`: the Patient this consent belongs to.
 * - `consentType`: the canonical consent type. This stage: `treatment`.
 * - `status`: the current lifecycle status. Mutable (Granted →
 *   Withdrawn/Expired) but history-preserving (no delete, every
 *   transition audited).
 * - `scope`: the canonical consent scope.
 * - `duration`: the canonical consent duration.
 * - `grantedAt`: when the consent was granted (UTC).
 * - `withdrawnAt`: when the consent was withdrawn (UTC), or null.
 * - `expiresAt`: when a FixedTerm consent expires (UTC), or null for
 *   Indefinite.
 * - `capturedBy`: the logical reference to the user who captured the
 *   consent (a UUID; the Identity/Access bounded context owns User
 *   state, so this is a logical cross-BC reference, NOT a FK).
 * - `captureMethod`: how the consent was captured.
 * - `policyVersion`: the version of the consent policy/form in effect
 *   when the consent was captured. Preserved across transitions for
 *   compliance (the consent is interpreted under the policy version
 *   under which it was captured).
 * - `guardianName`: the name of the guardian who authorized consent for
 *   a minor (architecture gate 6M/6N). Required when the patient is a
 *   minor at grant time; null for adult consent. This is captured as
 *   provenance, NOT validated against a full PatientRelationship
 *   subsystem (which is out of scope for this stage).
 * - `guardianRelationship`: the relationship of the guardian to the
 *   minor patient (e.g. parent, legal guardian). Required when
 *   `guardianName` is present.
 * - `guardianCaptureMethod`: how the guardian's authorization was
 *   captured. Required when `guardianName` is present.
 * - `createdAt`, `updatedAt`: timezone-aware timestamps.
 */
export interface PatientConsent {
  readonly id: PatientConsentId;
  readonly tenantId: TenantId;
  readonly patientId: PatientId;
  readonly consentType: ConsentType;
  readonly status: ConsentStatus;
  readonly scope: ConsentScope;
  readonly duration: ConsentDuration;
  readonly grantedAt: Date;
  readonly withdrawnAt: Date | null;
  readonly expiresAt: Date | null;
  readonly capturedBy: string;
  readonly captureMethod: ConsentCaptureMethod;
  readonly policyVersion: string;
  readonly guardianName: string | null;
  readonly guardianRelationship: string | null;
  readonly guardianCaptureMethod: ConsentCaptureMethod | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for granting a Treatment consent.
 *
 * The caller supplies the patientId, duration, scope, capturedBy
 * (derived from the authenticated session), captureMethod, and
 * policyVersion. For a FixedTerm duration, `expiresAt` is required.
 *
 * Minor/guardian (architecture gate 6M/6N): if the patient is a minor
 * (DOB-based age < age-of-majority at grant time), the guardian fields
 * are REQUIRED. The service computes the patient's age from their DOB
 * and the age-of-majority policy port; if the patient is a minor, the
 * grant is rejected unless guardian authorization is supplied. If the
 * patient is an adult, guardian fields must NOT be supplied (an adult
 * grants their own consent). The age-of-majority is NOT hard-coded; it
 * is resolved from an injectable policy port
 * (AgeOfMajorityPolicyPort) so the regional configuration seam is
 * honoured.
 *
 * `single_encounter` duration is REJECTED by the service (architecture
 * gate 6K) — only `indefinite` and `fixed_term` are accepted.
 */
export interface GrantTreatmentConsentInput {
  readonly patientId: PatientId;
  readonly scope: ConsentScope;
  readonly duration: ConsentDuration;
  readonly expiresAt?: Date | null;
  readonly capturedBy: string;
  readonly captureMethod: ConsentCaptureMethod;
  readonly policyVersion: string;
  readonly guardianName?: string | null;
  readonly guardianRelationship?: string | null;
  readonly guardianCaptureMethod?: ConsentCaptureMethod | null;
}

/**
 * The result of a grant-treatment-consent attempt.
 *
 * - `granted`: a new active granted treatment consent was created.
 * - `duplicate_active_consent`: an active granted treatment consent
 *   already exists for this patient. The existing consent is returned
 *   so the service can map the error without a second read; it is NOT
 *   returned to the caller (no PHI leak). This outcome enforces the
 *   one-active-treatment-consent invariant (architecture gate 6J).
 */
export type GrantTreatmentConsentResult =
  | {
      readonly outcome: 'granted';
      readonly consent: PatientConsent;
      readonly transitioned: true;
    }
  | {
      readonly outcome: 'duplicate_active_consent';
      readonly consent: PatientConsent;
    };

/**
 * The result of a withdraw-treatment-consent attempt.
 *
 * - `withdrawn`: the consent was transitioned from `granted` to
 *   `withdrawn`. This is a first-time transition (audit emitted).
 * - `already_withdrawn`: the consent was already `withdrawn`. This is
 *   an idempotent no-op (no mutation, no audit event), mirroring the
 *   encounter terminal-target idempotency.
 * - `not_found`: the consent does not exist or belongs to a different
 *   tenant/patient (no existence leak).
 * - `not_granted`: the consent exists but is not in a `granted` status
 *   (e.g. it is `expired`). A non-granted consent cannot be withdrawn.
 */
export type WithdrawTreatmentConsentResult =
  | {
      readonly outcome: 'withdrawn';
      readonly consent: PatientConsent;
      readonly transitioned: true;
    }
  | {
      readonly outcome: 'already_withdrawn';
      readonly consent: PatientConsent;
    }
  | { readonly outcome: 'not_found' }
  | { readonly outcome: 'not_granted' };

/**
 * Repository port for the PatientConsent model (BC01).
 *
 * Per architecture gate 6J, the grant method performs the
 * transactional reconciliation-before-grant strategy within a
 * SERIALIZABLE transaction with bounded retry for P2034 /
 * DriverAdapterError-TransactionWriteConflict errors. The partial
 * unique index on `(tenant_id, patient_id) WHERE consent_type =
 * 'treatment' AND status = 'granted'` is the database-level enforcement
 * of the one-active-treatment-consent invariant; the reconciliation
 * step ensures expired rows transition to `expired` before the new
 * granted insert, so re-consent after expiry works.
 */
export interface PatientConsentRepository {
  /**
   * Grant a Treatment consent (architecture gate 6I, 6J).
   *
   * Within a SERIALIZABLE transaction:
   * 1. Reconcile: transition any existing granted treatment consent
   *    whose `expiresAt < now` to `status = 'expired'`.
   * 2. Check for an existing granted treatment consent. If one exists
   *    (and is not expired after reconciliation), return
   *    `duplicate_active_consent`.
   * 3. Insert the new granted treatment consent. The partial unique
   *    index catches a concurrent insert (the loser retries, re-observes
   *    the committed granted row, and resolves as
   *    `duplicate_active_consent`).
   *
   * @param tenantId The tenant.
   * @param input The grant input.
   * @returns The grant result.
   */
  grant(
    tenantId: TenantId,
    input: GrantTreatmentConsentInput,
  ): Promise<GrantTreatmentConsentResult>;

  /**
   * Withdraw a Treatment consent (architecture gate 6I).
   *
   * Transitions a granted consent to `withdrawn`. Idempotent: an
   * already-withdrawn consent is a no-op. A non-granted consent (e.g.
   * expired) cannot be withdrawn. A consent in another tenant/patient
   * returns `not_found` (no existence leak).
   *
   * @param tenantId The tenant.
   * @param patientId The patient (scope filter).
   * @param consentId The consent to withdraw.
   * @returns The withdrawal result.
   */
  withdraw(
    tenantId: TenantId,
    patientId: PatientId,
    consentId: PatientConsentId,
  ): Promise<WithdrawTreatmentConsentResult>;

  /**
   * List all consent records for a patient within a tenant.
   *
   * Used by the consent view endpoint and by the consent-verification
   * port. Tenant-scoped: a patient in another tenant returns an empty
   * array (no existence leak). Returns ALL records (history-preserving),
   * in chronological order by `grantedAt` descending.
   *
   * @param tenantId The tenant.
   * @param patientId The patient.
   * @returns A readonly array of consent records (may be empty).
   */
  listForPatient(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<readonly PatientConsent[]>;
}

/**
 * The result of a treatment-consent verification (architecture gate 11).
 *
 * This is the BC01-owned query/port for BC02 (Encounters). BC02 does NOT
 * query BC01 Prisma tables directly; it consumes this port. The result
 * distinguishes the canonical consent states so the encounter gate can
 * fail safely:
 *
 * - `granted`: an active granted treatment consent exists and is not
 *   expired. The non-emergency encounter may proceed.
 * - `not_granted`: no treatment consent record exists for the patient.
 *   The non-emergency encounter is blocked (fail-safe).
 * - `expired`: a treatment consent exists but is expired (status =
 *   expired, or status = granted but expiresAt < now — the
 *   reconciliation step transitions the latter to expired, but this
 *   port reports the effective state). The non-emergency encounter is
 *   blocked.
 * - `withdrawn`: a treatment consent exists but is withdrawn. The
 *   non-emergency encounter is blocked.
 * - `unknown`: the verification could not be completed due to an
 *   infrastructure failure. The non-emergency encounter MUST fail safely
 *   (blocked) — an infrastructure failure is never treated as consent
 *   granted.
 *
 * The port does NOT conflate `not_granted`, `withdrawn`, `expired`, and
 * `unknown`: each is a distinct result so the encounter gate can audit
 * the precise reason for the block and so the caller cannot mistake an
 * infrastructure failure for consent absence.
 */
export type TreatmentConsentVerificationResult =
  | { readonly status: 'granted'; readonly consentId: string }
  | { readonly status: 'not_granted' }
  | { readonly status: 'expired' }
  | { readonly status: 'withdrawn' }
  | { readonly status: 'unknown' };

/**
 * BC01-owned consent-verification port (architecture gate 11).
 *
 * BC02 (Encounters) consumes this port to verify active treatment
 * consent. BC02 does NOT query BC01 Prisma tables directly. The port is
 * a query (read) port: it does not mutate consent state. The
 * implementation queries the consent repository and computes the
 * effective consent state (treating an expired-but-still-granted row as
 * expired, since the reconciliation step runs at grant time but a read
 * may occur between the expiry moment and the next grant).
 *
 * The port fails safely: an infrastructure failure returns `unknown`,
 * and the encounter gate blocks the non-emergency encounter (it does
 * NOT treat `unknown` as `granted`).
 */
export interface TreatmentConsentVerificationPort {
  /**
   * Verify whether a patient has an active granted treatment consent at
   * the given effective time.
   *
   * @param tenantId The tenant.
   * @param patientId The patient.
   * @param effectiveAt The effective time (UTC). A consent whose
   *   `expiresAt` is before `effectiveAt` is treated as expired even if
   *   its persisted status is still `granted` (the reconciliation step
   *   at grant time transitions it, but a read between expiry and the
   *   next grant observes the effective state).
   * @returns The verification result.
   */
  verifyActiveTreatmentConsent(
    tenantId: TenantId,
    patientId: PatientId,
    effectiveAt: Date,
  ): Promise<TreatmentConsentVerificationResult>;
}

/**
 * Age-of-majority policy port (architecture gate 6M).
 *
 * BR-BC01-CLIN-005: "Age of majority configurable per region." The age
 * of majority is NOT hard-coded in the Patient domain. Canonical
 * documentation does NOT define a numeric default. This port is the
 * injectable policy/configuration seam that resolves the age of majority
 * for the current tenant/region context. The implementation reads a
 * configuration value (following the established `*.feature.config.ts`
 * convention) so the regional policy is backend-controlled and
 * overridable in tests. A future stage wires the Localization BC19
 * regulatory-framework adapter as the authoritative source; until then,
 * this port is the safe interim configuration seam that avoids
 * hard-coding any numeric age-of-majority value in the Patient domain.
 *
 * The port returns the age of majority as a positive integer. The
 * consent grant command computes the patient's age from their DOB and
 * compares it to this value to determine whether the patient is a minor
 * (requiring guardian authorization).
 */
export interface AgeOfMajorityPolicyPort {
  /**
   * Returns the age of majority for the current tenant/region context.
   * A positive integer whose value is configuration-driven (per region),
   * not hard-coded in the domain. Canonical documentation does not
   * define a numeric default.
   */
  getAgeOfMajority(): number;
}

/**
 * DI token for the AgeOfMajorityPolicyPort. Implemented in the API
 * infrastructure layer and injected at the composition root.
 */
export const AGE_OF_MAJORITY_POLICY_PORT = Symbol('AGE_OF_MAJORITY_POLICY_PORT');

/**
 * DI token for the TreatmentConsentVerificationPort. Implemented in the
 * BC01 infrastructure layer and injected at the composition root. BC02
 * (Encounters) injects this port to verify consent without querying BC01
 * tables directly.
 */
export const TREATMENT_CONSENT_VERIFICATION_PORT = Symbol(
  'TREATMENT_CONSENT_VERIFICATION_PORT',
);
