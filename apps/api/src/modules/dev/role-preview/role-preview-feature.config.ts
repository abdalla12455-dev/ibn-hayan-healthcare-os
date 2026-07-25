import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Development-only Role Preview Mode feature gate.
 *
 * Per the Demo Role Preview Mode v1 specification, the entire Role
 * Preview feature is development-only and MUST be completely
 * unavailable in production. This service is the single
 * authoritative backend-controlled gate that the preview
 * controllers, the preview seed script, and the preview frontend
 * consult to determine whether the feature is enabled.
 *
 * Rules (per the specification):
 * - The feature is **disabled by default**. The
 *   `IBN_HAYAN_ROLE_PREVIEW_ENABLED` environment variable must be
 *   explicitly set to the exact string `true` for the feature to
 *   be enabled.
 * - The feature is **disabled in production** unconditionally.
 *   When `NODE_ENV === 'production'`, the gate returns `false`
 *   regardless of the value of `IBN_HAYAN_ROLE_PREVIEW_ENABLED`.
 *   This is the structural fail-closed posture: an accidental
 *   `IBN_HAYAN_ROLE_PREVIEW_ENABLED=true` in production does NOT
 *   enable the feature.
 * - The backend is authoritative. A public frontend environment
 *   variable must never be sufficient to enable the feature. The
 *   frontend must consult a backend endpoint (the role-preview
 *   availability endpoint) that itself consults this gate.
 * - When disabled, preview APIs refuse to act, the `/role-preview`
 *   frontend route shows a safe unavailable result, the
 *   role-switcher control is absent, and the preview seed must
 *   not run.
 *
 * The service is intentionally a pure reader of `ConfigService`
 * and `process.env.NODE_ENV`. It does NOT mutate any state, does
 * NOT log the value of the flag at info level (only debug), and
 * does NOT expose the flag's value through any endpoint. The
 * availability endpoint exposes only the **boolean** decision
 * (`true`/`false`), never the raw flag.
 *
 * Per AGENTS.md invariant 5 (Secret Hygiene), the feature flag is
 * not a secret; it is a boolean configuration value. It is safe to
 * document in `.env.example`. The flag does NOT carry any
 * credential, token, password, database URL, or private key
 * material.
 */
@Injectable()
export class RolePreviewFeatureConfig {
  private readonly logger = new Logger(RolePreviewFeatureConfig.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Returns `true` only when ALL of the following are true:
   *
   * 1. `NODE_ENV` is not `'production'` (production fails closed).
   * 2. `IBN_HAYAN_ROLE_PREVIEW_ENABLED` is the exact string `'true'`.
   *
   * Returns `false` for any other combination, including:
   * - `NODE_ENV === 'production'` (fail-closed regardless of the flag).
   * - `IBN_HAYAN_ROLE_PREVIEW_ENABLED` unset or empty.
   * - `IBN_HAYAN_ROLE_PREVIEW_ENABLED` set to `'1'`, `'yes'`, `'on'`,
   *   `'TRUE'` (case-sensitive match required), or any other value.
   *
   * The strict equality check is the structural defence-in-depth
   * against accidental enablement. The case-sensitive match
   * prevents locale-specific truthiness quirks from enabling the
   * feature; the consumer must opt in with the exact lowercase
   * string `'true'`.
   */
  isRolePreviewEnabled(): boolean {
    const nodeEnv = this.readNodeEnv();
    if (nodeEnv === 'production') {
      // Production fails closed UNCONDITIONALLY. Even if the flag
      // is accidentally `true`, the feature must be unavailable.
      // Emit a debug-level log so the operator can audit the
      // configuration without the flag value being printed at
      // info level.
      this.logger.debug(
        'Role Preview Mode is disabled in production (fail-closed).',
      );
      return false;
    }

    const flag = this.readRolePreviewFlag();
    if (flag !== 'true') {
      // Any value other than the exact string 'true' is treated
      // as disabled. This is the default-deny posture.
      return false;
    }

    this.logger.debug(
      'Role Preview Mode is ENABLED (development only; NODE_ENV != production).',
    );
    return true;
  }

  /**
   * Read the `NODE_ENV` environment variable. Exposed as a private
   * method so that tests can override it via a subclass spy if
   * needed. The value is read directly from `process.env` to avoid
   * any ambiguity introduced by `ConfigService` caching.
   */
  private readNodeEnv(): string | undefined {
    // Read directly from process.env so that test overrides take
    // effect without needing to construct a new ConfigService.
    return process.env['NODE_ENV'];
  }

  /**
   * Read the `IBN_HAYAN_ROLE_PREVIEW_ENABLED` environment variable
   * through `ConfigService`. Per the specification, only the
   * backend is authoritative; the flag is read from the
   * server-side environment, never from the client.
   */
  private readRolePreviewFlag(): string | undefined {
    const value = this.config.get<string>('IBN_HAYAN_ROLE_PREVIEW_ENABLED');
    if (value === undefined) {
      return undefined;
    }
    return value.trim();
  }
}
