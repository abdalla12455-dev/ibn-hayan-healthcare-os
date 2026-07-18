/**
 * @ibn-hayan/contracts
 *
 * Public API contracts shared between @ibn-hayan/web (Next.js thin client)
 * and @ibn-hayan/api (NestJS backend). In this batch the package contains
 * only a package-boundary marker — no domain models, no business types, no
 * Zod schemas. Those arrive in subsequent batches alongside the first
 * vertical slice.
 *
 * The boundary itself is the value: by importing from `@ibn-hayan/contracts`
 * rather than reaching across application directories, engineers respect
 * the dependency direction ratified in ADR-012 and FOLDER_STRUCTURE.md.
 */

export const CONTRACTS_PACKAGE_VERSION = '0.0.0' as const;

export const CONTRACTS_PACKAGE_NAME = '@ibn-hayan/contracts' as const;
