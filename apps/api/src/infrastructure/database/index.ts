/**
 * Public entry point for the database infrastructure layer.
 *
 * Feature modules import from here when they need persistence. The
 * exports below are the DI tokens (for `@Inject(...)`) and the
 * `DatabaseModule` itself (for `@Module({ imports: [...] })`).
 *
 * The Prisma-backed repository implementations and the `PrismaService`
 * are NOT exported from this barrel. Feature modules depend on the
 * interfaces from `@ibn-hayan/domain`, not on the implementations.
 * This is the structural expression of ADR-012 §1.4 safeguard 2
 * (Repository interfaces) and CODING_STANDARDS.md §5 (Domain
 * Isolation from Framework and ORM Types).
 *
 * The `LocalCredentialService` is an infrastructure-only service
 * (no domain port) and IS exported because the auth module's
 * `PasswordService` consumes it directly to read and write Argon2id
 * password hashes. The password hash never leaves the infrastructure
 * layer; it is never surfaced through a domain type or an API
 * response.
 */

export { DatabaseModule } from './database.module.js';
export {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  USER_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
} from './database.module.js';
export { LocalCredentialService } from './repositories/local-credential.service.js';
