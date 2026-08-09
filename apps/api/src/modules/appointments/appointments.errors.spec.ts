import { describe, expect, it } from 'vitest';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  appointmentConfigurationRequired,
  appointmentInvalidTimezone,
  appointmentNotFound,
  appointmentInvalidTransition,
} from './appointments.errors.js';

/**
 * Focused unit tests for the appointments module error helpers.
 *
 * Per the Stage 1B implementation specification, the "Today's
 * Appointments" endpoint must fail closed when the facility timezone
 * is not configured or invalid, returning HTTP 422 with code
 * `APPOINTMENT_CONFIGURATION_REQUIRED` or `APPOINTMENT_INVALID_TIMEZONE`.
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

  describe('appointmentInvalidTimezone', () => {
    it('returns UnprocessableEntityException', () => {
      const error = appointmentInvalidTimezone();
      expect(error).toBeInstanceOf(UnprocessableEntityException);
    });

    it('has the APPOINTMENT_INVALID_TIMEZONE error code', () => {
      const error = appointmentInvalidTimezone();
      expect(error.getResponse()).toMatchObject({
        error: {
          code: 'APPOINTMENT_INVALID_TIMEZONE',
        },
      });
    });

    it('has a non-empty message', () => {
      const error = appointmentInvalidTimezone();
      const response = error.getResponse() as { error: { message: string } };
      expect(response.error.message.length).toBeGreaterThan(0);
    });

    it('does NOT expose internal RangeError details', () => {
      const error = appointmentInvalidTimezone();
      const response = error.getResponse() as { error: { message: string } };
      // The message should not contain RangeError or timezone validation details
      expect(response.error.message).not.toContain('RangeError');
      expect(response.error.message).not.toContain('Invalid');
    });
  });

  describe('appointmentNotFound', () => {
    it('returns NotFoundException', () => {
      const error = appointmentNotFound();
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('has the APPOINTMENT_NOT_FOUND error code', () => {
      const error = appointmentNotFound();
      expect(error.getResponse()).toMatchObject({
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
        },
      });
    });

    it('has a non-empty message', () => {
      const error = appointmentNotFound();
      const response = error.getResponse() as { error: { message: string } };
      expect(response.error.message.length).toBeGreaterThan(0);
    });

    it('does NOT reveal which scope dimension is missing', () => {
      const error = appointmentNotFound();
      const response = error.getResponse() as { error: { message: string } };
      expect(response.error.message).not.toContain('tenant');
      expect(response.error.message).not.toContain('organisation');
      expect(response.error.message).not.toContain('facility');
    });
  });

  describe('appointmentInvalidTransition', () => {
    it('returns UnprocessableEntityException', () => {
      const error = appointmentInvalidTransition();
      expect(error).toBeInstanceOf(UnprocessableEntityException);
    });

    it('has the APPOINTMENT_INVALID_TRANSITION error code', () => {
      const error = appointmentInvalidTransition();
      expect(error.getResponse()).toMatchObject({
        error: {
          code: 'APPOINTMENT_INVALID_TRANSITION',
        },
      });
    });

    it('has a non-empty message', () => {
      const error = appointmentInvalidTransition();
      const response = error.getResponse() as { error: { message: string } };
      expect(response.error.message.length).toBeGreaterThan(0);
    });
  });
});
