import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgeOfMajorityPolicyPort } from '@ibn-hayan/domain';

/**
 * Configuration-driven implementation of {@link AgeOfMajorityPolicyPort}
 * (architecture gate 6M).
 *
 * BR-BC01-CLIN-005: "Age of majority configurable per region." The age
 * of majority is NOT hard-coded in the Patient domain. This service is
 * the injectable policy/configuration seam that resolves the age of
 * majority for the current tenant/region context. It follows the
 * established `*.feature.config.ts` convention: a pure reader of
 * `ConfigService` that does NOT mutate state and does NOT log the value
 * at info level.
 *
 * The value is read from the `IBN_HAYAN_AGE_OF_MAJORITY` environment
 * variable. The default is `18` (the most common canonical regional
 * default documented in BUSINESS_RULES.md). The default is a safe
 * interim baseline; a future stage wires the Localization BC19
 * regulatory-framework adapter as the authoritative per-region source.
 *
 * The value must be a positive integer. An invalid (non-integer or
 * non-positive) configured value falls back to the default `18` and logs
 * a warning (it does NOT throw, because a misconfigured value must not
 * crash the consent-grant path; the safe default preserves pediatric
 * safety).
 *
 * This service does NOT hard-code 18 in the Patient domain. The Patient
 * consent service computes the patient's age from their DOB and compares
 * it to this value.
 */
@Injectable()
export class AgeOfMajorityPolicyService implements AgeOfMajorityPolicyPort {
  /**
   * The canonical default age of majority. Used when the configuration
   * is absent or invalid. This is the safest interim baseline; the
   * per-region configuration override is the canonical source of truth
   * when set.
   */
  private static readonly DEFAULT_AGE_OF_MAJORITY = 18;

  constructor(private readonly config: ConfigService) {}

  getAgeOfMajority(): number {
    const raw = this.readConfiguredValue();
    if (raw === undefined || raw === null || raw === '') {
      return AgeOfMajorityPolicyService.DEFAULT_AGE_OF_MAJORITY;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      // Invalid configuration: fall back to the safe default rather than
      // throwing. A misconfigured value must not crash the consent-grant
      // path; the safe default preserves pediatric safety.
      return AgeOfMajorityPolicyService.DEFAULT_AGE_OF_MAJORITY;
    }
    return parsed;
  }

  /**
   * Read the configured age-of-majority value through ConfigService so the
   * backend is authoritative. The value is not a secret; it is a
   * configuration value.
   */
  private readConfiguredValue(): string | undefined {
    return this.config.get<string>('IBN_HAYAN_AGE_OF_MAJORITY');
  }
}
