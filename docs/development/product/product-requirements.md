# Product Requirements

## Requirement conventions

- `P-*`: product and tenant requirements.
- `ONB-*`: onboarding and business context.
- `PAID-*`: paid advertising.
- `ORG-*`: organic publishing.
- `AIR-*`: AI Reach and website discovery.
- `AGT-*`: agent orchestration and behavior.
- `APR-*`: proposals, approvals, and autonomy.
- `DAT-*`: data and measurement.
- `EXP-*`: opportunities and experiments.
- `UX-*`: user experience.
- `OPS-*`: operations and reliability.
- `SEC-*`: security, privacy, and compliance.
- `DIR-*`: Marketing Director, specialists, and business memory (accepted, D-043).
- `ACT-*`: supervised acquisition workflow and action definitions (accepted, D-044).
- `LRN-*`: learning contract and controlled improvement (accepted, D-047).

`Must` denotes pilot MVP acceptance unless the text marks the requirement as expansion or conditional. `Should` is a target that may degrade visibly.

Requirements in the `DIR`, `ACT`, and `LRN` families and every requirement or amendment marked with D-043, D-044, D-045, D-046, D-047, D-048, or D-049 are accepted design: the owner approved those decisions on 2026-10-04. They are implementation requirements and are not yet implemented where the current-implementation boundary says so. The `ACT` family does not relax the read-only adapter contract for any action until that action passes its own readiness gate. Original IDs and their completed evidence states are preserved.

Under D-043 and D-044, the required sources and actions follow the selected Pilot Scope Record. Requirements that name all pilot sources or all three D-037 actions describe the earlier D-032 and D-037 scope.

## Platform and tenancy

- **P-001:** The system must isolate every organization's users, data, secrets, agents, skills, policies, files, and execution history.
- **P-002:** Users must have explicit organization roles and granular permissions.
- **P-003:** A single user may belong to multiple organizations without context leakage.
- **P-004:** Agency administration is expansion scope. If enabled, it must not grant implicit access to client secrets or content.
- **P-005:** Every query, job, tool call, event, and audit record must carry an organization identifier.
- **P-006:** The system must expose connector capability and health status per organization and account.
- **P-007:** The pilot must use pooled managed cloud. Later dedicated and hybrid profiles must preserve the same product contracts and codebase.
- **P-008:** The pilot must record tenant-scoped provider usage and cost. Automated plans, allowances, limits, and billing are commercial expansion requirements.
- **P-009:** A versioned Pilot Scope Record must name the outcome, sources, owners, required connections, optional connections, and enabled action classes.

## Onboarding and context

- **ONB-001:** AI Reach must guide onboarding with plain questions and structured cards for business, offer, audience, funnel, brand, and constraints.
- **ONB-002:** Users must connect accounts through authorized credential flows and see requested permissions before granting access.
- **ONB-003:** The system must perform a read-only capability and data-health audit before enabling execution.
- **ONB-004:** The supervisor may infer a Business and Marketing Profile, but an authorized user must confirm material assumptions.
- **ONB-005:** Context must be versioned with source, owner, confidence, effective date, and review date.
- **ONB-006:** Corrections must supersede prior context without erasing history and must feed agent evaluation.
- **ONB-007:** Qualified lead, customer, revenue, margin, and other objective definitions must be confirmed before optimization begins.
- **ONB-008:** The existing shareable form must remain available for pre-login intake until chat-first onboarding replaces its primary role.
- **ONB-009:** AI Reach onboarding must support progress, save/resume, correction, final review, and a clear next step.
- **ONB-010:** Onboarding must use conditional questions and friendly validation to reduce cognitive load.
- **ONB-011:** Onboarding must support safe, tenant-scoped uploads with scanning, provenance, and review state.
- **ONB-012:** No onboarding surface may request passwords, API keys, refresh tokens, or other secrets.
- **ONB-013:** Onboarding must explain privacy, access, retention, optional sources, and the separate secure connection process.
- **ONB-014:** A submission must create a versioned intake record, review task, client confirmation, and proposed-profile workflow.
- **ONB-015:** The pilot must use the approved pooled profile. Later dedicated or hybrid onboarding must record ownership, residency, identity, support, and offboarding requirements.
- **ONB-016:** If a hybrid connector is later enabled, it must pass identity, update, health, audit, buffering, revocation, and remote-disable tests.
- **ONB-017 (D-043):** Business memory must store confirmed facts and inferred assumptions as separate, versioned records with source, approval status, and supersession. A new fact supersedes the old one without rewriting history.
- **ONB-018 (D-043):** The owner must be able to correct a material fact in plain language. The correction must persist into every later task, and conflicts must produce a question or review task, never a silent overwrite.
- **ONB-019 (D-043):** Business memory must hold approved and rejected creative examples, brand rules, claim rules, capacity limits, and the owner's standing instructions, each with its source and date.
- **ONB-020 (D-043):** Onboarding must use model defaults. Model and key selection is an advanced setting (D-041), never a required onboarding step.

## Paid advertising

### Pilot requirements

- **PAID-001:** The pilot must support read adapters for Google Ads and Meta Ads.
- **PAID-002:** An organization must be able to connect Google Ads only, Meta Ads only, or both.
- **PAID-003:** The read-only release must explain campaign results without requiring campaign construction.
- **PAID-004:** Each pilot connector must discover accessible accounts and declare separate read and mutation capabilities.
- **PAID-005:** Each pilot connector must ingest campaign hierarchy, delivery state, spend, performance, creative metadata, landing-page links, and available conversions.
- **PAID-006:** The pilot MVP must enable only one approved advertising action class through one provider and account.
- **PAID-007:** That action class must be campaign pause with resume as rollback when the official API and current state permit it.
- **PAID-008:** The system must never imply support for a platform operation that the current account or API cannot perform.
- **PAID-009:** Cross-platform plans must show total and per-platform budgets, assumptions, expected role, and stop conditions.
- **PAID-010:** Budget allocation recommendations must use canonical business outcomes and must not move money without the required approval or autonomy policy.
- **PAID-011:** Platform-created, externally edited, and agent-created changes must be distinguishable.
- **PAID-012:** Customer-list or sensitive audience operations must be blocked until provenance, permission, eligibility, and policy checks pass.
- **PAID-013:** Every state-changing request must use a separate least-privilege executor and idempotency key.
- **PAID-014:** The system must reconcile requested versus actual platform state after execution.

### First complete workflow requirements (D-044, accepted)

- **PAID-015:** The system must prepare a complete campaign package from the approved business profile, offer, destination, budget cap, and evidence: structure, targeting within account capability, copy, creative assignments, tracking requirements, and stop rules.
- **PAID-016:** The owner must see complete previews, the exact objects to be created, and the maximum spend exposure before approval.
- **PAID-017:** The system must create campaign objects in a paused state, verify them against the approved package, and show any difference before activation.
- **PAID-018:** Activation must be a separately gated action. One explicit approval may bind creation and activation together when verification passes.
- **PAID-019:** Google Ads is the first implementation path for PAID-015 to PAID-018. Meta receives the same workflow only after its own gate.
- **PAID-020:** Reads must use official reporting APIs with scheduled, incremental, quota-aware synchronization (D-045). No "write-only" API rule applies.

### Expansion requirements

- Microsoft, LinkedIn, TikTok, Reddit, and X advertising are expansion connectors.
- Bid changes, audience changes, creative upload at volume, and cross-platform allocation are expansion actions. Existing-campaign edits, budget decrease, budget increase, lead follow-up, and outcome upload are conditional actions under `ACT-*`.
- Expansion work retains `PAID-008` through `PAID-014` and the common platform-native contract.

## Organic publishing — expansion

`ORG-001` through `ORG-011` are target requirements. They do not block the pilot MVP.

- **ORG-001:** Expansion must support LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and authorized Reddit publishing.
- **ORG-002:** Users must select one or more organic channels per content item or program.
- **ORG-003:** The system must create platform-native variants from an approved source brief rather than require identical cross-posting.
- **ORG-004:** Users must preview, edit, regenerate, approve, schedule, cancel, and inspect each channel variant.
- **ORG-005:** The system must validate text, media, account, scheduling, and capability constraints before approval and again before publication.
- **ORG-006:** Publishing must be idempotent and prevent accidental duplicate delivery.
- **ORG-007:** Each delivery must store its platform identifier, timestamps, request/response reference, final status, and public URL where available.
- **ORG-008:** Analytics and engagement must be ingested and associated with the exact content variant and source brief.
- **ORG-009:** Replies, comments, and community participation must remain separate action classes with their own approval policies.
- **ORG-010:** Reddit publishing must enforce an allowlist of approved communities and organization-specific participation rules.
- **ORG-011:** Sensitive claims, customer names, regulated topics, and crisis responses must always require human review unless a future decision explicitly changes the rule.

## AI Reach

- **AIR-001:** AI Reach must be a feature inside the product and the primary pilot chat workspace.
- **AIR-002:** AI Reach must assess access, index eligibility, description accuracy, citation, recommendation, referral traffic, and business outcomes.
- **AIR-003:** The system must keep official data, first-party data, controlled samples, deterministic classifications, human reviews, and agent interpretations separate.
- **AIR-004:** Every controlled sample must record the question version, surface, provider, method, time, locale, sample number, available model version, and limitations.
- **AIR-005:** Repeated samples must remain separate and must not be averaged across unlike surfaces.
- **AIR-006:** Every rate must show its numerator, denominator, time window, method, and limitations.
- **AIR-007:** AI Reach must not promise a ranking, citation, recommendation, lead, sale, or causal effect.
- **AIR-008:** The system must assess facts against approved business truth and show inaccurate, incomplete, conflicting, unsupported, and unknown states.
- **AIR-009:** Search discovery and model-training crawler choices must remain separate, visible, user-controlled policy decisions.
- **AIR-010:** The system must not change crawler or indexing controls without a reviewed proposal and approval.
- **AIR-011:** Each briefing must show one outcome summary, one important data limitation, and ranked evidence-linked decisions. Original rule: exactly three actions. Amended by D-043 (accepted 2026-10-04): at most three ranked decisions, or an explicit statement that no decision needs attention today.
- **AIR-012:** The read-only release must make no website, advertising, CRM, email, calendar, or search-platform change.
- **AIR-013:** The supervised stage may create a CMS draft, but public publishing requires a later action gate.
- **AIR-014:** The system must reobserve relevant evidence after an approved content or campaign action.
- **AIR-015:** Collection must use official APIs, official reports, authorized exports, or approved methods that follow provider terms.

## Agent system

- **AGT-001:** One supervisor profile must operate through an application-owned, replaceable AI gateway for the pilot.
- **AGT-002:** Hermes and separate specialist profiles are expansion components that must use the same application-owned contracts.
- **AGT-003:** Agent output that may change external state must be a typed proposal, never a direct side effect.
- **AGT-004:** Every agent run must record role, model/provider, skill versions, inputs, evidence references, outputs, token/cost data where available, and result status.
- **AGT-005:** Agent prompts and skills must be versioned, evaluated, reviewable, and reversible.
- **AGT-006:** External content must be marked untrusted and unable to override policy or system instructions.
- **AGT-007:** An agent must abstain or request clarification when required evidence, freshness, permission, or confidence is insufficient.
- **AGT-008:** When multiple profiles are enabled later, disagreement must remain visible and require explicit resolution.
- **AGT-009:** No agent may receive unrestricted cross-tenant or cross-platform credentials.
- **AGT-010:** Deterministic jobs must not invoke a model when ordinary code can satisfy the contract.
- **AGT-011 (D-046):** The agent runtime must be selected through a bounded prototype of at most two weeks against an application-owned reference tool loop. The selection record must name the tested runtime and provider combinations.
- **AGT-012 (D-046):** Task, proposal, execution, and learning records must remain application-owned so the runtime can change without data migration.

## Marketing Director and specialists (D-043, accepted)

- **DIR-001:** One Marketing Director profile must own priorities, channel coordination, budget proposals, and owner communication for an organization.
- **DIR-002:** The Director must produce a daily briefing with ranked decisions (at most three), each with evidence, expected effect, cost exposure, and uncertainty, or a one-line statement that no decision needs attention.
- **DIR-003:** The Director must delegate bounded tasks to specialists through a typed task contract: organization and task identity, goal and acceptance criteria, role and version, allowed tools, business and policy versions, evidence references and freshness, cost and iteration limits, dependencies, expected output schema, and escalation rules.
- **DIR-004:** The first complete workflow must include one paid-search specialist and content or creative support in draft mode only. Draft content must serve the same offer and acquisition workflow.
- **DIR-005:** Specialists must return evidence, drafts, proposed actions, predictions, and unresolved questions. They cannot acquire broader permissions or change approval rules.
- **DIR-006:** The Director must preserve disagreement between specialists and state the tradeoff in the proposal.
- **DIR-007:** The Director must recognize when the best next task concerns the offer, tracking, lead handling, or capacity, and must surface that instead of creating advertising work.
- **DIR-008:** Every Director and specialist output must link factual claims to approved business memory or evidence references.
- **DIR-009:** The Director must rank work by outcome, effort, risk, and available evidence, and must state when evidence is insufficient.
- **DIR-010:** Logical roles need not be separate processes or providers. Start with the smallest arrangement that passes quality and cost evaluations.

## Supervised acquisition workflow and action definitions (D-044, accepted)

- **ACT-001:** The first complete workflow must run: prepare package → approve exact objects and caps → create paused objects → verify → activation approval → activate → monitor → reconcile → learn.
- **ACT-002:** `paid.campaign.pause`, `paid.campaign.resume`, `paid.budget.decrease`, and `paid.budget.increase` must be four separate action definitions with separate risk assessments and gates.
- **ACT-003:** Core launch actions are `paid.campaign.create_paused`, `paid.campaign.activate`, `paid.campaign.pause`, `paid.campaign.resume`, and `cms.draft.create` where the chosen workflow uses that CMS.
- **ACT-004:** Conditional actions are `paid.campaign.edit`, `paid.budget.decrease`, `paid.budget.increase`, `email.follow_up.send`, and `paid.conversion.upload`. Each has its own readiness gate and is enabled only when the chosen funnel needs it.
- **ACT-005:** Approval must bind the exact package, account, destination, content version hash, caps, policy version, and expiry. A material change to any bound element requires new approval.
- **ACT-006:** Account state and approval must be revalidated before every activation. Seven days is the provisional maximum approval age, subject to revision from evidence.
- **ACT-007:** Available budget must be reserved across concurrent proposals and workers. Pending reservations count against limits. The system must record `dispatched` in the local ledger before it sends the provider request, and must keep dispatched and uncertain exposure counted across every failure. After independent provider reconciliation verifies activation, the system must update the local ledger atomically from `dispatched` to `committed` without reducing counted exposure. No transaction spans the application database and the provider API. Expiry alone must never release funds after dispatch or during an uncertain result.
- **ACT-008:** A timeout after a provider write is an uncertain result. The system must reconcile provider state before any retry and must never create duplicate campaigns, messages, or publications.
- **ACT-009:** The system must record recovery actions without promising full reversal. Incurred spend and public impressions cannot be recalled.
- **ACT-010:** `paid.conversion.upload` must validate event identity, mapping, duplicates, permissions, diagnostics, and the current official route. It uploads the reliable approved outcome, not automatically the deepest event.
- **ACT-011:** Every organization launches at autonomy level L1 for every enabled action class. L2 and L3 are later gates per action and per customer (D-048).
- **ACT-012:** Global, organization, provider, and action kill switches must stop new dispatch and cancel queued work. An in-flight provider request may still finish; the system must reconcile its result and offer an approved recovery action. The product must not promise that all active external work stops immediately.

## Learning contract (D-047, accepted)

- **LRN-001:** Every proposal must record a prediction before approval: metric, direction, range, observation window, and confidence, or an explicit insufficient-evidence state.
- **LRN-002:** An append-only learning record must capture each completed task and experiment from the first task: business conditions, decision, inputs, versions, authority, execution, human feedback with reason, mature outcomes, conclusion, and applicability.
- **LRN-003:** Customer facts, customer preferences, marketing hypotheses, supported practices, skills and prompts, model routing, and execution autonomy must be separate learning layers with separate promotion authority.
- **LRN-004:** Silence must never approve a change. Customer-confirmed facts remain authoritative until the customer corrects them.
- **LRN-005:** Skill and prompt promotion must require offline evaluation on a held-out set plus operator approval. Model-routing changes must require operator approval and a regression evaluation.
- **LRN-006:** A critical safety failure must block promotion regardless of average scores. Previous versions must remain restorable.
- **LRN-007:** Shadow proposals, including unexecuted alternatives, may receive offline review of reasoning, evidence use, and permission compliance. Outcome calibration must apply only to the action actually executed, against its observed result. No shadow proposal may claim hypothetical revenue.
- **LRN-008:** The system must separate observed business results, platform attribution, and causal evidence in every learning conclusion.
- **LRN-009:** The system must not promote a creative or tactic from one click, one lead, or a short unstable window. Conversion delay, lead qualification, seasonality, and concurrent changes must be accounted for.
- **LRN-010:** Failed and inconclusive experiments must be recorded. Conclusions must retire when their source conditions change.
- **LRN-011:** New ideas must enter through approved first-party material and a weekly research task with source dates and verification status. Retrieved content must never update production skills directly.
- **LRN-012:** Customer learning must stay inside the customer's tenant. Shared learning across customers is deferred until a separately approved data-use process exists.

## Proposals, approvals, and autonomy

- **APR-001:** Every proposed external action must include reason, evidence, expected effect, confidence, cost exposure, risk class, expiry, and rollback or mitigation.
- **APR-002:** Approval must bind to an immutable proposal snapshot and policy version.
- **APR-003:** Material proposal or platform-state drift must invalidate approval.
- **APR-004:** The pilot must approve one action at a time. Batch and multi-platform approval are expansion requirements. Exception under D-044 (accepted): one approval may bind the creation and activation of one campaign package on one account when verification passes between the two steps (APR-014). Approving unrelated packages, several platforms, or several accounts in one decision remains batch approval and stays expansion scope.
- **APR-005:** Rejection, modification, deferral, and explanation requests must be supported and captured as learning signals.
- **APR-006:** Bounded autonomy is expansion scope. The pilot must execute only actions with current human approval.
- **APR-007:** Every enabled pilot mutation must require human approval. Public publishing and broader paid mutations need later gates.
- **APR-008:** A global kill switch and per-connector kill switches must disable mutations while preserving monitoring.
- **APR-009:** If bounded autonomy is later enabled, it must notify designated users and remain reversible where possible.
- **APR-010:** The policy engine, not the agent, must make the final authorization decision.
- **APR-011:** The same immutable proposal and approval state must appear in AI Reach and the approval queue.
- **APR-012:** An uncertain external result must block blind retry until reconciliation completes.
- **APR-013 (D-044):** A single decision inbox must present each item with the finished preview, proposed destination, reason, cost, expected effect, uncertainty, and recovery limits.
- **APR-014 (D-044):** One explicit approval may cover package creation and activation together when it binds both steps and verification passes. The owner must not be asked to approve every API call.
- **APR-015 (D-048):** Autonomy levels are L0 observe, L1 propose, L2 bounded, and L3 delegated, defined per action class and per organization. Launch is at L1. L2 and L3 need customer authorization and action-specific evidence; a critical failure blocks promotion; demotion is one switch.
- **APR-016 (D-048):** No numeric count or acceptance rate is a universal mandatory floor for autonomy. Customer acceptance is a UX metric and cannot substitute for action correctness, business quality, or permission.

## Data and measurement

- **DAT-001:** The warehouse or canonical store must be the analytical source of truth; platforms remain delivery-state systems of record.
- **DAT-002:** Raw source data must be immutable or append-only and traceable to connector requests.
- **DAT-003:** Canonical metrics must be versioned, owned, tested, and accompanied by freshness and completeness indicators.
- **DAT-004:** The pilot must link source metrics to the selected CRM's qualified leads, booked calls, closed-won deals, and booked revenue.
- **DAT-005:** Reports must distinguish observed facts, modeled attribution, forecasts, and agent interpretation.
- **DAT-006:** Missing, delayed, duplicated, conflicting, or corrected data must be explicit.
- **DAT-007:** The system must prevent optimization when required data exceeds freshness or quality thresholds.
- **DAT-008:** Users must be able to trace an aggregate metric to source observations and definitions.
- **DAT-009:** Booked revenue must mean the approved CRM amount recorded when a deal reaches the configured closed-won stage.
- **DAT-010:** The organization must approve CRM stage mapping, currency, event date, backfill, delay, corrections, duplicates, cancellations, and missing-value rules.
- **DAT-011:** Reports must separate direct first-party evidence, platform-reported attribution, modeled attribution, and unknown source.
- **DAT-012:** The pilot must preserve unattributed outcomes instead of forcing them into a channel.
- **DAT-013 (D-043):** An approved CSV outcome export is an acceptable outcome source when its limits and age are visible in the briefing. A snapshot import must never invent historical stage transitions. A CRM migration is not a prerequisite for the first workflow.
- **DAT-014 (D-045):** Sources are required only for enabled decisions that need them. GA4 and Search Console reads are required when a selected decision depends on them, not by default.

## Opportunities and experiments

- **EXP-001:** Every legal and potentially useful tactic may be retained in an opportunity registry even when unproven.
- **EXP-002:** Each opportunity must record evidence strength, expected upside, legal status, platform status, prerequisites, effort, risk, reversibility, and owner.
- **EXP-003:** Unsupported tactics must not be presented as proven.
- **EXP-004:** Experiments must define hypothesis, population, variants, primary metric, guardrails, budget, sample rule, duration, and stopping conditions before launch.
- **EXP-005:** Experiment analysis must account for qualified outcomes and uncertainty rather than declaring a winner from early platform metrics.
- **EXP-006:** Illegal, unauthorized, deceptive, or enforcement-evasive mechanisms must be blocked while their legitimate underlying objectives may be pursued through alternatives.
- **EXP-007:** Results and corrections must update the opportunity's evidence status and future recommendation eligibility.

## User experience

- **UX-001:** Core workflows must be usable without prompt engineering.
- **UX-002:** AI Reach must be the default signed-in pilot workspace and show chat beside one outcome dashboard.
- **UX-003:** A unified approval queue and activity history must be available; the editorial calendar is expansion scope.
- **UX-004:** AI Reach must show evidence, assumptions, proposals, approvals, progress, results, and limitations in plain language.
- **UX-005:** Users must be able to inspect exact before-and-after state and agent/action history.
- **UX-006:** The system must provide requested, daily, and weekly briefings through AI Reach.
- **UX-007:** Interfaces must meet WCAG 2.2 AA and provide keyboard-complete approval workflows.
- **UX-008:** Mobile layouts must support AI Reach chat, alerts, and approvals.
- **UX-009:** The onboarding experience must be visually engaging, warm, and modern, with clear hierarchy, generous whitespace, meaningful progress, and accessible interactions.

## Operations and security

- **OPS-001:** Long-running workflows must be durable, retryable, observable, and resumable after process failure.
- **OPS-002:** Connector retries must respect quotas, backoff, idempotency, and platform request identifiers.
- **OPS-003:** Every workflow must expose status, owner, last progress, next retry, and terminal reason.
- **OPS-004:** Alerts must distinguish business anomalies, data failures, connector failures, policy blocks, and security incidents.
- **OPS-005:** Backups, restore tests, deployment rollback, and disaster recovery procedures must be documented and tested.
- **OPS-006:** The initial Vercel and Supabase service must use reproducible configuration, isolated environments, immutable builds, safe migrations, and rollback controls.
- **OPS-007:** Pooled tenants must have enforceable workload, concurrency, storage, workflow, model, and tool limits that preserve tenant fairness.
- **OPS-008:** If a dedicated profile is later enabled, it must work in an operator-owned or client-owned AWS account without a product code fork.
- **OPS-009:** Usage events must be immutable, tenant-scoped, idempotent, and reconcilable to provider cost. Invoice reconciliation applies after billing is enabled.
- **OPS-010:** Offboarding must disable mutations, revoke connections and enabled infrastructure roles, export agreed data, and execute the applicable retention or deletion policy.
- **OPS-011:** AWS, Hermes, Temporal, Postiz, Coolify, and separate workers must remain outside pilot release gates until a recorded trigger approves them.
- **SEC-001:** Long-lived secrets must remain in a managed secret store and never appear in prompts or ordinary logs.
- **SEC-002:** Read and mutation permissions must be separable per platform wherever supported.
- **SEC-003:** Authorization must be enforced server-side on every resource and tool invocation.
- **SEC-004:** Audit events must be append-only and tamper-evident.
- **SEC-005:** Personal and customer data must support provenance, minimization, retention, export, suppression, and deletion workflows.
- **SEC-006:** Platform terms and legal requirements must be represented as versioned policy inputs with human ownership.
- **SEC-007:** Cross-tenant and prompt-injection tests must be release blockers.
- **SEC-008:** Production mutation tools must use destination allowlists and explicit organization/account binding.
- **SEC-009:** If a dedicated profile is later enabled, it must isolate its database, storage, keys, secrets, workers, and infrastructure identities.
- **SEC-010:** If a hybrid connector is later enabled, it must initiate an outbound authenticated session and cannot own canonical state or authority.
- **SEC-011:** No agent or client browser may receive raw cloud, database, model-provider, or marketing-platform production secrets.
- **SEC-012:** Deployment profile, AWS account, region, edge connector, and third-party processor changes must be auditable and subject to authorized change control.

## MVP release criteria

The read-only release is complete when the foundation gates pass and the approved pilot sources produce one traceable outcome snapshot.

AI Reach must then explain the result, show its main limitation, and give ranked useful decisions (or an explicit quiet state) without external mutation access.

The pilot MVP is complete when CMS draft creation, approved lead follow-up, and one campaign pause/resume path pass separate supervised-action gates (D-037, earlier scope).

The first complete workflow (D-044, accepted) is complete when a nontechnical owner approves a complete campaign package, the system creates, verifies, activates, monitors, and reconciles it within the supported boundaries, and a later outcome review with correct limitations exists. Under D-043 and D-044 the required sources and actions follow the Pilot Scope Record: CMS draft applies only when the chosen workflow uses that CMS, lead follow-up and outcome upload only when the chosen funnel needs them, and AI-answer sampling only when that capability is enabled.

A first paid supervised pilot may start after the first complete workflow's execution gates and minimum billing, support, recovery, and cancellation controls pass. Broader launch readiness needs repeatability evidence from three to five similar customers (D-049).

The selected outcome source (CRM, or an approved CSV export under DAT-013) must reconcile qualified leads, booked calls, closed-won deals, and booked revenue under approved definitions, with its limits and age visible.

Critical tenant, security, agent, approval, audit, backup, restore, and incident gates must pass.

The sales-trainer pilot user must complete the core journey without developer, database, provider-console, or agent-runtime access.

Seven paid and seven organic connector coverage does not block this release. Those connectors remain expansion work.
