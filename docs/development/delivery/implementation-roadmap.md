# Implementation Roadmap

## Delivery rule

All seven paid and all seven organic platform capabilities are required for MVP release. The phases below are an internal build sequence, not a plan to launch with only some platforms. A connector may be developed earlier than another, but the product does not declare MVP completion until every committed connector passes its readiness gate or truthfully shows an account/API eligibility block.

## Workstreams

1. Product shell and client experience.
2. Identity, tenancy, security, and governance.
3. Business context, knowledge, and onboarding.
4. Data ingestion, canonical metrics, and attribution.
5. Paid connector framework and seven adapters.
6. Organic publisher framework and seven adapters.
7. Creative and asset pipeline.
8. Hermes gateway, agents, skills, and evals.
9. Proposals, approvals, policy, and execution.
10. Experiments, reporting, observability, and operations.

Workstreams run in parallel after the shared contracts stabilize.

## Phase 0: Pilot and platform-access discovery

### Deliverables

- [x] Client-facing pilot onboarding form prototype with guided six-step intake, responsive presentation, and review/send flow.
- [x] Server-backed onboarding submission path with Supabase persistence, private business-file uploads (including Excel/CSV exports), Resend notification wiring, and GitHub Actions validation.
- [x] Onboarding question schema and intake requirements documented for the pilot.
- [ ] Completed pilot onboarding packet.
- [ ] Account and developer-access inventory for every committed platform.
- [ ] CRM, analytics, commerce/revenue, and asset-source inventory.
- [ ] Current official API capability and policy assessment.
- [ ] Metric and qualified-outcome workshop.
- [ ] Initial legal/platform/data decision owners.
- [ ] Cloud, identity, notification, and publishing-route decisions.

### Exit criteria

- Pilot business profile and metric contract approved.
- Unknown API eligibility is visible in the platform-access matrix.
- No dependency is represented as guaranteed without evidence.

## Phase 1: Engineering foundation

### Deliverables

- TypeScript/Next.js workspace with strict mode and module boundaries.
- PostgreSQL/Prisma, object storage, Temporal, OpenTelemetry, identity, secrets, and CI/CD foundations.
- Organization/membership/role model.
- Audit event framework.
- Zod contract packages for API, events, tools, and connectors.
- Feature and kill-switch framework.

### Exit criteria

- Tenant isolation, authorization, audit, schema, migration, and deployment tests pass.
- Development, staging, and pilot environments are isolated and reproducible.

## Phase 2: Onboarding and business context

### Deliverables

- Guided onboarding wizard.
- Business, brand, offer, audience, claim, goal, and policy records.
- Document/website ingestion with untrusted-content handling.
- Proposed Business and Marketing Profile with confirmation/corrections.
- Knowledge workspace and version history.

### Exit criteria

- A nontechnical pilot user completes onboarding.
- Material inferred assumptions require confirmation.
- Corrections persist, supersede prior context, and remain auditable.

## Phase 3: Data and measurement foundation

### Deliverables

- Raw payload/object-storage pattern.
- Canonical campaign, content, creative, metric, conversion, and outcome entities.
- CRM/commerce/analytics connector selected for the pilot.
- Metric-definition service and data-quality assessments.
- Attribution views and evidence lineage.
- Daily/weekly report contracts.

### Exit criteria

- Pilot spend and outcomes reconcile within approved tolerances.
- Metric definitions and freshness blockers are approved and tested.
- Aggregates trace back to observations and definitions.

## Phase 4: Connector frameworks

### Deliverables

- Capability registry.
- Paid connector interface and contract test suite.
- Organic connector/publishing-route interface and contract suite.
- OAuth/API-key lifecycle, account discovery, scopes, health, webhook, rate-limit, error, and reconciliation components.
- Mock connector and recorded-payload harness.

### Exit criteria

- A reference paid and organic test connector pass the shared contract suite.
- Unknown-result, duplicate, revocation, quota, and capability-change tests pass.

## Phase 5: All paid adapters

Implement and verify in parallel:

- Meta Ads.
- Google Ads.
- Microsoft Advertising.
- LinkedIn Ads.
- TikTok Ads.
- Reddit Ads.
- X Ads.

### Per-adapter deliverables

- Authorization and account discovery.
- Capability/eligibility snapshot.
- Incremental read synchronization and normalization.
- Offline campaign draft schema and validation.
- Approved create/pause/resume/supported-edit executor.
- Reconciliation, error normalization, and user remediation.
- Sandbox/test evidence and current official documentation record.

### Exit criteria

- Every eligible test account completes the paid connector readiness gate.
- Ineligible or unavailable capabilities are correctly displayed and blocked.
- Multiplatform partial-launch saga passes E2E tests.

## Phase 6: All organic adapters and content workspace

Implement and verify:

- LinkedIn.
- X.
- Instagram.
- TikTok.
- Facebook.
- YouTube.
- Reddit.

### Deliverables

- Source briefs, channel variants, previews, approvals, editorial calendar, scheduling, delivery, receipts, and analytics.
- Native and authorized-provider route selection.
- Asset technical validation and duplicate protection.
- Per-channel limitations and remediation.

### Exit criteria

- Every eligible test account completes the organic readiness gate.
- Scheduled, canceled, failed, rejected, and uncertain publication paths pass.
- Public content cannot bypass approval or kill switches.

## Phase 7: Creative and experiment system

### Deliverables

- Research package, concept, asset, variant, provenance, rights, and review workflows.
- Multimodal asset providers behind adapters.
- Platform-native preview and validation.
- Opportunity registry and assessment workflow.
- Experiment design, assignment, monitoring, analysis, and promotion records.
- Paid-organic learning linkage.

### Exit criteria

- Every asset and claim is traceable.
- An experiment can run from hypothesis through approved conclusion.
- Illegal/prohibited mechanisms are blocked without erasing the underlying objective.

## Phase 8: Hermes marketing team

### Deliverables

- Isolated Hermes gateway.
- Chief orchestrator and specialist profiles.
- Versioned skills, task/output schemas, memory policy, model routing, cost limits, and schedules.
- Read, analysis, artifact, and proposal tools.
- Golden and adversarial eval suites.
- Conversational “Ask Your Marketing Team” interface.

### Exit criteria

- Every role meets eval thresholds.
- No agent has a direct production mutation tool or raw secret.
- Cross-tenant, prompt-injection, fabricated-evidence, and unauthorized-action tests pass.

## Phase 9: Proposals, approvals, policy, and bounded execution

### Deliverables

- Immutable proposals and evidence snapshots.
- Policy engine, risk classes, legal/platform/data gates.
- Approval inbox, step-up authentication, expiry, drift invalidation, and notifications.
- Paid and organic executors with idempotency and reconciliation.
- Global, connector, organization, and action kill switches.
- Rollback/compensation proposals.

### Exit criteria

- Audit reconstruction explains every tested mutation.
- Stale approval, destination substitution, budget bypass, and replay tests fail safely.
- Policy outage and audit outage fail closed.

## Phase 10: Command center, reporting, and operational hardening

### Deliverables

- Home command center and data-health views.
- Campaign, content, analytics, opportunity, agent, connection, and settings workspaces.
- Daily and weekly reports.
- SLO dashboards, alerting, runbooks, backups, restore, and disaster recovery tests.
- Accessibility, performance, security, and load testing.

### Exit criteria

- WCAG 2.2 AA checks pass for core flows.
- Pilot SLOs and incident exercises pass.
- Nontechnical pilot users can complete onboarding, campaign, content, approval, and reporting journeys.

## Phase 11: Pilot operation and MVP release

### Pilot stages

1. Read-only data validation.
2. Shadow recommendations.
3. Human-approved organic publishing.
4. Human-approved paid execution.
5. Controlled experiments.
6. Selected bounded reversible actions after evidence.

### MVP release gate

- All committed platform connector readiness gates pass or accurately expose account/API eligibility blocks.
- Pilot measurement contract and data quality pass.
- Critical agent, security, tenant, approval, execution, and incident tests pass.
- No unresolved critical/high vulnerability.
- Support, monitoring, backup, restore, and rollback ownership established.
- Known limitations and open risks accepted by the product owner.

## Post-MVP candidates

- Pinterest, Snapchat, and Amazon Ads connectors.
- Additional CRM/commerce/data providers.
- Agency portfolio and white-label capabilities.
- Advanced incrementality and media-mix modeling.
- Additional languages and regions.
- Carefully evaluated autonomous action classes.
