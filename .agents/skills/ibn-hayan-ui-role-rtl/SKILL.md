---
name: ibn-hayan-ui-role-rtl
description: >
  UI and UX rules for role separation, approved designs, Arabic RTL, English LTR,
  responsiveness, and safe-area quality in the Ibn Hayan Healthcare Operating System.
metadata:
  project: ibn-hayan-healthcare-os
  version: "1.0.0"
triggers:
  - UI
  - UX
  - interface
  - screen
  - dashboard
  - clinic admin
  - platform super admin
  - RTL
  - LTR
  - Arabic
  - responsive
  - mobile
  - واجهة
  - شاشة
  - لوحة
  - عيادة
  - مشرف المنصة
  - عربي
  - موبايل
---

# Ibn Hayan UI, Role, and RTL Rules

Use this skill together with `AGENTS.md`, `PROJECT_CONTINUITY.md`, and the canonical Design Bible.

## Role and surface verification

Before designing or editing:

- Identify the exact role, route, surface, organisation, facility, language direction, and workflow.
- Never confuse Platform Super Admin with Clinic Admin.
- R09 Clinic Administrator work must remain clinic-scoped.
- Platform Super Admin work must remain platform-scoped.
- Stop and ask when the role or surface is ambiguous.

## Canonical design authority

- Inspect `download/docs/05_UI_UX/DESIGN_BIBLE.md` and approved assets before editing.
- Treat approved Clinic Admin Arabic RTL and English LTR overview screens as canonical where applicable.
- Preserve approved visual hierarchy, terminology, navigation, states, and role boundaries.
- Do not silently replace approved design decisions.

## Edit in place

- Edit the current implementation in place.
- Do not create duplicate routes, screens, frames, artboards, modules, or competing versions unless explicitly required.
- Reuse existing components and tokens when appropriate.
- Avoid unrelated redesign and style churn.

## Safe-area and layout quality

No system name, profile control, button, card, table, modal, or content block may touch or appear cropped by viewport or artboard edges.

Verify:

- top, bottom, left, and right safe areas
- card and table containment
- line spacing and block spacing
- overflow behavior
- long Arabic and English strings
- empty, loading, error, permission-denied, and unsupported states

## RTL, LTR, and responsiveness

Validate Arabic RTL and English LTR on desktop and mobile, plus tablet and narrow widths where relevant.

Do not solve RTL by manually reversing text.
Use semantic direction, logical CSS properties, and existing design-system conventions.

## Data and workflow honesty

- Do not fabricate production data or unsupported capabilities.
- Clearly represent not-supported, configuration-required, empty, loading, and error states.
- Do not add UI actions before backend, permission, audit, and domain contracts are ready.
- Preserve authentication, authorization, tenant scope, and facility context.

## Validation

Run as applicable:

- typecheck
- lint
- focused component tests
- production build
- browser console inspection
- network request inspection
- route and permission verification
- desktop and mobile manual review
- Arabic RTL and English LTR manual review
- accessibility checks
- visual regression or screenshot comparison when available
