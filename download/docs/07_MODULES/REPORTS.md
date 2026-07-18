# Ibn Hayan Healthcare Operating System — Reports Module (M18)

| Field | Value |
|---|---|
| Document Title | Reports Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Product leaders, reporting-domain owners, healthcare operations executives, facility administrators, compliance officers, integration architects, data and analytics leaders |
| Scope | Reporting capability: report catalogue, ad-hoc reporting, scheduled reporting, dashboard composition, widget library, multi-format export, drill-down, filter configuration, saved views, sharing, subscription-based delivery, regulatory report templates |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, UI component catalogues, deployment runbooks, vendor selection, business-intelligence strategy, data-warehouse architecture |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through product or architectural governance. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Standard Reports
5. Custom Report Builder
6. Dashboards
7. Scheduled Reports
8. Export Options
9. User Roles
10. Workflows
11. Data Models
12. Integrations
13. Configuration
14. Permissions
15. API Surface
16. Future Enhancements
17. Related Documents

---

## 1. Module Overview

### 1.1 Purpose of the Module

The Reports module is the platform's deployable expression of the Reporting Layer defined in SYSTEM_ARCHITECTURE Section 28. The module exists because healthcare organizations of every size require reporting for daily operations, trend analysis, and regulatory compliance, and the discipline required to produce these reports consistently, accurately, and auditably is distinct from the discipline of the modules that produce the underlying data. Ibn Hayan treats reporting as an architectural concern with its own layer (the Reporting Layer, SYSTEM_ARCHITECTURE Section 6.7) and as a module (M18) that is the deployable surface of that layer. The module has no dedicated bounded context per SYSTEM_ARCHITECTURE Section 7.7; this is a documented deviation from the default one-to-one bounded-context-to-module mapping, reflecting the fact that reporting consumes from all other bounded contexts and does not own a domain of its own.

The module's contribution to the Ibn Hayan platform is the trustworthy, configurable, auditable production of reports across the three reporting categories defined in SYSTEM_ARCHITECTURE Section 28.2: Operational (real-time to near-real-time, from the transactional store), Analytical (near-real-time to delayed, from the analytical store), and Regulatory (defined by regulatory framework, from the audit store and transactional store). The three categories have distinct latency requirements, distinct data sources, and distinct governance postures, and the module's design honours the distinctions rather than collapsing them into a single reporting surface. The boundary between the module and the platform's Reporting Layer is explicit: the layer is the architectural commitment, the module is the deployable expression, and the two are governed together through this document and through SYSTEM_ARCHITECTURE Section 28.

### 1.2 Bounded Context Alignment

The Reports module has no dedicated bounded context, per the documented deviation in SYSTEM_ARCHITECTURE Section 7.7. The deviation reflects the fact that reporting is a consumer of bounded contexts rather than a peer bounded context: the module consumes query contracts and event streams from all other bounded contexts and produces report outputs that are not, themselves, a domain. The module is a customer of every producing bounded context (BC01 through BC19) for the data that flows into reports; a customer of the Configuration context (BC16) for the layered configuration that drives report definitions, schedules, and distribution rules; and a customer of the Audit context (BC17) for the immutable record of every report generated.

The deviation is structural rather than semantic: the module's contract surface, configuration surface, and lifecycle are governed by the same MODULE_ARCHITECTURE commitments as any other module, and the module participates in the platform's audit, configuration, and extension frameworks identically to its peers. The deviation is documented in SYSTEM_ARCHITECTURE Section 7.7 and is governed by the standard amendment process; the module's evolution follows the platform's standard evolution discipline regardless of the bounded-context deviation.

### 1.3 Business Value

The business value of the Reports module is measured in three outcomes that matter to the customer's executive team and to Ibn Hayan's auditability commitment. First, operational visibility: the module provides the dashboards and reports that managers and executives use to monitor daily operations, identify bottlenecks, and make resource-allocation decisions. Without operational visibility, the customer operates blind to performance until problems compound into incidents. Second, analytical insight: the module provides the trend reports and analytical queries that support strategic decisions — service-line expansion, capacity planning, payment-model transition. Without analytical insight, the customer's strategic decisions are made on intuition rather than evidence. Third, regulatory compliance: the module provides the regulatory reports that the customer must submit to regulators — adverse-event reports, controlled-substance reports, financial reports, audit-trail reports. Without regulatory compliance, the customer faces fines, license revocation, or operational restriction.

For Ibn Hayan itself, the module is a precondition for the platform's auditability posture (Principle P13, Auditability as Primitive). Auditability without reporting is a one-way street: the audit trail is recorded, but it cannot be queried, summarized, or demonstrated. The Reports module is the Ibn Hayan platform's mechanism for transforming the audit trail into the reports that demonstrate compliance, that surface patterns, and that drive operational improvement. The module's configuration-driven design allows the same Ibn Hayan platform to serve organizations with very different reporting requirements, honouring Principle P3 (One Platform, Many Organizations) and Principle P17 (Regional Adaptation Without Forking).

### 1.4 Position in the Platform

The Reports module sits in the Platform category. It depends on Platform modules — Identity & Access, Configuration, Audit, Localization, Integration — and on every other module that produces reportable data. The dependency direction flows the other way in a limited sense: the module's outputs (reports, dashboards) are consumed by users, not by other modules, but the module's events (report generated, report distributed) may be consumed by other modules for their own purposes (e.g., a recall-management workflow that consumes a generated recall report). The module's contract surface is consumed primarily by users through the user interface, with secondary consumption by other modules through event subscription.

The module is enabled per tenant per edition packaging rules in PRODUCT_BIBLE Section 16.7 and SYSTEM_ARCHITECTURE Section 9.7. The Reports capability is available in all editions, with the depth varying by edition: the Trial edition includes a small catalogue of standard reports; the Essential edition includes the full standard catalogue and dashboard composition; the Professional edition adds the custom report builder and scheduled distribution; the Enterprise edition adds regulatory report templates, advanced analytics, and multi-region aggregation. The variation is configuration-driven, not code-driven.

---

## 2. Module Purpose & Scope

### 2.1 In-Scope Capabilities

The module's in-scope capabilities span the full reporting lifecycle. The module records report definitions, report templates, report schedules, report subscriptions, report executions, and report outputs. The module supports a report catalogue of pre-built reports covering the common operational, analytical, and regulatory needs of healthcare organizations. The module supports an ad-hoc report builder that allows authorized users to construct custom reports from the platform's data, within the constraints of their permission scope. The module supports dashboard composition, allowing users to assemble dashboards from a widget library and to share dashboards with their peers.

The module is responsible for multi-format export — the same report can be exported in multiple formats (PDF, spreadsheet, comma-separated values, printable HTML) with the format selected by the user or by the report's distribution rule. The module supports drill-down, allowing a user to navigate from an aggregate value to the underlying records that compose the aggregate, subject to permission scoping. The module supports filter configuration, saved views, and sharing, allowing a report to be configured once and used by many users with consistent parameters. The module supports subscription-based delivery, allowing a user to subscribe to a report and receive it on a defined schedule through the configured distribution channels.

### 2.2 Out-of-Scope Items

Several reporting-adjacent concerns are explicitly out of scope. Business-intelligence strategy — the customer's decisions about what metrics matter, what targets to set, and how to use reporting for performance management — is out of scope and is the customer's responsibility. The module provides the data; the customer provides the interpretation. Data-warehouse architecture — the design and operation of the analytical store that the module consumes for analytical reporting — is out of scope and is governed by the platform's data architecture (SYSTEM_ARCHITECTURE Section 6.7 and ADR-006). The module consumes the analytical store through query contracts; it does not own the store's design or operation.

Real-time clinical-decision-support alerts — alerts to clinicians about potential medication interactions, allergy warnings, or abnormal lab values — are out of scope and are owned by the Clinical Documentation module. The boundary is the same boundary the Notifications module draws: a clinical-decision-support alert is a clinical event, not a report; the Reports module may include alert-pattern analytics in its catalogue, but the alerts themselves are produced by the clinical modules. Marketing analytics — analytics for marketing campaigns, patient-acquisition funnels, conversion rates — are out of scope and are handled through external marketing-automation platforms.

### 2.3 Edition Availability

| Edition | Code | Reports Module Availability | Capability Depth |
|---|---|---|---|
| Trial | E0 | Available | Small catalogue of standard reports; no custom builder; no scheduling. |
| Essential | E1 | Available | Full standard catalogue; dashboard composition; basic scheduling. |
| Professional | E2 | Available | Custom report builder; scheduled distribution; subscription delivery. |
| Enterprise | E3 | Available | Regulatory report templates; advanced analytics; multi-region aggregation; multi-currency. |

The depth variation reflects the operational reality that smaller practices typically rely on standard reports, while larger organizations require custom reports, regulatory templates, and multi-region aggregation. The variation is configuration-driven: the same code base serves all editions, with capability enabled per the edition's configuration.

### 2.4 Clinic Type Relevance

The 30 clinic types defined in PRODUCT_BIBLE Section 17 all benefit from the Reports module, but the relevance varies by clinic type. The table below summarizes the relevance to representative clinic types.

| Clinic Type Category | Representative Types | Reports Relevance | Report Category Emphasis |
|---|---|---|---|
| Hospital | General Hospital, Specialty Hospital, Teaching Hospital | Critical | Operational and regulatory; multi-facility aggregation. |
| Network | Hospital Network, Multi-Region Network | Critical | All three categories; multi-region; multi-currency. |
| Outpatient | Multi-Specialty Group, Dental Group | High | Operational and analytical. |
| Long-term care | Long-Term Care, Rehabilitation Center | High | Regulatory (staffing ratios, care-plan compliance). |
| Diagnostic | Imaging Center, Laboratory | High | Operational (throughput) and regulatory (quality). |
| Solo practice | Solo Practitioner Clinic | Medium | Operational only. |
| Mental health | Mental Health Facility | Medium | Regulatory (mandatory-report categories). |

### 2.5 Module Lifecycle Posture

The Reports module is at General Availability (LC3) per MODULE_ARCHITECTURE Section 6.1. The module's contract surface is at version 1.x, with no breaking changes planned. The module follows the platform's standard evolution discipline: contract evolution through versioning, capability addition through extension points, and deprecation only through the documented ADR process. New report types are added through the extension surface, with new regulatory report templates added as the regulatory landscape evolves.

The module's configuration surface is mature. The configuration keys that govern report definitions, schedules, distribution rules, and retention have been validated against multiple operational scenarios and multiple regional requirements. New configuration keys are added when an enduring requirement is identified; speculative configuration keys are not added per MODULE_ARCHITECTURE Section 10.2. The module's extension surface supports customer-specific report templates, customer-specific dashboard widgets, and customer-specific regulatory-report formats through the platform's standard extension points.

---

## 3. Key Features

### 3.1 Capability Catalogue

The Reports module's capability surface is organized into twelve capability areas. The areas are listed in the table below and elaborated in Sections 4 through 8 and in cross-cutting sections.

| # | Capability Area | Description |
|---|---|---|
| C1 | Report Catalogue | Pre-built reports covering common operational, analytical, and regulatory needs. |
| C2 | Ad-Hoc Reporting | Custom report construction by authorized users, within permission scope. |
| C3 | Scheduled Reporting | Reports generated on a defined schedule and distributed automatically. |
| C4 | Dashboard Composition | User-assembled dashboards from a widget library. |
| C5 | Widget Library | Reusable widgets (charts, tables, KPIs) for dashboard composition. |
| C6 | Multi-Format Export | Same report exported in multiple formats (PDF, spreadsheet, CSV, printable HTML). |
| C7 | Drill-Down | Navigation from aggregate to underlying records, subject to permission. |
| C8 | Filter Configuration | Per-user filter settings, saved views, parameterized reports. |
| C9 | Saved Views | Report configurations saved for repeated use. |
| C10 | Sharing | Report and dashboard sharing with peers, subject to permission. |
| C11 | Subscription Delivery | Reports subscribed to and delivered on a defined schedule. |
| C12 | Regulatory Report Templates | Pre-built templates for common regulatory reports, per jurisdiction. |

### 3.2 Capability Cross-Reference

The capability areas are consumed in different combinations by different roles and workflows. The table below cross-references each capability area to the primary module sections where the capability is elaborated.

| Capability Area | Elaborated In | Primary Roles |
|---|---|---|
| Report Catalogue | Section 4 | All roles (consumers of standard reports). |
| Ad-Hoc Reporting | Section 5 | R09 Administrator, R12 Executive, R10 Compliance Officer. |
| Scheduled Reporting | Section 7 | R09 Administrator, R12 Executive, R10 Compliance Officer. |
| Dashboard Composition | Section 6 | All roles (consumers of dashboards). |
| Widget Library | Section 6 | R09 Administrator, R12 Executive. |
| Multi-Format Export | Section 8 | All roles. |
| Drill-Down | Section 5 | R09 Administrator, R12 Executive, R10 Compliance Officer. |
| Filter Configuration | Section 5 | All roles. |
| Saved Views | Section 5 | All roles. |
| Sharing | Section 5, Section 6 | All roles. |
| Subscription Delivery | Section 7 | All roles. |
| Regulatory Report Templates | Section 4 | R10 Compliance Officer. |

### 3.3 Configuration-Driven Posture

Every capability area is configurable rather than coded. Report definitions are declarative — they specify the data source, the query, the layout, the distribution, and the retention, per SYSTEM_ARCHITECTURE Section 28.6 — not procedural. Dashboard layouts are configured by users, not designed in code. Widget definitions are declarative, specifying the data source, the visualization type, and the interactivity rules. Export formats are configurable, with the available formats per report type set through configuration. This posture is the architectural expression of Principle P2 (Configuration Before Customization) and is non-negotiable: a customer that needs a report variant that cannot be expressed through configuration is a candidate for platform evolution, not for source-level customization.

The configuration-driven posture is particularly consequential for the Reports module because the module's behaviour varies significantly across customers, regions, and regulatory frameworks. A customer in a region with strict data-residency rules configures report data sources to honour residency; a customer in a region with strict regulatory reporting configures regulatory templates per the regional requirements. The module's configuration surface accommodates the variation without code change, honouring Principle P3 and Principle P17.

---

## 4. Standard Reports

### 4.1 Report Catalogue Structure

The report catalogue is the module's curated collection of pre-built reports that cover the common operational, analytical, and regulatory needs of healthcare organizations. The catalogue is organized by category (Operational, Analytical, Regulatory), by domain (Patient, Encounter, Pharmacy, Billing, etc.), and by audience (Clinician, Manager, Executive, Compliance Officer). Each catalogue entry specifies the report's name, description, data source, parameters, output format, permission requirements, and distribution rules. The catalogue is versioned: a change to a catalogue entry is recorded as a new version, with the previous version retained for historical report reconstruction.

The catalogue is the customer's primary reporting starting point. A user who needs a report first consults the catalogue; if the catalogue contains a suitable report, the user runs it with their parameters. If the catalogue does not contain a suitable report, the user constructs an ad-hoc report (Section 5) or requests that the catalogue be extended (Section 17.2). The catalogue's coverage is therefore consequential: a catalogue that covers 80% of common needs reduces ad-hoc reporting load and improves reporting consistency; a catalogue that covers 30% leaves most reporting to ad-hoc construction, with the attendant inconsistency and effort.

### 4.2 Operational Reports

Operational reports support daily operational use, per SYSTEM_ARCHITECTURE Section 28.3. Examples include patient lists, encounter summaries, order status, queue status, daily operational dashboards, inventory status, and staff schedules. Operational reports are generated from the transactional store, with minimal latency between data change and report availability. Operational reports are tenant-scoped and respect the organizational hierarchy: a clinician sees reports for their patients; a facility administrator sees reports for their facility; a customer executive sees aggregate reports for their customer. Permission scoping is enforced at the reporting layer.

Operational reports prioritize freshness and availability. A patient list that is one hour stale is operationally misleading; a queue-status report that is unavailable during peak hours is operationally useless. The module's operational-reporting path is therefore optimized for low-latency query and high availability, with the trade-off being that operational reports are not optimized for historical depth (the transactional store retains recent data only) or for complex aggregation (the transactional store is normalized for transactional integrity, not for analytical query).

### 4.3 Analytical Reports

Analytical reports support trend analysis and decision support, per SYSTEM_ARCHITECTURE Section 28.4. Examples include patient-outcome trends, financial-performance trends, operational-efficiency trends, and population-health analytics. Analytical reports are generated from the analytical store, which is populated from the transactional store through an ETL pipeline. The analytical store is optimized for query performance, with denormalized data structures and pre-computed aggregates. The ETL pipeline introduces latency between transactional data change and analytical data availability, with the latency documented per data type.

Analytical reports prioritize query performance and historical depth. A five-year trend report cannot be generated from the transactional store, which retains recent data only; it must be generated from the analytical store, which retains multi-year history. The trade-off is that analytical reports are not real-time: the data they reflect is as of the last ETL run, not as of the current moment. The trade-off is appropriate for trend analysis, where the relevant time horizon is months or years, not seconds or minutes.

### 4.4 Regulatory Reports

Regulatory reports support compliance with regulatory requirements, per SYSTEM_ARCHITECTURE Section 28.5. Examples include adverse-event reporting, controlled-substance reporting, financial reporting to regulators, and audit-trail reporting. Regulatory reports are generated from the audit store and the transactional store, with the report format defined by the regulatory framework. Regulatory reports are immutable once generated: a regulatory report that has been submitted to a regulator cannot be modified, even if subsequent data changes would produce a different report. The immutability is a compliance requirement and is enforced at the reporting layer.

Regulatory reports prioritize completeness, accuracy, and auditability. A regulatory report that omits a single adverse event is a compliance failure; a regulatory report that misstates a single controlled-substance transaction is a compliance failure. The module's regulatory-reporting path is therefore optimized for completeness and accuracy, with the trade-off being that regulatory reports are not optimized for real-time availability (the regulatory framework typically defines the submission schedule, not the platform) or for analytical flexibility (the regulatory framework defines the report format, not the user).

---

## 5. Custom Report Builder

### 5.1 Ad-Hoc Report Construction

The custom report builder is the module's capability that allows authorized users to construct custom reports from the platform's data, within the constraints of their permission scope. The builder is declarative: the user specifies the data source, the fields to include, the filters to apply, the aggregations to compute, the sort order, and the output format; the builder translates the specification into a query that the module executes against the appropriate data store. The builder is not procedural: the user does not write query code; the user configures a report definition.

Ad-hoc report construction is governed by the platform's permission framework. A user may only construct reports against data they are authorized to view; the builder enforces the authorization at query time, with violations treated as defects. The permission scoping ensures that a clinician cannot construct a report against another clinician's patients, that a facility administrator cannot construct a report against another facility's data, and that a compliance officer can construct reports against the full tenant's data within their audit scope. The permission scoping is the architectural expression of Principle P13 (Auditability as Primitive) applied to reporting: every report query is auditable, and every query honours the querier's authority.

### 5.2 Drill-Down and Filter Configuration

Drill-down is the module's capability that allows a user to navigate from an aggregate value to the underlying records that compose the aggregate. A user viewing a headcount-by-facility report can drill down on a specific facility to see the headcount by department, drill down on a specific department to see the headcount by role, and drill down on a specific role to see the individual employees. Each drill-down step is a new query, with the query parameters inherited from the parent report and refined by the drill-down selection. The drill-down is governed by permission: a user cannot drill down to records they are not authorized to view.

Filter configuration is the module's capability that allows a user to apply filters to a report — date range, facility, department, role, status, category — with the filters applied at query time. Filters are saved with the report definition (for scheduled reports) or with the user's saved view (for ad-hoc reports). Filter configuration supports parameterized reports, where a single report definition can be run with different parameter values by different users, producing different outputs from the same definition. Parameterization reduces report-definition proliferation and improves consistency.

### 5.3 Saved Views and Sharing

Saved views are the module's capability that allows a user to save a report configuration — parameters, filters, layout — for repeated use. A user who runs the same report every Monday morning with the same parameters saves the configuration as a view, and subsequent runs use the view rather than re-configuring the report from scratch. Saved views are personal by default, but can be shared with peers, subject to permission. Sharing allows a team to use a common report configuration, improving consistency across the team.

Sharing is governed by the platform's permission framework. A user can share a view only with users who are authorized to view the underlying report's data; the framework enforces the authorization at share time and at view time. A user who receives a shared view sees the view's configuration but cannot modify the original; the user can save a personal copy and modify the copy. Sharing's audit trail captures who shared what with whom, ensuring that shared-view distribution is visible for investigation.

---

## 6. Dashboards

### 6.1 Dashboard Composition

Dashboard composition is the module's capability that allows users to assemble dashboards from the widget library. A dashboard is a configurable layout of widgets, with each widget displaying a specific metric, chart, or table. The user composes the dashboard by selecting widgets from the library, arranging them on the dashboard, configuring each widget's parameters (date range, filter, refresh interval), and saving the layout. Dashboards are personal by default, but can be shared with peers, subject to permission.

Dashboard composition supports multiple dashboard types: operational dashboards (real-time or near-real-time widgets for daily operations), analytical dashboards (trend widgets for strategic review), and executive dashboards (high-level KPIs for leadership). The dashboard type determines the widget types that are appropriate and the refresh intervals that are sensible. An operational dashboard refreshes every minute; an analytical dashboard refreshes hourly or daily; an executive dashboard refreshes daily. The refresh interval is configurable per dashboard and per widget, with the configuration governing the load that the dashboard places on the underlying data stores.

### 6.2 Widget Library

The widget library is the module's curated collection of reusable widgets. Each widget specifies its data source, its visualization type (line chart, bar chart, pie chart, heat map, KPI card, table, gauge), its parameters, and its interactivity rules (click-through, drill-down, time-range selector). Widgets are versioned: a change to a widget is recorded as a new version, with the previous version retained for historical dashboard reconstruction. The widget library is extensible through the extension surface, allowing customers to add their own widgets for specialized visualizations.

The widget library is the customer's primary dashboard-building block. A user who needs a dashboard first consults the library; if the library contains suitable widgets, the user composes the dashboard from them. If the library does not contain a suitable widget, the user constructs a custom widget through the extension surface (Section 17.2) or requests that the library be extended. The library's coverage is therefore consequential for dashboard utility: a library that covers 80% of common visualizations enables most dashboards; a library that covers 30% leaves most dashboard composition to extension development.

### 6.3 Dashboard Sharing and Governance

Dashboard sharing follows the same governance model as report sharing (Section 5.3). A user can share a dashboard only with users who are authorized to view the dashboard's underlying data; the framework enforces the authorization at share time and at view time. Dashboard sharing supports team-level dashboards (a shared dashboard for a department's daily operations) and tenant-level dashboards (a shared dashboard for the customer's executive team).

Dashboard governance is the practice of managing dashboards over time. The module supports dashboard lifecycle: a dashboard that is no longer used can be archived; a dashboard that is stale (its underlying data sources have changed) is flagged for review; a dashboard that is duplicated (multiple dashboards with similar content) is flagged for consolidation. Dashboard governance is the customer's responsibility, with the module providing the tools and the audit trail. The governance posture is the operational expression of Principle P14 (Simplicity Over Complexity): dashboards that are not governed accumulate, and accumulated dashboards are noise rather than signal.

---

## 7. Scheduled Reports

### 7.1 Scheduling Configuration

Scheduled reporting is the module's capability that generates reports on a defined schedule and distributes them automatically. A schedule specifies the report definition, the parameters, the schedule (cron expression or natural-language equivalent), the distribution list, the distribution channels, and the retention policy. Schedules are versioned: a change to a schedule is recorded as a new version, with the previous version retained for historical schedule reconstruction. Schedules are auditable: who created the schedule, who modified it, when, with what scope.

Scheduling configuration supports multiple schedule types: periodic (daily, weekly, monthly, quarterly, annually), event-driven (when a defined event occurs), and ad-hoc (one-time generation at a specified time). Periodic schedules are the most common; event-driven schedules are used for regulatory reports that must be generated when specific events occur (e.g., an adverse-event report generated when an adverse event is recorded); ad-hoc schedules are used for one-time needs. The schedule type is selected per report per use case, with the platform supporting all three types.

### 7.2 Subscription-Based Delivery

Subscription-based delivery is the module's capability that allows users to subscribe to a report and receive it on a defined schedule. A subscription specifies the report, the parameters (which may be personalized per subscriber), the schedule, and the delivery channel. Subscriptions are personal: each subscriber manages their own subscriptions, with the subscription's parameters reflecting the subscriber's scope and preferences. Subscriptions are auditable: who subscribed, when, with what parameters.

Subscription-based delivery supports mass personalization: a single report definition can be subscribed to by hundreds of users, with each subscription producing a personalized output (e.g., a facility-specific report delivered to each facility's administrator). The personalization is governed by the platform's permission framework, ensuring that each subscriber receives only the data they are authorized to view. The framework's enforcement is essential: a subscription that delivers unauthorized data is a privacy breach, with potentially severe regulatory consequences.

### 7.3 Distribution Channels and Retry

Report distribution is governed by the report definition, per SYSTEM_ARCHITECTURE Section 28.7. Distribution mechanisms include on-demand (generated on user request), scheduled (generated on a defined schedule), event-driven (generated in response to a defined event), and subscription (delivered to subscribers on a defined schedule). Distribution is auditable: every report generation and distribution is recorded in the audit trail, with the audit record capturing the report, the recipients, and the time.

Distribution channels include in-app (the report is available in the user's report list), email (the report is sent as an attachment), secure portal (the report is posted to a secure portal and the user is notified), and physical delivery (the report is queued for printing and delivery, used for regulatory reports that require physical submission). The channel selection is governed by the report's distribution rule and by the recipient's preferences. Distribution failures are retried per a configurable retry policy, with the retry policy similar to the Notifications module's retry policy (NOTIFICATIONS module Section 4.4).

---

## 8. Export Options

### 8.1 Supported Export Formats

The module supports multiple export formats, with the format selected by the user or by the report's distribution rule. The table below summarizes the supported formats and their typical use.

| Format | Typical Use | Characteristics |
|---|---|---|
| PDF | Reports for distribution, archival, regulatory submission. | Fixed layout; preserves formatting; universally readable. |
| Spreadsheet | Reports for further analysis, pivot tables, what-if modelling. | Tabular; supports formulas; editable. |
| Comma-separated values | Reports for ingestion into other systems. | Lightweight; universal; no formatting. |
| Printable HTML | Reports for online viewing with print option. | Dynamic; supports interactivity; print-friendly. |
| XML | Reports for regulatory submission where XML is required. | Structured; schema-validated; machine-readable. |

The export format is configurable per report and per distribution rule. A regulatory report that must be submitted as XML is exported as XML regardless of the user's preference; an operational report that the user will further analyze is exported as a spreadsheet. The format selection is part of the report's definition and is versioned and audited.

### 8.2 Export Configuration and Validation

Export configuration includes the format, the layout (for formats that support layout), the localization (for formats that support localization), and the metadata (title, author, generation timestamp, data-source references). Export configuration is part of the report definition and is versioned. Export validation ensures that the export configuration is consistent with the report's data source and the format's constraints; an export configuration that produces an invalid output (e.g., a spreadsheet with more rows than the format supports) is flagged for review.

Export validation is particularly consequential for regulatory reports, where the format and content are defined by the regulatory framework. A regulatory report that is exported in the wrong format or with the wrong layout is a compliance failure, regardless of the underlying data's accuracy. The module's export validation is therefore stricter for regulatory reports than for operational reports, with the validation rules governed by the regulatory framework and enforced by the platform.

### 8.3 Export Audit and Retention

Every export is auditable: who exported what, when, in what format, with what parameters. The export audit trail is the basis for demonstrating that regulatory reports were generated correctly, that operational reports were distributed appropriately, and that analytical reports were used by authorized users. The export audit trail is immutable and is retained per the regulatory framework's requirements.

Export retention is governed by the customer's retention configuration. Reports that are exported for regulatory submission are retained for the period defined by the regulatory framework (often 7-10 years). Reports that are exported for operational use are retained for a shorter period (often 1-3 years). Reports that are exported for analytical use may be retained for an intermediate period. The retention configuration is part of the Configuration module's surface and is governed by the customer's compliance officer.

---

## 9. User Roles

### 9.1 Primary Reporting Roles

The Reports module is consumed by the roles defined in PRODUCT_BIBLE Section 20. The table below summarizes the primary roles and their reporting interactions.

| Role Code | Role | Reporting Interaction |
|---|---|---|
| R01–R05 | Clinical roles | Consume operational reports for own patients and encounters; view clinical dashboards. |
| R06–R08 | Operational roles | Consume operational reports for scheduling, billing, document management. |
| R09 | Administrator | Consumes operational and analytical reports; composes dashboards; manages facility-level report sharing. |
| R10 | Compliance Officer | Consumes regulatory reports; queries audit trail; generates compliance reports. |
| R11 | HR Manager | Consumes HR operational and analytical reports; generates HR compliance reports. |
| R12 | Executive | Consumes aggregate analytical reports; composes executive dashboards; oversees reporting strategy. |
| R13 | System Administrator | Manages report catalogue; configures schedules; manages integrations; manages retention. |
| R14 | Integration Account | System-to-system report delivery via integration contracts. |

### 9.2 Self-Service Reporting Posture

Every user has self-service access to reporting within their permission scope. A user can browse the report catalogue, run reports with their parameters, save views, compose dashboards, and subscribe to scheduled reports. The self-service posture is a deliberate design choice: it reduces the system administrator's load, it improves user trust by giving users direct access to data, and it produces a cleaner audit trail because users are the source of truth for their own reporting parameters.

Self-service access is permission-governed. A user sees only the reports and dashboards they are authorized to view; a system administrator sees all reports and dashboards in their scope. The permission framework enforces these rules, with violations treated as defects. Self-service actions are auditable: every report run, every dashboard view, every subscription is recorded.

### 9.3 Audit Events Generated

The Reports module generates audit events for every consequential action, per Principle P13 and SYSTEM_ARCHITECTURE Section 27. The table below summarizes the audit-event categories the module produces.

| Audit Category | Examples |
|---|---|
| Report generation | Report run; report scheduled; report distributed; report exported. |
| Report configuration | Report definition created; report definition modified; schedule created; subscription created. |
| Dashboard actions | Dashboard composed; dashboard shared; dashboard viewed. |
| Drill-down actions | Drill-down executed; filter applied; saved view created. |
| Regulatory report actions | Regulatory report generated; regulatory report submitted. |

Every audit event is recorded in the platform's audit store with the standard audit-record structure defined in SYSTEM_ARCHITECTURE Section 27.4. Audit records for report generation include the report definition, the parameters, the data sources, and the recipients, per SYSTEM_ARCHITECTURE Section 28.8.

---

## 10. Workflows

### 10.1 Report Generation Workflow

The report generation workflow coordinates the activities that produce a report. The workflow is defined declaratively through configuration, per SYSTEM_ARCHITECTURE Section 28.6. A typical report generation workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Trigger | User, schedule, or event | Initiates report generation. |
| Parameter resolution | Reports module | Resolves report parameters from the trigger, the user's scope, and the report's defaults. |
| Permission check | Permission framework | Verifies that the requester is authorized to view the report's data. |
| Query execution | Reports module | Executes the report's query against the appropriate data store. |
| Layout application | Reports module | Applies the report's layout to the query results. |
| Format rendering | Reports module | Renders the report in the requested format. |
| Distribution | Notifications module | Distributes the report to the configured recipients. |
| Audit recording | Audit module | Records the report generation in the audit trail. |

The workflow is governed by the platform's workflow engine per SYSTEM_ARCHITECTURE Section 16, with each step recorded for audit. The workflow is recoverable: if a step fails, the workflow resumes from its last durable state. The workflow is observable: each step's state and timestamp are visible to the system administrator through monitoring.

### 10.2 Regulatory Report Submission Workflow

The regulatory report submission workflow is a specialized workflow for regulatory reports that must be submitted to regulators. The workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Trigger | Schedule or event | Initiates regulatory report generation. |
| Data extraction | Reports module | Extracts the required data from the audit store and transactional store. |
| Format rendering | Reports module | Renders the report in the regulatory-required format. |
| Compliance review | R10 Compliance Officer | Reviews the report for accuracy and completeness. |
| Approval | R10 Compliance Officer or R12 Executive | Approves the report for submission. |
| Submission | Integration module | Submits the report to the regulatory portal via integration. |
| Confirmation recording | Reports module | Records the submission confirmation from the regulator. |
| Immutability enforcement | Reports module | Marks the report as immutable, preventing subsequent modification. |

The regulatory report submission workflow is the most consequential workflow the Reports module coordinates, because the consequences of error are regulatory exposure. The workflow's audit trail is the basis for demonstrating submission compliance. The immutability enforcement is a compliance requirement per SYSTEM_ARCHITECTURE Section 28.5 and is non-negotiable.

### 10.3 Dashboard Refresh Workflow

The dashboard refresh workflow coordinates the activities that refresh a dashboard's widgets. The workflow is event-driven and periodic: each widget has a refresh interval, and the module's refresh engine evaluates the widget's data source on the interval. The workflow is optimized for performance: widgets that share data sources are batched into a single query; widgets that have not been viewed recently are deprioritized; widgets that fail are retried with backoff. The workflow's audit trail captures refresh events for analytics and for performance tuning.

The dashboard refresh workflow is the module's highest-volume workflow. A tenant with 1,000 users and an average of 5 widgets per dashboard, refreshing every minute, produces 5,000 widget refreshes per minute. The module's architecture supports this volume through caching, batching, and the analytical store's query performance. The architecture is governed by the platform's scalability strategy (PRODUCT_BIBLE Section 23) and by the module's performance configuration (Section 13).

---

## 11. Data Models

### 11.1 Key Entities

This section lists the Reports module's primary domain entities by name. Entity schemas, data-store representations, and persistence details are out of scope for this document. The list below is the canonical reference for what entities the Reports module owns.

| Entity | Description |
|---|---|
| Report Definition | The declarative definition of a report: data source, query, layout, distribution, retention. |
| Report Template | The layout and formatting template applied to a report's query results. |
| Report Schedule | The schedule on which a report is generated automatically. |
| Report Subscription | A user's subscription to a report, with personalized parameters. |
| Report Execution | A single execution of a report, with parameters, timestamp, and result reference. |
| Report Output | The rendered output of a report execution, in a specific format. |
| Dashboard | A user-composed layout of widgets. |
| Widget | A reusable visualization unit, with data source, visualization type, and parameters. |
| Saved View | A user's saved report configuration for repeated use. |
| Distribution Rule | The rule governing how a report is distributed to recipients. |
| Regulatory Report Template | A pre-built template for a specific regulatory report, per jurisdiction. |

### 11.2 Entity Ownership and Boundaries

Each entity in the table above is owned by the Reports module. The Reports module is the authoritative source for these entities; other modules that need the entity's data obtain it through the Reports module's query contracts. Direct data access across the boundary is forbidden per MODULE_ARCHITECTURE Section 11.3. The Reports module consumes data from other modules through their query contracts and event streams, with the consumption governed by the customer-supplier relationship defined in SYSTEM_ARCHITECTURE Section 7.3. The Reports module is the customer; the producing modules are the suppliers.

The Report Definition entity is shared with the Configuration module in the sense that report definitions are configuration artefacts governed by the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). The relationship is by configuration schema consumption, not by data replication; the Reports module consumes the Configuration module's schema validation and versioning capabilities, applying them to report definitions.

### 11.3 Data Volume and Retention

The Reports module's data volume is moderate relative to the modules it consumes from. A tenant with 1,000 users produces on the order of 10,000 report executions per day, 1,000 dashboard refreshes per minute, and 100 scheduled reports per day. The volume is well within the capacity of the platform's standard data architecture. The retention horizon varies by report category: operational reports are retained for a short period (often 1-3 years); analytical reports are retained for a longer period (often 3-7 years); regulatory reports are retained for the period defined by the regulatory framework (often 7-10 years or longer).

Retention is governed by the platform's data retention configuration. The Reports module exposes retention configuration per report category, with the customer's compliance officer responsible for setting the retention period in accordance with the applicable regulatory framework. Report outputs that are past their retention period are archived or purged per the configured policy, with the archival or purge recorded in the audit trail.

---

## 12. Integrations

### 12.1 Integration with Platform Modules

The Reports module integrates with multiple platform modules. The table below summarizes the integrations.

| Integrated Module | Integration Purpose | Pattern |
|---|---|---|
| All producing modules | Consumes query contracts and event streams for report data. | Synchronous query; asynchronous event subscription. |
| Configuration | Report definitions, schedules, distribution rules, retention policies. | Configuration schema consumption. |
| Audit | Audit-event recording for all report actions; audit store as data source for regulatory reports. | Asynchronous event (outbox); synchronous query (audit store). |
| Notifications | Report distribution via notification channels. | Asynchronous event (outbox). |
| Identity & Access | Permission scoping for report queries; recipient resolution for distribution. | Synchronous query. |
| Localization | Locale-specific report templates, formats, terminology. | Configuration schema consumption. |
| Integration | Integration with regulatory portals, external business-intelligence platforms, data-warehouse exports. | Anticorruption layer. |

### 12.2 Integration with External Systems

The Reports module integrates with several categories of external systems through the Integration module. The table below summarizes the categories.

| External System Category | Integration Purpose | Pattern |
|---|---|---|
| Regulatory portal | Regulatory report submission; submission confirmation receipt. | Anticorruption layer; scheduled and event-driven. |
| External business-intelligence platform | Data export for advanced analytics outside the platform. | Anticorruption layer; scheduled. |
| Data warehouse | Data export for customers who maintain their own data warehouse. | Anticorruption layer; scheduled. |
| Email provider | Report distribution via email attachments. | Anticorruption layer; real-time. |

External-system integration is governed by the Anticorruption Layer pattern documented in SYSTEM_ARCHITECTURE Section 7.3. The Reports module's domain model is not contaminated by the external system's model; the Integration module translates between the two, preventing external-model leakage into the Reports module's contracts.

### 12.3 Boundary with the Reporting Layer

The boundary between the Reports module and the platform's Reporting Layer deserves explicit treatment. The Reporting Layer is an architectural commitment defined in SYSTEM_ARCHITECTURE Section 6.7 and elaborated in Section 28. The Reports module is the deployable expression of that layer, per the documented deviation in SYSTEM_ARCHITECTURE Section 7.7. The layer defines the architectural commitments — the three reporting categories, the data-source separation, the declarative report definition, the auditability of report generation — and the module implements those commitments through a contract surface, a configuration surface, and an operational posture.

The boundary is governed by the standard amendment process. A change to the Reporting Layer's commitments is ratified through an ADR, with the Reports module's contract surface updated to honour the change. A change to the Reports module's implementation that does not affect the layer's commitments is ratified through the module's standard amendment process. The boundary preserves the layer's stability (the architectural commitments are stable) while allowing the module's implementation to evolve (the deployable expression can improve without ratifying an ADR).

---

## 13. Configuration

### 13.1 Configuration Surface

The Reports module's configuration surface is the primary mechanism through which the customer adapts the module to its specific reporting operations. The configuration surface is part of the module's contract and is versioned with it. The surface is bounded by what can be expressed without source-level modification per MODULE_ARCHITECTURE Section 10.1. The configuration surface is organized by capability area, with each capability area exposing a coherent set of configuration keys.

The configuration surface is governed by the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). Configuration keys are namespaced by module and by capability. Configuration values are validated before application, with five validation rule categories (SYSTEM_ARCHITECTURE Section 15.4). Configuration changes are versioned, audited, and reversible through rollback.

### 13.2 Configuration Categories

The Reports module's configuration falls into several categories per MODULE_ARCHITECTURE Section 10.3. The table below summarizes the categories.

| Category | Examples | Typical Owner |
|---|---|---|
| Behavioural | Report definitions, schedules, distribution rules, dashboard layouts. | R09 Administrator, R12 Executive, all users (own dashboards). |
| Structural | Report-catalogue entries, widget-library entries, capability-gating flags. | Customer system administrator. |
| Integration | Regulatory-portal endpoints, business-intelligence endpoints, credentials, schedules. | Integration architect. |
| Localization | Locale-specific report templates, formats, terminology. | Localization specialist. |
| Security | Report-access rules, dashboard-sharing rules, audit-query scope rules. | Security architect. |
| Performance | Cache settings, query timeouts, dashboard-refresh intervals, batch sizes. | Operations. |
| Regulatory | Retention periods, regulatory-report templates, regulatory-framework selection. | Compliance officer. |

### 13.3 Configuration Layers and Precedence

The Reports module honours the platform's eight-layer configuration model (SYSTEM_ARCHITECTURE Section 15.2). Configuration values are resolved by combining values from each layer in precedence order: platform default (L1), edition default (L2), tenant override (L3), facility override (L4), department override (L5), care-team override (L6), user override (L7), session override (L8). A higher layer overrides a lower layer; overrides are validated, versioned, and auditable.

The Reports module's configuration surface documents, for each configuration key, which layers may override the key. For example, a retention-period configuration key may be overridden at the tenant layer but not at lower layers, because retention is a tenant-wide compliance policy. A dashboard-layout configuration key may be overridden at the user layer, because dashboard layout is a personal preference. The layer restrictions are enforced by the configuration service.

### 13.4 Configuration Sandbox and Promotion

The Reports module's configuration supports the platform's configuration sandbox (SYSTEM_ARCHITECTURE Section 15.7). A configuration change — particularly a new report definition or a modified schedule — is tested in a sandbox tenant before application to a production tenant. The sandbox requirement is consequential for regulatory reports, where a misconfigured report can produce a compliance failure for an Ibn Hayan customer. The sandbox ensures that the report is validated against realistic data before it is activated in production.

---

## 14. Permissions

### 14.1 Permission Categories

The Reports module's permission surface is organized into the categories defined by the platform's permission framework. The table below summarizes the categories and the Reports module's exposure in each.

| Permission Category | Reports Module Exposure |
|---|---|
| Read | View report catalogue, run reports, view dashboards, view saved views. |
| Write | Create or amend report definitions, schedules, dashboards, saved views. |
| Approve | Approve report definitions, dashboard sharing, regulatory report submissions. |
| Configure | Modify report catalogue, widget library, retention policies, regulatory templates. |
| Audit | Query the report audit trail; review audit records; export audit reports. |
| Integrate | Manage integrations with regulatory portals, business-intelligence platforms. |

### 14.2 Role-to-Permission Mapping

| Role | Read | Write | Approve | Configure | Audit | Integrate |
|---|---|---|---|---|---|---|
| R09 Administrator | All in facility | All in facility | All in facility | Facility-level only | All in facility | No |
| R10 Compliance Officer | All in tenant | Regulatory reports | Regulatory submissions | Regulatory templates | All in tenant | No |
| R12 Executive | Aggregate only | Executive dashboards | No | No | Aggregate only | No |
| R13 System Administrator | All | All | All | All | All | All |
| All roles (self-service) | Own scope | Own dashboards, saved views | No | No | Own audit | No |

### 14.3 Permission Enforcement and Audit

Permission enforcement is performed by the platform's permission framework. The Reports module declares the permission required for each operation; the framework enforces the declaration. The enforcement is consistent across surfaces: an operation performed through the user interface, through an integration, or through an administrative tool is governed by the same permission rule. Permission checks are auditable: every permission check is recorded in the audit trail when the check is for a consequential action.

### 14.4 Data-Scoping Enforcement

Data-scoping enforcement is the practice of ensuring that a report's query returns only the data the querier is authorized to view. The module enforces data scoping at query time, with the query automatically filtered by the querier's scope (their facilities, their departments, their care teams, their patients). A clinician's query for "encounters in the last 30 days" returns only the clinician's own encounters; a facility administrator's query for the same returns all encounters at the administrator's facility. The scoping is invisible to the querier, who sees only the scoped result; the scoping is recorded in the audit trail, ensuring that the query's scope is visible for investigation.

Data-scoping enforcement is the architectural expression of the platform's privacy posture (PRODUCT_BIBLE Section 25) and is non-negotiable. A query that bypasses scoping is a privacy breach, with potentially severe regulatory consequences. The module's query layer is therefore designed to enforce scoping at the lowest possible level, with the scoping applied by the data store rather than by the application layer, ensuring that bypass is structurally impossible.

---

## 15. API Surface

### 15.1 Contract Surface Overview

This section documents the Reports module's contract surface — the set of commands, queries, events, and configuration schemas through which other modules interact with the Reports module. Per MODULE_ARCHITECTURE Section 4.1, the contract surface is the module's only public interface; internals are private. Per the metadata table at the head of this document, specific API endpoint specifications are out of scope for this reference and are governed by the platform's integration documentation.

### 15.2 Commands, Queries, and Events

| Contract Type | Examples |
|---|---|
| Commands | Run report; schedule report; subscribe to report; create dashboard; share dashboard; export report; submit regulatory report. |
| Queries | Get report by identifier; list reports in scope; get dashboard; list dashboards; get widget; list widgets; get report execution status; get report output. |
| Events | Report generated; report distributed; report exported; dashboard composed; dashboard shared; regulatory report submitted. |
| Configuration Schemas | Report-definition schema; report-template schema; report-schedule schema; dashboard-layout schema; widget-definition schema; retention-policy schema. |

### 15.3 Contract Versioning and Deprecation

Contract versioning follows the platform's semantic-versioning policy per MODULE_ARCHITECTURE Section 8.1. Major versions indicate breaking changes; minor versions indicate backward-compatible additions; patch versions indicate backward-compatible fixes. Contract deprecation is governed by the platform's deprecation policy per MODULE_ARCHITECTURE Section 8.3, with deprecated contracts supported through their deprecation window before removal.

---

## 16. Future Enhancements

### 16.1 Module Lifecycle Outlook

The Reports module is at General Availability (LC3) per MODULE_ARCHITECTURE Section 6.1 and is on track to transition to Mature (LC4) after a defined period of stable operation. The transition is automatic per PRODUCT_BIBLE Section 19.5. No deprecation is anticipated; the reporting domain is enduring, and the module's position as the deployable expression of the Reporting Layer is stable. Module evolution occurs through contract versioning, capability addition through extension points, and configuration-surface expansion.

### 16.2 Extension Points

The Reports module exposes extension points per MODULE_ARCHITECTURE Section 9 that allow capability to be added without source modification. The table below summarizes the extension-point categories relevant to the Reports module.

| Extension Point Category | Examples |
|---|---|
| Report templates | Customer-specific report layouts; specialized regulatory-report templates. |
| Widget library extensions | Customer-specific widgets for specialized visualizations. |
| Integration adapters | Adapters for regional regulatory portals; adapters for customer-specific business-intelligence platforms. |
| Configuration-driven rules | Customer-specific report definitions, distribution rules, retention policies. |
| Workflow definitions | Customer-specific report-generation workflows; specialized regulatory-submission workflows. |

Extensions are first-class architectural concerns with their own contracts, validation, and lifecycle per MODULE_ARCHITECTURE Section 9.3. An extension that requires source modification of the Reports module is, by definition, customization, and is rejected by Principle P2.

### 16.3 Anticipated Capability Evolution

Capability evolution is anticipated in several areas. AI-assisted report drafting — using historical report data to suggest report parameters, filters, and layouts — is a candidate for addition through the extension surface, with the AI service consuming report-execution history and producing suggestions that are reviewed by human report authors. Natural-language report construction — allowing users to describe a report in natural language and have the module construct the corresponding report definition — is a candidate for addition through the extension surface, with the AI service consuming natural-language input and producing report definitions that are reviewed by the user.

Regulatory evolution is anticipated as new jurisdictions adopt new regulatory-reporting requirements (e.g., value-based-care reporting, social-determinants-of-health reporting, environmental-social-governance reporting for healthcare organizations). The module's configuration surface and regulatory-template extension surface are designed to accommodate these through configuration and extension rather than code change.

### 16.4 Operational Considerations

Operational considerations for the Reports module centre on three concerns. First, query performance: report queries can be expensive, particularly analytical queries against the analytical store and regulatory queries against the audit store. The module's query layer is optimized for performance, with caching, batching, and query-timeout enforcement. Second, dashboard-refresh load: dashboards generate continuous query load, particularly in Ibn Hayan tenants with many users and many dashboards. The module's refresh engine is optimized for load, with widget batching, deprioritization of unviewed widgets, and configurable refresh intervals. Third, audit-store volume: the module generates significant audit volume, especially around report generation and distribution. The Ibn Hayan audit store is sized accordingly, and audit-record retention is governed by the customer's compliance configuration.

---

## 17. Related Documents

### 17.1 Canonical References

The Reports module is governed by the following canonical references, which prevail over this document in case of conflict per the metadata table at the head of this document.

| Document | Relationship |
|---|---|
| `PRODUCT_BIBLE.md` | Defines product principles, edition packaging, clinic types, module overview (Section 19). |
| `SYSTEM_ARCHITECTURE.md` | Defines architectural principles, bounded contexts (Section 7), the documented deviation for Reporting as a deployable expression of the Reporting Layer (Section 7.7), the Reporting Layer (Section 6.7), the Reporting Architecture (Section 28), configuration strategy (Section 15), workflow engine (Section 16), audit architecture (Section 27). |
| `MODULE_ARCHITECTURE.md` | Defines module architecture: catalogue, boundaries, contracts, dependencies, lifecycle, communication, versioning, extension points, configuration surface, isolation, testing, governance. |
| `CONFIGURATION_ARCHITECTURE.md` | Defines configuration internals: layer model, validation, versioning, audit, sandbox, hot-reload. |
| `SOFTWARE_ARCHITECTURE.md` | Defines implementation-grade architecture: layering, deployment, technology posture. |

### 17.2 Peer Module References

The Reports module collaborates with the following peer modules. Each peer module's documentation provides the peer's contract surface, configuration surface, and integration posture.

| Peer Module | Collaboration |
|---|---|
| All producing modules | Consumes query contracts and event streams for report data. |
| Configuration | Layered configuration resolution for reports configuration keys. |
| Audit | Audit-event recording for all report actions; audit store as data source for regulatory reports. |
| Notifications | Report distribution via notification channels. |
| Identity & Access | Permission scoping for report queries; recipient resolution for distribution. |
| Localization | Locale-specific report templates, formats, terminology. |
| Integration | Integration with regulatory portals, business-intelligence platforms, data warehouses. |

### 17.3 Downstream References

The Reports module's contract surface, configuration surface, and integration surface are elaborated in downstream documentation, including per-module specifications, integration contracts, and operational runbooks. Those downstream documents are subordinate to this document and to the canonical references above; conflicts are resolved in favour of the canonical references, then this document, then the downstream document. Downstream documents are amended through the standard change process when this document or a canonical reference is amended.
