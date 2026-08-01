/**
 * Shared HTTP transport helpers.
 *
 * These helpers are general-purpose utilities for reading cookies and
 * building audit contexts from Express requests. They are used by
 * multiple controllers to avoid duplication.
 *
 * This module is intentionally minimal and has no external dependencies
 * beyond the Express Request type.
 */

import type { Request } from 'express';
import type { AuditRequestContext } from '../../modules/auth/auth.service.js';
import type { RequestWithIdentifiers } from '../../modules/audit/request-id.middleware.js';

/**
 * Read a cookie value from the request. Returns `undefined` if the
 * cookie is not present.
 *
 * Express's `req.headers.cookie` is a string like
 * `name1=value1; name2=value2`. We parse it manually rather than
 * using a cookie-parser middleware to keep the transport layer's
 * dependencies minimal.
 */
export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) {
    return undefined;
  }
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}

/**
 * Build the audit request context from the Express request. Reads
 * the `requestId` and `correlationId` set by the `RequestIdMiddleware`,
 * the client IP, and the user-agent.
 */
export function buildAuditContext(req: Request): AuditRequestContext {
  const augmented = req as RequestWithIdentifiers;
  const requestId =
    augmented.requestId ?? '00000000-0000-0000-0000-000000000000';
  const correlationId = augmented.correlationId ?? null;
  const ipRaw = req.ip ?? req.socket?.remoteAddress ?? null;
  const ipAddress = ipRaw !== null && ipRaw !== undefined ? ipRaw : null;
  const uaRaw = req.headers['user-agent'];
  const userAgent =
    typeof uaRaw === 'string'
      ? uaRaw
      : Array.isArray(uaRaw)
        ? (uaRaw[0] ?? null)
        : null;
  return { requestId, correlationId, ipAddress, userAgent };
}
