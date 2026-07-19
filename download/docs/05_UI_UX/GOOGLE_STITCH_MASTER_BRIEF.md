# Google Stitch Master Brief — Ibn Hayan Healthcare Operating System

> **Document type:** Ready-to-use Google Stitch design brief. Requests three differentiated visual directions for the same product and specifies the first set of eight reference screens to design. This brief is consumed by Google Stitch and by future human designers; it is not a request to generate the whole application at once.
>
> **Status:** Draft · **Version:** 1.0.0 · **Generated:** 2026-07-19
>
> **Authority precedence observed:** Product Bible → System Architecture → Ratified ADRs → Security and domain documents → UI/UX documents → Current implementation → Legacy prototypes. This brief is consistent with `ENTERPRISE_DESIGN_BRIEF.md` and `LEGACY_PROTOTYPE_EXTRACTION.md`; where the three conflict, this brief is the operational request and the other two are the authority.
>
> **Scope:** Three visual directions × eight reference screens × two locales (Arabic RTL and English LTR) × desktop-first with tablet adaptation.

---

## Table of Contents

1. Brief Overview
2. Three Visual Directions
3. First Design Set — Eight Reference Screens
4. Required States
5. Stitch Output Requirements
6. What Not to Generate
7. Deliverable Format

---

## 1. Brief Overview

### 1.1 Product

The **Ibn Hayan Healthcare Operating System** is a bilingual (Arabic-first, English-capable) healthcare clinic management platform for large Iraqi clinics, multi-branch clinic groups, and Gulf healthcare organisations. It is a premium enterprise software product (valued around USD 10,000+ per engagement) sold through enterprise sales, not a low-cost template. The product serves two distinct surfaces: a **platform Super Admin console** (for the platform operator, R14) and a **clinic workspace** (for tenant users, R01–R13). Both surfaces share one design system, one component vocabulary, one bilingual posture, and one accessibility standard.

### 1.2 What this brief asks for

This brief asks Google Stitch to produce **three clearly differentiated visual directions** for the same product, each demonstrating the same eight reference screens. The three directions must remain professional, calm, accessible, and clinically trustworthy; they differ in emphasis, not in quality. After the three directions are produced, the design team will select one (or a synthesis) as the canonical direction for the platform's Enterprise Application Shell batch.

This brief explicitly does **not** ask Stitch to generate the whole application at once. It asks for eight screens in three directions, plus a reusable component system, design tokens, and a generated `DESIGN.md`.

### 1.3 Authority

The product positioning, visual direction, bilingual requirements, application shell, component system, table behaviour, accessibility, and anti-patterns are defined in `ENTERPRISE_DESIGN_BRIEF.md`. That document is the authority; this document is the operational request to Stitch. Stitch's output must conform to `ENTERPRISE_DESIGN_BRIEF.md`.

---

## 2. Three Visual Directions

All three directions share the following non-negotiable properties:

- **Professional, calm, accessible, clinically trustworthy.** None of the three is flashy, futuristic, or AI-themed.
- **Arabic-first.** Each direction is designed in Arabic first, with an equal-quality English version.
- **Desktop-first.** Each direction is designed for a 1440px desktop canvas, with tablet (768px) adaptations.
- **WCAG 2.2 AA.** Each direction meets the contrast, keyboard, and screen-reader requirements.
- **One shared component vocabulary.** The three directions use the same component families (buttons, fields, tables, etc.); they differ in token values (colour, type, spacing), not in component structure.
- **No gold-and-black, no glassmorphism, no gradients, no medical clichés, no random colour per card.** The anti-patterns in `ENTERPRISE_DESIGN_BRIEF.md` §9 apply to all three directions.

The three directions differ as follows.

### 2.1 Direction A — Clinical Authority

**Concept.** The product looks like the operational system of a serious teaching hospital. The visual language draws on the discipline of clinical documentation: precise typography, generous whitespace, restrained colour, and a strong sense of institutional authority. The user is a senior physician or administrator who values accuracy over decoration.

**Emphasis.** Authority, precision, institutional seriousness.

**Colour.** Deep teal-blue primary (`#15435C` to `#2A6E91`), muted sage-green accent for positive states, cool grey neutrals. The primary is darker and more saturated than in the other directions; the surfaces are whiter. The overall feel is "clinical document".

**Typography.** IBM Plex Sans Arabic for Arabic, Inter for Latin. Slightly larger body text (15px base) for readability at distance. Headings are weight 700, body is weight 400, labels are weight 500. Numerals are tabular and prominent.

**Spacing.** Generous — comfortable density is the default. 24px section gaps, 16px card padding, 44px table row height. The whitespace communicates calm.

**Components.** Underline-style tabs, sharp-cornered badges (4px radius), restrained elevation. Tables have a strong header row with a bottom border. KPI cards have a single accent stripe on the start side.

**Mood reference.** The discipline of a Bloomberg Terminal crossed with the cleanliness of a modern electronic medical record (EMR) like Epic or Cerner, but more contemporary and more bilingual.

### 2.2 Direction B — Modern Operations

**Concept.** The product looks like the operations dashboard of a modern logistics or fintech platform, adapted for healthcare. The visual language is denser, more data-driven, and more interactive; it assumes a power user who wants to see and act on more information per screen. The user is a busy clinic administrator or operations manager who values throughput over calm.

**Emphasis.** Density, throughput, operational velocity.

**Colour.** Same deep teal-blue primary, but more prominent use of the primary-tint backgrounds (`color.primary.50`, `color.primary.100`) for active states and selections. The semantic colours are slightly more saturated. The overall feel is "operations console".

**Typography.** Same families. Slightly smaller body text (14px base) for density. Headings are weight 600, body is weight 400, labels are weight 600. Numerals are tabular and inline with labels.

**Spacing.** Compact — compact density is the default. 16px section gaps, 12px card padding, 36px table row height. The density communicates "we have a lot to show you, and you can handle it".

**Components.** Pill-style tabs (8px radius, active tab filled), 8px-radius badges, subtle elevation. Tables have a sticky header with a subtle shadow. KPI cards are smaller and more numerous (5–6 per row), each with a sparkline.

**Mood reference.** Linear's product dashboard, Vercel's dashboard, or Stripe's dashboard — but re-grounded in healthcare vocabulary and bilingual requirements.

### 2.3 Direction C — Gulf Enterprise

**Concept.** The product looks like the enterprise software of a Gulf-region healthcare group, with a subtle nod to regional institutional aesthetics. The visual language is slightly warmer, with a restrained use of a secondary accent and a typography scale that accommodates longer Arabic labels gracefully. The user is a Gulf healthcare executive who values institutional gravitas.

**Emphasis.** Institutional gravitas, regional appropriateness, bilingual elegance.

**Colour.** Same deep teal-blue primary, but with a slightly warmer cast (`#1B5A7A` leans fractionally toward green). A muted plum or burgundy secondary accent (used only for the specialty-accent slot, never for primary actions). The neutrals have a barely-perceptible warm cast. The overall feel is "Gulf institutional".

**Typography.** Same families. The Arabic typography is slightly more prominent: Arabic headings are weight 700 with tighter line height; Latin headings are weight 600. Numerals are tabular; Arabic-Indic numerals are used in the Arabic locale by default.

**Spacing.** Comfortable density, but with more generous horizontal padding (20px card padding instead of 16px) to accommodate longer Arabic labels. 24px section gaps. The whitespace communicates institutional patience.

**Components.** Underline-style tabs with a thicker (3px) indicator, 8px-radius badges with a subtle border, restrained elevation. Tables have a strong header row with both a fill and a bottom border. KPI cards have a larger numeric display (36px) and a clear label.

**Mood reference.** The institutional calm of a Gulf sovereign wealth fund's annual report, crossed with the operational density of a modern EMR — bilingual-first, gravitas-forward.

### 2.4 How the three directions will be evaluated

The design team will evaluate the three directions against:

1. **Adherence to `ENTERPRISE_DESIGN_BRIEF.md`.** Does the direction honour the product positioning, the visual direction, the bilingual requirements, the shell, the components, the tables, the accessibility, and the anti-patterns?
2. **Differentiation.** Are the three directions genuinely different in emphasis and feel, not just in colour?
3. **Operational density.** Does the direction support eight hours of daily use without fatigue?
4. **Bilingual fidelity.** Does the Arabic version feel native, not translated? Does the layout hold up with longer Arabic labels?
5. **Accessibility.** Does the direction meet WCAG 2.2 AA in both light and dark themes?
6. **Buildability.** Can the direction be implemented in Next.js 16 + Tailwind CSS 4 + shadcn/ui without heroics?

The selected direction (or synthesis) becomes the canonical direction for the Enterprise Application Shell batch.

---

## 3. First Design Set — Eight Reference Screens

This brief asks Stitch to design only these eight reference screens, in all three directions, in both Arabic RTL and English LTR, on desktop (1440px) with tablet (768px) adaptation.

### 3.1 Screen 1 — Login

| Property | Value |
|---|---|
| User | Unauthenticated |
| Purpose | Authenticate the user; establish the session |
| Layout | Centred card on a muted background; brand mark at top; form below; locale toggle in the corner |
| Key components | Brand mark (H square, primary), product name, locale toggle (AR/EN), username field, password field with show/hide, primary "Sign in" button, secondary "Forgot password" link, MFA challenge field (shown when applicable) |
| Primary action | Sign in |
| Secondary actions | Forgot password; switch locale |
| States | Default, populated, loading (spinner on button), error (inline message, no account-existence leak), throttled (inline message with retry countdown), MFA required |
| Responsive behaviour | Desktop: 480px card centred. Tablet: 480px card centred. Mobile: full-width card with 24px margin. |
| Arabic RTL version | Card is centred; labels are right-aligned; password show/hide icon is on the left; locale toggle shows "EN" (to switch to English). |
| English LTR version | Card is centred; labels are left-aligned; password show/hide icon is on the right; locale toggle shows "AR" (to switch to Arabic). |
| Privacy and permission considerations | No demo-account buttons (per security rejection). No "remember me" checkbox (sessions are managed by the platform). Error message is identical whether the account exists. Throttle state shows countdown but no identifier. |

### 3.2 Screen 2 — Platform Super Admin Overview

| Property | Value |
|---|---|
| User | R14 System Administrator |
| Purpose | Single-glance platform health; alert feed; quick actions |
| Layout | Page header with "Platform Overview" title and date-range selector; KPI strip (5 cards); two-column body with alert feed (start side) and quick actions (end side); sidebar with platform navigation |
| Key components | Page header, KPI strip (Total tenants, Active subscriptions, Grace-period tenants, Today's bookings across platform, New patients across platform — all PHI-redacted aggregations), alert feed (tenant suspensions, failed payments, support ticket escalations), quick-action buttons (Add tenant, Open support queue, View audit feed) |
| Primary action | Add tenant |
| Secondary actions | Open support queue; view audit feed; change date range |
| States | Populated (normal), empty (no tenants — first-run), loading (skeleton KPIs), error (aggregation failure), permission-denied (should not happen for R14, but defined for safety) |
| Responsive behaviour | Desktop: full layout. Tablet: KPIs wrap to 2x3; body becomes single column. |
| Arabic RTL version | Sidebar on right; KPI cards flow right-to-left; numbers in Arabic-Indic; "Add tenant" button on the left of the page header. |
| English LTR version | Sidebar on left; KPI cards flow left-to-right; numbers in Latin; "Add tenant" button on the right of the page header. |
| Privacy and permission considerations | All KPIs are aggregated and PHI-redacted. The alert feed shows tenant names but not patient data. The screen is gated by `platform.admin.read`. |

### 3.3 Screen 3 — Clinics and Organisations Directory

| Property | Value |
|---|---|
| User | R14 |
| Purpose | Find, filter, and act on any tenant from one screen |
| Layout | Page header with "Tenants" title and "Add tenant" primary action; filter bar (search, status filter, clinic-type filter, plan filter); table with sticky header; row actions |
| Key components | Page header, filter bar (search field, status chips, clinic-type chips, plan chips, sort selector, density toggle), table (Tenant name, Clinic type, Plan, Status, Expiry, Booking count, Row actions), row-action menu (Open detail, Impersonate, Edit plan, Suspend, Terminate) |
| Primary action | Add tenant |
| Secondary actions | Filter; sort; density toggle; export (permission-gated) |
| States | Populated, empty (no tenants), loading (skeleton rows), error (load failure), permission-denied (route hidden) |
| Responsive behaviour | Desktop: full table. Tablet: fewer columns (Tenant name, Status, Expiry, Row actions). Mobile: card list. |
| Arabic RTL version | First column on right; row actions on left; status chips in Arabic; expiry dates in Arabic numerals. |
| English LTR version | First column on left; row actions on right; status chips in English; expiry dates in Latin numerals. |
| Privacy and permission considerations | Manager names and phones are NOT shown in the directory (per security rejection of PII in lists). The directory is gated by `tenant.read`. Row actions are permission-gated per action. |

### 3.4 Screen 4 — Clinic or Tenant Detail and Subscription

| Property | Value |
|---|---|
| User | R14 |
| Purpose | Manage one tenant's profile, subscription, facilities, and audit timeline |
| Layout | Page header with tenant name and status chip; tabbed body (Profile, Subscription, Facilities, Audit, Support); each tab has its own content |
| Key components | Page header (tenant name, status chip, primary action menu), tabs, profile tab (legal name, tax ID, address, primary contact — name and email only, no phone), subscription tab (plan, period, status, payment history, extend-time action, change-plan action, suspend action, terminate action), facilities tab (list of facilities with name, address, clinic type), audit tab (timeline of tenant-scoped audit events), support tab (list of the tenant's support tickets) |
| Primary action | Edit plan (on Subscription tab) |
| Secondary actions | Extend time; suspend; reactivate; terminate; impersonate |
| States | Populated, loading (skeleton), error, permission-denied, suspended tenant (banner with explanation and "Reactivate" action), expired subscription (banner with explanation and "Renew" action) |
| Responsive behaviour | Desktop: full tabbed body. Tablet: tabs become a horizontal scroll. Mobile: tabs become a dropdown. |
| Arabic RTL version | Tabs flow right-to-left; status chip in Arabic; dates in Arabic numerals. |
| English LTR version | Tabs flow left-to-right; status chip in English; dates in Latin numerals. |
| Privacy and permission considerations | The audit tab is read-only and shows only tenant-scoped events. The subscription tab's payment history is gated by `subscription.read`. State-changing actions are gated per action. |

### 3.5 Screen 5 — Clinic Admin Overview

| Property | Value |
|---|---|
| User | R09 Administrator |
| Purpose | Single-glance clinic health; today's appointment board; alerts |
| Layout | Page header with facility name and date; KPI strip (4 cards); two-column body with today's appointment board (start side, wide) and alerts (end side, narrow); sidebar with clinic navigation |
| Key components | Page header, KPI strip (Today's revenue, Today's appointments, Today's new patients, Average wait time), appointment board (compact list of today's appointments with status chips), alerts (low-stock, expired subscription, pending support tickets), facility and organisation switcher in sidebar |
| Primary action | New appointment |
| Secondary actions | Open scheduling board; open support; view reports |
| States | Populated, empty (no appointments today), loading (skeleton), error, permission-denied, suspended tenant (banner), expired subscription (banner), no active facility (empty state with "Select facility") |
| Responsive behaviour | Desktop: full layout. Tablet: KPIs wrap to 2x2; body becomes single column. |
| Arabic RTL version | Sidebar on right; KPI cards flow right-to-left; appointment board reads right-to-left; "New appointment" on the left. |
| English LTR version | Sidebar on left; KPI cards flow left-to-right; appointment board reads left-to-right; "New appointment" on the right. |
| Privacy and permission considerations | KPIs are facility-scoped. Patient names on the appointment board are PHI; the board is gated by `scheduling.read`. The screen is facility-scoped via the session-context module. |

### 3.6 Screen 6 — Patient Directory

| Property | Value |
|---|---|
| User | R06, R07, R01, R09 |
| Purpose | Find, filter, and act on any patient within the facility |
| Layout | Page header with "Patients" title and "New patient" primary action; filter bar (search by name or MRN, status filter, insurance filter); table with sticky header; row actions |
| Key components | Page header, filter bar (search field with MRN hint, status chips, insurance chips, sort selector, density toggle, saved-views dropdown), table (MRN, Name, Sex/Age, Phone (last 4 only by default), Last encounter, Status, Row actions), row-action menu (Open profile, New appointment, New encounter, Print summary) |
| Primary action | New patient |
| Secondary actions | Filter; sort; saved views; export (permission-gated) |
| States | Populated, empty (no patients — first-run), loading (skeleton), error, permission-denied (route hidden) |
| Responsive behaviour | Desktop: full table. Tablet: fewer columns (MRN, Name, Status, Row actions). Mobile: card list. |
| Arabic RTL version | First column on right; row actions on left; MRN in Latin; name in Arabic; dates in Arabic numerals. |
| English LTR version | First column on left; row actions on right; MRN in Latin; name in English; dates in Latin numerals. |
| Privacy and permission considerations | Patient data is PHI. Phone numbers are partially masked by default (last 4 only); full phone requires `patient.read.phi`. The directory is facility-scoped. Every row open emits `patient.read`. Export is permission-gated and audited. |

### 3.7 Screen 7 — Patient Profile

| Property | Value |
|---|---|
| User | R01, R06, R07 |
| Purpose | Patient 360 view: demographics, encounter timeline, orders, results, notes |
| Layout | Page header with patient name, MRN, sex/age, and primary actions; two-column body with demographics and insurance (start side, narrow) and encounter timeline (end side, wide); tabs for Orders, Results, Notes, Billing |
| Key components | Page header (name, MRN, sex/age, status chip, primary action menu), demographics card (address, emergency contact, consent status), insurance card (plan, member ID, validity), encounter timeline (vertical, most-recent-first, each entry with date, type, practitioner, status), tabs (Orders, Results, Notes, Billing), audit indicator (small shield icon with "Profile view is audited" tooltip) |
| Primary action | New encounter |
| Secondary actions | New appointment; print summary; edit demographics (permission-gated) |
| States | Populated, loading (skeleton), error, permission-denied, suspended tenant (banner) |
| Responsive behaviour | Desktop: two-column. Tablet: single column, demographics and insurance collapse to a card. Mobile: single column, timeline becomes the primary view. |
| Arabic RTL version | Demographics on right; timeline on left; tabs flow right-to-left; dates in Arabic numerals. |
| English LTR version | Demographics on left; timeline on right; tabs flow left-to-right; dates in Latin numerals. |
| Privacy and permission considerations | Every field is PHI. Every field has a field-level permission. The audit indicator communicates that the profile view is audited (`patient.read` detail). Sensitive fields (HIV status, mental health, etc.) are hidden by default and require explicit `patient.read.sensitive`. |

### 3.8 Screen 8 — Daily Appointment Operations Board

| Property | Value |
|---|---|
| User | R06, R07, R01, R09 |
| Purpose | Daily appointment operations: check in, send to doctor, complete, cancel, no-show |
| Layout | Page header with facility name, date selector, and view selector (Board / Calendar / List); board with status columns (Pending, Arrived, Waiting, With Doctor, Completed, Cancelled/No-Show); patient cards in each column; resource lanes (chairs/rooms) toggle |
| Key components | Page header (date selector, view selector, "New appointment" primary action), board columns (each with a count and a coloured header), patient cards (name, MRN, time, practitioner, wait-time, payment status, row actions), resource-lane toggle, wait-time indicator (colour-coded but with text label) |
| Primary action | New appointment |
| Secondary actions | Switch view; switch date; toggle resource lanes; filter by practitioner |
| States | Populated, empty (no appointments today), loading (skeleton), error, permission-denied, suspended tenant (banner), expired subscription (banner), offline (board freezes with "Reconnecting" banner; local changes are queued) |
| Responsive behaviour | Desktop: full board (6 columns). Tablet: 3 columns visible, horizontal scroll for the rest. Mobile: single column with status selector. |
| Arabic RTL version | Columns flow right-to-left (Pending on right, Completed on left); patient cards read right-to-left; wait-time labels in Arabic. |
| English LTR version | Columns flow left-to-right (Pending on left, Completed on right); patient cards read left-to-right; wait-time labels in English. |
| Privacy and permission considerations | Patient cards are PHI. The board is facility-scoped. Every status transition emits `scheduling.update`. The board refreshes in near-real-time via WebSocket (or polling fallback). |

---

## 4. Required States

Each relevant screen must be designed with the following states, where applicable:

### 4.1 Populated

The normal state with realistic data. Patient names, MRNs, and other PHI must be **safe fictional examples** (see §5.7). The populated state is the primary design artefact.

### 4.2 Empty

The state when there is no data to show. Every empty state has: an illustration (optional, restrained), a title in the user's locale, a description in the user's locale, and a primary action. Empty states are first-class, not afterthoughts.

### 4.3 Loading

The state while data is being fetched. Initial loads use **skeletons** (grey placeholders matching the eventual content shape). Inline actions (e.g., save) use **spinners**. Loading states never block the entire screen.

### 4.4 Error

The state when data fetching failed. Error states have: an icon, a title, a description (in operational terms, not "Something went wrong"), and a retry action. Network errors distinguish between offline and server error.

### 4.5 Permission denied

The state when the user lacks permission. Permission-denied states have: a lock icon, a title, a description naming the required permission, and (if applicable) a link to request access.

### 4.6 Suspended tenant

The state when the tenant's subscription is suspended. A persistent banner at the top of the screen explains the suspension and offers the R09 a "Contact platform" action. The screen is otherwise read-only.

### 4.7 Expired subscription

The state when the tenant's subscription has expired but is in grace. A persistent banner at the top of the screen explains the grace period and the remaining days, and offers the R09 a "Renew now" action. The screen is fully functional.

### 4.8 No active facility

The state when the user has not selected a facility. The screen shows an empty state with a "Select facility" prompt and a link to the facility switcher.

### 4.9 Offline or API unavailable

Where relevant (e.g., the operations board, the patient directory), the state when the API is unavailable. The screen shows a "Reconnecting" banner and queues local changes for retry. The board freezes (no new data) but the user can continue to act on the data they have; the actions are queued and replayed when the connection returns. This state is per ADR-003 (Local-First Strategy).

---

## 5. Stitch Output Requirements

Stitch must produce the following outputs.

### 5.1 Three visual directions

Three complete sets of the eight reference screens, one set per direction (Clinical Authority, Modern Operations, Gulf Enterprise). Each set is in both Arabic RTL and English LTR. Each set includes desktop and tablet adaptations.

### 5.2 Desktop-first designs

The primary canvas is 1440px desktop. Every screen is designed at this width first. Tablet (768px) adaptations are produced as a secondary canvas. Mobile is not requested in this brief; mobile designs will be requested in a later brief for the read-only and quick-action scenarios.

### 5.3 Tablet adaptations

For each desktop design, a tablet adaptation is produced. The tablet adaptation shows: how the layout collapses, which columns are hidden in tables, how the sidebar collapses (to a 72px icon rail), and how modals become full-width.

### 5.4 Arabic RTL and English LTR examples

Every screen is produced in both Arabic RTL and English LTR. The two versions are true mirrors (per `ENTERPRISE_DESIGN_BRIEF.md` §3.3), not text-alignment-only translations. The Arabic version uses Arabic-Indic numerals by default; the English version uses Latin numerals.

### 5.5 Reusable component system

A reusable component system is produced, covering the component families in `ENTERPRISE_DESIGN_BRIEF.md` §5. The system is the same across the three directions (the component structure is shared); only the token values differ.

### 5.6 Design tokens

Design tokens are produced for each direction, covering: color (primary, accent, neutral, semantic, specialty), typography (family, size, line-height, weight), spacing (the 4px rhythm scale), radius, elevation, motion. Tokens are expressed as CSS custom properties (or equivalent) so they can be consumed by the implementation.

### 5.7 Typography scale

A typography scale is produced, with the tokens from `ENTERPRISE_DESIGN_BRIEF.md` §2.10. The scale is bilingual: Arabic and Latin samples are shown side-by-side at every scale step.

### 5.8 Spacing scale

The spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80) is documented with usage examples.

### 5.9 Semantic colours

The semantic colours (success, warning, danger, info) are documented with usage examples and contrast verification in both light and dark themes.

### 5.10 Table patterns

Table patterns are produced for: a populated table with bulk-action bar, an empty table, a loading table (skeleton), a table with column-visibility dropdown open, a table with row-action menu open, a responsive table (tablet), and a card-list (mobile, although mobile is not the primary canvas).

### 5.11 Form patterns

Form patterns are produced for: a simple form (login), a multi-step form (patient registration), a form with progressive disclosure (doctor add with optional compensation fields), a form with validation errors, and a form in a drawer.

### 5.12 Status patterns

Status patterns are produced for: status chips (all statuses from `ENTERPRISE_DESIGN_BRIEF.md` §5.12), alert banners (info, warning, danger, success), toast notifications, and the suspended-tenant / expired-subscription banners.

### 5.13 Navigation patterns

Navigation patterns are produced for: the sidebar (collapsed and expanded), the breadcrumb, the tabs, the pagination, and the command search.

### 5.14 Interaction notes

Interaction notes are produced for: hover states, focus states, active states, disabled states, drag-and-drop (where applicable), and the destructive-confirmation modal flow.

### 5.15 Accessibility notes

Accessibility notes are produced for: keyboard navigation flows, focus management for modals and drawers, screen-reader announcements for dynamic content, and the reduced-motion behaviour.

### 5.16 Generated DESIGN.md

A `DESIGN.md` is generated, summarising the three directions, the selected direction (or a note that selection is pending), the design tokens, the component system, and the accessibility posture. The `DESIGN.md` is the entry point for engineers implementing the Enterprise Application Shell batch.

---

## 6. What Not to Generate

Stitch must NOT generate the following.

### 6.1 No production-ready authentication or backend code

Stitch produces design artefacts (HTML/CSS for the visual directions, design tokens, component specifications), not production authentication or backend code. The platform's authentication, authorization, audit, and API are already implemented (Batches 5–9) and are the canonical authority.

### 6.2 No hardcoded patient data beyond safe fictional examples

Patient names, MRNs, phone numbers, and other PHI in the designs must be **safe fictional examples**. Examples: "مصطفى جبار صبحي" (Mustafa Jabbar Subhi), "MRN-2026-001234", "+964 770 000 0000". No real patient data. No real phone numbers. No real addresses.

### 6.3 No copying of LocalStorage patterns

The legacy prototypes' LocalStorage-based state, LocalStorage-based authorization, and LocalStorage-based PHI are rejected (per `LEGACY_PROTOTYPE_EXTRACTION.md` §8). Stitch must not reproduce these patterns in any form. The designs assume a server-authoritative architecture with a thin client (per ADR-005).

### 6.4 No standalone unrelated design for each clinic speciality

Each clinic speciality does not get its own standalone design. The eight reference screens are designed once per direction; the clinic-type variation is expressed only as the restrained specialty accent (per `ENTERPRISE_DESIGN_BRIEF.md` §2.5) and the specialty-specific sidebar items (per `LEGACY_PROTOTYPE_EXTRACTION.md` §7). Specialty-specific widgets (odontogram, growth curves, etc.) are not part of this brief; they will be requested in a later brief.

### 6.5 No marketing or public-facing surfaces

This brief covers authenticated product surfaces only. Marketing landing pages, public pricing pages, and other public surfaces are out of scope.

### 6.6 No anti-patterns

The anti-patterns in `ENTERPRISE_DESIGN_BRIEF.md` §9 (excessive gradients, glowing surfaces, oversized rounded cards, generic dashboard templates, random colour per card, giant hero sections, decorative charts without decisions, excessive whitespace, tiny table text, icon-only actions without labels or tooltips, unrelated visual identity per clinic type, gold-and-black "luxury" styling, glassmorphism, medical clichés used as decoration, visual density that hides operational information) are prohibited in Stitch's output.

---

## 7. Deliverable Format

### 7.1 File format

Stitch produces HTML/CSS files for each design, plus a `DESIGN.md` summary. The HTML/CSS files are self-contained (no external CDN dependencies, per ADR-003 offline-first and supply-chain safety); webfonts are loaded from Google Fonts as a temporary measure during design exploration, but the implementation will self-host them.

### 7.2 Naming convention

Files are named: `direction-A-clinical-authority/[screen]-[locale].html`, `direction-B-modern-operations/[screen]-[locale].html`, `direction-C-gulf-enterprise/[screen]-[locale].html`. The `DESIGN.md` is at the root.

### 7.3 Submission

Stitch submits a single archive containing the three direction folders and the `DESIGN.md`. The design team reviews, selects a direction (or synthesises), and the selected direction becomes the input to the Enterprise Application Shell batch.

---

## 8. Recommended Next Implementation Stage

After this design exploration is complete and a direction is selected, the recommended next implementation stage is:

### **Enterprise Application Shell and Design System Foundation**

This stage implements the selected direction as a runnable Next.js 16 application: the canonical authenticated application shell, the design tokens, the reusable UI components, the bilingual navigation, the organisation/facility/context presentation, the permission-aware navigation, and the loading/error/empty/permission-denied states. It does not implement patient or clinical business modules; those are subsequent batches.

This stage is the substrate against which all subsequent batches are built, and it is the validation surface for the Google Stitch reference designs.

---
