# Ibn Hayan Healthcare Operating System
## Project Scope

| Field | Value |
|---|---|
| Document Title | Project Scope |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Strategic Scope Reference |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a scope change is ratified |
| Audience | Product leadership, engineering leadership, customer-facing teams, implementation partners, prospective customers under non-disclosure |
| Scope | Scope definition, in-scope and out-of-scope items, phased scope, future scope, assumptions, dependencies, constraints, scope change process, scope governance |
| Out of Scope | Implementation detail, source code, database schemas, API contracts, release-by-release commitments (see PRODUCT_ROADMAP), commercial pricing detail (see BUSINESS_MODEL) |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. This document elaborates the scope established in PRODUCT_BIBLE Section 11 (Product Scope) and Section 12 (Out of Scope); it does not redefine them. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with headings only) |

---

## Table of Contents

1. Scope Definition
2. In-Scope Modules
3. Out-of-Scope Items
4. Phase 1 Scope (MVP)
5. Phase 2 Scope (Growth)
6. Phase 3 Scope (Scale)
7. Future Scope Considerations
8. Assumptions
9. Dependencies
10. Constraints
11. Scope Change Process
12. Scope Governance
13. Related Documents

---

## 1. Scope Definition

Scope definition is the discipline of stating what the Ibn Hayan platform does and does not attempt. A product without a defined scope expands indefinitely until it loses coherence; a product with a defined scope makes deliberate decisions about what enters and what does not. This section establishes the scope definition framework that the remainder of the document elaborates, drawing on the scope definition established in PRODUCT_BIBLE Section 11.1 and the scope discipline established in PRODUCT_BIBLE Section 11.6.

### 1.1 Purpose of Scope Definition

The purpose of scope definition is to give the product team, customers, partners, and investors a clear basis for deciding what Ibn Hayan should and should not do. Scope definition is the operational complement to the project vision: the vision states where the platform is going, and the scope states what the platform is and is not. The two are interdependent; a vision without a scope is aspiration, and a scope without a vision is bureaucracy. This document is the authoritative reference for Ibn Hayan's scope at the level of capability categories, modules, organization types, clinic types, regions, and phases. Specific capability commitments are recorded in PRODUCT_ROADMAP.md; specific commercial terms are recorded in BUSINESS_MODEL.md.

### 1.2 Scope Definition Framework

The platform's scope is defined along six dimensions, each of which is governed by a section of this document or by a section of PRODUCT_BIBLE. The dimensions are: capability category (governed by Section 2 of this document and PRODUCT_BIBLE Section 11.2); module surface (governed by Section 2 of this document and PRODUCT_BIBLE Section 19); organization type (governed by PRODUCT_BIBLE Section 17); clinic type (governed by PRODUCT_BIBLE Section 18); region (governed by PRODUCT_BIBLE Section 25); and phase (governed by Sections 4 through 6 of this document). A capability is in scope only if it is in scope on all six dimensions; a capability that is in scope on five dimensions and out of scope on the sixth is, by definition, out of scope.

### 1.3 Scope and the Decade Horizon

Scope definition is made on the decade horizon established in PROJECT_VISION Section 1.2 and PRODUCT_BIBLE Section 2.2. The decade horizon means that every capability added to Ibn Hayan is a capability that must be maintained, documented, configured, audited, and supported for ten years. This horizon imposes a discipline on scope: capabilities that cannot justify a ten-year maintenance commitment are not added, regardless of short-term commercial appeal. The decade horizon does not mean Ibn Hayan moves slowly; it means the platform moves deliberately, with each addition justified by reference to the Core Principles (PRODUCT_BIBLE Section 5), the Design Principles (PRODUCT_BIBLE Section 6), and the Product Goals (PRODUCT_BIBLE Section 7).

### 1.4 Scope Discipline

Scope discipline is the practice of saying no to capabilities that do not belong in Ibn Hayan, even when the capability is feasible, requested, and commercially attractive. Scope discipline is the single most important practice for preserving the platform's coherence across the decade horizon. Every capability added to Ibn Hayan is a capability that must be maintained, documented, configured, audited, and supported for the decade; capabilities that do not justify that commitment are declined. Scope discipline does not mean Ibn Hayan is static; it means the platform grows deliberately, with each addition justified by reference to the principles and goals. A capability that cannot be justified by reference to these is not added, regardless of who requests it.

---

## 2. In-Scope Modules

The platform's in-scope capability is organized into five categories — Clinical, Operational, Financial, Administrative, and Platform — each supported by a defined set of modules. This section lists the in-scope categories and modules, drawing on PRODUCT_BIBLE Section 11.2 (in-scope capability categories) and PRODUCT_BIBLE Section 19.2 (module catalogue). The full module catalogue comprises 19 modules, each with a bounded context, an explicit dependency graph, and a documented configuration surface.

### 2.1 In-Scope Capability Categories

The platform's in-scope capability is organized into five categories. Each category is supported by modules defined in Section 2.2 below and in PRODUCT_BIBLE Section 19.2. A capability that does not fit one of these categories is, by definition, out of scope.

| Category | Description | Example Modules |
|---|---|---|
| Clinical | Clinical encounter, documentation, orders, results, decision support, clinical coding | Patient, Encounter, Clinical Documentation, Orders & Results, Pharmacy |
| Operational | Scheduling, queue management, facility operations, document management | Scheduling, Documents, Notifications |
| Financial | Billing, claims, accounting, financial reporting | Billing, Accounting |
| Administrative | Patient registration, workforce management, customer relationship management | CRM, HR, Workforce |
| Platform | Identity, configuration, audit, integration, reporting — shared infrastructure for all other categories | Identity & Access, Configuration, Audit, Integration, Reporting, Localization |

The five categories together constitute the platform's capability surface. The Platform category is shared infrastructure; every other category depends on Platform modules. The Clinical, Operational, Financial, and Administrative categories are domain-specific and depend on Platform modules but not on each other in uncontrolled ways; cross-category dependencies are explicit, documented, and acyclic.

### 2.2 In-Scope Module Catalogue

The platform's module catalogue comprises 19 modules organized into the five categories. The full catalogue is reproduced from PRODUCT_BIBLE Section 19.2 for reference; the authoritative source remains PRODUCT_BIBLE.

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

### 2.3 Scope Across the Customer Spectrum

The platform's scope is uniform across the customer spectrum. A solo practitioner and a multinational hospital network have access to the same capability surface; they differ in which modules they enable, not in what the modules do. This is a direct consequence of Design Principle D-3 (One Platform, Many Organizations) and Design Principle D-5 (Enterprise Scalability). A solo practitioner typically enables a small subset of modules — Patient, Encounter, Clinical Documentation, Scheduling, Billing — and operates with conservative configuration. A multinational hospital network typically enables the full module set and operates with deep configuration across multiple facilities, multiple specialties, and multiple regions. Both customers run the same code, the same configuration model, and the same operational runtime.

### 2.4 Scope Across Regions

The platform's scope is uniform across regions, with regional adaptation applied through the localization surface (Design Principle D-6). A clinic in Baghdad and a clinic in Riyadh operate the same modules with different regulatory frameworks, different clinical coding systems, different payment models, and different languages. The scope is uniform; the localization is regional. Regional scope does not include capabilities that are unique to a single region to the extent that they cannot be generalized. A region-specific capability that cannot be expressed as a configuration of a general module is, by default, out of scope. Exceptions are recorded as architectural decision records and reflected in the regional adaptation roadmap (PRODUCT_BIBLE Section 31.4).

### 2.5 Module Composition Rules

Module composition is governed by the rules established in PRODUCT_BIBLE Section 19.3. Modules align with bounded contexts defined in SYSTEM_ARCHITECTURE.md; module dependencies are explicit, documented, and acyclic; modules communicate through contracts (commands, queries, events, configuration schemas), never through direct data access; modules can be enabled or disabled per tenant subject to dependency constraints; modules are packaged into editions per PRODUCT_BIBLE Section 16; module contracts are versioned, with breaking changes following the platform's deprecation policy.

---

## 3. Out-of-Scope Items

Out-of-scope definition is as important as in-scope definition. A product that does not state what it does not do invites scope creep through ambiguity. A product that states its exclusions explicitly gives the product team, customers, and partners a clear basis for declining requests that do not belong. This section reproduces and elaborates the out-of-scope categories established in PRODUCT_BIBLE Section 12, organized by capability, adaptation mechanism, data practice, commercial practice, and implementation choice.

### 3.1 Excluded Capability Categories

The following categories of capability are explicitly excluded from the platform's scope. Exclusion is not a judgement of value; it is a statement of boundary. The full list is reproduced from PRODUCT_BIBLE Section 12.2.

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

### 3.2 Excluded Adaptation Mechanisms

The following adaptation mechanisms are explicitly excluded from the platform's delivery model. Exclusion is absolute, not selective. The full list is reproduced from PRODUCT_BIBLE Section 12.3.

| Excluded Mechanism | Reason | Consequence |
|---|---|---|
| Source-level customization | Customization accumulates debt that becomes unrecoverable within five to seven years; customization violates Principle P-2 | Customer requirements for source-level customization are declined; the customer is referred to alternative vendors |
| Customer-specific code branches | Branching the codebase for a customer destroys the platform's coherence and the team's ability to maintain the platform | No customer-specific branches are created under any commercial terms |
| Customer-specific feature forks | Forking features for customers produces acquired-suite dynamics (Differentiator 4) | Features are extended through configuration, not through forks |
| Tenant-specific runtime modifications | Runtime modifications for individual tenants violate the multi-tenant posture (Value V-3) | Runtime behaviour is uniform across tenants; configuration is the only differentiation mechanism |

### 3.3 Excluded Data Practices

The following data practices are explicitly excluded from the platform's data model. Exclusion is absolute, in keeping with Value V-4 (Open Data, Open Standards) and Belief Four (the patient as ultimate stakeholder). The full list is reproduced from PRODUCT_BIBLE Section 12.4.

| Excluded Practice | Reason | Consequence |
|---|---|---|
| Data captivity | Customer data must be portable; captivity violates Principle P-4 | The customer data export pipeline is documented and tested quarterly |
| Data monetization | Patient data is not a product; monetization violates Belief Four and the patient data sovereignty commitment | No customer or patient data is sold, licensed, or shared for monetization |
| Advertising | The platform is not advertising-supported; advertising violates the practitioner focus (Value V-5) | No advertising is shown to practitioners, administrators, or patients through the platform |
| Lock-in fees | The platform does not extract fees for data access, data export, or offboarding; lock-in fees violate Principle P-4 | Offboarding is documented and is not subject to additional fees beyond the subscription term |
| Training public models on patient data | Patient data is not used to train public models without explicit consent; the practice violates Belief Four | Intelligence capability is trained on data for which explicit consent is documented, or on synthetic data |

### 3.4 Excluded Commercial Practices

The following commercial practices are explicitly excluded from the platform's commercial model. Exclusion is absolute, in keeping with the pricing principles established in PRODUCT_BIBLE Section 14.3. The full list is reproduced from PRODUCT_BIBLE Section 12.5.

| Excluded Practice | Reason | Consequence |
|---|---|---|
| Per-customer negotiated pricing | Pricing is transparent and tiered; negotiated pricing violates the pricing principle of transparency | Pricing is published and is not negotiated per customer |
| Custom roadmap commitments | The platform's roadmap is uniform; customers do not negotiate custom roadmaps | Sales commitments that bypass roadmap governance are excluded |
| Surprise price increases | Pricing is predictable across the subscription term; surprise increases are not permitted | Price changes are communicated in advance and are governed by the amendment mechanism |
| Bundling with unrelated services | The platform is sold as itself, not bundled with unrelated services that obscure pricing | Bundling with unrelated services is not a commercial practice |
| Multi-year lock-in with cancellation penalties | The platform does not impose multi-year lock-in with cancellation penalties; lock-in violates Value V-4 | Subscription terms are documented and do not include cancellation penalties beyond the current term |

### 3.5 Excluded Implementation Choices

The platform's implementation choices are governed by the architectural principles established in SYSTEM_ARCHITECTURE Section 4 (Architectural Principles P1-P18). The following implementation choices are excluded from the platform's posture, in keeping with the principles and with the decade horizon. The full list is reproduced from PRODUCT_BIBLE Section 12.6.

| Excluded Choice | Reason | Consequence |
|---|---|---|
| Self-hosted community edition | Self-hosted community edition is incompatible with the SaaS posture and the decade horizon | Self-hosted deployment is available only as physical isolation under documented regulatory requirements |
| Downloadable installer | A downloadable installer is incompatible with the multi-tenant SaaS posture | The platform is delivered as SaaS; no installer is distributed |
| Open-source distribution of the platform | Open-source distribution of the platform is incompatible with the SaaS posture and the decade-horizon investment model | The platform is not distributed as open source; open-source components are used where appropriate and are documented |
| Per-customer infrastructure | Per-customer infrastructure violates the multi-tenant posture and the operational efficiency commitment | The platform is delivered on shared infrastructure by default, with dedicated compute and physical isolation as deployment choices |
| Module-specific databases | Module-specific databases that bypass the platform's data architecture violate the bounded context principles | All modules use the platform's data architecture; no module-specific databases are permitted |

---

## 4. Phase 1 Scope (MVP)

Phase 1 corresponds to the platform's first production release and the first twelve months of committed capability. The phase establishes the platform's foundational capability surface and validates the configuration-driven, multi-tenant, offline-first posture against real customer operations. Phase 1 corresponds to the Year 1 committed capabilities established in PRODUCT_BIBLE Section 31.3 and is the operational minimum without which the platform cannot claim operating-system status.

### 4.1 Phase 1 Capability Surface

Phase 1 delivers the platform's foundational modules across the Clinical, Operational, Financial, Administrative, and Platform categories. The Phase 1 module surface is the subset of the 19-module catalogue that has reached General Availability (LC3) or Mature (LC4) lifecycle status, as defined in PRODUCT_BIBLE Section 19.5. The Phase 1 surface is sufficient to support the platform's first production customers across the T1 (Solo), T2 (Small Practice), and T3 (Mid Practice) customer size tiers, in keeping with the customer selection criteria established in PRODUCT_BIBLE Section 9.7.

| Capability Cluster | Phase 1 Modules | Lifecycle Target | Validation Status |
|---|---|---|---|
| Clinical foundation | M01 Patient, M02 Encounter, M03 Clinical Documentation, M04 Orders & Results | LC3 General Availability | Validated against T1–T3 customer operations |
| Pharmacy foundation | M05 Pharmacy (core dispensing) | LC3 General Availability | Validated against community pharmacy operations |
| Operational foundation | M06 Scheduling, M07 Documents, M08 Notifications | LC3 General Availability | Validated against outpatient clinic operations |
| Financial foundation | M09 Billing (core claims and payments) | LC3 General Availability | Validated against T2–T3 billing operations |
| Administrative foundation | M11 CRM (core patient relationships) | LC3 General Availability | Validated against outpatient outreach |
| Platform foundation | M14 Identity & Access, M15 Configuration, M16 Audit, M17 Integration, M18 Reporting, M19 Localization | LC3 General Availability | Validated across all customer operations |

### 4.2 Phase 1 Customer and Region Scope

Phase 1 customer scope covers the T1 (Solo), T2 (Small Practice), and T3 (Mid Practice) customer size tiers, in the organization types and clinic types validated for those tiers. Phase 1 region scope covers the regions with validated localization packs at Phase 1 launch, typically the platform's launch region and the regions with the most mature localization packs. Phase 1 does not attempt to serve T4, T5, or T6 customers, who require capability depth that Phase 1 does not yet provide; such customers are engaged as Phase 2 candidates and onboarded when the Phase 2 capability surface is available.

### 4.3 Phase 1 Configuration Coverage

Phase 1 configuration coverage targets 100% of customer operational reality for the supported organization types, clinic types, and regions at Phase 1 launch. Configuration coverage is measured by the percentage of customer operational reality that is expressible through the configuration surface without customization, in keeping with Goal G-2 (Configuration Coverage of Supported Clinic Types). Where configuration coverage is incomplete at Phase 1 launch, the gap is documented and is addressed through Phase 1 update releases or through Phase 2 capability additions.

### 4.4 Phase 1 Edition Coverage

Phase 1 edition coverage includes the Trial (E0), Essential (E1), and Professional (E2) editions. The Enterprise (E3) edition is not generally available in Phase 1 because the T5 and T6 customers who require Enterprise edition capability are not Phase 1 customers. The edition catalogue is reproduced from PRODUCT_BIBLE Section 16.2; the Phase 1 edition scope is the subset that has reached production readiness.

### 4.5 Phase 1 Validation Discipline

Phase 1 capability is validated against real customer operations before reaching General Availability, in keeping with Core Principle P-8 (Verified Practice Over Hypothetical Capability) and with Strategic Theme T-3 (Validated Practice Over Hypothetical Capability). Validation includes pilot deployment with candidate customers, operational feedback collection, configuration coverage assessment, and operational testing against representative patient scenarios. Capability that has not completed validation at Phase 1 launch is not included in Phase 1; it is either deferred to a Phase 1 update release or to Phase 2.

---

## 5. Phase 2 Scope (Growth)

Phase 2 corresponds to the platform's growth phase, typically the 12-to-24-month window after Phase 1 launch. Phase 2 extends the platform's capability surface, customer scope, and regional scope, and introduces the advanced capability that Phase 1 deliberately deferred. Phase 2 corresponds to the Year 2 planned capabilities established in PRODUCT_BIBLE Section 31.4 and is the phase in which the platform's operating-system claim becomes credible across a broader customer base.

### 5.1 Phase 2 Capability Surface

Phase 2 extends the Phase 1 module surface with advanced clinical, financial, and administrative capability. The Phase 2 module surface includes the modules that reached Pilot (LC2) lifecycle status during Phase 1 and that complete validation during Phase 2, in keeping with the module lifecycle defined in PRODUCT_BIBLE Section 19.5.

| Capability Cluster | Phase 2 Modules | Lifecycle Target | Validation Status |
|---|---|---|---|
| Pharmacy extension | M05 Pharmacy (clinical pharmacy, advanced inventory) | LC4 Mature | Validated against multi-location pharmacy operations |
| Financial extension | M10 Accounting, M09 Billing (advanced claims) | LC3 General Availability | Validated against T3–T4 financial operations |
| Administrative extension | M12 HR, M13 Workforce | LC3 General Availability | Validated against multi-facility operations |
| Specialty module extensions | Cardiology, Paediatrics, Obstetrics extensions | LC3 General Availability | Validated against specialty clinic operations |
| Platform extension | Configuration governance (sandbox-to-production promotion) | LC3 General Availability | Validated against T3–T4 configuration governance |

### 5.2 Phase 2 Customer and Region Scope

Phase 2 customer scope extends to T4 (Large Practice) and selected T5 (Hospital) customers. The T4 and T5 customer scope requires capability depth (specialty module extensions, multi-facility operations, advanced configuration governance) that Phase 1 does not provide; Phase 2 delivers this depth. Phase 2 region scope extends to the regions with localization packs completing validation during Phase 2, including the GCC region localization packs identified in PRODUCT_BIBLE Section 31.4.

### 5.3 Phase 2 Configuration Coverage

Phase 2 configuration coverage targets 100% of customer operational reality for the extended customer and region scope. Configuration coverage is measured against the same Goal G-2 metric as Phase 1, with the scope of the measurement extended to include the Phase 2 customer and region scope. Where configuration coverage is incomplete at Phase 2 launch, the gap is documented and is addressed through Phase 2 update releases or through Phase 3 capability additions.

### 5.4 Phase 2 Edition Coverage

Phase 2 edition coverage extends to include the Enterprise (E3) edition, which becomes generally available for selected T5 customers. The Enterprise edition's full availability for T5 and T6 customers is a Phase 3 deliverable. The edition catalogue is unchanged; the change is which editions are generally available for which customer tiers.

### 5.5 Phase 2 Intelligence and Integration Scope

Phase 2 introduces initial operational intelligence capability, including predictive analytics for operational optimization, governed by Strategic Theme T-3 (validated practice over hypothetical capability) and by Design Principle D-10 (observable, auditable, accountable). Phase 2 also extends the integration catalogue with additional laboratory and imaging standards, in keeping with Value V-4 (open data, open standards). Intelligence capability that cannot meet observability, auditability, and accountability standards is not shipped in Phase 2; it is deferred until the standards can be met.

---

## 6. Phase 3 Scope (Scale)

Phase 3 corresponds to the platform's scale phase, typically the 24-to-36-month window after Phase 1 launch. Phase 3 extends the platform's capability surface to the full module catalogue, extends customer scope to all six customer size tiers, and extends regional scope to the platform's full region catalogue at the end of the planning horizon. Phase 3 corresponds to the Year 3 indicative capabilities established in PRODUCT_BIBLE Section 31.5 and is the phase in which the platform's decade-horizon posture becomes demonstrable.

### 6.1 Phase 3 Capability Surface

Phase 3 extends the Phase 2 module surface with the full module catalogue and with the advanced capability that Phase 2 deliberately deferred. The Phase 3 module surface includes all 19 modules at Mature (LC4) lifecycle status, plus the specialty module extensions that complete validation during Phase 3.

| Capability Cluster | Phase 3 Modules | Lifecycle Target | Validation Status |
|---|---|---|---|
| Full module catalogue | All 19 modules | LC4 Mature | Validated across all supported customer operations |
| Specialty module extensions | Oncology, Orthopaedics, Neurology extensions | LC3 General Availability | Validated against specialty clinic operations |
| Advanced analytics | Advanced analytics module | LC3 General Availability | Validated against multi-facility analytics operations |
| Patient portal | Patient portal (within data sovereignty constraints) | LC3 General Availability | Validated against patient engagement operations |
| Population health | Population health management module | LC3 General Availability | Validated against population health operations |

### 6.2 Phase 3 Customer and Region Scope

Phase 3 customer scope extends to all six customer size tiers, including the full T5 (Hospital) and T6 (Hospital Network) customer scope. The T5 and T6 customer scope requires capability depth (full module catalogue, advanced analytics, multi-hospital operations) that Phase 2 does not provide; Phase 3 delivers this depth. Phase 3 region scope extends to the platform's full region catalogue at the end of the planning horizon, including the Levant, North Africa, European, and United Kingdom regions identified in PRODUCT_BIBLE Section 31.5.

### 6.3 Phase 3 Configuration Coverage

Phase 3 configuration coverage targets 100% of customer operational reality for the full customer and region scope. Configuration coverage is measured against the same Goal G-2 metric as Phases 1 and 2, with the scope of the measurement extended to include the Phase 3 customer and region scope. Where configuration coverage is incomplete at Phase 3 launch, the gap is documented and is addressed through Phase 3 update releases or through future scope considerations (Section 7).

### 6.4 Phase 3 Edition Coverage

Phase 3 edition coverage includes the full edition catalogue, with the Enterprise (E3) edition generally available for all T5 and T6 customers. The edition catalogue is unchanged from Phase 1; the change is which editions are generally available for which customer tiers.

### 6.5 Phase 3 Intelligence and Integration Scope

Phase 3 extends intelligence capability with AI-assisted clinical documentation (with practitioner oversight), enhanced patient portal capabilities, and research support (within the operational scope defined in PRODUCT_BIBLE Section 12.2). Phase 3 extends the integration catalogue with the full set of supported healthcare integration standards, in keeping with Value V-4. Intelligence capability remains governed by Strategic Theme T-3 and by Design Principle D-10 throughout Phase 3.

---

## 7. Future Scope Considerations

Future scope considerations are capabilities that are under consideration for inclusion in the platform's scope beyond the Phase 3 horizon. Future scope considerations are not commitments; they are recorded to provide context for product decisions and to give customers and partners visibility into the platform's direction. Future scope considerations are reviewed annually through the Product Council, in keeping with the future vision discipline established in PRODUCT_BIBLE Section 30.7.

### 7.1 Future Scope Candidates

The following capabilities are future scope candidates. Each candidate is recorded with the strategic pillar it would advance, the assumption on which its inclusion depends, and the validation status required for inclusion.

| Future Scope Candidate | Strategic Pillar | Assumption | Validation Required |
|---|---|---|---|
| Veterinary practice support | Reach | Configuration coverage assessment confirms generalizability | Pilot validation with at least three veterinary operations |
| Dental practice support | Reach | Configuration coverage assessment confirms generalizability | Pilot validation with at least three dental operations |
| Mental health institution support (with involuntary commitment authority) | Reach | Regulatory framework adaptation validated for involuntary commitment workflows | Pilot validation with regulated mental health institutions |
| Public health surveillance integration (selective) | Reach | Regulatory framework permits selective integration | Pilot validation with public health authorities |
| Research data management (selective, within operational scope) | Breadth | Research data management can be expressed within operational care scope | Pilot validation with research-active organizations |
| Advanced AI-assisted clinical decision support | Intelligence | Observability, auditability, and accountability standards met | Pilot validation with practitioner oversight |
| Multi-region clinical trial support | Breadth | Configuration coverage assessment confirms generalizability | Pilot validation with trial-active organizations |

### 7.2 Future Scope Discipline

Future scope candidates are pursued only through the intake process defined in PRODUCT_BIBLE Section 17.4. The intake process includes workflow analysis, configuration coverage assessment, module gap assessment, validation, and catalogue amendment. A future scope candidate that bypasses the intake process is not added to the catalogue; a candidate that completes the intake process becomes a supported capability and moves from future scope to in-scope. The discipline is the operational expression of Core Principle P-8 and Strategic Theme T-3.

### 7.3 Future Scope Exclusions

Future scope candidates that are inconsistent with the platform's identity, principles, or values are not pursued. A candidate that would require source-level customization, that would require data captivity, that would require patient-data monetization, that would compete with healthcare providers, or that would compromise the platform's independence posture is excluded from future scope, regardless of commercial appeal. The exclusion is recorded so that future Product Councils do not reconsider the candidate without explicit amendment of the principles that exclude it.

---

## 8. Assumptions

Assumptions are the conditions that the platform's scope takes as given, without which the scope would not be credible. Assumptions are not guarantees; they are conditions that, if they fail, require scope revision through the scope change process defined in Section 11. Assumptions are reviewed annually through the Product Council; an assumption that has failed or is at material risk of failure is escalated to the Product Council for adjudication.

### 8.1 Market Assumptions

| Assumption | Description | Impact if Assumption Fails |
|---|---|---|
| Healthcare organizations continue to operate on multi-year planning cycles | The decade horizon assumes healthcare organizations make decisions on multi-year horizons | If organizations shift to short-term optimization, the platform's decade-horizon value proposition weakens |
| Healthcare organizations continue to accept SaaS delivery | The SaaS posture assumes customer acceptance of multi-tenant SaaS | If customers reject SaaS in favour of self-hosted deployment, the platform's delivery model requires revision |
| Regulatory frameworks continue to converge on open standards | The open standards posture assumes regulatory frameworks support open standards | If regulators mandate proprietary standards, the platform's open standards posture requires regional adaptation |
| Healthcare practitioner shortages continue | The practitioner time focus assumes practitioner time remains scarce | If practitioner shortages ease, the practitioner time value proposition weakens but does not disappear |

### 8.2 Technology Assumptions

| Assumption | Description | Impact if Assumption Fails |
|---|---|---|
| Multi-tenant SaaS remains a viable delivery model | The platform's delivery model assumes multi-tenant SaaS remains operationally and commercially viable | If multi-tenant SaaS becomes non-viable, the platform's delivery model requires fundamental revision |
| Configuration-driven adaptation remains feasible | The configuration-driven posture assumes the platform's configuration surface can express customer operational reality | If configuration surfaces cannot express emerging operational reality, customization pressure increases |
| Open healthcare integration standards continue to evolve | The open standards posture assumes open healthcare integration standards continue to evolve | If open standards stagnate, the platform's integration catalogue requires proprietary augmentation |
| Offline-first synchronization remains feasible at scale | The offline-first posture assumes deterministic conflict resolution remains feasible at scale | If offline-first synchronization becomes non-viable at scale, the platform's reach posture requires revision |

### 8.3 Organizational Assumptions

| Assumption | Description | Impact if Assumption Fails |
|---|---|---|
| The Ibn Hayan team sustains healthcare literacy | The healthcare-native posture assumes the team maintains healthcare literacy as a hiring and development criterion | If healthcare literacy erodes, the platform's healthcare-native posture weakens |
| The Product Council sustains governance discipline | The scope discipline assumes the Product Council sustains governance discipline across market cycles | If governance discipline erodes, scope creep accumulates and the platform's coherence degrades |
| Investors sustain decade-horizon patience | The decade horizon assumes investors sustain patience across market cycles | If investor patience erodes, the platform's investment posture requires revision |
| Customers sustain configuration acceptance | The configuration-driven posture assumes customers accept configuration over customization | If customers demand customization, the platform's customer selection criteria require revision |

### 8.4 Assumption Governance

Assumptions are reviewed annually through the Product Council. Each assumption is assessed for continued validity; an assumption that has failed or is at material risk of failure is escalated, with the scope consequences documented. Assumption failure does not automatically trigger scope change; it triggers scope review, with the scope change process (Section 11) applied if the scope consequence is material. Assumption governance is the operational mechanism by which the platform's scope remains credible across the decade horizon.

---

## 9. Dependencies

Dependencies are the external conditions on which the platform's scope depends. Dependencies are distinct from assumptions in that dependencies are relationships with external parties or external standards, while assumptions are conditions the platform takes as given. Dependencies are reviewed annually; a dependency that has failed or is at material risk of failure is escalated to the Product Council.

### 9.1 External Standards Dependencies

| Dependency | Description | Scope Consequence if Dependency Fails |
|---|---|---|
| Open healthcare integration standards | The platform's integration catalogue depends on the continued evolution of open healthcare integration standards | If standards fail to evolve, the platform's integration catalogue requires proprietary augmentation or regional forking |
| Open clinical coding systems | The platform's clinical coding depends on the continued availability of open clinical coding systems | If coding systems become proprietary, the platform's clinical coding requires licensing or regional adaptation |
| Open regulatory reporting frameworks | The platform's regulatory reporting depends on the continued openness of regulatory reporting frameworks | If frameworks become closed, the platform's regulatory reporting requires regional adaptation |
| Accessibility standards | The platform's accessibility posture depends on the continued evolution of accessibility standards | If standards regress, the platform's accessibility posture requires strengthening beyond the standard |

### 9.2 Partner Dependencies

| Dependency | Description | Scope Consequence if Dependency Fails |
|---|---|---|
| Implementation partners | The platform's onboarding depends on implementation partners for selected customer segments | If partner capacity erodes, onboarding time increases and the platform's reach weakens |
| Training partners | The platform's role-based training depends on training partners for selected customer segments | If partner capacity erodes, training pathway coverage weakens and customer operational maturity slows |
| Integration partners | The platform's integration catalogue depends on integration partners for selected integration surfaces | If partner capacity erodes, integration catalogue coverage weakens |
| Regional partners | The platform's regional adaptation depends on regional partners for regulatory framework adaptation | If regional partner capacity erodes, regional adaptation coverage slows |

### 9.3 Regulatory Dependencies

| Dependency | Description | Scope Consequence if Dependency Fails |
|---|---|---|
| Regional regulatory frameworks | The platform's regional scope depends on the stability of regional regulatory frameworks | If frameworks change unpredictably, regional adaptation requires continuous revision |
| Data residency regulations | The platform's multi-region tenancy depends on the stability of data residency regulations | If regulations tighten, the platform's tenancy model requires revision |
| Clinical safety regulations | The platform's clinical decision support depends on the stability of clinical safety regulations | If regulations tighten, the platform's intelligence posture requires revision |
| Audit and compliance regulations | The platform's audit posture depends on the stability of audit and compliance regulations | If regulations tighten, the platform's audit surface requires extension |

### 9.4 Dependency Governance

Dependencies are reviewed annually through the Product Council. Each dependency is assessed for continued viability; a dependency that has failed or is at material risk of failure is escalated, with the scope consequences documented. Dependency failure does not automatically trigger scope change; it triggers scope review, with the scope change process applied if the scope consequence is material. Dependency governance is the operational mechanism by which the platform's scope remains viable across the decade horizon.

---

## 10. Constraints

Constraints are the non-negotiable conditions within which the platform's scope must be delivered. Constraints are distinct from assumptions and dependencies in that constraints are imposed on the platform rather than taken as given or relied upon. Constraints are reviewed annually; a constraint that has changed is escalated to the Product Council, with the scope consequences documented.

### 10.1 Healthcare Safety Constraints

Healthcare safety is the platform's highest-priority constraint, in keeping with Core Principle P-1 (Healthcare First) and Architectural Principle P1 (Healthcare Safety Overrides All Others). The constraint is non-negotiable; it is a floor below which the platform does not operate. The constraint governs clinical decision support design (the clinician is always the decision-maker), permission design (emergency access is explicit, audited, time-bounded, and reviewed), data practices (patient data belongs to the patient and is custodied by the provider organization under contract), and incident response (patient safety incidents are escalated and communicated with priority over commercial considerations). A scope item that cannot be delivered within this constraint is not in scope.

### 10.2 Regulatory Compliance Constraints

Regulatory compliance is a non-negotiable constraint, in keeping with the stakeholder precedence established in PRODUCT_BIBLE Section 10.6 (regulatory compliance is a floor below which the platform does not operate). The constraint governs regional adaptation (each region's regulatory framework is applied as a localization overlay), audit posture (audit completeness is 100% of consequential actions), data residency (tenant data residency is enforced per the tenant's region), and reporting (regulatory reporting is delivered per the regulatory framework in force). A scope item that cannot be delivered within this constraint is not in scope in the affected region.

### 10.3 Decade-Horizon Constraints

The decade horizon is a constraint on scope, in keeping with Core Principle P-6 (Durable Over Fashionable) and Architectural Principle P18 (Decade-Horizon Viability). The constraint governs technology choices (choices that survive technology shifts are preferred over choices that optimize for the current quarter), module boundaries (modules that are wrong on day one cannot be corrected on year five without abandoning customers, so module boundaries are conservative), and capability commitments (a capability that cannot justify a ten-year maintenance commitment is not added). A scope item that cannot be delivered within this constraint is not in scope.

### 10.4 Multi-Tenant Coherence Constraints

Multi-tenant coherence is a constraint on scope, in keeping with Core Principle P-3 (One Platform, Many Organizations) and Architectural Principle P10 (Multi-Tenancy as Default). The constraint governs adaptation mechanisms (configuration is the only mechanism; customization is excluded), code branches (no customer-specific branches are created), runtime behaviour (runtime behaviour is uniform across tenants), and module surface (modules are shared infrastructure; no module-specific databases or runtime forks are permitted). A scope item that cannot be delivered within this constraint is not in scope.

### 10.5 Configuration-Driven Constraints

Configuration-driven adaptation is a constraint on scope, in keeping with Core Principle P-2 (Configuration Before Customization) and Architectural Principle P2 (Configuration Before Customization). The constraint governs capability expression (every capability must be expressible through configuration for supported customer operations), configuration surface (the configuration surface is documented as a contract), configuration validation (every configuration change is validated against five rule categories), and configuration audit (every configuration change is recorded in an immutable audit trail). A scope item that cannot be delivered within this constraint is not in scope.

### 10.6 Resource Constraints

Resource constraints are the operational constraints within which the platform's scope must be delivered. Resource constraints include engineering capacity, operations capacity, customer success capacity, and documentation capacity. Resource constraints are reviewed quarterly; a resource constraint that has tightened is escalated, with the scope consequences documented. Resource constraints do not override the preceding constraints; they govern the rate at which scope is delivered, not the nature of the scope that is delivered.

---

## 11. Scope Change Process

The scope change process is the formal mechanism by which the platform's scope is amended. Scope changes are made through the Product Council, with the reasoning explicit and recorded in the CHANGELOG. The process is deliberately demanding; scope changes that bypass the process produce scope that is nominally adopted but operationally defective. The process is the operational expression of Strategic Theme T-3 (validated practice over hypothetical capability) and of the scope discipline established in PRODUCT_BIBLE Section 11.6.

### 11.1 Scope Change Intake

Scope change intake is the process by which a scope change is proposed. A scope change may be proposed by any member of the product team, by a customer through customer success, by a partner through the partner programme, or by a regulator through compliance. The proposal is recorded in the Product Council's intake register, with the proposer, the proposed change, the rationale, and the strategic pillar or principle the change would advance. Intake proposals are triaged by the Product Council on a quarterly cadence, with off-cycle triage for urgent proposals.

### 11.2 Scope Change Assessment

Scope change assessment is the process by which a proposed scope change is evaluated against the platform's principles, goals, and constraints. The assessment covers: alignment with the Core Principles (PRODUCT_BIBLE Section 5) and Design Principles (PRODUCT_BIBLE Section 6); advancement of the Product Goals (PRODUCT_BIBLE Section 7); consistency with the constraints (Section 10 of this document); impact on the assumptions and dependencies (Sections 8 and 9 of this document); and operational feasibility across the decade horizon. The assessment is documented and is the basis for the Product Council's decision.

### 11.3 Scope Change Decision

Scope change decisions are made by the Product Council, with the reasoning explicit. A scope change may be approved, deferred, or declined. An approved scope change is recorded in this document through amendment, with the version increment recorded in the CHANGELOG. A deferred scope change is recorded with the deferral reason and the reconsideration trigger. A declined scope change is recorded with the decline reason, so that future Product Councils do not reconsider the change without explicit amendment of the principles that were the basis for decline.

### 11.4 Scope Change Communication

Scope changes are communicated to affected stakeholders through the platform's change-management channel. Customers affected by a scope change are notified in advance, with the change, the rationale, and the impact on the customer's operations documented. Partners affected by a scope change are notified through the partner programme. The team is notified through internal channels. Communication is the operational expression of Value V-9 (documented over implicit); a scope change that is not communicated is not complete.

### 11.5 Scope Change Records

Scope change records are the immutable history of scope changes. Each record includes the proposal, the assessment, the decision, the communication, and the post-implementation review. Records are maintained for the lifetime of the platform and are the basis for audit, for retrospective analysis, and for future Product Councils' reference. The record discipline is the operational expression of Value V-7 (auditability as primitive); a scope change that is not recorded cannot be audited.

---

## 12. Scope Governance

Scope governance is the practice of managing scope across the decade horizon. Governance includes the scope change process (Section 11), the assumption and dependency governance (Sections 8.4 and 9.4), the constraint governance (Section 10), and the periodic review of scope against the vision and the principles. Scope governance is the operational mechanism by which the platform's scope remains coherent across the decade horizon.

### 12.1 Scope Governance Bodies

| Body | Composition | Cadence | Scope Governance Responsibility |
|---|---|---|---|
| Product Council | Chief Product Officer (chair), Chief Architect, Chief Medical Officer, Chief Customer Officer, Chief Compliance Officer | Quarterly, with off-cycle for urgent items | Ratification of scope changes; adjudication of scope tensions; review of assumption, dependency, and constraint status |
| Architecture Review Board | Chief Architect (chair), module owners, security leadership, SRE leadership | Monthly | Review of scope changes with architectural implications; assessment of constraint compliance |
| Customer Advisory Council | Customer representatives across tiers and regions | Semi-annually | Review of scope from customer perspective; input on scope priorities |
| Partner Advisory Council | Implementation, training, integration, and regional partners | Semi-annually | Review of scope from partner perspective; input on scope priorities |

### 12.2 Scope Governance Cadence

Scope governance operates on a layered cadence. The Product Council reviews scope quarterly, with off-cycle review for urgent items. The Architecture Review Board reviews scope changes with architectural implications monthly. The Customer Advisory Council and Partner Advisory Council review scope from their perspectives semi-annually. The annual review is the comprehensive review that revisits the entire scope against the vision and the principles, with the outcome recorded in the CHANGELOG.

### 12.3 Scope Governance Discipline

Scope governance discipline is the practice of applying the scope change process consistently, regardless of the source of the scope change proposal. A scope change proposed by the largest customer is processed through the same scope change process as a scope change proposed by the smallest customer or by a member of the product team. A scope change proposed by an executive is processed through the same scope change process as a scope change proposed by a junior engineer. The discipline is the operational expression of the scope discipline established in PRODUCT_BIBLE Section 11.6; a governance process that applies differently to different proposers is not governance.

### 12.4 Scope Governance Escalation

Scope governance escalation is the process by which scope tensions are escalated to the Product Council for adjudication. A scope tension that cannot be resolved at the team level is escalated, with the tension made explicit rather than hidden. The Product Council adjudicates the tension, with the reasoning recorded. Escalation is not a sign of governance failure; it is a sign of governance working as designed. A scope governance process that never escalates is a process that is hiding tensions, not resolving them.

### 12.5 Scope Governance Records

Scope governance records are maintained for the lifetime of the platform. Records include the Product Council's quarterly and annual review minutes, the Architecture Review Board's monthly review minutes, the Customer and Partner Advisory Councils' semi-annual review minutes, and the scope change records (Section 11.5). Records are the basis for retrospective analysis and for future Product Councils' reference.

---

## 13. Related Documents

This section lists the documents that are most directly related to the project scope, with a brief statement of the relationship. The list is not exhaustive; the full documentation framework is described in PRODUCT_BIBLE Section 1.6 and in the documentation framework's index.

### 13.1 Canonical References

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_BIBLE.md | The canonical product reference; this document elaborates PRODUCT_BIBLE Section 11 (Product Scope) and Section 12 (Out of Scope) and is subordinate to them | PRODUCT_BIBLE Sections 11, 12, 17, 18, 19, 25, 31 |
| SYSTEM_ARCHITECTURE.md | The canonical architectural reference; the scope's architectural constraints are realized through the principles defined in SYSTEM_ARCHITECTURE | SYSTEM_ARCHITECTURE Sections 4, 5, 10, 15, 23, 24 |

### 13.2 Sibling Documents in 00_PROJECT

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_VISION.md | Defines the destination toward which the scope is the boundary | PROJECT_VISION Section 1 (Vision Statement) |
| BUSINESS_MODEL.md | Defines the commercial mechanism that funds the scope's delivery | BUSINESS_MODEL Section 1 (Business Model Canvas) |
| PRODUCT_ROADMAP.md | Translates the scope into a sequenced delivery plan | PRODUCT_ROADMAP Section 4 (Phase 1 Scope (MVP)) and Section 5 (Phase 2 Scope (Growth)) |
| CHANGELOG.md | Records the scope's evolution | CHANGELOG Section 4 (Release History) |

### 13.3 Downstream Documents

| Document | Relationship | Cross-Reference |
|---|---|---|
| MODULE_ARCHITECTURE.md | The architectural expression of the in-scope module catalogue | MODULE_ARCHITECTURE |
| CONFIGURATION_ARCHITECTURE.md | The architectural expression of the configuration-driven constraint | CONFIGURATION_ARCHITECTURE |
| ADR-001 through ADR-006 | The architectural decision records that ratify the architectural posture on which the scope's constraints rest | docs/12_ADR/ |

### 13.4 Using This Document

This document is the authoritative reference for the project scope. Readers seeking the canonical product reference should consult PRODUCT_BIBLE.md; readers seeking the canonical architectural reference should consult SYSTEM_ARCHITECTURE.md. Readers seeking specific release commitments should consult PRODUCT_ROADMAP.md; readers seeking specific commercial terms should consult BUSINESS_MODEL.md. This document does not duplicate the content of those documents; it elaborates the scope and cross-references them.
