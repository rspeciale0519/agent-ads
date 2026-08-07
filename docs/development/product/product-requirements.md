# Product Requirements

## Requirement conventions

- `P-*`: product and tenant requirements.
- `ONB-*`: onboarding and business context.
- `PAID-*`: paid advertising.
- `ORG-*`: organic publishing.
- `AGT-*`: Hermes and agent behavior.
- `APR-*`: proposals, approvals, and autonomy.
- `DAT-*`: data and measurement.
- `EXP-*`: opportunities and experiments.
- `UX-*`: user experience.
- `OPS-*`: operations and reliability.
- `SEC-*`: security, privacy, and compliance.

`Must` denotes MVP acceptance. `Should` denotes an MVP target that may degrade gracefully but cannot be silently omitted.

## Platform and tenancy

- **P-001:** The system must isolate every organization's users, data, secrets, agents, skills, policies, files, and execution history.
- **P-002:** Users must have explicit organization roles and granular permissions.
- **P-003:** A single user may belong to multiple organizations without context leakage.
- **P-004:** The system must support an agency administrator model without granting implicit access to client secrets or content.
- **P-005:** Every query, job, tool call, event, and audit record must carry an organization identifier.
- **P-006:** The system must expose connector capability and health status per organization and account.

## Onboarding and context

- **ONB-001:** Guided onboarding must collect business, offer, audience, geography, economics, funnel, brand, legal, and operating constraints.
- **ONB-002:** Users must connect accounts through authorized credential flows and see requested permissions before granting access.
- **ONB-003:** The system must perform a read-only capability and data-health audit before enabling execution.
- **ONB-004:** Hermes may infer a Business and Marketing Profile, but an authorized user must confirm material assumptions.
- **ONB-005:** Context must be versioned with source, owner, confidence, effective date, and review date.
- **ONB-006:** Corrections must supersede prior context without erasing history and must feed agent evaluation.
- **ONB-007:** Qualified lead, customer, revenue, margin, and other objective definitions must be confirmed before optimization begins.
- **ONB-008:** Phase 0 must provide a branded, shareable, client-facing onboarding form rather than require a live interview for initial intake.
- **ONB-009:** The form must support clear progress, save/resume, section navigation, and a final review before submission.
- **ONB-010:** The form must use conditional questions and friendly validation to minimize cognitive load while preserving required business context.
- **ONB-011:** The form must support safe, tenant-scoped uploads for brand and marketing materials with scanning, provenance, and review state.
- **ONB-012:** The form must never request passwords, API keys, refresh tokens, or other secrets.
- **ONB-013:** The form must clearly explain privacy, access, retention, and the separate secure account-connection process.
- **ONB-014:** A submission must create a versioned intake record, review task, client confirmation, and proposed-profile workflow.

## Paid advertising

- **PAID-001:** The MVP must support Meta, Google, Microsoft, LinkedIn, TikTok, Reddit, and X advertising connectors.
- **PAID-002:** A user must be able to select any one or multiple eligible paid platforms for a campaign.
- **PAID-003:** The system must provide a common campaign brief while retaining platform-native objectives, structures, targeting, creative, and validation.
- **PAID-004:** Each connector must discover accessible accounts and declare supported read/write capabilities.
- **PAID-005:** Each connector must ingest campaign hierarchy, delivery state, spend, performance, creative metadata, and available conversion data.
- **PAID-006:** Each connector must create an external-state-free campaign draft and validate it before approval.
- **PAID-007:** Approved executors must support launch, pause, resume, and permitted edits to the extent the official API and account allow.
- **PAID-008:** The system must never imply support for a platform operation that the current account or API cannot perform.
- **PAID-009:** Cross-platform plans must show total and per-platform budgets, assumptions, expected role, and stop conditions.
- **PAID-010:** Budget allocation recommendations must use canonical business outcomes and must not move money without the required approval or autonomy policy.
- **PAID-011:** Platform-created, externally edited, and agent-created changes must be distinguishable.
- **PAID-012:** Customer-list or sensitive audience operations must be blocked until provenance, permission, eligibility, and policy checks pass.
- **PAID-013:** Every state-changing request must use a separate least-privilege executor and idempotency key.
- **PAID-014:** The system must reconcile requested versus actual platform state after execution.

## Organic publishing

- **ORG-001:** The MVP must support LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and authorized Reddit publishing.
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

## Agent system

- **AGT-001:** Hermes must operate through an application-owned adapter; the application remains the authority for state and permissions.
- **AGT-002:** The system must support a chief orchestrator and bounded specialist roles with separate instructions, skills, memory scopes, and tool allowlists.
- **AGT-003:** Agent output that may change external state must be a typed proposal, never a direct side effect.
- **AGT-004:** Every agent run must record role, model/provider, skill versions, inputs, evidence references, outputs, token/cost data where available, and result status.
- **AGT-005:** Agent prompts and skills must be versioned, evaluated, reviewable, and reversible.
- **AGT-006:** External content must be marked untrusted and unable to override policy or system instructions.
- **AGT-007:** An agent must abstain or request clarification when required evidence, freshness, permission, or confidence is insufficient.
- **AGT-008:** Specialist-agent disagreement must be preserved and resolved through an explicit judging or human decision step.
- **AGT-009:** No agent may receive unrestricted cross-tenant or cross-platform credentials.
- **AGT-010:** Deterministic jobs must not invoke a model when ordinary code can satisfy the contract.

## Proposals, approvals, and autonomy

- **APR-001:** Every proposed external action must include reason, evidence, expected effect, confidence, cost exposure, risk class, expiry, and rollback or mitigation.
- **APR-002:** Approval must bind to an immutable proposal snapshot and policy version.
- **APR-003:** Material proposal or platform-state drift must invalidate approval.
- **APR-004:** Users must approve all, selected platforms, or individual actions where dependencies permit.
- **APR-005:** Rejection, modification, deferral, and explanation requests must be supported and captured as learning signals.
- **APR-006:** Autonomy must be configurable by organization, platform, account, action type, risk class, budget, schedule, and duration.
- **APR-007:** The default launch mode for public publishing and paid mutations must require approval.
- **APR-008:** A global kill switch and per-connector kill switches must disable mutations while preserving monitoring.
- **APR-009:** Bounded autonomous actions must notify designated users and remain reversible where possible.
- **APR-010:** The policy engine, not the agent, must make the final authorization decision.

## Data and measurement

- **DAT-001:** The warehouse or canonical store must be the analytical source of truth; platforms remain delivery-state systems of record.
- **DAT-002:** Raw source data must be immutable or append-only and traceable to connector requests.
- **DAT-003:** Canonical metrics must be versioned, owned, tested, and accompanied by freshness and completeness indicators.
- **DAT-004:** Platform metrics must link to CRM, commerce, pipeline, margin, or revenue outcomes where available.
- **DAT-005:** Reports must distinguish observed facts, modeled attribution, forecasts, and agent interpretation.
- **DAT-006:** Missing, delayed, duplicated, conflicting, or corrected data must be explicit.
- **DAT-007:** The system must prevent optimization when required data exceeds freshness or quality thresholds.
- **DAT-008:** Users must be able to trace an aggregate metric to source observations and definitions.

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
- **UX-002:** The home command center must show spend, qualified outcomes, revenue, material changes, pending decisions, data health, and recommended next actions.
- **UX-003:** A unified approvals inbox and editorial calendar must be available.
- **UX-004:** Conversational interaction must cite project evidence and convert state-changing requests into proposals.
- **UX-005:** Users must be able to inspect exact before-and-after state and agent/action history.
- **UX-006:** The system must provide daily operational and weekly executive summaries.
- **UX-007:** Interfaces must meet WCAG 2.2 AA and provide keyboard-complete approval workflows.
- **UX-008:** Mobile layouts must support alerts and approvals; complex campaign construction may remain desktop-first.
- **UX-009:** The onboarding experience must be visually engaging, warm, and modern, with clear hierarchy, generous whitespace, meaningful progress, and accessible interactions.

## Operations and security

- **OPS-001:** Long-running workflows must be durable, retryable, observable, and resumable after process failure.
- **OPS-002:** Connector retries must respect quotas, backoff, idempotency, and platform request identifiers.
- **OPS-003:** Every workflow must expose status, owner, last progress, next retry, and terminal reason.
- **OPS-004:** Alerts must distinguish business anomalies, data failures, connector failures, policy blocks, and security incidents.
- **OPS-005:** Backups, restore tests, deployment rollback, and disaster recovery procedures must be documented and tested.
- **SEC-001:** Long-lived secrets must remain in a managed secret store and never appear in prompts or ordinary logs.
- **SEC-002:** Read and mutation permissions must be separable per platform wherever supported.
- **SEC-003:** Authorization must be enforced server-side on every resource and tool invocation.
- **SEC-004:** Audit events must be append-only and tamper-evident.
- **SEC-005:** Personal and customer data must support provenance, minimization, retention, export, suppression, and deletion workflows.
- **SEC-006:** Platform terms and legal requirements must be represented as versioned policy inputs with human ownership.
- **SEC-007:** Cross-tenant and prompt-injection tests must be release blockers.
- **SEC-008:** Production mutation tools must use destination allowlists and explicit organization/account binding.

## MVP release criteria

The MVP is complete only when all seven paid and all seven organic connectors meet their documented minimum capability or explicitly display an account/API eligibility block; the full onboarding, context, proposal, approval, publishing, campaign, measurement, experiment, agent, audit, and kill-switch loops work end to end; critical security and agent-evaluation gates pass; and the pilot business can operate through the product without direct Hermes or developer-console access.
