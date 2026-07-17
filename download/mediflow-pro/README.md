# MediFlow — Modular Clinic Management SaaS

A professional-grade, multi-tier SaaS clinic management system built with **Vanilla JavaScript + HTML5 + Tailwind CSS (CDN)**. Strictly modular, local-first, with per-clinic data isolation.

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
- Dashboard: 4 live stat cards (clinics, revenue, doctors, patients)
- Clinics: full CRUD with table + card grid views
- Subscriptions: Starter / Pro / Enterprise comparison with live counts
- Reports: revenue-by-type progress bars + top-5 clinics leaderboard
- Settings: theme toggle, language switch, full data reset
- Hand-off: clicking **Open** saves clinic context to localStorage and redirects to `clinic-portal.html`

### Clinic Portal (`clinic-portal.html` + `clinic-core.js` + `clinics/*.js`)
- Dashboard: today's patients, doctors, revenue, waiting count + live queue table
- Patients: search + status filter + lifecycle buttons (`arrived → waiting → withDoctor → completed`)
- Doctors: card grid with salary, incentive rate, today's earnings + Pay Doctor modal
- Employees: full CRUD table
- Financials: today/month revenue, salary payout table with Pay buttons
- Settings: clinic info edit, theme, language

### Per-Clinic Specialties
| Type | Module | Unique Features |
|---|---|---|
| `DENTAL` | `dental.js` | 32-tooth interactive chart (affected/extracted states, persisted globally) |
| `DERMA_LASER` | `laser.js` | Laser type, body area, skin type, hair thickness, sessions count + Laser Sessions overview |
| `LAB` | `lab.js` | Test type, result + **full inventory CRUD** with low-stock & expiry warnings |
| `PEDIATRICS` | `pediatrics.js` | Weight, guardian name |
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
- **Material Symbols** for icons
- **localStorage** as mock backend (with per-clinic prefixing)
- **Custom i18n dictionary** for bidirectional Arabic/English

No build tools. No npm install. Just open the HTML.
