# Requirements Traceability

## Purpose

Map requirement families to their design authority, implementation modules, and required acceptance evidence. Individual work items must cite the exact requirement IDs they implement.

| Requirement set | Primary design documents | Principal modules | Required acceptance evidence |
|---|---|---|---|
| P-001–P-009 | product requirements; system architecture; cloud hosting/service delivery; security | identity, tenancy, connections, pilot scope, usage; conditional agency, billing, and deployment profiles | role matrix, tenant isolation, approved Pilot Scope Record, usage records; enabled-profile evidence only |
| ONB-001–ONB-016 | personas/journeys; UX; client onboarding form; domain model; pilot onboarding; Phase 0 readiness workbook; cloud hosting/service delivery | onboarding, context, knowledge, invitation, uploads, pooled provisioning; conditional profiles | nontechnical onboarding, save/resume, upload/security, version/correction audit, metric confirmation; enabled-profile evidence only |
| PAID-001–PAID-014 | paid advertising; platform capability matrix; platform integration; API/contracts | paid reads, recommendations, supervised pause/resume | Google and Meta read reports; selected pause/resume gate; reconciliation |
| ORG-001–ORG-011 | organic publishing; platform capability matrix; creative pipeline; platform integration | content, calendar, publisher adapters | expansion evidence only; not a pilot gate |
| AIR-001–AIR-015 | AI Reach; UX; measurement; domain model; API/tool contracts | conversations, briefings, website evidence, observations, assessments, website drafts | source provenance, sampling, factual accuracy, no-promise, exactly-three, tenant, and prompt-injection tests |
| AGT-001–AGT-010 | agent gateway boundary; Hermes expansion architecture; API/tool contracts; testing/evals | AI gateway, supervisor, later Hermes profiles, tools | supervisor eval suite, gateway containment, prompt-injection, no direct mutation/secret evidence |
| APR-001–APR-012 | UX; system architecture; security/autonomy | proposals, policy, approvals, execution | immutable approval, AAL2, destination, drift, replay, uncertainty, and kill-switch tests |
| DAT-001–DAT-012 | domain model; measurement; platform integration | ingestion, metrics, data quality, CRM outcomes, attribution | outcome reconciliation, booked-revenue rules, metric tests, lineage, stale-data block |
| EXP-001–EXP-007 | opportunity policy; measurement; domain model | opportunities, experiments | end-to-end experiment, rejected-mechanism block, evidence promotion audit |
| UX-001–UX-009 | personas/journeys; UX; client onboarding form | web experience, notifications, onboarding form | journey usability, WCAG 2.2 AA, mobile approval and onboarding tests |
| OPS-001–OPS-011 | deployment; cloud hosting/service delivery; observability; testing | jobs, telemetry, pooled deployment, usage, backup/DR; conditional profiles | restart/replay, SLO dashboards, restore, environment isolation, usage reconciliation, offboarding; enabled-profile evidence only |
| SEC-001–SEC-012 | security/privacy/compliance; cloud hosting/service delivery; platform integration | authz, secrets, audit, privacy, pooled isolation; conditional dedicated and edge controls | threat model, secrets/PII, pooled isolation, audit, export/delete/suppression; enabled-profile evidence only |

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

| Evidence ID | Required evidence | Current state | Release gate |
|---|---|---|---|
| PIL-SCP-001 | approved sales-trainer Pilot Scope Record | missing | P0 |
| FND-DB-001 | UUID type repair and valid tenant foreign key | local candidate SQL and upgrade proof passed; Prisma CI and shared target unverified | F0 |
| FND-TGT-001 | target fingerprint and migration inventory | unverified | F0 |
| FND-RLS-001 | target forced-RLS and low-privilege role proof | catalog checks passed locally; low-privilege CI and target proof unverified | F0 |
| FND-CI-001 | required validation and disposable schema workflow | configured; successful remote run unverified | F0 |
| REC-BKP-001 | complete recovery set and restore drill | unverified | F1 |
| REC-FWD-001 | forward recovery and compatible application rollback plan | documented; not executed | F1 |
| PIL-CONN-001 | read-only proof for approved pilot sources | local provider contracts and Google Ads SearchStream read method; tenant service, persistence, and live source proof missing | P1 |
| AIR-EVD-001 | AI Reach metric definitions, source classes, and limits | local evidence contract and read-only UI implemented; source-backed evidence workflow missing | P2 |
| AIR-SMP-001 | question-set, sample provenance, citation, and referral lineage | documented with synthetic tests; approved observation collection and lineage persistence missing | P2 |
| APR-PIL-001 | AAL2, active session, action-bound approval, expiry, and destination | local historical evidence only | P3 |
| PIL-MUT-001 | CMS draft, lead follow-up, and one ad pause/resume reconciliation | blocked | P3 |
| DEP-PIL-001 | same immutable artifact promoted through staging | unverified | P4 |
| PIL-EXIT-001 | outcome, incident, recovery, support, and user evidence | blocked | P4 |
| EXP-ALL-001 | later connector and channel expansion | backlog | E1 |

Each accepted evidence item records requirement ID, owner, implementation, test, environment, Git revision, status, and release gate.

## Pilot evidence index

The release manager must assemble links to:

- pilot business and metric approval;
- approved Pilot Scope Record and pilot capability matrix;
- foundation type-repair, fresh-migration, forced-RLS, and target-fingerprint evidence;
- website/CMS, GA4, Search Console, Google Ads, Meta Ads, and selected CRM read reports;
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
