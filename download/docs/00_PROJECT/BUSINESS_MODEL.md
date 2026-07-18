# Ibn Hayan Healthcare Operating System
## Business Model

| Field | Value |
|---|---|
| Document Title | Business Model |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Strategic Business Model Reference |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a commercial decision is ratified |
| Audience | Executive sponsors, investors, commercial leadership, customer-facing teams, finance, partners |
| Scope | Business model canvas, value propositions, customer segments, revenue streams, pricing strategy, distribution channels, customer relationships, key activities, key resources, key partnerships, cost structure, unit economics, financial projections |
| Out of Scope | Implementation detail, source code, database schemas, API contracts, specific release commitments (see PRODUCT_ROADMAP), scope boundaries (see PROJECT_SCOPE) |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. This document elaborates the business model established in PRODUCT_BIBLE Section 14 (Business Model), Section 15 (SaaS Strategy), and Section 16 (Editions); it does not redefine them. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with headings only) |

---

## Table of Contents

1. Business Model Canvas
2. Value Propositions
3. Customer Segments
4. Revenue Streams
5. Pricing Strategy
6. Distribution Channels
7. Customer Relationships
8. Key Activities
9. Key Resources
10. Key Partnerships
11. Cost Structure
12. Unit Economics
13. Financial Projections
14. Related Documents

---

## 1. Business Model Canvas

The Business Model Canvas is the single-page representation of how Ibn Hayan creates, delivers, and captures value. It is the strategic complement to the project vision and the project scope: the vision states where the platform is going, the scope states what the platform is and is not, and the business model states how the platform sustains the investment required to deliver the decade-horizon commitment. This section presents the canvas as a summary table; the remainder of the document elaborates each element.

### 1.1 Purpose of the Business Model Canvas

The purpose of the business model canvas is to give executive sponsors, investors, commercial leadership, and the product team a shared, concise reference for the platform's commercial mechanics. The canvas is not a substitute for the detailed sections that follow; it is the orienting artefact that makes the detailed sections navigable. The canvas is reviewed quarterly through the Product Council and is revised when a commercial decision is ratified. The canvas is the operational expression of the business model alignment established in PRODUCT_BIBLE Section 14.7.

### 1.2 Canvas Summary

| Canvas Element | Ibn Hayan Posture |
|---|---|
| Value Propositions | Healthcare-native operating system; configuration-driven adaptability; one platform across the customer spectrum; decade-horizon durability; open data and open standards; practitioner-first design |
| Customer Segments | Six customer size tiers (T1 Solo through T6 Hospital Network); 18 supported organization types; 30 supported clinic types; multiple geographic regions with validated localization packs |
| Revenue Streams | Platform subscription (per edition), module enablement (beyond edition baseline), service tier subscription, implementation services, training services |
| Pricing Strategy | Transparent, tiered, aligned, predictable, sustainable, accessible; four editions (Trial E0, Essential E1, Professional E2, Enterprise E3) |
| Distribution Channels | Direct sales for mid-market and enterprise; self-service for solo and small practice; partner channel for implementation, training, and regional reach |
| Customer Relationships | Product-led growth; retention-led growth; long-term partnership posture; configuration governance engagement |
| Key Activities | Product engineering, configuration framework development, module development, operations, customer success, documentation, regional adaptation, compliance |
| Key Resources | Engineering team, healthcare-native product team, configuration framework, module catalogue, multi-tenant runtime, operational rigour, partner network |
| Key Partnerships | Implementation partners, training partners, integration partners, regional partners, healthcare standards organizations |
| Cost Structure | Engineering-dominated; operations, customer success, support, compliance, documentation, regional adaptation, sales and marketing in descending order of magnitude |
| Unit Economics | 7+ year customer lifetime target; LTV substantially exceeds CAC; NRR above 110%; gross margin sustained above 70% |

### 1.3 Canvas Discipline

The canvas is not a marketing artefact; it is a strategic contract. Each element of the canvas is governed by a section of this document, and each section is governed by the principles established in PRODUCT_BIBLE Section 5 (Core Principles) and Section 6 (Design Principles). A commercial decision that is inconsistent with the canvas is escalated to the Product Council for adjudication, with the inconsistency made explicit rather than hidden. The canvas discipline is the operational expression of Strategic Theme T-5 (decade-horizon over quarter) and of the business model alignment established in PRODUCT_BIBLE Section 14.7.

---

## 2. Value Propositions

Value propositions are the distinct forms of value the platform delivers to its customers. Each value proposition is grounded in a differentiator established in PRODUCT_BIBLE Section 13 (Product Differentiators) and is the basis for a customer segment's decision to adopt the platform. This section lists the platform's value propositions, drawing on PRODUCT_BIBLE Section 13 and on the project vision's strategic pillars (PROJECT_VISION Section 4).

### 2.1 Value Proposition VP-1 — Healthcare-Native Operating System

The platform is built as healthcare software from inception, not adapted from generic enterprise software. This value proposition derives from Differentiator 1 (Healthcare-Native, Not Healthcare-Adapted) and from Value V-1 in PROJECT_VISION. The proposition is that a healthcare organization adopting Ibn Hayan is adopting a platform whose architecture, defaults, and operational posture are healthcare-native, with clinical safety as a primitive, auditability as a primitive, and patient data sovereignty as a non-negotiable constraint. The proposition is distinct from competitors whose healthcare capability is bolted onto a generic enterprise platform, with predictable gaps in clinical workflow fidelity, audit completeness, and regulatory alignment.

### 2.2 Value Proposition VP-2 — Configuration-Driven Adaptability

The platform adapts to customer operational reality through configuration, not customization. This value proposition derives from Differentiator 2 (Configuration-Driven, Not Customization-Dependent) and from Value V-2 in PROJECT_VISION. The proposition is that a healthcare organization adopting Ibn Hayan is adopting a platform whose adaptation mechanism is declarative, version-controlled, tenant-scoped, and reversible, with no source-level customization, no customer-specific code branches, and no customer-specific runtime forks. The proposition is distinct from competitors whose adaptation mechanism is customization, with predictable accumulation of debt that becomes unrecoverable within five to seven years.

### 2.3 Value Proposition VP-3 — One Platform Across the Customer Spectrum

The platform serves customers from T1 (Solo) through T6 (Hospital Network) on the same codebase, the same configuration model, and the same operational runtime. This value proposition derives from Differentiator 3 (One Platform, Many Organizations), Differentiator 6 (Accessible Across Tiers, Not Enterprise-Only), and from Value V-3 in PROJECT_VISION. The proposition is that a healthcare organization adopting Ibn Hayan is adopting a platform that scales with the organization across its lifecycle, from solo practice through multi-hospital network, without re-platforming. The proposition is distinct from competitors that maintain segmented product portfolios for different customer tiers, with predictable migration costs at tier transitions.

### 2.4 Value Proposition VP-4 — Decade-Horizon Durability

The platform is built for decade-horizon durability, with architectural choices that survive technology shifts and a business model that does not depend on customer churn. This value proposition derives from Differentiator 8 (Long-Term Product, Not Acquisition Target) and from Value V-6 in PROJECT_VISION. The proposition is that a healthcare organization adopting Ibn Hayan is adopting a platform whose vendor is committed to the decade horizon, with sustained engineering investment through market cycles, predictable pricing across the subscription term, and an independence posture that protects the platform from acquisition-driven disruption. The proposition is distinct from competitors whose vendor posture is short-term or acquisition-oriented, with predictable product abandonment risk.

### 2.5 Value Proposition VP-5 — Open Data, Open Standards

The platform exposes customer data through documented interfaces and uses open healthcare integration standards where they exist. This value proposition derives from Differentiator 7 (Open Data, Not Captive Data) and from Value V-4 in PROJECT_VISION. The proposition is that a healthcare organization adopting Ibn Hayan is adopting a platform that does not hold customer data captive, with a documented customer data export pipeline that is exercised quarterly, open data formats that survive vendor turnover, and open integration standards that lower the barrier to ecosystem participation. The proposition is distinct from competitors whose data posture is captive, with predictable lock-in costs over the customer lifetime.

### 2.6 Value Proposition VP-6 — Practitioner-First Design

The platform is designed for the practitioners who use it on a busy Tuesday afternoon, not for the procurement committees who see it once. This value proposition derives from Differentiator 9 (Specialty Depth, Not Generic Templates), Differentiator 10 (Transparent Pricing, Not Opaque Contracting), and from Value V-5 in PROJECT_VISION. The proposition is that a healthcare organization adopting Ibn Hayan is adopting a platform whose interaction design is grounded in workflow analysis with real practitioners, whose workflow depth per specialty is funded even when it does not appear in sales demos, and whose pricing is published and is not negotiated per customer. The proposition is distinct from competitors whose design is procurement-led, with predictable practitioner friction and predictable pricing opacity.

### 2.7 Value Proposition VP-7 — Specialty Depth, Not Generic Templates

The platform provides specialty-specific configuration overlays and specialty-specific module extensions for the specialties it supports, validated against real operational deployments. This value proposition derives from Differentiator 9 (Specialty Depth, Not Generic Templates) and from Pillar SP-1 (Healthcare-Native Foundation) in PROJECT_VISION. The proposition is that a healthcare organization adopting Ibn Hayan is adopting a platform whose specialty coverage is deep, with configuration overlays that match the operational reality of each specialty and with specialty-specific module extensions where the specialty warrants them. The proposition is distinct from competitors whose specialty coverage is shallow, with predictable workaround requirements and predictable documentation gaps.

### 2.8 Value Proposition Summary

| Value Proposition | Differentiator | Customer Segment Most Affected |
|---|---|---|
| VP-1 Healthcare-native operating system | Differentiator 1 | All segments |
| VP-2 Configuration-driven adaptability | Differentiator 2 | T3, T4, T5, T6 (configuration depth matters more at scale) |
| VP-3 One platform across customer spectrum | Differentiators 3, 6 | T2, T3, T4 (organizations that grow across tiers) |
| VP-4 Decade-horizon durability | Differentiator 8 | T4, T5, T6 (organizations with multi-year planning horizons) |
| VP-5 Open data, open standards | Differentiator 7 | All segments (data sovereignty is universal) |
| VP-6 Practitioner-first design | Differentiators 9, 10 | All segments (practitioner time is universal) |
| VP-7 Specialty depth, not generic templates | Differentiator 9 | T3, T4, T5 (specialty practices) |

---

## 3. Customer Segments

Customer segments are the distinct groups of healthcare organizations the platform serves. Segmentation is operational, not demographic: segments are defined by the operational characteristics that govern configuration depth, edition packaging, onboarding pathway, and support tier. This section lists the platform's customer segments, drawing on PRODUCT_BIBLE Section 9 (Target Customers) and Section 17 (Supported Healthcare Organizations).

### 3.1 Customer Size Tiers

Customers are classified into six size tiers based on operational scale rather than revenue, as established in PRODUCT_BIBLE Section 9.3. Size tier governs default edition packaging, default onboarding pathway, default support tier, and default configuration complexity.

| Tier | Code | Typical Profile | Typical Facility Count | Typical Active User Count | Default Edition |
|---|---|---|---|---|---|
| Solo | T1 | Single practitioner, single facility | 1 | 1–3 | Essential (E1) |
| Small Practice | T2 | Small group practice, single specialty | 1–3 | 4–25 | Essential (E1) |
| Mid Practice | T3 | Multi-provider practice, single or few specialties | 3–10 | 26–100 | Professional (E2) |
| Large Practice | T4 | Multi-site practice or small hospital | 10–30 | 101–500 | Professional (E2) |
| Hospital | T5 | Single hospital or small hospital network | 1–5 | 501–2,000 | Enterprise (E3) |
| Hospital Network | T6 | Multi-hospital network, regional or national | 5+ | 2,000+ | Enterprise (E3) |

### 3.2 Organization Type Segmentation

Customers are segmented by organization type, as established in PRODUCT_BIBLE Section 17.2. The platform supports 18 organization types; the catalogue is reviewed annually and amended through the Product Council when new organization types achieve validated-practice status. The full catalogue is in PRODUCT_BIBLE Section 17.2; the segmentation here groups organization types by their commercial and operational characteristics.

| Segment Group | Organization Types | Typical Tiers | Typical Commercial Posture |
|---|---|---|---|
| Solo and small practice | O1 Solo practice, O2 Group practice | T1, T2 | Self-service onboarding; Essential edition; annual contract |
| Multi-specialty and mid practice | O3 Multi-specialty practice, O5 Specialty clinic, O13 Occupational health clinic | T3, T4 | Assisted onboarding; Professional edition; annual or multi-year contract |
| Network and multi-site | O4 Primary care network, O8 Pharmacy chain, O15 Home health provider, O16 Telehealth provider | T3, T4, T5 | Assisted onboarding; Professional or Enterprise edition; multi-year contract |
| Hospital | O9 Single hospital, O6 Day surgery centre, O11 Academic medical centre | T5 | White-glove onboarding; Enterprise edition; multi-year contract |
| Hospital network | O10 Hospital network, O17 Government health authority | T6 | White-glove onboarding; Enterprise edition; multi-year contract with governance engagement |
| Diagnostic and ancillary | O7 Diagnostic centre, O14 Long-term care facility, O18 NGO healthcare provider | T3, T4, T5 | Assisted onboarding; Professional or Enterprise edition; multi-year contract |
| Public sector | O12 Public health clinic, O17 Government health authority, O18 NGO healthcare provider | T3, T4, T5, T6 | Public-sector procurement; Enterprise edition; multi-year contract with governance engagement |

### 3.3 Customer Maturity Profile

Customers are profiled by their operational maturity with respect to healthcare software, as established in PRODUCT_BIBLE Section 9.6. Maturity profile governs the depth of configuration that is appropriate to apply at onboarding and the cadence of subsequent configuration evolution. The full maturity profile table is in PRODUCT_BIBLE Section 9.6; the four profiles are Initial (M1), Transitional (M2), Operational (M3), and Advanced (M4).

### 3.4 Geographic Segmentation

Customers are segmented by the geographic region in which they operate, as established in PRODUCT_BIBLE Section 9.5. Geographic region governs the localization layer applied — language, calendar, regulatory framework, clinical coding system, and payment model. The supported regions are listed in PRODUCT_BIBLE Section 25.3; the geographic segmentation here groups regions by their commercial and operational characteristics.

| Region Group | Regions (Indicative) | Typical Commercial Posture |
|---|---|---|
| MENA launch region | MENA-1, MENA-2 (validated) | Direct sales; assisted onboarding; multi-year contracts |
| MENA expansion | MENA-3, MENA-4, MENA-5 (candidate) | Direct sales; partner-assisted onboarding; multi-year contracts |
| GCC region | GCC-1 through GCC-4 (planned) | Direct sales; partner-assisted onboarding; multi-year contracts |
| Levant and North Africa | LEV-1, NA-1 (indicative) | Partner-led; partner-assisted onboarding; multi-year contracts |
| European and UK | EU-1, UK-1 (indicative) | Direct sales; assisted onboarding; multi-year contracts |
| North America | NA-1 (indicative) | Direct sales; assisted onboarding; multi-year contracts |

### 3.5 Customer Selection Criteria

Ibn Hayan does not pursue every customer, as established in PRODUCT_BIBLE Section 9.7. The product team applies selection criteria to identify customers whose needs align with the platform's current maturity and whose commitment to the decade horizon matches the platform's own. Customers who do not meet the selection criteria are referred to alternative vendors whose posture is better matched. The selection criteria are: the customer operates within a supported clinic type and a supported region; the customer accepts configuration as the adaptation mechanism and does not require source-level customization; the customer accepts the platform's data custody model, including the documented offboarding process; the customer is willing to engage with the platform's operational rigour, including audit, observability, and configuration governance; the customer's leadership is aligned with the decade-horizon commitment, not solely with short-term cost optimization.

---

## 4. Revenue Streams

Revenue streams are the distinct sources of revenue the platform generates. The revenue model is subscription-based, with revenue derived from platform subscriptions, module enablement, and service tiers, as established in PRODUCT_BIBLE Section 14.2. The model is designed for alignment with customer success: revenue grows when customers expand their use of the platform, not when customers are locked in or upsold capabilities they do not use.

### 4.1 Revenue Stream Catalogue

The platform's revenue streams are reproduced from PRODUCT_BIBLE Section 14.2 for reference; the authoritative source remains PRODUCT_BIBLE.

| Revenue Stream | Description | Alignment |
|---|---|---|
| Platform subscription | Per-customer subscription to the platform, tiered by edition | Aligns with customer commitment to the platform |
| Module enablement | Per-module subscription for modules beyond the edition baseline | Aligns with customer expansion of platform use |
| Service tier | Per-tier subscription for support, SLA, and operational services | Aligns with customer operational sophistication |
| Implementation services | Optional implementation and configuration services | Aligns with customer onboarding success |
| Training services | Optional role-based training for customer teams | Aligns with customer operational maturity |

### 4.2 Revenue Stream Discipline

Revenue is not derived from customization, from data monetization, from advertising, or from lock-in fees. These revenue sources are excluded by PRODUCT_BIBLE Section 12.4 and Section 12.5 and are reproduced in PROJECT_SCOPE Section 3.3 and Section 3.4. The exclusion is absolute, not selective; a customer request for a revenue source that is excluded is declined, regardless of the commercial attractiveness of the request. The discipline is the operational expression of Value V-4 (open data, open standards) and of the pricing principles established in PRODUCT_BIBLE Section 14.3.

### 4.3 Revenue Stream Mix

The platform's revenue stream mix is biased toward platform subscription and module enablement, with service tier, implementation, and training as supporting streams. The bias is deliberate; subscription revenue is the most durable and the most aligned with customer success, while services revenue is more variable and more sensitive to customer operational maturity. The mix target is for subscription revenue (platform subscription plus module enablement) to exceed 75% of total revenue at maturity, with services revenue (service tier, implementation, training) comprising the remainder. The mix is monitored quarterly; erosion in the subscription share is treated as a strategic risk.

### 4.4 Revenue Stream Evolution

Revenue streams evolve as the platform matures. In the early phases, implementation and training services are a larger share of revenue, reflecting the onboarding intensity required for new customers. As the platform matures and the customer base grows, subscription revenue becomes the dominant share, reflecting the recurring nature of platform use. The evolution is monitored quarterly and is reflected in the financial projections in Section 13. Revenue stream evolution does not include the introduction of excluded revenue sources; the excluded sources remain excluded across the platform's lifetime.

---

## 5. Pricing Strategy

Pricing strategy is the discipline of setting prices that are transparent, tiered, aligned, predictable, sustainable, and accessible, as established in PRODUCT_BIBLE Section 14.3. The platform is packaged into four editions (Trial E0, Essential E1, Professional E2, Enterprise E3), each targeting a distinct customer segment with a distinct combination of module scope and service tier. This section elaborates the edition catalogue and the pricing principles, drawing on PRODUCT_BIBLE Section 16.

### 5.1 Pricing Principles

The platform's pricing is governed by six principles, reproduced from PRODUCT_BIBLE Section 14.3.

| Principle | Description |
|---|---|
| Transparent | Pricing is published and documented; customers know what they are paying for |
| Tiered | Pricing is tiered by edition and service level, not negotiated per customer |
| Aligned | Pricing aligns with customer value, not with customer negotiating sophistication |
| Predictable | Pricing is predictable across the subscription term; surprise increases are not permitted |
| Sustainable | Pricing sustains the platform's investment across the decade horizon |
| Accessible | Pricing makes the platform viable at every customer size tier, not only at enterprise tier |

### 5.2 Edition Catalogue and Pricing Posture

The platform's edition catalogue is reproduced from PRODUCT_BIBLE Section 16.2 for reference; the authoritative source remains PRODUCT_BIBLE. The indicative pricing posture for each edition is stated as a relative range, not as absolute currency values, because absolute values are revised through the Product Council and are documented in the commercial playbook rather than in this document.

| Edition | Code | Target Customer Tier | Module Scope | Service Tier | Indicative Pricing Posture |
|---|---|---|---|---|---|
| Trial | E0 | Prospects evaluating the platform | Subset of Essential | Limited; no SLA | Free during trial window; not a perpetual free tier |
| Essential | E1 | T1 (Solo) and T2 (Small Practice) | Core clinical and operational modules | Standard; business-hours SLA | Low indicative price; accessible to solo and small practice; published; not negotiated |
| Professional | E2 | T3 (Mid Practice) and T4 (Large Practice) | Essential modules + advanced clinical, financial, administrative | Enhanced; extended-hours SLA | Mid indicative price; tiered by active user count; published; not negotiated |
| Enterprise | E3 | T5 (Hospital) and T6 (Hospital Network) | Full module set | Premium; 24/7 SLA | Higher indicative price; tiered by facility count and active user count; published; standard terms, not negotiated per customer |

### 5.3 Trial Edition (E0) Pricing Posture

The Trial edition is a non-production edition designed for prospect evaluation, as established in PRODUCT_BIBLE Section 16.3. It provides access to a subset of Essential edition modules with limited data volume, limited user count, and no service-level commitment. The Trial edition is time-bounded; prospects either convert to a paid edition within the trial window or the trial tenant is decommissioned. The Trial edition is not a free tier; perpetual free use of the platform is not offered, because the platform's sustainability depends on subscription revenue and because free-tier usage typically degrades the platform's operational posture for paying customers.

### 5.4 Essential Edition (E1) Pricing Posture

The Essential edition is designed for solo practitioners and small practices, as established in PRODUCT_BIBLE Section 16.4. It includes the core clinical and operational modules required for primary care practice: Patient, Encounter, Clinical Documentation, Orders & Results, Scheduling, Billing, and basic Pharmacy. Configuration depth is available but the default configuration is conservative, in keeping with the typical maturity profile of T1 and T2 customers. The Essential edition is priced to be accessible; pricing is published and is not negotiated per customer; the edition is designed for self-service onboarding where the customer's maturity profile permits, with optional implementation services available.

### 5.5 Professional Edition (E2) Pricing Posture

The Professional edition is designed for mid and large practices, as established in PRODUCT_BIBLE Section 16.5. It includes the Essential modules plus advanced clinical, financial, and administrative modules, including Accounting, HR, and Workforce. Configuration depth is full; the Professional edition is the edition where configuration governance becomes a significant operational practice. The Professional edition is priced as a mid-tier offering, tiered by active user count to align with customer operational scale. Pricing is published and is not negotiated per customer; assisted onboarding is the default, with implementation services available.

### 5.6 Enterprise Edition (E3) Pricing Posture

The Enterprise edition is designed for hospitals and hospital networks, as established in PRODUCT_BIBLE Section 16.6. It includes the full module set, with full configuration depth and the highest service tier (24/7 SLA). The Enterprise edition is priced as a premium offering, tiered by facility count and active user count. Pricing is published; standard terms apply, with negotiation limited to facility count, active user count, and contract length, not to per-customer price discounts. White-glove onboarding is the default, with implementation services included.

### 5.7 Module Enablement Pricing

Module enablement is the per-module subscription for modules beyond the edition baseline, as established in PRODUCT_BIBLE Section 14.2. Module enablement pricing is published per module and is tiered by the customer's edition, with module enablement on Enterprise edition priced lower per module than on Professional edition, reflecting the larger baseline. Module enablement is the primary mechanism by which customers expand their use of the platform beyond their edition baseline; the mechanism aligns revenue with customer expansion, in keeping with the revenue stream discipline established in Section 4.2.

### 5.8 Service Tier Pricing

Service tier is the per-tier subscription for support, SLA, and operational services, as established in PRODUCT_BIBLE Section 14.2. Service tier pricing is published per tier and is tied to the customer's edition, with the Essential edition's Standard service tier priced lower than the Professional edition's Enhanced service tier, which is priced lower than the Enterprise edition's Premium service tier. Customers may upgrade their service tier independently of their edition, providing a mechanism for customers with higher operational sophistication needs to access higher service levels without changing edition.

---

## 6. Distribution Channels

Distribution channels are the mechanisms by which the platform reaches its customers. The platform's channel strategy is product-led and retention-led, not sales-led, in keeping with the cost model bias established in PRODUCT_BIBLE Section 14.4. The channel strategy is multi-channel, with different channels serving different customer segments.

### 6.1 Channel Catalogue

The platform's distribution channels are organized by the customer segments they serve, with each channel having a distinct commercial posture and operational intensity.

| Channel | Customer Segment | Commercial Posture | Operational Intensity |
|---|---|---|---|
| Self-service | T1 (Solo), T2 (Small Practice) | Self-service sign-up; published pricing; self-service onboarding | Low; the platform's documentation and configuration defaults carry the onboarding load |
| Direct sales — mid-market | T3 (Mid Practice), T4 (Large Practice) | Direct sales engagement; published pricing; assisted onboarding | Medium; sales team and customer success team engage with the customer through onboarding |
| Direct sales — enterprise | T5 (Hospital), T6 (Hospital Network) | Direct sales engagement; published pricing with standard terms; white-glove onboarding | High; sales team, customer success team, implementation team, and governance engagement through onboarding |
| Partner channel — implementation | All tiers | Implementation partners deliver onboarding and configuration services | Variable; partner-led, with Ibn Hayan oversight |
| Partner channel — training | All tiers | Training partners deliver role-based training for customer teams | Variable; partner-led, with Ibn Hayan curriculum oversight |
| Partner channel — regional | Regions where direct sales is not viable | Regional partners deliver sales, onboarding, and support | Variable; partner-led, with Ibn Hayan regional adaptation oversight |
| Partner channel — integration | All tiers | Integration partners deliver integration services for customer-specific integrations | Variable; partner-led, with Ibn Hayan integration framework oversight |

### 6.2 Channel Mix

The channel mix evolves as the platform matures. In the early phases, direct sales and partner channel — implementation carry the majority of the onboarding load, reflecting the assisted onboarding intensity required for new customers. As the platform matures and the documentation and configuration defaults improve, self-service channel grows for T1 and T2 customers, freeing direct sales capacity for T3 through T6 customers. The mix target is for self-service channel to handle the majority of T1 and T2 onboarding at maturity, with direct sales focused on T3 through T6 and partner channels supporting all tiers. The mix is monitored quarterly; channel capacity erosion is treated as a strategic risk.

### 6.3 Channel Discipline

Channel discipline is the practice of maintaining pricing consistency across channels. A customer that engages through the partner channel receives the same published pricing as a customer that engages through direct sales; the partner channel earns partner fees, not customer pricing discounts. The discipline is the operational expression of the pricing principle of transparency; a channel that negotiates different pricing for different customers erodes the transparency principle and is not permitted.

### 6.4 Channel Conflict

Channel conflict is managed through channel assignment rules. A customer is assigned to a channel at engagement, with the assignment recorded in the customer relationship management system. Channel reassignment is permitted only through a documented process, with the reasoning recorded. Channel conflict that cannot be resolved at the team level is escalated to commercial leadership for adjudication. The discipline is the operational expression of the channel discipline; a channel conflict that is silently resolved erodes channel partner trust and is not permitted.

---

## 7. Customer Relationships

Customer relationships are the patterns of engagement the platform maintains with its customers. The platform's relationship posture is product-led and retention-led, in keeping with the cost model bias established in PRODUCT_BIBLE Section 14.4 and with the customer lifetime target established in PRODUCT_BIBLE Section 14.5. The relationship posture is the operational expression of Value V-5 (practitioner experience over procurement satisfaction) and of Strategic Theme T-5 (decade-horizon over quarter).

### 7.1 Relationship Posture by Customer Tier

The platform's relationship posture varies by customer tier, with each tier having a distinct engagement intensity and a distinct cadence.

| Customer Tier | Relationship Posture | Engagement Cadence | Owner |
|---|---|---|---|
| T1 (Solo) | Self-service with documentation and in-platform support | As-needed; quarterly check-in | Customer success team (light touch) |
| T2 (Small Practice) | Self-service with assisted onboarding and in-platform support | As-needed; quarterly check-in | Customer success team (light touch) |
| T3 (Mid Practice) | Assisted relationship with named customer success manager | Monthly check-in; quarterly business review | Customer success team (named) |
| T4 (Large Practice) | Assisted relationship with named customer success manager and configuration consultant | Monthly check-in; quarterly business review | Customer success team (named) |
| T5 (Hospital) | White-glove relationship with named account team | Weekly during onboarding; bi-weekly at steady state; quarterly business review | Customer success team (account) |
| T6 (Hospital Network) | Strategic partnership relationship with named account team and governance engagement | Weekly during onboarding; monthly at steady state; quarterly business review; annual strategic review | Customer success team (account) + Product Council engagement |

### 7.2 Customer Lifecycle Stages

The customer lifecycle has six stages, as established in PRODUCT_BIBLE Section 9.8. The relationship posture varies by lifecycle stage, with each stage having a distinct engagement focus.

| Lifecycle Stage | Code | Relationship Focus |
|---|---|---|
| Prospect | L1 | Needs assessment against selection criteria; trial edition engagement |
| Onboarding | L2 | Tenant provisioning; configuration application; first clinical encounter targeted |
| Active | L3 | Steady-state operation; configuration evolution; regular business reviews |
| Expansion | L4 | Additional facilities, modules, or specialties; configuration depth expansion |
| Renewal | L5 | Retention assessment; subscription renewal; expansion planning |
| Offboarding | L6 | Data export; tenant decommissioning; transition support |

### 7.3 Customer Feedback Loop

Customer feedback is a product input, not a marketing activity, in keeping with the stakeholder engagement discipline established in PRODUCT_BIBLE Section 10.7. Feedback that reaches the product team is recorded, triaged, and either reflected in product decisions or explicitly declined with recorded reasoning. The decline-with-reasoning discipline is critical: a customer whose feedback is silently ignored loses trust in the platform, while a customer whose feedback is explicitly declined with reasoning retains trust even when the decision is unfavourable.

### 7.4 Customer Success Discipline

Customer success is the practice of ensuring customers achieve sustained value from the platform. Customer success is not a sales activity; it is a product-and-operations activity. Customer success managers are measured on customer health metrics (PRODUCT_BIBLE Section 32.4), not on sales metrics; the measurement discipline aligns customer success behaviour with customer success outcomes. Customer success investment is prioritized over sales investment during the platform's maturation phase, in keeping with the investment posture established in PRODUCT_BIBLE Section 14.6.

### 7.5 Customer Offboarding Discipline

Customer offboarding is the terminal stage of the customer lifecycle (L6), as established in PRODUCT_BIBLE Section 9.8. Offboarding is treated with the same rigour as onboarding; the customer's data export is executed through the documented customer data export pipeline, the tenant is decommissioned, and the offboarding is recorded in the audit trail. The offboarding discipline is the operational expression of Value V-4 (open data, open standards); a customer that cannot leave on its own terms is a captive, not a partner.

---

## 8. Key Activities

Key activities are the operational practices the platform's team performs to create, deliver, and capture value. The activities are organized by function, with each function having a distinct contribution to the platform's value proposition. The activity catalogue is the basis for the cost structure in Section 11 and for the resource allocation in the roadmap.

### 8.1 Activity Catalogue

| Activity | Description | Contribution to Value Proposition |
|---|---|---|
| Product engineering | Architecture, configuration framework, module development | VP-1, VP-2, VP-3, VP-7 |
| Operations | SRE, platform operations, incident response, observability | VP-3, VP-4 |
| Customer success | Onboarding, configuration consulting, account management | VP-2, VP-3, VP-4 |
| Support | Tiered support across L1, L2, L3 | VP-3, VP-4 |
| Compliance and security | Regulatory compliance, security operations, audit | VP-1, VP-4 |
| Documentation | Product documentation, configuration guides, training material | VP-2, VP-6 |
| Regional adaptation | Localization, regulatory framework adaptation, regional partnerships | VP-3 (reach) |
| Sales and marketing | Customer acquisition, market development | All VP (customer acquisition) |
| Configuration governance | Configuration framework evolution, configuration surface extension | VP-2 |

### 8.2 Activity Discipline

Each activity is governed by a principle or value established in PRODUCT_BIBLE or in PROJECT_VISION. Product engineering is governed by Value V-6 (decade-horizon durability) and by the architectural principles in SYSTEM_ARCHITECTURE Section 4. Operations is governed by Value V-7 (auditability as primitive) and by the SaaS operational posture in PRODUCT_BIBLE Section 15.4. Customer success is governed by Value V-5 (practitioner experience over procurement satisfaction) and by the customer lifecycle in PRODUCT_BIBLE Section 9.8. Compliance and security is governed by Value V-10 (patient as ultimate stakeholder) and by the security philosophy in PRODUCT_BIBLE Section 27.

### 8.3 Activity Investment Bias

Activity investment is biased toward engineering, operations, customer success, and documentation, and away from sales and marketing, in keeping with the cost model bias established in PRODUCT_BIBLE Section 14.4. The bias reflects the platform's product-led and retention-led growth strategy: a product that is deep, configurable, durable, and well-documented grows through customer retention and customer expansion, not through sales-led acquisition. The bias is monitored through the ratio of engineering and operations investment to sales and marketing investment; erosion in the ratio is treated as a strategic risk.

### 8.4 Activity Cadence

Activity cadence varies by function. Product engineering operates on a continuous delivery cadence with quarterly capability releases. Operations operates on a continuous monitoring cadence with incident response on demand. Customer success operates on a per-customer cadence defined by the customer's tier and lifecycle stage (Section 7.1). Compliance and security operate on a continuous monitoring cadence with quarterly compliance reviews and annual security audits. Documentation operates on a continuous authoring cadence with quarterly publication cycles. Regional adaptation operates on a per-region cadence defined by the regional roadmap. Sales and marketing operate on a quarterly planning cadence with continuous execution.

---

## 9. Key Resources

Key resources are the assets the platform's team relies on to create, deliver, and capture value. Resources are distinct from activities in that resources are what the team has, while activities are what the team does. The resource catalogue is the basis for the cost structure in Section 11 and for the team capacity planning in the roadmap.

### 9.1 Resource Catalogue

| Resource | Description | Contribution to Value Proposition |
|---|---|---|
| Engineering team | Product engineering, architecture, configuration framework, module development | VP-1, VP-2, VP-3, VP-7 |
| Healthcare-native product team | Product management, design, clinical informatics with healthcare literacy | VP-1, VP-6, VP-7 |
| Configuration framework | The platform's configuration surface, validation, versioning, audit | VP-2 |
| Module catalogue | The 19 modules plus specialty extensions | VP-1, VP-3, VP-7 |
| Multi-tenant runtime | The platform's multi-tenant runtime environment | VP-3 |
| Operational rigour | SRE practice, incident response, observability, audit | VP-4 |
| Documentation corpus | Product documentation, configuration guides, training material | VP-2, VP-6 |
| Partner network | Implementation, training, integration, regional partners | VP-3 (reach) |
| Customer base | The installed base of customers across tiers and regions | VP-4 (retention) |
| Brand and reputation | The Ibn Hayan identity and the platform's reputation in the market | All VP |

### 9.2 Resource Investment Posture

Resource investment is patient, in keeping with the investment posture established in PRODUCT_BIBLE Section 14.6. Engineering investment is sustained through market cycles, not reduced during downturns. Configuration depth investment continues even when it does not generate immediate revenue. Regional adaptation investment continues even when regional revenue is initially low. Documentation investment is treated as part of the product, not as a residual. Customer success investment is prioritized over sales investment during the platform's maturation phase. The investment posture is the operational expression of Strategic Theme T-5 (decade-horizon over quarter).

### 9.3 Resource Resilience

Resource resilience is the practice of ensuring the platform's key resources are resilient to team turnover, market cycles, and technology shifts. The healthcare-native product team is resilient through hiring discipline (healthcare literacy is a hiring criterion) and through documentation (the platform's healthcare-native posture is documented, not tribal). The configuration framework is resilient through documentation (the configuration surface is documented as a contract) and through versioning (configuration changes are versioned and immutable). The module catalogue is resilient through bounded context alignment (each module aligns with a stable bounded context, as defined in SYSTEM_ARCHITECTURE Section 7). The operational rigour is resilient through documentation (operational procedures are documented) and through audit (operational actions are audited).

### 9.4 Resource Risks

Resource risks are the risks to the platform's key resources. The principal resource risks are: erosion of healthcare literacy in the team; erosion of configuration framework investment; erosion of operational rigour; erosion of documentation investment; and erosion of the partner network. Each risk is monitored through the Product Council's quarterly review, with erosion treated as a strategic risk and addressed through product, operational, or commercial response.

---

## 10. Key Partnerships

Key partnerships are the external relationships the platform relies on to create, deliver, and capture value. Partnerships are distinct from customer relationships in that partnerships are with parties that help the platform serve customers, while customer relationships are with the customers themselves. The partnership catalogue is the basis for the partner channel in Section 6 and for the dependency governance in PROJECT_SCOPE Section 9.2.

### 10.1 Partnership Catalogue

| Partnership Type | Description | Contribution to Value Proposition |
|---|---|---|
| Implementation partners | Third-party integrators that deliver onboarding and configuration services | VP-2, VP-3 (reach) |
| Training partners | Training providers that deliver role-based training for customer teams | VP-6 |
| Integration partners | Third-party integrators that deliver customer-specific integrations | VP-5 (open standards) |
| Regional partners | Regional organizations that deliver sales, onboarding, and support in regions where direct sales is not viable | VP-3 (reach) |
| Healthcare standards organizations | Standards bodies that maintain open healthcare integration standards | VP-5 (open standards) |
| Healthcare professional bodies | Professional bodies that maintain clinical practice standards | VP-1, VP-7 |
| Academic and research institutions | Institutions that contribute to healthcare informatics research | VP-1, VP-7 |

### 10.2 Partnership Discipline

Partnerships are governed by the platform's principles and values. Implementation partners are required to deliver configuration-driven onboarding, not customization-based onboarding; partners that propose customization are removed from the partner programme. Training partners are required to deliver the platform's documented curricula, not improvised training; partners that improvise are removed from the partner programme. Integration partners are required to use the platform's documented integration surfaces, not ad hoc interfaces; partners that bypass the integration framework are removed from the partner programme. The discipline is the operational expression of Value V-9 (documented over implicit).

### 10.3 Partnership Governance

Partnerships are governed through the partner programme, with each partnership having a defined engagement pathway, defined performance metrics, and defined review cadence. The partner programme is reviewed quarterly through the Product Council, with partner performance assessed against the platform's principles and values. Partners that perform well are extended; partners that perform poorly are coached or removed. The governance discipline is the operational expression of Value V-7 (auditability as primitive); partnership performance is recorded and is the basis for partner decisions.

### 10.4 Partnership Risks

Partnership risks are the risks to the platform's key partnerships. The principal partnership risks are: erosion of partner capacity; erosion of partner alignment with the platform's principles; and erosion of the partner programme's governance discipline. Each risk is monitored through the Product Council's quarterly review, with erosion treated as a strategic risk and addressed through partner programme response.

---

## 11. Cost Structure

The cost structure is the platform's spending pattern across the key activities and resources. The cost model is dominated by engineering, operations, customer success, support, compliance, documentation, regional adaptation, and sales and marketing, in approximate order of magnitude, as established in PRODUCT_BIBLE Section 14.4. The cost structure is the operational expression of the activity investment bias established in Section 8.3.

### 11.1 Cost Catalogue

| Cost Category | Description | Trend | Investment Bias |
|---|---|---|---|
| Engineering | Product engineering, architecture, configuration framework, module development | Sustained investment; grows sub-linearly with revenue | High; protected through market cycles |
| Operations | SRE, platform operations, incident response, observability | Scales with customer count and transaction volume | High; protected through market cycles |
| Customer success | Onboarding, configuration consulting, account management | Scales with customer count and customer complexity | High; prioritized over sales during maturation |
| Support | Tiered support across L1, L2, L3 | Scales with customer count and platform surface | Medium; protected |
| Compliance and security | Regulatory compliance, security operations, audit | Sustained investment; non-negotiable | High; non-negotiable |
| Documentation | Product documentation, configuration guides, training material | Scales with platform surface | High; treated as part of the product |
| Regional adaptation | Localization, regulatory framework adaptation, regional partnerships | Scales with regional footprint | Medium; sustained through market cycles |
| Sales and marketing | Customer acquisition, market development | Scales with growth ambition | Lower; product-led and retention-led growth |

### 11.2 Cost Discipline

Cost discipline is the practice of managing cost in alignment with the activity investment bias. Engineering, operations, customer success, compliance, and documentation costs are protected through market cycles; reductions in these categories during downturns are treated as strategic risks and are escalated to the Product Council. Sales and marketing costs are managed to the growth ambition, with reductions acceptable during downturns. The discipline is the operational expression of Strategic Theme T-5 (decade-horizon over quarter); a cost structure that protects short-term margin at the cost of long-term capability is a defect, not a saving.

### 11.3 Cost Visibility

Cost visibility is the practice of making cost decisions transparent. Cost allocations are recorded by activity and by resource, with the allocations reviewed quarterly through the Product Council. Cost decisions that are inconsistent with the activity investment bias are escalated, with the inconsistency made explicit rather than hidden. The visibility discipline is the operational expression of Value V-7 (auditability as primitive); a cost structure that is opaque cannot be governed.

### 11.4 Cost Trends

Cost trends are monitored quarterly. The principal cost trends are: engineering cost growing sub-linearly with revenue (reflecting the platform's reliance on shared infrastructure); operations cost growing linearly with customer count and transaction volume (reflecting the platform's operational intensity); customer success cost growing with customer count and customer complexity; and sales and marketing cost growing with growth ambition, with the ratio to engineering cost monitored for erosion. Cost trends that deviate from expectation are escalated to the Product Council for analysis and response.

---

## 12. Unit Economics

Unit economics are the per-customer financial metrics that govern the platform's commercial sustainability. The platform's unit economics are designed for decade-horizon sustainability, with the primary metrics being customer lifetime, customer lifetime value (LTV), customer acquisition cost (CAC), net revenue retention (NRR), gross margin, and ARR per customer. The metrics are reproduced from PRODUCT_BIBLE Section 14.5 and are elaborated here.

### 12.1 Unit Economics Catalogue

| Metric | Description | Target Posture | Review Cadence |
|---|---|---|---|
| Customer Lifetime | Median years a customer remains on the platform | 7+ years (decade-horizon ambition) | Annual |
| Customer Lifetime Value (LTV) | Cumulative gross margin per customer over lifetime | Substantially exceeds CAC | Quarterly |
| Customer Acquisition Cost (CAC) | Fully-loaded cost of acquiring a customer | Substantially below LTV; payback within 24 months | Quarterly |
| Net Revenue Retention (NRR) | Revenue retained from existing customers, including expansion and churn | Above 110% (target posture) | Quarterly |
| Gross Margin | Revenue minus direct delivery cost | Sustained above 70% (SaaS benchmark) | Quarterly |
| ARR per customer | Annual recurring revenue per customer | Distributed across customer tiers; not concentrated at enterprise | Quarterly |

### 12.2 Unit Economics Discipline

Unit economics are reviewed quarterly through the Product Council. Erosion in any metric is treated as a strategic risk and addressed through product, operational, or commercial response, not through short-term revenue optimization that compromises the decade horizon. The discipline is the operational expression of Strategic Theme T-5 (decade-horizon over quarter); a unit economics metric that improves in the short term at the cost of long-term trajectory is treated as a defect, not as progress.

### 12.3 CAC Payback Discipline

CAC payback is the time required for a customer's gross margin to repay the cost of acquiring the customer. The platform's CAC payback target is 24 months, in keeping with the unit economics posture established in PRODUCT_BIBLE Section 14.5. CAC payback is monitored quarterly, with erosion treated as a strategic risk. CAC payback erosion is addressed through CAC reduction (improving sales efficiency), through LTV increase (improving customer lifetime or gross margin), or through customer mix shift (shifting toward customer segments with shorter payback). The discipline is the operational expression of the investment posture established in PRODUCT_BIBLE Section 14.6.

### 12.4 NRR Discipline

NRR is the revenue retained from existing customers, including expansion and churn. The platform's NRR target is above 110%, in keeping with the unit economics posture established in PRODUCT_BIBLE Section 14.5. NRR above 100% means that the platform's existing customer base is growing in revenue even without new customer acquisition; NRR above 110% means that the platform's existing customer base is growing in revenue at a rate that exceeds typical SaaS benchmarks. NRR is monitored quarterly, with erosion treated as a strategic risk. NRR erosion is addressed through customer success response (reducing churn), through expansion response (increasing module enablement and service tier upgrades), or through product response (improving the platform's expansion-relevant capability).

### 12.5 Gross Margin Discipline

Gross margin is revenue minus direct delivery cost. The platform's gross margin target is sustained above 70%, in keeping with the unit economics posture established in PRODUCT_BIBLE Section 14.5 and with typical SaaS benchmarks. Gross margin is monitored quarterly, with erosion treated as a strategic risk. Gross margin erosion is addressed through cost discipline (reducing direct delivery cost), through pricing discipline (maintaining published pricing), or through product response (improving the platform's use of shared infrastructure). Gross margin is not protected through short-term pricing optimization that compromises the decade horizon; the discipline is the operational expression of Strategic Theme T-5.

---

## 13. Financial Projections

Financial projections are the platform's forward-looking financial plan, organized by phase and by revenue stream. Projections are indicative, not committed; specific commitments are recorded in PRODUCT_ROADMAP.md and in the commercial playbook. Projections are reviewed quarterly through the Product Council and are revised when actuals deviate from projection by more than the documented threshold.

### 13.1 Projection Posture by Phase

The platform's financial projections are organized by the phases established in PROJECT_SCOPE Sections 4 through 6. Each phase has a distinct revenue posture, cost posture, and unit economics posture.

| Phase | Time Horizon | Revenue Posture | Cost Posture | Unit Economics Posture |
|---|---|---|---|---|
| Phase 1 (MVP) | Year 1 | Initial customer base; T1–T3; essential and professional editions | Engineering-dominated; high onboarding cost per customer | CAC payback above target (onboarding intensity); NRR below target (small base); gross margin below target (operations intensity) |
| Phase 2 (Growth) | Years 2–3 | Growing customer base; T1–T5; all editions except full enterprise | Engineering-dominated; declining onboarding cost per customer | CAC payback approaching target; NRR approaching target; gross margin approaching target |
| Phase 3 (Scale) | Years 3–5 | Scaled customer base; T1–T6; all editions | Engineering-dominated; stable onboarding cost per customer | CAC payback at target; NRR at or above target; gross margin at or above target |
| Maturity | Years 5–10 | Mature customer base; full tier and region coverage | Engineering-dominated; optimized cost structure | CAC payback at target; NRR above 110%; gross margin above 70%; customer lifetime 7+ years |

### 13.2 Revenue Projection Drivers

Revenue projection drivers are the operational metrics that drive revenue: customer count (by tier and region), average ARR per customer (by tier and region), module enablement attach rate (percentage of customers with modules beyond edition baseline), service tier attach rate (percentage of customers with elevated service tier), implementation services attach rate, and training services attach rate. Each driver is monitored quarterly, with deviation from projection documented and addressed through product, operational, or commercial response.

### 13.3 Cost Projection Drivers

Cost projection drivers are the operational metrics that drive cost: engineering headcount, operations headcount, customer success headcount, support headcount, compliance and security headcount, documentation headcount, regional adaptation headcount, sales and marketing headcount, and infrastructure cost. Each driver is monitored quarterly, with deviation from projection documented and addressed through resource allocation response.

### 13.4 Projection Discipline

Financial projections are indicative, not committed. Specific commercial commitments are recorded in the commercial playbook and in customer contracts, not in this document. Projections are revised quarterly through the Product Council, with the revision recorded in the CHANGELOG. Projection revisions that erode the decade-horizon posture (for example, revisions that require pricing increases inconsistent with the pricing principles, or revisions that require cost reductions inconsistent with the activity investment bias) are escalated, with the erosion made explicit rather than hidden.

### 13.5 Projection and the Decade Horizon

Financial projections are the operational mechanism by which the platform's decade-horizon viability is assessed. Short-term projection movements are interpreted in the context of long-term trajectory; a projection that improves in the short term at the cost of long-term trajectory is treated as a defect, not as progress. The decade horizon is the test the Product Council applies when interpreting projections; a projection that is improving but is incompatible with the decade horizon is a warning sign, not a success. A projection that is stable but is compatible with the decade horizon is a success, even if short-term optimization would suggest otherwise.

---

## 14. Related Documents

This section lists the documents that are most directly related to the business model, with a brief statement of the relationship. The list is not exhaustive; the full documentation framework is described in PRODUCT_BIBLE Section 1.6 and in the documentation framework's index.

### 14.1 Canonical References

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_BIBLE.md | The canonical product reference; this document elaborates PRODUCT_BIBLE Section 14 (Business Model), Section 15 (SaaS Strategy), and Section 16 (Editions) and is subordinate to them | PRODUCT_BIBLE Sections 9, 10, 14, 15, 16, 32 |
| SYSTEM_ARCHITECTURE.md | The canonical architectural reference; the business model's operational posture is realized architecturally through the principles defined in SYSTEM_ARCHITECTURE | SYSTEM_ARCHITECTURE Sections 4, 10, 23 |

### 14.2 Sibling Documents in 00_PROJECT

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_VISION.md | Defines the destination toward which the business model is the sustaining mechanism | PROJECT_VISION Section 1 (Vision Statement) |
| PROJECT_SCOPE.md | Defines the boundary within which the business model operates | PROJECT_SCOPE Section 1 (Scope Definition) |
| PRODUCT_ROADMAP.md | Defines the sequenced delivery plan that the business model funds | PRODUCT_ROADMAP Section 1 (Roadmap Overview) |
| CHANGELOG.md | Records the business model's evolution | CHANGELOG Section 4 (Release History) |

### 14.3 Downstream Documents

| Document | Relationship | Cross-Reference |
|---|---|---|
| CONFIGURATION_ARCHITECTURE.md | The architectural expression of the configuration-driven value proposition (VP-2) | CONFIGURATION_ARCHITECTURE |
| MODULE_ARCHITECTURE.md | The architectural expression of the module enablement revenue stream | MODULE_ARCHITECTURE |
| ADR-001 through ADR-006 | The architectural decision records that ratify the architectural posture on which the business model rests | docs/12_ADR/ |

### 14.4 Using This Document

This document is the authoritative reference for the project business model. Readers seeking the canonical product reference should consult PRODUCT_BIBLE.md; readers seeking the canonical architectural reference should consult SYSTEM_ARCHITECTURE.md. Readers seeking specific release commitments should consult PRODUCT_ROADMAP.md; readers seeking specific scope boundaries should consult PROJECT_SCOPE.md. This document does not duplicate the content of those documents; it elaborates the business model and cross-references them.
