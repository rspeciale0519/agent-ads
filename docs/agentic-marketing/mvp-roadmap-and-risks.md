# MVP Roadmap and Risks

> **Superseded delivery scope:** This single-platform research roadmap is not the current MVP plan. Use [`docs/development/delivery/implementation-roadmap.md`](../development/delivery/implementation-roadmap.md).

## Delivery strategy

The roadmap deliberately delays autonomous mutation. The first value is a trustworthy marketing data and recommendation system. Autonomy is promoted one action at a time after evidence exists.

## Phase 0: Business and governance contract

### Deliverables

- select one organization, Meta ad account, offer, and primary funnel
- name business, data, security/compliance, and marketing owners
- define qualified conversion and revenue outcome
- agree attribution and maturity windows
- define campaign/creative taxonomy
- classify actions by risk
- document account, product, geography, and budget constraints
- create prohibited-tactics policy

### Exit criteria

- metric contract is signed off
- source/data rights are documented
- MVP write actions are limited to approved pause/resume operations
- kill-switch owner and incident path are named

## Phase 1: Read-only data foundation

### Deliverables

- Meta, CRM, and billing/revenue connectors
- raw append-only storage
- canonical campaign, creative, funnel, and revenue models
- data-quality, freshness, and reconciliation checks
- metric service with versioned definitions
- initial dashboards and provenance footer

### Verification

- reconcile spend and conversions to native platform reports for sampled dates
- reconcile qualified outcomes to CRM and revenue to billing
- test timezone, currency, deletion, late-arrival, and replay behavior
- confirm the agent cannot access write credentials

### Exit criteria

- critical fields meet completeness thresholds
- daily sync meets freshness SLO
- metric values are reproducible from a snapshot

## Phase 2: Shadow diagnostic agent

### Deliverables

- paid-media diagnostic skill
- deterministic anomaly and maturity rules
- typed proposal schema
- daily recommendation digest
- offline eval set for metric routing, diagnosis, and policy
- operator accept/edit/reject feedback capture

### Verification

- run on historical windows without leaking future data
- compare recommendations with actual subsequent outcomes
- measure precision and false-positive rate
- red-team external content for prompt injection

### Exit criteria

- no invalid executable schema in the evaluation set
- operator agrees recommendations are understandable and evidence-backed
- false-positive rate is below the agreed threshold

## Phase 3: Human-approved execution

### Deliverables

- separate Meta mutation credential and executor
- policy engine and immutable approval records
- idempotent pause/resume commands
- before/after state and rollback
- action-volume/spend guardrails
- global and channel kill switches
- incident runbook

### Verification

- dry runs against a test account or isolated campaign
- duplicate/retry testing
- stale-proposal and concurrent-change testing
- credential rotation and secret-exposure testing
- rollback drill

### Exit criteria

- every write requires valid approval and passes two policy checks
- audit reconstruction is complete
- rollback works under the tested failure modes

## Phase 4: Creative testing workflow

### Deliverables

- approved brand/claim library
- research brief and creative-brief schemas
- asset lineage from source to prompt to final file
- deterministic template rendering for copy-heavy statics
- optional generative image/video adapter
- human quality and policy gate
- controlled upload into an existing testing campaign

### Verification

- brand snapshot and copy-overflow tests
- prohibited claim, likeness, IP, and disclosure review
- experiment registration before launch
- limit batch size and test spend

### Exit criteria

- assets are traceable and reproducible where required
- no public creative bypasses approval
- outcome data links to creative metadata

## Phase 5: Bounded low-risk autonomy

Candidate first action: pause one mature losing ad inside a named test campaign.

### Promotion requirements

- at least four representative weeks of shadow and approved execution
- rollback tested
- metric lag and minimum sample understood
- precision and acceptance meet thresholds
- no unresolved high-severity policy/security issue
- action and spend ceilings configured
- explicit business and security/compliance approval

### Controls

- one action type
- one account and campaign class
- maximum actions per run/day
- no budget increase
- no new campaign, audience, or public content
- anomaly-triggered automatic suspension
- weekly human audit sample

## Later modules

### Google Ads

Add search-term ingestion, deep conversion tracking, negatives proposals, landing-page message-match review, and controlled keyword/campaign mutations. Avoid blindly promoting every “winner” into a new campaign; test whether segmentation improves measurement or delivery.

### Organic content

Add first-party source ingestion, insight extraction, draft grading, approval, scheduling, and analytics. Use Postiz or an equivalent official/approved publisher. Do not automate engagement, fake activity, or bulk accounts.

### SEO

Add Search Console/analytics opportunity detection, brief generation, content review, CMS draft creation, and decay refresh. Require user value, subject-matter ownership, and search-policy checks. Do not implement parasite or scaled-content abuse.

### Outbound

Only after a separate legal/platform/data review. Begin with first-party opted-in or clearly permitted data, suppression, identity, truthful sending, and human-approved messaging. Unauthorized LinkedIn scraping is not a prerequisite.

## Measurement plan

### Product metrics

- time from data availability to decision
- analyst/operator hours saved
- proposal acceptance, edit, rejection, and expiry rates
- rollback and incident rates
- evidence freshness and missing-data blocks
- cost and latency per accepted proposal

### Marketing metrics

- cost per qualified conversion
- qualified pipeline and revenue
- funnel-stage conversion rates
- creative test velocity
- percentage of spend on mature losing variants
- incremental lift against holdout or credible comparison

### Guardrails

- total and incremental spend
- brand/policy violations
- customer complaints and opt-outs
- audience/data eligibility failures
- platform warnings or enforcement
- false-positive pausing
- connector drift and attribution mismatch

## Risk register

| Risk | Why it matters | Prevention | Detection/response |
|---|---|---|---|
| Wrong canonical metric | Agent optimizes the wrong outcome convincingly | owned versioned metrics, reconciliation, semantic routing | provenance, evals, stakeholder correction capture |
| Conversion lag | Recent variants look worse than they are | maturity windows and lag models | stale/immature status blocks |
| Confounded experiments | Many simultaneous edits destroy causal learning | experiment registry and change budgets | detect unregistered mutations |
| Prompt injection | External ads/pages/transcripts steer tools | treat retrieval as untrusted, structural separation, tool allowlists | injection evals, action-source audit, kill switch |
| Credential overreach | One compromise affects all accounts/channels | separate read/write identities, least privilege, secret broker | permission audit, rotation, circuit breaker |
| Duplicate execution | Retries create ads or repeated edits | idempotency keys and remote-state re-read | duplicate alarms and reconciliation |
| Stale proposal | State changes after approval | proposal expiry and pre-execution revalidation | reject and regenerate |
| Spend runaway | A plausible decision scales loss | per-action/daily limits, no MVP budget increases | spend anomaly breaker |
| Brand/claim violation | Generated creative makes unsupported claims | approved claim library and human gate | content audit and immediate pause |
| Platform-policy violation | Scraping/automation causes enforcement | official APIs, explicit permissions, policy review | warnings monitored; disable connector |
| Unlawful personal-data use | Audience or outbound creates legal risk | provenance, lawful-basis/permission, suppression, minimization | eligibility blocks, deletion and incident flow |
| Model/provider regression | Behavior changes without code changes | pinned approved models and task evals | canary/shadow comparison and rollback |
| Skill drift | Procedure no longer matches data/platform | ownership, review date, co-located schema docs | eval decline and stale-skill disable |
| Creative entropy | Repeated generations converge to sameness | diverse approved sources and explicit novelty dimensions | similarity metrics and portfolio review |
| Vanity optimization | Activity rises without business lift | outcome hierarchy and experiment design | executive metric review |
| Tool supply-chain compromise | Third-party skill/plugin exfiltrates data | source review, pinning, sandbox, allowlists | secret/access monitoring; revoke and rotate |
| Single-agent blast radius | General agent accumulates excessive context/tools | role-specific profiles and executors | permission graph review |

## Risk decisions from the bookmark research

### Reject now

- Reddit account aging, proxy/fingerprint evasion, and ban circumvention
- unapproved LinkedIn scraping and automated site activity
- purchased/scraped customer-list uploads without documented rights and lawful basis
- engagement pods, fake engagement, and intentionally inflammatory misinformation
- scaled parasite SEO and keyword/location page factories without unique value
- automatic budget scaling
- storing private chain-of-thought

### Investigate under controlled evaluation

- Meta creative-batch testing and winner/loser pools
- Google search-term prospecting and negative proposals
- React/HTML creative templates
- Higgsfield creative generation
- Hermes for research/digest orchestration
- Postiz for approved social publishing and analytics
- `last30days`-style trend research with policy-compliant source access

### Treat as unverified until reproduced

- Facebook lead cost dropping from $17 to $3 because of the agent
- $225K/year of marketing tools replaced
- 224 micro-optimizations as a performance benefit
- 48-hour or weekend customer-acquisition system builds
- guaranteed ranking or growth timelines

## Launch checklist

- [ ] metric owner and definitions approved
- [ ] source reconciliation passed
- [ ] data rights and retention reviewed
- [ ] read/write credentials separated
- [ ] policy rules and risk classes loaded
- [ ] schema validation and idempotency tested
- [ ] eval thresholds met
- [ ] dry run passed
- [ ] approval roles configured
- [ ] kill switches tested
- [ ] rollback drill completed
- [ ] incident contacts named
- [ ] monitoring alerts verified
- [ ] first production scope explicitly recorded

## Definition of done for the MVP

The MVP is done when one Meta account produces trustworthy daily recommendations linked to qualified outcomes, every mutation is human-approved and fully auditable, rollbacks and kill switches work, and the pilot can quantify both operator time saved and recommendation quality. It is not done merely because an agent can call the API.
