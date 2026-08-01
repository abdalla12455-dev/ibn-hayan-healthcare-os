import { describe, expect, it } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { appointmentConfigurationRequired } from './appointments.errors.js';

/**
 * Focused unit tests for the appointments module error helpers.
 *
 * Per the Stage 1B implementation specification, the "Today's
 * Appointments" endpoint must fail closed when the facility timezone
 * is not configured, returning HTTP 422 with code
 * `APPOINTMENT_CONFIGURATION_REQUIRED`.
 */

describe('appointments.errors', () => {
  describe('appointmentConfigurationRequired', () => {
    it('returns UnprocessableEntityException', () => {
      const error = appointmentConfigurationRequired();
      expect(error).toBeInstanceOf(UnprocessableEntityException);
    });

    it('has the APPOINTMENT_CONFIGURATION_REQUIRED error code', () => {
      const error = appointmentConfigurationRequired();
      expect(error.getResponse()).toMatchObject({
        error: {
          code: 'APPOINTMENT_CONFIGURATION_REQUIRED',
        },
      });
    });

    it('has a non-empty message', () => {
      const error = appointmentConfigurationRequired();
      const response = error.getResponse() as { error: { message: string } };
      expect(response.error.message.length).toBeGreaterThan(0);
    });
  });
});
