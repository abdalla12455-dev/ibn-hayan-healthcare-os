/**
 * Session-context request schemas.
 *
 * The canonical contract schemas live in `@ibn-hayan/contracts` and
 * are the single source of truth for the shape of data that crosses
 * the API boundary. The schemas here are thin re-exports that exist
 * only to support NestJS's validation pipeline and to give the
 * session-context module a single import surface for the contracts
 * it consumes.
 */

export {
  SelectTenantContextRequestSchema,
  type SelectTenantContextRequest,
} from '@ibn-hayan/contracts';
