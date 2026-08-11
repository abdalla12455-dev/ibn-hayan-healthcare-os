import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Consent-gate feature configuration service.
 *
 * Per the operator-ratified product decision (Stage 2A specification item
 * 8H): "Consent must be treated as a configuration-gated clinical-safety
 * check with the canonical emergency carve-out."
 *
 * This service is the single authoritative backend-controlled gate that
 * the Encounters service consults to determine whether the consent check
 * is enforced before encounter creation. It mirrors the established
 * {@link RolePreviewFeatureConfig} pattern: a pure reader of
 * `ConfigService` and `process.env.NODE_ENV` that does NOT mutate state,
 * does NOT log the flag's value at info level, and does NOT expose the
 * flag's value through any endpoint.
 *
 * Consent-gate rules:
 *
 * 1. **Default ON (fail-safe).** The gate is enforced by default. The
 *    `IBN_HAYAN_CONSENT_GATE_ENABLED` environment variable must be
 *    explicitly set to the exact string `false` for the gate to be
 *    disabled. This is the OPPOSITE polarity from the Role Preview gate
 *    (which is default-off), because consent is a safety check: the
 *    safe default is to enforce. An unset or empty variable means the
 *    gate IS enforced.
 *
 * 2. **Production is ALWAYS enforced.** When `NODE_ENV === 'production'`,
 *    the gate returns `true` (enforced) regardless of the value of
 *    `IBN_HAYAN_CONSENT_GATE_ENABLED`. This is the structural fail-closed
 *    posture: an accidental `IBN_HAYAN_CONSENT_GATE_ENABLED=false` in
 *    production does NOT disable the consent check. Consent cannot be
 *    silently bypassed in production by configuration alone.
 *
 * 3. **The gate is a safety check, not a consent source.** When the gate
 *    is enforced, the Encounters service cannot verify consent (BC01 does
 *    not persist consent records yet), so the encounter is blocked
 *    (fail-safe) UNLESS the emergency carve-out applies. The gate never
 *    fabricates consent; it never treats missing consent infrastructure
 *    as consent granted. The emergency carve-out is the ONLY path through
 *    the enforced gate, and it is explicit, authorized, justified, and
 *    audited.
 *
 * 4. **Disabling the gate is a development convenience only.** When the
 *    gate is disabled (non-production + explicit `false`), the Encounters
 *    service skips the consent check entirely. This is intended ONLY for
 *    local development and integration testing where a consent source is
 *    not yet wired. It must NEVER be used in production. The audit event
 *    for a non-emergency encounter created while the gate is disabled
 *    carries `consentGateEnforced: false` in its metadata so the
 *    disablement is auditable.
 *
 * Per AGENTS.md invariant 5 (Secret Hygiene), the feature flag is not a
 * secret; it is a boolean configuration value. It is safe to document in
 * `.env.example`. The flag does NOT carry any credential, token,
 * password, database URL, or private key material.
 */
@Injectable()
export class ConsentGateFeatureConfig {
  private readonly logger = new Logger(ConsentGateFeatureConfig.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Returns `true` (enforced) when ALL of the following are true:
   *
   * 1. `NODE_ENV === 'production'` (production is ALWAYS enforced,
   *    fail-closed regardless of the flag), OR
   * 2. `IBN_HAYAN_CONSENT_GATE_ENABLED` is NOT the exact string `false`
   *    (default-on: unset, empty, `'true'`, `'1'`, `'yes'`, or any other
   *    value all mean enforced).
   *
   * Returns `false` (disabled) ONLY when:
   * 1. `NODE_ENV !== 'production'`, AND
   * 2. `IBN_HAYAN_CONSENT_GATE_ENABLED` is the exact string `false`
   *    (case-sensitive).
   *
   * The strict equality check (`=== 'false'`) is the structural
   * defence-in-depth against accidental disablement. The case-sensitive
   * match prevents locale-specific falsiness quirks.
   */
  isConsentGateEnabled(): boolean {
    const nodeEnv = this.readNodeEnv();
    if (nodeEnv === 'production') {
      // Production enforces the gate UNCONDITIONALLY. Even if the flag
      // is accidentally 'false', the consent check must run. This is
      // the fail-closed safety posture.
      this.logger.debug(
        'Consent gate is enforced in production (fail-closed).',
      );
      return true;
    }

    const flag = this.readConsentGateFlag();
    if (flag === 'false') {
      // The ONLY way to disable the gate (non-production + explicit
      // exact-string 'false'). This is a development convenience.
      this.logger.debug(
        'Consent gate is DISABLED (development only; NODE_ENV != production).',
      );
      return false;
    }

    // Default-on: any other value (unset, empty, 'true', etc.) means
    // the gate is enforced.
    return true;
  }

  /**
   * Read the `NODE_ENV` environment variable directly from `process.env`
   * so that test overrides take effect without constructing a new
   * ConfigService.
   */
  private readNodeEnv(): string | undefined {
    return process.env['NODE_ENV'];
  }

  /**
   * Read the `IBN_HAYAN_CONSENT_GATE_ENABLED` environment variable
   * through `ConfigService`. The backend is authoritative; the flag is
   * read from the server-side environment, never from the client.
   */
  private readConsentGateFlag(): string | undefined {
    const value = this.config.get<string>('IBN_HAYAN_CONSENT_GATE_ENABLED');
    if (value === undefined) {
      return undefined;
    }
    return value.trim();
  }
}
