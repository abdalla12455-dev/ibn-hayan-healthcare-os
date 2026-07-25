import { describe, it, expect } from 'vitest';
import {
  isPreviewTransactionalDatabaseUrl,
  isPreviewAuditDatabaseUrl,
  isPreviewDatabaseIdentityValid,
} from './preview-database-identity.js';

/**
 * Unit tests for the preview-database-identity gate.
 *
 * These tests verify the Secure Logged-Out Demo Role Bootstrap
 * specification's database-identity requirements:
 *
 * - The bootstrap flow refuses to run when DATABASE_URL does not
 *   positively identify an isolated role-preview transactional
 *   database.
 * - The bootstrap flow refuses to run when AUDIT_DATABASE_URL does
 *   not positively identify an isolated role-preview audit
 *   database.
 * - The check is case-insensitive.
 * - The check accepts both `role_preview` and `preview_role`
 *   substrings.
 * - The check NEVER logs the URL (verified by inspection: the
 *   functions are pure and do not call any logging API).
 */
describe('isPreviewTransactionalDatabaseUrl', () => {
  it('returns true for a URL containing "role_preview"', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_db',
      ),
    ).toBe(true);
  });

  it('returns true for a URL containing "preview_role"', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://user:pass@localhost:5432/preview_role_db',
      ),
    ).toBe(true);
  });

  it('returns true for a URL with uppercase ROLE_PREVIEW (case-insensitive)', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ROLE_PREVIEW_DB',
      ),
    ).toBe(true);
  });

  it('returns false for a production-style URL', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_prod',
      ),
    ).toBe(false);
  });

  it('returns false for a development URL without the preview substring', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_dev',
      ),
    ).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPreviewTransactionalDatabaseUrl(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isPreviewTransactionalDatabaseUrl('')).toBe(false);
  });

  it('returns false for a non-string value', () => {
    expect(isPreviewTransactionalDatabaseUrl(12345)).toBe(false);
    expect(isPreviewTransactionalDatabaseUrl(null)).toBe(false);
    expect(isPreviewTransactionalDatabaseUrl({})).toBe(false);
  });
});

describe('isPreviewAuditDatabaseUrl', () => {
  it('returns true for a URL containing "role_preview"', () => {
    expect(
      isPreviewAuditDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_audit',
      ),
    ).toBe(true);
  });

  it('returns true for a URL containing "preview_role"', () => {
    expect(
      isPreviewAuditDatabaseUrl(
        'postgresql://user:pass@localhost:5432/preview_role_audit',
      ),
    ).toBe(true);
  });

  it('returns false for a production-style audit URL', () => {
    expect(
      isPreviewAuditDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_audit_prod',
      ),
    ).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPreviewAuditDatabaseUrl(undefined)).toBe(false);
  });
});

describe('isPreviewDatabaseIdentityValid', () => {
  it('returns true when both DATABASE_URL and AUDIT_DATABASE_URL identify preview databases', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(true);
  });

  it('returns false when DATABASE_URL is a non-preview URL', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/ibn_hayan_dev',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(false);
  });

  it('returns false when AUDIT_DATABASE_URL is a non-preview URL', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/ibn_hayan_audit_dev',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(false);
  });

  it('returns false when DATABASE_URL is missing', () => {
    const env: NodeJS.ProcessEnv = {
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(false);
  });

  it('returns false when AUDIT_DATABASE_URL is missing', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(false);
  });

  it('returns false when both are missing', () => {
    const env: NodeJS.ProcessEnv = {};
    expect(isPreviewDatabaseIdentityValid(env)).toBe(false);
  });
});
