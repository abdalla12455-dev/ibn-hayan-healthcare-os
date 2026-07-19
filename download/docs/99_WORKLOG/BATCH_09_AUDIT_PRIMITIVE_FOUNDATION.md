# Batch 9 — Audit Primitive Foundation

| Field | Value |
|---|---|
| Batch ID | 9 |
| Batch Title | Audit Primitive Foundation |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Canonical Batch Worklog |
| Authority Level | Authoritative — Implementation Plan for Batch 9 |
| Status | Complete |
| Owner | Office of the Chief Software Architect |
| Custodian | Backend module owner (Audit) |
| Predecessor | Batch 8 (Canonical RBAC and Authorization Foundation) |
| Successor | Batch 10 — TBD |
| Created | 2026-07-19 |

---

## 1. Objective

Implement the first production-grade audit primitive for the Ibn Hayan Healthcare Operating System. Audit is not a logging feature; it is a platform primitive consumed by authentication, authorization, Tenant context, RBAC, and every future business module. The implementation provides comprehensive audit capture for the currently implemented consequential actions, a dedicated audit store separate from the transactional store, immutable and append-only audit records, cryptographic tamper evidence, durable delivery through a transactional outbox, Tenant-scoped integrity chains, safe handling of secrets and personal information, integrity verification, and complete database and integration tests.

This batch does NOT implement patient, appointment, encounter, billing, inventory, configuration, feature-flag, reporting, or audit-management UI functionality.

## 2. Architectural References

The following documents are authoritative for this batch. Precedence (highest to lowest) when conflicts arise:

1. `download/docs/00_PROJECT/PRODUCT_BIBLE.md` — Sections 5, 6, 27, 31.
2. `download/docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` — Section 20 (Security Architecture), Section 27 (Audit Architecture), Section 17 (State Management).
3. `download/docs/12_ADR/ADR-014_AUDIT_STORE_AND_INTEGRITY_STRATEGY.md` — Accepted ADR (this batch).
4. `download/docs/09_SECURITY/AUDIT.md` — Ratified elaboration.
5. `download/docs/09_SECURITY/AUTHENTICATION.md`, `AUTHORIZATION.md`, `ROLES_AND_PERMISSIONS.md` — Ratified elaborations.
6. `download/docs/09_SECURITY/COMPLIANCE/DATA_RETENTION.md` — Retention policy.
7. `download/docs/12_ADR/ADR-006_DATABASE_STRATEGY.md` — Database strategy.
8. `download/docs/12_ADR/ADR-012_APPLICATION_PLATFORM_AND_REPOSITORY_STRUCTURE.md` — Application platform.
9. `download/docs/12_ADR/ADR-013_AUTHENTICATION_AND_SESSION_STRATEGY.md` — Authentication.
10. `download/docs/99_WORKLOG/BATCH_08_RBAC_AUTHORIZATION_FOUNDATION.md` — Predecessor batch.
11. `CURRENT_IMPLEMENTATION_HANDOVER.md` — Implementation state (lowest precedence).

## 3. ADR-014 Decision

ADR-014 ratifies:

- A dedicated PostgreSQL 17 audit database, separate from the transactional store, accessed through `AUDIT_DATABASE_URL`, with its own Prisma schema and migration history under `apps/api/prisma-audit/`.
- A transactional outbox (`AuditOutboxEvent` table in the transactional store) for durable delivery; a state mutation and its outbox record commit atomically.
- HMAC-SHA-256 chained integrity records: one chain per Tenant (`tenant:<tenantId>`) and one platform chain (`platform`).
- Immutable database enforcement through triggers that reject `UPDATE`, `DELETE`, and `TRUNCATE` on the `audit_events` table; the runtime role has only `INSERT` and `SELECT` privileges.
- Idempotent delivery by stable `event_id`.
- Framework-agnostic audit contracts in `packages/observability`.
- Separate `AUDIT_INTEGRITY_HMAC_KEY` (≥256 bits) and `AUDIT_IDENTIFIER_HMAC_KEY` for failed-login identifier hashing.
- Versioned integrity keys (`AUDIT_INTEGRITY_KEY_VERSION`).

## 4. Current Audit Gap

Before this batch, the platform implements authentication, session lifecycle, CSRF, Origin checks, Tenant context selection, and RBAC authorization — but no audit trail exists. Consequential actions (login, logout, session rotation, context selection, context clearing, authorization decisions, role assignment) are not audited. The `AUDIT.md` document treats this as a critical defect: a module that does not audit its consequential actions is not shipped.

This batch closes that gap for the functionality that exists today. Future batches will extend the audit surface as the platform's surface expands.

## 5. Event Model

An audit event is an immutable record of a consequential action. The event is emitted by the module that performed the action, persisted first to the transactional outbox in the same transaction as the action, and delivered to the dedicated audit store by the dispatcher. The audit store computes the integrity hash and appends the record to the appropriate chain.

The event carries:

- **Identity**: `event_id` (stable UUID), `event_version`.
- **Timing**: `occurred_at` (caller-supplied), `recorded_at` (audit-store-supplied).
- **Scope**: `tenant_id` (nullable), `chain_scope`, `chain_sequence`.
- **Integrity**: `previous_integrity_hash`, `payload_hash`, `integrity_hash`, `integrity_key_version`.
- **Classification**: `category`, `action`.
- **Actor**: `actor_type`, `actor_id` (nullable), `subject_identifier_hash` (nullable, for failed-login privacy), `session_id` (nullable).
- **Resource**: `resource_type` (nullable), `resource_id` (nullable).
- **Authorization context**: `permission_code` (nullable), `role_codes` (array).
- **Outcome**: `outcome`, `reason_code` (nullable).
- **Provenance**: `source`, `request_id`, `correlation_id` (nullable).
- **Network context**: `ip_address` (nullable), `user_agent` (nullable, bounded).
- **Scope description**: `scope`.
- **State diff**: `previous_state` (nullable), `new_state` (nullable).
- **Metadata**: `metadata` (sanitised JSONB).

## 6. Event Categories and Action Codes

The event categories implemented in this batch:

| Category | Description |
|---|---|
| `security` | Authentication, session, Origin, CSRF events. |
| `authorization` | Authorization decisions (allow/deny). |
| `tenant_context` | Tenant context viewed, selected, cleared. |
| `rbac` | Role assignment. |
| `audit` | Audit-system events (delivery failure, integrity verified, integrity verification failed). |

The action codes implemented in this batch:

### Authentication
- `authentication.login.succeeded`
- `authentication.login.failed`
- `authentication.login.throttled` (when safely interceptable)
- `authentication.logout.succeeded`
- `authentication.session.invalid`
- `authentication.session.expired`
- `authentication.session.rotated`

### Request security
- `security.origin.denied`
- `security.csrf.denied`

### Authorization
- `authorization.decision.allowed`
- `authorization.decision.denied`

### Tenant context
- `tenant_context.viewed`
- `tenant_context.selected`
- `tenant_context.cleared`

### RBAC
- `rbac.role.assigned`
- `rbac.role.assignment.failed` (when applicable)

### Audit system
- `audit.delivery.failed`
- `audit.integrity.verified`
- `audit.integrity.verification_failed`

No action codes are invented for modules that do not exist.

## 7. Actor Model

Supported actor types:

| Actor type | Description |
|---|---|
| `USER` | An authenticated human user. |
| `SYSTEM` | A platform-internal actor (e.g. the dispatcher, the verifier, the bootstrap). |
| `INTEGRATION` | An integration account (R14). |
| `ANONYMOUS` | An unauthenticated principal (e.g. a failed-login attempt). |

For a known authenticated user:

- The stable user ID is stored in `actor_id`.
- The assigned role codes relevant to the authorization decision are stored in `role_codes`.
- The password and authentication factor are never stored.

For failed login attempts:

- The raw submitted email is NEVER stored.
- An HMAC of the normalised identifier is stored in `subject_identifier_hash` using `AUDIT_IDENTIFIER_HMAC_KEY`.
- The response does not reveal whether the account exists.
- The same generic client response is preserved.

## 8. Tenant and Platform Chain Strategy

Each audit event belongs to exactly one chain:

- `tenant:<tenantId>` for tenant-scoped events. The Tenant is known when the actor is an authenticated user with an active or targeted Tenant membership.
- `platform` for tenant-less events. This includes pre-authentication events (failed login, Origin denied, CSRF denied before session validation) and audit-system events (integrity verification, delivery failure) that are not tenant-scoped.

The chain scope is computed at emission time and stored in `chain_scope`. The chain sequence is allocated atomically by the `audit_chain_heads` table at append time. The previous integrity hash is read from the chain head under row-level locking.

Different Tenants have independent chains. The platform chain is independent of all tenant chains. Concurrent appends into the same chain produce unique monotonic sequence numbers and a single valid chain; no forks, no duplicated sequence values.

## 9. Transactional Outbox Design

The `AuditOutboxEvent` table lives in the transactional store. Its schema is summarised in ADR-014 §1.4. The outbox is a delivery mechanism, not the final audit trail.

Required properties:

- Outbox insertion occurs in the same transactional database transaction as the consequential state mutation.
- A state mutation cannot commit without its outbox record. This is enforced by writing both in the same Prisma `$transaction` and by the `AuditHelperService.emitOrFail` helper which throws on emission failure, causing the transaction to roll back.
- Delivery is idempotent. The audit store's unique constraint on `event_id` is the structural enforcement.
- Duplicate delivery does not create duplicate audit records. The dispatcher treats an existing `event_id` as an idempotent success.
- Failed delivery leaves the outbox event pending. The `delivered_at` column remains null.
- Retry does not modify the final audit event. The audit event is immutable once appended.
- Multiple dispatcher instances cannot deliver the same event twice in effect. PostgreSQL-safe claiming (`FOR UPDATE SKIP LOCKED`) is the structural enforcement.
- Delivery status may be updated because the outbox is not the immutable audit trail. The `attempt_count`, `delivered_at`, `last_failure_code`, `last_failure_at`, `lease_owner`, and `lease_expires_at` columns are mutable.

## 10. Dedicated Audit-Store Design

The `audit_events` table lives in the dedicated audit database. Its schema is summarised in ADR-014 §1.3. The audit store holds no models from the transactional database and no foreign keys to transactional-store tables.

The `audit_chain_heads` table is mutable implementation metadata that tracks the head of each chain. It is NOT an audit record. It carries:

- `chain_scope` (primary key).
- `last_sequence` (the last allocated sequence number).
- `last_integrity_hash` (the integrity hash of the last event in the chain).
- `updated_at`.

Concurrent appends lock the chain-head row using `SELECT ... FOR UPDATE`, allocate the next sequence number, compute the integrity hash, insert the audit event, and update the chain head — all in a single transaction. The row-level lock prevents concurrent appends from producing duplicate sequence numbers or forks.

## 11. Integrity Algorithm

The integrity algorithm is HMAC-SHA-256 chained:

1. **Canonical serialization**: The event's logical fields are serialized in a deterministic order. Object keys are sorted lexicographically at every depth. Arrays preserve their order. Strings are UTF-8 encoded. Numbers are encoded in their canonical form. `null` is encoded as a distinct token. The same logical event always produces the same canonical payload regardless of JavaScript object insertion order.

2. **Payload hash**: `SHA-256(canonical_payload)` as a lowercase hexadecimal string.

3. **Integrity hash**: `HMAC-SHA-256(integrity_key, integrity_input)` as a lowercase hexadecimal string, where `integrity_input` is the canonical serialization of:
   - `integrity_key_version` (integer)
   - `chain_scope` (text)
   - `chain_sequence` (biginteger)
   - `previous_integrity_hash` (text or null)
   - `payload_hash` (text)

4. **Verification**: For each event in a chain, recompute the payload hash from the canonical payload, recompute the integrity hash from the bound fields, and verify that the recomputed integrity hash matches the stored integrity hash. Verify that `previous_integrity_hash` matches the integrity hash of the preceding event. Verify that `chain_sequence` is monotonic with no gaps and no duplicates. Verify that `integrity_key_version` is a known version.

The integrity key is NOT stored in the audit database. The integrity key is supplied to the verifier at verification time through `AUDIT_INTEGRITY_HMAC_KEY` and `AUDIT_INTEGRITY_KEY_VERSION`. The verifier supports multiple key versions simultaneously.

## 12. Canonical Serialization

The canonical serializer is implemented in `packages/observability` and is consumed by both the dispatcher (at append time) and the verifier (at verification time). The serializer is framework-agnostic (no NestJS, no Prisma, no React).

Rules:

- Object keys are sorted lexicographically at every depth, using UTF-16 code-unit order (consistent with `Array.prototype.sort` default).
- Arrays preserve their order.
- Strings are JSON-escaped per RFC 8259.
- Numbers are serialized in their `JSON.stringify` form.
- Booleans are serialized as `true` or `false`.
- `null` is serialized as `null`.
- `undefined` is NOT permitted; the metadata validator rejects `undefined` values.
- The serialised form is UTF-8 encoded for hashing.

## 13. Key Management

Two keys are required:

- `AUDIT_INTEGRITY_HMAC_KEY`: The integrity key. At least 256 bits of entropy (32 bytes). Used to compute `integrity_hash`. Versioned by `AUDIT_INTEGRITY_KEY_VERSION` (integer, monotonically increasing).
- `AUDIT_IDENTIFIER_HMAC_KEY`: The identifier key. At least 256 bits of entropy. Used to compute `subject_identifier_hash` for failed-login events. Distinct from the integrity key.

Validation:

- The integrity key has at least 256 bits of entropy. The validator rejects keys shorter than 32 bytes.
- The identifier key is separate from the integrity key. The validator rejects identical values.
- Insecure placeholder values are rejected outside tests. The validator rejects the documented placeholder value.
- Production refuses to start when required audit configuration is invalid.

Key-rotation workflow beyond key-version support is deferred to a future ADR.

## 14. Immutability Controls

Immutability is enforced at the database level:

- A `BEFORE UPDATE OR DELETE ON audit_events` trigger raises an exception, rejecting the operation.
- A `BEFORE TRUNCATE ON audit_events` trigger raises an exception, rejecting the operation.
- The runtime database role has only `INSERT` and `SELECT` privileges on `audit_events` and `audit_chain_heads`. The migration role is the only role with `ALTER`, `TRUNCATE`, and DDL privileges; the migration role is not used at runtime.
- Application code exposes no update or delete repository method.

Database tests prove all three operations (UPDATE, DELETE, TRUNCATE) fail.

## 15. Idempotency

Idempotent delivery is structural:

- The outbox's `event_id` is unique.
- The audit store's `event_id` is unique.
- The dispatcher treats an existing `event_id` in the audit store as an idempotent success: the outbox record is marked delivered without producing a duplicate audit record.
- Duplicate dispatcher execution does not duplicate final events.

## 16. Failure Behaviour

### Before a state mutation

If the transactional outbox row cannot be created:

- Fail closed. Roll back the state mutation. Return an appropriate generic server error. Do not report success.

### After outbox persistence

If the dedicated audit store is unavailable:

- Keep the outbox event pending. Do not lose or overwrite it. Do not mark it delivered. Apply bounded retry. Do not duplicate it later. Emit structured operational logging without secrets.

### Direct, non-mutating security events

Persist them first to the transactional outbox. If the outbox cannot accept the event:

- Do not falsely claim that audit succeeded. Follow the documented fail-closed policy. Preserve generic client-facing security responses.

## 17. Retry Behaviour

The dispatcher applies bounded retry:

- `attempt_count` is incremented on each attempt.
- `last_failure_code` is set to a stable failure code on each failure.
- `last_failure_at` is set to the failure timestamp.
- `available_at` is set to a backoff-computed timestamp on each failure (exponential backoff with jitter, bounded).
- The dispatcher does not retry indefinitely; after a bounded number of attempts, the event remains pending with `last_failure_code` set, and an `audit.delivery.failed` event is emitted to the platform chain (best-effort; if the audit store itself is unavailable, the operational log records the failure).

## 18. Privacy and Redaction Rules

- No password, password hash, raw session token, session-token hash, CSRF token, cookie, authorization header, private key, connection string, environment-variable value, or raw request/response body is ever persisted in audit data.
- For failed login attempts, the raw submitted email is NEVER stored. An HMAC of the normalised identifier is stored in `subject_identifier_hash` using `AUDIT_IDENTIFIER_HMAC_KEY`.
- The response does not reveal whether the account exists.
- The same generic client response is preserved.
- Metadata is sanitised through the forbidden-key detector and the size-limit validator before persistence.

## 19. Request Correlation

A stable request ID is introduced for every API request:

- Accept a valid client-provided request ID only under a clearly documented safe format (UUID v4 or a bounded alphanumeric string of ≤ 64 characters matching `^[A-Za-z0-9_-]{1,64}$`). Reject other formats; generate a UUID v4 instead.
- Generate a UUID v4 when no client-provided request ID is supplied or when the supplied ID is rejected.
- Include the request ID in the response header `X-Request-Id`.
- Propagate the request ID into audit events as `request_id`.
- Do not trust arbitrary unbounded client strings.
- Do not use request ID as an authorization factor.
- Maintain compatibility with current API tests.

A correlation ID may be accepted separately (under the same safe format, header `X-Correlation-Id`) or default to the request ID.

## 20. Current Actions That Will Be Audited

| Action | Audit event | Atomic with |
|---|---|---|
| Successful login | `authentication.login.succeeded` | Session creation + outbox row (same transaction) |
| Failed login | `authentication.login.failed` | Outbox row (no state mutation; outbox-only transaction) |
| Throttled login (when safely interceptable) | `authentication.login.throttled` | Outbox row |
| Logout | `authentication.logout.succeeded` | Session revocation + outbox row (same transaction) |
| Session invalid | `authentication.session.invalid` | Outbox row |
| Session expired | `authentication.session.expired` | Outbox row |
| Session rotated | `authentication.session.rotated` | Session rotation + outbox row (same transaction) |
| Origin denied | `security.origin.denied` | Outbox row |
| CSRF denied | `security.csrf.denied` | Outbox row |
| Authorization allowed | `authorization.decision.allowed` | Outbox row |
| Authorization denied | `authorization.decision.denied` | Outbox row |
| Context viewed | `tenant_context.viewed` | Outbox row |
| Context selected | `tenant_context.selected` | Active-membership update + outbox row (same transaction) |
| Context cleared | `tenant_context.cleared` | Active-membership clear + outbox row (same transaction) |
| R13 role assigned (dev bootstrap) | `rbac.role.assigned` | Role-assignment insert + outbox row (same transaction) |
| Audit delivery failed | `audit.delivery.failed` | Outbox row (best-effort) |
| Audit integrity verified | `audit.integrity.verified` | Audit-store append |
| Audit integrity verification failed | `audit.integrity.verification_failed` | Audit-store append |

## 21. Out-of-Scope Actions

The following are explicitly out of scope for this batch:

- Patient, encounter, appointment, billing, inventory, configuration, feature-flag, reporting, or audit-management UI functionality.
- Public audit querying.
- Retention and disposal.
- Legal hold.
- Audit exports.
- Compliance reports.
- Offline audit synchronisation.
- Alerting and security-operations integration.
- Key rotation workflow beyond key-version support.
- Audit dashboard, audit search UI, arbitrary metadata search.
- Customer-facing audit query endpoint.

## 22. Migration Strategy

### Transactional store

A new migration `20260719130000_audit_outbox_foundation` adds the `audit_outbox_events` table with the columns summarised in ADR-014 §1.4. The migration is reviewed raw SQL (per ADR-012 §1.4 safeguard 3).

### Audit store

The audit store has its own migration history under `apps/api/prisma-audit/migrations/`. The first migration `20260719130000_audit_store_foundation` creates:

- The `audit_events` table with the columns summarised in ADR-014 §1.3.
- The `audit_chain_heads` table.
- The required indexes.
- The immutability triggers (BEFORE UPDATE OR DELETE, BEFORE TRUNCATE).
- The runtime-role grants (INSERT, SELECT on `audit_events` and `audit_chain_heads`).

The audit-store migration is applied by a separate `prisma migrate deploy` invocation that points at `AUDIT_DATABASE_URL` and the `prisma-audit` schema. The transactional-store migration is applied by the existing `prisma migrate deploy` invocation.

No previously applied migration is modified.

## 23. Test Plan

### Audit-store tests (`apps/api/test/audit/audit-store.db-spec.ts`)

- Audit migrations apply to an empty audit database.
- First platform-chain event appends correctly.
- First tenant-chain event appends correctly.
- Different tenants have independent chains.
- Sequence numbers are monotonic.
- Concurrent appends do not fork the chain.
- Duplicate event ID is idempotent.
- Update is rejected.
- Delete is rejected.
- Truncate is rejected.
- Unknown enum or action values are rejected where constrained.
- Forbidden metadata is rejected.
- Oversized metadata is rejected.
- Integrity verification succeeds on a valid chain.
- Integrity verification detects tampering.
- Integrity verification detects missing events.
- Identifier hashing is deterministic for the same normalised identifier.
- Raw email is absent from failed-login records.

### Outbox tests (`apps/api/test/audit/audit-outbox.db-spec.ts`)

- Outbox record is inserted atomically with session creation.
- Outbox record is inserted atomically with session rotation.
- Outbox record is inserted atomically with logout.
- Outbox record is inserted atomically with context selection.
- Outbox record is inserted atomically with context clearing.
- Mutation rolls back when outbox creation fails.
- Pending event survives audit-database unavailability.
- Dispatcher delivers pending events later.
- Duplicate dispatcher execution does not duplicate final events.
- Delivered rows are not reprocessed.
- Concurrent dispatchers are safe.

### Concurrency tests (`apps/api/test/audit/audit-concurrency.audit-concurrency-spec.ts`)

- Two dispatchers claim disjoint event sets.
- Ten concurrent dispatchers process a shared pending set without duplicate final audit events.
- A dispatcher crashes after claiming but before delivery.
- The abandoned lease expires and another dispatcher reclaims it.
- A stale dispatcher cannot mark an event delivered after its lease was reassigned.
- Duplicate delivery attempts create only one immutable audit event.
- Every pending event is eventually either delivered or remains retryable with an explicit failure state.
- Chain sequence remains continuous and does not fork under concurrent delivery.
- A delivered event is never reclaimed.
- One dispatcher cannot mark an event delivered when another dispatcher owns its active lease.
- Failed delivery releases the event through retry or lease expiry.

### Atomicity rollback tests (`apps/api/test/audit/audit-atomicity.audit-atomicity-spec.ts`)

- Login session creation rolls back when outbox insertion fails.
- Session rotation rolls back when outbox insertion fails.
- Logout revocation rolls back when outbox insertion fails.
- Tenant-context selection rolls back when outbox insertion fails.
- Tenant-context clearing rolls back when outbox insertion fails.

### Configuration tests (`apps/api/test/audit/audit-configuration.spec.ts`)

- Production fails closed when `AUDIT_INTEGRITY_HMAC_KEY` is absent.
- Production fails closed when `AUDIT_IDENTIFIER_HMAC_KEY` is absent.
- Production fails closed when the integrity key is shorter than 256 bits.
- Production fails closed when the identifier key is shorter than 256 bits.
- Production fails closed when both HMAC keys are identical.
- Production fails closed when placeholder values are used.
- Production fails closed when the key version is missing or invalid.
- Development and tests allow placeholder values.
- `validateAuditKey` and `validateAuditKeyPair` unit tests for all rejection paths.

### Verification tests (`apps/api/test/audit/audit-verify.audit-verify-spec.ts`)

- Successful verification emits `audit.integrity.verified` (via the CLI script, not the verifier itself).
- Failed verification emits `audit.integrity.verification_failed` (via the CLI script).
- Verification does not recursively audit itself forever.
- The verifier exits non-zero on failure.
- No integrity key is exposed in verification results.
- CLI-level tests for success and deliberate corruption.

### Integration tests (`apps/api/test/audit/audit-integration.audit-integration-spec.ts`)

- Successful login creates the correct audit event.
- Failed login creates an event without raw email.
- Invalid Origin creates a denied security event.
- Allowed authorization decision is audited.
- Denied authorization decision is audited (R14 context denial).
- Context view is audited.
- Context selection is audited.
- Context clearing is audited.
- Logout is audited.
- Request IDs match between response and audit event.
- Existing generic error responses remain unchanged.
- No secrets appear anywhere in persisted audit data.
- Simulated audit-store outage: pending event survives and is delivered exactly once after recovery.
- Throttled login emits `authentication.login.throttled` without raw email or account-existence leak.
- Expired session emits `authentication.session.expired` exactly once.
- Invalid request IDs are replaced, not trusted.
- Oversized request IDs are replaced, not trusted.
- Correlation ID defaults to request ID when absent.
- Oversized correlation IDs are normalised to the request ID.
- Every API response contains the X-Request-Id header.
- Integrity verification passes after normal operation.

## 24. Risks

| Risk | Mitigation |
|---|---|
| The audit store is unavailable during a state mutation. | The outbox preserves the audit record; the dispatcher retries. The state mutation commits because the outbox commit is in the same transaction. |
| The dispatcher is unavailable. | Bounded retry; explicit `audit:dispatch` command for manual invocation; in-process periodic timer for automatic invocation. |
| The integrity key is leaked. | Key versioning supports rotation; key-rotation workflow deferred to a future ADR. The integrity key is not stored in the audit database. |
| The identifier key is leaked. | Separate identifier key; key rotation replaces the key; historical identifiers remain hashed with the old key (a future key-rotation workflow may add a key-version field to identifier hashing). |
| Concurrent appends fork the chain. | Row-level locking on the chain-head table prevents forks; concurrency tests verify. |
| A forbidden key slips into metadata. | The forbidden-key detector runs at emission time and at audit-store-append time; tests verify. |
| A raw email slips into a failed-login record. | The identifier HMAC helper is the only path to set `subject_identifier_hash`; tests verify the raw email is absent. |
| An audit event is lost between the outbox and the audit store. | Idempotent delivery by `event_id`; duplicate dispatcher execution does not duplicate final events; the outbox row is not marked delivered until the audit store acknowledges. |
| The verifier recurses infinitely. | The verifier does not audit verification-of-verification; an `audit.integrity.verified` event is emitted only for explicit verifier invocations, not for the verifier's own audit-store appends. |
| The runtime role has too many privileges. | The runtime role has only INSERT and SELECT on audit tables; the migration role is the only role with DDL privileges. |
| Existing API error behaviour changes. | The instrumentation is additive; existing error responses and Batch 8 security ordering are preserved. Tests verify. |
| The audit store's schema evolves incompatibly. | The `event_version` field supports backward-compatible evolution; the canonical serializer is versioned. |

## 25. Acceptance Criteria

Batch 9 is complete only when:

- ADR-014 is written and aligned with canonical architecture.
- The audit store is separate from the transactional database.
- The transactional outbox is implemented.
- State mutations and their outbox events are atomic.
- Final audit records are immutable.
- UPDATE, DELETE, and TRUNCATE are rejected by PostgreSQL.
- Audit delivery is idempotent.
- Audit chains are cryptographically tamper-evident.
- Tenant chains are independent.
- Concurrent event append does not fork a chain.
- Failed login identifiers are HMAC-hashed and never stored raw.
- No password, token, CSRF value, cookie, authorization header, or secret is persisted.
- Authentication, authorization, Origin, CSRF, context, logout, and current RBAC events are audited.
- Integrity verification detects deliberate tampering.
- All pending outbox events can be delivered after a simulated outage.
- Existing API error behaviour and Batch 8 security ordering remain unchanged.
- All database, auth, context, audit, frontend, build, lint, and type checks pass.
- One clean local commit is created.

## 26. Definition of Done

- [ ] Step 1 — This worklog document is written and checked against canonical references.
- [ ] Step 2 — ADR-014 is written and aligned with canonical architecture.
- [ ] Step 3 — The framework-agnostic audit contracts are implemented in `packages/observability`.
- [ ] Step 4 — The action-code catalogue is implemented in `packages/observability`.
- [ ] Step 5 — The canonical serializer, the integrity-hash helper, the identifier HMAC helper, the forbidden-key detector, and the safe metadata validator are implemented in `packages/observability`.
- [ ] Step 6 — The audit-store Prisma schema and migration are created under `apps/api/prisma-audit/`.
- [ ] Step 7 — The `AuditOutboxEvent` Prisma model and migration are added to the transactional store.
- [ ] Step 8 — The immutability triggers and the runtime-role grants are added to the audit-store migration.
- [ ] Step 9 — The audit-chain-head table and the row-level-locking append logic are implemented.
- [ ] Step 10 — The audit dispatcher is implemented with `audit:dispatch` and `audit:verify` commands.
- [ ] Step 11 — The integrity verifier is implemented.
- [ ] Step 12 — The request-ID middleware is implemented.
- [ ] Step 13 — The audit instrumentation is added to auth, session, logout, authorization guard, Origin/CSRF, context, and the dev bootstrap.
- [ ] Step 14 — Environment-variable support is added; `.env.example` is updated with placeholder values only.
- [ ] Step 15 — Audit-store tests, outbox tests, and integration tests are added.
- [ ] Step 16 — All validation commands pass.
- [ ] Step 17 — Prisma schema comments, code comments, `worklog.md`, ADR-014 status, and this worklog document are updated.
- [ ] Step 18 — A single local commit `Implement audit primitive foundation` is created.

## 27. Next Batch

The next required platform batch is TBD. Candidate batches include:

- Patient registration foundation (the first patient-related business module).
- Facility context selection (extending tenant context to facility).
- Audit query surface (a scoped, permission-governed audit query endpoint for compliance officers).

The next batch will be specified in a separate batch worklog.
