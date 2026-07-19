import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { AuditModule } from '../audit/index.js';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { SessionContextController } from './session-context.controller.js';
import { SessionContextService } from './session-context.service.js';

/**
 * Session-context module.
 *
 * Wires the session-context controller and service. Imports
 * `AuthModule` to access `AuthService` and `CsrfService`; imports
 * `AuthorizationModule` to apply the `AuthorizationGuard` to the
 * context routes; imports `AuditModule` (ninth canonical batch) to
 * emit context-viewed, context-selected, and context-cleared audit
 * events; imports `DatabaseModule` to access the session,
 * membership, tenant, and role-assignment repositories.
 *
 * Per the fifth canonical batch specification, the session-context
 * module does NOT duplicate authentication, token parsing, cookie
 * parsing, Origin, or CSRF logic. It reuses the auth module's
 * services via Nest DI.
 *
 * Per the eighth canonical batch specification, the session-context
 * module applies the `AuthorizationGuard` to all three context
 * routes via `@UseGuards(AuthorizationGuard)` on the controller
 * class. Each route declares its required permission via
 * `@RequirePermission(...)`.
 *
 * The module does NOT declare its own throttler configuration. The
 * auth module's global `ThrottlerGuard` (registered as an
 * `APP_GUARD`) applies the permissive `default` throttler
 * (1000/60s) to all context routes. The login-specific throttler
 * (10/60s) is scoped to the login endpoint via `@Throttle` and
 * does NOT affect context routes. This is the structural
 * enforcement of the fifth canonical batch requirement: "Context
 * routes do not inherit the login-specific throttle limit."
 */
@Module({
  imports: [AuthModule, AuthorizationModule, AuditModule, DatabaseModule],
  controllers: [SessionContextController],
  providers: [SessionContextService],
  exports: [SessionContextService],
})
export class SessionContextModule {}
