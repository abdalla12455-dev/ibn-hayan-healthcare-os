import { Injectable } from '@nestjs/common';
import type { UserId } from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';

/**
 * Infrastructure-only service for the `LocalCredential` row.
 *
 * The `LocalCredential` model stores the Argon2id password hash for a
 * User. It is NOT exposed through a domain port or a domain type: the
 * password hash never leaves the infrastructure layer. The
 * `PasswordService` (in `apps/api/src/modules/auth/`) consumes this
 * service to write and read hashes; the `AuthService` consumes the
 * `PasswordService` to verify passwords at login and to hash
 * passwords at user creation.
 *
 * Responsibilities:
 * - Insert a new LocalCredential row for a user. There is exactly one
 *   credential per user (the `user_id` column is the primary key).
 *   A duplicate insert raises a Prisma
 *   `PrismaClientKnownRequestError` with code `P2002`, which the API
 *   exception layer translates to a 409 Conflict.
 * - Read the password hash for a user. Returns `null` if no
 *   credential exists. Used at login to verify the submitted
 *   password against the stored hash.
 * - Update the password hash for a user. Used by the development
 *   bootstrap command to update the dev user's password idempotently
 *   and by the (future) password-change flow.
 *
 * Non-responsibilities:
 * - This service does NOT perform Argon2id hashing or verification.
 *   That is the responsibility of the `PasswordService` in the auth
 *   module. This service stores and retrieves the hash string only.
 * - This service does NOT log the password hash, the user ID, or any
 *   credential material. Per CODING_STANDARDS.md §8 and ADR-013 §1.1
 *   point 12, no credentials may appear in logs.
 * - This service does NOT expose the password hash through any domain
 *   type. The return type of `getPasswordHash` is a plain string
 *   consumed only by the `PasswordService`; the hash is never
 *   surfaced to a controller, a response DTO, or a domain value.
 *
 * Per ADR-013 §1.1 — login errors must not reveal whether the account
 * exists. The `getPasswordHash` method returns `null` for a missing
 * credential; the caller (the `PasswordService` / `AuthService`) is
 * responsible for returning the same generic 401 response whether the
 * credential is missing or the password is wrong.
 */
@Injectable()
export class LocalCredentialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new LocalCredential row. The `passwordHash` is the
   * PHC-string-formatted Argon2id hash produced by the
   * `PasswordService`. The `passwordChangedAt` timestamp is set by
   * the caller (typically `new Date()`).
   */
  async createCredential(input: {
    readonly userId: UserId;
    readonly passwordHash: string;
    readonly passwordChangedAt: Date;
  }): Promise<void> {
    await this.prisma.localCredential.create({
      data: {
        userId: input.userId,
        passwordHash: input.passwordHash,
        passwordChangedAt: input.passwordChangedAt,
      },
    });
  }

  /**
   * Read the password hash for a user. Returns `null` if no
   * credential exists. The returned string is the PHC-string-formatted
   * Argon2id hash; it is consumed only by the `PasswordService.verify`
   * method.
   */
  async getPasswordHash(userId: UserId): Promise<string | null> {
    const row = await this.prisma.localCredential.findUnique({
      where: { userId },
      select: { passwordHash: true },
    });
    return row?.passwordHash ?? null;
  }

  /**
   * Update the password hash for a user. Used by the development
   * bootstrap command to update the dev user's password idempotently
   * (so re-running the bootstrap with a new password updates the
   * existing credential rather than failing on the unique constraint).
   *
   * Also used by the (future) password-change flow.
   */
  async updatePasswordHash(input: {
    readonly userId: UserId;
    readonly passwordHash: string;
    readonly passwordChangedAt: Date;
  }): Promise<void> {
    await this.prisma.localCredential.update({
      where: { userId: input.userId },
      data: {
        passwordHash: input.passwordHash,
        passwordChangedAt: input.passwordChangedAt,
      },
    });
  }

  /**
   * Check whether a credential exists for a user. Used by the
   * development bootstrap command to decide whether to create or
   * update the credential.
   */
  async credentialExists(userId: UserId): Promise<boolean> {
    const row = await this.prisma.localCredential.findUnique({
      where: { userId },
      select: { userId: true },
    });
    return row !== null;
  }
}
