# Ibn Hayan Healthcare Operating System — Configuration Architecture

| Field | Value |
|---|---|
| Document Title | Configuration Architecture |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Implementation-Grade Architectural Specification |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 2.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Senior software architects, module owners, configuration service owners, principal engineers, security architects, compliance officers, SRE leadership |
| Scope | Configuration architecture: the eight-layer model, tenant and module configuration surfaces, feature flag architecture, storage, the five validation rule categories, lifecycle, environment-specific configuration, security, hot-reload, audit trail, governance |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, vendor- or product-specific configuration syntax, per-key configuration catalogue entries, deployment runbooks |
| Conflict Resolution | SYSTEM_ARCHITECTURE.md prevails. Any conflict between this document and SYSTEM_ARCHITECTURE.md is resolved in favour of SYSTEM_ARCHITECTURE.md until SYSTEM_ARCHITECTURE.md is amended through an Architecture Decision Record (ADR). |
| Amendment Mechanism | Architecture Council ratification through an ADR; recorded in CHANGELOG with explicit version increment |
| Predecessor | v1.0.0 (initial elaboration) |
| Supersedes | All prior configuration-architecture drafts and internal memos |

---

## Table of Contents

1. Configuration Architecture Overview
2. Configuration Layer Model
3. Tenant Configuration
4. Module Configuration
5. Feature Flag Architecture
6. Configuration Storage
7. Configuration Validation
8. Configuration Lifecycle
9. Environment-Specific Configuration
10. Configuration Security
11. Configuration Hot-Reload
12. Configuration Audit Trail
13. Configuration Governance

---

## 1. Configuration Architecture Overview

### 1.1 Purpose and Scope

This document is the implementation-grade elaboration of the configuration architecture for the Ibn Hayan Healthcare Operating System. It expands the configuration commitments codified in `SYSTEM_ARCHITECTURE.md` Sections 8 (Configuration-Driven Architecture), 14 (Feature Flag Strategy), and 15 (Configuration Strategy) into the structural and operational detail required by architects, module owners, and the configuration service team. Where the parent document states architectural commitments, this document defines the layer model, storage architecture, validation engine, lifecycle, and audit semantics that realize them.

The scope of this document is the configuration system itself: how configuration is structured into layers, how it is stored and versioned, how it is validated before application, how it is audited after application, how feature flags differ from configuration, and how the entire system is governed across environments. Out-of-scope topics include the per-key configuration catalogue, vendor- or product-specific configuration syntaxes, deployment runbooks, and the implementation of any individual configuration key. Those concerns belong to per-module specifications and operational documentation.

### 1.2 Architectural Position

Configuration is a first-class architectural citizen of the platform, not an operational afterthought. The platform adapts to customer need through configuration rather than customization, in fulfilment of Principle P-2 (Configuration Before Customization) of `PRODUCT_BIBLE.md` Section 22.8. This positioning has direct structural consequences: configuration has its own bounded context (the Configuration context), its own service (the configuration service), its own store, its own validation engine, its own audit partition, and its own governance framework. None of these are incidental appendages to other systems.

This document sits below `SYSTEM_ARCHITECTURE.md` and alongside `SOFTWARE_ARCHITECTURE.md` and `MODULE_ARCHITECTURE.md` in the architecture-spine hierarchy. It elaborates the configuration commitments of `SYSTEM_ARCHITECTURE.md` without contradicting them. It constrains downstream artifacts, including per-module configuration specifications, the domain-level configuration model, feature flag definitions, and audit architecture documentation. Where a downstream artifact conflicts with this document, this document prevails until an ADR amends it.

### 1.3 Foundational Commitments

The configuration architecture rests on five commitments that recur throughout this document. First, configuration is data — versioned, validated, audited, and treated with the discipline applied to any other durable platform state. Second, configuration is layered — eight layers with explicit precedence, governed by inheritance and override rules. Third, configuration is validated before application — no configuration change reaches production without passing the five validation rule categories defined in `SYSTEM_ARCHITECTURE.md` Section 15.4. Fourth, configuration is auditable after application — every change, including rollback and promotion, is recorded in a tamper-evident audit trail. Fifth, configuration is governed — change approval, sandbox testing, and stakeholder communication are part of the configuration lifecycle, not optional embellishments.

These commitments are not aspirational. They are the architectural floor below which the configuration system is considered defective. A configuration change that bypasses validation is a defect. A configuration change that is not audited is a defect. A configuration change applied to production without sandbox testing is a defect, except through the documented emergency pathway. The remainder of this document defines how these commitments are realized.

### 1.4 Elaboration Map

The table below traces the parent `SYSTEM_ARCHITECTURE.md` sections that this document elaborates. Where this document and the parent appear to conflict, the parent prevails. Cross-references to the parent are explicit throughout, and the section codes (L1–L8, V1–V5, FF1–FF5, FFL1–FFL5) are preserved exactly to permit unambiguous traceability.

| Parent Section | Parent Topic | Elaborated In |
|---|---|---|
| `SYSTEM_ARCHITECTURE.md` 8.2 | Configuration as architectural concern | Section 1.2, Section 2 |
| `SYSTEM_ARCHITECTURE.md` 8.3 | Configuration surface | Section 4.1 |
| `SYSTEM_ARCHITECTURE.md` 8.6 | Configuration and audit | Section 12 |
| `SYSTEM_ARCHITECTURE.md` 8.7 | Configuration governance | Section 13 |
| `SYSTEM_ARCHITECTURE.md` 14.2 | Feature flag types | Section 5.2 |
| `SYSTEM_ARCHITECTURE.md` 14.3 | Feature flag lifecycle | Section 5.3 |
| `SYSTEM_ARCHITECTURE.md` 14.4 | Feature flag evaluation | Section 5.4 |
| `SYSTEM_ARCHITECTURE.md` 14.6 | Flag vs configuration distinction | Section 5.1 |
| `SYSTEM_ARCHITECTURE.md` 15.2 | Configuration layer model | Section 2 |
| `SYSTEM_ARCHITECTURE.md` 15.4 | Configuration validation | Section 7 |
| `SYSTEM_ARCHITECTURE.md` 15.5 | Configuration versioning | Section 8.3 |
| `SYSTEM_ARCHITECTURE.md` 15.6 | Configuration audit | Section 12 |
| `SYSTEM_ARCHITECTURE.md` 15.7 | Configuration sandbox | Section 8.5, Section 9, Section 13.4 |
| `SYSTEM_ARCHITECTURE.md` 15.8 | Configuration hot-reload | Section 11 |
| `PRODUCT_BIBLE.md` 22 | Configuration-driven philosophy | Section 1.2, Section 13 |

### 1.5 Audience and Reading Guide

The primary audience is the architect community: software architects designing configuration-aware modules, the configuration service team operating the configuration store and validation engine, module owners declaring their configuration surfaces, and security architects responsible for configuration access and audit. The secondary audience is engineering managers, compliance officers, and SRE leadership who must understand the configuration system's behaviour during incidents and audits.

Readers seeking a structural overview should read Sections 1 through 5 in order. Readers seeking the operational behaviour of the configuration system should focus on Sections 6 through 11. Readers concerned with audit and governance should focus on Sections 12 and 13. Each H2 section is self-contained; cross-references are explicit and bidirectional where they exist. The verbs *must*, *should*, and *may* are used in their normative sense throughout.

---

## 2. Configuration Layer Model

### 2.1 The Eight-Layer Model

The platform's configuration is organized into eight layers with explicit precedence, as defined in `SYSTEM_ARCHITECTURE.md` Section 15.2 and reflected in `PRODUCT_BIBLE.md` Section 22.3. Each layer has a defined scope, a typical owner, and a defined authority boundary. Layers are not advisory groupings; they are the structural units of configuration inheritance and override.

| Layer | Code | Scope | Typical Owner |
|---|---|---|---|
| Platform default | L1 | All customers, all tenants | Ibn Hayan product team |
| Edition | L2 | All customers on a given edition | Ibn Hayan product team |
| Tenant | L3 | A single customer's tenant | Customer system administrator |
| Facility | L4 | A facility within a customer | Customer facility administrator |
| Department | L5 | A department within a facility | Customer department administrator |
| Care team | L6 | A care team within a department | Customer care team lead |
| User | L7 | A single user | The user or their delegate |
| Session | L8 | A single session | The user, transient |

Precedence runs from L1 (lowest) to L8 (highest). A value at a higher-numbered layer overrides a value at a lower-numbered layer for the same configuration key, subject to the overridability rules in Section 2.3. Layers L1 and L2 are platform-authoritative and customer-immutable; layers L3 through L8 are customer-authoritative within bounds. The platform default and edition layers are governed through the platform's architectural review process and change only with platform releases; the customer layers are governed by the customer's configuration governance framework defined in Section 13.

### 2.2 Layer Precedence and Override Semantics

Layer precedence is governed by four rules. First, the default applies unless overridden: if no layer provides a value for a key, the platform default at L1 applies. Second, more specific overrides less specific: an L4 facility value overrides an L3 tenant value, which overrides an L2 edition value, which overrides the L1 platform default. Third, override is per-key, not per-record: a facility may override selected keys of a configuration record while inheriting the remainder from the tenant layer. Fourth, override is explicit and audited: a layer that does not provide a value inherits from the next layer up, and every override is recorded in the audit trail described in Section 12.

Override semantics are deterministic. For any given (tenant, facility, department, care team, user, session) context and any given configuration key, the resolved value is uniquely determined. Modules never perform their own resolution; they receive the resolved value from the configuration service described in Section 4.3. This centralization is non-negotiable. A module that resolves configuration locally is defective because it bypasses validation, audit, and the cache invalidation mechanism.

### 2.3 Per-Key Overridability

Not every configuration key is overridable at every layer. Some keys are fixed at a lower layer for safety, regulatory, or architectural reasons. The overridability of a key is declared in its schema, as part of the module's configuration surface described in Section 4.2. The schema declares, for each key, the layers at which the key may be overridden and the layers at which it must inherit.

| Overridability Class | Meaning | Example Use |
|---|---|---|
| Fixed at L1 | No layer may override; the platform default is binding | Platform invariants such as audit enablement |
| Fixed at L2 | Only the edition may set the value; lower layers inherit | Module availability per edition |
| Overridable down to L3 | The tenant may override; facility and below inherit | Tenant-wide locale |
| Overridable down to L4 | The facility may override; department and below inherit | Facility operating hours |
| Overridable down to L5 | The department may override; care team and below inherit | Department-specific documentation templates |
| Overridable down to L7 | The user may override; session inherits | User display preferences |
| Overridable at every layer | Any layer may override | Notification routing preferences |

Overridability is enforced at validation time. A configuration record submitted at a layer that lacks override authority for the key is rejected by the validation engine, regardless of who submitted it. This enforcement is the structural mechanism by which the platform protects invariants and regulatory commitments against well-intentioned but out-of-authority configuration changes.

### 2.4 Effective Configuration Composition

A tenant's effective configuration is the composition of all eight layers from L1 down to L8 for the relevant context. Composition is computed by the configuration service at evaluation time, using the inheritance and override rules defined in Section 2.2 and the per-key overridability rules defined in Section 2.3. Consumers receive the resolved value, together with metadata that records which layer supplied the value and when that value was last modified.

Composition is request-scoped, not pre-computed. The configuration service resolves values on demand, using its cache as described in Section 6.5 to maintain performance. Pre-computing the effective configuration for every possible context is infeasible because the context space is large and changes frequently. Request-scoped resolution also ensures that overrides applied moments ago are reflected immediately, subject to the hot-reload semantics in Section 11.

### 2.5 Conflict Detection and Resolution

Where two configuration records at the same layer purport to provide a value for the same key in the same scope, the conflict is detected at validation time, not at evaluation time. The conflict is resolved by, in order: explicit precedence rules declared in the configuration schema; recency, where the schema does not specify precedence; or manual resolution, where automatic resolution is unsafe and the conflict is surfaced to an administrator. A configuration that produces an unresolvable conflict is rejected at submission, before it can affect runtime behaviour.

Conflict detection extends to indirect conflicts. Two records that are individually valid may produce an inconsistent effective configuration when composed — for example, a facility-level record that, combined with a tenant-level record, leaves a workflow unable to reach a terminal state. The semantic validation rule category described in Section 7.4 catches such indirect conflicts at validation time. Conflicts that escape detection at validation time and surface at evaluation time are defects in the validation engine and are remediated as such.

### 2.6 Layer Governance Boundaries

Each layer has a defined governance boundary. Layers L1 and L2 are governed by the Architecture Council through the ADR process; customer personnel cannot modify them. Layer L3 is governed by the customer's system administrator role; delegation to lower roles is itself a configuration action that is audited. Layers L4 through L7 are governed by delegation from L3, with the delegation chain auditable end-to-end. Layer L8 is transient and is governed by the active session's user, within the bounds set by L7.

Governance boundaries are enforced by the authorization model described in Section 10.1. A configuration change that exceeds the submitter's layer authority is rejected before validation, with the rejection itself recorded as a security-relevant audit event. The boundary between layers is structural, not advisory; an administrator with L4 authority cannot exercise L3 authority, even with the L3 administrator's verbal consent, because authority is delegated through configuration actions that are themselves audited.

---

## 3. Tenant Configuration

### 3.1 Tenant Configuration Surface

Tenant configuration adapts the platform to a specific tenant's needs, within the bounds of the tenant's edition. It is the primary mechanism by which one platform serves many organizations, in fulfilment of Principle P-3 (One Platform, Many Organizations) of `PRODUCT_BIBLE.md` Section 22.8. The tenant configuration surface is large and is organized by configuration area, not by module, because tenant administrators think in operational terms rather than module terms.

| Configuration Area | Examples |
|---|---|
| Organizational structure | Facilities, departments, care teams, their hierarchies |
| Module enablement | Which modules are enabled for the tenant, subject to edition constraints |
| Workflow definitions | Tenant-specific clinical and operational workflows |
| Documentation templates | Tenant-specific clinical documentation templates |
| Pricing and billing schedules | Tenant-specific pricing for billing, tax rules, invoice formats |
| Notification templates | Tenant-specific notification content, channels, routing |
| Integration configuration | External system endpoints, schedules, credentials (referenced, not stored) |
| Localization | Tenant locale, calendar, regional formats, preferred languages |
| Security policies | Authentication policies, session policies, MFA requirements |
| Branding | Visual identity, communication templates, public-facing text |

The surface is documented as a contract. A tenant administrator can rely on the surface remaining stable across platform releases, with breaking changes following the deprecation policy. The configuration surface is bounded by what can be expressed without source-level modification; behaviours that would require source changes are out of scope or candidates for platform evolution through the extension surface defined in `SYSTEM_ARCHITECTURE.md` Section 22.

### 3.2 Tenant Overlay Constraints

A tenant's configuration is an overlay on the edition and platform default layers. The overlay cannot violate platform invariants or edition constraints; it can only adapt within them. The overlay is therefore bounded both above (by edition and platform) and below (by the overridability rules in Section 2.3 that govern which keys the tenant layer may set).

| Constraint | Source | Example |
|---|---|---|
| Module availability | Edition | The Essentials edition cannot enable the Accounting module |
| Hierarchy depth | Edition | The Essentials edition cannot have facility-level administrators |
| Feature availability | Edition or entitlement | The Public Sector edition exposes additional regulatory reporting features |
| Regulatory regime | Region | A tenant in a region must comply with that region's regulations |
| Platform invariants | Architecture | A tenant cannot disable audit; a tenant cannot disable validation |
| Overridability | Per-key schema | A key fixed at L1 cannot be overridden by any tenant |

Overlay constraints are enforced at validation time. A tenant configuration record that violates an edition constraint is rejected by the contextual validation rule category described in Section 7.5. A tenant configuration record that violates a regulatory constraint is rejected by the regulatory validation rule category described in Section 7.6. The platform does not permit a tenant to opt out of regulatory compliance through configuration; such opt-outs would require an ADR.

### 3.3 Tenant Configuration Authority and Delegation

Tenant configuration is authorized by the tenant administrator role. The tenant administrator may delegate finer-grained configuration authority to facility administrators, department leads, and care team leads, within the bounds of the tenant's edition and the platform's overridability rules. Delegation is itself a configuration action and is audited. A delegation that exceeds the tenant administrator's authority is rejected at validation time, before it takes effect.

Delegation is scope-bound. A tenant administrator may delegate L4 authority over a specific facility to a specific facility administrator, but cannot delegate L4 authority over all facilities indiscriminately, because doing so would defeat the purpose of layer isolation. Delegated authority is revocable; revocation is an audited configuration action. The delegation chain is reconstructable from the audit trail, supporting post-incident investigation and compliance review.

### 3.4 Tenant Isolation Guarantees

Tenant configuration is isolated from other tenants. A tenant's configuration cannot reference another tenant's data, modules, users, or configuration records. Cross-tenant configuration references are forbidden and are rejected at validation time by the referential validation rule category described in Section 7.3. This isolation is structural, not advisory; the configuration service enforces it regardless of who submits the configuration.

Tenant isolation extends to configuration storage. The configuration store is tenant-scoped at the storage layer, as described in Section 6.1. A query against the configuration store is bound to a tenant context, and the store rejects any query that attempts to read another tenant's configuration without going through the documented cross-tenant pathway (which exists only for platform-level operations and is itself audited). Tenant isolation is a direct consequence of Principle P-3 and is non-negotiable.

### 3.5 Tenant Provisioning Templates

Tenants are provisioned from templates — curated configuration sets that adapt the platform to a customer size tier and clinic type. Templates are maintained by the product organization and are versioned with platform releases. A tenant adopts a template at provisioning time and customizes within its configuration authority thereafter. Templates are not code; they are configuration. A template can be inspected, compared, and customized without platform changes, in keeping with the configuration-driven philosophy of `PRODUCT_BIBLE.md` Section 22.

Templates evolve over time. A new platform release may ship an updated template that reflects evolved best practice, but existing tenants are not migrated to the new template automatically. A tenant may choose to adopt a newer template version through a documented migration pathway, with the migration itself an audited configuration action. Templates that diverge significantly from platform evolution may be deprecated, with deprecation following the same transition window as other platform contracts.

---

## 4. Module Configuration

### 4.1 Module Configuration Surface as Contract

Each module exposes a configuration surface that is part of the module's contract, as defined in `SYSTEM_ARCHITECTURE.md` Section 13 and elaborated in `MODULE_ARCHITECTURE.md`. The configuration surface declares the set of configuration keys the module accepts, together with their types, defaults, validation rules, inheritance behaviour, and deprecation status. The surface is versioned with the module and follows the same deprecation policy as the module's other contracts.

The configuration surface is documented, not implicit. Module owners publish their configuration surface as part of the module's contract documentation, and the configuration service reads the schema at validation time. A configuration key that is not part of a module's published surface is rejected at validation time, even if the module would in principle accept it. This rejection is structural: it prevents unreviewed configuration from being applied to a module, and it forces module owners to declare configuration changes through their contract rather than slipping them in silently.

### 4.2 Module Configuration Schema Elements

A module's configuration schema declares the elements summarized in the table below. The schema is the authoritative source for what the module accepts; the validation engine in Section 7 enforces the schema without exception.

| Element | Description |
|---|---|
| Keys | Configuration key names, with types (string, integer, boolean, enum, object, array) |
| Defaults | Default values, used when no layer provides a value |
| Constraints | Type constraints, ranges, formats, allowed enumerations |
| Validation rules | Structural, referential, semantic, contextual, regulatory rules per Section 7 |
| Inheritance behaviour | Per-key overridability class per Section 2.3 |
| Required vs. optional | Whether the key must be provided or may be omitted |
| Deprecation status | Whether the key is deprecated and scheduled for removal |
| Restart requirement | Whether changes to the key require module restart per Section 11.3 |
| Secrets handling | Whether the value is a secret reference per Section 10.2 |

The schema is the single source of truth for the module's configuration surface. Documentation, runtime validation, and tooling all derive from the schema. A divergence between documented behaviour and schema-declared behaviour is a defect in one or the other and is remediated as such. The schema is also the basis for the configuration key catalogue described in `SYSTEM_ARCHITECTURE.md` Section 15.3.

### 4.3 Configuration Resolution Path

Module configuration is resolved by the configuration service, not by each module. Modules receive the resolved value for their context; they do not perform their own resolution. This centralization is structural, not a convenience: it ensures that the resolution rules in Section 2.2 are applied consistently, that the per-key overridability rules in Section 2.3 are respected, and that the audit trail in Section 12 captures the source of every resolved value.

The resolution path proceeds as follows. First, the module requests the value of a configuration key, providing the current context (tenant, facility, department, care team, user, session). Second, the configuration service resolves the value by walking the layers from L8 down to L1, applying overrides and respecting per-key overridability. Third, the configuration service returns the resolved value, together with metadata recording which layer supplied the value, when the value was last changed, and under what authorization. The module uses the resolved value without further interpretation.

### 4.4 Module Caching and Invalidation

Modules may cache configuration values for performance, subject to explicit invalidation rules. The cache key includes the configuration key and the context (tenant, facility, department, care team, user, session). Each cached value carries a time-to-live, after which it is re-resolved. The configuration service notifies modules when their configuration changes, allowing proactive invalidation before the time-to-live expires. If the configuration service is unavailable, modules may use cached values, with awareness that the values may be stale.

A module that uses stale configuration beyond its time-to-live is defective. The time-to-live is therefore short — typically measured in seconds — and the proactive invalidation mechanism in Section 11.2 ensures that changes propagate promptly. Modules that require longer caching windows must declare the trade-off explicitly in their contract, with the longer window documented as a known latency between configuration change and behavioural change.

### 4.5 Inter-Key Dependencies

Some configuration values depend on others. For example, a notification template may reference a locale, and the locale must be available for the tenant; a workflow definition may reference a role, and the role must exist. The configuration schema declares dependencies, and the validation engine verifies that dependencies are satisfied at submission time. The semantic validation rule category in Section 7.4 governs dependency checks.

Dependencies may be intra-module or inter-module. Intra-module dependencies are declared in the module's own schema. Inter-module dependencies are declared in the dependent module's schema and resolved against the depended-on module's published surface. Inter-module dependencies are part of the module's contract and follow the same deprecation policy as other contract elements. A module that silently depends on another module's configuration key, without declaring the dependency, is defective.

---

## 5. Feature Flag Architecture

### 5.1 Feature Flag vs Configuration Distinction

Feature flags and configuration are distinct mechanisms, as defined in `SYSTEM_ARCHITECTURE.md` Section 14.6. Feature flags control binary or near-binary capability exposure; configuration controls continuous behavioural parameters. The distinction is structural, not stylistic: a behaviour that should be a configuration key is defective as a feature flag, and vice versa. The distinction is enforced at architectural review.

| Dimension | Feature Flag | Configuration |
|---|---|---|
| Cardinality | Binary or near-binary (on/off, variant A/B) | Continuous (ranges, enums, objects) |
| Lifetime | Temporary — scheduled for removal per Section 5.3 | Permanent — persists across releases |
| Change frequency | High — per rollout, per experiment, per incident | Low — per operational change |
| Use case | Capability exposure | Behavioural parameter |
| Governance | Platform team primarily, customer for evaluation | Customer primarily, platform for schema |
| Storage | Feature flag store, optimized for fast evaluation | Configuration store, optimized for audit and versioning |
| Evaluation | Feature flag service, per request | Configuration service, per access |

Both are data, both are versioned, both are audited, both are governed, but they serve different purposes and are managed by separate platform services. A capability that requires continuous parameterization is a configuration key, not a feature flag. A capability that requires binary exposure is a feature flag, not a configuration key. The line between them is policed at architectural review.

### 5.2 Feature Flag Type Catalogue

The platform recognizes five feature flag types, as defined in `SYSTEM_ARCHITECTURE.md` Section 14.2. Each type has its own use case, lifecycle owner, and governance pathway. Flag type is declared at flag definition time and is immutable for the life of the flag.

| Flag Type | Code | Purpose | Lifecycle Owner |
|---|---|---|---|
| Release Flag | FF1 | Decouples deployment from release for new capabilities; controls visibility during gradual rollout | Engineering |
| Experiment Flag | FF2 | Controls variant assignment for A/B or multivariate experimentation | Product |
| Operational Flag | FF3 | Toggles operational behaviour in response to incidents — circuit breakers, fallback paths, degradation controls | Operations / SRE |
| Permission Flag | FF4 | Gates a capability based on user role, tenant, or entitlement — beta access, early access, restricted features | Product |
| Migration Flag | FF5 | Controls behaviour during data or contract migration — phased transition between contract versions | Engineering |

Flag type determines governance. FF1 release flags follow the rollout plan defined at definition. FF2 experiment flags follow the experimentation protocol, including statistical review. FF3 operational flags follow incident procedures and may be toggled by on-call engineers under documented authority. FF4 permission flags follow commercial authorization and require product and commercial sign-off. FF5 migration flags follow the migration plan and are removed when the migration completes. All flag changes are audited.

### 5.3 Feature Flag Lifecycle

Feature flags follow a defined lifecycle, as defined in `SYSTEM_ARCHITECTURE.md` Section 14.3, designed to prevent flag accumulation. A flag that remains in the platform indefinitely is a defect: it accumulates technical debt, obscures the platform's actual behaviour, and complicates testing. The lifecycle is the structural mechanism by which the platform retires flags.

| Stage | Code | Description |
|---|---|---|
| Defined | FFL1 | Flag defined; not yet evaluated |
| Active | FFL2 | Flag in use; evaluation produces a result |
| Static-True | FFL3 | Flag permanently true; scheduled for removal |
| Static-False | FFL4 | Flag permanently false; scheduled for removal |
| Removed | FFL5 | Flag removed from the platform |

The transition from Active (FFL2) to Static-True (FFL3) or Static-False (FFL4) is critical. A flag that has been at the same value for a defined period is transitioned to static status and scheduled for removal. A flag that has been at static status for a defined period is removed (FFL5). The transition windows are type-dependent: FF3 operational flags may have shorter static windows because their purpose is incident response; FF1 release flags may have longer static windows to permit rollback. The lifecycle is enforced by the feature flag service, with overdue transitions surfaced as defects.

### 5.4 Feature Flag Evaluation Semantics

Feature flag evaluation considers context (tenant, edition, user role, facility, custom attributes) and returns a boolean or variant. Evaluation is performed by the feature flag service, not by individual consumers. Within a single request, a flag resolves to the same value regardless of which consumer evaluates it, as required by `SYSTEM_ARCHITECTURE.md` Section 14.4. This consistency is structural: cross-consumer inconsistency would produce incoherent platform behaviour and is forbidden.

| Rule | Description |
|---|---|
| Tenant-scoped | Flag evaluation produces a result per tenant, not globally |
| User-scoped | Some flags (FF4) evaluate per user within a tenant |
| Session-scoped | Some flags (FF2) evaluate per session for experimentation consistency |
| Deterministic | Flag evaluation is deterministic for a given tenant, user, and session |
| Auditable | Flag evaluation is auditable, with the result recorded for consequential actions |

Evaluation is fast. The evaluation path is optimized to minimize latency impact, because flags may be evaluated on every request. Flags that cannot be evaluated quickly are re-architected or moved to configuration. The feature flag service is a separate service from the configuration service precisely because the performance and access profiles differ: the feature flag service optimizes for read latency, while the configuration service optimizes for audit and versioning integrity.

### 5.5 Feature Flag Governance Boundaries

Feature flag governance scales with flag type and scope, as defined in `SYSTEM_ARCHITECTURE.md` Section 14.5. Governance distinguishes between flag definition (a platform-level decision) and flag evaluation (a tenant-scoped decision). Flag definition is owned by the platform team; flag evaluation is owned by the customer's system administrator, within the constraints defined by the flag type. Both are audited.

Governance boundaries are enforced at the flag service. An FF3 operational flag may be toggled by on-call engineers under documented incident authority, but only for the duration of the incident and only within the scope of the incident. An FF4 permission flag requires commercial authorization; engineering cannot toggle it unilaterally. An FF1 release flag follows its rollout plan; deviations from the plan require architectural review. Flag changes that exceed the actor's authority are rejected at the flag service, with the rejection recorded as a security-relevant audit event.

### 5.6 Feature Flag and Bounded Context

Feature flags are implemented by the Feature Flags bounded context (BC18), as defined in `SYSTEM_ARCHITECTURE.md` Section 14.1. The bounded context owns flag definition, flag evaluation, flag lifecycle, and flag audit. Other bounded contexts consume flag evaluation results through the published contract; they do not implement their own flag logic. This centralization is structural: it ensures that flag evaluation is consistent across the platform and that flag lifecycle is enforced uniformly.

The bounded context exposes its configuration surface — the set of flag-related configuration keys it accepts — as part of its contract, per Section 4.1. The configuration surface includes flag definition parameters, evaluation rules, lifecycle thresholds, and audit retention. Changes to the bounded context's configuration surface follow the platform's deprecation policy. The bounded context is itself a module for the purposes of module configuration, and its configuration surface is governed by the same rules as any other module.

### 5.7 v1 Implementation Packaging (ADR-007)

Configuration and Feature Flags are related but distinct mechanisms, as established in Section 5.1. Configuration defines how supported behaviour operates — the continuous behavioural parameters that govern module execution. Feature Flags determine whether capabilities are exposed — the binary or near-binary switches that control capability visibility per tenant, user, or session. The two mechanisms are governed separately, stored separately, evaluated separately, and audited separately; they are not subsumed under a single domain.

For v1 of the platform, feature-flag management may be exposed through the Configuration/Settings module (M15) surface as an implementation-packaging decision ratified by ADR-007. This packaging does not transfer Feature Flags domain ownership to Configuration. The Configuration bounded context (BC16) and the Feature Flags bounded context (BC18) remain conceptually separate: BC16 owns configuration storage, validation, layering, and audit; BC18 owns flag definition, evaluation, lifecycle, and audit. The v1 management-surface packaging inside M15 is an implementation choice that preserves BC18's independent contracts (Section 5.4 evaluation semantics, Section 5.5 governance boundaries), its own audit partition, its own lifecycle (Section 5.3), and its future extractability as a separate deployable unit.

The distinction enforced at architectural review (Section 5.1) is unchanged by the v1 packaging decision. A capability that requires continuous parameterization remains a configuration key, not a feature flag, regardless of where its management surface is exposed; a capability that requires binary exposure remains a feature flag, not a configuration key, regardless of where its management surface is exposed. The packaging decision is reversible through a future ADR without altering the domain boundary between BC16 and BC18.

---

## 6. Configuration Storage

### 6.1 Storage Architecture Principles

Configuration is stored in a configuration store that is segregated from operational data storage, even though both may share underlying infrastructure. The store is tenant-scoped: every configuration record carries a tenant identifier (or the reserved identifier `platform` for platform-level records), and every query is bound to a tenant context. The store is versioned: every record has an immutable version history, retained per regulatory requirements. The store is indexed for efficient resolution by key, tenant, layer, scope, and version.

The storage architecture is shaped by the access pattern. Configuration has a high read-to-write ratio: reads happen on every configuration access, while writes happen only on configuration change. The store is therefore optimized for read latency, with write integrity protected through the validation engine in Section 7 and the audit trail in Section 12. Write integrity is more important than write throughput; a configuration store that optimizes write throughput at the expense of validation or audit is defective.

### 6.2 Configuration Record Anatomy

Each configuration record contains the fields summarized in the table below. The record is the unit of versioning, audit, and rollback; partial-record updates are not permitted. A change to any field of a record produces a new version of the entire record, with the previous version preserved in the version history described in Section 6.3.

| Field | Description |
|---|---|
| Record identifier | Unique identifier for the record |
| Tenant identifier | Tenant the record belongs to (or `platform` for platform defaults) |
| Layer | Configuration layer (L1 through L8) |
| Scope | Specific scope within the layer (e.g., which facility, which department) |
| Key | Configuration key name, namespaced by module |
| Value | Configuration value, typed per schema |
| Schema version | Version of the configuration schema the record conforms to |
| Record version | Version of this specific record, for optimistic concurrency |
| Created at | When the record was created |
| Created by | Who created the record, with authorization context |
| Last modified at | When the record was last modified |
| Last modified by | Who last modified the record, with authorization context |
| Authorization | Under what authorization the change was made |
| Validation result | Outcome of the validation engine's checks at submission |
| Lifecycle state | Current lifecycle state per Section 8.1 |

The record anatomy is the same across all eight layers; layer-specific behaviour is captured in the Layer and Scope fields, not in record structure. This uniformity simplifies the validation engine, the audit trail, and the rollback mechanism, all of which operate on records without layer-specific logic.

### 6.3 Version History and Retention

Every configuration record has a version history. The platform retains history sufficient to support rollback to any prior version within a defined retention window — multi-year, aligned with regulatory retention requirements and described in Section 12.4. Version history is itself audited; transitions in version retention (active, archived, purged) are recorded in the audit trail.

Version history is immutable. Once a version is created, it cannot be modified; the only way to change a configuration is to create a new version. This immutability is structural, not advisory: it is enforced at the storage layer, and any attempt to modify a stored version is treated as a security event. Immutability is the basis for the audit trail's tamper-evidence, the rollback mechanism's correctness, and the regulatory inquiry response's credibility.

### 6.4 Storage Segregation from Operational Data

Configuration storage is segregated from operational data storage. The segregation supports independent scaling, because configuration access patterns differ from operational patterns. It supports independent backup and restore, because configuration can be backed up and restored without affecting operational data. It supports independent monitoring, because configuration access is monitored separately from operational access. And it supports auditability, because configuration changes are audited as first-class events distinct from operational events.

The segregation is logical, not necessarily physical. The configuration store may share physical infrastructure with the operational store, but it is logically separate: separate schemas, separate access paths, separate monitoring, separate audit partition. The logical separation is enforced at the storage layer; an attempt to access configuration through operational paths is rejected, and vice versa. This enforcement is the structural mechanism by which the platform protects configuration integrity against operational errors and vice versa.

### 6.5 Caching Layers and Indexing

Resolved configuration is cached at multiple levels to maintain read performance. Request-scoped caches hold resolved values for the duration of a single request, eliminating repeated resolution within the same request. Service-scoped caches hold resolved values across requests within a single service instance, with the time-to-live rules in Section 4.4 governing freshness. Distributed caches hold resolved values across service instances, with proactive invalidation by the configuration service ensuring that changes propagate promptly.

Indexing supports efficient lookup by the access patterns the configuration service must serve. The primary index is by (tenant, key, layer, scope), supporting the resolution path in Section 4.3. Secondary indexes support audit queries (by timestamp, by actor, by authorization), rollback queries (by key, by version), and governance queries (by lifecycle state, by validation result). Index design is driven by access pattern, not by storage convenience; an index that is not justified by an access pattern is a defect, because it adds maintenance cost without benefit.

---

## 7. Configuration Validation

### 7.1 Validation as Submission Gate

Every configuration change is validated before it is applied. Validation is a submission gate: a configuration that fails validation is not applied, and the failure is reported to the submitter with diagnostic information. Validation is performed by the validation engine, a component of the configuration service, not by individual consumers. Centralization ensures that validation rules are applied consistently and that rule evolution is governed.

Validation covers five rule categories, as defined in `SYSTEM_ARCHITECTURE.md` Section 15.4 and reflected in `PRODUCT_BIBLE.md` Section 22.4. The categories are applied in sequence: structural, then referential, then semantic, then contextual, then regulatory. A failure in any category halts the sequence, and the configuration is rejected. The sequence is ordered by cost and specificity: structural failures are cheapest to detect and most general; regulatory failures are most expensive and most context-specific.

### 7.2 Structural Validation (V1)

Structural validation verifies that the configuration conforms to the schema. It checks types (string, integer, boolean, enum, object, array), required fields, ranges, formats, and allowed enumerations. Structural validation is the first check because it is the cheapest: it does not require cross-record lookup, and it operates on the configuration value in isolation. A configuration that fails structural validation is rejected before any other check is performed.

| Check | Example |
|---|---|
| Type | An integer field must accept only integers |
| Required field | A required field must be present |
| Range | An integer must fall within declared bounds |
| Format | A string must match a declared format (e.g., locale code, ISO date) |
| Enumeration | A value must be one of the declared allowed values |
| Nested structure | An object field must conform to its declared sub-schema |

Structural validation is mechanical. The validation engine reads the schema and applies the declared constraints without semantic interpretation. This mechanical nature makes structural validation fast and reliable; it also makes it the least expressive category, because it cannot catch inconsistencies that require cross-record context. The remaining categories address those inconsistencies.

### 7.3 Referential Validation (V2)

Referential validation verifies that references to other configuration records resolve. A configuration record that references another record — for example, a workflow definition that references a role, or a notification template that references a locale — must reference a record that exists in the same tenant scope. Cross-tenant references are rejected, as are references to records that have been archived or purged.

Referential validation is performed at submission time, against the configuration store's current state. A reference that resolves at submission may not resolve at evaluation time if the referenced record is later removed; the semantic validation in Section 7.4 and the runtime checks in the configuration service catch such drift. Referential validation is therefore necessary but not sufficient; it is the second line of defence, not the last.

### 7.4 Semantic Validation (V3)

Semantic validation verifies that the configuration is internally consistent and safe to apply. It checks invariants that span multiple keys within a single configuration record or across related records. For example, a workflow definition's steps must form a valid directed graph with a single entry and at least one terminal state; a notification routing configuration must not produce cycles; a billing configuration's tax rules must be consistent with the tenant's locale.

Semantic validation is the most expressive category and the most expensive. It requires the validation engine to understand the configuration's meaning, not just its structure. Semantic rules are declared in the configuration schema and are module-specific; the validation engine executes the rules declared by the module owner. A module that does not declare semantic rules for its configuration is defective, because it leaves the platform exposed to internally inconsistent configuration that structural and referential validation cannot catch.

### 7.5 Contextual Validation (V4)

Contextual validation verifies that the configuration is consistent with its scope. A facility-level configuration must not contradict a tenant-level invariant; a tenant-level configuration must not violate an edition constraint; a department-level configuration must not exceed the facility's authority. Contextual validation is what makes the layer model in Section 2 enforceable: without it, a facility could override a tenant-level invariant through configuration, defeating the layer model's purpose.

| Check | Example |
|---|---|
| Layer authority | A facility record cannot set a key fixed at L1 |
| Scope consistency | A facility record cannot reference a department in another facility |
| Edition constraint | A tenant on the Essentials edition cannot enable the Accounting module |
| Module enablement | A configuration that references a disabled module is rejected |
| Hierarchical consistency | A department record cannot exceed the facility's declared authority |

Contextual validation is performed at submission time against the current platform state. It is therefore sensitive to timing: a configuration that is valid at submission may become invalid if the platform state changes (for example, if a referenced module is later disabled). The configuration service's runtime checks catch such drift, and the audit trail in Section 12 records the platform state at submission time to support post-incident investigation.

### 7.6 Regulatory Validation (V5)

Regulatory validation verifies that the configuration complies with the regulatory framework in force for the tenant's region. A tenant in a regulated region must comply with that region's regulations — for example, data residency requirements, retention minimums, consent rules, breach notification thresholds. The platform does not permit a tenant to opt out of regulatory compliance through configuration; such opt-outs would require an ADR.

| Regulatory Domain | Example Configuration Constraint |
|---|---|
| Data residency | A tenant in a regulated region must store data in approved jurisdictions |
| Retention minimums | A tenant's retention configuration must meet or exceed regulatory minimums |
| Consent | A tenant's consent configuration must capture required consent types |
| Breach notification | A tenant's notification configuration must reach required recipients within required windows |
| Access logging | A tenant's audit configuration must meet regulatory logging requirements |
| Encryption | A tenant's encryption configuration must meet regulatory cipher and key-length requirements |

Regulatory validation is the most context-specific category and the most expensive to maintain. The regulatory landscape evolves, and the validation rules must evolve with it. Regulatory rule evolution is governed by the Architecture Council, with input from compliance and legal counsel. Changes to regulatory validation rules are versioned and audited, and they follow the same deprecation policy as other platform contracts to give tenants time to adapt.

---

## 8. Configuration Lifecycle

### 8.1 Lifecycle States

Configuration records follow a lifecycle from draft through active to archived or purged. The lifecycle states are summarized in the table below. The lifecycle is governed by the configuration service, with transitions audited per Section 12.

| State | Meaning |
|---|---|
| Draft | The configuration is being authored; not yet validated or applied |
| Validated | The configuration has passed validation but has not been applied |
| Active | The configuration is in effect for its scope |
| Superseded | The configuration has been replaced by a newer version; retained for history |
| Archived | The configuration has been moved to archival storage per retention policy |
| Purged | The configuration has been purged per data retention and deletion policies |

Lifecycle state is distinct from version. A configuration key may have many versions, of which one is Active and the remainder are Superseded, Archived, or Purged. The state machine ensures that exactly one version of a key is Active for a given scope at any time; if no version is Active, the value is inherited from a higher layer per Section 2.2. The state machine is enforced by the configuration service; ad-hoc state changes are forbidden.

### 8.2 Lifecycle Transitions and Triggers

| Transition | Trigger | Requirements |
|---|---|---|
| Draft → Validated | Submission | All five validation rule categories pass per Section 7 |
| Validated → Active | Application | Authorization verified; audit captured; previous Active version becomes Superseded |
| Active → Superseded | New version applied | New version is Active; old version is retained for history |
| Active or Superseded → Archived | Retention threshold reached | Per retention policy; transition audited |
| Archived → Purged | Purge threshold reached | Per retention and deletion policy; transition audited |
| Active → Draft (rollback) | Rollback request | Target version re-validated against current platform state; new Active version created |

Transitions are atomic. A transition either completes fully or does not occur; partial transitions are not permitted. Atomicity is enforced by the configuration service, using the optimistic concurrency control provided by the record version field. A transition that fails mid-way is rolled back, and the failure is recorded in the audit trail. Atomicity is non-negotiable because partial transitions would leave the configuration store in an inconsistent state.

### 8.3 Configuration Versioning

Every configuration change is versioned, as defined in `SYSTEM_ARCHITECTURE.md` Section 15.5 and reflected in `PRODUCT_BIBLE.md` Section 22.5. The version history is immutable and is the basis for configuration audit, rollback, and change review. Versioning is the configuration-surface equivalent of source-code versioning: it enables controlled evolution, controlled experimentation, and controlled recovery.

A customer that applies a configuration change that produces undesired behaviour can roll back without engineering intervention, in keeping with Principle P-2 (Configuration Before Customization). Rollback is described in Section 8.4. Versioning also supports change review: a compliance officer or auditor can review the version history of any configuration key to understand how the platform was configured at any point in time, supporting the regulatory inquiry use case in Section 12.3.

### 8.4 Configuration Rollback

Rollback restores a previous version of a configuration record. Rollback is itself an audited operation; configuration is never silently reverted. Rollback is supported within the active retention window; records that have been purged cannot be rolled back and must be re-authored if required. Rollback is the primary recovery mechanism for defective configuration changes, and it is the structural reason why version history immutability is non-negotiable.

The rollback process proceeds as follows. First, the administrator identifies the target version, using the audit trail in Section 12 to locate the version that was active before the undesired change. Second, the target version is re-validated against the current platform state, because the platform may have evolved since the target version was active — a workflow definition that was valid six months ago may now reference a step that has been removed. Third, if re-validation passes, the target version is applied as a new Active version, with the previous Active version becoming Superseded. Fourth, the rollback is recorded in the audit trail, with the reason for the rollback captured.

### 8.5 Configuration Promotion from Sandbox to Production

Configuration may be promoted from a sandbox environment to production, as defined in `SYSTEM_ARCHITECTURE.md` Section 15.7. Promotion is the structural mechanism by which the platform enforces the sandbox discipline described in Section 13.4. A configuration change that has not been tested in a sandbox is not applied to production, except through the documented emergency pathway.

The promotion workflow proceeds as follows. First, the configuration is authored and validated in a sandbox environment, using the validation engine described in Section 7. Second, the configuration is tested in the sandbox with realistic data and scenarios, including the test scenarios defined by the configuration's risk tier per Section 13.3. Third, the configuration is submitted for promotion, with the submission including the sandbox test results. Fourth, the promotion is reviewed by the authorized roles defined by the configuration's risk tier. Fifth, the configuration is promoted to production, with the promotion recorded in the audit trail and linked to the sandbox authoring. Promotion preserves audit history; the configuration's authoring in sandbox is linked to its promotion to production, supporting the regulatory inquiry use case.

---

## 9. Environment-Specific Configuration

### 9.1 Environment Inventory

Ibn Hayan operates multiple environments, each with its own purpose and configuration source. The environment inventory is summarized in the table below. Environments are isolated from each other; configuration does not flow between environments except through the documented promotion pathway in Section 8.5.

| Environment | Purpose | Configuration Source | Tenant-Facing? |
|---|---|---|---|
| Development | Engineering development | Engineering-managed | No |
| Staging | Pre-production testing | Mirror of production, with test data | No |
| Sandbox | Tenant configuration testing | Tenant-managed; isolated from production | Yes (sandbox tenants only) |
| Production | Live tenant operation | Tenant-managed; authoritative | Yes (production tenants) |

The environment inventory is governed by the Architecture Council. Adding a new environment requires an ADR, because environments affect configuration isolation, audit partitioning, and operational discipline. The four-environment inventory above is the platform default; customers cannot add environments unilaterally, because doing so would compromise the platform's ability to maintain parity and isolation.

### 9.2 Environment Configuration Isolation

Each environment has its own configuration store, isolated from other environments. Configuration does not flow between environments except through the defined promotion workflow in Section 8.5. Cross-environment configuration references are forbidden and are rejected at validation time, because they would couple environments and defeat the purpose of isolation.

Environment isolation extends to credentials, secrets, and audit trails. Each environment has its own credential store, its own secrets references, and its own audit partition. A secret referenced in one environment's configuration is not visible to another environment, even if the secret identifier is the same. This isolation is structural, not advisory: it is enforced at the storage layer, and any attempt to access another environment's configuration, credentials, or audit is rejected and recorded as a security event.

### 9.3 Environment Parity Discipline

Staging mirrors production, to support realistic testing. Parity includes configuration schema parity (staging uses the same configuration schemas as production), module parity (staging has the same modules enabled as production), data shape parity (staging uses data that is shape-compatible with production, though not real production data), and integration parity (staging integrates with sandbox versions of external systems, not production versions).

Parity is not identity; staging is not a clone of production. Real production data is never copied to staging, because doing so would violate tenant isolation and regulatory commitments. But parity must be sufficient that configuration validated in staging is likely to behave the same in production. Parity drift is a defect; the platform monitors parity and surfaces drift as an operational issue. Parity is maintained through automated checks that compare staging and production schemas, module enablement, and integration surface.

### 9.4 Environment-Specific Overrides

Some configuration is environment-specific by design. The table below summarizes the categories of environment-specific configuration and the reason for their environment specificity. Environment-specific configuration is managed through environment-level configuration overlays, applied on top of the standard configuration layers.

| Configuration | Environment-Specific? | Reason |
|---|---|---|
| External system endpoints | Yes | Staging uses sandbox endpoints; production uses real endpoints |
| Credentials | Yes | Each environment has its own credentials, isolated per Section 9.2 |
| Rate limits | Yes | Staging has lower rate limits to prevent accidental load |
| Feature flag staged populations | Yes | Staging's staged population is engineering-only; production's is broader |
| Tenant configuration | No | Tenant configuration is authored in sandbox and promoted per Section 8.5 |
| Module configuration schema | No | Schema parity is required per Section 9.3 |

Environment-specific overrides are themselves configuration, governed by the same validation, audit, and governance rules as any other configuration. An environment-specific override that violates a platform invariant is rejected, even in development, because the rejection enforces architectural discipline. The only configuration that may legitimately differ between environments is configuration whose value is intrinsically tied to the environment itself.

### 9.5 Cross-Environment Promotion Pathway

Cross-environment promotion follows the workflow defined in Section 8.5, with environment-specific extensions. A configuration change authored in sandbox is submitted for promotion to production through the promotion workflow. The workflow verifies that the configuration has been tested in sandbox, that the sandbox test results are attached, and that the promotion has been reviewed by the authorized roles.

Promotion is one-directional: from sandbox to production, never from production to sandbox. A configuration change discovered in production that should be back-ported to sandbox is re-authored in sandbox and re-tested, not copied backward. This one-directional discipline preserves the integrity of the sandbox as a testing environment. Promotion events are audited in both the source and target environments, with the audit records linked to support traceability.

---

## 10. Configuration Security

### 10.1 Authorization Model

Configuration access is authorized based on layer, scope, action, and configuration type. Layer authorization follows the layer governance boundaries in Section 2.6: platform-default configuration requires architectural review; tenant configuration requires tenant administrator authorization; facility configuration requires facility administrator authorization; and so on. Scope authorization enforces that a user can only modify configuration within their scope — a facility administrator cannot modify another facility's configuration, even within the same tenant.

Action authorization distinguishes read, write, validate, promote, and rollback actions, each with its own authorization requirements. Configuration type authorization recognizes that some configuration types — security policies, authentication policies, audit configuration — require additional authorization beyond the layer's default, because changes to them have outsized security impact. Authorization is enforced by the configuration service; a configuration change that lacks required authorization is rejected, regardless of who attempts it, and the rejection is recorded as a security-relevant audit event.

### 10.2 Secrets Handling

Secrets — credentials, keys, tokens — are not stored in configuration. Configuration references secrets by identifier; the secrets service resolves the reference at runtime, as defined in `SYSTEM_ARCHITECTURE.md` Section 20.5. This separation ensures that secrets are managed with the discipline they require — rotation, expiration, access logging — and that configuration records do not become a security liability.

A configuration record that contains a literal secret value is a security defect. Validation rules reject configuration values that look like secrets — long strings matching credential patterns, values with key-like structure — unless the configuration schema explicitly permits them. The rejection is structural, not advisory: it is enforced at the validation engine, and an attempt to submit a literal secret is recorded as a security event. The platform does not rely on configurator discipline to keep secrets out of configuration; it enforces the rule mechanically.

### 10.3 Encryption at Rest and in Transit

Configuration is encrypted at rest, with tenant-specific keys where supported by the underlying infrastructure. Encryption protects configuration from unauthorized access through storage-level compromise, in keeping with `SYSTEM_ARCHITECTURE.md` Section 20.4. The encryption keys themselves are managed by the secrets service, not stored alongside the configuration they protect; storing keys alongside data would defeat the purpose of encryption.

Configuration is encrypted in transit between the configuration service and its consumers. Encryption is enforced at the transport layer, with mutual authentication where supported. A consumer that attempts to access configuration over an unencrypted transport is rejected, and the attempt is recorded as a security event. Encryption in transit is non-negotiable; the platform does not permit configuration access over plaintext transports, even within a trusted network, because defence in depth requires multiple layers of protection.

### 10.4 Configuration Access Auditing

All configuration access is audited, including reads. The audit record captures who accessed the configuration, what configuration was accessed (key, scope, version), when the access occurred, from where the access originated, under what authorization the access was made, and what action was taken (read, write, delete, validate, promote, rollback). Configuration access auditing supports post-incident investigation and regulatory inquiry, as described in Section 12.

Read auditing is unusual compared to many systems, but it is structural in Ibn Hayan because configuration often contains sensitive information — security policies, integration endpoints, regulatory constraints. An attacker who can read configuration can often infer attack surface; auditing reads deters and detects such reconnaissance. Read audit volume is high, and the audit store is sized accordingly; the audit trail's tamper-evidence mechanisms in Section 12.3 scale to the volume.

### 10.5 Privileged Configuration Defence

Privileged configuration — configuration that affects security posture, audit behaviour, or regulatory compliance — is defended beyond the standard authorization model. Changes to privileged configuration require dual authorization: the change must be authorized by two distinct principals, neither of whom can authorize the change alone. Dual authorization is enforced at the configuration service; a single-principal authorization for privileged configuration is rejected.

Privileged configuration is also subject to enhanced review. Changes to audit configuration must be reviewed by compliance officers; changes to authentication policies must be reviewed by security architects; changes to regulatory validation rules must be reviewed by the Architecture Council. Enhanced review is part of the configuration's risk tier per Section 13.3. The combination of dual authorization and enhanced review ensures that privileged configuration changes cannot be made unilaterally, even by an administrator with nominal authority.

---

## 11. Configuration Hot-Reload

### 11.1 Hot-Reload Capability Definition

Hot-reload is the ability to change configuration without redeploying the platform. Most configuration supports hot-reload; some configuration — configuration that affects platform startup, module initialization, or infrastructure parameters — requires a restart, as described in Section 11.3. Hot-reload is the structural mechanism by which the platform delivers operational agility without deployment overhead, in keeping with `SYSTEM_ARCHITECTURE.md` Section 15.8.

Hot-reload is eventual, not immediate. There is a window between configuration change and module behavioural change, bounded by the notification latency in Section 11.2 and the cache invalidation latency in Section 4.4. The window is monitored and is part of the configuration service's service level objective. The platform does not pretend that hot-reload is instantaneous; it commits to a bounded window and reports the actual window in operational metrics.

### 11.2 Hot-Reload Mechanism

Hot-reload is implemented through a three-step mechanism. First, when configuration changes, the configuration service notifies affected modules through the proactive invalidation channel. Second, modules invalidate their cached configuration values, both at the service-scoped and distributed cache levels. Third, the next configuration access resolves the new value, which is then cached for subsequent access.

The notification channel is reliable but not instantaneous. Notifications may be delayed by network latency, by service-level queueing, or by consumer-side processing. The configuration service tracks notification acknowledgement; a consumer that does not acknowledge within a defined window is flagged as potentially stale, and the configuration service may take corrective action — for example, forcing the consumer to re-resolve on next access. The mechanism is designed for the common case (prompt acknowledgement) and degrades gracefully for the uncommon case (delayed acknowledgement).

### 11.3 Configuration Requiring Restart

Some configuration cannot be hot-reloaded. The table below summarizes the categories of restart-required configuration and the reason restart is required. Configuration that requires restart is marked in the schema, as described in Section 4.2; changes to such configuration trigger a notification that the change will take effect on next restart, not immediately.

| Configuration Category | Reason Restart Required |
|---|---|
| Platform startup parameters | Read once at startup; not re-read thereafter |
| Module initialization parameters | Read once at module initialization; changing them mid-flight would corrupt module state |
| Connection pool sizes | Changing pool sizes requires re-initializing the pool, which requires restart |
| Cache infrastructure configuration | Changing cache infrastructure requires re-initializing the cache, which requires restart |
| Threading model configuration | Changing the threading model requires restart to avoid race conditions |
| Cryptographic primitive configuration | Changing cryptographic primitives requires restart to re-initialize crypto contexts |

Restart-required configuration is not a defect; it is a structural reality. The platform minimizes restart-required configuration by designing modules to read configuration at access time where feasible, but some configuration is intrinsically bound to initialization. Restart-required configuration is documented in the module's contract, and operations runbooks describe the restart procedure for changes to such configuration.

### 11.4 Hot-Reload Consistency Guarantees

Hot-reload must not produce inconsistent state. The hot-reload mechanism validates the new configuration before applying it; invalid configuration is rejected, and the old configuration remains in effect. The mechanism applies the new configuration atomically across affected modules, so that all modules see the new configuration at the same logical moment. Atomicity is enforced by the configuration service through a coordinated commit; partial application is not permitted.

In-flight operations — operations that started before the configuration change and complete after it — may use the old or the new configuration, at the module's discretion. The choice is part of the module's contract and is documented for each configuration key. Modules that require strict consistency — for example, a clinical workflow that must use the same configuration for its entire duration — declare a consistency contract and use the configuration value captured at the operation's start. Modules that tolerate eventual consistency use the latest resolved value at each access.

### 11.5 Hot-Reload Monitoring and Service Level Objective

Hot-reload behaviour is monitored. The configuration service reports the notification latency, the cache invalidation latency, and the end-to-end change-to-behaviour latency for each configuration change. These metrics are part of the configuration service's service level objective and are reviewed in operational reviews. Sustained latency above the objective is treated as an operational issue and is remediated.

The service level objective distinguishes between hot-reload and restart-required configuration. Hot-reload configuration is expected to take effect within seconds; restart-required configuration is expected to take effect on next restart, which may be hours or days away. The platform does not commit to a hot-reload latency for restart-required configuration, because doing so would be dishonest. The restart pathway for restart-required configuration is documented in operations runbooks and is outside the scope of this document.

---

## 12. Configuration Audit Trail

### 12.1 Audit Trail Role and Immutability

The configuration audit trail is the tamper-evident, append-only record of all configuration changes. It is part of the platform's audit store, as defined in `SYSTEM_ARCHITECTURE.md` Section 27, and follows the same immutability, tamper-evidence, and retention rules. The audit trail is the structural mechanism by which the platform satisfies Principle P13 (Auditability as Primitive) for configuration, and the basis for the regulatory inquiry, post-incident analysis, compliance review, rollback, and operational diagnosis use cases described in Section 12.3.

Immutability is structural, not advisory. Once an audit record is written, it cannot be modified or deleted, except through the documented retention lifecycle in Section 12.4. Immutability is enforced at the audit store layer; any attempt to modify an audit record is rejected and recorded as a security event. The platform does not trust the audit trail's integrity to operational discipline alone; it enforces integrity cryptographically, as described in Section 12.3.

### 12.2 Audit Record Anatomy

Each configuration audit record contains the fields summarized in the table below. The record anatomy is consistent across all configuration changes — create, update, delete, validate, promote, rollback — with the Action field distinguishing the change type. The anatomy is the basis for the audit trail's use cases; a use case that cannot be satisfied from the audit record anatomy is a defect in the anatomy.

| Field | Description |
|---|---|
| Timestamp | When the change occurred, with sub-second precision |
| Actor | Who made the change (user, service, automated process) |
| Action | What action was taken (create, update, delete, validate, promote, rollback) |
| Configuration key | Which configuration key was affected |
| Previous value | The value before the change (for updates) |
| New value | The value after the change (for updates) |
| Layer | Which configuration layer was affected (L1 through L8) |
| Scope | Which scope within the layer was affected |
| Authorization | Under what authorization the change was made |
| Validation result | Whether validation passed, with failure details if not |
| Reason | Why the change was made (where applicable) |
| Platform state snapshot | Relevant platform state at submission (enabled modules, edition, region) |
| Linked records | Related audit records (e.g., sandbox authoring linked to production promotion) |

The platform state snapshot field is unusual but structural. It captures the platform state at submission time, so that post-incident investigation can determine whether the configuration was valid given the platform state at the time, even if the platform state has since changed. The snapshot is selective — it captures only the state relevant to the configuration's validation — to avoid unbounded growth.

### 12.3 Audit Trail Tamper-Evidence

The audit trail is tamper-evident, as defined in `SYSTEM_ARCHITECTURE.md` Section 27.5. Tamper-evidence is provided through cryptographic mechanisms — hash chains, Merkle trees, digital signatures — that make any modification detectable. The architecture does not trust the audit trail's integrity to operational discipline alone; it enforces integrity cryptographically, so that an attacker with storage access cannot modify audit records without detection.

Tamper-evidence is verified continuously. The platform runs background verification that recomputes the cryptographic chains and compares them against stored values; a mismatch is treated as a security incident and triggers the incident response process. Verification is also performed on demand, for example during a compliance review or regulatory inquiry, to provide fresh evidence of integrity. The verification mechanism is itself audited, so that the integrity of the integrity check is also accountable.

### 12.4 Audit Trail Retention and Lifecycle

Audit trail retention follows regulatory requirements, which vary by region and by configuration type. The platform supports per-tenant retention configuration, within the bounds of regulatory minimums. Retention transitions — Active to Archived, Archived to Purged — are themselves audited, so that the lifecycle of audit records is itself accountable. The platform does not permit audit records to be purged before the regulatory minimum has elapsed, even at the customer's request; doing so would violate regulatory commitments.

| Lifecycle Stage | Meaning | Trigger |
|---|---|---|
| Active | The record is in the primary audit store, available for query | Initial write |
| Archived | The record is in archival storage, available for query with higher latency | Retention threshold for primary store reached |
| Purged | The record is permanently removed | Purge threshold reached, after regulatory minimum elapsed |

Purge is irreversible. Once an audit record is purged, it cannot be recovered, and the purge is recorded as an audit event in its own right. The irreversibility of purge is the reason the purge threshold is set conservatively, with substantial margin above the regulatory minimum. The platform prefers to retain audit records longer than strictly required rather than risk premature purge that compromises a regulatory inquiry or legal proceeding.

### 12.5 Audit Trail Access and Inquiry

Access to the audit trail is itself audited and tightly controlled, as defined in `SYSTEM_ARCHITECTURE.md` Section 27.6. Audit records may be read by authorized roles — compliance officers, security analysts, auditors — for legitimate purposes. Access is logged, and the access log is itself subject to the same tamper-evidence and retention rules as the audit trail it records. This recursive accountability is structural: an attacker who could read the audit trail without logging would defeat the audit trail's purpose.

Inquiry pathways are documented. A regulatory inquiry follows a defined pathway that produces a verifiable extract of the audit trail, cryptographically signed so that the regulator can verify the extract's integrity. A post-incident analysis follows a defined pathway that produces a timeline of configuration changes relevant to the incident. A compliance review follows a defined pathway that produces a summary of configuration governance adherence over a period. Each pathway is documented, tested, and rehearsed, so that the platform can respond to inquiries promptly and credibly.

---

## 13. Configuration Governance

### 13.1 Governance Framework

Configuration governance is the practice of managing configuration change over time, as defined in `SYSTEM_ARCHITECTURE.md` Section 8.7 and reflected in `PRODUCT_BIBLE.md` Section 22.7. Governance includes change approval workflows, compliance review for regulatory-impacting changes, sandbox testing before production application, and change communication to affected users. Governance is customer-scoped: the platform provides the tooling and the audit trail; the customer defines the governance workflow within the platform's framework.

The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised. A small clinic may operate with a lightweight governance workflow — a single administrator who authors, tests, and promotes changes. A large hospital network may operate with a heavyweight governance workflow — multiple approvers, compliance review, staged rollout, post-change verification. Both are valid, as long as they operate within the platform's framework: validation before application, audit after application, sandbox before production.

### 13.2 Change Approval Workflows

Change approval workflows are configurable per tenant, within the platform's framework. The framework requires that every configuration change above a defined risk threshold be approved by an authorized role before promotion to production. The risk threshold is determined by the configuration's risk tier per Section 13.3. Changes below the threshold may be auto-approved; changes above the threshold require explicit approval.

| Approval Stage | Purpose | Typical Authorized Role |
|---|---|---|
| Author | Draft the configuration change | Configurator with layer authority |
| Validate | Submit for validation | Configurator with layer authority |
| Test | Execute sandbox test scenarios | Sandbox tester |
| Review | Review for risk and compliance | Risk-tier-appropriate reviewer |
| Approve | Authorize promotion to production | Approver with promotion authority |
| Promote | Apply to production | Configuration service (automated, post-approval) |
| Verify | Verify post-change behaviour | Operations or configurator |

Approval stages are auditable. Each stage is recorded in the audit trail with the actor, the timestamp, and the decision. A change that skips a stage is rejected by the configuration service, even if the change would otherwise be valid. The stage sequence is therefore structural, not advisory: the platform enforces the sequence mechanically, rather than relying on configurator discipline.

### 13.3 Risk-Tiered Change Pathways

Configuration changes are classified by risk tier, with higher-risk changes subject to more stringent pathways. The risk tier is determined by the configuration type, the scope of impact, and the regulatory implications of the change. The platform defines risk tiers in the configuration schema, and module owners declare the risk tier for each configuration key.

| Risk Tier | Examples | Pathway |
|---|---|---|
| Low | User display preferences, notification routing within a care team | Auto-approve; sandbox testing optional |
| Medium | Department workflow definitions, facility notification templates | Single approval; sandbox testing required |
| High | Tenant-wide workflow changes, integration configuration, security policy changes | Dual approval; sandbox testing required; compliance review |
| Critical | Audit configuration, authentication policy, regulatory validation rules | Dual authorization per Section 10.5; Architecture Council review; staged rollout |

Risk tiers are not advisory. A high-risk change cannot be promoted through the low-risk pathway, even with the authorizer's consent. The platform enforces the pathway mechanically, because the consequences of a high-risk change escaping governance — clinical safety impact, regulatory violation, security breach — are too severe to trust to discipline alone. The risk-tier framework is the structural mechanism by which the platform scales governance: light-touch for low-risk changes, rigorous for high-risk changes.

### 13.4 Sandbox Testing Discipline

Sandbox testing is required for medium-risk and above changes, as defined in `SYSTEM_ARCHITECTURE.md` Section 15.7. A configuration change that has not been tested in a sandbox is not applied to production, except through the documented emergency pathway. Sandbox testing is a direct consequence of Principle P1 (Healthcare Safety) of `SYSTEM_ARCHITECTURE.md` Section 4: untested configuration changes can compromise clinical safety, and the platform does not permit them.

Sandbox testing is not a formality. The sandbox must be representative of production, per the environment parity discipline in Section 9.3. Test scenarios must exercise the configuration in realistic conditions, including edge cases and failure modes. Test results are attached to the promotion submission and reviewed by the approver. A promotion submission without test results, or with test results that do not cover the configuration's risk tier, is rejected. The platform does not accept "we tested it informally" as a substitute for documented sandbox testing.

The emergency pathway exists for changes that cannot wait for sandbox testing — for example, an operational flag toggle during an active incident. The emergency pathway requires incident authority, post-change verification, and retroactive sandbox testing once the incident is resolved. Emergency pathway use is audited and reviewed; repeated use of the emergency pathway for non-emergency changes is a defect in governance and is remediated as such.

### 13.5 Communication and Stakeholder Notification

Configuration changes that affect user behaviour are communicated to affected users before application. Communication is part of the governance framework, not an optional courtesy: users who are surprised by a configuration change may resist it, work around it, or report it as a defect, all of which undermine the change's effectiveness. Communication is therefore scheduled into the change workflow, with lead time proportional to the change's impact.

| Change Impact | Communication Lead Time | Communication Channel |
|---|---|---|
| User-visible behaviour change | One week | In-app notification, email to affected users |
| Workflow change for clinical users | Two weeks | In-app notification, team briefing, email to affected users |
| Security policy change | Per compliance review | Email to affected users, mandatory acknowledgement |
| Integration change | Per integration partner agreement | Notification to integration partner, scheduled change window |
| Emergency change | As soon as feasible, post-change | In-app notification, incident channel |

Communication is itself auditable. The communication channel, the recipients, and the acknowledgement are recorded, so that post-change review can verify that communication occurred. A change that was applied without required communication is a governance defect, even if the change itself was valid. The platform's commitment to communication reflects the configuration-driven philosophy of `PRODUCT_BIBLE.md` Section 22: configuration is how the platform adapts to customers, and adaptation is a partnership, not a surprise.
