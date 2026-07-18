/**
 * @ibn-hayan/contracts
 *
 * Public API contracts shared between @ibn-hayan/web (Next.js thin client)
 * and @ibn-hayan/api (NestJS backend). Per ADR-012 and
 * CODING_STANDARDS.md Section 6, Zod is the single source of truth for
 * the shape of data that crosses the API boundary; TypeScript types are
 * inferred from the Zod schemas.
 *
 * This package is framework-agnostic: it imports only from `zod` and
 * must not import from Next.js, NestJS, Prisma, React, or any UI or
 * persistence framework. The boundary itself is the value — by importing
 * from `@ibn-hayan/contracts` rather than reaching across application
 * directories, engineers respect the dependency direction ratified in
 * ADR-012 and FOLDER_STRUCTURE.md.
 *
 * In this batch the package exports the Health and Auth contracts.
 * Additional contracts (patients, organisations, audit, etc.) arrive
 * in subsequent batches alongside their respective vertical slices.
 */

export const CONTRACTS_PACKAGE_VERSION = '0.0.0' as const;

export const CONTRACTS_PACKAGE_NAME = '@ibn-hayan/contracts' as const;

export * from './health/index.js';
export * from './auth/index.js';
