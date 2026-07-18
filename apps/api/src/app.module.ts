import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/index.js';

/**
 * Root application module.
 *
 * Imports:
 * - {@link ConfigModule} for environment-variable access (used by
 *   main.ts for CORS origin and port configuration, and by the auth
 *   module for Argon2id parameters, session-expiry durations, and
 *   throttling thresholds).
 * - {@link HealthModule} for the liveness probe at GET /api/v1/health.
 *   Health is independent of database availability; the API can boot
 *   and serve Health without `DATABASE_URL` set.
 * - {@link AuthModule} for the authentication and session routes
 *   under /api/v1/auth. The auth module imports `DatabaseModule`
 *   internally; the database connection is opened lazily on the
 *   first query, so the API can boot without a database as long as
 *   no auth request occurs.
 *
 * No patient, billing, scheduling, inventory, or audit modules are
 * imported in this batch. Those arrive in subsequent batches.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Only environment variables listed here are exposed via ConfigService.
      // This is a deny-by-default posture: nothing else from process.env
      // reaches application code through ConfigService.
      envFilePath: ['.env'],
      cache: true,
    }),
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
