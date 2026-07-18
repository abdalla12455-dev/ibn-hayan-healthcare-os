# ADR-005: UI Design Philosophy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to ratify thin-client-over-platform-contracts as the UI design philosophy for Ibn Hayan. The experience layer is a thin client that consumes platform contracts — commands, queries, events, configuration schemas — and contains no business logic and no durable state beyond what is required for offline operation. The UI is healthcare-native, role-aware, accessibility-first, and localization-first. Surface-specific and server-rendered alternatives are rejected; low-code UI generation is deferred for practitioner-facing surfaces.
>
> **Status:** Ratified · **Version:** 2.0.0 · **ADR Number:** 005 · **Last Updated:** 2026-07-18
> **Supersedes:** ADR-005 v1.0.0 (2026-07-18) · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 6.2 (Experience Layer), 22 (Extensibility Strategy, EP4), 26 (Localization Architecture)
> **Related ADRs:** ADR-001 (Configuration-Driven Architecture), ADR-003 (Local-First Strategy)
> **Related Product Bible Sections:** `PRODUCT_BIBLE.md` Sections 1.5 (The Ibn Hayan Identity), 5.6 (Principle P-5 — Practitioner Experience Over Procurement Satisfaction), 26 (Accessibility Strategy)
>
> This Architectural Decision Record (ADR) documents a significant architectural
> decision made for the Ibn Hayan Healthcare Operating System. ADRs are
> immutable historical records — once a decision is superseded, a new ADR is
> created rather than editing this one.

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

### 1.1 Decision Statement

The Ibn Hayan platform's user interface is a thin client that consumes platform contracts. The client invokes commands, queries, and event streams exposed by lower layers, and renders configuration schemas the platform provides. The client contains no business logic and holds no durable state beyond what is required for offline operation per ADR-003. UI behaviour is derived from platform contracts and configuration, not authored as standalone logic within the client. This decision applies uniformly across all interactive surfaces through which practitioners, administrators, and integrators interact with the platform.

The UI is healthcare-native, role-aware, accessibility-first, and localization-first. Healthcare-native means the interaction model is designed for clinical workflow first — practitioner latency, safety of selection, and density of relevant information — not retrofitted from a generic business application shell. Role-aware means the UI adapts to the user's role, permissions, and hierarchy scope through configuration. Accessibility-first means the platform meets recognized accessibility standards as a baseline architectural property, not a feature delivered later. Localization-first means the UI works in all supported languages, including right-to-left, as a first-class mode rather than a translation overlay.

### 1.2 Scope of the Decision

The decision applies to every interactive surface through which a human user interacts with the platform. This includes the web client, the mobile client, the desktop client, and the integrator console identified in `SYSTEM_ARCHITECTURE.md` Section 6.2, and extends to external portals — patient portal and partner portal — that present platform capability to non-practitioner users. The decision does not apply to integration-only surfaces, which exchange data with external systems through the Integration Layer and do not render a user experience.

The decision constrains, but does not prescribe, implementation choices. The choice of client framework for each surface is an implementation decision, deferred to surface-level engineering teams and not ratified by this ADR. Every surface must be a thin client over platform contracts, must contain no business logic, and must hold no authoritative durable state beyond the local store sanctioned by ADR-003. Surfaces that violate these constraints are non-conformant with this ADR regardless of the framework used to build them.

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — UI architecture is foundational; reversal requires client re-architecture across all surfaces |
| Cost of Wrong Decision | High — wrong choice produces inconsistent UX, leaked business logic, or compromised offline operation |
| Affected Layers | Experience Layer primarily; constrains contract design in Domain and Platform Services Layers |
| Tenancy Impact | All tenants; the philosophy is platform-wide, not edition-scoped |
| ADR Required | Yes — this ADR |

### 1.4 Ratified Properties

| Property | Definition |
|---|---|
| Healthcare-native | Interaction model designed for clinical workflow first; practitioner latency and selection safety override generic-app conventions |
| Role-aware | UI adapts to the user's role, permissions, and hierarchy scope through configuration, not per-role code paths |
| Accessibility-first | Meets recognized accessibility standards as a baseline property; accessibility regressions are defects |
| Localization-first | Works in all supported languages, including right-to-left locales, as a first-class mode |
| Thin over contracts | Client consumes platform contracts; it does not duplicate domain logic or hold authoritative state |
| Offline-capable | Supports local-first operation per ADR-003, including local capture, local audit, and synchronization |

---

## 2. Context

### 2.1 The UI Architecture Problem

Ibn Hayan serves a heterogeneous user population. The platform's fourteen user roles — clinicians, nurses, pharmacists, receptionists, billing clerks, administrators, technicians, integrators, and others enumerated in `PRODUCT_BIBLE.md` Section 19 — interact with the platform through multiple surfaces (web, mobile, desktop, integrator console, patient portal, partner portal), across multiple locales (including right-to-left languages per `SYSTEM_ARCHITECTURE.md` Section 26), and with diverse accessibility needs (per `PRODUCT_BIBLE.md` Section 26). The architectural question is how a single platform presents its capability across this spectrum without duplicating capability per surface, leaking business logic into the client, or compromising accessibility and localization.

The problem is compounded by the decade-horizon viability commitment (Principle P-18). Surfaces, devices, modalities, and interaction fashions will change over the decade, but the platform's domain capability must remain stable and accessible from whatever surface a future practitioner uses. A UI architecture tightly coupled to a specific surface technology, or that embeds business logic in client code, will not survive the decade horizon without rework that this ADR is explicitly designed to avoid.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Practitioner experience (P-5) | The UI is the daily-use surface for practitioners; per `PRODUCT_BIBLE.md` Section 5.6, practitioner experience prevails over procurement-stage impressions |
| Multi-surface consistency | The same domain capability must be available across surfaces without per-surface duplication or drift |
| Business logic integrity | Business logic must live in the Domain Layer; client-embedded logic produces inconsistency and auditability gaps |
| Offline-first (ADR-003) | The UI must operate against a local store as authoritative source during connectivity loss |
| Accessibility (Section 26) | Accessibility is an operational requirement, not a compliance checkbox; it is designed into workflow |
| Localization (Section 26, SA 26) | Localization, including right-to-left, is a first-class property; it cannot be retrofitted |
| Healthcare safety (P-1, P-18) | UI design affects clinical safety — mis-selection of patient, medication, or procedure must be prevented by design |
| Decade-horizon viability | The UI must evolve as surfaces and modalities change without re-platforming |

### 2.3 Constraints from Product Bible and Architecture

The decision is constrained by several commitments external to this ADR. `PRODUCT_BIBLE.md` Section 1.5 commits Ibn Hayan to practitioners-not-buyers: the platform is built for the people who use healthcare software daily, not for procurement committees, and every product decision is judged by what a practitioner will experience on a busy Tuesday afternoon. `PRODUCT_BIBLE.md` Section 5.6 (Principle P-5) makes this commitment enforceable: when a decision improves the procurement-stage impression at the cost of the practitioner-stage experience, the practitioner experience wins. `PRODUCT_BIBLE.md` Section 26 makes accessibility a platform-level commitment, not a module-level feature, and requires it to work in all supported languages including right-to-left.

`SYSTEM_ARCHITECTURE.md` Section 6.2 defines the Experience Layer as thin — it contains no business logic and holds no durable state beyond what is required for offline operation (Section 24). ADR-003 ratifies local-first operation as a first-class mode, with the local store as authoritative source during the operating window. ADR-001 ratifies configuration-driven architecture, which constrains UI behaviour to be governed by configuration rather than per-tenant code. Together these constraints make thin-client-over-contracts the only architecture simultaneously compatible with all ratified commitments.

### 2.4 Relationship to Adjacent ADRs

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | UI behaviour is driven by configuration schemas provided by the platform; the client renders configuration, not hardcoded behaviour |
| ADR-003 (Local-First Strategy) | UI must operate against the local store as authoritative source during connectivity loss; the client holds durable state only for offline operation |
| ADR-002 (Modular Architecture) | Bounded contexts expose commands, queries, events, and configuration schemas that the thin client consumes |
| ADR-004 (Multi-Tenant Strategy) | UI tenancy context is provided by the platform; the client does not enforce tenancy |

---

## 3. Alternatives Considered

Four alternatives were evaluated against the criteria of multi-surface consistency, business logic integrity, offline operation, accessibility, localization, and decade-horizon viability. Each alternative is described, compared against the criteria, and assigned a verdict.

### 3.1 Alternative A: Surface-Specific UI

In a surface-specific architecture, each surface — web, mobile, desktop — has its own UI implementation, with business logic embedded in the client layer. Each surface implements its own forms, its own workflow logic, its own permission checks, and its own data validation. Surfaces share contracts at the data level but do not share behavioural definitions.

| Criterion | Surface-Specific | Verdict |
|---|---|---|
| Multi-surface consistency | Low — surfaces diverge over time as each team makes independent choices | Rejects |
| Business logic integrity | Low — logic is duplicated across surfaces, with drift | Rejects |
| Offline operation | Possible per surface but requires duplicated offline logic | Rejects |
| Accessibility | Inconsistent — each surface implements its own accessibility patterns | Rejects |
| Localization | Inconsistent — each surface implements its own localization | Rejects |
| Maintenance burden | High — three or more parallel implementations | Rejects |
| Decade-horizon viability | Fails — surface-specific code accumulates debt at different rates | Rejects |

**Verdict: Rejected.** Surface-specific UI produces inconsistent practitioner experience across surfaces, multiplies maintenance burden proportional to surface count, and inevitably drifts in business logic and accessibility. It is incompatible with the practitioner-experience commitment (P-5) and the decade-horizon commitment (P-18).

### 3.2 Alternative B: Server-Rendered UI

In a server-rendered architecture, the server renders the UI as static or pre-rendered content and sends it to the client. The client is a pure rendering surface with no logic; all interaction is mediated by server round-trips. This model is familiar from earlier generations of web applications.

| Criterion | Server-Rendered | Verdict |
|---|---|---|
| Multi-surface consistency | High — single rendering path | Favors |
| Business logic integrity | Medium — logic is on the server but coupled to presentation | Mixed |
| Multi-surface coverage | Low — server rendering is web-bound; mobile and desktop surfaces are not served | Rejects |
| Offline operation | Fails — requires server connectivity for every interaction | Rejects |
| Practitioner latency | Poor — every interaction requires a round-trip | Rejects |
| Decade-horizon viability | Survives for web but cannot serve mobile and desktop surfaces | Rejects |

**Verdict: Rejected.** Server-rendered UI is fundamentally incompatible with the local-first strategy ratified in ADR-003. It cannot serve mobile and desktop surfaces, and it produces round-trip latency that fails the practitioner-experience commitment (P-5). It is also incompatible with the multi-surface requirement of `SYSTEM_ARCHITECTURE.md` Section 6.2.

### 3.3 Alternative C: Thin Client over Platform Contracts

In a thin-client architecture, the client is a rendering surface that invokes platform contracts — commands, queries, events — and renders configuration schemas provided by the platform. Business logic lives in the Domain Layer; the client contains no business logic. UI behaviour is driven by configuration (form definitions, workflow definitions, role-permission mappings, locale packs) rather than by client-side code. Each surface has its own rendering implementation but all implementations invoke the same contracts and render the same configuration.

| Criterion | Thin Client over Contracts | Verdict |
|---|---|---|
| Multi-surface consistency | High — single contract surface across all surfaces | Favors |
| Business logic integrity | High — logic lives in the Domain Layer | Favors |
| Multi-surface coverage | High — same contracts accessible from web, mobile, desktop, portals | Favors |
| Offline operation | Compatible — local-first client per ADR-003 | Favors |
| Accessibility | High — design system enforces accessibility at the component level | Favors |
| Localization | High — localization is a contract dimension, not a client concern | Favors |
| Decade-horizon viability | Served — surfaces evolve independently of contracts | Favors |

**Verdict: Accepted.** The thin-client-over-contracts architecture is the UI design philosophy for Ibn Hayan. It is the only alternative that simultaneously satisfies multi-surface consistency, business logic integrity, offline operation, accessibility, localization, and decade-horizon viability.

### 3.4 Alternative D: Low-Code UI Builder

In a low-code UI architecture, screens and forms are generated by a low-code engine from configuration authored by non-developers. The engine interprets the configuration at runtime to produce interactive surfaces. This model is attractive for its configurability and its low cost of producing new screens.

| Criterion | Low-Code UI Builder | Verdict |
|---|---|---|
| Speed of producing new screens | High — configuration-driven generation | Favors |
| Fidelity for clinical workflow | Medium — generated UIs are harder to tune for clinical density | Rejects |
| Practitioner experience (P-5) | Risk — generated UIs tend to generic patterns | Rejects |
| Accessibility | Variable — depends on engine; harder to guarantee | Mixed |
| Suitability for admin surfaces | High — admin surfaces are lower-fidelity and higher-volume | Favors |
| Suitability for practitioner surfaces | Low — clinical surfaces require tuned fidelity | Rejects |

**Verdict: Deferred.** A low-code UI builder is not appropriate for practitioner-facing clinical workflows, where fidelity, density, and selection safety are critical. It may be considered for specific admin surfaces in the future, where screen volume and tolerance for generic patterns make it viable. This deferral does not constitute acceptance; a future ADR would be required to ratify any low-code engine for any specific surface class.

The four alternatives are summarized below. Each alternative is evaluated against the same six criteria; the per-alternative tables in 3.1 through 3.4 provide the detailed rationale.

| Alternative | Multi-surface | Offline | Logic integrity | Accessibility | Localization | Decade horizon | Verdict |
|---|---|---|---|---|---|---|---|
| A — Surface-Specific | Low | Possible | Low | Inconsistent | Inconsistent | Fails | Rejected |
| B — Server-Rendered | Low | Fails | Medium | Possible | Possible | Fails | Rejected |
| C — Thin Client over Contracts | High | Compatible | High | High | High | Served | Accepted |
| D — Low-Code UI Builder | Medium | Possible | Medium | Variable | Variable | Mixed | Deferred (admin only) |

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Consistent practitioner experience | The same domain capability is available across surfaces with consistent semantics, advancing Principle P-5 |
| Offline operation supported | The thin client supports local-first operation per ADR-003, including local capture and synchronization |
| Accessibility built in from inception | Accessibility is a property of the design system and the contract surface, not a per-feature afterthought |
| Localization built in from inception | Localization, including right-to-left, is a contract dimension that the client renders; it is not retrofitted |
| Platform contracts as source of truth | UI behaviour derives from contracts and configuration; there is no separate UI-specific behavioural truth |
| Decade-horizon viability | Surfaces evolve independently of contracts; new surfaces can be added without re-platforming |
| Business logic integrity | Business logic lives in the Domain Layer; the UI cannot drift from platform invariants |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Contract evolution has UI implications | Contract changes propagate to the client; the client must consume contracts faithfully or surface breakage |
| Robust local store required | The thin client requires a robust local store per ADR-003; weak local-store engineering compromises offline operation |
| Multi-surface discipline required | Each surface has its own rendering implementation, requiring discipline to avoid per-surface drift |
| Configuration surface complexity | UI configuration (forms, workflows, permissions, locale packs) is large and must be governed per ADR-001 |
| Accessibility and localization discipline | All user-facing strings must be externalized; missing translations and accessibility regressions must be detected in CI |
| Performance dependency on contracts | Thin clients depend on contract invocation efficiency; poorly designed contracts produce perceptible latency |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Design system as shared platform asset | The design system — components, patterns, tokens — is a centrally maintained platform asset consumed by all surfaces |
| Form engine as platform service | A form engine renders forms from configuration definitions, advancing ADR-001; it is shared across surfaces |
| Role-aware rendering | The UI renders based on the user's role, permissions, and hierarchy scope using configuration, not per-role code |
| Low-code engine may be adopted for admin surfaces | Low-code generation may be adopted for specific admin surfaces in future, as noted in Alternative D |
| Practitioner-facing UI remains custom-built | Practitioner-facing clinical surfaces remain custom-built for fidelity, even when admin surfaces adopt low-code |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Contract evolution impact | Architectural review of contracts for multi-surface suitability; contract deprecation cycles; client readiness checks |
| Robust local store | Local-store engineering aligned with ADR-003; conflict resolution governed; offline audit complete |
| Multi-surface discipline | Shared design system; shared form engine; shared rendering patterns; cross-surface review |
| Configuration complexity | Configuration governance per `SYSTEM_ARCHITECTURE.md` Section 15; configuration tooling and validation |
| Accessibility discipline | Design system with accessibility built in; automated accessibility testing in CI; manual accessibility review |
| Localization discipline | String externalization enforced by linting; translation completeness monitoring; fallback chains per `SYSTEM_ARCHITECTURE.md` Section 26.5 |
| Performance | Efficient contract design; multi-level caching; optimistic UI updates where safe; performance budgets enforced |

---

## 5. Status

### 5.1 Current Status

**Ratified.** This decision is in effect and governs the UI architecture across all surfaces of the Ibn Hayan platform. It supersedes the prior v1.0.0 stub of this ADR in its entirety. It is referenced by `SYSTEM_ARCHITECTURE.md` Section 6.2 (Experience Layer) and Section 22 (Extensibility Strategy, EP4 — UI Extension), and is consistent with `PRODUCT_BIBLE.md` Section 5.6 (Principle P-5) and Section 26 (Accessibility Strategy).

### 5.2 Ratification Record

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Version | 2.0.0 |
| Supersedes | ADR-005 v1.0.0 (2026-07-18) |
| Review cadence | Annual, or upon a material change to the surface spectrum (e.g., a new surface type) |
| Supersession criteria | Demonstrated infeasibility, or a superior UI architecture emerging that satisfies all ratified constraints |

### 5.3 Ownership

The Office of the Chief Software Architect owns this decision. The design organization owns the design system that operationalizes the accessibility-first and localization-first commitments. The UI engineering organization owns the surface implementations across web, mobile, desktop, and portals. Contract owners in the Domain and Platform Services Layers own the contracts that the thin client consumes, and are accountable for the multi-surface suitability of those contracts.

---

## 6. Future Notes

### 6.1 Client Framework Selection

The choice of client framework for each surface is an implementation decision, not an architectural commitment. Surface-level engineering teams select the framework appropriate to their surface, subject to the constraints of this ADR: the surface must be a thin client over platform contracts, must contain no business logic, and must hold no authoritative durable state beyond the local store sanctioned by ADR-003. Framework selection is documented at the surface level and reviewed by the Architecture Council for conformance with this ADR. No framework choice is ratified or precluded by this ADR.

### 6.2 Accessibility Standards Evolution

`PRODUCT_BIBLE.md` Section 26.3 commits the platform to continuous alignment with recognized accessibility standards as those standards evolve. The platform's accessibility posture is therefore not pinned to a specific version of a specific standard at the architectural level; it is maintained continuously, with accessibility regressions treated as defects. The accessibility posture of each surface is reviewed at each release, and material changes to the platform's accessibility commitments will be documented through the platform's accessibility documentation and, where the change is architectural, through a new ADR.

### 6.3 Localization Expansion

`SYSTEM_ARCHITECTURE.md` Section 26 defines the localization architecture, and `PRODUCT_BIBLE.md` Section 25 commits the platform to regional adaptability. As the platform's regional footprint grows, the set of supported locales — including right-to-left locales — will expand. Localization expansion is governed by the localization architecture and does not require a new ADR unless the expansion produces a structural change to the contract surface (for example, a locale dimension that cannot be expressed through the current contract model). Right-to-left locales remain first-class; new locales are added as first-class locales, not as overlays.

### 6.4 UI Extension Surface (EP4)

`SYSTEM_ARCHITECTURE.md` Section 22.6 defines UI extension points (EP4) as the mechanism by which user-interface surfaces are extended through configuration — configurable dashboards, configurable form layouts, configurable report layouts, configurable navigation. EP4 is the configuration-driven mechanism that allows tenants to adapt the UI without modifying platform source and without violating the thin-client-over-contracts philosophy. EP4 extensions are tenant-scoped with user-level overrides, governed by the extension governance framework (Section 22.7). Future ADRs may refine the EP4 surface as the platform's UI extension vocabulary matures.

### 6.5 Related Future Decisions

| Future Decision | Notes |
|---|---|
| Form Engine ADR | Will define the form engine's contract and capability scope; the form engine renders forms from configuration definitions |
| Design System Governance ADR | Will define how the design system evolves and is governed across surfaces |
| Low-Code Engine ADR (if pursued) | Would ratify a low-code engine for specific admin surfaces only; practitioner-facing surfaces remain custom-built |
| New Surface Type ADR | Would be required if a new surface type (e.g., voice, AR/VR) emerges that requires different architectural treatment |
