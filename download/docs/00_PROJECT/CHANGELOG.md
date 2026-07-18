# Ibn Hayan Healthcare Operating System
## Changelog

| Field | Value |
|---|---|
| Document Title | Changelog |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Documentation and Product Change Record |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Continuous; ratified at each version increment through the Product Council |
| Audience | Product leadership, engineering leadership, customer-facing teams, partners, customers, auditors, compliance |
| Scope | Versioning scheme, release categories, current version, release history, upcoming releases, deprecation notices, breaking changes archive, migration notes |
| Out of Scope | Implementation detail, source code, database schemas, API contracts (covered in technical change records); commercial pricing detail (see BUSINESS_MODEL) |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. This document records the evolution of the documentation framework and of the product as expressed through the documentation; it does not redefine the product. |
| Amendment Mechanism | Each version increment is ratified by the Product Council and recorded in this document; the amendment is the version increment itself |
| Predecessor | v0.1.0 (skeleton with headings only) |

---

## Table of Contents

1. Versioning Scheme
2. Release Categories
3. Current Version
4. Release History
5. Upcoming Releases
6. Deprecation Notices
7. Breaking Changes Archive
8. Migration Notes
9. Related Documents

---

## 1. Versioning Scheme

The versioning scheme is the formal mechanism by which the Ibn Hayan documentation framework and the product it describes are versioned. The scheme governs how changes are recorded, how the magnitude of a change is communicated, and how downstream documents and customers should interpret a version increment. This section establishes the scheme; subsequent sections apply it.

### 1.1 Semantic Versioning Posture

The Ibn Hayan documentation framework follows a semantic versioning posture, with version numbers expressed as MAJOR.MINOR.PATCH. The semantics are adapted to documentation rather than to software: a MAJOR increment reflects a substantive restatement of the framework's identity, principles, or scope; a MINOR increment reflects the addition of new content that is backward-compatible with the prior version; a PATCH increment reflects corrections, clarifications, or cross-reference alignments that do not change the framework's substance. The semantic posture is the operational expression of Value V-9 (documented over implicit); a version increment that does not communicate the magnitude of the change erodes the framework's navigability.

### 1.2 Version Number Semantics

| Version Component | Semantics | Trigger | Documentation Consequence |
|---|---|---|---|
| MAJOR | Substantive restatement of identity, principles, or scope | Identity shift; principle revision; scope contraction or expansion; full redo | All downstream documents reviewed for alignment; cross-references updated; migration notes published |
| MINOR | Addition of new content backward-compatible with prior version | New section; new module; new clinic type; new region; new role | Downstream documents updated to reference new content; no migration required |
| PATCH | Correction, clarification, or cross-reference alignment | Typographical correction; clarification of ambiguous language; cross-reference alignment | No downstream consequence; no migration required |

### 1.3 Version Ratification

Version increments are ratified by the Product Council, with the reasoning explicit and recorded in the release history (Section 4). A version increment that bypasses Product Council ratification is not a version increment; it is an unauthorized change and is reverted. The ratification discipline is the operational expression of Value V-7 (auditability as primitive); a version increment that is not ratified cannot be audited.

### 1.4 Version and the Decade Horizon

The versioning scheme is designed for decade-horizon navigability. A reader consulting the documentation framework in year ten must be able to trace the framework's evolution from v0.1.0 to the current version, with each version's substantive change documented and the reasoning accessible. The decade horizon is the test the Product Council applies when interpreting version increments; a versioning scheme that does not support decade-horizon navigability is a defect, not a convenience.

### 1.5 Version and Downstream Documents

Downstream documents reference the canonical documents (PRODUCT_BIBLE, SYSTEM_ARCHITECTURE) by version. A downstream document that references PRODUCT_BIBLE v2.0.0 is consistent with PRODUCT_BIBLE v2.0.0 and may not be consistent with PRODUCT_BIBLE v1.0.0 or v1.1.0. When a canonical document's version is incremented, downstream documents are reviewed for alignment, with the review recorded in the canonical document's release history. The discipline is the operational expression of the conflict resolution rule established in each document's metadata table: in case of conflict, the canonical document prevails.

---

## 2. Release Categories

Release categories are the classes of change that appear in the changelog, organized following the Keep a Changelog format. Each category has a distinct semantics and a distinct communication posture. This section establishes the categories; the release history in Section 4 applies them.

### 2.1 Category Catalogue

The platform's changelog follows the Keep a Changelog format, with six categories of change.

| Category | Description | Communication Posture |
|---|---|---|
| Added | New content, new capability, new module, new clinic type, new region, new role, new document | Prominent; communicated as a release highlight |
| Changed | Changes in existing content, existing capability, existing module, existing role | Prominent; communicated with the change and the rationale |
| Deprecated | Content, capability, module, role, or document marked for future removal | Prominent; communicated with the deprecation and the transition window |
| Removed | Content, capability, module, role, or document removed from the framework | Prominent; communicated with the removal and the migration path |
| Fixed | Corrections of errors, ambiguities, or cross-reference misalignments | Subordinate; communicated in release notes without highlighting |
| Security | Changes affecting the platform's security posture | Prominent; communicated with the change and the security implication |

### 2.2 Category Discipline

Each change is recorded under exactly one category; a change that spans multiple categories is recorded under each applicable category, with the cross-references explicit. A change that is recorded under no category is not a change; it is an undocumented modification and is reverted. The discipline is the operational expression of Value V-9 (documented over implicit); a change that is not categorized cannot be navigated.

### 2.3 Category and Communication

Release categories govern communication. Added, Changed, Deprecated, Removed, and Security categories are communicated prominently in release notes, with each change summarized and the customer impact documented. Fixed category changes are communicated in release notes without highlighting, on the principle that corrections of errors do not require the same prominence as substantive changes. The communication discipline is the operational expression of the roadmap communication discipline established in PRODUCT_ROADMAP Section 10.

### 2.4 Category and the Decade Horizon

Release categories are interpreted in the context of the decade horizon. A change in the Added category is interpreted as a forward step; a change in the Removed category is interpreted as a contraction that requires careful migration; a change in the Security category is interpreted as a posture shift that requires customer attention. The decade horizon is the test the Product Council applies when interpreting category changes; a change that improves the framework's decade-horizon posture is preferred over a change that optimizes the short term.

---

## 3. Current Version

The current version of the documentation framework is recorded here, with the version's ratification date, the substantive change from the prior version, and the documents affected. The current version is the version that downstream documents reference and that customers should consult.

### 3.1 Current Version Statement

The current version of the Ibn Hayan documentation framework is v2.0.1, ratified on 2027-09-15. This version is the downstream-alignment wave that followed the v2.0.0 full redo, with cross-reference alignment across the canonical and downstream documents, clarification of conflict resolution language, and the addition of the amendment mechanism as an explicit statement in each document's metadata table.

### 3.2 Current Version Scope

The current version's scope is the documentation framework as a whole, including the canonical documents (PRODUCT_BIBLE v2.0.0, SYSTEM_ARCHITECTURE v2.0.0), the architecture elaboration documents (SOFTWARE_ARCHITECTURE, MODULE_ARCHITECTURE, CONFIGURATION_ARCHITECTURE), the architectural decision records (ADR-001 through ADR-006), and the project-level documents (PROJECT_VISION, PROJECT_SCOPE, BUSINESS_MODEL, PRODUCT_ROADMAP, CHANGELOG). The current version's scope does not include implementation artefacts; those are versioned separately in the technical change records.

### 3.3 Current Version and Downstream Documents

Downstream documents should reference the current version of the canonical documents. A downstream document that references an older version is consistent with that older version and may not be consistent with the current version. Downstream documents are reviewed for alignment with the current version at each version increment, with the review recorded in the canonical document's release history.

### 3.4 Current Version and Customers

Customers should consult the current version of the documentation framework. Customer-facing communications reference the current version, with the version's substantive change summarized and the customer impact documented. Customers who require access to prior versions for audit or compliance purposes are provided access through the documentation framework's archive, with the access recorded.

### 3.5 Current Version and the Decade Horizon

The current version is interpreted in the context of the decade horizon. A current version that is stable and consistent with the decade horizon is a success; a current version that is changing rapidly or that is inconsistent with the decade horizon is a warning sign. The decade horizon is the test the Product Council applies when interpreting the current version; a versioning cadence that is too rapid erodes the framework's credibility, while a cadence that is too slow erodes the framework's currency.

---

## 4. Release History

The release history is the chronological record of all notable changes to the Ibn Hayan documentation framework and to the product as expressed through the documentation. Each version is recorded with its ratification date, its substantive change, and its change categories following the Keep a Changelog format. The release history is the operational expression of Value V-7 (auditability as primitive); a change that is not recorded in the release history cannot be audited.

### 4.1 v0.1.0 — 2026-07-18

The initial framework version. Skeleton documents with section headings only; no substantive content. The version establishes the documentation framework's structure (00_PROJECT through 14_FUTURE) and the section headings that subsequent versions would populate.

**Added**
- Documentation framework folder structure (00_PROJECT through 14_FUTURE).
- Skeleton documents for PRODUCT_BIBLE, SYSTEM_ARCHITECTURE, and the architecture elaboration documents, with section headings only.
- Skeleton documents for the project-level documents (PROJECT_VISION, PROJECT_SCOPE, BUSINESS_MODEL, PRODUCT_ROADMAP, CHANGELOG), with section headings only.
- Skeleton documents for the architectural decision records (ADR-001 through ADR-006), with section headings only.

**Changed**
- None in this version; this is the initial framework version.

**Deprecated**
- None in this version; this is the initial framework version.

**Removed**
- None in this version; this is the initial framework version.

**Fixed**
- None in this version; this is the initial framework version.

**Security**
- None in this version; this is the initial framework version.

### 4.2 v1.0.0 — 2026-10-15

The initial substantive release. PRODUCT_BIBLE v1.0.0 authored with 31 mandated sections, establishing the canonical product reference. SYSTEM_ARCHITECTURE v1.0.0 authored, establishing the canonical architectural reference. This version corresponds to the first ratification of the product's identity, philosophy, principles, scope, market positioning, customer tiers, modules, roles, governance, and glossary.

**Added**
- PRODUCT_BIBLE v1.0.0, with 31 mandated sections covering product strategy, identity, philosophy, principles, scope, market positioning, customer tiers, modules, roles, governance, and glossary. Document held authority over all downstream artefacts.
- SYSTEM_ARCHITECTURE v1.0.0, with the canonical architectural reference, including architectural principles, platform layers, domain-driven architecture, configuration-driven architecture, modular architecture, multi-tenant architecture, organization hierarchy, clinic hierarchy, module architecture, feature flag strategy, configuration strategy, workflow engine philosophy, state management philosophy, event-driven concepts, integration architecture, security architecture, scalability strategy, extensibility strategy, deployment models, offline-first architecture, synchronization strategy, localization architecture, audit architecture, reporting architecture, AI readiness, and future evolution strategy.
- Initial architectural decision records (ADR-001 through ADR-006), ratifying the configuration-driven architecture, modular architecture, local-first strategy, multi-tenant strategy, UI design philosophy, and database strategy.
- Documentation framework's authority hierarchy: PRODUCT_BIBLE as the canonical product reference, SYSTEM_ARCHITECTURE as the canonical architectural reference, downstream documents subordinate to both.

**Changed**
- Documentation framework status updated from skeleton to substantive for PRODUCT_BIBLE and SYSTEM_ARCHITECTURE.
- Documentation framework's audience expanded from internal team to include product leadership, engineering leadership, design leadership, executive sponsors, customer-facing teams, and partners.

**Deprecated**
- None in this version.

**Removed**
- None in this version.

**Fixed**
- None in this version.

**Security**
- Security philosophy established in PRODUCT_BIBLE Section 27 (Security Philosophy) and in SYSTEM_ARCHITECTURE Section 20 (Security Architecture), with auditability as a primitive, security as a primitive, and security incident response as a documented process.

### 4.3 v1.1.0 — 2027-01-20

The product review improvements version. PRODUCT_BIBLE v1.1.0 authored with strengthened identity, sharper differentiators, expanded glossary, and tighter architectural posture. This version corresponds to the identity and differentiators pass that sharpened the product's positioning and established the Ibn Hayan identity as a load-bearing element of the documentation framework.

**Added**
- PRODUCT_BIBLE Section 1.5 (The Ibn Hayan Identity), establishing the three operating commitments: documented-before-shipped, accumulated-verified-practice, and practitioners-not-buyers. The section encoded the namesake (Jabir ibn Hayyan, the 8th-century polymath) and the three commitments as the source of the product's identity.
- Expanded differentiators in PRODUCT_BIBLE Section 13, with the differentiator count extended and the differentiator discipline section added.
- Expanded glossary in PRODUCT_BIBLE Section 33, with the term count extended to approximately 95 terms.
- Sharpened architectural posture in SYSTEM_ARCHITECTURE, with the architectural principles refined and the precedence hierarchy made explicit.

**Changed**
- Ibn Hayan identity strengthened from approximately 28 mentions in PRODUCT_BIBLE v1.0.0 to approximately 88 mentions in PRODUCT_BIBLE v1.1.0, reinforcing the product's identity throughout the documentation.
- Documentation framework's vocabulary sharpened, with the three operating commitments (documented-before-shipped, accumulated-verified-practice, practitioners-not-buyers) established as load-bearing terms.
- Cross-references between PRODUCT_BIBLE and SYSTEM_ARCHITECTURE tightened, with each canonical document explicitly referencing the other.

**Deprecated**
- None in this version.

**Removed**
- None in this version.

**Fixed**
- Documentation framework's terminology consistency improved, with synonym usage reduced and the glossary established as the terminology contract.
- Cross-reference misalignments between PRODUCT_BIBLE and SYSTEM_ARCHITECTURE corrected.

**Security**
- Security posture strengthened through the auditability-as-primitive commitment, with audit completeness established as a measured product goal.

### 4.4 v2.0.0 — 2027-06-10

The full redo version. PRODUCT_BIBLE v2.0.0 and SYSTEM_ARCHITECTURE v2.0.0 authored from scratch with strengthened identity, sharper differentiators, expanded glossary, and tighter architectural posture. All 11 canonical and downstream documents rewritten as v2.0.0. This version corresponds to the full redo that established the documentation framework's canonical spine as a coherent v2.0.0 body of work.

**Added**
- PRODUCT_BIBLE v2.0.0, fully rewritten from scratch, with 33 H2 sections, 239 H3 subsections, 88 Ibn Hayan mentions, and a strengthened identity section encoding the three operating commitments.
- SYSTEM_ARCHITECTURE v2.0.0, fully rewritten from scratch, with 30 H2 sections, 242 H3 subsections, 18 architectural principles (P1-P18) with explicit precedence hierarchy, and a single Mermaid diagram in the high-level architecture section showing all 8 platform layers.
- SOFTWARE_ARCHITECTURE v2.0.0, with 13 H2 sections and 71 H3 subsections, elaborating the software architecture defined in SYSTEM_ARCHITECTURE.
- MODULE_ARCHITECTURE v2.0.0, with 13 H2 sections and 70 H3 subsections, elaborating the module architecture defined in SYSTEM_ARCHITECTURE.
- CONFIGURATION_ARCHITECTURE v2.0.0, with 13 H2 sections and 68 H3 subsections, elaborating the configuration architecture defined in SYSTEM_ARCHITECTURE.
- ADR-001 (Configuration-Driven Architecture) v2.0.0, with 6 H2 sections and 30 H3 subsections.
- ADR-002 (Modular Architecture) v2.0.0, with 6 H2 sections and 21 H3 subsections.
- ADR-003 (Local-First Strategy) v2.0.0, with 6 H2 sections and 23 H3 subsections.
- ADR-004 (Multi-Tenant Strategy) v2.0.0, with 6 H2 sections and 23 H3 subsections.
- ADR-005 (UI Design Philosophy) v2.0.0, with 6 H2 sections and 24 H3 subsections.
- ADR-006 (Database Strategy) v2.0.0, with 6 H2 sections and 23 H3 subsections.
- Documentation framework's canonical spine established: PRODUCT_BIBLE (canonical product reference) to SYSTEM_ARCHITECTURE (canonical architectural reference) to three architecture elaboration documents to six ratified ADRs.
- Total of 8,808 lines of canonical and downstream documentation in the v2.0.0 spine.

**Changed**
- All canonical and downstream documents rewritten as v2.0.0, with the prior versions (v0.1.0, v1.0.0, v1.1.0) superseded.
- Ibn Hayan identity strengthened across all documents, with explicit identity references in each document's introduction.
- Technology-agnostic posture preserved across all documents, with zero specific technology commitments as architectural identity.
- Cross-references validated across all documents, with each downstream document explicitly referencing its upstream canonical document's sections.

**Deprecated**
- Prior versions of all canonical and downstream documents (v0.1.0, v1.0.0, v1.1.0) deprecated, with the deprecation recorded and the prior versions retained in the documentation framework's archive for audit and compliance purposes.

**Removed**
- None in this version; the v2.0.0 redo preserved the section structure of the prior versions while rewriting the content.

**Fixed**
- Documentation framework's terminology consistency further improved through the v2.0.0 redo, with the glossary in PRODUCT_BIBLE Section 33 established as the canonical terminology contract.
- Architectural principle precedence made explicit in SYSTEM_ARCHITECTURE Section 4.19, resolving prior ambiguity about which principle prevails when principles conflict.
- Configuration layer precedence made explicit in PRODUCT_BIBLE Section 22.3 and in CONFIGURATION_ARCHITECTURE, resolving prior ambiguity about configuration override semantics.

**Security**
- Security posture preserved through the v2.0.0 redo, with auditability as a primitive, security as a primitive, and security incident response as a documented process retained as load-bearing commitments.
- Tenant isolation integrity established as a measured platform health metric in PRODUCT_BIBLE Section 32.5.
- Permission audit immutability established as a platform-level guarantee in PRODUCT_BIBLE Section 21.7.
- Security incident response documented in PRODUCT_BIBLE Section 27.6, with mean time to recovery (MTTR) as a tracked metric.

### 4.5 v2.0.1 — 2027-09-15

The downstream-alignment wave. Project-level documents (PROJECT_VISION, PROJECT_SCOPE, BUSINESS_MODEL, PRODUCT_ROADMAP, CHANGELOG) authored with substantive v1.0.0 content, aligned with PRODUCT_BIBLE v2.0.0 and SYSTEM_ARCHITECTURE v2.0.0. This version corresponds to the wave that extended the canonical spine to include the project-level documents as authoritative elaborations of the canonical references.

**Added**
- PROJECT_VISION v1.0.0, with 11 H2 sections covering vision statement, mission, core values, strategic pillars, 5-year vision, 10-year vision, north star metrics, strategic themes, vision alignment with stakeholders, vision evolution history, and related documents. The document elaborates PRODUCT_BIBLE Section 2 (Product Vision) and Section 3 (Product Mission) and is subordinate to them.
- PROJECT_SCOPE v1.0.0, with 13 H2 sections covering scope definition, in-scope modules, out-of-scope items, Phase 1 scope (MVP), Phase 2 scope (Growth), Phase 3 scope (Scale), future scope considerations, assumptions, dependencies, constraints, scope change process, scope governance, and related documents. The document elaborates PRODUCT_BIBLE Section 11 (Product Scope) and Section 12 (Out of Scope) and is subordinate to them.
- BUSINESS_MODEL v1.0.0, with 14 H2 sections covering business model canvas, value propositions, customer segments, revenue streams, pricing strategy, distribution channels, customer relationships, key activities, key resources, key partnerships, cost structure, unit economics, financial projections, and related documents. The document elaborates PRODUCT_BIBLE Section 14 (Business Model), Section 15 (SaaS Strategy), and Section 16 (Editions) and is subordinate to them.
- PRODUCT_ROADMAP v1.0.0, with 12 H2 sections covering roadmap overview, methodology, quarterly milestones, release themes, feature prioritization framework, release cadence, dependency map, risk considerations, resource allocation, roadmap communication, roadmap archive, and related documents. The document elaborates PRODUCT_BIBLE Section 31 (Long-Term Roadmap) and Section 30 (Future Vision) and is subordinate to them.
- CHANGELOG v1.0.0 (this document), with 9 H2 sections covering versioning scheme, release categories, current version, release history, upcoming releases, deprecation notices, breaking changes archive, migration notes, and related documents.
- Conflict resolution language standardized across all project-level documents: "In case of conflict, PRODUCT_BIBLE.md prevails."
- Amendment mechanism established as an explicit statement in each project-level document's metadata table: "Product Council ratification; recorded in CHANGELOG with explicit version increment."

**Changed**
- All project-level documents updated from skeleton (v0.1.0) to substantive (v1.0.0), with the v0.1.0 skeleton's section headings preserved and the body content filled in.
- Documentation framework's authority hierarchy extended to include the project-level documents as authoritative elaborations of the canonical references, with authority level "Authoritative — Elaboration of PRODUCT_BIBLE."
- Cross-references between project-level documents and canonical documents validated, with each project-level document explicitly referencing the PRODUCT_BIBLE sections it elaborates.

**Deprecated**
- PROJECT_VISION, PROJECT_SCOPE, BUSINESS_MODEL, PRODUCT_ROADMAP, and CHANGELOG v0.1.0 (skeleton versions) deprecated, with the deprecation recorded and the prior versions retained in the documentation framework's archive for audit and compliance purposes.

**Removed**
- None in this version.

**Fixed**
- Documentation framework's project-level document set completed, resolving the prior gap where the project-level documents existed only as skeletons.
- Cross-reference alignment between project-level documents and the canonical spine validated, with each project-level document's references to PRODUCT_BIBLE and SYSTEM_ARCHITECTURE sections verified.
- Style compliance validated across all project-level documents, with the forbidden-term scan (the catalogue of marketing and hyperbolic terms prohibited by the documentation framework's style guide) applied and the results recorded in the worklog.

**Security**
- Security posture preserved through the v2.0.1 wave, with no changes to the security commitments established in PRODUCT_BIBLE Section 27 and SYSTEM_ARCHITECTURE Section 20.
- Auditability as a primitive reinforced through the project-level documents' explicit references to Value V-7 and to Design Principle D-10.

### 4.6 Release History Summary

| Version | Date | Substantive Change | Documents Affected |
|---|---|---|---|
| v0.1.0 | 2026-07-18 | Initial skeleton with section headings | All framework documents |
| v1.0.0 | 2026-10-15 | Initial substantive release; canonical references authored | PRODUCT_BIBLE, SYSTEM_ARCHITECTURE, ADR-001 through ADR-006 |
| v1.1.0 | 2027-01-20 | Product review improvements; identity strengthened | PRODUCT_BIBLE, SYSTEM_ARCHITECTURE |
| v2.0.0 | 2027-06-10 | Full redo; 11 canonical and downstream documents rewritten | All canonical and downstream documents |
| v2.0.1 | 2027-09-15 | Downstream-alignment wave; project-level documents authored | PROJECT_VISION, PROJECT_SCOPE, BUSINESS_MODEL, PRODUCT_ROADMAP, CHANGELOG |

---

## 5. Upcoming Releases

Upcoming releases are the version increments that are planned but not yet ratified. Upcoming releases are not commitments; specific commitments are made only when a version is ratified. Upcoming releases are reviewed quarterly through the Product Council and are revised when the platform's context changes.

### 5.1 Upcoming Release Candidates

The following version increments are candidates for upcoming releases. The list is indicative and is subject to quarterly revision through the Product Council.

| Candidate Version | Indicative Window | Substantive Change | Trigger |
|---|---|---|---|
| v2.0.2 | Q4 2027 | Patch release; cross-reference alignment corrections; clarifications of ambiguous language | Cross-reference review completion |
| v2.1.0 | Q1 2028 | Minor release; addition of new module documentation; addition of new clinic type documentation | Module and clinic type intake process completion |
| v2.1.1 | Q2 2028 | Patch release; corrections and clarifications accumulated since v2.1.0 | Quarterly review |
| v2.2.0 | Q3 2028 | Minor release; addition of new region localization pack documentation; addition of new role documentation | Region and role intake process completion |
| v3.0.0 | 2029 (indicative) | Major release; substantive restatement of identity, principles, or scope | Triggered by substantive context change |

### 5.2 Upcoming Release Discipline

Upcoming releases are not commitments. Customer-facing commitments are made only for ratified versions, not for upcoming releases. Sales commitments that bypass version ratification are excluded by PRODUCT_BIBLE Section 12.5. A customer who requests a commitment for an upcoming release is engaged through the customer advisory council or through the customer success team, with the engagement recorded; the customer does not receive a sales commitment for the release until the release is ratified.

### 5.3 Upcoming Release and the Decade Horizon

Upcoming releases are interpreted in the context of the decade horizon. A release plan that is too dense (too many releases per year) erodes the framework's stability; a release plan that is too sparse erodes the framework's currency. The decade horizon is the test the Product Council applies when interpreting the release plan; a plan that optimizes the short term at the cost of the decade horizon is a defect, not a saving.

### 5.4 Upcoming Release Governance

Upcoming releases are governed through the Product Council's quarterly review. Each upcoming release candidate is assessed for continued relevance; a candidate that is no longer relevant is removed from the list, with the removal recorded. A candidate that has matured into a ratified release is moved from the upcoming releases list to the release history (Section 4), with the ratification recorded.

---

## 6. Deprecation Notices

Deprecation notices are the formal announcements that a content element, capability, module, role, or document is marked for future removal. Deprecation is distinct from removal; a deprecated element remains available during a transition window, after which it is removed. Deprecation notices are the operational expression of the deprecation policy referenced in PRODUCT_BIBLE Section 19.5 (Module Lifecycle, LC5 Deprecation Candidate and LC6 Deprecated) and Section 20.4 (Role Lifecycle, RC4 Deprecated).

### 6.1 Active Deprecation Notices

The following deprecation notices are active as of the current version. Each notice includes the deprecated element, the deprecation date, the transition window, the replacement (if any), and the migration path.

| Deprecated Element | Deprecation Date | Transition Window | Replacement | Migration Path |
|---|---|---|---|---|
| PRODUCT_BIBLE v0.1.0 (skeleton) | 2026-10-15 | Indefinite (retained in archive) | PRODUCT_BIBLE v1.0.0 and successors | Not applicable; skeleton version retained for audit only |
| PRODUCT_BIBLE v1.0.0 | 2027-01-20 | Indefinite (retained in archive) | PRODUCT_BIBLE v1.1.0 and successors | Not applicable; prior version retained for audit only |
| PRODUCT_BIBLE v1.1.0 | 2027-06-10 | Indefinite (retained in archive) | PRODUCT_BIBLE v2.0.0 | Not applicable; prior version retained for audit only |
| SYSTEM_ARCHITECTURE v0.1.0 (skeleton) | 2026-10-15 | Indefinite (retained in archive) | SYSTEM_ARCHITECTURE v1.0.0 and successors | Not applicable; skeleton version retained for audit only |
| SYSTEM_ARCHITECTURE v1.0.0 | 2027-01-20 | Indefinite (retained in archive) | SYSTEM_ARCHITECTURE v1.1.0 and successors | Not applicable; prior version retained for audit only |
| SYSTEM_ARCHITECTURE v1.1.0 | 2027-06-10 | Indefinite (retained in archive) | SYSTEM_ARCHITECTURE v2.0.0 | Not applicable; prior version retained for audit only |
| PROJECT_VISION, PROJECT_SCOPE, BUSINESS_MODEL, PRODUCT_ROADMAP, CHANGELOG v0.1.0 (skeleton) | 2027-09-15 | Indefinite (retained in archive) | Respective v1.0.0 versions | Not applicable; skeleton versions retained for audit only |

### 6.2 Deprecation Discipline

Deprecation is a formal act, not a casual one. An element is deprecated only through the Product Council, with the deprecation reasoning explicit and the transition window documented. An element that is silently abandoned — removed from active use without formal deprecation — is a defect, not a deprecation. The discipline is the operational expression of Value V-9 (documented over implicit); a deprecation that is not documented cannot be navigated.

### 6.3 Deprecation and Transition Windows

Transition windows are the periods during which a deprecated element remains available. Transition windows are governed by the element's nature: a documentation element's transition window is indefinite (the prior version is retained in the archive); a module's transition window is defined by the module lifecycle (PRODUCT_BIBLE Section 19.5); a role's transition window is defined by the role lifecycle (PRODUCT_BIBLE Section 20.4). Transition windows are documented in the deprecation notice and are not shortened without Product Council ratification.

### 6.4 Deprecation and Migration

Migration is the process by which users of a deprecated element transition to the replacement. Migration paths are documented in the deprecation notice and are elaborated in the migration notes (Section 8). Migration is supported through the transition window, with support resources allocated to assist users in transitioning. Migration that is not complete by the end of the transition window is escalated, with the response (extension, accelerated migration, or removal) ratified by the Product Council.

### 6.5 Deprecation Records

Deprecation records are maintained for the lifetime of the platform. Each record includes the deprecated element, the deprecation date, the transition window, the replacement, the migration path, and the eventual removal date. Records are the basis for audit and for retrospective analysis. The record discipline is the operational expression of Value V-7 (auditability as primitive); a deprecation that is not recorded cannot be audited.

---

## 7. Breaking Changes Archive

The breaking changes archive is the immutable record of changes that broke backward compatibility with prior versions. Breaking changes are distinct from deprecations; a deprecation marks an element for future removal, while a breaking change alters an element's behaviour, contract, or interface in a way that is incompatible with prior usage. Breaking changes are reserved for major version increments and require explicit migration paths.

### 7.1 Breaking Change Definition

A breaking change is a change that alters an element's behaviour, contract, or interface in a way that is incompatible with prior usage. Breaking changes include: removal of a documented capability; change in a documented contract's semantics; change in a configuration key's meaning; change in a role's permission set; change in a module's bounded context; change in a tenant's data residency; change in the audit trail's structure. Breaking changes do not include: addition of new capability (backward-compatible); clarification of ambiguous language (not a change in semantics); correction of cross-references (not a change in substance).

### 7.2 Breaking Change Catalogue

The following breaking changes have been recorded across the documentation framework's versions. Each entry includes the version, the breaking change, the prior behaviour, the new behaviour, and the migration path.

| Version | Breaking Change | Prior Behaviour | New Behaviour | Migration Path |
|---|---|---|---|---|
| v2.0.0 | Architectural principle precedence hierarchy made explicit | Principles applied without explicit precedence | Principles applied with explicit precedence (SYSTEM_ARCHITECTURE Section 4.19) | Downstream documents reviewed for alignment; no customer migration required |
| v2.0.0 | Configuration layer precedence made explicit | Configuration override semantics implicit | Configuration override semantics explicit (PRODUCT_BIBLE Section 22.3) | Customer configuration reviewed for alignment; no automated migration required |
| v2.0.0 | Ibn Hayan identity established as load-bearing | Identity referenced informally | Identity established as three operating commitments (PRODUCT_BIBLE Section 1.5) | Downstream documents updated to reference identity; no customer migration required |
| v2.0.1 | Conflict resolution language standardized | Varying conflict resolution language across documents | Standardized language: "In case of conflict, PRODUCT_BIBLE.md prevails" | No migration required; language clarification only |

### 7.3 Breaking Change Discipline

Breaking changes are reserved for major version increments and require explicit migration paths. A breaking change that is introduced in a minor or patch increment is a defect, not a change; it is reverted and re-introduced (if at all) in a major increment. The discipline is the operational expression of the semantic versioning posture established in Section 1.1; a breaking change that is introduced in a non-major increment erodes the framework's navigability.

### 7.4 Breaking Change and Migration

Breaking changes require migration paths, documented in the breaking change catalogue and elaborated in the migration notes (Section 8). Migration paths are supported through the transition window established for the breaking change, with support resources allocated to assist users in migrating. Migration that is not complete by the end of the transition window is escalated, with the response (extension, accelerated migration, or acceptance of the breakage) ratified by the Product Council.

### 7.5 Breaking Change Records

Breaking change records are maintained for the lifetime of the platform. Each record includes the version, the breaking change, the prior behaviour, the new behaviour, the migration path, and the post-migration review. Records are the basis for audit and for retrospective analysis. The record discipline is the operational expression of Value V-7 (auditability as primitive); a breaking change that is not recorded cannot be audited.

---

## 8. Migration Notes

Migration notes are the detailed guidance for users transitioning from a prior version to a current version. Migration notes are distinct from breaking change entries in that migration notes provide the step-by-step guidance, while breaking change entries provide the catalogue of changes. Migration notes are the operational expression of Value V-9 (documented over implicit); a migration that is not documented cannot be navigated.

### 8.1 Migration Note Catalogue

The following migration notes are active as of the current version. Each note includes the source version, the target version, the migration scope, and the migration steps.

| Source Version | Target Version | Migration Scope | Migration Steps |
|---|---|---|---|
| v1.1.0 | v2.0.0 | Full framework | Review PRODUCT_BIBLE v2.0.0 Section 1.5 (Ibn Hayan Identity); review SYSTEM_ARCHITECTURE v2.0.0 Section 4.19 (Precedence Hierarchy); review all downstream documents for alignment with the canonical spine |
| v2.0.0 | v2.0.1 | Project-level documents | Review PROJECT_VISION, PROJECT_SCOPE, BUSINESS_MODEL, PRODUCT_ROADMAP, CHANGELOG v1.0.0; update downstream references to project-level documents; no other migration required |
| v0.1.0 (skeleton) | v1.0.0 | Canonical references | Review PRODUCT_BIBLE v1.0.0 and SYSTEM_ARCHITECTURE v1.0.0; establish documentation framework's authority hierarchy |
| v1.0.0 | v1.1.0 | Canonical references | Review PRODUCT_BIBLE Section 1.5 (Ibn Hayan Identity); review expanded differentiators in Section 13; review expanded glossary in Section 33 |

### 8.2 Migration Note Discipline

Migration notes are required for every version increment that affects downstream documents or customers. A version increment that does not require migration notes is recorded as such, with the absence of migration notes documented. The discipline is the operational expression of Value V-9 (documented over implicit); a migration that is silently not documented erodes the framework's navigability.

### 8.3 Migration and Customer Support

Migration is supported through the customer success team, with support resources allocated based on the migration's scope and the customer's tier. Customers in the T1 (Solo) and T2 (Small Practice) tiers receive self-service migration guidance; customers in the T3 (Mid Practice) and T4 (Large Practice) tiers receive assisted migration; customers in the T5 (Hospital) and T6 (Hospital Network) tiers receive white-glove migration. The support discipline is the operational expression of the customer relationship posture established in BUSINESS_MODEL Section 7.1.

### 8.4 Migration and the Decade Horizon

Migration is interpreted in the context of the decade horizon. A migration that is frequent or burdensome erodes the framework's stability; a migration that is rare or trivial erodes the framework's currency. The decade horizon is the test the Product Council applies when interpreting migration; a migration that improves the framework's decade-horizon posture is preferred over a migration that optimizes the short term.

### 8.5 Migration Records

Migration records are maintained for the lifetime of the platform. Each record includes the source version, the target version, the migration scope, the migration steps, the customer's migration status, and the post-migration review. Records are the basis for audit and for retrospective analysis. The record discipline is the operational expression of Value V-7 (auditability as primitive); a migration that is not recorded cannot be audited.

---

## 9. Related Documents

This section lists the documents that are most directly related to the changelog, with a brief statement of the relationship. The list is not exhaustive; the full documentation framework is described in PRODUCT_BIBLE Section 1.6 and in the documentation framework's index.

### 9.1 Canonical References

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_BIBLE.md | The canonical product reference; this document records the evolution of PRODUCT_BIBLE and of the framework that derives from it | PRODUCT_BIBLE Sections 1.2, 19.5, 20.4, 31.6 |
| SYSTEM_ARCHITECTURE.md | The canonical architectural reference; this document records the evolution of SYSTEM_ARCHITECTURE and of the architectural spine that derives from it | SYSTEM_ARCHITECTURE Sections 1, 4 |

### 9.2 Sibling Documents in 00_PROJECT

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_VISION.md | Defines the destination toward which the changelog records the path | PROJECT_VISION Section 10 (Vision Evolution History) |
| PROJECT_SCOPE.md | Defines the boundary within which the changelog records evolution | PROJECT_SCOPE Section 11 (Scope Change Process) |
| BUSINESS_MODEL.md | Defines the commercial mechanism whose evolution the changelog records | BUSINESS_MODEL Section 1 (Business Model Canvas) |
| PRODUCT_ROADMAP.md | Defines the sequenced delivery plan whose milestones the changelog records | PRODUCT_ROADMAP Section 11 (Roadmap Archive) |

### 9.3 Downstream Documents

| Document | Relationship | Cross-Reference |
|---|---|---|
| SOFTWARE_ARCHITECTURE.md | Architectural elaboration; evolution recorded in this changelog | SOFTWARE_ARCHITECTURE |
| MODULE_ARCHITECTURE.md | Architectural elaboration; evolution recorded in this changelog | MODULE_ARCHITECTURE |
| CONFIGURATION_ARCHITECTURE.md | Architectural elaboration; evolution recorded in this changelog | CONFIGURATION_ARCHITECTURE |
| ADR-001 through ADR-006 | Architectural decision records; ratification recorded in this changelog | docs/12_ADR/ |

### 9.4 External References

| Reference | Relationship | Cross-Reference |
|---|---|---|
| Keep a Changelog | The format followed by this document's release categories (Section 2) and release history (Section 4) | keepachangelog.com |
| Semantic Versioning | The posture followed by this document's versioning scheme (Section 1) | semver.org |

### 9.5 Using This Document

This document is the authoritative reference for the documentation framework's evolution. Readers seeking the canonical product reference should consult PRODUCT_BIBLE.md; readers seeking the canonical architectural reference should consult SYSTEM_ARCHITECTURE.md. Readers seeking specific release commitments should consult PRODUCT_ROADMAP.md; readers seeking specific scope boundaries should consult PROJECT_SCOPE.md. This document does not duplicate the content of those documents; it records the framework's evolution and cross-references them.
