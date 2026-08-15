/**
 * Stable audit action-code catalogue for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per ADR-014 and the ninth canonical batch specification, audit
 * action codes are stable machine-readable strings of the form
 * `<category>.<subject>.<verb>`. They are stored in the `action`
 * column of the `audit_events` table in the dedicated audit database.
 *
 * The catalogue is organized by category. Each category exports its
 * own constant tuple and a type union. The top-level
 * `AUDIT_ACTION_CODES` tuple is the complete catalogue; the
 * `AuditActionCode` type is the complete union.
 *
 * Per the ninth canonical batch specification, action codes are
 * invented ONLY for functionality that exists today. No action codes
 * are invented for patient, encounter, appointment, billing,
 * inventory, configuration, feature-flag, reporting, or
 * audit-management UI functionality. Those arrive in subsequent
 * batches alongside the modules that emit them.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Authentication action codes.
 *
 * Emitted by the auth module (`apps/api/src/modules/auth/`) and by
 * the request-ID middleware for pre-authentication events.
 */
export const AUTHENTICATION_ACTION_CODES = [
  'authentication.login.succeeded',
  'authentication.login.failed',
  'authentication.login.throttled',
  'authentication.logout.succeeded',
  'authentication.session.invalid',
  'authentication.session.expired',
  'authentication.session.rotated',
] as const;

export type AuthenticationActionCode =
  (typeof AUTHENTICATION_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Request security
// ---------------------------------------------------------------------------

/**
 * Request-security action codes.
 *
 * Emitted by the auth module (Origin and CSRF checks) and by the
 * authorization guard (CSRF check).
 */
export const SECURITY_ACTION_CODES = [
  'security.origin.denied',
  'security.csrf.denied',
] as const;

export type SecurityActionCode = (typeof SECURITY_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * Authorization action codes.
 *
 * Emitted by the authorization guard for every allow and deny
 * decision on the existing context permissions.
 */
export const AUTHORIZATION_ACTION_CODES = [
  'authorization.decision.allowed',
  'authorization.decision.denied',
] as const;

export type AuthorizationActionCode =
  (typeof AUTHORIZATION_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Tenant context
// ---------------------------------------------------------------------------

/**
 * Tenant-context action codes.
 *
 * Emitted by the session-context module for context view, selection,
 * and clearing.
 */
export const TENANT_CONTEXT_ACTION_CODES = [
  'tenant_context.viewed',
  'tenant_context.selected',
  'tenant_context.cleared',
] as const;

export type TenantContextActionCode =
  (typeof TENANT_CONTEXT_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Organisation context (ADR-015)
// ---------------------------------------------------------------------------

/**
 * Organisation-context action codes.
 *
 * Emitted by the session-context module for organisation-context
 * selection and clearing. Per ADR-015 (Scoped Organisation and
 * Facility Context), these events are emitted through the
 * transactional outbox in the same Prisma transaction as the
 * context mutation. The audit metadata includes the endpoint name
 * and the scope level; it does not include the organisation display
 * name, the facility display name, any PHI, or any secret.
 */
export const ORGANISATION_CONTEXT_ACTION_CODES = [
  'organisation_context.selected',
  'organisation_context.cleared',
] as const;

export type OrganisationContextActionCode =
  (typeof ORGANISATION_CONTEXT_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Facility context (ADR-015)
// ---------------------------------------------------------------------------

/**
 * Facility-context action codes.
 *
 * Emitted by the session-context module for facility-context
 * selection and clearing. Per ADR-015, these events are emitted
 * through the transactional outbox in the same Prisma transaction
 * as the context mutation.
 */
export const FACILITY_CONTEXT_ACTION_CODES = [
  'facility_context.selected',
  'facility_context.cleared',
] as const;

export type FacilityContextActionCode =
  (typeof FACILITY_CONTEXT_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

/**
 * RBAC action codes.
 *
 * Emitted by the development bootstrap command when it assigns R13
 * System Administrator to the development membership. Future batches
 * will add codes for role unassignment, role-scope changes, and
 * cross-tenant role-assignment attempts.
 */
export const RBAC_ACTION_CODES = [
  'rbac.role.assigned',
  'rbac.role.assignment.failed',
] as const;

export type RbacActionCode = (typeof RBAC_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Audit system
// ---------------------------------------------------------------------------

/**
 * Audit-system action codes.
 *
 * Emitted by the dispatcher (delivery failure) and by the verifier
 * (integrity verified, integrity verification failed).
 */
export const AUDIT_SYSTEM_ACTION_CODES = [
  'audit.delivery.failed',
  'audit.integrity.verified',
  'audit.integrity.verification_failed',
] as const;

export type AuditSystemActionCode =
  (typeof AUDIT_SYSTEM_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Role Preview (Demo Role Preview Mode v1 — development-only)
// ---------------------------------------------------------------------------

/**
 * Demo Role Preview Mode action codes.
 *
 * Emitted by the role-preview module
 * (`apps/api/src/modules/dev/role-preview/`) when a preview session
 * is created (role switch), bootstrapped (initial logged-out
 * selection), or ended. The module is development-only; these
 * action codes are emitted ONLY when the feature flag is enabled
 * and `NODE_ENV !== 'production'`. They never appear in production
 * audit logs.
 *
 * Per the Demo Role Preview Mode v1 specification, the audit event
 * metadata includes the role code being switched to (for `created`
 * and `bootstrapped`) and the endpoint name. The event does NOT
 * include any credential material, any session token, any password,
 * any bootstrap nonce, any bootstrap nonce hash, any CSRF token,
 * any internal UUID beyond the actor's user ID and the new
 * session's ID (which are already part of the audit event's
 * standard fields).
 *
 * The `role_preview.session.bootstrapped` action code is emitted
 * when a logged-out operator selects a canonical role through the
 * one-time bootstrap challenge flow. The audit event for
 * `bootstrapped` is emitted in the same Prisma transaction as the
 * new session creation, so it commits or rolls back atomically
 * with the session. The metadata carries only `endpoint` (value
 * `role_preview_bootstrap_select`) and `roleCode`.
 */
export const ROLE_PREVIEW_ACTION_CODES = [
  'role_preview.session.created',
  'role_preview.session.ended',
  'role_preview.session.bootstrapped',
] as const;

export type RolePreviewActionCode =
  (typeof ROLE_PREVIEW_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Clinic Admin (Clinic Administrator Overview — successful-view event)
// ---------------------------------------------------------------------------
//
// The `clinic_admin.overview.viewed` action code is emitted by the
// Clinic Admin Overview service
// (`apps/api/src/modules/clinic-admin/clinic-admin-overview.service.ts`)
// AFTER the Overview operation completes successfully and returns its
// response. This is the explicit successful-view audit event for the
// Clinic Administrator Overview surface at
// `/api/v1/clinic-admin/overview` (per DESIGN_BIBLE.md §12 Arabic RTL
// and §13 English LTR).
//
// Architectural rationale:
//
// The session-context module (`GET /api/v1/context`) emits BOTH:
//   1. `authorization.decision.allowed` (from the AuthorizationGuard)
//   2. `tenant_context.viewed` (from the service, after success)
//
// This two-event pattern is the established repository convention for
// read-only endpoints. The two events carry DIFFERENT signals:
//   - `authorization.decision.allowed` proves the request was authorized.
//   - `tenant_context.viewed` proves the service completed successfully
//     and returned a response.
//
// The Clinic Admin Overview follows the same pattern:
//   1. `authorization.decision.allowed` (from the guard, category
//      `authorization`) — proves the principal holds the
//      `clinic_admin_overview:view` permission.
//   2. `clinic_admin.overview.viewed` (from the service, category
//      `facility_context`) — proves the Overview service completed
//      successfully and returned its response.
//
// Category mapping:
//
// The `clinic_admin.overview.viewed` action is mapped to the existing
// `facility_context` category (NOT to a new `clinic_admin` category).
// This mapping is implemented in `inferCategoryFromAction` below. The
// `facility_context` category is the narrowest semantically correct
// existing category because:
//   - The Overview is facility-scoped: the service requires an active
//     facility (`session.activeFacilityId !== null`).
//   - The response includes `facilityDisplayName` as a key field.
//   - The service fails closed if the facility is missing, inactive,
//     or belongs to another organisation.
//   - The `tenant_context` category already sets a precedent for
//     read-only `*.viewed` events under context categories
//     (`tenant_context.viewed`).
//
// Database compatibility:
//
// The `facility_context` category was already part of the
// TypeScript audit-category catalogue before migration
// `20260726000000_audit_category_extend_for_role_preview` (it was
// added to `packages/observability/src/audit/categories.ts` by the
// ADR-015 scoped-context extension, which predated the migration).
// Migration `20260726000000_audit_category_extend_for_role_preview`
// EXTENDED the `audit_events_category_check` CHECK constraint in the
// dedicated audit database to include `facility_context` (along with
// `organisation_context` and `role_preview`), bringing the database
// constraint in line with the previously-approved TypeScript
// catalogue. The migration did NOT invent `facility_context`; it
// extended the approved database set with categories that were
// already approved in TypeScript.
//
// The transactional outbox (`audit_outbox_events`) stores the event as
// JSONB with no category CHECK, so the outbox INSERT always succeeds.
// The dispatcher's projection into `audit_events` succeeds because
// `facility_context` is in the CHECK constraint. No new migration is
// required.
//
// History:
//
// The original live-data batch (commit 67802eb) introduced this action
// code under a `clinic_admin` category, which was NOT in the database
// CHECK constraint. The first correction (commit ee95c8c) removed the
// action code entirely and relied only on the guard's
// `authorization.decision.allowed` event. That correction weakened
// the audit trail: it lost the "service completed successfully"
// signal. This restoration re-adds the action code mapped to the
// existing `facility_context` category, preserving both audit signals
// (authorization decision + successful view) without requiring a
// database migration.
//
// Emission semantics:
//
// The event is emitted via `auditHelper.emitDirect(...)` (best-effort,
// non-transactional), matching the existing pattern for read-only view
// events (`tenant_context.viewed`). The event is emitted ONLY after
// the Overview operation succeeds; it is NOT emitted when context
// resolution fails (null return or thrown error). The event does NOT
// recursively audit itself: the emission goes through the outbox, the
// dispatcher delivers it to the audit store, and the audit-store
// append does NOT trigger another audit event.

/**
 * Clinic Admin Overview action codes.
 *
 * Emitted by the Clinic Admin Overview service after the Overview
 * operation completes successfully. The action is mapped to the
 * `facility_context` category (see `inferCategoryFromAction`).
 */
export const CLINIC_ADMIN_ACTION_CODES = [
  'clinic_admin.overview.viewed',
] as const;

export type ClinicAdminActionCode =
  (typeof CLINIC_ADMIN_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Appointments (Scheduling bounded context — BC06)
// ---------------------------------------------------------------------------

/**
 * Appointments action codes.
 *
 * Emitted by the Appointments module after successful read and write
 * operations.
 *
 * The `appointments.schedule.viewed` event is emitted after the
 * "Today's Appointments" query completes successfully (including empty
 * results). Per the Stage 1B implementation specification, the event
 * metadata carries only `{ endpoint: 'appointments_today_view' }` —
 * no patient IDs, provider IDs, appointment details, names, medical
 * data, or other sensitive payload.
 *
 * The `appointments.booked` event is emitted after a successful
 * appointment creation via `POST /api/v1/appointments`. Per the
 * Stage 1C implementation specification, the event metadata carries
 * `{ endpoint: 'appointments_book', appointmentId: string }` — the
 * appointment ID for traceability, but no patient details, provider
 * details, or appointment timing information.
 *
 * The `appointments.cancelled` event is emitted after a successful
 * FIRST-TIME appointment cancellation via
 * `POST /api/v1/appointments/:id/cancel`. Per the Stage 1D
 * implementation specification and STATUS_CODES.md §4.1
 * ("Cancellation recorded with reason and actor"), the event
 * metadata carries
 * `{ endpoint: 'appointments_cancel', appointmentId: string, reason: string }`
 * — the appointment ID for traceability and the caller-supplied
 * cancellation reason. No patient details, provider details, or
 * appointment timing information are carried. The event is emitted
 * ONLY when the appointment actually transitions from `booked` to
 * `cancelled`; an idempotent re-cancellation of an already-cancelled
 * appointment does NOT emit a duplicate event.
 *
 * The `appointments.rescheduled` event is emitted after a successful
 * appointment reschedule via
 * `POST /api/v1/appointments/:id/reschedule`. Per the Stage 1E
 * implementation specification and STATUS_CODES.md §4.1 ("Reschedule
 * recorded with old slot, new slot, reason"), the event metadata
 * carries
 * `{ endpoint: 'appointments_reschedule', originalAppointmentId: string,
 * replacementAppointmentId: string, reason: string }` — the original
 * and replacement appointment IDs for traceability and the
 * caller-supplied reschedule reason. No patient details, provider
 * details, or appointment timing information are carried. The event
 * is emitted ONLY after the repository commits the atomic reschedule
 * (original → cancelled, replacement → booked); a failed reschedule
 * does NOT emit the event. Exactly one event is emitted per
 * successful reschedule.
 *
 * The `appointments.confirmed`, `appointments.checked_in`,
 * `appointments.started`, and `appointments.completed` events are
 * emitted after a successful FIRST-TIME visit-lifecycle transition
 * (Stage 1F). Per the Stage 1F implementation specification and
 * STATUS_CODES.md §4.1, the canonical forward visit-lifecycle edges
 * are booked → confirmed, booked|confirmed → arrived, arrived →
 * in_progress, in_progress → completed. The event metadata carries
 * `{ endpoint, appointmentId }` only — the appointment ID for
 * traceability. No patient details, provider details, appointment
 * timing, encounter references, or clinical content are carried (no
 * PHI). The events are emitted ONLY when the appointment actually
 * transitions; an idempotent re-completion of an already-completed
 * appointment does NOT emit a duplicate `appointments.completed`
 * event (mirroring the cancellation idempotency for the terminal
 * `cancelled` state). Non-terminal same-state re-applications
 * (confirm/check-in/start) are invalid transitions and emit no event.
 * The `appointments.confirmed`, `appointments.checked_in`,
 * `appointments.started`, and `appointments.completed` endpoints are
 * `appointments_confirm`, `appointments_check_in`,
 * `appointments_start`, and `appointments_complete` respectively.
 *
 * All eight actions are mapped to the `facility_context` category
 * (see `inferCategoryFromAction`).
 *
 * Emission semantics:
 *
 * Events are emitted via `auditHelper.emitDirect(...)` (best-effort,
 * non-transactional), matching the existing pattern for read-only view
 * events (`tenant_context.viewed`, `clinic_admin.overview.viewed`).
 * Events are emitted ONLY after the operation succeeds; they are NOT
 * emitted when validation fails or when the service throws. Events do
 * NOT recursively audit themselves.
 */
export const APPOINTMENTS_ACTION_CODES = [
  'appointments.schedule.viewed',
  'appointments.booked',
  'appointments.cancelled',
  'appointments.rescheduled',
  'appointments.confirmed',
  'appointments.checked_in',
  'appointments.started',
  'appointments.completed',
] as const;

export type AppointmentsActionCode =
  (typeof APPOINTMENTS_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Encounters (Encounter bounded context — BC02)
// ---------------------------------------------------------------------------

/**
 * Encounters action codes.
 *
 * Emitted by the Encounters module after successful encounter creation
 * and lifecycle transitions (Stage 2A, BC02 Encounter Foundation).
 *
 * Per STATUS_CODES.md §10.2 (Encounter Transition Map) and §5.1
 * (EncounterStatus), the canonical encounter lifecycle is:
 *
 *   planned → arrived → in_progress → finished (terminal)
 *   planned → in_progress (direct start, e.g. emergency)
 *   planned/arrived/in_progress → cancelled (terminal)
 *   in_progress ⇄ on_leave (pause/resume)
 *
 * The `encounters.created` event is emitted after a successful
 * encounter creation via `POST /api/v1/encounters`. The event metadata
 * carries `{ endpoint, encounterId }` and, for an emergency encounter,
 * `{ emergencyJustification }` (the canonical basis for the consent-gate
 * emergency carve-out, BR-BC15-REG-003 "documented with reason"). No
 * patient details, provider details, appointment timing, or clinical
 * content are carried (no PHI).
 *
 * The `encounters.arrived`, `encounters.started`, `encounters.on_leave`,
 * `encounters.resumed`, `encounters.finished`, and `encounters.cancelled`
 * events are emitted after a successful FIRST-TIME lifecycle transition.
 * The event metadata carries `{ endpoint, encounterId }` only — the
 * encounter ID for traceability. No PHI is carried. The events are
 * emitted ONLY when the encounter actually transitions; an idempotent
 * re-application of a terminal transition (`finished`/`cancelled`) does
 * NOT emit a duplicate event (mirroring the appointment completion/
 * cancellation idempotency). Non-terminal same-state re-applications
 * are invalid transitions and emit no event.
 *
 * All seven actions are mapped to the `facility_context` category
 * (see `inferCategoryFromAction`), matching the appointments action
 * codes: encounters are facility-scoped (the service requires an active
 * facility and queries within the authenticated tenant/organisation/
 * facility scope).
 *
 * Emission semantics:
 *
 * Events are emitted via `auditHelper.emitDirect(...)` (best-effort,
 * non-transactional), matching the existing pattern for appointment
 * lifecycle events. Events are emitted ONLY after the operation
 * succeeds; they are NOT emitted when validation fails, when the
 * consent gate blocks, when the service throws, or for an idempotent
 * no-op. Events do NOT recursively audit themselves.
 */
export const ENCOUNTERS_ACTION_CODES = [
  'encounters.created',
  'encounters.arrived',
  'encounters.started',
  'encounters.on_leave',
  'encounters.resumed',
  'encounters.finished',
  'encounters.cancelled',
] as const;

export type EncountersActionCode = (typeof ENCOUNTERS_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Patients (Patient bounded context — BC01 Demographics/Registration/Consent)
// ---------------------------------------------------------------------------

/**
 * Patients action codes.
 *
 * Emitted by the Patients module after successful patient registration,
 * view, search, demographic update, identifier add, and treatment-consent
 * grant/withdraw (BC01 Demographics/Registration/Consent).
 *
 * Per the ninth canonical batch specification and architecture gate 21,
 * events are emitted ONLY after the operation succeeds; they are NOT
 * emitted when validation fails, when the service throws, when a duplicate
 * is rejected, when a cross-tenant access returns not-found, when a
 * transaction rolls back, or for a no-op (e.g. an already-withdrawn
 * consent re-withdrawal is an idempotent no-op and emits no event).
 *
 * All actions are mapped to the `tenant_context` category (see
 * `inferCategoryFromAction`): Patient identity is tenant-wide (architecture
 * gate 6A), and the patient commands operate within the authenticated
 * tenant scope (no facility/organisation scoping on Patient, unlike
 * encounters/appointments which are facility-scoped). The `tenant_context`
 * category is the narrowest semantically correct existing category for
 * tenant-scoped patient operations.
 *
 * Audit metadata (architecture gate 21): the metadata carries ONLY the
 * `endpoint` and the patient/identifier/consent internal ID for
 * traceability. NO PHI/PII is carried in the metadata. Forbidden from
 * metadata: names, DOB, sex/gender, NationalID, Passport, phone, email,
 * address, consent text, raw request body. The audit metadata
 * forbidden-key detector enforces this at emission time as
 * defence-in-depth.
 */
export const PATIENTS_ACTION_CODES = [
  'patients.registered',
  'patients.viewed',
  'patients.searched',
  'patients.demographics_updated',
  'patients.identifier_added',
  'patients.consent_granted',
  'patients.consent_withdrawn',
] as const;

export type PatientsActionCode = (typeof PATIENTS_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Clinical Notes (Clinical Documentation bounded context — BC03)
// ---------------------------------------------------------------------------

/**
 * Clinical Notes action codes.
 *
 * Emitted by the Clinical Notes module after successful note creation,
 * signing, amendment, addendum, withdrawal, view, and history retrieval
 * (BC03 — Clinical Notes Foundation).
 *
 * Per STATUS_CODES.md §5.3 (ClinicalNoteStatus) and BR-BC03-CLIN-031
 * (signing authority) / BR-BC03-CLIN-032 (amendment documentation), the
 * canonical clinical-note lifecycle is:
 *
 *   draft → in_progress → signed → amended | addendum (terminal)
 *   draft | in_progress → withdrawn (terminal)
 *
 * The `clinical_notes.created` event is emitted after a successful draft
 * note creation via `POST /api/v1/clinical-notes`. The event metadata
 * carries `{ endpoint, noteId }` only — the note ID for traceability. No
 * note body, diagnosis, patient name, DOB, or other PHI/PII is carried
 * (the audit-metadata forbidden-key detector and the service-layer
 * metadata construction enforce this).
 *
 * The `clinical_notes.signed`, `clinical_notes.amended`,
 * `clinical_notes.addendum_added`, and `clinical_notes.withdrawn` events
 * are emitted after a successful FIRST-TIME lifecycle transition. The
 * event metadata carries `{ endpoint, noteId }` only. No PHI is carried.
 * The events are emitted ONLY when the note actually transitions; an
 * idempotent re-application of a terminal transition (`addendum`/
 * `withdrawn`) is an invalid transition (no event). Non-terminal
 * same-state re-applications are invalid transitions and emit no event.
 *
 * The `clinical_notes.viewed` and `clinical_notes.history_viewed` events
 * are emitted after a successful read (view a note; view a note's revision
 * history). Per the established two-event read pattern (cf.
 * `tenant_context.viewed`, `clinic_admin.overview.viewed`), the read
 * endpoints emit BOTH the guard's `authorization.decision.allowed` event
 * AND the service's successful-view event. The event metadata carries
 * `{ endpoint, noteId }` only — no note body, no PHI.
 *
 * All seven actions are mapped to the `facility_context` category (see
 * `inferCategoryFromAction`): clinical notes are facility-scoped (the
 * service requires an active facility and operates within the
 * authenticated tenant/organisation/facility scope), matching the
 * encounters and appointments action codes.
 *
 * Emission semantics:
 *
 * Events are emitted via `auditHelper.emitDirect(...)` (best-effort,
 * non-transactional), matching the existing pattern for encounter and
 * appointment lifecycle events. Events are emitted ONLY after the
 * operation succeeds; they are NOT emitted when validation fails, when
 * authorization denies, when the service throws, or for an invalid
 * transition. Events do NOT recursively audit themselves.
 */
export const CLINICAL_NOTES_ACTION_CODES = [
  'clinical_notes.created',
  'clinical_notes.signed',
  'clinical_notes.amended',
  'clinical_notes.addendum_added',
  'clinical_notes.withdrawn',
  'clinical_notes.viewed',
  'clinical_notes.history_viewed',
] as const;

export type ClinicalNotesActionCode =
  (typeof CLINICAL_NOTES_ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Complete catalogue
// ---------------------------------------------------------------------------

/**
 * The complete audit action-code catalogue for the ninth canonical
 * batch and the ADR-015 scoped-context extension. Used by the
 * metadata validator and the audit-emission API to reject unknown
 * action codes at the boundary.
 */
export const AUDIT_ACTION_CODES = [
  ...AUTHENTICATION_ACTION_CODES,
  ...SECURITY_ACTION_CODES,
  ...AUTHORIZATION_ACTION_CODES,
  ...TENANT_CONTEXT_ACTION_CODES,
  ...ORGANISATION_CONTEXT_ACTION_CODES,
  ...FACILITY_CONTEXT_ACTION_CODES,
  ...RBAC_ACTION_CODES,
  ...AUDIT_SYSTEM_ACTION_CODES,
  ...ROLE_PREVIEW_ACTION_CODES,
  ...CLINIC_ADMIN_ACTION_CODES,
  ...APPOINTMENTS_ACTION_CODES,
  ...ENCOUNTERS_ACTION_CODES,
  ...PATIENTS_ACTION_CODES,
  ...CLINICAL_NOTES_ACTION_CODES,
] as const;

/**
 * The complete audit action-code type union.
 */
export type AuditActionCode = (typeof AUDIT_ACTION_CODES)[number];

/**
 * Verify that a value is a valid audit action code.
 */
export function isAuditActionCode(
  value: unknown,
): value is AuditActionCode {
  if (typeof value !== 'string') {
    return false;
  }
  return (AUDIT_ACTION_CODES as readonly string[]).includes(value);
}

/**
 * Infer the category of an action code from its prefix. Returns the
 * category string or `null` if the action code is unknown.
 *
 * This helper is used by the audit-emission API to cross-check that
 * the supplied category matches the action code's prefix. A mismatch
 * is treated as a defect: the action code's category prefix is the
 * canonical category, and the `category` field on the event must
 * match.
 */
export function inferCategoryFromAction(
  action: string,
): string | null {
  if (action.startsWith('authentication.')) {
    return 'security';
  }
  if (action.startsWith('security.')) {
    return 'security';
  }
  if (action.startsWith('authorization.')) {
    return 'authorization';
  }
  if (action.startsWith('tenant_context.')) {
    return 'tenant_context';
  }
  if (action.startsWith('organisation_context.')) {
    return 'organisation_context';
  }
  if (action.startsWith('facility_context.')) {
    return 'facility_context';
  }
  if (action.startsWith('rbac.')) {
    return 'rbac';
  }
  if (action.startsWith('audit.')) {
    return 'audit';
  }
  if (action.startsWith('role_preview.')) {
    return 'role_preview';
  }
  // Clinic Admin actions are mapped to the `facility_context` category.
  // The Clinic Admin Overview is a facility-scoped read-only view: the
  // service requires an active facility, the response includes
  // `facilityDisplayName`, and the service fails closed if the facility
  // is missing, inactive, or belongs to another organisation. The
  // `tenant_context` category already sets a precedent for read-only
  // `*.viewed` events under context categories. See the
  // `CLINIC_ADMIN_ACTION_CODES` block above for the full rationale.
  if (action.startsWith('clinic_admin.')) {
    return 'facility_context';
  }
  // Appointments actions are mapped to the `facility_context` category.
  // The "Today's Appointments" endpoint is a facility-scoped read-only
  // view: the service requires an active facility and queries
  // appointments for the facility's current local calendar day. The
  // `facility_context` category is the narrowest semantically correct
  // existing category. See the `APPOINTMENTS_ACTION_CODES` block above
  // for the full rationale.
  if (action.startsWith('appointments.')) {
    return 'facility_context';
  }
  // Encounters actions are mapped to the `facility_context` category,
  // matching the appointments action codes: encounters are facility-
  // scoped (the service requires an active facility and operates within
  // the authenticated tenant/organisation/facility scope).
  if (action.startsWith('encounters.')) {
    return 'facility_context';
  }
  // Patients actions are mapped to the `tenant_context` category: Patient
  // identity is tenant-wide (architecture gate 6A), and patient commands
  // operate within the authenticated tenant scope (no facility/organisation
  // scoping on Patient, unlike encounters/appointments). The
  // `tenant_context` category is the narrowest semantically correct existing
  // category for tenant-scoped patient operations.
  if (action.startsWith('patients.')) {
    return 'tenant_context';
  }
  // Clinical Notes actions are mapped to the `facility_context` category,
  // matching the encounters and appointments action codes: clinical notes
  // are facility-scoped (the service requires an active facility and
  // operates within the authenticated tenant/organisation/facility scope).
  if (action.startsWith('clinical_notes.')) {
    return 'facility_context';
  }
  return null;
}
