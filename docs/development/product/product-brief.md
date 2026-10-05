# Product Brief and Scope

## Vision

Give a nontechnical business owner a capable, supervised marketing department without requiring code, AI knowledge, or prompt skills.

## Product promise

> Tell us your business goals. Your Marketing Director plans the work, manages channel specialists, and brings you clear decisions for approval.

The system converts plain-language business goals and first-party outcomes into planned work, clear decisions, approved marketing actions, and measured results.

One Marketing Director is the owner's single relationship with the product. It maintains the plan, coordinates bounded specialists, and explains work in plain language. The owner never manages separate specialists.

AI Reach is a feature inside the product. It is the main chat workspace for the pilot, where the Director briefs the owner and connects discovery evidence to business results.

The goal is to take over most execution work of a marketing team. Whether it does is a pilot result, measured by owner time, task quality, correction burden, and qualified outcomes. The product does not claim to replace a full marketing team. The owner remains the authority for business facts, offers, budgets, sensitive claims, and major commitments.

Direction: D-043, accepted by the owner on 2026-10-04.

## Product principles

1. Optimize business outcomes, not platform vanity metrics.
2. Use agents for judgment and ordinary code for authority and invariants.
3. Give every material recommendation evidence, confidence, cost, risk, and a rollback plan.
4. Earn autonomy separately for each organization, platform, action type, and risk tier.
5. Generate platform-native work rather than blindly cross-posting or flattening platform differences.
6. Preserve every legal and potentially useful tactic in an opportunity registry, even when evidence is weak.
7. Never execute an illegal, unauthorized, deceptive, or enforcement-evasive mechanism.
8. Make all state-changing activity attributable, idempotent, reviewable, and recoverable where the platform permits.
9. Treat external content as untrusted data, never as system instructions.
10. Hide agent infrastructure from nontechnical users without hiding evidence or control.
11. Make the useful outcome visible before adding more platforms or agent roles.
12. Give the user three clear actions instead of an unbounded task list.

## Primary customer

The first pilot customer is a sales trainer, public speaker, or similar expert-led service business. This is the starting hypothesis; milestone A confirms it against the first customer's need (D-043).

The business has an existing offer, a website, an addressable audience, and enough sales activity to measure outcomes.

The primary user is the owner. An assistant or marketer can help, but the owner must not need technical training.

The pilot outcome loop is discovery, website visit, qualified lead, booked call, closed-won deal, and booked revenue. Booked revenue stays distinct from collected cash.

The long-term customer is any owner-led service business with a measurable lead-to-revenue path.

### Expansion to other business types

The core platform serves other business types through explicit playbooks. A playbook defines suitable goals, required data, channel choices, tasks, and decision rules. Each playbook needs its own validation before the product advertises support.

| Business type | Primary outcomes | Required changes from the first playbook |
|---|---|---|
| Expert-led services | Qualified calls, accepted proposals, booked revenue | Initial playbook |
| Local services | Qualified calls, booked jobs, service capacity, margin | Geography, call quality, opening hours, dispatch capacity |
| Online commerce | Purchases, contribution margin, repeat purchases | Product feeds, stock, refunds, shipping, customer value |
| B2B software | Qualified demos, activation, retained customers | Longer sales cycles, product events, account-level outcomes |
| Creators and individuals | Subscribers, bookings, sales, sponsorship outcomes | Personal voice, audience quality, content rights, offer maturity |

## Problems solved

- Fragmented paid and organic work across platforms.
- Slow analysis and inconsistent follow-through.
- Creative fatigue and insufficient testing.
- Platform metrics disconnected from lead quality, pipeline, margin, and revenue.
- Website and business information that AI search tools cannot find or describe correctly.
- Too many dashboards and unclear next steps.
- Marketing knowledge trapped in people, prompts, and ad hoc documents.
- Risky automation without approval, audit, or rollback.
- Nontechnical users unable to operate advanced agent systems.

## MVP scope

### First useful release: read-only

This list is the earlier D-032 scope. Under D-043 (accepted 2026-10-04), the required sources follow the Pilot Scope Record: one selected paid channel, one website, and one outcome source (CRM or approved CSV). GA4, Search Console, CMS, calendar, and email are required only when an enabled decision needs them.

- Guided onboarding through AI Reach and structured cards.
- Versioned business, offer, audience, claim, goal, and outcome context.
- Website and CMS reads.
- Google Analytics 4 and Google Search Console reads.
- Google Ads and Meta Ads read adapters, with either or both connected per Pilot Scope Record.
- One CRM read adapter selected in the approved Pilot Scope Record.
- Conditional calendar and email reads when they provide required outcome evidence.
- One outcome dashboard and a plain-language AI Reach conversation.
- A daily or requested briefing with ranked, evidence-linked decisions (at most three) or an explicit statement that no decision needs attention.
- No external mutation credential or tool.

Implemented today: Google has OAuth, account discovery, and a campaign report read; Meta has OAuth and asset discovery only, with no campaign reporting. An organization connects the channel its workflow uses. One paid channel is enough for the first complete workflow.

### Pilot MVP: supervised actions (D-037, accepted)

- Create an approved CMS draft without public publishing.
- Send an approved lead follow-up after consent and suppression checks.
- Pause one approved advertising campaign through one provider and account.
- Resume the campaign as rollback when current platform state permits it.
- Record the proposal, approval, execution, external result, and business outcome.

### First complete workflow: supervised acquisition (D-044, accepted amendment to D-037)

- The Director prepares a complete campaign package from the approved business profile, offer, and evidence.
- The owner approves the exact objects, destination, and caps.
- The system creates paused objects, verifies them against the package, obtains or validates activation approval, activates, monitors, and reconciles.
- Core actions: create paused campaign objects, activate, pause, resume, and CMS draft where the chosen workflow uses that CMS.
- Conditional actions with separate gates: existing-campaign edits, budget decrease, budget increase, eligible lead follow-up, and offline outcome upload.
- Every proposal carries a prediction before approval. Every completed task writes a learning record.

### Expansion scope

- Microsoft, LinkedIn, TikTok, Reddit, and X advertising.
- LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and Reddit publishing.
- Meta supervised campaign work, audience changes, and creative upload at volume.
- Additional CRM, analytics, CMS, booking, email, and AI-surface adapters.
- Broad content calendars, additional specialists, business-type playbooks, shared cross-customer learning, and bounded autonomy (L2 and L3).

## Explicit non-goals for the MVP

- Replacing legal counsel or declaring legal compliance through model output.
- Guaranteeing access to a platform API when a customer is not eligible.
- Browser-based circumvention of API or account restrictions.
- Unbounded autonomous spending, public publishing, audience upload, or outbound messaging.
- Requiring all planned advertising or organic channels before the pilot can deliver value.
- Treating controlled AI samples as a complete view of consumer answers.
- Promising search rankings, AI citations, recommendations, leads, or revenue.
- Treating an LLM's private reasoning as an audit record.
- Supporting every optional advertising network such as Amazon, Pinterest, or Snapchat without a separate scope decision.
- Building a generic CRM, DAM, video editor, or data warehouse when an integration suffices.

## Success outcomes

The product succeeds when it:

- Reduces time from insight to approved action.
- Increases the rate and quality of marketing experiments.
- Improves qualified acquisition efficiency, contribution margin, pipeline, or revenue.
- Produces content consistently without degrading brand or platform health.
- Gives users confidence that actions are explainable and controllable.
- Avoids unauthorized spend, cross-tenant access, silent publication, and unrecoverable agent actions.
- Lets the pilot owner complete onboarding and use AI Reach without technical help.
- Reconciles the selected outcome source's qualified leads, closed-won deals, and booked revenue, with its limits visible.
- Produces useful ranked decisions from fresh, traceable evidence, and says so when none is needed.
- Completes the read, recommend, approve, act, reconcile, and learn loop for each supervised action.
- Lets a nontechnical owner approve a complete campaign package and see verified results.
- Shows measurable owner time saved, operator support effort, correction burden, task quality, and qualified outcomes.

## Hosting and service model

The pilot uses the current Next.js control plane on Vercel with managed Supabase for PostgreSQL, Auth, and Storage.

The model provider is organization-selected behind an application-owned AI gateway, with Anthropic as the first adapter (D-039, D-041). Resend remains the transactional email provider.

The Marketing Director is the supervisor profile. One bounded paid-search specialist and draft-only content and creative support join it in the first complete workflow (D-043). The runtime is selected through a bounded prototype (D-046). Hermes and the full specialist catalog remain compatible target components behind the same gateway.

Self-hosted Hermes, Temporal, Postiz, Coolify, workers, and telemetry are not pilot prerequisites. Each needs a measured trigger and production-readiness gate.

AWS remains the scale, compliance, residency, and dedicated-deployment target.

Multi-tenant identity, authorization, data, secrets, policy, and audit are mandatory from the pilot.

## Commercial evolution

Commercial packaging separates one-time discovery/onboarding/setup, recurring platform hosting, optional recurring management/support/SLA, metered AI/media/tool usage, and dedicated/hybrid premiums. Exact plans, allowances, prices, markups, and SLAs remain to be set from pilot economics. Agency workspaces, white labeling, portfolio reporting, and reusable-but-isolated skill templates can build on the same tenant and entitlement model.

Launch one package with assisted setup. Keep advertising spend separate from service fees. Add a managed-support option only if customers need frequent human help. Avoid complex tiers before pilot usage reveals real cost differences (D-049).

Monthly contribution per customer is subscription revenue minus model and media costs, external tool and platform costs, variable hosting and storage, payment processing, and direct support labor. Setup labor, acquisition cost, and fixed engineering are tracked separately.

A configured Claude or ChatGPT workspace is a delivery method for assisted setup or an optional package. It is not the core architecture. The product requires application-owned tenant isolation, approval binding, budget reservation, durable execution records, audit, and repeatable operation across customers. A per-customer configured workspace does not provide these as one managed, repeatable service, and its continued operation depends on account features and operator knowledge (D-043).
