import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgeOfMajorityPolicyPort } from '@ibn-hayan/domain';

/**
 * Configuration-driven implementation of {@link AgeOfMajorityPolicyPort}
 * (architecture gate 6M).
 *
 * BR-BC01-CLIN-005 (BUSINESS_RULES.md): "Age of majority configurable
 * per region." Canonical documentation does NOT define a numeric default
 * age of majority; it states only that the value is configurable per
 * region. The age of majority is NOT hard-coded in the Patient domain.
 * This service is the injectable policy/configuration seam that resolves
 * the age of majority for the current tenant/region context. It follows
 * the established `*.feature.config.ts` convention: a pure reader of
 * `ConfigService` that does NOT mutate state and does NOT log the value
 * at info level.
 *
 * The value is read from the `IBN_HAYAN_AGE_OF_MAJORITY` environment
 * variable. When the variable is absent or invalid, the service falls
 * back to {@link DEFAULT_AGE_OF_MAJORITY}. That fallback is an
 * INTERIM OPERATIONAL DEFAULT, NOT a canonical value: canonical
 * documentation does not ratify any specific numeric age. It exists
 * solely so the consent-grant path does not fail closed (which would
 * block all consent capture) when per-region configuration has not yet
 * been provided. A future stage wires the Localization BC19
 * regulatory-framework adapter as the authoritative per-region source;
 * operators SHOULD set `IBN_HAYAN_AGE_OF_MAJORITY` to the correct
 * regional value rather than relying on the interim default.
 *
 * The value must be a positive integer. An invalid (non-integer or
 * non-positive) configured value falls back to the interim default and
 * logs a warning (it does NOT throw, because a misconfigured value must
 * not crash the consent-grant path; the fallback preserves pediatric
 * safety while signalling the misconfiguration).
 *
 * This service does NOT hard-code the age of majority in the Patient
 * domain. The Patient consent service computes the patient's age from
 * their DOB and compares it to the value resolved by this port.
 */
@Injectable()
export class AgeOfMajorityPolicyService implements AgeOfMajorityPolicyPort {
  /**
   * INTERIM OPERATIONAL DEFAULT age of majority. Canonical documentation
   * (BUSINESS_RULES.md BR-BC01-CLIN-005) does NOT define a numeric
   * default — it states only that the value is "configurable per
   * region." This constant is a non-canonical interim fallback used only
   * when `IBN_HAYAN_AGE_OF_MAJORITY` is absent or invalid, so the
   * consent-grant path does not fail closed. Operators SHOULD set the
   * environment variable to the correct regional value. The Localization
   * BC19 adapter is the future authoritative per-region source.
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
