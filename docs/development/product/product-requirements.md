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

`Must` denotes pilot MVP acceptance unless the text marks the requirement as expansion or conditional. `Should` is a target that may degrade visibly.

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

### Expansion requirements

- Microsoft, LinkedIn, TikTok, Reddit, and X advertising are expansion connectors.
- Campaign creation, budget changes, bid changes, audience changes, creative upload, and cross-platform allocation are expansion actions.
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
- **AIR-011:** Each briefing must show one outcome summary, one important data limitation, and exactly three evidence-linked actions.
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

## Proposals, approvals, and autonomy

- **APR-001:** Every proposed external action must include reason, evidence, expected effect, confidence, cost exposure, risk class, expiry, and rollback or mitigation.
- **APR-002:** Approval must bind to an immutable proposal snapshot and policy version.
- **APR-003:** Material proposal or platform-state drift must invalidate approval.
- **APR-004:** The pilot must approve one action at a time. Batch and multi-platform approval are expansion requirements.
- **APR-005:** Rejection, modification, deferral, and explanation requests must be supported and captured as learning signals.
- **APR-006:** Bounded autonomy is expansion scope. The pilot must execute only actions with current human approval.
- **APR-007:** Every enabled pilot mutation must require human approval. Public publishing and broader paid mutations need later gates.
- **APR-008:** A global kill switch and per-connector kill switches must disable mutations while preserving monitoring.
- **APR-009:** If bounded autonomy is later enabled, it must notify designated users and remain reversible where possible.
- **APR-010:** The policy engine, not the agent, must make the final authorization decision.
- **APR-011:** The same immutable proposal and approval state must appear in AI Reach and the approval queue.
- **APR-012:** An uncertain external result must block blind retry until reconciliation completes.

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

AI Reach must then explain the result, show its main limitation, and give exactly three useful actions without external mutation access.

The pilot MVP is complete when CMS draft creation, approved lead follow-up, and one campaign pause/resume path pass separate supervised-action gates.

The selected CRM must reconcile qualified leads, booked calls, closed-won deals, and booked revenue under approved definitions.

Critical tenant, security, agent, approval, audit, backup, restore, and incident gates must pass.

The sales-trainer pilot user must complete the core journey without developer, database, provider-console, or agent-runtime access.

Seven paid and seven organic connector coverage does not block this release. Those connectors remain expansion work.
