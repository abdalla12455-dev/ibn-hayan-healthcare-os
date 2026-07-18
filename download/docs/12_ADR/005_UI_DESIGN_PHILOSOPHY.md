# ADR-005: UI Design Philosophy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to adopt a healthcare-native, role-aware, accessibility-first, configuration-driven user interface philosophy in which the experience layer is a thin rendering surface over platform contracts, behavior is governed by configuration rather than UI-specific code, and the same domain capability is accessible from any surface that requires it.
>
> **Status:** Accepted · **ADR Number:** 005 · **Last Updated:** 2026-07-18
> **Supersedes:** None · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 3, 4 (P18), 6.2, 26
> **Related Documents:** `docs/05_UI_UX/DESIGN_BIBLE.md`, `docs/05_UI_UX/DESIGN_SYSTEM.md`
>
> This Architectural Decision Record (ADR) documents a significant architectural
> decision made for the Ibn Hayan Healthcare Operating System. ADRs are
> immutable historical records — once a decision is superseded, a new ADR
> is created rather than editing this one.

---

## Table of Contents

1. Decision
2. Context
3. Alternatives
4. Consequences
5. Status
6. Future Notes

---

## 1. Decision

### 1.1 Decision Statement

Ibn Hayan adopts a healthcare-native, role-aware, accessibility-first, configuration-driven user interface philosophy. The experience layer is a thin rendering surface over platform contracts; it contains no business logic and owns no authoritative state. UI behavior is governed by configuration (form definitions, workflow definitions, role-permission mappings, locale) rather than UI-specific code. The same domain capability is accessible from any surface that requires it (web, mobile, desktop, external portals), without the capability being duplicated per surface.

### 1.2 Scope of the Decision

The decision applies to all interactive surfaces through which users interact with Ibn Hayan: web clients, mobile clients, desktop clients, and external portals (patient portal, partner portal). It does not apply to integration-only surfaces (which use integration adapters, not the experience layer).

| Aspect | Decision |
|---|---|
| Experience layer responsibility | Render results of domain operations; capture user intent; forward to lower layers |
| Business logic location | Domain layer; never in the experience layer |
| Authoritative state location | Server-side data layer; client local store as cache and offline authoritative source |
| UI behavior adaptation | Configuration (forms, workflows, permissions, locale) |
| Multi-surface consistency | Same contracts accessible from all surfaces; no per-surface duplication |
| Accessibility | First-class architectural property; conforms to WCAG 2.2 AA or stricter |
| Localization | All user-facing strings translatable; RTL languages supported as first-class locales |
| Role-awareness | UI adapts to the user's role, permissions, and hierarchy scope |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — UI architecture is foundational; changing it requires client re-architecture |
| Cost of Wrong Decision | High — wrong choice produces either an inconsistent UI across surfaces or business logic leaking into the UI |
| Affected Layers | Experience layer primarily; constrains contract design in lower layers |
| ADR Required | Yes — this ADR |

---

## 2. Context

### 2.1 The UI Architecture Problem

A healthcare platform serves multiple user roles (clinicians, nurses, receptionists, billing clerks, administrators, patients, partners) across multiple surfaces (web, mobile, desktop, portals) in multiple locales (including RTL languages) with multiple accessibility needs. The architectural question is how the UI is structured to serve this spectrum without duplicating capability per surface, leaking business logic into the UI, or compromising accessibility and localization.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Multi-surface consistency | The same capability must be available across surfaces; per-surface duplication produces inconsistency and maintenance burden. |
| Business logic integrity | Business logic must live in the domain layer; UI-embedded business logic produces inconsistency and auditability gaps. |
| Configuration-driven architecture | ADR-001 requires that UI behavior (forms, workflows, permissions) be configuration-driven, not code-driven. |
| Accessibility | Healthcare software must be usable by users with disabilities; accessibility is a regulatory and ethical requirement. |
| Localization | The platform serves multiple regions, including RTL-language regions; localization must be first-class. |
| Role-awareness | The UI must adapt to the user's role, presenting relevant capabilities and hiding irrelevant ones. |
| Healthcare safety | UI design affects clinical safety (e.g., preventing mis-selection of patients, medications, or procedures); safety overrides convenience. |
| Decade horizon | The UI must evolve over the decade without re-platforming; configuration-driven behavior supports evolution. |

### 2.3 Constraints

The decision is constrained by:

- The Product Bible's commitment to 14 user roles and 30 clinic types, all served by one platform.
- The Product Bible's commitment to accessibility and localization as product capabilities.
- The architectural principle of healthcare safety overrides convenience (P18).
- The architectural principle of configuration over code (P11).
- The decade horizon, which requires that the UI remain viable as surfaces, devices, and modalities evolve.

---

## 3. Alternatives

### 3.1 Alternative A: Surface-Specific UI Architecture

In a surface-specific architecture, each surface (web, mobile, desktop) has its own UI implementation, with business logic embedded in the UI layer. Each surface implements its own forms, workflows, and permission checks.

| Criterion | Surface-Specific | Verdict |
|---|---|---|
| Surface-specific optimization | High — each surface optimized for its platform | Favors |
| Consistency across surfaces | Low — surfaces diverge over time | Rejects |
| Business logic integrity | Low — logic is duplicated across surfaces | Rejects |
| Configuration-driven | Low — UI behavior is code-driven | Rejects |
| Maintenance | Low — three implementations to maintain | Rejects |
| Decade horizon | Fails — surface-specific code accumulates debt | Rejects |

**Verdict:** Rejected. Surface-specific architecture produces inconsistency, business logic duplication, and maintenance burden incompatible with the decade horizon.

### 3.2 Alternative B: Server-Rendered UI with Embedded Logic

In a server-rendered UI architecture, the server renders HTML with embedded business logic. The client is a pure rendering surface with no logic.

| Criterion | Server-Rendered | Verdict |
|---|---|---|
| Consistency | High — single rendering path | Favors |
| Business logic integrity | Medium — logic is on the server but coupled to UI rendering | Mixed |
| Multi-surface | Low — server rendering is web-only | Rejects |
| Offline operation | Fails — requires server connectivity | Rejects |
| Decade horizon | Survives but cannot serve mobile and desktop surfaces | Rejects |

**Verdict:** Rejected. Server-rendered UI cannot serve mobile and desktop surfaces and is incompatible with offline-first operation (ADR-003).

### 3.3 Alternative C: Thin Client over Platform Contracts

In a thin-client architecture, the client is a rendering surface that invokes platform contracts (commands, queries) and renders the results. Business logic lives in the domain layer; the client contains no business logic. UI behavior is driven by configuration (form definitions, workflow definitions, role-permission mappings).

| Criterion | Thin Client | Verdict |
|---|---|---|
| Consistency | High — single contract surface | Favors |
| Business logic integrity | High — logic lives in domain layer | Favors |
| Multi-surface | High — same contracts accessible from all surfaces | Favors |
| Offline operation | Compatible — local-first client (ADR-003) | Favors |
| Configuration-driven | High — UI behavior is configuration | Favors |
| Maintenance | High — one contract surface, multiple rendering implementations | Favors |
| Decade horizon | Served | Favors |

**Verdict:** Accepted. The thin-client architecture is the UI philosophy. Each surface has its own rendering implementation (web, mobile, desktop), but all implementations invoke the same contracts and render the same configuration.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Consistency across surfaces | The same domain capability is available across surfaces, with consistent semantics. |
| Business logic integrity | Business logic lives in the domain layer; the UI cannot drift from platform invariants. |
| Configuration-driven behavior | UI behavior adapts through configuration, not code, supporting ADR-001. |
| Multi-surface support | Web, mobile, desktop, and portals all serve the same contracts. |
| Offline operation compatible | The thin client supports local-first operation (ADR-003). |
| Accessibility first-class | Accessibility is a property of the UI architecture, not a feature. |
| Localization first-class | Localization is a property of the UI architecture; RTL is fully supported. |
| Decade horizon preserved | The UI evolves through configuration and contract evolution, not re-platforming. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Contract design discipline | Contracts must be designed to support all surfaces; surface-specific optimizations are harder. |
| Configuration surface complexity | UI configuration (forms, workflows, permissions) is large and must be governed. |
| Rendering implementation per surface | Each surface has its own rendering implementation, requiring per-surface investment. |
| Performance | Thin clients depend on contract invocation; performance requires efficient contracts and caching. |
| Accessibility discipline | Accessibility must be enforced at the design system level, not per component. |
| Localization discipline | All user-facing strings must be externalized; missing translations must be detected. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Design system as platform asset | The design system (components, patterns, tokens) is a shared platform asset, maintained centrally. |
| Form engine as platform service | A form engine renders forms from configuration definitions, supporting ADR-001. |
| Role-aware rendering | The UI renders based on the user's role, permissions, and hierarchy scope, using configuration. |
| Accessibility auditing | Automated and manual accessibility auditing is part of the release process. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Contract design | Architectural review of contracts for multi-surface suitability; contract templates. |
| Configuration complexity | Configuration governance (SYSTEM_ARCHITECTURE.md Section 15); configuration tooling. |
| Per-surface investment | Shared design system; shared form engine; shared rendering patterns. |
| Performance | Multi-level caching; efficient contract design; optimistic UI updates. |
| Accessibility | Design system with accessibility built in; automated accessibility testing in CI; manual accessibility review. |
| Localization | String externalization enforced by linting; translation completeness monitoring; fallback chains (SYSTEM_ARCHITECTURE.md Section 26.5). |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This decision is in effect and governs the UI architecture across all surfaces. It is referenced by SYSTEM_ARCHITECTURE.md Sections 3, 4 (P18), 6.2, and 26, and is realized in detail by `docs/05_UI_UX/DESIGN_BIBLE.md` and `docs/05_UI_UX/DESIGN_SYSTEM.md`.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Review cadence | Annual, or upon a material change to the surface spectrum (e.g., a new surface type) |
| Supersession criteria | Demonstrated infeasibility, or a superior UI architecture emerging |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The design organization owns the design system. The UI engineering organization owns the surface implementations.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Voice-based interaction | Will the platform support voice as a surface (e.g., for hands-free clinical use)? |
| AR/VR surfaces | Will the platform support augmented or virtual reality surfaces (e.g., for surgical visualization)? |
| AI-assisted UI | Will AI features customize the UI per user, based on usage patterns? |
| Form engine capability | What is the maximum form complexity the form engine can render from configuration? |
| Surface-specific optimization | When is surface-specific optimization justified, and how is it implemented without duplicating capability? |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if:

- A new surface type emerges (e.g., voice, AR/VR) that requires a different UI architecture.
- A superior UI architecture emerges that superiorly balances consistency, multi-surface support, and configuration-driven behavior.
- Accessibility or localization requirements emerge that cannot be met by the current architecture.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Constrains this ADR — UI behavior is configuration-driven. |
| ADR-003 (Local-First Strategy) | Constrains this ADR — the UI must support local-first operation. |
| Future ADR: Form Engine | Will define the form engine's contract and capability scope. |
| Future ADR: Design System Governance | Will define how the design system evolves and is governed. |
