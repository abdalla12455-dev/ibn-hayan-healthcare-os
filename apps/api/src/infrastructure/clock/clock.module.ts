import { Module } from '@nestjs/common';
import { SystemClockService } from './clock.service.js';

export const CLOCK_SERVICE_TOKEN = Symbol('CLOCK_SERVICE');

/**
 * Clock module.
 *
 * Provides the {@link ClockService} abstraction for time operations.
 * The production implementation ({@link SystemClockService}) delegates
 * to the system clock.
 *
 * Tests can replace this with a mock that returns a fixed time.
 */
@Module({
  providers: [
    {
      provide: CLOCK_SERVICE_TOKEN,
      useClass: SystemClockService,
    },
  ],
  exports: [CLOCK_SERVICE_TOKEN],
})
export class ClockModule {}
