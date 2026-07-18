# ADR-007: Feature Flags Implementation Packaging for v1
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-007: Feature Flags Implementation Packaging for v1 |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Ratified Decision |
| Version | 1.0.0 |
| Status | Proposed |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review before v1 general availability |
| Audience | Senior software architects, engineering leadership, module owners for M15 Configuration and BC18 Feature Flags, configuration service team, feature flag service team, product council |
| Scope | The decision to package the Feature Flags implementation surface within the Configuration/Settings module (M15) for the v1 platform release, while preserving Feature Flags as a conceptually separate bounded context (BC18) with its own data ownership, contracts, and future extractability. This is implementation packaging, not a domain ownership merger. |
| Out of Scope | The specific feature flag schema, evaluation engine selection, rollout strategy taxonomy, feature flag tooling, the future ADR that may extract Feature Flags into its own module surface, runtime feature flag enforcement points in the experience and edge layers |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md` is resolved in favour of `SYSTEM_ARCHITECTURE.md` until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR (e.g., ADR-011 or later) that either continues the v1 packaging into v2 or extracts Feature Flags into its own module surface |

> **Document Purpose:** This ADR ratifies the v1 implementation packaging decision for the Feature Flags bounded context. BC18 Feature Flags remains its own bounded context per `SYSTEM_ARCHITECTURE.md` Section 7.2 — with its own domain responsibility, its own data ownership, its own query contracts, and its own event contracts. For the v1 platform release only, the Feature Flags implementation surface (the module surface that engineers and administrators interact with) is packaged within the M15 Configuration/Settings module. This is implementation packaging, not a domain ownership merger. The bounded context retains its conceptual separation, its contract surface, and its future extractability into a dedicated module if and when an Architecture Council decision justifies extraction.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 7.2 (bounded context catalogue — BC18 Feature Flags), Section 7.7 (bounded-context-to-module mapping deviations), Section 14 (Feature Flag Strategy), Section 15 (Configuration Strategy), Section 9 (Modular Architecture). `MODULE_ARCHITECTURE.md` Section 2.4 (deviation catalogue). `CONFIGURATION_ARCHITECTURE.md` (feature flag configuration exposure).

> **Related ADRs:** ADR-001 (Configuration-Driven Architecture), ADR-002 (Modular Architecture), ADR-005 (Module Architecture). Future successor ADR will either continue the v1 packaging into v2 or extract Feature Flags into a dedicated module surface (M-??).

> **Predecessor:** None. **Supersedes:** None. **Superseded by:** None (future ADR pending).

> **Audit Findings Resolved:** F-01 (fabricated architectural deviation — BC18 Feature Flags within M15 Configuration, falsely attributed to `SYSTEM_ARCHITECTURE.md` Section 7.7), F-18 (`SETTINGS.md` over-claims BC18 Feature Flags ownership without canonical ratification). This ADR replaces the fabricated deviation with a ratified packaging decision.

> This Architectural Decision Record (ADR) documents a significant architectural decision made for the Ibn Hayan Healthcare Operating System. ADRs are immutable historical records — once a decision is superseded, a new ADR is created rather than editing this one in place.

---

## Table of Contents

1. Decision Statement
2. Context
3. Alternatives Considered
4. Consequences
5. Status
6. Future Notes

---

## 1. Decision Statement

### 1.1 The Decision

The Feature Flags bounded context (BC18), as defined in `SYSTEM_ARCHITECTURE.md` Section 7.2, retains its full conceptual separation from the Configuration bounded context. BC18 owns its own domain responsibility (flag definition, flag evaluation, rollout strategy, flag-state lifecycle), its own data (flag definitions, rollout percentages, segment memberships, evaluation results), its own query contracts (flag-state lookups, rollout configuration queries), and its own event contracts (flag-changed events, rollout-progress events). The bounded context is not merged with the Configuration bounded context; it is not absorbed into M15 Configuration as a sub-capability; it does not lose its identity as a first-class domain.

For the v1 platform release only, the Feature Flags implementation surface — the module-level surface through which engineers define flags, administrators manage rollouts, and runtime callers evaluate flag state — is packaged within the M15 Configuration/Settings module. This means that the M15 module surface exposes both configuration management capabilities and feature flag management capabilities through a single administrative experience, a single module boundary, and a single deployment unit. The packaging is an implementation choice for v1; it does not ratify a domain-level merger.

This decision is reversible. A future ADR may extract the Feature Flags implementation surface into its own dedicated module (assigned a new M-code, e.g., M20 or M21) when one of the triggers documented in §6.1 fires. The extraction will preserve BC18's contract surface; downstream consumers will not experience a contract break, only a relocation of the surface through which they access those contracts.

### 1.2 Scope of Application

The decision applies to the v1 platform release. It governs the implementation packaging of the Feature Flags bounded context only; it does not govern the bounded context's domain responsibility, which remains defined by `SYSTEM_ARCHITECTURE.md` Section 7.2 and is unaffected by this ADR. The decision binds every consumer of BC18 contracts: every module that performs flag evaluation, every administrator who manages flag rollouts, every engineer who defines a new flag, and every auditor who reviews flag-state history. The decision does not prescribe the specific schema for flag definitions, the specific evaluation algorithm, or the specific rollout strategy taxonomy; those are owned by `SYSTEM_ARCHITECTURE.md` Section 14 and by BC18's own reference documentation.

The decision is scoped to v1. "v1" is defined as the period from the platform's initial general availability release until the earlier of (a) the ratification of a successor ADR that extracts Feature Flags into its own module surface, or (b) the ratification of a successor ADR that explicitly extends this packaging decision into v2. Without a successor ADR, the v1 packaging continues indefinitely, but the Architecture Council commits to reviewing the decision at v1 general availability and at each major release thereafter.

### 1.3 Implementation Packaging, Not Domain Merger

The distinction between implementation packaging and domain ownership merger is load-bearing for this ADR and must not be eroded:

| Aspect | Implementation Packaging (this ADR) | Domain Ownership Merger (rejected) |
|---|---|---|
| Bounded context identity | BC18 retains its identity as a separate bounded context | BC18 would be absorbed into BC15 Configuration; BC18 would cease to exist |
| Data ownership | BC18 owns flag definitions, rollout state, evaluation results | Configuration would own flag data; no separate flag data ownership |
| Query contracts | BC18 exposes its own query contracts (flag-state lookups, rollout queries) | Configuration would expose flag queries as part of its contract surface |
| Event contracts | BC18 emits its own events (flag-changed, rollout-progress) | Configuration would emit flag events as part of its event surface |
| Module surface | M15 exposes both Configuration and Feature Flags management through a single administrative experience | M15 would be the single owner of both domains; no separate Feature Flags surface would exist |
| Future extractability | BC18 can be extracted into its own module surface via a future ADR without a contract break | Extraction would require a domain-level decomposition; contracts would break |
| Audit trail | Flag-state changes are audited under BC18's audit category; configuration changes under BC15's audit category | All changes would be audited under Configuration's audit category; flag-state history would be conflated with configuration history |

The right column is explicitly rejected by this ADR. The packaging decision commits to the left column exclusively.

### 1.4 Decision Properties

| Property | Value |
|---|---|
| Reversibility | High — extraction is a future ADR away; contract surface is preserved |
| Cost of Wrong Decision | Low — if v1 packaging proves awkward, extraction is bounded and contract-preserving |
| Affected Layers | Module layer (M15 surface expands to include Feature Flags management); Experience layer (administrative UI for flags is co-located with configuration UI); Platform Services layer (flag evaluation service is co-deployed with configuration service) |
| Affected Principles | P2 (Configuration Before Customization — feature flags are a configuration-adjacent adaptation mechanism), P4 (Modular Boundaries — the packaging respects module boundaries; BC18 contracts are not violated), P10 (Multi-Tenancy — flag state is tenant-scoped), P13 (Audit as Primitive — flag-state changes are audited) |
| ADR Required | Yes — this ADR |

### 1.5 Decision Boundaries

The decision ratifies the v1 implementation packaging of Feature Flags within M15 Configuration/Settings; it does not ratify the specific implementation technology, the specific evaluation engine, the specific rollout strategy taxonomy, or the specific flag schema. Those are owned by `SYSTEM_ARCHITECTURE.md` Section 14 (Feature Flag Strategy) and by BC18's own reference documentation. The decision does not preclude a future extraction ADR; it explicitly preserves extractability. The decision does not merge BC18 into BC15; the two bounded contexts remain separate per `SYSTEM_ARCHITECTURE.md` Section 7.2. The decision does not modify the canonical 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2; the v1 packaging does not add a new module to the catalogue, nor does it remove one.

---

## 2. Context

### 2.1 The Feature Flags Bounded Context

`SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC18 Feature Flags as a first-class bounded context with domain responsibility "feature flag lifecycle, rollout strategy, flag-state evaluation." The bounded context owns flag definitions (flag key, flag type, default state, variation schema), rollout configuration (percentage rollouts, segment-targeted rollouts, gradual rollout schedules), evaluation state (per-tenant, per-user, per-session flag evaluation results), and flag-state history (audit trail of flag changes and evaluation outcomes). The bounded context exposes query contracts (flag-state lookup, rollout configuration query, evaluation history query) and emits event contracts (flag-changed, rollout-progress, evaluation-anomaly).

BC18 is consumed by every other module that performs flag-gated behaviour: clinical modules that gate experimental features, billing modules that gate pricing-strategy variants, notification modules that gate channel preferences, identity modules that gate permission-policy variants. The consumption pattern is broad; BC18 is one of the most widely consumed bounded contexts in the platform.

### 2.2 The Configuration Bounded Context

`SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC15 Configuration as a first-class bounded context with domain responsibility "configuration lifecycle, configuration validation, configuration audit." The bounded context owns configuration keys, configuration values, the eight-layer precedence model (platform default → edition → tenant → facility → department → care team → user → session), configuration validation rules (five categories: Structural, Referential, Semantic, Contextual, Regulatory), and configuration audit trail. BC15 is exposed through the M15 Configuration/Settings module, which provides the administrative experience for configuration management and the runtime contracts for configuration evaluation.

### 2.3 The Pre-ADR State

Prior to this ADR, the relationship between BC18 Feature Flags and M15 Configuration/Settings was undefined in canonical. `SYSTEM_ARCHITECTURE.md` Section 7.2 defined BC18 as a separate bounded context but did not specify which module surface exposes its implementation. `PRODUCT_BIBLE.md` Section 19.2 defined the 19-module catalogue but did not include a Feature Flags module. The architectural intent was ambiguous: BC18 was a bounded context without a corresponding module, similar to how M17 Integration and M18 Reporting have no dedicated bounded context (audit Section 6.4).

This ambiguity produced a defect. `MODULE_ARCHITECTURE.md` Section 2.4 and `docs/07_MODULES/SETTINGS.md` Sections 1.1 and 1.2 cited `SYSTEM_ARCHITECTURE.md` Section 7.7 as the source of a "BC18 Feature Flags implemented within M15 Configuration" deviation. The actual `SYSTEM_ARCHITECTURE.md` Section 7.7 does not contain this deviation; it documents only the BC09 Inventory deviation (and a misleading note about BC14 Notifications that is corrected separately). The citation was fabricated, and downstream documentation was actively citing a canonical section that did not contain what was claimed. This ADR replaces the fabricated citation with a ratified decision.

### 2.4 Forces Driving the Decision

| Force | Description |
|---|---|
| v1 Simplicity | The v1 platform release benefits from a smaller module count. Packaging Feature Flags within M15 reduces the module catalogue surface that administrators and engineers must learn at v1 general availability. |
| Operational Adjacency | Feature flag management and configuration management are operationally adjacent — both are administrative surfaces, both are governed by validation and audit, both are tenant-scoped. Co-locating them in a single module surface mirrors how administrators think about the platform. |
| Industry Convention | Production healthcare and SaaS platforms conventionally co-locate feature flag management with configuration management in the administrative experience. Deviating from this convention at v1 would impose a learning cost without proportional architectural benefit. |
| BC18 Consumption Pattern | BC18 is consumed broadly across the platform. A dedicated Feature Flags module would add a 20th module to the catalogue and require every consumer module to declare a dependency on it. Packaging within M15 allows consumers to declare a single dependency on M15 (which they already declare for configuration) and access both configuration and flag-state contracts through the M15 surface. |
| Future Extractability | The packaging decision is reversible. If BC18's implementation surface grows to a point where co-location with M15 becomes awkward (e.g., flag evaluation latency dominates M15's runtime budget, flag management UI becomes a separate product surface), a future ADR can extract BC18 into its own module without breaking contracts. |
| Audit Integrity | Flag-state changes and configuration changes are audited under separate audit categories (BC18 and BC15 respectively), even when both are accessed through the M15 module surface. The packaging does not conflate the audit trails. |

### 2.5 Constraints Bounding the Decision

The decision is bounded by several explicit constraints. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC18 as a separate bounded context; this ADR does not merge it. `PRODUCT_BIBLE.md` Section 19.2 defines the 19-module catalogue; this ADR does not expand it. ADR-001 (Configuration-Driven Architecture) ratifies configuration as the primary adaptation mechanism; feature flags are a configuration-adjacent adaptation mechanism and are governed by the same configuration-over-customization principle. ADR-002 (Modular Architecture) ratifies the modular monolith default; the v1 packaging is consistent with this default (single deployment unit, in-process contracts). ADR-005 (Module Architecture) defines module boundary rules; the v1 packaging respects these rules (BC18 contracts are exposed through M15's contract surface, but BC18 retains its own contract definitions).

### 2.6 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md` and `PRODUCT_BIBLE.md`. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC18 Feature Flags as a bounded context; Section 14 defines the Feature Flag Strategy; Section 15 defines the Configuration Strategy. `PRODUCT_BIBLE.md` Section 19.2 defines the 19-module catalogue. This ADR does not introduce new architectural commitments; it ratifies a v1 implementation packaging decision that resolves the ambiguity in the pre-ADR state and replaces the fabricated citation in `MODULE_ARCHITECTURE.md` Section 2.4 and `SETTINGS.md`.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Reject the Packaging; Require a Dedicated Feature Flags Module at v1

**Description:** BC18 Feature Flags is implemented through a dedicated M20 Feature Flags module from v1 general availability. The 19-module catalogue is expanded to 20. Every consumer module declares a dependency on M20 for flag evaluation. The administrative experience for feature flag management is a separate surface from the configuration management experience.

**Verdict:** Rejected for v1. The dedicated module is the architecturally cleaner long-term posture, but it imposes v1 costs that are not justified by current requirements: a larger module catalogue at v1 general availability, a separate administrative experience that administrators must learn, and a separate dependency declaration for every consumer module. The dedicated module is the right answer if and when BC18's implementation surface grows beyond what co-location with M15 can support; it is not the right answer at v1.

**Future Trigger:** This alternative becomes the recommended extraction path when the triggers in §6.1 fire.

### 3.2 Alternative B — Merge BC18 into BC15 Configuration

**Description:** BC18 Feature Flags is absorbed into BC15 Configuration as a sub-capability. The bounded context catalogue in `SYSTEM_ARCHITECTURE.md` Section 7.2 is amended to remove BC18. Flag definitions, rollout state, and evaluation results become configuration data owned by BC15. Flag queries and events are exposed as part of BC15's contract surface. The audit trail conflates flag-state changes with configuration changes.

**Verdict:** Rejected. This alternative conflates two distinct domain responsibilities. Configuration management owns static key-value pairs validated by structural and referential rules; feature flag management owns dynamic rollout state validated by semantic and contextual rules. Merging them produces a bounded context with two distinct data models, two distinct validation frameworks, and two distinct audit categories — a bounded context that does not have a coherent identity. The merger also forecloses future extraction: once BC18 is absorbed, extracting it requires a domain-level decomposition that breaks contracts. This alternative is the domain ownership merger that §1.3 explicitly rejects.

### 3.3 Alternative C — Defer Feature Flags to Post-v1

**Description:** BC18 Feature Flags is recognised as a bounded context but has no module surface at v1. Feature flag capabilities are not available at v1 general availability; the platform relies on configuration-only adaptation (per ADR-001) until a future release introduces feature flag management.

**Verdict:** Rejected. Feature flags are a load-bearing adaptation mechanism for v1. The platform's multi-tenant model (ADR-004), edition-based feature exposure (`PRODUCT_BIBLE.md` Section 14), and gradual rollout strategy for new capabilities all depend on feature flag evaluation. Deferring feature flags to post-v1 would force the platform to either expose all v1 features to all tenants (eliminating edition-based differentiation) or to gate features through configuration-only mechanisms (which are not designed for runtime evaluation). Neither outcome is acceptable for v1.

### 3.4 Alternative D — Continue the Pre-ADR Ambiguity

**Description:** Leave the relationship between BC18 and M15 undefined in canonical. Allow downstream documentation to make local decisions about how to describe the relationship.

**Verdict:** Rejected. The pre-ADR ambiguity produced a defect (fabricated citation in `MODULE_ARCHITECTURE.md` Section 2.4 and `SETTINGS.md`). Continuing the ambiguity invites further fabrication. The Architecture Council must make an explicit decision and document it; this ADR is that decision.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| v1 Module Catalogue Stability | The 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 is preserved at v1. No module is added; no module is removed. The catalogue that engineers and administrators learn at v1 general availability is the catalogue they will use throughout v1. |
| Administrative Experience Coherence | Feature flag management and configuration management are co-located in a single administrative experience. Administrators do not need to switch between two module surfaces to manage adaptation mechanisms. |
| Single Dependency Declaration | Consumer modules declare a single dependency on M15 (which they already declare for configuration) and access both configuration and flag-state contracts through the M15 surface. The dependency graph is simpler. |
| Audit Trail Integrity | Flag-state changes are audited under BC18's audit category; configuration changes are audited under BC15's audit category. The two audit trails remain separable even when both are accessed through the M15 module surface. Regulatory investigations can reconstruct flag state independently of configuration state. |
| Future Extractability | The packaging decision is reversible. A future ADR can extract BC18 into its own module surface without breaking contracts. Downstream consumers experience a relocation of the surface, not a contract break. |
| Fabricated Citation Resolved | The fabricated citation in `MODULE_ARCHITECTURE.md` Section 2.4 and `SETTINGS.md` is replaced with a ratified ADR reference. Downstream documentation no longer cites a canonical section that does not contain what is claimed. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| M15 Module Surface Grows | The M15 Configuration/Settings module surface expands to include feature flag management. The module's reference documentation (`SETTINGS.md`) becomes longer and covers two distinct domain responsibilities. The module's contract surface becomes broader. |
| Conceptual Coupling Risk | Engineers may conflate Feature Flags with Configuration, eroding the distinction that §1.3 protects. The risk is mitigated by clear documentation in `SETTINGS.md` and by separate audit categories, but the risk is non-zero. |
| Future Extraction Cost | If a future ADR extracts BC18 into its own module, the extraction will require migrating the M15 implementation surface, updating downstream documentation, and re-training administrators on the new module surface. The cost is bounded (contracts are preserved) but non-zero. |
| Settings.md Citation Backlog | `SETTINGS.md` currently cites `SYSTEM_ARCHITECTURE.md` Section 7.7 as the source of the BC18-within-M15 deviation. This ADR does not amend `SETTINGS.md` (Phase 3 work in the remediation plan); the citation must be corrected in a separate downstream pass. The ADR's existence allows that correction to proceed with a ratified reference. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| BC18 Catalogue Entry Unchanged | BC18 remains in `SYSTEM_ARCHITECTURE.md` Section 7.2 as a separate bounded context. No canonical amendment to the bounded context catalogue is required by this ADR. |
| `SYSTEM_ARCHITECTURE.md` Section 7.7 Amendment Pending | The canonical deviation catalogue in Section 7.7 must be amended (in a separate Phase 1 canonical amendment) to document the v1 packaging as a ratified packaging decision rather than a fabricated deviation. This ADR authorises that amendment but does not perform it. |
| Module Catalogue Unchanged | `PRODUCT_BIBLE.md` Section 19.2 is unchanged. The 19-module catalogue is preserved. No new M-code is assigned to Feature Flags at v1. |

---

## 5. Status

### 5.1 Current Status

**Proposed.** This ADR is drafted and submitted to the Architecture Council for ratification. Upon ratification, the Status field is updated to **Ratified**, the Version field is incremented to 1.0.0 (if ratified as-is) or 1.1.0 (if ratified with amendments), and the ADR is added to the canonical ADR index.

### 5.2 Ratification Criteria

The Architecture Council ratifies this ADR when:

- [ ] The Council confirms that BC18 Feature Flags is a separate bounded context per `SYSTEM_ARCHITECTURE.md` Section 7.2.
- [ ] The Council confirms that the v1 implementation packaging within M15 Configuration/Settings is acceptable for v1 general availability.
- [ ] The Council confirms that the packaging is reversible via a future extraction ADR.
- [ ] The Council confirms that the audit trail separation (BC18 audit category distinct from BC15 audit category) is a binding commitment of the packaging.
- [ ] The Council commits to reviewing the decision at v1 general availability and at each major release thereafter.

### 5.3 Implementation Triggers

Upon ratification, the following implementation work is authorised (but not performed by this ADR):

- **Phase 1 canonical amendment:** Amend `SYSTEM_ARCHITECTURE.md` Section 7.7 to document the v1 packaging as a ratified packaging decision (not a deviation); cite this ADR.
- **Phase 1 canonical amendment:** Amend `MODULE_ARCHITECTURE.md` Section 2.4 to remove the fabricated BC18-within-M15 deviation claim; replace with a v1 packaging note citing this ADR.
- **Phase 1 canonical amendment:** Amend `SYSTEM_ARCHITECTURE.md` Section 14 (Feature Flag Strategy) to add a cross-reference to this ADR.
- **Phase 1 canonical amendment:** Amend `CONFIGURATION_ARCHITECTURE.md` (feature flag configuration section) to add a cross-reference to this ADR.
- **Phase 3 downstream correction:** Amend `docs/07_MODULES/SETTINGS.md` Sections 1.1 and 1.2 to replace the fabricated `SYSTEM_ARCHITECTURE.md Section 7.7` citation with a reference to this ADR.

---

## 6. Future Notes

### 6.1 Extraction Triggers

The v1 packaging continues until one of the following triggers fires. When a trigger fires, the Architecture Council must convene to either ratify a successor extraction ADR or explicitly extend the v1 packaging into v2.

| Trigger | Description |
|---|---|
| Implementation Surface Growth | BC18's implementation surface (flag schema, rollout strategy taxonomy, evaluation engine complexity) grows to a point where co-location with M15 Configuration produces a module surface that is no longer coherent. Threshold: `SETTINGS.md` exceeds 1,500 lines, or feature flag management content exceeds 40% of the module surface. |
| Evaluation Latency Dominance | Feature flag evaluation latency becomes a significant fraction of M15's runtime budget, justifying a separately deployable service for flag evaluation. Threshold: flag evaluation exceeds 20% of M15's CPU time, or flag evaluation latency exceeds platform SLO targets. |
| Administrative Experience Divergence | Feature flag management becomes a distinct administrative experience that no longer fits naturally within the configuration management UI. Threshold: feature flag management requires its own permission policy, its own role set, or its own dashboard surface. |
| Module Catalogue Pressure | The Architecture Council decides to expand the module catalogue for other reasons (e.g., adding M20 for a different capability), making the marginal cost of adding M21 for Feature Flags acceptable. |
| Audit Trail Conflation Risk | The audit trail separation between BC18 and BC15 proves difficult to maintain in practice, justifying extraction to enforce separation structurally. |
| v2 Major Release | The v2 major release planning cycle is a natural point to reconsider the v1 packaging decision, regardless of whether any specific trigger has fired. |

### 6.2 Extraction Process

When a trigger fires, the extraction proceeds as follows:

1. **Draft extraction ADR** (e.g., ADR-011 or later) citing the trigger that fired and the proposed extraction approach.
2. **Assign new M-code** to the extracted Feature Flags module (e.g., M20 or M21, depending on catalogue state at extraction time).
3. **Amend `PRODUCT_BIBLE.md` Section 19.2** to add the new module to the catalogue.
4. **Amend `SYSTEM_ARCHITECTURE.md` Section 7.7** to remove the v1 packaging note and document the extraction.
5. **Amend `MODULE_ARCHITECTURE.md` Section 2.4** to remove the v1 packaging note.
6. **Migrate the M15 implementation surface** to the new module surface. Contract surface is preserved; downstream consumers experience a relocation, not a contract break.
7. **Update downstream documentation** to reference the new module surface instead of M15.
8. **Update administrative UI** to expose feature flag management through the new module surface.
9. **Mark this ADR as Superseded** by the extraction ADR.

### 6.3 Open Questions for Future ADRs

| Question | Description |
|---|---|
| Flag Schema | The specific schema for flag definitions (flag key format, variation schema, default state representation) is owned by `SYSTEM_ARCHITECTURE.md` Section 14 and BC18 reference documentation, not by this ADR. |
| Evaluation Engine | The specific evaluation engine (in-process evaluation, remote evaluation, hybrid) is an implementation choice governed by selection criteria, not by this ADR. |
| Rollout Strategy Taxonomy | The specific rollout strategy taxonomy (percentage, segment-targeted, gradual, canary) is owned by `SYSTEM_ARCHITECTURE.md` Section 14. |
| Flag-State Caching | The caching strategy for flag-state lookups (per-request, per-session, per-tenant) is an implementation choice. |

### 6.4 Relationship to Other ADRs

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Compatible. Feature flags are a configuration-adjacent adaptation mechanism; the v1 packaging does not violate configuration-over-customization. |
| ADR-002 (Modular Architecture) | Compatible. The v1 packaging is consistent with the modular monolith default (single deployment unit, in-process contracts). |
| ADR-005 (Module Architecture) | Compatible. The v1 packaging respects module boundary rules; BC18 contracts are exposed through M15's contract surface, but BC18 retains its own contract definitions. |
| ADR-008 (Rejection of Façade Module Category) | Independent. The v1 packaging is not a façade pattern; it is implementation packaging of a bounded context within an existing module surface. |
| ADR-009 (Subscriptions as a Billing Capability) | Independent. Subscriptions and Feature Flags are unrelated domain concerns. |
| ADR-010 (Inventory Bounded Context and Module Packaging) | Independent. Inventory and Feature Flags are unrelated domain concerns. |

---

> **End of ADR-007.** This ADR is a ratified decision record. Implementation work authorised by this ADR is performed in separate phases per the remediation plan; this ADR does not perform that work.
