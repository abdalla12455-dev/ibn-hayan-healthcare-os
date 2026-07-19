/**
 * Audit subpath entrypoint for @ibn-hayan/observability.
 *
 * Exports the framework-agnostic audit contracts: types, action
 * codes, the canonical serializer, the integrity-hash helper, the
 * identifier-HMAC helper, the safe metadata validator, the
 * forbidden-key detector, the audit-emitter port, the audit-outbox
 * port, the audit-store ports, the audit-event builder, and the
 * audit-verification result types.
 *
 * Per ADR-012 and ADR-014, this subpath is framework-agnostic: it
 * MUST NOT import Prisma, NestJS, React, or generated database
 * types. The API implements the ports; the audit store and outbox
 * are infrastructure adapters.
 */

// Categories, actor types, outcomes, source types
export * from './categories.js';
export * from './actor-types.js';
export * from './outcomes.js';
export * from './source-types.js';

// Action codes
export * from './action-codes.js';

// Audit event draft and builder
export * from './audit-event-draft.js';
export * from './audit-event-builder.js';

// Cryptographic helpers
export * from './canonical-serializer.js';
export * from './integrity-hash.js';
export * from './identifier-hmac.js';

// Metadata safety
export * from './metadata-validator.js';

// Key validation
export * from './key-validation.js';

// Ports
export * from './audit-emitter-port.js';
export * from './audit-outbox-port.js';
export * from './audit-store-append-port.js';

// Verification
export * from './audit-verification.js';
