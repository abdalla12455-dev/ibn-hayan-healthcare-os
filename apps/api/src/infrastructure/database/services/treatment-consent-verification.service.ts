import { Injectable, Inject } from '@nestjs/common';
import type {
  TreatmentConsentVerificationPort,
  TreatmentConsentVerificationResult,
  PatientConsentRepository,
  PatientId,
  TenantId,
} from '@ibn-hayan/domain';
import { PATIENT_CONSENT_REPOSITORY } from '../database.module.js';

/**
 * BC01-owned implementation of {@link TreatmentConsentVerificationPort}
 * (architecture gate 11).
 *
 * BC02 (Encounters) consumes this port to verify active treatment
 * consent. BC02 does NOT query BC01 Prisma tables directly. This
 * implementation queries the PatientConsentRepository (the domain port)
 * and computes the effective consent state, treating an
 * expired-but-still-granted row as expired (the reconciliation step
 * runs at grant time, but a read between the expiry moment and the next
 * grant observes the effective state).
 *
 * The port fails safely: an infrastructure failure returns `unknown`,
 * and the encounter gate blocks the non-emergency encounter (it does
 * NOT treat `unknown` as `granted`).
 */
@Injectable()
export class TreatmentConsentVerificationService implements TreatmentConsentVerificationPort {
  constructor(
    @Inject(PATIENT_CONSENT_REPOSITORY)
    private readonly consentRepository: PatientConsentRepository,
  ) {}

  async verifyActiveTreatmentConsent(
    tenantId: TenantId,
    patientId: PatientId,
    effectiveAt: Date,
  ): Promise<TreatmentConsentVerificationResult> {
    try {
      const consents = await this.consentRepository.listForPatient(
        tenantId,
        patientId,
      );

      // Look for a treatment consent and compute its effective state.
      // listForPatient returns most-recent-first (grantedAt desc), so the
      // first treatment consent encountered is the most relevant.
      for (const consent of consents) {
        if (consent.consentType !== 'treatment') {
          continue;
        }

        if (consent.status === 'granted') {
          // A granted consent is effective only if it has not expired.
          // Treat an expired-but-still-granted row as expired (the
          // reconciliation step at grant time would have transitioned it,
          // but a read between expiry and the next grant observes the
          // effective state).
          if (consent.expiresAt !== null && consent.expiresAt < effectiveAt) {
            return { status: 'expired' };
          }
          return { status: 'granted', consentId: consent.id };
        }

        if (consent.status === 'withdrawn') {
          return { status: 'withdrawn' };
        }

        if (consent.status === 'expired') {
          return { status: 'expired' };
        }

        // status === 'pending': not granted. Continue to look for any
        // other treatment consent (defensive; there should be at most one
        // active granted treatment consent per the partial unique index).
      }

      // No treatment consent record exists for the patient.
      return { status: 'not_granted' };
    } catch {
      // Infrastructure failure: fail safely as `unknown`. The encounter
      // gate blocks the non-emergency encounter (it does NOT treat
      // `unknown` as `granted`).
      return { status: 'unknown' };
    }
  }
}
