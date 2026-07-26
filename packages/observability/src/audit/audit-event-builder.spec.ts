import { describe, it, expect } from 'vitest';
import {
  buildAuditEventDraft,
  MAX_USER_AGENT_LENGTH,
} from './audit-event-builder.js';
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
