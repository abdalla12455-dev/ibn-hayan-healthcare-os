/**
 * Safety gate for first Platform Super Administrator provisioning.
 * This operation is permitted ONLY for the existing isolated local
 * development databases. It is never a production provisioning API.
 */
export interface PlatformBootstrapEnvironment {
  readonly databaseUrl: string;
  readonly auditDatabaseUrl: string;
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
}

export class PlatformBootstrapPolicyError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'PlatformBootstrapPolicyError';
  }
}

function reject(code: string): never {
  throw new PlatformBootstrapPolicyError(code);
}

function validateLocalUrl(
  raw: string | undefined,
  expectedDatabase: string,
): string {
  if (!raw) reject('DATABASE_URL_MISSING');

  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    return reject('DATABASE_URL_INVALID');
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    reject('DATABASE_PROTOCOL_INVALID');
  }

  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '55432') {
    reject('DATABASE_TARGET_NOT_APPROVED');
  }

  if (
    parsed.pathname !== `/${expectedDatabase}` ||
    !parsed.username ||
    !parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    reject('DATABASE_IDENTITY_INVALID');
  }

  return raw;
}

export function validatePlatformBootstrapEnvironment(
  env: NodeJS.ProcessEnv,
): PlatformBootstrapEnvironment {
  if (env['NODE_ENV'] !== 'development') {
    reject('DEVELOPMENT_MODE_REQUIRED');
  }

  if (env['ALLOW_DEV_PLATFORM_ADMIN_BOOTSTRAP'] !== 'true') {
    reject('EXPLICIT_BOOTSTRAP_FLAG_REQUIRED');
  }

  const databaseUrl = validateLocalUrl(
    env['DATABASE_URL'],
    'ibn_hayan_app_dev',
  );

  const auditDatabaseUrl = validateLocalUrl(
    env['AUDIT_DATABASE_URL'],
    'ibn_hayan_audit_dev',
  );

  const email = (env['DEV_PLATFORM_ADMIN_EMAIL'] ?? '').trim().toLowerCase();

  const displayName = (env['DEV_PLATFORM_ADMIN_DISPLAY_NAME'] ?? '').trim();

  const password = env['DEV_PLATFORM_ADMIN_PASSWORD'] ?? '';

  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    reject('ADMIN_EMAIL_INVALID');
  }

  if (displayName.length === 0 || displayName.length > 200) {
    reject('ADMIN_DISPLAY_NAME_INVALID');
  }

  if (
    password.length < 12 ||
    password.length > 128 ||
    password.trim().length === 0
  ) {
    reject('ADMIN_PASSWORD_INVALID');
  }

  return {
    databaseUrl,
    auditDatabaseUrl,
    email,
    displayName,
    password,
  };
}
