import { Injectable } from '@nestjs/common';
import type {
  User,
  UserId,
  CreateUserInput,
  UserRepository,
} from '@ibn-hayan/domain';
import type { UserStatus } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { userFromPrisma } from '../mappers/user.mapper.js';

/**
 * Prisma-backed implementation of {@link UserRepository} from
 * `@ibn-hayan/domain`.
 *
 * Responsibilities:
 * - Insert a new User row. The `normalised_email` column's global
 *   uniqueness is enforced by the `users_normalised_email_key` unique
 *   index; a duplicate insert raises a Prisma
 *   `PrismaClientKnownRequestError` with code `P2002`, which the API
 *   exception layer translates to a 409 Conflict.
 * - Look up a User by its stable UUID identifier.
 * - Look up a User by its normalised email address. The caller is
 *   responsible for normalising the email (trim + lowercase) before
 *   calling this method.
 *
 * Non-responsibilities:
 * - This adapter does NOT read, write, or expose the password hash.
 *   The `LocalCredential` row is managed by the
 *   `LocalCredentialService` (infrastructure-only) and is consumed by
 *   the `PasswordService` and `AuthService` directly. This adapter
 *   never joins to `local_credentials` and never includes the
 *   `localCredential` relation in its Prisma queries.
 * - This adapter does not perform soft-delete. `delete` is not
 *   declared on the port and is not implemented here.
 *
 * Per ADR-012 §1.4 safeguard 1 (Domain isolation), this adapter
 * imports Prisma-generated types but maps them to domain types before
 * returning. The domain package does not import Prisma; the Prisma
 * types do not leak through this adapter's public signatures.
 *
 * Per ADR-013 §1.1 — login errors must not reveal whether the account
 * exists. The `findByNormalisedEmail` method returns `null` for a
 * missing user; the caller (the login service) is responsible for
 * returning the same generic 401 response whether the user is missing
 * or the password is wrong.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<User> {
    const status: UserStatus = input.status ?? 'active';
    const normalisedEmail = normaliseEmail(input.email);
    const row = await this.prisma.user.create({
      data: {
        email: input.email,
        normalisedEmail,
        displayName: input.displayName,
        status,
      },
    });
    return userFromPrisma(row);
  }

  async findById(userId: UserId): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return row ? userFromPrisma(row) : null;
  }

  async findByNormalisedEmail(normalisedEmail: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { normalisedEmail },
    });
    return row ? userFromPrisma(row) : null;
  }
}

/**
 * Normalise an email address for the unique-lookup column. Trims
 * surrounding whitespace and lowercases the entire address.
 *
 * This is the canonical normalisation for the `normalised_email`
 * column. The same function is used at user-creation time (to
 * populate the column) and at login time (to look up the user).
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. The normalisation is applied BEFORE the lookup so that
 * case variations in the submitted email do not produce a misleading
 * "user not found" response when the user actually exists.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
