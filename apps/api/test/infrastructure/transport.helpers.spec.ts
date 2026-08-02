/**
 * Unit tests for shared transport helpers.
 *
 * Tests readCookie and buildAuditContext functions.
 */

import { describe, expect, it } from 'vitest';
import {
  readCookie,
  buildAuditContext,
} from '../../src/infrastructure/transport/transport.helpers.js';

describe('readCookie', () => {
  it('returns undefined when cookie header is missing', () => {
    const req = { headers: {} } as never;
    expect(readCookie(req, 'session')).toBeUndefined();
  });

  it('returns undefined when cookie with given name does not exist', () => {
    const req = {
      headers: { cookie: 'other=value' },
    } as never;
    expect(readCookie(req, 'session')).toBeUndefined();
  });

  it('returns the cookie value when found', () => {
    const req = {
      headers: { cookie: 'session=abc123' },
    } as never;
    expect(readCookie(req, 'session')).toBe('abc123');
  });

  it('handles multiple cookies', () => {
    const req = {
      headers: { cookie: 'other=value; session=abc123; another=test' },
    } as never;
    expect(readCookie(req, 'session')).toBe('abc123');
  });

  it('handles cookies with spaces around semicolons', () => {
    const req = {
      headers: { cookie: 'session=abc123 ; other=value' },
    } as never;
    expect(readCookie(req, 'session')).toBe('abc123');
  });

  it('decodes URI-encoded cookie values', () => {
    const req = {
      headers: { cookie: 'session=abc%3D123' },
    } as never;
    expect(readCookie(req, 'session')).toBe('abc=123');
  });

  it('handles cookie values containing equals signs', () => {
    const req = {
      headers: { cookie: 'session=abc=123=xyz' },
    } as never;
    expect(readCookie(req, 'session')).toBe('abc=123=xyz');
  });

  it('handles empty cookie value', () => {
    const req = {
      headers: { cookie: 'session=' },
    } as never;
    expect(readCookie(req, 'session')).toBe('');
  });
});

describe('buildAuditContext', () => {
  it('returns defaults when request identifiers are missing', () => {
    const req = {
      headers: {},
      ip: undefined,
      socket: {},
    } as never;
    const result = buildAuditContext(req);
    expect(result.requestId).toBe('00000000-0000-0000-0000-000000000000');
    expect(result.correlationId).toBeNull();
    expect(result.ipAddress).toBeNull();
    expect(result.userAgent).toBeNull();
  });

  it('uses requestId when present', () => {
    const req = {
      headers: {},
      requestId: 'req-123',
      correlationId: null,
      ip: undefined,
      socket: {},
    } as never;
    const result = buildAuditContext(req);
    expect(result.requestId).toBe('req-123');
  });

  it('uses correlationId when present', () => {
    const req = {
      headers: {},
      requestId: 'req-123',
      correlationId: 'corr-456',
      ip: undefined,
      socket: {},
    } as never;
    const result = buildAuditContext(req);
    expect(result.correlationId).toBe('corr-456');
  });

  it('uses req.ip when present', () => {
    const req = {
      headers: {},
      requestId: 'req-123',
      ip: '192.168.1.1',
      socket: {},
    } as never;
    const result = buildAuditContext(req);
    expect(result.ipAddress).toBe('192.168.1.1');
  });

  it('falls back to socket.remoteAddress when req.ip is missing', () => {
    const req = {
      headers: {},
      requestId: 'req-123',
      ip: undefined,
      socket: { remoteAddress: '10.0.0.1' },
    } as never;
    const result = buildAuditContext(req);
    expect(result.ipAddress).toBe('10.0.0.1');
  });

  it('extracts user-agent string', () => {
    const req = {
      headers: { 'user-agent': 'TestBrowser/1.0' },
      requestId: 'req-123',
      ip: undefined,
      socket: {},
    } as never;
    const result = buildAuditContext(req);
    expect(result.userAgent).toBe('TestBrowser/1.0');
  });

  it('handles user-agent as array', () => {
    const req = {
      headers: { 'user-agent': ['TestBrowser/1.0', 'Fallback/2.0'] },
      requestId: 'req-123',
      ip: undefined,
      socket: {},
    } as never;
    const result = buildAuditContext(req);
    expect(result.userAgent).toBe('TestBrowser/1.0');
  });

  it('returns null userAgent when user-agent header is missing', () => {
    const req = {
      headers: {},
      requestId: 'req-123',
      ip: undefined,
      socket: {},
    } as never;
    const result = buildAuditContext(req);
    expect(result.userAgent).toBeNull();
  });
});
