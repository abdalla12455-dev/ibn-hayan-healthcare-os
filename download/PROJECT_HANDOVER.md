# Ibn Hayan Healthcare Operating System
# Project Handover Document

> **Document Purpose:** The official permanent handover for the Ibn Hayan Healthcare Operating System. This document reconstructs the complete project state from the canonical repository, documentation framework, source code, ADRs, and worklog. It is detailed enough that another AI assistant can continue the project immediately without needing any previous conversation history.
>
> **Handover Date:** 2026-07-19
> **Repository HEAD:** `362d4cd` (one commit ahead of `de2d7ed` which is the substantive Batch 7 redesign)
> **Origin/main:** `84e5b565626a70862630c27f2c2730038357db34`
> **Working Tree:** Clean
> **Latest substantive commit:** `de2d7ed` — "Redesign premium clinic landing and login experience"

---

# 1. Project Overview

## 1.1 Project Name

**Ibn Hayan Healthcare Operating System** (repository: `ibn-hayan-healthcare-os`).

Named in honour of **Jabir ibn Hayyan** (eighth-century polymath considered the father of early chemistry and the systematic experimental method in the Arabic-speaking world). The name signals the three operating commitments that govern the platform: documented-before-shipped, accumulated-verified-practice, practitioners-not-buyers.

## 1.2 Vision

**To become the operating system of healthcare** — the foundational layer on which healthcare organizations of every size, specialty, and geography run their clinical, operational, and financial work, and on which the next generation of healthcare practice is built. The word *operating system* is deliberate; Ibn Hayan is not an application, not a suite, and not a marketplace. It is the substrate that makes coherent healthcare computing possible across an organization.

The vision is stated on a **ten-year horizon**. Healthcare organizations operate on multi-decade planning cycles; their systems must remain viable across leadership transitions, regulatory shifts, clinical practice evolution, mergers and acquisitions, and technology generational changes. The decade horizon shapes every product and architectural decision in the platform.

The vision unfolds along three vectors pursued simultaneously and in tension with each other:
- **Depth** — deep enough in each supported specialty that practitioners do not need to leave the platform to do their work.
- **Breadth** — broad enough to cover clinical, operational, financial, and administrative work in a single coherent system.
- **Reach** — reachable by organizations of every size and in every supported geography, not only by large enterprises in wealthy markets.

## 1.3 Mission

**To give every healthcare organization — from a solo practitioner in a rural clinic to a multi-national hospital network — a single, configurable, durable operating system for clinical, operational, and financial work, so that practitioners spend their time caring for patients rather than fighting their software.**

The mission is stated with three adjectives that distinguish Ibn Hayan from fragmented, customized, or short-lived alternatives:
- **Single** — one platform, one data model, one identity model, one configuration model, one audit model. Composable but coherent.
- **Configurable** — adaptation happens through declarative, version-controlled, tenant-scoped configuration rather than source-level customization.
- **Durable** — built to remain viable across the decade horizon, with architectural choices that survive technology shifts.

## 1.4 Long-Term Goals

The platform's Product Goals (from `PRODUCT_BIBLE.md` Section 7, G-1 through G-8):

| Code | Goal |
|---|---|
| G-1 | Operating-System Status in Served Markets (measured by practitioner workflow share) |
| G-2 | Configuration Coverage of Supported Clinic Types = 100% of operational reality |
| G-3 | Practitioner-Felt Latency: sub-second median, sub-two-second 95th percentile |
| G-4 | Accessibility Completeness: 100% of practitioner workflows meet accessibility standards |
| G-5 | Audit Completeness: 100% of consequential actions audited; no measurable gap |
| G-6 | Regional Adaptation Coverage: validated localization packs per supported region |
| G-7 | Open Data Portability Demonstrated: quarterly successful execution of customer data export pipeline |
| G-8 | Net Revenue Retention sustained above 110%; median customer lifetime 7+ years trajectory |

## 1.5 Product Philosophy

The platform is built on four foundational beliefs (from `PRODUCT_BIBLE.md` Section 4):

1. **Healthcare Is Different** — clinical safety overrides commercial convenience; patient data sovereignty overrides data monetization; regulatory compliance overrides feature velocity; audit completeness overrides operational convenience.
2. **Configuration Is the Platform** — the configuration surface is the product; customization is excluded as an adaptation mechanism.
3. **The Platform Outlasts Every Individual** — every architectural, product, and commercial decision is made on a ten-year horizon, not a quarterly horizon.
4. **The Patient Is the Ultimate Stakeholder** — the patient is not the customer and is not the user, but patient safety and patient data sovereignty prevail over all other stakeholder interests.

The platform's **identity** is expressed through three operating commitments:
- **Documented-before-shipped** — every capability, configuration surface, role, permission, and integration is documented before it is exposed to a customer. Undocumented capability is defective capability.
- **Accumulated-verified-practice** — modules move from Pilot to General Availability only after validation against real operations; configuration overlays become defaults only after validation against at least three operational deployments.
- **Practitioners-not-buyers** — the practitioner on the floor is the primary measure of product success; the procurement committee is secondary.

## 1.6 Core Principles (P-1 through P-8)

| Code | Principle |
|---|---|
| P-1 | Healthcare First |
| P-2 | Configuration Before Customization |
| P-3 | One Platform, Many Organizations |
| P-4 | Open Data, Open Standards |
| P-5 | Practitioner Experience Over Procurement Satisfaction |
| P-6 | Durable Over Fashionable |
| P-7 | Documented Before Shipped |
| P-8 | Verified Practice Over Hypothetical Capability |

## 1.7 Design Principles (D-1 through D-10)

D-1 Healthcare-Native, Not Healthcare-Adapted · D-2 Configuration-Driven · D-3 One Platform, Many Organizations · D-4 Healthcare-Native Modules · D-5 Enterprise Scalability · D-6 Regional Adaptation Without Forking · D-7 Future-Proof Architecture (depth, breadth, reach) · D-8 Open Data, Open Standards · D-9 Composable, Not Monolithic · D-10 Observable, Auditable, Accountable.

## 1.8 Architectural Principles (P1 through P18)

P1 Healthcare Safety Overrides All Others · P2 Configuration Before Customization · P3 One Platform, Many Organizations · P4 Loose Coupling, High Cohesion · P5 Consistency Over Availability for Clinical Data · P6 Durable Over Fashionable · P7 Documented Before Implemented · P8 Bounded Contexts Are Stable · P9 Extensibility Through Configuration · P10 Multi-Tenancy as Default · P11 Offline-First as Default · P12 Open Standards · P13 Auditability as Primitive · P14 Simplicity Over Complexity · P15 Observability as Primitive · P16 Composable, Not Monolithic · P17 Regional Adaptation Without Forking · P18 Decade-Horizon Viability.

Precedence: P1 > P13 > P5 > P10 > P4 > P8 > P16 > P14 > all others. P14 (Simplicity) is subordinate to P11 (Offline-First).

---

# 2. Current Project Status

## 2.1 What Has Been Completed

### 2.1.1 Documentation Framework

A complete documentation framework comprising **128 Markdown files across 16 documentation folders** has been authored under `download/docs/`. The framework follows a strict hierarchy with `PRODUCT_BIBLE.md` as the source of truth and `SYSTEM_ARCHITECTURE.md` as the canonical architectural reference. Every document carries a front-matter table (Document Title, Project, Document Type, Authority Level, Version, Status, Owner, Custodian, Review Cadence, Audience, Scope, Out of Scope, Conflict Resolution, Amendment Mechanism, Predecessor).

**Substantively complete (Ratified v1.0.0 or v2.0.0):**
- **00_PROJECT/** (6 files, ~67K words): `PROJECT_VISION.md`, `PROJECT_SCOPE.md`, `PRODUCT_BIBLE.md` (v2.0.0, 30,777 words, 35 sections — the source of truth), `BUSINESS_MODEL.md`, `PRODUCT_ROADMAP.md`, `CHANGELOG.md`.
- **01_ARCHITECTURE/** (6 files, ~77K words): `SYSTEM_ARCHITECTURE.md` (v2.0.0, 24,945 words — source of architectural truth, 30 sections, 18 architectural principles, 19 bounded contexts, Mermaid diagram), `MODULE_ARCHITECTURE.md`, `SOFTWARE_ARCHITECTURE.md`, `CONFIGURATION_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `CODING_STANDARDS.md`.
- **02_PRODUCT/** (7 files, ~52K words): `MODULES.md`, `FEATURES.md`, `EDITIONS.md`, `USER_ROLES.md`, `PERMISSIONS.md`, `CLINIC_TYPES.md`, `WORKFLOWS.md`.
- **03_DOMAIN/** (8 files, ~85K words): `BUSINESS_RULES.md`, `CLINICAL_WORKFLOWS.md`, `FEATURE_FLAGS.md`, `STATUS_CODES.md`, `ENUMS.md`, `TERMINOLOGY.md`, `CONFIGURATION.md`, `CALCULATIONS.md`.
- **06_CLINIC_TYPES/** (18 of 19 files complete, ~110K words): `GENERAL.md`, `INTERNAL_MEDICINE.md`, `PEDIATRICS.md`, `DENTAL.md`, `DERMATOLOGY.md`, `GYNECOLOGY.md`, `CARDIOLOGY.md`, `ORTHOPEDICS.md`, `OPHTHALMOLOGY.md`, `ENT.md`, `NEUROLOGY.md`, `UROLOGY.md`, `PSYCHIATRY.md`, `PHYSIOTHERAPY.md`, `PLASTIC_SURGERY.md`, `RADIOLOGY.md`, `LABORATORY.md`, `PHARMACY.md` (only `HOSPITAL.md` remains a stub).
- **07_MODULES/** (14 files, ~129K words): `PATIENTS.md`, `APPOINTMENTS.md`, `DOCTORS.md`, `RECEPTION.md`, `INVENTORY.md`, `BILLING.md`, `ACCOUNTING.md`, `SUBSCRIPTIONS.md`, `HR.md`, `CRM.md`, `REPORTS.md`, `NOTIFICATIONS.md`, `AUDIT_LOGS.md`, `SETTINGS.md`.
- **08_INTEGRATIONS/HL7_FHIR.md** (~6K words, the only substantively complete integration reference).
- **09_SECURITY/** (10 of 12 files, ~94K words): `AUTHENTICATION.md`, `AUTHORIZATION.md`, `ROLES_AND_PERMISSIONS.md`, `AUDIT.md`, `RECOVERY.md`, `BACKUP.md`, `COMPLIANCE/HIPAA.md`, `COMPLIANCE/GDPR.md`, `COMPLIANCE/DATA_RETENTION.md`, `COMPLIANCE/SECURITY_GUIDELINES.md`.
- **12_ADR/** (12 ADRs filed, see §5).

**Placeholder stubs (Draft v0.1.0, ToC only, body absent):**
- **04_DATABASE/** (6 files, all stubs)
- **05_UI_UX/** (10 files, all stubs — DESIGN_BIBLE, DESIGN_SYSTEM, COLORS, TYPOGRAPHY, COMPONENT_LIBRARY, LAYOUTS, RESPONSIVE_RULES, ACCESSIBILITY, ANIMATIONS, ICONOGRAPHY)
- **08_INTEGRATIONS/** (7 of 8 files are stubs: WHATSAPP, SMS, EMAIL, PAYMENT_GATEWAYS, DICOM, LAB_DEVICES, NATIONAL_HEALTH_SYSTEMS)
- **09_SECURITY/COMPLIANCE/PRIVACY_POLICY.md** and **MEDICAL_RECORD_POLICY.md** (stubs)
- **10_API/** (4 files, all stubs)
- **11_TESTING/** (5 files, all stubs)
- **13_DEPLOYMENT/** (5 files, all stubs)
- **14_FUTURE/** (5 files, all stubs)

Total placeholder count: **38 files** awaiting body authoring.

### 2.1.2 Architecture Decision Records

Twelve ADRs ratified (001–013 with 011 reserved as future): ADR-001 Configuration-Driven Architecture · ADR-002 Modular Architecture · ADR-003 Local-First Strategy · ADR-004 Multi-Tenant Strategy · ADR-005 UI Design Philosophy · ADR-006 Database Strategy · ADR-007 Feature Flags Packaging · ADR-008 No Façade Modules / Reception as Workflow · ADR-009 Subscriptions as Billing Capability · ADR-010 Inventory BC and Module Packaging · ADR-012 Application Platform and Repository Structure · ADR-013 Authentication and Session Strategy.

### 2.1.3 Canonical Implementation

A **pnpm monorepo** has been scaffolded with two applications and five shared packages, and **seven canonical implementation batches** have been delivered:

| Batch | Commit | Subject | Outcome |
|---|---|---|---|
| 1 | `cd3ff34` | Ratify implementation foundation decisions | ADRs 007–010 ratified; canonical spine aligned |
| 2 | `282b2b3` | Scaffold canonical web and API foundation | pnpm workspace; `apps/web` (Next.js 16); `apps/api` (NestJS 11); 5 shared packages; TypeScript strict; ESLint; Vitest |
| 3 | `95733f8` | Connect web and API through shared health contract | `GET /api/v1/health` endpoint; web ↔ API contract test |
| 4 | `5f76ab7` | Establish PostgreSQL tenancy foundation | `Tenant` / `Organisation` / `Facility` Prisma models; first reviewed raw SQL composite FK supplement |
| 5 | `5825e74` | Implement secure local authentication sessions | `User` / `LocalCredential` (Argon2id) / `TenantMembership` / `AuthSession` (SHA-256 token hash); `POST /auth/login`, `GET /auth/session`, `GET /auth/csrf`, `POST /auth/logout`; HttpOnly + SameSite + Secure cookies; CSRF; rate limiting |
| 6 | `84e5b56` | Implement membership-backed tenant context | `active_tenant_membership_id` nullable column on `AuthSession`; composite FK `(active_tenant_membership_id, user_id) → tenant_memberships(id, user_id)` enforcing same-user constraint at DB level; `GET /context`, `PUT /context/tenant`, `DELETE /context/tenant` |
| 7 | `de2d7ed` | Redesign premium clinic landing and login experience | Premium bilingual (Arabic default RTL, English LTR) landing page with split hero (brand value + integrated login panel), three value sections (operational clarity / security / growth), value grid (4 values), landing header + footer with brand mark + language switch; project-owned design tokens in `globals.css` (`.ih-*` BEM namespace); presentation-only surface with no API-status/prototype/implementation-foundation language |

Latest commit on top: `362d4cd` — UUID-named marker commit; does not change project content.

### 2.1.4 Current Implementation Surface

**Backend (apps/api) currently exposes:**
- `GET /api/v1/health` — platform health check
- `POST /api/v1/auth/login` — email/password → session cookie + CSRF token + session response
- `GET /api/v1/auth/session` — current session info (rotates token if rotation interval elapsed)
- `GET /api/v1/auth/csrf` — fresh CSRF token
- `POST /api/v1/auth/logout` — revokes session, clears cookie (requires CSRF)
- `GET /api/v1/context` — list user's tenant memberships + currently active context
- `PUT /api/v1/context/tenant` — select active tenant context by membership ID (requires CSRF)
- `DELETE /api/v1/context/tenant` — clear active context (requires CSRF)
- OpenAPI spec at `/api` (non-production)

**Frontend (apps/web) currently renders:**
- `/` — premium landing + integrated login (Batch 7 redesign)
- `/login` — direct-link route rendering the same `LandingExperience`
- `/dashboard` — authenticated dashboard with workspace selector (current context chip + radio group of tenant memberships + select/clear actions) and account card (display name, email, session chip with remaining time, memberships list, logout form)

**Database (apps/api/prisma/schema.prisma):**
- 7 tables: `tenants`, `organisations`, `facilities`, `users`, `local_credentials`, `tenant_memberships`, `auth_sessions`
- 3 migrations: `20260718170628_tenancy_foundation`, `20260718194955_identity_session_foundation`, `20260718220000_session_tenant_context`
- Two reviewed raw SQL supplements (composite FKs) — one for `facilities(tenant_id, organisation_id) → organisations(tenant_id, id)`, one for `auth_sessions(active_tenant_membership_id, user_id) → tenant_memberships(id, user_id)`
- All foreign keys use `ON DELETE RESTRICT`. No RLS, no soft-deletes, no PostgreSQL extensions, no seed credentials.

**Demo credentials:** `demo@ibnhayan.local` / `IbnHayan-Demo-2026!` (created by `pnpm --filter @ibn-hayan/api auth:bootstrap-dev` when `ALLOW_DEV_AUTH_BOOTSTRAP=true` and the relevant env vars are set).

## 2.2 What Is Currently in Progress

Nothing is mid-flight. Batch 7 is committed and the working tree is clean. The next canonical batch is undefined — the handover recipient must decide what to prioritize (see §9 Recommended Next Steps).

## 2.3 What Has Not Started Yet

The following surfaces are architecturally committed but not yet implemented:

### 2.3.1 Domain modules not yet wired into `AppModule`
- M01 Patient (BC01), M02 Encounter (BC02), M03 Clinical Documentation (BC03), M04 Orders & Results (BC04), M05 Pharmacy (BC05), M06 Scheduling (BC06), M07 Documents (BC13), M08 Notifications (BC14), M09 Billing (BC07), M10 Accounting (BC08), M11 CRM (BC11), M12 HR (BC12), M13 Workforce (BC10), M14 Identity & Access (BC15 — partially delivered through Auth), M15 Configuration (BC16), M16 Audit (BC17), M17 Integration, M18 Reporting, M19 Localization (BC19).

### 2.3.2 Platform primitives not yet delivered
- Row-Level Security (RLS) policies and database-role separation (deferred per ADR-012 — must arrive before any tenant-owned data is exposed through a public API endpoint)
- Soft-delete columns (`deletedAt`) on entities (deferred per schema comments — governed by a future ADR)
- Role and permission catalogue on `TenantMembership` (deferred per Batch 4 spec)
- Active Organisation and Facility context columns on `AuthSession` (Batch 6 added active Tenant context only; organisation/facility context is a future batch)
- Audit store as a dedicated store (per ADR-006; current implementation stores audit events in the transactional store in an append-only audit table with the same immutability and tamper-evidence guarantees)
- Analytical store, cache store, object store (all deferred per ADR-006 — selected per category as implementation decisions, not architectural identity)
- Local-first synchronization substrate (per ADR-003; first slice is online-first but preserves identifiers, contracts, audit semantics, and extension points for future sanctioned local-first path)
- MFA, OIDC, SAML authentication (per ADR-013 §1.1 — future-compatible requirements but not in first slice)
- Deployment topology, container orchestration, cloud provider selection (deferred per ADR-012 §6.1 — separate ADRs required when each becomes ready for ratification)

### 2.3.3 Documentation still in placeholder status
38 files (see §3 below for the per-folder breakdown).

---

# 3. Documentation Status

## 3.1 Folder-by-Folder Inventory

Documentation root: `/home/z/my-project/download/docs/`

### 3.1.1 `00_PROJECT/` (6 files) — COMPLETE
**Purpose:** Strategic project references — vision, scope, business model, roadmap, changelog, and the canonical product bible.
**Completion:** 100% ratified (PRODUCT_BIBLE at v2.0.0; others at v1.0.0).
**Files completed:** `PROJECT_VISION.md` (8,128 words), `PROJECT_SCOPE.md` (8,252 words), `PRODUCT_BIBLE.md` (30,777 words), `BUSINESS_MODEL.md` (8,864 words), `PRODUCT_ROADMAP.md` (6,715 words), `CHANGELOG.md` (6,118 words).
**Placeholders:** None.
**In progress:** None.

### 3.1.2 `01_ARCHITECTURE/` (6 files) — COMPLETE
**Purpose:** Canonical architectural references — system architecture, module architecture, software architecture, configuration architecture, folder structure, coding standards.
**Completion:** 100% ratified (SYSTEM_ARCHITECTURE, MODULE_ARCHITECTURE, SOFTWARE_ARCHITECTURE, CONFIGURATION_ARCHITECTURE at v2.0.0; FOLDER_STRUCTURE, CODING_STANDARDS at v1.0.0).
**Files completed:** `SYSTEM_ARCHITECTURE.md` (24,945 words, 30 sections, 18 architectural principles, 19 bounded contexts, Mermaid diagram of 8 layers), `MODULE_ARCHITECTURE.md` (18,021 words), `SOFTWARE_ARCHITECTURE.md` (11,613 words), `CONFIGURATION_ARCHITECTURE.md` (12,815 words), `FOLDER_STRUCTURE.md` (4,160 words), `CODING_STANDARDS.md` (5,492 words).
**Placeholders:** None.
**In progress:** None.

### 3.1.3 `02_PRODUCT/` (7 files) — COMPLETE
**Purpose:** Product surface elaborations — modules, features, editions, user roles, permissions, clinic types, workflows.
**Completion:** 100% ratified v1.0.0.
**Files completed:** `MODULES.md` (7,076 words), `FEATURES.md` (7,360 words), `EDITIONS.md` (7,451 words), `USER_ROLES.md` (7,055 words), `PERMISSIONS.md` (7,031 words), `CLINIC_TYPES.md` (8,290 words), `WORKFLOWS.md` (7,044 words).
**Placeholders:** None.
**In progress:** None.

### 3.1.4 `03_DOMAIN/` (8 files) — COMPLETE
**Purpose:** Domain-level references — business rules, clinical workflows, feature flags, status codes, enumerations, terminology, configuration, calculations.
**Completion:** 100% ratified v1.0.0.
**Files completed:** `BUSINESS_RULES.md` (11,374 words), `CLINICAL_WORKFLOWS.md` (9,813 words), `FEATURE_FLAGS.md` (10,957 words), `STATUS_CODES.md` (10,732 words), `ENUMS.md` (9,483 words), `TERMINOLOGY.md` (12,432 words), `CONFIGURATION.md` (9,954 words), `CALCULATIONS.md` (10,747 words).
**Placeholders:** None.
**In progress:** None.

### 3.1.5 `04_DATABASE/` (6 files) — PLACEHOLDERS
**Purpose:** Database design, data models, tables, relationships, storage, validations.
**Completion:** 0% — all 6 files are Draft v0.1.0 stubs with ToC only.
**Files completed:** None.
**Placeholders:** `DATABASE_DESIGN.md`, `DATA_MODELS.md`, `TABLES.md`, `RELATIONSHIPS.md`, `STORAGE.md`, `VALIDATIONS.md` — all ~55 lines, ~180 words each, with empty section bodies.
**In progress:** None.
**Note:** The authoritative persistence schema lives in `apps/api/prisma/schema.prisma` (411 lines, fully documented). The `04_DATABASE/` docs would elaborate the design at a documentation-framework level; the implementation already exists.

### 3.1.6 `05_UI_UX/` (10 files) — PLACEHOLDERS
**Purpose:** UI/UX design references — design bible, design system, colors, typography, component library, layouts, responsive rules, accessibility, animations, iconography.
**Completion:** 0% — all 10 files are Draft v0.1.0 stubs with ToC only.
**Files completed:** None.
**Placeholders:** `DESIGN_BIBLE.md`, `DESIGN_SYSTEM.md`, `COLORS.md`, `TYPOGRAPHY.md`, `COMPONENT_LIBRARY.md`, `LAYOUTS.md`, `RESPONSIVE_RULES.md`, `ACCESSIBILITY.md`, `ANIMATIONS.md`, `ICONOGRAPHY.md` — all ~55 lines, ~180 words each, with empty section bodies.
**In progress:** None.
**Note:** The actual design tokens and BEM-style component classes live in `apps/web/src/app/globals.css` (~1,100+ lines, fully populated with CSS custom properties and `.ih-*` class definitions). The UI/UX docs would document these at a documentation-framework level.

### 3.1.7 `06_CLINIC_TYPES/` (19 files) — 18 COMPLETE, 1 PLACEHOLDER
**Purpose:** Per-clinic-type configuration overlay references.
**Completion:** 95% — 18 of 19 files ratified v1.0.0.
**Files completed:** `GENERAL.md`, `INTERNAL_MEDICINE.md`, `PEDIATRICS.md`, `DENTAL.md`, `DERMATOLOGY.md`, `GYNECOLOGY.md`, `CARDIOLOGY.md`, `ORTHOPEDICS.md`, `OPHTHALMOLOGY.md`, `ENT.md`, `NEUROLOGY.md`, `UROLOGY.md`, `PSYCHIATRY.md`, `PHYSIOTHERAPY.md`, `PLASTIC_SURGERY.md`, `RADIOLOGY.md`, `LABORATORY.md`, `PHARMACY.md` — all 430–609 lines with full content (overview, target facilities, recommended modules M01–M19, specialty-specific capability sections, workflows, data models, forms, reports, role/permission recommendations, configuration defaults, onboarding checklist, sample use cases, best practices, related documents).
**Placeholders:** `HOSPITAL.md` — 79 lines, Draft v0.1.0, ToC only (departments, bed management, ED, surgical suite, ICU, wards, discharge).
**In progress:** None.

### 3.1.8 `07_MODULES/` (14 files) — COMPLETE
**Purpose:** Per-module implementation references.
**Completion:** 100% ratified v1.0.0.
**Files completed:** `PATIENTS.md` (9,661 words), `APPOINTMENTS.md` (8,703 words), `DOCTORS.md` (8,676 words), `RECEPTION.md` (9,623 words), `INVENTORY.md` (11,281 words), `BILLING.md` (8,597 words), `ACCOUNTING.md` (8,749 words), `SUBSCRIPTIONS.md` (11,027 words), `HR.md` (11,688 words), `CRM.md` (8,631 words), `REPORTS.md` (9,532 words), `NOTIFICATIONS.md` (9,591 words), `AUDIT_LOGS.md` (14,084 words — the largest module file), `SETTINGS.md` (9,172 words).
**Placeholders:** None.
**In progress:** None.
**Note on RECEPTION.md, SUBSCRIPTIONS.md, INVENTORY.md:** Per ADRs 007, 008, 009, 010 these three files contain fabricated M-code claims (M14, M19, M07 respectively) that collide with canonical M14 Identity & Access, M19 Localization, and M07 Documents. The ADRs mandate downstream structural corrections (relocation, content merge, reframing) that have not yet been performed — these are tracked as Phase 2 / Phase 3 remediation work in each ADR's Implementation Triggers section.

### 3.1.9 `08_INTEGRATIONS/` (8 files) — 1 COMPLETE, 7 PLACEHOLDERS
**Purpose:** Integration standards per external surface.
**Completion:** 12.5% — only `HL7_FHIR.md` is complete.
**Files completed:** `HL7_FHIR.md` (6,263 words, Ratified v1.0.0) — covers HL7 v2, HL7 v3/CDA, FHIR R4, terminology services, RESTful conformance, subscriptions, patient identity cross-referencing, OAuth2/SMART security, testing, configuration, monitoring.
**Placeholders:** `WHATSAPP.md`, `SMS.md`, `EMAIL.md`, `PAYMENT_GATEWAYS.md`, `DICOM.md`, `LAB_DEVICES.md`, `NATIONAL_HEALTH_SYSTEMS.md` — all ~200 words each, ToC only.
**In progress:** None.

### 3.1.10 `09_SECURITY/` (12 files) — 10 COMPLETE, 2 PLACEHOLDERS
**Purpose:** Security and compliance references.
**Completion:** 83% — 10 of 12 files ratified v1.0.0.
**Files completed:** `AUTHENTICATION.md` (9,314 words), `AUTHORIZATION.md` (8,965 words), `ROLES_AND_PERMISSIONS.md` (11,313 words — covers all 14 roles R01–R14 with role-permission matrix), `AUDIT.md` (8,219 words), `RECOVERY.md` (7,763 words), `BACKUP.md` (8,289 words), `COMPLIANCE/HIPAA.md` (10,805 words), `COMPLIANCE/GDPR.md` (10,399 words), `COMPLIANCE/DATA_RETENTION.md` (9,702 words), `COMPLIANCE/SECURITY_GUIDELINES.md` (9,717 words).
**Placeholders:** `COMPLIANCE/PRIVACY_POLICY.md`, `COMPLIANCE/MEDICAL_RECORD_POLICY.md` — both ~218 words, ToC only.
**In progress:** None.

### 3.1.11 `10_API/` (4 files) — PLACEHOLDERS
**Purpose:** API design guidelines, endpoint catalogue, error codes, versioning.
**Completion:** 0% — all 4 files are stubs.
**Placeholders:** `API_GUIDELINES.md`, `ENDPOINTS.md`, `ERROR_CODES.md`, `VERSIONING.md` — all ~180 words each, ToC only.
**In progress:** None.

### 3.1.12 `11_TESTING/` (5 files) — PLACEHOLDERS
**Purpose:** Testing strategy and standards.
**Completion:** 0% — all 5 files are stubs.
**Placeholders:** `TESTING_STRATEGY.md`, `UNIT_TESTS.md`, `INTEGRATION_TESTS.md`, `UI_TESTS.md`, `PERFORMANCE_TESTS.md` — all ~175 words each, ToC only.
**In progress:** None.

### 3.1.13 `12_ADR/` (12 files) — COMPLETE
**Purpose:** Architecture Decision Records.
**Completion:** 100% ratified (001–006 at v2.0.0 Ratified; 007–010, 012, 013 at v1.0.0 Accepted).
**Files completed:** See §5 for the full ADR catalogue.
**Placeholders:** None. ADR-011 is reserved as future (non-pharmacy inventory module packaging, per ADR-010 §6.1).
**In progress:** None.

### 3.1.14 `13_DEPLOYMENT/` (5 files) — PLACEHOLDERS
**Purpose:** Environment-specific deployment references.
**Completion:** 0% — all 5 files are stubs.
**Placeholders:** `DEVELOPMENT.md`, `STAGING.md`, `PRODUCTION.md`, `DEVOPS.md`, `BACKUPS.md` — all ~170 words each, ToC only.
**In progress:** None.

### 3.1.15 `14_FUTURE/` (5 files) — PLACEHOLDERS
**Purpose:** Future-direction references.
**Completion:** 0% — all 5 files are stubs.
**Placeholders:** `MOBILE.md`, `CLOUD.md`, `ENTERPRISE.md`, `AI_ROADMAP.md`, `IDEAS.md` — all ~175 words each, ToC only.
**In progress:** None.

### 3.1.16 `99_WORKLOG/` (1 file) — COMPLETE
**Purpose:** Architecture audit reports.
**Files completed:** `ARCHITECTURE_AUDIT_AFTER_RESCUE.md` — the post-rescue audit that identified the fabricated deviations later resolved by ADRs 007–010.

## 3.2 Documentation Framework Totals

- **16 documentation folders**
- **128 Markdown files**
- **~90 substantively complete files** (~70% by file count, ~95% by word count)
- **~38 placeholder stubs** (awaiting body authoring)
- **~620,000 total words** of ratified documentation content

---

# 4. Major Documents Completed

## 4.1 `PRODUCT_BIBLE.md`

- **Purpose:** The canonical product reference; the source of truth for product strategy, identity, philosophy, principles, scope, market positioning, customer tiers, modules, roles, governance, and glossary. Every other product/module/operational document is "Authoritative — Elaboration of PRODUCT_BIBLE" and explicitly defers to it on conflict.
- **Current version:** 2.0.0 (Ratified)
- **Approximate size:** 30,777 words, 2,429 lines, 35 sections, 226 H3 subsections, 370 table rows.
- **Important sections:**
  - §1 Introduction (incl. §1.5 The Ibn Hayan Identity — namesake Jabir ibn Hayyan, three operating commitments)
  - §2 Product Vision (decade horizon, three vectors: depth/breadth/reach)
  - §3 Product Mission (single, configurable, durable)
  - §4 Product Philosophy (four beliefs)
  - §5 Core Principles (P-1 through P-8)
  - §6 Design Principles (D-1 through D-10)
  - §7 Product Goals (G-1 through G-8)
  - §10 Stakeholders (precedence: patient safety > practitioner experience > operational viability > regulatory compliance > commercial sustainability)
  - §11–§12 Product Scope / Out of Scope
  - §13 Product Differentiators (8 differentiators with comparison to Epic, Cerner, Athenahealth, Odoo Healthcare, ERPNext Healthcare, generic CMS)
  - §14 Business Model
  - §15 SaaS Strategy
  - §16 Editions (E0 Trial / E1 Essential / E2 Professional / E3 Enterprise)
  - §17 Organization Types
  - §18 Clinic Types (30 types)
  - §19 Modules (M01–M19)
  - §20 User Roles (R01–R14)
  - §21 Permissions
  - §22 Configuration-Driven Philosophy
  - §25 Regional Adaptation
  - §26 Accessibility Strategy
  - §27 Data Strategy
  - §28 Offline Strategy
  - §31 Long-Term Roadmap (Year 1 committed / Year 2 planned / Year 3 indicative)
  - §32 Success Metrics
  - §34 Glossary (~75 terms)
- **Why important:** This document defines the product's identity, commitments, and non-negotiable principles. Any product decision that violates it must be rejected.
- **Dependent documents:** All other documents in `00_PROJECT/`, `02_PRODUCT/`, `07_MODULES/`, `09_SECURITY/COMPLIANCE/`, `03_DOMAIN/`, `08_INTEGRATIONS/`, `14_FUTURE/` elaborate specific sections of `PRODUCT_BIBLE.md`.

## 4.2 `SYSTEM_ARCHITECTURE.md`

- **Purpose:** The canonical architectural reference; the source of truth for the platform's system-level architecture. Prevails over every other architectural or module document on conflict.
- **Current version:** 2.0.0 (Ratified)
- **Approximate size:** 24,945 words, 2,356 lines, 30 sections.
- **Important sections:**
  - §4 Architectural Principles (P1–P18 with explicit precedence: P1 > P13 > P5 > P10 > P4 > P8 > P16 > P14 > all others)
  - §5 High-Level Architecture (Mermaid diagram of 8 layers: Experience → Edge → Orchestration → Domain → Platform Services → Integration → Data → Offline Substrate)
  - §6 Platform Layers (detailed responsibility of each layer)
  - §7 Domain-Driven Architecture (19 bounded contexts BC01–BC19; §7.7 documents deviations: BC09 Inventory, BC18 Feature Flags packaging within M15, M17 Integration and M18 Reporting without dedicated BCs)
  - §8 Configuration-Driven Architecture
  - §10 Multi-Tenancy Architecture (3 isolation levels IL1/IL2/IL3; 7 tenant lifecycle stages; layered enforcement across edge, orchestration, domain, platform services, integration, data, offline substrate)
  - §15 Configuration Layer Model (8-layer precedence: platform default → edition → tenant → facility → department → care team → user → session)
  - §17 Data Architecture (5 store types: transactional, analytical, cache, object, audit)
  - §23 Deployment Architecture (5 deployment models DM1–DM5: Multi-Tenant SaaS, Single-Tenant Dedicated, Hybrid, Air-Gapped, Region-Specific)
  - §24 Offline Architecture
  - §25 Offline Synchronization (3 conflict resolution strategies: CR1 Last-Write-Wins, CR2 Field-Level Merge, CR3 Manual Resolution)
  - §27 Audit Architecture
- **Why important:** Defines the structural commitments that every implementation decision must respect. A decision that does not fit the layered structure is either out of scope or requires an architectural amendment.
- **Dependent documents:** All architecture elaborations (`MODULE_ARCHITECTURE.md`, `SOFTWARE_ARCHITECTURE.md`, `CONFIGURATION_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`, `CODING_STANDARDS.md`), all ADRs, all `03_DOMAIN/` documents.

## 4.3 `BUSINESS_MODEL.md`

- **Purpose:** Strategic business model reference; elaborates `PRODUCT_BIBLE` §14 (Business Model), §15 (SaaS Strategy), and §16 (Editions).
- **Current version:** 1.0.0 (Ratified)
- **Approximate size:** 8,864 words, 555 lines, 14 sections.
- **Important sections:** §1 Business Model Canvas (Osterwalder pattern), §2 Value Propositions, §3 Customer Segments (T1–T6), §4 Revenue Streams, §5 Pricing Strategy (transparent, tiered, non-negotiated), §6 Distribution Channels, §11 Cost Structure, §12 Unit Economics (NRR > 110%, 7+ year customer lifetime).
- **Why important:** Defines how the platform sustains itself across the decade horizon. Pricing transparency and the absence of per-customer negotiation are non-negotiable.
- **Dependent documents:** `PRODUCT_ROADMAP.md`, `EDITIONS.md`.

## 4.4 `PROJECT_VISION.md`

- **Purpose:** Strategic vision reference; elaborates `PRODUCT_BIBLE` §2 (Vision) and §3 (Mission).
- **Current version:** 1.0.0 (Ratified)
- **Approximate size:** 8,128 words, 394 lines, 11 sections.
- **Important sections:** §1 Vision Statement (decade horizon, three vectors), §2 Mission (three adjectives), §3 Core Values (V-1 through V-10), §4 Strategic Pillars (SP-1 through SP-7), §5 5-Year Vision, §6 10-Year Vision (operating system status), §7 North Star Metrics (practitioner experience / customer health / platform health / strategic progress), §8 Strategic Themes (T-1 through T-7), §9 Stakeholder-to-Vision Mapping.
- **Why important:** The vision is the test the Product Council applies when prioritizing work.
- **Dependent documents:** `PRODUCT_BIBLE.md` (canonical upstream); `PROJECT_SCOPE.md`, `BUSINESS_MODEL.md`, `PRODUCT_ROADMAP.md` (siblings).

## 4.5 `PROJECT_SCOPE.md`

- **Purpose:** Strategic scope reference; elaborates `PRODUCT_BIBLE` §11 (Scope) and §12 (Out of Scope).
- **Current version:** 1.0.0 (Ratified)
- **Approximate size:** 8,252 words, 513 lines, 13 sections.
- **Important sections:** §2 In-Scope Module Catalogue (19 modules across 5 categories), §3 Out-of-Scope Items (capability, adaptation, data, commercial, implementation), §4–§6 Phase 1/2/3 scope, §8 Assumptions, §9 Dependencies, §10 Constraints, §11 Scope Change Process, §12 Scope Governance.
- **Why important:** Defines what the platform does and does not attempt. Scope discipline is the single most important practice for preserving the platform's coherence across the decade horizon.
- **Dependent documents:** `PRODUCT_ROADMAP.md`, `MODULES.md`.

## 4.6 `MODULE_ARCHITECTURE.md`

- **Purpose:** Implementation-grade architectural specification for module boundaries, contracts, dependencies, lifecycle, communication patterns, versioning, extension points, configuration surface, isolation, testing, governance.
- **Current version:** 2.0.0 (Ratified)
- **Approximate size:** 18,021 words, 954 lines, 14 sections.
- **Important sections:** §2 Module Catalogue, §3 Module Boundaries, §4 Module Contracts (commands, queries, events, configuration schemas), §5 Module Dependencies, §6 Module Lifecycle (LC1 Concept → LC2 Pilot → LC3 General Availability → LC4 Mature → LC5 Deprecated), §7 Module Communication Patterns, §11 Module Isolation Strategy, §12 Module Testing Strategy.
- **Why important:** Defines the rules engineers must follow when implementing modules. Direct cross-module data access is forbidden and rejected at code review.
- **Dependent documents:** All `07_MODULES/*.md` files, `MODULES.md`, `FEATURES.md`.

## 4.7 `CONFIGURATION_ARCHITECTURE.md`

- **Purpose:** Implementation-grade architectural specification for the configuration layer.
- **Current version:** 2.0.0 (Ratified)
- **Approximate size:** 12,815 words, 745 lines, 14 sections.
- **Important sections:** §2 The Eight-Layer Configuration Model (L1 platform default → L2 edition → L3 tenant → L4 facility → L5 department → L6 care team → L7 user → L8 session), §3 Tenant Configuration Surface, §4 Module Configuration Surface, §5 Feature Flag Architecture, §6 Configuration Storage, §7 The Five Validation Rule Categories (V1 Structural, V2 Referential, V3 Semantic, V4 Contextual, V5 Regulatory), §8 Configuration Lifecycle, §11 Hot-Reload Architecture, §12 Configuration Audit Trail.
- **Why important:** Configuration is the platform's primary adaptation mechanism. Every behavioural variation that differs across customers, editions, regions, facilities, and care teams is expressed as configuration data that is validated, versioned, audited, and evaluated at runtime.
- **Dependent documents:** `ADR-001`, `ADR-007`, `03_DOMAIN/CONFIGURATION.md`, `07_MODULES/SETTINGS.md`.

## 4.8 `ROLES_AND_PERMISSIONS.md`

- **Purpose:** Security reference defining the 14-role catalogue (R01–R14), permission model, role-permission matrix, custom roles, role hierarchy, assignment workflow, lifecycle, and inheritance.
- **Current version:** 1.0.0 (Ratified)
- **Approximate size:** 11,313 words, 14 sections.
- **Important sections:** §2 Role Definitions (R01 Physician, R02 Nurse, R03 Pharmacist, R04 Technician, R05 Allied Health Professional, R06 Receptionist, R07 Scheduler, R08 Biller, R09 Administrator, R10 Compliance Officer, R11 HR Manager, R12 Executive, R13 System Administrator, R14 Integration Account), §3 Permission Catalog, §4 Role-Permission Summary Matrix (R/W/X/A/- by permission category), §5 Custom Roles (tenant-scoped, cannot weaken platform defaults, cannot combine incompatible categories), §6 Role Hierarchy (H1–H5 organizational scope, FC1–FC4 functional categories, Separation of Duties rules), §7 Role Assignment Workflow (A1–A7 mandatory process), §9 Permission Inheritance (L3–L8 layers).
- **Why important:** Direct principal-permission assignment is FORBIDDEN — only role-based assignment supported. The 14-role catalogue is stable across the decade horizon.
- **Dependent documents:** `AUTHORIZATION.md`, `USER_ROLES.md`, `PERMISSIONS.md`.

## 4.9 `AUTHENTICATION.md`

- **Purpose:** Security reference for authentication methods, password policies, MFA, SSO, session management, biometric authentication, authentication flows, error handling.
- **Current version:** 1.0.0 (Ratified)
- **Approximate size:** 9,314 words, 12 sections.
- **Important sections:** §2 Authentication Methods (AM1–AM9), §3 Password Policies (min 12 chars human / 16 admin; Argon2id; no calendar rotation), §4 MFA (MF1–MF6; required for any principal with PHI access), §5 SSO (SAML 2.0, OIDC; tenant-scoped), §6 Session Management (15-min idle timeout, 8-hour absolute timeout, max 5 concurrent, tenant-bound), §7 Biometric Authentication (on-device only; platform never collects biometric templates), §8 Authentication Flows (standard, SSO, step-up, offline, break-glass, integration account), §9 Error Handling (AE1–AE10; generic messages to prevent identifier enumeration; 5-failures-in-15-min lockout).
- **Why important:** Authentication is the primary control preventing unauthorized access to PHI. Server-managed opaque sessions, not long-lived browser JWTs (per ADR-013).
- **Dependent documents:** `ADR-013`, `AUTHORIZATION.md`, `ROLES_AND_PERMISSIONS.md`.

## 4.10 `CODING_STANDARDS.md`

- **Purpose:** Mandatory coding standards governing all source code — TypeScript strictness, naming, module boundaries, domain isolation, validation, error handling, logging, audit, tenant scope, testing, accessibility, localisation, secrets, migration review, generated-code review, commit size.
- **Current version:** 1.0.0 (Ratified, 2026-07-18)
- **Approximate size:** 5,492 words, 356 lines, 17 sections.
- **Important sections:** §2 TypeScript Standards (strict mode; noImplicitAny, noImplicitThis, noImplicitOverride, noUncheckedIndexedAccess, noFallthroughCasesInSwitch, noImplicitReturns, noUnusedLocals, noUnusedParameters), §4 Module and Dependency-Boundary Rules, §5 Domain Isolation from Framework and ORM Types (`packages/domain` must not import from `@prisma/client`), §6 Validation at External Boundaries (Zod), §7 Error Handling Standards, §8 Logging and PHI Redaction, §9 Audit Requirements, §10 Tenant-Scope Requirements, §11 Testing Standards, §12 Accessibility and Localisation Requirements, §13 Secrets and Environment-Variable Handling, §14 Migration Review Requirements (reviewed raw SQL allowed for PostgreSQL features Prisma cannot express), §15 Generated-Code Review Requirements, §16 Commit Size and Reviewability.
- **Why important:** The implementation-grade baseline required for scaffolding and for the first vertical slice. Not a complete coding handbook; the canonical spine (architecture, ADRs, product bible) provides the rest.
- **Dependent documents:** `FOLDER_STRUCTURE.md`, `ADR-012`.

## 4.11 `FOLDER_STRUCTURE.md`

- **Purpose:** Canonical repository layout — top-level directories, application structure, shared-package responsibilities, dependency direction, test organisation, documentation and prototype layout, configuration files, build artifacts, naming conventions, monorepo vs polyrepo strategy.
- **Current version:** 1.0.0 (Ratified, 2026-07-18)
- **Approximate size:** 4,160 words, 447 lines, 12 sections.
- **Important sections:** §2 Top-Level Directories, §3 Application Structure (`apps/web`, `apps/api`), §4 Shared Package Structure (`packages/contracts`, `packages/domain`, `packages/configuration`, `packages/observability`, `packages/testing`), §5 Dependency Direction and Boundary Rules, §6 Test Organisation, §7 Documentation and Prototype Layout (the `download/mediflow/` and `download/mediflow-pro/` prototypes are reference-only, not build inputs).
- **Why important:** Day-to-day reference for engineers; elaborates ADR-012 to implementation-grade detail.
- **Dependent documents:** `ADR-012`, `CODING_STANDARDS.md`.

## 4.12 `schema.prisma`

- **Purpose:** The canonical persistence schema for the PostgreSQL transactional store.
- **Authority:** Ratified by ADR-006 (Database Strategy) and ADR-012 §1.4 (Prisma safeguards).
- **Approximate size:** 411 lines, 7 models, 3 migrations.
- **Important sections:** `Tenant` (id, slug, displayName, status, timestamps), `Organisation` (composite unique on `(tenantId, code)` and `(tenantId, id)` to support composite FK from `facilities`), `Facility` (composite unique on `(tenantId, organisationId, code)`), `User` (NO password hash — password hash lives on `LocalCredential`), `LocalCredential` (Argon2id PHC string, keyed by `userId`), `TenantMembership` (composite unique on `(tenantId, userId)` and `(id, userId)` — the latter supports the composite FK from `auth_sessions`), `AuthSession` (SHA-256 token hash only, never raw token; nullable `activeTenantMembershipId`).
- **Why important:** This is the actual database schema. Every model is documented inline with references to the ADR-013 sections it implements. All foreign keys use `ON DELETE RESTRICT`. No RLS, no soft-deletes, no extensions, no seed credentials.
- **Dependent documents:** All `apps/api/src/infrastructure/database/repositories/*.ts` files; `apps/api/src/infrastructure/database/mappers/*.ts`; the three migration SQL files.

---

# 5. Architecture Decisions

The platform has ratified **twelve ADRs** (ADR-011 is reserved as future). Each ADR follows a consistent structure: Decision Statement, Context, Alternatives Considered (with explicit verdicts REJECTED / ACCEPTED / DEFERRED), Consequences (Positive / Negative / Neutral / Mitigations), Status, Future Notes. All ADRs are dated 2026-07-18 (Architecture Council ratification).

## 5.1 ADR-001: Configuration-Driven Architecture (v2.0.0, Ratified)

**Decision:** The platform adapts to customer-specific requirements **exclusively through declarative, version-controlled, tenant-scoped configuration**. Source-level customization is rejected as a delivery mechanism. The platform does not maintain customer-specific branches, customer-specific builds, or customer-specific patches.

**Why this decision exists:** Healthcare organizations vary along many dimensions (specialty, size, region, regulatory regime, payment model, care model, integration landscape, organizational structure, clinical practice). A multi-tenant platform cannot support per-tenant code paths without forking per tenant. Customization debt accumulates and becomes unsupportable within the 10+ year horizon. Configuration is the only mechanism that satisfies P2, P3, P10, and P18 simultaneously.

**Alternatives rejected:** Customization-Driven (rejected — incompatible with multi-tenancy, breaks on upgrade, accumulates unpayable debt); Composition-Only (rejected as insufficient — no within-module variation); Sandboxed Extension (deferred as future escape hatch, not active).

**Critical commitment:** Configuration is a first-class architectural concern with its own layer, its own validation framework with five rule categories (Structural, Referential, Semantic, Contextual, Regulatory), and its own audit trail distinct from operational audit. Eight-layer precedence model: platform default → edition → tenant → facility → department → care team → user → session.

## 5.2 ADR-002: Modular Architecture (v2.0.0, Ratified)

**Decision:** The platform is deployed as a **modular monolith by default**. Modules are autonomous units aligned to bounded contexts, each exposing an explicit contract surface (commands, queries, events, configuration schemas) and keeping its internal implementation private. Modules communicate through in-process contracts within a single deployment unit; direct cross-module data access is forbidden and rejected at code review.

**Why this decision exists:** A pure monolith produces coupling that constrains evolution over the decade horizon. Pure microservices produce operational complexity disproportionate to current scale. The modular monolith enforces module boundaries through contracts, preserves in-process performance, simplifies operations, preserves transactional consistency for clinical workflows, and retains the option to extract any module to a service when an ADR justifies the extraction.

**Alternatives rejected:** Pure Monolith (insufficient boundary enforcement); Pure Microservices (operational complexity disproportionate to current scale, distributed transactions hard, network latency, hostile to offline-first); Hybrid (deferred — anticipated evolution path once modules justify extraction).

**Module extraction criteria (§6.1):** A module is a candidate for extraction when one or more of the following criteria are met and documented in a module-specific ADR — independent scaling, independent deployment cadence, regulatory isolation, failure isolation requirement, independent security boundary.

## 5.3 ADR-003: Local-First Strategy (v2.0.0, Ratified)

**Decision:** Client surfaces operate **local-first by default**. Clients maintain durable local stores, operate fully offline when connectivity is unavailable, and synchronize bidirectionally with the central platform when connectivity is restored. Offline-first is not a fallback mode; it is the primary operational mode. Online-only operation is treated as a special case in which the synchronization engine operates continuously.

**Why this decision exists:** Many target healthcare settings have unreliable or absent internet connectivity (rural clinics, mobile outreach units, disaster response, certain public health operations, air-gapped environments). A clinician must be able to record a patient encounter regardless of connectivity. Practitioner-felt latency must be local speed. Cache-First is rejected because clinical actions cannot be deferred (if a medication administration is recorded offline and the server later rejects the write, clinical record diverges from operational record — a clinical safety failure). Offline-as-Fallback is rejected because mode transitions are the most failure-prone aspect of offline-capable systems.

**Conflict resolution strategies (per `SYSTEM_ARCHITECTURE` §25):** CR1 Last-Write-Wins (non-clinical data), CR2 Field-Level Merge (clinical documentation where multiple practitioners edit concurrently), CR3 Manual Resolution (high-stakes conflicts).

**Important note for first slice:** ADR-012 §1.1 explicitly states the first vertical slice may be online-first, but must not contradict ADR-003 — it must preserve identifiers, contracts, audit semantics, and architectural extension points needed for future sanctioned local-first synchronisation substrate.

## 5.4 ADR-004: Multi-Tenant Strategy (v2.0.0, Ratified)

**Decision:** Platform is delivered as a **logically multi-tenant SaaS by default**. Every customer operates as a tenant within a shared platform, with logical isolation of data, configuration, and operational state. Single-tenancy is available as a deployment choice (physical isolation level) for customers with regulatory or contractual requirements, but it runs the same code paths as multi-tenancy. Platform does not maintain customer-specific code branches.

**Why this decision exists:** Customer spectrum from solo practitioners to multinational hospital networks and public health systems. Three isolation mechanisms possible: logical, physical, hybrid. Logical multi-tenancy is the only alternative consistent with ADR-001 (Configuration-Driven) and ADR-002 (Modular Architecture) — sub-linear infrastructure scaling, native cross-tenant operations, platform-wide upgrades, uniform operational posture. Honours P3 (One Platform) and P10 (Multi-Tenancy as Default).

**Isolation levels:** IL1 Logical, IL2 Logical with Dedicated Compute, IL3 Physical.
**Deployment models:** DM1 Multi-Tenant SaaS (default), DM2 Single-Tenant Dedicated, DM3 Hybrid, DM4 Air-Gapped, DM5 Region-Specific.

**Layered enforcement:** Tenant isolation is enforced at every layer — edge, orchestration, domain, platform services, integration, data, offline substrate. A module that does not enforce tenant isolation is defective and is not shipped.

## 5.5 ADR-005: UI Design Philosophy (v2.0.0, Ratified)

**Decision:** The user interface is a **thin client that consumes platform contracts**. Client invokes commands, queries, and event streams exposed by lower layers, and renders configuration schemas the platform provides. Client contains no business logic and holds no durable state beyond what is required for offline operation per ADR-003. UI is healthcare-native, role-aware, accessibility-first, and localization-first.

**Why this decision exists:** Heterogeneous user population (14 user roles, multiple surfaces including web/mobile/desktop/integrator console/patient portal/partner portal, multiple locales including RTL, diverse accessibility needs). Surface-specific UI rejected (inconsistent practitioner experience, multiplied maintenance, drift in business logic and accessibility). Server-rendered UI rejected (incompatible with local-first strategy, cannot serve mobile/desktop, round-trip latency fails practitioner-experience principle). Low-code UI builder deferred (not appropriate for practitioner-facing clinical workflows; may be considered for admin surfaces in the future).

**Ratified properties:** Healthcare-native, Role-aware, Accessibility-first (meets recognized accessibility standards as baseline property, not a feature delivered later), Localization-first (works in all supported languages including RTL as first-class mode, not a translation overlay), Thin over contracts, Offline-capable.

## 5.6 ADR-006: Database Strategy (v2.0.0, Ratified)

**Decision:** Ibn Hayan ratifies a **segmented data architecture** in which durable platform state is partitioned by data class across **five store types**:
1. Transactional store — clinical, operational, financial data with strong consistency
2. Analytical store — aggregated, historical data for reporting
3. Cache store — ephemeral hot-path data
4. Object store — documents, images, exports
5. Audit store — immutable, append-only, tamper-evident audit trail

Each bounded context owns its authoritative state and exposes it to other contexts exclusively through declared query contracts. Direct data access across context boundaries — through shared tables, cross-context joins, or back-channel reads — is **forbidden** and treated as an architectural defect.

**Why this decision exists:** Healthcare platform's data architecture must serve multiple incompatible requirements simultaneously. Clinical and financial operations demand transactional integrity (P5). Reporting and analytics demand query optimization over large historical datasets. Hot paths demand low-latency reads. Documents, images, and exports demand large-object storage. Audit demands immutability and tamper-evidence (P13). No single store can serve all three without compromising at least one.

**Important:** Store technologies are selected per category as **implementation decisions, not architectural identity**. PostgreSQL is selected for the transactional store (per ADR-012); analytical, cache, object, and audit store selections are deferred to future ADRs.

## 5.7 ADR-007: Feature Flags Implementation Packaging for v1 (v1.0.0, Accepted)

**Decision:** BC18 Feature Flags retains its full conceptual separation from Configuration bounded context. For the v1 platform release only, the Feature Flags implementation surface is **packaged within the M15 Configuration/Settings module**.

**Why this decision exists:** Pre-ADR state had a fabricated architectural deviation in `MODULE_ARCHITECTURE.md` §2.4 and `docs/07_MODULES/SETTINGS.md` citing `SYSTEM_ARCHITECTURE.md` §7.7 as source of a "BC18 Feature Flags implemented within M15 Configuration" deviation. The actual §7.7 did not contain this deviation — the citation was fabricated. This ADR replaces the fabricated citation with a ratified packaging decision.

**Critical distinction:** This is **implementation packaging, not a domain ownership merger**. BC18 owns its own domain responsibility, data, query contracts, event contracts, and audit category. The packaging is reversible — a future ADR may extract Feature Flags into its own dedicated module when one of the triggers in §6.1 fires (SETTINGS.md exceeds 1,500 lines, evaluation latency exceeds 20% of M15's CPU time, administrative experience divergence, etc.).

## 5.8 ADR-008: Rejection of Façade Module Category; Reception as Workflow (v1.0.0, Accepted)

**Decision:** The platform **does not introduce a façade module category**. The 19-module catalogue remains the canonical and exhaustive set of modules. **Reception is not a module** — it is a workflow / operational process / experience surface that draws capabilities from multiple bounded contexts (BC01 Patient, BC02 Encounter, BC06 Scheduling, BC07 Billing, BC13 Documents, BC14 Notifications).

**Why this decision exists:** Pre-ADR state of `docs/07_MODULES/RECEPTION.md` claimed M14 module identity for Reception, colliding with canonical M14 Identity & Access. A "façade module" category of one (Reception being the only candidate) is over-engineering. Rejecting the façade category frees the M14 slot for the canonical Identity & Access module.

**Implementation triggers:** Relocate `RECEPTION.md` out of `docs/07_MODULES/`; reframe as workflow document; create `docs/07_MODULES/IDENTITY_AND_ACCESS.md` for canonical M14.

## 5.9 ADR-009: Subscriptions as a Billing Capability (v1.0.0, Accepted)

**Decision:** **Subscription billing is a capability under the M09 Billing module, not a first-class module.** Subscription billing capabilities (recurring invoicing, plan-based pricing, dunning, entitlement-state computation, proration, plan upgrade/downgrade) are owned by the BC07 Billing bounded context and exposed through the M09 Billing module surface.

**Why this decision exists:** Pre-ADR state of `docs/07_MODULES/SUBSCRIPTIONS.md` claimed M19 module identity for Subscriptions, colliding with canonical M19 Localization. Subscription billing data is naturally billing data. Industry convention co-locates subscription billing with transactional billing.

**Critical separation:** Entitlement-state computation is a Billing concern; entitlement enforcement is a Feature Flags concern (per ADR-007). The computation is owned by BC07; the enforcement is owned by BC18.

**Implementation triggers:** Merge useful content from `SUBSCRIPTIONS.md` into `BILLING.md` as a "Subscription Billing" section; delete `SUBSCRIPTIONS.md`; create `docs/07_MODULES/LOCALIZATION.md` for canonical M19.

## 5.10 ADR-010: Inventory Bounded Context and Module Packaging (v1.0.0, Accepted)

**Decision:** (a) BC09 Inventory retains its full status as a first-class bounded context (not absorbed into BC05 Pharmacy); (b) Pharmacy (M05) does not universally own all inventory; (c) medication inventory may integrate tightly with Pharmacy; (d) **non-pharmacy inventory module packaging decision is deferred to a future ADR (proposed ADR-011)**; (e) `docs/07_MODULES/INVENTORY.md` must not claim M07 or any other module code until the future ADR ratifies a module surface.

**Why this decision exists:** Pre-ADR state had conflicting claims — `MODULE_ARCHITECTURE.md` §2.4 said non-pharmacy inventory is accommodated within M05; `INVENTORY.md` claimed M07 module identity (colliding with canonical M07 Documents). Both cited `SYSTEM_ARCHITECTURE.md` §7.7 as authority, but §7.7 was ambiguous. This ADR resolves by confirming BC09 as its own bounded context, rejecting absorption into Pharmacy, and deferring module packaging.

**Implementation triggers:** Amend `MODULE_ARCHITECTURE.md` §2.4; amend `SYSTEM_ARCHITECTURE.md` §7.7; relocate `INVENTORY.md` out of `docs/07_MODULES/`; reframe as BC09 bounded-context reference; create `docs/07_MODULES/DOCUMENTS.md` for canonical M07; draft future ADR-011 for non-pharmacy inventory module packaging.

## 5.11 ADR-012: Application Platform and Repository Structure (v1.0.0, Accepted)

**Decision:** The canonical implementation is a **TypeScript monorepo managed with pnpm workspaces**, organised into two applications and five shared packages:

**Applications:**
- `apps/web` — Next.js application using App Router, React, and strict TypeScript, serving as thin client that consumes published API contracts
- `apps/api` — separate NestJS application using strict TypeScript, composing domain use cases and persistence adapters behind published REST contracts

Next.js route handlers are NOT used as the primary enterprise backend. Initial API style is **versioned REST over JSON with an OpenAPI specification**.

**Five shared packages:**
- `packages/contracts` — Zod-defined API contracts, request/response schemas, error envelopes
- `packages/domain` — bounded-context domain models, use cases, repository interfaces (pure TypeScript, no framework or ORM dependencies)
- `packages/configuration` — configuration schema and evaluation helpers aligned with ADR-001 and the eight-layer precedence model
- `packages/observability` — structured logging, audit emission, metrics, PHI-redaction helpers
- `packages/testing` — test fixtures, factories, shared test utilities

**PostgreSQL is the transactional system of record.** Prisma is the initial ORM with **four explicit safeguards:**
1. **Domain isolation** — `packages/domain` must not import from `@prisma/client`
2. **Repository Interfaces** — persistence behind interfaces declared in `packages/domain`
3. **Reviewed Raw SQL** — used for PostgreSQL features Prisma cannot express (composite FKs, RLS, etc.)
4. **PostgreSQL-First Design** — database design is PostgreSQL-correct first, Prisma schema annotated second

**Zod** for contract and boundary validation. **Tailwind CSS** with project-owned accessible UI components (generated code must be reviewed and owned by the repository; generated code is not accepted as a runtime dependency on a third-party generator). Arabic and English, RTL and LTR, accessibility, keyboard navigation, and localisation are first-class from the first implemented screen. **No patient or protected-health-information data may be persisted in browser localStorage.**

**Prototype disposition:** `download/mediflow/` and `download/mediflow-pro/` are **prototype references only**. They are not the canonical implementation. Their business logic and persistence code must not be ported. Selected visual patterns, wording, RTL behaviour, and workflow ideas may inform the new implementation after review. They must not be moved or deleted by this ADR.

## 5.12 ADR-013: Authentication and Session Strategy (v1.0.0, Accepted)

**Decision:** Browser authentication uses **server-managed opaque sessions, not long-lived browser JWTs**. Session identifiers stored only in cookies configured with HttpOnly, Secure (outside local development), SameSite protection, explicit expiry and rotation, narrow path and domain scope. Server-side session records carry user identity, tenant identity, active organisation/facility context where selected, creation/expiry/last-activity timestamps, revocation status, and security metadata. **Password hashing uses Argon2id** with centrally configured parameters. Authentication and authorisation are separate concerns. Every protected API operation must independently verify (in order): valid session → tenant membership → organisation/facility scope → required permission → resource ownership/scope constraints. **Tenant context must never be trusted solely from browser-supplied input** — verified against session's tenant membership server-side. CSRF protection is mandatory. Rate limiting and progressive login throttling are mandatory. **MFA, OIDC, SAML are future-compatible but not implemented in first vertical slice.** No real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests.

**Why this decision exists:** Healthcare-first security (P1) requires authentication as primary control preventing unauthorized access to PHI. Multi-tenancy (ADR-004) requires authentication to establish tenant identity; authorisation must verify tenant membership at every operation. Long-lived browser JWTs rejected because (1) they cannot be revoked server-side without a server-side revocation list (negating stateless advantage); (2) they carry claims that may become stale; (3) localStorage JWTs are vulnerable to XSS exfiltration.

**Session-record shape (§1.3):** user identity, tenant identity, active organisation context (nullable), active facility context (nullable), creation timestamp, expiry timestamp, last-activity timestamp, revocation status, security metadata (IP at creation/last activity, user agent at creation/last activity, authentication method used, failed-attempt count if any). Session record does NOT include password, password hash, session secret, or any credential material.

---

# 6. Product Decisions

## 6.1 The 19-Module Catalogue (Stable Across Decade Horizon)

The platform's module catalogue is **19 modules** organized into 5 categories:

| Code | Module | Category |
|---|---|---|
| M01 | Patient | Clinical |
| M02 | Encounter | Clinical |
| M03 | Clinical Documentation | Clinical |
| M04 | Orders & Results | Clinical |
| M05 | Pharmacy | Clinical |
| M06 | Scheduling | Operational |
| M07 | Documents | Operational |
| M08 | Notifications | Operational |
| M09 | Billing | Financial |
| M10 | Accounting | Financial |
| M11 | CRM | Administrative |
| M12 | HR | Administrative |
| M13 | Workforce | Administrative |
| M14 | Identity & Access | Platform |
| M15 | Configuration | Platform |
| M16 | Audit | Platform |
| M17 | Integration | Platform |
| M18 | Reporting | Platform |
| M19 | Localization | Platform |

**Reasoning:** 19 is at the upper bound of cognitive manageability. Adding modules is a deliberate architectural decision ratified by ADR. The catalogue is preserved unchanged by ADRs 007, 008, 009, 010 (which respectively reclassify Feature Flags as v1 packaging within M15, Reception as workflow not module, Subscriptions as capability within M09, and defer non-pharmacy inventory module packaging to future ADR-011).

## 6.2 The 14-Role Catalogue (Stable Across Decade Horizon)

14 user roles R01–R14 across 4 functional categories (Clinical / Operational / Administrative / Platform):
- **Clinical:** R01 Physician, R02 Nurse, R03 Pharmacist, R04 Technician, R05 Allied Health Professional
- **Operational:** R06 Receptionist, R07 Scheduler, R08 Biller
- **Administrative:** R09 Administrator, R10 Compliance Officer, R11 HR Manager, R12 Executive
- **Platform:** R13 System Administrator, R14 Integration Account (non-human)

**Reasoning:** Direct principal-permission assignment is FORBIDDEN. Roles are stable; new roles require Architecture Council ratification. Separation of Duties rules enforce incompatibilities (e.g., R01 Physician incompatible with R08 Biller in same scope; R13 System Administrator incompatible with R10 Compliance Officer).

## 6.3 The 4-Edition Catalogue

| Edition | Code | Target Tier | Module Surface |
|---|---|---|---|
| Trial | E0 | T1 evaluation | Subset of Essential |
| Essential | E1 | T1 Solo, T2 Small Practice | Foundational modules |
| Professional | E2 | T3 Mid Practice, T4 Large Practice | Full clinical + operational + financial |
| Enterprise | E3 | T5 Hospital, T6 Hospital Network | All 19 modules + advanced analytics |

**Reasoning:** Transparent, tiered, non-negotiated pricing. Customers compose the platform by enabling modules within their edition's constraints. Same code paths, same configuration model, same operational runtime across all editions.

## 6.4 The 30 Clinic Types

The platform supports **30 clinic types** with validated configuration overlays (only 18 are currently documented in `06_CLINIC_TYPES/`; HOSPITAL is a stub). Clinic types include: General Practice, Dental, Internal Medicine, Pediatrics, Gynecology, Cardiology, Dermatology, Neurology, Orthopedics, Ophthalmology, ENT, Urology, Psychiatry, Plastic Surgery, Radiology, Laboratory, Pharmacy, Physiotherapy, Hospital, and others.

**Reasoning:** Configuration coverage of 100% of customer operational reality (Goal G-2). Each clinic type has a configuration overlay that adapts the 19-module surface to the specialty's workflow depth. Clinic types are configuration, not source-level customization.

## 6.5 The 6 Customer Size Tiers

T1 Solo → T2 Small Practice → T3 Mid Practice → T4 Large Practice → T5 Hospital → T6 Hospital Network.

**Reasoning:** The platform serves customers across all six tiers on the same codebase (P3, P10, D-3, D-5). Tier-specific capability depth is delivered through Phase 1 (T1–T3), Phase 2 (T4 + selected T5), Phase 3 (full T5, T6).

## 6.6 Arabic as Default Language with RTL

The web application defaults to Arabic with `dir="rtl"` at the `<html>` element. English (LTR) is available via a language switch. Language choice is React-memory only — never persisted to localStorage, sessionStorage, IndexedDB, or cookies. Carries no authentication or CSRF information.

**Reasoning:** The platform's launch region is the MENA / GCC / Levant / North Africa region (per `PROJECT_VISION.md` §5.3). Arabic is the primary practitioner language. RTL is a first-class mode, not a translation overlay (per ADR-005 §1.1). Accessibility and localization are first-class from the first implemented screen (per ADR-012 §5.2).

## 6.7 Server-Managed Opaque Sessions (Not JWTs)

Authentication uses server-managed opaque sessions stored in HttpOnly + Secure + SameSite cookies. Session identifiers are high-entropy random values; the database stores only the SHA-256 hash of the token. Long-lived browser JWTs are rejected (per ADR-013 §3.1).

**Reasoning:** Healthcare platform must be able to revoke sessions immediately (server-managed sessions can be revoked server-side; long-lived JWTs cannot without a server-side revocation list which negates stateless advantage). JWT claims may become stale (tenant membership, organisation scope, permissions). JWTs in localStorage are vulnerable to XSS exfiltration.

## 6.8 The Eight-Layer Configuration Precedence Model

Configuration is layered with explicit precedence:
L1 Platform Default → L2 Edition → L3 Tenant → L4 Facility → L5 Department → L6 Care Team → L7 User → L8 Session

Higher layers override lower layers. Overrides may strengthen but not weaken platform-required permissions or policies. Every configuration change is validated against five rule categories (V1 Structural, V2 Referential, V3 Semantic, V4 Contextual, V5 Regulatory) before application.

**Reasoning:** Customers need adaptation at every organizational level (a hospital network may have different defaults than a single clinic; a department may have different operating procedures than another department in the same facility; a care team may have role-specific preferences; a user may have personal preferences; a session may have temporary overrides). All of this is configuration, never source-level customization (per ADR-001).

## 6.9 Tenant Context Selection by Membership ID (Not Tenant ID)

When a user selects an active tenant context, the selection is by `TenantMembership.id`, never by an arbitrary `Tenant.id`. The session cannot be forced into a Tenant for which the user has no membership. The composite foreign key `auth_sessions(active_tenant_membership_id, user_id) → tenant_memberships(id, user_id)` enforces at the database level that a session cannot reference another user's membership.

**Reasoning:** Per ADR-013 §1.5, tenant context must never be trusted solely from browser-supplied input. A user could try to set their active context to a Tenant they don't belong to by submitting a different tenant ID. Selecting by membership ID (and enforcing same-user constraint at the DB level) makes this impossible — a user can only select from their own memberships.

## 6.10 No Patient Data in Browser localStorage

Per ADR-012 §5.2: "No patient or protected-health-information data may be persisted in browser localStorage."

**Reasoning:** localStorage is vulnerable to XSS exfiltration. PHI must be persisted server-side in the transactional store with strong consistency, audit, and tenant scoping. The browser may cache PHI only in memory (React state) or in the offline substrate's encrypted local store (per ADR-003 — future implementation).

## 6.11 Argon2id for Password Hashing

Password hashing uses Argon2id with centrally configured parameters (memory cost, time cost, parallelism). Parameters are versioned and recorded in CHANGELOG when changed. The repository-interface pattern (password-hasher interface) ensures the algorithm can be replaced without re-architecting.

**Reasoning:** Argon2id is the password-hashing competition winner (2015) and recommended choice for new systems. bcrypt is older and less resistant to GPU-based attacks. PBKDF2 is less resistant to specialized hardware attacks. Argon2id parameters can be tuned over time without re-hashing existing passwords (the PHC string includes parameters and version).

## 6.12 The Practitioner-Focus Test

Every mission-level decision is tested by asking what a practitioner will experience. A platform that satisfies a procurement committee but frustrates a practitioner on the floor is not advancing the mission; it is betraying it (per `PROJECT_VISION.md` §2.4).

**Reasoning:** Practitioner time is the scarcest resource in healthcare. Practitioners cannot absorb process friction through staffing. The platform invests in sub-second latency for routine actions, accessibility completeness, offline-first operation for low-connectivity regions, and workflow depth per specialty rather than generic templates — investments that procurement committees rarely notice but that practitioners feel every shift.

---

# 7. Documentation Framework

## 7.1 Folder Structure

Documentation lives under `/home/z/my-project/download/docs/` and is organized into **16 numbered folders** plus one worklog folder:

```
docs/
├── 00_PROJECT/         (6 files)  — strategic project references
├── 01_ARCHITECTURE/    (6 files)  — canonical architectural references
├── 02_PRODUCT/         (7 files)  — product surface elaborations
├── 03_DOMAIN/          (8 files)  — domain-level references
├── 04_DATABASE/        (6 files)  — database design references [PLACEHOLDERS]
├── 05_UI_UX/           (10 files) — UI/UX design references [PLACEHOLDERS]
├── 06_CLINIC_TYPES/    (19 files) — per-clinic-type overlay references
├── 07_MODULES/         (14 files) — per-module implementation references
├── 08_INTEGRATIONS/    (8 files)  — integration standards per external surface
├── 09_SECURITY/        (6 files)  — security references
│   └── COMPLIANCE/     (6 files)  — compliance references (HIPAA, GDPR, etc.)
├── 10_API/             (4 files)  — API design references [PLACEHOLDERS]
├── 11_TESTING/         (5 files)  — testing references [PLACEHOLDERS]
├── 12_ADR/             (12 files) — architecture decision records
├── 13_DEPLOYMENT/      (5 files)  — deployment references [PLACEHOLDERS]
├── 14_FUTURE/          (5 files)  — future-direction references [PLACEHOLDERS]
└── 99_WORKLOG/         (1 file)   — audit reports
```

The numbered prefix establishes reading order: 00 (project) → 01 (architecture) → 02 (product) → 03 (domain) → 04–08 (vertical slices) → 09 (security) → 10–11 (API & testing) → 12 (ADR) → 13 (deployment) → 14 (future) → 99 (worklog).

## 7.2 Folder & File Counts

- **16 documentation folders** (15 numbered + 1 worklog + 1 nested COMPLIANCE)
- **128 Markdown files** total
- **~90 substantively complete files** (~70%)
- **~38 placeholder stubs** (~30%)
- **~620,000 total words** of ratified content

## 7.3 Documentation Philosophy

The documentation framework operates on six principles:

1. **Single source of truth.** `PRODUCT_BIBLE.md` is the canonical product reference; `SYSTEM_ARCHITECTURE.md` is the canonical architectural reference. Every other document is "Authoritative — Elaboration of" one of these and explicitly defers on conflict.
2. **Documented before shipped.** Per Core Principle P-7 and Architectural Principle P7, every capability, configuration surface, role, permission, and integration is documented before it is exposed to a customer. Undocumented capability is defective capability.
3. **Implementation-grade detail.** Documentation is not a sketch; it is implementation-grade. Each document carries a front-matter table specifying Owner, Custodian, Review Cadence, Audience, Scope, Out of Scope, Conflict Resolution, Amendment Mechanism, Predecessor.
4. **Conflict resolution is explicit.** Every document states which document prevails on conflict. The hierarchy is: PRODUCT_BIBLE > SYSTEM_ARCHITECTURE > MODULE_ARCHITECTURE / SOFTWARE_ARCHITECTURE / CONFIGURATION_ARCHITECTURE > domain references > module references > all other elaborations.
5. **Amendment is ratified.** Amendments are made through Architecture Council (architecture) or Product Council (product) ratification, recorded in CHANGELOG with explicit version increment. Casual amendments are forbidden.
6. **Review cadence is quarterly** for most documents; some are annual (HIPAA, GDPR, Data Retention). Off-cycle revision is allowed when an ADR or product decision is ratified.

## 7.4 Cross-Reference Strategy

Cross-references are explicit and section-numbered. Every document includes a "Related Documents" final section listing upstream canonical references, sibling documents, and downstream documents with specific section numbers (e.g., "PRODUCT_BIBLE Sections 2, 3, 4, 5, 6, 7, 10, 30"). Cross-references flow downward through the hierarchy — upstream documents do not reference downstream documents (avoiding circular dependencies).

## 7.5 Documentation Writing Standards

- Front-matter table is mandatory (Document Title, Project, Document Type, Authority Level, Version, Status, Owner, Custodian, Review Cadence, Audience, Scope, Out of Scope, Conflict Resolution, Amendment Mechanism, Predecessor).
- Section headings are numbered (1., 1.1, 1.1.1) for stable cross-referencing.
- Tables are used liberally for structured comparisons (alternatives considered, role-permission matrix, retention periods, etc.).
- ADRs follow a consistent structure: Decision Statement → Context → Alternatives Considered → Consequences → Status → Future Notes.
- Every architectural decision has explicit alternatives with explicit verdicts (ACCEPTED / REJECTED / DEFERRED) and rationale.
- No marketing language. No implementation details in canonical documents. No source code, database schemas, or API contracts in canonical documents (those live in source).
- The namesake "Ibn Hayan" should appear 5–15 times per document to reinforce identity.
- "Forbidden-term scan" is performed before ratification — terms like "MediFlow" (legacy prototype name), "schema change" (use "configuration evolution" instead), "code change" (use "implementation" instead) are flagged.

---

# 8. Current Work

## 8.1 Current Wave

The project is at the end of **Wave 3: Canonical Implementation Batches**. The most recent commit (`de2d7ed`) delivered Batch 7: the premium clinic landing and login redesign. The working tree is clean. The next wave (Wave 4) is undefined — the handover recipient must decide what to prioritize.

## 8.2 Current Tasks

There are no in-flight tasks. The handover was triggered because the user lost their ChatGPT account and needed a complete reconstruction of the project state from the canonical repository.

## 8.3 Completed Tasks (Chronological)

### Wave 1: Documentation Framework Establishment
- Authored `PRODUCT_BIBLE.md` (v1.0.0 → v1.1.0 with identity pass → v2.0.0 with full redo)
- Authored `SYSTEM_ARCHITECTURE.md` (v1.0.0 → v2.0.0 with 30 sections, 18 principles, 19 bounded contexts)
- Authored ADRs 001–006 (v1.0.0 → v2.0.0 with explicit alternatives)
- Authored 3 architecture elaboration documents (SOFTWARE_ARCHITECTURE, MODULE_ARCHITECTURE, CONFIGURATION_ARCHITECTURE)
- Authored 7 product elaboration documents (MODULES, FEATURES, EDITIONS, USER_ROLES, PERMISSIONS, CLINIC_TYPES, WORKFLOWS)
- Authored 8 domain references (BUSINESS_RULES, CLINICAL_WORKFLOWS, FEATURE_FLAGS, STATUS_CODES, ENUMS, TERMINOLOGY, CONFIGURATION, CALCULATIONS)
- Authored 18 clinic-type overlay references (all except HOSPITAL)
- Authored 14 module references (PATIENTS through SETTINGS)
- Authored 10 security references (AUTHENTICATION through SECURITY_GUIDELINES, plus HIPAA, GDPR, DATA_RETENTION)
- Authored HL7_FHIR integration reference
- Authored FOLDER_STRUCTURE and CODING_STANDARDS

### Wave 2: Architecture Audit and Remediation
- Authored `ARCHITECTURE_AUDIT_AFTER_RESCUE.md` identifying fabricated deviations (F-01 through F-18)
- Ratified ADRs 007–010 to resolve the fabricated deviations (Feature Flags packaging, Reception as workflow, Subscriptions as Billing capability, Inventory BC and module packaging)
- Aligned canonical spine with ADRs 007–010
- Ratified implementation foundation decisions (commit `cd3ff34`)

### Wave 3: Canonical Implementation Batches
- **Batch 2** (commit `282b2b3`): Scaffolded pnpm monorepo with `apps/web` (Next.js 16), `apps/api` (NestJS 11), 5 shared packages; TypeScript strict; ESLint; Vitest
- **Batch 3** (commit `95733f8`): Connected web and API through shared health contract; `GET /api/v1/health` endpoint; web ↔ API contract test
- **Batch 4** (commit `5f76ab7`): Established PostgreSQL tenancy foundation; `Tenant` / `Organisation` / `Facility` Prisma models; first reviewed raw SQL composite FK supplement
- **Batch 5** (commit `5825e74`): Implemented secure local authentication sessions; `User` / `LocalCredential` (Argon2id) / `TenantMembership` / `AuthSession` (SHA-256 token hash); login/session/csrf/logout endpoints; HttpOnly cookies; CSRF; rate limiting
- **Batch 6** (commit `84e5b56`): Implemented membership-backed tenant context; nullable `active_tenant_membership_id` on `AuthSession`; composite FK enforcing same-user constraint; context read/select/clear endpoints
- **Batch 7** (commit `de2d7ed`): Redesigned premium clinic landing and login experience; bilingual (Arabic default RTL, English LTR); split hero with brand value + integrated login panel; three value sections; project-owned design tokens in `globals.css`

## 8.4 Remaining Tasks

The following work is identified but not started:

### 8.4.1 Phase 2/3 Remediation from ADRs 007–010
Per the Implementation Triggers sections of ADRs 007, 008, 009, 010:
- Amend `SYSTEM_ARCHITECTURE.md` §7.7 to document v1 packaging (ADR-007), clarify BC09 bounded-context status (ADR-010)
- Amend `MODULE_ARCHITECTURE.md` §2.4 to remove fabricated BC18-within-M15 deviation (ADR-007), remove claim that non-pharmacy inventory is accommodated within M05 (ADR-010)
- Relocate `docs/07_MODULES/RECEPTION.md` out of `docs/07_MODULES/` (ADR-008) — reframe as workflow document
- Merge useful content from `docs/07_MODULES/SUBSCRIPTIONS.md` into `docs/07_MODULES/BILLING.md` as "Subscription Billing" section; delete `SUBSCRIPTIONS.md` (ADR-009)
- Reframe `docs/07_MODULES/INVENTORY.md` as BC09 bounded-context reference; relocate out of `docs/07_MODULES/` (ADR-010)
- Create `docs/07_MODULES/IDENTITY_AND_ACCESS.md` for canonical M14 (ADR-008)
- Create `docs/07_MODULES/LOCALIZATION.md` for canonical M19 (ADR-009)
- Create `docs/07_MODULES/DOCUMENTS.md` for canonical M07 (ADR-010)
- Draft future ADR-011 for non-pharmacy inventory module packaging (ADR-010 §6.1)

### 8.4.2 Documentation Placeholder Authoring
38 placeholder stubs need body authoring (see §3 for the per-folder breakdown). Priority order recommended: API > Testing > Deployment > remaining Compliance (Privacy Policy, Medical Record Policy) > remaining Integrations > UI/UX > Database > Future > HOSPITAL clinic type.

### 8.4.3 Implementation of Patient-Encounter Vertical Slice
The first vertical slice beyond authentication/context is the M01 Patient → M02 Encounter slice. Per ADR-012 §5.3: "login → select organisation or clinic → view patient list → search patients → create patient → view patient profile → record audit events."

### 8.4.4 Row-Level Security and Database-Role Separation
Per the schema.prisma comments: "No row-level security policies exist yet. RLS and database-role separation arrive in a dedicated reviewed batch before any tenant-owned data is exposed through a public API endpoint." This is a mandatory prerequisite before the Patient module endpoints can be exposed publicly.

### 8.4.5 Soft-Delete Strategy
Per the schema.prisma comments: "No soft-delete columns (`deletedAt`). Soft-delete is a future batch concern, governed by a separate ADR." Required before patient records can be archived without losing audit history.

### 8.4.6 Role and Permission Catalogue
Per the schema.prisma comments: "No role or permission columns exist on TenantMembership. The role/permission catalogue is deferred to a subsequent batch." Required before authorisation enforcement can move beyond tenant membership check.

### 8.4.7 Active Organisation and Facility Context
Per the schema.prisma comments: "No active Organisation or Facility context columns exist on AuthSession. The fifth batch introduces active Tenant context only." Required before the dashboard can show facility-scoped data.

## 8.5 Estimated Remaining Work

The remaining work is substantial. A rough estimate:

- **Phase 2/3 remediation from ADRs 007–010**: 2–3 days of documentation work (relocate 3 files, merge content, create 3 new module files, draft ADR-011).
- **API/Testing/Deployment docs**: 1–2 weeks (10 files × ~1 day each).
- **UI/UX docs**: 1–2 weeks (10 files × ~1 day each).
- **Database docs**: 3–5 days (6 files; less work because the schema is already implemented).
- **Remaining Compliance/Integrations/Future docs**: 1–2 weeks (12 files × ~1 day each).
- **HOSPITAL clinic type**: 2–3 days.
- **RLS + database-role separation**: 3–5 days of implementation.
- **Soft-delete ADR + implementation**: 3–5 days.
- **Role/permission catalogue**: 1 week.
- **Active org/facility context**: 3–5 days.
- **Patient-Encounter vertical slice**: 2–4 weeks (M01 + M02 with full CRUD, audit, validation, tests).

**Total estimated remaining work for production-ready MVP**: 8–12 weeks of focused engineering + documentation effort.

---

# 9. Recommended Next Steps

The handover recipient should prioritize as follows:

## 9.1 Immediate (Day 1)

1. **Verify repository state.** Confirm `git status` is clean, HEAD is `362d4cd`, origin/main is `84e5b56`, working tree is one commit ahead.
2. **Read this handover document in full.**
3. **Read `PRODUCT_BIBLE.md` and `SYSTEM_ARCHITECTURE.md`** — these are the two canonical sources of truth.
4. **Read ADR-012 and ADR-013** — these govern the current implementation surface.
5. **Verify the dev environment can boot:** `pnpm install` (uses pnpm@11.14.0, Node 24), `pnpm run build:shared`, then with a temporary PostgreSQL 17 database outside the repo, set `DATABASE_URL`, run `pnpm --filter @ibn-hayan/api db:migrate:deploy`, then `pnpm --filter @ibn-hayan/api auth:bootstrap-dev` (requires `ALLOW_DEV_AUTH_BOOTSTRAP=true` and the dev auth env vars), then `pnpm dev:api` and `pnpm dev:web`. Demo login: `demo@ibnhayan.local` / `IbnHayan-Demo-2026!`.

## 9.2 Short-Term (Week 1–2): Phase 2/3 Remediation

6. **Execute the Implementation Triggers from ADRs 007–010.** Relocate RECEPTION.md, merge SUBSCRIPTIONS.md content into BILLING.md then delete SUBSCRIPTIONS.md, reframe INVENTORY.md as BC09 reference, create IDENTITY_AND_ACCESS.md / LOCALIZATION.md / DOCUMENTS.md. Amend `SYSTEM_ARCHITECTURE.md` §7.7 and `MODULE_ARCHITECTURE.md` §2.4. Draft ADR-011.
7. **Author `docs/07_MODULES/HOSPITAL.md`** to complete the clinic-type catalogue (only remaining stub).

## 9.3 Mid-Term (Week 2–6): Foundational Implementation Prerequisites

8. **Implement Row-Level Security policies** on all tenant-scoped tables (tenants, organisations, facilities, users, local_credentials, tenant_memberships, auth_sessions, and all future tenant-owned tables). Use PostgreSQL RLS with database roles. Ratify as a reviewed raw SQL migration per ADR-012 §1.4 safeguard 3. **This is a mandatory prerequisite before any tenant-owned data is exposed through a public API endpoint.**
9. **Ratify ADR-014 (Soft-Delete Strategy).** Define which entities support soft-delete, the `deletedAt` column convention, the soft-delete filter behavior, and the audit implications.
10. **Implement role and permission catalogue** on `TenantMembership`. Add a `roles` column (or junction table) and a `permissions` column (or junction table). Wire into the per-operation verification chain (ADR-013 §1.4).
11. **Implement active Organisation and Facility context** on `AuthSession` (nullable `activeOrganisationId` and `activeFacilityId` columns, with composite FKs enforcing same-tenant constraint).

## 9.4 Medium-Term (Week 4–10): Patient-Encounter Vertical Slice

12. **Implement M01 Patient module** — patient registration, identity, demographics, consent, medical record lifecycle. Endpoints: `POST /api/v1/patients`, `GET /api/v1/patients`, `GET /api/v1/patients/:id`, `PATCH /api/v1/patients/:id`. Full audit. Tenant-scoped. RLS-enforced.
13. **Implement M02 Encounter module** — encounter management across outpatient, inpatient, emergency, telehealth. Endpoints: `POST /api/v1/encounters`, `GET /api/v1/encounters`, `GET /api/v1/encounters/:id`, `PATCH /api/v1/encounters/:id`. Status transitions per `STATUS_CODES.md` §5.
14. **Implement web UI for patient list, search, create, profile** — extending the premium design system in `globals.css`. Arabic default. Accessibility-first.
15. **Author the API, Testing, and Deployment documentation placeholders** in parallel (10 files).

## 9.5 Long-Term (Week 8+): Continued Module Implementation

16. **M03 Clinical Documentation** — clinical notes, structured documentation, templates, assessments.
17. **M04 Orders & Results** — order entry, result management, decision support, result reporting.
18. **M06 Scheduling** — appointment scheduling, resource scheduling, queue management.
19. **M09 Billing** — invoice generation, payment processing, insurance claim lifecycle.
20. **M16 Audit** — dedicated audit module (currently audit events are stored in the transactional store; the dedicated audit store arrives per ADR-006 future ADR).
21. **Continue with remaining modules** per the Phase 1 / Phase 2 / Phase 3 scope defined in `PROJECT_SCOPE.md` §4–§6.

## 9.6 Ongoing

22. **Maintain the worklog** at `/home/z/my-project/worklog.md` (append-only, with Task ID, Agent, Task, Work Log, Stage Summary for every task).
23. **Ratify new ADRs** when architectural decisions are required (deployment topology, analytical store, cache store, object store, dedicated audit store, MFA, OIDC, SAML, local-first synchronisation substrate).
24. **Schedule quarterly reviews** of all ratified documents per their review cadence.
25. **Never compromise the permanent rules** listed in §10 below.

---

# 10. Permanent Rules

The following rules are **non-negotiable** and may not be changed unless explicitly approved by the Architecture Council (for architecture rules) or Product Council (for product rules). Violations are critical defects.

## 10.1 Architectural Rules

### 10.1.1 Configuration Before Customization (P2)
No source-level customization for customers. No customer-specific branches. No customer-specific builds. No customer-specific patches. All adaptation is through declarative, version-controlled, tenant-scoped configuration. (ADR-001)

### 10.1.2 One Platform, Many Organizations (P3)
One codebase serves all customers. No separate small-clinic product. No separate enterprise product. The same code paths, the same bug fixes, the same security patches, the same feature evolution. (ADR-004)

### 10.1.3 Multi-Tenancy as Default (P10)
Logical multi-tenancy on shared infrastructure. Tenant isolation enforced at every layer — edge, orchestration, domain, platform services, integration, data, offline substrate. A module that does not enforce tenant isolation is defective and is not shipped. (ADR-004)

### 10.1.4 Bounded Contexts Are Stable (P8)
19 bounded contexts (BC01–BC19) are stable. New contexts require ADR ratification. Direct cross-context data access is forbidden and rejected at code review. (ADR-002)

### 10.1.5 Auditability as Primitive (P13)
Every consequential action is audited. Audit is synchronous for consequential actions — the action is not complete until the audit record is written; if the audit write fails, the action fails. Audit records are immutable, append-only, tamper-evident. (ADR-006, ADR-013)

### 10.1.6 Consistency Over Availability for Clinical Data (P5)
Clinical and financial data require strong consistency. Eventual consistency is acceptable for non-clinical data (notifications, analytics) but not for clinical or financial data. (ADR-006)

### 10.1.7 Healthcare Safety Overrides All Others (P1)
Patient safety is the highest-priority constraint. The clinician is always the decision-maker. Patient data belongs to the patient and is custodied by the provider organization under contract. Emergency access is explicit, audited, time-bounded, and reviewed. (PROJECT_BIBLE §4)

### 10.1.8 Decade-Horizon Viability (P18)
Every architectural choice must survive technology shifts over 10+ years. No choices that lock the platform into a single vendor, single ORM, or non-replaceable framework abstraction. Store technologies are implementation decisions, not architectural identity. (ADR-006, ADR-012)

### 10.1.9 Modular Monolith by Default
Single deployment unit. Modules communicate through in-process contracts. Extraction to a separately deployable service requires ADR ratification against operational criteria (independent scaling, independent deployment cadence, regulatory isolation, failure isolation, independent security boundary). (ADR-002)

### 10.1.10 Local-First by Default
Client surfaces operate local-first. Offline-first is the primary operational mode, not a fallback. Online-only is a special case. (ADR-003)

### 10.1.11 Thin Client Over Platform Contracts
The web/mobile/desktop clients contain no business logic and hold no durable state beyond what is required for offline operation. Business logic lives in the Domain Layer. UI behaviour is derived from platform contracts and configuration. (ADR-005)

### 10.1.12 Segmented Data Architecture
Five store types: transactional, analytical, cache, object, audit. Each bounded context owns its authoritative state in the transactional store. Cross-context access through declared query contracts only. (ADR-006)

### 10.1.13 Server-Managed Opaque Sessions
No long-lived browser JWTs. Session identifiers stored only in HttpOnly + Secure + SameSite cookies. Server-side session records carry no credential material. Argon2id for password hashing. (ADR-013)

### 10.1.14 Per-Operation Verification Chain
Every protected API operation must independently verify: valid session → tenant membership → organisation/facility scope → required permission → resource ownership/scope constraints. Verification runs server-side at the API boundary. Not delegated to client. Not cached across operations. (ADR-013 §1.4)

### 10.1.15 Tenant Context Never Trusted from Browser
Tenant context is established server-side from authenticated session. Any browser-supplied tenant identifier is treated as untrusted input and verified against session's tenant membership before use. (ADR-013 §1.5)

### 10.1.16 TypeScript Monorepo with pnpm Workspaces
Two applications (apps/web Next.js 16, apps/api NestJS 11) + five shared packages (contracts, domain, configuration, observability, testing). No polyrepo. No Next.js route handlers as primary enterprise backend. (ADR-012)

### 10.1.17 Domain Isolation from ORM
Code in `packages/domain` must not import from `@prisma/client` or any Prisma-generated type. Domain types authored by hand and mapped to Prisma types at the persistence-adapter boundary in `apps/api`. (ADR-012 §1.4 safeguard 1)

### 10.1.18 Repository Interfaces
Persistence must remain behind repository interfaces declared in `packages/domain`. The API layer depends on the interface; the Prisma-backed implementation is injected at the composition root and lives in `apps/api` infrastructure. (ADR-012 §1.4 safeguard 2)

### 10.1.19 Reviewed Raw SQL Allowed
Reviewed raw SQL migrations may be used for PostgreSQL features, constraints, indexes, row-level security policies, and extensions that Prisma cannot express adequately. Raw SQL migrations require explicit review; not a default. (ADR-012 §1.4 safeguard 3)

### 10.1.20 PostgreSQL-First Design
Database design is PostgreSQL-correct first, Prisma schema annotated or supplemented with raw SQL second. When Prisma's schema language cannot express a PostgreSQL concept that design requires, the design wins. (ADR-012 §1.4 safeguard 4)

## 10.2 Documentation Rules

### 10.2.1 Documented Before Shipped
Every capability, configuration surface, role, permission, and integration is documented before it is exposed to a customer. Undocumented capability is defective capability. (P-7, P7)

### 10.2.2 Single Source of Truth
`PRODUCT_BIBLE.md` is the canonical product reference. `SYSTEM_ARCHITECTURE.md` is the canonical architectural reference. Every other document defers to them on conflict.

### 10.2.3 Front-Matter Mandatory
Every document carries a front-matter table (Document Title, Project, Document Type, Authority Level, Version, Status, Owner, Custodian, Review Cadence, Audience, Scope, Out of Scope, Conflict Resolution, Amendment Mechanism, Predecessor).

### 10.2.4 Amendment Is Ratified
Amendments through Architecture Council (architecture) or Product Council (product) ratification. Recorded in CHANGELOG with explicit version increment. Casual amendments forbidden.

### 10.2.5 ADRs for Architectural Decisions
Every architectural decision of consequence requires an ADR. ADRs follow the consistent structure: Decision Statement → Context → Alternatives Considered (with explicit verdicts) → Consequences → Status → Future Notes. No architectural decision is implemented until it is documented.

### 10.2.6 No Marketing Language
Documentation is implementation-grade. No marketing language. No implementation details in canonical documents. No source code, database schemas, or API contracts in canonical documents.

### 10.2.7 Forbidden-Term Scan
Before ratification, scan for forbidden terms: "MediFlow" (legacy prototype name), "schema change" (use "configuration evolution"), "code change" (use "implementation"), "production credentials", "real patient data". Only legitimate usages allowed.

## 10.3 Product Rules

### 10.3.1 Practitioners Over Procurement
The practitioner on the floor is the primary measure of product success; the procurement committee is secondary. Practitioner-felt latency, accessibility completeness, workflow depth per specialty, and offline-first operation are funded even when they do not appear in sales demos. (P-5)

### 10.3.2 No Patient Data Monetization
Patient data is not a product. No customer or patient data is sold, licensed, or shared for monetization. Patient data is not used to train public models without explicit consent. (PROJECT_BIBLE §4 Belief Four)

### 10.3.3 No Data Captivity
Customer data must be portable. The customer data export pipeline is documented and tested quarterly. Offboarding is documented and is not subject to additional fees beyond the subscription term. (P-4)

### 10.3.4 Transparent Tiered Pricing
No per-customer negotiated pricing. Pricing is published and is not negotiated per customer. No surprise price increases. No multi-year lock-in with cancellation penalties. (PROJECT_BIBLE §14)

### 10.3.5 No Real Patient Data in Development
No real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests. Binding on every engineer, every contributor, and every environment. Violations are security incidents. (ADR-013 §1.1, §6.5)

### 10.3.6 No PHI in Browser localStorage
No patient or protected-health-information data may be persisted in browser localStorage. (ADR-012 §5.2)

### 10.3.7 Independence Posture
The platform is built to remain an independent, durable platform. Not built for acquisition. Decade-horizon decisions are not constrained by acquirability. (PROJECT_BIBLE §13 Differentiator 8)

### 10.3.8 Verified Practice Over Hypothetical Capability
Modules move from Pilot to General Availability only after validation against real operations. Configuration overlays become defaults only after validation against at least three operational deployments. (P-8)

### 10.3.9 The 19-Module Catalogue Is Stable
Adding modules is a deliberate architectural decision ratified by ADR. ADRs 007–010 preserve the 19-module catalogue by reclassifying Feature Flags (v1 packaging within M15), Reception (workflow not module), Subscriptions (capability within M09), and Inventory (BC09 with deferred module packaging per future ADR-011).

### 10.3.10 The 14-Role Catalogue Is Stable
Direct principal-permission assignment is FORBIDDEN. Only role-based assignment is supported. New roles require Architecture Council ratification. (ROLES_AND_PERMISSIONS.md)

### 10.3.11 Arabic as Default with RTL
The web application defaults to Arabic with `dir="rtl"`. English (LTR) is available via a language switch. Language choice is React-memory only — never persisted to localStorage, sessionStorage, IndexedDB, or cookies. (Batch 7 redesign)

### 10.3.12 Prototype Disposition
`download/mediflow/` and `download/mediflow-pro/` are prototype references only. They are not the canonical implementation. Their business logic and persistence code must not be ported. They must not be moved or deleted without a future ADR. They must not be referenced from the canonical implementation's build, test, or deployment pipeline. (ADR-012 §6.5)

---

# 11. Complete Project Timeline

## 11.1 Pre-Project (Before 2026-07-17)

The user previously had a ChatGPT account where initial project conception occurred. That account was lost (the trigger for this handover). The repository's `Initial commit` (commit `288236a`, 2026-07-17) is the earliest recoverable point. Several UUID-named commits (`de77dea`, `6664797`, `337edc8`, `17d2601`, `195b3cf`, `fbb64e3`, `d10aaff`, `132bcbe`, `84bcede`) on 2026-07-17 and 2026-07-18 represent early prototype scaffolding work that was later rescued.

## 11.2 Rescue Checkpoint (2026-07-18)

Commit `2288a51` "Rescue checkpoint before closing Z.ai workspace" — preserved the early work before a workspace transition.

## 11.3 Architecture Audit (2026-07-18)

Commit `09e7838` "Add post-rescue architecture audit" — authored `download/docs/99_WORKLOG/ARCHITECTURE_AUDIT_AFTER_RESCUE.md`. The audit identified 18 findings (F-01 through F-18) including fabricated architectural deviations, module-boundary violations, and downstream document inconsistencies.

## 11.4 Architecture Remediation (2026-07-18)

Commits `fc41a84`, `5991a2f`, `07fea29` — added ADRs 007–010 to resolve the audit findings, normalized their status to Accepted, and aligned the canonical spine (SYSTEM_ARCHITECTURE, MODULE_ARCHITECTURE) with the new ADRs.

## 11.5 Documentation Wave 1 (2026-07-18, throughout the day)

Authored the bulk of the documentation framework:
- `PRODUCT_BIBLE.md` v1.0.0 → v1.1.0 (identity pass with three operating commitments, strategic pillars SP-1 through SP-7, north star metrics) → v2.0.0 (full restatement aligned with the canonical spine)
- `SYSTEM_ARCHITECTURE.md` v1.0.0 → v2.0.0 (30 sections, 18 architectural principles P1–P18 with explicit precedence, 19 bounded contexts BC01–BC19, Mermaid diagram of 8 layers, 8-layer configuration precedence model, 5 deployment models, 3 conflict resolution strategies, 3 reporting categories)
- ADRs 001–006 v1.0.0 → v2.0.0 (each with explicit alternatives considered: REJECTED / ACCEPTED / DEFERRED with rationale)
- 3 architecture elaboration documents (SOFTWARE_ARCHITECTURE v2.0.0, MODULE_ARCHITECTURE v2.0.0, CONFIGURATION_ARCHITECTURE v2.0.0)
- 7 product elaboration documents (MODULES, FEATURES, EDITIONS, USER_ROLES, PERMISSIONS, CLINIC_TYPES, WORKFLOWS)
- 8 domain references (BUSINESS_RULES, CLINICAL_WORKFLOWS, FEATURE_FLAGS, STATUS_CODES, ENUMS, TERMINOLOGY, CONFIGURATION, CALCULATIONS)
- 18 of 19 clinic-type overlay references (all except HOSPITAL)
- 14 module references (PATIENTS through SETTINGS) — including the files that would later be flagged by ADRs 007–010 for remediation
- 10 security references
- HL7_FHIR integration reference
- FOLDER_STRUCTURE and CODING_STANDARDS
- 38 placeholder stubs created with ToC scaffolding for future authoring

## 11.6 Wave 2: Implementation Foundation Ratification (2026-07-18)

Commit `cd3ff34` "Ratify implementation foundation decisions" — confirmed that the canonical spine (PRODUCT_BIBLE, SYSTEM_ARCHITECTURE, ADRs 001–010) was complete and ready to support implementation.

## 11.7 Wave 3: Canonical Implementation Batches (2026-07-18)

### Batch 2 — Commit `282b2b3` "Scaffold canonical web and API foundation"
Scaffolded the pnpm monorepo: `apps/web` (Next.js 16.2.10 with App Router, React 19.2.4), `apps/api` (NestJS 11.0.1), 5 shared packages (`@ibn-hayan/contracts`, `@ibn-hayan/domain`, `@ibn-hayan/configuration`, `@ibn-hayan/observability`, `@ibn-hayan/testing`). TypeScript strict configuration (target ES2022, module ESNext, moduleResolution Bundler, plus noImplicitAny, noImplicitThis, noImplicitOverride, noUncheckedIndexedAccess, noFallthroughCasesInSwitch, noImplicitReturns, noUnusedLocals, noUnusedParameters). ESLint flat config. Vitest with jsdom environment. Tailwind CSS v4.

### Batch 3 — Commit `95733f8` "Connect web and API through shared health contract"
Implemented the first end-to-end contract: `GET /api/v1/health` endpoint on the API, with a Zod schema in `packages/contracts/src/health/`, consumed by the web client through `apps/web/src/lib/api/health.client.ts`. Established the pattern for all future shared contracts.

### Batch 4 — Commit `5f76ab7` "Establish PostgreSQL tenancy foundation"
First database batch. Prisma schema with `Tenant`, `Organisation`, `Facility` models. First reviewed raw SQL supplement (per ADR-012 §1.4 safeguard 3) — composite foreign key `facilities(tenant_id, organisation_id) → organisations(tenant_id, id)` enforcing that a Facility cannot be attached to an Organisation in a different Tenant. All foreign keys use `ON DELETE RESTRICT`. No RLS, no soft-deletes, no extensions, no seed credentials. Migration: `20260718170628_tenancy_foundation`.

### Batch 5 — Commit `5825e74` "Implement secure local authentication sessions"
Implemented the full authentication surface per ADR-013:
- `User` model (no password hash on User)
- `LocalCredential` model (Argon2id PHC string, keyed by userId)
- `TenantMembership` model (unique on `(tenantId, userId)`)
- `AuthSession` model (SHA-256 token hash only, never raw token)
- `POST /api/v1/auth/login` (Zod-validated, throttle-default, generic 401)
- `GET /api/v1/auth/session` (with token rotation)
- `GET /api/v1/auth/csrf`
- `POST /api/v1/auth/logout` (CSRF-protected)
- HttpOnly + Secure + SameSite cookies
- Argon2id password hashing via `argon2` package
- CSRF token service
- Rate limiting via `@nestjs/throttler`
- Dev bootstrap CLI (`apps/api/src/scripts/auth-bootstrap-dev.ts`)
- Migration: `20260718194955_identity_session_foundation`

### Batch 6 — Commit `84e5b56` "Implement membership-backed tenant context"
Implemented the active tenant context surface:
- Nullable `active_tenant_membership_id` column on `auth_sessions`
- Composite unique constraint on `tenant_memberships(id, user_id)` (required for composite FK)
- Composite foreign key `auth_sessions(active_tenant_membership_id, user_id) → tenant_memberships(id, user_id)` (reviewed raw SQL supplement, enforces same-user constraint at DB level)
- `GET /api/v1/context` (returns options + active context)
- `PUT /api/v1/context/tenant` (selects active context by membership ID, requires CSRF)
- `DELETE /api/v1/context/tenant` (clears active context, requires CSRF)
- Migration: `20260718220000_session_tenant_context`

### Batch 7 — Commit `de2d7ed` "Redesign premium clinic landing and login experience"
The most recent substantive commit. Redesigned the public-facing surface:
- Premium bilingual (Arabic default RTL, English LTR) landing page
- Split hero: ~55–60% brand value side (motif SVG + brand tagline + hero heading + hero body + value grid) and ~40–45% login panel side
- Three value sections: operational clarity, security, growth
- Landing header (brand mark + language switch) and landing footer (brand + tagline + copyright)
- Project-owned design tokens in `apps/web/src/app/globals.css` (CSS custom properties for surface palette, text palette, border palette, brand palette including bronze accent and sage secondary, status palette, focus, shadows, radii, typography with Inter + Tajawal + Source Serif 4, layout)
- BEM-style `.ih-*` component class namespace (no scattered colors)
- Login panel integrated into hero with silent session check, generic 401 error, no credentials in URL, no password logging, no browser storage
- Language switch as accessible single button (label always shows the other language's name)
- Language state in React memory only (never persisted)
- Presentation-only — no API status, no "Canonical implementation" language, no prototype references ("MediFlow"), no architecture references, no dev health checks
- Deprecated `apps/web/src/app/landing-content.ts` (legacy copy with "MediFlow" / "pnpm monorepo" / "Next.js" / "NestJS" references) — superseded by `apps/web/src/components/i18n/landing-copy.ts`
- Dashboard page (`/dashboard`) with workspace selector (current context chip + radio group of tenant memberships + select/clear actions) and account card (display name, email, session chip with remaining time, memberships list, logout form)

### Latest Commit — `362d4cd` "5aee0bc0-b5f0-4b60-8cff-cdd4e57a28bd"
UUID-named marker commit on top of Batch 7. Does not change project content; likely an automated snapshot.

## 11.8 Handover (2026-07-19)

User lost their ChatGPT account and requested a complete project reconstruction. This document is the handover artefact.

---

# 12. Lessons Learned

## 12.1 The Fabricated-Deviation Problem

The most important lesson from the project's history. The post-rescue architecture audit (`ARCHITECTURE_AUDIT_AFTER_RESCUE.md`) identified 18 findings, several of which were **fabricated architectural deviations** — downstream documents (`MODULE_ARCHITECTURE.md` §2.4, `docs/07_MODULES/SETTINGS.md`, `docs/07_MODULES/RECEPTION.md`, `docs/07_MODULES/SUBSCRIPTIONS.md`, `docs/07_MODULES/INVENTORY.md`) cited `SYSTEM_ARCHITECTURE.md` §7.7 as authority for deviations that the actual §7.7 did not contain. The citations were fabricated, perhaps by an earlier AI session that hallucinated the references.

**Lesson:** Every cross-document citation must be verifiable. When a downstream document claims "per SYSTEM_ARCHITECTURE §X.Y", the cited section must actually contain the claimed content. ADRs 007–010 resolved the fabricated deviations by either ratifying them as v1 packaging decisions (ADR-007) or rejecting them and reclassifying the downstream content (ADRs 008, 009, 010). The Implementation Triggers sections of those ADRs mandate Phase 2/3 remediation work that has not yet been performed.

**Action for future work:** When authoring or amending downstream documents, always open the cited upstream section and verify the citation is accurate. Never trust a citation without verification.

## 12.2 The Configuration-Before-Customization Discipline

The platform's defining architectural choice is that **all customer adaptation is through configuration, never through source-level customization**. This is easy to state and hard to maintain. The temptation to "just add a small branch for this one customer" is constant, especially when a large customer's commercial terms are tied to a specific capability.

**Lesson:** Configuration depth is not free. It requires sustained investment in the configuration surface, the validation framework (five rule categories), the audit trail, the governance tooling, and the runtime evaluation engine. The cost is accepted because the alternative — customization debt — becomes unrecoverable within 5–7 years, violating the decade horizon (P18).

**Action for future work:** When a customer requests a capability that the configuration surface cannot express, the response is **never** to add a customer-specific code branch. The response is to extend the configuration surface through a ratified ADR, or to defer the capability until the configuration surface can be extended properly.

## 12.3 The Multi-Tenant Isolation Discipline

Tenant isolation depends on rigorous enforcement at every layer. The most catastrophic failure mode in healthcare SaaS is cross-tenant data leakage. The platform's defence-in-depth approach (layered enforcement across edge, orchestration, domain, platform services, integration, data, offline substrate) is the structural guarantee.

**Lesson:** Trusting browser-supplied tenant context is the single most dangerous anti-pattern in a multi-tenant platform. ADR-013 §1.5 makes this explicit: "Tenant context must never be trusted solely from browser-supplied header, route parameter, form field, or cookie value." The composite foreign key in the fifth canonical batch (`auth_sessions(active_tenant_membership_id, user_id) → tenant_memberships(id, user_id)`) is the database-level enforcement of the same-user constraint — even a buggy or malicious application-layer call cannot set a session's active context to another user's membership.

**Action for future work:** When implementing tenant-scoped endpoints, always derive the tenant from the authenticated session, never from a request parameter. When in doubt, add a database-level constraint (composite FK, RLS policy) as a defence-in-depth measure.

## 12.4 The Documentation-Before-Implementation Discipline

Per P-7 and P7, no architectural decision is implemented until it is documented. This sounds bureaucratic, but it is the platform's defence against drift. The documentation framework is not a record of what was built; it is the specification of what may be built. Implementation that diverges from the documentation is defective implementation, not defective documentation.

**Lesson:** When implementation and documentation disagree, the documentation wins (until the documentation is amended through ratification). This is the opposite of the typical engineering pattern where documentation is "updated to reflect the code." The Ibn Hayan pattern is: ratify the design → implement to the design → if implementation reveals a design flaw, amend the design through ADR → re-implement.

**Action for future work:** Before writing any code, identify which ADR or canonical document authorizes the work. If none exists, draft the ADR first. If the implementation reveals a design issue, do not silently deviate — raise the issue and amend the design.

## 12.5 The "Configuration Is Data" Discipline

Configuration is not a settings file. It is data — versioned, validated, audited, governed. The configuration surface has its own layer (the eight-layer precedence model), its own validation framework (five rule categories), its own audit trail (distinct from operational audit), its own governance (sandbox-to-production promotion, change approval workflows), and its own tooling (configuration editor, configuration comparison, configuration promotion).

**Lesson:** Treating configuration as data means it inherits all the disciplines of data management: schema evolution, backward compatibility, deprecation windows, migration paths. A configuration key once shipped cannot be silently removed — it must be deprecated, supported through a transition window, and removed only after all customers have migrated.

**Action for future work:** When adding a configuration key, document it in the configuration surface catalogue, version it, and define its validation rules. When deprecating a key, follow the deprecation policy (notify customers, document migration path, support through transition window).

## 12.6 The "Audit Is a Primitive" Discipline

Per P13, audit is a primitive, not a feature. Every consequential action is audited. The audit write is synchronous — the action is not complete until the audit record is written. If the audit write fails, the action fails.

**Lesson:** Treating audit as synchronous and mandatory is expensive in performance terms, but it is the only way to guarantee audit completeness (Goal G-5: 100% of consequential actions audited). The outbox pattern (per ADR-006) is the mitigation for transactions spanning multiple stores — the action writes to the transactional store and the outbox in the same transaction; a separate process drains the outbox to the audit store.

**Action for future work:** When implementing a new endpoint or domain operation, identify the consequential actions and ensure each emits an audit record synchronously (or via the outbox pattern). Test audit completeness as part of the integration test suite.

## 12.7 The Prototype Disposition Discipline

The `download/mediflow/` and `download/mediflow-pro/` directories contain legacy prototypes that pre-date the canonical implementation. They are thick-client HTML/JS applications with embedded business logic, no backend, no authentication, no multi-tenancy, and no audit. They are architecturally non-conformant with every ratified ADR.

**Lesson:** The prototypes are useful as visual references (some design patterns, Arabic typography, RTL behaviour, workflow ideas) but their business logic and persistence code must not be ported into the canonical implementation. ADR-012 §6.5 governs their disposition: they must not be moved or deleted, they must not be referenced from the canonical build/test/deploy pipeline, they are documentation-grade references only.

**Action for future work:** When implementing a feature that has a counterpart in the prototypes, the prototype may inform the visual design or workflow sequencing, but the implementation must follow the canonical architecture (thin client, server-side business logic, multi-tenant, audited, configuration-driven). The prototype code must not be copied.

## 12.8 The "Decade Horizon" Discipline

The ten-year horizon is not a marketing flourish. It is the test the Product Council applies when prioritizing work. A decision that optimizes the current quarter at the expense of the decade horizon is rejected. A decision that is awkward today but preserves decade-horizon viability is preferred.

**Lesson:** The decade horizon means the platform will not adopt choices that lock it into a single vendor, single ORM, single framework, or single deployment topology. The four Prisma safeguards (ADR-012 §1.4) exist specifically so that Prisma can be replaced in the future without touching `packages/domain`. The modular monolith (ADR-002) exists so that modules can be extracted to services when justified. The segmented data architecture (ADR-006) exists so that store technologies can be replaced per category.

**Action for future work:** When evaluating a new technology choice, ask: "Can this be replaced in 5 years without re-architecting the platform?" If the answer is no, the choice is wrong. Document the replacement path in the ADR that ratifies the choice.

## 12.9 The "Verified Practice" Discipline

Per P-8, modules move from Pilot (LC2) to General Availability (LC3) only after validation against real operations. Configuration overlays become defaults only after validation against at least three operational deployments. New organization types and clinic types enter the catalogue only after the intake process is complete (workflow analysis, configuration coverage assessment, module gap assessment, validation, catalogue amendment).

**Lesson:** The platform does not ship hypothetical capability. A feature that has not been validated against real operations is not at General Availability, regardless of its operational status. This discipline protects practitioners from features that look good in demos but fail in production.

**Action for future work:** When implementing a new module, plan for pilot deployment with candidate customers, operational feedback collection, configuration coverage assessment, and operational testing against representative patient scenarios. Only after validation is complete, promote the module to LC3 General Availability.

## 12.10 The Bilingual Discipline

Arabic is the default language with RTL. English (LTR) is available via a language switch. This is not a translation overlay; it is a first-class architectural property (per ADR-005 §1.1). Every user-facing string must be defined in both languages in `apps/web/src/components/i18n/landing-copy.ts`. The `<html>` element carries `lang="ar" dir="rtl"` by default. The language switch updates `document.documentElement.lang` and `.dir` via `useEffect`.

**Lesson:** Bilingual support cannot be retrofitted. It must be designed from the first implemented screen. The cost of retrofitting bilingual support to a monolingual application is approximately the cost of rewriting the UI layer.

**Action for future work:** When adding any user-facing string, add it to `LANDING_COPY` (or the equivalent copy file for the surface) in both `ar` and `en` keys. Never hard-code user-facing strings in components. Never persist language choice to localStorage (it must remain in React memory to avoid carrying auth/CSRF info).

---

# 13. Final Handover

## 13.1 To the Next AI Assistant

You are continuing the **Ibn Hayan Healthcare Operating System** project. This is a healthcare platform being built on a ten-year horizon to become the operating system of healthcare for served markets. The project is at the end of Wave 3 (Canonical Implementation Batches) with seven batches delivered, the most recent being the premium clinic landing and login redesign (commit `de2d7ed`).

### 13.1.1 Repository State

- **Repository path:** `/home/z/my-project/`
- **Current HEAD:** `362d4cd` (UUID-named marker commit; does not change project content)
- **Latest substantive commit:** `de2d7ed` "Redesign premium clinic landing and login experience"
- **Origin/main:** `84e5b565626a70862630c27f2c2730038357db34`
- **Working tree:** Clean (one commit ahead of origin)
- **Package manager:** pnpm@11.14.0 (located at `/home/z/.local/bin/pnpm`)
- **Node version:** 24.x
- **PostgreSQL:** Version 17 (located at `/home/z/.local/opt/postgresql-17/usr/lib/postgresql/17/bin/`)

### 13.1.2 What Has Been Built

**Documentation framework** (`download/docs/`): 128 Markdown files across 16 folders, ~620,000 words of ratified content. The canonical sources of truth are `PRODUCT_BIBLE.md` (v2.0.0, 30,777 words) and `SYSTEM_ARCHITECTURE.md` (v2.0.0, 24,945 words). 12 ADRs are ratified (001–013 with 011 reserved as future). 38 placeholder stubs remain to be authored.

**Canonical implementation** (`apps/` and `packages/`): pnpm monorepo with `apps/web` (Next.js 16, React 19, Tailwind CSS v4, project-owned design tokens), `apps/api` (NestJS 11, Prisma 7, PostgreSQL, Argon2id, Zod, Swagger), and 5 shared packages (`contracts`, `domain`, `configuration`, `observability`, `testing`). 7 implementation batches delivered: scaffolding → health contract → tenancy foundation → authentication sessions → tenant context → premium landing redesign.

**Current API surface:** `/api/v1/health`, `/api/v1/auth/login`, `/api/v1/auth/session`, `/api/v1/auth/csrf`, `/api/v1/auth/logout`, `/api/v1/context`, `/api/v1/context/tenant` (PUT/DELETE).

**Current web surface:** `/` (premium landing + login), `/login` (direct-link), `/dashboard` (workspace selector + account card).

**Database:** 7 tables (`tenants`, `organisations`, `facilities`, `users`, `local_credentials`, `tenant_memberships`, `auth_sessions`), 3 migrations, 2 reviewed raw SQL supplements (composite FKs). All FKs use `ON DELETE RESTRICT`. No RLS, no soft-deletes, no extensions, no seed credentials.

**Demo credentials:** `demo@ibnhayan.local` / `IbnHayan-Demo-2026!` (created by `pnpm --filter @ibn-hayan/api auth:bootstrap-dev`).

### 13.1.3 What You Must Read First

In this order:
1. This handover document (in full).
2. `download/docs/00_PROJECT/PRODUCT_BIBLE.md` — the canonical product reference.
3. `download/docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` — the canonical architectural reference.
4. `download/docs/12_ADR/012_APPLICATION_PLATFORM_AND_REPOSITORY_STRUCTURE.md` — governs the implementation surface.
5. `download/docs/12_ADR/013_AUTHENTICATION_AND_SESSION_STRATEGY.md` — governs the authentication surface.
6. `download/docs/01_ARCHITECTURE/FOLDER_STRUCTURE.md` and `download/docs/01_ARCHITECTURE/CODING_STANDARDS.md` — the day-to-day engineering references.
7. `apps/api/prisma/schema.prisma` — the actual database schema (heavily documented inline).
8. `apps/web/src/app/globals.css` — the design token system.
9. `apps/web/src/components/i18n/landing-copy.ts` — the bilingual copy source of truth.
10. `/home/z/my-project/worklog.md` — the multi-agent work log (append your work here).

### 13.1.4 What You Must Never Do

1. **Never** add customer-specific code branches, builds, or patches. All adaptation is configuration (ADR-001).
2. **Never** trust browser-supplied tenant context without server-side verification (ADR-013 §1.5).
3. **Never** use long-lived browser JWTs for authentication (ADR-013 §3.1).
4. **Never** store patient or PHI data in browser localStorage (ADR-012 §5.2).
5. **Never** use real patient data or production credentials in development, seeds, demonstrations, screenshots, or tests (ADR-013 §1.1).
6. **Never** port business logic or persistence code from `download/mediflow/` or `download/mediflow-pro/` into the canonical implementation (ADR-012 §6.5).
7. **Never** allow `packages/domain` to import from `@prisma/client` or any Prisma-generated type (ADR-012 §1.4 safeguard 1).
8. **Never** bypass repository interfaces in `packages/domain` (ADR-012 §1.4 safeguard 2).
9. **Never** skip audit emission for consequential actions (P13).
10. **Never** ship undocumented capability (P-7, P7).
11. **Never** compromise patient safety for commercial convenience (P1).
12. **Never** modify the 19-module catalogue or 14-role catalogue without ADR ratification.
13. **Never** persist language choice to localStorage, sessionStorage, IndexedDB, or cookies (Batch 7 redesign).
14. **Never** read or modify the `.env` file (use environment variables only).
15. **Never** commit or push to the remote without explicit user authorization.
16. **Never** run Bun (the project uses pnpm exclusively).
17. **Never** modify repository files for prototype preview purposes — `download/mediflow/` and `download/mediflow-pro/` are reference-only and must not be moved, deleted, or modified.

### 13.1.5 What You Should Do Next

Follow the prioritized roadmap in §9:
1. **Day 1:** Verify repository state, read this handover + PRODUCT_BIBLE + SYSTEM_ARCHITECTURE + ADR-012 + ADR-013, verify dev environment boots.
2. **Week 1–2:** Execute Phase 2/3 remediation from ADRs 007–010 (relocate RECEPTION.md, merge SUBSCRIPTIONS.md into BILLING.md, reframe INVENTORY.md, create IDENTITY_AND_ACCESS.md / LOCALIZATION.md / DOCUMENTS.md, amend SYSTEM_ARCHITECTURE §7.7 and MODULE_ARCHITECTURE §2.4, draft ADR-011). Author HOSPITAL.md.
3. **Week 2–6:** Implement RLS policies, ratify soft-delete ADR, implement role/permission catalogue, implement active org/facility context.
4. **Week 4–10:** Implement M01 Patient and M02 Encounter modules with full CRUD, audit, validation, tests. Author API/Testing/Deployment documentation placeholders in parallel.
5. **Week 8+:** Continue with M03 Clinical Documentation, M04 Orders & Results, M06 Scheduling, M09 Billing, M16 Audit, and the remaining modules per the Phase 1/2/3 scope.

### 13.1.6 How to Work

- **Read the worklog before starting any task** (`/home/z/my-project/worklog.md`).
- **Append to the worklog after finishing any task** with Task ID, Agent, Task, Work Log, Stage Summary.
- **Use `Write` to save scripts** to `/home/z/my-project/scripts/` before executing them (per Script Persistence Rule).
- **Save final deliverables** to `/home/z/my-project/download/` (the only directory the user can download from).
- **Persist long scripts as files**, never run them inline.
- **Use the same language as the user** (Arabic or English) for response and deliverables.
- **Maintain content depth** (paragraphs ≥3 sentences, sections ≥150 words, examples and evidence for every claim).
- **Never add artificial ending markers** to documents ("End of Report", "Document Ends", etc.).
- **Match the user's timezone** (Asia/Baghdad) for date/time interpretation unless explicitly specified otherwise.
- **Preview link format** (if running a web preview): `https://preview-<bot-id>.space-z.ai/`

### 13.1.7 The Project's Soul

Ibn Hayan is not a generic healthcare application. It is a **healthcare operating system** built on a **ten-year horizon** to become the **substrate** on which healthcare organizations run their work. The platform's identity is expressed through three operating commitments: **documented-before-shipped** (undocumented capability is defective capability), **accumulated-verified-practice** (modules reach General Availability only after validation against real operations), and **practitioners-not-buyers** (the practitioner on the floor is the primary measure of product success, not the procurement committee).

The platform is named after **Jabir ibn Hayyan**, the eighth-century polymath considered the father of early chemistry and the systematic experimental method in the Arabic-speaking world. The name signals the platform's commitment to systematic, documented, verified practice — the same commitment that distinguished Jabir's work.

Every decision you make when continuing this project must be tested against:
1. **Does it advance the vision** of becoming the operating system of healthcare on a ten-year horizon?
2. **Does it preserve the platform's identity** (documented-before-shipped, accumulated-verified-practice, practitioners-not-buyers)?
3. **Does it respect the permanent rules** in §10 of this document?
4. **Does it honour the architectural principles** P1–P18 with their explicit precedence?
5. **Does it serve the patient** as the ultimate stakeholder, even though the patient is not the customer and is not the user?

If the answer to all five is yes, proceed. If the answer to any is no, stop and reconsider.

The platform's credibility on the decade horizon depends on the discipline with which it is built. That discipline is now in your hands.

---

*This handover document is the official permanent handover for the Ibn Hayan Healthcare Operating System. It is detailed enough that another AI assistant can continue the project immediately without needing any previous conversation history. Handover date: 2026-07-19.*
