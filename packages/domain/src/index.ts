/**
 * @ibn-hayan/domain
 *
 * Bounded-context domain packages. The structural expression of ADR-002
 * (Modular Architecture) and ADR-006 (Database Strategy) — domain types
 * and use cases live here, isolated from any framework, ORM, or UI library.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2, this
 * package is pure TypeScript. It MUST NOT import Next.js, NestJS, Prisma,
 * React, Zod, or any UI or persistence library. The package's
 * `package.json` declares no framework dependencies; an import-attempt
 * against any forbidden module fails to compile.
 *
 * Repository interfaces declared in this package are implemented by
 * persistence adapters in `apps/api/src/infrastructure/persistence/`.
 * The domain owns the interface; the API owns the implementation. This
 * is the structural guarantee that makes ORM replacement a bounded cost
 * (per CODING_STANDARDS.md §5).
 *
 * Bounded contexts currently exported:
 * - tenancy: Tenant, Organisation, Facility domain models and the
 *   TenantRepository, OrganisationRepository, FacilityRepository ports.
 * - identity: User, TenantMembership, Session domain models and the
 *   UserRepository, TenantMembershipRepository, SessionRepository
 *   ports. Per ADR-013, the session record carries only a SHA-256
 *   hash of the opaque session token, never the raw token; the User
 *   model excludes password hashes (those live on the
 *   infrastructure-only LocalCredential row).
 * - authorization: the canonical fourteen-role catalogue (R01
 *   through R14), the action-level permission catalogue, the
 *   role-permission matrix, the TenantRoleAssignment domain model,
 *   and the TenantRoleAssignmentRepository port. Per PRODUCT_BIBLE.md
 *   Section 20 and Section 21, roles are composable (a principal
 *   may hold multiple roles simultaneously) and permissions are
 *   assigned through roles only. The authorization layer is
 *   default-deny.
 *
 * Additional bounded contexts (patients, audit, billing, scheduling,
 * inventory, configuration, etc.) arrive in subsequent batches alongside
 * their respective vertical slices.
 */

export const DOMAIN_PACKAGE_VERSION = '0.0.0' as const;

export const DOMAIN_PACKAGE_NAME = '@ibn-hayan/domain' as const;

export * from './tenancy/index.js';
export * from './identity/index.js';
export * from './authorization/index.js';
