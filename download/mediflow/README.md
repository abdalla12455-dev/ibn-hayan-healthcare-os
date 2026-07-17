# MediFlow — Clinic Management SaaS

A modular, local-first Clinic Management System built as a multi-tier SaaS solution. Built with **Vanilla JavaScript + HTML5 + Tailwind CSS (CDN)**. Data persists in `localStorage` — no backend required.

---

## Quick Start

Just open `index.html` in any modern browser. No build step, no dependencies to install.

```bash
# Option 1: open the file directly
open index.html

# Option 2: serve locally (recommended — gives you proper URLs)
python3 -m http.server 8000
# then visit http://localhost:8000
```

On first load, the system auto-seeds **5 demo clinics** with doctors and patients so you can explore immediately.

---

## Architecture

```
MediFlow/
├── index.html         # Super Admin Dashboard (entry point)
├── app.js             # Super Admin logic (clinics, analytics, subscriptions)
├── clinic.html        # Clinic Admin SPA (shared shell)
├── clinic.js          # Clinic logic (patients, doctors, financials, applyClinicTypeLayout)
├── store.js           # localStorage store, seed data, helpers
├── i18n.js            # Arabic/English dictionary + RTL/LTR direction
├── styles.css         # Custom styles (cards, badges, modals, dark mode)
└── README.md
```

### Two-tier SaaS Model

| Layer | File | Purpose |
|---|---|---|
| **Super Admin** | `index.html` + `app.js` | Onboard clinics, manage subscriptions, monitor SaaS-wide revenue |
| **Clinic Admin** | `clinic.html` + `clinic.js` | Daily operations: patient queue, doctors, financials |

The Super Admin hands off to a clinic by saving `{ id, type, name }` to `localStorage['mediflow_clinic_meta']` and redirecting to `clinic.html`. The clinic page reads this context and calls `applyClinicTypeLayout()` to render the correct UI for the specialty.

---

## Supported Clinic Types

Each clinic type extends the base patient entity with its own fields via `applyClinicTypeLayout()`:

| Type code | Specialty | Extra patient fields | Special UI |
|---|---|---|---|
| `DENTAL` | Dental | `toothNumber`, `procedure` | Dental Chart view (clickable 32-tooth chart) |
| `DERMA_LASER` | Derma / Laser | `laserType`, `bodyArea`, `skinType`, `hairThickness`, `sessions` | — |
| `LAB` | Laboratory | `testType`, `result` | Inventory module (placeholder) |
| `PEDIATRICS` | Pediatrics | `weight`, `guardian` | — |
| `INTERNAL` | Internal Medicine | `procedure`, `result` | — |

---

## Patient Lifecycle

Status flow with automatic timestamps for wait-time analytics:

```
arrived  →  waiting  →  withDoctor  →  completed
                                         ↘ cancelled (terminal)
```

Each transition is timestamped:
- `arrivedAt` — when patient registers
- `withDoctorAt` — when doctor starts consultation
- `completedAt` — when visit ends

The dashboard shows **live wait time** = `withDoctorAt − arrivedAt` (or now, if still waiting).

---

## Features

### Super Admin
- 4 stat cards (clinics, revenue, doctors, patients)
- Clinics table with full CRUD (Add / Edit / Delete / Open)
- Clinics grid view with cards
- Subscription plans comparison (Starter / Pro / Enterprise)
- Reports: revenue by clinic type, top-performing clinics

### Clinic Admin
- Dashboard with today's stats + live patient queue
- Patients view with search + status filter
- Doctors view with cards (salary, incentive rate, today's earnings)
- Financials view with salary payout table + Pay Doctor modal
- Patient lifecycle: one-click advance (`arrived → waiting → withDoctor → completed`)
- Dental chart view (Dental clinics only)
- Inventory view placeholder (Lab clinics only)

### Cross-cutting
- **Dark / Light mode** toggle (persists in `localStorage`)
- **Arabic (RTL) / English (LTR)** toggle with bidirectional layout
- **Notifications panel** with unread badge
- **Centralized modal overlay** system for all CRUD operations
- **Event-delegated** rendering for dynamic table rows

---

## Data Model

All state lives in `localStorage` under `mediflow_*` keys:

```js
// clinicsData[]
{ id, name, type, manager, plan, expiry, bookings, revenue }

// doctorsData[]
{ id, clinicId, name, specialty, status, fixedSalary, incentiveRate }

// patientsData[]
{ id, clinicId, name, phone, age, gender, doctorId, status,
  arrivedAt, withDoctorAt, completedAt, invoice,
  // + clinic-type-specific fields (toothNumber, laserType, testType, etc.)
}
```

Reset all data anytime via **Super Admin → Settings → Reset All Data**.

---

## Coding Standards

- `const` / `let` used appropriately (no `var`)
- Modular functions with `// ============` section separators
- Event delegation on dynamically rendered rows (e.g. `onclick="advancePatientStatus('${p.id}')`)
- `escapeHtml()` on all user-provided strings to prevent XSS
- Centralized dictionary `T` for i18n — no hardcoded UI strings
- `applyClinicTypeLayout()` is the **single source of truth** for clinic-type UI branching

---

## Roadmap (Placeholders)

- **Dental Chart**: currently a static 32-tooth interactive prototype — needs per-patient persistence
- **Lab Result Uploads**: form field exists; needs file upload + viewer
- **Inventory module**: sidebar entry visible for Lab clinics only; needs full CRUD
- **Multi-branch**: each clinic currently has 1 location; Enterprise plan supports multi-branch in spec

---

## Tech Stack

- **Vanilla JavaScript** (ES6+, no framework)
- **HTML5** semantic markup
- **Tailwind CSS** via CDN
- **Material Symbols** for icons
- **localStorage** as mock backend
- Custom **i18n dictionary** for Arabic/English bidirectional support

No build tools. No npm install. Just open the HTML.
