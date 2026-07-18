/**
 * Auth-module request schemas.
 *
 * The canonical contract schemas live in `@ibn-hayan/contracts` and
 * are the single source of truth for the shape of data that crosses
 * the API boundary. The schemas here are thin re-exports that exist
 * only to support NestJS's validation pipeline and to give the auth
 * module a single import surface for the contracts it consumes.
 *
 * In this batch, the auth controller uses `LoginRequestSchema` from
 * `@ibn-hayan/contracts` directly via `LoginRequestSchema.safeParse`.
 * The re-exports here are for future use cases where a NestJS-
 * specific DTO is needed (e.g. for `@ApiBody` OpenAPI metadata).
 */

export { LoginRequestSchema, type LoginRequest } from '@ibn-hayan/contracts';
