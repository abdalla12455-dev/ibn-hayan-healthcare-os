import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/index.js';
import { AuditModule } from '../../audit/index.js';
import { DatabaseModule } from '../../../infrastructure/database/index.js';
import { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
import { RolePreviewService } from './role-preview.service.js';
import { RolePreviewController } from './role-preview.controller.js';

/**
 * Demo Role Preview Mode module.
 *
 * Wires the role-preview controller, service, and feature-config
 * gate. Imports `AuthModule` to access `AuthService`,
 * `SessionTokenService`, and `CsrfService`; imports `DatabaseModule`
 * to access the user, tenant, organisation, facility, membership,
 * and session repositories; imports `AuditModule` to emit audit
 * events for preview session creation and ending.
 *
 * Per the Demo Role Preview Mode v1 specification, the module is
 * registered in the root `AppModule` regardless of the
 * `NODE_ENV` value. The feature-config gate is the authoritative
 * entry point: when the gate returns `false`, every route returns
 * a 404 (availability, current) or throws `rolePreviewDisabled()`
 * (select, end). The 404 status does NOT advertise the route's
 * existence in production.
 *
 * The module does NOT duplicate authentication, CSRF, Origin, or
 * audit logic. It reuses the existing services via Nest DI.
 */
@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [RolePreviewController],
  providers: [RolePreviewFeatureConfig, RolePreviewService],
  exports: [RolePreviewFeatureConfig, RolePreviewService],
})
export class RolePreviewModule {}
