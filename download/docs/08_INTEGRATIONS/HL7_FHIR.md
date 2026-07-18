# Ibn Hayan Healthcare Operating System — HL7 & FHIR Integration

| Field | Value |
|---|---|
| Document Title | HL7 & FHIR Integration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Integration Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE Section 19 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CTO |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Integration architects, solution architects, interoperability officers, clinical informatics specialists, compliance officers, customer-facing implementation teams, customers evaluating interoperability posture |
| Scope | Conceptual coverage of HL7 v2, HL7 v3/CDA, and FHIR R4 integration: standard scope, resource categories, integration architecture, authentication and authorization, data mapping, versioning, conformance and profiles, subscription, bulk data export, audit implications, performance considerations, multi-tenant considerations, governance |
| Out of Scope | Implementation details, source code, API endpoint specifications, JSON payloads, HTTP method listings, database tables and schemas, UI components, framework commitments, vendor-specific middleware products, country-specific national connector wiring, certification evidence artefacts |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until the canonical reference is amended through architectural governance. |
| Amendment Mechanism | Architecture Council ratification through a documented Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with headings only) |

---

## Table of Contents

1. HL7 & FHIR Overview
2. HL7 v2 Integration
3. HL7 v3 & CDA Integration
4. FHIR R4 Implementation
5. FHIR Resources & Profiles
6. Terminology Services
7. RESTful API Conformance
8. Subscription & Notification
9. Patient Identity Cross-Referencing
10. Security & OAuth2/SMART
11. Testing & Validation
12. Configuration
13. Monitoring & Alerts
14. Related Documents

---

## 1. HL7 & FHIR Overview

### 1.1 Purpose of This Document

This document defines how the Ibn Hayan Healthcare Operating System approaches integration through the family of HL7 standards — HL7 v2 messaging, HL7 v3 and the Clinical Document Architecture (CDA), and the Fast Healthcare Interoperability Resources (FHIR) standard at release R4 and its successors. The document is conceptual: it describes the platform's posture, scope, and architectural commitments rather than the specific wire details of any one exchange. Implementation specifics, including endpoint URLs, payload examples, and message field maps, are out of scope and are maintained alongside each customer's integration configuration. The conceptual posture defined here governs every Ibn Hayan HL7 and FHIR integration, regardless of the partner, region, or clinic type involved.

### 1.2 Position in the Documentation Framework

This document elaborates Section 19 (Integration Architecture) of `SYSTEM_ARCHITECTURE.md` and Section 29 (Integration Philosophy) of `PRODUCT_BIBLE.md`. It is one of eight integration references maintained under `docs/08_INTEGRATIONS/`, alongside DICOM, lab devices, payment gateways, SMS, email, WhatsApp, and national health systems. Each integration reference is authoritative for its domain; conflicts between integration references are resolved by the canonical architecture and product documents. Ibn Hayan treats integration documentation as a first-class deliverable, not as a by-product of implementation, in keeping with the platform's documented-before-shipped commitment.

### 1.3 Standards Posture

Ibn Hayan's posture is to prefer open healthcare integration standards over proprietary ones, as a direct consequence of architectural principle P12 (Open Standards Over Proprietary). HL7 v2, HL7 v3/CDA, and FHIR are open standards governed by the HL7 International organization and are therefore the platform's preferred vehicles for healthcare interoperability. Where a regional or national authority mandates a profile, extension, or restriction on these standards, Ibn Hayan adopts the mandated profile through configuration rather than through code branching. Where no open standard is viable for a specific exchange, a proprietary integration may be used as an interim measure, with migration to an open standard planned through the Architecture Council.

### 1.4 Audience and Use

This document is written for integration architects who design interoperability solutions on Ibn Hayan, for solution architects who position Ibn Hayan within a customer's broader application landscape, for interoperability officers who assess conformance, and for customers evaluating whether the platform can participate in their existing HL7 or FHIR ecosystem. The document is also a reference for the Ibn Hayan implementation team during customer onboarding, ensuring that integration decisions are consistent with the platform's architectural commitments. The document does not assume prior familiarity with the platform's internal architecture, but it does assume working familiarity with HL7 and FHIR terminology.

---

## 2. HL7 v2 Integration

### 2.1 Role of HL7 v2 in Modern Healthcare

HL7 v2 remains the dominant messaging standard for healthcare application integration in many regions, particularly for exchange between hospital information systems, laboratory systems, radiology systems, and pharmacy systems. Despite the maturity of FHIR, HL7 v2 deployments persist because of the large installed base of certified systems that depend on v2 for routine operational exchange. Ibn Hayan treats HL7 v2 as a first-class integration standard for inbound and outbound messaging, not as a legacy accommodation. A customer that operates within a v2-centric ecosystem can integrate with Ibn Hayan without being forced to adopt FHIR.

### 2.2 Trigger Events Supported Conceptually

Ibn Hayan supports the HL7 v2 trigger events that are most consequential for routine healthcare operations. The supported event categories include patient administration (admit, discharge, transfer, registration, merge), order entry and result reporting for laboratory and diagnostic services, scheduling and resource management, pharmacy order and administration, and clinical documentation messaging. The platform's intake process evaluates additional trigger events when a customer or region requires them. Each supported trigger event is documented with its conceptual mapping to the platform's internal entities, with the mapping maintained as a configuration artefact rather than as a hard-coded translation.

### 2.3 Acknowledgement Discipline

HL7 v2 defines two acknowledgement modes: application-level acknowledgements and commit-level acknowledgements. Ibn Hayan enforces acknowledgement discipline as a reliability mechanism, not as a courtesy. Inbound messages that pass structural validation receive a commit acknowledgement; messages that pass semantic validation receive an application acknowledgement. Messages that fail validation are rejected with a structured error that the originating system can act upon. The platform records every inbound message, every acknowledgement, and every rejection in the audit trail, in keeping with architectural principle P13 (Auditability as Primitive). The acknowledgement flow is governed by the integration pattern selected for the integration, as defined in SYSTEM_ARCHITECTURE Section 19.2.

### 2.4 v2-to-Internal Mapping Approach

HL7 v2 messages are mapped to Ibn Hayan's internal entity model through an anticorruption layer, as defined in SYSTEM_ARCHITECTURE Section 19.4. The anticorruption layer translates the v2 message structure into the platform's bounded-context model, preventing v2-specific concepts from leaking into the domain layer. The mapping is expressed as a configuration artefact that defines, per trigger event and per segment, how each field is interpreted. This approach allows Ibn Hayan to accommodate regional variations in v2 implementation — including the well-known variability in how vendors interpret the standard — without modifying the platform's internal model. Mapping configurations are versioned, audited, and reviewed during customer onboarding.

---

## 3. HL7 v3 & CDA Integration

### 3.1 Document-Centric Exchange

HL7 v3 and the Clinical Document Architecture (CDA) define a document-centric approach to healthcare exchange, in which a clinical document is exchanged as a structured artefact with persistent content, attribution, and lifecycle. Ibn Hayan supports CDA exchange for scenarios where the document itself is the unit of interoperability, including discharge summaries, referral notes, clinical care summaries, and patient summaries exchanged with regional or national health information exchanges. The platform's posture is to consume CDA documents inwards, producing or augmenting its internal clinical record, and to produce CDA documents outwards when the receiving system expects a document rather than discrete resources.

### 3.2 CDA Document Categories

Ibn Hayan recognises the principal CDA document categories relevant to its scope, including the Continuity of Care Document (CCD), the Discharge Summary, the Progress Note, the History and Physical, the Operative Note, the Consultation Note, the Unstructured Document, and the Patient Summary. The platform does not commit to producing every category for every customer; the supported set is determined during onboarding based on the customer's interoperability requirements and the regional regulatory framework. Each supported category is implemented against a recognised template, with the template's constraint profile applied during document generation and validation.

### 3.3 Templates and Constraint Expression

CDA templates express constraints on the document's structure, vocabulary, and value set binding. Ibn Hayan treats templates as configuration artefacts: a template is defined, validated against the platform's conformance rules, and then applied to document generation and parsing. The platform supports the template hierarchy pattern, in which a specialised template derives from a more general template, allowing customers to adopt regional or national template profiles without forking the platform's document-generation logic. Template changes are versioned and audited, with the template version recorded in every generated document.

### 3.4 Lifecycle and Document Replacement

CDA documents have a lifecycle: a document may be replaced by a subsequent version, may be appended to by an addendum, or may be rescinded under defined circumstances. Ibn Hayan models the document lifecycle explicitly, with the document's identifier linking together the versions and addenda that belong to the same logical document. When a replacement document arrives, the platform records the relationship between the prior and replacement documents in the audit trail, preserving the prior document's content for legal and clinical record completeness. The lifecycle model is consistent with the platform's broader state-management philosophy defined in SYSTEM_ARCHITECTURE Section 17.

---

## 4. FHIR R4 Implementation

### 4.1 Why FHIR R4

FHIR R4 is the mature normative release of the FHIR standard and is the release against which Ibn Hayan aligns its FHIR implementation. R4 provides normative status for the core resources, the RESTful API, the terminology framework, and the conformance framework, giving the platform a stable target for implementation. Subsequent FHIR releases may introduce additional resources, extensions, or behaviour; Ibn Hayan evaluates each release through the Architecture Council and adopts backward-compatible additions through configuration. The platform does not adopt a new FHIR release as a replacement for R4 until the new release achieves normative status for the relevant resources and the platform's conformance has been re-validated.

### 4.2 RESTful Discipline

FHIR's RESTful discipline is the foundation of the platform's FHIR implementation. Ibn Hayan exposes and consumes FHIR resources through RESTful interactions, with each resource type supporting the standard interaction set (read, vread, update, patch, delete, create, search, history). The platform enforces RESTful conventions uniformly, including the use of resource identifiers, version identifiers, and last-modified timestamps. The RESTful discipline is enforced at the platform's Integration Layer, not at the bounded-context layer, ensuring that all FHIR interactions pass through a single conformance checkpoint.

### 4.3 Resource Lifecycle

Every FHIR resource managed by Ibn Hayan has a defined lifecycle that aligns with the platform's internal entity lifecycle. A resource is created through a create interaction, modified through update or patch interactions, and may be deleted through a delete interaction subject to the platform's data-retention rules. The platform preserves the full version history of a resource through the history interaction, with each version carrying a version identifier and a last-modified timestamp. The lifecycle is consistent with the platform's audit primitive: every lifecycle transition is recorded in the audit trail, with the audit record capturing the actor, the action, the previous state, and the new state.

### 4.4 Interaction Set

Ibn Hayan supports the FHIR interaction set as defined by the standard, including the type-level interactions (create, search, history), the instance-level interactions (read, vread, update, patch, delete, history), and the system-level interactions (batch, transaction, whole-system search, whole-system history). The platform also supports the capabilities interaction, which exposes the platform's CapabilityStatement to interoperability partners. The complete interaction set is documented per resource type in the platform's conformance material, with each interaction's supported parameters and response characteristics defined. Interactions that the platform does not support for a specific resource type are documented as unsupported in the CapabilityStatement.

### 4.5 Versioning Discipline

FHIR defines two versioning strategies: versioned-update and version-aware-update. Ibn Hayan adopts version-aware-update for resources where concurrent modification is a concern, requiring the client to supply the version identifier of the version it is modifying. The platform rejects updates that target a stale version with a 409 Conflict response, in keeping with the FHIR specification. For resources where concurrent modification is not a concern, the platform uses versioned-update, accepting updates without a version identifier but still recording the new version. The versioning strategy is defined per resource type in the platform's conformance material.

---

## 5. FHIR Resources & Profiles

### 5.1 Resource Categories

FHIR organises resources into categories that reflect the standard's clinical, administrative, and infrastructural scope. Ibn Hayan supports the principal resource categories relevant to its platform scope, including the Patient and Person resources for demographic and identity management, the Encounter and EpisodeOfCare resources for care context, the Observation, Condition, and DiagnosticReport resources for clinical findings, the MedicationRequest and MedicationAdministration resources for medication management, the Procedure resource for procedural care, the AllergyIntolerance and Immunization resources for preventive and reactive care, the Coverage and Claim resources for financial-administrative exchange, the DocumentReference and Composition resources for document-centric exchange, the Practitioner, PractitionerRole, Organization, and Location resources for directory information, and the Schedule and Slot resources for scheduling. The supported set is documented per resource type in the platform's conformance material, with each resource's supported fields, search parameters, and interactions defined. The conceptual coverage in this document is not an exhaustive listing; the conformance material is the authoritative reference for what each resource supports.

### 5.2 Ibn Hayan Conformance Profiles

Ibn Hayan publishes FHIR profiles that constrain the standard resources to the platform's conformance expectations. A profile defines which fields are mandatory, which fields are optional, which fields are prohibited, which value sets are bound to coded fields, and which extensions are required. The platform's profiles are derived from the standard FHIR resources, not from third-party profiles, ensuring that the platform's conformance is independent of any external profile hierarchy. The profiles are versioned and published through the platform's CapabilityStatement, allowing interoperability partners to discover the platform's conformance programmatically. Profile changes follow the platform's amendment mechanism: a profile change is proposed through an Architecture Decision Record, reviewed by the Architecture Council, and ratified before it takes effect.

### 5.3 Extensions and Customization Discipline

FHIR extensions allow implementers to carry information that the standard resources do not natively support. Ibn Hayan uses extensions sparingly and only when the standard resources cannot carry the required information through their native fields. The platform publishes its extensions through the conformance material, with each extension documented with its URL, cardinality, value type, and intended use. The platform does not use extensions as a substitute for proper modelling: when a clinical or administrative concept recurs across multiple customers or regions, the concept is modelled as a first-class field in the platform's internal entity model and surfaced through the appropriate FHIR resource field, not as an extension. This discipline prevents the proliferation of bespoke extensions that compromise interoperability.

### 5.4 Terminology Binding Strategy

Every coded field in a FHIR resource is bound to a value set, which may be required, extensible, preferred, or example. Ibn Hayan adopts a terminology binding strategy that favours required bindings to recognised terminologies — including SNOMED CT, LOINC, ICD-10, ICD-11, RxNorm, and ATC — for fields where the terminology is mature and regionally applicable. The platform adopts extensible bindings where regional variation is expected, allowing a region to substitute its local terminology while preserving the standard's intent. The terminology binding strategy is consistent with the platform's terminology services discipline described in Section 6 and with the regional clinical coding system dimension defined in PRODUCT_BIBLE Section 25.2.

---

## 6. Terminology Services

### 6.1 Purpose of Terminology Services

Terminology services provide a unified interface for code system lookup, value set expansion, concept validation, and concept translation. Ibn Hayan exposes terminology services through its Integration Layer, allowing internal bounded contexts and external interoperability partners to consume terminology consistently. The platform's terminology services are governed by architectural principle P13 (Auditability as Primitive): every terminology lookup, validation, and translation is recorded in the audit trail, with the audit record capturing the code system, the code, the value set, and the result. Terminology services are not optional infrastructure; they are a conformance requirement for any module that handles coded clinical data.

### 6.2 Code Systems and Value Sets

Ibn Hayan maintains the canonical set of code systems and value sets that the platform supports, with each code system documented with its identifier, version, and source. The platform distinguishes between code systems that the platform hosts internally and code systems that are sourced from an external terminology provider; the distinction is recorded in the platform's configuration and surfaced in the conformance material. Value sets are defined as configuration artefacts, with each value set's membership expressed as an enumerable list or as a rules-based composition. Value sets that are defined by an external authority, including national value sets, are imported and version-controlled through the platform's intake process.

### 6.3 Concept Map and Translation

Concept maps express the equivalence or partial equivalence between concepts in different code systems. Ibn Hayan uses concept maps to translate between regional terminologies, between versions of a terminology, and between a local coding convention and a recognised standard. The platform treats concept maps as configuration artefacts, with each map's authorship, validation status, and version recorded. Concept map translation is conservative: where a concept cannot be translated without loss of meaning, the platform records the original concept alongside the translation, preserving the clinical fidelity of the original coding. This discipline is consistent with the platform's clinical safety commitments defined in PRODUCT_BIBLE Section 27.6.

### 6.4 Validation Discipline

Terminology validation is the process of confirming that a coded value is a member of a value set and that the code is valid in its code system. Ibn Hayan performs validation at three points: at inbound message ingestion (to reject messages that carry invalid codes), at outbound message generation (to prevent the platform from emitting invalid codes), and at the platform's UI surface (to guide practitioners toward valid codes). Validation is not a courtesy check; it is a clinical safety control. A coded value that fails validation is flagged, and the action that carried the value is recorded in the audit trail with the validation result. Validation discipline is consistent with the platform's clinical safety commitments and with the healthcare-first principle (P1).

---

## 7. RESTful API Conformance

### 7.1 CapabilityStatement

The FHIR CapabilityStatement is the canonical description of a FHIR server's conformance: the resources it supports, the interactions it supports for each resource, the search parameters it supports, the operations it supports, and the security it enforces. Ibn Hayan publishes its CapabilityStatement through the standard FHIR capabilities interaction, allowing any interoperability partner to discover the platform's conformance programmatically. The CapabilityStatement is generated from the platform's conformance configuration, not hand-maintained, ensuring that the published conformance matches the platform's actual behaviour. The CapabilityStatement is versioned, with each version's changes recorded in the audit trail.

### 7.2 Interaction Compliance

Ibn Hayan documents per resource type which FHIR interactions are supported, which are not supported, and which are supported with restrictions. The platform's default posture is to support the standard interaction set (read, vread, create, update, patch, delete, search, history) for resources that are within the platform's scope, with restrictions documented in the CapabilityStatement. Interactions that carry clinical safety implications — including delete and certain update patterns — are subject to additional controls, including soft-delete semantics, mandatory audit, and reconciliation workflows. The interaction compliance matrix is reviewed quarterly by the Architecture Council.

### 7.3 Search Parameters

FHIR defines standard search parameters for each resource type, and implementers may define additional search parameters through SearchParameter resources. Ibn Hayan supports the standard search parameters for the resources it exposes, with documented support for parameter modifiers (exact, contains, prefix) and for chained and reverse-chained search. The platform's search implementation respects the FHIR pagination conventions, returning a Bundle with next, previous, first, and last links as appropriate. Search parameters that the platform does not support for a specific resource are documented as unsupported in the CapabilityStatement, preventing interoperability partners from relying on unsupported behaviour.

### 7.4 Pagination, Sorting, Include

Ibn Hayan's FHIR search results are paginated, with the page size configurable per tenant within platform-defined bounds. The platform supports sorting on standard search parameters, with the sort direction specified in the search request. The platform supports the _include and _revinclude parameters, allowing clients to retrieve related resources in a single search, reducing the number of round-trips required for typical interoperability workflows. The platform limits the total number of resources returned in a single search to a documented maximum, with the limit enforced to protect platform stability and to prevent unbounded query patterns. The pagination, sorting, and include behaviour is consistent with the FHIR specification and is documented in the platform's conformance material.

---

## 8. Subscription & Notification

### 8.1 Subscription Resource

The FHIR Subscription resource allows a client to register interest in a topic and to receive notifications when resources matching the topic change. Ibn Hayan supports the Subscription resource for outbound notifications, allowing external systems to subscribe to platform-emitted events. The platform's subscription support is governed by the platform's event-driven concepts defined in SYSTEM_ARCHITECTURE Section 18. A subscription is created through the standard FHIR create interaction, validated against the platform's subscription policy, and activated upon validation. The platform records subscription creation, activation, suspension, and termination in the audit trail.

### 8.2 Topic-Based Subscription Concepts

FHIR R5 introduced the SubscriptionTopic resource, which decouples the subscription's topic from its delivery channel. Ibn Hayan adopts topic-based subscription concepts where the standard supports them, with topics defined for the principal clinical and administrative events that the platform emits. Topic definitions are configuration artefacts, versioned and audited. The platform's topic catalogue is reviewed periodically to ensure that topics are clinically and operationally meaningful, that topic definitions are unambiguous, and that topic names do not collide with deprecated topics. Topics that have no subscribers for an extended period are candidates for deprecation through the Architecture Council.

### 8.3 Delivery Patterns

Ibn Hayan supports multiple subscription delivery patterns, including rest-hook delivery (where the platform posts a notification to a client-defined endpoint), message delivery (where the notification is sent to a messaging channel), and email delivery for low-volume administrative notifications. The delivery pattern is selected per subscription, with the pattern's reliability characteristics documented. Rest-hook delivery is the default for system-to-system exchange, in keeping with the FHIR specification's preference for stateless, REST-based delivery. The platform records every delivery attempt in the audit trail, with the audit record capturing the subscription, the topic, the resources affected, and the delivery result.

### 8.4 Reliability Discipline

Subscription delivery is governed by the platform's integration reliability mechanisms defined in SYSTEM_ARCHITECTURE Section 19.7. The platform retries failed deliveries with backoff, subjects persistently failing subscriptions to circuit-breaker behaviour, and routes undeliverable notifications to a dead-letter store for investigation. The platform's reliability discipline is consistent with the FHIR specification's expectation that subscription delivery is at-least-once, with clients expected to handle idempotency. The platform does not guarantee exactly-once delivery; clients that require exactly-once semantics must implement idempotency controls on their side. The reliability posture is documented in the platform's conformance material and is reviewed during customer onboarding.

---

## 9. Patient Identity Cross-Referencing

### 9.1 Patient Identity Complexity

Patient identity is one of the most consequential concepts in healthcare interoperability, and one of the most variable across systems. A single patient may be known by different identifiers in different systems, may have demographic data that has drifted between systems, and may have been merged or split across systems in ways that the originating systems do not share. Ibn Hayan treats patient identity as a first-class concern, governed by the Patient bounded context (BC01) and the Identity & Access bounded context (BC15). The platform's patient identity model is documented in the Patient module reference under `docs/07_MODULES/PATIENTS.md`.

### 9.2 Cross-Reference Approach

Ibn Hayan records cross-references between its internal patient identifier and external system patient identifiers through the FHIR Patient.identifier field, with each external identifier carried as a distinct identifier entry with its assigned system. The platform supports the Link resource for recording identity relationships, including replacement links (where one patient record has replaced another), refer links (where two records refer to the same person), and see-also links (where two records are related but not identical). The cross-reference approach is governed by the platform's patient identity policy, which defines when a cross-reference may be created, who may create it, and how it is audited.

### 9.3 Patient $match Operation

The FHIR $match operation allows a client to submit a partial Patient resource and to receive a list of candidate matches ranked by similarity. Ibn Hayan supports the $match operation as a mechanism for patient identity resolution at the point of inbound exchange. The platform's match algorithm is configurable, with the matching parameters — including the weights assigned to demographic fields, the threshold for a positive match, and the threshold for a candidate match — defined per tenant within platform-defined bounds. The match algorithm is conservative: when the algorithm cannot identify a confident match, the platform returns the candidates for human review rather than committing an automatic match. This discipline is consistent with the platform's clinical safety commitments.

### 9.4 Identity Governance

Patient identity is governed by a defined workflow that covers identity creation, identity update, identity merge, identity split, and identity retirement. Every identity action is audited, with the audit record capturing the actor, the action, the previous state, and the new state. Identity merges are particularly consequential and are subject to additional controls, including a defined approval workflow, a cooling-off period during which the merge can be reversed, and a permanent record of the merge in the audit trail. The platform's identity governance is consistent with the platform's broader state-management philosophy defined in SYSTEM_ARCHITECTURE Section 17 and with the audit primitive defined in Section 27.

---

## 10. Security & OAuth2/SMART

### 10.1 OAuth2 and OIDC Concepts

FHIR RESTful exchange is secured through OAuth2 and OpenID Connect (OIDC), the recognised standards for delegated authorisation and authentication. Ibn Hayan enforces OAuth2 and OIDC for all FHIR interactions that traverse the platform's external boundary, with internal interactions governed by the platform's internal authentication and authorisation framework. The platform's OAuth2 implementation supports the standard grant types relevant to healthcare interoperability, including the authorisation code grant for user-driven workflows, the client credentials grant for system-to-system workflows, and the refresh token grant for long-running workflows. Token issuance, refresh, and revocation are audited, with audit records capturing the client, the scope, the resource, and the time.

### 10.2 SMART on FHIR Scopes

The SMART on FHIR framework defines a scope convention for FHIR resources, allowing a client to request access to a specific resource type with a specific access level. Ibn Hayan supports the SMART scope convention, with scopes expressed as `patient/<resource>.<action>`, `user/<resource>.<action>`, and `system/<resource>.<action>`. The platform enforces scope-based authorisation at the Integration Layer, with each FHIR interaction's authorisation evaluated against the token's granted scopes. The platform's scope model is consistent with the platform's permission philosophy defined in PRODUCT_BIBLE Section 21, with scopes mapped to internal permission primitives. A scope that is not granted by the token is not authorised, regardless of the resource's existence.

### 10.3 Token Lifecycle

OAuth2 access tokens have a defined lifecycle: they are issued with an expiration, may be refreshed through a refresh token, and may be revoked before their expiration. Ibn Hayan enforces token lifecycle discipline, with tokens issued for a defined period, refresh tokens subject to rotation, and revocation honoured immediately. The platform's token lifecycle is configurable per tenant within platform-defined bounds, with the bounds documented in the platform's security material. Token revocation is propagated to the platform's authorisation cache, ensuring that a revoked token cannot be used after revocation. The token lifecycle is consistent with the platform's security architecture defined in SYSTEM_ARCHITECTURE Section 20.

### 10.4 Patient-Level and User-Level Access

SMART on FHIR distinguishes between patient-level access (where the token authorises access to a single patient's data) and user-level access (where the token authorises access to the data the user is permitted to see). Ibn Hayan supports both access patterns, with the pattern determined by the scope grant and the patient context. Patient-level access is enforced through the platform's data-scope mechanism, with the patient identifier carried in the token's context. User-level access is enforced through the platform's standard permission framework, with the user's permissions evaluated at query time. The two patterns are not conflated; a patient-level token does not confer user-level access, and a user-level token does not confer unrestricted patient-level access. This discipline is consistent with the platform's least-privilege commitment defined in PRODUCT_BIBLE Section 27.2.

---

## 11. Testing & Validation

### 11.1 Conformance Testing

Conformance testing confirms that Ibn Hayan's FHIR implementation behaves as documented in the platform's CapabilityStatement. Conformance tests cover the supported interactions, the supported search parameters, the supported operations, the enforced security, and the published profiles. The platform's conformance tests are executed continuously as part of the platform's quality discipline, with test results reviewed by the Architecture Council. Conformance tests are also executed before the platform publishes a new CapabilityStatement version, ensuring that the published conformance matches the platform's actual behaviour. Conformance test failures are treated as defects and are resolved before the affected behaviour is released.

### 11.2 Interoperability Test Harness

Interoperability testing confirms that Ibn Hayan can exchange FHIR resources with the specific systems operated by a customer or partner. The platform maintains an interoperability test harness that exercises the platform's FHIR interactions against a partner's FHIR endpoint, with the test cases defined per integration. The harness covers positive cases (valid resources, valid interactions), negative cases (invalid resources, invalid interactions), and edge cases (large payloads, concurrent updates, network failures). The test harness is executed during customer onboarding and is repeated periodically to detect regressions on either side of the integration. Test results are recorded and reviewed by the integration team and by the customer.

### 11.3 Synthetic Data Discipline

Interoperability testing and conformance testing require data that exercises the platform's behaviour without exposing real patient data. Ibn Hayan maintains a synthetic data discipline that provides test data for conformance and interoperability testing, with the data generated to cover the platform's supported resources, profiles, and value sets. Synthetic data is clearly marked as synthetic, is not commingled with production data, and is not used in production environments. The platform's synthetic data discipline is consistent with the platform's broader data governance commitments and with the privacy commitments defined in the platform's security documentation.

### 11.4 Validation in Onboarding

Every customer onboarding that includes HL7 or FHIR integration is subject to a defined validation workflow. The workflow covers the integration's contract validation (does the partner's actual behaviour match the partner's documented behaviour?), the platform's conformance validation (does the platform's conformance match the integration's requirements?), and the end-to-end validation (does the integration work as expected in the customer's environment?). Validation results are recorded and reviewed by the integration team, the customer, and (where applicable) the partner. An integration that has not completed validation is a candidate integration, not a default integration, in keeping with the platform's integration catalogue discipline defined in PRODUCT_BIBLE Section 29.5.

---

## 12. Configuration

### 12.1 Configuration Surface

Ibn Hayan's HL7 and FHIR integration configuration is expressed through the platform's configuration framework, with the configuration layered according to the eight-layer model defined in SYSTEM_ARCHITECTURE Section 15.2. The configuration surface includes the integration's endpoint definitions, the integration's authentication configuration, the integration's profile and terminology configuration, and the integration's reliability configuration. Configuration is validated at write time through the platform's configuration validation framework, with validation rules covering structural, referential, semantic, contextual, and regulatory categories as defined in SYSTEM_ARCHITECTURE Section 15.4.

### 12.2 Endpoint Configuration

Endpoint configuration defines how Ibn Hayan connects to or is connected by an interoperability partner. For outbound integrations, the endpoint configuration includes the partner's base URL, the partner's authentication requirements, and the partner's interaction expectations. For inbound integrations, the endpoint configuration includes the platform's exposed base URL, the platform's authentication requirements, and the platform's interaction support. Endpoint configuration is tenant-scoped, with each tenant's configuration independent of other tenants' configurations, in keeping with the platform's multi-tenant integration commitments defined in SYSTEM_ARCHITECTURE Section 19.5.

### 12.3 Profile and Terminology Configuration

Profile and terminology configuration defines which FHIR profiles and which terminology bindings apply to the integration. The configuration allows a tenant to select the platform's default profile or to apply a tenant-specific profile, subject to the platform's validation rules. Terminology configuration defines which code systems and value sets are active for the integration, including any regional terminologies that substitute for the platform's default terminologies. Profile and terminology configuration is versioned, with each version's changes recorded in the audit trail. Configuration changes that affect patient safety or regulatory compliance are subject to additional approval workflows.

### 12.4 Tenant-Specific Overrides

Ibn Hayan allows tenant-specific overrides of the platform's default HL7 and FHIR configuration, within the bounds defined by the platform's conformance rules. A tenant may, for example, adopt a regional patient identifier format, apply a regional terminology, or activate a regional profile that the platform supports. Tenant-specific overrides do not permit the tenant to bypass the platform's conformance rules: a tenant may not, for example, disable audit, weaken security, or expose resources outside the tenant's scope. Tenant-specific overrides are reviewed during customer onboarding and are subject to periodic review by the Architecture Council.

---

## 13. Monitoring & Alerts

### 13.1 Integration Health Metrics

Ibn Hayan monitors the health of every HL7 and FHIR integration through a defined set of metrics, including the rate of inbound messages, the rate of outbound messages, the rate of successful interactions, the rate of failed interactions, and the rate of rejected interactions. The metrics are exposed through the platform's operational intelligence surface, with dashboards available to the integration team and (in suitable form) to the customer. The metrics are retained for a defined period, with retention governed by the platform's data retention policy. Anomalies in the metrics are flagged for investigation, with significant anomalies triggering alerts as defined in Section 13.3.

### 13.2 Latency and Throughput

Latency and throughput are monitored continuously, with thresholds defined per integration. Latency thresholds cover the time to acknowledge an inbound message, the time to process a message, and the time to deliver an outbound message. Throughput thresholds cover the message rate that the integration is expected to sustain. Latency and throughput anomalies are investigated by the integration team, with the investigation recorded in the platform's incident management system. Where an anomaly reflects a degradation that affects clinical or operational work, the affected customer is notified through the platform's customer notification channel.

### 13.3 Failure Detection

Integration failures are detected through the platform's monitoring infrastructure, with detection rules covering interaction failures, authentication failures, validation failures, and delivery failures. A failure that exceeds a defined threshold triggers an alert, with the alert routed to the integration team. Alerts are triaged by severity, with high-severity alerts (those affecting clinical or operational work) receiving immediate attention. Alert handling is recorded, with the alert's source, the response, and the resolution captured. The alert handling record is itself auditable, in keeping with the platform's audit primitive.

### 13.4 Audit and Compliance Reporting

Audit records generated by HL7 and FHIR integrations are available for compliance reporting, with reports tailored to specific regulatory requirements. The platform's compliance reporting is consistent with the platform's audit architecture defined in SYSTEM_ARCHITECTURE Section 27, with audit records queryable by time range, actor, resource, action, tenant, and composite query. Compliance reports are themselves auditable, with report generation recorded in the audit trail. Where a regulator requires evidence of integration behaviour — including the timing of specific exchanges, the authorisation basis for specific accesses, or the handling of specific failures — the audit trail is the canonical source of evidence.

---

## 14. Related Documents

| Document | Relationship |
|---|---|
| `PRODUCT_BIBLE.md` | Section 29 (Integration Philosophy) defines the product-level commitments that this document elaborates; Section 27 (Security Philosophy) defines the security commitments; Section 25 (Localization Strategy) defines the localization commitments that affect terminology binding |
| `SYSTEM_ARCHITECTURE.md` | Section 19 (Integration Architecture) defines the architectural commitments that this document elaborates; Section 20 (Security Architecture) defines the security commitments; Section 26 (Localization Architecture) defines the localization architecture; Section 27 (Audit Architecture) defines the audit primitive |
| `MODULE_ARCHITECTURE.md` | Defines the module contract that governs how the Patient, Encounter, Orders & Results, Pharmacy, Billing, and Documents bounded contexts expose their data to the Integration Layer |
| `docs/07_MODULES/PATIENTS.md` | Patient module reference; defines the patient identity model that this document's patient cross-referencing section depends on |
| `docs/07_MODULES/NOTIFICATIONS.md` | Notifications module reference; defines the notification dispatch that this document's subscription delivery section depends on |
| `docs/09_SECURITY/AUTHENTICATION.md` | Defines the authentication framework that this document's OAuth2/OIDC section elaborates |
| `docs/09_SECURITY/AUTHORIZATION.md` | Defines the authorization framework that this document's SMART scope section elaborates |
| `docs/09_SECURITY/AUDIT.md` | Defines the audit framework that this document's audit implications section elaborates |
| `docs/08_INTEGRATIONS/DICOM.md` | Sibling integration reference; covers medical imaging exchange, which may complement HL7 and FHIR exchange for radiology workflows |
| `docs/08_INTEGRATIONS/LAB_DEVICES.md` | Sibling integration reference; covers laboratory device exchange, which may complement HL7 and FHIR exchange for laboratory workflows |
| `docs/08_INTEGRATIONS/NATIONAL_HEALTH_SYSTEMS.md` | Sibling integration reference; covers national health system exchange, which frequently uses HL7 and FHIR as the underlying standards |
