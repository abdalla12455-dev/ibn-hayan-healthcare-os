import { z } from 'zod';

/**
 * Shared Clinical Notes contracts for the Ibn Hayan Healthcare Operating
 * System (BC03 — Clinical Notes Foundation).
 *
 * This module is the single source of truth for the shape of the
 * Clinical Notes API request/response contracts. Both `@ibn-hayan/api`
 * (the NestJS backend) and `@ibn-hayan/web` (the Next.js thin client)
 * derive their types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript types
 * are inferred from the Zod schemas via `z.infer`.
 *
 * All objects use `.strict()` so that adding an unexpected field at any
 * boundary is rejected by the Zod parse. This prevents the client from
 * overriding scope (tenantId, organisationId, facilityId), status, or
 * actor identifiers via the request body.
 *
 * Canonical enums are defined in download/docs/03_DOMAIN/ENUMS.md §4.2
 * and download/docs/03_DOMAIN/STATUS_CODES.md §5.3. Database values are
 * lowercase.
 */

// ---------------------------------------------------------------------------
// ClinicalNoteType
// ---------------------------------------------------------------------------

/**
 * The canonical clinical note type (ENUMS.md §4.2, ClinicalNoteType,
 * Open-with-Council). Default `progress`.
 *
 * This foundation accepts all canonical note types; the smallest
 * encounter/progress-note foundation is the `progress` default.
 * Discharge summaries (note type `discharge`) are NOT implemented as a
 * workflow in this stage (BR-BC03-CLIN-033 is deferred); the enum value
 * exists in the catalogue but no discharge-summary command is exposed.
 */
export const ClinicalNoteTypeSchema = z.enum([
  'progress',
  'history',
  'physical',
  'consultation',
  'discharge',
  'procedure',
  'nursing',
]);

export type ClinicalNoteType = z.infer<typeof ClinicalNoteTypeSchema>;

// ---------------------------------------------------------------------------
// ClinicalNoteStatus
// ---------------------------------------------------------------------------

/**
 * The canonical clinical note lifecycle status (ENUMS.md §4.2 and
 * STATUS_CODES.md §5.3, ClinicalNoteStatus, Closed). Database values are
 * lowercase.
 *
 * Terminal statuses: `addendum`, `withdrawn`.
 */
export const ClinicalNoteStatusSchema = z.enum([
  'draft',
  'in_progress',
  'signed',
  'amended',
  'addendum',
  'withdrawn',
]);

export type ClinicalNoteStatus = z.infer<typeof ClinicalNoteStatusSchema>;

// ---------------------------------------------------------------------------
// ClinicalNoteAuthorRole
// ---------------------------------------------------------------------------

/**
 * The canonical clinical note author role (ENUMS.md §4.2,
 * ClinicalNoteAuthorRole, Open-with-Council). Default `physician`.
 */
export const ClinicalNoteAuthorRoleSchema = z.enum([
  'physician',
  'nurse',
  'pharmacist',
  'therapist',
  'midlevel',
  'student',
]);

export type ClinicalNoteAuthorRole = z.infer<
  typeof ClinicalNoteAuthorRoleSchema
>;

// ---------------------------------------------------------------------------
// ClinicalNoteRevision (history entry)
// ---------------------------------------------------------------------------

/**
 * A single revision in a clinical note's append-only history. Exposed by
 * the note-history endpoint. The `body` is PHI and is returned to
 * authorised readers only; it is NEVER placed in audit metadata.
 */
export const ClinicalNoteRevisionSchema = z
  .object({
    id: z.string().uuid(),
    revisionNumber: z.number().int().min(1),
    action: z.enum([
      'draft_created',
      'signed',
      'amended',
      'addendum_added',
      'withdrawn',
    ]),
    status: ClinicalNoteStatusSchema,
    body: z.string(),
    authorId: z.string().uuid(),
    authorRole: ClinicalNoteAuthorRoleSchema,
    reason: z.string().nullable(),
    signedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type ClinicalNoteRevision = z.infer<typeof ClinicalNoteRevisionSchema>;

// ---------------------------------------------------------------------------
// ClinicalNoteResponse (shared shape)
// ---------------------------------------------------------------------------

/**
 * The canonical clinical-note response schema. Returned by the create,
 * sign, amend, addendum, withdraw, and view endpoints.
 *
 * Exposes the note's logical identifiers, type, status, author role, the
 * current revision (current body and action), and timestamps. Scope
 * fields (tenantId, organisationId, facilityId) are NOT exposed to avoid
 * leaking internal scope, matching the encounter response shape.
 *
 * `body` is the current revision's clinical content (PHI), returned to
 * authorised readers only.
 */
export const ClinicalNoteResponseSchema = z
  .object({
    id: z.string().uuid(),
    encounterId: z.string().uuid(),
    patientId: z.string().uuid(),
    noteType: ClinicalNoteTypeSchema,
    authorRole: ClinicalNoteAuthorRoleSchema,
    status: ClinicalNoteStatusSchema,
    currentRevision: z
      .object({
        revisionNumber: z.number().int().min(1),
        action: z.enum([
          'draft_created',
          'signed',
          'amended',
          'addendum_added',
          'withdrawn',
        ]),
        body: z.string(),
        authorId: z.string().uuid(),
        signedAt: z.string().datetime().nullable(),
      })
      .strict(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type ClinicalNoteResponse = z.infer<typeof ClinicalNoteResponseSchema>;

// ---------------------------------------------------------------------------
// CreateClinicalNoteRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for creating a clinical note draft via
 * `POST /api/v1/clinical-notes`.
 *
 * All scope (tenantId, organisationId, facilityId) AND the clinical
 * author identity (authorId, authorRole) are derived server-side from
 * the authenticated session via the BC10 User→Provider identity-binding
 * resolver (`findActiveProviderForUserAtFacility`). The request body
 * contains ONLY the encounter, patient, note type, and the draft body.
 *
 * The caller MUST NOT supply `authorId` or `authorRole`: doing so is a
 * validation error (the schema is `.strict()`). This is the
 * spoofing-prevention guarantee — clinical authorship identity is
 * trustworthily bound to the authenticated principal, never
 * caller-selected.
 *
 * Fields:
 * - `encounterId`: the UUID of the encounter the note attaches to. Must
 *   reference an encounter in the authenticated scope.
 * - `patientId`: the UUID of the patient. Validated to match the
 *   encounter's patient.
 * - `noteType`: the canonical note type. Defaults to `progress`.
 * - `body`: the draft clinical content. Must be 1-32000 characters. This
 *   is PHI; it is persisted in the transactional database but is NEVER
 *   placed in audit metadata.
 *
 * The request does NOT include:
 * - tenantId, organisationId, or facilityId (derived from session)
 * - status (always `draft` for a fresh note)
 * - authorId / authorRole (derived from the authenticated principal's
 *   bound Provider via the BC10 identity-binding resolver)
 */
export const CreateClinicalNoteRequestSchema = z
  .object({
    encounterId: z.string().uuid(),
    patientId: z.string().uuid(),
    noteType: ClinicalNoteTypeSchema.default('progress'),
    body: z.string().min(1).max(32000),
  })
  .strict();

export type CreateClinicalNoteRequest = z.infer<
  typeof CreateClinicalNoteRequestSchema
>;

export const CreateClinicalNoteResponseSchema = ClinicalNoteResponseSchema;

export type CreateClinicalNoteResponse = z.infer<
  typeof CreateClinicalNoteResponseSchema
>;

// ---------------------------------------------------------------------------
// SignClinicalNoteRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request-body schema for signing a clinical note via
 * `POST /api/v1/clinical-notes/:id/sign`.
 *
 * The signing actor identity (`actorId`) is derived server-side from the
 * authenticated session via the BC10 User→Provider identity-binding
 * resolver (`findActiveProviderForUserAtFacility`). The caller MUST NOT
 * supply `actorId`: doing so is a validation error (the schema is
 * `.strict()`). This is the spoofing-prevention guarantee — the signing
 * identity is trustworthily bound to the authenticated principal, never
 * caller-selected.
 *
 * Per BR-BC03-CLIN-031 (signing authority), the resolved signing actor
 * must have signing authority for the note (the baseline rule: the
 * actor must be the note's author). Because both the note's `authorId`
 * (set at creation) and the signing `actorId` are now server-resolved
 * from the authenticated principal's bound Provider, an authenticated
 * user cannot sign a note authored by a different provider.
 *
 * The audit event's `actorId` is the session UserId (the authenticated
 * identity); the clinical providerId lives in the note/revision data,
 * not the audit metadata (PHI-safe).
 *
 * The body MUST NOT include scope (tenantId/organisationId/facilityId),
 * status, note content, or any actor identifier. Any supplied field is
 * rejected as a validation error.
 */
export const SignClinicalNoteRequestSchema = z.object({}).strict();

export type SignClinicalNoteRequest = z.infer<typeof SignClinicalNoteRequestSchema>;

// ---------------------------------------------------------------------------
// AmendClinicalNoteRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request-body schema for amending a signed clinical note
 * via `POST /api/v1/clinical-notes/:id/amend`.
 *
 * Per BR-BC03-CLIN-032, an amendment MUST include a reason and the
 * corrected body. The `reason` is mandatory (non-empty, max 1000 chars).
 * The `body` is the corrected note content (max 32000 chars). The
 * amending actor is derived server-side from the authenticated session
 * via the BC10 User→Provider identity-binding resolver
 * (`findActiveProviderForUserAtFacility`); the caller MUST NOT supply
 * `actorId` (the schema is `.strict()`).
 *
 * The original signed revision is preserved immutably; the amendment
 * creates a NEW revision.
 */
export const AmendClinicalNoteRequestSchema = z
  .object({
    body: z.string().min(1).max(32000),
    reason: z.string().min(1).max(1000),
  })
  .strict();

export type AmendClinicalNoteRequest = z.infer<
  typeof AmendClinicalNoteRequestSchema
>;

// ---------------------------------------------------------------------------
// AddendumClinicalNoteRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request-body schema for adding an addendum to a signed
 * clinical note via `POST /api/v1/clinical-notes/:id/addendum`.
 *
 * Per BR-BC03-CLIN-032, an addendum MUST include a reason and the
 * supplementary body. `addendum` is terminal. The acting author is
 * derived server-side from the authenticated session via the BC10
 * User→Provider identity-binding resolver; the caller MUST NOT supply
 * `actorId` (the schema is `.strict()`).
 */
export const AddendumClinicalNoteRequestSchema = z
  .object({
    body: z.string().min(1).max(32000),
    reason: z.string().min(1).max(1000),
  })
  .strict();

export type AddendumClinicalNoteRequest = z.infer<
  typeof AddendumClinicalNoteRequestSchema
>;

// ---------------------------------------------------------------------------
// WithdrawClinicalNoteRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request-body schema for withdrawing a draft/in_progress
 * clinical note via `POST /api/v1/clinical-notes/:id/withdraw`.
 *
 * Per STATUS_CODES.md §5.3, withdrawal is recorded with reason and
 * author. The `reason` is mandatory (non-empty, max 1000 chars). The
 * acting author is derived server-side from the authenticated session
 * via the BC10 User→Provider identity-binding resolver; the caller MUST
 * NOT supply `actorId` (the schema is `.strict()`). `withdrawn` is
 * terminal.
 */
export const WithdrawClinicalNoteRequestSchema = z
  .object({
    reason: z.string().min(1).max(1000),
  })
  .strict();

export type WithdrawClinicalNoteRequest = z.infer<
  typeof WithdrawClinicalNoteRequestSchema
>;

// ---------------------------------------------------------------------------
// ClinicalNoteHistoryResponse
// ---------------------------------------------------------------------------

/**
 * The canonical response schema for the note-history endpoint
 * `GET /api/v1/clinical-notes/:id/history`. Returns the full append-only
 * revision sequence in ascending revisionNumber order (oldest first).
 * The history is the medico-legal record; every signed, amended, addendum,
 * and withdrawn revision is retained.
 */
export const ClinicalNoteHistoryResponseSchema = z
  .object({
    noteId: z.string().uuid(),
    revisions: z.array(ClinicalNoteRevisionSchema),
  })
  .strict();

export type ClinicalNoteHistoryResponse = z.infer<
  typeof ClinicalNoteHistoryResponseSchema
>;

// ---------------------------------------------------------------------------
// ClinicalNoteErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the clinical-note endpoints.
 *
 * Error codes:
 * - `CLINICAL_NOTE_VALIDATION_ERROR`: invalid request body.
 * - `CLINICAL_NOTE_NOT_FOUND`: the note does not exist or is not
 *   accessible in the authenticated scope (no existence leak).
 * - `CLINICAL_NOTE_INVALID_TRANSITION`: the note is in a source state not
 *   canonically permitted for this transition (including a terminal
 *   re-application or a same-state re-application).
 * - `CLINICAL_NOTE_ENCOUNTER_NOT_FOUND`: the referenced encounter does not
 *   exist or is not accessible in the authenticated scope (no leak).
 * - `CLINICAL_NOTE_PATIENT_NOT_FOUND`: the referenced patient does not
 *   exist or is not accessible in the authenticated tenant (no leak).
 * - `CLINICAL_NOTE_PATIENT_ENCOUNTER_MISMATCH`: the supplied patientId
 *   does not match the referenced encounter's patient.
 * - `CLINICAL_NOTE_PROVIDER_NOT_FOUND`: the authoring/signing provider is
 *   not found, not active, or not assigned to the authenticated facility
 *   (no leak).
 * - `CLINICAL_NOTE_SIGNING_AUTHORITY_DENIED`: the signing actor lacks
 *   signing authority for this note (BR-BC03-CLIN-031).
 * - `CLINICAL_NOTE_AMENDMENT_REASON_REQUIRED`: an amendment/addendum/
 *   withdrawal was requested without the mandatory reason
 *   (BR-BC03-CLIN-032).
 */
export const ClinicalNoteErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'CLINICAL_NOTE_VALIDATION_ERROR',
          'CLINICAL_NOTE_NOT_FOUND',
          'CLINICAL_NOTE_INVALID_TRANSITION',
          'CLINICAL_NOTE_ENCOUNTER_NOT_FOUND',
          'CLINICAL_NOTE_PATIENT_NOT_FOUND',
          'CLINICAL_NOTE_PATIENT_ENCOUNTER_MISMATCH',
          'CLINICAL_NOTE_PROVIDER_NOT_FOUND',
          'CLINICAL_NOTE_SIGNING_AUTHORITY_DENIED',
          'CLINICAL_NOTE_AMENDMENT_REASON_REQUIRED',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type ClinicalNoteErrorResponse = z.infer<
  typeof ClinicalNoteErrorResponseSchema
>;
