# Product Requirements

> **Superseded implementation scope:** This document preserves the conservative research recommendation. The authoritative requirements are in [`docs/development/product/product-requirements.md`](../development/product/product-requirements.md).

## Product definition

The product is a governed agentic marketing operations system. It connects marketing delivery data to qualified business outcomes, recommends actions with evidence, routes higher-risk changes for approval, executes approved actions through narrow APIs, and learns from corrections and measured results.

## Primary users

- **Marketing operator:** reviews recommendations, edits creative, approves actions, and investigates results.
- **Business owner:** defines goals, offers, budget limits, and acceptable risk.
- **Data owner:** maintains canonical metrics, source mappings, and data quality.
- **Compliance/security owner:** controls credentials, data permissions, retention, policies, and incident response.
- **Developer/FDE:** implements connectors, skills, policies, evals, and channel executors.

One person may hold several roles in a small company, but the system still records which role authorized each decision.

## MVP user journey

1. An administrator connects one Meta account, CRM, and revenue source with read-only credentials.
2. The system performs a backfill, validates mappings, and shows data freshness and quality.
3. The operator maps business stages and selects a canonical qualified-conversion metric.
4. The system runs daily in shadow mode and produces recommendations without making changes.
5. The operator approves, rejects, or edits recommendations and provides a reason.
6. Approved actions execute through a separate Meta mutation credential.
7. The system observes downstream outcomes, scores recommendations, and updates reports and eval datasets.

## Functional requirements

### FR-1: Organization and channel isolation

- Data, credentials, policies, skills, and actions are scoped to an organization.
- Cross-organization reads and writes are impossible by default.
- Channel executors verify organization ownership of every remote target.

Acceptance:

- An action with a target from another organization is rejected and audited.
- An agent tool listing exposes only the current organization's resources.

### FR-2: Credential separation

- Read and write credentials are stored separately.
- Write credentials are unavailable to analytics and research agents.
- Credential references, never raw values, appear in prompts and logs.
- Rotation does not require editing a skill or prompt.

Acceptance:

- A read-only run cannot invoke any mutation endpoint.
- Secret scanning finds no credential in source, prompt traces, or audit payloads.

### FR-3: Incremental data ingestion

- Ingest campaign hierarchy, creative, spend, delivery, conversion, CRM, and revenue data.
- Preserve raw payloads and normalized records.
- Support backfill, checkpoint, replay, and late-arriving events.
- Display freshness, completeness, and connector errors.

Acceptance:

- Replaying the same window is idempotent.
- Currency, account timezone, and source IDs survive normalization.
- A stale critical source blocks write proposals.

### FR-4: Canonical metrics

- Administrators define and version qualified-conversion, cost, revenue, and funnel metrics.
- Every decision records the metric version and evidence snapshot.
- Attribution window and maturity rules are explicit.

Acceptance:

- The same snapshot and metric version produce the same deterministic value.
- A metric definition change does not rewrite historical decision evidence.

### FR-5: Campaign and creative taxonomy

- Normalize platform-specific campaign/ad set/ad and creative identifiers.
- Record offer, persona, angle, hook, format, source, prompt, model, and asset lineage.
- Allow manual correction of inferred tags.

Acceptance:

- An operator can trace an outcome from campaign to asset, prompt, source, and approval.

### FR-6: Proposal generation

- Produce typed recommendations with target, action, reason code, evidence, confidence, expected effect, risk class, expiry, and rollback.
- Separate deterministic eligibility from model-authored explanation.
- Refuse proposals with invalid schema or missing evidence.

Acceptance:

- Every proposal passes schema and policy validation before display.
- Free-form model text cannot change the executable target or parameters.

### FR-7: Approval workflow

- Support approve, reject, edit/resubmit, bounded batch approval, and workflow disable.
- Bind approval to an immutable proposal hash.
- Capture approver, timestamp, role, and reason.

Acceptance:

- Editing any executable field invalidates the old approval.
- A high-risk action cannot execute with an insufficient role.

### FR-8: Scoped execution

- Execute through typed, channel-specific commands.
- Re-check remote state, policy, approval, budget, and data freshness immediately before mutation.
- Use idempotency and store platform request/response identifiers.
- Provide dry-run and compensating rollback where possible.

Acceptance:

- Retried jobs do not duplicate ads or budget changes.
- A stale proposal fails closed with an actionable explanation.

### FR-9: Audit log

- Append every observation, proposal, policy decision, approval, execution, error, and rollback.
- Retain before/after state and causal links.
- Prevent ordinary users and agents from editing audit history.

Acceptance:

- An investigator can reconstruct why, how, and by whom a platform state changed.

### FR-10: Shadow mode

- Run the complete decision pipeline without mutation.
- Compare recommendations to human actions and later outcomes.
- Capture corrections as labeled evaluation candidates.

Acceptance:

- The pilot can report precision, acceptance, disagreement, and estimated impact before any autonomy increase.

### FR-11: Evals and release gates

- Maintain offline evals for metric routing, diagnoses, policy checks, and proposal formatting.
- Run relevant eval slices when skills, prompts, models, policies, or schemas change.
- Block release on domain-specific thresholds.

Acceptance:

- Every production proposal records model, prompt, skill, policy, and data versions.
- A regressing change cannot become the default without an explicit override and audit.

### FR-12: Monitoring and kill switches

- Track connector health, action failures, budget impact, anomaly rates, model cost, and policy denials.
- Provide global, organization, channel, and workflow kill switches.
- Stop scheduled writes when audit, policy, or secrets services are unhealthy.

Acceptance:

- A kill switch prevents new execution while preserving queues and evidence.

### FR-13: Research and creative workflow

- Store approved research sources and mark external text as untrusted.
- Generate briefs and drafts against a versioned brand/claim policy.
- Detect unsupported factual claims, prohibited categories, likeness/IP risk, and missing disclosure.
- Route all MVP public content for review.

Acceptance:

- No generated public asset can publish without approval.
- The reviewer sees source provenance and flagged claims.

### FR-14: Data rights and suppression

- Record origin, permission/lawful-basis status, permitted uses, retention, and deletion state for person-level data.
- Maintain suppression lists and apply them before any audience or message action.
- Block customer-list audience creation without documented rights and platform eligibility.

Acceptance:

- Hashing or enrichment alone never changes an ineligible record to eligible.

## Non-functional requirements

### Security

- least-privilege service identities and tool allowlists
- encryption in transit and at rest
- short-lived tokens where supported
- secret manager references and rotation
- sandboxing for model-driven code and untrusted skills
- prompt-injection defenses and output schema validation
- dependency and skill provenance review

MCP servers must follow scope minimization, audience validation, secure token storage, and sandbox guidance in the [official MCP security practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices).

### Reliability

- at-least-once ingestion with idempotent processing
- idempotent execution commands
- durable schedules and queues
- explicit retry classes
- circuit breakers and dead-letter queues
- backup and restore tests

### Observability

- structured logs, metrics, traces, and correlated action IDs
- freshness and data-quality dashboards
- per-run token, model, tool, latency, and cost telemetry
- policy-denial and approval analytics

### Performance

- daily digest generation within the agreed data-latency window
- interactive proposal and audit views under two seconds for ordinary accounts
- platform API operations paced within official quotas

### Privacy

- data minimization and purpose limitation
- region-aware retention and deletion
- separation of personal and business contexts
- export and deletion procedures
- no person-level data in model prompts unless necessary and authorized

### Portability

- model provider abstracted behind a typed interface
- skills stored in inspectable, versioned files
- channel services expose stable internal commands independent of agent harness
- raw and canonical data exportable in common formats

### Explainability

- show evidence, metric version, freshness, uncertainty, policy results, and expected effect
- store concise decision rationale, not private chain-of-thought

## MVP boundaries

Included:

- one organization
- one Meta ad account
- one CRM and one billing/revenue source
- historical backfill and daily incremental sync
- campaign/creative canonical model
- daily shadow recommendations
- human-approved pause/resume of eligible ads
- audit, rollback, evals, and kill switches

Excluded until later:

- automatic budget increases
- new campaign creation
- custom audience uploads
- direct publishing to social or CMS
- outbound enrichment and messaging
- multi-tenant self-service
- generalized autonomous web browsing
- self-modifying policies or production skills

## Autonomy promotion criteria

A workflow may move from approval-only to bounded automatic execution only when:

- at least four weeks of representative shadow/approval data exists
- offline domain evals meet the agreed threshold
- recommendation precision and operator acceptance meet the agreed threshold
- no unresolved high-severity policy or authorization issue exists
- rollback has been tested
- delayed conversion effects are understood
- action and spend ceilings are configured
- the business owner and compliance/security owner approve the change

Promotion applies to one action type and scope, not to the entire agent.

## Definition of product success

The MVP is successful when it measurably reduces operator analysis time and increases the speed or quality of creative decisions without increasing unauthorized spend, policy risk, data ambiguity, or rollback burden.
