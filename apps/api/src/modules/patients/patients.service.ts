import { Injectable, Inject } from '@nestjs/common';
import {
  AGE_OF_MAJORITY_POLICY_PORT,
  type PatientRepository,
  type PatientIdentifierRepository,
  type PatientConsentRepository,
  type AgeOfMajorityPolicyPort,
  type PatientId,
  type TenantId,
  type RegisterPatientInput,
  type UpdatePatientDemographicsInput,
  type PatientSearchCriteria,
  type GrantTreatmentConsentInput,
} from '@ibn-hayan/domain';
import {
  PATIENT_REPOSITORY,
  PATIENT_IDENTIFIER_REPOSITORY,
  PATIENT_CONSENT_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import type {
  CreatePatientRequest,
  CreatePatientResponse,
  UpdatePatientDemographicsRequest,
  UpdatePatientDemographicsResponse,
  PatientSearchRequest,
  PatientSearchResponse,
  AddPatientIdentifierRequest,
  AddPatientIdentifierResponse,
  ListPatientIdentifiersResponse,
  GrantTreatmentConsentRequest,
  GrantTreatmentConsentResponse,
  ListPatientConsentsResponse,
  WithdrawTreatmentConsentResponse,
} from '@ibn-hayan/contracts';
import {
  patientNotFound,
  patientDuplicateMrn,
  patientDuplicateIdentifier,
  patientMinorGuardianRequired,
  patientConsentDuplicate,
  patientConsentNotGranted,
  patientConsentNotFound,
} from './patients.errors.js';
import {
  patientToResponse,
  patientIdentifierToResponse,
  patientConsentToResponse,
} from './patients.mappers.js';

/**
 * Patients application service (BC01 — Demographics / Registration /
 * Consent).
 *
 * This service orchestrates the patient registration, demographics,
 * identifier, and consent workflows for the BC01 bounded context. It:
 *
 * - Derives tenantId from the authenticated session context. The
 *   request body does NOT contain tenantId, status, or actorId.
 * - Enforces tenant isolation: every read/write is scoped by the
 *   session-derived tenantId. A patient/identifier/consent in another
 *   tenant returns not-found (no existence leak).
 * - Enforces deterministic duplicate prevention (architecture gate 6H):
 *   MRN uniqueness and NationalID/Passport uniqueness.
 * - Enforces the consent lifecycle (architecture gate 6I/6J):
 *   one-active-treatment-consent invariant via the repository's
 *   transactional reconciliation-before-grant strategy.
 * - Enforces the minor/guardian policy (architecture gate 6M/6N):
 *   the age-of-majority is resolved from the injectable
 *   AgeOfMajorityPolicyPort (NOT hard-coded in the domain). A minor
 *   requires guardian authorization for consent; an adult grants their
 *   own consent.
 * - Emits the canonical patient audit events (exactly one per actual
 *   successful action; no event on auth/validation/duplicate/rollback).
 *
 * Security guarantees:
 * - The patient/identifier/consent lookup is scoped by session-derived
 *   tenantId; cross-tenant returns not-found (no existence leak).
 * - The request body cannot override tenantId, status, or actor.
 * - No PHI/PII is placed in audit metadata (names, DOB, NationalID,
 *   Passport, phone, email, address, consent text are forbidden). Only
 *   internal IDs and safe non-sensitive action context are carried.
 */
@Injectable()
export class PatientsService {
  constructor(
    @Inject(PATIENT_REPOSITORY)
    private readonly patients: PatientRepository,
    @Inject(PATIENT_IDENTIFIER_REPOSITORY)
    private readonly identifiers: PatientIdentifierRepository,
    @Inject(PATIENT_CONSENT_REPOSITORY)
    private readonly consents: PatientConsentRepository,
    @Inject(AGE_OF_MAJORITY_POLICY_PORT)
    private readonly ageOfMajorityPolicy: AgeOfMajorityPolicyPort,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  /**
   * Resolve the authenticated session and the session-derived tenantId.
   * Returns null if the session is missing/invalid (the controller maps
   * to 401). Throws the clinic-admin context error if no active
   * membership is set.
   */
  private async resolveTenantContext(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<{
    readonly tenantId: TenantId;
    readonly userId: string;
    readonly sessionId: string;
  } | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session, user } = authResult;

    if (session.activeTenantMembershipId === null) {
      throw clinicAdminOverviewContextRequired();
    }

    const activeMembership = authResult.memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      throw clinicAdminOverviewContextRequired();
    }

    return {
      tenantId: activeMembership.tenantId,
      userId: user.id,
      sessionId: session.id,
    };
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  /**
   * Register a new patient with demographics (architecture gate 14).
   *
   * `POST /api/v1/patients` — authorized for R06 Receptionist
   * (permission `patients:register`).
   *
   * The tenantId is derived from the authenticated session. The caller
   * does NOT supply tenantId, status, or actorId. The MRN is supplied
   * (no MRN generator is invented — architecture gate 15). The
   * Patient + demographics are created atomically by the repository.
   *
   * Audit: emits `patients.registered` exactly once on success, carrying
   * only the patient ID (no PHI).
   */
  async registerPatient(
    request: CreatePatientRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<CreatePatientResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    const registerInput: RegisterPatientInput = {
      tenantId: ctx.tenantId,
      medicalRecordNumber: request.medicalRecordNumber,
      demographics: {
        legalGivenName: request.legalGivenName,
        legalMiddleName: request.legalMiddleName ?? null,
        legalFamilyName: request.legalFamilyName,
        preferredName: request.preferredName ?? null,
        dateOfBirth: request.dateOfBirth,
        sex: request.sex,
        genderIdentity: request.genderIdentity ?? 'prefer_not_to_say',
        genderIdentityDetail: request.genderIdentityDetail ?? null,
      },
    };

    const result = await this.patients.register(registerInput);

    if (result.outcome === 'duplicate_mrn') {
      throw patientDuplicateMrn();
    }

    if (result.outcome === 'duplicate_identifier') {
      // The repository's register command does not add identifiers in this
      // stage, so this outcome is not currently produced by the registration
      // path. It is mapped defensively to honour the domain contract
      // (RegisterPatientResult is a discriminated union) so a future stage
      // that extends registration with inline identifiers cannot accidentally
      // return a duplicate as a success.
      throw patientDuplicateIdentifier();
    }

    // outcome === 'registered'. Emit the audit event after success. The
    // metadata carries only the patient ID (no PHI — names, DOB are
    // forbidden from audit metadata per architecture gate 21).
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'patients.registered',
        outcome: 'success',
        source: 'api',
        tenantId: ctx.tenantId,
        actorType: 'USER',
        actorId: ctx.userId,
        sessionId: ctx.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'patients_register',
          patientId: result.patient.id,
        },
      });
    }

    return patientToResponse(result.patient);
  }

  // -----------------------------------------------------------------------
  // View / Search
  // -----------------------------------------------------------------------

  /**
   * View a patient by ID (architecture gate 16). Tenant-scoped: a
   * patient in another tenant returns not-found (no existence leak).
   *
   * `GET /api/v1/patients/:id` — authorized for clinical/operational
   * read roles (permission `patients:view`).
   *
   * Audit: emits `patients.viewed` exactly once on success, carrying only
   * the patient ID (no PHI).
   */
  async viewPatient(
    patientId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<CreatePatientResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    const patient = await this.patients.findById(
      ctx.tenantId,
      patientId as PatientId,
    );
    if (patient === null) {
      throw patientNotFound();
    }

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'patients.viewed',
        outcome: 'success',
        source: 'api',
        tenantId: ctx.tenantId,
        actorType: 'USER',
        actorId: ctx.userId,
        sessionId: ctx.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'patients_view',
          patientId: patient.id,
        },
      });
    }

    return patientToResponse(patient);
  }

  /**
   * Bounded patient search (architecture gate 16). Tenant-scoped,
   * deterministic only: exact MRN, exact external identifier, or bounded
   * name prefix. No fuzzy matching, no cross-tenant leakage.
   *
   * `GET /api/v1/patients` — authorized for clinical/operational read
   * roles (permission `patients:search`).
   *
   * The response respects minimum-necessary output: sensitive identifiers
   * are NOT returned in the search response (the PatientIdentifier model
   * is queried separately through dedicated identifier commands).
   *
   * Audit: emits `patients.searched` exactly once on success, carrying the
   * search criteria TYPE (not the values — identifier values are
   * sensitive; the MRN is a patient identifier and is forbidden from
   * audit metadata as a precaution). Only the result count is carried.
   */
  async searchPatients(
    request: PatientSearchRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<PatientSearchResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    const criteria: PatientSearchCriteria = {
      ...(request.medicalRecordNumber !== undefined
        ? { medicalRecordNumber: request.medicalRecordNumber }
        : {}),
      ...(request.identifierType !== undefined
        ? { identifierType: request.identifierType }
        : {}),
      ...(request.identifierValue !== undefined
        ? { identifierValue: request.identifierValue }
        : {}),
      ...(request.namePrefix !== undefined
        ? { namePrefix: request.namePrefix }
        : {}),
    };

    const results = await this.patients.search(ctx.tenantId, criteria);

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'patients.searched',
        outcome: 'success',
        source: 'api',
        tenantId: ctx.tenantId,
        actorType: 'USER',
        actorId: ctx.userId,
        sessionId: ctx.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'patients_search',
          resultCount: results.length,
        },
      });
    }

    return {
      results: results.map((p) => patientToResponse(p)),
    };
  }

  // -----------------------------------------------------------------------
  // Demographic update
  // -----------------------------------------------------------------------

  /**
   * Bounded demographic update (architecture gate 17). Only the
   * explicitly editable demographic fields may be mutated. The `id`,
   * `tenantId`, and `medicalRecordNumber` are immutable via this command.
   * DOB correction is permitted (a demographic correction, audited
   * once).
   *
   * `PATCH /api/v1/patients/:id` — authorized for R06 Receptionist
   * (permission `patients:update_demographics`).
   *
   * Audit: emits `patients.demographics_updated` exactly once on success,
   * carrying only the patient ID (no PHI).
   */
  async updateDemographics(
    patientId: string,
    request: UpdatePatientDemographicsRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<UpdatePatientDemographicsResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    const input: UpdatePatientDemographicsInput = {
      ...(request.legalGivenName !== undefined
        ? { legalGivenName: request.legalGivenName }
        : {}),
      ...(request.legalMiddleName !== undefined
        ? { legalMiddleName: request.legalMiddleName }
        : {}),
      ...(request.legalFamilyName !== undefined
        ? { legalFamilyName: request.legalFamilyName }
        : {}),
      ...(request.preferredName !== undefined
        ? { preferredName: request.preferredName }
        : {}),
      ...(request.dateOfBirth !== undefined
        ? { dateOfBirth: request.dateOfBirth }
        : {}),
      ...(request.sex !== undefined ? { sex: request.sex } : {}),
      ...(request.genderIdentity !== undefined
        ? { genderIdentity: request.genderIdentity }
        : {}),
      ...(request.genderIdentityDetail !== undefined
        ? { genderIdentityDetail: request.genderIdentityDetail }
        : {}),
    };

    const updated = await this.patients.updateDemographics(
      ctx.tenantId,
      patientId as PatientId,
      input,
    );
    if (updated === null) {
      throw patientNotFound();
    }

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'patients.demographics_updated',
        outcome: 'success',
        source: 'api',
        tenantId: ctx.tenantId,
        actorType: 'USER',
        actorId: ctx.userId,
        sessionId: ctx.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'patients_demographics_update',
          patientId: updated.id,
        },
      });
    }

    return patientToResponse(updated);
  }

  // -----------------------------------------------------------------------
  // Identifiers
  // -----------------------------------------------------------------------

  /**
   * Add a secondary identifier to a patient (architecture gate 6G/6H).
   * The value is normalised (trimmed + uppercased for NationalID and
   * Passport) before storage. Deterministic duplicate prevention for
   * NationalID/Passport via the partial unique index.
   *
   * `POST /api/v1/patients/:id/identifiers` — authorized for R06
   * Receptionist (permission `patients:manage_identifiers`).
   *
   * Audit: emits `patients.identifier_added` exactly once on success,
   * carrying only the patient ID and identifier ID and TYPE (NOT the
   * value — sensitive identifier values are forbidden from audit
   * metadata per architecture gate 21/22).
   */
  async addIdentifier(
    patientId: string,
    request: AddPatientIdentifierRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<AddPatientIdentifierResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    // Verify the patient exists in the tenant before adding an
    // identifier (no existence leak: a patient in another tenant returns
    // not-found).
    const patient = await this.patients.findById(
      ctx.tenantId,
      patientId as PatientId,
    );
    if (patient === null) {
      throw patientNotFound();
    }

    const result = await this.identifiers.add(
      ctx.tenantId,
      patientId as PatientId,
      request.type,
      request.value,
      request.issuingCountry ?? null,
    );

    if (result.outcome === 'duplicate') {
      throw patientDuplicateIdentifier();
    }

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'patients.identifier_added',
        outcome: 'success',
        source: 'api',
        tenantId: ctx.tenantId,
        actorType: 'USER',
        actorId: ctx.userId,
        sessionId: ctx.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        // The identifier VALUE is sensitive PII (NationalID/Passport) and
        // is NEVER placed in audit metadata. Only the type and IDs are
        // carried.
        metadata: {
          endpoint: 'patients_identifier_add',
          patientId: patient.id,
          identifierId: result.identifier.id,
          identifierType: result.identifier.type,
        },
      });
    }

    return patientIdentifierToResponse(result.identifier);
  }

  /**
   * List all identifiers for a patient (architecture gate 6G). Tenant-
   * scoped: a patient in another tenant returns an empty array (no
   * existence leak).
   *
   * `GET /api/v1/patients/:id/identifiers` — authorized for R06
   * Receptionist (permission `patients:manage_identifiers`).
   *
   * No audit event is emitted for a list/read-only operation (matching
   * the encounter view convention: the `patients:viewed` event is for
   * the patient view, not the identifier list). The authorization
   * decision event is the audit trail for the read.
   */
  async listIdentifiers(
    patientId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ListPatientIdentifiersResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    const identifiers = await this.identifiers.listForPatient(
      ctx.tenantId,
      patientId as PatientId,
    );

    return {
      identifiers: identifiers.map((i) => patientIdentifierToResponse(i)),
    };
  }

  // -----------------------------------------------------------------------
  // Consent
  // -----------------------------------------------------------------------

  /**
   * Compute a patient's age in whole years from their DOB at a given
   * reference date (architecture gate 6M). Returns null if the patient
   * has no DOB (a historical minimal patient without demographics); in
   * that case the consent grant is rejected because minority cannot be
   * determined (fail-safe for pediatric safety).
   */
  private computeAgeInYears(
    dateOfBirth: string | null,
    referenceDate: Date,
  ): number | null {
    if (dateOfBirth === null) {
      return null;
    }
    const dob = new Date(dateOfBirth + 'T00:00:00.000Z');
    let age = referenceDate.getUTCFullYear() - dob.getUTCFullYear();
    const monthDiff = referenceDate.getUTCMonth() - dob.getUTCMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && referenceDate.getUTCDate() < dob.getUTCDate())
    ) {
      age--;
    }
    return age;
  }

  /**
   * Grant a Treatment consent (architecture gate 6I/6J/6M/6N).
   *
   * `POST /api/v1/patients/:id/consents` — authorized for R01 Physician,
   * R02 Nurse, R06 Receptionist (permission `patients:consent_grant`).
   *
   * Minor/guardian policy: the patient's age is computed from their DOB
   * and compared to the age-of-majority (resolved from the
   * AgeOfMajorityPolicyPort — NOT hard-coded). If the patient is a
   * minor, guardian fields are REQUIRED. If the patient is an adult,
   * guardian fields must NOT be supplied. If the patient has no DOB, the
   * grant is rejected (minority cannot be determined — fail-safe).
   *
   * The `single_encounter` duration is rejected by the contract schema
   * (architecture gate 6K). The `capturedBy` is derived from the
   * authenticated session. The repository's grant method performs the
   * transactional reconciliation-before-grant strategy.
   *
   * Audit: emits `patients.consent_granted` exactly once on success,
   * carrying only the patient ID and consent ID (no consent text, no
   * guardian name — guardian name is PII).
   */
  async grantConsent(
    patientId: string,
    request: GrantTreatmentConsentRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<GrantTreatmentConsentResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    // Verify the patient exists in the tenant before granting consent
    // (no existence leak).
    const patient = await this.patients.findById(
      ctx.tenantId,
      patientId as PatientId,
    );
    if (patient === null) {
      throw patientNotFound();
    }

    // Minor/guardian policy (architecture gate 6M/6N). The
    // age-of-majority is resolved from the injectable policy port (NOT
    // hard-coded in the domain).
    const ageOfMajority = this.ageOfMajorityPolicy.getAgeOfMajority();
    const now = new Date();
    const patientAge = this.computeAgeInYears(patient.dateOfBirth, now);

    if (patientAge === null) {
      // The patient has no DOB (a historical minimal patient). Minority
      // cannot be determined, so the grant is rejected (fail-safe for
      // pediatric safety). The patient must be registered with a DOB
      // (demographic update) before consent can be granted.
      throw patientMinorGuardianRequired();
    }

    const isMinor = patientAge < ageOfMajority;
    const hasGuardian =
      request.guardianName !== null &&
      request.guardianName !== undefined &&
      request.guardianName.length > 0;

    if (isMinor && !hasGuardian) {
      // A minor requires guardian authorization.
      throw patientMinorGuardianRequired();
    }

    // Parse the expiresAt for fixed_term duration. The contract schema
    // already validated that expiresAt is present for fixed_term and
    // absent for indefinite.
    let expiresAt: Date | null = null;
    if (request.duration === 'fixed_term') {
      expiresAt = new Date(request.expiresAt as string);
    }

    const grantInput: GrantTreatmentConsentInput = {
      patientId: patientId as PatientId,
      scope: request.scope,
      duration: request.duration,
      expiresAt,
      capturedBy: ctx.userId,
      captureMethod: request.captureMethod,
      policyVersion: request.policyVersion,
      guardianName: isMinor ? (request.guardianName ?? null) : null,
      guardianRelationship: isMinor
        ? (request.guardianRelationship ?? null)
        : null,
      guardianCaptureMethod: isMinor
        ? (request.guardianCaptureMethod ?? null)
        : null,
    };

    const result = await this.consents.grant(ctx.tenantId, grantInput);

    if (result.outcome === 'duplicate_active_consent') {
      throw patientConsentDuplicate();
    }

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'patients.consent_granted',
        outcome: 'success',
        source: 'api',
        tenantId: ctx.tenantId,
        actorType: 'USER',
        actorId: ctx.userId,
        sessionId: ctx.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        // No consent text, no guardian name (PII). Only IDs, type, and
        // the non-sensitive lifecycle fields are carried.
        metadata: {
          endpoint: 'patients_consent_grant',
          patientId: patient.id,
          consentId: result.consent.id,
          consentType: result.consent.consentType,
          duration: result.consent.duration,
          scope: result.consent.scope,
          isMinor,
        },
      });
    }

    return patientConsentToResponse(result.consent);
  }

  /**
   * List all consent records for a patient (architecture gate 6I).
   * Tenant-scoped, history-preserving (returns ALL records).
   *
   * `GET /api/v1/patients/:id/consents` — authorized for R01 Physician,
   * R02 Nurse, R06 Receptionist (permission `patients:consent_view`).
   *
   * No audit event (read-only; the authorization decision event is the
   * audit trail).
   */
  async listConsents(
    patientId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ListPatientConsentsResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    const consents = await this.consents.listForPatient(
      ctx.tenantId,
      patientId as PatientId,
    );

    return {
      consents: consents.map((c) => patientConsentToResponse(c)),
    };
  }

  /**
   * Withdraw a Treatment consent (architecture gate 6I). Transitions a
   * granted consent to withdrawn. Idempotent: an already-withdrawn
   * consent is a no-op (no mutation, no audit event).
   *
   * `POST /api/v1/patients/:id/consents/:consentId/withdraw` —
   * authorized for R01 Physician, R02 Nurse, R06 Receptionist
   * (permission `patients:consent_withdraw`).
   *
   * Audit: emits `patients.consent_withdrawn` exactly once on a
   * first-time transition (not on idempotent no-op).
   */
  async withdrawConsent(
    patientId: string,
    consentId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<WithdrawTreatmentConsentResponse | null> {
    const ctx = await this.resolveTenantContext(cookieValue, auditContext);
    if (ctx === null) {
      return null;
    }

    const result = await this.consents.withdraw(
      ctx.tenantId,
      patientId as PatientId,
      consentId as Parameters<typeof this.consents.withdraw>[2],
    );

    if (result.outcome === 'not_found') {
      throw patientConsentNotFound();
    }
    if (result.outcome === 'not_granted') {
      throw patientConsentNotGranted();
    }
    if (result.outcome === 'already_withdrawn') {
      // Idempotent no-op: return the consent without a new audit event.
      return patientConsentToResponse(result.consent);
    }

    // outcome === 'withdrawn'. Emit the audit event after a first-time
    // transition.
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'patients.consent_withdrawn',
        outcome: 'success',
        source: 'api',
        tenantId: ctx.tenantId,
        actorType: 'USER',
        actorId: ctx.userId,
        sessionId: ctx.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'patients_consent_withdraw',
          patientId,
          consentId: result.consent.id,
        },
      });
    }

    return patientConsentToResponse(result.consent);
  }
}
