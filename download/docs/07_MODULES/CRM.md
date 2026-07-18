# Ibn Hayan Healthcare Operating System
## CRM Module

| Field | Value |
|---|---|
| Document Title | CRM Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, marketing leads, patient experience officers, compliance officers |
| Scope | Lead management, opportunity pipeline, campaign management, multi-channel outreach, activity tracking, conversion tracking, source attribution, patient acquisition cost, lifetime value, referral tracking, and reputation management for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, clinical care delivery, billing transaction execution, notification dispatch (owned by Notifications module) |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Lead Management
5. Patient Acquisition
6. Marketing Campaigns
7. Loyalty Programs
8. Patient Feedback
9. User Roles
10. Workflows
11. Data Models
12. Integrations
13. Configuration
14. Permissions
15. Reports
16. API Surface
17. Future Enhancements
18. Related Documents

---

## 1. Module Overview

### 1.1 Module Identity and Strategic Position

The CRM module (M08 in this documentation suite, aligned with the CRM bounded context BC11 as catalogued in SYSTEM_ARCHITECTURE Section 7.2) is the patient relationship and acquisition engine of the Ibn Hayan Healthcare Operating System. Every interaction a prospective or current patient has with the healthcare organization outside of clinical care — a marketing touchpoint, a referral, a feedback submission, a loyalty program enrollment — flows through this module. The CRM module is the operational bridge between the organization's growth objectives and the patient's journey from prospect to engaged patient to loyal advocate.

Ibn Hayan treats CRM as a strategic administrative concern rather than as a peripheral marketing utility. This positioning has direct architectural consequences: CRM is owned by a single bounded context, accessed by every module that needs patient relationship information through published contracts, and integrated with the patient identity governed by the Patients module. A lead converted to a patient in Ibn Hayan is a tracked, attributed, and audited transition — the lead's acquisition source, campaign touchpoints, and conversion path are preserved as part of the patient's relationship history, supporting lifetime value analysis and acquisition cost attribution.

### 1.2 Purpose and Business Value

The CRM module exists to attract, acquire, engage, and retain patients, in a way that respects patient privacy, regulatory constraints on healthcare marketing, and the operational realities of healthcare delivery. Business value is realized through four mechanisms. First, lead management reduces the cost of patient acquisition by tracking leads through the conversion funnel and surfacing bottlenecks for intervention. Second, campaign management improves marketing ROI by attributing patient conversions to specific campaigns, allowing the organization to invest in campaigns that produce patients rather than in campaigns that produce only impressions. Third, loyalty and referral management increases patient lifetime value by recognizing and rewarding engaged patients. Fourth, reputation management surfaces patient feedback for operational improvement and protects the organization's reputation through timely response.

For customers, the CRM module is the growth engine: a healthcare organization that cannot attract new patients cannot grow, and an organization that cannot retain existing patients cannot sustain growth. For regulators, the CRM module is the source of truth for healthcare marketing compliance — consent for marketing communication, attribution of marketing claims, and patient privacy in outreach. For patients, the CRM module — through its participation in communication preferences and feedback channels — shapes the patient's experience as a customer of the healthcare organization.

### 1.3 Bounded Context Alignment

The CRM module aligns one-to-one with the CRM bounded context BC11, as catalogued in SYSTEM_ARCHITECTURE Section 7.2 and elaborated in MODULE_ARCHITECTURE Section 2.2. BC11 owns lead lifecycle, opportunity pipeline, campaign management, activity tracking, conversion attribution, and loyalty program management; it does not own patient identity (BC01), notification dispatch (BC14), or billing (BC07). The CRM bounded context is a customer in customer-supplier relationships with the Patient, Notifications, Configuration, and Localization contexts; it is a supplier in customer-supplier relationships with the Reporting context.

This alignment is stable. Per Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8), the CRM bounded context is not reorganized to accommodate features. New CRM-related capabilities — for example, a new campaign channel, a new loyalty program mechanic, a new feedback collection mechanism — are accommodated within the existing context through configuration, not through structural change.

### 1.4 Module Composition

The CRM module is composed of the following capability areas, each elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: lead capture and scoring, opportunity pipeline, campaign management, multi-channel outreach, activity tracking, conversion tracking, source attribution, patient acquisition cost analysis, lifetime value analysis, referral tracking, and reputation management. The module does not own patient identity, notification dispatch, or clinical care delivery; it owns the relationship and acquisition workflows that surround the patient's clinical journey. The module participates in workflows owned by other modules through its published event and query contracts.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the lead, opportunity, or campaign as organizing concepts; capabilities that do not share these organizing concepts belong in other modules. Multi-channel outreach, for example, is managed by the CRM module in terms of audience selection and message cadence, but the actual dispatch is owned by the Notifications module, because dispatch is a channel-and-delivery concern, not a relationship concern. This separation prevents the CRM module from accumulating channel-specific logic that would compromise its contract stability over time.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The CRM module owns lead lifecycle from capture through conversion or disqualification. It owns opportunity pipeline management — tracking opportunities through stages from initial contact through conversion to a registered patient. It owns campaign management — defining campaigns, targeting audiences, scheduling touchpoints, and measuring campaign performance. It owns multi-channel outreach coordination — selecting audiences, defining message cadence, and triggering dispatch through the Notifications module. It owns activity tracking — recording every interaction between the organization and a lead or patient, including calls, emails, portal messages, appointments, and feedback. It owns conversion attribution — assigning credit for patient conversions to the campaigns and touchpoints that influenced them. It owns patient acquisition cost analysis and lifetime value analysis. It owns loyalty program management, referral tracking, and reputation management.

The module also owns the configuration surface for CRM-related behaviour, including lead scoring rules, campaign templates, audience segmentation rules, attribution models, loyalty program rules, and feedback survey templates. Configuration is layered per the model in PRODUCT_BIBLE Section 22.3 and SYSTEM_ARCHITECTURE Section 15.2, with platform defaults inherited by edition, tenant, facility, department, care team, and session overrides where applicable.

### 2.2 Out of Scope

The CRM module does not own patient identity, demographics, or clinical history; these belong to the Patient bounded context (BC01), queried at lead conversion time to create a patient record. It does not own notification dispatch — the CRM module triggers outreach through events, but the Notifications module owns the channel selection, message rendering, and delivery machinery. It does not own billing transactions or financial records; these belong to the Billing bounded context (BC07), with the CRM module consuming billing events to compute lifetime value. It does not own appointment scheduling; this belongs to the Scheduling bounded context (BC06), with the CRM module consuming scheduling events to track patient engagement.

The module also does not own marketing content authoring (a creative capability that may use external tools), marketing analytics platforms (which may integrate through the Integration module), or audit storage (that belongs to the Audit bounded context). The CRM module publishes events that the Audit module records, but it does not store audit records itself.

### 2.3 Lead and Patient Relationship Continuum

The lead and patient relationship is a continuum in the Ibn Hayan platform, not a discontinuous transition. A lead is a person who has expressed interest in the organization's services but has not yet become a patient; a patient is a person who has been registered and has received or is scheduled to receive care. The CRM module owns the lead lifecycle through conversion; the Patients module owns the patient lifecycle thereafter. The conversion event — when a lead becomes a patient — is a tracked, attributed, and audited transition that preserves the lead's acquisition history as part of the patient's relationship record.

This continuum positioning imposes responsibilities on the CRM module. The module's data must respect patient privacy regulations — lead data is subject to general data protection regulations, while patient data is subject to healthcare-specific privacy regulations, with the conversion event triggering the regulatory regime change. The module's audit must be complete, because marketing communications and conversion events are subject to regulatory scrutiny (consent for marketing, attribution of claims, patient privacy in outreach). The module's attribution must be defensible, because acquisition cost analysis and ROI calculations drive marketing investment decisions.

### 2.4 Multi-Tenant CRM Isolation

CRM data is tenant-isolated by default. A lead captured in tenant A is not visible to tenant B, even when the lead is the same natural person. Cross-tenant lead sharing is not supported — a healthcare organization operating multiple tenants maintains separate CRM data per tenant, reflecting the operational reality that marketing campaigns, lead sources, and conversion paths differ across organizations. Within a tenant, CRM data is facility-scoped where appropriate — a campaign targeting a specific facility's service area is configured with facility-level scoping, and lead activity is attributed to the facility whose marketing produced the lead.

Multi-tenant CRM isolation honors Principle P10 (Multi-Tenancy as Default, SYSTEM_ARCHITECTURE Section 4.10) and prevents the privacy complications that would arise from cross-tenant lead visibility. A lead's personal data is subject to the tenant's data protection configuration, which may differ from another tenant's configuration even when both tenants operate in the same region. Cross-tenant data flows for marketing analytics or benchmarking are handled through de-identification and aggregation, never through direct cross-tenant identity sharing.

---

## 3. Key Features

### 3.1 Lead Capture

Lead capture records the initial contact between a prospect and the organization, through any channel — website form, telephone inquiry, walk-in inquiry, referral, campaign response, social media interaction. The capture records the lead's contact information, the source of the lead (which campaign, which channel, which referrer), the lead's expressed interest, and the lead's consent for further communication. Lead capture is the entry point for every CRM workflow; a lead that is not captured cannot be tracked, nurtured, or converted. Capture validation enforces minimum information requirements and consent capture per the regulatory framework in force for the tenant.

### 3.2 Lead Scoring

Lead scoring assigns a numerical score to each lead based on the lead's characteristics and behavior, indicating the lead's likelihood of conversion. Scoring factors include demographic fit (does the lead match the organization's target patient profile?), engagement level (has the lead responded to communications, attended events, visited the website?), source quality (leads from physician referrals typically score higher than leads from online advertising), and recency of engagement (a lead engaged within the last week is more likely to convert than a lead engaged six months ago). Scoring rules are configurable per tenant, per clinic type, and per campaign.

### 3.3 Opportunity Pipeline

The opportunity pipeline manages leads through the conversion funnel, with stages representing the lead's progression toward becoming a patient. Typical stages include new lead, contacted, qualified, appointment scheduled, appointment completed, and converted (or disqualified at any stage). The pipeline is configurable per tenant, with stages, stage transitions, and stage-entry criteria tailored to the organization's sales process. Pipeline management surfaces bottlenecks — a stage where leads accumulate without progressing — for operational intervention.

### 3.4 Campaign Management

Campaign management defines, schedules, executes, and measures marketing campaigns. A campaign defines an audience (a segment of leads or patients), a message (content rendered from templates), a channel mix (email, SMS, phone, portal message), a cadence (sequence and timing of touchpoints), and success metrics (responses, conversions, ROI). Campaign execution coordinates with the Notifications module for dispatch, with the CRM module tracking responses and conversions per touchpoint. Campaign performance is measured against the success metrics, with the results feeding back into campaign optimization.

### 3.5 Multi-Channel Outreach

Multi-channel outreach coordinates communication across channels — email, SMS, telephone, postal mail, portal message, social media (where supported by Integration module adapters). The CRM module selects the audience, defines the message cadence, and triggers dispatch through the Notifications module. Channel selection per touchpoint is governed by the patient's communication preferences (owned by the Patients module), ensuring that outreach respects patient consent and channel opt-out state. Multi-channel outreach is configurable per campaign, per audience segment, and per tenant.

### 3.6 Activity Tracking

Activity tracking records every interaction between the organization and a lead or patient, creating a comprehensive activity history that informs scoring, segmentation, and personalization. Activities include inbound communications (calls received, emails received, portal messages received, form submissions), outbound communications (calls made, emails sent, portal messages sent), appointments (scheduled, completed, cancelled, no-show), and feedback submissions. Activity history is the basis for engagement scoring, for audience segmentation, and for personalization of future communications.

### 3.7 Conversion Tracking

Conversion tracking records when a lead becomes a patient, with the conversion event linking the lead's acquisition history to the new patient record. The conversion event is the most consequential CRM event — it is the moment when marketing investment produces a registered patient, and it is the basis for acquisition cost attribution and campaign ROI measurement. Conversion tracking records the conversion time, the converting campaign (where attributable), the converting touchpoint (where identifiable), and the lead's full acquisition history, preserving the attribution chain for analysis.

### 3.8 Source Attribution

Source attribution assigns credit for patient conversions to the marketing sources that influenced them. Attribution models include first-touch (credit to the first campaign that produced the lead), last-touch (credit to the most recent campaign before conversion), multi-touch (credit distributed across all campaigns in the conversion path), and weighted (credit distributed per a configurable weighting model). Attribution model selection is configurable per tenant and per analysis purpose — first-touch is useful for assessing top-of-funnel campaign effectiveness, while last-touch is useful for assessing conversion-stage campaign effectiveness.

### 3.9 Patient Acquisition Cost

Patient acquisition cost (PAC) analysis computes the average cost of acquiring a new patient, by dividing total marketing spend by the number of new patients acquired in a period. PAC is computed per channel, per campaign, and per clinic type, allowing the organization to identify the most cost-effective acquisition channels. PAC is compared to patient lifetime value (LTV) to assess marketing ROI — a channel whose PAC exceeds the LTV of the patients it produces is unprofitable and should be re-evaluated. PAC analysis is generated through the Reporting module's contracts.

### 3.10 Lifetime Value

Lifetime value (LTV) analysis computes the total revenue a patient is expected to generate over their relationship with the organization, based on the patient's historical revenue, the average patient revenue for similar patients, and the patient's expected retention period. LTV is computed per patient, per patient segment, and per clinic type, allowing the organization to identify high-value patient segments for retention investment. LTV is compared to PAC to assess marketing ROI and to inform patient acquisition strategy — a segment with high LTV justifies higher acquisition investment.

### 3.11 Referral Tracking

Referral tracking records when an existing patient refers a new patient to the organization, with the referral event linking the referring patient to the referred lead. Referrals are a particularly valuable acquisition source — referred patients typically have higher conversion rates, higher LTV, and lower acquisition costs than patients acquired through other channels. Referral tracking supports referral recognition programs (thank-you communications, loyalty program credits) and referral source analysis (which patients, which providers, which clinic types produce the most referrals).

### 3.12 Reputation Management

Reputation management collects, monitors, and responds to patient feedback — satisfaction surveys, online reviews, complaints, compliments. Feedback collection is triggered by configurable events (post-encounter survey, post-discharge survey, periodic relationship survey). Feedback monitoring surfaces negative feedback for timely response, with escalation paths for serious complaints. Feedback response is owned by the CRM module in terms of routing and tracking, with the actual response authored by the appropriate operational role. Reputation management is critical for patient retention and for public reputation protection.

---

## 4. Lead Management

### 4.1 Lead Capture Channels

Lead capture channels include web forms (on the organization's website or patient portal), telephone inquiries (captured by reception or call center staff), walk-in inquiries (captured by reception), referrals (from physicians, patients, or partners), campaign responses (form submissions, call-backs, email replies), and third-party lead providers (where integrated through the Integration module). Each channel has its own capture form, its own validation rules, and its own attribution metadata. Channel configuration is per tenant, per facility, and per clinic type, allowing different channels to be active for different operational contexts.

### 4.2 Lead Qualification

Lead qualification evaluates a captured lead against configurable criteria to determine whether the lead is worth pursuing — does the lead's expressed interest match the organization's services, does the lead's location fall within the organization's service area, does the lead's insurance coverage match the organization's accepted plans, does the lead have the financial means to afford the services (where relevant). Qualified leads enter the opportunity pipeline; unqualified leads are recorded with the disqualification reason for analysis. Qualification criteria are configurable per tenant, per clinic type, and per campaign, allowing different criteria for different operational contexts.

### 4.3 Lead Nurturing

Lead nurturing engages qualified leads with targeted communications designed to move them through the conversion funnel — educational content about the organization's services, invitations to events or webinars, offers of consultations or screenings, reminders of the lead's expressed interest. Nurturing cadence and content are configurable per lead segment, per campaign, and per lead score, with high-scoring leads receiving more intensive nurturing than low-scoring leads. Nurturing activities are recorded in the lead's activity history, with the history informing future nurturing personalization.

### 4.4 Lead Conversion

Lead conversion records the transition from lead to patient, with the conversion event creating a patient record (through the Patients module's contracts) and linking the lead's acquisition history to the new patient record. Conversion is triggered by the patient's first appointment booking, by the patient's first registration, or by manual initiation from a CRM user. The conversion event records the conversion time, the converting campaign (where attributable), the converting touchpoint (where identifiable), and the lead's full acquisition history. Conversion is audited, with the audit trail supporting acquisition cost attribution and campaign ROI analysis.

Conversion is a one-way operation in Ibn Hayan — once a lead has converted to a patient, the lead record is not reactivated. If a converted patient later disengages and is targeted by a new acquisition campaign, the patient is treated as a reactivation target (an existing patient with reactivation outreach), not as a new lead. This distinction preserves the integrity of acquisition cost attribution and prevents double-counting of patients in marketing analytics. The reactivation workflow is owned by the CRM module, drawing on patient history from the Patients and Billing modules to identify reactivation candidates.

---

## 5. Patient Acquisition

### 5.1 Acquisition Source Tracking

Acquisition source tracking records the source of every new patient — which campaign, which channel, which referrer produced the lead that converted. Source tracking is the foundation of acquisition cost analysis and campaign ROI measurement. Source data is captured at lead capture time and is preserved through the conversion event, ensuring that the patient's acquisition history is not lost when the lead becomes a patient. Source tracking uses standardized source codes (per the tenant's configuration) to enable cross-campaign and cross-channel analysis.

### 5.2 Acquisition Cost Computation

Acquisition cost computation divides total marketing spend by the number of new patients acquired in a period, producing the average cost per acquisition. Spend is tracked per campaign and per channel, allowing per-campaign and per-channel PAC computation. Spend tracking is manual (entered by marketing staff) or automated (integrated with the marketing spend system through the Integration module). PAC is compared across campaigns and channels to identify the most cost-effective acquisition sources, with the results informing future marketing investment decisions.

### 5.3 Conversion Rate Analysis

Conversion rate analysis computes the percentage of leads that convert to patients, by source, by campaign, by stage, and by score. Conversion rate is a primary measure of marketing effectiveness — a campaign that produces many leads but few conversions is less effective than a campaign that produces fewer leads but more conversions. Conversion rate analysis surfaces bottlenecks in the conversion funnel — stages where leads accumulate without progressing — for operational intervention. Conversion rate is trended over time to identify improvement or degradation in marketing effectiveness.

### 5.4 Acquisition Channel Optimization

Acquisition channel optimization uses PAC, conversion rate, and LTV data to identify the most effective acquisition channels and to reallocate marketing investment accordingly. Optimization is a continuous process — channel performance changes over time as patient behaviour, competitive dynamics, and channel economics evolve. Optimization recommendations are surfaced through the Reporting module's analytical reports, with the actual investment decisions made by marketing leadership within the organization's marketing governance framework.

Channel optimization in healthcare is constrained by regulatory considerations that do not apply in other industries. Healthcare marketing is subject to restrictions on claims substantiation, on patient privacy in audience targeting, and on inducements for clinical services. A channel that produces high conversion rates through practices that violate these restrictions is not a viable optimization target, regardless of its measured performance. Channel optimization in the CRM module surfaces both performance metrics and compliance metrics, ensuring that optimization decisions consider both dimensions.

---

## 6. Marketing Campaigns

### 6.1 Campaign Definition

Campaign definition specifies the campaign's audience (a segment of leads or patients selected by configurable criteria), message (content rendered from templates), channel mix (email, SMS, phone, portal message), cadence (sequence and timing of touchpoints), duration (start and end dates), and success metrics (responses, conversions, ROI). Campaign definitions are versioned, with effective-dating for changes; a campaign change takes effect on the configured date, with already-dispatched touchpoints preserved. Campaign definitions are validated for compliance with healthcare marketing regulations — consent requirements, claims substantiation, regulated content restrictions.

### 6.2 Audience Segmentation

Audience segmentation selects the leads or patients who will receive a campaign's communications, based on configurable criteria — demographic attributes, acquisition source, engagement history, appointment history, clinical history (where consent permits), loyalty program membership, and feedback history. Segmentation criteria are validated for privacy compliance — a segment that includes patients who have not consented to marketing communication is rejected at validation time. Segmentation is performed at campaign execution time, ensuring that the audience reflects the most current data.

### 6.3 Campaign Execution

Campaign execution dispatches the campaign's communications according to the defined cadence, coordinating with the Notifications module for actual dispatch. Execution is automated, with the CRM module publishing dispatch-trigger events at the configured times and the Notifications module consuming the events and dispatching the communications through the appropriate channels. Execution is monitored — a campaign that produces delivery failures, opt-out requests, or negative feedback is surfaced for intervention. Execution is audited, with each dispatched communication recorded for compliance and ROI analysis.

### 6.4 Campaign Performance Measurement

Campaign performance measurement evaluates the campaign against its success metrics — responses received, conversions produced, ROI achieved. Performance is measured at the campaign level and at the touchpoint level, allowing identification of which touchpoints within a campaign were most effective. Performance data feeds back into campaign optimization — high-performing touchpoints are emphasized in future campaigns, low-performing touchpoints are revised or eliminated. Campaign performance is reported through the Reporting module's analytical reports.

Performance measurement distinguishes between leading indicators (responses, engagement, opt-ins) that signal future conversions and lagging indicators (conversions, ROI) that confirm past performance. Leading indicators are available within hours or days of campaign execution; lagging indicators may take weeks or months to materialize, particularly for healthcare services with long conversion cycles (a prospective obstetrics patient may take months to convert from lead to patient). Performance reporting surfaces both indicator types, allowing marketers to assess short-term performance without losing sight of long-term outcomes.

---

## 7. Loyalty Programs

### 7.1 Loyalty Program Definition

Loyalty program definition specifies the program's eligibility criteria (which patients qualify), earning rules (how patients earn loyalty points or status), reward catalog (what patients can redeem), and program tiers (if the program has tiered benefits). Loyalty programs in healthcare are subject to regulatory constraints in many jurisdictions — programs that provide incentives for specific clinical services may be prohibited as inducements, and programs that discriminate between patient populations may be prohibited as discrimination. Program definitions are validated for regulatory compliance before activation.

### 7.2 Earning and Redemption

Loyalty program earning records when a patient earns loyalty points or status, based on configurable triggers — appointment completion, referral submission, feedback submission, program anniversary. Earning is automated, with the CRM module consuming events from peer modules (appointment completion from the Scheduling module, referral submission from the CRM module's own referral tracking) and recording the earning event. Redemption records when a patient redeems loyalty points for a reward, with the redemption event debiting the patient's point balance and triggering the reward fulfillment workflow.

### 7.3 Tier Management

Tier management tracks the patient's loyalty program tier (where the program has tiered benefits), with tier progression based on cumulative earning over a defined period. Tier benefits may include enhanced access (priority scheduling, extended portal hours), enhanced communications (personalized content, exclusive offers), or enhanced recognition (anniversary acknowledgements, milestone celebrations). Tier management is governed by the program's tier rules, with tier progression and regression automated based on the patient's earning activity.

### 7.4 Loyalty Program Compliance

Loyalty program compliance ensures the program operates within the regulatory framework in force for the tenant's region. Compliance review evaluates the program's earning rules (do they incentivize clinically appropriate behaviour?), reward catalog (do rewards constitute prohibited inducements?), tier benefits (do benefits discriminate between patient populations?), and communication practices (do program communications respect patient consent and privacy?). Compliance review is performed by the compliance officer role before program activation and at configurable intervals thereafter. Compliance findings may require program modification or suspension.

The regulatory landscape for healthcare loyalty programs varies significantly by region. Some jurisdictions prohibit any financial incentive for healthcare services; others permit loyalty programs with restrictions on reward type and value; others permit loyalty programs broadly with disclosure requirements. The CRM module's loyalty program capability is configured per region through the Localization module's configuration surface, with the configuration expressing the regional regulatory constraints. A tenant operating in a jurisdiction that prohibits healthcare loyalty programs configures the capability as disabled, and the module's contracts return not-available responses for loyalty program operations.

---

## 8. Patient Feedback

### 8.1 Feedback Collection

Feedback collection gathers patient feedback through configurable channels — post-encounter surveys (sent through the Notifications module after encounter completion), periodic relationship surveys (sent at configurable intervals), feedback forms on the patient portal, and unsolicited feedback (complaints, compliments, suggestions received through any channel). Collection is triggered by configurable events and is subject to patient consent — a patient who has opted out of feedback surveys is not surveyed. Collection is recorded with the feedback's source, time, and content, with sensitive feedback (complaints involving clinical care) routed to clinical governance for review.

### 8.2 Feedback Monitoring

Feedback monitoring surfaces feedback for timely response, with negative feedback escalated per the tenant's feedback response policy. Monitoring categorizes feedback by sentiment (positive, neutral, negative), by topic (clinical care, operational experience, billing, facilities), and by severity (routine complaint, serious complaint, critical incident). Critical incidents are escalated immediately to senior operational and clinical leadership. Monitoring is performed by operational staff (typically the administrator role) with compliance officer oversight for serious complaints.

### 8.3 Feedback Response

Feedback response manages the organization's reply to patient feedback, with response owned by the appropriate operational role — clinical care feedback by clinical leadership, operational feedback by facility administration, billing feedback by billing management. Response is tracked from initiation through resolution, with response time monitored against the tenant's response time targets. Response is recorded in the feedback's activity history, with the history informing future operational improvement. Feedback that cannot be resolved at the operational level is escalated to executive leadership.

### 8.4 Reputation Analytics

Reputation analytics aggregates feedback data for trend analysis and operational improvement. Analytics include satisfaction score trends (Net Promoter Score, Customer Satisfaction Score, similar metrics), feedback volume by topic and sentiment, response time and resolution rate, and feedback-driven operational improvements (process changes implemented in response to feedback themes). Analytics are generated through the Reporting module's contracts, with the CRM module providing the underlying feedback data. Analytics inform operational decisions and are reviewed by executive leadership at configurable intervals.

Reputation analytics also includes external reputation signals — online reviews on third-party platforms, social media mentions, and search engine reputation indicators — where these signals are available through the Integration module's adapters. External signals are correlated with internal feedback to identify patterns and to assess the organization's reputation holistically. External reputation data is subject to the regulatory framework in force for the tenant's region; some jurisdictions restrict the use of external reputation data in patient acquisition decisions, and the CRM module's configuration surface expresses these restrictions.

---

## 9. User Roles

### 9.1 Roles That Interact with CRM

The following roles interact with CRM through the CRM module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2.

| Role Code | Role | Typical CRM-Related Responsibilities |
|---|---|---|
| R06 | Receptionist | Lead capture at walk-in; lead qualification |
| R07 | Scheduler | Lead conversion at appointment booking |
| R08 | Biller | Lifetime value data contribution |
| R09 | Administrator | Campaign oversight; loyalty program management; feedback monitoring |
| R10 | Compliance officer | Marketing compliance review; loyalty program compliance |
| R11 | HR manager | Marketing staff training oversight |
| R12 | Executive | Acquisition cost and ROI review; strategic marketing oversight |
| R13 | System administrator | Tenant configuration of CRM behaviour |
| R14 | Integration account | System-to-system lead sync and campaign dispatch |

### 9.2 Permission Categories

Permissions on CRM resources are defined at the action level on the CRM resource, per PRODUCT_BIBLE Section 21.2. Read permissions include viewing lead, viewing campaign, viewing activity history, viewing feedback. Write permissions include creating lead, updating lead, creating campaign, recording activity, responding to feedback. Execute permissions include lead scoring, audience segmentation, conversion attribution. Administer permissions include configuring scoring rules, configuring campaign templates, configuring loyalty program rules.

### 9.3 Marketing Compliance Authority

Marketing compliance authority governs who may approve campaigns, loyalty programs, and outreach communications that are subject to regulatory compliance review. Authority is granted selectively — typically to the compliance officer role and to senior marketing leadership — and is recorded with the approval decision, the approval scope, and the approval rationale. Compliance authority is reviewed periodically, with frequent compliance findings triggering investigation into the marketing processes that necessitate them. Marketing compliance authority is governed by the Identity & Access module's contracts, with the CRM module enforcing the approval scope and recording the audit event.

---

## 10. Workflows

### 10.1 Workflows the Module Triggers

The CRM module triggers workflows in response to CRM lifecycle events. Lead capture triggers lead qualification and nurturing workflows. Lead conversion triggers patient creation (via the Patients module) and loyalty program enrollment (if applicable). Campaign execution triggers outreach dispatch (via the Notifications module). Feedback submission triggers feedback monitoring and response workflows. Referral submission triggers referral recognition and reward workflows. Conversion event triggers acquisition cost attribution and ROI computation workflows.

### 10.2 Workflows the Module Participates In

The CRM module participates in workflows owned by other modules by responding to queries and by consuming events. The Scheduling module notifies the CRM module when a lead's first appointment is booked, triggering conversion. The Patients module notifies the CRM module when a patient is registered, allowing the lead's acquisition history to be linked. The Billing module provides revenue data for lifetime value computation. The Notifications module consumes campaign-dispatch events and dispatches communications through the appropriate channels. The Reporting module consumes CRM data for acquisition cost, ROI, and reputation analytics.

The CRM module's participation in peer workflows is governed by the same contract-based communication patterns that govern every module interaction in Ibn Hayan. Direct data access across module boundaries is forbidden (Principle P4, SYSTEM_ARCHITECTURE Section 4.5); the CRM module does not query the Billing module's data store directly, but rather consumes billing events that the Billing module publishes. This separation allows each module to evolve its internal data structures without coordinating with consumers, as long as the published contracts are honored.

### 10.3 Audit Events Generated

The CRM module generates audit events for every consequential action, in keeping with the audit architecture defined in SYSTEM_ARCHITECTURE Section 27. Audit events include lead capture, lead qualification, lead disqualification, lead conversion, campaign creation, campaign execution, campaign dispatch, feedback submission, feedback response, loyalty program enrollment, loyalty point earning, loyalty point redemption, referral submission, and marketing consent change. Every audit event includes the actor, the action, the resource, the tenant, the scope, the previous state, the new state, the authorization basis, the result, and the context, per the audit record structure in SYSTEM_ARCHITECTURE Section 27.4.

CRM audit events are particularly important for marketing compliance and patient privacy. Every marketing communication is traceable from campaign definition through audience selection, dispatch, patient response, and conversion. The audit trail allows compliance officers and regulators to verify that marketing communications respected patient consent, that campaigns complied with healthcare marketing regulations, and that acquisition attribution is defensible. CRM audit records are immutable, append-only, and tamper-evident, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

---

## 11. Data Models

### 11.1 Core Entities

The CRM module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Lead | A prospective patient who has expressed interest |
| Opportunity | A qualified lead in the conversion pipeline |
| Campaign | A defined marketing campaign with audience, message, and cadence |
| Contact | A person who may be a lead, patient, or referrer |
| Activity | An interaction between the organization and a contact |
| Touchpoint | A single communication within a campaign |
| Conversion | The event of a lead becoming a patient |
| Source | The acquisition source of a lead |

### 11.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Lead Score records the lead's numerical score and the scoring factors. The Audience Segment defines the selection criteria for a campaign's audience. The Loyalty Program defines the program's rules, tiers, and rewards. The Loyalty Account records a patient's loyalty point balance and tier status. The Feedback record captures patient feedback with sentiment, topic, and severity. The Attribution Model defines how credit is assigned to campaigns and touchpoints. The Referral record links a referring patient to a referred lead.

### 11.3 Entity Relationships

Core entities relate to the Lead and Contact entities as the central CRM objects. A Lead references a Contact and a Source. An Opportunity references a Lead and tracks the lead's progression through pipeline stages. A Campaign references multiple Audience Segments and produces multiple Touchpoints. An Activity references a Contact and the campaign or workflow that produced it. A Conversion references a Lead and the resulting Patient (owned by the Patients module). A Touchpoint references a Campaign and a Contact. References to peer-module entities are logical identifiers, not direct data-store references (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8).

The Conversion entity is the architectural bridge between the CRM bounded context and the Patient bounded context. The Conversion references a Lead (owned by CRM) and a Patient (owned by Patients), without either module gaining direct access to the other's data store. The Lead's acquisition history is preserved in the CRM module's data store; the Patient's clinical history is preserved in the Patients module's data store; the Conversion entity links them through logical identifiers, allowing each module to honor state isolation while preserving the attribution chain required for acquisition cost analysis.

---

## 12. Integrations

### 12.1 Peer Module Integrations

The CRM module integrates with peer modules through published contracts. The Patients module is queried for patient identity at lead conversion time and is notified of patient registration events that may correspond to lead conversions. The Scheduling module notifies the CRM module of appointment bookings that may correspond to lead conversions. The Billing module provides revenue data for lifetime value computation. The Notifications module consumes campaign-dispatch events and dispatches communications through the appropriate channels. The Reporting module consumes CRM data for acquisition cost, ROI, and reputation analytics. The Configuration module provides the configuration surface for CRM behaviour. The Localization module provides regional templates for campaign content and feedback surveys.

### 12.2 External System Integrations

External system integrations are mediated by the Integration module (deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the CRM module's contracts through integration adapters that align with marketing technology interoperability patterns — lead capture from web forms and third-party lead providers, campaign dispatch through email service providers and SMS gateways, social media monitoring through social platform APIs, and marketing analytics through analytics platform integrations. The CRM module is not aware of the specific external systems; it is aware only of the Integration module's contracts.

### 12.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Synchronous command is used for lead capture and conversion where immediate confirmation is required. Synchronous query is used for audience segmentation and lead score lookup. Asynchronous event is used for CRM lifecycle events (lead capture, conversion, campaign dispatch) that peer modules consume. The outbox pattern is used for campaign-dispatch events, ensuring that communications are dispatched even in the presence of transient failures. Anticorruption layers translate between external marketing system models and the Ibn Hayan CRM model, preventing external model leakage per the context relationship pattern in SYSTEM_ARCHITECTURE Section 7.3.

---

## 13. Configuration

### 13.1 Configuration Categories

The CRM module's configuration surface is organized into the categories defined in MODULE_ARCHITECTURE Section 10.3. Behavioural configuration includes lead scoring rules, opportunity pipeline stages, campaign templates, audience segmentation rules, attribution models, loyalty program rules, and feedback survey templates. Structural configuration includes feature flags for capabilities like multi-channel outreach, loyalty programs, and referral tracking. Integration configuration includes external marketing system endpoints and credentials. Localization configuration includes campaign content templates in multiple languages and regional feedback survey formats. Security configuration includes marketing compliance authority scoping, audience segmentation privacy validation, and consent enforcement rules. Regulatory configuration includes marketing communication consent requirements, loyalty program compliance rules, and feedback retention policies.

### 13.2 Tenant-Configurable vs Platform-Configurable

The configuration surface distinguishes between tenant-configurable categories and platform-configurable categories, per MODULE_ARCHITECTURE Section 10.3. Tenant-configurable categories include lead scoring rules, campaign templates, loyalty program rules, and feedback survey templates; these may be overridden by tenant administrators within validation constraints. Platform-configurable categories include the lead state machine, the campaign execution model, the audit record structure, and the consent enforcement framework; these are reserved for the platform and may not be overridden by tenants. The distinction is enforced by the Configuration module's service and is part of the configuration schema published by the CRM module.

### 13.3 Configuration Governance

Configuration governance follows the framework defined in MODULE_ARCHITECTURE Section 10.5 and SYSTEM_ARCHITECTURE Section 8.7. Every configuration change is validated before application, audited on application, reversible through rollback, and reviewable through the audit trail. Changes that affect patient privacy — for example, a change to audience segmentation rules that includes new data categories — require compliance review. Changes that affect regulatory compliance — for example, a change to loyalty program rules — require compliance officer review. Changes that affect marketing consent — for example, a change to consent enforcement rules — require architectural review. The governance posture is documented in the module's configuration schema and is reviewed at architectural review.

The CRM module's configuration governance is particularly stringent because of the module's intersection with patient privacy regulations. A configuration change that compromises consent enforcement — for example, a change to audience segmentation that includes patients who have not consented to marketing communication — produces regulatory violations and may produce significant penalties. The module's configuration schema marks such changes as requiring architectural review, with the review conducted by the Architecture Council rather than by tenant administrators alone. This is the operational expression of Principle P1 (Healthcare Safety Overrides All Others) and Principle P13 (Auditability as Primitive) applied to marketing configuration.

---

## 14. Permissions

### 14.1 Action-Level Permissions on CRM Resources

Permissions are defined at the action level on the CRM resource, per PRODUCT_BIBLE Section 21.2. The permission matrix includes read, write, execute, and administer actions on lead, opportunity, campaign, activity, feedback, loyalty program, and referral resources. The matrix is large but stable. Direct user-permission assignment is forbidden; permissions are assigned through roles, per PRODUCT_BIBLE Section 21.3.

### 14.2 Scoping Rules

Permissions are scoped, not global, per PRODUCT_BIBLE Section 21.4. A marketing user may have write permission on campaigns at their facility without having write permission on campaigns at another facility. Scoping is by organizational unit, by facility, by department, by campaign (a marketing user may be scoped to manage specific campaigns), and by audience segment (a marketing user may be scoped to specific patient populations). Scoping is enforced at the action level; a marketing user without write permission on a specific campaign cannot modify that campaign through any surface.

### 14.3 Permission Inheritance and Marketing Compliance

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 6.6 and PRODUCT_BIBLE Section 21.5. Inheritance is explicit, documented, and auditable. Marketing compliance controls are layered on top of inheritance, requiring compliance officer approval for campaigns, loyalty programs, and outreach communications that are subject to regulatory review. Compliance approval is a separate permission from write permission — a marketing user may have write permission on campaigns but cannot activate a campaign without compliance approval, regardless of inheritance rules. Compliance approval is recorded in the audit trail, with the approver, the approval decision, and the approval rationale documented.

---

## 15. Reports

### 15.1 Operational Reports

Operational reports surface CRM activity for daily operational management. Reports include lead volume by source and channel, lead conversion rate by stage, campaign execution status, feedback queue status, loyalty program enrollment trends, and referral volume. Operational reports are generated through the Reporting module's contracts, with the CRM module providing the underlying data. Reports are typically consumed by marketing managers and operational staff for day-to-day decisions.

### 15.2 Analytical Reports

Analytical reports surface CRM trends for strategic planning. Reports include patient acquisition cost by channel and campaign, patient lifetime value by segment and clinic type, campaign ROI analysis, attribution model comparison, and reputation trend analysis. Analytical reports are generated through the Reporting module's analytical pipeline, with CRM data aggregated over time and across facilities.

### 15.3 Regulatory Reports

Regulatory reports surface CRM-related compliance evidence. Reports include marketing communication consent compliance (patients contacted without proper consent), loyalty program compliance (programs operating outside regulatory constraints), feedback incident reports (serious complaints requiring regulatory notification), and acquisition attribution audit (verifying that acquisition cost claims are defensible). Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8.

---

## 16. API Surface

### 16.1 Contract Categories

The CRM module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the CRM module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 16.2 Command Contracts

Command contracts are requests to perform an action that changes CRM state. Examples include CaptureLead, QualifyLead, DisqualifyLead, ConvertLead, CreateCampaign, ExecuteCampaign, RecordActivity, SubmitFeedback, RespondToFeedback, EnrollLoyaltyProgram, RedeemLoyaltyPoints, RecordReferral. Commands are synchronous where the caller requires immediate confirmation, asynchronous where the caller does not. Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the audit trail. Commands are idempotent where the operation supports idempotency.

### 16.3 Query Contracts

Query contracts are requests to retrieve CRM state without changing it. Examples include GetLead, GetOpportunity, GetCampaign, GetActivityHistory, GetFeedback, GetLoyaltyAccount, GetAcquisitionCostReport, GetLifetimeValueReport. Queries are synchronous, returning the requested state or a not-found response. Queries are scoped to the caller's authority — a caller without read permission on a lead receives a not-found response rather than the lead's data.

### 16.4 Event Contracts

Event contracts are notifications that something has happened in the CRM module. Examples include LeadCaptured, LeadQualified, LeadConverted, CampaignCreated, CampaignExecuted, CampaignDispatched, FeedbackSubmitted, FeedbackResponded, LoyaltyPointEarned, LoyaltyPointRedeemed, ReferralSubmitted. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which peer modules maintain their local projections of CRM data.

### 16.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the CRM module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy.

---

## 17. Future Enhancements

### 17.1 Extension Points

The CRM module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom lead scoring rules (for organizations whose scoring factors exceed the platform default), custom audience segmentation criteria (for organizations whose segmentation needs are not standard), custom attribution models (for organizations whose attribution requirements are non-standard), and custom loyalty program mechanics (for organizations whose loyalty programs exceed the platform's default rules). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

### 17.2 Module Lifecycle

The CRM module is at the General Availability stage of the module lifecycle (LC3, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6), progressing toward Mature. The module has been in General Availability since the platform's Professional edition launch. The module's contracts are stable; breaking changes follow the platform's deprecation policy, with old contracts supported through a defined transition window. Lifecycle transitions would be ratified by the Architecture Council and documented in the platform's CHANGELOG.

### 17.3 Edition Availability

The CRM module is included in selected editions of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) does not include the CRM module. The Essential edition (E1) does not include the CRM module — CRM is not a typical capability for solo and small practices. The Professional edition (E2) includes the CRM module with lead management, campaign management, and feedback management. The Enterprise edition (E3) adds loyalty program management, referral tracking, advanced attribution models, and integration with external marketing systems. Edition packaging does not modify module internals; all editions run the same code, with edition differences expressed as configuration.

### 17.4 Clinic Type Relevance

The CRM module is relevant to clinic types where patient acquisition and relationship management are operationally significant. The following clinic types have particular reliance on advanced CRM module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C1 General practice | Patient acquisition in competitive primary care markets |
| C5 Obstetrics and gynaecology | Maternity care acquisition; relationship management across pregnancy |
| C7 Dermatology | Cosmetic service acquisition; loyalty programs |
| C11 Oncology | Long-term patient relationship management; referral tracking |
| C13 Orthopaedics | Elective procedure acquisition; second-opinion outreach |
| C15 Psychiatry | Mental health service acquisition; long-term retention |
| C26 Physical therapy | Recurring care acquisition; loyalty programs |
| C28 Mental health clinic | Patient acquisition in sensitive care context; feedback management |
| C30 Long-term care facility | Family relationship management; reputation management |

### 17.5 Operational Considerations

Operational considerations for the CRM module include data volume, campaign dispatch coordination, and consent enforcement integrity. CRM data volumes can be substantial for large marketing operations — a tenant with active acquisition campaigns may capture thousands of leads per month and dispatch millions of communications per year, requiring the module's data management to handle the volume without performance degradation. Campaign dispatch coordination is critical — a tenant running multiple concurrent campaigns must ensure that the same patient is not over-communicated, with frequency capping applied across campaigns.

Consent enforcement integrity is the most critical operational concern — a marketing communication dispatched to a patient who has not consented or who has opted out is a regulatory violation that may produce significant penalties. The CRM module's consent enforcement is integrated with the Patients module's communication preference contracts, with consent checked at dispatch time and at execution time. Consent enforcement failures are monitored; a sustained failure rate triggers operational investigation and may indicate a configuration issue or a synchronization problem with the Patients module's preference data. Offline operation is supported for limited CRM functions — lead capture at events, feedback review, and campaign performance review can be performed offline, with synchronization to the central platform when connectivity is restored, in keeping with the offline-first principle (P11, SYSTEM_ARCHITECTURE Section 4.11) for non-clinical data.

---

## 18. Related Documents

### 18.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (M11 CRM, BC11)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P2, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC11 CRM)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface

### 18.2 Peer Module References

- PATIENTS.md — Patient module (BC01); receives lead conversion events; provides communication preferences
- APPOINTMENTS.md — Scheduling module (BC06); provides appointment data for conversion tracking
- BILLING.md — Billing module (BC07); provides revenue data for lifetime value computation
- DOCTORS.md — Workforce module (BC10); provides provider data for campaign attribution
- RECEPTION.md — Reception module (subset of BC06 + BC01); participates in lead capture at walk-in
- AUDIT_LOGS.md — Audit module (BC17); records every consequential CRM-related action

### 18.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit
