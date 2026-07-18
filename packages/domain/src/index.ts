/**
 * @ibn-hayan/domain
 *
 * Bounded-context domain packages. The structural expression of ADR-002
 * (Modular Architecture) and ADR-006 (Database Strategy) — domain types
 * and use cases live here, isolated from any framework, ORM, or UI library.
 *
 * In this batch the package contains only a package-boundary marker. No
 * patient, user, tenant, session, audit, billing, scheduling, or inventory
 * models exist here yet; they arrive in subsequent batches alongside the
 * first vertical slice.
 *
 * Binding isolation rules (enforced by lint and by review):
 * - This package MUST NOT import Next.js, NestJS, Prisma, React, or any UI
 *   library.
 * - This package MUST NOT import from @ibn-hayan/web or @ibn-hayan/api.
 * - This package MAY import from @ibn-hayan/contracts (for shared contract
 *   types) and from @ibn-hayan/observability (for structured logging).
 */

export const DOMAIN_PACKAGE_VERSION = '0.0.0' as const;

export const DOMAIN_PACKAGE_NAME = '@ibn-hayan/domain' as const;
