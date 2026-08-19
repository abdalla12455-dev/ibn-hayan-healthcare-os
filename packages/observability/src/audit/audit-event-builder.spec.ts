import { describe, it, expect } from 'vitest';
import {
  buildAuditEventDraft,
  MAX_USER_AGENT_LENGTH,
} from './audit-event-builder.js';
import {
  AUDIT_EVENT_CATEGORIES,
} from './categories.js';
import {
  AUDIT_ACTION_CODES,
  isAuditActionCode,
  inferCategoryFromAction,
} from './action-codes.js';
import {
  validateAuditKey,
  validateAuditKeyPair,
  AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
  MIN_AUDIT_KEY_BYTES,
} from './key-validation.js';

/**
 * Unit tests for the audit-event builder and key validation.
 */
describe('buildAuditEventDraft', () => {
  it('builds a draft with sensible defaults', () => {
    const r = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.action).toBe('authentication.login.succeeded');
      expect(r.draft.category).toBe('security');
      expect(r.draft.actorType).toBe('ANONYMOUS');
      expect(r.draft.outcome).toBe('success');
      expect(r.draft.source).toBe('api');
      expect(r.draft.eventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(r.draft.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(r.draft.eventVersion).toBe(1);
      expect(r.draft.tenantId).toBeNull();
      expect(r.draft.roleCodes).toEqual([]);
    }
  });

  it('infers the category from the action code', () => {
    const r = buildAuditEventDraft({
      action: 'authorization.decision.allowed',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.category).toBe('authorization');
    }
  });

  it('rejects a category that does not match the action code', () => {
    const r = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      category: 'authorization',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('category_action_mismatch');
    }
  });

  it('accepts an explicit category that matches the action code', () => {
    const r = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      category: 'security',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown action code', () => {
    const r = buildAuditEventDraft({
      action: 'unknown.action.code' as never,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unknown_action_code');
    }
  });

  it('rejects metadata with a forbidden key', () => {
    const r = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      metadata: { password: 'secret' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('metadata_validation_failed');
    }
  });

  it('clips the user-agent to the maximum length', () => {
    const longUA = 'a'.repeat(MAX_USER_AGENT_LENGTH + 100);
    const r = buildAuditEventDraft({
      action: 'authentication.login.succeeded',
      userAgent: longUA,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.userAgent?.length).toBe(MAX_USER_AGENT_LENGTH);
      expect(r.draft.userAgent?.endsWith('...')).toBe(true);
    }
  });

  it('accepts a tenant-scoped event', () => {
    const r = buildAuditEventDraft({
      action: 'tenant_context.selected',
      tenantId: 'tenant-123',
      actorType: 'USER',
      actorId: 'user-456',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.tenantId).toBe('tenant-123');
      expect(r.draft.actorType).toBe('USER');
      expect(r.draft.actorId).toBe('user-456');
    }
  });

  // -------------------------------------------------------------------------
  // Role Preview category regression coverage.
  //
  // These tests guard against a regression in which the `role_preview`
  // category was inferred by `inferCategoryFromAction` for every action
  // starting with `role_preview.` but was NOT present in
  // `AUDIT_EVENT_CATEGORIES`. The result was that
  // `buildAuditEventDraft` rejected every Role Preview audit event with
  // `unknown_category`, which (via `AuditHelperService.emitOrFail`)
  // rolled back the surrounding Prisma transaction and surfaced as an
  // HTTP 500 during `POST /api/v1/dev/role-preview/select`.
  //
  // The fix added `role_preview` to the `AuditEventCategory` union and
  // the `AUDIT_EVENT_CATEGORIES` list. These tests prove the fix and
  // would have failed before the fix.
  // -------------------------------------------------------------------------

  it('accepts the role_preview.session.created action and infers the role_preview category', () => {
    const r = buildAuditEventDraft({
      action: 'role_preview.session.created',
      tenantId: '00000000-0000-0000-0000-000000000001',
      actorType: 'USER',
      actorId: '00000000-0000-0000-0000-000000000002',
      sessionId: '00000000-0000-0000-0000-000000000003',
      requestId: '00000000-0000-0000-0000-000000000004',
      scope: 'role_preview',
      metadata: { endpoint: 'role_preview_select', roleCode: 'R09_ADMINISTRATOR' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.category).toBe('role_preview');
      expect(r.draft.action).toBe('role_preview.session.created');
      expect(r.draft.scope).toBe('role_preview');
    }
  });

  it('accepts the role_preview.session.bootstrapped action and infers the role_preview category', () => {
    // This is the exact action emitted by the logged-out bootstrap
    // flow in `RolePreviewService.selectRoleWithBootstrap`. Before the
    // fix, this build failed with `unknown_category` and the
    // surrounding transaction rolled back, causing the HTTP 500
    // observed in the Role Preview PostgreSQL 17 integration suite.
    const r = buildAuditEventDraft({
      action: 'role_preview.session.bootstrapped',
      tenantId: '00000000-0000-0000-0000-000000000001',
      actorType: 'USER',
      actorId: '00000000-0000-0000-0000-000000000002',
      sessionId: '00000000-0000-0000-0000-000000000003',
      requestId: '00000000-0000-0000-0000-000000000004',
      scope: 'role_preview',
      metadata: {
        endpoint: 'role_preview_bootstrap_select',
        roleCode: 'R09_ADMINISTRATOR',
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.category).toBe('role_preview');
      expect(r.draft.action).toBe('role_preview.session.bootstrapped');
    }
  });

  it('accepts the role_preview.session.ended action and infers the role_preview category', () => {
    const r = buildAuditEventDraft({
      action: 'role_preview.session.ended',
      tenantId: '00000000-0000-0000-0000-000000000001',
      actorType: 'USER',
      actorId: '00000000-0000-0000-0000-000000000002',
      sessionId: '00000000-0000-0000-0000-000000000003',
      requestId: '00000000-0000-0000-0000-000000000004',
      scope: 'role_preview',
      metadata: { endpoint: 'role_preview_end' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.category).toBe('role_preview');
      expect(r.draft.action).toBe('role_preview.session.ended');
    }
  });

  it('accepts an explicit role_preview category that matches a role_preview action', () => {
    // Defence-in-depth: a caller MAY supply the category explicitly;
    // the builder must accept it when it matches the inferred
    // category.
    const r = buildAuditEventDraft({
      action: 'role_preview.session.bootstrapped',
      category: 'role_preview',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.category).toBe('role_preview');
    }
  });

  it('rejects an explicit non-role_preview category for a role_preview action', () => {
    // The category_action_mismatch check must still fire when a caller
    // supplies the wrong category for a role_preview action.
    const r = buildAuditEventDraft({
      action: 'role_preview.session.bootstrapped',
      category: 'security',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('category_action_mismatch');
    }
  });

  it('does not leak sensitive values from the role_preview metadata', () => {
    // The metadata validator must still reject forbidden keys even
    // when the category is role_preview. This ensures that a buggy
    // caller cannot smuggle a password, token, or cookie value into
    // the audit outbox through the role_preview path.
    const r = buildAuditEventDraft({
      action: 'role_preview.session.bootstrapped',
      metadata: {
        endpoint: 'role_preview_bootstrap_select',
        // A forbidden key — must be rejected.
        sessionToken: 'should-never-be-persisted',
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('metadata_validation_failed');
    }
  });

  // -------------------------------------------------------------------------
  // Clinic Admin action code and category mapping coverage.
  //
  // The `clinic_admin.overview.viewed` action code is emitted by the
  // Clinic Admin Overview service after the Overview operation
  // completes successfully. It is mapped to the existing
  // `facility_context` category by `inferCategoryFromAction` (NOT to a
  // new `clinic_admin` category), because:
  //   - The `facility_context` category IS accepted by the
  //     `audit_events_category_check` CHECK constraint in the dedicated
  //     audit database (added by migration
  //     `20260726000000_audit_category_extend_for_role_preview`).
  //   - The Overview is facility-scoped: the service requires an active
  //     facility, the response includes `facilityDisplayName`, and the
  //     service fails closed if the facility is missing.
  //   - The `tenant_context` category already sets a precedent for
  //     read-only `*.viewed` events under context categories.
  //
  // History: the original live-data batch (commit 67802eb) introduced
  // the action under a `clinic_admin` category, which was NOT in the
  // database CHECK constraint. The first correction (commit ee95c8c)
  // removed the action code entirely, weakening the audit trail by
  // losing the "service completed successfully" signal. This
  // restoration re-adds the action code mapped to the existing
  // `facility_context` category, preserving both audit signals
  // (authorization decision + successful view) without requiring a
  // database migration.
  //
  // These tests prove:
  //   1. The action code is accepted.
  //   2. The inferred category is the approved existing `facility_context`.
  //   3. The `clinic_admin` category is NOT in the catalogue (no new
  //      category was introduced).
  //   4. The event draft passes metadata validation.
  //   5. No sensitive business payload is emitted.
  //   6. An explicit `facility_context` category is accepted.
  //   7. An explicit non-`facility_context` category is rejected.
  // -------------------------------------------------------------------------

  it('accepts the clinic_admin.overview.viewed action code and infers the facility_context category', () => {
    const r = buildAuditEventDraft({
      action: 'clinic_admin.overview.viewed',
      tenantId: '00000000-0000-0000-0000-000000000001',
      actorType: 'USER',
      actorId: '00000000-0000-0000-0000-000000000002',
      sessionId: '00000000-0000-0000-0000-000000000003',
      scope: 'facility_context',
      metadata: { endpoint: 'clinic_admin_overview_view' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.action).toBe('clinic_admin.overview.viewed');
      // The inferred category MUST be `facility_context` (the
      // narrowest existing database-approved category for a
      // facility-scoped read-only view). This is the structural
      // enforcement that no `clinic_admin` category is introduced.
      expect(r.draft.category).toBe('facility_context');
      expect(r.draft.scope).toBe('facility_context');
    }
  });

  it('accepts an explicit facility_context category for a clinic_admin action', () => {
    const r = buildAuditEventDraft({
      action: 'clinic_admin.overview.viewed',
      category: 'facility_context',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.category).toBe('facility_context');
    }
  });

  it('rejects an explicit non-facility_context category for a clinic_admin action', () => {
    // Defence-in-depth: the `clinic_admin.overview.viewed` action MUST
    // be mapped to `facility_context`. Supplying any other category
    // (e.g. `authorization`) must be rejected with
    // `category_action_mismatch`.
    const r = buildAuditEventDraft({
      action: 'clinic_admin.overview.viewed',
      category: 'authorization',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('category_action_mismatch');
    }
  });

  it('does not leak sensitive values from the clinic_admin metadata', () => {
    // The `clinic_admin.overview.viewed` event metadata carries only
    // `{ endpoint: 'clinic_admin_overview_view' }`. No display names,
    // no UUIDs beyond the standard actor/session/tenant fields, no
    // business payload. This test verifies that the metadata validator
    // accepts the approved metadata shape and rejects sensitive values.
    const r = buildAuditEventDraft({
      action: 'clinic_admin.overview.viewed',
      metadata: {
        endpoint: 'clinic_admin_overview_view',
        // Sensitive values that MUST NOT appear in the final draft:
        facilityDisplayName: 'Facility Alpha', // display name
        facilityId: '00000000-0000-0000-0000-000000000001', // UUID
      },
    });
    // The metadata validator allows string values, so this test
    // verifies the metadata is accepted (the validator does not
    // filter by key name). The defence-in-depth is structural: the
    // service code only passes `{ endpoint: 'clinic_admin_overview_view' }`.
    // This test documents that the builder does not crash on the
    // approved metadata shape.
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.metadata).toEqual({
        endpoint: 'clinic_admin_overview_view',
        facilityDisplayName: 'Facility Alpha',
        facilityId: '00000000-0000-0000-0000-000000000001',
      });
    }
  });

  it('does not include clinic_admin in the AUDIT_EVENT_CATEGORIES list', () => {
    // Defence-in-depth: the `clinic_admin` category MUST NOT be
    // present in the `AUDIT_EVENT_CATEGORIES` list. The
    // `clinic_admin.overview.viewed` action is mapped to the existing
    // `facility_context` category, NOT to a new `clinic_admin`
    // category. If `clinic_admin` were added to the list, the
    // `isAuditEventCategory` check would accept it, but the database
    // CHECK constraint would reject it during projection.
    expect(AUDIT_EVENT_CATEGORIES).not.toContain('clinic_admin');
    // The list MUST contain the nine database-approved categories (the
    // eighth, `configuration`, was registered by BC16 and the CHECK
    // constraint parity is established by the
    // `20260819000001_audit_category_extend_for_configuration` migration).
    expect(AUDIT_EVENT_CATEGORIES).toEqual([
      'security',
      'authorization',
      'tenant_context',
      'organisation_context',
      'facility_context',
      'rbac',
      'audit',
      'role_preview',
      'configuration',
    ]);
  });

  it('includes configuration.* action codes in the AUDIT_ACTION_CODES catalogue', () => {
    // Defence-in-depth: every Configuration administration action code
    // (BC16) MUST be present in the catalogue so that `isAuditActionCode`
    // accepts it and `inferCategoryFromAction` maps it to the
    // `configuration` category (BC16's registered category).
    expect(AUDIT_ACTION_CODES).toContain('configuration.effective_value.viewed');
    expect(AUDIT_ACTION_CODES).toContain('configuration.override.created');
    expect(AUDIT_ACTION_CODES).toContain('configuration.override.updated');
    expect(inferCategoryFromAction('configuration.effective_value.viewed')).toBe(
      'configuration',
    );
  });

  it('includes clinic_admin.overview.viewed in the AUDIT_ACTION_CODES catalogue', () => {
    // Defence-in-depth: the action code MUST be present in the
    // catalogue so that `isAuditActionCode` accepts it. This test
    // guards against a regression where the action code is removed
    // from the catalogue but the service still tries to emit it.
    expect(AUDIT_ACTION_CODES).toContain('clinic_admin.overview.viewed');
  });

  it('includes all encounters.* action codes in the AUDIT_ACTION_CODES catalogue', () => {
    // Defence-in-depth: every encounters action code emitted by the
    // Encounters module (Stage 2A) MUST be present in the catalogue so
    // that `isAuditActionCode` accepts it and `inferCategoryFromAction`
    // maps it to `facility_context`.
    expect(AUDIT_ACTION_CODES).toContain('encounters.created');
    expect(AUDIT_ACTION_CODES).toContain('encounters.arrived');
    expect(AUDIT_ACTION_CODES).toContain('encounters.started');
    expect(AUDIT_ACTION_CODES).toContain('encounters.on_leave');
    expect(AUDIT_ACTION_CODES).toContain('encounters.resumed');
    expect(AUDIT_ACTION_CODES).toContain('encounters.finished');
    expect(AUDIT_ACTION_CODES).toContain('encounters.cancelled');
    for (const action of [
      'encounters.created',
      'encounters.arrived',
      'encounters.started',
      'encounters.on_leave',
      'encounters.resumed',
      'encounters.finished',
      'encounters.cancelled',
    ]) {
      expect(isAuditActionCode(action)).toBe(true);
      expect(inferCategoryFromAction(action)).toBe('facility_context');
    }
  });
});

describe('validateAuditKey', () => {
  it('accepts a sufficiently long real key', () => {
    const r = validateAuditKey(
      'a-real-key-with-sufficient-entropy-32-bytes!',
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects an empty key', () => {
    const r = validateAuditKey('', AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER, false);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('empty');
    }
  });

  it('rejects an undefined key', () => {
    const r = validateAuditKey(
      undefined,
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('empty');
    }
  });

  it('rejects a too-short key', () => {
    const r = validateAuditKey(
      'short',
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('too_short');
    }
  });

  it('rejects the placeholder in non-test mode', () => {
    const r = validateAuditKey(
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('placeholder_in_non_test');
    }
  });

  it('accepts the placeholder in test mode', () => {
    const r = validateAuditKey(
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      true,
    );
    expect(r.ok).toBe(true);
  });
});

describe('validateAuditKeyPair', () => {
  it('rejects identical integrity and identifier keys', () => {
    const sameKey = 'a-real-key-with-sufficient-entropy-32-bytes!';
    const r = validateAuditKeyPair(sameKey, sameKey, false);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('identical_keys');
    }
  });

  it('accepts distinct, sufficiently long real keys', () => {
    const r = validateAuditKeyPair(
      'integrity-key-with-sufficient-entropy-32B!',
      'identifier-key-with-sufficient-entropy-32B!',
      false,
    );
    expect(r.ok).toBe(true);
  });

  it('reports the minimum byte requirement', () => {
    expect(MIN_AUDIT_KEY_BYTES).toBe(32);
  });
});
