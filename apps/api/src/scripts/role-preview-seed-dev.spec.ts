import { describe, it, expect } from 'vitest';
import {
  readSeedEnv,
  RolePreviewSeedEnvError,
} from './role-preview-seed-dev.js';

/**
 * Unit tests for the role-preview seed's `readSeedEnv()` function.
 *
 * These tests verify the Phase 4 seed-safety requirements:
 *
 * 1. missing `DATABASE_URL` rejected
 * 2. malformed `DATABASE_URL` rejected
 * 3. normal transactional DB name rejected
 * 4. missing `AUDIT_DATABASE_URL` rejected
 * 5. malformed `AUDIT_DATABASE_URL` rejected
 * 6. normal audit DB name rejected
 * 7. identical transactional and audit databases rejected
 * 8. Preview transactional and Preview audit database pair accepted
 * 9. production rejected
 * 10. disabled feature rejected
 * 11. missing seed authorization rejected
 * 12. missing or invalid Preview password rejected
 * 13. no complete URL or credential appears in errors or logs
 *
 * The tests construct an env record and call `readSeedEnv(env)`
 * directly. The function is pure: it does NOT touch `process.env`,
 * does NOT connect to a database, and does NOT spawn any subprocess.
 * The seed's `main()` is NOT invoked because the entry-point guard
 * in `role-preview-seed-dev.ts` detects that the file is being
 * imported as a module (not run as a script).
 */

const VALID_TX_URL = 'postgresql://user:pass@localhost:5432/role_preview_db';
const VALID_AUDIT_URL =
  'postgresql://user:pass@localhost:5432/role_preview_audit';
const VALID_PASSWORD = 'test-preview-password-32-chars-long!';

/**
 * A minimal valid env record. Individual tests override fields to
 * exercise the rejection paths.
 */
function makeValidEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'development',
    ALLOW_ROLE_PREVIEW_SEED: 'true',
    IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true',
    IBN_HAYAN_ROLE_PREVIEW_PASSWORD: VALID_PASSWORD,
    DATABASE_URL: VALID_TX_URL,
    AUDIT_DATABASE_URL: VALID_AUDIT_URL,
  };
}

describe('readSeedEnv — Phase 4 seed-safety requirements', () => {
  // -------------------------------------------------------------------
  // 8. Preview transactional and Preview audit database pair accepted
  // -------------------------------------------------------------------
  it('8. accepts a valid Preview transactional + Preview audit database pair', () => {
    const env = makeValidEnv();
    const result = readSeedEnv(env);
    expect(result.databaseUrl).toBe(VALID_TX_URL);
    expect(result.auditDatabaseUrl).toBe(VALID_AUDIT_URL);
    expect(result.previewPassword).toBe(VALID_PASSWORD);
    expect(result.databaseIdentity.ok).toBe(true);
    expect(result.databaseIdentity.distinct).toBe(true);
    expect(result.databaseIdentity.transactional.databaseName).toBe(
      'role_preview_db',
    );
    expect(result.databaseIdentity.audit.databaseName).toBe(
      'role_preview_audit',
    );
  });

  // -------------------------------------------------------------------
  // 1. missing DATABASE_URL rejected
  // -------------------------------------------------------------------
  it('1. rejects a missing DATABASE_URL', () => {
    const env = makeValidEnv();
    delete env['DATABASE_URL'];
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      expect(err).toBeInstanceOf(RolePreviewSeedEnvError);
      const msg = (err as Error).message;
      expect(msg).toContain('DATABASE_URL');
      // Safe error: no full URL, no credential.
      expect(msg).not.toContain('postgresql://');
      expect(msg).not.toContain('user:pass');
    }
  });

  // -------------------------------------------------------------------
  // 2. malformed DATABASE_URL rejected
  // -------------------------------------------------------------------
  it('2. rejects a malformed DATABASE_URL', () => {
    const env = makeValidEnv();
    env['DATABASE_URL'] = 'not-a-valid-url';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
  });

  // -------------------------------------------------------------------
  // 3. normal transactional DB name rejected
  // -------------------------------------------------------------------
  it('3. rejects a normal (non-preview) transactional DB name', () => {
    const env = makeValidEnv();
    env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/ibn_hayan_dev';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('DATABASE_URL');
      expect(msg).toContain('non_preview_database_name');
      // Safe error: no full URL, no credential, no hostname.
      expect(msg).not.toContain('postgresql://');
      expect(msg).not.toContain('user:pass');
      expect(msg).not.toContain('localhost');
    }
  });

  // -------------------------------------------------------------------
  // 4. missing AUDIT_DATABASE_URL rejected
  // -------------------------------------------------------------------
  it('4. rejects a missing AUDIT_DATABASE_URL', () => {
    const env = makeValidEnv();
    delete env['AUDIT_DATABASE_URL'];
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('AUDIT_DATABASE_URL');
      expect(msg).not.toContain('postgresql://');
    }
  });

  // -------------------------------------------------------------------
  // 5. malformed AUDIT_DATABASE_URL rejected
  // -------------------------------------------------------------------
  it('5. rejects a malformed AUDIT_DATABASE_URL', () => {
    const env = makeValidEnv();
    env['AUDIT_DATABASE_URL'] = 'not-a-valid-url';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
  });

  // -------------------------------------------------------------------
  // 6. normal audit DB name rejected
  // -------------------------------------------------------------------
  it('6. rejects a normal (non-preview) audit DB name', () => {
    const env = makeValidEnv();
    env['AUDIT_DATABASE_URL'] =
      'postgresql://user:pass@localhost:5432/ibn_hayan_audit_dev';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('AUDIT_DATABASE_URL');
      expect(msg).toContain('non_preview_database_name');
      expect(msg).not.toContain('postgresql://');
      expect(msg).not.toContain('localhost');
    }
  });

  // -------------------------------------------------------------------
  // 7. identical transactional and audit databases rejected
  // -------------------------------------------------------------------
  it('7. rejects identical transactional and audit database names', () => {
    const env = makeValidEnv();
    env['AUDIT_DATABASE_URL'] = VALID_TX_URL; // same as DATABASE_URL
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('distinct');
      // Safe error: no full URL.
      expect(msg).not.toContain('postgresql://');
    }
  });

  // -------------------------------------------------------------------
  // 9. production rejected
  // -------------------------------------------------------------------
  it('9. rejects production mode (NODE_ENV=production)', () => {
    const env = makeValidEnv();
    env['NODE_ENV'] = 'production';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('production');
    }
  });

  // -------------------------------------------------------------------
  // 10. disabled feature rejected
  // -------------------------------------------------------------------
  it('10. rejects a disabled feature flag (IBN_HAYAN_ROLE_PREVIEW_ENABLED != "true")', () => {
    const env = makeValidEnv();
    env['IBN_HAYAN_ROLE_PREVIEW_ENABLED'] = 'false';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('IBN_HAYAN_ROLE_PREVIEW_ENABLED');
    }
  });

  // -------------------------------------------------------------------
  // 11. missing seed authorization rejected
  // -------------------------------------------------------------------
  it('11. rejects a missing ALLOW_ROLE_PREVIEW_SEED flag', () => {
    const env = makeValidEnv();
    delete env['ALLOW_ROLE_PREVIEW_SEED'];
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('ALLOW_ROLE_PREVIEW_SEED');
    }
  });

  // -------------------------------------------------------------------
  // 12. missing or invalid Preview password rejected
  // -------------------------------------------------------------------
  it('12a. rejects a missing Preview password', () => {
    const env = makeValidEnv();
    delete env['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'];
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
  });

  it('12b. rejects an empty Preview password', () => {
    const env = makeValidEnv();
    env['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'] = '';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
  });

  it('12c. rejects a whitespace-only Preview password', () => {
    const env = makeValidEnv();
    env['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'] = '    ';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
  });

  it('12d. rejects a too-short Preview password', () => {
    const env = makeValidEnv();
    env['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'] = 'short';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
  });

  // -------------------------------------------------------------------
  // 13. no complete URL or credential appears in errors or logs
  // -------------------------------------------------------------------
  it('13. no complete URL, credential, username, password, hostname, port, or query string appears in any error message', () => {
    // Exercise every rejection path and collect the error messages.
    const cases: Array<{ name: string; env: NodeJS.ProcessEnv }> = [
      {
        name: 'missing DATABASE_URL',
        env: (() => {
          const e = makeValidEnv();
          delete e['DATABASE_URL'];
          return e;
        })(),
      },
      {
        name: 'malformed DATABASE_URL',
        env: (() => {
          const e = makeValidEnv();
          e['DATABASE_URL'] = 'not-a-valid-url';
          return e;
        })(),
      },
      {
        name: 'non-preview transactional DB',
        env: (() => {
          const e = makeValidEnv();
          e['DATABASE_URL'] =
            'postgresql://secret-user:secret-pass@secret-host:5432/prod';
          return e;
        })(),
      },
      {
        name: 'missing AUDIT_DATABASE_URL',
        env: (() => {
          const e = makeValidEnv();
          delete e['AUDIT_DATABASE_URL'];
          return e;
        })(),
      },
      {
        name: 'malformed AUDIT_DATABASE_URL',
        env: (() => {
          const e = makeValidEnv();
          e['AUDIT_DATABASE_URL'] = 'not-a-valid-url';
          return e;
        })(),
      },
      {
        name: 'non-preview audit DB',
        env: (() => {
          const e = makeValidEnv();
          e['AUDIT_DATABASE_URL'] =
            'postgresql://secret-user:secret-pass@secret-host:5432/prod';
          return e;
        })(),
      },
      {
        name: 'identical DBs',
        env: (() => {
          const e = makeValidEnv();
          e['AUDIT_DATABASE_URL'] = VALID_TX_URL;
          return e;
        })(),
      },
      {
        name: 'production mode',
        env: (() => {
          const e = makeValidEnv();
          e['NODE_ENV'] = 'production';
          return e;
        })(),
      },
      {
        name: 'disabled feature',
        env: (() => {
          const e = makeValidEnv();
          e['IBN_HAYAN_ROLE_PREVIEW_ENABLED'] = 'false';
          return e;
        })(),
      },
      {
        name: 'missing seed auth',
        env: (() => {
          const e = makeValidEnv();
          delete e['ALLOW_ROLE_PREVIEW_SEED'];
          return e;
        })(),
      },
      {
        name: 'missing password',
        env: (() => {
          const e = makeValidEnv();
          delete e['IBN_HAYAN_ROLE_PREVIEW_PASSWORD'];
          return e;
        })(),
      },
    ];

    for (const { name, env } of cases) {
      let capturedMessage: string | null = null;
      try {
        readSeedEnv(env);
      } catch (err) {
        capturedMessage = (err as Error).message;
      }
      expect(capturedMessage, `case: ${name}`).not.toBeNull();
      const msg = capturedMessage as string;
      // No full URL.
      expect(msg, `case: ${name}`).not.toContain('postgresql://');
      expect(msg, `case: ${name}`).not.toContain('postgres://');
      // No credentials.
      expect(msg, `case: ${name}`).not.toContain('secret-user');
      expect(msg, `case: ${name}`).not.toContain('secret-pass');
      expect(msg, `case: ${name}`).not.toContain(VALID_PASSWORD);
      // No hostname (the error messages must not echo the hostname).
      expect(msg, `case: ${name}`).not.toContain('secret-host');
      // No port.
      expect(msg, `case: ${name}`).not.toContain('5432');
    }
  });

  // -------------------------------------------------------------------
  // Additional: does not false-positive on username-only matches
  // -------------------------------------------------------------------
  it('rejects a URL where only the username contains the preview identifier (no false positive)', () => {
    const env = makeValidEnv();
    env['DATABASE_URL'] =
      'postgresql://role_preview_user:pass@localhost:5432/prod';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
    try {
      readSeedEnv(env);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('non_preview_database_name');
    }
  });

  // -------------------------------------------------------------------
  // Additional: does not false-positive on hostname-only matches
  // -------------------------------------------------------------------
  it('rejects a URL where only the hostname contains the preview identifier (no false positive)', () => {
    const env = makeValidEnv();
    env['DATABASE_URL'] =
      'postgresql://user:pass@role-preview-db.example.com:5432/prod';
    expect(() => readSeedEnv(env)).toThrow(RolePreviewSeedEnvError);
  });

  // -------------------------------------------------------------------
  // Additional: accepts the postgres:// scheme
  // -------------------------------------------------------------------
  it('accepts the legacy postgres:// scheme', () => {
    const env = makeValidEnv();
    env['DATABASE_URL'] = 'postgres://user:pass@localhost:5432/role_preview_db';
    expect(() => readSeedEnv(env)).not.toThrow();
  });
});
