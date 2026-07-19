import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Request-ID middleware.
 *
 * Per ADR-014 §15 and the ninth canonical batch specification, a
 * stable request ID is introduced for every API request:
 *
 * - Accept a valid client-provided request ID only under a clearly
 *   documented safe format: UUID v4, or a bounded alphanumeric
 *   string of ≤ 64 characters matching `^[A-Za-z0-9_-]{1,64}$`.
 * - Reject other formats; generate a UUID v4 instead.
 * - Generate a UUID v4 when no client-provided request ID is
 *   supplied.
 * - Include the request ID in the response header `X-Request-Id`.
 * - Propagate the request ID into audit events as `request_id`.
 * - Do not trust arbitrary unbounded client strings.
 * - Do not use request ID as an authorization factor.
 * - Maintain compatibility with current API tests.
 *
 * A correlation ID may be accepted separately (under the same safe
 * format, header `X-Correlation-Id`) or default to the request ID.
 *
 * The middleware attaches `requestId` and `correlationId` to the
 * Express `Request` object so that downstream handlers (controllers,
 * guards, the audit emitter) can read them.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const clientRequestId = readHeader(req, 'x-request-id');
    const requestId = validateRequestId(clientRequestId) ?? randomUUID();

    const clientCorrelationId = readHeader(req, 'x-correlation-id');
    const correlationId = validateRequestId(clientCorrelationId) ?? requestId;

    // Attach to the request object for downstream handlers.
    (req as RequestWithIdentifiers).requestId = requestId;
    (req as RequestWithIdentifiers).correlationId = correlationId;

    // Include in the response header.
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}

/**
 * The augmentation applied to the Express `Request` object by the
 * `RequestIdMiddleware`. Controllers and guards read these fields
 * to propagate the request ID into audit events.
 */
export interface RequestWithIdentifiers extends Request {
  requestId?: string;
  correlationId?: string;
}

/**
 * The maximum length of a client-provided request ID.
 */
const MAX_REQUEST_ID_LENGTH = 64;

/**
 * The regular expression for a valid client-provided request ID.
 * Allows alphanumeric characters, hyphens, and underscores, with a
 * length of 1 to 64 characters. UUID v4 strings (which contain
 * hyphens) are accepted.
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Validate a client-provided request ID. Returns the value if it is
 * valid, or `null` if it should be replaced with a generated UUID.
 */
function validateRequestId(value: string | undefined): string | null {
  if (value === undefined || value.length === 0) {
    return null;
  }
  if (value.length > MAX_REQUEST_ID_LENGTH) {
    return null;
  }
  if (!REQUEST_ID_PATTERN.test(value)) {
    return null;
  }
  return value;
}

/**
 * Read a header value from the request. Returns `undefined` if the
 * header is not present.
 */
function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
