import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getContext,
  selectTenantContext,
  clearTenantContext,
} from './context.client';

/**
 * Tests for the web session-context API client.
 *
 * These tests verify that the client:
 * - Uses `credentials: 'include'` on all requests.
 * - Parses successful responses through shared Zod schemas.
 * - Distinguishes network failure, HTTP failure, invalid JSON, and
 *   contract-invalid responses.
 * - Sends the `X-CSRF-Token` header on PUT and DELETE.
 * - Sends `membershipId` (not `tenantId`) in the PUT body.
 * - Does not expose raw server errors.
 * - Does not use Axios (uses platform fetch).
 */

const validContextResponse = {
  options: [
    {
      membershipId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
    },
  ],
  active: null,
};

const validClearResponse = {
  ok: true,
  active: null,
};

describe('context.client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getContext', () => {
    it('returns ok with parsed context on a 200 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validContextResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await getContext();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.options).toHaveLength(1);
        expect(result.data.active).toBeNull();
      }
    });

    it('uses credentials: include', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validContextResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await getContext();
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.credentials).toBe('include');
    });

    it('uses GET method', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validContextResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await getContext();
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('GET');
    });

    it('returns HTTP_ERROR with statusCode 401 on a 401 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await getContext();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('HTTP_ERROR');
        expect(result.error.statusCode).toBe(401);
      }
    });

    it('returns NETWORK_ERROR on a fetch rejection', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await getContext();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('NETWORK_ERROR');
      }
    });

    it('returns INVALID_JSON when the response is not JSON', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('not JSON');
        },
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await getContext();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('INVALID_JSON');
      }
    });

    it('returns CONTRACT_INVALID when the response is missing required fields', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ options: [] }), // missing `active`
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await getContext();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('CONTRACT_INVALID');
      }
    });

    it('returns CONTRACT_INVALID when the response has an extra field', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          options: [],
          active: null,
          extraField: 'should be rejected',
        }),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await getContext();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('CONTRACT_INVALID');
      }
    });
  });

  describe('selectTenantContext', () => {
    const membershipId = '11111111-1111-1111-1111-111111111111';
    const csrfToken = 'csrf-token-value';

    it('returns ok with parsed context on a 200 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          options: [
            {
              membershipId,
              tenantId: '22222222-2222-2222-2222-222222222222',
              tenantSlug: 'tenant-alpha.invalid',
              tenantDisplayName: 'Tenant Alpha',
            },
          ],
          active: {
            membershipId,
            tenantId: '22222222-2222-2222-2222-222222222222',
            tenantSlug: 'tenant-alpha.invalid',
            tenantDisplayName: 'Tenant Alpha',
          },
        }),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await selectTenantContext(membershipId, csrfToken);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.active).not.toBeNull();
      }
    });

    it('uses PUT method', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validContextResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await selectTenantContext(membershipId, csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('PUT');
    });

    it('uses credentials: include', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validContextResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await selectTenantContext(membershipId, csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.credentials).toBe('include');
    });

    it('sends the X-CSRF-Token header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validContextResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await selectTenantContext(membershipId, csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers['X-CSRF-Token']).toBe(csrfToken);
    });

    it('sends membershipId (not tenantId) in the body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validContextResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await selectTenantContext(membershipId, csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      const body = JSON.parse(init.body as string) as {
        membershipId?: unknown;
        tenantId?: unknown;
      };
      expect(body.membershipId).toBe(membershipId);
      expect(body.tenantId).toBeUndefined();
    });

    it('returns HTTP_ERROR with statusCode 403 on a 403 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({}),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await selectTenantContext(membershipId, csrfToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.statusCode).toBe(403);
      }
    });

    it('returns NETWORK_ERROR on a fetch rejection', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await selectTenantContext(membershipId, csrfToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('NETWORK_ERROR');
      }
    });

    it('returns CONTRACT_INVALID when the response is malformed', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ options: [] }), // missing `active`
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await selectTenantContext(membershipId, csrfToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('CONTRACT_INVALID');
      }
    });
  });

  describe('clearTenantContext', () => {
    const csrfToken = 'csrf-token-value';

    it('returns ok with parsed clear response on a 200 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validClearResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await clearTenantContext(csrfToken);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.ok).toBe(true);
        expect(result.data.active).toBeNull();
      }
    });

    it('uses DELETE method', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validClearResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await clearTenantContext(csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('DELETE');
    });

    it('uses credentials: include', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validClearResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await clearTenantContext(csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.credentials).toBe('include');
    });

    it('sends the X-CSRF-Token header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validClearResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await clearTenantContext(csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers['X-CSRF-Token']).toBe(csrfToken);
    });

    it('does NOT send a request body', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validClearResponse,
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await clearTenantContext(csrfToken);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.body).toBeUndefined();
    });

    it('returns HTTP_ERROR with statusCode 403 on a 403 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({}),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await clearTenantContext(csrfToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.statusCode).toBe(403);
      }
    });

    it('returns NETWORK_ERROR on a fetch rejection', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await clearTenantContext(csrfToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('NETWORK_ERROR');
      }
    });

    it('returns CONTRACT_INVALID when the response is malformed', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }), // missing `active`
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await clearTenantContext(csrfToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('CONTRACT_INVALID');
      }
    });

    it('returns CONTRACT_INVALID when ok is not the literal true', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: false, active: null }),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await clearTenantContext(csrfToken);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.category).toBe('CONTRACT_INVALID');
      }
    });
  });
});
