# Agentic Marketing System — Development Documentation

## Purpose

This directory is the authoritative build specification for the agentic marketing system. It translates the bookmark research and the owner's subsequent product decisions into an implementation-ready contract.

Research evidence remains under [`docs/agentic-marketing`](../agentic-marketing/README.md). When a research-era recommendation conflicts with this directory, this directory controls product scope and implementation.

## Product definition

The product is a subscription marketing service for nontechnical business owners. One Marketing Director turns plain-language goals into planned, approved, executed, and measured marketing work. Bounded specialists do channel work under the Director. The owner has one relationship with the Director and never manages specialists, prompts, or agent infrastructure.

AI Reach is a feature inside the product. It is the chat workspace where the Director briefs the owner, shows evidence, and presents decisions.

The first complete workflow covers one customer type, one offer, one paid channel, one website, and one outcome source. Expert-led services and Google Ads are the starting hypothesis. Milestone A confirms them against the first customer's need (D-043, accepted).

The first useful release is read-only. It connects approved website, analytics, search, advertising, and outcome sources. Implemented today: Google has OAuth, account discovery, and a campaign report read; Meta has OAuth and asset discovery only, with no campaign reporting. Neither is verified in a target environment. An organization connects the channel its workflow uses.

The Director's daily briefing shows ranked decisions, at most three, or states that no decision needs attention.

The first complete workflow then runs the supervised acquisition workflow: prepare a campaign package, approve the exact objects and caps, create paused objects, verify them, obtain activation approval, activate, monitor, reconcile, and learn (D-044, accepted amendment to D-037, 2026-10-04; not implemented).

D-044 (accepted 2026-10-04) now defines the action-design boundary. The three D-037 pilot actions remain part of it. None of them is implemented; no provider write exists in the code:

- create a CMS draft without publishing it;
- send one approved lead follow-up after consent checks;
- pause one approved advertising campaign with a tested resume path.

Every external action needs deterministic policy, approval, execution, reconciliation, audit, and a kill switch.

The initial pooled service uses the current Next.js control plane on Vercel with managed Supabase. The model provider is organization-selected behind the application-owned gateway (D-039, D-041). Resend remains the managed email service.

Hermes, Temporal, Postiz, Coolify, broad specialist teams, and AWS remain trigger-based target components. They are not pilot release gates.

The seven paid and seven organic platform plans remain expansion specifications. They do not block the first complete workflow.

Availability still depends on eligible client accounts, granted permissions, and provider approval. Capability flags must show every limit honestly.

## Agreed design versus implemented behavior

Documents in this directory describe three kinds of statement:

- **Implemented behavior**: supported by source code in `app/`, `lib/`, and `prisma/`. The system-architecture document's current-implementation boundary lists it, with the audited source revision.
- **Accepted design**: decisions with status `accepted` in the decision register. They control implementation. Since 2026-10-04 this includes D-043 to D-049 (proposed by Codex and Claude, approved by Rob with "I approve all 7 of those."), the DIR, ACT, and LRN requirement families, and the requirements marked with those decision IDs. Accepted design is still unimplemented where the current-implementation boundary says so. No checkbox, gate, or evidence item becomes complete because a decision is accepted.
- **Proposed design**: decisions with status `proposed` in the decision register (today D-029 and D-031). They await an owner or evidence decision.

### Scope before and after 2026-10-04

| Topic | Scope before 2026-10-04 (D-032, D-037) | Accepted scope since 2026-10-04 (D-043, D-044) |
|---|---|---|
| Sources | website/CMS, GA4, Search Console, Google Ads and/or Meta Ads, one selected CRM; calendar and email conditional | the sources named in the Pilot Scope Record: one selected paid channel, one website, one outcome source (CRM or approved CSV); GA4, Search Console, CMS, calendar, and email only when an enabled decision or action needs them |
| Actions | CMS draft, approved lead follow-up, campaign pause with resume | create-paused, activate, pause, resume as core; CMS draft and lead follow-up when selected; edit, budget decrease, budget increase, outcome upload behind their own gates |
| Briefing | exactly three actions (D-033) | ranked decisions, at most three, or an explicit quiet state |
| AI-answer sampling | part of the AI Reach read-only release | behind its own enabled-capability gate; not a launch prerequisite |
| Unchanged | provider authorization, foundation (F0, F1), restore, owner, and observation safeguards | the same safeguards |

The joint delivery plan at `.Codex/plans/plan-joint-marketing-director-delivery.md` assigns build tasks. The shared progress document at `delivery/shared-progress.md` records observed work status. The collaboration guide at `collaboration/README.md` defines ownership, reviews, and handoffs.

## Documentation map

### Product

- [Product brief and scope](./product/product-brief.md)
- [Personas and user journeys](./product/personas-and-user-journeys.md)
- [Product requirements](./product/product-requirements.md)
- [UX and information architecture](./product/ux-and-information-architecture.md)
- [Client onboarding form](./product/client-onboarding-form.md)
- [Opportunity and experiment policy](./product/opportunity-and-experiment-policy.md)

### Architecture

- [System architecture](./architecture/system-architecture.md)
- [Hermes multi-agent architecture](./architecture/hermes-multi-agent-architecture.md)
- [Agent orchestration architecture](./architecture/agent-orchestration-architecture.md)
- [Cloud hosting and service delivery](./architecture/cloud-hosting-and-service-delivery.md)
- [Domain data model](./architecture/domain-data-model.md)
- [API, event, and tool contracts](./architecture/api-event-and-tool-contracts.md)
- [Platform integration architecture](./architecture/platform-integration-architecture.md)

### Capabilities

- [Paid advertising specification](./capabilities/paid-advertising.md)
- [Organic publishing specification](./capabilities/organic-publishing.md)
- [Creative and content pipeline](./capabilities/creative-and-content-pipeline.md)
- [AI Reach](./capabilities/ai-reach.md)
- [Measurement, attribution, and experimentation](./capabilities/measurement-attribution-and-experimentation.md)
- [Platform capability verification matrix](./capabilities/platform-capability-matrix.md)

### Quality and operations

- [Security, privacy, compliance, and autonomy](./quality/security-privacy-compliance-and-autonomy.md)
- [Testing and agent evaluation](./quality/testing-and-agent-evaluation.md)
- [Deployment, environments, and operations](./quality/deployment-environments-and-operations.md)
- [Observability and incident response](./quality/observability-and-incident-response.md)

### Delivery and governance

- [Implementation roadmap](./delivery/implementation-roadmap.md)
- [Phase 0 readiness workbook](./delivery/phase-0-readiness-workbook.md)
- [Pilot onboarding and launch](./delivery/pilot-onboarding-and-launch.md)
- [Risk register](./delivery/risk-register.md)
- [Decision register](./governance/decision-register.md)
- [Requirements traceability](./governance/requirements-traceability.md)
- [Open questions](./governance/open-questions.md)

### Joint delivery coordination

- [Joint delivery plan](../../.Codex/plans/plan-joint-marketing-director-delivery.md) — task ownership and dependencies (Codex-owned file).
- [Shared progress](./delivery/shared-progress.md) — observed work status, updated only through the shared helper.
- [Collaboration guide](./collaboration/README.md) — ownership, notes, reviews, and handoffs.

## Required reading order

1. Product brief
2. Product requirements
3. UX and information architecture
4. AI Reach
5. Implementation roadmap (including the milestone overlay)
6. System architecture
7. Agent orchestration architecture (Director, specialists, and runtime)
8. Paid advertising (action definitions and the acquisition workflow)
9. Measurement, attribution, and experimentation (predictions and learning)
10. Domain data model
11. Platform integration architecture
12. Security and autonomy
13. Testing and agent evaluation
14. Other capability specifications
15. Hermes and cloud expansion architecture

## Authority and change control

- Product decisions are recorded in the decision register.
- Requirements use stable identifiers and are mapped in the traceability document.
- Material scope, data, security, or autonomy changes require a new decision entry and corresponding requirement updates.
- Platform capability claims must be verified against current official documentation before connector implementation and again before release.
- Generated agent instructions and skills are versioned production artifacts with owners, evals, and rollback.

## Definition of implementation-ready

A work item is implementation-ready only when it identifies its requirement IDs, tenant and permission boundary, data inputs and outputs, API or event contract, failure behavior, observability, test evidence, rollout gate, and rollback behavior.
