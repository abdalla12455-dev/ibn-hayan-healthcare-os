import { describe, it, expect } from 'vitest';
import {
  LoginRequestSchema,
  AuthenticatedUserSchema,
  TenantMembershipSummarySchema,
  SessionResponseSchema,
  CsrfResponseSchema,
  LogoutResponseSchema,
  AuthErrorResponseSchema,
} from './auth.schema.js';

/**
 * Conformance tests for the auth contracts.
 *
 * These tests verify that each schema:
 * - accepts the canonical valid value;
 * - rejects null, non-object, and empty;
 * - rejects missing required fields;
 * - rejects extra fields (strict mode);
 * - rejects invalid values for each literal/enum field.
 *
 * The contracts are the single source of truth for the shape of data
 * that crosses the API boundary. Both @ibn-hayan/api (producer) and
 * @ibn-hayan/web (consumer) derive their types from these schemas.
 */

describe('LoginRequestSchema', () => {
  it('accepts a canonical valid login request', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'Operator.Alpha@example.invalid',
      password: 'sufficiently-long-password',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an email shorter than 12 characters for password', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'a@example.invalid',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password longer than 128 characters', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'a@example.invalid',
      password: 'x'.repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'sufficiently-long-password',
    });
    expect(result.success).toBe(false);
  });

  it('rejects null, non-object, and empty', () => {
    expect(LoginRequestSchema.safeParse(null).success).toBe(false);
    expect(LoginRequestSchema.safeParse('string').success).toBe(false);
    expect(LoginRequestSchema.safeParse(42).success).toBe(false);
    expect(LoginRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(
      LoginRequestSchema.safeParse({ email: 'a@example.invalid' }).success,
    ).toBe(false);
    expect(
      LoginRequestSchema.safeParse({ password: 'sufficiently-long-password' })
        .success,
    ).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'a@example.invalid',
      password: 'sufficiently-long-password',
      extra: 'unexpected',
    });
    expect(result.success).toBe(false);
  });
});

describe('AuthenticatedUserSchema', () => {
  it('accepts a canonical valid user', () => {
    const result = AuthenticatedUserSchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'operator@example.invalid',
      displayName: 'Operator Alpha',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a disabled user', () => {
    const result = AuthenticatedUserSchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'operator@example.invalid',
      displayName: 'Operator Alpha',
      status: 'disabled',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = AuthenticatedUserSchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'operator@example.invalid',
      displayName: 'Operator Alpha',
      status: 'suspended',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-UUID id', () => {
    const result = AuthenticatedUserSchema.safeParse({
      id: 'not-a-uuid',
      email: 'operator@example.invalid',
      displayName: 'Operator Alpha',
      status: 'active',
    });
    expect(result.success).toBe(false);
  });

  it('does not expose passwordHash or any credential material', () => {
    const result = AuthenticatedUserSchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      email: 'operator@example.invalid',
      displayName: 'Operator Alpha',
      status: 'active',
      passwordHash: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });
});

describe('TenantMembershipSummarySchema', () => {
  it('accepts a canonical valid membership summary with empty roles', () => {
    const result = TenantMembershipSummarySchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a membership summary with one role', () => {
    const result = TenantMembershipSummarySchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [
        { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'System Administrator' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a membership summary with multiple roles', () => {
    const result = TenantMembershipSummarySchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [
        { code: 'R01_PHYSICIAN', displayName: 'Physician' },
        { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'System Administrator' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing roles array', () => {
    const result = TenantMembershipSummarySchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = TenantMembershipSummarySchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active-extra',
      roles: [],
    });
    expect(result.success).toBe(false);
  });

  it('does not expose a singular role field (strict — schema uses roles array)', () => {
    const result = TenantMembershipSummarySchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [],
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown role code in the roles array', () => {
    const result = TenantMembershipSummarySchema.safeParse({
      id: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
      roles: [{ code: 'R99_UNKNOWN', displayName: 'Unknown' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('SessionResponseSchema', () => {
  const validSession = {
    user: {
      id: '12345678-1234-1234-1234-123456789012',
      email: 'operator@example.invalid',
      displayName: 'Operator Alpha',
      status: 'active',
    },
    memberships: [
      {
        id: '12345678-1234-1234-1234-123456789014',
        tenantId: '12345678-1234-1234-1234-123456789013',
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
        status: 'active',
        roles: [
          { code: 'R13_SYSTEM_ADMINISTRATOR', displayName: 'System Administrator' },
        ],
      },
    ],
    activeTenantContext: null,
    expiresAt: '2026-01-01T12:00:00.000Z',
  };

  it('accepts a canonical valid session response', () => {
    const result = SessionResponseSchema.safeParse(validSession);
    expect(result.success).toBe(true);
  });

  it('accepts an empty memberships array', () => {
    const result = SessionResponseSchema.safeParse({
      ...validSession,
      memberships: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-ISO datetime for expiresAt', () => {
    const result = SessionResponseSchema.safeParse({
      ...validSession,
      expiresAt: 'not-a-datetime',
    });
    expect(result.success).toBe(false);
  });

  it('does not expose a session token or tokenHash field (strict)', () => {
    const result = SessionResponseSchema.safeParse({
      ...validSession,
      token: 'should-be-rejected',
      tokenHash: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });
});

describe('CsrfResponseSchema', () => {
  it('accepts a canonical valid CSRF response', () => {
    const result = CsrfResponseSchema.safeParse({
      token: 'a'.repeat(64),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a token shorter than 32 characters', () => {
    const result = CsrfResponseSchema.safeParse({
      token: 'a'.repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = CsrfResponseSchema.safeParse({
      token: 'a'.repeat(64),
      hash: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });
});

describe('LogoutResponseSchema', () => {
  it('accepts a canonical valid logout response', () => {
    const result = LogoutResponseSchema.safeParse({ ok: true });
    expect(result.success).toBe(true);
  });

  it('rejects ok: false', () => {
    const result = LogoutResponseSchema.safeParse({ ok: false });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = LogoutResponseSchema.safeParse({
      ok: true,
      extra: 'should-be-rejected',
    });
    expect(result.success).toBe(false);
  });
});

describe('AuthErrorResponseSchema', () => {
  it('accepts a canonical invalid-credentials error', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a session-required error', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'AUTH_SESSION_REQUIRED',
        message: 'A valid session is required.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a CSRF-invalid error', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'AUTH_CSRF_INVALID',
        message: 'CSRF token is missing or invalid.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts an origin-disallowed error', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'AUTH_ORIGIN_DISALLOWED',
        message: 'Request origin is not allowed.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a context-selection-forbidden error', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'CONTEXT_SELECTION_FORBIDDEN',
        message: 'The selected tenant context is not available.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts an authorization-forbidden error (added in batch 8)', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'AUTHORIZATION_FORBIDDEN',
        message: 'The request is not authorized.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a context-request-invalid error', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'CONTEXT_REQUEST_INVALID',
        message: 'The request was malformed.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown error code', () => {
    const result = AuthErrorResponseSchema.safeParse({
      error: {
        code: 'AUTH_UNKNOWN',
        message: 'Unknown error.',
      },
    });
    expect(result.success).toBe(false);
  });
});
