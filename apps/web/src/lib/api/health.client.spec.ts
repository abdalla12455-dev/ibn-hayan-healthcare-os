import { describe, expect, it, afterEach, vi } from 'vitest';
import { fetchHealth } from './health.client';
import { normaliseBaseUrl, joinUrl, getApiBaseUrl } from './api-url';

/**
 * Unit tests for the typed web API client.
 *
 * These tests use a mocked `globalThis.fetch` so they do not require the
 * real API to be running. Every failure mode is exercised: successful
 * valid response, network failure, non-2xx HTTP response, invalid JSON,
 * and contract-invalid JSON.
 */

describe('normaliseBaseUrl', () => {
  it('removes trailing slashes', () => {
    expect(normaliseBaseUrl('http://localhost:3001/api/v1/')).toBe(
      'http://localhost:3001/api/v1',
    );
    expect(normaliseBaseUrl('http://localhost:3001/api/v1///')).toBe(
      'http://localhost:3001/api/v1',
    );
  });

  it('preserves URLs without trailing slashes', () => {
    expect(normaliseBaseUrl('http://localhost:3001/api/v1')).toBe(
      'http://localhost:3001/api/v1',
    );
  });

  it('trims leading and trailing whitespace', () => {
    expect(normaliseBaseUrl('  http://localhost:3001/api/v1  ')).toBe(
      'http://localhost:3001/api/v1',
    );
  });

  it('falls back to the development default for empty input', () => {
    expect(normaliseBaseUrl('')).toBe('http://localhost:3001/api/v1');
    expect(normaliseBaseUrl('   ')).toBe('http://localhost:3001/api/v1');
  });
});

describe('joinUrl', () => {
  it('joins a base URL and a path with exactly one slash', () => {
    expect(joinUrl('http://localhost:3001/api/v1', '/health')).toBe(
      'http://localhost:3001/api/v1/health',
    );
  });

  it('handles a base URL with a trailing slash', () => {
    expect(joinUrl('http://localhost:3001/api/v1/', '/health')).toBe(
      'http://localhost:3001/api/v1/health',
    );
  });

  it('adds a leading slash to the path if missing', () => {
    expect(joinUrl('http://localhost:3001/api/v1', 'health')).toBe(
      'http://localhost:3001/api/v1/health',
    );
  });
});

describe('getApiBaseUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    }
  });

  it('returns the env value when set', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com/api/v1';
    expect(getApiBaseUrl()).toBe('https://api.example.com/api/v1');
  });

  it('falls back to the development default when unset', () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    expect(getApiBaseUrl()).toBe('http://localhost:3001/api/v1');
  });

  it('falls back when the env value is empty', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = '';
    expect(getApiBaseUrl()).toBe('http://localhost:3001/api/v1');
  });

  it('normalises trailing slashes from the env value', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL =
      'http://localhost:3001/api/v1/';
    expect(getApiBaseUrl()).toBe('http://localhost:3001/api/v1');
  });
});

describe('fetchHealth', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const validBody = {
    status: 'ok',
    service: 'ibn-hayan-api',
    version: 'development',
  };

  it('returns ok with parsed data for a successful valid response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(validBody);
    }
  });

  it('returns a NETWORK_ERROR when fetch throws', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('NETWORK_ERROR');
    }
  });

  it('returns an HTTP_ERROR for a non-2xx response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', {
        status: 500,
      }),
    ) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('HTTP_ERROR');
      expect(result.error.statusCode).toBe(500);
    }
  });

  it('returns an HTTP_ERROR for a 404 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    ) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('HTTP_ERROR');
      expect(result.error.statusCode).toBe(404);
    }
  });

  it('returns INVALID_JSON when the response body is not valid JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('not json at all', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }),
    ) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('INVALID_JSON');
    }
  });

  it('returns CONTRACT_INVALID when the JSON is valid but does not match the schema', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'down', service: 'wrong', version: '1.0' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    ) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('CONTRACT_INVALID');
    }
  });

  it('returns CONTRACT_INVALID when fields are missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('CONTRACT_INVALID');
    }
  });

  it('returns CONTRACT_INVALID when extra fields are present', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ...validBody, extra: 'not allowed' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    ) as unknown as typeof fetch;

    const result = await fetchHealth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('CONTRACT_INVALID');
    }
  });
});
