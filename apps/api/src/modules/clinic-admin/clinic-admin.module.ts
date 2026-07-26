import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { AuditModule } from '../audit/index.js';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { ClinicAdminController } from './clinic-admin.controller.js';
import { ClinicAdminOverviewService } from './clinic-admin-overview.service.js';

/**
 * Clinic Admin module.
 *
 * Wires the Clinic Admin Overview controller and service. Imports
 * `AuthModule` to access `AuthService` (for session-cookie
 * validation); imports `AuthorizationModule` to apply the
 * `AuthorizationGuard` to the overview route; imports `AuditModule`
 * (ninth canonical batch) to emit `clinic_admin.overview.viewed`
 * audit events; imports `DatabaseModule` to access the tenant,
 * organisation, and facility repositories.
 *
 * Per the live-data task specification Phase 5, the module does NOT
 * duplicate authentication, token parsing, cookie parsing, Origin,
 * or CSRF logic. It reuses the auth module's `AuthService` via Nest
 * DI.
 *
 * Per the live-data task specification Phase 5, the module applies
 * the `AuthorizationGuard` to the overview route via
 * `@UseGuards(AuthorizationGuard)` on the controller class. The
 * route declares its required permission via
 * `@RequirePermission('clinic_admin_overview:view', { mode:
 * 'for-active-membership' })`. The permission is granted ONLY to
 * `R09_ADMINISTRATOR` (per
 * `packages/domain/src/authorization/role-permissions.ts`).
 *
 * The module does NOT declare its own throttler configuration. The
 * auth module's global `ThrottlerGuard` (registered as an
 * `APP_GUARD`) applies the permissive `default` throttler
 * (1000/60s) to the overview route.
 */
@Module({
  imports: [AuthModule, AuthorizationModule, AuditModule, DatabaseModule],
  controllers: [ClinicAdminController],
  providers: [ClinicAdminOverviewService],
  exports: [ClinicAdminOverviewService],
})
export class ClinicAdminModule {}
