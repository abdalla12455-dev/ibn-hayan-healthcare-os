# Enterprise Design Brief — Ibn Hayan Healthcare Operating System

> **Document type:** Formal design brief for Google Stitch and future designers. Defines the product positioning, visual direction, bilingual experience, enterprise application shell, component system, table behaviour, accessibility, branding, and anti-patterns for the canonical Ibn Hayan platform.
>
> **Status:** Draft · **Version:** 1.0.0 · **Generated:** 2026-07-19
>
> **Authority precedence observed:** Product Bible → System Architecture → Ratified ADRs → Security and domain documents → UI/UX documents → Current implementation → Legacy prototypes. Where this brief and a ratified ADR conflict, the ADR prevails; this brief elaborates the visual and interaction vocabulary that the ADRs require but do not specify.
>
> **Relationship to existing UI/UX documents:** The ratified `05_UI_UX/` documents (`DESIGN_BIBLE.md`, `DESIGN_SYSTEM.md`, `COLORS.md`, `TYPOGRAPHY.md`, `LAYOUTS.md`, `COMPONENT_LIBRARY.md`, `ACCESSIBILITY.md`, `RESPONSIVE_RULES.md`) currently define section structure but not concrete tokens. This brief supplies the concrete direction that those documents will eventually ratify. Where this brief and a future concrete `05_UI_UX/` document conflict, the ratified document prevails.
>
> **Scope:** Authenticated product surfaces only. Marketing and public surfaces are out of scope for this brief.

---

## Table of Contents

1. Product Positioning
2. Visual Direction
3. Arabic and English
4. Enterprise Application Shell
5. Core Components
6. Tables
7. Accessibility
8. Branding and White Labelling
9. Anti-Patterns

---

## 1. Product Positioning

### 1.1 Target customers

The Ibn Hayan Healthcare Operating System is positioned for **large Iraqi clinics and medical centres, multi-branch clinic groups, and Gulf healthcare organisations**. The product is sold to owners and senior administrators of healthcare facilities who are evaluating enterprise software for daily clinical, administrative, and financial operations across one or more facilities. The buyer is sophisticated: they have used other healthcare software before, they know what they want, and they will judge the platform on its operational density and its discipline, not on its visual novelty.

The product must feel suitable for a 50-doctor multi-branch group in Baghdad, a single large specialty centre in Erbil, and a regional diagnostic network spanning several Gulf cities. It must equally serve the General Manager, the IT Manager, the Lead Physician, the Head Nurse, the Head of Reception, and the Head of Finance within those organisations — each of whom has different daily workflows but the same expectation of operational seriousness. The platform is a tool they will use for eight or more hours a day; it must respect that commitment by being calm, fast, precise, and unfailing.

### 1.2 Premium software product positioning

The product is positioned as **a premium software product valued around USD 10,000 or more per engagement**, sold through enterprise sales rather than a low-cost template marketplace. The premium positioning is communicated through operational discipline, not through visual decoration: through the density and accuracy of information on each screen, the predictability of the navigation, the reliability of every interaction, the bilingual fidelity, the accessibility, and the auditability. A prospect evaluating the platform should conclude that it is serious software for serious organisations, not a consumer app dressed up in clinical vocabulary.

The premium character must survive the demo, the trial, the procurement evaluation, and the decade of daily use that follows. It must not be a procurement-stage impression that fades on the first busy Tuesday afternoon. Per ADR-005 and `PRODUCT_BIBLE.md` §5.6 (Principle P-5 — Practitioner Experience Over Procurement Satisfaction), the practitioner-stage experience prevails when the two conflict.

### 1.3 Preferred character

The preferred character of the product is:

- **Clinical** — the product is for healthcare; the visual and interaction vocabulary reflects that. White space is generous where it aids comprehension; clinical data is presented with the gravity it deserves.
- **Calm** — the product does not alarm, animate excessively, or flash. A user looking at the dashboard at 9 a.m. and at 4 p.m. sees the same calm surface; the data has changed, the surface has not.
- **Precise** — every label is unambiguous; every status has a single meaning; every action has a single primary button. The product avoids the vague.
- **Authoritative** — the product looks like it knows what it is doing. It does not ask for confirmation of obvious actions; it does not present options that are not actionable; it does not show data without context.
- **Modern** — the product uses contemporary web conventions (component-based UI, responsive layout, accessible interaction models) without chasing fashion. The visual language should look as appropriate in 2030 as it does in 2026.
- **Operational** — the product is for people who run healthcare facilities. Every screen answers an operational question: who is here, who is waiting, who owes what, who is on duty, what is low, what is late.
- **Trustworthy** — the product must look like the kind of software that a regulated healthcare organisation would trust with patient data. The audit indicators, the permission-denied states, the immutable records, and the role-aware navigation all communicate that this is a system that takes responsibility seriously.
- **Premium through discipline, not decoration** — the premium feel comes from the discipline of the layout, the consistency of the components, the accuracy of the language, the speed of the interactions, and the depth of the operational thinking. It does not come from gradients, glows, or ornamentation.

### 1.4 What the product is NOT

The product is **not** luxury, flashy, futuristic, or AI-themed. It does not use gold-and-black "luxury" styling. It does not use glassmorphism. It does not use medical clichés (stethoscopes, caducei, red crosses) as decoration. It does not present itself as a consumer wellness app. It does not chase the visual fashion of the year. It does not communicate "AI" through visual effects — the AI capabilities, where they exist, are communicated through their operational outcomes, not through visual flourishes.

---

## 2. Visual Direction

### 2.1 Primary institutional colour family

The primary institutional colour family is **deep teal-blue**. This colour communicates clinical authority, institutional seriousness, and trustworthiness without being aggressive or fashionable. It is the colour of the platform's primary identity, the primary actions, the active navigation state, and the focused input.

| Token | Hex (light) | Hex (dark) | Usage |
|---|---|---|---|
| `color.primary.900` | `#0F2A3E` | `#0B1F2E` | Deepest; sidebar background on dark theme; never on light |
| `color.primary.700` | `#15435C` | `#1B5A7A` | Sidebar background on light theme; primary button hover |
| `color.primary.600` | `#1B5A7A` | `#2A6E91` | Primary button background; active nav item background |
| `color.primary.500` | `#2A6E91` | `#3D87AB` | Primary icon; link; focus ring |
| `color.primary.100` | `#DCEBF3` | `#1A3A4F` | Primary tint; selected row; chip background |
| `color.primary.50` | `#EFF6FA` | `#0F2535` | Subtle primary tint; card hover |

This palette is intentionally restrained. The teal-blue is the only "brand" colour; everything else is neutral, semantic, or specialty accent. The product is recognisable not because the colour is loud but because the colour is consistent.

### 2.2 Secondary clinical accent

The secondary clinical accent is **muted sage green**. It is used for positive operational states: paid, active, completed, verified, healthy. It is never used for primary actions and never for navigation. Its purpose is to mark successful clinical and operational outcomes without competing with the primary teal-blue.

| Token | Hex (light) | Hex (dark) | Usage |
|---|---|---|---|
| `color.accent.700` | `#2E6B4F` | `#4A8F70` | Accent text on light background |
| `color.accent.600` | `#3D8567` | `#5DA382` | Accent icon |
| `color.accent.100` | `#DCEFE3` | `#1A3A2A` | Accent chip background |
| `color.accent.50` | `#EFF7F2` | `#0F2519` | Subtle accent tint |

### 2.3 Neutral palette

The neutral palette is **cool grey**. It is used for surfaces, borders, text, and all non-semantic, non-brand colour. The cool cast aligns with the teal-blue primary and avoids the warm beige feel that some enterprise products drift into.

| Token | Hex (light) | Hex (dark) | Usage |
|---|---|---|---|
| `color.neutral.0` | `#FFFFFF` | `#0F1419` | Card background; modal background |
| `color.neutral.50` | `#F7F9FA` | `#161C22` | Page background |
| `color.neutral.100` | `#EFF2F4` | `#1F262E` | Subtle background; table header |
| `color.neutral.200` | `#D9DFE3` | `#2B333C` | Border |
| `color.neutral.300` | `#B8C0C7` | `#3D4651` | Strong border; disabled background |
| `color.neutral.500` | `#6B7680` | `#9BA4AB` | Secondary text |
| `color.neutral.700` | `#3A434B` | `#C6CDD2` | Primary text on light |
| `color.neutral.900` | `#1A1F24` | `#F0F2F4` | Heading text on light |

### 2.4 Semantic colours

Semantic colours communicate operational state. They are always paired with a text label and an icon — never communicated through colour alone (per §7 Accessibility).

| Token | Hex (light) | Hex (dark) | Meaning | Usage |
|---|---|---|---|---|
| `color.semantic.success` | `#1F7A4D` | `#3DA371` | Operation succeeded; active; healthy | Status chip; toast; KPI delta |
| `color.semantic.warning` | `#9A6700` | `#D4A02C` | Grace period; pending; approaching threshold | Status chip; alert |
| `color.semantic.danger` | `#B42318` | `#F26156` | Suspended; expired; failed; critical | Status chip; destructive button; critical-result alert |
| `color.semantic.info` | `#175CD3` | `#5C8FF0` | Informational; in-progress | Status chip; toast |

Each semantic colour has a tinted background (`semantic.success.bg`, etc.) for chip and alert backgrounds, and a foreground for text and icons. The tinted backgrounds are intentionally pale so the chip reads as a state indicator, not as a colour block.

### 2.5 Specialty accent rules

Each clinic type may have **one restrained specialty accent** that manifests as: (1) the specialty icon in the sidebar header; (2) a single accent stripe on the clinic admin overview; (3) the active nav item's left border; (4) the specialty's KPI card icon background. The specialty accent does not recolour the primary teal-blue, does not recolour buttons, does not recolour semantic states, and does not recolour the table header. The specialty accent is configuration, applied at runtime per the configuration-driven clinic-type overlay (per ADR-001 and `02_PRODUCT/CLINIC_TYPES.md` §5).

| Clinic type family | Specialty accent | Notes |
|---|---|---|
| Dental | Muted emerald | Echoes the dental mockup's emerald without copying its Tailwind shade |
| Pediatrics | Muted blue | Echoes the pediatric mockup's blue, softened |
| Internal Medicine | Muted teal | Aligns with the primary; subtly distinguishable |
| Laboratory | Muted cyan | Echoes the lab mockup's teal, cooled toward cyan |
| Dermatology and Laser | Muted plum | Distinguishes without being decorative |
| General / Family / Other | No specialty accent; primary teal-blue only | Default |

The specialty accent is the **only** clinic-type-driven visual difference. Components, typography, spacing, layout, and interaction language are identical across all clinic types.

### 2.6 Spacing rhythm

The spacing scale is a 4-pixel base rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. There is no 2-pixel or 6-pixel or 10-pixel spacing; if a design needs an in-between value, it is wrong. The 4-pixel rhythm produces a calm, predictable layout that aligns across components, tables, and pages.

| Token | Value | Usage |
|---|---|---|
| `space.1` | 4px | Inline icon gap; tight chip padding |
| `space.2` | 8px | Default inline gap; small control padding |
| `space.3` | 12px | Default block gap; chip padding |
| `space.4` | 16px | Card padding; field gap |
| `space.5` | 20px | Card header padding |
| `space.6` | 24px | Section gap |
| `space.8` | 32px | Page-section gap |
| `space.10` | 40px | Major section gap |
| `space.12` | 48px | Hero region gap (rare in authenticated product) |
| `space.16` | 64px | Layout gap |
| `space.20` | 80px | Layout gap |

### 2.7 Border radius

Border radius is restrained. Cards, modals, and panels use 12px (`radius.lg`). Buttons, inputs, chips, and badges use 8px (`radius.md`). Small inline elements use 4px (`radius.sm`). There is no fully rounded element in the authenticated product (the marketing site may use full-rounded pills for CTAs, but that is out of scope). The restraint produces a serious, institutional feel.

| Token | Value | Usage |
|---|---|---|
| `radius.sm` | 4px | Inline code; small badges |
| `radius.md` | 8px | Buttons; inputs; chips; badges |
| `radius.lg` | 12px | Cards; modals; panels; drawers |
| `radius.xl` | 16px | Large feature cards (rare) |
| `radius.full` | 9999px | Avatars only |

### 2.8 Elevation

Elevation is restrained and meaningful. The default surface has no elevation. Cards have a single subtle shadow that communicates "this is a discrete unit" without floating. Modals and drawers have a stronger shadow that communicates "this is above the page". There is no decorative elevation; nothing floats for visual effect.

| Token | Shadow | Usage |
|---|---|---|
| `elevation.0` | none | Default surface; table rows; inline elements |
| `elevation.1` | `0 1px 2px rgba(15, 42, 62, 0.06)` | Cards; table header sticky |
| `elevation.2` | `0 2px 4px rgba(15, 42, 62, 0.08), 0 1px 2px rgba(15, 42, 62, 0.04)` | Hovered card; popover |
| `elevation.3` | `0 8px 24px rgba(15, 42, 62, 0.12), 0 2px 6px rgba(15, 42, 62, 0.06)` | Modal; drawer |
| `elevation.4` | `0 16px 48px rgba(15, 42, 62, 0.16), 0 4px 12px rgba(15, 42, 62, 0.08)` | Toast; high-priority modal |

### 2.9 Density

The product supports two density modes: **comfortable** (default) and **compact** (user preference). Comfortable density uses 44px row height in tables, 40px button height, 16px card padding. Compact density uses 36px row height, 32px button height, 12px card padding. Compact density is for power users on large monitors who want to see more rows without scrolling; comfortable density is the default for everyone else. Density is a user preference (per §4 Enterprise Application Shell).

### 2.10 Typography

Typography is bilingual-first. The platform uses **IBM Plex Sans Arabic** as the primary typeface for Arabic and **Inter** as the primary typeface for Latin scripts. Both are loaded as self-hosted webfonts (no Google Fonts CDN, per ADR-003 offline-first and supply-chain safety). The two families are matched in x-height and weight progression so they sit comfortably together in mixed-script text (e.g., Arabic labels with Latin medical codes).

| Token | Size | Line height | Weight | Usage |
|---|---|---|---|---|
| `text.xs` | 11px | 16px | 500 | Helper text; table-cell secondary |
| `text.sm` | 13px | 20px | 400 | Body small; table cell; chip |
| `text.base` | 14px | 22px | 400 | Body default; form label; input |
| `text.md` | 15px | 24px | 500 | Card title; section header |
| `text.lg` | 18px | 28px | 600 | Page header title |
| `text.xl` | 22px | 32px | 700 | Modal title; large KPI |
| `text.2xl` | 28px | 36px | 700 | Marketing-only (rare in product) |
| `text.numeric.kpi` | 32px | 40px | 700 | KPI card value; tabular-nums |

All numeric displays use `font-variant-numeric: tabular-nums lining-nums` so digits align in tables and KPI cards. The Arabic and Latin numerals are rendered in the appropriate script per locale (Arabic-Indic digits in Arabic UI, Latin digits in English UI) unless the user explicitly prefers one.

### 2.11 Iconography

Icons are **Material Symbols Outlined** by default, self-hosted, with `FILL 0`, `wght 400`, `GRAD 0`, `opsz 24` for the default optical size. Specialty icons (odontogram, growth curves, barcode sample) are custom SVGs maintained in the design system. Icon size is 20px in navigation and tables, 16px inline with text, 24px in KPI cards. Icons are never used as the sole indicator of state — they are always paired with a text label.

### 2.12 Data visualisation style

Charts are calm. They use the primary teal-blue and the semantic colours; they do not use a rainbow palette. Bar charts use a single colour with varying lightness for series; line charts use the primary for the main series and a muted neutral for comparison. Grid lines are subtle (`color.neutral.100`); axis labels are `text.xs` `color.neutral.500`. Tooltips are restrained: value, label, and date — nothing else. Charts never animate on scroll; they may animate on first render with a 200ms ease-out, and that is the only motion.

| Chart type | Usage | Style |
|---|---|---|
| Bar chart | Weekly revenue, monthly encounters | Single-colour bars; subtle grid |
| Line chart | Longitudinal measurements (BP, glucose) | Primary line + neutral comparison; subtle dots |
| Donut chart | Status distribution | Semantic colours only; centre label |
| Sparkline | KPI trend | Single-colour; no axis |
| Heatmap | Appointment density by hour/day | Primary palette lightness ramp |

### 2.13 Motion rules

Motion is restrained and meaningful. The default transition is 150ms ease-out for hover and focus, 200ms ease-out for state changes, 250ms ease-out for layout transitions (drawer, modal). There is no parallax, no scroll-driven animation, no decorative motion. Reduced-motion preference is respected (per §7 Accessibility): when `prefers-reduced-motion: reduce`, all transitions are reduced to 1ms (effectively instant) and all non-essential motion is removed.

---

## 3. Arabic and English

### 3.1 Arabic-first default

The platform is **Arabic-first by default**. Every screen, every label, every status, every error, every empty state is authored in Arabic first and translated to English second. The Arabic is not a translation of an English source; it is the source. This means Arabic labels are not awkward calques of English idioms — they use the natural Arabic clinical and administrative vocabulary that Iraqi and Gulf healthcare workers actually use.

The default locale is `ar-IQ` (Arabic, Iraq). The default direction is `rtl`. The default numerals are Arabic-Indic (`٠١٢٣٤٥٦٧٨٩`) for the Arabic UI, with Latin digits (`0123456789`) used in medical codes, dosages, and other contexts where Latin digits are clinically standard.

### 3.2 Equal-quality English experience

The English experience is **equal quality, not a translation overlay**. Every English label is as natural and as carefully chosen as the Arabic. The English locale is `en` (with regional variants `en-GB` for Gulf markets that prefer British spelling). The English direction is `ltr`. The English numerals are Latin.

A user who switches from Arabic to English (or vice versa) must feel that both are first-class. There must be no awkward string overflow, no truncated labels, no broken layout, no missing translations, no English-only error messages, no Arabic-only status badges. The platform's bilingual posture is a property of the architecture, not a feature flag.

### 3.3 True RTL and LTR mirroring

Direction switching is **true mirroring**, not text alignment only. When the direction is RTL:

- The sidebar is on the right; the main content is on the left.
- The breadcrumb flows right-to-left.
- The page header's primary action is on the left (the "end" in RTL).
- Table columns flow right-to-left; the first column is on the right.
- Modal close buttons are on the left.
- Icons that imply direction (back, forward, expand, collapse) are mirrored.
- Padding and margin are flipped: `padding-left: 16px` in LTR becomes `padding-right: 16px` in RTL.
- The focus ring appears on the correct side.

The platform uses logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`) throughout, never physical properties (`margin-left`, `padding-right`). Tailwind's RTL plugin (or equivalent) handles the mirroring; designers and engineers do not write per-direction CSS.

### 3.4 Mixed Arabic and Latin medical terminology

Medical text frequently mixes Arabic and Latin scripts: an Arabic label followed by a Latin medical code (`فحص CBC`), an Arabic physician name with a Latin credential (`د. أحمد التميمي, MD`), an Arabic dosage with a Latin unit (`٥٠ مل mg`). The typography must handle these mixed-script cases gracefully: the Arabic characters render in IBM Plex Sans Arabic, the Latin characters render in Inter, and the two sit on the same baseline without manual intervention. This is achieved through per-glyph font fallback in the browser, configured in the design system.

### 3.5 Arabic numeral and Latin numeral handling

The platform displays numerals in the user's preferred script by default. Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) are used in the Arabic UI for quantities, currencies, dates, and times. Latin numerals are used in the English UI. However, certain clinical and technical contexts always use Latin numerals regardless of UI locale: medical codes (ICD-10, CPT), dosages (`500 mg`), lab values (`12.5 mmol/L`), barcodes (`#LAB-9041`), and identifiers (`MRN-2026-001234`). The platform's locale-aware formatting knows which context is which.

Currency is formatted per locale: `١,٢٠٠,٠٠٠ د.ع` in Arabic (Iraqi Dinar), `IQD 1,200,000` in English. Dates are formatted per locale: `٢٠٢٦/٠٧/١٩` in Arabic (ISO-style with Arabic numerals), `19 Jul 2026` in English (medium date). Times are 24-hour in both locales: `١٤:٣٠` in Arabic, `14:30` in English.

### 3.6 Long Arabic labels

Arabic labels are often longer than their English equivalents. The design system accommodates this by: (1) defaulting to a comfortable density that allows labels to wrap to two lines when needed; (2) using flexible layouts that grow to accommodate the longest label in the locale set; (3) providing a translation-comment system that flags strings where the Arabic is more than 30% longer than the English, so designers can adjust the layout proactively. Truncation is a last resort and must never truncate a clinical term.

### 3.7 Bilingual role and status names

Role names and status names are bilingual and aligned with the canonical role catalogue (R01–R14) and the status catalogues (subscription status, encounter status, appointment status, etc.). The Arabic and English forms are:

| Code | Arabic | English |
|---|---|---|
| R01 | طبيب | Physician |
| R02 | ممرض | Nurse |
| R06 | موظف الاستقبال | Receptionist |
| R09 | مدير المنشأة | Administrator |
| R14 | مدير النظام | System Administrator |
| subscription.active | نشط | Active |
| subscription.grace | فترة السماح | Grace Period |
| subscription.suspended | متوقف | Suspended |
| subscription.terminated | منتهي | Terminated |
| appointment.arrived | وصل | Arrived |
| appointment.waiting | في الانتظار | Waiting |
| appointment.withDoctor | مع الطبيب | With Doctor |
| appointment.completed | تمت المعاينة | Completed |
| appointment.cancelled | ملغي | Cancelled |
| appointment.noShow | لم يحضر | No-Show |

### 3.8 Locale-aware formatting

Dates, times, phone numbers, and currencies are formatted per the user's locale. The platform uses the Intl API (or equivalent) with the `ar-IQ` and `en` locales. Phone numbers are formatted in E.164 for storage and displayed in the user's locale format (`+964 770 000 0000`). Currencies are formatted with the correct symbol and grouping (`١,٢٠٠,٠٠٠ د.ع` or `IQD 1,200,000`). Dates use the Gregorian calendar by default; the Hijri calendar is available as a secondary display in the Arabic locale for contexts where it is culturally relevant (e.g., patient communication).

### 3.9 No interface that merely translates strings without adapting layout

A screen that has been translated but not adapted is a failure. The platform's bilingual posture means that every screen is designed bilingually from the start: the layout works in both directions, the components handle both scripts, the typography renders both cleanly, the spacing accommodates both label lengths, and the locale-aware formatting is wired through every numeric and date display. A screen that "works in English and we'll translate it later" is rejected at design review.

---

## 4. Enterprise Application Shell

### 4.1 Global sidebar

The global sidebar is a fixed 280px panel on the start side (right in RTL, left in LTR). It contains: (1) the platform brand mark and product name at the top; (2) the facility and organisation switcher below the brand; (3) the primary navigation list; (4) the secondary navigation list (settings, help, logout) at the bottom. The sidebar is always visible on desktop; on tablet it collapses to a 72px icon rail with tooltips; on mobile it becomes a drawer triggered by a hamburger button in the top bar.

The sidebar's navigation items are **permission-aware**: an item is shown only if the user has the permission to view the corresponding route. An item the user cannot see does not appear greyed out — it does not appear at all. The navigation order is stable across users; only the visible subset varies.

### 4.2 Top bar

The top bar is a 64px panel that spans the main content area. It contains: (1) the breadcrumb on the start side; (2) the command search in the centre (on desktop); (3) the language toggle, the dark-mode toggle, the notification bell, and the user menu on the end side. The top bar is sticky and remains visible on scroll.

### 4.3 Facility and organisation switcher

The facility and organisation switcher sits below the brand mark in the sidebar. It shows the current organisation name and facility name, with a chevron icon to indicate it is clickable. Clicking opens a dropdown that lists the user's accessible organisations and facilities, grouped by organisation. Selecting a different facility triggers a context switch (per the ratified session-context module, Batch 6) and the audit event `tenant_context.selected`. The switcher is hidden if the user has access to only one facility.

### 4.4 Command search

The command search is a keyboard-driven search field in the top bar. It accepts a free-text query and returns: matching navigation items, matching patients (within the current facility scope), matching encounters, matching practitioners, and matching settings. The user can press `Cmd+K` (Mac) or `Ctrl+K` (other) to focus the search from anywhere in the product. The command search is not a full-text search of clinical content; it is a navigation accelerator.

### 4.5 Notifications

The notification bell in the top bar shows a red dot when there are unread notifications. Clicking opens a dropdown panel (320px wide) that lists the most recent notifications, grouped by type and ordered by time. Each notification shows an icon, a title, a body (truncated to two lines), and a timestamp. The user can mark individual notifications as read or clear all. Clicking a notification navigates to its target.

### 4.6 User menu

The user avatar in the top bar opens a dropdown with: the user's name and role; a link to user preferences; a link to change password; a link to audit history (if permitted); and a logout action. The dropdown is intentionally short — it is a quick-access menu, not a profile page.

### 4.7 Breadcrumb

The breadcrumb shows the path from the product root to the current page: `المنشأة الرئيسية / المرضى / ملف المريض`. The breadcrumb is clickable at every level. The breadcrumb is always present except on the dashboard root.

### 4.8 Page header

The page header sits below the top bar and contains: (1) the page title (large, bold); (2) an optional page subtitle or description; (3) the primary action button on the end side; (4) optional secondary actions as buttons or an overflow menu. The page header is the consistent anchor of every screen.

### 4.9 Primary action

Every screen has at most **one primary action**. The primary action is the most important thing the user can do on this screen; it is rendered as a filled primary-coloured button on the end side of the page header. Secondary actions are rendered as outline buttons or as an overflow menu. If a screen has two equally important actions, the design is wrong and one must be promoted or the actions must be combined.

### 4.10 Filter bar

The filter bar sits below the page header on list screens. It contains: a search field; filter chips (status, date range, category); a sort selector; and a view selector (table vs board vs calendar). Filters are applied immediately; the URL is updated to reflect the current filter state so the view is bookmarkable and shareable.

### 4.11 Table region

The table region is the main content of list screens. It is documented in detail in §6 Tables. The table region is bounded by the card it sits in; the card has a header (title, count, actions) and the table body. The table is responsive: on tablet it shows fewer columns; on mobile it collapses to a card list.

### 4.12 Contextual drawer

The contextual drawer slides in from the end side (left in RTL, right in LTR) when the user takes an action that requires a quick form without leaving the current page. Examples: edit a doctor, record a payment, add a note. The drawer is 480px wide on desktop, full-width on tablet and mobile. It has a header (title, close button), a body (the form), and a footer (cancel, save). The drawer does not navigate away from the current page; on save, the underlying list updates in place.

### 4.13 Modal rules

Modals are used for actions that require focus and commitment: confirmations (especially destructive), multi-step forms, and full-screen edits. Modals are 480–640px wide on desktop, full-width on tablet and mobile. They have a coloured header (primary for standard, danger for destructive, success for positive confirmation), a body, and a footer with actions. Modals are dismissible by Escape, by clicking the backdrop, or by the cancel button. Destructive modals require explicit confirmation (button click); they cannot be dismissed by clicking the backdrop.

### 4.14 Status and permission states

Every screen and every component must define its status and permission states. Status states: **populated** (data present), **empty** (no data, with guidance), **loading** (skeleton or spinner), **error** (with retry), **permission-denied** (with explanation). Permission states are governed by the canonical authorization guard (Batch 8): if the user lacks permission to view a screen, the route is hidden and direct navigation shows the permission-denied state; if the user lacks permission to view a component (e.g., a salary field), the component is hidden or redacted.

---

## 5. Core Components

The component library is organised into families. Each family has a small number of variants; the variants are designed to cover the operational needs of the platform without exploding into a long tail of one-off components. Every component is bilingual, accessible, and density-aware.

### 5.1 Buttons

| Variant | Usage | Style |
|---|---|---|
| Primary | The single primary action on a screen | Filled `color.primary.600`; white text; `radius.md`; 40px height comfortable / 32px compact |
| Secondary | Secondary actions | Outline `color.primary.600`; `color.primary.700` text; transparent background |
| Destructive | Destructive actions (delete, terminate) | Filled `color.semantic.danger`; white text |
| Ghost | Tertiary actions; row actions | Transparent; `color.neutral.700` text; subtle hover background |
| Icon | Compact actions in tight space | Icon only; 32px square; tooltip required |

### 5.2 Fields

Text inputs, textareas, and number inputs. Each has: a label (always visible, never placeholder-only), an optional helper text, an optional error message, an optional prefix/suffix (e.g., currency symbol), and a clear focus state (2px `color.primary.500` ring). Required fields are marked with a subtle asterisk; the asterisk is announced to screen readers as "required". Disabled fields are visually distinct (grey background, grey text) and not focusable.

### 5.3 Selects

Native `<select>` enhanced with a custom dropdown for consistent styling. The dropdown is keyboard-navigable (arrow keys, type-ahead), bilingual, and accessible. Long option lists are searchable. The select shows the selected option's label; on open, the dropdown highlights the current selection.

### 5.4 Comboboxes

Comboboxes are type-ahead search inputs with a dropdown of matching options. They are used for large option lists (e.g., selecting a patient from thousands). The combobox shows recent selections above the search results. The combobox is keyboard-navigable: type to filter, arrow keys to navigate, Enter to select, Escape to close.

### 5.5 Date and time controls

Date and time controls are native `<input type="date">` and `<input type="time">` enhanced with a custom picker for consistent styling and bilingual rendering. The picker supports RTL layout, Arabic-Indic numerals (in Arabic locale), and keyboard navigation. Date ranges are a single component with start and end inputs and a visual range selector.

### 5.6 Cards

Cards are the basic container. They have `radius.lg`, `elevation.1`, `color.neutral.0` background, `color.neutral.200` border, and 16px padding. Card headers are 20px padding with a title (`text.md`), an optional subtitle (`text.sm` `color.neutral.500`), and optional actions on the end side. Card bodies have 16px padding. Cards do not nest more than two deep.

### 5.7 KPI summaries

KPI cards show a single metric with a label, a value (large, `text.numeric.kpi`), an optional delta (vs previous period, with arrow and colour), and an optional sparkline. KPI cards are 16px padding, `radius.lg`, `elevation.1`. They never animate on render except for the optional 200ms ease-in of the value. KPI cards are always paired with a tooltip that defines the metric and the period.

### 5.8 Tables

Tables are the workhorse of the platform. They are documented in detail in §6 Tables.

### 5.9 Tabs

Tabs are used to switch between views of the same data (e.g., patient profile: encounters, orders, results, notes). Tabs are underline-style with a 2px primary indicator on the active tab. Tabs are keyboard-navigable (arrow keys). Tabs do not animate content transitions.

### 5.10 Filters

Filters are chips above the table that show the active filters. Each chip shows the filter name and value, with an "x" to remove. The filter bar also contains a search field, a sort selector, and a view selector. Filters are URL-synced.

### 5.11 Badges

Badges are small, low-emphasis labels. They are used for categories, types, and tags. Badges are `radius.md`, `text.xs`, subtle background (`color.neutral.100`), neutral text.

### 5.12 Status chips

Status chips are higher-emphasis than badges. They communicate operational state with an icon, a text label, and a coloured background (semantic or status-specific). Status chips never use colour alone — they always have an icon and a text label.

| Status | Background | Foreground | Icon |
|---|---|---|---|
| Active | `semantic.success.bg` | `semantic.success` | check_circle |
| Grace | `semantic.warning.bg` | `semantic.warning` | schedule |
| Suspended | `semantic.danger.bg` | `semantic.danger` | pause_circle |
| Pending | `color.primary.100` | `color.primary.700` | hourglass_empty |
| Completed | `semantic.success.bg` | `semantic.success` | task_alt |

### 5.13 Avatars

Avatars are circular (`radius.full`) with the user's initials on a primary-tinted background. Avatars are 32px in the top bar, 40px in lists, 24px in compact tables. Avatars are always paired with the user's name in lists; they are not a substitute for the name.

### 5.14 Timelines

Timelines show a chronological sequence of events (e.g., a patient's encounter history, a ticket's lifecycle). Each entry has a timestamp, an actor, an action, and an optional note. Timelines are vertical, with the most recent entry at the top. Each entry has a small icon indicating the event type.

### 5.15 Activity feeds

Activity feeds show a real-time stream of events (e.g., the platform audit feed, the notification feed). Each entry has a timestamp, an actor, an action, and a target. Activity feeds are virtualised for performance (only the visible entries are rendered).

### 5.16 Drawers

Drawers slide in from the end side (see §4.12). They are 480px on desktop, full-width on tablet and mobile. They have a header, a body, and a footer. They trap focus when open and restore focus to the trigger on close.

### 5.17 Modals

Modals are described in §4.13.

### 5.18 Empty states

Empty states are first-class. Every list and every screen has a designed empty state with: an illustration (optional, restrained), a title, a description, and a primary action (e.g., "Add your first patient"). Empty states are not errors; they are guidance.

### 5.19 Loading states

Loading states use **skeletons** for initial loads (grey placeholders that match the eventual content shape) and **spinners** for inline actions (e.g., save in progress). Loading states never block the entire screen; they are scoped to the component that is loading.

### 5.20 Error states

Error states show: an icon, a title, a description, and a retry action. Error states are not generic "Something went wrong" — they explain what went wrong in operational terms (e.g., "Could not load patients. The facility context was lost. Please re-select your facility."). Network errors distinguish between offline and server error.

### 5.21 Permission-denied states

Permission-denied states show: a lock icon, a title ("You do not have permission to view this"), a description naming the required permission, and (if applicable) a link to request access from an administrator. Direct navigation to a permission-denied route shows this state; the route is not hidden from the URL bar (the user may have bookmarked it).

### 5.22 Audit indicators

Audit indicators are small icons that mark audited actions. They appear next to actions that emit audit events (e.g., a small shield icon next to "Sign encounter"). Hovering shows a tooltip: "This action is recorded in the audit log." Audit indicators communicate that the platform takes responsibility seriously without being intrusive.

### 5.23 Destructive confirmations

Destructive actions (delete, terminate, suspend) require a confirmation modal. The modal is danger-styled (red header) with: a warning icon, a title that names the action and the target ("Delete clinic: Al-Mansour Dental"), a description that explains the consequences, a cancel button, and a confirm button whose label is the action verb ("Delete"). The confirm button is not enabled for 1 second after the modal opens (a "dwell" to prevent reflexive clicking).

### 5.24 Notifications

Notifications appear as toasts (top-end, 4-second auto-dismiss for info, 8-second for success, persistent for error). Each toast has an icon, a title, a description, and an optional action. Notifications are also persisted to the notification drawer (§4.5).

### 5.25 Charts

Charts are described in §2.12.

### 5.26 Clinic-type widgets

Clinic-type widgets are specialty-specific components rendered into the dashboard or sidebar per the configuration-driven clinic-type overlay. Examples: odontogram (dental), growth-curve mini-chart (pediatrics), chronic-condition registry mini-list (internal medicine), barcode sample pipeline (laboratory), treatment-package progress (dermatology/laser). Each widget is a self-contained component that consumes platform contracts; the widget does not own business logic.

---

## 6. Tables

Enterprise tables are the workhorse of the platform. They must support the following capabilities:

### 6.1 Search

Every table has a search field in the filter bar. The search is full-text across the visible columns by default; advanced search allows searching specific columns. Search is debounced (200ms) and URL-synced. The search field has a clear button when populated.

### 6.2 Sorting

Every sortable column has a sort indicator in the header (ascending, descending, or none). Clicking the header cycles through ascending → descending → none. Multi-column sort is supported with shift-click. The sort state is URL-synced.

### 6.3 Filtering

Filters are chips in the filter bar (§5.10). Each filter is a column-specific predicate (e.g., "Status = Active"). Multiple filters combine with AND. Filters are URL-synced. Saved views (§6.5) preserve filter combinations.

### 6.4 Saved views

Users can save a filter + sort + column-visibility combination as a named view. Saved views are user-scoped by default; administrators can publish a saved view as a facility-wide default. Saved views appear in a dropdown next to the filter bar.

### 6.5 Pagination

Tables use cursor-based pagination by default (for large datasets) and offset-based pagination for small datasets. The pagination control shows: total count, current range ("11–20 of 143"), previous/next buttons, and a page-size selector (10, 25, 50, 100). Pagination is URL-synced.

### 6.6 Column visibility

Users can show or hide columns via a column-visibility dropdown in the filter bar. Column visibility is user-scoped and persists across sessions. The order of columns is fixed (designer-defined); users cannot reorder columns.

### 6.7 Density control

Users can switch between comfortable (44px row height) and compact (36px row height) density via a density toggle in the filter bar. Density is a user preference (§2.9).

### 6.8 Bulk actions

Tables support bulk actions: a checkbox column allows selecting rows; when rows are selected, a bulk-action bar appears above the table with the available actions (e.g., "Mark as paid", "Export"). Bulk actions are permission-gated; actions the user cannot perform are not shown.

### 6.9 Row actions

Each row has a row-actions menu (an overflow icon) with the actions available for that row. Row actions are permission-gated. Frequently-used actions can be promoted to inline buttons (e.g., "Edit" as an outline button) with the rest in the overflow.

### 6.10 Sticky headers

Table headers are sticky: they remain visible when the table body scrolls. Sticky headers have `elevation.1` to visually separate from the body.

### 6.11 Responsive fallback

On tablet, the table shows fewer columns (the designer-defined priority columns). On mobile, the table collapses to a card list: each row becomes a card with the priority columns stacked vertically and the row-actions menu in the card header.

### 6.12 Arabic and English alignment

Tables are direction-aware: in RTL, the first column is on the right, columns flow right-to-left, and row actions appear on the left. Numeric columns are right-aligned in LTR and left-aligned in RTL (numbers always align toward the "end" side). Text columns are start-aligned. Header alignment matches cell alignment.

### 6.13 Keyboard navigation

Tables are fully keyboard-navigable: Tab moves between interactive elements (search, filters, headers, cells, row actions); arrow keys move within the table; Enter activates the focused action; Escape clears selection. The focus is always visible (2px `color.primary.500` ring).

### 6.14 Export only when authorized

Export (to CSV, Excel, or PDF) is a permission-gated action. The export button appears in the filter bar only if the user has `report.export` (or equivalent) permission. Export emits an audit event (`report.export`) with the export format, the filter state, and the row count.

---

## 7. Accessibility

### 7.1 WCAG 2.2 AA target

The platform targets **WCAG 2.2 AA** as a baseline. This is not a checkbox; it is a property of the design system and the implementation. Accessibility regressions are defects and are tracked with the same priority as security defects.

### 7.2 Keyboard navigation

Every interactive element is reachable by keyboard. The tab order is logical (top-to-bottom, start-to-end). The focus is always visible (2px `color.primary.500` ring, with sufficient contrast against the background). Modal and drawer focus is trapped (Tab cycles within the overlay). Escape closes overlays.

### 7.3 Visible focus

Focus indicators are never removed. The default browser outline is replaced with a 2px `color.primary.500` ring with a 2px offset. Focus indicators have sufficient contrast (≥3:1 against adjacent colours).

### 7.4 Sufficient contrast

All text meets **WCAG 2.2 AA contrast ratios**: 4.5:1 for normal text, 3:1 for large text (≥18px or ≥14px bold). The neutral palette and the semantic colours are designed to meet these ratios in both light and dark themes. Contrast is verified in CI using automated tooling.

### 7.5 Screen-reader labels

Every interactive element has an accessible name. Icon-only buttons have `aria-label`. Form fields have associated `<label>` elements. Status chips have `aria-label` that includes the status text. Decorative icons have `aria-hidden="true"`. Dynamic content changes (e.g., a table updating after a filter) are announced via `aria-live` regions.

### 7.6 Status not communicated through colour alone

Status is always communicated through **text + icon + colour**, never through colour alone. A red badge is also a "Suspended" badge with a pause icon. A green badge is also an "Active" badge with a check icon. This is verified in design review: a colour-blind user must be able to operate every screen.

### 7.7 Reduced-motion support

The platform respects `prefers-reduced-motion: reduce`. When set, all transitions are reduced to 1ms, all decorative motion is removed, and only essential motion (e.g., a drawer sliding in) remains, with a faster duration. The reduced-motion preference is a property of the user's operating system; the platform does not require the user to set it again in user preferences.

### 7.8 Touch-friendly targets

Touch targets are at least **44×44px** on tablet and mobile. This applies to buttons, chips, row-action buttons, and pagination controls. On desktop, the targets may be smaller (32×32px) because the pointer is more precise.

### 7.9 Desktop and tablet priority

The platform is designed **desktop-first and tablet-capable**. Mobile is supported for read-only and quick-action scenarios (e.g., a doctor checking tomorrow's schedule on their phone) but is not the primary surface. The responsive rules in `05_UI_UX/RESPONSIVE_RULES.md` apply; this brief affirms the priority order.

---

## 8. Branding and White Labelling

### 8.1 Ibn Hayan platform identity

The platform's default identity is **Ibn Hayan**. The brand mark is a stylised "H" in the primary teal-blue, set in a `radius.lg` square. The product name is set in IBM Plex Sans Arabic (Arabic) or Inter (English), `text.md`, weight 700. The brand mark and product name appear in the sidebar header.

### 8.2 Customer logo

Customers may supply a logo that replaces the brand mark in the sidebar header for their tenant. The customer logo must meet the platform's specifications: SVG or PNG, square aspect ratio, transparent background, monochrome or single-colour, maximum 40×40px display size. The customer logo replaces the brand mark; it does not appear alongside it.

### 8.3 Customer organisation name

The customer's organisation name appears below the product name in the sidebar header (e.g., "Al-Mansour Medical Group"). The organisation name is set in `text.xs`, `color.neutral.500`. The organisation name is supplied by the customer during onboarding and is editable by R13.

### 8.4 Restrained customer accent

Customers may supply a **restrained accent colour** that is used as the specialty accent (per §2.5) for all clinic types within their tenant. The customer accent must meet contrast requirements against the platform's neutral palette. The customer accent does not recolour the primary teal-blue, the semantic colours, or the buttons. The customer accent is the only customer-driven visual change.

### 8.5 No customer CSS injection

Customers cannot inject CSS. The customer's visual customisation is limited to: the logo, the organisation name, and the restrained accent colour. All other visual properties are governed by the platform design system. This restriction is non-negotiable; customer CSS injection would compromise the design system's integrity, the accessibility, and the security posture.

### 8.6 No full replacement of the platform design system

Customers cannot replace the platform design system. The component library, the typography, the spacing, the iconography, the motion, the table behaviour, the form patterns, the status patterns, and the navigation patterns are all platform-owned. The customer's brand is expressed within the platform's frame, not instead of it. This restriction is the difference between a white-label enterprise product and a custom-built website.

---

## 9. Anti-Patterns

The following anti-patterns are **explicitly prohibited** in the canonical implementation. They are listed here because they are common in healthcare software and in dashboard templates, and because the legacy prototypes exhibit several of them. Designers and engineers must reject these patterns at design review and at code review.

### 9.1 Excessive gradients

No element uses a gradient. Backgrounds are solid colours. Buttons are solid colours. Headers are solid colours. Gradients are decorative, not operational, and they age poorly.

### 9.2 Glowing surfaces

No element glows. Box-shadows are restrained (§2.8) and serve to communicate elevation, not to draw attention. A glowing button is a decoration, not a design.

### 9.3 Oversized rounded cards

Cards use `radius.lg` (12px), not `radius.full` or `radius.2xl` (24px+). Oversized rounded cards look like consumer apps, not enterprise software.

### 9.4 Generic dashboard templates

The platform does not look like a generic dashboard template (the kind sold on theme marketplaces). It looks like a healthcare operating system. The difference is in the density, the precision, the operational vocabulary, and the absence of decoration.

### 9.5 Random colour per card

KPI cards do not have a random colour per card. They use the primary teal-blue and the semantic colours consistently. A "rainbow dashboard" is a sign of an undisciplined design system.

### 9.6 Giant hero sections inside the authenticated product

The authenticated product has no hero sections. There is no full-width banner with a headline and a CTA. The product is operational; every screen gets to the point immediately. Hero sections are for marketing, not for daily-use software.

### 9.7 Decorative charts without decisions

Charts must inform a decision. A chart that shows "revenue over time" without context (no comparison, no target, no threshold) is decoration. Every chart must answer an operational question.

### 9.8 Excessive whitespace

Whitespace is generous where it aids comprehension, but not so generous that the user has to scroll to see the next actionable thing. The platform's density is calibrated for eight hours of daily use.

### 9.9 Tiny table text

Table text is `text.sm` (13px) minimum. `text.xs` (11px) is for helper text only, never for table cells. Tiny table text is unreadable at the end of an eight-hour shift.

### 9.10 Icon-only actions without labels or tooltips

Icon-only buttons must have a tooltip (or `aria-label`). An icon without a label is a guess; in healthcare, guesses are dangerous.

### 9.11 Unrelated visual identity per clinic type

Each clinic type does not get its own visual identity. The platform's visual identity is consistent across all clinic types; the only per-clinic-type variation is the restrained specialty accent (§2.5). The legacy prototype pattern of separate HTML files with separate sidebars and separate accent palettes per clinic type is rejected.

### 9.12 Gold-and-black "luxury" styling

The platform does not use gold-and-black "luxury" styling. Healthcare is not luxury; it is operational. The premium feel comes from discipline, not from ornamentation.

### 9.13 Glassmorphism

No element uses glassmorphism (translucent backgrounds with backdrop blur over complex content). Glassmorphism is fashionable, hard to read, and ages poorly. The platform uses solid surfaces.

### 9.14 Medical clichés used as decoration

The platform does not use stethoscopes, caducei, red crosses, or other medical clichés as decoration. The medical character is communicated through the operational vocabulary (encounters, orders, results, prescriptions), not through decorative iconography.

### 9.15 Visual density that hides operational information

The platform's density is calibrated for operational use. A design that hides operational information behind tabs, accordions, or "show more" patterns is wrong. The user should not have to click to see the things they need to do their job.

---
