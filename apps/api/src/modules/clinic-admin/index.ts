/**
 * Public Clinic Admin module entry point.
 *
 * Re-exports the Clinic Admin module and the supporting service so
 * that `AppModule` can import `ClinicAdminModule`.
 */

export { ClinicAdminModule } from './clinic-admin.module.js';
export { ClinicAdminController } from './clinic-admin.controller.js';
export { ClinicAdminOverviewService } from './clinic-admin-overview.service.js';
export { clinicAdminOverviewContextRequired } from './clinic-admin.errors.js';
