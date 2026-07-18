/**
 * Public context-client entry point.
 *
 * Re-exports the typed functions so that consumers import from
 * `@/lib/api/context` without reaching into internal file paths.
 */

export {
  getContext,
  selectTenantContext,
  clearTenantContext,
  type ContextClientResult,
} from './context.client';
