import { describe, expect, it } from 'vitest';

import {
  buildAuditEventDraft,
  inferCategoryFromAction,
  isAuditActionCode,
} from './index.js';

describe('Platform administrator grant audit action', () => {
  it('recognizes the independent platform grant action', () => {
    expect(
      isAuditActionCode('rbac.platform_administrator.granted'),
    ).toBe(true);

    expect(
      inferCategoryFromAction('rbac.platform_administrator.granted'),
    ).toBe('rbac');
  });

  it('builds a platform-scoped bootstrap audit event', () => {
    const result = buildAuditEventDraft({
      action: 'rbac.platform_administrator.granted',
      actorType: 'SYSTEM',
      source: 'bootstrap',
      tenantId: null,
      scope: 'platform',
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.draft.category).toBe('rbac');
      expect(result.draft.tenantId).toBeNull();
      expect(result.draft.actorType).toBe('SYSTEM');
    }
  });
});
