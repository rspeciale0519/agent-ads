# Open Questions

These questions do not alter the accepted product scope, but they must be resolved at the indicated decision point.

## Pilot business — before implementation planning is finalized

The authenticated pilot response has been received and reconciled into a private, Git-ignored working packet. The public list below now records only the unresolved decision classes; client answers, account identifiers, budgets, contacts, exports, and creative evidence are not copied into this public repository.

- Which initial geography, offer priority, capacity, fee/margin economics, and primary qualified outcome will be approved?
- Which Google Ads and Meta Ads accounts exist, and who owns them?
- Which CRM and CMS will the Pilot Scope Record select?
- Which GA4, Search Console, CRM, booking, website-form, and billing records are authoritative?
- Which CRM stages map to qualified lead, booked call, and closed won?
- Which amount, currency, event date, correction, duplicate, and cancellation rules define booked revenue?
- What volume is available to evaluate performance?
- Which jurisdictions, regulated topics, or customer-data constraints apply?
- Who approves campaigns, budgets, content, data use, and incidents?

## Pilot access — before Gate P1

- Which developer apps, tokens, reviews, certifications, contracts, and account tiers does the pilot already have or qualify for? The official-source baseline is recorded in the [platform capability matrix](../capabilities/platform-capability-matrix.md).
- Which client accounts can be used for controlled tests where an isolated sandbox is unavailable?
- Which Google Ads and Meta Ads account can supply read-only pilot evidence?
- Which provider and account will receive the first pause/resume gate?
- Which CMS can create a draft without public publishing?
- Which approved calendar or email source is necessary for the outcome loop?
- Which AI Reach surfaces and collection methods are approved for the first question set?

## Product and UX — before Gate P2

- Which notification channels are required beyond in-app and email?
- Which languages/locales are required for the pilot?
- What retention, export, and deletion policy applies to AI Reach conversations?
- What response-time, cancel, retry, and support-handoff targets apply?
- Which three starter questions should AI Reach show the sales trainer?

## Owner decisions from the 2026-10-04 joint plan

These decisions do not block the documentation task. They block the work that depends on them.

- Resolved 2026-10-04: Rob accepted D-043 to D-049, including the D-044 amendment to D-037, with "I approve all 7 of those." Acceptance authorizes no live spending, deployment, protected Git action, or production data change, and completes no gate.
- Confirm the first customer, offer, channel, outcome source, CMS need, and operating owner (milestone A). This is the next product choice.
- Approve the one commercial package, setup fee, and any required production dependency (Stripe) before milestone E.
- Authorize each protected Git, environment, data, spending, and release action when its concrete result is ready.

## Architecture and vendors — before implementation

- Client-specific creative generation and video/rendering vendors after brand, rights, format, privacy, volume, and quality requirements arrive. Select image generation through the tool gateway so the provider can be swapped (D-029 remains proposed).
- Exact model routing, budgets, retention controls, and Director evaluation thresholds. The provider is organization-selected under D-039 and D-041; "OpenAI model routing" below reflects the 2026-08-07 state.
- Runtime selection: the D-046 prototype's pass criteria, hosting target, and the tested provider combinations.
- Whether the Agent SDK's hosting and recovery model fits Vercel Functions or needs a separate worker host.
- Exact preview, staging, and pilot Supabase targets and their migration heads.
- Backup destination and named restore owners for the complete recovery set.
- Which measured trigger would justify Hermes, Temporal, Postiz, Coolify, separate workers, SigNoz, or AWS?

Resolved on 2026-08-07:

- The initial pooled service uses managed Vercel/Supabase for the customer-facing plane and an operator-controlled Coolify host for the self-hosted automation plane.
- AWS is the scale, compliance, and dedicated-deployment target, triggered by measured requirements rather than provisioned during Phase 0 by default.
- Self-hosted Temporal is the initial durable workflow service behind an application-owned abstraction; Temporal Cloud is an escalation option only after a reliability/operations review.
- Hermes is the selected production chief orchestrator and agent runtime behind an application-owned, replaceable gateway. Hyperagent is not selected.
- Pooled managed cloud is the default, with premium dedicated AWS and exception-only hybrid connector profiles.
- Supabase Auth is the initial identity provider; application-owned memberships and roles remain authoritative.
- Resend is the initial transactional email and Supabase Auth email-delivery provider; durable workflow/in-app state remains authoritative.
- OpenAI remains the managed model provider behind the Hermes gateway; exact models remain eval-selected, but local models are not the planned replacement.
- Sentry Free is the initial application error-monitoring backend alongside OpenTelemetry; self-hosted SigNoz is the first scale-out alternative.
- Organic publishing is native-first, with self-hosted Postiz as the first authorized-provider fallback. Blotato is not a planned paid dependency.
- OpenAI and Resend remain managed. Vercel, Supabase, Stripe, GitHub, and Sentry use managed or free tiers while safe; Coolify, Hermes, Temporal, Postiz, workers, and the OpenTelemetry collector are self-hosted when their production gates pass.
- OpenAI image generation is a proposed first image-adapter candidate; production creative and video/rendering selection remains client-dependent.

Amended on 2026-08-27:

- The pilot uses Vercel and managed Supabase without a required self-hosted automation plane.
- One supervisor uses the application-owned AI gateway. Hermes and specialist profiles are expansion components.
- Application-owned durable job state serves the narrow pilot. Temporal needs a later recorded trigger.
- Postiz and broad organic publishing are outside the pilot.
- AI Reach is the default signed-in pilot workspace and a feature inside the product.
- The pilot release boundary is website/CMS, GA4, Search Console, Google Ads, Meta Ads, and one selected CRM.

Amended on 2026-09-29 and 2026-09-30 (D-039, D-041):

- The model provider is organization-selected behind the gateway, Anthropic first. OpenAI is one of the selectable providers, not the required first provider.

Accepted on 2026-10-04 (D-043 to D-049; proposed by Codex and Claude, approved by Rob):

- The supervisor is the Marketing Director. One bounded paid-search specialist and draft-mode content and creative support join it in the first complete workflow.
- The first complete workflow uses one paid channel, one website, and one outcome source.
- The runtime is selected through a bounded prototype against an application-owned reference loop.

## Data and measurement — before Gate P1 exit

- Canonical qualified outcome and economics.
- Attribution views and decision uses.
- Identity resolution and consent boundaries.
- Historical backfill depth.
- Data freshness and reconciliation tolerances.
- Retention, export, deletion, and audit periods.
- Whether PostgreSQL is sufficient for pilot analytical volume.
- AI Reach question-set version, sample count, surfaces, cadence, locales, and comparison rules.
- Referral-source classification and the boundary between direct, platform-reported, modeled, and unknown attribution.

## Supervised actions and risk — before Gate P3

- Initial budget and action caps.
- Required step-up authentication actions.
- Always-human actions beyond the documented defaults.
- Incident notification and kill-switch owners.
- Legal/platform-policy review owners.
- Exact consent, suppression, destination, and expiry rules for lead follow-up.
- Exact campaign pause threshold and tested resume rule.
- Under D-044: the per-action evidence table for create-paused, activate, pause, resume, budget decrease, budget increase, edit, and outcome upload; the provisional maximum approval age; the budget reservation and buffer rules; the current official outcome-upload route.
- Bounded autonomy (L2, L3) remains outside the pilot launch; its per-action evidence is defined in milestone A.

## Commercialization — before multi-client release

- Exact plan prices, included allowances, overage/markup policy, minimum commitments, and payment terms.
- Final client data ownership, subprocessor, retention, export, and contractual responsibility language.
- Agency delegation and support model.
- Platform developer terms for managing third-party client accounts.
- White-label requirements and exact support/SLA tiers.
- Dedicated-deployment eligibility thresholds and supported AWS regions/data-residency commitments.
- Contract and offboarding terms for client-owned AWS accounts and hybrid connectors.

Resolved on 2026-08-07:

- Commercial packaging separates setup, recurring platform hosting, optional management/support/SLA, metered provider usage, and dedicated/hybrid premiums.
- Stripe remains the billing candidate behind an application-owned boundary. Automation starts only after the commercial gate under D-036.
- Client-owned always-on devices are not the default product host.
