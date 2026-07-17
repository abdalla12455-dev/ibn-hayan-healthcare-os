# MediFlow — Enterprise Clinic Management SaaS

A premium, production-grade, multi-tier SaaS clinic management system built with **Vanilla JavaScript + HTML5 + Tailwind CSS (CDN)**. Inspired by Linear, Stripe Dashboard, Notion, and Vercel — designed for trust, precision, and operational efficiency.

## Premium Design System

The interface is built on a complete enterprise design system with:

- **Refined color tokens** — semantic palette (brand, success, warning, danger, info, violet) with proper light/dark variants
- **8px spacing grid** — consistent rhythm across all components
- **Professional typography** — Inter font with tight heading tracking, tabular numerics for data
- **Soft elevation system** — 5 shadow levels (xs → 2xl) for layered depth
- **Subtle motion** — fast, purposeful transitions (120–280ms) with custom easing curves
- **Component library** — buttons, cards, badges, tables, modals, drawers, toasts, tabs, segmented controls, switches, chips, KPI cards — all consistent
- **Bidirectional RTL/LTR** — full Arabic support with proper layout flipping

---

## Architecture

```
mediflow-pro/
├── index.html                    # Super Admin Dashboard (entry point)
├── clinic-portal.html            # Generic wrapper (shared by ALL clinic types)
├── assets/
│   ├── css/
│   │   └── main.css              # Global styles, dark mode, RTL, badges, modals
│   └── js/
│       ├── core/                 # Cross-cutting concerns (no clinic-specific logic)
│       │   ├── store.js          # DataService class — dynamic per-clinic prefixing
│       │   ├── i18n.js           # Translation dictionary `T` + RTL/LTR direction
│       │   ├── router.js         # navigate(viewId) — SPA section swap
│       │   ├── ui.js             # Modal system, theme, toast, formatters
│       │   └── seed.js           # Demo data seeding (each clinic isolated)
│       ├── super-admin.js        # Super Admin logic only
│       └── clinics/
│           ├── clinic-core.js    # ClinicRegistry + shared patient lifecycle + financial engine
│           ├── laser.js          # Derma/Laser module (registers with ClinicRegistry)
│           ├── dental.js         # Dental module (with interactive dental chart)
│           ├── lab.js            # Lab module (with full inventory CRUD)
│           ├── pediatrics.js     # Pediatrics module
│           └── internal.js       # Internal Medicine module
```

---

## Quick Start

Open `index.html` in any modern browser — no build step, no `npm install`. For proper URLs:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

On first load, 5 demo clinics are seeded, each with isolated doctors, patients, employees, and (for labs) inventory.

---

## Core Architectural Decisions

### 1. `MediFlow` Global Namespace + IIFE Pattern
Every module is an IIFE attached to `window.MediFlow.*`. This avoids `file://` CORS issues that ES6 modules would trigger when opening the HTML directly. The pattern:

```js
window.MediFlow = window.MediFlow || {};
MediFlow.Store = (function () { /* ... */ return { ...api }; })();
```

### 2. `DataService` Class — Per-Clinic Data Isolation
The centerpiece of the architecture. Each clinic's data lives under a unique prefix:

```
mediflow_clinics                       ← global (clinic registry)
mediflow_active_clinic                 ← global (current clinic context)
mediflow_theme, mediflow_lang, ...     ← global (user prefs)

clinic_cln_dental1_patients            ← isolated per clinic
clinic_cln_dental1_doctors
clinic_cln_dental1_employees
clinic_cln_dental1_financials
clinic_cln_dental1_inventory
clinic_cln_dental1_settings

clinic_cln_laser1_patients             ← completely separate namespace
clinic_cln_laser1_doctors
...
```

**Zero data leakage between clinics.** When a clinic is deleted, `DataService.wipe()` removes every `clinic_${id}_*` key.

```js
const ds = MediFlow.Store.forClinic('cln_dental1');
ds.getPatients();    // reads clinic_cln_dental1_patients
ds.setPatients([]);  // writes to the same key
```

### 3. `ClinicRegistry` — Plugin Architecture for Specialties
Each specialty module (laser, dental, lab, etc.) **registers itself** at load time:

```js
MediFlow.ClinicRegistry.register({
  type: 'DERMA_LASER',
  extraNav: [...],
  extraViews: [...],
  renderFormFields() { /* returns HTML */ },
  hydrateFormFields(patient) { /* fills form on edit */ },
  collectFormFields() { /* returns object */ },
  renderExtraCells(patient) { /* returns <td>...</td> */ },
  render() { /* refreshes specialty views */ }
});
```

`applyClinicLayout(clinicType)` looks up the registry and **dynamically injects**:
- Extra sidebar nav items
- Extra `<section>` views in `#content-canvas`
- Clinic-specific form fields in the Add/Edit Patient modal
- Extra `<th>` and `<td>` columns in patient tables

**No `if/switch` chains anywhere in core code** — adding a new clinic type is purely additive: drop a new file in `assets/js/clinics/`, register it, done.

### 4. SPA Router
`MediFlow.Router.navigate(viewId)` swaps visibility of `<section>` children inside `#content-canvas` without page reloads. Updates:
- Active nav item styling
- Page title (via configurable `titleMap`)
- URL hash for shareable/refreshable links
- Runs `before` and `after` hooks (used to trigger re-renders)

### 5. i18n with Bidirectional Support
Single dictionary `T` with `{ en, ar }` entries. `applyI18n()` walks `[data-i18n]` elements; `applyDirection()` flips `<html dir>` between `rtl` and `ltr`. Toggling language re-runs `applyClinicLayout()` so clinic-type labels re-render in the new language.

### 6. Modal System
A reusable `openModal(id)` / `closeModal(id)` / `closeAllModals()` API. Any element with class `modal-overlay` + an `active` class becomes a modal. Click-outside and ESC-key both close.

---

## Feature Summary

### Super Admin (`index.html` + `super-admin.js`)
- **Dashboard**: 4 KPI cards with trend deltas (clinics, revenue, doctors, patients) · revenue-overview line chart (Chart.js) · clinic-types doughnut chart · live clinics table with sortable columns · recent activity timeline · quick actions panel
- **Clinics**: filterable card grid (by type & plan) + search · clinic-type color-coded pills with icons
- **Subscriptions**: 3 plan comparison cards (Starter / Pro / Enterprise) with "Most Popular" highlight · active subscriptions table with renewal status badges
- **Reports**: 4 advanced KPIs (avg revenue, avg bookings, expiring soon, churn risk) · revenue-by-type progress bars · top-5 clinics leaderboard · all-clinics performance table with progress indicators
- **Activity**: full audit timeline of all administrative actions
- **Settings**: appearance (theme switch + language segmented control) · profile card · danger zone with confirm-dialog reset
- **Notifications**: slide-in drawer with mark-all-read action

### Clinic Portal (`clinic-portal.html` + `clinic-core.js` + `clinics/*.js`)
- **Dashboard**: 4 KPI cards (patients today, doctors, today revenue, waiting) · live patient queue table with status badges & advance buttons · queue status breakdown panel with progress bars
- **Patients**: searchable + status-filterable table with avatars, status badges, edit/delete actions
- **Doctors**: premium card grid with avatars, gradient backgrounds, salary/incentive/patients/earned stats · Pay Doctor modal with calculation breakdown
- **Employees**: enterprise table with role/salary/status columns
- **Financials**: 3 KPI cards (today/month revenue + total salaries) · doctor compensation table with one-click pay
- **Settings**: clinic info editor, theme switch, language segmented control

### Per-Clinic Specialties (auto-injected via ClinicRegistry)
| Type | Module | Unique Features |
|---|---|---|
| `DENTAL` | `dental.js` | 32-tooth interactive chart with affected/extracted markers, segmented mode toggle, persisted globally |
| `DERMA_LASER` | `laser.js` | Laser type, body area, skin type (I-VI), hair thickness, sessions count · dedicated Laser Sessions view |
| `LAB` | `lab.js` | Test type, result · **full inventory CRUD** with 3 KPI stats (total / low stock / expiring) + low-stock & expiry badges |
| `PEDIATRICS` | `pediatrics.js` | Weight tracking, guardian name |
| `INTERNAL` | `internal.js` | Procedure, clinical notes |

---

## Patient Lifecycle

Status flow with automatic timestamps for wait-time analytics:

```
arrived → waiting → withDoctor → completed
                                    ↘ cancelled (terminal)
```

Each transition records:
- `arrivedAt` — registration time
- `withDoctorAt` — consultation start
- `completedAt` — visit end

The dashboard shows live wait time = `withDoctorAt − arrivedAt` (or `now` if still waiting).

---

## Financial Engine

Per-doctor payout calculation:

```
earnedToday = Σ(invoice × incentiveRate/100) for all today's patients of this doctor
totalPayout = fixedSalary + earnedToday    (suggested)
```

The `Pay Doctor` modal pre-fills with `fixedSalary + earnedToday`. Payouts are recorded in `clinic_${id}_financials.payouts[]` and added to expenses.

---

## Coding Standards

- `const` / `let` only (no `var`)
- IIFE-wrapped modules with `'use strict'`
- Section separators: `// ============`
- `escapeHtml()` on every user-provided string
- Event delegation via inline `onclick` (calls into `MediFlow.*` namespace)
- Centralized dictionary `T` — no hardcoded UI strings
- Single source of truth for clinic-type UI: `ClinicRegistry` + `applyClinicLayout()`

---

## File Load Order (matters)

```html
<!-- Both HTML files use this order: -->
<script src="assets/js/core/store.js"></script>
<script src="assets/js/core/i18n.js"></script>
<script src="assets/js/core/ui.js"></script>
<script src="assets/js/core/router.js"></script>
<script src="assets/js/core/seed.js"></script>

<!-- Super Admin only: -->
<script src="assets/js/super-admin.js"></script>

<!-- OR Clinic Portal only: -->
<script src="assets/js/clinics/clinic-core.js"></script>
<script src="assets/js/clinics/laser.js"></script>
<script src="assets/js/clinics/dental.js"></script>
<script src="assets/js/clinics/lab.js"></script>
<script src="assets/js/clinics/pediatrics.js"></script>
<script src="assets/js/clinics/internal.js"></script>
```

Clinic modules self-register on load — order between them does not matter.

---

## Tech Stack

- **Vanilla JavaScript** (ES6+, no framework, no bundler)
- **HTML5** semantic markup
- **Tailwind CSS** via CDN
- **Chart.js 4.4** for analytics visualizations
- **Material Symbols** for icons
- **Inter** font family for premium typography
- **localStorage** as mock backend (with per-clinic prefixing)
- **Custom i18n dictionary** for bidirectional Arabic/English

No build tools. No npm install. Just open the HTML.

---

## Premium UI Components Reference

| Component | Class | Description |
|---|---|---|
| KPI Card | `.kpi-card` | Stat card with label, value, trend delta, colored icon |
| Card | `.card`, `.card-hover` | Surface container with optional hover lift |
| Button | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-success` | 5 variants, 3 sizes (sm, default, lg), `.btn-icon` for square |
| Input | `.input`, `.select`, `.textarea` | Form fields with focus ring |
| Badge | `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`, `.badge-brand`, `.badge-violet`, `.badge-neutral` | Status pills with optional dot (`.badge-dot`) |
| Table | `.table` | Sticky-header enterprise table with hover rows |
| Modal | `.modal-overlay`, `.modal-card` | Promise-based confirm dialog via `UI.confirm()` |
| Drawer | `.drawer` | Slide-in side panel |
| Toast | auto-stacked | `UI.toast(msg, type, timeout)` |
| Tabs | `.tabs-underline` or `.segmented` | Underline or pill-style navigation |
| Switch | `.switch` | Toggle input with smooth slider |
| KPI Icon | `.kpi-icon`, `.tint-brand`, `.tint-success`, etc. | Color-tinted icon containers |
| Clinic Pill | `.clinic-pill`, `.clinic-type-{TYPE}` | Specialty-labeled pill with colored icon |
| Progress | `.progress`, `.progress-bar` | Animated progress with color variants |
| Search Bar | `.search-bar` | Premium search input with icon + kbd shortcut |
| Breadcrumbs | `.breadcrumbs` | Hierarchical navigation |
| Live Dot | `.live-dot` | Pulsing indicator for real-time elements |
