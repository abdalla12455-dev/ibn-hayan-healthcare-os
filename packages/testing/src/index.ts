/**
 * @ibn-hayan/testing
 *
 * Test fixtures, factories, and shared test utilities consumed by
 * @ibn-hayan/web, @ibn-hayan/api, and the packages' own test suites.
 * Enforces the binding rule that tests use synthesised data only — no real
 * patient data, no production credentials (per ADR-013 §1.1.12).
 *
 * In this batch the package contains only a package-boundary marker. Test
 * fixtures and factories arrive in a subsequent batch alongside the first
 * vertical slice.
 */

export const TESTING_PACKAGE_VERSION = '0.0.0' as const;

export const TESTING_PACKAGE_NAME = '@ibn-hayan/testing' as const;
