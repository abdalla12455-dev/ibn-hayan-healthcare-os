export {
  fetchHealth,
  type HealthClientResult,
} from './health.client';
export {
  networkError,
  httpError,
  invalidJsonError,
  contractInvalidError,
  type ApiError,
  type ApiErrorCategory,
} from './api-error';
export { getApiBaseUrl, normaliseBaseUrl, joinUrl } from './api-url';
export {
  getRolePreviewAvailability,
  getCurrentPreviewRole,
  selectPreviewRole,
  endPreviewRole,
  type RolePreviewClientResult,
} from './role-preview/index';
export {
  getClinicAdminOverview,
  type ClinicAdminOverviewClientResult,
} from './clinic-admin/index';
