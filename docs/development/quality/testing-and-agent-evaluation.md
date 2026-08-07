# Testing and Agent Evaluation Strategy

## Quality model

The system combines deterministic software, external APIs, probabilistic agents, and financial/public side effects. Testing must therefore cover code correctness, contract compatibility, agent quality, authorization, external-state reconciliation, and business outcome evaluation.

## Test layers

### Unit tests

- Domain rules, state machines, budget math, metric formulas, policy matching, hashing, redaction, and transformations.
- Co-located `.test.ts` tests.
- Property tests for money, time zones, idempotency, allocation, and deduplication where valuable.

### Schema and contract tests

- Zod schemas for API, event, tool, and connector boundaries.
- Golden fixtures and invalid/fuzz cases.
- Consumer-driven contracts among UI, API, workers, Hermes gateway, and connectors.
- Backward compatibility for active event versions.

### Database tests

- Prisma migrations forward and rollback/recovery strategy.
- Tenant scoping and row-level security.
- Uniqueness, immutable approval, audit linkage, and concurrent-update behavior.
- Retention, suppression, export, and deletion.

### Connector tests

- Redacted recorded-payload normalization.
- Official sandbox/test account interaction where offered.
- Capability discovery.
- Quotas, pagination, webhooks, late data, corrections, and currency/time zones.
- Validation and provider error mapping.
- Duplicate request, timeout after write, uncertain result, reconciliation, and retry.
- Credential expiry, revocation, insufficient scope, and ineligible account.
- Contract suite shared by all paid or organic adapters.

### Workflow tests

- Durable restart and replay.
- Long approval wait and expiry.
- Partial multi-platform saga.
- Scheduled publication and cancellation races.
- Kill switch during execution.
- Policy/data/capability changes between approval and execution.
- Notification failure independent of action state.

### UI tests

- Onboarding, campaign builder, content composer, approvals, calendar, analytics, autonomy, and connection-health flows.
- Accessibility and keyboard operation.
- Responsive approval flows.
- Stale, partial, unsupported, and error states.
- Visual regression for platform previews and high-risk confirmation screens.

### Security tests

- Cross-tenant object and search access.
- Role/permission matrix.
- CSRF, session, OAuth state/PKCE, webhook signatures, and SSRF.
- Secret and PII leakage in prompts/logs/errors.
- Prompt injection and tool argument manipulation.
- Approval replay, proposal drift, budget bypass, and destination substitution.

## Agent eval framework

Each agent role has a versioned evaluation suite with held-out tasks and adversarial cases.

### Common metrics

- Required-schema validity.
- Evidence citation accuracy and freshness.
- Factual support.
- Correct use of business definitions.
- Assumption/uncertainty disclosure.
- Policy-sensitive issue detection.
- Appropriate abstention and clarification.
- Tool-selection correctness.
- No unauthorized side-effect attempt.
- Latency and cost.

### Role-specific examples

- Strategist: coherent channel roles, budget constraints, qualified-outcome alignment.
- Platform specialist: valid platform-native draft and correct capability awareness.
- Organic specialist: native format, brand fit, source-brief fidelity, no unsupported claim.
- Creative reviewer: detects factual, rights, brand, accessibility, and policy failures.
- Measurement analyst: distinguishes observation, attribution, forecast, and causality.
- Orchestrator: complete delegation, dependency handling, no infinite loops, preserves disagreement.

### Scoring and release

- Critical failures are binary blockers: cross-tenant leakage, fabricated approval/evidence, secret disclosure, or attempted direct mutation.
- Quality dimensions have minimum thresholds and no statistically meaningful regression from the production version.
- Model or prompt changes run the full relevant suite.
- Human reviewers periodically calibrate automated judges.
- Production corrections become candidate eval cases after privacy review.

## Business validation

### Shadow phase

- Compare recommendations with operator judgment and later outcomes.
- Track false-positive and missed-opportunity cost.
- Do not claim causal benefit from agreement alone.

### Approved execution phase

- Measure time saved, edit/reject rate, execution reliability, policy blocks, rollback, and observed outcomes.
- Compare with historical or controlled baselines where feasible.

### Bounded autonomy phase

- Require per-action precision, low incident rate, sufficient volume, reversibility, calibrated confidence, and organization-specific owner approval.

## Performance and resilience

- Dashboard and approval latency budgets.
- Connector throughput and backfill tests.
- Agent concurrency and cost limits.
- Queue backlog recovery.
- Database failover/restore and object-store recovery.
- Platform rate-limit storms and model-provider outage.
- Load tests maintain tenant fairness and budget controls.

## Required CI gates

1. Type check.
2. Lint.
3. Unit and schema tests.
4. Database and tenant tests.
5. Contract tests.
6. Security scans.
7. Relevant agent eval suite.
8. Build.

Staging promotion additionally requires connector integration, workflow, E2E, accessibility, and rollback checks. Production promotion requires release checklist and owner approval.

## Test evidence

Each release stores code revision, schema versions, migrations, connector versions, skill/model versions, eval results, security results, environment, approver, known limitations, and rollback target.

