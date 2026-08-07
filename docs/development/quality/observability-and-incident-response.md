# Observability and Incident Response

## Objectives

Operators must be able to answer:

- What is the system doing now?
- Which organization, workflow, agent, connector, and external account are involved?
- What evidence and policy authorized a change?
- Did the external platform actually reach the intended state?
- Is data sufficiently fresh and complete for decisions?
- What is the customer and financial impact?

## Correlation model

Every request and background action propagates:

- request ID;
- correlation/workflow ID;
- organization ID in protected telemetry fields;
- actor type/ID;
- agent run/task ID when applicable;
- proposal/approval/execution ID;
- connector and platform account reference;
- external request ID where available.

Never place secrets, access tokens, raw personal data, or unrestricted content in telemetry.

## Metrics

### Product

- onboarding completion;
- connected/healthy accounts;
- campaign/content completion funnels;
- approval latency and outcomes;
- active experiments;
- user corrections and recommendation usefulness.

### Agent

- run success, schema validity, latency, tokens, cost, tool calls;
- abstention/clarification rate;
- evaluation scores by profile/skill/model;
- proposal acceptance, edit, rejection, and incident linkage.

### Connectors

- sync freshness, duration, rows/resources, errors, quota/rate-limit state;
- credential/capability health;
- write success, rejection, uncertain result, retry, and reconciliation latency;
- webhook validation and lag.

### Workflows

- queued/running/waiting/failed counts;
- age and retry count;
- approval wait and expiry;
- scheduled publication delay;
- partial saga and compensation status.

### Business guardrails

- spend and pacing threshold breach;
- qualified-outcome degradation;
- tracking/data-quality block;
- unexpected external change;
- platform warning or enforcement.

## Logs and traces

- Structured logs with stable event names and safe reason codes.
- Distributed traces across UI/API, workflow, Hermes gateway, tool, connector, and reconciliation.
- Agent inputs/outputs stored as access-controlled artifacts, not general logs.
- Provider raw requests/responses stored encrypted with redaction and restricted access.
- Sampling must never omit mutation, approval, policy, or security audit spans.

## Service-level objectives

Initial pilot targets:

- Approval and read-only control-plane availability: 99.9% monthly.
- Acknowledged mutation has durable audit/proposal linkage: 100%.
- Scheduled organic publication starts within five minutes of target for healthy providers, excluding documented provider delays.
- Critical connector freshness meets each metric's policy threshold at least 99% of measured periods.
- High-risk incident detection/notification within five minutes.

Provider outages are reported separately but still require graceful product behavior.

## Alert routing

### Critical

- suspected cross-tenant access;
- unauthorized or unapproved mutation;
- secret exposure;
- uncontrolled spend or repeated duplicate execution;
- audit integrity failure.

### High

- uncertain high-impact external state;
- platform enforcement warning;
- widespread connector failure;
- policy service unavailable;
- critical data corruption/freshness block.

### Medium

- single-account sync failure;
- publication rejection;
- approval/workflow backlog;
- agent quality/cost regression.

### Low/batched

- routine capability changes;
- nearing credential expiry;
- noncritical content validation issues.

## Incident response lifecycle

1. Detect and create incident.
2. Classify severity, tenants, platforms, and financial/public exposure.
3. Contain using global, tenant, connector, action, agent, or publishing kill switch.
4. Preserve audit, platform, workflow, and telemetry evidence.
5. Reconcile external state before attempting repair.
6. Communicate status to affected users and operators.
7. Recover through verified actions and monitoring.
8. Complete root-cause analysis and corrective actions.
9. Add regression tests, agent evals, policy updates, and runbook changes.

## Required runbooks

- Unapproved or unexpected platform change.
- Duplicate campaign, spend change, or publication.
- Platform write timed out with unknown result.
- Credential compromise or revocation.
- Cross-tenant access suspicion.
- Spend guardrail breach.
- Platform warning, suspension, or policy rejection.
- Stale/corrupt metrics used in a recommendation.
- Prompt injection or compromised skill.
- Model/provider outage or quality regression.
- Workflow/queue backlog.
- Database or object-store recovery.

## Post-incident requirements

Material incidents produce a timeline, impact, affected records, authorization path, root cause, detection gap, containment/recovery actions, user communication, corrective owners/dates, and evidence that recurrence tests pass. Incidents involving agent behavior feed the appropriate eval suite after privacy review.

