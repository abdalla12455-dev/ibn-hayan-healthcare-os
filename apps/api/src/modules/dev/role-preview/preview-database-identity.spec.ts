import { describe, it, expect } from 'vitest';
import {
  validatePreviewDatabaseUrl,
  validatePreviewDatabaseIdentity,
  isPreviewTransactionalDatabaseUrl,
  isPreviewAuditDatabaseUrl,
  isPreviewDatabaseIdentityValid,
  PREVIEW_DATABASE_NAME_IDENTIFIERS,
} from './preview-database-identity.js';

/**
 * Unit tests for the preview-database-identity gate.
 *
 * These tests verify the Secure Logged-Out Demo Role Bootstrap
 * specification's database-identity requirements, including the
 * Phase 3 corrections:
 *
 * - Database identity is derived from the PARSED DATABASE NAME
 *   (via the native `URL` parser), not from arbitrary substring
 *   matching across the entire URL.
 * - The transactional and audit databases must be distinct.
 * - No credential, no full URL, no username, no password, no
 *   hostname, no query string is returned by the validation result.
 * - The validation never throws; callers decide how to react.
 *
 * ## Coverage map (Phase 3 required checks)
 *
 * 1. URL exists — covered by `missing` cases.
 * 2. URL parses successfully — covered by `malformed` cases.
 * 3. Protocol is PostgreSQL-compatible — covered by `unsupported_protocol` cases.
 * 4. Database pathname resolves to a non-empty database name — covered by `empty_database_name` cases.
 * 5. Database name is explicitly Preview-specific — covered by `non_preview_database_name` cases.
 * 6. Transactional and audit database names differ — covered by `databases_not_distinct` cases.
 * 7. No credential is returned by the validation result — covered by `no credential` cases.
 * 8. No complete URL is returned — covered by `no full URL` cases.
 * 9. No sensitive value is logged — verified by inspection (the module never calls any logging API).
 */

// ---------------------------------------------------------------------------
// validatePreviewDatabaseUrl
// ---------------------------------------------------------------------------

describe('validatePreviewDatabaseUrl', () => {
  describe('accepts valid preview URLs', () => {
    it('accepts a URL whose database name contains "role_preview"', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_db',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('role_preview_db');
      expect(result.reason).toBeUndefined();
    });

    it('accepts a URL whose database name contains "preview_role"', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/preview_role_db',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('preview_role_db');
    });

    it('accepts a URL with uppercase ROLE_PREVIEW (case-insensitive database name)', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ROLE_PREVIEW_DB',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('ROLE_PREVIEW_DB');
    });

    it('accepts a URL with the postgres:// scheme (legacy libpq)', () => {
      const result = validatePreviewDatabaseUrl(
        'postgres://user:pass@localhost:5432/role_preview_db',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('role_preview_db');
    });

    it('accepts a URL with a query string (query is ignored; only pathname is checked)', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_db?schema=public&connection_limit=10',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('role_preview_db');
    });

    it('accepts a URL without credentials (user:pass omitted)', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://localhost:5432/role_preview_db',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('role_preview_db');
    });

    it('accepts a URL without a port (default port)', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost/role_preview_db',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('role_preview_db');
    });

    it('accepts a URL whose database name is exactly "role_preview"', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview',
      );
      expect(result.ok).toBe(true);
      expect(result.databaseName).toBe('role_preview');
    });
  });

  describe('rejects missing URLs', () => {
    it('rejects undefined', () => {
      const result = validatePreviewDatabaseUrl(undefined);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing');
      expect(result.databaseName).toBeUndefined();
    });

    it('rejects null', () => {
      const result = validatePreviewDatabaseUrl(null);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing');
    });

    it('rejects an empty string', () => {
      const result = validatePreviewDatabaseUrl('');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing');
    });

    it('rejects a whitespace-only string (URL parser would accept it as a relative URL, but the protocol check rejects it)', () => {
      // The native URL parser accepts '   ' as a relative URL with
      // protocol 'https:'. The protocol check then rejects it.
      const result = validatePreviewDatabaseUrl('   ');
      expect(result.ok).toBe(false);
      // The reason is either 'malformed' (if the parser threw) or
      // 'unsupported_protocol' (if the parser accepted a non-pg
      // scheme). Either is acceptable; both correctly reject.
      expect(['malformed', 'unsupported_protocol']).toContain(result.reason);
    });
  });

  describe('rejects malformed URLs', () => {
    it('rejects a URL that the native URL parser cannot parse', () => {
      // A URL with an invalid protocol character. The native URL
      // parser throws on this input.
      const result = validatePreviewDatabaseUrl('postgresql://[invalid-ipv6');
      expect(result.ok).toBe(false);
      expect([
        'malformed',
        'unsupported_protocol',
        'empty_database_name',
      ]).toContain(result.reason);
    });

    it('rejects a URL that is just a scheme', () => {
      const result = validatePreviewDatabaseUrl('postgresql://');
      expect(result.ok).toBe(false);
      expect(['malformed', 'empty_database_name']).toContain(result.reason);
    });
  });

  describe('rejects unsupported protocols', () => {
    it('rejects an http:// URL even if the path contains "role_preview"', () => {
      const result = validatePreviewDatabaseUrl(
        'http://localhost/role_preview_db',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('unsupported_protocol');
    });

    it('rejects a file:// URL even if the path contains "role_preview"', () => {
      const result = validatePreviewDatabaseUrl('file:///role_preview_db');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('unsupported_protocol');
    });

    it('rejects a mysql:// URL even if the path contains "role_preview"', () => {
      const result = validatePreviewDatabaseUrl(
        'mysql://user:pass@localhost:3306/role_preview_db',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('unsupported_protocol');
    });
  });

  describe('rejects empty database names', () => {
    it('rejects a URL with no pathname', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('empty_database_name');
    });

    it('rejects a URL with an empty pathname (just a slash)', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('empty_database_name');
    });
  });

  describe('rejects non-preview database names', () => {
    it('rejects a production-style database name', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_prod',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
      expect(result.databaseName).toBe('ibn_hayan_prod');
    });

    it('rejects a development database name without the preview substring', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_dev',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
    });

    it('rejects an audit-prod database name', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_audit_prod',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
    });
  });

  describe('does NOT false-positive on username-only matches', () => {
    it('rejects when only the USERNAME contains "role_preview" but the database name is "prod"', () => {
      // This is the critical safety case: the OLD substring check
      // would have accepted this URL because the full URL contains
      // "role_preview" in the username. The new parsed-database-name
      // check correctly rejects it.
      const result = validatePreviewDatabaseUrl(
        'postgresql://role_preview_user:pass@localhost:5432/prod',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
      expect(result.databaseName).toBe('prod');
    });

    it('rejects when only the PASSWORD contains "role_preview" but the database name is "prod"', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:role_preview_password@localhost:5432/prod',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
      expect(result.databaseName).toBe('prod');
    });
  });

  describe('does NOT false-positive on hostname-only matches', () => {
    it('rejects when only the HOSTNAME contains "role-preview" but the database name is "prod"', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@role-preview-db.example.com:5432/prod',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
      expect(result.databaseName).toBe('prod');
    });

    it('rejects when only the HOSTNAME contains "preview_role" but the database name is "prod"', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@preview-role.internal:5432/prod',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
      expect(result.databaseName).toBe('prod');
    });
  });

  describe('does NOT false-positive on query-string-only matches', () => {
    it('rejects when only the QUERY STRING contains "role_preview" but the database name is "prod"', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/prod?schema=role_preview',
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('non_preview_database_name');
      expect(result.databaseName).toBe('prod');
    });
  });

  describe('returns safe results (no credential, no full URL)', () => {
    it('does NOT include the username in the result', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://secret-user:secret-pass@localhost:5432/role_preview_db',
      );
      const json = JSON.stringify(result);
      expect(json).not.toContain('secret-user');
      expect(json).not.toContain('secret-pass');
    });

    it('does NOT include the password in the result', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:super-secret-password@localhost:5432/role_preview_db',
      );
      const json = JSON.stringify(result);
      expect(json).not.toContain('super-secret-password');
    });

    it('does NOT include the hostname in the result', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@internal-host.example.com:5432/role_preview_db',
      );
      const json = JSON.stringify(result);
      expect(json).not.toContain('internal-host.example.com');
    });

    it('does NOT include the port in the result', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_db',
      );
      const json = JSON.stringify(result);
      expect(json).not.toContain('5432');
    });

    it('does NOT include the query string in the result', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_db?schema=public&connection_limit=10',
      );
      const json = JSON.stringify(result);
      expect(json).not.toContain('schema=public');
      expect(json).not.toContain('connection_limit=10');
    });

    it('does NOT include the full URL in the result (even on failure)', () => {
      const result = validatePreviewDatabaseUrl(
        'postgresql://user:pass@localhost:5432/prod',
      );
      const json = JSON.stringify(result);
      // The full URL must not appear in the result.
      expect(json).not.toContain('postgresql://user:pass@localhost:5432/prod');
      // The database name (pathname only) MAY appear because it is
      // safe to log (it is not a credential).
      expect(json).toContain('prod');
    });
  });

  describe('non-string inputs', () => {
    it('rejects a number', () => {
      expect(validatePreviewDatabaseUrl(12345).ok).toBe(false);
      expect(validatePreviewDatabaseUrl(12345).reason).toBe('missing');
    });

    it('rejects an object', () => {
      expect(validatePreviewDatabaseUrl({}).ok).toBe(false);
    });

    it('rejects a boolean', () => {
      expect(validatePreviewDatabaseUrl(true).ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// validatePreviewDatabaseIdentity (pair validator)
// ---------------------------------------------------------------------------

describe('validatePreviewDatabaseIdentity', () => {
  it('returns ok=true when both URLs are valid and distinct', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(true);
    expect(result.distinct).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.transactional.ok).toBe(true);
    expect(result.audit.ok).toBe(true);
    expect(result.transactional.databaseName).toBe('role_preview_db');
    expect(result.audit.databaseName).toBe('role_preview_audit');
  });

  it('returns ok=false with reason=transactional_invalid when DATABASE_URL is non-preview', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/ibn_hayan_dev',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('transactional_invalid');
    expect(result.transactional.ok).toBe(false);
    expect(result.transactional.reason).toBe('non_preview_database_name');
  });

  it('returns ok=false with reason=audit_invalid when AUDIT_DATABASE_URL is non-preview', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/ibn_hayan_audit_dev',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('audit_invalid');
    expect(result.audit.ok).toBe(false);
    expect(result.audit.reason).toBe('non_preview_database_name');
  });

  it('returns ok=false with reason=transactional_invalid when DATABASE_URL is missing', () => {
    const env: NodeJS.ProcessEnv = {
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('transactional_invalid');
    expect(result.transactional.ok).toBe(false);
    expect(result.transactional.reason).toBe('missing');
  });

  it('returns ok=false with reason=audit_invalid when AUDIT_DATABASE_URL is missing', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('audit_invalid');
    expect(result.audit.ok).toBe(false);
    expect(result.audit.reason).toBe('missing');
  });

  it('returns ok=false when both URLs are missing', () => {
    const env: NodeJS.ProcessEnv = {};
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(false);
    // The transactional check runs first; its failure is the
    // reported reason.
    expect(result.reason).toBe('transactional_invalid');
  });

  it('returns ok=false with reason=databases_not_distinct when both URLs resolve to the same database name', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_db',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('databases_not_distinct');
    expect(result.distinct).toBe(false);
    // Both individual results pass.
    expect(result.transactional.ok).toBe(true);
    expect(result.audit.ok).toBe(true);
  });

  it('returns ok=false with reason=databases_not_distinct even when the URLs differ in credentials/host but resolve to the same database name', () => {
    // Same database name on different hosts — still not distinct.
    // The audit database must be a SEPARATE database, not the same
    // database accessed via a different host.
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@host-a:5432/role_preview_db',
      AUDIT_DATABASE_URL: 'postgresql://user:pass@host-b:5432/role_preview_db',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('databases_not_distinct');
  });

  it('does NOT include any credential or full URL in the pair result', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL:
        'postgresql://secret-user:secret-pass@secret-host:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://secret-user:secret-pass@secret-host:5432/role_preview_audit',
    };
    const result = validatePreviewDatabaseIdentity(env);
    const json = JSON.stringify(result);
    expect(json).not.toContain('secret-user');
    expect(json).not.toContain('secret-pass');
    expect(json).not.toContain('secret-host');
    expect(json).not.toContain('5432');
    expect(json).not.toContain('postgresql://');
  });

  it('returns ok=true when the same preview identifier appears in both distinct database names', () => {
    // Both names contain "role_preview" but are distinct databases.
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_tx',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    const result = validatePreviewDatabaseIdentity(env);
    expect(result.ok).toBe(true);
    expect(result.distinct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Backward-compatible boolean wrappers
// ---------------------------------------------------------------------------

describe('isPreviewTransactionalDatabaseUrl (boolean wrapper)', () => {
  it('returns true for a valid preview URL', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_db',
      ),
    ).toBe(true);
  });

  it('returns false for a production URL', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_prod',
      ),
    ).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPreviewTransactionalDatabaseUrl(undefined)).toBe(false);
  });

  it('returns false when only the username contains the preview identifier', () => {
    expect(
      isPreviewTransactionalDatabaseUrl(
        'postgresql://role_preview_user:pass@localhost:5432/prod',
      ),
    ).toBe(false);
  });
});

describe('isPreviewAuditDatabaseUrl (boolean wrapper)', () => {
  it('returns true for a valid preview audit URL', () => {
    expect(
      isPreviewAuditDatabaseUrl(
        'postgresql://user:pass@localhost:5432/role_preview_audit',
      ),
    ).toBe(true);
  });

  it('returns false for a production audit URL', () => {
    expect(
      isPreviewAuditDatabaseUrl(
        'postgresql://user:pass@localhost:5432/ibn_hayan_audit_prod',
      ),
    ).toBe(false);
  });
});

describe('isPreviewDatabaseIdentityValid (boolean wrapper)', () => {
  it('returns true when both URLs are valid and distinct', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(true);
  });

  it('returns false when the transactional URL is non-preview', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/ibn_hayan_dev',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_audit',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(false);
  });

  it('returns false when the audit URL is non-preview', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/ibn_hayan_audit_dev',
    };
    expect(isPreviewDatabaseIdentityValid(env)).toBe(false);
  });

  it('returns false when the URLs resolve to the same database name', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/role_preview_db',
      AUDIT_DATABASE_URL:
        'postgresql://user:pass@localhost:5432/role_preview_db',
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
    expect(isPreviewDatabaseIdentityValid({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PREVIEW_DATABASE_NAME_IDENTIFIERS constant
// ---------------------------------------------------------------------------

describe('PREVIEW_DATABASE_NAME_IDENTIFIERS', () => {
  it('exports the two approved identifiers', () => {
    expect(PREVIEW_DATABASE_NAME_IDENTIFIERS).toEqual([
      'role_preview',
      'preview_role',
    ]);
  });
});
