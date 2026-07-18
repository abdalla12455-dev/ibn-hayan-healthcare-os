# Ibn Hayan Healthcare Operating System — Calculations

| Field | Value |
|---|---|
| Document Title | Calculations |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a calculation amendment, a regulatory tax change, or an ADR is ratified |
| Audience | Software architects, module owners, clinical informatics officers, finance leadership, compliance officers, business analysts |
| Scope | Calculation catalogue across all bounded contexts of Ibn Hayan; billing, payroll, tax, discount, medical score, dosage, analytics, KPI, multi-currency, multi-tax calculations; engine architecture, testing, audit |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-calculation serialization syntax, vendor-specific calculation libraries |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Calculation definitions in this document elaborate the configuration-driven commitments of PRODUCT_BIBLE Section 22 and the workflow engine philosophy of SYSTEM_ARCHITECTURE Section 16. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Calculations Overview
2. Calculation Definition Standard
3. Billing Calculations
4. Payroll & Compensation Calculations
5. Tax Calculations
6. Discount & Promotion Calculations
7. Medical Score Calculations
8. Dosage Calculations
9. Analytics & KPI Calculations
10. Calculation Engine Architecture
11. Calculation Testing & Validation
12. Calculation Audit Trail
13. Related Documents

---

## 1. Calculations Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for calculations used across the Ibn Hayan Healthcare Operating System. A calculation is a deterministic transformation of inputs to an output, governed by a defined formula and rounding rules. The platform uses calculations for billing totals, tax amounts, discounts, insurance adjudication, payroll, inventory valuation, clinical scores, medication dosages, analytics aggregations, and KPI computations. The calculation catalogue is part of the platform's contract surface: bounded-context commands, queries, events, and configuration schemas reference calculations by their canonical identifier.

The discipline around calculations reflects the platform's broader posture on configuration and customization (PRODUCT_BIBLE Section 22). A calculation is a configuration artefact governed by the configuration lifecycle; calculations are versioned, validated, and auditable, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. A calculation that requires source-level implementation is not a calculation in the platform's sense; it is a feature. The platform's commitment to configuration before customization (Principle P2) requires that the calculation catalogue be expressive enough to cover the platform's computational surface without recourse to source modification.

This document sits below `SYSTEM_ARCHITECTURE.md` and aligns with `PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy), Section 28 (Offline Strategy), and Section 31 (Security Philosophy). Sibling documents include `BUSINESS_RULES.md` (which catalogues the rules that invoke calculations), `STATUS_CODES.md` (which catalogues the status codes that calculations may transition), and `TERMINOLOGY.md` (which governs the code systems from which calculation inputs draw). Where this document and a sibling document appear to overlap, this document holds authority over calculation definitions and rounding rules; BUSINESS_RULES.md holds authority over the conditions that trigger calculations; TERMINOLOGY.md holds authority over the codes that calculations consume.

### 1.2 Calculations vs Other Computations

Calculations in Ibn Hayan are distinct from other computation types. A calculation is a deterministic transformation governed by a defined formula; the same inputs always produce the same output. A rule evaluation is a constraint check governed by a condition; the same inputs may produce different results depending on rule version and context. A workflow execution is a multi-step process governed by a workflow definition; the same inputs may produce different execution paths depending on conditions and events. The three computation types are governed by different frameworks and are not interchangeable.

The distinction matters because the three computation types have different semantics, different enforcement points, and different audit implications. A calculation is evaluated by the calculation engine at the point of a consequential computation; a rule is evaluated by the rule engine at the point of a consequential action; a workflow is executed by the workflow engine at the point of a multi-step process. Mixing the three produces contracts that are ambiguous and audit trails that cannot be interpreted. The discipline of separating them is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) applied to the calculation domain.

### 1.3 Calculation Coverage

The calculation catalogue covers all bounded contexts of Ibn Hayan. Billing calculations govern invoice subtotals, taxes, discounts, and totals. Payroll and compensation calculations govern gross pay, deductions, and net pay. Tax calculations govern VAT, GST, sales tax, withholding, and excise. Discount and promotion calculations govern discount amounts, promotion eligibility, and stacked discount resolution. Medical score calculations govern clinical scores (BMI, GFR, ASCVD risk, MELD, CHADS-VASc, etc.). Dosage calculations govern pediatric weight-based dosing, renal-adjusted dosing, and infusion rate calculations. Analytics and KPI calculations govern aggregations, ratios, and trend computations.

The coverage is documented per calculation category in Sections 3 through 9 of this document. Each section catalogues the calculations in the corresponding category, with the calculation's canonical identifier, name, owning module, inputs, formula description (conceptual, not code), output, rounding rules, and configuration surface. The catalogue is the binding reference for module specifications and integration contracts; a calculation referenced by a module specification must be present in this catalogue.

### 1.4 Calculation Posture

Ibn Hayan adopts a posture of disciplined calculation management. Four commitments govern this posture. First, calculations are declarative: a calculation expresses what is computed, not how it is implemented; the calculation engine determines the implementation. Second, calculations are versioned: a calculation change is a new version of the calculation, with the previous version retained for historical record interpretation. Third, calculations are auditable: every calculation evaluation is recorded in the audit trail, including the calculation, the inputs, the output, and the rounding applied. Fourth, calculations are governed: a calculation change is a configuration action ratified through the Architecture Council process.

The four commitments are the architectural floor for calculation management in Ibn Hayan. A module that implements a calculation in source code is defective; the calculation must be declared in the calculation catalogue and evaluated by the calculation engine. A module that evaluates a calculation without audit is defective; the calculation evaluation must be recorded in the audit trail. A module that uses an unregistered calculation is defective; the calculation must be present in the catalogue. The configuration service enforces these commitments at validation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.5 Ibn Hayan Identity and Calculations

Calculations are part of the structural vocabulary by which Ibn Hayan maintains its one-platform identity (PRODUCT_BIBLE Section 1.5). A calculation recorded in a small clinic is the same calculation recorded in a multi-national hospital network; the platform's calculation engine treats them identically. This consistency is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to the calculation domain. Where regional variation requires different calculation semantics (for example, a regional tax calculation may use a different rate or a different rounding rule), the variation is expressed through calculation parameters and regional calculation overlays registered through the Architecture Council, not through region-specific calculation forks.

---

## 2. Calculation Definition Standard

### 2.1 Calculation Naming Conventions

Calculation names in Ibn Hayan follow a documented naming convention. The calculation's canonical identifier is a stable code of the form `CALC-{module}-{category}-{sequence}` (for example, `CALC-BC07-BIL-003` for the third billing calculation in the Billing bounded context). The calculation's display name is a human-readable summary of the calculation's intent (for example, "Invoice Subtotal Calculation"). The calculation's description is a one-sentence statement of the calculation's purpose, including the inputs, the output, and the formula's intent. The three identifiers are stable; renaming a calculation follows the deprecation policy documented in Section 11 (cross-reference BUSINESS_RULES.md Section 11 for the parallel deprecation discipline).

The naming convention is enforced by the Architecture Council at calculation registration. A calculation that does not follow the convention is rejected; the rejection is recorded with the rationale. The convention is the structural mechanism by which the platform's calculation catalogue remains coherent and navigable across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 2.2 Calculation Metadata

Each calculation is registered with a defined set of metadata. The metadata records the calculation's canonical identifier, display name, description, owning module, owning bounded context, category (billing, payroll, tax, discount, medical score, dosage, analytics, KPI), inputs (with each input's name, type, source, and validation rule), formula description (conceptual, not code), output (with name, type, unit, and rounding rule), configuration surface, version, status (Active, Deprecated, Retired), and the ADR that ratified the calculation. The metadata is the calculation's authoritative definition; downstream consumers reference the metadata, not ad hoc definitions in module specifications.

The metadata is versioned. A change to the metadata (modifying the formula, modifying the inputs, modifying the rounding rule, deprecating the calculation) is a new version of the calculation. The previous version is retained for historical record interpretation. The metadata's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5, ensuring that the platform's calculation adoption history is recoverable indefinitely.

### 2.3 Formula Description Standard

Each calculation's formula is documented as a conceptual description, not as source code. The description specifies the inputs, the operations applied to the inputs, the order of operations, the intermediate values, and the output. The description is sufficient for an implementer to produce a correct implementation in any technology, and is sufficient for an auditor to verify that a recorded calculation result was produced correctly. The description does not include implementation details such as variable names, function calls, or library references.

The formula description standard is the architectural expression of the platform's technology-agnostic posture (SYSTEM_ARCHITECTURE Section 1.4). A calculation that is documented in a specific technology is coupled to that technology's lifecycle, which is shorter than the platform's required lifecycle. The platform therefore commits to formula descriptions that are independent of technology, in keeping with Principle P18 (Decade-Horizon Viability). The standard is also the structural mechanism by which the platform's calculation catalogue remains implementable across the platform's technology evolution.

### 2.4 Rounding Rules

Each calculation declares its rounding rules. The rounding rules specify the rounding policy (HalfUp, HalfEven, HalfDown, Up, Down), the precision (number of decimal places), the rounding unit (for example, round to the nearest 0.05 for cash transactions in some currencies), and the rounding order (when intermediate values are rounded). The rounding rules are part of the calculation's metadata and are enforced by the calculation engine at evaluation time.

The rounding rules discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the calculation domain. A calculation that is rounded inconsistently across evaluations produces results that cannot be compared; the platform's posture is that rounding is deterministic, with the same inputs and the same rounding rules producing the same output. The discipline is also the structural mechanism by which the platform's calculation results are reproducible: an audit record that references a calculation result can be reproduced by re-evaluating the calculation against the recorded inputs and rounding rules, producing the same output.

### 2.5 Calculation Configuration Surface

Each calculation declares its configuration surface: the parameters that may be configured per tenant, per facility, or per region, and the parameters that are fixed at the platform level. For example, a tax calculation may permit the tenant to configure the tax rate (where the rate is region-specific) but not the rounding rule (which is platform-standard); a dosage calculation may permit the tenant to configure the weight-based dosing table but not the formula structure. The configuration surface is documented in the calculation's metadata and is governed by the configuration layer model documented in SYSTEM_ARCHITECTURE Section 15.2.

The configuration surface discipline is the architectural expression of Principle P2 (Configuration Before Customization) applied to the calculation domain. A calculation whose parameters are hard-coded in source code is defective; the parameters must be exposed through the configuration surface. A calculation whose configuration surface is overly broad (permitting the tenant to modify the formula structure where the structure is regulated) is defective; the configuration surface must be scoped to parameters that the tenant may legitimately vary. The discipline is the structural mechanism by which the platform balances configurability with calculation integrity.

---

## 3. Billing Calculations

### 3.1 Invoice Line Calculations

Invoice line calculations govern the computation of line-level amounts on an invoice. The calculations are owned by the Billing bounded context (BC07) and are referenced by the invoice workflow documented in CLINICAL_WORKFLOWS.md. The calculations default to Enforced rounding rules; relaxation is prohibited where rounding affects financial integrity.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-BIL-001 | Line Subtotal | BC07 | Quantity, unit price | Multiply quantity by unit price | Line subtotal amount | HalfUp to 2 decimal places | Unit price source configurable per tenant |
| CALC-BC07-BIL-002 | Line Discount | BC07 | Line subtotal, discount rate | Multiply line subtotal by discount rate | Line discount amount | HalfUp to 2 decimal places | Discount rate configurable per tenant and payer |
| CALC-BC07-BIL-003 | Line Tax | BC07 | (Line subtotal minus line discount), tax rate | Multiply taxable amount by tax rate | Line tax amount | HalfUp to 2 decimal places | Tax rate configurable per region |
| CALC-BC07-BIL-004 | Line Total | BC07 | Line subtotal, line discount, line tax | Subtract line discount from line subtotal, add line tax | Line total amount | HalfUp to 2 decimal places | — |
| CALC-BC07-BIL-005 | Insurance Co-pay | BC07 | Line total, co-pay rate | Multiply line total by co-pay rate | Co-pay amount | HalfUp to 2 decimal places | Co-pay rate configurable per payer |

### 3.2 Invoice Total Calculations

Invoice total calculations govern the computation of invoice-level totals from line-level amounts. The calculations are owned by the Billing bounded context (BC07) and are referenced by the invoice workflow.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-BIL-011 | Invoice Subtotal | BC07 | All line subtotals | Sum all line subtotals | Invoice subtotal | HalfUp to 2 decimal places | — |
| CALC-BC07-BIL-012 | Invoice Discount | BC07 | All line discounts, invoice-level discount | Sum all line discounts, add invoice-level discount | Invoice discount total | HalfUp to 2 decimal places | Invoice-level discount configurable per tenant |
| CALC-BC07-BIL-013 | Invoice Tax | BC07 | All line taxes | Sum all line taxes | Invoice tax total | HalfUp to 2 decimal places | — |
| CALC-BC07-BIL-014 | Invoice Total | BC07 | Invoice subtotal, invoice discount, invoice tax | Subtract invoice discount from invoice subtotal, add invoice tax | Invoice total | HalfUp to 2 decimal places | — |
| CALC-BC07-BIL-015 | Invoice Amount Due | BC07 | Invoice total, prior payments, current payments | Subtract prior and current payments from invoice total | Amount due | HalfUp to 2 decimal places | — |

### 3.3 Insurance Claim Calculations

Insurance claim calculations govern the computation of claim amounts, allowed amounts, and adjustments. The calculations are owned by the Billing bounded context (BC07) and are referenced by the claim workflow documented in CLINICAL_WORKFLOWS.md.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-BIL-021 | Claim Submission Amount | BC07 | All invoice line totals for claim | Sum all line totals attributable to the claim | Claim submission amount | HalfUp to 2 decimal places | — |
| CALC-BC07-BIL-022 | Allowed Amount | BC07 | Submitted amount, payer fee schedule | Apply payer fee schedule to submitted amount | Allowed amount | HalfUp to 2 decimal places | Fee schedule configurable per payer |
| CALC-BC07-BIL-023 | Adjustment Amount | BC07 | Submitted amount, allowed amount | Subtract allowed amount from submitted amount | Adjustment amount | HalfUp to 2 decimal places | — |
| CALC-BC07-BIL-024 | Patient Responsibility | BC07 | Allowed amount, co-pay, co-insurance, deductible | Apply co-pay, co-insurance, and deductible to allowed amount | Patient responsibility amount | HalfUp to 2 decimal places | Co-pay, co-insurance, deductible configurable per payer |
| CALC-BC07-BIL-025 | Insurer Payment | BC07 | Allowed amount, patient responsibility | Subtract patient responsibility from allowed amount | Insurer payment amount | HalfUp to 2 decimal places | — |
| CALC-BC07-BIL-026 | Deductible Remaining | BC07 | Prior deductible met, deductible amount | Subtract prior deductible met from deductible amount | Deductible remaining | HalfUp to 2 decimal places | Deductible amount configurable per payer |

### 3.4 Multi-Currency Calculations

Multi-currency calculations govern the conversion of amounts between currencies. The calculations are owned by the Billing bounded context (BC07) and the Accounting bounded context (BC08) jointly. The calculations interact with the regional profile (PRODUCT_BIBLE Section 25.3) for exchange rate source selection.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-BIL-031 | Currency Conversion | BC07 | Source amount, source currency, target currency, exchange rate | Multiply source amount by exchange rate | Target amount | HalfUp to 2 decimal places (or per target currency precision) | Exchange rate source configurable per tenant |
| CALC-BC07-BIL-032 | Currency Rounding | BC07 | Amount, currency | Apply currency-specific rounding (e.g., 0 decimal places for JPY) | Rounded amount | Per currency | Currency precision table configurable per tenant |
| CALC-BC07-BIL-033 | Exchange Rate Spread | BC07 | Mid-market rate, spread percentage | Multiply mid-market rate by (1 plus or minus spread) | Buy or sell rate | HalfUp to 6 decimal places | Spread configurable per tenant |

### 3.5 Aging Calculations

Aging calculations govern the computation of invoice aging for accounts receivable management. The calculations are owned by the Billing bounded context (BC07) and the Accounting bounded context (BC08) jointly.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-BIL-041 | Invoice Age | BC07 | Invoice issue date, current date | Subtract issue date from current date | Age in days | Integer | — |
| CALC-BC07-BIL-042 | Aging Bucket | BC07 | Invoice age, bucket thresholds | Categorize age into bucket (current, 1-30, 31-60, 61-90, 90+) | Bucket identifier | — | Bucket thresholds configurable per tenant |
| CALC-BC07-BIL-043 | Outstanding Balance | BC07 | Invoice total, payments received | Subtract payments from invoice total | Outstanding balance | HalfUp to 2 decimal places | — |

---

## 4. Payroll & Compensation Calculations

### 4.1 Gross Pay Calculations

Gross pay calculations govern the computation of an employee's gross pay for a pay period. The calculations are owned by the HR bounded context (BC12) and interact with the Workforce bounded context (BC10) for time and attendance data. The calculations default to Enforced rounding rules; relaxation is prohibited where rounding affects payroll integrity.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC12-PAY-001 | Salaried Gross Pay | BC12 | Annual salary, pay period frequency | Divide annual salary by number of pay periods per year | Period gross pay | HalfUp to 2 decimal places | Pay period frequency configurable per tenant |
| CALC-BC12-PAY-002 | Hourly Gross Pay | BC12 | Hours worked, hourly rate | Multiply hours worked by hourly rate | Period gross pay | HalfUp to 2 decimal places | Hourly rate configurable per employee |
| CALC-BC12-PAY-003 | Overtime Pay | BC12 | Overtime hours, hourly rate, overtime multiplier | Multiply overtime hours by hourly rate by overtime multiplier | Overtime pay | HalfUp to 2 decimal places | Overtime multiplier configurable per region |
| CALC-BC12-PAY-004 | Shift Differential | BC12 | Shift hours, base rate, differential rate | Multiply shift hours by (base rate plus differential rate) | Shift differential pay | HalfUp to 2 decimal places | Differential rate configurable per shift type |
| CALC-BC12-PAY-005 | Bonus Pay | BC12 | Bonus amount | Apply bonus amount to period gross pay | Bonus pay | HalfUp to 2 decimal places | Bonus authorization required per occurrence |

### 4.2 Deduction Calculations

Deduction calculations govern the computation of pre-tax and post-tax deductions from gross pay. The calculations are owned by the HR bounded context (BC12).

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC12-PAY-011 | Tax-Deferred Retirement | BC12 | Gross pay, contribution rate | Multiply gross pay by contribution rate, capped at regulatory limit | Pre-tax deduction | HalfUp to 2 decimal places | Contribution rate configurable per employee |
| CALC-BC12-PAY-012 | Health Insurance Premium | BC12 | Premium amount, employee share rate | Multiply premium by employee share rate | Pre-tax deduction | HalfUp to 2 decimal places | Premium and share rate configurable per tenant |
| CALC-BC12-PAY-013 | Garnishment | BC12 | Gross pay, garnishment rate, garnishment cap | Multiply gross pay by garnishment rate, capped at garnishment cap | Post-tax deduction | HalfUp to 2 decimal places | Garnishment rate and cap configurable per legal order |
| CALC-BC12-PAY-014 | Union Dues | BC12 | Gross pay, dues rate | Multiply gross pay by dues rate | Post-tax deduction | HalfUp to 2 decimal places | Dues rate configurable per employee |

### 4.3 Net Pay Calculation

Net pay calculation governs the computation of an employee's net pay after all deductions. The calculation is owned by the HR bounded context (BC12) and is the final calculation in the payroll workflow.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC12-PAY-021 | Taxable Income | BC12 | Gross pay, pre-tax deductions | Subtract pre-tax deductions from gross pay | Taxable income | HalfUp to 2 decimal places | — |
| CALC-BC12-PAY-022 | Total Tax Withholding | BC12 | Taxable income, tax brackets | Apply tax brackets to taxable income | Total tax withholding | HalfUp to 2 decimal places | Tax brackets configurable per region |
| CALC-BC12-PAY-023 | Net Pay | BC12 | Gross pay, pre-tax deductions, tax withholding, post-tax deductions | Subtract pre-tax deductions, tax withholding, and post-tax deductions from gross pay | Net pay | HalfUp to 2 decimal places | — |

### 4.4 Leave Accrual Calculations

Leave accrual calculations govern the computation of an employee's leave balance accrual. The calculations are owned by the HR bounded context (BC12) and interact with the Workforce bounded context (BC10) for leave usage data.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC12-PAY-031 | Leave Accrual | BC12 | Hours worked, accrual rate | Multiply hours worked by accrual rate | Accrued leave hours | HalfUp to 2 decimal places (hours) | Accrual rate configurable per leave type and tenure |
| CALC-BC12-PAY-032 | Leave Balance | BC12 | Prior balance, accrued leave, used leave | Add accrued leave to prior balance, subtract used leave | Current leave balance | HalfUp to 2 decimal places (hours) | — |
| CALC-BC12-PAY-033 | Leave Payout | BC12 | Leave balance, hourly rate, payout rate | Multiply leave balance by hourly rate by payout rate | Leave payout amount | HalfUp to 2 decimal places | Payout rate configurable per tenant |

---

## 5. Tax Calculations

### 5.1 Sales and Value-Added Tax Calculations

Sales and value-added tax calculations govern the computation of tax amounts on invoices. The calculations are owned by the Billing bounded context (BC07) and interact with the regional profile (PRODUCT_BIBLE Section 25.3) for tax rate and tax rule selection.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-TAX-001 | VAT Calculation | BC07 | Taxable amount, VAT rate | Multiply taxable amount by VAT rate | VAT amount | HalfUp to 2 decimal places | VAT rate configurable per region |
| CALC-BC07-TAX-002 | GST Calculation | BC07 | Taxable amount, GST rate | Multiply taxable amount by GST rate | GST amount | HalfUp to 2 decimal places | GST rate configurable per region |
| CALC-BC07-TAX-003 | Sales Tax Calculation | BC07 | Taxable amount, sales tax rate (combined state, county, local) | Multiply taxable amount by combined sales tax rate | Sales tax amount | HalfUp to 2 decimal places | Tax rates configurable per jurisdiction |
| CALC-BC07-TAX-004 | Tax Exemption Application | BC07 | Taxable amount, exemption reason | Apply exemption (zero rate or reduced rate) based on exemption reason | Adjusted tax amount | HalfUp to 2 decimal places | Exemption rules configurable per region |
| CALC-BC07-TAX-005 | Compound Tax Calculation | BC07 | Taxable amount, tax rates (in sequence) | Apply each tax rate in sequence to the running amount | Total tax amount | HalfUp to 2 decimal places | Tax sequence configurable per region |

### 5.2 Withholding Tax Calculations

Withholding tax calculations govern the computation of withholding amounts for payroll and for payments to non-resident vendors. The calculations are owned by the HR bounded context (BC12) for payroll withholding and by the Accounting bounded context (BC08) for vendor withholding.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC12-TAX-011 | Income Tax Withholding | BC12 | Taxable income, tax brackets, filing status | Apply tax brackets to taxable income based on filing status | Withholding amount | HalfUp to 2 decimal places | Tax brackets and filing statuses configurable per region |
| CALC-BC12-TAX-012 | Social Security Withholding | BC12 | Gross pay, SS rate, SS wage cap | Multiply gross pay by SS rate, capped at SS wage cap | SS withholding | HalfUp to 2 decimal places | Rate and cap configurable per region |
| CALC-BC12-TAX-013 | Medicare Withholding | BC12 | Gross pay, Medicare rate, additional Medicare threshold | Apply Medicare rate, plus additional rate above threshold | Medicare withholding | HalfUp to 2 decimal places | Rate and threshold configurable per region |
| CALC-BC08-TAX-014 | Vendor Withholding | BC08 | Payment amount, withholding rate | Multiply payment amount by withholding rate | Withholding amount | HalfUp to 2 decimal places | Rate configurable per vendor and region |

### 5.3 Excise and Specialty Tax Calculations

Excise and specialty tax calculations govern the computation of excise taxes and other specialty taxes (for example, medical device excise, tanning services excise). The calculations are owned by the Billing bounded context (BC07) and the Accounting bounded context (BC08) jointly.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-TAX-021 | Excise Tax | BC07 | Quantity, excise rate per unit | Multiply quantity by excise rate per unit | Excise tax amount | HalfUp to 2 decimal places | Rate configurable per region and product |
| CALC-BC07-TAX-022 | Luxury Tax | BC07 | Amount, luxury tax threshold, luxury tax rate | Apply luxury tax rate to amount above threshold | Luxury tax amount | HalfUp to 2 decimal places | Threshold and rate configurable per region |
| CALC-BC08-TAX-023 | Use Tax | BC08 | Purchase amount, use tax rate | Multiply purchase amount by use tax rate | Use tax amount | HalfUp to 2 decimal places | Rate configurable per region |

### 5.4 Tax Reversal and Adjustment Calculations

Tax reversal and adjustment calculations govern the computation of tax amounts for credit notes, refunds, and period adjustments. The calculations are owned by the Billing bounded context (BC07) and the Accounting bounded context (BC08) jointly.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-TAX-031 | Tax Reversal | BC07 | Original tax amount, reversal reason | Reverse original tax amount (negative) | Reversed tax amount | HalfUp to 2 decimal places | — |
| CALC-BC07-TAX-032 | Tax Adjustment | BC07 | Original tax amount, adjusted tax amount | Compute difference between original and adjusted | Adjustment amount | HalfUp to 2 decimal places | — |
| CALC-BC08-TAX-033 | Period Tax Reconciliation | BC08 | Period tax collected, period tax remitted | Compute difference between collected and remitted | Reconciliation difference | HalfUp to 2 decimal places | — |

---

## 6. Discount & Promotion Calculations

### 6.1 Discount Calculations

Discount calculations govern the computation of discount amounts on invoices and invoice lines. The calculations are owned by the Billing bounded context (BC07).

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-DSC-001 | Percentage Discount | BC07 | Amount, discount percentage | Multiply amount by discount percentage | Discount amount | HalfUp to 2 decimal places | Discount percentage configurable per tenant and payer |
| CALC-BC07-DSC-002 | Fixed Amount Discount | BC07 | Amount, discount amount | Subtract discount amount from amount (not below zero) | Discounted amount | HalfUp to 2 decimal places | Discount amount configurable per tenant |
| CALC-BC07-DSC-003 | Tiered Discount | BC07 | Amount, tier thresholds, tier rates | Identify applicable tier, multiply amount by tier rate | Discount amount | HalfUp to 2 decimal places | Tier thresholds and rates configurable per tenant |
| CALC-BC07-DSC-004 | Volume Discount | BC07 | Quantity, volume thresholds, volume rates | Identify applicable volume tier, multiply amount by volume rate | Discount amount | HalfUp to 2 decimal places | Volume thresholds and rates configurable per tenant |
| CALC-BC07-DSC-005 | Bundled Service Discount | BC07 | Bundle composition, bundle discount rate | Apply bundle discount rate to bundle total | Discount amount | HalfUp to 2 decimal places | Bundle composition and rate configurable per tenant |

### 6.2 Promotion Calculations

Promotion calculations govern the computation of promotion-related discounts, including eligibility, stacking, and expiry. The calculations are owned by the Billing bounded context (BC07).

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC07-DSC-011 | Promotion Eligibility | BC07 | Service, patient, promotion rules | Evaluate eligibility based on service, patient, and rules | Eligibility flag | — | Promotion rules configurable per tenant |
| CALC-BC07-DSC-012 | Stacked Discount Resolution | BC07 | Multiple applicable discounts, stacking rules | Apply stacking rules to determine final discount | Final discount amount | HalfUp to 2 decimal places | Stacking rules configurable per tenant |
| CALC-BC07-DSC-013 | Promotion Expiry Check | BC07 | Promotion, current date | Verify promotion is within valid date range | Expiry flag | — | Promotion date range configurable per promotion |
| CALC-BC07-DSC-014 | Promotion Budget Tracking | BC07 | Promotion, current cumulative discount, budget cap | Verify cumulative discount has not exceeded budget cap | Budget remaining | HalfUp to 2 decimal places | Budget cap configurable per promotion |

### 6.3 Loyalty and Membership Calculations

Loyalty and membership calculations govern the computation of loyalty-program and membership discounts. The calculations are owned by the CRM bounded context (BC11) for loyalty program management and by the Billing bounded context (BC07) for discount application.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC11-DSC-021 | Loyalty Points Earned | BC11 | Transaction amount, points rate | Multiply transaction amount by points rate | Loyalty points | Integer | Points rate configurable per tenant |
| CALC-BC11-DSC-022 | Loyalty Points Redemption | BC11 | Points redeemed, points value | Multiply points redeemed by points value | Redemption amount | HalfUp to 2 decimal places | Points value configurable per tenant |
| CALC-BC07-DSC-023 | Membership Discount | BC07 | Amount, membership tier, tier discount rate | Multiply amount by tier discount rate | Discount amount | HalfUp to 2 decimal places | Tier rates configurable per tenant |

---

## 7. Medical Score Calculations

### 7.1 Anthropometric Score Calculations

Anthropometric score calculations govern the computation of body-measurement-based scores. The calculations are owned by the Orders & Results bounded context (BC04) and the Clinical Documentation bounded context (BC03) jointly.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC04-MED-001 | BMI | BC04 | Weight (kg), height (m) | Divide weight by height squared | BMI (kg/m²) | HalfUp to 1 decimal place | — |
| CALC-BC04-MED-002 | BMI Percentile (Pediatric) | BC04 | BMI, age, sex, growth chart | Identify percentile from growth chart based on BMI, age, sex | Percentile | Integer | Growth chart source configurable per region |
| CALC-BC04-MED-003 | Body Surface Area | BC04 | Weight (kg), height (cm) | Apply Mosteller formula: square root of (weight × height / 3600) | BSA (m²) | HalfUp to 2 decimal places | Formula variant configurable per tenant |
| CALC-BC04-MED-004 | Ideal Body Weight | BC04 | Height, sex | Apply Devine formula (sex-specific) | IBW (kg) | HalfUp to 1 decimal place | Formula variant configurable per tenant |
| CALC-BC04-MED-005 | Adjusted Body Weight | BC04 | Actual weight, IBW | Apply formula: IBW + 0.4 × (actual weight − IBW) | Adjusted weight (kg) | HalfUp to 1 decimal place | — |

### 7.2 Renal Function Calculations

Renal function calculations govern the computation of kidney-function scores used for dosage adjustment and clinical assessment. The calculations are owned by the Orders & Results bounded context (BC04).

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC04-MED-011 | eGFR (CKD-EPI) | BC04 | Serum creatinine, age, sex, race | Apply CKD-EPI formula | eGFR (mL/min/1.73m²) | HalfUp to 1 decimal place | Formula version configurable per tenant |
| CALC-BC04-MED-012 | Creatinine Clearance (Cockcroft-Gault) | BC04 | Serum creatinine, age, weight, sex | Apply Cockcroft-Gault formula | CrCl (mL/min) | HalfUp to 1 decimal place | — |
| CALC-BC04-MED-013 | Urine Albumin-to-Creatinine Ratio | BC04 | Urine albumin, urine creatinine | Divide urine albumin by urine creatinine | ACR (mg/g) | HalfUp to 1 decimal place | — |

### 7.3 Cardiovascular Risk Calculations

Cardiovascular risk calculations govern the computation of cardiovascular-risk scores used for preventive care. The calculations are owned by the Clinical Documentation bounded context (BC03).

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC03-MED-021 | ASCVD Risk | BC03 | Age, sex, race, total cholesterol, HDL, systolic BP, BP treatment, diabetes, smoker | Apply Pooled Cohort Equations | 10-year ASCVD risk (%) | HalfUp to 1 decimal place | Equation version configurable per tenant |
| CALC-BC03-MED-022 | CHA2DS2-VASc | BC03 | CHF, hypertension, age ≥75, diabetes, stroke/TIA, vascular disease, age 65-74, sex | Sum points per risk factor | Score (0-9) | Integer | — |
| CALC-BC03-MED-023 | HAS-BLED | BC03 | Hypertension, abnormal renal/liver, stroke, bleeding, labile INR, elderly, drugs/alcohol | Sum points per risk factor | Score (0-9) | Integer | — |
| CALC-BC03-MED-024 | Framingham Risk | BC03 | Age, sex, total cholesterol, HDL, systolic BP, BP treatment, smoker | Apply Framingham formula | 10-year CHD risk (%) | HalfUp to 1 decimal place | — |

### 7.4 Other Clinical Scores

Other clinical scores govern the computation of clinical scores not covered by the preceding categories. The calculations are owned by the Clinical Documentation bounded context (BC03) and the Orders & Results bounded context (BC04) jointly.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC03-MED-031 | MELD Score | BC03 | Bilirubin, INR, creatinine, sodium | Apply MELD formula | Score (6-40) | Integer | Formula version configurable per tenant |
| CALC-BC03-MED-032 | Glasgow Coma Scale | BC03 | Eye, verbal, motor responses | Sum component scores | Score (3-15) | Integer | — |
| CALC-BC03-MED-033 | APACHE II | BC03 | Physiological parameters, age, chronic health | Sum component scores | Score (0-71) | Integer | — |
| CALC-BC04-MED-034 | Anion Gap | BC04 | Sodium, chloride, bicarbonate | Compute: sodium − (chloride + bicarbonate) | Anion gap (mEq/L) | Integer | — |
| CALC-BC04-MED-035 | Corrected Sodium | BC04 | Measured sodium, glucose | Apply formula: sodium + 0.024 × (glucose − 100) | Corrected sodium (mEq/L) | Integer | — |
| CALC-BC04-MED-036 | Corrected Calcium | BC04 | Measured calcium, albumin | Apply formula: calcium + 0.8 × (4.0 − albumin) | Corrected calcium (mg/dL) | HalfUp to 1 decimal place | — |

---

## 8. Dosage Calculations

### 8.1 Weight-Based Dosage Calculations

Weight-based dosage calculations govern the computation of medication dosages based on patient weight. The calculations are owned by the Pharmacy bounded context (BC05) and interact with the Orders & Results bounded context (BC04) for patient weight data.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC05-DOS-001 | Pediatric Weight-Based Dose | BC05 | Weight (kg), dose per kg, frequency, max daily dose | Multiply weight by dose per kg; cap at max daily dose | Dose per administration | Per medication's dosing rules | Dose per kg configurable per medication |
| CALC-BC05-DOS-002 | Adult Weight-Based Dose | BC05 | Weight (kg), dose per kg, max single dose | Multiply weight by dose per kg; cap at max single dose | Dose per administration | Per medication's dosing rules | Dose per kg configurable per medication |
| CALC-BC05-DOS-003 | BSA-Based Dose | BC05 | BSA (m²), dose per m² | Multiply BSA by dose per m² | Dose per administration | Per medication's dosing rules | Dose per m² configurable per medication |
| CALC-BC05-DOS-004 | Renal-Adjusted Dose | BC05 | Standard dose, renal function (eGFR/CrCl), adjustment table | Apply adjustment based on renal function | Adjusted dose | Per medication's dosing rules | Adjustment table configurable per medication |

### 8.2 Infusion Rate Calculations

Infusion rate calculations govern the computation of intravenous infusion rates. The calculations are owned by the Pharmacy bounded context (BC05).

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC05-DOS-011 | Infusion Rate (mL/hr) | BC05 | Dose per time, concentration, weight (for weight-based) | Divide dose per time by concentration (with weight factor if applicable) | Rate (mL/hr) | HalfUp to 1 decimal place | — |
| CALC-BC05-DOS-012 | Infusion Duration | BC05 | Volume, rate | Divide volume by rate | Duration (hours) | HalfUp to 2 decimal places | — |
| CALC-BC05-DOS-013 | Drop Rate | BC05 | Volume, duration, drop factor | Multiply (volume / duration in minutes) by drop factor | Drops per minute | Integer | Drop factor configurable per administration set |
| CALC-BC05-DOS-014 | Medication Concentration | BC05 | Medication amount, diluent volume | Divide medication amount by diluent volume | Concentration | Per medication's unit | — |

### 8.3 Unit Conversion Calculations

Unit conversion calculations govern the conversion of medication amounts between units. The calculations are owned by the Pharmacy bounded context (BC05).

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC05-DOS-021 | Unit Conversion | BC05 | Amount, source unit, target unit, conversion factor | Multiply amount by conversion factor | Amount in target unit | Per medication's unit | Conversion factors configurable per medication |
| CALC-BC05-DOS-022 | Percentage to Absolute | BC05 | Percentage, total amount | Multiply percentage by total amount, divide by 100 | Absolute amount | HalfUp to 4 decimal places | — |
| CALC-BC05-DOS-023 | Ratio to Absolute | BC05 | Ratio (e.g., 1:1000), total volume | Apply ratio to total volume | Absolute amount | HalfUp to 4 decimal places | — |

### 8.4 Dosage Safety Calculations

Dosage safety calculations govern the computation of dosage safety checks. The calculations are owned by the Pharmacy bounded context (BC05) and are referenced by the medication safety business rules documented in BUSINESS_RULES.md Section 4.2.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-BC05-DOS-031 | Dose Range Check | BC05 | Ordered dose, min dose, max dose | Verify ordered dose is within range | In-range flag | — | Dose range configurable per medication |
| CALC-BC05-DOS-032 | Daily Dose Total | BC05 | Single dose, frequency per day | Multiply single dose by frequency per day | Daily dose | Per medication's unit | Frequency configurable per order |
| CALC-BC05-DOS-033 | Cumulative Dose | BC05 | All doses in period, period duration | Sum doses in period | Cumulative dose | Per medication's unit | Period configurable per check |
| CALC-BC05-DOS-034 | Therapeutic Index | BC05 | Dose, therapeutic minimum, toxic minimum | Compute ratio of dose to therapeutic and toxic minimums | Index | HalfUp to 2 decimal places | Therapeutic and toxic minimums configurable per medication |

---

## 9. Analytics & KPI Calculations

### 9.1 Operational KPI Calculations

Operational KPI calculations govern the computation of operational performance metrics. The calculations are owned by the Reporting bounded context (deployable expression of the Reporting Layer per SYSTEM_ARCHITECTURE Section 28) and interact with multiple bounded contexts for source data.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-REP-KPI-001 | Appointment No-Show Rate | Reports | No-show appointments, total appointments | Divide no-show appointments by total appointments | Rate (%) | HalfUp to 2 decimal places | Period configurable per report |
| CALC-REP-KPI-002 | Average Wait Time | Reports | Wait times, encounter count | Divide sum of wait times by encounter count | Average (minutes) | HalfUp to 1 decimal place | Period configurable per report |
| CALC-REP-KPI-003 | Bed Occupancy Rate | Reports | Occupied bed-days, available bed-days | Divide occupied bed-days by available bed-days | Rate (%) | HalfUp to 2 decimal places | Period configurable per report |
| CALC-REP-KPI-004 | Average Length of Stay | Reports | Patient-days, discharges | Divide patient-days by discharges | Average (days) | HalfUp to 2 decimal places | Period configurable per report |
| CALC-REP-KPI-005 | Order Turnaround Time | Reports | Order times, result times | Average (result time − order time) | Average (minutes) | HalfUp to 1 decimal place | Period and order type configurable per report |

### 9.2 Financial KPI Calculations

Financial KPI calculations govern the computation of financial performance metrics. The calculations are owned by the Reporting bounded context and interact with the Billing and Accounting bounded contexts.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-REP-KPI-011 | Days in Accounts Receivable | Reports | Accounts receivable, average daily charges | Divide accounts receivable by average daily charges | Days | HalfUp to 1 decimal place | Period configurable per report |
| CALC-REP-KPI-012 | Claim Denial Rate | Reports | Denied claims, submitted claims | Divide denied claims by submitted claims | Rate (%) | HalfUp to 2 decimal places | Period and payer configurable per report |
| CALC-REP-KPI-013 | Net Collection Rate | Reports | Payments collected, amounts allowed | Divide payments collected by amounts allowed | Rate (%) | HalfUp to 2 decimal places | Period configurable per report |
| CALC-REP-KPI-014 | Operating Margin | Reports | Operating income, operating revenue | Divide operating income by operating revenue | Margin (%) | HalfUp to 2 decimal places | Period configurable per report |
| CALC-REP-KPI-015 | Cost per Encounter | Reports | Total operating costs, encounter count | Divide total operating costs by encounter count | Cost per encounter | HalfUp to 2 decimal places | Period configurable per report |

### 9.3 Clinical KPI Calculations

Clinical KPI calculations govern the computation of clinical quality metrics. The calculations are owned by the Reporting bounded context and interact with multiple clinical bounded contexts.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-REP-KPI-021 | Readmission Rate | Reports | Readmissions, discharges | Divide readmissions by discharges | Rate (%) | HalfUp to 2 decimal places | Period and timeframe configurable per report |
| CALC-REP-KPI-022 | Medication Adherence | Reports | Prescribed doses, administered doses | Divide administered doses by prescribed doses | Rate (%) | HalfUp to 2 decimal places | Period and medication configurable per report |
| CALC-REP-KPI-023 | Preventive Care Coverage | Reports | Patients current on preventive care, total patients | Divide current patients by total patients | Rate (%) | HalfUp to 2 decimal places | Period and care type configurable per report |
| CALC-REP-KPI-024 | Clinical Outcome Score | Reports | Outcome measures, patient count | Apply outcome-specific formula | Score | Per outcome measure | Outcome measure configurable per report |
| CALC-REP-KPI-025 | Patient Satisfaction Score | Reports | Satisfaction survey responses | Average responses, weighted by response category | Score (0-100) | HalfUp to 1 decimal place | Survey instrument configurable per tenant |

### 9.4 Aggregation Calculations

Aggregation calculations govern the computation of aggregations used in reports and dashboards. The calculations are owned by the Reporting bounded context.

| Calc ID | Calculation Name | Module | Inputs | Formula Description | Output | Rounding Rules | Configuration Surface |
|---|---|---|---|---|---|---|---|
| CALC-REP-AGG-001 | Sum Aggregation | Reports | Numeric values | Sum all values | Sum | Per source precision | — |
| CALC-REP-AGG-002 | Average Aggregation | Reports | Numeric values | Sum values, divide by count | Average | HalfUp to 4 decimal places | — |
| CALC-REP-AGG-003 | Median Aggregation | Reports | Numeric values | Sort values, select middle (or average of two middle) | Median | Per source precision | — |
| CALC-REP-AGG-004 | Percentile Aggregation | Reports | Numeric values, percentile | Sort values, select value at percentile | Percentile value | Per source precision | Percentile configurable per report |
| CALC-REP-AGG-005 | Rate Aggregation | Reports | Numerator, denominator | Divide numerator by denominator | Rate | HalfUp to 4 decimal places | — |
| CALC-REP-AGG-006 | Trend Calculation | Reports | Time-series values | Compute period-over-period change | Trend (% or absolute) | HalfUp to 2 decimal places | Period configurable per report |

---

## 10. Calculation Engine Architecture

### 10.1 Engine Architecture

The calculation engine is the platform's mechanism for evaluating calculations at the point of consequential computations. The engine is part of the Orchestration Layer documented in SYSTEM_ARCHITECTURE Section 6.4 and interacts with the bounded contexts through their command and event contracts (SYSTEM_ARCHITECTURE Section 7.4). The engine is not part of any single bounded context; it is a platform-level service consumed by all bounded contexts.

The engine architecture is governed by four design commitments. First, the engine is stateless: calculation evaluations are not stored in engine state; the engine evaluates each calculation on demand, using the calculation's definition from the catalogue and the inputs from the caller. Second, the engine is deterministic: for a given calculation, inputs, and calculation version, the engine produces the same output. Third, the engine is auditable: every evaluation is recorded in the audit trail, including the calculation, the inputs, the output, and the rounding applied. Fourth, the engine is fast: calculation evaluation does not produce unacceptable latency on the request path; calculations that cannot be evaluated quickly are re-architected or moved to asynchronous evaluation.

### 10.2 Evaluation Triggers

Calculation evaluation is triggered by one of four mechanisms. First, command interception: the engine intercepts a command before it is executed by a bounded context, evaluates the calculations that the command requires, and provides the results to the command. Second, event reaction: the engine reacts to an event emitted by a bounded context, evaluates the calculations that the event requires, and executes the calculations' actions (typically posting the result to a record). Third, schedule: the engine evaluates calculations on a schedule (for example, a payroll calculation that is evaluated monthly). Fourth, manual invocation: the engine evaluates a calculation on manual invocation by an authorized user (for example, a clinical score calculation invoked by a practitioner).

The four trigger mechanisms cover the platform's calculation evaluation needs. Command interception covers synchronous calculations that must be evaluated before an action; event reaction covers asynchronous calculations that respond to an action; schedule covers time-based calculations; manual invocation covers on-demand calculations. The engine supports all four mechanisms, with the mechanism selected per calculation through configuration.

### 10.3 Evaluation Context

Calculation evaluation is performed in a defined context. The context includes the calculation version, the inputs, the entity (where applicable), the tenant, the facility (where applicable), the user, and the session. The context is the basis for the calculation's evaluation: the calculation's formula is evaluated against the context, and the calculation's rounding rules are applied in the context. The context is recorded in the audit trail alongside the calculation's output.

The evaluation context discipline ensures that calculation evaluations are reproducible. A calculation evaluation recorded in the audit trail can be reproduced by re-evaluating the calculation against the recorded context, producing the same output. This reproducibility is critical for audit investigation: a question about why a calculation produced a particular output can be answered by re-evaluating the calculation against the recorded context. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the calculation domain.

### 10.4 Dependency Resolution

Calculations may depend on other calculations. For example, an invoice total calculation depends on line total calculations, which depend on line subtotal, discount, and tax calculations. The calculation engine resolves dependencies automatically, evaluating dependent calculations before the depending calculation. The dependency graph is documented in each calculation's metadata; the engine uses the graph to determine evaluation order.

The dependency resolution discipline ensures that calculations are evaluated in the correct order. A calculation that is evaluated before its dependencies would produce incorrect results; the engine's dependency resolution prevents this. The discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) — calculations depend on each other through their declared dependencies, not through ad hoc evaluation order. The discipline is also the structural mechanism by which the platform's calculation catalogue is maintainable: a calculation with declared dependencies can be modified with confidence that the modification does not produce incorrect evaluation order.

### 10.5 Performance and Caching

Calculation evaluation performance is governed by the engine's caching strategy. The engine caches calculation definitions, calculation compilations (where the calculation is compiled for evaluation), and calculation evaluation results (where the same calculation is evaluated against the same inputs within a cache window). The cache is invalidated on calculation version change. The cache is scoped to the tenant, ensuring that one tenant's cache does not affect another tenant's performance.

The performance discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the calculation domain. A more complex caching strategy that attempted to predict evaluation patterns would add complexity without proportionate benefit; the simple cache-with-invalidation strategy is sufficient. The strategy is reviewed at each quarterly Architecture Council review to confirm that it continues to meet the platform's performance commitments.

---

## 11. Calculation Testing & Validation

### 11.1 Testing Discipline

Calculation testing in Ibn Hayan follows a documented discipline. Each calculation is tested before activation, with the test suite covering the calculation's formula (positive and negative cases), the calculation's rounding rules (boundary cases), the calculation's configuration surface (parameter variations), and the calculation's dependencies (dependency resolution). The test suite is versioned alongside the calculation and is run on each calculation version change.

The testing discipline is the structural mechanism by which the platform's calculation catalogue maintains its quality. A calculation that is activated without testing may produce incorrect results; the platform's commitment to clinical safety (Principle P1) and financial integrity requires that calculations be tested before activation. The discipline is the architectural expression of Principle P7 (Documented Before Implemented) applied to the calculation domain.

### 11.2 Test Case Design

Test cases are designed to cover the calculation's full behavioural surface. Each test case specifies the inputs, the expected output, and the expected audit record. Test cases are derived from the calculation's formula (one test case per formula branch), the calculation's rounding rules (one test case per rounding boundary), the calculation's configuration surface (one test case per parameter variation), and the calculation's dependencies (one test case per dependency scenario). Test cases are reviewed by the calculation's owner and by the Architecture Council.

The test case design discipline ensures that the calculation's behaviour is fully specified. A calculation with an incomplete test suite may produce behaviour that is not specified, which is a defect. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every behaviour is testable, and every test is recoverable. The discipline is also the structural mechanism by which the platform's calculation catalogue is maintainable: a calculation with a comprehensive test suite can be modified with confidence that the modification does not produce unintended behaviour.

### 11.3 Sandbox Testing

Calculation changes are tested in a configuration sandbox before application to production, in keeping with the configuration sandbox discipline documented in SYSTEM_ARCHITECTURE Section 15.7. The sandbox is a non-production tenant that inherits from the production tenant's configuration, ensuring that sandbox testing reflects production reality. The calculation change is applied to the sandbox, the test suite is run, and the calculation's behaviour is observed in the sandbox before the change is applied to production.

The sandbox testing discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the calculation domain. A calculation change that is applied to production without sandbox testing may compromise clinical safety or financial integrity; the platform's posture is that calculation changes are tested in a sandbox before application to production, except for emergency changes that follow a documented expedited pathway. The discipline is the structural mechanism by which the platform's calculation catalogue maintains its integrity posture across the platform's deployment spectrum.

### 11.4 Calculation Validation Framework

Calculation validation is performed by the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. The framework applies five validation rule categories: Structural (the calculation conforms to the calculation schema), Referential (the calculation's references resolve), Semantic (the calculation is internally consistent), Contextual (the calculation is consistent with its scope), and Regulatory (the calculation is consistent with the regulatory framework in force for the tenant's region). A calculation that fails validation is not applied.

The validation framework is the structural mechanism by which the platform's calculation catalogue maintains its integrity. A calculation that bypasses validation may produce behaviour that is not specified, which is a defect. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every calculation is validated before application, and every validation result is recoverable. The discipline is also the structural mechanism by which the platform's calculation catalogue is compliant: calculations that fail regulatory validation are not applied, ensuring that the platform's calculation behaviour complies with the regulatory framework in force for the tenant's region.

---

## 12. Calculation Audit Trail

### 12.1 Calculation Evaluation Audit Records

Every calculation evaluation is recorded in the audit trail, in keeping with Principle P13 (Auditability as Primitive) documented in SYSTEM_ARCHITECTURE Section 4.13. The audit record captures the calculation identifier, the calculation version, the inputs, the output, the rounding applied, the entity (where applicable), the actor (user, system, integration), the timestamp, the authorization basis, and the trigger (command, event, schedule, manual). The audit record is immutable; once written, it cannot be modified or deleted.

The audit record for calculation evaluations is distinct from the audit record for the underlying data action. A data action (creating an invoice, posting a payment) is audited by the bounded context that owns the data; the calculation evaluation on that action is audited by the calculation engine. Both audit records are preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5 and are queryable by authorized roles.

### 12.2 Reproducibility Audit

Calculation evaluation audit records are designed for reproducibility. An audit record that references a calculation evaluation can be reproduced by re-evaluating the calculation against the recorded inputs and rounding rules, producing the same output. The reproducibility is the structural mechanism by which the platform's calculation audit trail supports audit investigation: a question about why a calculation produced a particular output can be answered by re-evaluating the calculation against the recorded context.

The reproducibility discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the calculation domain. A calculation that is not reproducible would produce different outputs for the same inputs across evaluations, which would compromise the platform's ability to reason about calculation results. The discipline is also the structural mechanism by which the platform's calculation audit trail supports compliance: a regulator's question about a calculation result can be answered definitively by reproducing the calculation.

### 12.3 Calculation Query Audit

A query for calculation history is recorded in the audit trail, in keeping with the audit query discipline documented in SYSTEM_ARCHITECTURE Section 27.6. The audit record captures the querier, the calculation queried, the time range, and the result count. The query audit is itself auditable, ensuring that calculation history investigation is itself auditable. This discipline is the architectural expression of the platform's commitment to accountability (PRODUCT_BIBLE Design Principle D-10).

Calculation query audit interacts with the permission framework documented in PRODUCT_BIBLE Section 21. Only authorized roles can query calculation history; queries by unauthorized roles are rejected before execution, with the rejection recorded as a security-relevant audit event. The permission framework's data-scope categories (All, Cohort, Self, None) apply to calculation history queries: a role with Cohort scope can query calculation history for entities in its cohort; a role with Self scope can query only its own actions.

### 12.4 Calculation Audit and Compliance

Calculation audit records are the basis for compliance demonstration. Compliance reporting is generated from calculation audit records, with reports tailored to specific regulatory requirements. For example, a regulatory report on tax calculation accuracy is generated from tax calculation audit records; a regulatory report on payroll calculation accuracy is generated from payroll calculation audit records. Compliance reports are themselves auditable, with report generation recorded in the audit trail.

The platform's compliance documentation defines, per region, what calculation audit records are required, how they are retained, and how they are made available to regulators. The platform's calculation audit architecture is designed to meet these requirements without architectural change, with regional variation expressed through configuration. This discipline is the architectural expression of Principle P17 (Regional Adaptation Without Forking) applied to the calculation domain.

### 12.5 Calculation Audit and Offline Operation

Calculation evaluations performed offline are audited locally with the same completeness as online calculation evaluations, in keeping with the offline audit discipline documented in SYSTEM_ARCHITECTURE Section 27.7. The local audit trail is synchronized with the central audit trail when connectivity is restored, with conflict resolution ensuring audit completeness. Calculation audit records are immutable, including offline calculation audit records; an offline calculation audit record cannot be modified before synchronization.

The offline calculation audit discipline is the architectural expression of Principle P11 (Offline-First as Default) applied to the calculation domain. A calculation evaluation performed offline must be auditable with the same completeness as a calculation evaluation performed online; the platform's audit completeness commitment is not relaxed for offline operation. The discipline ensures that the platform's audit trail is complete regardless of the operational mode in which the calculation evaluation was performed.

---

## 13. Related Documents

### 13.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-1 (Healthcare First), D-2 (Configuration Before Customization), D-10 (Accountability) govern calculation posture |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Calculations are configuration artefacts governed by the configuration lifecycle |
| PRODUCT_BIBLE.md | Section 25 (Localization Strategy) | Multi-currency and multi-tax calculations |
| PRODUCT_BIBLE.md | Section 28 (Offline Strategy) | Offline calculation evaluation and audit |
| PRODUCT_BIBLE.md | Section 31 (Security Philosophy) | Calculation authorization and audit |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P2 (Configuration Before Customization), P3 (One Platform), P4 (Loose Coupling), P5 (Consistency), P7 (Documented), P13 (Auditability), P14 (Simplicity), P17 (Regional Adaptation), P18 (Decade-Horizon) govern calculation posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Bounded contexts to which calculations are bound |
| SYSTEM_ARCHITECTURE.md | Section 15 (Configuration Strategy) | Calculation configuration surface and validation |
| SYSTEM_ARCHITECTURE.md | Section 16 (Workflow Engine Philosophy) | Calculation engine architecture |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Calculation evaluation audit records |
| SYSTEM_ARCHITECTURE.md | Section 28 (Reporting Architecture) | KPI and aggregation calculations |
| CONFIGURATION_ARCHITECTURE.md | Section 7 (Configuration Validation) | Calculation validation framework |
| CONFIGURATION_ARCHITECTURE.md | Section 8 (Configuration Lifecycle) | Calculation lifecycle |

### 13.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references calculations, the reference is to this document.

| Document | Relationship to Calculations |
|---|---|
| TERMINOLOGY.md | Calculation inputs may be coded values; terminology resolution applies |
| ENUMS.md | Calculations reference enum values for input discrimination |
| STATUS_CODES.md | Calculations may transition status codes (e.g., aging calculation) |
| BUSINESS_RULES.md | Business rules invoke calculations; rule conditions may be calculation outputs |
| CLINICAL_WORKFLOWS.md | Clinical workflows invoke calculations (e.g., dosage calculation in medication workflow) |
| CONFIGURATION.md | Calculation parameters are configuration artefacts |
| FEATURE_FLAGS.md | Feature flags control calculation activation; flag lifecycle applies |

### 13.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level calculation usage and configuration |
| docs/04_INTEGRATIONS/*.md | External system calculation exchange (e.g., payer fee schedule) |
| docs/06_DATABASE/*.md | Calculation storage and indexing |
| docs/09_DEPLOYMENT/*.md | Calculation engine deployment topology |
| docs/03_SECURITY/*.md | Calculation authorization and audit |

### 13.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when a calculation amendment, a regulatory tax change, a clinical formula update, or an ADR requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification. Ibn Hayan's calculation catalogue is a structural element of the platform's contract surface and is treated with the discipline that structural elements warrant.
