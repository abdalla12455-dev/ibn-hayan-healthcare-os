import { z } from 'zod';

/**
 * Shared Patients contracts for the Ibn Hayan Healthcare Operating System
 * (BC01 Demographics/Registration/Consent).
 *
 * This module is the single source of truth for the shape of the Patients
 * API request/response contracts. Both `@ibn-hayan/api` (the NestJS
 * backend) and `@ibn-hayan/web` (the Next.js thin client) derive their
 * types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript types
 * are inferred from the Zod schemas via `z.infer` — no separate
 * authoritative interfaces are maintained.
 *
 * All objects use `.strict()` so that adding an unexpected field at any
 * boundary is rejected by the Zod parse. This prevents the client from
 * overriding scope (tenantId), status, or actor identifiers via the
 * request body.
 *
 * Patient ownership model (architecture gate 6A): Patient remains a
 * TENANT-wide identity. The request body does NOT contain tenantId,
 * organisationId, or facilityId — all scope is derived from the
 * authenticated session context. The facility/organisation where
 * registration occurs is session/audit provenance, not Patient ownership.
 */

// ---------------------------------------------------------------------------
// PatientSex
// ---------------------------------------------------------------------------

/**
 * Canonical patient sex (biological sex) per ENUMS.md §3 (PatientSex,
 * Closed). Distinct from gender identity.
 */
export const PatientSexSchema = z.enum([
  'male',
  'female',
  'intersex',
  'unknown',
  'not_declared',
]);

export type PatientSex = z.infer<typeof PatientSexSchema>;

// ---------------------------------------------------------------------------
// PatientGenderIdentity
// ---------------------------------------------------------------------------

/**
 * Canonical patient gender identity per ENUMS.md §3
 * (PatientGenderIdentity, Open-with-Council). Distinct from biological
 * sex.
 */
export const PatientGenderIdentitySchema = z.enum([
  'male',
  'female',
  'transgender_male',
  'transgender_female',
  'non_binary',
  'prefer_not_to_say',
  'other',
]);

export type PatientGenderIdentity = z.infer<typeof PatientGenderIdentitySchema>;

// ---------------------------------------------------------------------------
// PatientStatus
// ---------------------------------------------------------------------------

/**
 * Canonical patient lifecycle status per ENUMS.md §3 (PatientStatus,
 * Closed). The database stores lowercase values. A registration command
 * does NOT accept a caller-supplied status (always `active` for a fresh
 * registration); the status enum is exposed here for the response and
 * search contracts.
 */
export const PatientStatusSchema = z.enum([
  'active',
  'inactive',
  'deceased',
  'transferred_out',
  'archived',
]);

export type PatientStatus = z.infer<typeof PatientStatusSchema>;

// ---------------------------------------------------------------------------
// PatientIdentifierType
// ---------------------------------------------------------------------------

/**
 * Canonical patient identifier type per ENUMS.md §3
 * (PatientIdentifierType, Open-with-Council). The `medical_record_number`
 * type is NOT accepted by the identifier commands — the MRN remains on the
 * Patient table and is managed via the registration command. The accepted
 * secondary-identifier types are `national_id`, `passport`,
 * `insurance_number`, and `driver_licence`.
 */
export const PatientIdentifierTypeSchema = z.enum([
  'national_id',
  'passport',
  'insurance_number',
  'driver_licence',
]);

export type PatientIdentifierType = z.infer<
  typeof PatientIdentifierTypeSchema
>;

// ---------------------------------------------------------------------------
// Consent enums
// ---------------------------------------------------------------------------

/**
 * Canonical consent type per ENUMS.md §3 (ConsentType). The BC01 API
 * accepts `treatment` only in this stage; other types are deferred.
 */
export const ConsentTypeSchema = z.enum([
  'treatment',
  'information_disclosure',
  'research',
  'marketing',
  'data_sharing',
]);

export type ConsentType = z.infer<typeof ConsentTypeSchema>;

/**
 * Canonical consent status per ENUMS.md §3 (ConsentStatus). NO `declined`
 * value exists (architecture gate 6L).
 */
export const ConsentStatusSchema = z.enum([
  'granted',
  'withdrawn',
  'pending',
  'expired',
]);

export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

/**
 * Canonical consent scope per ENUMS.md §3 (ConsentScope).
 */
export const ConsentScopeSchema = z.enum([
  'general',
  'specific',
  'emergency',
]);

export type ConsentScope = z.infer<typeof ConsentScopeSchema>;

/**
 * Canonical consent duration per ENUMS.md §3 (ConsentDuration).
 * `single_encounter` is REJECTED by the BC01 API (architecture gate 6K)
 * via a refine because no canonical integration event exists to expire
 * it at encounter completion. The enum value is exposed here so the
 * rejection is explicit and self-documenting.
 */
export const ConsentDurationSchema = z.enum([
  'indefinite',
  'fixed_term',
  'single_encounter',
]);

export type ConsentDuration = z.infer<typeof ConsentDurationSchema>;

/**
 * Canonical consent capture method. Used for compliance provenance.
 */
export const ConsentCaptureMethodSchema = z.enum([
  'in_person',
  'written',
  'verbal',
  'electronic',
  'guardian_authorization',
]);

export type ConsentCaptureMethod = z.infer<typeof ConsentCaptureMethodSchema>;

// ---------------------------------------------------------------------------
// PatientResponse (shared shape)
// ---------------------------------------------------------------------------

/**
 * The canonical patient response schema. Returned by the registration,
 * view, search, and demographic-update endpoints.
 *
 * Exposes the canonical patient fields. Scope fields (tenantId) and audit
 * timestamps (createdAt, updatedAt) are NOT exposed to avoid leaking
 * internal scope and to match the encounter response shape. Demographic
 * fields are nullable because historical minimal Patient rows (created by
 * the reference foundation) may have null demographics (backward
 * compatibility, architecture gate 24).
 *
 * Sensitive identifiers (NationalID, Passport) are NOT exposed in the
 * PatientResponse — they are queried separately through the dedicated
 * identifier view endpoint. The PatientResponse carries only the MRN
 * (which is the tenant-wide patient identity reference) and the
 * demographic fields. This is the minimum-necessary output (architecture
 * gate 16).
 */
export const PatientResponseSchema = z
  .object({
    id: z.string().uuid(),
    medicalRecordNumber: z.string().min(1).max(50),
    status: PatientStatusSchema,
    legalGivenName: z.string().min(1).max(100).nullable(),
    legalMiddleName: z.string().min(1).max(100).nullable(),
    legalFamilyName: z.string().min(1).max(100).nullable(),
    preferredName: z.string().min(1).max(100).nullable(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
      .nullable(),
    sex: PatientSexSchema.nullable(),
    genderIdentity: PatientGenderIdentitySchema.nullable(),
    genderIdentityDetail: z.string().min(1).max(100).nullable(),
  })
  .strict();

export type PatientResponse = z.infer<typeof PatientResponseSchema>;

// ---------------------------------------------------------------------------
// CreatePatientRequest (registration)
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for registering a new patient via
 * `POST /api/v1/patients`.
 *
 * All scope (tenantId) is derived from the authenticated session context.
 * The request body contains ONLY the MRN and the demographic fields. The
 * caller does NOT supply tenantId, status, or actorId.
 *
 * Fields:
 * - `medicalRecordNumber`: the tenant-wide unique MRN. REQUIRED. No MRN
 *   generator is invented (architecture gate 15): the caller supplies a
 *   validated MRN. Must be 1-50 characters. The canonical MRN format is
 *   not fixed by the docs; the registration accepts any non-empty
 *   string up to 50 characters and the database enforces tenant-wide
 *   uniqueness.
 * - `legalGivenName`, `legalFamilyName`: canonical identity name.
 *   REQUIRED for a new complete registration (architecture gate 6B).
 * - `legalMiddleName`, `preferredName`: optional nullable name columns.
 * - `dateOfBirth`: exact DOB (ISO 8601 `YYYY-MM-DD`). REQUIRED (architecture
 *   gate 6D). No computed age is stored.
 * - `sex`: canonical biological sex. REQUIRED (`not_declared` is an
 *   explicit accepted non-asserted value; the field is required so the
 *   record carries an explicit value rather than missing data).
 * - `genderIdentity`: optional, defaults to `prefer_not_to_say`.
 * - `genderIdentityDetail`: required when `genderIdentity === 'other'`.
 *
 * The request does NOT include:
 * - tenantId (derived from session)
 * - status (always `active` for a fresh registration)
 * - actorId (derived from the authenticated session)
 * - identifiers (separate identifier commands)
 * - consent (separate consent commands)
 */
export const CreatePatientRequestSchema = z
  .object({
    medicalRecordNumber: z.string().min(1).max(50),
    legalGivenName: z.string().min(1).max(100),
    legalMiddleName: z.string().min(1).max(100).nullable().optional(),
    legalFamilyName: z.string().min(1).max(100),
    preferredName: z.string().min(1).max(100).nullable().optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
    sex: PatientSexSchema,
    genderIdentity: PatientGenderIdentitySchema.default('prefer_not_to_say'),
    genderIdentityDetail: z.string().min(1).max(100).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.genderIdentity === 'other') {
        return (
          data.genderIdentityDetail !== null &&
          data.genderIdentityDetail !== undefined &&
          data.genderIdentityDetail.length > 0
        );
      }
      return true;
    },
    {
      message:
        'genderIdentityDetail is required when genderIdentity is "other"',
      path: ['genderIdentityDetail'],
    },
  )
  .refine(
    (data) => {
      const dob = new Date(data.dateOfBirth + 'T00:00:00Z');
      const now = new Date();
      return dob.getTime() <= now.getTime();
    },
    {
      message: 'dateOfBirth must not be in the future',
      path: ['dateOfBirth'],
    },
  );

export type CreatePatientRequest = z.infer<typeof CreatePatientRequestSchema>;

export const CreatePatientResponseSchema = PatientResponseSchema;

export type CreatePatientResponse = z.infer<typeof CreatePatientResponseSchema>;

// ---------------------------------------------------------------------------
// PatientErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the patient endpoints.
 *
 * Error codes:
 * - `PATIENT_VALIDATION_ERROR`: invalid request body (missing/invalid
 *   fields).
 * - `PATIENT_NOT_FOUND`: the patient does not exist or is not accessible
 *   in the authenticated tenant (no existence leak).
 * - `PATIENT_DUPLICATE_MRN`: an active patient with the same MRN already
 *   exists in the tenant.
 * - `PATIENT_DUPLICATE_IDENTIFIER`: an active patient with the same
 *   deterministic identifier (NationalID/Passport) already exists in the
 *   tenant.
 * - `PATIENT_MINOR_GUARDIAN_REQUIRED`: the patient is a minor (DOB-based
 *   age < age-of-majority) and guardian authorization was not supplied
 *   with a consent grant.
 * - `PATIENT_SINGLE_ENCOUNTER_NOT_SUPPORTED`: the `single_encounter`
 *   consent duration was rejected because it is not enforceable in this
 *   stage (architecture gate 6K).
 * - `PATIENT_CONSENT_DUPLICATE`: an active granted treatment consent
 *   already exists for this patient (architecture gate 6J).
 * - `PATIENT_CONSENT_NOT_GRANTED`: the consent is not in a `granted`
 *   status and cannot be withdrawn.
 * - `PATIENT_CONSENT_NOT_FOUND`: the consent does not exist or is not
 *   accessible in the authenticated tenant/patient (no existence leak).
 * - `PATIENT_INVALID_CONSENT_TYPE`: a non-`treatment` consent type was
 *   supplied (only `treatment` is supported in this stage).
 */
export const PatientErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'PATIENT_VALIDATION_ERROR',
          'PATIENT_NOT_FOUND',
          'PATIENT_DUPLICATE_MRN',
          'PATIENT_DUPLICATE_IDENTIFIER',
          'PATIENT_MINOR_GUARDIAN_REQUIRED',
          'PATIENT_SINGLE_ENCOUNTER_NOT_SUPPORTED',
          'PATIENT_CONSENT_DUPLICATE',
          'PATIENT_CONSENT_NOT_GRANTED',
          'PATIENT_CONSENT_NOT_FOUND',
          'PATIENT_INVALID_CONSENT_TYPE',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type PatientErrorResponse = z.infer<typeof PatientErrorResponseSchema>;

// ---------------------------------------------------------------------------
// UpdatePatientDemographicsRequest (PATCH)
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for a bounded demographic update via
 * `PATCH /api/v1/patients/:id`.
 *
 * Only the explicitly editable demographic fields may be mutated. The
 * `id`, `tenantId`, and `medicalRecordNumber` are immutable via this
 * command (not present in the schema). `status` is not mutable here.
 * `dateOfBirth` correction is permitted (a demographic correction, not a
 * lifecycle change); the correction is audited once.
 *
 * All fields are optional: only the supplied fields are updated. A body
 * with no recognised fields is rejected (at least one field must be
 * supplied).
 *
 * `genderIdentityDetail` is required when `genderIdentity === 'other'`.
 */
export const UpdatePatientDemographicsRequestSchema = z
  .object({
    legalGivenName: z.string().min(1).max(100).optional(),
    legalMiddleName: z.string().min(1).max(100).nullable().optional(),
    legalFamilyName: z.string().min(1).max(100).optional(),
    preferredName: z.string().min(1).max(100).nullable().optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
      .optional(),
    sex: PatientSexSchema.optional(),
    genderIdentity: PatientGenderIdentitySchema.optional(),
    genderIdentityDetail: z.string().min(1).max(100).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one demographic field must be supplied',
  })
  .refine(
    (data) => {
      if (data.genderIdentity === 'other') {
        return (
          data.genderIdentityDetail !== null &&
          data.genderIdentityDetail !== undefined &&
          data.genderIdentityDetail.length > 0
        );
      }
      return true;
    },
    {
      message:
        'genderIdentityDetail is required when genderIdentity is "other"',
      path: ['genderIdentityDetail'],
    },
  )
  .refine(
    (data) => {
      if (data.dateOfBirth !== undefined) {
        const dob = new Date(data.dateOfBirth + 'T00:00:00Z');
        return dob.getTime() <= Date.now();
      }
      return true;
    },
    {
      message: 'dateOfBirth must not be in the future',
      path: ['dateOfBirth'],
    },
  );

export type UpdatePatientDemographicsRequest = z.infer<
  typeof UpdatePatientDemographicsRequestSchema
>;

export const UpdatePatientDemographicsResponseSchema = PatientResponseSchema;

export type UpdatePatientDemographicsResponse = z.infer<
  typeof UpdatePatientDemographicsResponseSchema
>;

// ---------------------------------------------------------------------------
// PatientSearchRequest (query parameters)
// ---------------------------------------------------------------------------

/**
 * The canonical query-parameter schema for bounded patient search via
 * `GET /api/v1/patients`.
 *
 * Search is deterministic only (architecture gate 16): exact MRN, exact
 * external identifier (type+value), or bounded name prefix. No fuzzy
 * matching. No cross-tenant leakage. The search is tenant-scoped
 * (tenantId derived from session).
 *
 * At least one criterion must be supplied. The response respects
 * minimum-necessary output: sensitive identifiers are NOT returned in
 * the search response.
 */
export const PatientSearchRequestSchema = z
  .object({
    medicalRecordNumber: z.string().min(1).max(50).optional(),
    identifierType: PatientIdentifierTypeSchema.optional(),
    identifierValue: z.string().min(1).max(100).optional(),
    namePrefix: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one search criterion must be supplied',
  })
  .refine(
    (data) => {
      const hasType = data.identifierType !== undefined;
      const hasValue = data.identifierValue !== undefined;
      return hasType === hasValue;
    },
    {
      message:
        'identifierType and identifierValue must be supplied together',
      path: ['identifierType'],
    },
  );

export type PatientSearchRequest = z.infer<typeof PatientSearchRequestSchema>;

export const PatientSearchResponseSchema = z
  .object({
    results: z.array(PatientResponseSchema).max(50),
  })
  .strict();

export type PatientSearchResponse = z.infer<typeof PatientSearchResponseSchema>;

// ---------------------------------------------------------------------------
// PatientIdentifierResponse
// ---------------------------------------------------------------------------

/**
 * The canonical patient identifier response schema. Returned by the
 * identifier-add and identifier-list endpoints.
 *
 * NOTE: the `normalizedValue` for NationalID and Passport is sensitive PII.
 * It is exposed in the identifier view endpoint because the caller
 * (receptionist with `patients:manage_identifiers`) is authorized to see
 * it. It is NEVER placed in audit metadata or application logs. The
 * identifier response is NOT returned in the search response
 * (minimum-necessary output).
 */
export const PatientIdentifierResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    type: PatientIdentifierTypeSchema,
    normalizedValue: z.string().min(1).max(100),
    issuingCountry: z.string().min(2).max(2).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type PatientIdentifierResponse = z.infer<
  typeof PatientIdentifierResponseSchema
>;

// ---------------------------------------------------------------------------
// AddPatientIdentifierRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for adding a secondary identifier to a
 * patient via `POST /api/v1/patients/:id/identifiers`.
 *
 * The caller supplies the identifier type, value, and optional issuing
 * country. The value is normalised (trimmed + uppercased for NationalID
 * and Passport) before storage. The patientId is derived from the URL
 * path, not the body.
 *
 * Deterministic duplicate prevention (architecture gate 6H): NationalID
 * and Passport have a partial unique index on
 * `(tenant_id, type, normalized_value)`. A duplicate returns
 * `PATIENT_DUPLICATE_IDENTIFIER`.
 */
export const AddPatientIdentifierRequestSchema = z
  .object({
    type: PatientIdentifierTypeSchema,
    value: z.string().min(1).max(100),
    issuingCountry: z.string().min(2).max(2).nullable().optional(),
  })
  .strict();

export type AddPatientIdentifierRequest = z.infer<
  typeof AddPatientIdentifierRequestSchema
>;

export const AddPatientIdentifierResponseSchema = PatientIdentifierResponseSchema;

export type AddPatientIdentifierResponse = z.infer<
  typeof AddPatientIdentifierResponseSchema
>;

export const ListPatientIdentifiersResponseSchema = z
  .object({
    identifiers: z.array(PatientIdentifierResponseSchema),
  })
  .strict();

export type ListPatientIdentifiersResponse = z.infer<
  typeof ListPatientIdentifiersResponseSchema
>;

// ---------------------------------------------------------------------------
// PatientConsentResponse
// ---------------------------------------------------------------------------

/**
 * The canonical patient consent response schema. Returned by the
 * consent-grant, consent-list, and consent-withdraw endpoints.
 *
 * Carries the full lifecycle fields. The `capturedBy` field is a logical
 * user reference (UUID). Guardian fields are null for adult consent.
 *
 * No consent text or raw form content is carried in the response or in
 * audit metadata (PHI-free). The `policyVersion` is a stable version
 * string, not the policy document content.
 */
export const PatientConsentResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    consentType: ConsentTypeSchema,
    status: ConsentStatusSchema,
    scope: ConsentScopeSchema,
    duration: ConsentDurationSchema,
    grantedAt: z.string().datetime(),
    withdrawnAt: z.string().datetime().nullable(),
    expiresAt: z.string().datetime().nullable(),
    capturedBy: z.string().uuid(),
    captureMethod: ConsentCaptureMethodSchema,
    policyVersion: z.string().min(1).max(50),
    guardianName: z.string().min(1).max(100).nullable(),
    guardianRelationship: z.string().min(1).max(50).nullable(),
    guardianCaptureMethod: ConsentCaptureMethodSchema.nullable(),
  })
  .strict();

export type PatientConsentResponse = z.infer<
  typeof PatientConsentResponseSchema
>;

// ---------------------------------------------------------------------------
// GrantTreatmentConsentRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for granting a Treatment consent via
 * `POST /api/v1/patients/:id/consents`.
 *
 * The caller supplies the scope, duration, optional expiresAt (required
 * for fixed_term), captureMethod, and policyVersion. The `capturedBy` is
 * derived from the authenticated session (not the body). The patientId
 * is derived from the URL path.
 *
 * Consent type is fixed to `treatment` in this stage (architecture gate
 * 6I). A non-`treatment` type is rejected with
 * `PATIENT_INVALID_CONSENT_TYPE`.
 *
 * `single_encounter` duration is REJECTED (architecture gate 6K) with
 * `PATIENT_SINGLE_ENCOUNTER_NOT_SUPPORTED` because no canonical
 * integration event exists to expire it at encounter completion.
 *
 * Minor/guardian (architecture gate 6M/6N): if the patient is a minor
 * (DOB-based age < age-of-majority), the guardian fields are REQUIRED.
 * If the patient is an adult, guardian fields must NOT be supplied. The
 * age-of-majority is resolved from the injectable AgeOfMajorityPolicyPort
 * (not hard-coded in the domain). The service computes the patient's age
 * from their DOB.
 *
 * For `fixed_term` duration, `expiresAt` is required and must be in the
 * future. For `indefinite` duration, `expiresAt` must be null/omitted.
 */
export const GrantTreatmentConsentRequestSchema = z
  .object({
    consentType: z.literal('treatment'),
    scope: ConsentScopeSchema,
    duration: ConsentDurationSchema,
    expiresAt: z.string().datetime().nullable().optional(),
    captureMethod: ConsentCaptureMethodSchema,
    policyVersion: z.string().min(1).max(50),
    guardianName: z.string().min(1).max(100).nullable().optional(),
    guardianRelationship: z.string().min(1).max(50).nullable().optional(),
    guardianCaptureMethod: ConsentCaptureMethodSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => data.duration !== 'single_encounter',
    {
      message:
        'single_encounter consent duration is not supported in this stage (no canonical integration event to expire it)',
      path: ['duration'],
    },
  )
  .refine(
    (data) => {
      if (data.duration === 'fixed_term') {
        return data.expiresAt !== null && data.expiresAt !== undefined;
      }
      return true;
    },
    {
      message: 'expiresAt is required for fixed_term consent duration',
      path: ['expiresAt'],
    },
  )
  .refine(
    (data) => {
      if (data.duration === 'indefinite') {
        return data.expiresAt === null || data.expiresAt === undefined;
      }
      return true;
    },
    {
      message: 'expiresAt must not be supplied for indefinite consent duration',
      path: ['expiresAt'],
    },
  )
  .refine(
    (data) => {
      if (data.expiresAt !== null && data.expiresAt !== undefined) {
        const exp = new Date(data.expiresAt);
        return exp.getTime() > Date.now();
      }
      return true;
    },
    {
      message: 'expiresAt must be in the future',
      path: ['expiresAt'],
    },
  )
  .refine(
    (data) => {
      const hasName =
        data.guardianName !== null && data.guardianName !== undefined;
      const hasRel =
        data.guardianRelationship !== null &&
        data.guardianRelationship !== undefined;
      const hasMethod =
        data.guardianCaptureMethod !== null &&
        data.guardianCaptureMethod !== undefined;
      if (hasName || hasRel || hasMethod) {
        return hasName && hasRel && hasMethod;
      }
      return true;
    },
    {
      message:
        'guardianName, guardianRelationship, and guardianCaptureMethod must all be supplied together',
      path: ['guardianName'],
    },
  );

export type GrantTreatmentConsentRequest = z.infer<
  typeof GrantTreatmentConsentRequestSchema
>;

export const GrantTreatmentConsentResponseSchema = PatientConsentResponseSchema;

export type GrantTreatmentConsentResponse = z.infer<
  typeof GrantTreatmentConsentResponseSchema
>;

// ---------------------------------------------------------------------------
// ListPatientConsentsResponse
// ---------------------------------------------------------------------------

export const ListPatientConsentsResponseSchema = z
  .object({
    consents: z.array(PatientConsentResponseSchema),
  })
  .strict();

export type ListPatientConsentsResponse = z.infer<
  typeof ListPatientConsentsResponseSchema
>;

// ---------------------------------------------------------------------------
// WithdrawTreatmentConsentRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for withdrawing a treatment consent via
 * `POST /api/v1/patients/:id/consents/:consentId/withdraw`.
 *
 * The body MUST be empty, absent, or an empty JSON object (matching the
 * encounter lifecycle convention). Any supplied field is rejected as a
 * validation error. The patientId and consentId are derived from the URL
 * path.
 */
export const WithdrawTreatmentConsentRequestSchema = z.union([
  z.undefined(),
  z.null(),
  z.object({}).strict(),
]);

export type WithdrawTreatmentConsentRequest = z.infer<
  typeof WithdrawTreatmentConsentRequestSchema
>;

export const WithdrawTreatmentConsentResponseSchema = PatientConsentResponseSchema;

export type WithdrawTreatmentConsentResponse = z.infer<
  typeof WithdrawTreatmentConsentResponseSchema
>;
