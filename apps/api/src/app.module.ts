import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';

/**
 * Root application module.
 *
 * Imports:
 * - {@link ConfigModule} for environment-variable access (used by main.ts
 *   for CORS origin and port configuration).
 * - {@link HealthModule} for the liveness probe at GET /api/v1/health.
 *
 * No business modules (patients, auth, billing, scheduling, etc.) are
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
  ],
})
export class AppModule {}
