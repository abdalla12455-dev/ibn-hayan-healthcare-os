import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/index.js';
import { AuditModule } from '../../audit/index.js';
import { DatabaseModule } from '../../../infrastructure/database/index.js';
import { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
import { RolePreviewService } from './role-preview.service.js';
import { RolePreviewController } from './role-preview.controller.js';
import { RolePreviewPasswordValidator } from './role-preview-password-validator.js';
import { BootstrapChallengeStore } from './bootstrap-store.js';

/**
 * Demo Role Preview Mode module.
 *
 * Wires the role-preview controller, service, feature-config gate,
 * the start-up password validator, and the bootstrap challenge
 * store. Imports `AuthModule` to access `AuthService`,
 * `SessionTokenService`, and `CsrfService`; imports
 * `DatabaseModule` to access the user, tenant, organisation,
 * facility, membership, and session repositories; imports
 * `AuditModule` to emit audit events for preview session creation,
 * bootstrapping, and ending.
 *
 * Per the Demo Role Preview Mode v1 specification, the module is
 * registered in the root `AppModule` regardless of the
 * `NODE_ENV` value. The feature-config gate is the authoritative
 * entry point: when the gate returns `false`, every route returns
 * a 404 (availability, current) or throws `rolePreviewDisabled()`
 * (bootstrap, select, end). The 404 status does NOT advertise the
 * route's existence in production.
 *
 * Per the Secure Demo Role Preview Mode v1 correction
 * specification, the {@link RolePreviewPasswordValidator} provider
 * is constructed eagerly when the module is loaded. When the gate
 * is enabled, the validator reads and validates the
 * `IBN_HAYAN_ROLE_PREVIEW_PASSWORD` environment variable; a
 * missing, empty, whitespace-only, or too-short value prevents the
 * application from starting (fail-safe). When the gate is
 * disabled, the validator does nothing — the password is not
 * required for normal production or normal development startup.
 *
 * Per the Secure Logged-Out Demo Role Bootstrap specification, the
 * {@link BootstrapChallengeStore} provider holds the in-memory
 * one-time bootstrap challenges. The store is in-memory; no
 * persistent bootstrap table is created. The store is consumed
 * atomically on first use; a second call with the same challenge
 * returns 'replay'.
 *
 * The module does NOT duplicate authentication, CSRF, Origin, or
 * audit logic. It reuses the existing services via Nest DI.
 */
@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [RolePreviewController],
  providers: [
    RolePreviewFeatureConfig,
    RolePreviewPasswordValidator,
    BootstrapChallengeStore,
    RolePreviewService,
  ],
  exports: [
    RolePreviewFeatureConfig,
    RolePreviewService,
    BootstrapChallengeStore,
  ],
})
export class RolePreviewModule {}
