# Legacy Prototype Extraction and Enterprise Design Foundation

> **Document type:** Read-only product, UX, and architecture extraction from user-created legacy HTML/JavaScript prototypes, converted into canonical enterprise design and implementation guidance for the Ibn Hayan Healthcare Operating System.
>
> **Status:** Draft · **Version:** 1.0.0 · **Generated:** 2026-07-19
>
> **Authority precedence observed:** Product Bible → System Architecture → Ratified ADRs → Security and domain documents → UI/UX documents → Current implementation → Legacy prototypes. The prototypes are evidence of user intent, not architectural authority. Where the prototypes conflict with the ratified canonical spine, the canonical spine prevails and the prototype pattern is rejected.
>
> **Safety posture:** This document was produced in read-only mode. No legacy prototype file was modified, no production source file was modified, no migration was created or run, no dependency was installed, no lockfile was altered, no secret was read or exposed, and no Batch 10 work was begun. The only files produced by this stage are this document and the two companion briefs (`ENTERPRISE_DESIGN_BRIEF.md`, `GOOGLE_STITCH_MASTER_BRIEF.md`), plus the worklog entry.
>
> **Scope of inspection:** Every file under `/home/z/my-project/upload/` was inspected: `index.html`, `app.js`, `login.html`, `login.js`, `clinic-admin-laser.html`, `clinic-laser.js`, `clinic-dental.html`, `clinic-pediatrics.html`, `clinic-internal.html`, `clinic-lab.html`. The expected canonical path `download/legacy-prototypes/user-vscode/` does not exist in the repository; the prototypes were supplied through the upload surface and are reported here under their original file names. The prototypes are not committed to the repository by this stage.

---

## Table of Contents

1. Executive Summary
2. File-by-File Inventory
3. Functional Extraction
4. Screen Inventory
5. Workflow Extraction
6. Data-Entity Extraction
7. Clinic-Type Extraction
8. Security Rejection List
9. Reuse Matrix
10. Recommended Product Backlog

---

## 1. Executive Summary

### 1.1 What the legacy prototypes contain

The legacy prototypes are a set of ten browser-only HTML and JavaScript files authored by the original product owner to communicate the desired shape of the Ibn Hayan platform before the canonical architecture was ratified. They are organised into two tiers: a platform Super Admin console (`index.html` + `app.js` + `login.html` + `login.js`) and a clinic-tier workspace family with one fully-built shell (`clinic-admin-laser.html` + `clinic-laser.js`) and four simplified specialty mockups (`clinic-dental.html`, `clinic-pediatrics.html`, `clinic-internal.html`, `clinic-lab.html`). The Super Admin console covers clinic directory management, subscription plan editing, support ticket triage, top-clinic leaderboards, and a mutable audit-log panel. The clinic-tier shell covers doctors, employees, patients, appointments, finance, inventory placeholders, settings, bilingual AR/EN toggling, dark mode, and a notification panel. The four specialty mockups are static visual mockups with sidebar navigation tailored to each specialty (tooth chart for dental, growth curves and dose calculator for pediatrics, chronic-disease registry for internal medicine, barcode sample tracking for laboratory).

The prototypes demonstrate clear product intent: an Arabic-first, bilingual healthcare platform serving multi-specialty clinic groups, with a Super Admin console for platform operators and per-clinic workspaces for clinic staff. They show the user's mental model of the platform surface, the kinds of KPIs that matter (revenue, bookings, new patients, active staff, wait time, patient flow), the categories of clinic types the product must serve (dental, dermatology and laser, pediatrics, internal medicine, laboratory, general), and the operational flows the platform must support (subscription lifecycle, support ticketing, impersonation, daily appointment operations, doctor incentive and salary payments, inventory low-stock warnings). They are also bilingual in spirit, with the laser clinic shell implementing a genuine Arabic/English translation dictionary and right-to-left/left-to-right direction switching.

### 1.2 Overall product value

The prototypes are valuable as a product discovery artefact. They communicate user intent faster and more concretely than a written brief: which screens exist, what each screen shows, which actions are primary, how the user expects to navigate between platform administration and clinic workspaces, and what the user expects each clinic specialty to expose. They validate that the ratified canonical spine (14 roles, 19 modules, 30 clinic types, dedicated audit store, multi-tenant PostgreSQL, thin client over platform contracts) maps onto a real product surface that the user recognises as their own. They expose product-shape decisions that the canonical documents have not yet ratified at the screen level: the Super Admin console as a distinct surface from any clinic workspace; the directory of tenants as a tabular, filterable, search-as-you-type screen; the subscription-plan editor as a modal that combines plan, system type, and proof-of-payment upload; the support-ticket queue as a side panel adjacent to the tenant directory; the clinic workspace shell as a fixed sidebar plus top bar with global search, language toggle, dark-mode toggle, notifications, and user menu. These product-shape decisions are reusable as design intent and as a screen-level inventory, and they are the primary output of this extraction.

The prototypes also surface specialty-specific product ideas that the canonical clinic-type catalogue captures at a high level but does not yet operationalise: dental tooth charting and orthodontic installment scheduling; pediatric growth-curve charting and weight-based dose calculation; internal-medicine chronic-disease registry and external lab and ultrasound attachment; laboratory barcode sample tracking, pending-test queue, and result-entry workflow. These specialty-specific concepts are reusable as configuration candidates for the configuration-driven clinic-type overlay strategy ratified in ADR-001 and elaborated in `02_PRODUCT/CLINIC_TYPES.md`.

### 1.3 Technical limitations

The prototypes are technically unsafe for production and cannot be ported. They are entirely client-side: every state mutation (clinic create, plan change, doctor add, patient status change, salary payment, ticket resolution) writes to `localStorage` and is therefore mutable, single-browser, unauthenticated in any meaningful sense, and incapable of supporting multi-tenant isolation, audit, or regulatory compliance. Authentication is a hardcoded credential table in `login.js` with six demo accounts (`superadmin/admin123`, `manager_kzo/kzo123`, `doctor_pedia/pedia123`, `doctor_internal/internal123`, `doctor_dental/dental123`, `doctor_lab/lab123`); on a successful match the login script writes the clinic type into `localStorage` and redirects to the matching HTML file. There is no server, no session, no CSRF protection, no RBAC, no PHI redaction, no audit integrity, and no tenancy enforcement beyond a string written into browser storage.

The render pipeline is unsafe. `app.js` and `clinic-laser.js` build table rows and modal bodies by concatenating untrusted strings into `innerHTML`. Inline `onclick` handlers invoke global functions by name. External dependencies are loaded from public CDNs at runtime (`cdn.tailwindcss.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `material-symbols-outlined`), which is incompatible with the offline-first, locally-verifiable deployment posture ratified in ADR-003 and with the privacy posture expected of a healthcare platform. The Super Admin "audit log" is a plain JavaScript array pushed into `localStorage` and rendered into a side panel; it is mutable, has no integrity chain, no per-tenant scoping, and no separation from the transactional store, and therefore must never be treated as the platform audit system. The prototypes also leak personally identifiable information into URLs (WhatsApp `wa.me` deep links embed the clinic manager's name and phone number, and the WhatsApp message body discloses the subscription-renewal context).

The four specialty mockups are intentionally incomplete. They contain only a sidebar, a header, four KPI cards, and a single one-row sample table. Their buttons call `alert()` placeholders. They do not implement any business logic, any data model, or any workflow; they communicate only the visual shape and the specialty navigation vocabulary.

### 1.4 How the canonical project should use them

The canonical project should use the prototypes as evidence of product intent and as a screen-level inventory, not as code. Specifically, the project should: (1) extract the screen inventory and route map into the canonical frontend route catalogue; (2) extract the per-specialty sidebar navigation vocabulary into the configuration-driven clinic-type overlay strategy; (3) extract the KPI card categories (revenue, forecast, today's bookings, new patients, active staff, wait time, patient flow) into the canonical dashboard widget catalogue; (4) extract the patient-status state machine (`arrived → waiting → withDoctor → completed | cancelled | noShow`) into the canonical encounter lifecycle model; (5) extract the doctor incentive-plus-salary payment model and the payment-cycle concept into the canonical HR module; (6) extract the subscription-plan lifecycle (monthly, quarterly, semi-annual, annual, with once-per-year extension) into the canonical subscription module; (7) extract the support-ticket queue shape into the canonical support and ticketing module; (8) extract the bilingual AR/EN translation dictionary pattern as a reference for the canonical localization architecture but rebuild it on the ratified i18n contracts.

The canonical project should explicitly **not** reuse: any authentication logic, any hardcoded credential, any LocalStorage-based state, any LocalStorage-based authorization, any LocalStorage PHI, payroll, or finance data, the browser-controlled clinic-type switch, any `innerHTML` rendering, any inline `onclick` handler, the mutable audit-log array, any WhatsApp deep link that embeds PII in the URL, any external CDN runtime dependency, and any client-side direct redirect based on client state. Each of these is documented in the Security Rejection List (Section 8) with its canonical replacement.

### 1.5 What must never be copied

The following must never be copied from the prototypes into the canonical implementation, under any circumstance, even as a "temporary" measure: (1) the hardcoded credential table in `login.js`; (2) the `localStorage.setItem('clinicType', ...)` tenancy mechanism; (3) the `localStorage`-backed state arrays (`super_clinics`, `super_tickets`, `super_logs`, `doctorsData`, `employeesData`, `patientsData`, `clinicData`); (4) the `auditLogs.push(...)` audit pattern; (5) any `innerHTML =` assignment that concatenates untrusted strings; (6) any inline `onclick=` attribute that calls a global function by name; (7) any `window.location.href =` redirect driven by client-side state; (8) any `<base target="_blank">` tag (present in `clinic-admin-laser.html`) that opens every link in a new tab; (9) any external CDN `<script src="https://cdn.tailwindcss.com">` or runtime-loaded webfont; (10) any WhatsApp `wa.me` link that embeds a person's name or phone number in the URL or message body. These prohibitions are non-negotiable and are enforced by the Security Rejection List in Section 8.

---

## 2. File-by-File Inventory

This section reports every prototype file by purpose, screens, functions, data entities, interactions, visual patterns, reusable ideas, unsafe patterns, missing dependencies, completeness rating, and recommendation. Files are reported in the order: platform tier (`index.html`, `app.js`, `login.html`, `login.js`), then clinic tier (`clinic-admin-laser.html`, `clinic-laser.js`, `clinic-dental.html`, `clinic-pediatrics.html`, `clinic-internal.html`, `clinic-lab.html`).

### 2.1 `index.html` — Platform Super Admin Console

| Property | Value |
|---|---|
| Purpose | Platform Super Admin landing page: tenant directory, support ticket queue, KPI summary, audit log panel |
| Screens or sections | (1) Top KPI strip with 5 cards; (2) Tenant directory table with category tabs; (3) Support ticket queue table; (4) Top-clinics leaderboard; (5) Audit log side panel; (6) Plan-edit modal; (7) Add-clinic modal; (8) Custom confirm modal |
| Functions | None directly (delegates to `app.js`) |
| Data entities | Clinic (id, name, category, type, manager, phone, plan, status, expiry, bookings, extendedThisYear); SupportTicket (id, clinicName, type, text, priority); AuditActivity (time, text) |
| Interactions | Category tab switch; add clinic; edit plan; extend time; delete clinic; resolve ticket; open clinic workspace; WhatsApp reminder; custom confirm |
| Visual patterns | Five-card KPI strip with colored left-border accents; tabbed category filter; status badge pills (نشط/فترة السماح/متوقف → active/grace/suspended); priority badges; modal with backdrop blur; custom confirm modal with icon and animation |
| Reusable ideas | KPI strip composition (revenue, forecast, today's bookings, new patients, active staff); tenant directory as filterable, tabbed table; subscription-plan editor combining plan, system type, and proof-of-payment upload; once-per-year extension guard; custom confirm modal pattern |
| Unsafe patterns | Inline `onclick=` handlers; `localStorage`-driven state; raw `innerHTML +=` table building in `app.js`; WhatsApp links embedding PII in URL |
| Missing dependencies | `app.js` is required and is loaded; no other broken links |
| Completeness rating | Medium — visually complete, functionally client-side only |
| Recommendation | **Reuse as design** — extract screen composition and interaction model into canonical Super Admin console design; reject all code |

### 2.2 `app.js` — Super Admin Logic

| Property | Value |
|---|---|
| Purpose | Client-side logic for the Super Admin console: state, rendering, modals, navigation |
| Screens or sections | Implements all sections of `index.html` |
| Functions | `getStorage`, `saveSuperState`, `initDashboard`, `updateDynamicStats`, `switchCategory`, `renderClinicsTable`, `renderTicketsTable`, `renderTopClinics`, `renderAuditLogs`, `openPlanModal`, `closeModal`, `savePlanChanges`, `openAddClinicModal`, `closeAddClinicModal`, `saveNewClinic`, `extendClinicTime`, `deleteClinic`, `resolveTicket`, `logAction`, `loginToClinic`, `showSystemConfirm` |
| Data entities | Same as `index.html`; additionally encodes plan-to-revenue mapping (`شهري→120000`, `3 أشهر→350000`, `نصف سنوي→650000`, `سنوي→1200000`) and plan-to-days mapping (30, 90, 180, 365) |
| Interactions | All Super Admin interactions; cross-page redirect via `loginToClinic` based on `clinicType` localStorage key |
| Visual patterns | Promise-based confirm modal; status badge composition by status string |
| Reusable ideas | Plan-to-days mapping table (30/90/180/365) is a clean subscription-lifecycle configuration candidate; once-per-year extension guard with `extendedThisYear` boolean is a useful subscription-policy primitive; the leaderboard pattern (sort by `bookings` desc, render top N) is reusable |
| Unsafe patterns | `localStorage` state (`super_clinics`, `super_tickets`, `super_logs`); `localStorage.setItem('clinicType', ...)` as tenancy; `tableBody.innerHTML += ...` with untrusted strings; `window.location.href =` driven by client state; mutable audit log array |
| Missing dependencies | None; correctly loads from `index.html` |
| Completeness rating | Medium — full Super Admin client logic, but unsafe |
| Recommendation | **Reuse as requirement** — extract subscription-plan lifecycle rules and once-per-year extension policy; reject all code |

### 2.3 `login.html` — Login Screen

| Property | Value |
|---|---|
| Purpose | Username/password login with six quick-fill demo account buttons |
| Screens or sections | Single login card |
| Functions | None directly (delegates to `login.js`) |
| Data entities | None |
| Interactions | Form submit; demo-account quick-fill buttons |
| Visual patterns | Centered card on muted background; brand mark with "H" letter; six demo-account buttons in a 2-column grid with specialty-themed colors and emojis |
| Reusable ideas | Login card composition (brand mark, title, subtitle, form, demo-section divider); specialty-themed color accents per demo account (purple for derma, blue for pedia, teal for internal, emerald for dental, cyan for lab) |
| Unsafe patterns | Demo-account buttons expose credentials in `onclick` attributes; credentials are visible in page source |
| Missing dependencies | `login.js` is required and is loaded |
| Completeness rating | Low — visual only, no real auth |
| Recommendation | **Redesign** — adopt login card composition and specialty color hints; reject credential exposure and demo-account pattern |

### 2.4 `login.js` — Login Logic

| Property | Value |
|---|---|
| Purpose | Hardcoded credential table and redirect-by-credential-type |
| Screens or sections | Implements `login.html` |
| Functions | `fillDemo`, `handleLogin` |
| Data entities | `users` object with 6 accounts: `superadmin`, `manager_kzo`, `doctor_pedia`, `doctor_internal`, `doctor_dental`, `doctor_lab` |
| Interactions | Form submit → credential match → write `clinicType` to `localStorage` → redirect |
| Visual patterns | None |
| Reusable ideas | The mapping of credential → clinic type (DERMA_LASER, PEDIATRICS, INTERNAL, DENTAL, LAB, ALL) is a useful *conceptual* map of clinic types to their workspace shells |
| Unsafe patterns | Hardcoded plaintext credentials in source; client-side credential verification; `localStorage` tenancy; redirect driven by client state |
| Missing dependencies | None |
| Completeness rating | Low — minimal logic, fully unsafe |
| Recommendation | **Reject entirely** — no code or pattern reuse; the clinic-type enumeration is already ratified canonically in `02_PRODUCT/CLINIC_TYPES.md` |

### 2.5 `clinic-admin-laser.html` — Dermatology/Laser Clinic Workspace Shell

| Property | Value |
|---|---|
| Purpose | The most complete clinic-tier shell: sidebar with 9 nav items, header with search/language/dark-mode/notifications/user menu, modal overlay system for doctor/employee/patient/finance modals, custom confirm and prompt modals |
| Screens or sections | (1) Sidebar with Home, Doctors, Employees, Patients, Appointments, Records, Finance, Inventory, Settings; (2) Header with search, language toggle (AR/EN), dark-mode toggle, notification bell, user avatar; (3) Content canvas with 9 view sections; (4) Notification panel; (5) Modal overlay containing: Edit Doctor, Add Doctor, Pay Doctor, Edit Employee, Add Employee, Confirm, Prompt |
| Functions | None directly (delegates to `clinic-laser.js`) |
| Data entities | Doctor (name, specialty, phone, status, incentive, incentiveRate, patientsCount, salary, paymentCycle, paid); Employee (name, position, department, status); Patient (name, age, phone, status, paymentStatus, amount) — inferred from modal fields |
| Interactions | Nav item click → switch view; language toggle; dark-mode toggle; notification bell; add/edit/delete doctor; add/edit/delete employee; add patient; pay doctor; confirm modals; prompt modal |
| Visual patterns | Fixed 280px sidebar; 64px header; rounded-xl cards; modal with colored header (indigo for doctor, emerald for payment); checkbox-toggle form sections (incentive fields, salary fields); dark-mode color overrides with `!important` |
| Reusable ideas | The shell composition (sidebar + header + content canvas + modal overlay + notification panel) is the canonical enterprise application shell pattern; checkbox-toggle form sections are a clean progressive-disclosure pattern; modal header color indicates modal category |
| Unsafe patterns | `<base target="_blank">` opens every link in new tab; external CDN dependencies (Tailwind, Google Fonts, Material Symbols); inline `onclick=` handlers; modal bodies are filled by `clinic-laser.js` using `innerHTML` |
| Missing dependencies | `clinic-laser.js` is required and is loaded |
| Completeness rating | High — the most complete shell, fully interactive when paired with `clinic-laser.js` |
| Recommendation | **Reuse as design** — adopt the shell composition, modal system, and progressive-disclosure form pattern; reject all code |

### 2.6 `clinic-laser.js` — Clinic Workspace Logic

| Property | Value |
|---|---|
| Purpose | Full client-side logic for the dermatology/laser clinic shell: bilingual dictionary, state, rendering, modals, payments |
| Screens or sections | Implements all 9 views of `clinic-admin-laser.html` |
| Functions | `getStorage`, `setStorage`, `saveState`, `t`, `dn`, `ds`, `en`, `ep`, `ed`, `pn`, `nowHM`, `toggleDarkMode`, `applyAllTranslations`, `toggleLanguage`, `refreshView`, `switchView`, `applyClinicTypeLayout`, `renderNotifications`, `markNotificationRead`, `toggleNotifications`, `clearNotifications`, `calcDueSalary`, `calcWaitMinutes`, `renderRevenueChart`, `showHome`, `showDoctors`, `showEmployees`, `showPatients`, `showPatientDetail`, `updatePatientStatus`, `togglePaymentStatus`, `deletePatient`, `showAppointments`, `showRecords`, `showFinance`, `openPayDoctorModal`, `closePayDoctorModal`, `updatePayTotal`, `confirmPayDoctor`, `showInventory`, `showSettings`, `openModal`, `closeModal`, `closeAllModals`, `openAddPatientModal`, `saveNewPatient`, `openEditDoctor`, `closeEditDoctorModal`, `toggleEditIncentiveFields`, `toggleEditSalaryField`, `toggleNewIncentiveFields`, `toggleNewSalaryField`, `saveDoctorChanges`, `openAddDoctorModal`, `closeAddDoctorModal`, `saveNewDoctor`, `deleteDoctor`, `openEditEmployee`, `closeEditEmployeeModal`, `saveEmployeeChanges`, `openAddEmployeeModal`, `closeAddEmployeeModal`, `saveNewEmployee`, `deleteEmployee`, `updateSalary`, `toggleSalaryPaid`, `confirmAction`, `closeConfirmModal`, `resolvePrompt` |
| Data entities | Doctor (id, nameAr/nameEn, specialtyAr/specialtyEn, phone, status, hasIncentive, incentiveRate, patientsCount, hasSalary, salary, paymentCycle, paid); Employee (id, nameAr/nameEn, positionAr/positionEn, departmentAr/departmentEn, status, salary, paid); Patient (id, nameAr/nameEn, age, phone, status, paymentStatus, amount); ClinicData (todayRevenue, weeklyRevenue, waitMinutes, patientFlow) |
| Interactions | All clinic-tier interactions; bilingual AR/EN toggle rebuilds all visible strings; dark-mode toggle; notification read/clear; patient status state machine; doctor salary + incentive payment with confirmation; employee salary toggle; weekly revenue bar chart |
| Visual patterns | Promise-based confirm modal; revenue chart with day labels and Arabic numerals; status color map (`statusColors` object) with semantic palette; status label map (`statusLabels`) for i18n |
| Reusable ideas | Bilingual translation dictionary (`T.ar` and `T.en` objects) is a strong reference for canonical i18n key structure; status-color and status-label maps are reusable design tokens; `calcDueSalary` formula (salary + incentiveRate × patientsCount) is the canonical doctor-payment formula; patient-status state machine (arrived → waiting → withDoctor → completed | cancelled | noShow) is the canonical encounter-flow state machine; payment cycle enum (`daily`, `weekly`, `biweekly`, `monthly`) is reusable |
| Unsafe patterns | `localStorage` state (`doctorsData`, `employeesData`, `patientsData`, `clinicData`, `clinicType`); `innerHTML =` assignments throughout (40+ occurrences); inline `onclick=` in generated HTML; client-side payment calculation; mutable state with no audit |
| Missing dependencies | None; correctly loads from `clinic-admin-laser.html` |
| Completeness rating | High — full clinic-tier logic, fully interactive, fully unsafe |
| Recommendation | **Reuse as requirement** — extract the doctor-payment formula, patient-status state machine, payment-cycle enum, status-color tokens, and i18n key structure; reject all code |

### 2.7 `clinic-dental.html` — Dental Clinic Mockup

| Property | Value |
|---|---|
| Purpose | Static visual mockup of a dental clinic workspace |
| Screens or sections | (1) Sidebar with Home, Doctor Management, Tooth & Jaw Interactive Chart, Orthodontic Installment Scheduling, Composite Consumables Inventory, Financial Reports; (2) Header with search and user; (3) Four KPI cards; (4) Single-row chair-session table |
| Functions | None (uses `alert()` placeholders) |
| Data entities | None persisted; sample row references chair number, patient name, doctor, session type |
| Interactions | "Tooth and Receipt" button → `alert()` placeholder |
| Visual patterns | Emerald accent color; `dentistry` Material Symbol; "chair" as the unit of clinical work |
| Reusable ideas | Tooth-and-jaw interactive chart as a dental specialty widget; orthodontic installment scheduling (combines treatment plan + payment plan); chair-as-resource scheduling model |
| Unsafe patterns | External CDN dependencies; inline `onclick="alert(...)"`; no real state |
| Missing dependencies | None |
| Completeness rating | Low — static mockup |
| Recommendation | **Reuse as requirement** — extract tooth-chart widget, orthodontic installment scheduling, and chair-as-resource scheduling as dental specialty configuration candidates |

### 2.8 `clinic-pediatrics.html` — Pediatrics Clinic Mockup

| Property | Value |
|---|---|
| Purpose | Static visual mockup of a pediatrics clinic workspace |
| Screens or sections | (1) Sidebar with Home, Clinical Growth Curves, Dose & Syrup Calculator, Daily Financial Accounts; (2) Header; (3) Four KPI cards; (4) Single-row patient table with age and weight |
| Functions | None (uses `alert()` placeholders) |
| Data entities | None persisted; sample row references child name, age ("سنتين وثلاثة أشهر" — two years three months), weight ("12 كغم") |
| Interactions | "Start Examination" button → `alert()` placeholder |
| Visual patterns | Blue accent color; `child_care` Material Symbol; age-and-weight as primary patient identifier for children |
| Reusable ideas | Growth-curve charting as a pediatrics specialty widget; weight-based dose calculator (canonical pediatric safety tool); age displayed in years-and-months format |
| Unsafe patterns | External CDN dependencies; inline `onclick="alert(...)"`; no real state |
| Missing dependencies | None |
| Completeness rating | Low — static mockup |
| Recommendation | **Reuse as requirement** — extract growth-curve widget and dose calculator as pediatrics specialty configuration candidates |

### 2.9 `clinic-internal.html` — Internal Medicine Clinic Mockup

| Property | Value |
|---|---|
| Purpose | Static visual mockup of an internal medicine clinic workspace |
| Screens or sections | (1) Sidebar with Home, Chronic Indicators Monitoring, External Labs & Ultrasound, Financial Audit Box; (2) Header; (3) Four KPI cards; (4) Single-row patient table with chronic-disease classification |
| Functions | None (uses `alert()` placeholders) |
| Data entities | None persisted; sample row references patient name and chronic-disease classification ("متابعة ضغط شرياني + سكري مزمن" — hypertension + chronic diabetes follow-up) |
| Interactions | "Manage Medical Examination" button → `alert()` placeholder |
| Visual patterns | Teal accent color; `stethoscope` Material Symbol; chronic-disease classification as primary patient grouping |
| Reusable ideas | Chronic-disease registry view (filter patients by chronic condition); external-lab and ultrasound attachment surface (separate from in-house laboratory); clinical-history timeline view |
| Unsafe patterns | External CDN dependencies; inline `onclick="alert(...)"`; no real state |
| Missing dependencies | None |
| Completeness rating | Low — static mockup |
| Recommendation | **Reuse as requirement** — extract chronic-disease registry and external-results attachment as internal-medicine specialty configuration candidates |

### 2.10 `clinic-lab.html` — Laboratory Mockup

| Property | Value |
|---|---|
| Purpose | Static visual mockup of a laboratory workspace |
| Screens or sections | (1) Sidebar with Home, Pending Tests, Patient Results Archive, Solutions & Swabs Inventory, Daily Financial Reports; (2) Header with barcode search; (3) Four KPI cards (samples drawn, results in preparation, reports ready for delivery, daily revenue); (4) Single-row sample table with barcode ID |
| Functions | None (uses `alert()` placeholders) |
| Data entities | None persisted; sample row references barcode (`#LAB-9041`), patient name, test type (CBC + Lipid Profile), sample status |
| Interactions | "Enter Results" button → `alert()` placeholder |
| Visual patterns | Teal accent color; `biotech` Material Symbol; barcode as primary sample identifier |
| Reusable ideas | Barcode-driven sample tracking; pending-test queue with status (`قيد المعالجة` — in processing); result-entry workflow with reference ranges; sample-status state machine (drawn → in-processing → verified → delivered) |
| Unsafe patterns | External CDN dependencies; inline `onclick="alert(...)"`; no real state |
| Missing dependencies | None |
| Completeness rating | Low — static mockup |
| Recommendation | **Reuse as requirement** — extract barcode-sample-tracking and result-entry workflow as laboratory specialty configuration candidates |

---

## 3. Functional Extraction

This section extracts every meaningful function from the legacy prototypes and groups it under its canonical module. The canonical module taxonomy used here is the 19-module catalogue ratified in `02_PRODUCT/MODULES.md` (M01–M19), extended with three platform-surface categories (Platform Administration, Tenant and Organisation Management, Subscription Management, Support and Ticketing) that sit above the M-catalogue because they are product-surface concerns rather than bounded contexts. Each function row reports the legacy source file, the legacy screen or function name, the canonical module, the target user roles (mapped to R01–R14 from `02_PRODUCT/USER_ROLES.md`), the business value, the implementation status in the current project, the architectural prerequisites, the security concerns, and the recommended future batch. Implementation status reflects what was verified in code at HEAD `b16869d` and is conservative: a function is marked "Not implemented" unless a corresponding API module, frontend route, or Prisma model was actually found.

### 3.1 Platform Administration

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `index.html` + `app.js` | Top KPI strip (revenue, forecast, bookings, new patients, staff) | Platform Administration (surface over M18 Reporting) | R14 System Administrator, R12 Executive | Single-glance platform health for Super Admin | Not implemented (no `/admin` route, no platform-KPI API) | Platform aggregation queries over tenants; tenant-aware authorization; PHI-redacted aggregation | Aggregation must not leak per-tenant PHI; cross-tenant read requires R13/R14 | Future batch (post-shell) |
| `index.html` + `app.js` | Tenant directory with category tabs and search | Platform Administration (surface over M14 Identity & Access + M15 Configuration) | R14 | Find, filter, and act on any tenant from one screen | Not implemented | Tenant model in transactional DB; tenant-category enumeration; search index | Must enforce R14 scope; must not expose other Super Admins' actions | Enterprise Shell batch (immediate next) |
| `index.html` + `app.js` | Top-clinics leaderboard by bookings | Platform Administration | R14, R12 | Identify high-volume and low-volume tenants for account management | Not implemented | Booking aggregation per tenant | Same as above | Future batch |
| `index.html` + `app.js` | Audit log side panel | M16 Audit (platform chain) | R14, R10 Compliance Officer | Platform activity visibility for Super Admin | Audit primitive implemented (Batch 9); no UI surface yet | Public audit query surface is deferred per ADR-014 | Mutable audit array in prototype must be rejected; canonical audit is append-only with HMAC chain | Future batch (audit query UI) |

### 3.2 Tenant and Organisation Management

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `index.html` + `app.js` | `saveNewClinic` — add tenant | M14 Identity & Access (tenant lifecycle) | R14 | Create new tenant with name, category, system type, manager, phone, plan, status | Not implemented (no tenant CRUD API) | Tenant model; Organisation and Facility hierarchy per `01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Must enforce Super Admin scope; must audit tenant.create; manager phone is PII | Post-shell batch |
| `index.html` + `app.js` | `savePlanChanges` — change plan and system type | M15 Configuration + Subscription Management | R14 | Modify tenant subscription plan and clinic-type configuration | Not implemented | Subscription model; clinic-type overlay configuration | Must audit subscription.update; clinic-type change must not corrupt existing tenant data | Post-shell batch |
| `index.html` + `app.js` | `extendClinicTime` — once-per-year 7-day extension | Subscription Management | R14 | Grace extension for tenants in payment difficulty | Not implemented | Subscription extension policy with annual guard | Must audit subscription.extend; must enforce once-per-year invariant server-side | Post-shell batch |
| `index.html` + `app.js` | `deleteClinic` — delete tenant | M14 Identity & Access | R14 | Remove tenant from platform | Not implemented (and should likely be a soft-delete in canonical) | Soft-delete pattern; cascade rules; data retention policy per `09_SECURITY/COMPLIANCE/DATA_RETENTION.md` | Must audit tenant.delete; must not actually destroy PHI; soft-delete only | Future batch |
| `app.js` | `loginToClinic` — impersonate clinic workspace | M14 Identity & Access (impersonation) | R14 | Super Admin can open any tenant's workspace for support | Not implemented | Impersonation session with separate audit trail; original-actor preservation | High-risk action; must audit impersonation.start and impersonation.end; must require MFA | Future batch |

### 3.3 Subscription Management

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `index.html` + `app.js` | Plan enum (monthly, quarterly, semi-annual, annual) | Subscription Management | R14, R12 | Standardised subscription tiers | Not implemented | Subscription plan catalogue; price-per-plan configuration | Pricing may be tenant-specific; must not hardcode prices | Post-shell batch |
| `index.html` + `app.js` | Plan-to-days mapping (30/90/180/365) | Subscription Management | R14 | Compute expiry from plan | Not implemented | Same as above | None beyond audit | Post-shell batch |
| `index.html` + `app.js` | Plan-to-revenue mapping (120k/350k/650k/1.2M IQD) | Subscription Management + M10 Accounting | R14, R12, R08 | Revenue forecast per tenant | Not implemented | Pricing catalogue; multi-currency support | Price list is commercially sensitive; restrict visibility | Future batch |
| `index.html` + `app.js` | Proof-of-payment screenshot upload | Subscription Management | R14 | Out-of-band payment evidence (WhatsApp screenshot) | Not implemented | Secure file upload; virus scan; access-controlled storage | File upload is high-risk; must scan and quarantine | Future batch |
| `app.js` | Status enum (نشط/فترة السماح/متوقف → active/grace/suspended) | Subscription Management | R14 | Tenant subscription state | Not implemented | Subscription status state machine (active → grace → suspended → terminated) | State transitions must be audited and policy-enforced | Post-shell batch |

### 3.4 Support and Ticketing

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `index.html` + `app.js` | Support ticket queue | Support and Ticketing (new surface, not in M-catalogue) | R14, R13 | Triage tenant support requests | Not implemented | Ticket model; priority enum; tenant FK; assignee model | Tickets may contain PHI; must enforce tenant scoping on read | Future batch |
| `index.html` + `app.js` | `resolveTicket` — mark resolved | Support and Ticketing | R14 | Close handled tickets | Not implemented | Ticket status state machine | Must audit ticket.resolve | Future batch |
| `index.html` + `app.js` | WhatsApp deep-link reminder to clinic manager | Support and Ticketing + M08 Notifications | R14 | Out-of-band contact channel | Not implemented (and the prototype pattern is rejected — see Security) | Notification channel abstraction; template-based messaging | PII in URL is rejected; canonical must use server-side message dispatch with template variables | Future batch |

### 3.5 Clinic Administration

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-admin-laser.html` + `clinic-laser.js` | Clinic admin overview (KPI cards) | Clinic Administration (surface) | R09 Administrator, R12 | Single-glance clinic health | Not implemented (no `/clinic/:id` route) | Facility-scoped aggregation; facility-scoped authorization | Must enforce facility scope; must not leak other facilities | Enterprise Shell batch (immediate next) |
| `clinic-laser.js` | `applyClinicTypeLayout` — clinic-type-driven sidebar | M15 Configuration + ADR-001 | R09, R13 | Sidebar adapts to clinic type | Not implemented | Clinic-type overlay configuration; configuration-driven navigation | Configuration must be server-validated; client cannot be source of truth | Enterprise Shell batch |
| `clinic-laser.js` | `showSettings` — clinic settings | M15 Configuration | R09 | Clinic profile, hours, contact | Not implemented | Tenant-scoped configuration model | Must enforce tenant scope; must audit settings.update | Post-shell batch |
| `clinic-laser.js` | `toggleDarkMode`, `toggleLanguage` | M19 Localization + design system | All roles | User preference | Not implemented (no user preference API) | User preference model; design-token theming | Preferences must be user-scoped, not browser-scoped | Enterprise Shell batch |

### 3.6 Staff and HR (Employees)

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showEmployees` — employee list | M12 HR | R09, R11 | Staff directory | Not implemented | Employee model; tenant FK; department FK | Must enforce tenant scope; salary field is sensitive | HR batch |
| `clinic-laser.js` | `saveNewEmployee`, `saveEmployeeChanges` | M12 HR | R09, R11 | Add/edit staff | Not implemented | Same as above | Must audit employee.create, employee.update | HR batch |
| `clinic-laser.js` | `deleteEmployee` | M12 HR | R09, R11 | Remove staff | Not implemented | Soft-delete pattern | Must audit employee.delete; PHI cleanup | HR batch |
| `clinic-laser.js` | `updateSalary`, `toggleSalaryPaid` | M12 HR + M10 Accounting | R09, R11 | Salary tracking and payment | Not implemented | Payroll model; payment-cycle enum; ledger entry | Salary is sensitive; must enforce field-level permission; must audit salary.pay | HR + Finance batch |

### 3.7 Doctors

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showDoctors` — doctor list | M12 HR + M13 Workforce + clinical practitioner role | R09, R11 | Doctor directory with specialty | Not implemented | Practitioner model; specialty FK; tenant FK | Must enforce tenant scope | Doctors batch |
| `clinic-laser.js` | `saveNewDoctor` with credential fields | M14 Identity & Access + M12 HR | R09 | Onboard doctor with login | Not implemented (authn is implemented but no doctor-onboarding flow) | Identity model; credential issuance; role assignment R01 | Password must be hashed (already implemented in auth); must audit practitioner.create and role.assign | Doctors batch |
| `clinic-laser.js` | `calcDueSalary` — salary + incentive calculation | M12 HR + M10 Accounting | R09, R11 | Compute doctor payment | Not implemented | Payroll formula engine; incentive rate per practitioner | Must enforce field-level permission; must audit payment.calc | HR + Finance batch |
| `clinic-laser.js` | `confirmPayDoctor` — pay doctor | M10 Accounting + M12 HR | R09, R11 | Disburse doctor payment | Not implemented | Ledger entry; bank/cash account; payment method | Must audit payment.execute; must produce financial trail | Finance batch |
| `clinic-laser.js` | `deleteDoctor` | M12 HR | R09, R11 | Remove doctor | Not implemented | Soft-delete; reassign active patients | Must audit; must not strand active encounters | Doctors batch |

### 3.8 Patients

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showPatients` — patient list | M01 Patient | R06, R07, R01, R09 | Patient directory | Not implemented | Patient model; tenant FK; consent model; demographics | PHI — strict tenant scope; field-level permission; audit patient.read | Patients batch |
| `clinic-laser.js` | `showPatientDetail` — patient profile | M01 Patient + M02 Encounter | R01, R06, R07 | Patient 360 view | Not implemented | Patient model + encounter history + orders + results | Same as above; must audit patient.read detail | Patients batch |
| `clinic-laser.js` | `openAddPatientModal`, `saveNewPatient` | M01 Patient | R06, R09 | Register new patient | Not implemented | Patient identity model; deduplication; consent capture | Must audit patient.create; must capture consent at registration | Patients batch |
| `clinic-laser.js` | `updatePatientStatus` — status state machine | M02 Encounter + M06 Scheduling | R06, R07, R01 | Move patient through encounter | Not implemented | Encounter status state machine (arrived → waiting → withDoctor → completed/cancelled/noShow) | Must audit encounter.status_change at every transition | Scheduling + Patients batch |
| `clinic-laser.js` | `togglePaymentStatus` — payment for encounter | M09 Billing | R06, R08, R09 | Collect payment at encounter | Not implemented | Billing model; payment method; receipt | Must audit billing.collect; must produce receipt | Finance batch |
| `clinic-laser.js` | `deletePatient` | M01 Patient | R09 | Remove patient | Not implemented (and should be soft-delete + retention policy) | Soft-delete; retention rules per `09_SECURITY/COMPLIANCE/DATA_RETENTION.md` | PHI retention is regulated; cannot hard-delete on request | Future batch |

### 3.9 Scheduling and Appointments

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showAppointments` — calendar view | M06 Scheduling | R06, R07, R01, R09 | Daily appointment operations | Not implemented | Appointment model; resource (chair/room/doctor) FK; calendar rendering | Must enforce tenant + facility scope | Scheduling batch |
| `clinic-laser.js` | Calendar status colors (`cal-paid`, `cal-pending`, `cal-confirmed`, `cal-checked-in`, `cal-with-doctor`, `cal-completed`, `cal-cancelled`, `cal-no-show`) | M06 Scheduling + design system | All roles | Visual appointment state | Not implemented | Appointment status enum; design tokens for status colors | None beyond standard | Enterprise Shell batch (design tokens) |
| `clinic-laser.js` | `calcWaitMinutes` — wait time computation | M06 Scheduling + M18 Reporting | R09, R06 | Operational metric | Not implemented | Arrival and consultation timestamps | Must be computed server-side | Scheduling batch |
| `clinic-dental.html` | Chair-as-resource scheduling | M06 Scheduling + dental overlay | R06, R07, R01 | Dental chair utilization | Not implemented | Resource model with chair type; dental overlay | None beyond standard | Scheduling + Dental batch |

### 3.10 Clinical Records

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showRecords` — placeholder only | M03 Clinical Documentation | R01, R02 | Clinical notes | Not implemented (placeholder in prototype too) | Note model; template model; signature; version | Strict PHI scope; must audit note.create, note.update | Clinical Records batch |
| `clinic-internal.html` | Chronic-disease registry concept | M03 + M18 (registry view) | R01 | Population health management | Not implemented | Chronic-condition tag; registry query | Same as above | Internal Medicine batch |
| `clinic-pediatrics.html` | Growth-curve charting concept | M03 + M04 (pediatric) | R01 | Pediatric growth monitoring | Not implemented | Growth-measurement model; WHO/local growth-reference data | Same as above | Pediatrics batch |
| `clinic-pediatrics.html` | Weight-based dose calculator concept | M05 Pharmacy + M03 | R01, R03 | Pediatric medication safety | Not implemented | Drug database; weight-based dosing rules; range validation | Critical safety feature; must be server-verified; must audit calculation | Pediatrics + Pharmacy batch |

### 3.11 Finance and Billing

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showFinance` — daily revenue, weekly chart | M09 Billing + M10 Accounting + M18 Reporting | R09, R12, R08 | Clinic financial overview | Not implemented | Ledger; revenue aggregation; chart rendering | Must enforce tenant + facility scope; financial data is sensitive | Finance batch |
| `clinic-laser.js` | `renderRevenueChart` — weekly bar chart | M18 Reporting + design system | R09, R12 | Visual trend | Not implemented | Chart component; aggregation query | None beyond standard | Finance batch |
| `clinic-laser.js` | `confirmPayDoctor` — payment disbursement | M10 Accounting | R09, R11 | Doctor payment outflow | Not implemented | Disbursement model; bank/cash account; ledger | Must audit; must produce financial trail | Finance batch |
| `clinic-internal.html` | "Financial Audit Box" concept | M10 Accounting + M16 Audit | R09, R10, R12 | Clinic cash reconciliation | Not implemented | Cash box model; reconciliation workflow | Must audit; must reconcile against ledger | Finance batch |

### 3.12 Inventory

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showInventory` — placeholder only | M17 Integration (supply chain) — inventory deferred to future per ADR-010 | R09, R11 | Consumables tracking | Not implemented (placeholder in prototype too) | Item model; lot/expiry; reorder point | Must enforce tenant scope; controlled substances need extra controls | Inventory batch (post-MVP per ADR-010) |
| `clinic-dental.html` | Composite consumables inventory | Same | R09, R11 | Dental materials tracking | Not implemented | Same + dental-specific catalog | Same | Inventory + Dental batch |
| `clinic-lab.html` | Solutions & swabs inventory | Same | R09, R11 | Lab reagents tracking | Not implemented | Same + lab-specific catalog + cold-chain | Same | Inventory + Lab batch |
| `clinic-dental.html` | Low-stock warning widget | M08 Notifications + M17 | R09, R11 | Proactive reorder | Not implemented | Reorder point; notification template | None beyond standard | Inventory batch |

### 3.13 Notifications

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `renderNotifications`, `toggleNotifications`, `markNotificationRead`, `clearNotifications` | M08 Notifications | All roles | In-app notification feed | Not implemented | Notification model; user FK; read/unread state | Must enforce user scope | Enterprise Shell batch |
| `app.js` | WhatsApp reminder concept (pattern rejected) | M08 Notifications (channel abstraction) | R14 | Out-of-band contact | Not implemented | Channel abstraction; template-based messaging; consent | PII in URL is rejected; canonical must dispatch server-side | Future batch |

### 3.14 Reports

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showFinance` reporting aspects | M18 Reporting | R09, R12, R08 | Operational and financial reporting | Not implemented | Report model; parameterised queries; export control | Must enforce tenant + facility scope; export requires permission | Reporting batch |
| `clinic-dental.html` | "Total financial and accounting reports" | M18 Reporting | R09, R12 | Specialty-aware reporting | Not implemented | Same + specialty dimensions | Same | Reporting + Dental batch |

### 3.15 Settings

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-laser.js` | `showSettings` — clinic settings | M15 Configuration | R09, R13 | Clinic profile, hours, contact, preferences | Not implemented | Configuration model; validation; versioning; audit | Must enforce tenant scope; must audit config.update | Post-shell batch |
| `clinic-laser.js` | `toggleLanguage`, `toggleDarkMode` | M19 Localization + user preferences | All roles | User-level preference | Not implemented | User preference model | User-scoped; not browser-scoped | Enterprise Shell batch |

### 3.16 Audit

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `app.js` | `logAction` — append to mutable array | M16 Audit | R14, R10 | Activity log | Audit primitive implemented (Batch 9); UI deferred per ADR-014 | Public audit query surface is deferred; verifier is implemented | Mutable array pattern is rejected; canonical is HMAC-chained, append-only, immutable at DB level | Future batch (audit query UI) |

### 3.17 Clinic-Type Extensions (Specialty)

| Legacy source | Legacy function | Canonical module | Target roles | Business value | Implementation status | Architectural prerequisites | Security concerns | Recommended batch |
|---|---|---|---|---|---|---|---|---|
| `clinic-dental.html` | Tooth-and-jaw interactive chart | M02 Encounter + dental overlay (per `06_CLINIC_TYPES/DENTAL.md`) | R01 | Dental charting | Not implemented | Odontogram model; surface-by-tooth data; rendering | PHI scope; must audit chart.update | Dental batch (post-MVP; C-typed as future in canonical) |
| `clinic-dental.html` | Orthodontic installment scheduling | M06 + M09 + dental overlay | R06, R09, R01 | Treatment-plan payment scheduling | Not implemented | Treatment plan + payment schedule link | Same | Dental batch |
| `clinic-pediatrics.html` | Growth curves | M02 + M04 + pediatrics overlay | R01 | Pediatric monitoring | Not implemented | Growth measurement model; reference curves | Same | Pediatrics batch |
| `clinic-pediatrics.html` | Dose calculator | M05 + pediatrics overlay | R01, R03 | Pediatric medication safety | Not implemented | Drug database; weight-based rules | Critical safety; server-verified | Pediatrics + Pharmacy batch |
| `clinic-internal.html` | Chronic-disease monitoring | M02 + M18 + internal overlay | R01 | Longitudinal chronic care | Not implemented | Condition tag; measurement timeline | Same | Internal Medicine batch |
| `clinic-internal.html` | External labs and ultrasound attachment | M04 + M17 + internal overlay | R01, R04 | External results ingestion | Not implemented | External-result model; ingestion connector | Same; source attribution | Internal Medicine + Integration batch |
| `clinic-lab.html` | Barcode sample tracking | M04 + lab overlay (per `06_CLINIC_TYPES/LABORATORY.md`) | R04, R09 | Sample lifecycle | Not implemented | Sample model; barcode; status state machine | Same | Lab batch |
| `clinic-lab.html` | Result-entry with reference ranges | M04 + M03 + lab overlay | R04, R01 | Result documentation | Not implemented | Result model; reference range; verification | Same; critical results need acknowledgment | Lab batch |
| `clinic-admin-laser.html` | Dermatology and laser workspace shell | M02 + derma overlay (per `06_CLINIC_TYPES/DERMATOLOGY.md`) | R01, R09 | Specialty workspace | Not implemented | Same as clinic shell + derma-specific extensions | Same | Dermatology batch |

---

## 4. Screen Inventory

This section is the complete screen-level inventory extracted from the prototypes. Each row proposes a canonical route, identifies the user type and module, lists the main components and key actions, and notes the required permissions, the Tenant/Organisation/Facility scope, the data dependencies, the audit events, the Arabic and English requirements, the desktop/tablet/mobile priority, and a recommendation. Routes use the canonical prefix conventions expected by the Next.js 16 application router: `/admin/*` for the platform Super Admin surface, `/app/*` for the authenticated clinic workspace, `/app/:facility/*` for facility-scoped screens, and `/login` for the unauthenticated login.

| # | Screen | Proposed route | User type | Module | Purpose | Main components | Key actions | Required permissions | Tenant/Org/Facility scope | Data dependencies | Audit events | AR/EN requirements | D/T/M priority | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Login | `/login` (existing) | Unauthenticated | M14 Identity & Access | Authenticate user | Login card, brand mark, form, error state, throttle state | Submit, recover password | None | Platform scope | User directory | `authentication.login.succeeded`, `authentication.login.failed`, `authentication.login.throttled` | Arabic-first with English toggle; full RTL/LTR mirroring | D=T, M | Reuse as design — already implemented; redesign demo-account section |
| 2 | Authenticated dashboard shell | `/app` (existing `/dashboard`) | All authenticated | Enterprise shell | Navigation and global context | Sidebar, top bar, facility switcher, command search, notifications, user menu | Switch view, switch facility, search, open notifications | None beyond authenticated | Tenant + Facility | Tenant membership, facility assignment | `tenant_context.viewed`, `tenant_context.selected`, `tenant_context.cleared` | Arabic-first; full RTL | D=T, M | Reuse as design — immediate next batch |
| 3 | Platform Super Admin Overview | `/admin` | R14 | Platform Administration | Single-glance platform health | KPI strip (5 cards), alert feed, quick actions | View KPIs, drill into alert | `platform.admin.read` | Platform scope | All tenants (aggregated, PHI-redacted) | `platform.admin.viewed` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 4 | Clinics and Organisations Directory | `/admin/tenants` | R14 | Platform Administration | Tenant directory | Filterable table, category tabs, search, status badges, row actions | Filter, search, add, open detail, impersonate | `tenant.read`, `tenant.create` | Platform scope | Tenant list | `tenant.read`, `tenant.create`, `impersonation.start` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 5 | Tenant Detail and Subscription | `/admin/tenants/[tenantId]` | R14 | Platform Administration + Subscription | Manage one tenant | Tenant profile, subscription panel, facility list, audit timeline | Edit plan, extend time, suspend, reactivate, terminate | `tenant.read`, `subscription.update`, `tenant.suspend` | Tenant scope | Tenant, subscription, facilities | `subscription.update`, `subscription.extend`, `tenant.suspend` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 6 | Support Ticket Queue | `/admin/support` | R14, R13 | Support and Ticketing | Triage tenant support requests | Ticket table, priority filter, assignee selector | Assign, resolve, escalate | `ticket.read`, `ticket.update` | Platform scope | Tickets, tenants | `ticket.assign`, `ticket.resolve` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 7 | Platform Audit Feed (deferred) | `/admin/audit` | R14, R10 | M16 Audit | Platform activity (deferred per ADR-014) | Audit timeline, filter, export (deferred) | Filter, view detail | `audit.read` (deferred) | Platform scope | Audit store | `audit.read` (deferred) | Arabic-first; full RTL | D=T, M | Defer |
| 8 | Clinic Admin Overview | `/app/:facility` | R09 | Clinic Administration | Single-glance clinic health | KPI strip (4 cards), today's appointment board, alerts | View KPIs, drill into board | `facility.read`, `scheduling.read` | Facility scope | Facility, appointments, encounters | `facility.viewed`, `scheduling.read` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 9 | Doctors Directory | `/app/:facility/doctors` | R09, R11 | M12 HR + M13 | Doctor directory | Doctor table, specialty filter, add button | Add, edit, pay, delete | `practitioner.read`, `practitioner.create`, `practitioner.update`, `payroll.execute` | Facility scope | Practitioners, specialties, payroll | `practitioner.read`, `practitioner.create`, `practitioner.update`, `payroll.execute` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 10 | Employees Directory | `/app/:facility/employees` | R09, R11 | M12 HR | Staff directory | Employee table, department filter, add button | Add, edit, pay salary, delete | `employee.read`, `employee.create`, `employee.update`, `payroll.execute` | Facility scope | Employees, departments, payroll | `employee.read`, `employee.create`, `employee.update`, `payroll.execute` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 11 | Patient Directory | `/app/:facility/patients` | R06, R07, R01, R09 | M01 Patient | Patient directory | Patient table, search, filter, add button | Add, open profile, search | `patient.read`, `patient.create` | Facility scope | Patients, consents | `patient.read`, `patient.create` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 12 | Patient Profile | `/app/:facility/patients/[patientId]` | R01, R06, R07 | M01 + M02 + M03 + M04 | Patient 360 view | Patient header, demographics, encounter timeline, orders, results, notes | Open encounter, add note, add order, record payment | `patient.read`, `encounter.read`, `clinical_document.read`, `order.read` | Facility scope | Patient, encounters, orders, results, notes | `patient.read`, `encounter.read` | Arabic-first; full RTL | D=T, M (read-only on M) | Reuse as design |
| 13 | Daily Appointment Operations Board | `/app/:facility/scheduling` | R06, R07, R01, R09 | M06 Scheduling | Daily appointment operations | Calendar/board, status columns, patient cards, chair/resource lanes | Check in, send to doctor, complete, cancel, no-show | `scheduling.read`, `scheduling.update` | Facility scope | Appointments, resources, patients | `scheduling.update` (per transition) | Arabic-first; full RTL | D=T, M | Reuse as design |
| 14 | Clinical Records (per encounter) | `/app/:facility/patients/[patientId]/encounters/[encounterId]` | R01, R02 | M02 + M03 | Encounter documentation | Note editor, order panel, result panel, sign button | Add note, add order, sign encounter | `encounter.read`, `clinical_document.create`, `order.create`, `encounter.sign` | Facility scope | Encounter, notes, orders, results | `clinical_document.create`, `order.create`, `encounter.sign` | Arabic-first; full RTL | D=T, M (read-mostly) | Reuse as design |
| 15 | Finance Overview | `/app/:facility/finance` | R09, R12, R08 | M09 + M10 + M18 | Clinic financial overview | KPI cards, revenue chart, transaction list | Filter by date, export (if permitted) | `billing.read`, `accounting.read`, `report.read` | Facility scope | Ledger, payments, invoices | `billing.read`, `accounting.read` | Arabic-first; full RTL | D=T, M (read-only) | Reuse as design |
| 16 | Inventory | `/app/:facility/inventory` | R09, R11 | M17 (per ADR-010) | Consumables tracking | Item table, low-stock alerts, lot/expiry | Add item, adjust stock, reorder | `inventory.read`, `inventory.update` | Facility scope | Items, lots, transactions | `inventory.read`, `inventory.update` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 17 | Notifications | Global drawer (no route) | All | M08 | In-app notifications | Drawer, list, mark-read, clear | Mark read, clear, click-through | `notification.read` | User scope | Notifications | `notification.read` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 18 | Settings (clinic) | `/app/:facility/settings` | R09, R13 | M15 | Clinic configuration | Form sections, save bar | Save, revert | `configuration.read`, `configuration.update` | Facility scope | Configuration | `configuration.update` | Arabic-first; full RTL | D=T, M (read-only) | Reuse as design |
| 19 | User Preferences | Global drawer (no route) | All | M19 + user prefs | Language, theme, density | Toggle group, save | Save | `user_preference.update` | User scope | User preferences | `user_preference.update` | Arabic-first; full RTL | D=T, M | Reuse as design |
| 20 | Dental Tooth Chart | `/app/:facility/dental/chart` (overlay) | R01 | M02 + dental overlay | Dental charting | Odontogram, surface selector, note | Mark surface, add note | `encounter.read`, `clinical_document.create` | Facility scope | Patient, encounter, odontogram | `clinical_document.create` | Arabic-first; full RTL | D=T, M not supported | Reuse as design (specialty extension) |
| 21 | Pediatric Growth Curve | `/app/:facility/pediatrics/growth/[patientId]` | R01 | M02 + M04 + pediatrics overlay | Growth monitoring | Growth chart, measurement entry | Add measurement | `encounter.read`, `order.create` (measurement) | Facility scope | Patient, measurements | `clinical_document.create` | Arabic-first; full RTL | D=T, M read-only | Reuse as design (specialty extension) |
| 22 | Pediatric Dose Calculator | `/app/:facility/pediatrics/dose` | R01, R03 | M05 + pediatrics overlay | Weight-based dosing | Weight input, drug selector, result, range indicator | Calculate, prescribe | `pharmacy.read`, `order.create` | Facility scope | Drug database, weight | `order.create` (if prescribed) | Arabic-first; full RTL | D=T, M | Reuse as design (specialty extension) |
| 23 | Internal Medicine Chronic Registry | `/app/:facility/internal/registry` | R01 | M02 + M18 + internal overlay | Population health | Patient list grouped by condition | Filter by condition, open patient | `patient.read`, `report.read` | Facility scope | Patients, conditions | `patient.read`, `report.read` | Arabic-first; full RTL | D=T, M read-only | Reuse as design (specialty extension) |
| 24 | Lab Sample Tracking | `/app/:facility/lab/samples` | R04, R09 | M04 + lab overlay | Sample lifecycle | Sample table, barcode search, status pipeline | Draw, process, verify, deliver | `order.read`, `order.update`, `result.create` | Facility scope | Samples, orders, results | `order.update`, `result.create` | Arabic-first; full RTL | D=T, M | Reuse as design (specialty extension) |
| 25 | Lab Result Entry | `/app/:facility/lab/samples/[sampleId]` | R04, R01 | M04 + M03 + lab overlay | Result documentation | Result entry form, reference range, verification, critical-result alert | Enter, verify, flag critical | `result.create`, `result.verify` | Facility scope | Sample, result, reference range | `result.create`, `result.verify` | Arabic-first; full RTL | D=T, M read-only | Reuse as design (specialty extension) |

The inventory contains **25 screens**: 7 platform-surface screens (including the deferred audit feed), 11 clinic-surface shell screens, and 7 specialty-extension screens. Of these, **8 are the recommended first-set Stitch reference screens** (see Section 10 of `GOOGLE_STITCH_MASTER_BRIEF.md`): Login, Platform Super Admin Overview, Clinics and Organisations Directory, Tenant Detail and Subscription, Clinic Admin Overview, Patient Directory, Patient Profile, and Daily Appointment Operations Board.

---

## 5. Workflow Extraction

This section maps each legacy workflow to its canonical roles and permissions, identifies the missing steps and unsafe assumptions in the legacy version, lists the audit events that must be emitted in the canonical version, and recommends a corrected enterprise workflow. The audit-event names follow the action-code catalogue established by the ratified audit primitive (Batch 9, ADR-014). Workflows are presented in the order requested by the stage brief.

### 5.1 Super Admin login

**Legacy behaviour.** `login.html` + `login.js`: user enters username and password; client-side `users` object is checked; on match, `clinicType` is written to `localStorage` and the user is redirected to `index.html`. Six demo accounts are pre-filled by visible buttons.

**Missing steps.** No server verification, no password hashing, no rate limiting, no audit, no session token, no CSRF, no MFA, no account-existence protection (failed-login reveals whether the account exists by virtue of which accounts are listed on the demo buttons), no session expiry, no secure cookie, no rotation, no logout audit.

**Unsafe assumptions.** The browser is trusted to authenticate. Credentials are public. The redirect destination is decided client-side. The "clinicType" written to localStorage is treated as authoritative tenancy context.

**Canonical roles and permissions.** The Super Admin is R14 (System Administrator) per `02_PRODUCT/USER_ROLES.md`. Authentication is governed by ADR-013 (Authentication and Session Strategy). Login does not require a specific permission; it establishes the identity that subsequent permission checks evaluate.

**Required audit events.** `authentication.login.succeeded`, `authentication.login.failed`, `authentication.login.throttled` (when safely interceptable), `authentication.session.created`, `authentication.session.rotated`. Per ADR-014, failed-login identifiers are HMAC-hashed with the identifier key; the raw attempted email/username is never persisted; the response body must not reveal whether the account exists.

**Recommended enterprise workflow.** (1) User submits username/email and password over TLS to `POST /auth/login`. (2) The API verifies the credential against the stored Argon2 hash (already implemented in `password.service.ts`). (3) The audited throttler (already implemented in `audited-throttler.guard.ts`) applies rate-limiting and emits `authentication.login.throttled` when safely interceptable. (4) On success, a session token is issued (already implemented in `session-token.service.ts`), an httpOnly Secure SameSite=Lax cookie is set, CSRF token is issued, and `authentication.login.succeeded` + `authentication.session.created` are emitted atomically through the audit outbox. (5) On failure, `authentication.login.failed` is emitted with the HMAC-hashed identifier; the response body is identical whether the account exists or not. (6) The redirect destination is decided server-side based on the user's roles and tenant memberships; the client never decides routing based on `localStorage`. (7) MFA challenge is required for R13 and R14 before the session is promoted to authenticated state.

### 5.2 Create a clinic or Tenant

**Legacy behaviour.** `index.html` + `app.js` → `saveNewClinic`: opens modal, captures name, category, system type, manager, phone, plan, status; writes a new clinic object to `localStorage`; logs to mutable audit array.

**Missing steps.** No server verification, no tenant-uniqueness check, no organisation/facility hierarchy, no subscription record creation, no manager-account creation, no welcome notification, no audit integrity, no receipt of payment, no contract acceptance, no GDPR/privacy consent, no SLA agreement.

**Unsafe assumptions.** Tenant identity is a localStorage string. Manager phone is captured as plaintext and later exposed in WhatsApp deep links. The system type is mutable from the moment of creation, inviting data corruption.

**Canonical roles and permissions.** R14 only. `tenant.create` permission required. The new tenant is created with a default R09 (Administrator) role slot for the named manager, who must separately accept an invitation to claim it.

**Required audit events.** `tenant.create`, `subscription.create`, `organisation.create` (if multi-org), `facility.create` (at least one default facility), `role.assign` (R09 to the manager invitation), `invitation.create`.

**Recommended enterprise workflow.** (1) R14 navigates to `/admin/tenants/new`. (2) R14 enters tenant name, legal entity type, primary contact (name + email, not phone), desired clinic-type overlay, subscription plan, and billing address. (3) The API validates uniqueness, validates the clinic-type overlay against the catalogue, computes the subscription term from the plan-to-days table, and creates: a `Tenant`, an `Organisation`, a default `Facility`, a `Subscription` with `active` or `grace` status, an `Invitation` to the primary contact with a one-time claim token, and a `RoleAssignment` pending the invitation claim. (4) All five writes commit atomically with their audit outbox records. (5) The invitation email is dispatched through the notification channel. (6) The R14 lands on the new tenant's detail page. (7) The manager later clicks the invitation link, sets a password, and the `role.assign` is activated.

### 5.3 Change clinic status

**Legacy behaviour.** `app.js` → `extendClinicTime` sets status to `فترة السماح` (grace) and adds 7 days; there is no general status-change function beyond plan edit and delete.

**Missing steps.** No `suspend`, `reactivate`, `terminate` actions. No reason capture. No notification to the tenant. No data-protection consideration for terminated tenants. No retention enforcement.

**Unsafe assumptions.** Status is a free-text string on a localStorage object, not a state machine. Any Super Admin action is unaccountable.

**Canonical roles and permissions.** R14. `tenant.suspend`, `tenant.reactivate`, `tenant.terminate` permissions required (distinct from `subscription.update`).

**Required audit events.** `tenant.suspend`, `tenant.reactivate`, `tenant.terminate`, `subscription.update` (when status change is a side effect of subscription change). Each event must capture the reason, the actor, and the previous status.

**Recommended enterprise workflow.** (1) R14 opens the tenant detail page. (2) R14 selects the status action; a modal captures the reason and confirms. (3) The API validates that the transition is legal (e.g., cannot suspend an already-terminated tenant; cannot reactivate a terminated tenant without a new subscription). (4) The transition commits atomically with its audit record. (5) The tenant's active sessions are invalidated if suspended or terminated. (6) A notification is dispatched to the tenant's primary contact. (7) For terminated tenants, the data-retention clock starts per `09_SECURITY/COMPLIANCE/DATA_RETENTION.md`; no immediate deletion.

### 5.4 Activate, suspend, or renew subscription

**Legacy behaviour.** `app.js` → `savePlanChanges` mutates the plan and recomputes expiry; `extendClinicTime` adds 7 days once per year. Subscription state is implicit in the tenant's `status` field.

**Missing steps.** No payment record, no invoice, no receipt, no proration, no renewal notification, no auto-renewal, no grace-period-entry trigger, no grace-period-exit trigger, no suspension-on-expiry trigger.

**Unsafe assumptions.** Subscription is a field on the tenant, not a separate aggregate. Plan change is free with no financial transaction. The once-per-year extension guard is enforced only client-side.

**Canonical roles and permissions.** R14 for plan changes; R12 (Executive) for read; the system itself (R14 Integration Account or a scheduled job) for expiry-driven transitions.

**Required audit events.** `subscription.create`, `subscription.update`, `subscription.extend`, `subscription.expire` (system-driven), `subscription.suspend` (system-driven on grace-period expiry), `subscription.renew`, `billing.collect` (when payment is recorded).

**Recommended enterprise workflow.** (1) Subscription is its own aggregate with state machine: `pending → active → grace → suspended → terminated`, plus `renewed` as a transition that creates a new subscription period. (2) Plan change creates a new subscription period with prorated invoice; the old period is closed. (3) Grace entry is triggered automatically by a scheduled job when the current period ends without renewal. (4) Grace exit (to suspended) is triggered automatically after a configured grace duration. (5) Each transition commits atomically with its audit record and dispatches a notification to the tenant's primary contact. (6) The once-per-year extension is a policy on the tenant, enforced server-side; the audit record captures the policy decision. (7) Renewal requires a successful payment record (`billing.collect`) before the new period is activated; if payment fails, the subscription enters grace.

### 5.5 Open or impersonate clinic workspace

**Legacy behaviour.** `app.js` → `loginToClinic`: writes `clinicType` to `localStorage` and `window.location.href`-redirects to the matching static HTML file. No separation between Super Admin and tenant user; no audit; no time-bound session; no consent prompt; no return path.

**Missing steps.** No MFA, no reason capture, no time limit, no audit, no original-actor preservation, no automatic termination, no return-to-admin action, no notification to the tenant.

**Unsafe assumptions.** The browser's `localStorage` clinicType is the tenancy context. Impersonation is indistinguishable from a normal login.

**Canonical roles and permissions.** R14 only. `impersonation.start` permission required. The impersonated session carries an `impersonator` claim that is distinct from the `actor` claim; the audit actor is the impersonator, the session actor is the impersonated user.

**Required audit events.** `impersonation.start`, `impersonation.end`, and every action taken during the impersonated session is attributed to the impersonator in the audit chain (with the impersonated user recorded in metadata).

**Recommended enterprise workflow.** (1) R14 navigates to the tenant directory, selects a tenant, and chooses "Impersonate" from the row menu. (2) A modal captures the reason and requires MFA re-verification. (3) The API creates a new session token that carries both `impersonator` and `actor` claims, with a hard time limit (e.g., 60 minutes). (4) `impersonation.start` is emitted. (5) R14 is redirected to `/app/:facility` with the impersonated context. (6) A persistent banner indicates impersonation and offers "End impersonation". (7) Every action during the session emits audit events attributed to the impersonator with the impersonated user in metadata. (8) On end (manual or timeout), `impersonation.end` is emitted and the session is invalidated; R14 returns to `/admin`.

### 5.6 Create support ticket

**Legacy behaviour.** Tickets are pre-seeded in `initialTickets`; there is no ticket-creation surface in the prototypes. The Super Admin can only resolve existing tickets.

**Missing steps.** No tenant-side ticket creation, no category, no severity, no attachment, no SLA, no assignment, no escalation, no audit.

**Unsafe assumptions.** Tickets exist by fiat. Tenant scoping is implicit.

**Canonical roles and permissions.** Any authenticated role may create a ticket within their tenant. R14 and R13 may read across tenants. `ticket.create`, `ticket.read`, `ticket.update`, `ticket.assign`, `ticket.resolve` permissions.

**Required audit events.** `ticket.create`, `ticket.assign`, `ticket.update`, `ticket.resolve`, `ticket.escalate`.

**Recommended enterprise workflow.** (1) A tenant user navigates to `/app/:facility/support` and clicks "New ticket". (2) A modal captures category, severity, subject, description, and optional attachment. (3) The API validates, assigns a ticket ID, sets status to `open`, sets SLA based on severity, and commits atomically with the audit record. (4) A notification is dispatched to the tenant's R09 and to the platform's R14 queue. (5) R14 (or R13) opens `/admin/support`, assigns the ticket to an operator, and works it. (6) Status transitions are audited. (7) On resolution, the tenant user is notified and may reopen within a window.

### 5.7 Add doctor

**Legacy behaviour.** `clinic-laser.js` → `saveNewDoctor`: captures name, specialty, phone, email, password, incentive settings, salary settings; writes to `localStorage`. No verification, no audit, no role assignment.

**Missing steps.** No email verification, no password-strength check, no role assignment, no specialty validation against a catalogue, no audit, no invitation flow, no consent, no credential issuance.

**Unsafe assumptions.** Password is captured in a modal and stored in plaintext in localStorage. The doctor is immediately active. The clinic-type assignment is implicit.

**Canonical roles and permissions.** R09 (Administrator) and R11 (HR Manager) at the facility scope. `practitioner.create`, `role.assign` (assigning R01 Physician to the new practitioner) permissions.

**Required audit events.** `practitioner.create`, `role.assign`, `invitation.create` (if invitation flow used), `user.email.verified` (when the practitioner verifies).

**Recommended enterprise workflow.** (1) R09 navigates to `/app/:facility/doctors` and clicks "Add doctor". (2) A modal captures name, specialty (validated against catalogue), email, role (R01 by default; can be R02/R03/R05 depending on scope), and compensation settings (incentive rate, salary, payment cycle). (3) The API validates, creates a `Practitioner` record (without a credential), creates an `Invitation` to the captured email, and creates a pending `RoleAssignment`. (4) All three writes commit atomically with their audit records. (5) The invitation email is dispatched. (6) The practitioner clicks the invitation, sets a password (strength-validated), and the `role.assign` is activated. (7) The compensation settings are stored in a `PayrollConfiguration` aggregate that requires R11 or R09 to read; field-level permission gates salary visibility.

### 5.8 Add employee

**Legacy behaviour.** `clinic-laser.js` → `saveNewEmployee`: captures name, position, department, status; writes to localStorage. No identity, no audit, no role.

**Missing steps.** No identity record, no role assignment, no department validation, no audit, no payroll configuration.

**Unsafe assumptions.** Employee is a free-text record. Status is mutable without audit.

**Canonical roles and permissions.** R09 and R11. `employee.create`, `role.assign` (for non-clinical roles R06–R09 as appropriate).

**Required audit events.** `employee.create`, `role.assign`, `payroll.configuration.update` (if compensation captured).

**Recommended enterprise workflow.** Similar to Add doctor but the role is one of R06 (Receptionist), R07 (Scheduler), R08 (Biller), R09 (Administrator), or R11 (HR Manager). Compensation settings are optional at creation and may be added later by R11. Department is validated against a tenant-scoped catalogue.

### 5.9 Register patient

**Legacy behaviour.** `clinic-laser.js` → `saveNewPatient`: captures name, age, phone, payment status; writes to localStorage. No identity verification, no consent, no audit, no deduplication.

**Missing steps.** No consent capture, no identity verification, no deduplication, no PHI scoping, no audit, no medical-record-number assignment, no insurance capture.

**Unsafe assumptions.** Patient is a free-text record. No consent means no legal basis for treatment.

**Canonical roles and permissions.** R06 (Receptionist), R07 (Scheduler), R09 (Administrator). `patient.create` permission.

**Required audit events.** `patient.create`, `consent.capture`, `medical_record_number.assign`.

**Recommended enterprise workflow.** (1) R06 navigates to `/app/:facility/patients` and clicks "New patient". (2) A multi-step modal captures: demographics, contact, identity (national ID or other regional identifier), insurance (if applicable), emergency contact, and consent (general consent to treatment + privacy consent). (3) The API deduplicates against existing patients by hashed identity; if a near-match is found, R06 is offered a "merge" or "create new" choice. (4) On create, the API assigns a medical record number (MRN), creates the `Patient`, captures `Consent` records, and commits atomically with audit records. (5) The patient is enrolled in the default communication channel per consent. (6) The patient is visible only within the facility's tenant scope.

### 5.10 Schedule appointment

**Legacy behaviour.** Appointments are not directly created in the prototypes; the daily appointment board is populated from a seeded array. The appointment state machine (`arrived → waiting → withDoctor → completed | cancelled | noShow`) is visible in the calendar status colors.

**Missing steps.** No scheduling surface, no resource conflict check, no reminder notification, no audit, no patient confirmation, no reschedule, no cancellation reason.

**Unsafe assumptions.** Appointment state is implicit. No conflict detection means double-booking is possible.

**Canonical roles and permissions.** R06, R07, R09. `scheduling.create`, `scheduling.update`, `scheduling.read` permissions. R01 may read and update within their own schedule.

**Required audit events.** `scheduling.create`, `scheduling.update` (per status transition), `scheduling.cancel`, `scheduling.reschedule`, `notification.dispatch` (reminder).

**Recommended enterprise workflow.** (1) R06 navigates to `/app/:facility/scheduling/new` and selects patient, practitioner, resource (chair/room), date, time, duration, and reason. (2) The API validates resource availability (no conflicts), validates the practitioner's schedule, validates the patient's eligibility (active, not blocked), and creates the `Appointment` with status `pending`. (3) A reminder notification is scheduled. (4) On the appointment day, R06 checks the patient in (`arrived`), moves them to `waiting`, then `withDoctor`, then `completed`. (5) Each transition emits `scheduling.update`. (6) Cancellation captures a reason and emits `scheduling.cancel`. (7) No-show is recorded after a configurable grace window and emits `scheduling.update` with `noShow`.

### 5.11 Patient arrival

**Legacy behaviour.** Implicit in the appointment state machine (`arrived` status).

**Missing steps.** No arrival verification (e.g., SMS code), no wait-time start timestamp, no notification to practitioner, no audit.

**Unsafe assumptions.** Arrival is a status flip.

**Canonical roles and permissions.** R06, R07. `scheduling.update` permission.

**Required audit events.** `scheduling.update` (with `arrived` status), `notification.dispatch` (to practitioner).

**Recommended enterprise workflow.** (1) Patient arrives at the facility. (2) R06 searches for the patient's appointment by name or MRN. (3) R06 marks the appointment `arrived`; the API records the arrival timestamp, emits the audit event, and dispatches a notification to the assigned practitioner. (4) The wait-time clock starts. (5) The patient appears in the `waiting` column of the operations board.

### 5.12 Waiting-room flow

**Legacy behaviour.** The patient-status state machine has `waiting` as a state between `arrived` and `withDoctor`.

**Missing steps.** No wait-time display, no priority reordering, no patient-call notification, no audit per transition.

**Unsafe assumptions.** The waiting room is implicit.

**Canonical roles and permissions.** R06, R07, R09. `scheduling.read`, `scheduling.update` permissions.

**Required audit events.** `scheduling.update` (each transition), `notification.dispatch` (patient called).

**Recommended enterprise workflow.** (1) The waiting-room view at `/app/:facility/scheduling/waiting` shows all patients in `arrived` or `waiting` status, sorted by arrival time, with wait-time prominently displayed. (2) R06 can reorder by priority (urgent, chronic, etc.). (3) When a practitioner is ready, R06 or the practitioner moves the patient to `withDoctor`; the API emits the audit event and dispatches a "patient called" notification (in-app or SMS per patient consent). (4) The patient moves to the consultation room.

### 5.13 Send patient to doctor

**Legacy behaviour.** `updatePatientStatus(id, 'withDoctor')` is a single function call.

**Missing steps.** No assignment verification (is the doctor available?), no room/chair assignment, no audit, no notification.

**Unsafe assumptions.** The doctor is implicitly available.

**Canonical roles and permissions.** R06, R07, R01 (self-claim). `scheduling.update` permission.

**Required audit events.** `scheduling.update` (with `withDoctor`), `notification.dispatch` (to doctor if initiated by R06).

**Recommended enterprise workflow.** (1) R06 selects the patient in the waiting room and clicks "Send to doctor" or "Assign". (2) A modal captures the doctor (default: the appointment's assigned doctor; can be reassigned) and the room/chair. (3) The API validates the doctor's availability and the room's availability, updates the appointment, emits the audit event, and dispatches a notification to the doctor. (4) The patient moves to `withDoctor` on the operations board. (5) The encounter record is opened (or a stub is created for later completion).

### 5.14 Complete consultation

**Legacy behaviour.** `updatePatientStatus(id, 'completed')` is a single function call. No clinical documentation is captured.

**Missing steps.** No clinical note, no diagnosis capture, no order creation, no prescription, no follow-up scheduling, no signature, no audit, no encounter closure invariant (must have note + signature).

**Unsafe assumptions.** Completion is a status flip; clinical content is optional.

**Canonical roles and permissions.** R01 (Physician), R02 (Nurse) for partial documentation. `encounter.sign` permission required for closure (R01 only).

**Required audit events.** `clinical_document.create` (each note/order/result), `encounter.sign`, `scheduling.update` (with `completed`), `order.create` (if orders written), `prescription.create` (if medications prescribed).

**Recommended enterprise workflow.** (1) R01 opens the encounter from the operations board. (2) R01 documents the encounter: chief complaint, history, examination, assessment, plan, orders, prescriptions, follow-up. (3) Each artefact is created with its audit event. (4) When the documentation is complete, R01 signs the encounter; the API validates that all required sections are present, sets the encounter status to `signed`, emits `encounter.sign`, and transitions the appointment to `completed`. (5) The patient is directed to billing and discharge. (6) The encounter is locked; further edits require an addendum.

### 5.15 Record payment

**Legacy behaviour.** `togglePaymentStatus(id)` flips payment status between `paid` and `pending`. No amount, no method, no receipt.

**Missing steps.** No amount, no payment method, no receipt number, no invoice, no refund, no audit, no financial posting.

**Unsafe assumptions.** Payment is a boolean.

**Canonical roles and permissions.** R06, R08 (Biller), R09. `billing.collect`, `billing.read` permissions.

**Required audit events.** `billing.collect`, `billing.refund` (if applicable), `accounting.post` (ledger entry).

**Recommended enterprise workflow.** (1) R08 navigates to the patient's encounter or to `/app/:facility/billing`. (2) R08 selects the encounter, reviews the charges, captures the payment method (cash, card, insurance, transfer), enters the amount, and confirms. (3) The API creates a `Payment` record, posts a ledger entry, generates a receipt number, marks the encounter's billing status as `paid` (or `partial`), and emits audit events. (4) A receipt is generated (PDF) and made available to the patient. (5) Refunds require a separate permission and capture a reason.

### 5.16 Pay doctor incentive

**Legacy behaviour.** `clinic-laser.js` → `confirmPayDoctor`: captures salary amount and incentive amount, computes total, and "pays" (writes `paid=true` to localStorage). No ledger, no audit, no receipt.

**Missing steps.** No calculation verification (incentive rate × patient count), no ledger entry, no bank/cash account, no receipt, no audit, no period-based aggregation.

**Unsafe assumptions.** The administrator enters amounts manually; the system does not compute or verify.

**Canonical roles and permissions.** R09, R11. `payroll.execute`, `accounting.post` permissions.

**Required audit events.** `payroll.calculate`, `payroll.execute`, `accounting.post`.

**Recommended enterprise workflow.** (1) R11 navigates to `/app/:facility/payroll` and selects the doctor. (2) The API computes the due amount from the payroll configuration: `salary + (incentiveRate × patientsCount)`, where `patientsCount` is the count of the doctor's `completed` encounters in the current period. (3) R11 reviews and confirms. (4) The API creates a `PayrollPayment` record, posts a ledger entry, marks the period as paid, generates a payslip, and emits audit events. (5) The doctor is notified. (6) The payment is reflected in the finance overview.

### 5.17 Pay employee salary

**Legacy behaviour.** `toggleSalaryPaid(id)` flips `paid` boolean. No amount, no period, no ledger.

**Missing steps.** Same as Pay doctor incentive, minus the incentive calculation.

**Unsafe assumptions.** Salary payment is a boolean toggle.

**Canonical roles and permissions.** R09, R11. `payroll.execute`, `accounting.post` permissions.

**Required audit events.** `payroll.execute`, `accounting.post`.

**Recommended enterprise workflow.** Similar to Pay doctor incentive, but the amount is the configured salary for the period; no incentive calculation. The API validates that the salary has not already been paid for the period (idempotency).

### 5.18 Add inventory item

**Legacy behaviour.** Not implemented in the prototypes (placeholder only).

**Missing steps.** All steps.

**Unsafe assumptions.** None (no implementation).

**Canonical roles and permissions.** R09, R11. `inventory.create`, `inventory.update` permissions.

**Required audit events.** `inventory.create`, `inventory.update`, `inventory.adjust` (stock adjustments).

**Recommended enterprise workflow.** (1) R11 navigates to `/app/:facility/inventory` and clicks "Add item". (2) A modal captures name, category, unit, reorder point, lot, expiry, initial quantity, and (for controlled substances) the controlled-substance schedule. (3) The API validates, creates the `InventoryItem` and an `InventoryTransaction` (initial stock), and emits audit events. (4) The item appears in the inventory list with current quantity. (5) When quantity drops below reorder point, a low-stock notification is dispatched.

### 5.19 Low-stock warning

**Legacy behaviour.** Not implemented; the dental mockup shows a "critical stock alert" KPI card but no logic.

**Missing steps.** All steps.

**Unsafe assumptions.** None (no implementation).

**Canonical roles and permissions.** System-driven (R14 Integration Account for the scheduler). `notification.dispatch` permission (system).

**Required audit events.** `notification.dispatch` (low-stock), `inventory.threshold.crossed`.

**Recommended enterprise workflow.** (1) A scheduled job runs periodically (e.g., every 15 minutes) and queries all inventory items where `currentQuantity <= reorderPoint` and `lowStockNotified = false`. (2) For each match, the job creates a `Notification` addressed to the facility's R09 and R11, sets `lowStockNotified = true`, and emits `inventory.threshold.crossed` and `notification.dispatch`. (3) When the item is restocked above the reorder point, `lowStockNotified` is reset to `false`. (4) The notification appears in the recipients' notification drawer.

### 5.20 View reports

**Legacy behaviour.** The finance view shows a weekly revenue chart and a daily revenue figure. No other reports are implemented.

**Missing steps.** No parameterised reports, no export, no scheduled reports, no drill-down, no audit, no permission gating.

**Unsafe assumptions.** Reports are read-only views with no audit.

**Canonical roles and permissions.** R09, R12, R08. `report.read` permission. Export requires `report.export` permission.

**Required audit events.** `report.read` (each report viewed), `report.export` (each export).

**Recommended enterprise workflow.** (1) R12 navigates to `/app/:facility/reports` and selects a report from the catalogue. (2) The report renders with default parameters. (3) R12 can adjust date range, group-by, and filter. (4) Each view emits `report.read`. (5) Export (PDF/Excel) requires `report.export` permission and emits `report.export` with the export format and parameter hash. (6) Scheduled reports are configured by R09 and dispatched by the system.

### 5.21 Change clinic settings

**Legacy behaviour.** `clinic-laser.js` → `showSettings`: opens a settings view; no settings are persisted in the prototype.

**Missing steps.** No persistence, no validation, no audit, no versioning, no rollback.

**Unsafe assumptions.** Settings are display-only.

**Canonical roles and permissions.** R09, R13 (System Administrator at tenant scope). `configuration.read`, `configuration.update` permissions.

**Required audit events.** `configuration.update` (each change), `configuration.publish` (when a draft is published).

**Recommended enterprise workflow.** (1) R09 navigates to `/app/:facility/settings`. (2) The settings are organised into sections: clinic profile, hours, contact, appointment defaults, billing defaults, notification preferences, integration settings. (3) R09 edits a draft; the draft is auto-saved. (4) On publish, the API validates the draft against the configuration schema, creates a new version, marks it active, deactivates the previous version, and emits `configuration.publish`. (5) The previous version is retained for rollback. (6) Changes that affect other modules (e.g., default appointment duration) are propagated through the configuration-driven architecture per ADR-001.

---

## 6. Data-Entity Extraction

This section extracts every meaningful entity from the legacy JavaScript and HTML, maps it to its likely canonical aggregate or model, classifies sensitive data, identifies the tenant scope and ownership, lists lifecycle states, identifies missing fields and fields that must not be copied directly, and recommends the future domain document or batch where the entity should be designed. No Prisma models are created in this stage; this section is analysis only.

### 6.1 Clinic (Tenant)

| Aspect | Value |
|---|---|
| Legacy fields | `id`, `name`, `category` (free text: أسنان/جلدية وليزر/أطفال/عام وباطنية), `type` (enum: GENERAL/DERMA_LASER/DENTAL/PEDIATRICS/INTERNAL/LAB), `manager` (free text), `phone` (E.164-ish), `plan` (enum: شهري/3 أشهر/نصف سنوي/سنوي), `status` (enum: نشط/فترة السماح/متوقف), `expiry` (date), `bookings` (integer), `extendedThisYear` (boolean) |
| Likely canonical aggregate | `Tenant` aggregate (per ADR-004 Multi-Tenant Strategy); paired with `Organisation` and `Facility` aggregates per `01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` |
| Sensitive-data classification | Manager name and phone are PII; subscription status and expiry are commercially sensitive |
| Tenant scope | Platform scope (R14 reads across tenants; tenant users read only their own) |
| Ownership | Platform-owned; created by R14 |
| Lifecycle states | `pending → active → grace → suspended → terminated` (canonical); the legacy `نشط/فترة السماح/متوقف` maps to `active/grace/suspended` |
| Missing fields | `legalName`, `taxId`, `billingAddress`, `contractAcceptedAt`, `contractVersion`, `primaryContactEmail`, `primaryContactName`, `createdAt`, `createdBy`, `terminatedAt`, `terminatedBy`, `terminationReason`, `dataRetentionClock` |
| Fields that must not be copied directly | `phone` (must be captured as `primaryContactPhone` with explicit consent and never exposed in URLs); `manager` (must be a foreign key to a `User`, not free text); `extendedThisYear` (must be a server-enforced policy, not a boolean on the tenant); `bookings` (must be a computed aggregation, not a stored counter) |
| Recommended future domain document or batch | `04_DATABASE/` tenant schema; Subscription Management batch |

### 6.2 Subscription

| Aspect | Value |
|---|---|
| Legacy fields | Implicit in `Clinic.plan`, `Clinic.status`, `Clinic.expiry` |
| Likely canonical aggregate | `Subscription` aggregate (separate from `Tenant`) |
| Sensitive-data classification | Plan and expiry are commercially sensitive; payment evidence is sensitive |
| Tenant scope | Tenant scope (R14 reads across; R12 reads own) |
| Ownership | Platform-owned; managed by R14 |
| Lifecycle states | `pending → active → grace → suspended → terminated`; plus `renewed` as a transition |
| Missing fields | `subscriptionId`, `tenantId`, `planId`, `periodStart`, `periodEnd`, `status`, `autoRenew`, `paymentMethodId`, `lastPaymentAt`, `lastPaymentAmount`, `lastPaymentStatus`, `graceReason`, `graceEndsAt`, `suspendedReason`, `suspendedAt`, `terminatedReason`, `terminatedAt`, `renewedFrom` (previous subscription ID) |
| Fields that must not be copied directly | The plan-to-revenue mapping (120k/350k/650k/1.2M IQD) must be in a `Plan` catalogue, not hardcoded; the plan-to-days mapping must be in the same catalogue |
| Recommended future domain document or batch | `04_DATABASE/` subscription schema; Subscription Management batch |

### 6.3 SupportTicket

| Aspect | Value |
|---|---|
| Legacy fields | `id`, `clinicName` (free text), `type` (free text), `text` (free text), `priority` (enum: عالية/متوسطة) |
| Likely canonical aggregate | `SupportTicket` aggregate (new; not in M-catalogue; recommended for addition) |
| Sensitive-data classification | Ticket body may contain PHI if the tenant describes a clinical issue; assignee is PII |
| Tenant scope | Tenant scope on read (tenant users see only their tickets); platform scope on read for R14/R13 |
| Ownership | Tenant-created; platform-resolved |
| Lifecycle states | `open → assigned → in_progress → resolved → closed`; plus `reopened` |
| Missing fields | `ticketId`, `tenantId`, `facilityId`, `category` (enum), `severity` (enum: low/medium/high/critical), `subject`, `body`, `attachments` (array of file references), `createdBy` (user), `createdByRole`, `assignedTo` (user), `assignedAt`, `status`, `priority`, `slaDueAt`, `resolvedAt`, `resolvedBy`, `resolutionNote`, `reopenedAt`, `reopenedBy`, `reopenedReason` |
| Fields that must not be copied directly | `clinicName` (must be `tenantId` FK); `type` (must be `category` enum); `text` (must be `body` with length limit and PHI scan) |
| Recommended future domain document or batch | `04_DATABASE/` ticket schema; Support and Ticketing batch |

### 6.4 Doctor (Practitioner)

| Aspect | Value |
|---|---|
| Legacy fields | `id`, `nameAr`/`nameEn`, `specialtyAr`/`specialtyEn`, `phone`, `status` (enum: على رأس العمل/في إجازة), `hasIncentive`, `incentiveRate`, `patientsCount`, `hasSalary`, `salary`, `paymentCycle` (enum: daily/weekly/biweekly/monthly), `paid` |
| Likely canonical aggregate | `Practitioner` aggregate (per M12 HR + M13 Workforce + clinical practitioner role R01) |
| Sensitive-data classification | Name and phone are PII; salary and incentive rate are financially sensitive; field-level permission required |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned; managed by R09/R11 |
| Lifecycle states | `invited → active → on_leave → inactive → terminated` |
| Missing fields | `userId` (FK to identity), `email`, `credentialIssuedAt`, `specialtyId` (FK to catalogue, not free text), `licenseNumber`, `licenseExpiry`, `hireDate`, `terminationDate`, `avatarUrl`, `languagesSpoken` |
| Fields that must not be copied directly | `phone` (must be captured with consent and stored encrypted-at-rest in production); `salary` and `incentiveRate` (must be on a `PayrollConfiguration` aggregate with field-level permission, not on the practitioner); `patientsCount` (must be a computed aggregation, not stored); `paid` (must be a `PayrollPayment` aggregate, not a boolean) |
| Recommended future domain document or batch | `04_DATABASE/` practitioner schema; Doctors batch |

### 6.5 Employee

| Aspect | Value |
|---|---|
| Legacy fields | `id`, `nameAr`/`nameEn`, `positionAr`/`positionEn`, `departmentAr`/`departmentEn`, `status` (enum: نشط/متوقف), `salary`, `paid` |
| Likely canonical aggregate | `Employee` aggregate (per M12 HR) |
| Sensitive-data classification | Same as Doctor |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned; managed by R09/R11 |
| Lifecycle states | Same as Doctor |
| Missing fields | `userId`, `email`, `positionId` (FK to catalogue), `departmentId` (FK to catalogue), `hireDate`, `terminationDate`, `managerId` |
| Fields that must not be copied directly | Same as Doctor |
| Recommended future domain document or batch | `04_DATABASE/` employee schema; HR batch |

### 6.6 Patient

| Aspect | Value |
|---|---|
| Legacy fields | `id`, `nameAr`/`nameEn`, `age`, `phone`, `status` (enum: arrived/waiting/withDoctor/completed/cancelled/noShow), `paymentStatus` (enum: paid/pending), `amount` |
| Likely canonical aggregate | `Patient` aggregate (per M01 Patient) |
| Sensitive-data classification | PHI — strict tenant scope; field-level permission; audit every read |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned |
| Lifecycle states | `active → inactive → deceased` (patient-level); encounter status is separate |
| Missing fields | `medicalRecordNumber`, `dateOfBirth` (not `age` — age is computed), `sex`, `gender`, `nationalId` (with consent), `address`, `emergencyContact`, `insurancePlanId`, `insuranceMemberId`, `consentToTreatAt`, `privacyConsentAt`, `communicationPreference`, `languagePreference`, `deceasedAt` |
| Fields that must not be copied directly | `age` (must be `dateOfBirth` with age computed); `phone` (must be captured with consent, stored encrypted-at-rest, never exposed in URLs); `status` (this is encounter status, not patient status — must be moved to `Encounter`); `paymentStatus` and `amount` (must be on `Encounter` or `Billing`, not `Patient`) |
| Recommended future domain document or batch | `04_DATABASE/` patient schema; Patients batch; `03_DOMAIN/CLINICAL_WORKFLOWS.md` for encounter lifecycle |

### 6.7 Appointment

| Aspect | Value |
|---|---|
| Legacy fields | Implicit in the patient-status state machine; the prototype does not have a distinct Appointment entity |
| Likely canonical aggregate | `Appointment` aggregate (per M06 Scheduling) |
| Sensitive-data classification | PHI (patient reference, reason) |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned |
| Lifecycle states | `pending → confirmed → arrived → waiting → withDoctor → completed` (happy path); `pending → cancelled`; `arrived → noShow` |
| Missing fields | `appointmentId`, `patientId`, `practitionerId`, `resourceId` (chair/room), `facilityId`, `scheduledStart`, `scheduledEnd`, `actualStart`, `actualEnd`, `reason`, `status`, `createdBy`, `createdByRole`, `cancelledReason`, `cancelledAt`, `cancelledBy`, `noShowAt`, `reminderDispatchedAt` |
| Fields that must not be copied directly | None (no legacy implementation) |
| Recommended future domain document or batch | `04_DATABASE/` appointment schema; Scheduling batch |

### 6.8 Encounter

| Aspect | Value |
|---|---|
| Legacy fields | None (not implemented; the prototype conflates encounter with appointment status) |
| Likely canonical aggregate | `Encounter` aggregate (per M02 Encounter) |
| Sensitive-data classification | PHI |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned; clinician-authored |
| Lifecycle states | `open → documented → signed → amended → closed` |
| Missing fields | `encounterId`, `appointmentId`, `patientId`, `practitionerId`, `facilityId`, `openedAt`, `signedAt`, `signedBy`, `closedAt`, `chiefComplaint`, `history`, `examination`, `assessment`, `plan`, `followUpAt`, `addendumOf` (if amendment) |
| Fields that must not be copied directly | None (no legacy implementation) |
| Recommended future domain document or batch | `04_DATABASE/` encounter schema; Clinical Records batch; `03_DOMAIN/CLINICAL_WORKFLOWS.md` |

### 6.9 Payment

| Aspect | Value |
|---|---|
| Legacy fields | `paymentStatus` (on Patient), `amount` (on Patient), `paid` (on Doctor/Employee) |
| Likely canonical aggregate | `Payment` aggregate (per M09 Billing) |
| Sensitive-data classification | Financial |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned |
| Lifecycle states | `pending → captured → settled → refunded` |
| Missing fields | `paymentId`, `encounterId` (if applicable), `patientId`, `amount`, `currency`, `method` (cash/card/insurance/transfer), `reference`, `capturedAt`, `capturedBy`, `settledAt`, `refundReason`, `refundedAt`, `refundedBy` |
| Fields that must not be copied directly | `paid` (boolean on practitioner — must be a `PayrollPayment`, not a boolean); `paymentStatus` (on patient — must be on `Encounter` or `Payment`) |
| Recommended future domain document or batch | `04_DATABASE/` payment schema; Finance batch |

### 6.10 Salary / PayrollPayment

| Aspect | Value |
|---|---|
| Legacy fields | `salary` (on Doctor/Employee), `paid` (on Doctor/Employee), `paymentCycle` (on Doctor) |
| Likely canonical aggregate | `PayrollPayment` aggregate (per M12 HR + M10 Accounting) |
| Sensitive-data classification | Financial; field-level permission required |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned; managed by R11/R09 |
| Lifecycle states | `calculated → approved → paid → cancelled` |
| Missing fields | `payrollPaymentId`, `practitionerId` or `employeeId`, `periodStart`, `periodEnd`, `baseAmount`, `incentiveAmount`, `totalAmount`, `currency`, `method`, `reference`, `calculatedAt`, `calculatedBy`, `approvedAt`, `approvedBy`, `paidAt`, `paidBy`, `payslipUrl`, `cancelledReason`, `cancelledAt` |
| Fields that must not be copied directly | `salary` (must be on `PayrollConfiguration`, not on practitioner); `paid` (must be a `PayrollPayment`, not a boolean); `paymentCycle` (must be on `PayrollConfiguration`) |
| Recommended future domain document or batch | `04_DATABASE/` payroll schema; HR + Finance batch |

### 6.11 Incentive

| Aspect | Value |
|---|---|
| Legacy fields | `hasIncentive`, `incentiveRate`, `patientsCount` (on Doctor) |
| Likely canonical aggregate | `PayrollConfiguration` (incentive components) + `IncentiveEvent` (per-completed-encounter incentive record) |
| Sensitive-data classification | Financial |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned; managed by R11/R09 |
| Lifecycle states | `accruing → settled` (per period) |
| Missing fields | `payrollConfigurationId`, `practitionerId`, `incentiveType` (per-encounter/per-target/percentage), `rate`, `effectiveFrom`, `effectiveTo`, `periodStart`, `periodEnd`, `encounterCount`, `accruedAmount`, `settledAt` |
| Fields that must not be copied directly | `patientsCount` (must be computed per period from completed encounters, not stored); `incentiveRate` (must be on `PayrollConfiguration` with effective dates, not on practitioner) |
| Recommended future domain document or batch | `04_DATABASE/` payroll schema; HR + Finance batch |

### 6.12 InventoryItem

| Aspect | Value |
|---|---|
| Legacy fields | None (placeholder only) |
| Likely canonical aggregate | `InventoryItem` aggregate (per ADR-010 — inventory is a bounded context, deferred to future) |
| Sensitive-data classification | Operational; controlled substances are regulated |
| Tenant scope | Tenant + facility scope |
| Ownership | Tenant-owned; managed by R09/R11 |
| Lifecycle states | `active → depleted → archived` |
| Missing fields | `itemId`, `facilityId`, `name`, `category`, `unit`, `reorderPoint`, `currentQuantity`, `lotNumber`, `expiryDate`, `controlledSubstanceSchedule` (if applicable), `costPerUnit`, `supplier`, `createdAt`, `createdBy` |
| Fields that must not be copied directly | None (no legacy implementation) |
| Recommended future domain document or batch | `04_DATABASE/` inventory schema; Inventory batch (post-MVP per ADR-010) |

### 6.13 Notification

| Aspect | Value |
|---|---|
| Legacy fields | Notifications are not modeled in the prototypes; `clinic-laser.js` has a notification panel but no entity |
| Likely canonical aggregate | `Notification` aggregate (per M08 Notifications) |
| Sensitive-data classification | May contain PHI depending on content |
| Tenant scope | User scope |
| Ownership | User-owned |
| Lifecycle states | `unread → read → archived` |
| Missing fields | `notificationId`, `userId`, `type`, `title`, `body`, `link`, `readAt`, `archivedAt`, `createdAt`, `createdBy` (system or user) |
| Fields that must not be copied directly | None (no legacy implementation) |
| Recommended future domain document or batch | `04_DATABASE/` notification schema; Enterprise Shell batch |

### 6.14 AuditActivity

| Aspect | Value |
|---|---|
| Legacy fields | `time` (HH:MM:SS), `text` (free text) |
| Likely canonical aggregate | `AuditEvent` (per ADR-014; already implemented in Batch 9) |
| Sensitive-data classification | Audit data is sensitive; integrity is critical |
| Tenant scope | Per-tenant chain (scope `tenant:<tenantId>`) or platform chain (`scope platform`) per ADR-014 |
| Ownership | Platform-owned; immutable |
| Lifecycle states | Append-only; no transitions |
| Missing fields | All ratified fields per ADR-014 §1.3: `eventId`, `chainScope`, `chainSequence`, `integrityKeyVersion`, `integrityHash`, `previousIntegrityHash`, `canonicalPayloadHash`, `actorType`, `actorId`, `tenantId`, `facilityId`, `actionCode`, `outcome`, `source`, `occurredAt`, `receivedAt`, `requestId`, `correlationId`, `metadata` (validated) |
| Fields that must not be copied directly | `time` and `text` are entirely inadequate; the legacy pattern is rejected; the canonical audit event has the full ratified field set with HMAC-SHA-256 chained integrity, immutability triggers, and per-tenant chains |
| Recommended future domain document or batch | Already implemented in Batch 9; `09_SECURITY/AUDIT.md` and ADR-014 are authoritative |

### 6.15 ClinicTypeConfiguration

| Aspect | Value |
|---|---|
| Legacy fields | `type` (enum: GENERAL/DERMA_LASER/DENTAL/PEDIATRICS/INTERNAL/LAB), `category` (free text) |
| Likely canonical aggregate | `ClinicTypeOverlay` configuration artefact (per ADR-001 + `02_PRODUCT/CLINIC_TYPES.md`) |
| Sensitive-data classification | Operational |
| Tenant scope | Platform scope (catalogue); tenant scope (per-tenant overlay) |
| Ownership | Platform-owned catalogue; tenant-owned overlay |
| Lifecycle states | `draft → published → deprecated` |
| Missing fields | `clinicTypeId` (FK to C-catalogue), `sidebarNav` (configuration of nav items), `kpiWidgets` (configuration of dashboard widgets), `enabledModules` (subset of M01–M19), `specialtyExtensions` (e.g., odontogram, growth curves, dose calculator, barcode tracking), `terminologyOverrides` (specialty-specific Arabic and English strings) |
| Fields that must not be copied directly | The legacy 6-type enum (GENERAL/DERMA_LASER/DENTAL/PEDIATRICS/INTERNAL/LAB) must be replaced by the canonical C-catalogue (C01–C30+); `category` free text must be replaced by `clinicTypeFamily` enum |
| Recommended future domain document or batch | `04_DATABASE/` configuration schema; Enterprise Shell batch (overlay rendering) |

---

## 7. Clinic-Type Extraction

This section analyses the five clinic types present in the legacy prototypes (Dental, Pediatrics, Internal Medicine, Laboratory, Dermatology and Laser) and separates each into common platform features, specialty-specific features, specialty-specific terminology, specialty-specific clinical data, specialty-specific dashboard widgets, configuration candidates, and features requiring separate clinical-domain review. The final recommendation affirms one shared application shell, one shared design system, configuration-driven specialty extensions, and no separate unrelated product per clinic type — consistent with ADR-001 (Configuration-Driven Architecture), ADR-005 (thin client over platform contracts), and `02_PRODUCT/CLINIC_TYPES.md` §5 (Configuration Overlay Approach).

### 7.1 Common platform features (shared across all clinic types)

Every clinic type, regardless of specialty, shares these platform features. These are not specialty-specific and must be implemented once in the platform shell, not duplicated per clinic type.

- **Authentication and session**: login, logout, session rotation, MFA for R13/R14, CSRF protection. Already implemented in Batch 5 and Batch 7.
- **Tenant membership context**: viewing, selecting, and clearing tenant context. Already implemented in Batch 6.
- **Authorization**: canonical R01–R14 roles, permissions, and the authorization guard. Already implemented in Batch 8.
- **Audit**: HMAC-SHA-256 chained integrity, transactional outbox, immutable audit store. Already implemented in Batch 9.
- **Enterprise application shell**: sidebar, top bar, facility switcher, command search, notifications, user menu, breadcrumb, page header, filter bar, table region, contextual drawer, modal rules, status and permission states. To be implemented in the immediate next batch.
- **Bilingual Arabic-first and English-capable experience**: full RTL/LTR mirroring, mixed Arabic and Latin medical terminology, Arabic and Latin numeral handling, bilingual role and status names, locale-aware date/time/phone/currency formatting. To be implemented in the immediate next batch.
- **Patient directory and profile**: patient list, search, profile 360 view, encounter timeline. Future batch.
- **Scheduling and appointments**: appointment board, status state machine, resource scheduling, waiting-room view. Future batch.
- **Billing and payments**: payment collection, receipt, ledger posting. Future batch.
- **HR and payroll**: practitioner and employee directories, payroll configuration, payroll payment. Future batch.
- **Inventory**: consumables tracking, low-stock alerts (per ADR-010, deferred). Future batch.
- **Notifications**: in-app feed, channel abstraction. Future batch.
- **Reports**: operational and financial reporting with permission-gated export. Future batch.
- **Settings**: clinic configuration with versioning and audit. Future batch.
- **Accessibility**: WCAG 2.2 AA, keyboard navigation, visible focus, sufficient contrast, screen-reader labels, status not communicated through colour alone, reduced-motion support, touch-friendly targets. To be implemented in the immediate next batch.

### 7.2 Dental

| Aspect | Value |
|---|---|
| Specialty-specific features | Tooth-and-jaw interactive chart (odontogram); orthodontic installment scheduling; chair-as-resource scheduling; composite consumables inventory; dental-specific financial reports (orthodontic installment tracking) |
| Specialty-specific terminology | كرسي (chair), جلسة (session), تقويم (orthodontics), زرع (implant), كومبوزيت (composite), سلك (wire), شد وتعديل (tighten and adjust — orthodontic adjustment), الفك (jaw), السن (tooth) |
| Specialty-specific clinical data | Odontogram state (per-tooth surface markings: buccal/lingual/mesial/distal/occlusal/root); treatment plan per tooth; orthodontic adjustment history; implant placement record |
| Specialty-specific dashboard widgets | Chair utilization (occupied/idle/out-of-service); orthodontic installment due-this-week; composite inventory low-stock alert; daily chair-session count |
| Configuration candidates | `dental.chair.count` (default chair count); `dental.odontogram.surfaces` (surface enumeration); `dental.orthodontics.installmentPeriod` (default installment period); `dental.inventory.compositeCatalogue` (composite material catalogue) |
| Features requiring separate clinical-domain review | Odontogram data model requires dental informatics review (per `06_CLINIC_TYPES/DENTAL.md`, dental is a future candidate clinic type in the canonical catalogue — C-typed as future); orthodontic installment scheduling intersects M09 Billing and requires dental financial review; implant placement record may require regulatory tracking |

### 7.3 Pediatrics

| Aspect | Value |
|---|---|
| Specialty-specific features | Clinical growth curves (height/weight/head circumference vs age, percentiled against WHO or local references); weight-based dose calculator; child-specific appointment scheduling (with guardian consent); immunization schedule tracking |
| Specialty-specific terminology | طفل (child), عمر الطفل (child age), الوزن (weight), منحنيات النمو (growth curves), حاسبة الجرعات (dose calculator), شراب (syrup), كشف (examination), الروشتة (prescription), التلقيح (immunization) |
| Specialty-specific clinical data | Growth measurements (height, weight, head circumference) with percentile; immunization records (vaccine, dose, date, lot); weight-based dose calculations; guardian identity and consent; developmental milestone observations |
| Specialty-specific dashboard widgets | Growth-curve mini-chart in patient header; immunization-due-this-month; weight-based dose calculator launcher; pediatric appointment count |
| Configuration candidates | `pediatrics.growth.reference` (WHO vs local); `pediatrics.growth.percentiles` (3rd/15th/50th/85th/97th); `pediatrics.immunization.schedule` (regional schedule); `pediatrics.dosing.database` (drug database with weight-based rules); `pediatrics.consent.guardianRequired` (always true) |
| Features requiring separate clinical-domain review | Growth-reference data source (WHO vs regional) requires pediatric informatics review; weight-based dose calculator is a critical safety feature and requires pharmacy + pediatrics + safety review; immunization schedule must align with regional regulatory framework; minor consent model requires legal review |

### 7.4 Internal Medicine

| Aspect | Value |
|---|---|
| Specialty-specific features | Chronic-disease registry (filter patients by chronic condition: hypertension, diabetes, etc.); chronic-indicators monitoring (longitudinal blood pressure, blood glucose, HbA1c); external labs and ultrasound attachment; clinical-history timeline |
| Specialty-specific terminology | مراجع مزمن (chronic patient), متابعة (follow-up), ضغط شرياني (hypertension), سكري مزمن (chronic diabetes), السيرة السريرية (clinical history), التحاليل الخارجية (external labs), السونار (ultrasound), الاستشاري (consultant) |
| Specialty-specific clinical data | Chronic-condition tags; longitudinal measurements (BP, glucose, HbA1c, lipids) with timestamps; medication history; external lab results with source attribution; ultrasound report attachments; referral records |
| Specialty-specific dashboard widgets | Chronic-disease registry count (by condition); today's chronic follow-ups; pending external-lab results; medication-adherence indicator |
| Configuration candidates | `internal.chronic.conditions` (catalogue of tracked conditions); `internal.monitoring.indicators` (which measurements to track per condition); `internal.externalLab.connectors` (list of external lab connectors); `internal.referral.template` (referral note template) |
| Features requiring separate clinical-domain review | Chronic-disease registry data model requires internal-medicine informatics review; external-lab connector requires integration architecture review (per M17 Integration); longitudinal measurement visualization requires clinical-decision-support review |

### 7.5 Laboratory

| Aspect | Value |
|---|---|
| Specialty-specific features | Barcode-driven sample tracking; pending-test queue; result-entry workflow with reference ranges; critical-result alerting; quality-control documentation; results archive |
| Specialty-specific terminology | عينة (sample), باركود (barcode), فحص (test), تحليل (analysis), قيد المعالجة (in processing), النتائج المرجعية (reference results), نتيجة حرجة (critical result), مسحة (swab), محلول (solution) |
| Specialty-specific clinical data | Sample record (barcode, patient, test ordered, drawn-at, received-at, status); result record (value, unit, reference range, flag, verified-by, verified-at); critical-result acknowledgment; quality-control record |
| Specialty-specific dashboard widgets | Samples drawn today; results in preparation; reports ready for delivery; daily revenue |
| Configuration candidates | `lab.barcode.format` (barcode format); `lab.test.catalogue` (test catalogue with reference ranges); `lab.critical.thresholds` (critical-result thresholds per test); `lab.qualityControl.cadence` (QC run cadence); `lab.instrument.connectors` (analyser connectors) |
| Features requiring separate clinical-domain review | Critical-result alerting requires clinical-safety review (per `06_CLINIC_TYPES/LABORATORY.md`, laboratory is C24 in canonical and is high-complexity, high-regulated); quality-control documentation requires regulatory review; analyser connectors require integration architecture review |

### 7.6 Dermatology and Laser

| Aspect | Value |
|---|---|
| Specialty-specific features | The legacy `clinic-admin-laser.html` + `clinic-laser.js` is the most complete clinic-tier shell and is the basis for the canonical enterprise shell. Specialty-specific features beyond the shell include: treatment-session tracking (laser session count, energy settings); before-and-after photo management; laser machine utilisation; cosmetic inventory (laser gels, anesthetic creams); treatment-package pricing |
| Specialty-specific terminology | جلسة ليزر (laser session), التقويم بالليزر (laser calibration), كولاجين (collagen), تجميل (cosmetic), ليزر كربوني (carbon laser), جلسات الليزر (laser sessions), العيادة الجلدية (dermatology clinic) |
| Specialty-specific clinical data | Treatment-session record (session number, area treated, energy, pulse, machine, operator); before-and-after photos (with consent); treatment-package record (sessions included, price, sessions consumed); skin-type assessment (Fitzpatrick scale) |
| Specialty-specific dashboard widgets | Laser machine utilisation; today's treatment sessions; treatment-package progress; cosmetic inventory low-stock |
| Configuration candidates | `derma.laser.machines` (machine catalogue); `derma.treatment.packages` (treatment package definitions); `derma.skinType.scale` (Fitzpatrick); `derma.photo.consent` (photo consent template) |
| Features requiring separate clinical-domain review | Before-and-after photo management requires PHI and consent review; laser machine utilisation requires equipment integration review; treatment-package pricing intersects M09 Billing and requires financial review |

### 7.7 Final recommendation: one shell, one design system, configuration-driven extensions

The five clinic types must share:

1. **One shared application shell** — sidebar, top bar, facility switcher, command search, notifications, user menu, breadcrumb, page header, filter bar, table region, drawer, modal rules. No per-clinic-type shell. The shell is implemented once and configured per tenant.
2. **One shared design system** — design tokens, typography scale, spacing scale, color palette (with one restrained specialty accent per clinic type), component library. No per-clinic-type design system. The accent color and specialty icon are configuration; the component vocabulary is shared.
3. **Configuration-driven specialty extensions** — each clinic type contributes a configuration overlay (per `02_PRODUCT/CLINIC_TYPES.md` §5) that adds specialty-specific sidebar items, dashboard widgets, encounter templates, order sets, and terminology overrides. The overlay is server-validated and applied at runtime; the client renders the overlay, it does not encode the specialty.
4. **No separate unrelated product per clinic type** — the legacy pattern of separate HTML files per clinic type (`clinic-dental.html`, `clinic-pediatrics.html`, etc.) is rejected. Each clinic type is a configuration of the same product, not a separate product.

This recommendation is consistent with ADR-001 (Configuration-Driven Architecture), ADR-005 (thin client over platform contracts), ADR-002 (Modular Architecture — specialty extensions are bounded-context overlays, not separate applications), and `02_PRODUCT/CLINIC_TYPES.md` §5 (Configuration Overlay Approach).

---

## 8. Security Rejection List

This section explicitly documents every unsafe legacy pattern and identifies the canonical replacement that is already present (per the ratified implementation) or required (per the ADRs and security documents). No pattern listed here may be ported to the canonical implementation under any circumstance.

| # | Unsafe legacy pattern | Legacy source | Risk | Canonical replacement |
|---|---|---|---|---|
| 1 | Hardcoded credentials in client source | `login.js` (`superadmin/admin123`, `manager_kzo/kzo123`, `doctor_pedia/pedia123`, `doctor_internal/internal123`, `doctor_dental/dental123`, `doctor_lab/lab123`) | Total authentication bypass; anyone reading the source gains Super Admin | Already replaced: `password.service.ts` uses Argon2 hashing; credentials are never stored in client code. The login screen must not expose demo accounts in production. Demo accounts, if any, are seeded only in development databases and are clearly marked. |
| 2 | Browser-only login (client-side credential check) | `login.js` `handleLogin` | Authentication is a fiction; the server has no idea who is calling | Already replaced: `auth.controller.ts` + `auth.service.ts` verify credentials server-side; the client only submits the form. |
| 3 | LocalStorage-based authorization (`clinicType`) | `login.js` `handleLogin`, `app.js` `loginToClinic`, `clinic-laser.js` `clinicType = getStorage('clinicType', 'DERMA_LASER')` | Any user can edit localStorage and assume any role or tenant | Already replaced: authorization is enforced server-side via `AuthorizationGuard` (Batch 8); the client never authorizes. |
| 4 | LocalStorage-based PHI (patients, encounters, payments) | `clinic-laser.js` `patientsData = getStorage('patientsData', ...)` | PHI stored in browser; no encryption; no audit; no retention control | Required: PHI lives only in the PostgreSQL transactional store (per ADR-006) with row-level tenant scoping; the client never persists PHI to localStorage; the local-first store (per ADR-003) is governed and encrypted. |
| 5 | LocalStorage-based payroll and finance | `clinic-laser.js` `doctorsData`, `employeesData` with `salary`, `paid` fields; `clinic-laser.js` `clinicData` with `todayRevenue`, `weeklyRevenue` | Financial data in browser; tamperable; no audit | Required: payroll and finance live in the PostgreSQL transactional store; field-level permission gates salary visibility; every financial mutation emits an audit event and a ledger entry. |
| 6 | Client-controlled clinic type as Tenant isolation | `app.js` `localStorage.setItem('clinicType', JSON.stringify(finalType))` | Tenant isolation is a client-enforced fiction | Already replaced: tenant context is enforced server-side via `session-context` module (Batch 6); the client receives the tenant context from the server, it does not assert it. |
| 7 | Missing Tenant enforcement | All prototype files | Any browser can impersonate any tenant by editing localStorage | Already replaced: `AuthorizationGuard` enforces tenant scope on every request (Batch 8); the audit chain is per-tenant (Batch 9). |
| 8 | Missing server validation | All prototype files | Server (which doesn't exist in the prototype) trusts whatever the client sends | Required: every API route validates input against a Zod schema (already pattern-established in `auth.schemas.ts`); the domain layer enforces invariants. |
| 9 | Raw `innerHTML` rendering | `app.js` (10+ assignments), `clinic-laser.js` (40+ assignments) | XSS — any patient name or ticket body containing `<script>` executes | Required: React (already in use in `apps/web`) escapes by default; the canonical client must never use `dangerouslySetInnerHTML` with untrusted input. |
| 10 | Unescaped user content in tables and modals | `app.js` `renderClinicsTable`, `renderTicketsTable`; `clinic-laser.js` `showPatients`, `showDoctors`, etc. | XSS via patient name, ticket body, doctor name | Already mitigated in canonical by React's default escaping; the rule must be enforced by linting. |
| 11 | Missing CSRF protection | All prototype forms | Cross-site request forgery on any state-changing action | Already replaced: `csrf.service.ts` issues and validates CSRF tokens (Batch 5); Origin header is checked on every state-changing request. |
| 12 | Missing sessions (no server, no session token) | All prototype files | Every "session" is a localStorage fiction | Already replaced: `session-token.service.ts` issues signed session tokens (Batch 5); sessions are httpOnly, Secure, SameSite=Lax cookies; rotation is implemented. |
| 13 | Missing RBAC | All prototype files | Any logged-in user (anyone with the localStorage clinicType) can do anything | Already replaced: canonical R01–R14 roles and the `AuthorizationGuard` (Batch 8); every API route declares its required permission. |
| 14 | Mutable fake audit logs | `app.js` `auditLogs.push(...)`, `localStorage.setItem('super_logs', ...)` | Audit data is tamperable; no integrity; no chain; no immutability; no per-tenant scope; no PHI redaction | Already replaced: dedicated PostgreSQL audit database with HMAC-SHA-256 chained integrity, immutability triggers, per-tenant chains, and PHI redaction (Batch 9, ADR-014). The legacy `auditLogs` array is rejected entirely. |
| 15 | Insecure direct redirects (`window.location.href = ...` based on client state) | `login.js` `handleLogin`, `app.js` `loginToClinic` | Open-redirect risk; routing controlled by client state | Already replaced: the canonical client routes based on server-provided context (tenant membership, roles); the server decides the post-login destination. |
| 16 | Broken or inconsistent file paths | `app.js` `loginToClinic` redirects to `clinic-admin.html` but only `clinic-admin-laser.html` exists; legacy `index.html` references `app.js` correctly | 404s; user confusion | Required: the canonical route catalogue is defined in `apps/web/src/app/` and is type-checked; broken links fail at build time. |
| 17 | Externally loaded CDN dependencies | All prototype HTML files load `cdn.tailwindcss.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, and Material Symbols at runtime | Offline-first violation (per ADR-003); privacy violation (page makes requests to third-party domains); supply-chain risk (CDN compromise = page compromise) | Required: Tailwind is bundled at build time (already the case in canonical); fonts are self-hosted or system fonts; no runtime CDN dependencies in production. |
| 18 | Lack of accessibility enforcement | All prototype files use `<table>` without `caption`, `aria-label`, or `role`; color is the sole indicator of status (e.g., `bg-emerald-100 text-emerald-700` for active); no `:focus-visible` styling; no reduced-motion support | WCAG 2.2 AA violation; the platform is unusable by users with disabilities and out of compliance with `05_UI_UX/ACCESSIBILITY.md` | Required: WCAG 2.2 AA is the target per ADR-005; status is communicated through text and icon, not color alone; keyboard navigation is enforced; reduced-motion is respected. The Enterprise Shell batch must enforce this. |
| 19 | WhatsApp deep links embedding PII in URL | `app.js` `whatsappLink = https://wa.me/${clinic.phone}?text=...` with manager name and phone in URL | PII leakage in URL (URLs are logged by browsers, proxies, ISPs); phone numbers are PII | Required: out-of-band contact uses a server-side notification dispatch (per M08 Notifications) with template variables; the URL never contains PII; the manager's phone is never in the URL. |
| 20 | Inline `onclick` handlers | `index.html` (5+), `clinic-admin-laser.html` (10+), generated HTML in `app.js` and `clinic-laser.js` (many) | CSP violation; XSS surface; hard to audit | Required: React event handlers (already the canonical pattern); Content Security Policy forbids inline handlers. |
| 21 | `<base target="_blank">` opening every link in a new tab | `clinic-admin-laser.html` line 53 | UX confusion; security (new tabs don't carry referrer policy by default); accessibility | Required: links open in the same tab by default; explicit `target="_blank"` only with `rel="noopener noreferrer"` where the new tab is intentional. |
| 22 | `alert()` for placeholder actions | `clinic-dental.html`, `clinic-pediatrics.html`, `clinic-internal.html`, `clinic-lab.html` | Not a security risk per se, but indicates the screens have no real implementation | Required: real implementations in future batches; no `alert()` in production. |
| 23 | No MFA for privileged roles | `login.js` | R13/R14 accounts are protected only by a single password | Required: MFA for R13 and R14 per ADR-013; TOTP or WebAuthn; MFA challenge before session promotion to authenticated state. |
| 24 | No account-existence protection | `login.js` `handleLogin` returns "username or password incorrect" but the demo-account buttons reveal which accounts exist | Account enumeration | Already mitigated: the canonical login response is identical whether the account exists; failed-login audit records HMAC-hash the identifier (Batch 9). The login screen must not list accounts. |
| 25 | No rate limiting on login | `login.js` | Brute-force attacks | Already replaced: `audited-throttler.guard.ts` (Batch 5/9) applies rate-limiting and emits `authentication.login.throttled` when safely interceptable. |
| 26 | No secure cookie attributes | `login.js` (no cookies at all) | Session fixation; XSS session theft | Already replaced: httpOnly, Secure, SameSite=Lax cookies (Batch 5). |
| 27 | No session rotation on privilege change | All prototype files | Session fixation; privilege escalation persistence | Already replaced: `session-token.service.ts` rotates the session on context selection (Batch 6); `authentication.session.rotated` is audited (Batch 9). |
| 28 | No logout audit | All prototype files | Logout is invisible; no trail of session end | Already replaced: `authentication.logout.succeeded` is audited (Batch 9). |
| 29 | No server-side immutable retention enforcement | All prototype files | Data can be deleted at will; no regulatory compliance | Required: data retention per `09_SECURITY/COMPLIANCE/DATA_RETENTION.md`; deletion is soft-delete only; the retention clock starts on termination; legal hold is a future ADR. |
| 30 | No PHI redaction in logs | `app.js` `logAction` records free text that may contain PHI | PHI leakage in logs | Already replaced: the audit primitive redacts PHI (Batch 9); forbidden-key detection prevents secrets in metadata; PHI is never in the audit payload. |

---

## 9. Reuse Matrix

This matrix is conservative. An item marked "Reuse as Code" may be ported (with adaptation) into the canonical implementation. An item marked "Reuse as Design" may inform the design but not the code. An item marked "Reuse as Requirement" captures a product requirement that the canonical implementation must satisfy, but neither the code nor the design is ported. An item marked "Reject" must not be ported in any form.

| Legacy Item | Reuse as Code | Reuse as Design | Reuse as Requirement | Reject | Reason |
|---|---|---|---|---|---|
| Login card composition | | ✓ | | | Layout is clean; rebuild with canonical auth |
| Hardcoded credentials (`login.js`) | | | | ✓ | Total authentication bypass |
| Browser-only login | | | | ✓ | Server must authenticate |
| Demo-account quick-fill buttons | | | | ✓ | Exposes credentials; reveals accounts |
| LocalStorage `clinicType` tenancy | | | | ✓ | Tenancy is server-enforced |
| LocalStorage state arrays (clinics, tickets, logs, doctors, employees, patients, clinicData) | | | | ✓ | Server is source of truth |
| Top KPI strip composition (5 cards: revenue, forecast, bookings, new patients, staff) | | ✓ | | | Inform canonical Super Admin overview layout |
| Tenant directory with category tabs | | ✓ | | | Inform canonical tenant directory layout |
| Status badge pills (active/grace/suspended) | | ✓ | | | Inform canonical status-chip component |
| Custom confirm modal pattern | | ✓ | | | Inform canonical destructive-confirmation pattern |
| Plan enum (monthly/quarterly/semi-annual/annual) | | | ✓ | | Catalogue requirement |
| Plan-to-days mapping (30/90/180/365) | | | ✓ | | Configuration requirement |
| Plan-to-revenue mapping (120k/350k/650k/1.2M IQD) | | | ✓ | | Pricing catalogue (server-side, restricted) |
| Once-per-year extension policy | | | ✓ | | Subscription policy requirement |
| Support ticket queue shape | | ✓ | | | Inform canonical support-ticket layout |
| WhatsApp deep-link reminders with PII in URL | | | | ✓ | PII leakage in URL |
| `auditLogs.push(...)` mutable audit | | | | ✓ | Replaced by HMAC-chained immutable audit |
| `innerHTML` rendering | | | | ✓ | XSS risk; React escapes by default |
| Inline `onclick` handlers | | | | ✓ | CSP violation |
| External CDN dependencies | | | | ✓ | Offline-first violation; supply-chain risk |
| Enterprise application shell (sidebar + header + content + modals + notifications) | | ✓ | | | Inform canonical enterprise shell |
| Bilingual AR/EN translation dictionary pattern | | ✓ | | | Inform canonical i18n key structure |
| Dark-mode toggle | | ✓ | | | Inform canonical user-preference pattern |
| Notification panel + drawer | | ✓ | | | Inform canonical notification pattern |
| Promise-based confirm modal | | ✓ | | | Inform canonical confirmation pattern |
| Status color map (`statusColors` object) | | ✓ | | | Inform canonical design tokens for status |
| Calendar status colors (`cal-paid`, `cal-pending`, etc.) | | ✓ | | | Inform canonical appointment-status tokens |
| Weekly revenue bar chart | | ✓ | | | Inform canonical chart component |
| Doctor payment formula (`salary + incentiveRate × patientsCount`) | | | ✓ | | Payroll calculation requirement |
| Payment cycle enum (daily/weekly/biweekly/monthly) | | | ✓ | | Payroll configuration requirement |
| Patient status state machine (`arrived → waiting → withDoctor → completed/cancelled/noShow`) | | | ✓ | | Encounter-flow requirement |
| `<base target="_blank">` | | | | ✓ | UX and security risk |
| `alert()` placeholder actions | | | | ✓ | Not a real implementation |
| Dental tooth-chart widget concept | | ✓ | | | Inform dental specialty extension |
| Dental orthodontic installment scheduling concept | | | ✓ | | Dental billing requirement |
| Dental chair-as-resource scheduling | | | ✓ | | Scheduling resource model |
| Pediatric growth-curve concept | | ✓ | | | Inform pediatrics specialty extension |
| Pediatric dose calculator concept | | | ✓ | | Critical safety feature requirement |
| Internal-medicine chronic-disease registry concept | | | ✓ | | Population-health requirement |
| Internal-medicine external-lab attachment concept | | | ✓ | | Integration requirement |
| Lab barcode sample tracking concept | | ✓ | | | Inform lab specialty extension |
| Lab result-entry with reference ranges | | | ✓ | | Lab workflow requirement |
| Lab critical-result alerting | | | ✓ | | Clinical-safety requirement |
| Dermatology/laser treatment-session tracking | | | ✓ | | Specialty workflow requirement |
| Dermatology/laser before-and-after photo management | | | ✓ | | Specialty PHI requirement |
| Clinic-type-driven sidebar (`applyClinicTypeLayout`) | | | ✓ | | Configuration-driven navigation requirement |
| Settings view (placeholder) | | ✓ | | | Inform canonical settings layout |
| User preference toggles (language, dark mode) | | | ✓ | | User-scoped preference requirement |

---

## 10. Recommended Product Backlog

This backlog is prioritized and divided into categories. Batch numbers beyond the immediate next recommended batch are labelled "provisional" and may be re-prioritized.

### 10.1 Foundation already implemented (Batches 1–9)

- ✅ Repository and monorepo structure (`apps/api`, `apps/web`, `packages/*`)
- ✅ PostgreSQL 17 + Prisma 7 transactional store
- ✅ Health contract between web and API
- ✅ Secure local authentication sessions (Argon2, httpOnly cookies, CSRF, Origin check)
- ✅ Membership-backed tenant context (session-context module)
- ✅ Canonical R01–R14 roles and AuthorizationGuard
- ✅ Audit primitive (dedicated audit DB, transactional outbox, HMAC-SHA-256 chains, immutability triggers, PHI redaction)
- ✅ Bilingual landing page and login (existing)
- ✅ Basic authenticated dashboard shell (existing `/dashboard`)

### 10.2 Product Shell (immediate next batch — recommended)

- Canonical authenticated application shell (`/app`): sidebar, top bar, facility switcher, command search, notifications, user menu, breadcrumb, page header
- Design tokens: color, typography, spacing, radius, elevation, motion
- Reusable UI components: button, field, select, combobox, date/time, card, KPI summary, table, tabs, filters, badges, status chips, avatars, timelines, activity feeds, drawers, modals, empty states, loading states, error states, permission-denied states, audit indicators, destructive confirmations, notifications, charts, clinic-type widgets
- Bilingual navigation (Arabic-first, full RTL)
- Organisation, facility, and context presentation
- Permission-aware navigation (routes hidden when permission denied)
- Loading, error, empty, and permission-denied states as first-class
- WCAG 2.2 AA compliance
- User preferences (language, theme, density)
- Notification drawer and feed

This batch does not implement patient or clinical business modules.

### 10.3 Platform Super Admin (post-shell, provisional Batch 11)

- Platform Super Admin Overview (`/admin`)
- Clinics and Organisations Directory (`/admin/tenants`)
- Tenant Detail and Subscription (`/admin/tenants/[tenantId]`)
- Subscription lifecycle (create, plan change, extend, suspend, reactivate, terminate)
- Support Ticket Queue (`/admin/support`)
- Impersonation (with MFA, time-limit, audit, banner)
- Audit Feed (`/admin/audit`) — deferred per ADR-014 until public audit query is ratified

### 10.4 Clinic Admin (post-shell, provisional Batch 12)

- Clinic Admin Overview (`/app/:facility`)
- Clinic settings (`/app/:facility/settings`) with versioned configuration
- User management within the facility

### 10.5 Patient and Encounter (provisional Batch 13)

- Patient directory (`/app/:facility/patients`)
- Patient profile 360 (`/app/:facility/patients/[patientId]`)
- Patient registration with consent capture and deduplication
- Encounter lifecycle (open, document, sign, amend, close)
- Clinical documentation (notes, templates, signatures)

### 10.6 Scheduling (provisional Batch 14)

- Daily Appointment Operations Board (`/app/:facility/scheduling`)
- Appointment state machine (pending → confirmed → arrived → waiting → withDoctor → completed | cancelled | noShow)
- Waiting-room view
- Resource scheduling (chair/room/doctor)
- Reminders and notifications

### 10.7 Finance (provisional Batch 15)

- Billing and payment collection (`/app/:facility/billing`)
- Finance overview (`/app/:facility/finance`)
- Receipts and invoices
- Refunds
- Doctor incentive and salary payment (`/app/:facility/payroll`)
- Employee salary payment
- Ledger and accounting integration

### 10.8 HR (provisional Batch 16)

- Doctor directory (`/app/:facility/doctors`)
- Employee directory (`/app/:facility/employees`)
- Practitioner and employee onboarding (invitation flow)
- Payroll configuration
- Department and specialty catalogues

### 10.9 Inventory (post-MVP per ADR-010, provisional Batch 17)

- Inventory item management (`/app/:facility/inventory`)
- Stock adjustments and transactions
- Low-stock alerts
- Lot and expiry tracking
- Controlled-substance tracking

### 10.10 Specialty Extensions (provisional, parallel after core modules)

- Dental: odontogram, orthodontic installment scheduling, chair-as-resource (after Scheduling + Clinical Records; gated on dental clinic-type catalogue ratification, currently a future candidate)
- Pediatrics: growth curves, dose calculator, immunization tracking (after Clinical Records + Pharmacy)
- Internal Medicine: chronic-disease registry, external-lab attachment (after Clinical Records + Integration)
- Laboratory: barcode sample tracking, result entry, critical-result alerting (after Clinical Records + Orders)
- Dermatology and Laser: treatment-session tracking, before-and-after photo management, treatment-package pricing (after Clinical Records + Billing)

### 10.11 Reporting (provisional Batch 18)

- Operational and financial reports
- Parameterised queries
- Permission-gated export
- Scheduled reports
- Drill-down

### 10.12 Later Enterprise capabilities (provisional, post-MVP)

- Public audit query surface (deferred per ADR-014)
- Legal hold workflow (deferred per ADR-014)
- Retention disposal (deferred per ADR-014)
- Compliance reports (deferred per ADR-014)
- SIEM integration (deferred per ADR-014)
- Patient portal
- Partner portal
- Mobile client
- Low-code admin surfaces (deferred per ADR-005 Alternative D)
- Key rotation workflow beyond key-version support (deferred per ADR-014)

---

## 11. Recommended Next Implementation Stage

Based on the analysis above, the recommended next implementation stage after this documentation work is:

### **Enterprise Application Shell and Design System Foundation**

This stage should implement:

- Canonical authenticated application shell (sidebar, top bar, facility switcher, command search, notifications, user menu, breadcrumb, page header, filter bar, table region, contextual drawer, modal rules, status and permission states)
- Design tokens (color, typography, spacing, radius, elevation, motion) consistent with `ENTERPRISE_DESIGN_BRIEF.md`
- Reusable UI components consistent with `ENTERPRISE_DESIGN_BRIEF.md` §Core components
- Bilingual navigation (Arabic-first, full RTL)
- Organisation, facility, and context presentation
- Permission-aware navigation (routes hidden when permission denied, components showing permission-denied state)
- Loading, error, empty, and permission-denied states as first-class
- User preferences (language, theme, density)
- Notification drawer and feed

This stage must **not** yet implement patient or clinical business modules. It must produce a runnable, accessible, bilingual shell that all subsequent batches build upon, and it must be the substrate against which the Google Stitch reference designs are validated.

---

