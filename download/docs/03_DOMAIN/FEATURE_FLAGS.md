# Ibn Hayan Healthcare Operating System — Feature Flags

| Field | Value |
|---|---|
| Document Title | Feature Flags |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a flag amendment, a kill-switch invocation, or an ADR is ratified |
| Audience | Software architects, module owners, feature flag service team, SRE leadership, product management, compliance officers |
| Scope | Feature flag catalogue, taxonomy, lifecycle, evaluation, rollout strategies, targeting, kill switches, governance, audit, testing, deprecation across Ibn Hayan |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-flag serialization syntax, vendor-specific flag platforms |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Feature flag definitions in this document elaborate the feature flag strategy of SYSTEM_ARCHITECTURE Section 14 and the configuration-driven commitments of PRODUCT_BIBLE Section 22. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Feature Flags Overview
2. Flag Taxonomy
3. Flag Lifecycle
4. Flag Evaluation Engine
5. Rollout Strategies
6. Targeting Rules
7. Kill Switches & Emergency Flags
8. Flag Governance
9. Flag Audit Trail
10. Flag Testing
11. Flag Deprecation
12. Related Documents

---

## 1. Feature Flags Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for feature flags used across the Ibn Hayan Healthcare Operating System. A feature flag is a binary or near-binary capability exposure switch that controls whether a specific capability is visible, enabled, or behaviourally active. Feature flags are a first-class architectural concern governed by the configuration-driven architecture (SYSTEM_ARCHITECTURE Section 8) and implemented by the Feature Flags bounded context (BC18, documented in SYSTEM_ARCHITECTURE Section 7.2). The feature flag catalogue is part of the platform's contract surface: bounded-context commands, queries, events, and configuration schemas reference feature flags by their canonical identifier.

The discipline around feature flags reflects the platform's broader posture on configuration and customization (PRODUCT_BIBLE Section 22). A feature flag is distinct from configuration: flags control binary or near-binary capability exposure; configuration controls continuous behavioural parameters. The distinction is enforced at architectural review: a behaviour that should be a configuration key is defective as a feature flag, and vice versa. The platform's commitment to configuration before customization (Principle P2) and to one code base serving every customer (Principle P3) requires that the feature flag catalogue be expressive enough to support controlled capability exposure without recourse to source modification or customer-specific branches.

This document sits below `SYSTEM_ARCHITECTURE.md` and below `CONFIGURATION_ARCHITECTURE.md` (the implementation-grade elaboration of the configuration architecture, which includes feature flag architecture in its Section 5). It aligns with `PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy), Section 28 (Offline Strategy), and Section 31 (Security Philosophy). Sibling documents include `CONFIGURATION.md` (which governs continuous configuration, distinct from feature flags), `BUSINESS_RULES.md` (which catalogues the rules that may be affected by feature flags), and `STATUS_CODES.md` (which catalogues the lifecycle states that feature flag transitions produce). Where this document and a sibling document appear to overlap, this document holds authority over feature flag definitions and lifecycle; CONFIGURATION.md holds authority over continuous configuration.

### 1.2 Feature Flags vs Configuration

Feature flags and configuration are distinct architectural concerns in Ibn Hayan, as documented in SYSTEM_ARCHITECTURE Section 14.6. The two differ on five dimensions: cardinality, lifetime, change frequency, use case, and governance. Feature flags are binary or near-binary, temporary, high-change-frequency, capability-exposure, platform-team-governed. Configuration is continuous, permanent, low-change-frequency, behavioural-parameter, customer-governed. The distinction is enforced at architectural review: a capability that requires continuous parameterization is a configuration key, not a feature flag; a capability that requires binary exposure is a feature flag, not a configuration key.

| Dimension | Feature Flag | Configuration |
|---|---|---|
| Cardinality | Binary or near-binary (on/off, variant A/B/C) | Continuous (numeric, string, complex) |
| Lifetime | Temporary (until removal) | Permanent |
| Change frequency | High (per rollout, per experiment) | Low (per operational change) |
| Use case | Capability exposure | Behavioural parameter |
| Governance | Platform team primarily | Customer primarily |

The distinction matters because the two have different evaluation semantics, different audit implications, and different lifecycle management. A feature flag is evaluated on every request that touches the flag's capability; a configuration key is resolved on every request that needs the key's value. A feature flag has a lifecycle that prevents flag accumulation (the flag is removed when no longer needed); a configuration key has a lifecycle that preserves the key indefinitely. Mixing the two produces a feature flag catalogue that accumulates debt and a configuration surface that is hard to maintain. The discipline of separating them is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the feature flag domain.

### 1.3 Feature Flag Coverage

The feature flag catalogue covers all capability exposure needs across Ibn Hayan. Release flags control the visibility of new capability during rollout. Experiment flags control variant assignment for experimentation (A/B testing, multivariate testing). Operational flags control operational behaviour (for example, enabling a circuit breaker, degrading a feature under load). Permission flags control access to capability for specific tenants or users (beta access, early access, restricted features). Migration flags control behaviour during data or contract migration. The catalogue is comprehensive; a capability exposure need that is not a configuration key is a feature flag and is recorded in this catalogue.

The coverage is documented per flag type in Sections 2 through 6 of this document. Each section catalogues the flags in the corresponding type, with the flag's canonical identifier, display name, owning module, flag type, default value, lifecycle stage, evaluation cohort, and configuration surface. The catalogue is the binding reference for module specifications and integration contracts; a flag referenced by a module specification must be present in this catalogue.

### 1.4 Feature Flag Posture

Ibn Hayan adopts a posture of disciplined feature flag management. Four commitments govern this posture. First, feature flags are platform-owned: a flag is defined by the platform team through the Architecture Council process; tenants do not define feature flags. Second, feature flags are temporary: a flag has a defined lifecycle that prevents flag accumulation; flags that are no longer needed are deprecated and removed. Third, feature flags are auditable: every flag evaluation is recorded in the audit trail for consequential actions, including the flag, the input, the result, and the actor. Fourth, feature flags are governed: flag changes are auditable, with the audit trail showing who changed the flag, when, and with what authorization.

The four commitments are the architectural floor for feature flag management in Ibn Hayan. A module that defines a feature flag locally is defective; the flag must be registered in the catalogue and evaluated by the feature flag service. A module that evaluates a flag without audit (for consequential actions) is defective; the evaluation must be recorded. A module that uses an unregistered flag is defective; the flag must be present in the catalogue. The feature flag service enforces these commitments at evaluation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.5 Ibn Hayan Identity and Feature Flags

Feature flags are part of the structural vocabulary by which Ibn Hayan maintains its one-platform identity (PRODUCT_BIBLE Section 1.5) while accommodating the variation in capability exposure across the platform's deployment spectrum. A flag recorded in a small clinic is the same flag recorded in a multi-national hospital network; the platform's flag service treats them identically. This consistency is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to the feature flag domain. Where regional variation requires different capability exposure (for example, a regional regulatory framework may require a specific capability to be disabled), the variation is expressed through targeting rules and regional flag overlays registered through the Architecture Council, not through region-specific flag forks.

---

## 2. Flag Taxonomy

### 2.1 Flag Type Catalogue

Ibn Hayan adopts five feature flag types, as documented in SYSTEM_ARCHITECTURE Section 14.2. Each type has its own use case, lifecycle, evaluation semantics, and governance. The five types cover the platform's capability exposure needs comprehensively; a capability exposure need that does not fit any of the five types is likely a configuration key, not a feature flag, and should be re-evaluated at architectural review.

| Flag Type | Code | Description | When Used | Default Value |
|---|---|---|---|---|
| Release Flag | FF1 | Controls visibility of new capability during rollout | Gradual rollout of new features | False (capability hidden) |
| Experiment Flag | FF2 | Controls variant assignment for experimentation | A/B testing, multivariate testing | Variant A (control) |
| Operational Flag | FF3 | Controls operational behaviour (e.g., enabling a circuit breaker) | Operational response to incidents, degradation control | False (operational behaviour off) |
| Permission Flag | FF4 | Controls access to capability for specific tenants or users | Beta access, early access, restricted features | False (capability restricted) |
| Migration Flag | FF5 | Controls behaviour during data or contract migration | Phased migration between contract versions | False (old behaviour) |

### 2.2 Release Flags (FF1)

Release flags control the visibility of new capability during rollout. A release flag is created when a new capability is being developed; the flag is set to False (capability hidden) for all tenants initially. As the capability approaches release, the flag is set to True for specific tenants (beta testers, early adopters), then for a percentage of tenants (gradual rollout), then for all tenants (general availability). When the capability has been generally available for a defined period and the flag has been at True for all tenants, the flag is transitioned to Static-True status and scheduled for removal.

Release flags are the most common flag type and have the shortest expected lifetime. A release flag that has been at True for all tenants for more than a defined period (typically one full release cycle) is a candidate for transition to Static-True status. The transition discipline prevents flag accumulation: a flag that is no longer needed is removed, ensuring that the flag catalogue does not grow indefinitely. The discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the release flag domain.

| Flag ID | Name | Module | Type | Default | Lifecycle | Cohort | Configuration Surface |
|---|---|---|---|---|---|---|---|
| FF1-EXAMPLE-001 | New Patient Search UI | BC01 | FF1 | False | Active | Percentage (10%) | Cohort percentage configurable |
| FF1-EXAMPLE-002 | Telehealth Recording | BC02 | FF1 | False | Active | Tenant list | Tenant list configurable |
| FF1-EXAMPLE-003 | AI-Assisted Documentation | BC03 | FF1 | False | Active | Tenant list | Tenant list configurable |

### 2.3 Experiment Flags (FF2)

Experiment flags control variant assignment for experimentation. An experiment flag is created when an A/B test or multivariate test is being designed; the flag is set to assign tenants or users to variants (Variant A as control, Variant B as treatment, additional variants as needed). The experiment runs for a defined period, with metrics collected per variant. At the end of the experiment, the winning variant is promoted to general availability (typically through a release flag), and the experiment flag is transitioned to Static status and scheduled for removal.

Experiment flags are evaluated per session to ensure experimentation consistency: a user assigned to Variant B for one session remains in Variant B for subsequent sessions within the experiment window. The per-session evaluation is documented in SYSTEM_ARCHITECTURE Section 14.4. The discipline ensures that the experiment's metrics are not contaminated by users switching variants mid-experiment. The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the experiment flag domain.

| Flag ID | Name | Module | Type | Default | Lifecycle | Cohort | Configuration Surface |
|---|---|---|---|---|---|---|---|
| FF2-EXAMPLE-001 | Appointment Booking Flow A/B | BC06 | FF2 | Variant A | Active | Percentage (50/50) | Variant assignment configurable |
| FF2-EXAMPLE-002 | Notification Channel Preference | BC14 | FF2 | Variant A | Active | Percentage (50/50) | Variant assignment configurable |
| FF2-EXAMPLE-003 | Clinical Note Template Layout | BC03 | FF2 | Variant A | Active | Percentage (50/50) | Variant assignment configurable |

### 2.4 Operational Flags (FF3)

Operational flags control operational behaviour, typically in response to incidents or degradation. An operational flag is created when an operational behaviour may need to be toggled rapidly (for example, enabling a circuit breaker, degrading a feature under load, disabling a problematic integration). The flag is set to its normal-operational value (typically False, meaning the operational behaviour is off) and is toggled to its emergency value (typically True, meaning the operational behaviour is on) when the operational situation requires.

Operational flags are the most safety-critical flag type because they may affect clinical safety. An operational flag that is toggled incorrectly may degrade clinical capability (for example, disabling a clinical decision support feature under load may compromise patient safety). The platform's posture is that operational flags are governed by the platform team with explicit authorization, with toggling recorded in the audit trail. The discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the operational flag domain. Operational flags are also the flag type most likely to be invoked as kill switches, as documented in Section 7.

| Flag ID | Name | Module | Type | Default | Lifecycle | Cohort | Configuration Surface |
|---|---|---|---|---|---|---|---|
| FF3-EXAMPLE-001 | Lab Integration Circuit Breaker | BC04 | FF3 | False | Active | All tenants | Toggle authorization configurable |
| FF3-EXAMPLE-002 | Image Upload Degradation | BC13 | FF3 | False | Active | All tenants | Toggle authorization configurable |
| FF3-EXAMPLE-003 | Notification Queue Backpressure | BC14 | FF3 | False | Active | All tenants | Toggle authorization configurable |

### 2.5 Permission Flags (FF4)

Permission flags control access to capability for specific tenants or users. A permission flag is created when a capability is being made available to a limited audience (beta access, early access, restricted features). The flag is set to False (capability restricted) for all tenants initially and is set to True (capability available) for specific tenants or users through the targeting rules documented in Section 6. As the capability approaches general availability, the flag is set to True for all tenants, and the flag is transitioned to Static-True status and scheduled for removal.

Permission flags are evaluated per user within a tenant, as documented in SYSTEM_ARCHITECTURE Section 14.4. The per-user evaluation ensures that a tenant's access to a capability can be granted to specific users (for example, power users, administrators) without granting access to all users. The discipline is the architectural expression of the platform's permission philosophy (PRODUCT_BIBLE Section 21) applied to the feature flag domain. Permission flags interact with the permission framework: a user with permission-flag-granted access still requires the underlying role permission to use the capability.

| Flag ID | Name | Module | Type | Default | Lifecycle | Cohort | Configuration Surface |
|---|---|---|---|---|---|---|---|
| FF4-EXAMPLE-001 | Beta: AI-Assisted Documentation | BC03 | FF4 | False | Active | Tenant list | Tenant list configurable |
| FF4-EXAMPLE-002 | Early Access: Custom Workflows | BC16 | FF4 | False | Active | Tenant list | Tenant list configurable |
| FF4-EXAMPLE-003 | Restricted: Advanced Analytics | Reports | FF4 | False | Active | Tenant list | Tenant list configurable |

### 2.6 Migration Flags (FF5)

Migration flags control behaviour during data or contract migration. A migration flag is created when a migration is being planned; the flag is set to False (old behaviour) for all tenants initially. As the migration progresses, the flag is set to True (new behaviour) for specific tenants (pilot migration), then for additional tenants (phased migration), then for all tenants (migration complete). When the migration is complete and the flag has been at True for all tenants for a defined period, the flag is transitioned to Static-True status and scheduled for removal.

Migration flags are the flag type most likely to have a complex transition plan, because migrations often involve data conversion, contract versioning, and backward compatibility. The platform's posture is that migration flags are governed by the platform team with explicit transition plans, with each transition ratified through an ADR. The discipline is the architectural expression of Principle P6 (Reversibility Over Permanence) applied to the migration flag domain: a migration that produces undesired behaviour can be reversed by toggling the flag back to False, with the reversal documented for review.

| Flag ID | Name | Module | Type | Default | Lifecycle | Cohort | Configuration Surface |
|---|---|---|---|---|---|---|---|
| FF5-EXAMPLE-001 | Patient Identifier Migration | BC01 | FF5 | False | Active | Tenant list | Migration phases configurable |
| FF5-EXAMPLE-002 | Claim Format v2 Migration | BC07 | FF5 | False | Active | Tenant list | Migration phases configurable |
| FF5-EXAMPLE-003 | Audit Schema Migration | BC17 | FF5 | False | Active | Tenant list | Migration phases configurable |

---

## 3. Flag Lifecycle

### 3.1 Lifecycle Stages

Feature flags in Ibn Hayan have a lifecycle with five stages, as documented in SYSTEM_ARCHITECTURE Section 14.3. The lifecycle prevents flag accumulation: a flag that is no longer needed is transitioned to Static status and scheduled for removal, ensuring that the flag catalogue does not grow indefinitely. The lifecycle is recorded in the flag's metadata, with each stage transition ratified through an ADR.

| Stage | Code | Description | Typical Duration |
|---|---|---|---|
| Defined | FFL1 | Flag defined; not yet evaluated | Hours to days (between definition and activation) |
| Active | FFL2 | Flag in use; evaluation produces a result | Days to months (until rollout complete or experiment concludes) |
| Static-True | FFL3 | Flag permanently true; scheduled for removal | One full release cycle |
| Static-False | FFL4 | Flag permanently false; scheduled for removal | One full release cycle |
| Removed | FFL5 | Flag removed from the platform | Terminal |

### 3.2 Defined Stage (FFL1)

A flag enters the Defined stage when it is registered in the flag catalogue. At this stage, the flag is not yet being evaluated; the flag's definition is in place, but the flag's value is not yet being consumed by any module. The Defined stage is typically short (hours to days), between the flag's definition and the flag's activation. During the Defined stage, the flag's targeting rules, rollout strategy, and audit configuration are documented and reviewed.

The Defined stage discipline ensures that flags are not activated without preparation. A flag that is activated without defined targeting rules may produce unintended exposure (for example, a release flag activated without targeting rules may expose the capability to all tenants immediately, bypassing the gradual rollout). The discipline is the architectural expression of Principle P7 (Documented Before Implemented) applied to the feature flag domain.

### 3.3 Active Stage (FFL2)

A flag enters the Active stage when it begins being evaluated. At this stage, the flag's evaluation produces a result that is consumed by modules. The Active stage is the operational stage of the flag's lifecycle; the flag's value, targeting rules, and rollout strategy may be modified during this stage, with each modification recorded in the audit trail. The Active stage typically lasts days to months, depending on the flag's type and purpose.

The Active stage discipline ensures that flag changes are managed in a controlled manner. A flag that is modified without audit may produce unintended exposure (for example, a release flag's cohort percentage increased without audit may expose the capability to more tenants than intended). The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the feature flag domain. The Active stage is also the stage at which the flag's behaviour is most closely monitored, with metrics collected on the flag's evaluation count, result distribution, and any consequential actions triggered by the flag's result.

### 3.4 Static-True and Static-False Stages (FFL3, FFL4)

A flag transitions from Active to Static-True when the flag has been at True for all tenants for a defined period (typically one full release cycle). A flag transitions from Active to Static-False when the flag has been at False for all tenants for a defined period, typically because the capability was withdrawn or the experiment concluded in favour of the control variant. At the Static stage, the flag is no longer being actively managed; the flag's value is fixed, and the flag is scheduled for removal.

The Static stage discipline is the structural mechanism by which the platform prevents flag accumulation. A flag that has been at the same value for a defined period is no longer serving its purpose (the rollout is complete, the experiment is concluded, the migration is finished). The flag is transitioned to Static status and scheduled for removal, ensuring that the flag catalogue does not grow indefinitely. The discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the feature flag lifecycle domain.

### 3.5 Removed Stage (FFL5)

A flag transitions from Static to Removed when the flag is removed from the platform. At this stage, the flag is no longer in the flag catalogue; modules that referenced the flag must have been updated to remove the reference. The Removed stage is terminal; a flag that has been removed cannot be reactivated (a new flag with the same purpose must be registered through the Architecture Council process). The Removed stage is recorded in the audit trail, with the removal's rationale documented.

The Removed stage discipline ensures that the flag catalogue remains current. A flag that is no longer needed but remains in the catalogue adds complexity without benefit; the platform's posture is that such flags are removed. The discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the feature flag lifecycle domain. The discipline is also the structural mechanism by which the platform's flag catalogue remains maintainable: a catalogue that accumulates flags without removal becomes difficult to navigate and audit.

### 3.6 Lifecycle Governance

Flag lifecycle transitions are governed by the Architecture Council. A transition from Defined to Active is ratified through an ADR (the flag's activation plan). A transition from Active to Static is ratified through an ADR (the flag's completion plan, including the removal schedule). A transition from Static to Removed is ratified through an ADR (the flag's removal plan, including the module updates required). Each transition is recorded in the CHANGELOG with the version increment.

The lifecycle governance discipline is the architectural expression of Principle P7 (Documented Before Implemented) and Principle P13 (Auditability as Primitive) applied to the feature flag lifecycle domain. A transition that bypasses the governance process may produce unintended exposure (for example, a flag activated without an ADR may expose a capability without the necessary review). The discipline ensures that every transition is documented, and every transition's rationale is recoverable.

---

## 4. Flag Evaluation Engine

### 4.1 Engine Architecture

The feature flag evaluation engine is the platform's mechanism for evaluating feature flags at the point of consequential actions. The engine is part of the Orchestration Layer documented in SYSTEM_ARCHITECTURE Section 6.4 and interacts with the bounded contexts through their command and event contracts (SYSTEM_ARCHITECTURE Section 7.4). The engine is not part of any single bounded context; it is a platform-level service consumed by all bounded contexts, implemented by the Feature Flags bounded context (BC18).

The engine architecture is governed by four design commitments. First, the engine is stateless: flag evaluations are not stored in engine state; the engine evaluates each flag on demand, using the flag's definition from the catalogue and the input from the caller. Second, the engine is deterministic: for a given flag, input, and flag version, the engine produces the same result. Third, the engine is auditable: every evaluation of a consequential action is recorded in the audit trail, including the flag, the input, the result, and the actor. Fourth, the engine is fast: flag evaluation does not produce unacceptable latency on the request path, as flags may be evaluated on every request. Flags that cannot be evaluated quickly are re-architected or moved to configuration.

### 4.2 Evaluation Rules

Flag evaluation is governed by five rules, as documented in SYSTEM_ARCHITECTURE Section 14.4. First, tenant-scoped: flag evaluation produces a result per tenant, not globally. Second, user-scoped: some flags (FF4) evaluate per user within a tenant. Third, session-scoped: some flags (FF2) evaluate per session for experimentation consistency. Fourth, deterministic: flag evaluation is deterministic for a given tenant, user, and session. Fifth, auditable: flag evaluation is auditable, with the result recorded for consequential actions.

| Rule | Description | Applicability |
|---|---|---|
| Tenant-scoped | Evaluation produces a result per tenant | All flag types |
| User-scoped | Evaluation produces a result per user within a tenant | FF4 (Permission), some FF2 (Experiment) |
| Session-scoped | Evaluation produces a result per session | FF2 (Experiment) |
| Deterministic | Same inputs produce same result | All flag types |
| Auditable | Evaluation result recorded for consequential actions | All flag types |

### 4.3 Evaluation Context

Flag evaluation is performed in a defined context. The context includes the flag version, the input (the action that triggered the evaluation), the tenant, the user (where applicable), the session (where applicable), and the request metadata (time, IP, user agent). The context is the basis for the flag's evaluation: the flag's targeting rules are evaluated against the context, and the flag's value is resolved based on the targeting result. The context is recorded in the audit trail alongside the flag's result.

The evaluation context discipline ensures that flag evaluations are reproducible. A flag evaluation recorded in the audit trail can be reproduced by re-evaluating the flag against the recorded context, producing the same result. This reproducibility is critical for audit investigation: a question about why a flag produced a particular result can be answered by re-evaluating the flag against the recorded context. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the feature flag domain.

### 4.4 Evaluation Performance

Flag evaluation performance is governed by the engine's caching strategy. The engine caches flag definitions, flag compilations (where the flag is compiled for evaluation), and flag evaluation results (where the same flag is evaluated against the same context within a cache window). The cache is invalidated on flag version change. The cache is scoped to the tenant, ensuring that one tenant's cache does not affect another tenant's performance. The performance discipline is documented in SYSTEM_ARCHITECTURE Section 14.4.

The performance discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the feature flag domain. A more complex caching strategy that attempted to predict evaluation patterns would add complexity without proportionate benefit; the simple cache-with-invalidation strategy is sufficient. The strategy is reviewed at each quarterly Architecture Council review to confirm that it continues to meet the platform's performance commitments. Flags that cannot be evaluated within the platform's latency budget are re-architected or moved to configuration, ensuring that the flag evaluation path does not become a performance bottleneck.

### 4.5 Evaluation Failure Handling

Flag evaluation may fail for one of three reasons: the flag's targeting rules cannot be evaluated (for example, a referenced database is unavailable), the flag's value cannot be resolved (for example, the flag's variant assignment is corrupted), or the flag's audit cannot be recorded (for example, the audit store is unavailable). The engine handles each failure type according to the flag's failure policy, with the failure recorded in the audit trail.

The failure handling discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the feature flag domain. A flag that fails open (returns True, exposing the capability) where the flag protects against clinical harm would compromise patient safety; the flag's failure policy must be designed to fail safe (returns False, hiding the capability and escalating). The discipline is the structural mechanism by which the platform's flag engine maintains its safety posture under failure conditions. The default failure policy is fail-closed (return False) for all flag types except FF3 (Operational), where the failure policy is flag-specific and is documented in the flag's metadata.

---

## 5. Rollout Strategies

### 5.1 Strategy Catalogue

Ibn Hayan supports five rollout strategies for feature flags, as documented in the feature flag enums (ENUMS.md Section 8.2). Each strategy governs how a flag's value is rolled out to the platform's tenants, users, or sessions. The strategy is selected per flag through configuration, with the strategy chosen based on the flag's type and purpose.

| Strategy | Description | Applicable Flag Types | Use Case |
|---|---|---|---|
| Percentage | Flag is True for a percentage of the cohort | FF1, FF2, FF5 | Gradual rollout, A/B testing |
| Tenant List | Flag is True for a specific list of tenants | FF1, FF4, FF5 | Beta access, early access, pilot migration |
| Segment | Flag is True for a segment of users (e.g., power users) | FF4 | Restricted features, role-based access |
| Tier-Based | Flag is True for tenants on a specific edition tier | FF1, FF4 | Edition-gated capability |
| Geographic | Flag is True for tenants in a specific region | FF1, FF4, FF5 | Region-specific capability |

### 5.2 Percentage Rollout

Percentage rollout governs the gradual exposure of a capability to a percentage of the cohort. The percentage is configured per flag and is increased over time as the capability approaches general availability. The cohort is determined by the flag's type: for FF1 (Release), the cohort is all tenants; for FF2 (Experiment), the cohort is all users within participating tenants; for FF5 (Migration), the cohort is all tenants scheduled for migration.

The percentage rollout strategy uses deterministic assignment to ensure that a tenant, user, or session that is assigned to the True cohort remains in the True cohort for subsequent evaluations within the rollout window. The deterministic assignment is based on a hash of the cohort identifier (tenant identifier, user identifier, session identifier) and the flag identifier, ensuring that the assignment is stable across evaluations and across flag version changes (within the rollout window). The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the percentage rollout domain.

### 5.3 Tenant List Rollout

Tenant list rollout governs the exposure of a capability to a specific list of tenants. The tenant list is configured per flag and is updated as the capability is made available to additional tenants. The tenant list is the most controlled rollout strategy: a tenant is added to the list only through explicit configuration, with the addition recorded in the audit trail. The tenant list is typically used for beta access, early access, and pilot migrations.

The tenant list rollout strategy is the most operationally intensive strategy because each tenant addition requires explicit configuration. The platform's posture is that tenant list rollout is used where the capability's risk profile requires explicit per-tenant approval (for example, a capability that affects clinical safety may require tenant list rollout to ensure that each tenant's readiness is verified before the capability is exposed). The discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the tenant list rollout domain.

### 5.4 Segment Rollout

Segment rollout governs the exposure of a capability to a segment of users within participating tenants. The segment is defined by user attributes (for example, role, specialty, user type) and is configured per flag. The segment rollout strategy is typically used for FF4 (Permission) flags where the capability is restricted to a specific user segment (for example, power users, administrators, specific specialties).

The segment rollout strategy requires the segment definition to be maintained as users' attributes change. A user who is added to the segment (for example, by being promoted to administrator) gains access to the capability; a user who is removed from the segment (for example, by being demoted from administrator) loses access. The discipline is the architectural expression of the platform's permission philosophy (PRODUCT_BIBLE Section 21) applied to the segment rollout domain.

### 5.5 Tier-Based and Geographic Rollout

Tier-based rollout governs the exposure of a capability to tenants on a specific edition tier (Trial, Essential, Professional, Enterprise). The tier-based strategy is typically used where a capability is edition-gated (for example, an advanced analytics capability may be available only on Professional and Enterprise tiers). Geographic rollout governs the exposure of a capability to tenants in a specific region. The geographic strategy is typically used where a capability is region-specific (for example, a capability that complies with a specific regional regulatory framework may be available only in that region).

The two strategies interact with the platform's edition model (PRODUCT_BIBLE Section 16) and the platform's regional adaptation posture (PRODUCT_BIBLE Section 25). A capability that is edition-gated and region-specific uses both strategies in combination: the flag is True for tenants on the appropriate tier in the appropriate region. The discipline is the architectural expression of Principle P3 (One Platform, Many Organizations) and Principle P17 (Regional Adaptation Without Forking) applied to the rollout strategy domain.

---

## 6. Targeting Rules

### 6.1 Targeting Rule Structure

Targeting rules govern how a flag's value is resolved for a specific evaluation context. A targeting rule is structured into three parts: the match condition (what the rule matches), the value (what the rule returns if it matches), and the priority (the order in which rules are evaluated). The match condition is a logical expression over the evaluation context (for example, "tenant identifier in tenant list", "user role equals administrator", "tenant region equals MENA"). The value is the flag result (True, False, or a variant identifier). The priority is an integer that governs the order of rule evaluation, with lower-priority rules evaluated first.

The targeting rule structure is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the targeting rule domain. A uniform rule structure is simpler to evaluate, audit, and evolve than ad hoc rule structures. The structure is also the structural mechanism by which the platform's targeting rules remain coherent: a rule that does not conform to the structure is rejected at validation, ensuring that targeting rules do not introduce ad hoc semantics.

### 6.2 Targeting Rule Evaluation

Targeting rules are evaluated in priority order. The first rule whose match condition is satisfied produces the flag's value. If no rule's match condition is satisfied, the flag's default value is returned. The evaluation is deterministic: for a given evaluation context and a given set of targeting rules, the same value is returned. The evaluation is fast: the rules are indexed for efficient lookup, ensuring that the evaluation does not produce unacceptable latency.

The targeting rule evaluation discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the targeting rule domain. A non-deterministic evaluation would produce different values for the same context across evaluations, which would compromise the platform's ability to reason about flag behaviour. The discipline is also the structural mechanism by which the platform's targeting rules are auditable: an evaluation recorded in the audit trail can be reproduced by re-evaluating the rules against the recorded context, producing the same value.

### 6.3 Targeting Rule Composition

Targeting rules may be composed to express complex targeting logic. A rule's match condition may be a conjunction (AND) or disjunction (OR) of sub-conditions, allowing rules to match on multiple attributes (for example, "tenant region equals MENA AND user role equals physician"). The composition is bounded: a rule's match condition may have at most a defined number of sub-conditions, ensuring that the rule remains interpretable and evaluable within the platform's latency budget.

The targeting rule composition discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the targeting rule composition domain. A rule with an unbounded number of sub-conditions would be difficult to interpret and may exceed the platform's latency budget; the platform's posture is that composition is bounded, with complex targeting logic expressed through multiple rules rather than through a single complex rule. The discipline is also the structural mechanism by which the platform's targeting rules remain maintainable: a rule with a bounded composition is easier to modify and audit than a rule with an unbounded composition.

### 6.4 Targeting Rule Versioning

Targeting rules are versioned alongside the flag. A change to a targeting rule (adding a rule, modifying a rule, removing a rule) is a new version of the flag. The previous version is retained for historical record interpretation. The versioning discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) and Principle P5 (Consistency Over Availability for Clinical Data) applied to the targeting rule domain. An audit record that references a flag evaluation must be interpretable as an evaluation against the flag's version at the time of the audit record, including the targeting rules in force at that time.

The targeting rule versioning discipline is also the structural mechanism by which the platform's targeting rules are recoverable. A question about why a flag produced a particular value at a particular time can be answered by examining the targeting rules in force at that time, with the rules recovered from the flag's version history. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the targeting rule versioning domain.

### 6.5 Targeting Rule Governance

Targeting rule changes are governed by the Architecture Council. A change to a targeting rule is a configuration action ratified through an ADR. The change is recorded in the CHANGELOG with the version increment. The previous version of the targeting rules is retained for historical record interpretation. The governance discipline is the architectural expression of Principle P7 (Documented Before Implemented) and Principle P13 (Auditability as Primitive) applied to the targeting rule governance domain.

The targeting rule governance discipline ensures that targeting rule changes are surfaced to the people who depend on them. A change that is not communicated may produce unexpected behaviour in downstream consumers; a change that is communicated but not acted upon is the consumer's responsibility. The discipline is the architectural expression of the platform's commitment to disciplined change management (PRODUCT_BIBLE Section 22 Configuration-Driven Philosophy applied to feature flags).

---

## 7. Kill Switches & Emergency Flags

### 7.1 Kill Switch Definition

A kill switch is a special type of operational flag (FF3) that rapidly disables a capability in response to an incident. A kill switch is the most safety-critical flag type because it may be invoked to prevent patient harm (for example, disabling a clinical decision support feature that is producing incorrect recommendations). Kill switches are pre-provisioned for capabilities that have non-trivial risk profiles, ensuring that the kill switch is available when needed without requiring registration through the standard Architecture Council process.

The kill switch discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the feature flag domain. A capability that produces patient harm must be disableable rapidly; the platform's posture is that such capabilities have pre-provisioned kill switches, with invocation authorized through an expedited pathway. The discipline is also the structural mechanism by which the platform maintains its safety posture under incident conditions: a kill switch invocation is recorded in the audit trail, with the invocation's rationale documented for post-incident review.

### 7.2 Kill Switch Invocation

Kill switch invocation is authorized through an expedited pathway that bypasses the standard Architecture Council process. The invocation is authorized by a designated role (typically SRE leadership or on-call engineering leadership), with the invocation recorded in the audit trail. The invocation's rationale is documented post-invocation, with the documentation required within a defined window (typically 24 hours). The expedited pathway is documented in the platform's incident response procedures.

The kill switch invocation discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the kill switch invocation domain. A kill switch that requires standard Architecture Council ratification would be too slow for incident response; the platform's posture is that kill switch invocation is authorized through an expedited pathway, with the invocation's rationale documented post-invocation. The discipline is also the structural mechanism by which the platform maintains its accountability posture under incident conditions: every invocation is recorded, and every invocation's rationale is recoverable.

### 7.3 Kill Switch Rollback

Kill switch rollback (re-enabling the capability after the incident is resolved) is authorized through the standard Architecture Council process. The rollback requires an ADR that documents the incident's resolution, the capability's readiness for re-enablement, and the rollback's plan. The rollback is recorded in the audit trail, with the rollback's rationale documented.

The kill switch rollback discipline is the architectural expression of Principle P6 (Reversibility Over Permanence) applied to the kill switch rollback domain. A kill switch that cannot be rolled back would leave the capability permanently disabled; the platform's posture is that kill switch rollback is authorized through the standard process, with the rollback's rationale documented. The discipline is also the structural mechanism by which the platform maintains its operational posture after an incident: a kill switch that is not rolled back leaves the capability disabled, which may produce operational issues if the capability is required for normal operation.

### 7.4 Emergency Operational Flags

Emergency operational flags are operational flags (FF3) that are invoked in response to incidents that are not severe enough to warrant a kill switch but require rapid operational response (for example, enabling a circuit breaker to prevent cascade failure, degrading a feature under load to preserve overall system availability). Emergency operational flags are invoked through the same expedited pathway as kill switches, with the invocation recorded in the audit trail and the rationale documented post-invocation.

The emergency operational flag discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the emergency operational flag domain. An incident that requires rapid operational response cannot wait for standard Architecture Council ratification; the platform's posture is that emergency operational flags are invoked through an expedited pathway, with the invocation's rationale documented post-invocation. The discipline is also the structural mechanism by which the platform maintains its operational posture under incident conditions: every emergency operational flag invocation is recorded, and every invocation's rationale is recoverable.

### 7.5 Kill Switch Catalogue

The kill switch catalogue is maintained as part of the feature flag catalogue. The catalogue records each kill switch's canonical identifier, the capability it controls, the invocation authorization role, the invocation pathway, and the rollback plan. The catalogue is reviewed at each quarterly Architecture Council review, with new kill switches added as new capabilities with non-trivial risk profiles are deployed, and existing kill switches reviewed for continued relevance.

| Kill Switch ID | Capability Controlled | Invocation Authorization | Rollback Plan |
|---|---|---|---|
| KS-EXAMPLE-001 | AI-Assisted Documentation | SRE Leadership | Standard Architecture Council ADR |
| KS-EXAMPLE-002 | Telehealth Recording | SRE Leadership | Standard Architecture Council ADR |
| KS-EXAMPLE-003 | Lab Integration | SRE Leadership | Standard Architecture Council ADR |
| KS-EXAMPLE-004 | Image Upload | SRE Leadership | Standard Architecture Council ADR |
| KS-EXAMPLE-005 | Notification Queue | SRE Leadership | Standard Architecture Council ADR |

---

## 8. Flag Governance

### 8.1 Governance Bodies

Feature flag governance in Ibn Hayan is exercised by the Architecture Council, with advisory input from the product management team for release and experiment flags and from the SRE leadership team for operational and kill switch flags. The Architecture Council holds overall authority for flag registration, lifecycle transitions, and deprecation. The governance is exercised through Architecture Decision Records, with each transition ratified through an ADR and recorded in the CHANGELOG.

The governance discipline is the architectural expression of Principle P7 (Documented Before Implemented) defined in SYSTEM_ARCHITECTURE Section 4.7.1. A flag that is registered without governance may produce unintended exposure (for example, a release flag activated without governance may expose a capability without the necessary review). The discipline ensures that every flag is registered through a documented process, and every flag's lifecycle transitions are recoverable.

### 8.2 Flag Ownership

Each feature flag has a designated owner. The owner is the platform team responsible for the flag (for example, the patient team owns patient-related flags, the billing team owns billing-related flags). The owner is responsible for the flag's definition, the flag's lifecycle, the flag's targeting rules, and the flag's operational behaviour. The owner is the contact point for questions about the flag and is the authority for flag changes within the Architecture Council process.

Ownership is recorded in the flag's metadata. A flag that does not have a designated owner is defective; the flag cannot be evolved or maintained without an owner. Ownership may be transferred between teams through an ADR, with the transfer recorded in the flag's metadata. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every flag has a traceable owner, and every flag change has a traceable authorization.

### 8.3 Flag Proposal Process

A feature flag proposal is submitted to the Architecture Council with the following content: the flag's display name, description, owning team, flag type, default value, targeting rules, rollout strategy, lifecycle plan (including the expected duration of the Active stage and the transition plan to Static and Removed), and rationale. The proposal is reviewed at the next Architecture Council meeting, with the decision recorded in an ADR. Approved flags are added to the catalogue in a new version, with the version increment recorded in the CHANGELOG.

The proposal process is the structural mechanism by which the platform's flag catalogue evolves with the platform's capability surface. A proposal that does not include the required content is rejected; the rejection is recorded with the rationale. The process is the architectural expression of Principle P7 (Documented Before Implemented) applied to the feature flag domain. The process is also the structural mechanism by which the platform's flag catalogue remains coherent: a flag that bypasses the proposal process may duplicate an existing flag or conflict with an existing flag, producing ambiguity and audit failures.

### 8.4 Flag Impact Assessment

Each flag proposal includes an impact assessment. The assessment covers the modules that the flag affects, the workflows that the flag governs, the integrations that the flag interacts with, the calculations that the flag affects, the status codes that the flag transitions, and the audit implications of the flag's evaluation. The assessment is the basis for the flag's testing plan: where the flag affects downstream consumers, the testing plan documents the validation required before the flag is activated.

The impact assessment discipline ensures that flags do not produce unintended consequences. A flag that exposes a new capability may produce a workflow that does not handle the new capability; a flag that toggles an operational behaviour may produce an integration that does not recognize the toggle. The impact assessment surfaces these consequences before the flag is ratified, in keeping with the platform's disciplined integration posture documented in PRODUCT_BIBLE Section 29.

### 8.5 Flag Review Cadence

The flag catalogue is reviewed at each quarterly Architecture Council review. The review covers the catalogue's size (the number of Active flags), the catalogue's age distribution (how long flags have been in the Active stage), the catalogue's transition candidates (flags that should be transitioned to Static status), and the catalogue's removal candidates (flags that should be transitioned to Removed status). The review is recorded in the catalogue's curation log.

The review cadence discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the flag catalogue domain. A catalogue that accumulates flags without review becomes difficult to navigate and audit; the platform's posture is that the catalogue is reviewed regularly, with transition and removal candidates identified and acted upon. The discipline is also the structural mechanism by which the platform's flag catalogue remains current: flags that are no longer needed are removed, ensuring that the catalogue reflects the platform's current capability surface.

---

## 9. Flag Audit Trail

### 9.1 Flag Evaluation Audit Records

Every flag evaluation for a consequential action is recorded in the audit trail, in keeping with Principle P13 (Auditability as Primitive) documented in SYSTEM_ARCHITECTURE Section 4.13. The audit record captures the flag identifier, the flag version, the evaluation context (tenant, user, session, request metadata), the targeting rules evaluated, the result, the actor (where applicable), and the timestamp. The audit record is immutable; once written, it cannot be modified or deleted.

The audit record for flag evaluations is distinct from the audit record for the underlying data action. A data action (creating an encounter, posting an invoice) is audited by the bounded context that owns the data; the flag evaluation on that action is audited by the feature flag service. Both audit records are preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5 and are queryable by authorized roles.

### 9.2 Flag Change Audit Records

Every flag change is recorded in the audit trail. The audit record captures the change type (registration, activation, targeting rule change, lifecycle transition, removal), the affected flag, the change's content (the previous and new values), the actor, the timestamp, the authorization basis, and the ADR reference. The audit record is immutable. The flag change audit discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the flag change domain.

The flag change audit discipline ensures that the platform's flag history is recoverable indefinitely. A question about why a flag was changed at a particular time can be answered by examining the flag change audit trail. The discipline is also the structural mechanism by which the platform's flag changes are compliant: regulators' questions about flag behaviour can be answered definitively by examining the flag change audit trail. The discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) applied to the flag audit domain.

### 9.3 Flag Query Audit

A query for flag history is recorded in the audit trail, in keeping with the audit query discipline documented in SYSTEM_ARCHITECTURE Section 27.6. The audit record captures the querier, the flag queried, the time range, and the result count. The query audit is itself auditable, ensuring that flag history investigation is itself auditable. This discipline is the architectural expression of the platform's commitment to accountability (PRODUCT_BIBLE Design Principle D-10).

Flag query audit interacts with the permission framework documented in PRODUCT_BIBLE Section 21. Only authorized roles can query flag history; queries by unauthorized roles are rejected before execution, with the rejection recorded as a security-relevant audit event. The permission framework's data-scope categories (All, Cohort, Self, None) apply to flag history queries: a role with Cohort scope can query flag history for tenants in its cohort; a role with Self scope can query only its own actions.

### 9.4 Flag Audit and Compliance

Flag audit records are the basis for compliance demonstration. Compliance reporting is generated from flag audit records, with reports tailored to specific regulatory requirements. For example, a regulatory report on capability exposure may be generated from flag evaluation audit records; a regulatory report on kill switch invocations may be generated from kill switch invocation audit records. Compliance reports are themselves auditable, with report generation recorded in the audit trail.

The platform's compliance documentation defines, per region, what flag audit records are required, how they are retained, and how they are made available to regulators. The platform's flag audit architecture is designed to meet these requirements without architectural change, with regional variation expressed through configuration. This discipline is the architectural expression of Principle P17 (Regional Adaptation Without Forking) applied to the flag audit domain.

### 9.5 Flag Audit and Offline Operation

Flag evaluations performed offline are audited locally with the same completeness as online flag evaluations, in keeping with the offline audit discipline documented in SYSTEM_ARCHITECTURE Section 27.7. The local audit trail is synchronized with the central audit trail when connectivity is restored, with conflict resolution ensuring audit completeness. Flag audit records are immutable, including offline flag audit records; an offline flag audit record cannot be modified before synchronization.

The offline flag audit discipline is the architectural expression of Principle P11 (Offline-First as Default) applied to the flag audit domain. A flag evaluation performed offline must be auditable with the same completeness as a flag evaluation performed online; the platform's audit completeness commitment is not relaxed for offline operation. The discipline ensures that the platform's audit trail is complete regardless of the operational mode in which the flag evaluation was performed.

---

## 10. Flag Testing

### 10.1 Testing Discipline

Feature flag testing in Ibn Hayan follows a documented discipline. Each flag is tested before activation, with the test suite covering the flag's targeting rules (positive and negative cases), the flag's evaluation (determinism and performance), the flag's audit (audit record completeness), and the flag's interaction with other flags (conflict scenarios). The test suite is versioned alongside the flag and is run on each flag version change.

The testing discipline is the structural mechanism by which the platform's flag catalogue maintains its quality. A flag that is activated without testing may produce unintended exposure; the platform's commitment to clinical safety (Principle P1) requires that flags be tested before activation. The discipline is the architectural expression of Principle P7 (Documented Before Implemented) applied to the feature flag domain.

### 10.2 Test Case Design

Test cases are designed to cover the flag's full behavioural surface. Each test case specifies the evaluation context, the expected result, and the expected audit record. Test cases are derived from the flag's targeting rules (one test case per rule), the flag's evaluation (one test case per cohort assignment), the flag's audit (one test case per audit field), and the flag's interaction with other flags (one test case per conflict scenario). Test cases are reviewed by the flag's owner and by the Architecture Council.

The test case design discipline ensures that the flag's behaviour is fully specified. A flag with an incomplete test suite may produce behaviour that is not specified, which is a defect. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every behaviour is testable, and every test is recoverable. The discipline is also the structural mechanism by which the platform's flag catalogue is maintainable: a flag with a comprehensive test suite can be modified with confidence that the modification does not produce unintended behaviour.

### 10.3 Sandbox Testing

Flag changes are tested in a configuration sandbox before application to production, in keeping with the configuration sandbox discipline documented in SYSTEM_ARCHITECTURE Section 15.7. The sandbox is a non-production tenant that inherits from the production tenant's configuration, ensuring that sandbox testing reflects production reality. The flag change is applied to the sandbox, the test suite is run, and the flag's behaviour is observed in the sandbox before the change is applied to production.

The sandbox testing discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the feature flag domain. A flag change that is applied to production without sandbox testing may compromise clinical safety; the platform's posture is that flag changes are tested in a sandbox before application to production, except for emergency changes (kill switches and emergency operational flags) that follow the expedited pathway documented in Section 7. The discipline is the structural mechanism by which the platform's flag catalogue maintains its safety posture across the platform's deployment spectrum.

### 10.4 Flag Validation Framework

Flag validation is performed by the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. The framework applies five validation rule categories: Structural (the flag conforms to the flag schema), Referential (the flag's references resolve), Semantic (the flag is internally consistent), Contextual (the flag is consistent with its scope), and Regulatory (the flag is consistent with the regulatory framework in force for the tenant's region). A flag that fails validation is not applied.

The validation framework is the structural mechanism by which the platform's flag catalogue maintains its integrity. A flag that bypasses validation may produce behaviour that is not specified, which is a defect. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every flag is validated before application, and every validation result is recoverable. The discipline is also the structural mechanism by which the platform's flag catalogue is compliant: flags that fail regulatory validation are not applied, ensuring that the platform's flag behaviour complies with the regulatory framework in force for the tenant's region.

### 10.5 Flag Monitoring

Flag behaviour is monitored in production through the platform's observability infrastructure (SYSTEM_ARCHITECTURE Section 22). The monitoring covers the flag's evaluation count, the flag's result distribution, the flag's evaluation latency, and the flag's audit record completeness. The monitoring is reviewed by the flag's owner and by the SRE leadership team, with anomalies investigated and resolved.

The flag monitoring discipline is the architectural expression of Principle P15 (Observability as Primitive) applied to the feature flag domain. A flag that is not monitored may produce unintended behaviour that is not detected; the platform's posture is that flags are monitored in production, with anomalies investigated. The discipline is also the structural mechanism by which the platform's flag catalogue maintains its operational posture: monitoring-driven detection ensures that flag-related incidents are detected and resolved rapidly.

---

## 11. Flag Deprecation

### 11.1 When Deprecation Is Required

A feature flag is deprecated when the flag is no longer needed for its original purpose. Deprecation is required in three situations. First, when a release flag has been at True for all tenants for a defined period (the capability has reached general availability and the flag is no longer needed to control the capability's exposure). Second, when an experiment flag has concluded (the experiment's metrics have been analyzed and a decision has been made). Third, when a migration flag has completed (the migration has finished and the flag is no longer needed to control the migration's behaviour). Deprecation is the transition from Active to Static status, as documented in Section 3.

The deprecation discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the flag deprecation domain. A flag that is no longer needed but remains in the Active stage adds complexity without benefit; the platform's posture is that such flags are deprecated. The discipline is also the structural mechanism by which the platform's flag catalogue remains current: deprecation is the first step toward removal, ensuring that the catalogue reflects the platform's current capability surface.

### 11.2 Deprecation Process

A flag deprecation is ratified through an ADR. The ADR records the deprecated flag, the rationale, the deprecation timeline (the period during which the flag will remain in the Static stage before removal), and the removal plan. The ADR is recorded in the CHANGELOG with the version increment. The deprecation takes effect at the ADR's ratification, with the flag transitioned from Active to Static status. After the deprecation timeline elapses, the flag is transitioned from Static to Removed status, as documented in Section 3.

The deprecation process is the structural mechanism by which the platform's flag catalogue evolves without disrupting historical records. A deprecation that bypasses the process is defective; the platform's audit trail cannot demonstrate the deprecation's rationale, and downstream consumers cannot determine why the flag was deprecated. The process is the architectural expression of Principle P13 (Auditability as Primitive) applied to the flag deprecation domain.

### 11.3 Deprecation Timeline

The deprecation timeline is the period during which a deprecated flag remains in the Static stage before removal. The timeline is set per flag based on the flag's usage and the platform's operational needs. A flag that is used in many modules may have a longer timeline (to allow module updates to remove the flag reference); a flag that is used in a single module may have a shorter timeline. The timeline is documented in the deprecation ADR and is reviewed at each Architecture Council quarterly review until the deprecation is complete.

The deprecation timeline discipline ensures that flags are not removed prematurely. A flag that is removed while modules still reference it would produce undefined behaviour in those modules; the platform's posture is that flags remain in the Static stage until all module references are removed. The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the flag deprecation domain.

### 11.4 Removal Process

Flag removal is the final stage of the flag lifecycle. A flag is removed when the deprecation timeline has elapsed and all module references have been removed. The removal is ratified through an ADR, with the ADR recording the removed flag, the rationale, the module updates completed, and the removal date. The removal is recorded in the audit trail, with the removed flag retained in the catalogue's retired-flag list for historical record interpretation.

The removal process discipline preserves the platform's ability to interpret historical flag evaluations. A flag evaluation recorded in the audit trail must remain interpretable indefinitely, even after the flag has been removed. The discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) and Principle P5 (Consistency Over Availability for Clinical Data) applied to the flag removal domain.

### 11.5 Deprecation Communication

Flag deprecations are communicated through change notices to affected module owners, integration owners, and (where the deprecation affects user-visible behaviour) tenant administrators. The change notice includes the deprecated flag, the rationale, the deprecation timeline, and the removal plan. The change notice is distributed at the deprecation's ratification and is repeated at the midpoint and end of the deprecation timeline.

The communication discipline is the structural mechanism by which flag deprecations are surfaced to the people who depend on them. A deprecation that is not communicated may produce unexpected behaviour in downstream consumers; a deprecation that is communicated but not acted upon is the consumer's responsibility. The discipline is the architectural expression of the platform's commitment to disciplined change management (PRODUCT_BIBLE Section 22 Configuration-Driven Philosophy applied to feature flags).

---

## 12. Related Documents

### 12.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-2 (Configuration Before Customization), D-10 (Accountability) govern flag posture |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Feature flags are distinct from configuration but governed by the configuration lifecycle |
| PRODUCT_BIBLE.md | Section 28 (Offline Strategy) | Offline flag evaluation and audit |
| PRODUCT_BIBLE.md | Section 31 (Security Philosophy) | Flag authorization and audit |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P3 (One Platform), P4 (Loose Coupling), P5 (Consistency), P7 (Documented), P11 (Offline-First), P13 (Auditability), P14 (Simplicity), P18 (Decade-Horizon) govern flag posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Feature Flags bounded context (BC18) |
| SYSTEM_ARCHITECTURE.md | Section 14 (Feature Flag Strategy) | Flag types, lifecycle, evaluation, governance |
| SYSTEM_ARCHITECTURE.md | Section 15 (Configuration Strategy) | Flag configuration surface and validation |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Flag evaluation and change audit |
| CONFIGURATION_ARCHITECTURE.md | Section 5 (Feature Flag Architecture) | Implementation-grade elaboration of feature flag architecture |
| CONFIGURATION_ARCHITECTURE.md | Section 7 (Configuration Validation) | Flag validation framework |
| CONFIGURATION_ARCHITECTURE.md | Section 8 (Configuration Lifecycle) | Flag lifecycle |

### 12.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references feature flags, the reference is to this document.

| Document | Relationship to Feature Flags |
|---|---|
| TERMINOLOGY.md | Flag identifiers are local extensions governed by TERMINOLOGY Section 3 |
| ENUMS.md | Feature flag enums (FF1–FF5, FFL1–FFL5) are documented in ENUMS.md |
| STATUS_CODES.md | Feature flag lifecycle (FFL1–FFL5) is a status code |
| BUSINESS_RULES.md | Business rules may be affected by flag state; rule conditions may check flags |
| CALCULATIONS.md | Calculations may be affected by flag state (e.g., experiment variant affects calculation) |
| CLINICAL_WORKFLOWS.md | Clinical workflows may be affected by flag state; flag controls workflow activation |
| CONFIGURATION.md | Feature flag configuration is distinct from continuous configuration |

### 12.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level flag usage and configuration |
| docs/04_INTEGRATIONS/*.md | External system flag exchange (rare; typically flags are internal) |
| docs/06_DATABASE/*.md | Flag storage and indexing |
| docs/09_DEPLOYMENT/*.md | Flag service deployment topology |
| docs/03_SECURITY/*.md | Flag authorization and audit |

### 12.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when a flag amendment, a kill-switch invocation, a flag lifecycle transition, or an ADR requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification. Ibn Hayan's feature flag catalogue is a structural element of the platform's contract surface and is treated with the discipline that structural elements warrant.
