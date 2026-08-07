export * from './appointment.js';
export * from './repositories.js';

// Re-export PatientId from patient module for backwards compatibility
// with code that imports PatientId from scheduling.
export type { PatientId } from '../patient/patient.js';

// Re-export ProviderId from workforce module for backwards compatibility
// with code that imports ProviderId from scheduling.
export type { ProviderId } from '../workforce/provider.js';
