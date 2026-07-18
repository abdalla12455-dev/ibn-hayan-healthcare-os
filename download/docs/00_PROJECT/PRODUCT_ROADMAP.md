# Ibn Hayan Healthcare Operating System
## Product Roadmap

| Field | Value |
|---|---|
| Document Title | Product Roadmap |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Strategic Roadmap Reference |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a roadmap change is ratified |
| Audience | Product leadership, engineering leadership, customer-facing teams, partners, customers under non-disclosure, executive sponsors |
| Scope | Roadmap overview, methodology, quarterly milestones, release themes, prioritization framework, release cadence, dependency map, risk considerations, resource allocation, roadmap communication, roadmap archive |
| Out of Scope | Implementation detail, source code, database schemas, API contracts, commercial pricing detail (see BUSINESS_MODEL), scope boundaries (see PROJECT_SCOPE) |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. This document elaborates the roadmap established in PRODUCT_BIBLE Section 31 (Long-Term Roadmap) and Section 30 (Future Vision); it does not redefine them. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with headings only) |

---

## Table of Contents

1. Roadmap Overview
2. Roadmap Methodology
3. Quarterly Milestones
4. Release Themes
5. Feature Prioritization Framework
6. Release Cadence
7. Dependency Map
8. Risk Considerations
9. Resource Allocation
10. Roadmap Communication
11. Roadmap Archive
12. Related Documents

---

## 1. Roadmap Overview

The product roadmap is the operational mechanism by which the Ibn Hayan platform pursues the decade horizon established in PROJECT_VISION Section 1.2 and PRODUCT_BIBLE Section 2.2. The roadmap translates the future vision (PRODUCT_BIBLE Section 30) into a sequenced plan over a multi-year horizon, with the first year committed, the second year planned, and the third year indicative. This section provides the roadmap overview; subsequent sections elaborate the methodology, milestones, themes, prioritization, cadence, dependencies, risks, resources, communication, and archive.

### 1.1 Purpose of the Roadmap

The purpose of the roadmap is to give the product team, customers, partners, and investors a shared, sequenced view of Ibn Hayan's direction. The roadmap is not a feature commitment; specific feature commitments are made only for capabilities that are at General Availability, not for capabilities in the roadmap. The roadmap is a statement of the order in which capabilities will be pursued, with the order justified by reference to the strategic pillars (PROJECT_VISION Section 4), the product goals (PRODUCT_BIBLE Section 7), and the constraints (PROJECT_SCOPE Section 10). The roadmap is the bridge between the decade-horizon vision and the quarter-by-quarter work of the Ibn Hayan product team.

### 1.2 Roadmap Horizon

The roadmap is stated on a three-year rolling horizon, with the third year being indicative and the first year being committed, as established in PRODUCT_BIBLE Section 31.2. Capabilities beyond the three-year horizon are stated in the future vision (PRODUCT_BIBLE Section 30) but not in the roadmap. The horizon structure is reproduced below; the commitment level governs how the Product Council, customers, and partners should interpret each horizon.

| Horizon | Description | Commitment Level | Tracking Cadence |
|---|---|---|---|
| Year 1 | Capabilities committed for the next 12 months | Committed; tracked quarterly | Quarterly Product Council review |
| Year 2 | Capabilities planned for the 12–24 month window | Planned; tracked semi-annually | Semi-annual Product Council review |
| Year 3 | Capabilities indicated for the 24–36 month window | Indicative; tracked annually | Annual Product Council review |
| Year 4+ | Capabilities indicated beyond 36 months | Stated in future vision; not in roadmap | Annual future vision review |

### 1.3 Roadmap and the Strategic Pillars

The roadmap is organized by the strategic pillars established in PROJECT_VISION Section 4: SP-1 (Healthcare-Native Foundation), SP-2 (Configuration-Driven Adaptability), SP-3 (Unified Multi-Tenant Platform), SP-4 (Global-Regional Adaptability), SP-5 (Operational Intelligence), SP-6 (Open Data, Open Standards), and SP-7 (Practitioner Partnership). Each capability in the roadmap advances one or more pillars; the pillar assignment governs prioritization when capabilities compete for the same resources. The pillars are pursued simultaneously and in tension with each other; the Product Council adjudicates tensions that cannot be resolved at the team level.

### 1.4 Roadmap and the Phases

The roadmap is aligned with the project scope phases established in PROJECT_SCOPE Sections 4 through 6: Phase 1 (MVP, Year 1), Phase 2 (Growth, Years 2–3), Phase 3 (Scale, Years 3–5). The phase alignment ensures that the roadmap's capability commitments are consistent with the scope's customer, region, and edition coverage. A capability that is in the roadmap for Year 1 is, by definition, in Phase 1 scope; a capability that is in the roadmap for Year 2 or Year 3 is in Phase 2 or Phase 3 scope respectively. The phase alignment is the operational mechanism by which the roadmap and the scope remain consistent.

### 1.5 Roadmap Discipline

Roadmap discipline is the practice of maintaining the roadmap's commitment levels. A Year 1 capability that is not on track for delivery is escalated to the Product Council, with the slippage documented and the response (recovery, deferral, or cancellation) recorded. A Year 2 capability that is being pulled forward into Year 1 is ratified through the Product Council, with the pulling-forward justified by reference to the strategic pillars and the product goals. A Year 3 capability that is being pushed back is recorded, with the push-back justified by reference to the dependency map (Section 7) and the risk considerations (Section 8). The discipline is the operational expression of Strategic Theme T-3 (validated practice over hypothetical capability) and of Value V-9 (documented over implicit).

---

## 2. Roadmap Methodology

Roadmap methodology is the practice by which the roadmap is constructed, revised, and governed. The methodology is deliberately demanding; a roadmap that is constructed casually cannot be relied upon across the decade horizon. The methodology is the operational expression of the roadmap governance established in PRODUCT_BIBLE Section 31.6.

### 2.1 Roadmap Construction

Roadmap construction begins with the strategic pillars (PROJECT_VISION Section 4) and the product goals (PRODUCT_BIBLE Section 7). For each pillar, the Ibn Hayan product team identifies the capabilities required to advance the pillar over the three-year horizon. Capabilities are then sequenced based on: dependency order (capabilities that unblock other capabilities are sequenced earlier); validation order (capabilities that have completed validation are sequenced earlier than capabilities that have not); resource availability (capabilities are sequenced within the resource envelope defined in Section 9); and strategic priority (capabilities that advance multiple pillars or multiple goals are sequenced earlier than capabilities that advance only one). The sequencing is documented and is the basis for the quarterly milestones in Section 3.

### 2.2 Roadmap Revision

Roadmap revision is the process by which the roadmap is updated. The roadmap is reviewed quarterly for Year 1, semi-annually for Year 2, and annually for Year 3 and beyond. Revisions are made through the Product Council, with the reasoning explicit and recorded in the CHANGELOG. Revisions that weaken the roadmap's commitment to a strategic pillar are escalated, with the weakening justified by a change in the platform's context that makes the commitment no longer appropriate. Revisions that strengthen the roadmap's commitment to a strategic pillar are preferred, provided the strengthening is operationally credible and not rhetorical.

### 2.3 Roadmap Governance Bodies

Roadmap governance is exercised through the bodies established in PROJECT_SCOPE Section 12.1: the Product Council (quarterly, with off-cycle for urgent items), the Architecture Review Board (monthly), the Customer Advisory Council (semi-annually), and the Partner Advisory Council (semi-annually). Each body has a distinct roadmap governance responsibility: the Product Council ratifies roadmap changes; the Architecture Review Board reviews roadmap changes with architectural implications; the Customer Advisory Council provides customer-perspective input; the Partner Advisory Council provides partner-perspective input. The governance discipline is the operational expression of Value V-7 (auditability as primitive); a roadmap change that is not governed cannot be audited.

### 2.4 Roadmap and the Intake Process

Roadmap capabilities are introduced through the intake process defined in PRODUCT_BIBLE Section 17.4 and elaborated in PROJECT_SCOPE Section 11.1. The intake process includes workflow analysis, configuration coverage assessment, module gap assessment, validation, and catalogue amendment. A capability that bypasses the intake process is not added to the roadmap; a capability that completes the intake process is added to the roadmap at the appropriate horizon. The discipline is the operational expression of Core Principle P-8 (Verified Practice Over Hypothetical Capability) and of Strategic Theme T-3 (validated practice over hypothetical capability).

### 2.5 Roadmap and Customer Commitments

The roadmap is not a sales commitment, as established in PRODUCT_BIBLE Section 31.6. Customer-facing commitments are made only for capabilities that are at General Availability, not for capabilities in the roadmap. Sales commitments that bypass roadmap governance are excluded by PRODUCT_BIBLE Section 12.5. A customer who requests a commitment for a roadmap capability is engaged through the customer advisory council or through the Ibn Hayan customer success team, with the engagement recorded; the customer does not receive a sales commitment for the capability until the capability reaches General Availability. The discipline protects the roadmap's integrity and the Ibn Hayan decade-horizon posture.

---

## 3. Quarterly Milestones

Quarterly milestones are the specific capabilities committed for each quarter of Year 1, with the capabilities organized by strategic pillar. The milestones are reproduced and elaborated from PRODUCT_BIBLE Section 31.3, with the elaboration providing the additional detail required for quarterly tracking. The milestones are subject to quarterly revision through the Product Council; revisions are recorded in the CHANGELOG.

### 3.1 Year 1 Quarterly Milestones

The following capabilities are committed for Year 1 of the roadmap. The list is indicative of the platform's priorities and is subject to quarterly revision through the Product Council.

| Quarter | Capability | Pillar | Phase | Validation Status |
|---|---|---|---|---|
| Q1 | Completion of validated localization packs for MENA-3, MENA-4 | SP-4 | Phase 1 | Validation in progress; targeted for Q1 completion |
| Q1 | Specialty module extension — Cardiology (initial) | SP-1, SP-7 | Phase 1 | Pilot validation in progress |
| Q2 | Completion of validated localization packs for MENA-5 | SP-4 | Phase 1 | Validation in progress; targeted for Q2 completion |
| Q2 | Enhanced offline synchronization for low-connectivity regions | SP-3, SP-4 | Phase 1 | Pilot validation in progress |
| Q2 | Specialty module extension — Paediatrics (initial) | SP-1, SP-7 | Phase 1 | Pilot validation in progress |
| Q3 | Configuration governance enhancements (sandbox-to-production promotion) | SP-2 | Phase 1 | Pilot validation in progress |
| Q3 | Audit reporting enhancements for regulatory compliance | SP-2, SP-6 | Phase 1 | Pilot validation in progress |
| Q3 | Specialty module extension — Obstetrics (initial) | SP-1, SP-7 | Phase 1 | Pilot validation in progress |
| Q4 | Patient portal (within data sovereignty constraints) | SP-2, SP-7 | Phase 1 | Pilot validation in progress |
| Q4 | Initial operational intelligence for clinical decision support | SP-5 | Phase 1 | Pilot validation in progress |

### 3.2 Milestone Tracking

Milestone tracking is the process by which the Product Council monitors progress against the quarterly milestones. Each milestone has a designated owner (product leadership, engineering leadership, or customer success leadership, depending on the milestone's nature), a defined completion criterion, and a defined tracking cadence. Milestone status is reported at the quarterly Product Council review, with slippage documented and the response (recovery, deferral, or cancellation) ratified. Milestone tracking is the operational expression of Value V-7 (auditability as primitive); a milestone that is not tracked cannot be audited.

### 3.3 Milestone Slippage Response

Milestone slippage is the failure of a milestone to meet its committed quarter. Slippage is escalated to the Product Council at the quarterly review, with the slippage documented and the response ratified. The response options are: recovery (additional resources or reprioritization to deliver the milestone in the committed quarter, where feasible); deferral (moving the milestone to a later quarter, with the deferral recorded and the implications for dependent milestones assessed); or cancellation (removing the milestone from the roadmap, with the cancellation recorded and the implications for the strategic pillar assessed). Slippage is not treated as a failure of the team; it is treated as information that informs the next quarterly revision.

### 3.4 Milestone and the Decade Horizon

Milestone slippage is interpreted in the context of the decade horizon. A milestone that slips by a quarter but advances the decade horizon is a success; a milestone that meets its committed quarter but compromises the decade horizon is a defect. The decade horizon is the test the Product Council applies when interpreting milestone slippage; a slippage that improves the platform's decade-horizon posture is preferred over an on-time delivery that compromises the posture. The discipline is the operational expression of Strategic Theme T-5 (decade-horizon over quarter).

---

## 4. Release Themes

Release themes are the recurring patterns that govern the content of each release. Themes are distinct from strategic pillars in that pillars are multi-year programs of work, while themes are the patterns that recur across releases within and across pillars. A release typically advances multiple themes; the themes provide the vocabulary for communicating the release's content to customers and partners.

### 4.1 Theme Catalogue

| Theme | Description | Pillars Advanced | Customer-Facing Vocabulary |
|---|---|---|---|
| Depth expansion | Deepening specialty coverage and specialty-specific configuration overlays | SP-1, SP-7 | "Deeper support for [specialty]" |
| Breadth expansion | Extending the module catalogue and the configuration surface | SP-2 | "New module: [module]" or "Extended configuration: [surface]" |
| Reach expansion | Extending regional adaptation coverage | SP-4 | "Now available in [region]" or "Localization for [regulatory framework]" |
| Intelligence integration | Integrating operational intelligence, with observability, auditability, and accountability | SP-5 | "Intelligence for [workflow]" or "Decision support for [specialty]" |
| Open standards extension | Extending the integration catalogue and the open data format coverage | SP-6 | "Integration with [standard]" or "Open data for [data class]" |
| Configuration governance | Extending the configuration governance framework | SP-2 | "Configuration governance: [capability]" |
| Operational maturity | Extending the platform's operational posture (observability, audit, incident response) | SP-3 | "Operational enhancement: [capability]" |
| Practitioner experience | Extending the practitioner-facing capability (latency, accessibility, workflow depth) | SP-7 | "Practitioner experience: [enhancement]" |

### 4.2 Theme and Release Composition

Each release is composed of capabilities that advance one or more themes. A release that advances only one theme is narrow; a release that advances multiple themes is broad. The Product Council balances narrow and broad releases based on the platform's priorities and the customer base's needs. A typical Year 1 release advances three to five themes; a typical Year 2 release advances four to six themes; a typical Year 3 release advances five to seven themes, reflecting the platform's growing maturity and the increasing breadth of the customer base.

### 4.3 Theme and Customer Communication

Release themes are the customer-facing vocabulary for releases. Customers receive release communications organized by theme, with each theme's capabilities summarized and the implications for the customer's operations documented. The theme-based communication discipline is the operational expression of Value V-9 (documented over implicit); a release that is communicated by theme is more navigable than a release that is communicated by feature list.

### 4.4 Theme Evolution

Release themes evolve as the platform matures. In the early phases, depth expansion and reach expansion are dominant themes, reflecting the platform's need to deepen specialty coverage and extend regional coverage. As the platform matures, intelligence integration and open standards extension become more dominant, reflecting the platform's need to integrate operational intelligence and extend the integration catalogue. Theme evolution is reviewed annually through the Product Council, with the evolution recorded in the CHANGELOG.

---

## 5. Feature Prioritization Framework

The feature prioritization framework is the discipline by which the product team decides which capabilities to pursue, in what order, and with what resources. The framework is the operational expression of the strategic themes established in PROJECT_VISION Section 8 and of the product goals established in PRODUCT_BIBLE Section 7. The framework is not a formula; it is a discipline that produces consistent prioritization decisions across the product team.

### 5.1 Prioritization Criteria

Capabilities are prioritized against the following criteria, each of which is grounded in a principle, value, or goal established in PRODUCT_BIBLE or PROJECT_VISION.

| Criterion | Description | Grounding |
|---|---|---|
| Strategic pillar advancement | The capability advances one or more strategic pillars | PROJECT_VISION Section 4 |
| Product goal advancement | The capability advances one or more product goals | PRODUCT_BIBLE Section 7 |
| Configuration coverage | The capability extends configuration coverage of customer operational reality | Goal G-2 |
| Practitioner time reclaimed | The capability reclaims practitioner time | Goal G-1 |
| Validated practice | The capability has been validated against real operations | Principle P-8, Theme T-3 |
| Decade-horizon durability | The capability is durable across the decade horizon | Value V-6, Principle P-6 |
| Patient safety advancement | The capability advances patient safety | Value V-10, Principle P-1 |
| Open standards alignment | The capability aligns with open standards | Value V-4, Principle P-4 |
| Dependency unblocking | The capability unblocks other capabilities | Section 7 |
| Resource efficiency | The capability is deliverable within the resource envelope | Section 9 |

### 5.2 Prioritization Process

Capabilities are scored against the prioritization criteria, with each criterion scored on a documented scale. The scores are weighted, with the weights reflecting the platform's current priorities (for example, configuration coverage is weighted more heavily in the early phases, while intelligence integration is weighted more heavily in the later phases). The weighted scores are the basis for the Product Council's prioritization decisions, with the reasoning explicit and recorded. The process is not mechanical; the Product Council may override the weighted scores with documented reasoning, but the override is the exception, not the rule.

### 5.3 Prioritization Discipline

Prioritization discipline is the practice of applying the framework consistently, regardless of the source of the capability proposal. A capability proposed by the largest customer is prioritized through the same framework as a capability proposed by the smallest customer or by a member of the product team. A capability proposed by an executive is prioritized through the same framework as a capability proposed by a junior engineer. The discipline is the operational expression of the scope discipline established in PRODUCT_BIBLE Section 11.6; a prioritization framework that applies differently to different proposers is not a framework.

### 5.4 Prioritization and the Decade Horizon

Prioritization is made on the decade horizon, in keeping with Strategic Theme T-5 (decade-horizon over quarter). A capability that optimizes the current quarter at the cost of the decade horizon is deprioritized, regardless of short-term commercial appeal. A capability that advances the decade horizon is prioritized, even if the short-term return is modest. The discipline is the operational expression of the decade test established in PROJECT_VISION Section 6.5.

### 5.5 Prioritization Records

Prioritization decisions are recorded, with the capability, the scores, the weights, the decision, and the reasoning documented. Records are maintained for the lifetime of the platform and are the basis for retrospective analysis and for future Product Councils' reference. The record discipline is the operational expression of Value V-7 (auditability as primitive); a prioritization decision that is not recorded cannot be audited.

---

## 6. Release Cadence

Release cadence is the rhythm at which the platform releases capability to customers. The cadence is governed by the validated-practice discipline (Strategic Theme T-3), by the configuration-driven discipline (Value V-2), and by the multi-tenant coherence discipline (Value V-3). The cadence is reviewed annually through the Product Council.

### 6.1 Cadence Structure

The platform's release cadence is layered, with different cadences serving different purposes.

| Cadence | Description | Customer Impact | Communication |
|---|---|---|---|
| Continuous delivery | Bug fixes, security patches, minor operational improvements | Transparent to customers; no action required | Release notes; customer-visible operational status |
| Monthly release | Minor capability additions, configuration surface extensions, module enhancements | Visible to customers; opt-in for new capability; no migration required | Release notes; customer success communication |
| Quarterly release | Major capability additions, new modules, new localization packs | Visible to customers; opt-in for new capability; configuration migration may be required | Release notes; customer success communication; webinar |
| Annual release | Strategic capability additions, edition catalogue changes, major architectural evolution | Visible to customers; opt-in for new capability; planning may be required | Release notes; customer success communication; webinar; executive briefing |

### 6.2 Cadence and Configuration Governance

The release cadence is integrated with the configuration governance framework established in PRODUCT_BIBLE Section 22.7. Configuration changes that accompany a release are tested in sandbox tenants before application to production tenants, with the testing documented and the results auditable. Configuration changes that affect regulatory alignment are reviewed by compliance officers before application. Configuration changes that affect operational workflow are communicated to affected users before application. The integration is the operational expression of Value V-2 (configuration before customization) and of Value V-7 (auditability as primitive).

### 6.3 Cadence and Multi-Tenant Coherence

The release cadence preserves multi-tenant coherence, in keeping with Value V-3 (one platform, many organizations). All customers receive the same release; customers do not negotiate custom release schedules. Customers may defer adoption of new capability within documented windows, but they may not defer bug fixes or security patches beyond the documented windows. The discipline is the operational expression of the SaaS posture established in PRODUCT_BIBLE Section 15.2; a multi-tenant platform that permits customer-specific release schedules is not multi-tenant.

### 6.4 Cadence and the Decade Horizon

The release cadence is sustained across the decade horizon, in keeping with Strategic Theme T-5 (decade-horizon over quarter). The cadence is not accelerated to meet short-term commercial pressure; the cadence is not decelerated to accommodate short-term resource pressure. The discipline is the operational expression of the investment posture established in PRODUCT_BIBLE Section 14.6; a cadence that is adjusted for short-term pressure erodes the platform's decade-horizon credibility.

### 6.5 Cadence and Customer Communication

Each release is communicated to customers in advance, with the release content, the customer impact, the migration requirements (if any), and the support pathway documented. Communication is the operational expression of Value V-9 (documented over implicit); a release that is not communicated is not complete. Customer communication is organized by release theme (Section 4.3), with each theme's capabilities summarized and the implications for the customer's operations documented.

---

## 7. Dependency Map

The dependency map is the documented set of dependencies between roadmap capabilities. The map is the basis for sequencing decisions (capabilities that unblock other capabilities are sequenced earlier) and for slippage response (slippage in a capability with downstream dependencies has broader implications than slippage in a capability without downstream dependencies). The map is reviewed quarterly through the Product Council.

### 7.1 Internal Capability Dependencies

Internal capability dependencies are the dependencies between roadmap capabilities within the platform. The dependencies are documented as a directed acyclic graph, with each capability's dependencies explicit and the dependency direction documented. The full dependency graph is maintained by the product team; the high-level dependencies are summarized below.

| Capability | Depends On | Unblocks |
|---|---|---|
| Specialty module extension — Cardiology (full) | Specialty module extension — Cardiology (initial); Configuration governance enhancements | Advanced analytics for cardiology |
| Patient portal (full) | Patient portal (initial); Configuration governance enhancements; Identity & Access enhancements | Patient portal extensions; Population health management |
| Operational intelligence (advanced) | Initial operational intelligence; Audit reporting enhancements | Predictive analytics; AI-assisted clinical documentation |
| Population health management module | Patient portal (full); Advanced analytics module | Research support module |
| AI-assisted clinical documentation | Operational intelligence (advanced); Configuration governance enhancements | Enhanced patient portal capabilities |

### 7.2 External Standards Dependencies

External standards dependencies are the dependencies on external standards, reproduced from PROJECT_SCOPE Section 9.1. The dependencies govern the sequencing of capabilities that depend on the evolution of external standards; a capability that depends on a standard that has not yet evolved cannot be sequenced earlier than the standard's evolution.

### 7.3 Partner Dependencies

Partner dependencies are the dependencies on partners, reproduced from PROJECT_SCOPE Section 9.2. The dependencies govern the sequencing of capabilities that depend on partner capacity; a capability that depends on partner capacity that is not yet available cannot be sequenced earlier than the partner capacity.

### 7.4 Regulatory Dependencies

Regulatory dependencies are the dependencies on regulatory frameworks, reproduced from PROJECT_SCOPE Section 9.3. The dependencies govern the sequencing of capabilities that depend on regulatory approval or regulatory framework adaptation; a capability that depends on regulatory approval that has not yet been granted cannot be sequenced earlier than the approval.

### 7.5 Dependency Map Governance

The dependency map is reviewed quarterly through the Product Council. Each dependency is assessed for continued viability; a dependency that has failed or is at material risk of failure is escalated, with the implications for dependent capabilities documented. Dependency failure does not automatically trigger capability slippage; it triggers capability review, with the slippage response (Section 3.3) applied if the dependency failure has material implications for the dependent capability.

---

## 8. Risk Considerations

Risk considerations are the documented risks to the roadmap's delivery. Risks are distinct from dependencies in that risks are uncertainties that may affect delivery, while dependencies are relationships that must be in place for delivery. Risks are reviewed quarterly through the Product Council, with erosion in risk posture treated as a strategic risk.

### 8.1 Risk Catalogue

| Risk | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Healthcare literacy erosion | Erosion of healthcare literacy in the team | Medium | High (compromises healthcare-native posture) | Hiring discipline; healthcare literacy as a hiring criterion; ongoing training |
| Configuration framework investment erosion | Erosion of investment in the configuration framework | Low | High (compromises configuration-driven posture) | Investment posture discipline; quarterly review |
| Operational rigour erosion | Erosion of operational rigour (observability, audit, incident response) | Low | High (compromises auditability as primitive) | Investment posture discipline; quarterly review |
| Customer mix concentration | Concentration of revenue in a small number of large customers | Medium | Medium (compromises commercial sustainability) | Customer mix monitoring; expansion into additional customer segments |
| Regional adaptation delay | Delay in regional adaptation for a target region | Medium | Medium (compromises reach expansion) | Regional partner engagement; regional adaptation roadmap review |
| External standards delay | Delay in the evolution of an external standard the platform depends on | Medium | Medium (compromises dependent capabilities) | Standards body engagement; capability re-sequencing |
| Regulatory framework change | Change in a regional regulatory framework | Medium | Medium (compromises regional adaptation) | Regulatory monitoring; regional adaptation roadmap review |
| Intelligence governance gap | Gap in the governance framework for operational intelligence | Low | High (compromises observability, auditability, accountability) | Intelligence governance framework development; intelligence capability gating |
| Multi-tenant coherence erosion | Erosion of multi-tenant coherence through customer-specific pressure | Low | High (compromises one platform, many organizations) | Customer selection discipline; configuration-driven discipline |
| Documentation investment erosion | Erosion of investment in documentation | Low | High (compromises documented-before-shipped) | Investment posture discipline; documentation as part of the product |

### 8.2 Risk Posture

The platform's risk posture is conservative, in keeping with Strategic Theme T-5 (decade-horizon over quarter). Risks with high impact are treated as strategic risks, regardless of likelihood; the platform does not accept high-impact risks even when the likelihood is low. Risks with medium impact are treated as operational risks, with mitigation plans documented and tracked. Risks with low impact are treated as monitoring risks, with periodic review and escalation if the risk materializes.

### 8.3 Risk and the Decade Horizon

Risk posture is interpreted in the context of the decade horizon. A risk that is acceptable in the short term but unacceptable across the decade horizon is treated as unacceptable; a risk that is unacceptable in the short term but acceptable across the decade horizon is treated as acceptable, provided the short-term unacceptability is bounded. The decade horizon is the test the Product Council applies when interpreting risk posture; a risk posture that optimizes the short term at the cost of the decade horizon is a defect, not a saving.

### 8.4 Risk Governance

Risk governance is exercised through the Product Council's quarterly review. Each risk is assessed for likelihood, impact, and mitigation status; changes in risk posture are documented and the response (mitigation, acceptance, or escalation) ratified. Risk governance is the operational expression of Value V-7 (auditability as primitive); a risk that is not governed cannot be audited.

---

## 9. Resource Allocation

Resource allocation is the discipline by which the product team's resources are assigned to roadmap capabilities. The allocation is governed by the activity investment bias established in BUSINESS_MODEL Section 8.3 and by the strategic pillars. The allocation is reviewed quarterly through the Product Council.

### 9.1 Allocation Structure

Resource allocation is organized by strategic pillar, with each pillar receiving a defined share of the resource envelope. The allocation is reviewed annually and adjusted to reflect the platform's current priorities; the adjustment is recorded in the CHANGELOG.

| Pillar | Allocation Posture | Year 1 Indicative Share | Year 2 Indicative Share | Year 3 Indicative Share |
|---|---|---|---|---|
| SP-1 Healthcare-Native Foundation | Sustained | High | High | Medium |
| SP-2 Configuration-Driven Adaptability | Sustained | High | High | High |
| SP-3 Unified Multi-Tenant Platform | Sustained | Medium | Medium | Medium |
| SP-4 Global-Regional Adaptability | Growing | Medium | High | High |
| SP-5 Operational Intelligence | Growing | Low | Medium | High |
| SP-6 Open Data, Open Standards | Sustained | Medium | Medium | Medium |
| SP-7 Practitioner Partnership | Sustained | Medium | Medium | Medium |

### 9.2 Allocation and the Activity Investment Bias

Resource allocation is consistent with the activity investment bias established in BUSINESS_MODEL Section 8.3. Engineering, operations, customer success, compliance, and documentation resources are protected through market cycles; reductions in these categories during downturns are treated as strategic risks and are escalated to the Product Council. Sales and marketing resources are managed to the growth ambition, with reductions acceptable during downturns. The discipline is the operational expression of Strategic Theme T-5 (decade-horizon over quarter).

### 9.3 Allocation and Slippage

Resource allocation is adjusted in response to milestone slippage, in keeping with the slippage response established in Section 3.3. A milestone that is being recovered receives additional resources, with the reallocation documented. A milestone that is being deferred releases resources, with the reallocation to other capabilities documented. A milestone that is being cancelled releases resources, with the reallocation to other pillars or capabilities documented. The discipline is the operational expression of Value V-7 (auditability as primitive); a reallocation that is not documented cannot be audited.

### 9.4 Allocation Discipline

Resource allocation discipline is the practice of allocating resources in alignment with the strategic pillars and the activity investment bias. An allocation that is inconsistent with the pillars or the bias is escalated to the Product Council, with the inconsistency made explicit rather than hidden. The discipline is the operational expression of the scope discipline established in PRODUCT_BIBLE Section 11.6; an allocation that protects short-term convenience at the cost of long-term capability is a defect, not a saving.

### 9.5 Allocation Records

Resource allocation decisions are recorded, with the pillar, the capability, the resource type, the allocation amount, and the reasoning documented. Records are maintained for the lifetime of the platform and are the basis for retrospective analysis and for future Product Councils' reference. The record discipline is the operational expression of Value V-7 (auditability as primitive); an allocation that is not recorded cannot be audited.

---

## 10. Roadmap Communication

Roadmap communication is the discipline by which the roadmap is communicated to stakeholders. Communication is governed by the stakeholder engagement discipline established in PRODUCT_BIBLE Section 10.7 and by the customer feedback loop established in BUSINESS_MODEL Section 7.3. Communication is the operational expression of Value V-9 (documented over implicit).

### 10.1 Communication Audiences

Roadmap communication is organized by audience, with each audience receiving a distinct communication tailored to its interest.

| Audience | Communication | Cadence | Owner |
|---|---|---|---|
| Customers (under non-disclosure) | Roadmap briefing; theme-based capability summary; customer impact assessment | Quarterly | Customer success leadership |
| Partners | Roadmap briefing; partner impact assessment; partner opportunity assessment | Quarterly | Partner programme leadership |
| Executive sponsors and investors | Strategic roadmap review; pillar advancement; financial implications | Quarterly | Commercial leadership |
| Product team | Full roadmap; quarterly milestones; theme advancement; resource allocation | Quarterly | Product leadership |
| Engineering team | Full roadmap; quarterly milestones; dependency map; risk considerations | Quarterly | Engineering leadership |
| Customer advisory council | Roadmap review; customer-perspective input; prioritization input | Semi-annually | Customer success leadership |
| Partner advisory council | Roadmap review; partner-perspective input; prioritization input | Semi-annually | Partner programme leadership |

### 10.2 Communication Discipline

Roadmap communication is governed by the roadmap's commitment levels (Section 1.2). Year 1 committed capabilities are communicated as committed; Year 2 planned capabilities are communicated as planned; Year 3 indicative capabilities are communicated as indicative. Capabilities beyond the three-year horizon are not communicated as roadmap commitments; they are communicated as future vision items, with the future vision discipline (PRODUCT_BIBLE Section 30.7) applied. The discipline is the operational expression of the roadmap discipline established in Section 1.5; a communication that misrepresents the commitment level erodes the roadmap's integrity.

### 10.3 Communication and Customer Commitments

Roadmap communication is not a sales commitment, as established in PRODUCT_BIBLE Section 31.6. A customer who receives a roadmap briefing does not receive a commitment for a roadmap capability; the customer receives information about the platform's direction. Sales commitments that bypass roadmap governance are excluded by PRODUCT_BIBLE Section 12.5. The discipline protects the roadmap's integrity and the platform's decade-horizon posture.

### 10.4 Communication Records

Roadmap communications are recorded, with the audience, the communication content, the date, and the feedback received documented. Records are maintained for the lifetime of the platform and are the basis for retrospective analysis and for future Product Councils' reference. The record discipline is the operational expression of Value V-7 (auditability as primitive); a communication that is not recorded cannot be audited.

### 10.5 Communication and Feedback

Roadmap communication is a two-way channel. Feedback received through communication is recorded, triaged, and either reflected in product decisions or explicitly declined with recorded reasoning. The decline-with-reasoning discipline is the operational expression of the customer feedback loop established in BUSINESS_MODEL Section 7.3; a customer whose feedback is silently ignored loses trust in the platform, while a customer whose feedback is explicitly declined with reasoning retains trust even when the decision is unfavourable.

---

## 11. Roadmap Archive

The roadmap archive is the immutable history of the roadmap's evolution. The archive is the basis for retrospective analysis, for audit, and for future Product Councils' reference. The archive is maintained for the lifetime of the platform and is the operational expression of Value V-7 (auditability as primitive).

### 11.1 Archive Structure

The archive is structured by version, with each version recording the roadmap's state at a point in time. Each archive entry includes the version, the date, the substantive change from the prior version, the reasoning, and the Product Council's ratification.

| Version | Date | Substantive Change | Reasoning |
|---|---|---|---|
| v0.1.0 | 2026-07-18 | Initial skeleton with section headings; no substantive roadmap content | Documentation framework establishment |
| v1.0.0 | 2026-10-15 | Initial substantive roadmap; Year 1 committed capabilities; Year 2 planned capabilities; Year 3 indicative capabilities | PRODUCT_BIBLE v1.0.0 ratification |
| v1.1.0 | 2027-01-20 | Sharpened roadmap themes; added dependency map; added risk considerations | PRODUCT_BIBLE v1.1.0 identity and differentiators pass |
| v2.0.0 | 2027-06-10 | Full restatement aligned with PRODUCT_BIBLE v2.0.0; strengthened strategic pillar alignment; added resource allocation framework | PRODUCT_BIBLE v2.0.0 full redo |
| v2.0.1 | 2027-09-15 | Cross-reference alignment with downstream documents; clarified commitment levels; added communication discipline | Documentation framework downstream alignment wave |

### 11.2 Archive Discipline

Archive discipline is the practice of maintaining the archive's immutability. Archive entries are not modified after creation; corrections are made through new archive entries, with the correction referencing the original entry. The discipline is the operational expression of Value V-7 (auditability as primitive); an archive that is modified cannot be audited.

### 11.3 Archive and Retrospective Analysis

The archive is the basis for retrospective analysis. The Product Council reviews the archive annually, with the analysis examining: the roadmap's accuracy (how often committed capabilities were delivered as committed); the roadmap's responsiveness (how often the roadmap was revised in response to changing context); and the roadmap's discipline (how often the roadmap's commitment levels were respected). The analysis is documented and is the basis for roadmap methodology refinement.

### 11.4 Archive and Audit

The archive is the basis for audit. Auditors review the archive to verify that roadmap changes were ratified through the Product Council, that the reasoning was documented, and that the changes were communicated to affected stakeholders. The archive is the operational expression of Value V-7 (auditability as primitive); an audit that cannot verify the roadmap's evolution cannot demonstrate the platform's governance discipline.

### 11.5 Archive and Future Product Councils

The archive is the basis for future Product Councils' reference. A future Product Council considering a roadmap change reviews the archive to understand the path that produced the current roadmap, the reasoning that governed prior changes, and the lessons learned from prior slippage, deferral, and cancellation. The archive is the operational expression of Value V-9 (documented over implicit); a Product Council that does not consult the archive is making decisions without the benefit of history.

---

## 12. Related Documents

This section lists the documents that are most directly related to the product roadmap, with a brief statement of the relationship. The list is not exhaustive; the full documentation framework is described in PRODUCT_BIBLE Section 1.6 and in the documentation framework's index.

### 12.1 Canonical References

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_BIBLE.md | The canonical product reference; this document elaborates PRODUCT_BIBLE Section 31 (Long-Term Roadmap) and Section 30 (Future Vision) and is subordinate to them | PRODUCT_BIBLE Sections 7, 17.4, 30, 31 |
| SYSTEM_ARCHITECTURE.md | The canonical architectural reference; the roadmap's architectural dependencies are realized through the principles defined in SYSTEM_ARCHITECTURE | SYSTEM_ARCHITECTURE Sections 4, 5, 10, 23, 24 |

### 12.2 Sibling Documents in 00_PROJECT

| Document | Relationship | Cross-Reference |
|---|---|---|
| PRODUCT_VISION.md | Defines the destination toward which the roadmap is the path | PROJECT_VISION Section 1 (Vision Statement) |
| PROJECT_SCOPE.md | Defines the boundary within which the roadmap operates; the roadmap's phases align with the scope's phases | PROJECT_SCOPE Sections 4, 5, 6 |
| BUSINESS_MODEL.md | Defines the commercial mechanism that funds the roadmap's delivery | BUSINESS_MODEL Section 1 (Business Model Canvas) |
| CHANGELOG.md | Records the roadmap's evolution | CHANGELOG Section 4 (Release History) |

### 12.3 Downstream Documents

| Document | Relationship | Cross-Reference |
|---|---|---|
| MODULE_ARCHITECTURE.md | The architectural expression of the module catalogue whose evolution the roadmap governs | MODULE_ARCHITECTURE |
| CONFIGURATION_ARCHITECTURE.md | The architectural expression of the configuration surface whose extension the roadmap governs | CONFIGURATION_ARCHITECTURE |
| ADR-001 through ADR-006 | The architectural decision records that ratify the architectural posture on which the roadmap's dependencies rest | docs/12_ADR/ |

### 12.4 Using This Document

This document is the authoritative reference for the product roadmap. Readers seeking the canonical product reference should consult PRODUCT_BIBLE.md; readers seeking the canonical architectural reference should consult SYSTEM_ARCHITECTURE.md. Readers seeking specific scope boundaries should consult PROJECT_SCOPE.md; readers seeking specific commercial terms should consult BUSINESS_MODEL.md. This document does not duplicate the content of those documents; it elaborates the roadmap and cross-references them.
