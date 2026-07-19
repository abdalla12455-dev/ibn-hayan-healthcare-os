import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { PasswordService } from './password.service.js';
import { SessionTokenService } from './session-token.service.js';
import { CsrfService } from './csrf.service.js';

/**
 * Authentication module.
 *
 * Wires the auth controller, auth service, and supporting services
 * (password, session-token, csrf). Imports `DatabaseModule` to
 * access the user, membership, session, and credential repositories.
 * Imports `AuditModule` (ninth canonical batch) to emit audit events
 * for login, logout, session rotation, and Origin/CSRF denials.
 *
 * Per ADR-013 §1.1, throttling is applied at the login endpoint via
 * `@nestjs/throttler`. The `ThrottlerModule` is configured with a
 * single permissive `default` throttler (1000 requests per 60s)
 * that applies to all routes not explicitly exempted or overridden.
 * The login endpoint overrides this via `@Throttle` to the
 * approved 10-attempts-per-60s threshold.
 *
 * The `ThrottlerGuard` is registered as an APP_GUARD so that the
 * `@Throttle` decorator on the login endpoint takes effect. The
 * guard is applied globally:
 * - Health is exempt via `@SkipThrottle()` on `HealthController`.
 * - Login is limited to 10/60s via `@Throttle`.
 * - Other auth endpoints (session, csrf, logout) use the permissive
 *   default (1000/60s) and are NOT subjected to the login-specific
 *   limit.
 *
 * Per ADR-013 §1.1, the auth module does NOT depend on an
 * immediately-available database connection at startup. The
 * `PrismaService` connects lazily on the first query; the API can
 * boot and serve Health without `DATABASE_URL` set, as long as no
 * auth request occurs.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuditModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 1_000, // permissive default; login overrides via @Throttle
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionTokenService,
    CsrfService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [AuthService, PasswordService, SessionTokenService, CsrfService],
})
export class AuthModule {}
