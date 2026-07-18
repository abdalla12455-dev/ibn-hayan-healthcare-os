import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { LocalCredentialService } from '../../infrastructure/database/index.js';
import type { UserId } from '@ibn-hayan/domain';
import {
  ARGON2_DEFAULT_MEMORY_COST,
  ARGON2_DEFAULT_PARALLELISM,
  ARGON2_DEFAULT_TIME_COST,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './auth.constants.js';

/**
 * Password-hashing service.
 *
 * Wraps the `argon2` npm package to centralise Argon2id hashing and
 * verification. Per ADR-013 §1.1, §3.4, and §5.3, Argon2id is the
 * ratified password-hashing algorithm; parameters (memory cost,
 * time cost, parallelism) are "centrally configured" — read from
 * environment variables via `ConfigService` at construction time,
 * with conservative defaults.
 *
 * Responsibilities:
 * - Hash a plaintext password through Argon2id. Returns the PHC-
 *   string-formatted hash (e.g.
 *   `$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>`).
 * - Verify a plaintext password against a stored PHC-string hash.
 *   Uses argon2's constant-time comparison internally.
 *
 * Non-responsibilities:
 * - This service does NOT persist the hash. Persistence is the
 *   responsibility of `LocalCredentialService`, which is called by
 *   the `AuthService` after hashing.
 * - This service does NOT log the plaintext password, the hash, or
 *   any parameter that could reveal either. Per CODING_STANDARDS.md
 *   §8 and ADR-013 §1.1 point 12, no credentials may appear in logs.
 * - This service does NOT enforce password length or composition.
 *   The contract schema enforces length at the API boundary; this
 *   service trusts the caller to supply a validated password.
 *   `validatePasswordLength` is provided as a convenience for the
 *   bootstrap command and future password-change flows.
 *
 * Timing-attack resistance:
 * - `argon2.verify` uses constant-time comparison internally. The
 *   `argon2` package does not expose timing details through its
 *   public API; the boolean return value is the only signal.
 * - The caller (the `AuthService`) MUST NOT branch on the reason
 *   for a verification failure (the password hash is null, the hash
 *   is malformed, or the password does not match). All three cases
 *   produce the same generic 401 response.
 */
@Injectable()
export class PasswordService {
  private readonly memoryCost: number;
  private readonly timeCost: number;
  private readonly parallelism: number;

  constructor(private readonly credentials: LocalCredentialService) {
    // Read Argon2id parameters from the process environment. This is
    // consistent with how PrismaService reads DATABASE_URL and avoids
    // a ConfigService circular-dependency concern. Fall back to the
    // conservative defaults defined in auth.constants.ts when the
    // environment variables are absent or malformed.
    this.memoryCost = readPositiveIntFromEnv(
      'ARGON2_MEMORY_COST',
      ARGON2_DEFAULT_MEMORY_COST,
    );
    this.timeCost = readPositiveIntFromEnv(
      'ARGON2_TIME_COST',
      ARGON2_DEFAULT_TIME_COST,
    );
    this.parallelism = readPositiveIntFromEnv(
      'ARGON2_PARALLELISM',
      ARGON2_DEFAULT_PARALLELISM,
    );
  }

  /**
   * Hash a plaintext password through Argon2id.
   *
   * Returns the PHC-string-formatted hash. The hash includes the
   * salt, the parameters, and the version, so parameter changes
   * are forward-compatible (a hash produced with the old parameters
   * verifies correctly after the parameters are updated).
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
    });
  }

  /**
   * Verify a plaintext password against a stored PHC-string hash.
   *
   * Returns `true` if the password matches the hash, `false`
   * otherwise. Uses argon2's constant-time comparison internally;
   * the boolean return value is the only signal exposed.
   *
   * If the hash is malformed or the argon2 library throws, this
   * method returns `false` rather than throwing. The caller
   * (`AuthService.login`) treats `false` identically to a genuine
   * mismatch: the login attempt fails with a generic 401. This
   * prevents a malformed-hash error from leaking account state.
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Verify the plaintext password submitted at login against the
   * stored hash for the given user.
   *
   * Returns `true` if the user has a credential and the password
   * matches; `false` otherwise. Returns `false` if the user has no
   * credential (treated identically to a wrong password — the login
   * attempt fails with a generic 401).
   */
  async verifyForUser(userId: UserId, password: string): Promise<boolean> {
    const hash = await this.credentials.getPasswordHash(userId);
    if (hash === null) {
      return false;
    }
    return this.verify(password, hash);
  }

  /**
   * Validate that a password meets the length requirements.
   * Returns `null` if valid, or an error message if invalid.
   *
   * Used by the development bootstrap command and by future
   * password-change flows. The contract schema enforces length at
   * the API boundary; this method is for service-layer validation.
   */
  validatePasswordLength(password: string): string | null {
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`;
    }
    return null;
  }
}

/**
 * Read a positive integer from the process environment, with a fallback.
 *
 * Returns the fallback when the variable is absent or not a positive
 * integer. This is a soft-fail posture: a misconfigured parameter
 * does not crash the API; it falls back to the conservative default.
 */
function readPositiveIntFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.length === 0) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
