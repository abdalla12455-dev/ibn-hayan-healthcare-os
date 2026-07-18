# Ibn Hayan Healthcare Operating System
## Accounting Module

| Field | Value |
|---|---|
| Document Title | Accounting Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, chief financial officers, controllers, compliance officers, auditors |
| Scope | Chart of accounts, general ledger, journal entries, multi-currency, cost center accounting, fiscal period close, financial statements, tax configuration, multi-entity consolidation, bank reconciliation, and cash vs. accrual basis for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, billing transaction execution (owned by Billing module), payroll execution (owned by HR module), accounts payable invoice approval (owned by Billing module where applicable) |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Chart of Accounts
5. General Ledger
6. Financial Statements
7. Tax Management
8. Multi-Currency Support
9. User Roles
10. Workflows
11. Data Models
12. Integrations
13. Configuration
14. Permissions
15. Reports
16. API Surface
17. Future Enhancements
18. Related Documents

---

## 1. Module Overview

### 1.1 Module Identity and Strategic Position

The Accounting module (M10 in this documentation suite, aligned with the Accounting bounded context BC08 as catalogued in SYSTEM_ARCHITECTURE Section 7.2) is the enterprise financial ledger engine of the Ibn Hayan Healthcare Operating System. Every financial transaction in the platform — patient billing, payer payment, payroll, accounts payable, asset acquisition, depreciation — flows into this module's general ledger as journal entries, with the ledger providing the canonical financial record that supports financial statements, regulatory reporting, and audit. The Accounting module is the financial source of truth for the organization; without a functioning accounting capability, a healthcare organization cannot produce accurate financial statements, cannot comply with regulatory financial reporting, and cannot make informed financial decisions.

Ibn Hayan treats accounting as an enterprise financial primitive rather than as a departmental utility. This positioning has direct architectural consequences: accounting is owned by a single bounded context, accessed by every module that produces financial transactions through published events, and protected by reconciliation and audit guarantees that prevent ledger corruption. A journal entry recorded in Ibn Hayan is a permanent financial record whose integrity must outlast every transactional system that produced it, supporting the multi-year retention requirements of financial regulations.

### 1.2 Purpose and Business Value

The Accounting module exists to produce accurate, timely, compliant financial statements and to provide the financial data foundation for organizational decision-making, in a way that respects regulatory accounting standards, audit requirements, and the operational realities of healthcare finance. Business value is realized through four mechanisms. First, automated journal entry recording eliminates the manual overhead of transaction-by-transaction ledger posting — billing events, payroll events, and accounts payable events generate ledger entries automatically through event consumption. Second, period close workflow produces financial statements on a predictable cadence, supporting timely decision-making and regulatory reporting. Third, cost center accounting surfaces financial performance by organizational unit, enabling departmental accountability and operational optimization. Fourth, multi-entity consolidation supports the financial reporting needs of healthcare networks with multiple legal entities.

For customers, the Accounting module is the financial backbone: a healthcare organization that cannot produce accurate financial statements cannot secure financing, cannot comply with regulatory requirements, and cannot make informed strategic decisions. For regulators, the Accounting module is the source of truth for financial compliance — audit trails, tax reporting, and regulated financial statements. For auditors, the Accounting module is the primary surface for financial audit — every transaction is traceable from ledger entry through source document.

### 1.3 Bounded Context Alignment

The Accounting module aligns one-to-one with the Accounting bounded context BC08, as catalogued in SYSTEM_ARCHITECTURE Section 7.2 and elaborated in MODULE_ARCHITECTURE Section 2.2. BC08 owns the chart of accounts, the general ledger, journal entries, fiscal periods, cost centers, financial statements, and consolidation; it does not own billing transactions (BC07), payroll execution (BC12), or accounts payable approval (BC07 where applicable). The Accounting bounded context is a customer in customer-supplier relationships with the Configuration, Localization, and Audit contexts; it is a supplier in customer-supplier relationships with the Reporting context. The Accounting bounded context is a consumer of events from the Billing, HR, and other modules that produce financial transactions.

This alignment is stable. Per Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8), the Accounting bounded context is not reorganized to accommodate features. New accounting-related capabilities — for example, a new financial statement format, a new cost center dimension, a new consolidation rule — are accommodated within the existing context through configuration, not through structural change. Customers can rely on this stability when planning integrations with external financial systems and when building long-term financial data strategies.

### 1.4 Module Composition

The Accounting module is composed of the following capability areas, each elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: chart of accounts, general ledger, journal entries, multi-currency, cost center accounting, fiscal period close, financial statements, tax configuration, multi-entity consolidation, bank reconciliation, and cash vs. accrual basis. The module does not own billing transactions, payroll execution, or accounts payable approval; it owns the ledger that records the financial consequences of those transactions. The module participates in workflows owned by other modules through its published event and query contracts.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the ledger as the organizing concept; capabilities that do not share this organizing concept belong in other modules. Cost center accounting, for example, lives in the Accounting module because cost centers are a dimension of ledger entries; cost center operational management (staffing, budgets) may be distributed across operational modules. This separation prevents the Accounting module from accumulating operational management logic that would compromise its contract stability over time.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The Accounting module owns the chart of accounts — the structured list of ledger accounts that organize financial transactions. It owns the general ledger — the canonical record of all journal entries posted to the chart of accounts. It owns journal entry lifecycle from creation through posting, with journal entries sourced from automated event consumption (billing events, payroll events, accounts payable events) and from manual entry (adjusting entries, correction entries, accrual entries). It owns multi-currency accounting, with currency conversion applied at journal entry posting and with translation gains and losses recorded per accounting standards. It owns cost center accounting, with cost centers as a dimension of ledger entries for departmental financial reporting.

The module also owns fiscal period close — the workflow that finalizes financial activity for a period (month, quarter, year) and produces financial statements. It owns financial statement generation — balance sheet, income statement, cash flow statement, and other statements required by accounting standards or by regulatory frameworks. It owns tax configuration, with tax codes, tax rates, and tax reporting templates configured per jurisdiction. It owns multi-entity consolidation, combining the financial activity of multiple legal entities under common ownership into consolidated financial statements. It owns bank reconciliation, matching recorded cash transactions to bank statement transactions. It owns cash basis vs. accrual basis configuration, with the basis selectable per tenant and per reporting purpose.

### 2.2 Out of Scope

The Accounting module does not own billing transactions, invoices, claims, or patient payments; these belong to the Billing bounded context (BC07), with the Accounting module consuming billing events to record journal entries. It does not own payroll execution, tax withholding, or benefit administration; these belong to the HR bounded context (BC12), with the Accounting module consuming payroll events to record journal entries. It does not own accounts payable invoice approval; this belongs to the Billing bounded context or to a separate accounts payable workflow, with the Accounting module recording the journal entries when invoices are approved. It does not own asset management execution — fixed asset register, depreciation computation — though the Accounting module records the journal entries that depreciation produces.

The module also does not own financial planning and budgeting (a forward-looking capability that may use external tools), treasury management (cash flow forecasting, investment management), or audit storage (that belongs to the Audit bounded context). The Accounting module publishes events that the Audit module records, but it does not store audit records itself.

### 2.3 Ledger as Financial Source of Truth

The general ledger is the financial source of truth in the Ibn Hayan platform. Every financial transaction — every invoice, every payment, every payroll, every expense — eventually produces a journal entry in the general ledger. The ledger is the canonical record that supports financial statements, regulatory reporting, and audit. The Accounting module is the canonical source of ledger state; every other module that needs financial information queries this module's contracts or subscribes to its events.

This central positioning imposes responsibilities on the Accounting module. The module's state must be strongly consistent within a fiscal period, because inconsistent ledger state produces inaccurate financial statements and may produce regulatory violations (Principle P5, SYSTEM_ARCHITECTURE Section 4.6). The module's data must be reconcilable, because ledger data that does not reconcile to billing data, payroll data, or bank data indicates a defect that must be investigated. The module's audit must be complete, because every journal entry is subject to regulatory scrutiny and audit verification.

The ledger's role as financial source of truth has implications for contract design. The Accounting module's contracts are intentionally narrow in their breaking-change tolerance, because every financial reporting system, every audit, and every regulatory filing depends on the ledger's structure. A breaking change to a ledger contract requires coordination across every dependent module and every external system that consumes ledger data, with deprecation windows long enough to allow all consumers to migrate. This stability honors Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8) applied to the most stable of all financial contexts.

### 2.4 Multi-Tenant and Multi-Entity Accounting

Accounting data is tenant-isolated by default. A ledger in tenant A is not visible to tenant B, even when the tenants are under common ownership. Within a tenant, the Accounting module supports multi-entity accounting — multiple legal entities under common ownership, each with its own chart of accounts and ledger, with consolidation producing combined financial statements. Multi-entity accounting is essential for healthcare networks that operate through multiple legal entities (a hospital network may operate hospitals through one entity, physician practices through another, real estate through a third).

Multi-tenant isolation and multi-entity consolidation together produce the platform's financial reporting model: one code base, one configuration framework, many tenants, each with their own ledger that may span multiple entities, with consolidation producing the combined financial statements required for group reporting. This honors Principle P3 (One Platform, Many Organizations) and Principle P10 (Multi-Tenancy as Default, SYSTEM_ARCHITECTURE Section 4.10) applied to financial data.

---

## 3. Key Features

### 3.1 Chart of Accounts

The chart of accounts is the structured list of ledger accounts that organize financial transactions. The chart is hierarchical, with accounts grouped by category (assets, liabilities, equity, revenue, expenses) and with sub-accounts supporting granular reporting. The chart is configurable per tenant, per entity, and per region, with regional chart templates aligned to local accounting standards (US GAAP, IFRS, regional equivalents). Chart of accounts changes are versioned and effective-dated; a chart change does not affect already-posted entries, which are preserved against their original chart.

### 3.2 General Ledger

The general ledger is the canonical record of all journal entries posted to the chart of accounts. The ledger is append-only for posted entries — a posted entry cannot be modified or deleted, with corrections made through reversing entries that are themselves posted to the ledger. The ledger supports multi-dimensional analysis, with each entry carrying dimensions beyond the account (cost center, department, facility, project, purpose) for flexible reporting. The ledger is the source of truth for financial statement generation, for regulatory reporting, and for audit.

### 3.3 Journal Entries

Journal entries are the atomic units of the general ledger. An entry consists of a date, a description, a reference (to the source transaction that produced the entry), and one or more line items, with each line item specifying an account, a debit or credit amount, and dimensions. Entries are sourced from automated event consumption (billing events produce revenue and receivable entries; payroll events produce expense and liability entries) and from manual entry (adjusting entries, correction entries, accrual entries). Entries are validated before posting — entries that do not balance (debits do not equal credits) are rejected, entries that reference non-existent accounts are rejected.

### 3.4 Multi-Currency

Multi-currency accounting handles transactions denominated in currencies other than the tenant's base currency, with currency conversion applied at journal entry posting. Conversion uses exchange rates configured per tenant, with rate sources (central bank, commercial rate provider) specified in the tenant's configuration. Translation gains and losses (from revaluing foreign-currency-denominated balances at period-end rates) are recorded per accounting standards, with the gains and losses classified appropriately in the financial statements. Multi-currency accounting is essential for tenants operating across currency zones or transacting with foreign-currency payers and suppliers.

### 3.5 Cost Center Accounting

Cost center accounting assigns ledger entries to cost centers — organizational units responsible for incurring costs — enabling departmental financial reporting and accountability. Cost centers are configurable per tenant, per facility, and per department, with cost center hierarchies supporting roll-up reporting. Cost center accounting supports variance analysis (actual vs. budget by cost center), cost allocation (allocating shared costs to operating departments), and profitability analysis (revenue vs. cost by cost center). Cost center accounting is essential for healthcare organizations seeking to optimize departmental financial performance.

### 3.6 Fiscal Period Close

Fiscal period close finalizes financial activity for a period (month, quarter, year) and produces financial statements. The close workflow includes accruing expenses not yet recorded, deferring revenue not yet earned, revaluing foreign-currency balances, reconciling sub-ledgers to the general ledger, and producing the period's financial statements. Close is governed by configurable workflows, with close tasks assigned to specific roles and with close completion requiring approval. Periods that are closed are locked — entries cannot be posted to a closed period without an explicit period reopening, which is itself audited.

### 3.7 Financial Statements

Financial statement generation produces the standardized statements required by accounting standards and by regulatory frameworks — balance sheet, income statement, cash flow statement, statement of changes in equity, and notes to the financial statements. Statements are generated from the general ledger, with statement formats configurable per accounting standard (US GAAP, IFRS, regional equivalents) and per regulatory framework. Statements are produced on the period close cadence and on-demand for management reporting. Statements are versioned, with each generation recorded for audit and comparison.

### 3.8 Tax Configuration

Tax configuration manages tax codes, tax rates, and tax reporting templates per jurisdiction. Tax codes define the tax treatment of different transaction types (sales tax on supplies, value-added tax on services, withholding tax on payments to contractors), with tax rates configured per jurisdiction and per time period (rates change over time, with effective-dating). Tax reporting templates produce the tax returns and reports required by each jurisdiction's tax authority, with templates configurable per jurisdiction and per reporting period. Tax configuration is essential for tenants operating in jurisdictions with complex tax requirements.

### 3.9 Multi-Entity Consolidation

Multi-entity consolidation combines the financial activity of multiple legal entities under common ownership into consolidated financial statements. Consolidation includes eliminating inter-entity transactions (so that consolidated statements reflect only transactions with external parties), translating foreign-entity financial statements into the consolidated reporting currency, and combining the entities' financial statements into consolidated balance sheet, income statement, and cash flow statement. Consolidation rules are configurable per consolidation group, with rules validated for accounting standard compliance.

### 3.10 Bank Reconciliation

Bank reconciliation matches recorded cash transactions in the general ledger to bank statement transactions, identifying discrepancies that require investigation. Reconciliation is performed at configurable intervals (daily for high-volume tenants, monthly for lower-volume tenants), with discrepancies categorized (timing differences, recording errors, bank errors, unauthorized transactions). Discrepancies are investigated and resolved, with resolution recorded for audit. Bank reconciliation is a primary internal control against fraud and error, and is subject to auditor verification.

### 3.11 Cash Basis vs. Accrual Basis

Cash basis vs. accrual basis configuration allows the tenant to select the accounting basis for reporting purposes. Cash basis records revenue when cash is received and expenses when cash is paid; accrual basis records revenue when earned and expenses when incurred, regardless of cash timing. Most healthcare organizations use accrual basis for financial statements (required by most accounting standards) but may use cash basis for tax reporting in some jurisdictions. The Accounting module supports both bases, with basis selectable per reporting purpose (financial statements, tax returns, management reporting).

The dual-basis capability requires careful reconciliation between the two bases, because the same underlying transactions produce different revenue and expense recognition under each basis. The Accounting module's reconciliation capability includes cash-to-accrual reconciliation, with differences classified by their source (unbilled revenue, uncollected revenue, prepaid expenses, accrued expenses) and reconciled to the period's activity. This reconciliation is essential for organizations that use accrual basis for financial statements and cash basis for tax reporting, ensuring that both bases are derived from the same underlying transaction data and that differences are explainable and auditable.

---

## 4. Chart of Accounts

### 4.1 Chart Structure

The chart of accounts is structured hierarchically, with accounts grouped by category (assets, liabilities, equity, revenue, expenses) and with sub-accounts supporting granular reporting. The chart's structure is configurable per tenant, per entity, and per region, with regional chart templates aligned to local accounting standards. The chart's account numbering scheme is configurable, with schemes typically organized by category (1xxx for assets, 2xxx for liabilities, 3xxx for equity, 4xxx for revenue, 5xxx-9xxx for expenses) but adaptable to local conventions. Chart structure changes are versioned and effective-dated.

### 4.2 Account Types

Account types classify accounts by their behavior in the financial statements. Asset accounts (cash, receivables, inventory, fixed assets) carry debit balances and appear on the balance sheet. Liability accounts (payables, accrued expenses, long-term debt) carry credit balances and appear on the balance sheet. Equity accounts (common stock, retained earnings) carry credit balances and appear on the balance sheet. Revenue accounts (service revenue, interest income) carry credit balances and appear on the income statement. Expense accounts (salaries, supplies, depreciation) carry debit balances and appear on the income statement. Account type determines the account's behavior in journal entry validation, in financial statement generation, and in period close.

### 4.3 Chart Configuration

Chart configuration specifies the chart's structure, account types, account numbering, and validation rules. Configuration is layered per the model in PRODUCT_BIBLE Section 22.3, with platform defaults inherited by edition, tenant, entity, and facility overrides where applicable. Chart configuration is governed by the Configuration module's validation framework, with changes validated for accounting standard compliance before application. Chart configuration changes are versioned and audited, with the change actor, time, previous chart, and new chart recorded.

### 4.4 Chart Distribution

Chart distribution publishes the chart of accounts to peer modules that need it for transaction posting. The Billing module uses the chart to determine which accounts to credit for revenue and debit for receivables. The HR module uses the chart to determine which accounts to debit for payroll expense and credit for payroll liabilities. The Accounting module's chart distribution contract ensures that peer modules use the current chart, with chart changes propagated through events that peer modules consume. Chart distribution is the operational mechanism that keeps the platform's financial transaction posting consistent with the tenant's chart configuration.

---

## 5. General Ledger

### 5.1 Ledger Posting

Ledger posting records journal entries to the general ledger, with entries sourced from automated event consumption and from manual entry. Posting is synchronous for manual entries (the user receives immediate confirmation) and asynchronous for event-sourced entries (the event is consumed and the entry is posted, with posting confirmation through a subsequent event). Posting is validated — entries that do not balance, that reference non-existent accounts, or that violate period close locks are rejected, with the rejection recorded. Posting is idempotent for event-sourced entries — the same event consumed multiple times produces only one ledger entry, preventing duplicate posting in the presence of event redelivery.

### 5.2 Ledger Reconciliation

Ledger reconciliation ensures that the general ledger reconciles to sub-ledgers and to external data sources. Sub-ledger reconciliation compares the ledger's accounts receivable balance to the Billing module's outstanding invoice total, the ledger's accounts payable balance to the accounts payable outstanding total, the ledger's payroll liability balances to the HR module's outstanding payroll total. External reconciliation compares the ledger's cash balances to bank statement balances (bank reconciliation) and to investment custodian statements. Reconciliation discrepancies are investigated and resolved, with resolution recorded for audit.

### 5.3 Ledger Period Management

Ledger period management controls which fiscal periods are open for posting. Periods are opened at the start of the fiscal period and are closed at period close, with closed periods locked against posting. Period locks are enforced at posting time — an entry dated to a closed period is rejected, with the rejection recorded. Period reopening is a controlled action that requires explicit authorization and is itself audited, used for prior-period adjustments that must be recorded in the original period rather than the current period. Period management is the operational safeguard against inappropriate backdated entries.

### 5.4 Ledger Archival

Ledger archival manages the long-term retention of ledger data, with retention periods governed by regulatory requirements (typically 7-10 years for financial records, with variations by jurisdiction). Archived ledger data is read-only, accessible for audit and historical inquiry, but not available for posting. Archival is performed at configurable intervals, with archived data moved to long-term storage to manage operational data volume. Archival preserves data integrity — archived data cannot be modified, and the archival process is itself audited.

Archival is a regulated activity in most jurisdictions, with retention periods and archival formats specified by financial regulations. The Accounting module's archival capability is configured per region through the Localization module's configuration surface, with the configuration expressing the regional retention requirements. Archived data is accessible for the duration of the retention period, with access subject to the same permission scoping as live data. After the retention period expires, archived data is destroyed in a controlled, audited process, with destruction recorded for regulatory verification.

---

## 6. Financial Statements

### 6.1 Balance Sheet

The balance sheet reports the organization's financial position at a point in time, showing assets, liabilities, and equity. The balance sheet is generated from the general ledger's account balances as of the statement date, with statement format configurable per accounting standard. Balance sheet generation honors the accounting equation (assets = liabilities + equity), with imbalances indicating a ledger defect that must be investigated. The balance sheet is produced on the period close cadence and on-demand for management reporting.

### 6.2 Income Statement

The income statement reports the organization's financial performance over a period, showing revenue, expenses, and net income. The income statement is generated from the general ledger's revenue and expense account balances for the period, with statement format configurable per accounting standard. The income statement distinguishes operating revenue and expenses (from the organization's primary healthcare activities) from non-operating revenue and expenses (investment income, interest expense, gains and losses from asset disposals). The income statement is produced on the period close cadence and on-demand for management reporting.

### 6.3 Cash Flow Statement

The cash flow statement reports the organization's cash inflows and outflows over a period, categorized by operating, investing, and financing activities. The cash flow statement is generated from the general ledger's cash account activity for the period, with the indirect method (starting from net income and adjusting for non-cash items) or the direct method (showing cash receipts and payments directly) selectable per configuration. The cash flow statement is essential for understanding the organization's liquidity position and is produced on the period close cadence.

### 6.4 Statement of Changes in Equity

The statement of changes in equity reports the changes in the organization's equity over a period, showing the components of equity (common stock, retained earnings, accumulated other comprehensive income) and the transactions that changed each component. The statement is generated from the general ledger's equity account activity for the period. The statement of changes in equity is required by most accounting standards and is produced on the period close cadence.

The statement of changes in equity is particularly important for healthcare organizations with complex equity structures, including organizations with multiple classes of stock, organizations with retained earnings restrictions (such as those imposed by bond covenants or regulatory requirements), and organizations with comprehensive income items (such as foreign currency translation adjustments or pension liability adjustments). The statement surfaces the comprehensive picture of equity changes, supporting both internal decision-making and external reporting.

---

## 7. Tax Management

### 7.1 Tax Code Configuration

Tax code configuration defines the tax treatment of different transaction types. Tax codes specify the tax type (sales tax, value-added tax, withholding tax, payroll tax), the tax rate, the tax jurisdiction, and the accounts to which tax amounts are posted. Tax codes are configurable per tenant, per jurisdiction, and per transaction type. Tax code changes are versioned and effective-dated, with rate changes taking effect on the configured date. Tax code configuration is subject to compliance review, because tax code errors produce regulatory violations and potential penalties.

### 7.2 Tax Calculation

Tax calculation applies the configured tax codes to transactions, computing the tax amount for each taxable transaction. Tax calculation is performed by the module that owns the transaction — the Billing module calculates sales tax on patient services, the HR module calculates payroll taxes on payroll — with the calculated tax amount posted to the ledger through the tax code's configured accounts. Tax calculation is validated for compliance with the jurisdiction's tax rules, with calculation errors surfaced for correction before posting.

### 7.3 Tax Reporting

Tax reporting produces the tax returns and reports required by each jurisdiction's tax authority. Reports include sales tax returns (monthly, quarterly, annually per jurisdiction), payroll tax returns (withholding, social security, Medicare equivalents), income tax returns (corporate income tax, with applicable deductions and credits), and value-added tax returns (where applicable). Tax reporting templates are configurable per jurisdiction and per reporting period, with templates aligned to the jurisdiction's tax authority requirements. Tax reports are themselves auditable, with report generation recorded in the audit trail.

### 7.4 Tax Compliance Review

Tax compliance review ensures the tenant's tax configuration complies with the jurisdiction's tax requirements. Review is performed by the compliance officer role at configurable intervals and at configuration change. Review evaluates tax code accuracy (do the codes reflect the jurisdiction's current tax rates and rules?), tax calculation accuracy (do calculations produce the correct tax amounts?), and tax reporting accuracy (do reports conform to the jurisdiction's reporting requirements?). Compliance findings may require configuration changes, with changes subject to compliance officer approval.

---

## 8. Multi-Currency Support

### 8.1 Currency Configuration

Currency configuration specifies the tenant's base currency (the currency in which financial statements are denominated) and the foreign currencies in which the tenant transacts. Configuration includes exchange rate sources (central bank, commercial rate provider), exchange rate update cadence (daily, real-time), and currency conversion rules (which rate to use for which transaction type). Currency configuration is layered per the model in PRODUCT_BIBLE Section 22.3, with regional defaults inherited by tenant overrides where applicable.

### 8.2 Transaction Currency Conversion

Transaction currency conversion applies exchange rates to foreign-currency transactions at journal entry posting, converting the foreign-currency amount to the base currency for ledger recording. Conversion uses the rate in effect on the transaction date, with rates sourced from the configured rate source. The original foreign-currency amount and the converted base-currency amount are both recorded in the ledger entry, preserving the original transaction detail alongside the base-currency record. Conversion is validated — entries with conversion errors (wrong rate, wrong date) are surfaced for correction.

### 8.3 Translation Gains and Losses

Translation gains and losses arise from revaluing foreign-currency-denominated balances at period-end exchange rates, with the revaluation producing gains or losses depending on rate movements since the original transaction. Gains and losses are recorded to dedicated translation gain and loss accounts, with classification per accounting standards (typically as other income or other expense). Translation gains and losses are computed at period close, with computation automated and validated against the period-end rates. Translation gains and losses are reported separately in the financial statements, supporting analysis of the organization's foreign-currency exposure.

### 8.4 Foreign Currency Financial Statements

Foreign currency financial statements translate the financial statements of foreign entities into the consolidated reporting currency for consolidation purposes. Translation uses the period-end rate for balance sheet accounts and the average rate for the period for income statement accounts, with the translation adjustment recorded in accumulated other comprehensive income. Translation is performed at consolidation, with translation rules configurable per consolidation group and per accounting standard. Foreign currency financial statement translation is essential for healthcare networks with foreign operations.

---

## 9. User Roles

### 9.1 Roles That Interact with Accounting

The following roles interact with accounting through the Accounting module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2.

| Role Code | Role | Typical Accounting-Related Responsibilities |
|---|---|---|
| R08 | Biller | View ledger entries sourced from billing; reconcile sub-ledger |
| R09 | Administrator | Cost center management; period close participation |
| R10 | Compliance officer | Tax compliance review; audit trail review |
| R11 | HR manager | View payroll-sourced ledger entries; reconcile payroll sub-ledger |
| R12 | Executive | Financial statement review; strategic financial oversight |
| R13 | System administrator | Tenant configuration of accounting behaviour |
| R14 | Integration account | System-to-system ledger data export |

### 9.2 Permission Categories

Permissions on accounting resources are defined at the action level on the accounting resource, per PRODUCT_BIBLE Section 21.2. Read permissions include viewing chart of accounts, viewing ledger entries, viewing financial statements, viewing cost center reports. Write permissions include creating journal entries, posting journal entries, configuring cost centers, performing period close. Execute permissions include reconciliation, financial statement generation, consolidation. Administer permissions include configuring chart of accounts, configuring tax codes, configuring consolidation rules, managing fiscal periods.

### 9.3 Segregation of Duties

Accounting operations are subject to segregation-of-duty controls to prevent fraud and error. The user who creates a manual journal entry cannot be the user who posts it; the user who performs bank reconciliation cannot be the user who records cash transactions; the user who configures tax codes cannot be the user who approves tax returns. Segregation-of-duty controls are enforced by the Identity & Access module's permission framework and are reviewed by the compliance officer role. Violations of segregation-of-duty controls are recorded in the audit trail and are surfaced for compliance review, in keeping with financial control best practices.

Segregation-of-duty controls in healthcare accounting are particularly stringent because of the regulatory and audit scrutiny that healthcare financial operations receive. Healthcare organizations are subject to cost-report auditing (for government payer reimbursement), to fraud and abuse investigations (for billing integrity), and to internal audit (for financial control verification). The Accounting module's segregation-of-duty configuration supports these multiple audit lenses, with controls designed to satisfy the most stringent of the applicable requirements. The configuration is reviewed at architectural review and is documented in the module's configuration schema for transparency.

---

## 10. Workflows

### 10.1 Workflows the Module Triggers

The Accounting module triggers workflows in response to accounting lifecycle events. Journal entry posting triggers ledger update and reconciliation validation. Period close triggers the close workflow — accrual entries, deferral entries, revaluation entries, sub-ledger reconciliation, and financial statement generation. Bank reconciliation triggers discrepancy investigation workflow. Tax reporting triggers tax return preparation workflow. Consolidation triggers inter-entity elimination and combined statement generation.

### 10.2 Workflows the Module Participates In

The Accounting module participates in workflows owned by other modules by consuming their events and by responding to their queries. The Billing module publishes billing events (invoice generation, payment posting, adjustment) that the Accounting module consumes to record journal entries. The HR module publishes payroll events that the Accounting module consumes to record payroll journal entries. The Reporting module queries the Accounting module for financial data for operational and analytical reports. The Audit module records every consequential accounting action.

### 10.3 Audit Events Generated

The Accounting module generates audit events for every consequential action, in keeping with the audit architecture defined in SYSTEM_ARCHITECTURE Section 27. Audit events include journal entry creation, journal entry posting, journal entry reversal, chart of accounts change, period open, period close, period reopen, financial statement generation, bank reconciliation, reconciliation resolution, tax return generation, and consolidation execution. Every audit event includes the actor, the action, the resource, the tenant, the scope, the previous state, the new state, the authorization basis, the result, and the context, per the audit record structure in SYSTEM_ARCHITECTURE Section 27.4.

Accounting audit events are particularly important for financial accountability and regulatory compliance. Every journal entry is traceable from source transaction through posting to financial statement. Every period close is traceable through each close task to the financial statements produced. Every reconciliation is traceable through each discrepancy to its resolution. The audit trail allows auditors and regulators to reconstruct any financial event, identify the actors involved, and verify the authorization basis. Accounting audit records are immutable, append-only, and tamper-evident, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

---

## 11. Data Models

### 11.1 Core Entities

The Accounting module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Journal Entry | A single journal entry in the general ledger |
| Account | A single account in the chart of accounts |
| Ledger | The collection of posted journal entries |
| Cost Center | An organizational unit for cost attribution |
| Fiscal Period | A defined accounting period (month, quarter, year) |
| Trial Balance | A list of account balances at a point in time |
| Balance Sheet | The balance sheet financial statement |
| Income Statement | The income statement financial statement |
| Cash Flow Statement | The cash flow statement financial statement |

### 11.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Journal Entry Line records a single debit or credit within a journal entry. The Account Type classifies accounts by balance sheet or income statement behavior. The Currency records a foreign currency configuration. The Exchange Rate records a rate at a point in time. The Tax Code defines a tax treatment. The Consolidation Group defines the entities included in a consolidation. The Bank Reconciliation records a reconciliation between ledger cash and bank statement. The Reconciliation Discrepancy records an unresolved difference between ledger and external data.

### 11.3 Entity Relationships

Core entities relate to the Ledger entity as the central accounting object. A Journal Entry references the Ledger and contains Journal Entry Lines. An Account references the Chart of Accounts and carries an Account Type. A Cost Center is referenced by Journal Entry Lines for cost attribution. A Fiscal Period references the Ledger and controls posting eligibility. A Trial Balance references the Ledger and Account balances at a point in time. Financial statements (Balance Sheet, Income Statement, Cash Flow Statement) reference the Ledger and are generated from account balances. References to peer-module entities are logical identifiers, not direct data-store references (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 11.4 Aggregate Boundaries and Journal Entry Integrity

The Journal Entry is the aggregate root for the general ledger bounded context, per the aggregate boundary principle in MODULE_ARCHITECTURE Section 11.3. A journal entry's lines — the debits and credits that comprise the entry — are subordinate to the entry and cannot exist independently. A Journal Entry Line without a parent Journal Entry is a defect, not a recoverable state. The aggregate boundary ensures that journal entry posting is atomic: an entry either posts completely (all lines recorded, account balances updated, period status verified) or fails completely (no lines recorded, no balances updated, no status change). Partial posting is rejected at the contract level because it would produce an unbalanced ledger, which is a defect with direct financial consequences.

The double-entry accounting invariant — debits equal credits for every entry — is enforced at the aggregate boundary. A journal entry that does not balance is rejected before posting; the rejection is recorded in the audit trail with the actor, the time, and the rejection reason. The invariant is non-negotiable in Ibn Hayan because the entire financial reporting structure depends on it: an unbalanced entry would propagate to trial balance, financial statements, and regulatory filings, producing materially incorrect financial reports. Cost center attribution is similarly atomic: every journal entry line carries a cost center reference, and an entry with mixed cost center attribution is validated against the cost center hierarchy before posting, preventing cost attribution errors that would misstate departmental performance.

---

## 12. Integrations

### 12.1 Peer Module Integrations

The Accounting module integrates with peer modules through published contracts. The Billing module publishes billing events (invoice generation, payment posting, adjustment) that the Accounting module consumes to record journal entries. The HR module publishes payroll events that the Accounting module consumes. The Reporting module queries the Accounting module for financial data for operational and analytical reports. The Configuration module provides the configuration surface for accounting behaviour. The Localization module provides regional chart templates and tax reporting templates. The Audit module records every consequential accounting action.

### 12.2 External System Integrations

External system integrations are mediated by the Integration module (deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the Accounting module's contracts through integration adapters that align with financial system interoperability patterns — general ledger export to external financial reporting systems, bank statement import for bank reconciliation, tax filing system interfaces for tax return submission, and consolidation system interfaces for group reporting. The Accounting module is not aware of the specific external systems; it is aware only of the Integration module's contracts.

### 12.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Synchronous command is used for manual journal entry posting and period close where immediate confirmation is required. Synchronous query is used for ledger balance lookup and financial statement generation. Asynchronous event is used for ledger lifecycle events (entry posted, period closed, statement generated) that peer modules consume. The outbox pattern is used for journal entry posting events, ensuring that ledger updates are reliably delivered to peer modules that maintain projections of ledger data. Anticorruption layers translate between external financial system models and the Ibn Hayan accounting model, preventing external model leakage per the context relationship pattern in SYSTEM_ARCHITECTURE Section 7.3.

---

## 13. Configuration

### 13.1 Configuration Categories

The Accounting module's configuration surface is organized into the categories defined in MODULE_ARCHITECTURE Section 10.3. Behavioural configuration includes chart of accounts structure, journal entry validation rules, period close workflow, financial statement templates, and consolidation rules. Structural configuration includes feature flags for capabilities like multi-currency, multi-entity consolidation, and cash vs. accrual basis. Integration configuration includes external financial system endpoints, bank statement import configuration, and tax filing system configuration. Localization configuration includes regional chart templates, regional financial statement formats, and regional tax reporting templates. Security configuration includes segregation-of-duty rules, period close authority, and financial data access scoping. Regulatory configuration includes financial record retention policies, tax reporting compliance rules, and audit trail retention.

### 13.2 Tenant-Configurable vs Platform-Configurable

The configuration surface distinguishes between tenant-configurable categories and platform-configurable categories, per MODULE_ARCHITECTURE Section 10.3. Tenant-configurable categories include chart of accounts structure, cost center definitions, period close workflow, and financial statement templates; these may be overridden by tenant administrators within validation constraints. Platform-configurable categories include the journal entry state machine, the ledger posting invariants, the audit record structure, and the segregation-of-duty controls; these are reserved for the platform and may not be overridden by tenants. The distinction is enforced by the Configuration module's service and is part of the configuration schema published by the Accounting module.

### 13.3 Configuration Governance

Configuration governance follows the framework defined in MODULE_ARCHITECTURE Section 10.5 and SYSTEM_ARCHITECTURE Section 8.7. Every configuration change is validated before application, audited on application, reversible through rollback, and reviewable through the audit trail. Changes that affect financial accuracy — for example, a change to chart of accounts structure — require compliance review. Changes that affect regulatory compliance — for example, a change to tax codes — require compliance officer review. Changes that affect segregation-of-duty controls — for example, a change to period close authority — require architectural review. The governance posture is documented in the module's configuration schema and is reviewed at architectural review.

The Accounting module's configuration governance is particularly stringent because of the module's financial accountability. A configuration change that compromises ledger integrity — for example, a change to journal entry validation that allows unbalanced entries — propagates to financial statements and may produce inaccurate regulatory filings. The module's configuration schema marks such changes as requiring architectural review, with the review conducted by the Architecture Council rather than by tenant administrators alone. This is the operational expression of Principle P1 (Healthcare Safety Overrides All Others) and Principle P13 (Auditability as Primitive) applied to financial configuration.

---

## 14. Permissions

### 14.1 Action-Level Permissions on Accounting Resources

Permissions are defined at the action level on the accounting resource, per PRODUCT_BIBLE Section 21.2. The permission matrix includes read, write, execute, and administer actions on journal entry, account, ledger, cost center, fiscal period, and financial statement resources. The matrix is large but stable. Direct user-permission assignment is forbidden; permissions are assigned through roles, per PRODUCT_BIBLE Section 21.3.

### 14.2 Scoping Rules

Permissions are scoped, not global, per PRODUCT_BIBLE Section 21.4. An accountant may have write permission on journal entries at their entity without having write permission on journal entries at another entity. Scoping is by organizational unit, by entity, by facility, by cost center, and by account (an accountant may be scoped to manage specific accounts). Scoping is enforced at the action level; an accountant without write permission on a specific account cannot post entries to that account through any surface. Multi-entity financial visibility is configurable for group-level financial staff, with read access across entities for consolidated reporting but write access remaining entity-scoped.

### 14.3 Permission Inheritance and Segregation of Duties

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 6.6 and PRODUCT_BIBLE Section 21.5. Inheritance is explicit, documented, and auditable. Segregation-of-duty controls are layered on top of inheritance, preventing the same user from holding conflicting permissions on the same financial scope. A user with write permission on journal entry creation is excluded from holding write permission on journal entry posting for the same entity. Segregation-of-duty exclusions are configured per role combination and per financial scope, with the compliance officer role having visibility into the exclusions for review.

---

## 15. Reports

### 15.1 Operational Reports

Operational reports surface accounting activity for daily operational management. Reports include daily journal entry summary, reconciliation status, period close status, bank reconciliation status, and tax reporting queue. Operational reports are generated through the Reporting module's contracts, with the Accounting module providing the underlying data. Reports are typically consumed by controllers, accountants, and financial managers for day-to-day decisions.

### 15.2 Analytical Reports

Analytical reports surface financial trends for strategic planning. Reports include revenue and expense trends, cost center performance comparison, profitability analysis by service line, cash flow trend analysis, and key financial ratio trends (liquidity, solvency, profitability). Analytical reports are generated through the Reporting module's analytical pipeline, with financial data aggregated over time and across entities.

### 15.3 Regulatory Reports

Regulatory reports surface accounting-related compliance evidence. Reports include financial statements (balance sheet, income statement, cash flow statement) for regulatory filing, tax returns (sales tax, payroll tax, income tax) for tax authority submission, audit trail reports for external auditor review, and consolidation reports for group regulatory filing. Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8.

---

## 16. API Surface

### 16.1 Contract Categories

The Accounting module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the Accounting module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 16.2 Command Contracts

Command contracts are requests to perform an action that changes accounting state. Examples include CreateJournalEntry, PostJournalEntry, ReverseJournalEntry, OpenPeriod, ClosePeriod, ReopenPeriod, GenerateFinancialStatement, PerformBankReconciliation, ExecuteConsolidation. Commands are synchronous where the caller requires immediate confirmation, asynchronous where the caller does not. Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the audit trail. Commands are idempotent where the operation supports idempotency.

### 16.3 Query Contracts

Query contracts are requests to retrieve accounting state without changing it. Examples include GetJournalEntry, GetAccountBalance, GetTrialBalance, GetFinancialStatement, GetCostCenterReport, GetBankReconciliation. Queries are synchronous, returning the requested state or a not-found response. Queries are scoped to the caller's authority — a caller without read permission on a specific entity's ledger receives a not-found response rather than the data.

### 16.4 Event Contracts

Event contracts are notifications that something has happened in the Accounting module. Examples include JournalEntryPosted, JournalEntryReversed, PeriodOpened, PeriodClosed, FinancialStatementGenerated, BankReconciliationCompleted, ConsolidationExecuted, ChartOfAccountsChanged. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which peer modules (especially the Reporting module) maintain their local projections of accounting data.

### 16.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the Accounting module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy.

---

## 17. Future Enhancements

### 17.1 Extension Points

The Accounting module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom financial statement formats (for organizations whose reporting requirements exceed the platform default), custom cost center dimensions (for organizations whose cost attribution needs are non-standard), custom consolidation rules (for groups whose consolidation requirements are non-standard), and custom tax reporting templates (for jurisdictions whose templates are not supported by the platform defaults). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

### 17.2 Module Lifecycle

The Accounting module is at the Mature stage of the module lifecycle (LC4, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6). The module has been in General Availability since the platform's Professional edition launch, has completed the defined period of stable operation required for transition to Mature, and has a long-term support commitment. The module's contracts are stable; breaking changes follow the platform's deprecation policy.

### 17.3 Edition Availability

The Accounting module is included in selected editions of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) does not include the Accounting module. The Essential edition (E1) does not include the Accounting module — full general ledger accounting is not a typical capability for solo and small practices, which often use external accounting systems. The Professional edition (E2) includes the Accounting module with chart of accounts, general ledger, journal entries, and financial statements for single-entity operation. The Enterprise edition (E3) adds multi-currency, multi-entity consolidation, advanced cost center accounting, and integration with external financial reporting systems. Edition packaging does not modify module internals; all editions run the same code.

### 17.4 Clinic Type Relevance

The Accounting module is relevant to clinic types where enterprise financial accounting is operationally significant. The following clinic types have particular reliance on advanced accounting module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C9 Single hospital | Multi-department cost center accounting; full financial statements |
| C10 Hospital network | Multi-entity consolidation; group financial reporting |
| C11 Academic medical centre | Multi-source revenue (clinical, research, education); complex cost allocation |
| C18 Emergency department | Cost center accounting for high-acuity, high-cost operations |
| C20 Day surgery | Procedure-level cost accounting; profitability analysis |
| C21 Inpatient ward | Cost center accounting for inpatient operations |
| C22 Intensive care unit | High-cost unit accounting; cost per case analysis |
| C23 Pharmacy | Inventory valuation; cost of goods sold accounting |
| C30 Long-term care facility | Long-stay revenue recognition; cost center accounting |

### 17.5 Operational Considerations

Operational considerations for the Accounting module include period close performance, reconciliation integrity, and data volume. Period close performance is a concern for tenants with high transaction volume — a large enterprise tenant may post hundreds of thousands of journal entries per month, requiring the close workflow to handle the volume within the close window. Close performance is monitored as a module health metric, with sustained slowdowns triggering operational investigation.

Reconciliation integrity is the most critical operational concern — ledger data that does not reconcile to sub-ledgers or to external data indicates a defect that must be investigated immediately, as unreconciled discrepancies may indicate fraud, error, or system malfunction. Reconciliation is performed at configurable intervals, with discrepancies escalated for investigation. Data volume is managed through archival, with older ledger data moved to long-term storage to maintain operational performance for current-period queries. Offline operation is not supported for accounting functions, because accounting data must remain consistent across the tenant and because period close requires access to the complete ledger; accounting operations are deferred until connectivity is restored, in keeping with the offline-first principle (P11, SYSTEM_ARCHITECTURE Section 4.11) for non-clinical data.

---

## 18. Related Documents

### 18.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (M10 Accounting, BC08)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P2, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC08 Accounting)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface

### 18.2 Peer Module References

- PATIENTS.md — Patient module (BC01); provides patient identity for cost center attribution
- APPOINTMENTS.md — Scheduling module (BC06); provides encounter data for revenue recognition
- BILLING.md — Billing module (BC07); provides billing events for journal entry recording
- CRM.md — CRM module (BC11); consumes financial data for patient lifetime value computation
- DOCTORS.md — Workforce module (BC10); provides compensation events for payroll journal entries
- RECEPTION.md — Reception module (subset of BC06 + BC01); provides payment events for cash recording
- AUDIT_LOGS.md — Audit module (BC17); records every consequential accounting-related action

### 18.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit (every permission check on financial data is recorded in the audit trail, with separate treatment for read access on ledger entries and write access to journal entries)

