import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/index.js';
import { AuditModule } from '../audit/index.js';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuthorizationService } from './authorization.service.js';
import { AuthorizationGuard } from './authorization.guard.js';

/**
 * Authorization module.
 *
 * Wires the authorization service and guard. Imports `AuthModule`
 * to access `AuthService` (for session validation and Origin
 * enforcement); imports `DatabaseModule` to access the
 * `TenantRoleAssignmentRepository` (for loading a membership's
 * role assignments); imports `AuditModule` (ninth canonical batch)
 * to emit authorization decision audit events.
 *
 * Per the eighth canonical batch specification, the authorization
 * module does NOT duplicate authentication, token parsing, cookie
 * parsing, Origin, or CSRF logic. It reuses the auth module's
 * `AuthService` via Nest DI.
 *
 * The `AuthorizationGuard` is exported so that controllers can
 * apply it via `@UseGuards(AuthorizationGuard)`. The guard is NOT
 * registered as a global `APP_GUARD`; it is applied explicitly to
 * the routes that declare `@RequirePermission(...)`. This is the
 * structural enforcement of "every protected route declares its
 * required permission explicitly."
 */
@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  providers: [AuthorizationService, AuthorizationGuard],
  exports: [AuthorizationService, AuthorizationGuard],
})
export class AuthorizationModule {}
