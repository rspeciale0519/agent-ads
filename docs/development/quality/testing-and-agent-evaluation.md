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
- Consumer-driven contracts among UI, API, jobs, the AI gateway/runtime, and connectors.
- Backward compatibility for active event versions.

### Database tests

- Prisma forward migrations, compatible application rollback, and restored-state recovery.
- Tenant scoping and row-level security.
- Uniqueness, immutable approval, audit linkage, and concurrent-update behavior.
- Retention, suppression, export, and deletion.

### Foundation Gate F0 tests

- Validate the Prisma schema.
- Apply every migration to a fresh disposable database.
- Compare Prisma native types with PostgreSQL catalog types.
- Verify every foreign-key type, target, constraint, and supporting index.
- Verify migration order, checksums, and live target heads.
- Test missing tenant context and cross-tenant access.
- Verify enabled and forced RLS on every protected table.
- Verify runtime and broker roles have only approved privileges.
- Test the database target fingerprint and disposable-target guard.

### Recovery Gate F1 tests

- Verify separate local, preview, staging, and pilot resources.
- Restore the complete database, Storage, Vault, role, configuration, scheduler, flag, artifact, and migration recovery set.
- Prove the approved recovery-point and recovery-time targets.
- Revalidate target fingerprints, migrations, RLS, roles, pooling, and secret access after restore.

### Connector tests

- Redacted recorded-payload normalization.
- Official sandbox/test account interaction where offered.
- Capability discovery.
- Quotas, pagination, webhooks, late data, corrections, and currency/time zones.
- Validation and provider error mapping.
- Duplicate request, timeout after write, uncertain result, reconciliation, and retry.
- Credential expiry, revocation, insufficient scope, and ineligible account.
- Contract suite shared by adapters of the same capability class.

### Pilot connector tests

- Website/CMS reads treat every page and file as untrusted.
- GA4, Search Console, Google Ads, Meta Ads, and selected CRM use read-only scopes first.
- Stale data, revoked access, partial data, quota errors, corrections, and reconciliation stay visible.
- Calendar and email tests run only when the Pilot Scope Record enables them.
- No read-only release process can obtain a mutation principal.

### Workflow tests

- Durable restart and replay.
- Long approval wait and expiry.
- Partial AI Reach observation run.
- CMS draft, lead follow-up, and campaign pause/resume races.
- Kill switch during execution.
- Policy/data/capability changes between approval and execution.
- Notification failure independent of action state.

### Pilot cloud and cost-control tests

- Pooled-tenant isolation, fair-use quotas, and noisy-neighbor load behavior.
- Usage-event idempotency, provider-cost reconciliation, corrections, and cost-limit enforcement.
- Offboarding export, role/credential revocation, connector deregistration, and retention/deletion behavior.

### Expansion cloud and billing tests

- Repeatable dedicated provisioning in operator-owned and client-owned AWS accounts.
- Dedicated database, storage, key, secret, worker, and identity isolation.
- Allowance, overage, price-version, correction, and invoice reconciliation.
- Hybrid enrollment, outbound networking, signed updates, buffering, expiry, revocation, remote disablement, and cloud-authority enforcement.

### UI tests

- AI Reach onboarding, chat, outcome dashboard, Work, Decisions, Connections, and Settings.
- Accessibility and keyboard operation.
- Responsive approval flows.
- Stale, partial, unsupported, and error states.
- Visual regression for outcome cards, evidence, and high-risk confirmation screens.
- Loading, cancel, retry, interruption, partial-result, and support-handoff states.

### Security tests

- Cross-tenant object and search access.
- Role/permission matrix.
- CSRF, session, OAuth state/PKCE, webhook signatures, and SSRF.
- Secret and PII leakage in prompts/logs/errors.
- Prompt injection and tool argument manipulation.
- Approval replay, proposal drift, budget bypass, and destination substitution.

### Supervised mutation tests

- Current AAL2 and active-session binding.
- Action-bound grant, proposal hash, cap, destination, expiry, and drift invalidation.
- Consent and suppression denial for lead follow-up.
- Idempotency, unknown result, and reconciliation before retry.
- Global, provider, organization, and action kill switches.
- Campaign pause and resume rollback through one approved provider and account.

### AI Reach tests

- Crawler-control, sitemap, canonical, indexing, and structured-data classification.
- Question-set versioning and repeated sample provenance.
- Citation extraction, canonical URL handling, factual accuracy, and approved business truth.
- Referral and CRM outcome lineage.
- Partial, stale, missing, conflicting, and corrected evidence.
- Exactly three useful recommendations in each formal briefing.
- Rejection of ranking, citation, recommendation, traffic, revenue, or causal guarantees.
- Answer presence is not a deterministic release assertion.

## Agent eval framework

The pilot supervisor has a versioned evaluation suite with held-out tasks and adversarial cases.

Later specialist roles need separate suites before activation.

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
- AI Reach supervisor: correct evidence classes, factual limits, exactly three actions, useful abstention, and no false promise.

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

### Bounded autonomy phase — expansion

- Require per-action precision, low incident rate, sufficient volume, reversibility, calibrated confidence, and organization-specific owner approval.

## Performance and resilience

- AI Reach chat, outcome dashboard, and approval latency budgets.
- Connector throughput and backfill tests.
- Agent concurrency and cost limits.
- Queue backlog recovery.
- Database failover/restore and object-store recovery.
- Platform rate-limit storms and model-provider outage.
- Load tests maintain tenant fairness and budget controls.

## Required CI gates

The required pull-request gates are:

1. Prisma validation.
2. Type check.
3. Lint.
4. Unit and contract tests.
5. Fresh migration and tenant tests.
6. RLS and mutation audits.
7. Security scan.
8. Production dependency audit.
9. Relevant supervisor evaluation suite.
10. Build.

The GitHub workflow now configures Prisma validation and generation, type-check, lint, tests, security and dependency audits, dirty-target guard tests, a disposable migration proof, and build.

The guard job rejects a wrong marker, unsafe URL overrides, dirty database metadata, dirty `template1`, casts, roles, schemas, relations, routines, types, publications, foreign-data wrappers, large objects, and role settings. It also checks database, public-schema, default, and parameter privileges. [GitHub run 33204340209](https://github.com/rspeciale0519/agent-ads/actions/runs/33204340209) passed `validate`, `guard-proof`, and `schema-proof` at commit `bff8b60f69ae3e0c58279ebb87f8be3f58457b7f` on 2026-08-28. Remote validation must pass again for each later pull-request commit.

Target inventory, complete tenant tests, and target schema evidence remain Gate F0 requirements. Recovery tests remain Gate F1 requirements.

Staging adds target Gate F0, recovery Gate F1, connector, browser, accessibility, and canary checks. Pilot promotion needs supervisor evaluation, the release checklist, and owner approval.

## Test evidence

Each release stores code revision, schema versions, migrations, connector versions, skill/model versions, eval results, security results, environment, approver, known limitations, and rollback target.
