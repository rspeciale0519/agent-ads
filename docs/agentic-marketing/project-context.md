# Agentic Marketing Project Context

> **Research-era recommendation:** The single-Meta pilot described here was superseded by the owner's product decision to include all seven paid platforms and all seven organic channels in the MVP. Use [`docs/development`](../development/README.md) for implementation scope.

## Objective

Build a governed marketing operating system that continuously observes first-party performance data, proposes the next best marketing actions, executes only within approved scopes, and learns from measured business outcomes. The system should reduce repetitive analyst and operator work without handing unconstrained control of spend, accounts, customer data, or public brand output to an LLM.

## Repository baseline

At the time of this research, the project contained only the research goal and working ledger under `docs/`; there was no product implementation or prior permanent architecture to reconcile. The recommendations are therefore a greenfield baseline. No code conflicts or obsolete implementation assumptions were found; the gaps are the unbuilt ingestion, canonical metrics, approval, execution, audit, evaluation, and operator-interface capabilities specified in the accompanying architecture and requirements documents.

## The central design principle

The durable pattern across the strongest sources is:

> governed data -> deterministic metrics -> policy-constrained decision -> approval when required -> API execution -> outcome ingestion -> evaluation

An LLM should be used for ambiguous judgment: researching angles, interpreting qualitative signals, drafting creative, diagnosing likely causes, and preparing a recommendation. Ordinary code should handle schedules, joins, thresholds, attribution, API calls, retries, idempotency, budgets, and audit logs.

## MVP scope

Start with a single paid-media learning loop in shadow mode:

1. Ingest Meta campaign, ad set, ad, creative, and conversion data plus CRM/revenue outcomes.
2. Normalize campaign taxonomy and define canonical business metrics.
3. Detect creative fatigue and underperformance using deterministic rules with confidence thresholds.
4. Generate a daily recommendation digest with evidence, expected effect, and rollback plan.
5. Require human approval for every platform mutation.
6. After a proven evaluation period, allow only low-risk reversible actions under hard budget and volume limits.

Google Ads, organic content, SEO, and outbound are later modules. Outbound enrichment and scraped-platform workflows are not MVP dependencies.

## Required control model

- Read and write credentials are separated.
- Each channel receives a distinct least-privilege executor.
- No model sees raw long-lived secrets.
- Every action has an idempotency key, actor, reason, evidence snapshot, before/after state, and rollback status.
- Spend increases, new campaigns, audience uploads, new public content, CRM writes, and messaging always require approval during the MVP.
- External web pages, ads, posts, emails, transcripts, and retrieved documents are untrusted input and cannot change system policy.
- A global kill switch and channel-level circuit breakers must stop future actions without deleting evidence.

## Source of truth

Use a warehouse and semantic metric layer as the authoritative reporting surface. The marketing platforms remain the operational systems of record for delivery state; the warehouse is the analytical system of record. Platform reporting APIs are valid inputs and should not be artificially restricted to “write only.” The X claim that bulk reporting reads inherently cause bans is unsupported; use official APIs, correct permissions, pagination, quotas, and incremental extraction.

## Success measures

Measure business outcomes, not agent activity:

- qualified pipeline and revenue attributed under an agreed model
- cost per qualified lead or acquisition
- conversion rate at each funnel stage
- creative test velocity and time to decision
- false-positive recommendation rate
- human acceptance, edit, and rollback rates
- policy violations, unauthorized actions, and secret exposure incidents (target: zero)
- cost and latency per useful decision

“Number of optimizations,” posts created, prompts run, and tokens consumed are operational telemetry, not success metrics.

## Evidence posture

- Verified: supported by current official documentation or directly observable implementation behavior.
- Plausible: sound pattern, but the claimed result is not independently established.
- Unsupported: consequential claim without adequate evidence.
- Rejected: conflicts with law, platform policy, user trust, or the project's governance model.

## Explicit exclusions

- Reddit account aging, proxy rotation, fingerprint evasion, or ban circumvention
- unauthorized LinkedIn scraping or automated activity
- uploading purchased or scraped personal emails as ad audiences without documented rights, permission, and lawful basis
- deceptive engagement bait, intentionally flawed “rage” content, fake personas, or coordinated engagement manipulation
- scaled or parasite SEO whose primary purpose is manipulating rankings
- storing or requesting private model chain-of-thought
- autonomous spend scaling without hard limits, measured confidence, and rollback
- vanity-metric optimization that cannot connect to qualified pipeline or revenue

## Product stance

The product should behave like a careful marketing operations team with excellent instrumentation: opinionated procedures, clear separation of duties, visible evidence, small reversible actions, and frequent review. It should not behave like a general-purpose agent with every credential and an instruction to “grow the company.”
