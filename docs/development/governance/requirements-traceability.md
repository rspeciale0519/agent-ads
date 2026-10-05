# Requirements Traceability

## Purpose

Map requirement families to their design authority, implementation modules, and required acceptance evidence. Individual work items must cite the exact requirement IDs they implement.

| Requirement set | Primary design documents | Principal modules | Required acceptance evidence |
|---|---|---|---|
| P-001–P-009 | product requirements; system architecture; cloud hosting/service delivery; security | identity, tenancy, connections, pilot scope, usage; conditional agency, billing, and deployment profiles | role matrix, tenant isolation, approved Pilot Scope Record, usage records; enabled-profile evidence only |
| ONB-001–ONB-016 | personas/journeys; UX; client onboarding form; domain model; pilot onboarding; Phase 0 readiness workbook; cloud hosting/service delivery | onboarding, context, knowledge, invitation, uploads, pooled provisioning; conditional profiles | nontechnical onboarding, save/resume, upload/security, version/correction audit, metric confirmation; enabled-profile evidence only |
| PAID-001–PAID-014 | paid advertising; platform capability matrix; platform integration; API/contracts | paid reads, recommendations, supervised pause/resume | earlier D-032 scope: Google and/or Meta read reports (Google campaign report implemented locally; Meta reporting not implemented); under D-043 the selected channel's report; selected pause/resume gate; reconciliation |
| ONB-017–ONB-020 (accepted, D-043) | product requirements; domain model; UX | business memory, correction flow, examples, onboarding defaults | confirmed and inferred facts distinct; correction persists into a later task; conflicts create a review task |
| PAID-015–PAID-020 (accepted, D-044, D-045) | paid advertising; platform integration; API contracts | campaign package, preview, paused creation, verification, activation, quota-aware reads | campaign package readiness gate; activation revalidation; read synchronization freshness tests |
| AGT-011–AGT-012 (accepted, D-046) | agent orchestration; cloud hosting; testing | runtime prototype, application-owned records | recorded runtime and provider combinations; records survive a runtime change |
| APR-013–APR-016 (accepted, D-044, D-048) | UX; security/autonomy; API contracts | decision inbox, bound creation and activation, autonomy levels | inbox shows preview, destination, cost, effect, uncertainty, recovery limits; one approval binds both steps only when verification passes; L1 default; no universal numeric floor |
| DAT-013–DAT-014 (accepted, D-043, D-045) | measurement; AI Reach; capability matrix | approved CSV outcome source, capability-based required sources | snapshot imports invent no transitions; CSV limits and age visible; a source is required only for an enabled decision |
| ORG-001–ORG-011 | organic publishing; platform capability matrix; creative pipeline; platform integration | content, calendar, publisher adapters | expansion evidence only; not a pilot gate |
| AIR-001–AIR-015 | AI Reach; UX; measurement; domain model; API/tool contracts | conversations, briefings, website evidence, observations, assessments, website drafts | source provenance, sampling, factual accuracy, no-promise, ranking and quiet-state (at most three; D-043), tenant, and prompt-injection tests |
| AGT-001–AGT-010 | agent gateway boundary; Hermes expansion architecture; API/tool contracts; testing/evals | AI gateway, supervisor, later Hermes profiles, tools | supervisor eval suite, gateway containment, prompt-injection, no direct mutation/secret evidence |
| APR-001–APR-012 | UX; system architecture; security/autonomy | proposals, policy, approvals, execution | immutable approval, AAL2, destination, drift, replay, uncertainty, and kill-switch tests |
| DAT-001–DAT-012 | domain model; measurement; platform integration | ingestion, metrics, data quality, CRM outcomes, attribution | outcome reconciliation, booked-revenue rules, metric tests, lineage, stale-data block |
| EXP-001–EXP-007 | opportunity policy; measurement; domain model | opportunities, experiments | end-to-end experiment, rejected-mechanism block, evidence promotion audit |
| UX-001–UX-009 | personas/journeys; UX; client onboarding form | web experience, notifications, onboarding form | journey usability, WCAG 2.2 AA, mobile approval and onboarding tests |
| OPS-001–OPS-011 | deployment; cloud hosting/service delivery; observability; testing | jobs, telemetry, pooled deployment, usage, backup/DR; conditional profiles | restart/replay, SLO dashboards, restore, environment isolation, usage reconciliation, offboarding; enabled-profile evidence only |
| SEC-001–SEC-012 | security/privacy/compliance; cloud hosting/service delivery; platform integration | authz, secrets, audit, privacy, pooled isolation; conditional dedicated and edge controls | threat model, secrets/PII, pooled isolation, audit, export/delete/suppression; enabled-profile evidence only |
| DIR-001–DIR-010 (accepted, D-043) | agent orchestration; UX; AI Reach; product brief | Director profile, task contracts, specialist profiles, business memory, decision inbox | Director eval suite, quiet-state and ranking tests, task-contract validation, business-memory correction persistence; accepted design, not implemented |
| ACT-001–ACT-012 (accepted, D-044) | paid advertising; system architecture write path; security/autonomy; API contracts | campaign package, action definitions, approval binding, budget reservation, activation revalidation, conditional executors | campaign package readiness gate; per-action gates; concurrency, drift, uncertain-result, and audit-reconstruction tests; accepted design (D-044, 2026-10-04), not implemented; each action gated separately |
| LRN-001–LRN-012 (accepted, D-047) | measurement; testing/evals; agent orchestration | predictions, learning record, creative history, evaluation library, promotion controls, restoration | prediction-before-approval tests; held-out evaluations; one controlled learning cycle; harmful-candidate rejection; rollback; tenant isolation of learning data |

## Cross-cutting definition of done

Every implementation item must provide:

- requirement IDs;
- user journey and permission context;
- domain entities and state transitions;
- API/event/tool schema version;
- tenant and secret boundary;
- failure, retry, and reconciliation behavior;
- logs, metrics, traces, and audit events;
- unit, contract, integration, security, and applicable agent eval tests;
- feature flag and rollout plan;
- rollback or compensation plan;
- updated permanent documentation.

## Pilot gate evidence

Scope note: under the earlier D-032 and D-037 scope, every row below applies as written. Under the D-043 and D-044 workflow (accepted 2026-10-04), source, AI-answer sampling, CMS draft, and lead follow-up evidence (PIL-CONN-001, AIR-SMP-001, and the CMS and follow-up parts of PIL-MUT-001) applies only when the Pilot Scope Record enables that source, capability, or action. Each evidence status below is unchanged by that note. Foundation (F0, F1), recovery, authorization, approval, security, observation, and operational evidence remains mandatory in both scopes.

| Evidence ID | Required evidence | Current state | Release gate |
|---|---|---|---|
| PIL-SCP-001 | approved sales-trainer Pilot Scope Record | missing | P0 |
| FND-DB-001 | UUID type repair and valid tenant foreign key | local candidate SQL and upgrade proof passed; Prisma CI and shared target unverified | F0 |
| FND-TGT-001 | target fingerprint and migration inventory | unverified | F0 |
| FND-RLS-001 | target forced-RLS and low-privilege role proof | catalog checks passed locally; low-privilege CI and target proof unverified | F0 |
| FND-CI-001 | required validation and disposable schema workflow | configured; successful remote run unverified | F0 |
| REC-BKP-001 | complete recovery set and restore drill | unverified | F1 |
| REC-FWD-001 | forward recovery and compatible application rollback plan | documented; not executed | F1 |
| PIL-CONN-001 | read-only proof for approved pilot sources | local provider contracts, tenant authorization service, Google Ads report API, and strict Dubsado approved-export parser/status map; persistence, reconciliation, and live source proof missing | P1 |
| AIR-EVD-001 | AI Reach metric definitions, source classes, and limits | local evidence contract, guarded cross-source combiner, Google Ads metric bundle, Dubsado outcome bridge, and read-only UI implemented; persisted source-backed workflow missing | P2 |
| AIR-SMP-001 | question-set, sample provenance, citation, and referral lineage (required under the earlier D-032 and D-037 scope; under D-043 only when AI-answer sampling is enabled in the Pilot Scope Record) | documented with synthetic tests; approved observation collection and lineage persistence missing | P2 |
| APR-PIL-001 | AAL2, active session, action-bound approval, expiry, and destination | local historical evidence only | P3 |
| PIL-MUT-001 | CMS draft, lead follow-up, and one ad pause/resume reconciliation | blocked | P3 |
| DEP-PIL-001 | same immutable artifact promoted through staging | unverified | P4 |
| PIL-EXIT-001 | outcome, incident, recovery, support, and user evidence | blocked | P4 |
| EXP-ALL-001 | later connector and channel expansion | backlog | E1 |
| DIR-MEM-001 | business memory with confirmed and inferred facts; owner correction persists into a later task | not started (accepted design, not implemented) | milestone B |
| DIR-BRF-001 | Director briefing with ranked decisions or explicit quiet state; evidence links; predictions | not started (accepted design, not implemented; rule-based briefing exists) | milestone C / P2 |
| RT-SEL-001 | runtime prototype decision with recorded runtime and provider combinations | not started | milestone B |
| ACT-PKG-001 | campaign package created paused, verified, activated, monitored, and reconciled on the first channel | not started (D-044 accepted 2026-10-04; implementation and gates pending) | milestone C / P3 |
| ACT-RSV-001 | budget reservation under concurrent proposals; dispatch recorded locally before the provider request; local atomic dispatched-to-committed update after provider reconciliation; exposure kept until reconciliation; uncertain-result reconciliation; kill switch stops dispatch and in-flight result is reconciled | not started (D-044 accepted 2026-10-04; implementation and gates pending) | milestone C / P3 |
| LRN-CYC-001 | one controlled learning cycle; harmful candidate rejected; promoted version restored | not started | milestone D / P4 |
| COM-PKG-001 | one billing package, usage ledger reconciliation, cancellation, export, offboarding | not started | milestone E / commercial gate |
| PIL-REP-001 | repeatability across three to five similar customers for about 30 days | not started | milestone E |

Each accepted evidence item records requirement ID, owner, implementation, test, environment, Git revision, status, and release gate.

## Pilot evidence index

The release manager must assemble links to the items below. Under D-043 and D-044, source, sampling, CMS draft, and follow-up items apply only when the Pilot Scope Record enables them; all other items are mandatory in both scopes.

- pilot business and metric approval;
- approved Pilot Scope Record and pilot capability matrix;
- foundation type-repair, fresh-migration, forced-RLS, and target-fingerprint evidence;
- read reports for the sources named in the Pilot Scope Record (earlier D-032 scope: website/CMS, GA4, Search Console, Google Ads and/or Meta Ads, and selected CRM);
- AI Reach observation, factual, sample, referral, and no-promise evidence;
- data reconciliation and quality report;
- agent evaluation report;
- authorization and tenant test report;
- approval/execution audit reconstruction;
- security review and threat model;
- accessibility/usability results;
- backup/restore and incident exercises;
- pooled pilot provisioning, environment isolation, usage reconciliation, and conditional connector evidence;
- known limitations and accepted risks.
