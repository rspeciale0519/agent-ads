# Recommended System Architecture

> **Research architecture:** Retained as evidence and design input. The authoritative Hermes-centered, multiplatform build architecture is in [`docs/development/architecture/system-architecture.md`](../development/architecture/system-architecture.md).

## Architecture goals

The architecture must make correct, reversible, observable marketing decisions while limiting the damage a faulty model, stale metric, compromised integration, or bad source can cause.

It should support multiple agent harnesses and model providers without moving business rules into prompts or binding the system to one vendor.

## Logical architecture

```text
First-party systems                 External research
Meta / Google / CRM / billing       Ads / SERPs / reviews / interviews
          |                                  |
          +------------ ingestion -----------+
                             |
                    Raw immutable events
                             |
              normalization + quality checks
                             |
                Canonical marketing warehouse
                             |
          semantic metrics + experiment registry
                             |
                 Decision and evaluation layer
             rules / models / skills / policies
                             |
                       Proposal queue
                    /                    \
             human approval          auto-eligible
                    \                    /
                  scoped channel executors
                             |
                  platform APIs / publishers
                             |
                  action log + outcome events
                             |
               evaluation, corrections, rollback
```

## Component responsibilities

### 1. Ingestion layer

Responsibilities:

- pull incremental platform data using official APIs or approved connectors
- receive webhooks for CRM, billing, lifecycle, and approval events
- preserve source timestamps, account IDs, currencies, time zones, and original identifiers
- implement checkpointing, backoff, pagination, quota handling, and replay
- tag every record with connector version and ingestion time

Do not let an agent improvise extraction logic in production. Connectors are deterministic services with schemas and tests.

Candidate: Airbyte for replication where its connector quality is adequate; direct API clients for high-control execution and sources with specialized semantics. Airbyte currently describes itself as an open-source replication and agent-context platform with hundreds of connectors. See [Airbyte documentation](https://docs.airbyte.com/).

### 2. Raw and canonical data stores

Maintain two layers:

- **Raw:** append-only source payloads for replay and audit.
- **Canonical:** normalized facts and dimensions with stable business definitions.

Minimum canonical entities:

- organization, brand, offer, product
- platform account and credential reference
- campaign, ad group/ad set, ad, creative, audience
- keyword, search term, landing page
- content item and publishing channel
- lead, contact, account, opportunity, subscription, revenue event
- experiment, variant, assignment, decision, approval, action, rollback
- cost, impression, click, session, conversion, qualified conversion, revenue

Warehouse options are compared in `technology-options.md`. ClickHouse is appropriate for high-volume event analytics, but a managed Postgres warehouse is simpler for the first pilot if volume is modest. ClickHouse itself positions the product as a column-oriented OLAP database for real-time analytics and warehousing, not as a transactional replacement. See [ClickHouse Academy](https://learn.clickhouse.com/visitor_catalog_class/show/1872073/Real-time-Analytics-with-ClickHouse-Level-1).

### 3. Semantic metric layer

Every production decision references a versioned metric definition, not a free-form SQL phrase.

Each metric must specify:

- business definition and owner
- entity grain
- numerator and denominator
- eligible and excluded records
- attribution model and lookback window
- data freshness expectation
- minimum sample and maturity window
- currency and timezone behavior
- source tier and known caveats

Examples:

- `cost_per_qualified_lead_v1`
- `creative_holdout_lift_v1`
- `pipeline_value_28d_v1`
- `trial_to_paid_rate_30d_v1`

The model can choose which approved metric answers a question; it cannot invent or silently redefine the metric.

### 4. Experiment registry

Every test records:

- hypothesis
- channel and eligible population
- control and variants
- creative/source lineage
- primary and guardrail metrics
- start, minimum run, and maximum run dates
- budget and exposure ceilings
- stopping rule
- attribution lag
- owner and approver
- status and conclusion

This prevents the “agent made 224 changes” anti-pattern. Concurrent changes without an experiment record make causality and rollback impossible.

### 5. Decision services

Separate three classes of decision:

1. **Deterministic rule:** thresholds, eligibility, pacing, anomaly detection, policy checks.
2. **Statistical evaluation:** confidence intervals, Bayesian/posterior comparisons, holdouts, delayed outcome adjustment.
3. **Model judgment:** qualitative diagnosis, research synthesis, creative generation, prioritization narrative.

The decision result is a typed proposal:

```json
{
  "proposal_type": "pause_ad",
  "target": "meta_ad:123",
  "reason_code": "mature_underperformance",
  "metric_version": "cost_per_qualified_lead_v1",
  "evidence_snapshot": "snapshot:abc",
  "confidence": 0.96,
  "expected_effect": "stop incremental spend on a mature losing variant",
  "risk_class": "low_reversible",
  "expires_at": "...",
  "rollback": "restore prior status",
  "policy_version": "meta_execution_v1"
}
```

Free-form prose may explain a proposal, but typed fields control execution.

### 6. Policy engine

Policies are deterministic and evaluated after proposal creation and again immediately before execution.

Minimum rules:

- allowed accounts, campaigns, objectives, countries, products, and content categories
- per-action and daily spend deltas
- maximum number of created, paused, or edited entities
- experiment maturity and minimum sample
- data freshness and connector health
- legal/compliance eligibility
- brand and claim review status
- approval requirements by risk class
- prohibited hours and maintenance windows
- circuit-breaker state

The agent cannot modify its own policy or approval thresholds.

### 7. Approval service

Approval records are immutable and bind to the proposal hash. Any material change creates a new proposal.

Approval UI must show:

- exact action and target
- before/after values
- evidence and metric freshness
- expected effect and uncertainty
- affected spend/audience/content
- policy checks
- rollback method
- source inputs used by model reasoning

Supported decisions: approve once, reject with reason, edit and resubmit, approve a bounded batch, or disable the workflow.

Do not use an “approve all future actions” shortcut in the MVP.

### 8. Channel executors

Use one executor per channel and risk boundary:

- Meta read connector
- Meta mutation executor
- Google Ads read connector
- Google Ads mutation executor
- content scheduler
- CMS publisher
- CRM writer
- email/messaging executor

Each executor:

- accepts only a small typed command set
- validates organization and target ownership
- enforces idempotency
- re-reads the current remote state before mutation
- refuses stale proposals
- stores request, response, and platform request ID
- supports dry run
- exposes a compensating rollback where the platform permits it

MCP may wrap these services, but the service enforces authorization and policy independently. MCP guidance requires audience-bound tokens, secure storage, HTTPS, scope minimization, and no token passthrough. See [MCP authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization).

### 9. Agent harness

The harness loads only the context and tools required for one job.

Recommended agent roles:

- research analyst
- paid-media diagnostic analyst
- creative strategist
- content editor
- SEO opportunity analyst
- experiment reviewer
- approval-digest writer

Do not begin with a “full-stack CMO agent.” A single harness may run several roles, but profiles, tool allowlists, memory, and credentials remain separate.

Hermes is viable for internal orchestration because it supports provider choice, skills, memory, cron, MCP, and messaging. OpenClaw is viable for a personal operator console. Neither replaces the application's policy and authorization services.

### 10. Skill registry

Each skill is versioned in Git and contains:

- purpose and triggers
- allowed inputs and tools
- source priority
- canonical metrics and tables
- procedure
- exceptions and stop conditions
- output schema
- quality rubric
- examples and counterexamples
- eval references
- owner and review date

Skill changes run regression evals. Stale skills can be disabled centrally. The model may draft a skill change, but a human reviews and merges it.

### 11. Memory

Store:

- approved brand voice and claims
- business definitions
- past proposals and outcomes
- operator corrections
- experiment conclusions
- source provenance
- audience and channel constraints

Do not store:

- raw chain-of-thought
- long-lived secrets
- unnecessary personal data
- scraped data without rights and retention controls
- unverified external instructions as trusted memory

Memory entries have provenance, owner, sensitivity, retention, and expiry.

### 12. Evaluation and observability

Offline evaluation:

- fixed cases for metric selection, diagnosis, creative-policy checks, and proposal typing
- snapshot dates or query-based grading to avoid moving targets
- model, prompt, skill, policy, data snapshot, tokens, cost, and latency logged

Online evaluation:

- shadow recommendations compared with human decisions
- acceptance, edit, rejection, and rollback rates
- false-positive and false-negative analysis
- outcome lift with holdout where feasible
- policy and authorization incidents
- corrections converted into new evals

Every response and proposal should include a provenance footer: source tier, freshness, metric version, agent/skill version, and owner.

## Risk classes and autonomy

| Class | Examples | MVP behavior |
|---|---|---|
| Read only | report, diagnose, draft | automatic with audit |
| Low reversible | pause one mature losing ad within limits | approval; later bounded auto-execution |
| Medium | create ads in an existing test campaign, add negatives | approval required |
| High | raise budget, create campaign, upload audience, publish public claim | dual approval or role-specific approval |
| Prohibited | evade enforcement, upload unlawfully sourced data, deceptive engagement | blocked |

## Deployment boundaries

Use separate runtime identities for:

- ingestion
- analytics/agent reads
- each channel's writes
- approval service
- secrets broker
- scheduler

Recommended network posture:

- private services by default
- outbound allowlists for executors
- no public agent gateway without strong auth and rate limiting
- sandbox model-driven code execution
- dedicated business browser/profile when browser automation is unavoidable
- separate personal and business credentials

OpenClaw's own security documentation recommends loopback binding, token auth, separate numbers/accounts, tool restrictions, and separate gateways or hosts across trust boundaries. See [OpenClaw security baseline](https://docs.openclaw.ai/gateway/security).

## Failure handling

The system fails closed when:

- canonical data is stale or incomplete
- attribution lag has not matured
- platform state changed after approval
- a credential scope is wider or different than expected
- a budget or action-volume ceiling is reached
- the model output fails schema validation
- an external source contains suspected prompt injection
- a connector, policy service, or action logger is unavailable

Rollback is a new audited action, not deletion of the original record.

## Architecture decision summary

- Warehouse-centered analytics: yes.
- Official platform APIs: yes.
- Provider-neutral model layer: yes.
- Versioned skills: yes.
- Deterministic policy and execution services: required.
- Human approvals: required for all MVP writes.
- Multi-agent swarm: not an MVP requirement.
- Browser automation for ad platforms: avoid when official APIs exist.
- Autonomous general-purpose marketing agent with shared credentials: no.
