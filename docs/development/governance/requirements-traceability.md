# Requirements Traceability

## Purpose

Map requirement families to their design authority, implementation modules, and required acceptance evidence. Individual work items must cite the exact requirement IDs they implement.

| Requirement set | Primary design documents | Principal modules | Required acceptance evidence |
|---|---|---|---|
| P-001–P-006 | product requirements; system architecture; security | identity, tenancy, connections | role matrix, tenant isolation, capability/health E2E |
| ONB-001–ONB-014 | personas/journeys; UX; client onboarding form; domain model; pilot onboarding | onboarding, context, knowledge, invitation, uploads | nontechnical onboarding test, save/resume, upload/security, version/correction audit, metric confirmation |
| PAID-001–PAID-014 | paid advertising; platform integration; API/contracts | campaign, paid adapters, execution | seven connector readiness reports, multi-select/partial saga E2E, reconciliation |
| ORG-001–ORG-011 | organic publishing; creative pipeline; platform integration | content, calendar, publisher adapters | seven channel readiness reports, schedule/cancel/failure/duplicate E2E |
| AGT-001–AGT-010 | Hermes architecture; API/tool contracts; testing/evals | Hermes gateway, agent profiles, skills, tools | role eval suites, prompt-injection tests, no direct mutation/secret evidence |
| APR-001–APR-010 | UX; system architecture; security/autonomy | proposals, policy, approvals, execution | immutable approval, drift/replay/budget tests, kill-switch exercise |
| DAT-001–DAT-008 | domain model; measurement; platform integration | ingestion, metrics, data quality, attribution | reconciliation report, metric tests, lineage and stale-data block |
| EXP-001–EXP-007 | opportunity policy; measurement; domain model | opportunities, experiments | end-to-end experiment, rejected-mechanism block, evidence promotion audit |
| UX-001–UX-009 | personas/journeys; UX; client onboarding form | web experience, notifications, onboarding form | journey usability, WCAG 2.2 AA, mobile approval and onboarding tests |
| OPS-001–OPS-005 | deployment; observability; testing | workflows, telemetry, backup/DR | restart/replay, SLO dashboards, restore and incident exercises |
| SEC-001–SEC-008 | security/privacy/compliance; platform integration | authz, secrets, audit, privacy | threat model, secrets/PII, tenant, audit, export/delete/suppression tests |

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

## MVP evidence index

The release manager must assemble links to:

- pilot business and metric approval;
- platform capability matrix;
- seven paid readiness reports;
- seven organic readiness reports;
- data reconciliation and quality report;
- agent evaluation report;
- authorization and tenant test report;
- approval/execution audit reconstruction;
- security review and threat model;
- accessibility/usability results;
- backup/restore and incident exercises;
- known limitations and accepted risks.
