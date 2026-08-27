# Product Brief and Scope

## Vision

Give a nontechnical business owner a capable, supervised marketing department without requiring code, AI knowledge, or prompt skills.

## Product promise

The system converts plain-language business goals and first-party outcomes into clear recommendations and approved marketing actions.

AI Reach is a feature inside the product. It is the main chat workspace for the pilot and connects discovery evidence to business results.

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

The first pilot customer is a sales trainer, public speaker, or similar expert-led service business.

The business has an existing offer, a website, an addressable audience, and enough sales activity to measure outcomes.

The primary user is the owner. An assistant or marketer can help, but the owner must not need technical training.

The pilot outcome loop is discovery, website visit, qualified lead, booked call, closed-won deal, and booked revenue.

The long-term customer is any owner-led service business with a measurable lead-to-revenue path.

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

- Guided onboarding through AI Reach and structured cards.
- Versioned business, offer, audience, claim, goal, and outcome context.
- Website and CMS reads.
- Google Analytics 4 and Google Search Console reads.
- Google Ads and Meta Ads read adapters, with either or both connected per Pilot Scope Record.
- One CRM read adapter selected in the approved Pilot Scope Record.
- Conditional calendar and email reads when they provide required outcome evidence.
- One outcome dashboard and a plain-language AI Reach conversation.
- A daily or requested briefing with exactly three evidence-linked actions.
- No external mutation credential or tool.

Google Ads and Meta Ads both ship as read adapters. An organization can use Google only, Meta only, or both.

### Pilot MVP: supervised actions

- Create an approved CMS draft without public publishing.
- Send an approved lead follow-up after consent and suppression checks.
- Pause one approved advertising campaign through one provider and account.
- Resume the campaign as rollback when current platform state permits it.
- Record the proposal, approval, execution, external result, and business outcome.

### Expansion scope

- Microsoft, LinkedIn, TikTok, Reddit, and X advertising.
- LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and Reddit publishing.
- Full campaign creation, budget changes, audience changes, and creative upload.
- Additional CRM, analytics, CMS, booking, email, and AI-surface adapters.
- Broad content calendars, specialist-agent teams, and bounded autonomy.

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
- Reconciles the selected CRM's qualified leads, closed-won deals, and booked revenue.
- Produces three useful actions from fresh, traceable evidence.
- Completes the read, recommend, approve, act, reconcile, and learn loop for each supervised action.

## Hosting and service model

The pilot uses the current Next.js control plane on Vercel with managed Supabase for PostgreSQL, Auth, and Storage.

OpenAI remains the first model provider behind an application-owned AI gateway. Resend remains the initial transactional email provider.

One supervisor profile is enough for the first useful release. Hermes and specialist profiles remain compatible target components behind the same gateway.

Self-hosted Hermes, Temporal, Postiz, Coolify, workers, and telemetry are not pilot prerequisites. Each needs a measured trigger and production-readiness gate.

AWS remains the scale, compliance, residency, and dedicated-deployment target.

Multi-tenant identity, authorization, data, secrets, policy, and audit are mandatory from the pilot.

## Commercial evolution

Commercial packaging separates one-time discovery/onboarding/setup, recurring platform hosting, optional recurring management/support/SLA, metered AI/media/tool usage, and dedicated/hybrid premiums. Exact plans, allowances, prices, markups, and SLAs remain to be set from pilot economics. Agency workspaces, white labeling, portfolio reporting, and reusable-but-isolated skill templates can build on the same tenant and entitlement model.
