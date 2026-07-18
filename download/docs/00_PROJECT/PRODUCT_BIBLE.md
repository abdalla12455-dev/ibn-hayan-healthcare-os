# Ibn Hayan Healthcare Operating System — Product Bible

| Field | Value |
|---|---|
| Document Title | Product Bible |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Canonical Product Reference |
| Authority Level | Authoritative — Source of Truth |
| Version | 2.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a product decision is ratified |
| Audience | Product leadership, engineering leadership, design leadership, executive sponsors, customer-facing teams, partners |
| Scope | Product strategy, identity, philosophy, principles, scope, market positioning, customer tiers, modules, roles, governance, glossary |
| Out of Scope | Implementation details, source code, database schemas, API contracts, user-interface specifications, deployment runbooks, vendor selection |
| Conflict Resolution | This document prevails over every other product, module, or operational document. Any conflict between this document and a downstream document is resolved in favor of this document until this document is amended. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v1.0.0 (initial), v1.1.0 (identity and differentiators pass) |
| Supersedes | All prior drafts and internal memos covering product strategy |

---

## Table of Contents

1. Introduction
2. Product Vision
3. Product Mission
4. Product Philosophy
5. Core Principles
6. Design Principles
7. Product Goals
8. Problems the Product Solves
9. Target Customers
10. Stakeholders
11. Product Scope
12. Out of Scope
13. Product Differentiators
14. Business Model
15. SaaS Strategy
16. Editions
17. Supported Healthcare Organizations
18. Supported Clinic Types
19. Product Modules Overview
20. User Roles Overview
21. Permission Philosophy
22. Configuration-Driven Philosophy
23. Multi-Tenant Philosophy
24. Scalability Strategy
25. Localization Strategy
26. Accessibility Strategy
27. Security Philosophy
28. Offline Strategy
29. Integration Philosophy
30. Future Vision
31. Long-Term Roadmap
32. Success Metrics
33. Product Glossary

---

## 1. Introduction

### 1.1 Purpose of This Document

The Product Bible is the highest-level product reference for the Ibn Hayan Healthcare Operating System. It is the single document that establishes what the product is, why it exists, who it serves, how it differs from alternatives, and how it is governed. Every other product document, every module specification, every architectural decision, every go-to-market artefact, and every customer-facing commitment must align with this document. Where alignment is not possible, either the downstream artefact is incorrect or this document must be amended. There is no third option.

This document is not a marketing brief, a sales playbook, a requirements catalogue, or an implementation plan. It is the canonical product reference — the document a senior leader can read end-to-end to understand the entire product without consulting any other source. Marketing, sales, requirements, and implementation all derive from this document; they do not define it.

The Product Bible is written for senior practitioners who already understand healthcare operations, enterprise software economics, and multi-tenant SaaS delivery. It does not explain what a clinic is, what a multi-tenant platform is, or why regulatory compliance matters. It assumes that literacy and instead focuses on the product decisions that distinguish Ibn Hayan from every other healthcare system on the market.

### 1.2 Scope and Authority

The scope of this document is the entire Ibn Hayan Healthcare Operating System as a product — its identity, philosophy, principles, customer landscape, capability surface, governance model, and long-term trajectory. The document does not describe any specific implementation of the platform. It describes the product that implementations are expected to deliver.

This document holds authority over the following classes of downstream artefacts:

- All product-line documents under `docs/02_PRODUCT/` through `docs/11_MODULES/`.
- All architectural documents under `docs/01_ARCHITECTURE/`, including `SYSTEM_ARCHITECTURE.md`, `SOFTWARE_ARCHITECTURE.md`, `MODULE_ARCHITECTURE.md`, and `CONFIGURATION_ARCHITECTURE.md`.
- All decision records under `docs/12_ADR/`, which must be consistent with the principles in Section 5 and Section 6.
- All operational, security, integration, deployment, and future-direction documents under `docs/03_SECURITY/` through `docs/14_FUTURE/`.

A downstream artefact that contradicts this document is, by definition, defective. The remedy is to either correct the downstream artefact or amend this document through the Product Council. Silent contradiction is not permitted.

### 1.3 Audience

This document is written for the following primary audiences:

- **Product leadership** — to align product-line decisions with the canonical product reference.
- **Engineering leadership and chief architects** — to ensure that architectural decisions serve the product, not the reverse.
- **Design leadership** — to ground interaction, information, and visual design in the product philosophy.
- **Executive sponsors and investors** — to understand the product as a durable asset rather than a feature list.
- **Customer-facing teams** — to communicate the product consistently without improvisation.
- **Partners and integrators** — to understand what the product is and is not, before proposing extensions or integrations.

Secondary audiences include compliance, legal, finance, customer success, and prospective customers under non-disclosure. The document assumes professional literacy in healthcare and enterprise software; it does not dilute its language for general audiences.

### 1.4 Document Conventions

Throughout this document, the following conventions are observed:

- **Ibn Hayan** refers to the Ibn Hayan Healthcare Operating System as a whole, including all editions, modules, and deployment models.
- **The platform** refers to the multi-tenant runtime environment shared across customers.
- **A customer** refers to an organization that has subscribed to Ibn Hayan.
- **A tenant** refers to the logical isolation boundary within the platform that holds a single customer's data and configuration.
- **A user** refers to a human or system principal that interacts with the platform under an identity governed by a customer.
- **A module** refers to a bounded product capability shipped as part of the platform.
- **An edition** refers to a packaged tier of capability and service level offered commercially.
- **Configuration** refers to declarative, version-controlled, tenant-scoped adaptation of platform behaviour without modifying platform source.
- **Customization** refers to source-level modification of platform behaviour. Ibn Hayan does not perform customization. The distinction is load-bearing and recurs throughout this document.

Capitalized terms (such as *Configuration Before Customization*, *Healthcare First*, *One Platform Many Organizations*) refer to named principles defined in Section 5 or Section 6 and are used as proper nouns throughout the documentation framework.

### 1.5 The Ibn Hayan Identity

Ibn Hayan takes its name from Jabir ibn Hayyan, the 8th-century polymath whose systematic approach to observation, documentation, and reproducibility laid foundations that influenced both chemistry and medicine for centuries. The name is not decorative. It encodes three commitments that distinguish the product from every other healthcare system on the market.

The first commitment is **documented-before-shipped**. Every capability, every configuration surface, every role, every permission, and every integration is documented before it is exposed to a customer. Undocumented capability is defective capability. This commitment is the product-level expression of Jabir's insistence that knowledge which cannot be reproduced by others is not yet knowledge.

The second commitment is **accumulated-verified-practice**. The platform is not a collection of features released into the market and left to customers to assemble. It is an accumulated body of verified practice — workflows, configurations, role definitions, and integrations that have been tested against real healthcare operations and proven to work before being made generally available. New capability enters the platform as a candidate, matures through validation, and only then becomes a default.

The third commitment is **practitioners-not-buyers**. Ibn Hayan is built for the people who actually use healthcare software — clinicians, nurses, pharmacists, administrators, receptionists, technicians — not for procurement committees who will see the product once and never touch it again. Every product decision is made by asking what a practitioner will experience on a busy Tuesday afternoon, not what will look favourable in a comparison matrix.

These three commitments are the source of the product's identity. They are not aspirations. They are operating constraints that govern what gets built, in what order, with what level of documentation, and for whom. When a product decision is unclear, the test is whether it strengthens or weakens these three commitments.

### 1.6 Document Structure

The document is organized in six movements:

1. **Identity and philosophy** (Sections 2 through 6) — establishes what Ibn Hayan is, why it exists, and the principles that govern every product decision.
2. **Scope and differentiation** (Sections 7 through 13) — defines what the product does, what it does not do, who it serves, and how it differs from alternatives.
3. **Commercial and delivery model** (Sections 14 through 16) — defines how the product is packaged, sold, and delivered.
4. **Customer and capability landscape** (Sections 17 through 22) — defines the organizations, clinic types, modules, roles, permissions, and configuration surfaces the platform supports.
5. **Operating posture** (Sections 23 through 29) — defines how the platform behaves across tenants, scale, regions, accessibility, security, offline, and integrations.
6. **Direction and measurement** (Sections 30 through 33) — defines the long-term vision, roadmap, success metrics, and shared vocabulary.

Each section is self-contained but cross-references other sections rather than restating their content. The glossary in Section 33 is the single source of truth for product terminology and is referenced throughout the documentation framework.

### 1.7 How to Read This Document

A first-time reader should read Sections 1 through 6 in order to internalize the product identity and philosophy, then jump to Section 13 (Product Differentiators) to understand how Ibn Hayan is positioned in the market. Sections 14 through 22 may be consulted as a reference. Sections 23 through 29 are essential for anyone responsible for delivery or customer success. Sections 30 through 33 are essential for anyone responsible for product strategy or investment.

A reader looking for a specific decision rule should consult Section 5 (Core Principles) and Section 6 (Design Principles) first; these two sections together form the decision framework that governs every product choice. A reader looking for terminology should consult Section 33 (Product Glossary) directly. A reader looking for competitive positioning should consult Section 13. A reader looking for what is explicitly excluded should consult Section 12.

---

## 2. Product Vision

### 2.1 Vision Statement

Ibn Hayan exists to become the operating system of healthcare — the foundational layer on which healthcare organizations of every size, specialty, and geography run their clinical, operational, and financial work, and on which the next generation of healthcare innovation is built.

The vision is not to be one of many healthcare systems. It is to be the layer that other healthcare systems depend on, that practitioners reach for first, and that organizations build long-term strategy around. The word *operating system* is deliberate. Ibn Hayan is not an application, not a suite, and not a marketplace. It is the substrate that makes coherent healthcare computing possible across an organization.

### 2.2 The Decade Horizon

The vision is stated on a ten-year horizon. This is not a marketing flourish. Healthcare organizations operate on multi-decade planning cycles. Their systems must remain viable across leadership transitions, regulatory shifts, clinical practice evolution, mergers and acquisitions, and technology generational changes. A product that cannot articulate a credible ten-year trajectory is, from a healthcare executive's perspective, a liability.

The ten-year horizon shapes product decisions in concrete ways. It favours architectural choices that survive technology shifts over choices that optimize for the current quarter. It favours configuration over customization, because customization accumulates debt that becomes unrecoverable within five to seven years. It favours open data formats and open integration standards, because proprietary lock-in is incompatible with a decade of customer sovereignty. It favours conservative module boundaries, because modules that are wrong on day one cannot be corrected on year five without abandoning customers.

The decade horizon does not mean the product moves slowly. It means the product moves deliberately. Capability that is fast to ship but wrong on the decade horizon is not progress; it is debt.

### 2.3 The Three Vectors of the Vision

The vision unfolds along three vectors that are pursued simultaneously and in tension with each other.

The first vector is **depth**. Ibn Hayan must be deep enough in each supported specialty and operational domain that practitioners do not need to leave the platform to do their work. Depth is measured by the percentage of a practitioner's daily work that is fully supported inside the platform. A platform that requires ten external tools to complete a day's work is not deep; it is a launcher.

The second vector is **breadth**. Ibn Hayan must be broad enough to cover clinical, operational, financial, and administrative work in a single coherent system, so that an organization does not need to maintain parallel platforms for parallel functions. Breadth is measured by the number of distinct organizational functions that are first-class citizens of the platform. A platform that handles only clinical work is a clinical system; a platform that handles clinical, financial, administrative, and operational work is an operating system.

The third vector is **reach**. Ibn Hayan must be reachable by organizations of every size and in every supported geography, not only by large enterprises in wealthy markets. Reach is measured by the lowest customer tier that can adopt the platform without compromise, and by the number of regions where the platform operates as a local rather than an imported product. A platform that only serves large hospitals in three countries is a regional enterprise system; a platform that serves a single-practitioner clinic in Baghdad as capably as a 2,000-bed hospital in Riyadh is an operating system.

Tension among the three vectors is intentional. Depth without breadth produces isolated specialty silos. Breadth without depth produces a generic platform that satisfies no practitioner. Reach without depth or breadth produces a low-cost product that customers outgrow. Ibn Hayan pursues all three vectors simultaneously and accepts that progress on each is slower than it would be if the other two were ignored.

### 2.4 What the Vision Excludes

The vision explicitly excludes the following ambitions, which are common in healthcare software marketing but incompatible with Ibn Hayan's identity:

- **Becoming a healthcare provider.** Ibn Hayan is a software platform, not a clinic operator, not an insurer, and not a pharmaceutical company. The platform serves providers; it does not compete with them.
- **Owning patient data.** Patient data belongs to the patient and is custodied by the provider organization under contract. Ibn Hayan is the custodian's tool, not the data's owner.
- **Owning clinical decision-making.** Ibn Hayan provides decision support, alerts, and intelligence. It does not make clinical decisions. The clinician is always the decision-maker, and the platform's role is to inform, not to decide.
- **Being the cheapest option.** Ibn Hayan competes on decade-horizon value, not on lowest sticker price. Customers who optimize solely on price are not Ibn Hayan customers.
- **Being acquired.** Ibn Hayan is built as an independent, durable platform. Acquisition is not a product strategy and is not a goal. Decisions that would make the platform more acquirable at the cost of more useful are rejected.

### 2.5 Vision Alignment Test

Every product decision is tested against the vision by asking three questions in sequence:

1. Does this decision deepen the platform's support for the work practitioners actually do?
2. Does this decision broaden the platform's coverage of organizational functions?
3. Does this decision extend the platform's reach to organizations or geographies not previously served?

A decision that answers yes to at least one question without answering no to any other is consistent with the vision. A decision that answers no to all three questions is rejected regardless of short-term benefit. A decision that answers yes to one and no to another is escalated to the Product Council for adjudication, with the tension made explicit rather than hidden.

This test is the operational expression of the vision. It is not a checklist; it is a discipline.

---

## 3. Product Mission

### 3.1 Mission Statement

Ibn Hayan's mission is to give every healthcare organization — from a solo practitioner in a rural clinic to a multi-national hospital network — a single, configurable, durable operating system for clinical, operational, and financial work, so that practitioners spend their time caring for patients rather than fighting their software.

### 3.2 Mission Versus Vision

The vision describes the destination: to be the operating system of healthcare. The mission describes the work: to give every healthcare organization a single, configurable, durable operating system. The vision is what success looks like on the decade horizon. The mission is what is done every day to move toward that horizon.

The mission is stated in the active voice — *to give* — because the product team is accountable for delivering the platform to organizations, not for waiting for organizations to discover it. The mission is stated with the word *every* because selective reach is incompatible with the operating-system ambition. The mission is stated with three adjectives — *single*, *configurable*, *durable* — that together distinguish Ibn Hayan from fragmented, customized, or short-lived alternatives.

### 3.3 The Three Adjectives

**Single** means that an organization's clinical, operational, and financial work runs on one platform, not on a patchwork of point solutions. Single does not mean monolithic. The platform is composable — modules can be enabled or disabled per tenant — but the platform itself is one coherent system with one data model, one identity model, one configuration model, and one audit model. An organization that runs its clinical work on Ibn Hayan and its financial work on a separate ledger is not fully on the mission; the mission is to bring both onto the same platform.

**Configurable** means that the platform adapts to the organization's workflow without source-level modification. Configuration is declarative, version-controlled, tenant-scoped, and validated. It is the mechanism by which a single code base serves a solo general practitioner and a 2,000-bed tertiary hospital. Configuration is not a fallback for missing capability; it is the primary adaptation mechanism and a first-class product surface. The depth of configurability is itself a measure of product maturity.

**Durable** means that the platform remains viable across the decade horizon. Durability has three dimensions: technical (the architecture does not need to be rewritten to absorb new capability), commercial (the business model sustains investment through market cycles), and operational (the platform's uptime, recoverability, and audit posture meet healthcare-grade standards). A platform that is technically excellent but commercially fragile is not durable. A platform that is commercially successful but operationally brittle is not durable. All three dimensions are required.

### 3.4 The Practitioner Focus

The mission centres on practitioners — clinicians, nurses, pharmacists, technicians, administrators — because they are the people whose daily experience determines whether healthcare software is a help or a hindrance. A platform that satisfies a procurement committee but frustrates a nurse on a Friday night shift has failed. A platform that frustrates procurement but earns a nurse's trust will eventually be procured.

This focus shapes product decisions in concrete ways. It means that the platform's default workflows are designed for the practitioner at the point of care, not for the administrator in the back office. It means that the platform's performance targets are stated in practitioner-felt latency, not in infrastructure metrics. It means that the platform's accessibility commitments are not checkbox compliance but operational requirements, because practitioners include people with disabilities and patients include people with disabilities.

### 3.5 What the Mission Requires of the Product Team

The mission requires the product team to make decisions that are sometimes commercially uncomfortable. Refusing to ship a capability that is not yet deep enough, even when a customer offers to pay, is a mission requirement. Investing in configuration depth that does not generate immediate revenue is a mission requirement. Declining to add a feature that would benefit one customer at the cost of broadening the platform is a mission requirement. Holding the line on data ownership and patient sovereignty, even when a larger customer demands otherwise, is a mission requirement.

The mission is the test the product team applies when commercial pressure conflicts with product integrity. The mission wins. Commercial outcomes follow from product integrity over the decade horizon; they do not lead it.

---

## 4. Product Philosophy

### 4.1 Philosophy Overview

Ibn Hayan's product philosophy is the set of beliefs about healthcare, software, and organizations that shape every product decision. The philosophy is not derived from the market; it is the lens through which the market is interpreted. Where the market contradicts the philosophy, the market is regarded as wrong until the philosophy is amended.

The philosophy is stated as six beliefs. Each belief has direct product consequences, which are enumerated rather than left implicit.

### 4.2 Belief One — Healthcare Is Different

Healthcare is not a vertical industry to which general-purpose enterprise software can be adapted. Healthcare combines life-critical work, asymmetric information between provider and patient, multi-generational data horizons, dense regulatory environments, multi-stakeholder workflows, and a duty of care that has no equivalent in commerce, manufacturing, or finance. Software that does not begin from this difference is not healthcare software; it is enterprise software with healthcare customers.

The product consequence is that Ibn Hayan is healthcare-native. Every module, every role, every workflow, every configuration surface, and every integration is designed for healthcare work first. General-purpose enterprise patterns are borrowed only where they do not compromise healthcare fidelity, and the borrowing is explicit.

### 4.3 Belief Two — Configuration Is the Adaptation Mechanism

Healthcare organizations differ in specialty, size, geography, language, payment model, regulatory regime, and culture. A single hardcoded system cannot serve them. Customization — source-level modification per customer — is incompatible with a multi-tenant SaaS delivery model and with the decade horizon. The only viable adaptation mechanism is configuration: declarative, version-controlled, tenant-scoped, validated adaptation of platform behaviour without touching source.

The product consequence is that configuration is a first-class product surface with its own architecture, its own governance, and its own documentation. Configuration is not a setting; it is a discipline. The depth and quality of the configuration surface is a primary measure of platform maturity.

### 4.4 Belief Three — The Platform Outlasts Every Individual

A healthcare organization will outlast its current chief executive, its current chief information officer, its current clinical leadership, and its current vendor account team. The platform must outlast all of them. This requires that the platform be larger than any individual's preferences, that decisions be recorded rather than carried in heads, and that the platform's evolution be governed by amendable principles rather than by personal authority.

The product consequence is that every product decision of consequence is recorded in this document or in a downstream document, every architectural decision is recorded in an Architecture Decision Record, and every principle has an amendment mechanism. Tribal knowledge is a defect; explicit knowledge is the standard.

### 4.5 Belief Four — The Patient Is the Ultimate Stakeholder

The patient is not the customer of Ibn Hayan — the healthcare organization is the customer. But the patient is the ultimate stakeholder of every decision the platform enables. A decision that benefits the organization at the cost of the patient is, over the decade horizon, a decision that harms the organization. A platform that helps organizations serve patients well is a platform that organizations will retain; a platform that helps organizations extract from patients is a platform that organizations will eventually be forced to abandon.

The product consequence is that patient-facing considerations are weighted disproportionately in product decisions, even when no patient is the direct user. Patient data ownership, patient data portability, patient consent, patient safety, and patient dignity are not features; they are constraints that govern feature design.

### 4.6 Belief Five — Open Beats Closed Over the Decade

Closed platforms capture short-term rent and lose long-term relevance. Open platforms — open data formats, open integration standards, open configuration surfaces, open documentation — earn long-term relevance and rent that follows from relevance rather than from capture. Healthcare organizations have been burned by closed platforms before; they will not be burned again quietly.

The product consequence is that Ibn Hayan favours open standards over proprietary ones, exposes its data through documented interfaces, avoids captive data formats, and documents its behaviour before shipping it. Openness is a competitive strategy, not a charitable posture.

### 4.7 Belief Six — The Team Is Accountable to the Product

The product is not accountable to the team; the team is accountable to the product. This is not a rhetorical inversion. It means that when a team member leaves, the product continues. When a team's preference conflicts with a documented principle, the principle prevails. When a team's interpretation of a principle differs from the documented interpretation, the documented interpretation prevails until amended. The product is the durable artefact; the team is its steward.

The product consequence is that this document, and the documents it constrains, are written to outlast their authors. Decisions are justified, not merely asserted. Alternatives are named, not merely rejected. Future readers — including future product teams — are the audience.

### 4.8 Philosophy in Practice

The six beliefs are not decorative. They are applied as decision tests. When a product decision is unclear, the team asks which belief governs and what that belief requires. When two beliefs appear to conflict, the conflict is named explicitly and resolved through the Core Principles (Section 5) and Design Principles (Section 6), which provide precedence. When a belief is shown to be wrong, the belief is amended through the Product Council, and the amendment is recorded in this document with explicit reasoning rather than silently absorbed.

---

## 5. Core Principles

### 5.1 Purpose of Core Principles

Core Principles are the decision rules that govern product choices. They are not aspirations; they are operating constraints. Every product decision of consequence is justifiable by reference to one or more Core Principles. A decision that cannot be justified by reference to a Core Principle is, by definition, out of scope for the product.

Core Principles are distinguished from Design Principles (Section 6) as follows: Core Principles state *what* the product commits to; Design Principles state *how* the product's architecture and behaviour manifest those commitments. Core Principles are stable across market cycles; Design Principles evolve as the platform's architectural sophistication matures.

### 5.2 Principle P-1 — Healthcare First

The platform is healthcare software before it is enterprise software, before it is a SaaS product, and before it is a commercial offering. When a decision pits healthcare fidelity against commercial expediency, against generic enterprise patterns, or against SaaS delivery convenience, healthcare fidelity prevails.

**Applies to:** module scope, workflow design, role definitions, permission boundaries, data model decisions, integration prioritization.

**Conflicts with:** none. This is the foundational principle.

### 5.3 Principle P-2 — Configuration Before Customization

The platform adapts to customer needs through configuration, not through source-level customization. Customization is rejected as a delivery model. Configuration is the primary adaptation mechanism and is treated as a first-class product surface with its own architecture, governance, and validation framework.

**Applies to:** every customer-specific adaptation request, every module extension decision, every integration scope decision.

**Conflicts with:** none directly. Customization is rejected outright; it does not enter into precedence.

### 5.4 Principle P-3 — One Platform, Many Organizations

The platform is a single code base, a single configuration model, and a single operational runtime that serves every customer — from a solo practitioner to a multinational hospital network. Variations between customers are expressed as configuration, not as forks. The platform does not maintain customer-specific branches.

**Applies to:** release management, tenant isolation strategy, configuration inheritance, module packaging.

**Conflicts with:** none directly.

### 5.5 Principle P-4 — Open Data, Open Standards

Patient and operational data belongs to the customer organization, not to the platform. The platform exposes data through documented interfaces, uses open data formats wherever viable, prefers open integration standards over proprietary ones, and refuses captive data architectures. Data portability is a product commitment, not a customer effort.

**Applies to:** data model design, integration architecture, export capabilities, partner ecosystems, offboarding processes.

**Conflicts with:** none directly. Openness is a strategy, not a concession.

### 5.6 Principle P-5 — Practitioner Experience Over Procurement Satisfaction

When a product decision improves the procurement-stage impression at the cost of the practitioner-stage experience, the practitioner experience wins. The platform is designed for the people who use it daily, not for the people who buy it once.

**Applies to:** workflow design, default settings, performance targets, accessibility commitments, onboarding flows.

**Conflicts with:** occasionally with commercial pressure to add features that look good in demonstrations but harm daily use. Practitioner experience prevails.

### 5.7 Principle P-6 — Durable Over Fashionable

The platform favours architectural and product choices that remain viable across the decade horizon over choices that optimize for the current technology fashion. Fashion is acknowledged; it is not followed. Choices that are fashionable but incompatible with the decade horizon are rejected.

**Applies to:** technology selection, architectural patterns, integration protocols, user-interface paradigms.

**Conflicts with:** occasionally with market expectations and customer requests for current-fashion choices. Durable prevails.

### 5.8 Principle P-7 — Documented Before Shipped

No capability is shipped to a customer until it is documented. Documentation is part of the definition of done. Undocumented capability is defective capability, regardless of whether it works. Documentation includes behavioural specification, configuration surface, integration surface, role and permission implications, and known limitations.

**Applies to:** every module, every feature, every configuration surface, every integration, every role.

**Conflicts with:** occasionally with delivery pressure. Documentation prevails.

### 5.9 Principle P-8 — Verified Practice Over Hypothetical Capability

Capability enters the platform as a candidate, matures through validation against real healthcare operations, and only then becomes a default. Hypothetical capability — features designed in the abstract without operational validation — is not shipped as default. This protects practitioners from untested work and protects the platform from accumulating unvalidated surface area.

**Applies to:** feature release strategy, default configurations, workflow templates, integration availability.

**Conflicts with:** occasionally with market pressure to announce capability before it is validated. Verified practice prevails.

### 5.10 Principle P-9 — Composable, Not Monolithic

The platform is composed of modules with explicit boundaries, explicit contracts, and explicit dependencies. Customers compose the platform by enabling modules relevant to their work. The platform is not a monolith in which everything is always present, and it is not a marketplace in which anything goes. Composition is governed by the module architecture and by edition packaging.

**Applies to:** module boundaries, dependency management, edition composition, customer onboarding.

**Conflicts with:** occasionally with simplicity of single-tenant deployment. Composable prevails because it serves the decade horizon.

### 5.10.1 Precedence Among Core Principles

Core Principles are not strictly ordered. In the event of a conflict, the following precedence applies:

1. **Healthcare First (P-1)** prevails over all others.
2. **Configuration Before Customization (P-2)** and **One Platform, Many Organizations (P-3)** are co-equal and jointly prevail over P-4 through P-9.
3. **Open Data, Open Standards (P-4)** prevails over P-5 through P-9 when data ownership or patient sovereignty is at stake.
4. **Practitioner Experience (P-5)** prevails over P-6 through P-9 when daily-use experience is at stake.
5. The remaining principles are applied as guidance, with conflicts escalated to the Product Council for explicit adjudication.

Conflicts are not hidden. When a decision requires precedence, the precedence applied is recorded in the decision's rationale.

### 5.11 Core Principles Are Not a Checklist

Core Principles are not invoked mechanically. They are the lens through which product decisions are made. A decision that requires no principle to justify it is usually a decision that is out of scope or insufficiently considered. A decision that requires three principles to justify is usually a decision that is tension-laden and requires explicit Product Council attention. The principles exist to make tensions visible, not to resolve them by rote.

---

## 6. Design Principles

### 6.1 Purpose of Design Principles

Design Principles translate the Core Principles into architectural and behavioural commitments. They state how the platform's design manifests the product's beliefs. A Design Principle is not a feature; it is a constraint on how features are designed. Where a Core Principle says *what* the product commits to, a Design Principle says *how* the commitment is honoured.

Design Principles are distinguished from Core Principles by their architectural consequence. Each Design Principle names an architectural or behavioural property that the platform exhibits by design, not by accident, and that downstream architectural documents must preserve.

### 6.2 Design Principle D-1 — Healthcare First, Architecture Second

The platform's architecture is shaped by healthcare work, not by generic enterprise patterns adapted to healthcare. Domain models, workflow engines, permission systems, audit primitives, and integration surfaces are designed for healthcare semantics first. Generic patterns are borrowed only where they do not compromise healthcare fidelity.

**Architectural consequence:** the bounded contexts (defined in `SYSTEM_ARCHITECTURE.md`) are organized around healthcare work, not around generic enterprise resource categories. The clinical encounter is the central organizing entity of the data model, not the customer or the invoice.

**Differentiation from Core Principle P-1:** P-1 states the commitment; D-1 states the architectural consequence — that domain decomposition, entity relationships, and workflow orchestration begin from healthcare semantics.

### 6.3 Design Principle D-2 — Configuration Before Customization

The platform's adaptation surface is configuration, declared, validated, version-controlled, and tenant-scoped. Source-level customization is not a delivery mechanism. The configuration surface is treated as a first-class product with its own architecture, its own governance, and its own validation framework, defined in `CONFIGURATION_ARCHITECTURE.md`.

**Architectural consequence:** the platform has a layered configuration model with explicit precedence (platform default → edition → tenant → facility → department → care team → user → session), a configuration validation framework with five rule categories, and a configuration audit trail. Every behavioural decision in the platform is, in principle, configurable.

**Differentiation from Core Principle P-2:** P-2 states the commitment; D-2 states the architectural consequence — the layered configuration model, the validation framework, and the configuration audit trail.

### 6.4 Design Principle D-3 — One Platform, Many Organizations

The platform is a single code base serving every customer from a solo practitioner to a multinational hospital network. Variations between customers are expressed as configuration, not as forks. The platform does not maintain customer-specific branches, customer-specific builds, or customer-specific deployment artefacts.

**Architectural consequence:** the platform's multi-tenant architecture (defined in `SYSTEM_ARCHITECTURE.md`) is the default delivery model. Tenant isolation is achieved through logical separation, with dedicated compute and physical isolation available as deployment choices but never as code branches. Every customer runs the same code paths.

**Differentiation from Core Principle P-3:** P-3 states the commitment; D-3 states the architectural consequence — that multi-tenancy is the default, and that variations are expressed through configuration rather than through branches.

### 6.5 Design Principle D-4 — Simplicity Without Sacrificing Power

The platform's surface area is small for the practitioner and large for the configurator. A receptionist should be able to do their daily work without understanding the platform's full capability. A clinical informatics officer should be able to configure the platform deeply without modifying source. The platform does not trade simplicity for power; it offers each to its appropriate audience.

**Architectural consequence:** the platform separates the *experience surface* (what practitioners see) from the *configuration surface* (what administrators configure) from the *extension surface* (what integrators build against). Each surface has its own contracts, its own documentation, and its own governance. Complexity is not eliminated; it is placed where it belongs.

**Differentiation from Core Principle P-5:** P-5 prioritizes practitioner experience; D-4 states the architectural consequence — surface separation that lets practitioner simplicity coexist with configurator power.

### 6.6 Design Principle D-5 — Enterprise Scalability

The platform scales from a single-practitioner clinic to a multi-national hospital network without architectural change. Scaling is achieved through horizontal and vertical scaling of stateless components, partitioning of stateful components by tenant and by bounded context, and degradation that preserves clinical safety under load. The same code paths that serve a one-doctor clinic serve a 2,000-bed hospital.

**Architectural consequence:** the platform's scalability strategy (defined in `SYSTEM_ARCHITECTURE.md`) is multi-dimensional, covering tenants, users, facilities, data volume, transaction rate, and geographic distribution. Scaling decisions are made per dimension, not globally.

**Differentiation from Core Principle P-3:** P-3 commits to one platform; D-5 commits to that platform scaling without architectural change across the customer size spectrum.

### 6.7 Design Principle D-6 — Regional Adaptability

The platform is built for global use, with regional adaptation as a first-class concern. Localization is not a translation pass; it includes language, calendar, date and time formats, number formats, currency, regulatory frameworks, clinical coding systems, payment models, and cultural expectations about clinical workflow. A region is not a language; a region is a complete operational context.

**Architectural consequence:** the platform's localization architecture (defined in `SYSTEM_ARCHITECTURE.md`) treats regional adaptation as a configuration surface, not as a fork. Regulatory frameworks, clinical coding systems, and payment models are pluggable. The platform supports multiple regulatory regimes per tenant where organizations operate across borders.

**Differentiation from Core Principle P-3:** P-3 commits to one platform; D-6 commits to that platform being regionally adaptable without forking.

### 6.8 Design Principle D-7 — Future-Proof Architecture

The platform's architecture is designed to absorb capability that has not yet been imagined. This requires that bounded contexts be stable, that contracts be explicit, that extension points be first-class, and that the platform avoid premature commitment to technologies, paradigms, or vendors that may not survive the decade horizon.

**Architectural consequence:** the platform's extensibility strategy (defined in `SYSTEM_ARCHITECTURE.md`) defines four categories of extension points, the platform's bounded contexts are designed to outlast any specific implementation, and technology selection is treated as an implementation choice governed by architectural criteria rather than as an architectural commitment.

**Differentiation from Core Principle P-6:** P-6 commits to durability; D-7 states the architectural consequence — bounded context stability, explicit contracts, first-class extension points, and technology-agnostic posture.

### 6.9 Design Principle D-8 — Open Data, Open Standards

The platform's data is exposed through documented interfaces, uses open data formats wherever viable, and prefers open integration standards over proprietary ones. The platform does not hold customer data captive. Customer data is, by contract and by architecture, portable.

**Architectural consequence:** the platform's integration architecture (defined in `SYSTEM_ARCHITECTURE.md`) favours open healthcare standards over proprietary ones, the platform's data export capabilities are first-class, and the platform's data model is documented as a contract, not as an internal artefact.

**Differentiation from Core Principle P-4:** P-4 states the commitment; D-8 states the architectural consequence — documented interfaces, open formats, and portable data by architecture rather than by exception.

### 6.10 Design Principle D-9 — Composable, Not Monolithic

The platform is composed of modules with explicit boundaries, explicit contracts, and explicit dependencies. Customers compose the platform by enabling modules relevant to their work. The module architecture is governed by bounded contexts, not by feature catalogues.

**Architectural consequence:** the platform's module architecture (defined in `MODULE_ARCHITECTURE.md`) defines module boundaries, module contracts, module dependencies, and module lifecycle. Modules communicate through explicit contracts — commands, queries, events, and configuration schemas — never through direct data access.

**Differentiation from Core Principle P-9:** P-9 commits to composability; D-9 states the architectural consequence — explicit boundaries, explicit contracts, and explicit dependencies governed by bounded contexts.

### 6.11 Design Principle D-10 — Observable, Auditable, Accountable

The platform is observable in operation, auditable after the fact, and accountable to its decisions. Every clinical, financial, and operational action of consequence is recorded in an immutable audit trail. Every system action of consequence is observable through telemetry. Every decision of consequence is recorded in a decision record.

**Architectural consequence:** the platform's audit architecture (defined in `SYSTEM_ARCHITECTURE.md`) is a primitive, not a feature. Audit is built into every module's contract. Observability is built into every operational component. Decision records are mandatory for architectural choices of consequence.

**Differentiation from Core Principles:** D-10 is not derived from a single Core Principle; it operationalizes the combination of P-4 (open data), P-7 (documented), and the platform's duty-of-care posture.

### 6.12 Precedence Among Design Principles

Design Principles are not strictly ordered. In the event of conflict, the following precedence applies:

1. **D-1 (Healthcare First, Architecture Second)** prevails over all others.
2. **D-2 (Configuration Before Customization)** and **D-3 (One Platform, Many Organizations)** are co-equal and jointly prevail over D-4 through D-10.
3. **D-10 (Observable, Auditable, Accountable)** prevails over D-4 through D-9 when clinical, financial, or regulatory accountability is at stake.
4. The remaining Design Principles are applied as guidance, with conflicts escalated to the Product Council and recorded in the decision's rationale.

Where a Core Principle and a Design Principle appear to conflict, the Core Principle prevails. Where two Design Principles conflict and precedence does not resolve, the Product Council adjudicates and records the decision.

---

## 7. Product Goals

### 7.1 Purpose of Product Goals

Product Goals are the measurable outcomes the product team commits to over the planning horizon. They are not features; they are outcomes. A feature is a means to a goal; a goal is not a means to a feature. Product Goals are reviewed quarterly and revised annually, with the revision recorded in this document.

### 7.2 Goal G-1 — Practitioner Time Reclaimed

The platform's primary product goal is to reclaim practitioner time that is currently lost to administrative friction, software-mediated delay, and parallel-system reconciliation. The success measure is the number of practitioner minutes per shift spent on the platform versus spent on workaround activity, measured through operational telemetry and periodic practitioner surveys.

**Why this goal:** it operationalizes Principle P-5 (Practitioner Experience Over Procurement Satisfaction) and the mission's practitioner focus. A platform that does not reclaim practitioner time is not earning its place in the workflow.

**Target horizon:** measurable improvement at every quarterly review, with a cumulative target stated annually.

### 7.3 Goal G-2 — Configuration Coverage of Supported Clinic Types

The platform's configuration surface must cover the operational reality of every supported clinic type without customization. The success measure is the percentage of supported clinic types (see Section 18) for which a complete, validated configuration exists that requires no source-level modification.

**Why this goal:** it operationalizes Principle P-2 (Configuration Before Customization) and Design Principle D-2. Configuration coverage is the primary measure of the configuration surface's maturity.

**Target horizon:** complete coverage of all clinic types listed in Section 18 by the end of the planning horizon, with quarterly progress tracked against the clinic-type catalogue.

### 7.4 Goal G-3 — Tenant Onboarding Time

The platform's onboarding process must be fast enough that a small clinic can be productive on the platform within a defined window of subscription, and a large hospital can be productive within a defined window proportional to its complexity. The success measure is the median time from subscription to first clinical encounter recorded in the platform, segmented by customer size tier.

**Why this goal:** it operationalizes the mission's *every* commitment and Design Principle D-5 (Enterprise Scalability). Slow onboarding is the most common failure mode of healthcare software and the most common reason for customer churn in the first year.

**Target horizon:** segmented targets defined annually, with quarterly progress reviewed.

### 7.5 Goal G-4 — Decade-Horizon Customer Retention

The platform must retain customers across the decade horizon. The success measure is the percentage of customers who remain on the platform at year five and at year ten of their subscription, with churn causes analysed and recorded.

**Why this goal:** it operationalizes Principle P-6 (Durable Over Fashionable) and the decade horizon. Retention is the only honest measure of durability; revenue is a derivative of retention.

**Target horizon:** year-five retention tracked from year two onward; year-ten retention tracked from year five onward.

### 7.6 Goal G-5 — Module Depth Per Specialty

Each supported clinical specialty must have module depth sufficient to support the specialty's actual daily work, not a generic approximation. The success measure is the percentage of a specialty's daily workflow activities that are first-class capabilities of the platform, measured through workflow analysis per specialty.

**Why this goal:** it operationalizes the vision's depth vector and Design Principle D-1 (Healthcare First, Architecture Second). A specialty that the platform serves superficially is a specialty that the platform does not yet serve.

**Target horizon:** depth targets defined per specialty annually, with quarterly progress tracked against the specialty workflow catalogue.

### 7.7 Goal G-6 — Regional Adaptation Coverage

The platform must be operationally usable in every supported region without forking. The success measure is the number of regions where the platform passes regional adaptation readiness — language, calendar, regulatory framework, clinical coding system, payment model, and cultural workflow expectations.

**Why this goal:** it operationalizes Design Principle D-6 (Regional Adaptability) and the vision's reach vector. A platform that works in three regions is a regional platform; an operating system works in every supported region.

**Target horizon:** regional adaptation readiness tracked quarterly against the regional roadmap.

### 7.8 Goal G-7 — Open Data Portability Demonstrated

The platform's open-data commitment must be demonstrable, not theoretical. The success measure is the existence of a documented, tested, and operationally viable export pipeline that allows a customer to leave the platform with their data intact and consumable by alternative systems, exercised periodically as part of platform operations.

**Why this goal:** it operationalizes Principle P-4 (Open Data, Open Standards) and Design Principle D-8. A portability commitment that is never exercised is not a commitment.

**Target horizon:** operational export pipeline available and tested at every quarterly review.

### 7.9 Goal G-8 — Audit Completeness

Every clinical, financial, and operational action of consequence must be recorded in the audit trail. The success measure is the percentage of consequential actions that have a corresponding audit record, measured through periodic audit sampling and through automated completeness checks.

**Why this goal:** it operationalizes Design Principle D-10 (Observable, Auditable, Accountable) and the platform's duty-of-care posture. An audit gap is a compliance gap and a clinical safety gap.

**Target horizon:** 100% audit completeness for consequential actions, with quarterly progress reviewed and gaps treated as defects.

### 7.10 Relationship Among Goals

The eight Product Goals are pursued simultaneously. Tension among them is expected and is not avoided. The Product Council adjudicates tensions that cannot be resolved at the team level, with the adjudication recorded in the decision's rationale.

Goals are not traded against each other casually. A decision to deprioritize one goal in favour of another is recorded, time-bounded, and revisited. Silent trade-offs are not permitted.

---

## 8. Problems the Product Solves

### 8.1 Purpose of This Section

This section names the problems the product solves, framed as the customer experiences them. It is not a feature list; it is a problem catalogue. A feature is justified by the problem it solves; a problem without a corresponding feature is a backlog item, not a marketing claim.

### 8.2 Problem — The Fragmented Healthcare Software Landscape

Healthcare organizations typically operate a patchwork of point solutions: a clinical system for encounters, a separate system for billing, a separate system for pharmacy, a separate system for laboratory, a separate system for scheduling, a separate system for inventory, a separate system for human resources, and a separate system for accounting. Each system has its own login, its own data model, its own update cycle, its own vendor relationship, and its own integration debt. The cumulative cost of operating this patchwork — in licensing, in integration maintenance, in staff training, in parallel data entry, and in reconciliation overhead — typically exceeds the cost of any single system by a wide margin.

**How Ibn Hayan solves it:** Ibn Hayan is a single platform covering clinical, operational, financial, and administrative work in one coherent system. The patchwork is replaced by composition of modules within one platform, with one identity model, one data model, one configuration model, and one audit model. Integration debt between internal modules is eliminated by design; the modules share contracts, not integrations.

### 8.3 Problem — Customization Lock-In

Healthcare software vendors historically deliver customer-specific adaptations through source-level customization — either direct modification of the vendor's source code, customer-specific build flags, or customer-specific modules maintained outside the main code line. The result is lock-in: the customer cannot upgrade without re-applying their customizations, the vendor cannot innovate without breaking customer-specific builds, and the customization debt compounds until the only viable path is a rip-and-replace project that the customer cannot afford and the vendor cannot resource.

**How Ibn Hayan solves it:** Ibn Hayan does not customize. Customer-specific adaptation is delivered through configuration — declarative, version-controlled, tenant-scoped, validated. The platform's code base is single and shared across all customers. Customers upgrade without re-applying adaptations, because adaptations are configuration, not code. Customization debt does not accumulate because customization does not occur.

### 8.4 Problem — Data Lock-In

Healthcare software vendors historically hold customer data captive through proprietary data formats, undocumented data models, exclusionary integration contracts, and exorbitant data-export fees. Customers who wish to change vendors find that their data is, in practice, not portable — either because the format is unreadable to alternative systems, because the export is prohibitively expensive, or because the vendor declines to provide it. The result is that customers remain on platforms that no longer serve them, not because the platform is the best choice but because leaving is impractical.

**How Ibn Hayan solves it:** Ibn Hayan holds customer data under explicit custody, not ownership. Data is exposed through documented interfaces, in open formats wherever viable, and export is a first-class operational capability exercised periodically, not a customer effort that must be negotiated. The offboarding process is documented before the customer onboards, so the path out is known before the customer enters.

### 8.5 Problem — Practitioner Friction

Healthcare software is historically designed to satisfy procurement requirements and regulatory checklists, with the practitioner's daily experience as a secondary concern. The result is software that requires excessive clicks to complete common tasks, that performs slowly under clinical load, that interrupts the clinician with low-value alerts, that buries critical information behind navigation, and that demands parallel data entry into separate systems for separate functions. Practitioner friction is the largest single contributor to clinician burnout, to data quality degradation, and to patient safety incidents mediated by software.

**How Ibn Hayan solves it:** Ibn Hayan's default workflows are designed for the practitioner at the point of care (Principle P-5). Performance targets are stated in practitioner-felt latency. Alerts are governed by clinical utility, not by liability deflection. Critical information is surfaced by default; navigation is reserved for non-critical depth. Parallel data entry is eliminated by module composition within the platform. The practitioner's experience is the design centre, not the residual.

### 8.6 Problem — Specialty Shallowness

Generic healthcare software historically serves all specialties at a shallow level — the same encounter template, the same order set, the same documentation structure — with specialty-specific behaviour left to customization or to bolt-on modules. The result is that specialists either work around the platform's generic templates or maintain parallel specialty-specific systems outside the platform. Either way, the platform's claimed coverage of the specialty is fictional.

**How Ibn Hayan solves it:** Ibn Hayan's modules are designed with specialty depth as a first-class concern (Goal G-5). Each supported specialty has workflow analysis, configuration templates, and module extensions specific to its daily work. Specialty depth is measured by the percentage of a specialty's daily workflow that is a first-class capability of the platform, not by the existence of a specialty-named template.

### 8.7 Problem — Regional Incompatibility

Healthcare software built for one region typically does not work in another without significant rework. Language, calendar, regulatory framework, clinical coding system, payment model, and cultural workflow expectations differ across regions. Vendors who attempt regional expansion without architectural support for regional adaptation end up either forking the code base per region (with the resulting maintenance collapse) or shipping a poorly adapted version that customers reject.

**How Ibn Hayan solves it:** Ibn Hayan's localization architecture treats regional adaptation as a configuration surface (Design Principle D-6). Language, calendar, regulatory framework, clinical coding system, and payment model are pluggable. The platform supports multiple regulatory regimes per tenant where organizations operate across borders. Regional adaptation does not require forking.

### 8.8 Problem — Audit and Compliance Gaps

Healthcare software historically treats audit as a feature added late in development, recorded at the application layer, with gaps in coverage for actions performed through integrations, through administrative tools, or through edge-case workflows. The result is audit trails that are incomplete when they are most needed — during incident investigation, regulatory inquiry, or legal discovery. Compliance teams operate with the gap-filled audit trails they have, not the complete audit trails they need.

**How Ibn Hayan solves it:** Ibn Hayan's audit architecture is a primitive, not a feature (Design Principle D-10). Audit is built into every module's contract. Actions performed through any surface — application, integration, administrative tool — are recorded in the same audit trail with the same completeness guarantees. Audit completeness is a measured product goal (Goal G-8), with gaps treated as defects.

### 8.9 Problem — Scaling Across the Customer Spectrum

Healthcare software historically scales poorly across the customer size spectrum. Software built for large hospitals is too heavy, too expensive, and too operationally demanding for small clinics. Software built for small clinics does not have the depth, the configurability, or the operational rigour required by large hospitals. Vendors who attempt to serve both segments typically maintain two products, with the resulting duplication and the eventual abandonment of one segment.

**How Ibn Hayan solves it:** Ibn Hayan is a single platform that scales from a solo practitioner to a multinational hospital network without architectural change (Design Principle D-5). The same code paths serve both segments. The configuration surface and the edition packaging allow a small clinic to adopt a small subset of capability and a large hospital to adopt the full surface, without either customer touching a different product.

### 8.10 Problem — Opacity of Vendor Operations

Healthcare software vendors historically operate opaquely — customers do not know what the vendor is doing with their data, what the vendor's uptime actually is, what the vendor's incident response practice is, or what the vendor's roadmap commitments are. The result is a customer relationship built on trust that is rarely verified and frequently broken.

**How Ibn Hayan solves it:** Ibn Hayan operates transparently. Operational telemetry, incident records, audit trails, and roadmap commitments are shared with customers under the customer's contract. The platform's behaviour is documented before it is shipped (Principle P-7). The platform's evolution is governed by amendable principles recorded in this document, not by private preferences.

### 8.11 Problems the Product Does Not Solve

The product does not solve every healthcare problem. The following problems are explicitly out of scope:

- **Direct patient care.** The platform does not provide medical care; it supports the people who do.
- **Healthcare policy.** The platform does not set healthcare policy; it operates within the policy of each region in which it is used.
- **Insurance adjudication.** The platform supports billing and claim submission; it does not adjudicate insurance claims.
- **Pharmaceutical manufacturing.** The platform supports pharmacy operations; it does not manufacture or compound pharmaceuticals.
- **Medical device operation.** The platform integrates with medical devices; it does not operate them.

The product team refers problems outside this scope to appropriate partners, vendors, or authorities. The platform does not claim to solve problems it does not solve.

---

## 9. Target Customers

### 9.1 Customer Definition

A customer of Ibn Hayan is a healthcare organization that has subscribed to the platform under a commercial agreement and operates one or more tenants within the platform. A customer is not an individual practitioner acting outside an organizational context, not a patient, and not a partner or integrator. The customer is the organizational entity that holds the contractual relationship with Ibn Hayan and that owns the data custodied by the platform on its behalf.

### 9.2 Customer Spectrum

Ibn Hayan serves customers across a wide spectrum of size, specialty, and geography. The spectrum is intentionally broad; it reflects the vision's reach vector and the mission's *every* commitment. The spectrum is organized along three dimensions: size tier, specialty profile, and geographic region.

The breadth of the customer spectrum is a deliberate product decision. A platform that serves only one segment is not an operating system; it is a vertical application. Ibn Hayan's claim to operating-system status rests on its ability to serve the full spectrum with the same code base, the same configuration model, and the same operational runtime.

### 9.3 Customer Size Tiers

Customers are classified into six size tiers based on operational scale rather than revenue. Size tier governs default edition packaging, default onboarding pathway, default support tier, and default configuration complexity.

| Tier | Code | Typical Profile | Typical Facility Count | Typical Active User Count |
|---|---|---|---|---|
| Solo | T1 | Single practitioner, single facility | 1 | 1–3 |
| Small Practice | T2 | Small group practice, single specialty | 1–3 | 4–25 |
| Mid Practice | T3 | Multi-provider practice, single or few specialties | 3–10 | 26–100 |
| Large Practice | T4 | Multi-site practice or small hospital | 10–30 | 101–500 |
| Hospital | T5 | Single hospital or small hospital network | 1–5 | 501–2,000 |
| Hospital Network | T6 | Multi-hospital network, regional or national | 5+ | 2,000+ |

Size tier is not a fixed property. Customers may move between tiers as they grow or contract. The platform's configuration and edition packaging accommodate tier transitions without re-implementation, in keeping with Design Principle D-5 (Enterprise Scalability).

### 9.4 Customer Specialty Profile

Customers are profiled by the clinical specialties they practise. Specialty profile governs the module set, the configuration templates, and the workflow defaults that the platform applies. The supported specialties are listed in Section 18 alongside the clinic types that typically deliver them.

Specialty profiling is not a marketing segmentation; it is an operational input to configuration. A customer whose specialty profile includes cardiology receives configuration defaults validated for cardiology workflows, not generic encounter templates that the customer must then override.

### 9.5 Customer Geographic Region

Customers are classified by the geographic region in which they operate. Geographic region governs the localization layer applied — language, calendar, regulatory framework, clinical coding system, and payment model. The supported regions are listed in Section 25 (Localization Strategy).

Customers operating across multiple regions receive a multi-region tenant configuration that applies the appropriate localization per facility or per organizational unit. Cross-region operation does not require multiple tenants or multiple code branches.

### 9.6 Customer Maturity Profile

Customers are profiled by their operational maturity with respect to healthcare software. Maturity profile governs the depth of configuration that is appropriate to apply at onboarding and the cadence of subsequent configuration evolution.

| Maturity | Code | Profile | Default Configuration Posture |
|---|---|---|---|
| Initial | M1 | First healthcare software; previously paper-based or ad-hoc | Conservative defaults; minimal configuration beyond edition baseline |
| Transitional | M2 | Migrating from a previous healthcare system | Moderate configuration; mapped from prior system where viable |
| Operational | M3 | Experienced with healthcare software; clear operational practice | Full configuration; templates and overrides per organizational unit |
| Advanced | M4 | Sophisticated practice; clinical informatics capacity | Deep configuration; custom workflows within configuration surface |

Maturity profile is assessed at onboarding and revisited annually. A customer's maturity profile is not a judgement of sophistication; it is an input to configuration depth, support tier, and training pathway.

### 9.7 Customer Selection Criteria

Ibn Hayan does not pursue every customer. The product team applies selection criteria to identify customers whose needs align with the platform's current maturity and whose commitment to the decade horizon matches the platform's own. Customers who do not meet the selection criteria are referred to alternative vendors whose posture is better matched.

The selection criteria are:

- The customer operates within a supported clinic type (Section 18) and a supported region (Section 25).
- The customer accepts configuration as the adaptation mechanism and does not require source-level customization.
- The customer accepts the platform's data custody model, including the documented offboarding process.
- The customer is willing to engage with the platform's operational rigour, including audit, observability, and configuration governance.
- The customer's leadership is aligned with the decade-horizon commitment, not solely with short-term cost optimization.

Customers who require customization, who demand data captivity, who reject operational rigour, or who optimize solely on short-term cost are not Ibn Hayan customers. The product team declines such customers respectfully and refers them to vendors whose posture is better matched.

### 9.8 Customer Lifecycle

The customer lifecycle has six stages, each with defined product, operational, and commercial responsibilities.

| Stage | Code | Description |
|---|---|---|
| Prospect | L1 | Customer identified; needs assessed against selection criteria |
| Onboarding | L2 | Subscription signed; tenant provisioned; configuration applied; first encounter targeted |
| Active | L3 | Customer in steady-state operation; regular configuration evolution |
| Expansion | L4 | Customer expanding scope — additional facilities, modules, or specialties |
| Renewal | L5 | Customer approaching subscription renewal; retention assessment |
| Offboarding | L6 | Customer departing; data export executed; tenant decommissioned |

The lifecycle is not strictly linear. Customers may enter Expansion from Active and return to Active, or enter Renewal from Expansion. Offboarding is the terminal stage. The platform's data export and decommissioning capabilities are exercised as part of L6, in keeping with Goal G-7 (Open Data Portability Demonstrated).

---

## 10. Stakeholders

### 10.1 Purpose of Stakeholder Mapping

Stakeholder mapping identifies every party whose interests the platform must serve, whose constraints the platform must respect, or whose authority the platform must acknowledge. A product that serves one stakeholder at the expense of others is unstable; a product that serves all stakeholders coherently is durable. The stakeholder map is the basis for product decision trade-off analysis.

### 10.2 Primary Stakeholders

Primary stakeholders are parties whose daily work the platform directly supports. Their experience is the primary measure of product success.

| Stakeholder | Role | Primary Interest |
|---|---|---|
| Practitioners | Clinicians, nurses, pharmacists, technicians | Workflow that supports patient care without friction |
| Patients | Recipients of care | Data privacy, safety, dignity; continuity of care across providers |
| Operational staff | Receptionists, administrators, schedulers, billers | Workflow that handles operational volume without error |
| Customer leadership | Chief executives, clinical leaders, operational leaders | Visibility into operations; durable platform commitment |

### 10.3 Operational Stakeholders

Operational stakeholders are parties who operate the platform on behalf of the customer. Their experience governs the platform's operational viability.

| Stakeholder | Role | Primary Interest |
|---|---|---|
| Customer IT teams | System administrators, integrators | Manageable configuration; clear documentation; reliable integrations |
| Customer informatics | Clinical informatics officers, workflow designers | Configuration depth to express validated practice |
| Customer compliance | Compliance officers, audit teams | Complete audit trails; demonstrable regulatory alignment |
| Ibn Hayan operations | SRE, support, customer success | Observable platform; manageable incidents; clear escalation |

### 10.4 Governance Stakeholders

Governance stakeholders are parties whose authority the platform must acknowledge. Their constraints are non-negotiable.

| Stakeholder | Role | Primary Interest |
|---|---|---|
| Regulatory bodies | Health authorities, data protection authorities | Compliance with regional regulatory frameworks |
| Accreditation bodies | Accreditation councils, quality bodies | Demonstrable quality and safety practices |
| Patient representatives | Patient advocacy organizations | Patient data rights; informed consent; dignity |
| Ibn Hayan Product Council | Product governance body | Coherence of product decisions with principles |

### 10.5 Commercial Stakeholders

Commercial stakeholders are parties whose commercial relationship with the platform must be honoured.

| Stakeholder | Role | Primary Interest |
|---|---|---|
| Ibn Hayan investors | Equity holders | Sustainable commercial returns over the decade horizon |
| Integration partners | Third-party integrators | Clear integration surfaces; predictable evolution |
| Implementation partners | Implementation consultants | Documented onboarding pathways; configuration tooling |
| Training partners | Training providers | Documented curricula; role-based training pathways |

### 10.6 Stakeholder Precedence

When stakeholder interests conflict, the following precedence applies:

1. **Patient safety and patient data sovereignty** prevail over all other stakeholder interests. This precedence is non-negotiable and reflects Principle P-1 (Healthcare First) and Belief Four (the patient is the ultimate stakeholder).
2. **Practitioner experience** prevails over operational convenience and procurement satisfaction. This precedence reflects Principle P-5.
3. **Customer operational viability** prevails over commercial convenience for Ibn Hayan or its partners. A customer that cannot operate the platform sustainably is a customer that will churn.
4. **Regulatory compliance** is not a stakeholder interest to be traded; it is a floor below which the platform does not operate.
5. **Commercial sustainability** of Ibn Hayan is a necessary condition for the decade horizon; it is not traded casually but it does not override the preceding precedences.

### 10.7 Stakeholder Engagement

Each stakeholder class has a defined engagement pathway. Practitioners are engaged through workflow analysis, usability research, and feedback channels integrated into the platform. Operational staff are engaged through operational telemetry review and configuration governance forums. Customer leadership is engaged through quarterly business reviews and roadmap alignment. Regulatory bodies are engaged through compliance documentation and audit cooperation. The Product Council is engaged through the amendment mechanism defined in Section 1.2.

Stakeholder engagement is not a marketing activity; it is a product input. Feedback that reaches the product team is recorded, triaged, and either reflected in product decisions or explicitly declined with recorded reasoning.

---

## 11. Product Scope

### 11.1 Purpose of Scope Definition

Scope definition states what the platform does and does not attempt. Scope is the boundary within which the product team operates. A product without a defined scope expands indefinitely until it loses coherence; a product with a defined scope makes deliberate decisions about what enters and what does not.

### 11.2 In-Scope Capability Categories

The platform's in-scope capability is organized into five categories. Each category is supported by modules defined in Section 19.

| Category | Description | Example Modules |
|---|---|---|
| Clinical | Clinical encounter, documentation, orders, results, decision support, clinical coding | Patient, Encounter, Clinical Documentation, Orders & Results, Pharmacy |
| Operational | Scheduling, queue management, facility operations, document management | Scheduling, Documents, Notifications |
| Financial | Billing, claims, accounting, financial reporting | Billing, Accounting |
| Administrative | Patient registration, workforce management, customer relationship management | CRM, HR, Workforce |
| Platform | Identity, configuration, audit, integration, reporting — shared infrastructure for all other categories | Identity & Access, Configuration, Audit, Integration, Reporting |

The five categories together constitute the platform's capability surface. A capability that does not fit one of these categories is, by definition, out of scope.

### 11.3 Scope Across the Customer Spectrum

The platform's scope is uniform across the customer spectrum. A solo practitioner and a multinational hospital network have access to the same capability surface; they differ in which modules they enable, not in what the modules do. This is a direct consequence of Design Principle D-3 (One Platform, Many Organizations) and Design Principle D-5 (Enterprise Scalability).

A solo practitioner typically enables a small subset of modules — Patient, Encounter, Clinical Documentation, Scheduling, Billing — and operates with conservative configuration. A multinational hospital network typically enables the full module set and operates with deep configuration across multiple facilities, multiple specialties, and multiple regions. Both customers run the same code, the same configuration model, and the same operational runtime.

### 11.4 Scope Across Regions

The platform's scope is uniform across regions, with regional adaptation applied through the localization surface (Design Principle D-6). A clinic in Baghdad and a clinic in Riyadh operate the same modules with different regulatory frameworks, different clinical coding systems, different payment models, and different languages. The scope is uniform; the localization is regional.

Regional scope does not include capabilities that are unique to a single region to the extent that they cannot be generalized. A region-specific capability that cannot be expressed as a configuration of a general module is, by default, out of scope. Exceptions are recorded as ADRs and reflected in the regional adaptation roadmap.

### 11.5 Scope Evolution

Scope evolves deliberately. New capability enters the platform through a defined intake process — workflow analysis, configuration coverage assessment, module design, validation against real operations, and gradual rollout. Capability does not enter the platform through ad hoc customer requests, through sales commitments that bypass the intake process, or through engineering enthusiasm that bypasses product governance.

Scope evolution is recorded in this document through periodic amendment. The current scope is the scope of this version of the document; previous scopes are recorded in the CHANGELOG. Scope contractions are recorded with the same rigour as scope expansions; a capability that is removed is removed deliberately, not by neglect.

### 11.6 Scope Discipline

Scope discipline is the practice of saying no to capabilities that do not belong in the platform, even when the capability is feasible, requested, and commercially attractive. Scope discipline is the single most important practice for preserving the platform's coherence across the decade horizon. Every capability added to the platform is a capability that must be maintained, documented, configured, audited, and supported for the decade. Capabilities that do not justify that commitment are declined.

Scope discipline does not mean the platform is static. It means the platform grows deliberately, with each addition justified by reference to the Core Principles (Section 5), the Design Principles (Section 6), and the Product Goals (Section 7). A capability that cannot be justified by reference to these is not added, regardless of who requests it.

---

## 12. Out of Scope

### 12.1 Purpose of Out-of-Scope Definition

Out-of-scope definition is as important as in-scope definition. A product that does not state what it does not do invites scope creep through ambiguity. A product that states its exclusions explicitly gives the product team, customers, and partners a clear basis for declining requests that do not belong.

### 12.2 Excluded Capability Categories

The following categories of capability are explicitly excluded from the platform's scope. Exclusion is not a judgement of value; it is a statement of boundary.

| Excluded Category | Reason | Referred To |
|---|---|---|
| Direct patient care delivery | The platform supports care providers; it does not provide care | Healthcare providers |
| Healthcare policy setting | The platform operates within policy; it does not set policy | Health authorities |
| Insurance adjudication | The platform supports claim submission; it does not adjudicate | Insurers, payers |
| Pharmaceutical manufacturing | The platform supports pharmacy operations; it does not manufacture | Pharmaceutical manufacturers |
| Medical device operation | The platform integrates with devices; it does not operate them | Device manufacturers |
| Patient-facing consumer applications | The platform is for healthcare organizations; consumer apps are separate | Consumer health vendors |
| Medical education and training content | The platform delivers operational training on its own use; it does not deliver medical education | Medical education providers |
| Research data management | The platform supports operational care; research data management is a separate discipline | Research data platforms |
| Public health surveillance reporting | The platform supports regulatory reporting; public health surveillance is regionally governed | Public health authorities (selective integration supported) |

### 12.3 Excluded Adaptation Mechanisms

The following adaptation mechanisms are explicitly excluded from the platform's delivery model. Exclusion is absolute, not selective.

| Excluded Mechanism | Reason |
|---|---|
| Source-level customization per customer | Incompatible with multi-tenant SaaS and decade horizon (Principle P-2) |
| Customer-specific code branches | Incompatible with one platform principle (Principle P-3) |
| Customer-specific build artefacts | Incompatible with one platform principle (Principle P-3) |
| Customer-specific deployment topologies that require code changes | Incompatible with one platform principle (Principle P-3) |
| Back-channel configuration that bypasses the configuration surface | Incompatible with Design Principle D-2 and auditability (Design Principle D-10) |
| Manual database modifications to alter behaviour | Incompatible with auditability and configuration governance |

### 12.4 Excluded Data Practices

The following data practices are explicitly excluded from the platform's operating model.

| Excluded Practice | Reason |
|---|---|
| Selling patient data to third parties | Violates Belief Four (patient as ultimate stakeholder) and Principle P-4 |
| Using patient data for advertising | Violates Belief Four and Principle P-4 |
| Training public AI models on patient data without explicit consent | Violates Belief Four and Principle P-4 |
| Holding customer data captive through proprietary formats | Violates Principle P-4 and Design Principle D-8 |
| Charging prohibitive fees for data export | Violates Principle P-4 and Design Principle D-8 |
| Retaining customer data beyond the contracted retention period | Violates data custody model |

### 12.5 Excluded Commercial Practices

The following commercial practices are explicitly excluded from the platform's commercial model.

| Excluded Practice | Reason |
|---|---|
| Pricing that locks customers through steep switching costs | Incompatible with decade horizon and open data commitment |
| Sales commitments that bypass product governance | Incompatible with scope discipline (Section 11.6) |
| Customization as a revenue source | Incompatible with Principle P-2 |
| Discounting in exchange for case-study rights without consent | Incompatible with patient data sovereignty |
| Term locks beyond the customer's reasonable evaluation window | Incompatible with retention-by-value posture |

### 12.6 Excluded Implementation Choices

The following implementation choices are excluded from the platform's architecture, in keeping with the technology-agnostic posture of `SYSTEM_ARCHITECTURE.md`. These exclusions are recorded here because they have product-level consequences.

| Excluded Choice | Reason |
|---|---|
| Commitment to a single cloud vendor as architectural lock-in | Incompatible with decade horizon and Design Principle D-7 |
| Commitment to a specific framework as architectural identity | Incompatible with Design Principle D-7 |
| Commitment to a specific database technology as architectural identity | Incompatible with Design Principle D-7 |
| Build of customer-specific user-interface surfaces | Incompatible with one platform principle (Principle P-3) |
| Maintenance of separate code bases per edition | Incompatible with one platform principle (Principle P-3) |

### 12.7 Discipline of Exclusion

Exclusions are not soft preferences. They are recorded commitments that the product team declines to violate, regardless of commercial pressure. When a customer requests a capability that falls under an exclusion, the request is declined with reference to the relevant exclusion, and an alternative path within the platform's scope is proposed if one exists. When a partner proposes a partnership that requires violating an exclusion, the partnership is declined.

Exclusions are amended only through the Product Council, with the amendment recorded in this document and the reasoning explicit. Silent erosion of exclusions is not permitted.

---

## 13. Product Differentiators

### 13.1 Purpose of This Section

This section states what makes Ibn Hayan different from every other healthcare system on the market. The differentiators are not features; they are product-level commitments that, taken together, distinguish the platform in ways that competitors cannot match without abandoning their own posture. A differentiator that a competitor can match by adding a feature is not a differentiator; it is a feature.

The differentiators are stated as contrasts. Each contrast names a class of competitor and the dimension on which Ibn Hayan differs. The contrasts are factual, not dismissive; competitors named in this section are credible organizations with credible products, and the differences are matters of posture and architecture, not of quality.

### 13.2 Differentiator 1 — Healthcare-Native, Not Healthcare-Adapted

Ibn Hayan is built as healthcare software from the first line of the first module. The bounded contexts are organized around healthcare work; the data model centres on the clinical encounter; the configuration surface is expressed in healthcare terms; the role and permission model reflects healthcare operational reality. The platform is not enterprise software adapted to healthcare, not a generic vertical-industry platform repurposed for clinics, and not a horizontal SaaS product with a healthcare skin.

**Contrast with generic enterprise platforms:** generic enterprise platforms (CRM platforms, ERP platforms, low-code platforms) adapt to healthcare by adding healthcare templates, healthcare fields, and healthcare workflows on top of an architecture designed for horizontal use. The adaptation produces software that works for healthcare in the sense that it records healthcare data, but that does not work for healthcare in the sense that it supports healthcare work. The adaptation is visible in every layer — in the data model that has healthcare entities as children of generic entities, in the workflow engine that treats clinical encounters as cases of generic workflows, in the permission model that treats clinical roles as instances of generic roles.

Ibn Hayan's healthcare-native posture means that the platform's architecture begins from healthcare and is judged by healthcare fidelity, not by generic enterprise fitness.

### 13.3 Differentiator 2 — Configuration-Driven, Not Customization-Dependent

Ibn Hayan adapts to customer needs exclusively through configuration. Customization is not a delivery mechanism, not a revenue source, and not an exception. The configuration surface is deep enough to express the operational reality of every supported clinic type without source-level modification.

**Contrast with traditional healthcare software vendors:** traditional healthcare software vendors (including Epic, Cerner/Oracle Health, and Athenahealth) historically deliver customer-specific behaviour through customization — either direct source modification, customer-specific build flags, customer-specific modules maintained outside the main code line, or implementation-time scripting that effectively modifies behaviour outside the configuration surface. Customization is the vendor's revenue source (implementation fees), the customer's lock-in (the customization cannot be ported), and the platform's debt (the customization must be re-applied at every upgrade).

Ibn Hayan's configuration-driven posture means that customers upgrade without re-applying adaptations, that the platform innovates without breaking customer-specific builds, and that customization debt does not accumulate. The cost of this posture is a more demanding configuration surface and a more disciplined product team; the benefit is a platform that remains viable across the decade horizon.

### 13.4 Differentiator 3 — One Platform, Many Organizations

Ibn Hayan is a single code base serving every customer from a solo practitioner to a multinational hospital network. There are no separate products for small clinics and for hospitals, no separate code branches for different customer segments, and no separate deployments for different customer tiers. Variations are expressed as configuration and as edition packaging, not as forks.

**Contrast with segmented product portfolios:** most healthcare software vendors maintain segmented product portfolios — a small-clinic product, a mid-market product, and an enterprise hospital product — each with its own code base, its own release cadence, and its own fate. The small-clinic product is typically neglected once the vendor's enterprise business grows; the enterprise product is typically too heavy for small clinics. Customers who outgrow the small-clinic product face a migration to the enterprise product, which is in practice a rip-and-replace project.

Ibn Hayan's one-platform posture means that customers grow within the platform rather than out of it. A solo practitioner who becomes a 30-provider practice continues on the same platform with deeper configuration and broader module enablement, not on a different product. The platform's commitment to the customer is not segmented by the customer's size.

### 13.5 Differentiator 4 — Unified Platform, Not Acquired Suite

Ibn Hayan is built as a unified platform from inception. The modules are designed to share contracts, share data, share configuration, and share audit. The platform is not a suite of acquired products integrated through post-hoc connectors, and it is not a portfolio of point solutions branded under one name.

**Contrast with acquired healthcare software suites:** several large healthcare software vendors (including Cerner/Oracle Health and, in segments, Athenahealth) are portfolios of acquired products — the clinical product from one acquisition, the billing product from another, the pharmacy product from a third, the analytics product from a fourth. Integration between acquired products is achieved through post-hoc connectors, with the result that data flows between products are fragile, configuration is inconsistent, and the user experience is discontinuous. Acquired suites age as their constituent products diverge; the vendor's integration investment rarely keeps pace with the products' independent evolution.

Ibn Hayan's unified-platform posture means that integration between modules is by design, not by connector; that configuration is consistent across modules; and that the user experience is continuous across the platform's surface.

### 13.6 Differentiator 5 — Globally Adaptable, Not Regionally Fixed

Ibn Hayan is built for global use, with regional adaptation as a first-class architectural concern. Language, calendar, regulatory framework, clinical coding system, payment model, and cultural workflow expectations are pluggable configuration surfaces. The platform supports multiple regulatory regimes per tenant where organizations operate across borders.

**Contrast with regionally fixed healthcare software:** most healthcare software is built for a specific region — US-centric software assumes a particular payment model, a particular regulatory framework, and a particular clinical coding system; software built for other regions makes analogous assumptions. Regional expansion of regionally fixed software requires either forking the code base per region (with the resulting maintenance collapse) or shipping a poorly adapted version that customers reject. Vendors who attempt regional expansion without architectural support typically retreat to their home region.

Ibn Hayan's globally adaptable posture means that regional adaptation does not require forking, that the platform's regional footprint can expand without architectural change, and that customers operating across borders receive coherent multi-region support within a single tenant.

### 13.7 Differentiator 6 — Accessible Across Tiers, Not Enterprise-Only

Ibn Hayan is accessible to healthcare organizations of every size, from a solo practitioner to a multinational hospital network. The platform's edition packaging and pricing model are designed to make the platform viable for small clinics, not only for large hospitals. The same configuration surface, the same module set, and the same operational rigour are available to every customer; what differs is the scope of enablement, not the quality of the platform.

**Contrast with enterprise-only healthcare software:** enterprise healthcare software is priced and operated for hospitals and large networks. Small clinics cannot afford the licensing, cannot resource the implementation, and cannot sustain the operational demands. The result is that small clinics are served either by lower-quality small-clinic software or by paper. The two-tier market — high-quality software for hospitals, low-quality software for clinics — is a market failure that Ibn Hayan's posture addresses directly.

Ibn Hayan's accessible-across-tiers posture means that the platform is operationally viable at T1 (Solo) through T6 (Hospital Network), with edition packaging and pricing that make adoption feasible at every tier. This is a deliberate competitive stance, not a charitable one; small clinics that grow into hospitals become long-term customers, and the platform's reach vector depends on serving them.

### 13.8 Differentiator 7 — Open Data, Not Captive Data

Ibn Hayan holds customer data under explicit custody, not ownership. Data is exposed through documented interfaces, in open formats wherever viable, and export is a first-class operational capability exercised periodically. The offboarding process is documented before the customer onboards, so the path out is known before the customer enters.

**Contrast with captive-data healthcare software:** many healthcare software vendors hold customer data captive through proprietary formats, undocumented data models, exclusionary integration contracts, and exorbitant data-export fees. Customers who wish to change vendors find that their data is, in practice, not portable. The vendor's revenue depends on captivity; the customer's sovereignty depends on portability; the two are in tension, and the vendor's commercial interest prevails.

Ibn Hayan's open-data posture means that customer data is portable by architecture, not by exception. The platform's commercial sustainability depends on retention by value, not by captivity. Customers remain on the platform because it serves them, not because they cannot leave.

### 13.9 Differentiator 8 — Long-Term Product, Not Acquisition Target

Ibn Hayan is built as a durable, independent platform. Acquisition is not a product strategy and is not a goal. Decisions are made on the decade horizon, not on the exit horizon. The platform's architecture, commercial model, and operational posture are designed for independence, not for acquirability.

**Contrast with acquisition-target healthcare software:** many healthcare software vendors operate with an explicit or implicit acquisition strategy — building toward an exit rather than toward durability. Acquisition strategy produces different decisions than durability strategy: features that increase short-term metrics at the cost of long-term debt are favoured; architecture that is acquirable (small, simple, easily absorbed) is favoured over architecture that is durable (deep, demanding, hard to absorb); customer relationships are managed for retention through the exit window rather than for retention across the decade horizon. The result is that acquired products typically degrade after acquisition, as the acquirer's priorities replace the vendor's.

Ibn Hayan's long-term product posture means that the platform is built to outlast its current investors, its current leadership, and its current team. Decisions that increase durability at the cost of acquirability are favoured. Customers who commit to the platform can expect the platform to remain committed to them.

### 13.10 Differentiator 9 — Specialty Depth, Not Generic Templates

Ibn Hayan's modules are designed with specialty depth as a first-class concern. Each supported clinical specialty has workflow analysis, configuration templates, and module extensions specific to its daily work. Specialty depth is measured by the percentage of a specialty's daily workflow that is a first-class capability of the platform, not by the existence of a specialty-named template.

**Contrast with generic-template healthcare software:** most healthcare software serves all specialties at a shallow level — the same encounter template, the same order set, the same documentation structure — with specialty-specific behaviour left to customization or to bolt-on modules. Specialists either work around the platform's generic templates or maintain parallel specialty-specific systems outside the platform. The platform's claimed coverage of the specialty is fictional.

Ibn Hayan's specialty-depth posture means that specialists do not need to leave the platform to do their work. The depth is achieved through configuration templates validated against real specialty workflows, not through generic templates that the customer must override.

### 13.11 Differentiator 10 — Transparent Pricing, Not Opaque Contracting

Ibn Hayan's pricing is transparent and documented. Edition packaging, module pricing, and service tiers are published. Customer contracts do not contain pricing terms that differ materially from the published pricing without explicit justification. The platform's commercial model is not a negotiation; it is a published posture.

**Contrast with opaque-contracting healthcare software:** many healthcare software vendors operate with opaque contracting — pricing is negotiated per customer, with the result that similar customers pay materially different prices, pricing is not published, and the vendor's revenue depends on the customer's negotiating sophistication rather than on the platform's value. Opaque contracting favours large customers with procurement sophistication over small customers without it, and it obscures the platform's actual market position.

Ibn Hayan's transparent-pricing posture means that customers know what they are paying for and what they are paying. Small customers are not disadvantaged by their lack of procurement sophistication. The platform's market position is visible to the market.

### 13.12 Competitive Comparison Matrix

The following table summarizes the differentiation against named competitor classes. The comparison is stated at the posture level, not at the feature level. Feature-level comparisons age quickly; posture-level comparisons are stable.

| Dimension | Ibn Hayan | Epic | Cerner / Oracle Health | Athenahealth | Odoo Healthcare | ERPNext Healthcare | Generic Clinic Management Systems |
|---|---|---|---|---|---|---|---|
| Healthcare-native architecture | Yes | Yes | Partial (acquired suite) | Partial | No (vertical module) | No (vertical module) | Varies |
| Adaptation mechanism | Configuration only | Configuration + customization | Configuration + customization | Configuration + customization | Configuration + code modification | Configuration + code modification | Configuration + code modification |
| Multi-tenant SaaS default | Yes | No (single-tenant) | Partial | Yes | Partial | Self-hosted | Varies |
| Single code base across customer spectrum | Yes | No (segmented products) | No (segmented products) | Partial | Yes | Yes | No |
| Unified platform (not acquired suite) | Yes | Yes | No (acquired) | No (acquired) | Yes | Yes | Varies |
| Global adaptability without fork | Yes | Limited | Limited | Limited (US-centric) | Limited | Limited | Limited |
| Accessible to small clinics | Yes | No | No | Partial | Yes | Yes | Yes |
| Open data portability by architecture | Yes | No | No | No | Partial | Partial | No |
| Long-term product (not acquisition target) | Yes | Yes | No (acquired by Oracle) | No (acquired) | Yes | Yes | Varies |
| Specialty depth without customization | Yes | Yes (with customization) | Partial | Partial | No | No | No |
| Transparent published pricing | Yes | No | No | Partial | Yes | Yes | Varies |

### 13.13 Differentiator Discipline

Differentiators are not marketing claims; they are product commitments. Each differentiator in this section is a commitment that the product team is accountable for preserving. A differentiator that erodes through neglect or through commercial pressure is a defect that the Product Council must address. The differentiator list is reviewed annually, with erosion recorded and addressed.

A new differentiator is added only when the platform exhibits a product-level commitment that competitors cannot match by adding a feature. A differentiator that competitors can match is removed from this section and demoted to a feature claim in the appropriate module documentation.

---

## 14. Business Model

### 14.1 Purpose of Business Model Definition

The business model defines how Ibn Hayan sustains the investment required to deliver the decade-horizon commitment. The business model is not the product; it is the commercial mechanism that makes the product viable. A product without a viable business model is a product that will eventually be abandoned, regardless of its quality. A business model without a coherent product is a commercial exercise that will eventually collapse. The two are interdependent.

### 14.2 Revenue Model

Ibn Hayan's revenue model is subscription-based, with revenue derived from platform subscriptions, module enablement, and service tiers. The model is designed for alignment with customer success: revenue grows when customers expand their use of the platform, not when customers are locked in or upsold capabilities they do not use.

| Revenue Stream | Description | Alignment |
|---|---|---|
| Platform subscription | Per-customer subscription to the platform, tiered by edition | Aligns with customer commitment to the platform |
| Module enablement | Per-module subscription for modules beyond the edition baseline | Aligns with customer expansion of platform use |
| Service tier | Per-tier subscription for support, SLA, and operational services | Aligns with customer operational sophistication |
| Implementation services | Optional implementation and configuration services | Aligns with customer onboarding success |
| Training services | Optional role-based training for customer teams | Aligns with customer operational maturity |

Revenue is not derived from customization, from data monetization, from advertising, or from lock-in fees. These revenue sources are excluded by Section 12.4 and Section 12.5.

### 14.3 Pricing Principles

Pricing is governed by the following principles:

| Principle | Description |
|---|---|
| Transparent | Pricing is published and documented; customers know what they are paying for |
| Tiered | Pricing is tiered by edition and service level, not negotiated per customer |
| Aligned | Pricing aligns with customer value, not with customer negotiating sophistication |
| Predictable | Pricing is predictable across the subscription term; surprise increases are not permitted |
| Sustainable | Pricing sustains the platform's investment across the decade horizon |
| Accessible | Pricing makes the platform viable at every customer size tier, not only at enterprise tier |

### 14.4 Cost Model

The platform's cost model is dominated by the following cost categories, in approximate order of magnitude:

| Cost Category | Description | Trend |
|---|---|---|
| Engineering | Product engineering, architecture, configuration framework, module development | Sustained investment; scales sub-linearly with revenue |
| Operations | SRE, platform operations, incident response, observability | Scales with customer count and transaction volume |
| Customer success | Onboarding, configuration consulting, account management | Scales with customer count and customer complexity |
| Support | Tiered support across L1, L2, L3 | Scales with customer count and platform surface |
| Compliance and security | Regulatory compliance, security operations, audit | Sustained investment; non-negotiable |
| Documentation | Product documentation, configuration guides, training material | Scales with platform surface |
| Regional adaptation | Localization, regulatory framework adaptation, regional partnerships | Scales with regional footprint |
| Sales and marketing | Customer acquisition, market development | Scales with growth ambition |

The cost model favours investment in engineering, operations, customer success, and documentation over investment in sales and marketing. The platform's growth strategy is product-led and retention-led, not sales-led. The ratio of engineering and operations investment to sales and marketing investment is a monitored metric, with erosion treated as a strategic risk.

### 14.5 Unit Economics

The platform's unit economics are designed for decade-horizon sustainability. The primary unit-economic metrics are:

| Metric | Description | Target Posture |
|---|---|---|
| Customer Lifetime | Median years a customer remains on the platform | 7+ years (decade-horizon ambition) |
| Customer Lifetime Value (LTV) | Cumulative gross margin per customer over lifetime | Substantially exceeds CAC |
| Customer Acquisition Cost (CAC) | Fully-loaded cost of acquiring a customer | Substantially below LTV; payback within 24 months |
| Net Revenue Retention (NRR) | Revenue retained from existing customers, including expansion and churn | Above 110% (target posture) |
| Gross Margin | Revenue minus direct delivery cost | Sustained above 70% (SaaS benchmark) |
| ARR per customer | Annual recurring revenue per customer | Distributed across customer tiers; not concentrated at enterprise |

Unit economics are reviewed quarterly. Erosion in any metric is treated as a strategic risk and addressed through product, operational, or commercial response, not through short-term revenue optimization that compromises the decade horizon.

### 14.6 Investment Posture

Ibn Hayan's investment posture is patient. The platform is built for decade-horizon durability, and the investment cadence reflects that horizon. Investment decisions are made on the basis of long-term value, not short-term return. The platform's investors are selected for alignment with this horizon; investors with short-term return expectations are not accepted.

The investment posture has the following consequences:

- Engineering investment is sustained through market cycles, not reduced during downturns.
- Configuration depth investment continues even when it does not generate immediate revenue.
- Regional adaptation investment continues even when regional revenue is initially low.
- Documentation investment is treated as part of the product, not as a residual.
- Customer success investment is prioritized over sales investment during the platform's maturation phase.

### 14.7 Business Model Alignment with Principles

The business model is designed to align with the product principles. The alignment is explicit:

| Principle | Business Model Consequence |
|---|---|
| P-2 (Configuration Before Customization) | Customization is not a revenue source; configuration depth is |
| P-3 (One Platform, Many Organizations) | One product, one code base; no segmented product portfolio |
| P-4 (Open Data, Open Standards) | Data portability is not a paid add-on; captivity is not a revenue source |
| P-5 (Practitioner Experience) | Pricing does not extract from practitioner-facing features |
| P-6 (Durable Over Fashionable) | Investment posture is patient; short-term optimization is rejected |
| Decade horizon | Unit economics target 7+ year customer lifetime; NRR above 110% |

Where the business model and the product principles appear to conflict, the conflict is escalated to the Product Council. The business model is amended to align with the principles, not the reverse.

---

## 15. SaaS Strategy

### 15.1 Purpose of SaaS Strategy

The SaaS strategy defines how the platform is delivered to customers as a multi-tenant software-as-a-service offering. The strategy is not a deployment choice; it is a product-level commitment that shapes architecture, operations, commercial model, and customer relationship. The SaaS posture is a direct consequence of Principle P-3 (One Platform, Many Organizations) and Design Principle D-3 (One Platform, Many Organizations).

### 15.2 Multi-Tenancy as Default

Multi-tenancy is the default delivery model. Every customer operates as a tenant within a shared platform, with logical isolation of data, configuration, and operational state. Multi-tenancy is not a cost optimization; it is the architectural expression of one platform serving many organizations.

Multi-tenancy has the following product-level consequences:

- Every customer runs the same code paths, with the same bug fixes, the same security patches, and the same feature evolution.
- Configuration is the only mechanism by which customers differ in behaviour.
- Operational incidents affect the platform, not individual customers, and are addressed at the platform level.
- The platform's roadmap is uniform; customers do not negotiate custom roadmaps.

### 15.3 Isolation Levels

The platform supports three isolation levels, available as deployment choices but never as code branches. The isolation levels are defined in `SYSTEM_ARCHITECTURE.md` and summarized here.

| Isolation Level | Description | Typical Customer |
|---|---|---|
| Logical | Shared compute, shared storage, logical tenant separation | Default; serves the majority of customers |
| Logical with Dedicated Compute | Shared storage, dedicated compute per tenant | Customers with specific performance or compliance needs |
| Physical | Dedicated infrastructure, single-tenant deployment | Customers with regulatory or contractual physical-separation requirements |

All three isolation levels run the same code, the same configuration model, and the same operational runtime. The choice of isolation level is a deployment decision, not a product decision. Customers at the physical isolation level are still on the same platform as customers at the logical isolation level; they are not on a different product.

### 15.4 SaaS Operational Posture

The SaaS operational posture defines the platform's operational commitments to customers. The posture is documented in service-level agreements and operational runbooks, and is summarized here.

| Operational Dimension | Posture |
|---|---|
| Availability | Documented SLA per edition; measured and reported transparently |
| Recoverability | Documented recovery objectives per data class; tested periodically |
| Incident response | Documented response process; customer-visible incident records |
| Patching | Continuous; security patches deployed within documented windows |
| Backup | Continuous; documented retention and restoration procedures |
| Audit | Complete audit trail of platform operations; accessible to customers per contract |
| Observability | Operational telemetry shared with customers under contract |

### 15.5 Customer Tenancy Model

Each customer operates one or more tenants within the platform. The tenancy model is defined in `SYSTEM_ARCHITECTURE.md` and summarized here.

| Tenancy Pattern | Description | Typical Use |
|---|---|---|
| Single tenant per customer | One tenant holds all the customer's data and configuration | Default for most customers |
| Multi-tenant per customer | Multiple tenants, typically per region or per division | Customers operating across regions with separate data residency |
| Sandbox tenant | Non-production tenant for configuration testing and training | All customers; included with editions |

The tenancy model accommodates customers who, for regulatory or organizational reasons, require multiple tenants. The platform's configuration surface allows configuration inheritance across tenants within a customer, so that a customer's sandbox inherits from production and a customer's regional tenants inherit from a customer-level baseline.

### 15.6 SaaS Versus Self-Hosted

Ibn Hayan is a SaaS platform. Self-hosted deployment is available only as the physical isolation level (Section 15.3) and only for customers whose regulatory or contractual requirements demand it. Self-hosted deployment is not a different product; it is the same platform deployed on dedicated infrastructure.

The platform does not offer a self-hosted community edition, a self-hosted open-source edition, or a downloadable installer. These delivery models are incompatible with the SaaS posture and with the decade-horizon commitment. Customers who require self-hosted deployment for regulatory reasons receive the same platform, the same configuration surface, and the same operational runtime as SaaS customers, deployed on dedicated infrastructure under a physical-isolation agreement.

### 15.7 SaaS Strategy Alignment

The SaaS strategy aligns with the product principles as follows:

| Principle | SaaS Strategy Consequence |
|---|---|
| P-3 (One Platform, Many Organizations) | Multi-tenancy as default; no segmented products |
| P-6 (Durable Over Fashionable) | SaaS posture enables decade-horizon investment; no rip-and-replace upgrades |
| D-5 (Enterprise Scalability) | SaaS posture enables scaling across customer spectrum without architectural change |
| D-7 (Future-Proof Architecture) | SaaS posture enables continuous evolution; customers do not face upgrade projects |
| Decade horizon | SaaS posture is the only delivery model compatible with the decade horizon |

The SaaS posture is not a delivery convenience; it is a product commitment. Customers who require delivery models incompatible with SaaS ( perpetual licensing, on-premise deployment without operational integration, community open-source distribution) are not Ibn Hayan customers and are referred to alternative vendors.

---

## 16. Editions

### 16.1 Purpose of Edition Packaging

Edition packaging organizes the platform's capability surface into commercially viable offerings. Editions are not different products; they are different scopes of enablement of the same product. The edition packaging is designed to make the platform accessible across the customer size spectrum (Differentiator 6) while preserving the platform's coherence (Principle P-3).

### 16.2 Edition Catalogue

The platform is packaged into four editions. The edition catalogue is stable; editions are not added or removed casually, and changes are recorded in this document through amendment.

| Edition | Code | Target Customer Tier | Module Scope | Service Tier |
|---|---|---|---|---|
| Trial | E0 | Prospects evaluating the platform | Subset of Essential | Limited; no SLA |
| Essential | E1 | T1 (Solo) and T2 (Small Practice) | Core clinical and operational modules | Standard; business-hours SLA |
| Professional | E2 | T3 (Mid Practice) and T4 (Large Practice) | Essential modules + advanced clinical, financial, administrative | Enhanced; extended-hours SLA |
| Enterprise | E3 | T5 (Hospital) and T6 (Hospital Network) | Full module set | Premium; 24/7 SLA |

### 16.3 Trial Edition (E0)

The Trial edition is a non-production edition designed for prospect evaluation. It provides access to a subset of Essential edition modules with limited data volume, limited user count, and no service-level commitment. The Trial edition is time-bounded; prospects either convert to a paid edition within the trial window or the trial tenant is decommissioned.

The Trial edition is not a free tier. It is an evaluation tool. Perpetual free use of the platform is not offered, because the platform's sustainability depends on subscription revenue and because free-tier usage typically degrades the platform's operational posture for paying customers.

### 16.4 Essential Edition (E1)

The Essential edition is designed for solo practitioners and small practices. It includes the core clinical and operational modules required for primary care practice: Patient, Encounter, Clinical Documentation, Orders & Results, Scheduling, Billing, and basic Pharmacy. Configuration depth is available but the default configuration is conservative, in keeping with the typical maturity profile of T1 and T2 customers.

The Essential edition is priced to be accessible. Pricing is published and is not negotiated per customer. The edition is designed for self-service onboarding where the customer's maturity profile permits, with optional implementation services available.

### 16.5 Professional Edition (E2)

The Professional edition is designed for mid and large practices. It includes the Essential modules plus advanced clinical modules (specialty-specific modules), advanced financial modules (Accounting, advanced Billing), and administrative modules (CRM, HR, Workforce). Configuration depth is fuller, and the edition supports multi-facility operation within a single tenant.

The Professional edition is priced for practices that have outgrown the Essential edition's scope but do not require the Enterprise edition's scale. The edition is the platform's core commercial offering and the typical entry point for T3 and T4 customers.

### 16.6 Enterprise Edition (E3)

The Enterprise edition is designed for hospitals and hospital networks. It includes the full module set, full configuration depth, multi-facility and multi-region operation, dedicated support, and premium service-level commitments. The edition supports the operational rigour required by large healthcare organizations, including advanced audit, advanced security, and advanced integration capabilities.

The Enterprise edition is priced for the operational commitment it represents. The edition is not a customization vehicle; customers at the Enterprise edition receive the same platform as customers at the Essential edition, with broader module enablement and deeper service commitments.

### 16.7 Edition Composition Rules

Edition composition is governed by the following rules:

| Rule | Description |
|---|---|
| Single code base | All editions run the same code; editions differ only in configuration |
| Module enablement | Editions differ in which modules are enabled by default |
| Configuration depth | Editions differ in default configuration depth, not in configuration surface availability |
| Service tier | Editions differ in service-level commitment, not in platform quality |
| No feature forks | No edition has a feature that is structurally unavailable to other editions |
| Upgrade path | Customers can upgrade between editions without re-implementation |

### 16.8 Edition Strategy Alignment

Edition strategy aligns with the product principles as follows:

| Principle | Edition Strategy Consequence |
|---|---|
| P-3 (One Platform, Many Organizations) | Editions are configuration of one product, not separate products |
| D-5 (Enterprise Scalability) | Editions scale across the customer spectrum without architectural change |
| Differentiator 6 (Accessible Across Tiers) | Essential edition makes the platform viable at T1 and T2 |
| Differentiator 10 (Transparent Pricing) | Edition pricing is published, not negotiated |

The edition catalogue is reviewed annually. Editions are not added to chase market segments; they are added only when a coherent customer segment emerges that the existing editions do not serve. Editions are not removed casually; removal strands customers and is undertaken only with multi-year transition support for affected customers.

---

## 17. Supported Healthcare Organizations

### 17.1 Purpose of Organization Cataloguing

The platform serves a defined catalogue of healthcare organization types. The catalogue is not a market segmentation; it is an operational input to configuration. A supported organization type has validated configuration templates, validated workflow defaults, and validated module composition. An organization type that is not in the catalogue is not yet supported; engagement with such an organization is treated as a candidate for catalogue expansion, not as a customer engagement.

### 17.2 Supported Organization Types

The platform supports the following organization types. The catalogue is reviewed annually and amended through the Product Council when new organization types achieve validated-practice status (Principle P-8).

| Code | Organization Type | Description | Typical Tiers |
|---|---|---|---|
| O1 | Solo practice | Single-practitioner clinic, typically single specialty | T1 |
| O2 | Group practice | Multi-practitioner single-specialty practice | T2, T3 |
| O3 | Multi-specialty practice | Multi-practitioner multi-specialty practice | T3, T4 |
| O4 | Primary care network | Network of primary care clinics under shared ownership | T4, T5 |
| O5 | Specialty clinic | Single-specialty outpatient clinic (e.g., cardiology, dermatology) | T2, T3, T4 |
| O6 | Day surgery centre | Outpatient surgical facility | T4, T5 |
| O7 | Diagnostic centre | Imaging, laboratory, or combined diagnostic facility | T3, T4 |
| O8 | Pharmacy chain | Multi-location pharmacy operation | T3, T4, T5 |
| O9 | Single hospital | Standalone hospital, typically with emergency, inpatient, outpatient | T5 |
| O10 | Hospital network | Multi-hospital network, regional or national | T6 |
| O11 | Academic medical centre | Hospital with teaching and research affiliation | T5, T6 |
| O12 | Public health clinic | Government-operated public health clinic | T3, T4, T5 |
| O13 | Occupational health clinic | Employer-operated occupational health facility | T2, T3 |
| O14 | Long-term care facility | Nursing home, assisted living, residential care | T4, T5 |
| O15 | Home health provider | Organization delivering care in patients' homes | T3, T4 |
| O16 | Telehealth provider | Organization delivering care primarily via telehealth | T2, T3, T4 |
| O17 | Government health authority | Regional or national health authority operating multiple facilities | T6 |
| O18 | NGO healthcare provider | Non-governmental organization operating healthcare facilities | T3, T4, T5 |

### 17.3 Organization Configuration Profiles

Each supported organization type has a configuration profile that defines the default module set, default workflows, default roles, and default permissions. Configuration profiles are not prescriptions; they are starting points that customers refine through the configuration surface.

Configuration profiles are versioned and validated. A profile is upgraded when the platform's module set or configuration surface evolves, and the upgrade is tested against operational reality before becoming the default. Customers are notified of profile upgrades through the platform's change-management channel and may adopt upgrades on their own schedule within documented windows.

### 17.4 Organization Type Expansion

New organization types are added to the catalogue through the following intake process:

1. **Workflow analysis** — operational analysis of the candidate organization type's daily work, with documented workflows and configuration requirements.
2. **Configuration coverage assessment** — verification that the platform's existing configuration surface can express the organization type's operational reality without source-level modification.
3. **Module gap assessment** — identification of any modules that would need to be added or extended to support the organization type, with each gap justified against the Core Principles.
4. **Validation** — pilot deployment with a candidate customer, with operational feedback collected and incorporated.
5. **Catalogue amendment** — formal addition to the catalogue through Product Council ratification, with the configuration profile published as a default.

The intake process is deliberately demanding. Catalogue expansion that bypasses the process produces an organization type that is nominally supported but operationally defective — a posture that violates Principle P-8 (Verified Practice Over Hypothetical Capability).

### 17.5 Unsupported Organization Types

The platform does not support the following organization types, either because they fall outside the platform's scope (Section 12) or because they have not yet completed the catalogue expansion process:

- Insurance payers (out of scope — Section 12.2)
- Pharmaceutical manufacturers (out of scope — Section 12.2)
- Medical device manufacturers (out of scope — Section 12.2)
- Consumer health applications (out of scope — Section 12.2)
- Research institutions (out of scope — Section 12.2)
- Veterinary practices (not yet catalogued; potential future expansion)
- Dental practices (not yet catalogued; potential future expansion)
- Mental health institutions with involuntary commitment authority (not yet catalogued; requires regulatory framework adaptation)

Organizations that fall into unsupported categories are referred to alternative vendors whose posture is better matched. Organizations in not-yet-catalogued categories may be engaged as candidate customers for catalogue expansion, with explicit acknowledgment that the platform is not yet production-ready for their organization type.

---

## 18. Supported Clinic Types

### 18.1 Purpose of Clinic Type Cataloguing

Clinic types are the operational expression of healthcare delivery within an organization. A single organization may operate multiple clinic types — for example, a hospital network may operate primary care clinics, specialty clinics, and emergency departments. Clinic type governs workflow defaults, encounter templates, documentation requirements, and configuration overlays. The clinic type catalogue is more granular than the organization type catalogue because clinic types reflect operational reality rather than organizational structure.

### 18.2 Supported Clinic Types

The platform supports the following clinic types. The catalogue is reviewed annually and expanded as configuration coverage is validated for additional clinic types.

| Code | Clinic Type | Typical Specialty | Typical Organization Types |
|---|---|---|---|
| C1 | General practice | Primary care | O1, O2, O4, O12 |
| C2 | Family medicine | Primary care | O1, O2, O4, O12 |
| C3 | Internal medicine | Primary care | O2, O3, O4 |
| C4 | Paediatrics | Specialty | O2, O3, O5 |
| C5 | Obstetrics and gynaecology | Specialty | O2, O3, O5 |
| C6 | Cardiology | Specialty | O3, O5 |
| C7 | Dermatology | Specialty | O3, O5 |
| C8 | Endocrinology | Specialty | O3, O5 |
| C9 | Gastroenterology | Specialty | O3, O5 |
| C10 | Neurology | Specialty | O3, O5 |
| C11 | Oncology | Specialty | O3, O5, O11 |
| C12 | Ophthalmology | Specialty | O3, O5 |
| C13 | Orthopaedics | Specialty | O3, O5, O6 |
| C14 | Otolaryngology | Specialty | O3, O5 |
| C15 | Psychiatry | Specialty | O3, O5 |
| C16 | Pulmonology | Specialty | O3, O5 |
| C17 | Urology | Specialty | O3, O5 |
| C18 | Emergency department | Emergency | O9, O10, O11 |
| C19 | Urgent care clinic | Emergency | O4, O13 |
| C20 | Day surgery | Surgical | O6 |
| C21 | Inpatient ward | Inpatient | O9, O10, O11 |
| C22 | Intensive care unit | Critical care | O9, O10, O11 |
| C23 | Pharmacy | Pharmacy | O1, O2, O8 |
| C24 | Laboratory | Diagnostic | O7, O9, O10 |
| C25 | Imaging centre | Diagnostic | O7, O9, O10 |
| C26 | Physical therapy | Rehabilitation | O3, O5 |
| C27 | Occupational therapy | Rehabilitation | O3, O5, O13 |
| C28 | Mental health clinic | Behavioral health | O3, O5 |
| C29 | Substance use treatment clinic | Behavioral health | O3, O14 |
| C30 | Long-term care facility | Long-term care | O14 |

### 18.3 Clinic Type Configuration Overlays

Each clinic type has a configuration overlay that adjusts the platform's default configuration to match the clinic type's operational reality. Overlays cover encounter templates, documentation structure, order sets, role definitions, permission defaults, and reporting views. Overlays are layered on top of the organization's configuration profile, with overlay precedence documented in `CONFIGURATION_ARCHITECTURE.md`.

Overlays are validated through workflow analysis with real practitioners of the clinic type. An overlay that has not been validated is a candidate, not a default. Validation includes practitioner feedback on workflow fidelity, configuration coverage assessment for the clinic type's daily activities, and operational testing against representative patient scenarios.

### 18.4 Specialty-Specific Module Extensions

Some clinic types require specialty-specific module extensions beyond the platform's core modules. These extensions are first-class modules in their own right, with their own contracts, their own configuration surfaces, and their own documentation. Specialty-specific modules are not bolt-on customizations; they are part of the platform's module catalogue.

The current specialty-specific module extensions are listed in Section 19. New specialty-specific modules are added through the same intake process as new organization types (Section 17.4), with the additional requirement that the module's bounded context be explicitly defined and aligned with the platform's domain-driven architecture.

### 18.5 Clinic Type Expansion

The clinic type catalogue is expanded through the intake process defined in Section 17.4, with the additional step that the candidate clinic type's configuration overlay be validated against at least three operational deployments before becoming a default. The three-deployment requirement is a deliberate rigour; it prevents the catalogue from accumulating overlays that have been validated only against a single customer's operational reality.

Clinic types that are candidates for catalogue expansion but have not yet completed validation are listed in the regional adaptation roadmap (Section 31) with the validation status documented.

---

## 19. Product Modules Overview

### 19.1 Purpose of Module Cataloguing

The module catalogue defines the platform's capability surface at the module level. Modules are the unit of composition, the unit of enablement, and the unit of dependency management. The catalogue is the canonical reference for what modules exist, what each module does, and how modules relate to each other. Module internals — contracts, dependencies, lifecycle, versioning — are defined in `MODULE_ARCHITECTURE.md`.

### 19.2 Module Catalogue

The platform's module catalogue comprises 19 modules organized into five categories matching the in-scope capability categories defined in Section 11.2.

| Code | Module | Category | Purpose |
|---|---|---|---|
| M01 | Patient | Clinical | Patient registration, identity, demographics, consent, medical record lifecycle |
| M02 | Encounter | Clinical | Encounter management across outpatient, inpatient, emergency, telehealth |
| M03 | Clinical Documentation | Clinical | Clinical notes, structured documentation, templates, assessments |
| M04 | Orders & Results | Clinical | Order entry, result management, decision support, result reporting |
| M05 | Pharmacy | Clinical | Medication management, dispensing, inventory, clinical pharmacy |
| M06 | Scheduling | Operational | Appointment scheduling, resource scheduling, queue management |
| M07 | Documents | Operational | Document management, document templates, document workflow |
| M08 | Notifications | Operational | Notifications, reminders, alerts across channels |
| M09 | Billing | Financial | Billing, claims, payments, insurance submission |
| M10 | Accounting | Financial | General ledger, accounts payable, accounts receivable, financial reporting |
| M11 | CRM | Administrative | Patient relationships, outreach, marketing, communications |
| M12 | HR | Administrative | Human resources, payroll, employee records, benefits |
| M13 | Workforce | Administrative | Workforce scheduling, time and attendance, credentials |
| M14 | Identity & Access | Platform | Authentication, authorization, identity, session management |
| M15 | Configuration | Platform | Configuration management, validation, versioning, audit |
| M16 | Audit | Platform | Audit trail, audit query, audit reporting |
| M17 | Integration | Platform | Integration framework, connectors, partner surfaces |
| M18 | Reporting | Platform | Operational, analytical, regulatory reporting |
| M19 | Localization | Platform | Language, calendar, regulatory framework, clinical coding system adaptation |

### 19.3 Module Composition Rules

Module composition is governed by the following rules:

| Rule | Description |
|---|---|
| Bounded context alignment | Each module aligns with one or more bounded contexts defined in `SYSTEM_ARCHITECTURE.md` |
| Explicit dependencies | Module dependencies are explicit, documented, and acyclic |
| Contract-based communication | Modules communicate through contracts — commands, queries, events, configuration schemas — never through direct data access |
| Independent enablement | Modules can be enabled or disabled per tenant, subject to dependency constraints |
| Edition packaging | Modules are packaged into editions per Section 16; edition packaging does not modify module internals |
| Versioned evolution | Module contracts are versioned; breaking changes follow the platform's deprecation policy |

### 19.4 Module Dependencies

Module dependencies follow the bounded context dependencies defined in `SYSTEM_ARCHITECTURE.md`. The dependency graph is acyclic; circular dependencies are forbidden and treated as architectural defects. The full dependency graph is documented in `MODULE_ARCHITECTURE.md`; the high-level dependency direction is:

- Platform modules (M14–M19) depend on each other in defined ways but not on category-specific modules.
- Administrative modules (M11–M13) depend on Platform modules and on Patient (M01).
- Financial modules (M09–M10) depend on Platform modules and on Patient (M01) and Encounter (M02).
- Operational modules (M06–M08) depend on Platform modules and on Patient (M01) and Encounter (M02).
- Clinical modules (M01–M05) depend on Platform modules; Clinical modules may depend on each other in defined ways (e.g., Pharmacy depends on Orders & Results for medication orders).

### 19.5 Module Lifecycle

Each module has a lifecycle that governs its evolution:

| Stage | Code | Description |
|---|---|---|
| Candidate | LC1 | Module under design; not available to customers |
| Pilot | LC2 | Module deployed to pilot customers for validation |
| General Availability | LC3 | Module available to all customers per edition packaging |
| Mature | LC4 | Module in steady-state; long-term support commitment |
| Deprecation Candidate | LC5 | Module considered for deprecation; transition planning underway |
| Deprecated | LC6 | Module deprecated; new customers cannot enable; existing customers supported through transition window |
| Retired | LC7 | Module removed from the platform; transition window closed |

Module lifecycle transitions are ratified by the Product Council. Transitions are recorded in the module's documentation and in the platform's CHANGELOG. The transition from General Availability to Mature is automatic after a defined period of stable operation; other transitions are explicit.

### 19.6 Module Documentation

Each module has dedicated documentation under `docs/11_MODULES/`. Module documentation includes:

- Module purpose and scope
- Bounded context alignment
- Contracts (commands, queries, events, configuration schemas)
- Dependencies on other modules
- Configuration surface
- Role and permission implications
- Integration surface
- Audit surface
- Reporting surface
- Known limitations
- Lifecycle status

Module documentation is part of the definition of done for a module (Principle P-7). A module without complete documentation is not at General Availability, regardless of its operational status.

---

## 20. User Roles Overview

### 20.1 Purpose of Role Cataloguing

The role catalogue defines the human and system roles the platform recognizes. Roles are the unit of permission assignment, the unit of workflow responsibility, and the unit of training pathway. The catalogue is the canonical reference for what roles exist, what each role does, and how roles relate to permissions. Role internals — permission granularity, role composition, role lifecycle — are defined in `MODULE_ARCHITECTURE.md` and the security documentation.

### 20.2 Role Catalogue

The platform's role catalogue comprises 14 roles organized into four categories: clinical, operational, administrative, and platform.

| Code | Role | Category | Typical Responsibilities |
|---|---|---|---|
| R01 | Physician | Clinical | Clinical assessment, diagnosis, treatment, orders, documentation |
| R02 | Nurse | Clinical | Nursing assessment, care delivery, medication administration, documentation |
| R03 | Pharmacist | Clinical | Medication review, dispensing, clinical pharmacy, medication safety |
| R04 | Technician | Clinical | Laboratory, imaging, procedure technical work; result production |
| R05 | Allied health professional | Clinical | Physical therapy, occupational therapy, dietetics, mental health |
| R06 | Receptionist | Operational | Patient registration, scheduling, check-in, check-out |
| R07 | Scheduler | Operational | Appointment management, resource scheduling, queue management |
| R08 | Biller | Operational | Billing, claim submission, payment posting, denial management |
| R09 | Administrator | Operational | Facility administration, configuration oversight, operational reporting |
| R10 | Compliance officer | Administrative | Audit review, regulatory compliance, privacy oversight |
| R11 | HR manager | Administrative | Human resources management, payroll oversight, employee records |
| R12 | Executive | Administrative | Strategic oversight, financial oversight, governance |
| R13 | System administrator | Platform | Tenant configuration, integration management, operational administration |
| R14 | Integration account | Platform | System-to-system integration; non-human principal |

### 20.3 Role Composition

Roles are composable. A user may hold multiple roles simultaneously, with permissions accumulating per defined rules. Role composition is governed by the platform's permission philosophy (Section 21) and is implemented through the Identity & Access module (M14).

Role composition is not unlimited. Certain role combinations are prohibited where they create segregation-of-duty conflicts — for example, a single user may not simultaneously hold the Biller role and the Compliance officer role for the same financial scope. Prohibited combinations are documented in the security documentation and enforced by the permission framework.

### 20.4 Role Lifecycle

Roles have a lifecycle similar to module lifecycle:

| Stage | Code | Description |
|---|---|---|
| Defined | RC1 | Role defined in the catalogue; permissions specified |
| Active | RC2 | Role available for assignment to users |
| Restricted | RC3 | Role available only with explicit authorization (e.g., for segregated duties) |
| Deprecated | RC4 | Role no longer recommended for new assignment; existing assignments supported |
| Retired | RC5 | Role removed from the catalogue; existing assignments transitioned to alternative roles |

Role lifecycle transitions are ratified by the Product Council and documented in the role's documentation.

### 20.5 Custom Roles

The platform's configuration surface allows customers to define custom roles within the configuration framework. Custom roles are compositions of existing permissions, not new permissions. A custom role that requires a permission not in the platform's permission catalogue is not possible without platform extension; such extension is treated as a candidate for platform evolution, not as a customer-specific customization.

Custom roles are tenant-scoped. A custom role defined by one customer is not available to other customers. Custom roles are subject to the same lifecycle governance as platform-defined roles, with the customer's system administrator responsible for role lifecycle within the tenant.

### 20.6 Role-Based Training

Each role has an associated training pathway, documented in the platform's training material. Training pathways are role-specific, not generic; a physician's training covers clinical documentation, order entry, and encounter management, while a receptionist's training covers patient registration, scheduling, and check-in workflows.

Training pathways are versioned alongside the platform. Role training material is updated when the platform's behaviour for that role evolves, and the update is communicated to customers through the platform's change-management channel.

---

## 21. Permission Philosophy

### 21.1 Purpose of Permission Philosophy

The permission philosophy defines how the platform governs what users can do. Permissions are not a feature; they are a primitive that governs every action of consequence. The philosophy is the basis for the permission framework implemented in the Identity & Access module (M14) and is the operational expression of Design Principle D-10 (Observable, Auditable, Accountable).

### 21.2 Permission Granularity

Permissions are defined at the action level — read, write, execute, administer — on resources — patients, encounters, orders, results, configurations, audits. Permissions are not defined at the page level or the feature level, because page-level and feature-level permissions are too coarse for healthcare operations and too unstable across UI evolution.

Action-level permissions on resources produce a permission matrix that is large but stable. The matrix is large because every (action, resource) pair is a permission; it is stable because actions and resources evolve slowly, even as the platform's surface evolves quickly.

### 21.3 Permission Assignment

Permissions are assigned through roles, not directly to users. Direct user-permission assignment is forbidden; it bypasses the role framework and produces unmanageable permission sprawl. Role-based assignment is the only supported mechanism.

Role-permission assignment is governed by the platform's role definitions (Section 20) and may be refined by customer configuration within the framework. Customer-defined custom roles (Section 20.5) compose existing permissions; they do not create new permissions.

### 21.4 Permission Scope

Permissions are scoped, not global. A user may have read permission on patient records within their facility without having read permission on patient records in another facility. Scoping is by organizational unit, by facility, by care team, by patient cohort, and by other dimensions defined in the platform's permission framework.

Scoping is critical for healthcare operations. A clinician seeing patients in clinic A does not automatically have access to patients in clinic B, even within the same organization. The permission framework enforces scoping at the action level, not at the page level; a clinician without read permission on a patient cannot access that patient's record through any surface, including search, list, or direct navigation.

### 21.5 Permission Inheritance

Permissions inherit through the organizational hierarchy defined in `SYSTEM_ARCHITECTURE.md`. A permission granted at the organization level applies to all facilities within the organization unless overridden. A permission granted at the facility level applies to all departments within the facility unless overridden. Inheritance is explicit, documented, and auditable.

Inheritance is not automatic. A role assigned at the organization level does not automatically propagate to lower levels; the role must be explicitly scoped to apply at lower levels. This prevents accidental over-permissioning through inheritance misconfiguration.

### 21.6 Permission Override and Emergency Access

The platform supports permission overrides for emergency situations — break-glass access to patient records when the user does not have routine permission. Emergency access is:

- Explicit — the user takes a deliberate action to invoke emergency access
- Audited — every emergency access is recorded with user, time, resource, and justification
- Time-bounded — emergency access expires automatically
- Reviewed — emergency access events are reviewed by compliance officers

Emergency access is not a routine workflow; it is a controlled exception. Frequent use of emergency access indicates a permission configuration defect and is investigated by the customer's compliance team.

### 21.7 Permission Audit

Every permission check is recorded in the audit trail. The audit record includes the user, the action, the resource, the permission decision, and the scope context. Permission audit records are the basis for compliance reporting, for incident investigation, and for permission configuration review.

Permission audit records are immutable. They cannot be modified or deleted, even by system administrators. The immutability is a platform-level guarantee, not a configuration choice, and is a direct consequence of Design Principle D-10.

### 21.8 Permission Philosophy Alignment

The permission philosophy aligns with the product principles as follows:

| Principle | Permission Philosophy Consequence |
|---|---|
| P-1 (Healthcare First) | Permissions are action-level on resources, enabling healthcare-grade access control |
| P-5 (Practitioner Experience) | Emergency access allows clinical work to continue in urgent situations without permanent over-permissioning |
| D-10 (Observable, Auditable, Accountable) | Every permission check is audited; audit records are immutable |
| Belief Four (Patient as Ultimate Stakeholder) | Patient data access is governed by scoped permissions, not by broad role grants |

---

## 22. Configuration-Driven Philosophy

### 22.1 Purpose of Configuration Philosophy

The configuration philosophy defines how the platform adapts to customer needs through configuration. Configuration is the platform's primary adaptation mechanism (Principle P-2) and is a first-class product surface (Design Principle D-2). The philosophy is the basis for the configuration framework implemented in the Configuration module (M15) and defined in detail in `CONFIGURATION_ARCHITECTURE.md`.

### 22.2 Configuration Surface

The configuration surface is the complete set of configurable behaviours exposed by the platform. The surface is large — every behaviour of consequence is, in principle, configurable — and is organized by module, by capability, and by scope. The surface is documented as a contract, not as an internal artefact; customers and integrators can rely on the documented surface.

The configuration surface is not unlimited. Behaviours that would require source-level modification to express are not part of the configuration surface; they are either out of scope or candidates for platform evolution. The boundary between configuration and source is explicit and is governed by the platform's extensibility strategy defined in `SYSTEM_ARCHITECTURE.md`.

### 22.3 Configuration Layers

Configuration is layered, with explicit precedence. The layers are defined in `CONFIGURATION_ARCHITECTURE.md` and summarized here:

| Layer | Code | Scope | Typical Owner |
|---|---|---|---|
| Platform default | L1 | All customers, all tenants | Ibn Hayan product team |
| Edition | L2 | All customers on an edition | Ibn Hayan product team |
| Tenant | L3 | A single customer's tenant | Customer system administrator |
| Facility | L4 | A facility within a customer | Customer facility administrator |
| Department | L5 | A department within a facility | Customer department administrator |
| Care team | L6 | A care team within a department | Customer care team lead |
| User | L7 | A single user | The user or their delegate |
| Session | L8 | A single session | The user, transient |

Precedence is from L1 (lowest) to L8 (highest). A configuration at a higher layer overrides a configuration at a lower layer. Overrides are validated, versioned, and auditable. Not all configuration keys are overridable at all layers; some keys are fixed at lower layers for safety or regulatory reasons.

### 22.4 Configuration Validation

Every configuration change is validated before it is applied. Validation covers five rule categories:

| Rule Category | Description |
|---|---|
| Structural | Configuration conforms to the schema (types, required fields, formats) |
| Referential | Configuration references resolve (e.g., a referenced module exists, a referenced role is defined) |
| Semantic | Configuration is internally consistent (e.g., a workflow's steps form a valid graph) |
| Contextual | Configuration is consistent with its scope (e.g., a facility-level configuration does not contradict a tenant-level invariant) |
| Regulatory | Configuration is consistent with the regulatory framework in force for the tenant's region |

A configuration that fails validation is not applied. The validation failure is reported to the configurator with diagnostic information. Validation failures are auditable.

### 22.5 Configuration Versioning

Every configuration change is versioned. The version history is immutable and is the basis for configuration audit, rollback, and change review. Configuration changes can be rolled back to any prior version, with the rollback itself versioned and auditable.

Configuration versioning is the configuration-surface equivalent of source-code versioning. It enables controlled evolution, controlled experimentation, and controlled recovery. A customer that applies a configuration change that produces undesired behaviour can roll back without engineering intervention, in keeping with Principle P-2 (Configuration Before Customization).

### 22.6 Configuration Audit

Every configuration change is recorded in the audit trail, including the configurator, the time, the scope, the previous value, the new value, and the validation result. Configuration audit records are immutable and are the basis for compliance reporting and for incident investigation.

Configuration audit is distinct from operational audit (Section 27). Operational audit records what users did; configuration audit records how the platform was configured to behave. Both are required for accountability, and both are governed by Design Principle D-10.

### 22.7 Configuration Governance

Configuration governance is the practice of managing configuration change over time. Governance includes:

- Configuration change approval workflows, with approval required for changes above defined risk thresholds
- Configuration change review by compliance officers for changes that affect regulatory alignment
- Configuration change testing in sandbox tenants before application to production tenants
- Configuration change communication to affected users before application

Governance is customer-scoped. Each customer defines their configuration governance within the platform's framework, with the platform providing the tooling and the audit trail. The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised.

### 22.8 Configuration Philosophy Alignment

The configuration philosophy aligns with the product principles as follows:

| Principle | Configuration Philosophy Consequence |
|---|---|
| P-2 (Configuration Before Customization) | Configuration is the primary adaptation mechanism; customization is excluded |
| P-3 (One Platform, Many Organizations) | Configuration layers enable customer-specific behaviour without forking |
| P-7 (Documented Before Shipped) | Configuration surface is documented as a contract |
| D-2 (Configuration Before Customization) | Layered configuration, validation, versioning, audit |
| D-10 (Observable, Auditable, Accountable) | Configuration changes are audited and immutable |

---

## 23. Multi-Tenant Philosophy

### 23.1 Purpose of Multi-Tenant Philosophy

The multi-tenant philosophy defines how the platform serves multiple customers from a single shared runtime. Multi-tenancy is the architectural expression of Principle P-3 (One Platform, Many Organizations) and is the default delivery model (Section 15.2). The philosophy is the basis for the multi-tenant architecture defined in `SYSTEM_ARCHITECTURE.md`.

### 23.2 Tenant Isolation

Tenant isolation is the practice of ensuring that one customer's data, configuration, and operational state are not accessible to another customer. Isolation is achieved through logical separation by default, with dedicated compute and physical isolation available as deployment choices (Section 15.3). Isolation is enforced at every layer of the platform — at the data layer, at the application layer, at the configuration layer, and at the audit layer.

Tenant isolation is not a feature; it is a primitive. Every module's contract enforces tenant isolation. Every query, every command, every event is tenant-scoped. A module that does not enforce tenant isolation is defective and is not shipped.

### 23.3 Tenant Lifecycle

Tenants have a lifecycle that governs their creation, operation, and decommissioning:

| Stage | Code | Description |
|---|---|---|
| Provisioned | TL1 | Tenant created; default configuration applied |
| Onboarding | TL2 | Customer-specific configuration applied; first encounter targeted |
| Active | TL3 | Tenant in steady-state operation |
| Expansion | TL4 | Tenant expanding scope — additional facilities, modules, specialties |
| Suspension | TL5 | Tenant suspended (e.g., for non-payment or security incident); data preserved |
| Offboarding | TL6 | Tenant being decommissioned; data export executed |
| Decommissioned | TL7 | Tenant removed; data retention period observed |

Tenant lifecycle transitions are governed by documented processes. The transition from Active to Suspension is reversible; the transition to Offboarding is reversible within a defined window; the transition to Decommissioned is terminal.

### 23.4 Tenant Configuration Inheritance

Tenant configuration inherits from the platform default and from the edition, with tenant-level configuration overriding as defined in Section 22.3. Tenants within a customer may inherit from a customer-level baseline, enabling a customer to define common configuration once and apply it across multiple tenants.

Inheritance is explicit and documented. A customer's multi-tenant configuration is auditable end-to-end; the audit trail shows which configuration was applied at which layer for any given tenant at any given time.

### 23.5 Tenant Data Residency

Tenant data residency is governed by the customer's contract and by the regulatory framework in force for the tenant's region. The platform supports regional data residency — a tenant's data is stored in the region specified by the customer's contract, and is not moved across regions without explicit authorization.

Data residency is enforced at the storage layer. A tenant's data is partitioned by region, and access to data is governed by the tenant's region. Cross-region data access is permitted only for documented operational reasons (e.g., disaster recovery) and is auditable.

### 23.6 Tenant Operational Isolation

Tenant operational isolation ensures that one tenant's operational behaviour does not affect another tenant. A tenant that generates high load does not degrade service for other tenants; a tenant that experiences an operational incident does not cause incidents for other tenants. Operational isolation is achieved through resource partitioning, rate limiting, and graceful degradation under load.

Operational isolation is not absolute. The platform shares infrastructure across tenants, and shared infrastructure has finite capacity. The platform's scalability strategy (defined in `SYSTEM_ARCHITECTURE.md`) is designed to maintain operational isolation under normal and peak load, with documented degradation behaviour under extreme load.

### 23.7 Multi-Tenant Philosophy Alignment

The multi-tenant philosophy aligns with the product principles as follows:

| Principle | Multi-Tenant Philosophy Consequence |
|---|---|
| P-3 (One Platform, Many Organizations) | Multi-tenancy is the default; one code base serves all customers |
| P-4 (Open Data, Open Standards) | Tenant data is portable; residency is contractual |
| D-3 (One Platform, Many Organizations) | Tenant isolation is a primitive, not a feature |
| D-5 (Enterprise Scalability) | Operational isolation maintains service quality under load |
| D-10 (Observable, Auditable, Accountable) | Tenant lifecycle and configuration are auditable end-to-end |

---

## 24. Scalability Strategy

### 24.1 Purpose of Scalability Strategy

The scalability strategy defines how the platform grows to accommodate increasing customers, increasing users, increasing data volume, and increasing geographic distribution. Scalability is the operational expression of Design Principle D-5 (Enterprise Scalability) and is a product-level commitment, not an engineering afterthought. The strategy is the basis for the scalability architecture defined in `SYSTEM_ARCHITECTURE.md`.

### 24.2 Scalability Dimensions

The platform scales along five dimensions, each with its own strategy:

| Dimension | Description | Scaling Strategy |
|---|---|---|
| Tenant count | Number of customers served | Horizontal scaling of stateless components; partitioning of stateful components by tenant |
| User count | Number of concurrent users per tenant | Horizontal scaling of stateless components; rate limiting per tenant; graceful degradation |
| Data volume | Volume of data per tenant | Partitioning by tenant and by bounded context; archival of cold data; tiered storage |
| Transaction rate | Rate of transactions per tenant | Horizontal scaling of transaction processing; queueing for non-critical transactions; prioritization of clinical transactions |
| Geographic distribution | Number of regions served | Regional deployment with data residency; cross-region replication for disaster recovery |

The five dimensions are independent but interrelated. Scaling decisions are made per dimension, with the interdependencies considered. A scaling decision that optimizes one dimension at the cost of another is recorded with the trade-off explicit.

### 24.3 Scalability Posture

The platform's scalability posture is stated as the following commitments:

| Commitment | Description |
|---|---|
| Linear scaling within a tenant | Adding users to a tenant produces proportional load without architectural change |
| Sub-linear scaling across tenants | Adding tenants produces sub-proportional infrastructure cost due to shared platform services |
| No architectural change across customer spectrum | A solo practitioner and a hospital network run on the same architecture |
| Graceful degradation under extreme load | The platform degrades gracefully, preserving clinical safety over convenience |
| Regional scaling without forking | The platform scales to new regions through deployment, not through code branching |

### 24.4 Scalability and the Decade Horizon

Scalability decisions are made on the decade horizon. A scaling strategy that optimizes for the current quarter at the cost of decade-horizon scalability is rejected. Specifically:

- The platform does not adopt scaling strategies that require architectural rework to absorb 10x growth.
- The platform does not adopt scaling strategies that lock in a specific infrastructure vendor.
- The platform does not adopt scaling strategies that compromise tenant isolation under load.
- The platform does not adopt scaling strategies that compromise audit completeness under load.

### 24.5 Scalability Measurement

Scalability is measured continuously through operational telemetry. The primary scalability metrics are:

| Metric | Description | Target |
|---|---|---|
| Practitioner-felt latency | Latency as experienced by practitioners at the point of care | Sub-second for routine actions; documented targets for complex actions |
| Tenant isolation integrity | Degree to which one tenant's load affects another's performance | Measurable impact below defined threshold |
| Audit completeness under load | Percentage of consequential actions audited, measured under peak load | 100% — no degradation under load |
| Regional parity | Degree to which the platform performs equivalently across regions | Regional performance within defined parity threshold |
| Cost per tenant | Infrastructure cost per tenant, normalized by tenant size | Sub-linear with tenant count growth |

Scalability metrics are reviewed quarterly. Erosion in any metric is treated as a strategic risk and addressed through architectural or operational response.

---

## 25. Localization Strategy

### 25.1 Purpose of Localization Strategy

The localization strategy defines how the platform adapts to regional and linguistic contexts. Localization is not a translation pass; it is a comprehensive regional adaptation that covers language, calendar, date and time formats, number formats, currency, regulatory frameworks, clinical coding systems, payment models, and cultural expectations about clinical workflow. The strategy is the operational expression of Design Principle D-6 (Regional Adaptability) and is the basis for the localization architecture defined in `SYSTEM_ARCHITECTURE.md`.

### 25.2 Localization Dimensions

The platform localizes along the following dimensions:

| Dimension | Description | Adaptation Mechanism |
|---|---|---|
| Language | User-interface language, content language, document language | Translation catalogues; multi-language content per tenant |
| Calendar | Calendar system (Gregorian, Hijri, others as required) | Calendar adapters; configurable default per tenant |
| Date and time | Date format, time format, timezone | Locale-aware formatting; tenant-configured defaults |
| Number and currency | Number format, currency symbol, decimal separator | Locale-aware formatting; tenant-configured defaults |
| Regulatory framework | Regional regulatory requirements (data protection, clinical records, prescribing) | Regulatory framework adapters; per-region compliance packs |
| Clinical coding system | Regional clinical coding (diagnosis, procedure, medication) | Coding system adapters; per-region coding packs |
| Payment model | Regional payment models (insurance, single-payer, out-of-pocket, hybrid) | Payment model adapters; per-region billing packs |
| Cultural workflow | Cultural expectations about clinical workflow (e.g., consent, communication, family involvement) | Configuration overlays per region |

The eight dimensions are independent but interrelated. Localization decisions are made per dimension, with the interdependencies considered. A localization decision that optimizes one dimension at the cost of another is recorded with the trade-off explicit.

### 25.3 Supported Regions

The platform supports a defined set of regions, with each region having a validated localization pack. The region catalogue is reviewed annually and expanded as localization packs achieve validated-practice status.

| Code | Region | Status |
|---|---|---|
| MENA-1 | Iraq | Validated |
| MENA-2 | Saudi Arabia | Validated |
| MENA-3 | United Arab Emirates | Candidate |
| MENA-4 | Jordan | Candidate |
| MENA-5 | Egypt | Candidate |
| GCC-1 | Kuwait | Candidate |
| GCC-2 | Qatar | Candidate |
| GCC-3 | Bahrain | Candidate |
| GCC-4 | Oman | Candidate |
| LEV-1 | Lebanon | Future |
| NA-1 | United States | Future |
| EU-1 | European Union (GDPR) | Future |
| UK-1 | United Kingdom | Future |
| ASIA-1 | India | Future |
| ASIA-2 | Southeast Asia (initial) | Future |

Regions marked Validated have complete localization packs with operational validation. Regions marked Candidate have localization packs in development with pilot deployments. Regions marked Future are on the regional adaptation roadmap (Section 31) but do not yet have active localization packs.

### 25.4 Multi-Region Tenants

A customer operating across multiple regions receives a multi-region tenant configuration. The tenant has a customer-level baseline configuration, with regional overlays applied per facility or per organizational unit. A facility in Baghdad and a facility in Riyadh within the same customer operate with different localization packs but share the customer's baseline configuration.

Multi-region tenancy does not require multiple tenants. The platform's configuration surface allows regional variation within a single tenant, with data residency enforced at the storage layer (Section 23.5). A customer that requires strict data segregation between regions may operate multiple tenants, but this is a customer choice, not a platform requirement.

### 25.5 Localization and Clinical Safety

Localization is a clinical safety concern, not a cosmetic concern. A clinician who reads a medication dosage in the wrong number format, or who records a date in the wrong calendar system, may make a clinical error with patient safety consequences. Localization is therefore subject to the same rigour as clinical safety, with validation including clinical workflow testing by practitioners of the target region.

Localization packs are validated by regional clinical informatics specialists, not by translators. A localization pack that has been validated linguistically but not clinically is not validated. The platform's localization governance requires both linguistic validation and clinical validation before a localization pack achieves Validated status.

### 25.6 Localization Strategy Alignment

The localization strategy aligns with the product principles as follows:

| Principle | Localization Strategy Consequence |
|---|---|
| P-1 (Healthcare First) | Localization is a clinical safety concern; validation includes clinical workflow testing |
| P-3 (One Platform, Many Organizations) | Regional adaptation is configuration, not forking |
| D-6 (Regional Adaptability) | Eight localization dimensions; multi-region tenants |
| Belief Four (Patient as Ultimate Stakeholder) | Patient-facing localization (consent, communication, dignity) is a product commitment |

---

## 26. Accessibility Strategy

### 26.1 Purpose of Accessibility Strategy

The accessibility strategy defines how the platform ensures that practitioners and patients with disabilities can use the platform effectively. Accessibility is not a checkbox compliance activity; it is an operational requirement because practitioners include people with disabilities and patients include people with disabilities. The strategy is the basis for the platform's accessibility commitments and is governed by Principle P-5 (Practitioner Experience Over Procurement Satisfaction) and Belief Four (the patient as ultimate stakeholder).

### 26.2 Accessibility Scope

The platform's accessibility scope covers:

| Scope Area | Description |
|---|---|
| Visual accessibility | Support for screen readers, magnification, high-contrast modes, configurable text size |
| Motor accessibility | Keyboard-only navigation, voice control, configurable input timing |
| Auditory accessibility | Visual alternatives to audio notifications; captioning for video content |
| Cognitive accessibility | Clear language, consistent navigation, configurable complexity |
| Localization interaction | Accessibility in all supported languages, including right-to-left languages |
| Assistive technology compatibility | Compatibility with commonly used assistive technologies |

Accessibility is a platform-level commitment, not a module-level feature. Every module's user-interface surface is required to meet the platform's accessibility standards, and accessibility regression is treated as a defect.

### 26.3 Accessibility Standards

The platform aligns with recognized accessibility standards. Specific standards are referenced in the platform's accessibility documentation rather than in this product document, because standards evolve and the platform's alignment is maintained continuously rather than fixed at a point in time.

The platform's accessibility posture is stated as the following commitments:

| Commitment | Description |
|---|---|
| Continuous alignment | The platform maintains alignment with recognized accessibility standards as they evolve |
| Practitioner-first | Accessibility is designed for practitioner daily use, not for procurement-stage demonstration |
| Localization-aware | Accessibility works in all supported languages, including right-to-left languages |
| Assistive-technology-compatible | The platform works with commonly used assistive technologies |
| Documented limitations | Where accessibility is limited, the limitation is documented with workarounds |

### 26.4 Accessibility and Practitioner Experience

Accessibility is part of practitioner experience, not a separate concern. A platform that is inaccessible to practitioners with disabilities is a platform that fails Principle P-5. Accessibility is therefore designed into workflow, into information architecture, and into interaction patterns, not added as an overlay.

The platform's practitioner-experience metrics (Section 24.5) include accessibility-specific measures, such as time-to-complete for common workflows using assistive technologies. These metrics are reviewed alongside other practitioner-experience metrics, with erosion treated as a defect.

### 26.5 Accessibility Strategy Alignment

The accessibility strategy aligns with the product principles as follows:

| Principle | Accessibility Strategy Consequence |
|---|---|
| P-1 (Healthcare First) | Accessibility is a clinical safety concern; inaccessible software causes clinical errors |
| P-5 (Practitioner Experience) | Accessibility is designed for daily use, not for procurement |
| Belief Four (Patient as Ultimate Stakeholder) | Patient-facing accessibility (consent, communication, dignity) is a product commitment |
| D-6 (Regional Adaptability) | Accessibility works across all supported languages |

---

## 27. Security Philosophy

### 27.1 Purpose of Security Philosophy

The security philosophy defines how the platform protects patient data, customer data, operational integrity, and platform availability. Security is not a feature; it is a primitive that governs every architectural and operational decision. The philosophy is the basis for the platform's security architecture, defined in the security documentation under `docs/03_SECURITY/`, and is governed by Principle P-1 (Healthcare First), Belief Four (the patient as ultimate stakeholder), and Design Principle D-10 (Observable, Auditable, Accountable).

### 27.2 Security Posture

The platform's security posture is stated as the following commitments:

| Commitment | Description |
|---|---|
| Defence in depth | Security is layered; no single layer is relied upon exclusively |
| Zero-trust | No implicit trust based on network location; every request is authenticated and authorized |
| Least privilege | Users and systems receive the minimum permissions required for their function |
| Encryption everywhere | Data is encrypted in transit and at rest; key management is governed |
| Continuous monitoring | Security events are monitored continuously; anomalies are investigated |
| Incident readiness | Incident response is documented, tested, and improved |
| Customer sovereignty | Customers retain control of their data; the platform is custodian, not owner |

### 27.3 Security as Primitive

Security is a primitive, not a feature. Every module's contract enforces security requirements. Every query, every command, every event is authenticated, authorized, and audited. A module that does not enforce security is defective and is not shipped.

Security primitives are implemented at the platform layer, not at the module layer. Modules consume security primitives; they do not implement their own. This ensures consistency across the platform and prevents security gaps from emerging as modules evolve independently.

### 27.4 Security and Audit

Security and audit are tightly coupled. Every security-relevant action is recorded in the audit trail, and every audit record is protected against tampering. The audit trail is itself a security control — it enables incident investigation, compliance demonstration, and accountability.

The relationship between security and audit is governed by Design Principle D-10. Security protects against unauthorized action; audit records what action was taken, by whom, and with what authorization. The two together provide defence in depth against both unauthorized action and undetected action.

### 27.5 Security and Compliance

The platform's security posture is designed to meet the compliance requirements of the regions in which it operates. Compliance is not a separate activity from security; it is a consequence of the platform's security posture. Where a region's compliance requirements exceed the platform's default posture, the platform's configuration surface and deployment choices accommodate the additional requirements without architectural change.

Compliance is documented per region in the platform's compliance documentation. The documentation is updated as regulatory frameworks evolve, with changes communicated to affected customers through the platform's change-management channel.

### 27.6 Security Incident Response

The platform's security incident response is documented, tested, and improved. The response process covers:

- Detection — security events are monitored continuously; anomalies are flagged for investigation
- Triage — flagged events are triaged by severity and impact
- Containment — confirmed incidents are contained to limit impact
- Eradication — the root cause is identified and removed
- Recovery — affected systems are restored to normal operation
- Post-incident review — incidents are reviewed, lessons are recorded, and improvements are applied
- Customer notification — affected customers are notified per contractual and regulatory requirements

Incident response is tested periodically through tabletop exercises and through simulated incidents. Test results are recorded and used to improve the response process.

### 27.7 Security Philosophy Alignment

The security philosophy aligns with the product principles as follows:

| Principle | Security Philosophy Consequence |
|---|---|
| P-1 (Healthcare First) | Security protects patient data and clinical safety |
| P-4 (Open Data, Open Standards) | Customer data is custodied, not owned; data is portable |
| Belief Four (Patient as Ultimate Stakeholder) | Patient data sovereignty is a security commitment |
| D-10 (Observable, Auditable, Accountable) | Every security-relevant action is audited; audit is tamper-proof |

---

## 28. Offline Strategy

### 28.1 Purpose of Offline Strategy

The offline strategy defines how the platform operates when network connectivity is degraded, intermittent, or absent. Offline operation is a clinical safety concern because healthcare work continues regardless of network conditions, and software that fails when offline is software that fails clinicians at critical moments. The strategy is the operational expression of Principle P-1 (Healthcare First) and is the basis for the offline-first architecture defined in `SYSTEM_ARCHITECTURE.md`.

### 28.2 Offline-First Posture

The platform is offline-first. This means that the platform's default behaviour is to operate locally, with synchronization to the central platform occurring when connectivity is available. Offline-first is not a fallback mode; it is the primary mode of operation for client surfaces.

Offline-first has the following product-level consequences:

- Clinical work continues during network outages, with data synchronized when connectivity is restored
- Practitioner experience does not depend on network quality; the platform responds at local speed for routine actions
- Data integrity is maintained through conflict resolution strategies defined in `SYSTEM_ARCHITECTURE.md`
- Audit completeness is maintained; offline actions are audited locally and synchronized with the central audit trail

### 28.3 Offline Scope

Offline operation covers the following capabilities:

| Capability | Offline Behaviour |
|---|---|
| Patient registration | Supported offline; synchronized when connectivity is restored |
| Encounter documentation | Supported offline; synchronized when connectivity is restored |
| Order entry | Supported offline; orders are queued and submitted when connectivity is restored |
| Result viewing | Supported offline for previously synchronized results; new results require connectivity |
| Medication administration | Supported offline; synchronized when connectivity is restored |
| Scheduling | Supported offline; synchronized when connectivity is restored |
| Billing | Supported offline for charge capture; claim submission requires connectivity |
| Configuration | Not supported offline; configuration changes require connectivity to the central platform |
| Reporting | Limited offline support for pre-cached reports; full reporting requires connectivity |

Capabilities marked as supported offline are designed to operate fully offline, with synchronization handling data integrity. Capabilities marked as not supported offline require connectivity because they involve central platform state that cannot be safely cached locally.

### 28.4 Synchronization

Synchronization is the process by which offline data is reconciled with the central platform. Synchronization is governed by the conflict resolution strategies defined in `SYSTEM_ARCHITECTURE.md`:

| Strategy | Description | When Used |
|---|---|---|
| Last-Write-Wins | The most recent write prevails; earlier writes are recorded in audit history | Non-clinical data where recency is the primary concern |
| Field-Level Merge | Conflicts are resolved at the field level; non-conflicting fields are merged | Clinical documentation where multiple practitioners may edit different parts |
| Manual Resolution | Conflicts are flagged for manual resolution by a designated role | High-stakes conflicts where automated resolution is unsafe |

The choice of strategy is governed by the data type, the clinical context, and the regulatory framework. The platform's synchronization framework supports all three strategies, with the strategy selected per data type through configuration.

### 28.5 Offline and Audit

Offline actions are audited locally with the same completeness as online actions. The local audit trail is synchronized with the central audit trail when connectivity is restored, with conflict resolution ensuring audit completeness.

Audit records are immutable, including offline audit records. An offline audit record cannot be modified before synchronization; the local audit store is append-only and tamper-evident. Synchronization preserves audit record integrity, with conflicts resolved in favour of the original record.

### 28.6 Offline Strategy Alignment

The offline strategy aligns with the product principles as follows:

| Principle | Offline Strategy Consequence |
|---|---|
| P-1 (Healthcare First) | Clinical work continues during network outages |
| P-5 (Practitioner Experience) | Platform responds at local speed for routine actions |
| D-5 (Enterprise Scalability) | Offline operation supports facilities with limited connectivity |
| D-10 (Observable, Auditable, Accountable) | Offline actions are audited with the same completeness as online actions |

---

## 29. Integration Philosophy

### 29.1 Purpose of Integration Philosophy

The integration philosophy defines how the platform connects to external systems — laboratory systems, imaging systems, pharmacy systems, insurance systems, government systems, medical devices, and other healthcare software. Integration is not a feature; it is a fundamental capability of an operating system. The philosophy is the basis for the integration architecture defined in `SYSTEM_ARCHITECTURE.md` and the integration documentation under `docs/04_INTEGRATIONS/`.

### 29.2 Integration Principles

The platform's integration approach is governed by the following principles:

| Principle | Description |
|---|---|
| Open standards preferred | The platform prefers open healthcare integration standards over proprietary ones |
| Documented contracts | Every integration surface is documented as a contract; undocumented integration is defective |
| Versioned evolution | Integration contracts are versioned; breaking changes follow the deprecation policy |
| Tenant isolation preserved | Integrations do not compromise tenant isolation; integration credentials are tenant-scoped |
| Audit completeness preserved | Integration actions are audited with the same completeness as direct user actions |
| Configuration-driven | Integrations are configured, not customized; per-tenant integration is configuration |

### 29.3 Integration Patterns

The platform supports four integration patterns, each with its own use case:

| Pattern | Description | Typical Use |
|---|---|---|
| Synchronous request-response | The platform calls an external system and waits for response | Real-time queries (e.g., insurance eligibility check) |
| Asynchronous messaging | The platform exchanges messages with an external system through a queue | High-volume, low-latency-tolerant exchanges (e.g., laboratory orders and results) |
| Event-based | The platform publishes events that external systems consume | Notifications to external systems (e.g., patient registration event) |
| Batch file exchange | The platform exchanges batch files with an external system on a schedule | Regulatory reporting, bulk data exchange |

The choice of pattern is governed by the integration's latency requirements, volume characteristics, and the external system's capabilities. The platform's integration framework supports all four patterns, with the pattern selected per integration through configuration.

### 29.4 Healthcare Integration Standards

The platform supports recognized healthcare integration standards. Specific standards are referenced in the platform's integration documentation rather than in this product document, because standards evolve and the platform's support is maintained continuously. The platform's posture is to support open healthcare integration standards as they emerge and mature, with proprietary integration supported where open standards are not yet viable.

### 29.5 Integration Catalogue

The platform maintains an integration catalogue listing supported integrations, their patterns, their standards, and their lifecycle status. The catalogue is the canonical reference for what integrations are available, what each integration does, and what configuration each integration requires.

Integrations are added through an intake process similar to the module intake process (Section 19.5), with the additional requirement that the integration's contract be validated against the external system's actual behaviour, not against its documented behaviour. Integrations that have not been operationally validated are candidates, not defaults.

### 29.6 Integration Philosophy Alignment

The integration philosophy aligns with the product principles as follows:

| Principle | Integration Philosophy Consequence |
|---|---|
| P-1 (Healthcare First) | Integrations support clinical, operational, and financial work |
| P-2 (Configuration Before Customization) | Integrations are configured, not customized |
| P-4 (Open Data, Open Standards) | Open healthcare standards are preferred |
| D-9 (Composable, Not Monolithic) | Integration is a first-class platform capability |
| D-10 (Observable, Auditable, Accountable) | Integration actions are audited with full completeness |

---

## 30. Future Vision

### 30.1 Purpose of Future Vision

The future vision defines the platform's direction over the decade horizon. It is not a feature roadmap; it is a statement of the trajectory along which the platform evolves. The future vision is the operational expression of Principle P-6 (Durable Over Fashionable) and the decade horizon defined in Section 2.2.

### 30.2 Vision Pillars

The future vision rests on four pillars:

| Pillar | Description |
|---|---|
| Depth expansion | Deepening specialty coverage to cover more specialties with greater fidelity |
| Breadth expansion | Broadening organizational function coverage to cover more of the healthcare enterprise |
| Reach expansion | Extending regional coverage to more regions with deeper localization |
| Intelligence integration | Integrating operational intelligence, including AI-assisted capabilities, in keeping with healthcare-first principles |

The four pillars are pursued simultaneously and in tension with each other, in keeping with the vision's three vectors (Section 2.3). Tension among the pillars is expected and is not avoided; the Product Council adjudicates tensions that cannot be resolved at the team level.

### 30.3 Depth Expansion

Depth expansion extends the platform's specialty coverage. The current clinic type catalogue (Section 18) covers 30 clinic types; the depth expansion roadmap extends coverage to additional specialties and deepens coverage of existing specialties through specialty-specific module extensions.

Depth expansion is governed by Goal G-5 (Module Depth Per Specialty). Progress is measured by the percentage of each specialty's daily workflow that is a first-class capability of the platform, with quarterly progress reviewed against the specialty workflow catalogue.

### 30.4 Breadth Expansion

Breadth expansion extends the platform's coverage of organizational functions. The current module catalogue (Section 19) covers 19 modules across clinical, operational, financial, administrative, and platform categories; the breadth expansion roadmap extends coverage to additional organizational functions, including advanced analytics, population health management, research support (within the operational scope defined in Section 12.2), and patient-facing portals (within the data sovereignty constraints defined in Section 12.4).

Breadth expansion is governed by scope discipline (Section 11.6). New modules are added only when they are justified by reference to the Core Principles and Design Principles, and only when they can be sustained across the decade horizon.

### 30.5 Reach Expansion

Reach expansion extends the platform's regional coverage. The current region catalogue (Section 25.3) covers regions with validated, candidate, or future status; the reach expansion roadmap extends coverage to additional regions with full localization packs.

Reach expansion is governed by Goal G-6 (Regional Adaptation Coverage). Progress is measured by the number of regions where the platform passes regional adaptation readiness, with quarterly progress reviewed against the regional roadmap.

### 30.6 Intelligence Integration

Intelligence integration extends the platform's capability with operational intelligence, including AI-assisted clinical decision support, predictive analytics, and workflow automation. Intelligence integration is governed by Principle P-1 (Healthcare First) — intelligence assists clinicians, it does not replace them — and by Belief Four (the patient as ultimate stakeholder) — patient data is not used to train public models without explicit consent.

Intelligence integration is pursued deliberately, not hastily. The platform's intelligence capabilities are designed to be observable, auditable, and accountable, in keeping with Design Principle D-10. Intelligence that cannot meet these standards is not shipped, regardless of its capability.

### 30.7 Future Vision Discipline

The future vision is a direction, not a commitment. Specific capabilities within the future vision are committed only when they enter the platform's intake process and reach General Availability. The future vision does not constitute a product roadmap; it constitutes a trajectory. Customers and partners should not make decisions based on the future vision as if it were a commitment.

The future vision is reviewed annually. Pillars are added, removed, or revised through the Product Council, with the revision recorded in this document. Pillars that have not progressed materially over multiple annual reviews are examined for continued relevance; pillars that are no longer relevant are removed.

---

## 31. Long-Term Roadmap

### 31.1 Purpose of Long-Term Roadmap

The long-term roadmap translates the future vision into a sequenced plan over a multi-year horizon. It is not a commitment to specific dates; it is a statement of the order in which capabilities will be pursued. The roadmap is the operational expression of the future vision and is reviewed and revised annually through the Product Council.

### 31.2 Roadmap Horizon

The roadmap is stated on a three-year rolling horizon, with the third year being indicative and the first year being committed. Capabilities beyond the three-year horizon are stated in the future vision (Section 30) but not in the roadmap.

| Horizon | Description | Commitment Level |
|---|---|---|
| Year 1 | Capabilities committed for the next 12 months | Committed; tracked quarterly |
| Year 2 | Capabilities planned for the 12–24 month window | Planned; tracked semi-annually |
| Year 3 | Capabilities indicated for the 24–36 month window | Indicative; tracked annually |
| Year 4+ | Capabilities indicated beyond 36 months | Stated in future vision; not in roadmap |

### 31.3 Year 1 Committed Capabilities

The following capabilities are committed for Year 1 of the roadmap. The list is indicative of the platform's priorities and is subject to quarterly revision through the Product Council.

| Capability | Pillar | Quarter |
|---|---|---|
| Completion of validated localization packs for MENA-3, MENA-4, MENA-5 | Reach | Q1–Q2 |
| Specialty module extensions for cardiology, paediatrics, obstetrics | Depth | Q1–Q3 |
| Enhanced offline synchronization for low-connectivity regions | Reach | Q2 |
| Configuration governance enhancements (sandbox-to-production promotion) | Breadth | Q2–Q3 |
| Audit reporting enhancements for regulatory compliance | Breadth | Q3 |
| Patient portal (within data sovereignty constraints) | Breadth | Q3–Q4 |
| Initial operational intelligence for clinical decision support | Intelligence | Q4 |

### 31.4 Year 2 Planned Capabilities

The following capabilities are planned for Year 2. The list is indicative and subject to semi-annual revision.

| Capability | Pillar | Indicative Window |
|---|---|---|
| Localization packs for GCC-1 through GCC-4 | Reach | Year 2, H1 |
| Specialty module extensions for oncology, orthopaedics, neurology | Depth | Year 2 |
| Advanced analytics module | Breadth | Year 2, H2 |
| Enhanced integration catalogue (additional laboratory and imaging standards) | Breadth | Year 2 |
| Predictive analytics for operational optimization | Intelligence | Year 2, H2 |

### 31.5 Year 3 Indicative Capabilities

The following capabilities are indicated for Year 3. The list is indicative and subject to annual revision.

| Capability | Pillar |
|---|---|
| Localization packs for LEV-1, NA-1, EU-1, UK-1 | Reach |
| Population health management module | Breadth |
| AI-assisted clinical documentation (with practitioner oversight) | Intelligence |
| Enhanced patient portal capabilities | Breadth |
| Research support module (within operational scope) | Breadth |

### 31.6 Roadmap Governance

The roadmap is governed by the Product Council. Quarterly reviews track Year 1 progress; semi-annual reviews update Year 2 plans; annual reviews revise the entire roadmap. Revisions are recorded in this document through amendment, with the reasoning explicit.

The roadmap is not a sales commitment. Customer-facing commitments are made only for capabilities that are at General Availability, not for capabilities in the roadmap. Sales commitments that bypass this governance are excluded by Section 12.5.

### 31.7 Roadmap and the Decade Horizon

The roadmap is the operational mechanism by which the platform pursues the decade horizon. Each year's roadmap moves the platform along the four vision pillars, with progress measured against the Product Goals (Section 7). The roadmap is the bridge between the decade-horizon vision and the quarter-by-quarter work of the product team.

---

## 32. Success Metrics

### 32.1 Purpose of Success Metrics

Success metrics define how the platform's progress is measured. Metrics are the operational expression of the Product Goals (Section 7) and are the basis for quarterly and annual reviews. Metrics are not vanity measures; they are decision-relevant indicators that the Product Council uses to assess whether the platform is moving toward the decade horizon.

### 32.2 Metric Categories

The platform's success metrics are organized into four categories:

| Category | Description | Review Cadence |
|---|---|---|
| Practitioner experience | Metrics measuring practitioner-felt outcomes | Quarterly |
| Customer health | Metrics measuring customer retention, expansion, and operational health | Quarterly |
| Platform health | Metrics measuring platform availability, performance, and integrity | Continuous + quarterly |
| Strategic progress | Metrics measuring progress against the future vision pillars | Annually |

### 32.3 Practitioner Experience Metrics

| Metric | Description | Target |
|---|---|---|
| Practitioner-felt latency | Median latency for routine practitioner actions | Sub-second |
| Practitioner time reclaimed | Practitioner minutes per shift saved through platform use versus baseline | Cumulative annual improvement |
| Workflow depth | Percentage of supported specialty daily workflow that is first-class platform capability | Annual increase per specialty |
| Practitioner satisfaction | Practitioner-reported satisfaction, measured through periodic surveys | Annual increase |
| Accessibility completeness | Percentage of practitioner workflows that meet accessibility standards | 100% |

### 32.4 Customer Health Metrics

| Metric | Description | Target |
|---|---|---|
| Net Revenue Retention | Revenue retained from existing customers, including expansion and churn | Above 110% |
| Customer lifetime | Median years a customer remains on the platform | 7+ years |
| Onboarding time | Median time from subscription to first clinical encounter, segmented by tier | Tier-specific targets |
| Customer configuration coverage | Percentage of customer operational reality covered by configuration without customization | 100% |
| Support ticket trend | Volume and severity trend of customer support tickets | Declining trend |

### 32.5 Platform Health Metrics

| Metric | Description | Target |
|---|---|---|
| Availability | Platform uptime, measured per edition SLA | Per SLA |
| Audit completeness | Percentage of consequential actions audited | 100% |
| Tenant isolation integrity | Degree to which tenant isolation is maintained under load | No measurable breach |
| Security incident rate | Rate of security incidents, segmented by severity | Declining trend |
| Recovery time objective | Time to recover from defined failure scenarios | Per documented objectives |

### 32.6 Strategic Progress Metrics

| Metric | Description | Target |
|---|---|---|
| Specialty coverage | Number of specialties with validated configuration overlays | Annual increase |
| Regional coverage | Number of regions with validated localization packs | Annual increase |
| Module depth | Average module depth across supported specialties | Annual increase |
| Open data portability demonstrated | Periodic successful execution of customer data export pipeline | Quarterly successful exercise |
| Configuration coverage of clinic types | Percentage of supported clinic types with complete configuration | 100% by end of planning horizon |

### 32.7 Metric Governance

Metrics are governed by the Product Council. Quarterly reviews track practitioner experience, customer health, and platform health metrics; annual reviews track strategic progress metrics. Erosion in any metric is treated as a strategic risk and addressed through product, operational, or commercial response.

Metrics are not gamed. A metric that becomes a target is revised to prevent gaming, in keeping with Goodhart's law. The Product Council reviews metric definitions annually to ensure they remain decision-relevant and resistant to gaming.

### 32.8 Success Metrics and the Decade Horizon

Success metrics are the operational mechanism by which the platform's decade-horizon progress is assessed. Short-term metric movements are interpreted in the context of long-term trajectory; a metric that improves in the short term at the cost of long-term trajectory is treated as a defect, not as progress.

The decade horizon is the test the Product Council applies when interpreting metrics. A metric that is improving but is incompatible with the decade horizon is a warning sign, not a success. A metric that is stable but is compatible with the decade horizon is a success, even if short-term optimization would suggest otherwise.

---

## 33. Product Glossary

### 33.1 Purpose of This Glossary

This glossary is the canonical reference for product terminology used across the Ibn Hayan documentation framework. Terms defined here are used consistently in this document and in all downstream documents. A term used in a downstream document that is not defined here is either a local term (defined in that document) or a defect.

The glossary is organized alphabetically. Each entry includes the term, a concise definition, and, where relevant, a cross-reference to the section of this document where the term is developed.

### 33.2 Glossary

| Term | Definition | Cross-Reference |
|---|---|---|
| Access Review | Periodic review of user permissions to verify continued appropriateness | Section 21 |
| Accountability | The principle that every action of consequence is attributable to a principal and recorded | Design Principle D-10 |
| Acquired Suite | A product portfolio assembled through acquisition rather than unified design | Section 13.5 |
| Active Tenant | A tenant in steady-state operation | Section 23.3, TL3 |
| ARR | Annual Recurring Revenue | Section 14.5 |
| Audit | The immutable record of consequential actions taken on the platform | Section 22.6, Design Principle D-10 |
| Auditability | The property that every consequential action can be audited after the fact | Design Principle D-10 |
| Authoritative | Holding authority over downstream documents; conflicts resolve in favour of the authoritative document | Section 1.2 |
| Belief | One of six foundational beliefs about healthcare, software, and organizations | Section 4 |
| Bounded Context | A defined area of domain responsibility within the platform's domain-driven architecture | `SYSTEM_ARCHITECTURE.md` |
| CAC | Customer Acquisition Cost | Section 14.5 |
| Clinical Decision Support | Capability that provides clinicians with context-relevant information and alerts at the point of care | Section 19, M04 |
| Clinical Fidelity | The degree to which the platform's behaviour matches the operational reality of clinical work | Design Principle D-1 |
| Composability | The property of being composed of modules with explicit boundaries and contracts | Design Principle D-9 |
| Configuration | Declarative, version-controlled, tenant-scoped adaptation of platform behaviour without source modification | Section 22, Principle P-2 |
| Configuration Audit | The immutable record of configuration changes | Section 22.6 |
| Configuration Coverage | The percentage of customer operational reality covered by configuration without customization | Goal G-2 |
| Configuration Inheritance | The propagation of configuration from higher-scope layers to lower-scope layers | Section 22.3 |
| Configuration Layer | One of eight scopes at which configuration can be applied | Section 22.3 |
| Configuration Overlay | A configuration applied at a specific layer to override inherited configuration | Section 18.3 |
| Configuration Sandboxing | The practice of testing configuration changes in a non-production tenant before applying to production | Section 22.7 |
| Configuration Validation | The pre-application validation of configuration changes against five rule categories | Section 22.4 |
| Configuration Versioning | The immutable version history of configuration changes | Section 22.5 |
| Core Principle | One of nine decision rules that govern product choices | Section 5 |
| Customer | A healthcare organization that has subscribed to Ibn Hayan | Section 9.1 |
| Customer Lifetime | The duration of a customer's subscription relationship with the platform | Section 14.5 |
| Customer Maturity Profile | A profile of customer operational maturity with respect to healthcare software | Section 9.6 |
| Customer Size Tier | One of six tiers classifying customers by operational scale | Section 9.3 |
| Customer Specialty Profile | A profile of customer clinical specialties | Section 9.4 |
| Customization | Source-level modification of platform behaviour; excluded by Principle P-2 | Section 1.4, Principle P-2 |
| Decade Horizon | The ten-year planning horizon that governs product decisions | Section 2.2 |
| Design Principle | One of ten architectural and behavioural commitments translating Core Principles into design | Section 6 |
| Differentiator | A product-level commitment that distinguishes Ibn Hayan from competitors | Section 13 |
| Edition | A packaged tier of capability and service level offered commercially | Section 16 |
| Emergency Access | Break-glass access to patient records in urgent situations | Section 21.6 |
| Future-Proof Architecture | The property of absorbing unanticipated capability without architectural rework | Design Principle D-7 |
| GA | General Availability; the lifecycle stage at which a module is available to all customers | Section 19.5, LC3 |
| Global Reach | The platform's ability to serve organizations across geographies | Section 2.3 |
| Gross Margin | Revenue minus direct delivery cost | Section 14.5 |
| Healthcare-Native | Built as healthcare software from inception, not adapted from generic enterprise software | Differentiator 1, Design Principle D-1 |
| Ibn Hayan | The Ibn Hayan Healthcare Operating System as a whole | Section 1.4 |
| Ibn Hayan Identity | The three commitments encoded in the platform's namesake | Section 1.5 |
| Integration | A connection to an external system through a documented contract | Section 29 |
| Integration Coverage | The breadth of supported integrations | Section 29.5 |
| Isolation Level | One of three deployment choices for tenant isolation | Section 15.3 |
| LTV | Customer Lifetime Value | Section 14.5 |
| Localization | Comprehensive regional adaptation covering language, calendar, regulatory framework, and other dimensions | Section 25, Design Principle D-6 |
| Long-Term Product | A product built for durable independence, not for acquisition | Differentiator 8 |
| Module | A bounded product capability shipped as part of the platform | Section 19 |
| MTTR | Mean Time To Recovery | Section 27.6 |
| NRR | Net Revenue Retention | Section 14.5 |
| Observability | The property of platform operations being visible through telemetry | Design Principle D-10 |
| Onboarding | The lifecycle stage during which a customer is provisioned and configured | Section 9.8, L2 |
| Onboarding Success | The customer reaching first clinical encounter within target time | Goal G-3 |
| Open Data | The principle that customer data is portable and exposed through documented interfaces | Principle P-4, Design Principle D-8 |
| Open Standards | Standards that are publicly documented and not proprietary | Principle P-4 |
| Operational Intelligence | Capabilities that augment operational decision-making, including AI-assisted features | Section 30.6 |
| Operational Isolation | The property of tenant operational behaviour not affecting other tenants | Section 23.6 |
| Patient | The ultimate stakeholder of every platform decision; not the customer | Section 4.5 |
| Patient Entity | The data model entity representing a patient | Section 19, M01 |
| Permission | An action-level grant on a resource, assigned through roles | Section 21 |
| Platform | The multi-tenant runtime environment shared across customers | Section 1.4 |
| Platform Default | The lowest layer of configuration, applied to all customers | Section 22.3, L1 |
| Practitioner | A person who uses the platform in clinical, operational, or administrative work | Section 3.4 |
| Pricing Principles | The six principles governing pricing decisions | Section 14.3 |
| Product Bible | This document; the canonical product reference | Section 1.1 |
| Product Council | The governance body for product decisions | Section 1.2 |
| Product Differentiator | A product-level commitment distinguishing Ibn Hayan from competitors | Section 13 |
| Product Goal | One of eight measurable outcomes the product team commits to | Section 7 |
| Regional Adaptation | The configuration of the platform for a specific region | Section 25, Design Principle D-6 |
| Regional Profile | The localization pack applied for a specific region | Section 25.3 |
| Regulatory Framework | The set of regional regulatory requirements governing healthcare operations | Section 25.2 |
| Role | A defined set of permissions assignable to users | Section 20 |
| Sandbox Tenant | A non-production tenant for configuration testing and training | Section 15.5 |
| Scope Discipline | The practice of declining capabilities that do not belong in the platform | Section 11.6 |
| Simplicity Without Sacrificing Power | The property of offering practitioner simplicity alongside configurator power | Design Principle D-4 |
| Specialty Depth | The degree to which the platform supports a specialty's daily work | Differentiator 9, Goal G-5 |
| Stakeholder | A party whose interests the platform must serve or whose authority it must acknowledge | Section 10 |
| Tenant | The logical isolation boundary within the platform holding a single customer's data and configuration | Section 1.4 |
| Tenant Data Residency | The region in which a tenant's data is stored | Section 23.5 |
| Tenant Lifecycle | The seven-stage lifecycle of a tenant | Section 23.3 |
| Tenant Operational Isolation | The property of one tenant's operation not affecting another's | Section 23.6 |
| Time-to-Value | The time from subscription to first realized value | Goal G-3 |
| TCO | Total Cost of Ownership | Implied throughout Section 14 |
| Trial Edition | The non-production edition for prospect evaluation | Section 16.3, E0 |
| Unified Platform | A platform built as a single coherent system, not an acquired suite | Differentiator 4 |
| User | A human or system principal that interacts with the platform under a governed identity | Section 1.4 |
| Validated Practice | Capability that has been validated against real operational use | Principle P-8 |
| Vision | The stated destination of the platform on the decade horizon | Section 2 |
| Workflow Exclusivity | The property of the platform being the primary workflow tool for practitioners | Section 13.2 |
| Worklog | The shared multi-agent work log at `/home/z/my-project/worklog.md` | `worklog.md` |

### 33.3 Glossary Governance

The glossary is the canonical reference for product terminology. New terms are added through the Product Council when a term is introduced that recurs across the documentation framework. Terms are not removed casually; a term that is no longer used is marked deprecated rather than removed, to preserve traceability for historical documents.

The glossary is reviewed annually, with new terms added and deprecated terms marked. The review is recorded in the CHANGELOG with the version increment.

### 33.4 Using the Glossary

Authors of downstream documents should:

- Use terms defined in this glossary consistently with the definitions here
- Define local terms in their own document if a term is needed that is not in this glossary
- Propose additions to this glossary through the Product Council when a local term recurs across multiple documents
- Avoid introducing synonyms for terms already defined here

The glossary is not a style guide; it is a terminology contract. Style guidance is provided in the documentation framework's style guide, separate from this document.



