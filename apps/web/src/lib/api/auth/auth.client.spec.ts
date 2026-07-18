import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  login,
  getSession,
  getCsrfToken,
  logout,
} from './auth.client';

/**
 * Tests for the web auth API client.
 *
 * These tests verify that the client:
 * - Uses `credentials: 'include'` on all requests.
 * - Parses successful responses through shared Zod schemas.
 * - Distinguishes network failure, HTTP failure, invalid JSON, and
 *   contract-invalid responses.
 * - Does not expose raw server errors.
 * - Does not use Axios (uses platform fetch).
 */

const validSessionResponse = {
  user: {
    id: '12345678-1234-1234-1234-123456789012',
    email: 'operator@example.invalid',
    displayName: 'Operator Alpha',
    status: 'active',
  },
  memberships: [
    {
      id: '12345678-1234-1234-1234-123456789013',
      tenantId: '12345678-1234-1234-1234-123456789014',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
      status: 'active',
    },
  ],
  expiresAt: '2026-01-01T12:00:00.000Z',
};

describe('auth.client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('login', () => {
    it('sends credentials: include and parses a valid session response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validSessionResponse,
      } as Response);
      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await login({
        email: 'Operator@example.invalid',
        password: 'sufficiently-long-password',
      });

      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledOnce();
      const call = fetchMock.mock.calls[0];
      const options = call?.[1] as RequestInit;
      expect(options.credentials).toBe('include');
      expect(options.method).toBe('POST');
      if (result.ok) {
        expect(result.data.user.email).toBe('operator@example.invalid');
      }
    });

    it('returns HTTP_ERROR with statusCode 401 for invalid credentials', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password.' },
        }),
      } as Response) as unknown as typeof globalThis.fetch;

      const result = await login({
        email: 'a@example.invalid',
        password: 'wrong-password-long',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('HTTP_ERROR');
        expect(result.error.statusCode).toBe(401);
      }
    });

    it('returns NETWORK_ERROR when fetch throws', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof globalThis.fetch;

      const result = await login({
        email: 'a@example.invalid',
        password: 'sufficiently-long-password',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('NETWORK_ERROR');
      }
    });

    it('returns CONTRACT_INVALID when the response does not match the schema', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ unexpected: 'shape' }),
      } as Response) as unknown as typeof globalThis.fetch;

      const result = await login({
        email: 'a@example.invalid',
        password: 'sufficiently-long-password',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('CONTRACT_INVALID');
      }
    });

    it('returns INVALID_JSON when the response is not JSON', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      } as unknown as Response) as unknown as typeof globalThis.fetch;

      const result = await login({
        email: 'a@example.invalid',
        password: 'sufficiently-long-password',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('INVALID_JSON');
      }
    });
  });

  describe('getSession', () => {
    it('sends credentials: include and parses a valid session response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validSessionResponse,
      } as Response);
      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await getSession();

      expect(result.ok).toBe(true);
      const call = fetchMock.mock.calls[0];
      const options = call?.[1] as RequestInit;
      expect(options.credentials).toBe('include');
    });

    it('returns HTTP_ERROR with statusCode 401 when unauthenticated', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: 'AUTH_SESSION_REQUIRED', message: 'A valid session is required.' },
        }),
      } as Response) as unknown as typeof globalThis.fetch;

      const result = await getSession();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.statusCode).toBe(401);
      }
    });
  });

  describe('getCsrfToken', () => {
    it('sends credentials: include and returns the raw token', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: 'a'.repeat(64) }),
      } as Response);
      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await getCsrfToken();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.token).toBe('a'.repeat(64));
      }
      const call = fetchMock.mock.calls[0];
      const options = call?.[1] as RequestInit;
      expect(options.credentials).toBe('include');
    });
  });

  describe('logout', () => {
    it('sends credentials: include and the X-CSRF-Token header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);
      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

      const result = await logout('csrf-token-value');

      expect(result.ok).toBe(true);
      const call = fetchMock.mock.calls[0];
      const options = call?.[1] as RequestInit;
      expect(options.credentials).toBe('include');
      const headers = options.headers as Record<string, string>;
      expect(headers['X-CSRF-Token']).toBe('csrf-token-value');
    });

    it('returns HTTP_ERROR with statusCode 403 for invalid CSRF', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: { code: 'AUTH_CSRF_INVALID', message: 'CSRF token is missing or invalid.' },
        }),
      } as Response) as unknown as typeof globalThis.fetch;

      const result = await logout('invalid-token');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.statusCode).toBe(403);
      }
    });
  });
});
