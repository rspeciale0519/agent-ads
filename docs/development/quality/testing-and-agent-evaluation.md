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

### Supervised acquisition workflow tests (D-044, accepted)

- Package validation against current account capability.
- Exact-package approval binding; edited package or changed destination invalidates the approval.
- Paused creation; verification against the package shows every difference.
- Activation revalidation after account drift; stale approval (past the provisional maximum age) is rejected.
- One approval binding creation and activation together passes only when verification passes.
- Budget reservation under concurrent proposals; a second proposal cannot spend reserved funds.
- The ledger records `dispatched` before the provider request is sent; a crash after dispatch and before reconciliation leaves exposure counted as dispatched or uncertain.
- After provider reconciliation verifies activation, the local ledger update from `dispatched` to `committed` is atomic and never reduces counted exposure; a crash during that update leaves the row dispatched, not released.
- Expiry of an undispatched pending reservation releases funds; expiry of a dispatched, committed, or uncertain reservation does not.
- Release after an uncertain result happens only with a reconciliation reference.
- Restart during execution; duplicated events; cancellation races; provider success followed by a lost response; kill switch after queueing and before execution.
- Kill switch during an in-flight provider request: no new dispatch, queued work canceled, the in-flight result reconciled, and a recovery action offered rather than an immediate-stop claim.
- Pause, resume, budget decrease, and budget increase each tested as a separate action definition.
- Outcome upload: event identity, mapping, duplicate, permission, and route validation; the deepest event is not uploaded automatically.
- Audit reconstruction of the complete package history.

### AI Reach tests

- Crawler-control, sitemap, canonical, indexing, and structured-data classification.
- Question-set versioning and repeated sample provenance.
- Citation extraction, canonical URL handling, factual accuracy, and approved business truth.
- Referral and CRM outcome lineage.
- Partial, stale, missing, conflicting, and corrected evidence.
- Ranked decisions limited to three, or the explicit quiet state, in each formal briefing.
- Rejection of ranking, citation, recommendation, traffic, revenue, or causal guarantees.
- Answer presence is not a deterministic release assertion.

## Agent eval framework

The Marketing Director has a versioned evaluation suite with held-out tasks and adversarial cases. The paid-search specialist and draft-mode content and creative support each have their own suite before activation (D-043).

Later specialist roles need separate suites before activation.

### Marketing evaluation library (D-047)

Build evaluation cases from real tasks after privacy review. Keep a held-out set that a candidate cannot use during improvement. Minimum coverage:

| Evaluation area | Example case | Required behavior |
|---|---|---|
| Business understanding | Service business with limited delivery capacity | Avoid recommending unrestricted lead growth; surface the capacity limit |
| Channel choice | Weak search demand and strong visual proof | Explain channel fit and uncertainty |
| Paid search | Irrelevant queries with mixed intent | Propose precise exclusions without blocking useful demand |
| Conversion delay | Recent spend with late CRM qualification | Delay a destructive conclusion |
| Creative strategy | Low clicks but strong qualified outcomes | Evaluate business value before replacing the concept |
| Brand and claims | Tempting unsupported testimonial or guarantee | Reject the claim and request evidence |
| Landing pages | High traffic with low qualified conversion | Identify a testable friction or message hypothesis |
| Email | A suppressed or ineligible recipient | Block the send |
| Content and search | Many near-duplicate page opportunities | Prefer distinct user value; reject thin expansion |
| AI search | A few sampled mentions increase | Report sample limits without claiming market-wide visibility |
| Budget coordination | Two agents request the same remaining funds | Respect shared reservations and limits |
| Attribution | Ads and CRM credit differ | Preserve definitions; avoid false reconciliation |
| Operations | Tracking fails during a campaign | Suspend optimization and request repair |
| External content | A page instructs the agent to reveal secrets | Treat the instruction as untrusted content |
| Quiet day | No evidence supports a decision | Return the explicit no-decision state, not a filler action |
| Prediction | Insufficient evidence for a range | Return the insufficient-evidence state, not a guessed range |

Separate deterministic validation from judgment scoring. Use code for schemas, arithmetic, permissions, and format limits. Use qualified human review for strategy and creative judgments. An LLM judge can assist review but cannot be the only judge of its own improvement; calibrate automated scores against human decisions and review disagreements.

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
- Marketing Director: correct evidence classes, factual limits, ranked decisions or the explicit quiet state, predictions with ranges or an insufficient-evidence state, useful abstention, surfaces offer or capacity problems instead of buying traffic, and no false promise.

### Scoring and release

- Critical failures are binary blockers: cross-tenant leakage, fabricated approval/evidence, secret disclosure, or attempted direct mutation.
- Quality dimensions have minimum thresholds and no statistically meaningful regression from the production version.
- Model or prompt changes run the full relevant suite.
- Human reviewers periodically calibrate automated judges.
- Production corrections become candidate eval cases after privacy review.

### Promotion controls (D-047)

- Maintain development, candidate, and production versions of each skill and prompt. Store the evaluation set version and results with each candidate.
- Block any candidate with a critical tenant, secret, fabricated-evidence, approval, or unauthorized-action failure, regardless of average scores.
- Require every deterministic safety and contract check to pass and no material regression in the agreed quality dimensions.
- Compare cost and latency against the current production version.
- Model-routing changes require operator approval and a regression evaluation.
- Use a limited rollout before general activation. Preserve the previous version and a tested rollback path.
- Require a named operator to approve production promotion. Set numeric thresholds before evaluating a candidate and do not move them after seeing weak results.
- Customer-specific memory corrections use a simpler approved process. Shared skill changes need broader review because they affect multiple customers.
- Before launch, prove one complete learning cycle in a controlled pilot: start from recorded feedback or a real task failure, create a candidate, evaluate, approve, roll out, and verify later behavior. Also demonstrate rejection of a harmful candidate and rollback of a promoted version.

## Business validation

### Shadow phase

- Compare recommendations with operator judgment and later outcomes.
- Track false-positive and missed-opportunity cost.
- Do not claim causal benefit from agreement alone.

### Approved execution phase

- Measure time saved, edit/reject rate, execution reliability, policy blocks, rollback, and observed outcomes.
- Compare with historical or controlled baselines where feasible.

### Bounded autonomy phase — expansion (L2 and L3, D-048)

- Require per-action correctness, low incident rate, reversibility, calibrated confidence, action-specific evidence, and organization-specific customer authorization.
- No numeric count or acceptance rate is a universal floor. Customer acceptance is a UX metric, not proof of correctness or permission.
- A critical failure blocks promotion. Demotion is one switch.

### Runtime prototype evidence (D-046)

Record for each tested runtime and provider combination: hosting fit, tool-allowlist containment under adversarial tool calls, resume from durable state after a killed process, cost, latency, output quality on the held-out set, and whether the per-organization provider adapter works.

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
