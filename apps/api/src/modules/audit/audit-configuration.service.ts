import { Injectable, Logger } from '@nestjs/common';
import {
  AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
  AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER,
  validateAuditKeyPair,
  type KeyValidationResult,
} from '@ibn-hayan/observability';

/**
 * Audit configuration service.
 *
 * Reads and validates the audit-related environment variables:
 * - `AUDIT_DATABASE_URL`: the connection string for the dedicated
 *   audit database.
 * - `AUDIT_INTEGRITY_HMAC_KEY`: the HMAC-SHA-256 integrity key.
 * - `AUDIT_INTEGRITY_KEY_VERSION`: the integrity key version
 *   (positive integer).
 * - `AUDIT_IDENTIFIER_HMAC_KEY`: the HMAC-SHA-256 identifier key
 *   for failed-login privacy.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * integrity key has at least 256 bits of entropy, the identifier
 * key is separate from the integrity key, insecure placeholder
 * values are rejected outside tests, and production refuses to
 * start when required audit configuration is invalid.
 *
 * The service exposes the validated configuration through getter
 * methods. The dispatcher, the verifier, the audit-emission API,
 * and the audit-store repository consume this service.
 */
@Injectable()
export class AuditConfigurationService {
  private readonly logger = new Logger(AuditConfigurationService.name);

  private readonly auditDatabaseUrl: string | null;
  private readonly integrityHmacKey: string;
  private readonly integrityKeyVersion: number;
  private readonly identifierHmacKey: string;
  private readonly allowPlaceholders: boolean;

  constructor() {
    this.auditDatabaseUrl = process.env['AUDIT_DATABASE_URL'] ?? null;
    this.integrityHmacKey = process.env['AUDIT_INTEGRITY_HMAC_KEY'] ?? '';
    this.identifierHmacKey = process.env['AUDIT_IDENTIFIER_HMAC_KEY'] ?? '';

    const versionRaw = process.env['AUDIT_INTEGRITY_KEY_VERSION'] ?? '1';
    const parsedVersion = Number.parseInt(versionRaw, 10);
    this.integrityKeyVersion = Number.isSafeInteger(parsedVersion)
      ? parsedVersion
      : 1;

    // Placeholders are allowed in tests and in development. In
    // production, the placeholder is rejected. The detection is
    // based on NODE_ENV: production refuses placeholders; non-
    // production allows them.
    const nodeEnv = process.env['NODE_ENV'] ?? 'development';
    this.allowPlaceholders = nodeEnv !== 'production';

    // Validate the keys at construction time. In production, an
    // invalid key configuration causes the service to throw, which
    // prevents the API from starting. In non-production, the
    // placeholder is allowed but a warning is logged.
    const result = this.validateConfiguration();
    if (!result.ok && !this.allowPlaceholders) {
      throw new Error(
        `Audit configuration is invalid in production: ${result.reason} — ${result.detail}`,
      );
    }
    if (!result.ok && this.allowPlaceholders) {
      this.logger.warn(
        `Audit configuration is invalid (allowed in non-production): ${result.reason} — ${result.detail}. ` +
          'The audit store will not accept events until the configuration is fixed.',
      );
    }
  }

  /**
   * The audit database connection string, or null if
   * `AUDIT_DATABASE_URL` is not set.
   */
  getAuditDatabaseUrl(): string | null {
    return this.auditDatabaseUrl;
  }

  /**
   * The integrity HMAC key. Returns the raw string value.
   */
  getIntegrityHmacKey(): string {
    return this.integrityHmacKey;
  }

  /**
   * The integrity key version. A positive integer.
   */
  getIntegrityKeyVersion(): number {
    return this.integrityKeyVersion;
  }

  /**
   * The identifier HMAC key. Returns the raw string value.
   */
  getIdentifierHmacKey(): string {
    return this.identifierHmacKey;
  }

  /**
   * Whether placeholder key values are allowed (non-production).
   */
  isPlaceholderAllowed(): boolean {
    return this.allowPlaceholders;
  }

  /**
   * Validate the audit key pair. Returns the validation result
   * without throwing.
   */
  validateConfiguration(): KeyValidationResult {
    return validateAuditKeyPair(
      this.integrityHmacKey,
      this.identifierHmacKey,
      this.allowPlaceholders,
    );
  }

  /**
   * The documented placeholder for the integrity key. Exposed for
   * tests that need to verify the placeholder is rejected in
   * production mode.
   */
  static readonly INTEGRITY_KEY_PLACEHOLDER =
    AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER;

  /**
   * The documented placeholder for the identifier key.
   */
  static readonly IDENTIFIER_KEY_PLACEHOLDER =
    AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER;
}
