import { Injectable, Inject, Logger } from '@nestjs/common';
import { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
import {
  readPreviewPasswordFromEnv,
  PreviewPasswordMissingError,
} from './preview-password.js';

/**
 * Start-up validator for the server-only preview password.
 *
 * Per the Secure Demo Role Preview Mode v1 correction specification,
 * when Demo Role Preview Mode is enabled (the
 * {@link RolePreviewFeatureConfig} gate returns `true`), the
 * application MUST refuse to start when the
 * `IBN_HAYAN_ROLE_PREVIEW_PASSWORD` environment variable is missing,
 * empty, whitespace-only, or shorter than
 * `MIN_PREVIEW_PASSWORD_LENGTH`. This is the fail-safe posture
 * required by the specification: "development preview startup must
 * fail safely when missing".
 *
 * When the gate returns `false` (production, or development with
 * the flag disabled), the validator does NOT read or validate the
 * password. This satisfies "normal production and normal
 * development startup with preview disabled must not require it".
 *
 * The validator is a NestJS `@Injectable` provider whose constructor
 * performs the check. NestJS constructs providers eagerly when the
 * module is loaded; a constructor throw prevents the application
 * from starting. This is the structural enforcement of the
 * fail-safe requirement.
 *
 * The validator NEVER:
 * - exposes the password value through any method or property;
 * - logs the password value (only the variable name and a generic
 *   "missing or invalid" message are logged at error level);
 * - returns the password to any caller;
 * - stores the password in any field.
 *
 * The validator's only public surface is its existence (the
 * constructor either succeeds silently or throws). The seed script
 * reads the password independently through
 * `readPreviewPasswordFromEnv(process.env)` because it does not
 * participate in NestJS DI.
 */
@Injectable()
export class RolePreviewPasswordValidator {
  private readonly logger = new Logger(RolePreviewPasswordValidator.name);

  constructor(
    @Inject(RolePreviewFeatureConfig)
    featureConfig: RolePreviewFeatureConfig,
  ) {
    if (featureConfig.isRolePreviewEnabled()) {
      // The gate is enabled. The password MUST be present and
      // well-formed. `readPreviewPasswordFromEnv` throws
      // `PreviewPasswordMissingError` when the value is missing,
      // empty, whitespace-only, or too short. The throw prevents
      // the application from starting.
      try {
        // Read and immediately discard. The value is NOT stored on
        // `this`; the seed script re-reads it from `process.env`
        // when it needs to hash and persist it.
        readPreviewPasswordFromEnv(process.env);
      } catch (err) {
        if (err instanceof PreviewPasswordMissingError) {
          // Log a generic error message that does NOT include the
          // supplied value. The error message itself (from
          // `PreviewPasswordMissingError`) is safe: it names only
          // the variable and the minimum length.
          this.logger.error(err.message);
        }
        throw err;
      }
    }
    // When the gate is disabled, do nothing. The password is not
    // required, not read, and not validated.
  }
}
