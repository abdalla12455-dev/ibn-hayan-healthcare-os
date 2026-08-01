import { Injectable } from '@nestjs/common';

/**
 * Clock abstraction for time operations.
 *
 * This interface allows the appointments service to query the current
 * instant without directly calling `Date.now()` or `new Date()`. This
 * enables deterministic testing: tests can inject a mock clock that
 * returns a fixed time, making timezone boundary tests reliable.
 *
 * The production implementation delegates to the system clock.
 */

/**
 * Returns the current instant as a `Date`.
 */
export interface ClockService {
  now(): Date;
}

/**
 * Production implementation of {@link ClockService} that delegates to
 * the system clock.
 */
@Injectable()
export class SystemClockService implements ClockService {
  now(): Date {
    return new Date();
  }
}
