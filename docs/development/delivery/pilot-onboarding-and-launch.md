# Pilot Onboarding and Launch

## Purpose

Collect the business, account, data, risk, and operating context required to implement and validate the system using the first client without embedding pilot-specific assumptions into the product.

The current form remains the pre-login intake surface. AI Reach becomes the primary guided onboarding surface after sign-in.

The client submission is not a prerequisite for official API research, inventory preparation, internal owner roles, metric-workshop design, or reversible architecture defaults. Use the [Phase 0 readiness workbook](./phase-0-readiness-workbook.md) to complete those items in parallel. Client-specific facts, account eligibility, metric approval, claims, rights, and final connector priority remain `awaiting pilot response` until supported by client or account evidence.

## Pilot profile

The reference pilot is a sales trainer, public speaker, or similar expert-led service business. This is the starting hypothesis; milestone A confirms it (D-043, accepted).

The approved funnel is discovery, website visit, qualified lead, booked call, closed-won deal, and booked revenue. Booked revenue stays distinct from collected cash.

The private Pilot Scope Record names the exact offer, audience, market, baseline, outcome source (CRM or approved CSV export), CMS if used, first paid channel, owners, sources, enabled action classes, autonomy level per class, and action gates.

Required connections follow the selected workflow. Optional missing connections must not make the product appear broken.

## Business intake

- Legal and public business names.
- Website, locations, service regions, currencies, time zones, and languages.
- Products/services, pricing, margins, capacity, seasonality, and inventory constraints.
- Primary offer and conversion destination.
- Target customers, qualifiers, exclusions, sales cycle, and customer value.
- Competitors and differentiation.
- Current marketing team, vendors, workflows, and approval owners.
- Brand guidelines, voice, assets, approved/prohibited claims, testimonials, and regulated topics.

## Goals and measurement

- Primary business objective and period.
- Qualified lead/customer definition.
- Funnel stages and ownership.
- Revenue, pipeline, margin, retention, and offline outcomes available.
- Current targets and historical baselines.
- Attribution expectations and known blind spots.
- Minimum decision volume and acceptable learning budget.
- Guardrail and stop metrics.

## Pilot advertising inventory

For Google Ads and Meta Ads:

- advertiser/business account;
- account owner and administrator;
- developer/API eligibility;
- current campaigns and spend;
- currency/time zone;
- conversion/tracking configuration;
- audiences and data provenance;
- creative library;
- policy warnings or restrictions;
- test/sandbox account availability;
- read and mutation permission owners.

Each organization connects the channel its workflow uses. Google Ads is the starting hypothesis for the first complete workflow. Implemented today: Google has a campaign report read verified locally; Meta has connection discovery only. No adapter is verified in a target environment.

Microsoft, LinkedIn, TikTok, Reddit, and X remain expansion inventory and do not block the pilot.

## Organic platform inventory — expansion

For LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and Reddit:

- identity/page/channel/community and owner;
- publishing permissions;
- current cadence and formats;
- historical analytics;
- authorized provider connections;
- comment/reply expectations;
- community rules and disclosure requirements;
- existing scheduled content.

## Business systems

- Website and selected CMS.
- Google Analytics 4 and Google Search Console.
- Selected CRM and approved funnel-stage map.
- Ecommerce, billing, or payment processor.
- Website analytics and tag manager.
- Call tracking and booking systems.
- Data warehouse and reporting.
- Email/SMS/outbound tools.
- DAM/file storage and creative tools.
- Identity provider and notification channels.

For each, record owner, environment, API/export capability, identifiers, data quality, retention, and permissions.

## Hosting and service profile

Default the pilot to the Vercel and managed Supabase pooled service under D-030. Record:

- pooled pilot profile; record a dedicated or hybrid reason only after an approved trigger;
- region and data-residency requirements;
- operator-owned or client-owned AWS account for a dedicated profile;
- identity/MFA/SSO and authorized administrator requirements;
- expected user, workflow, storage, model, media, and connector usage;
- manual pilot payment terms, support ownership, internal cost limits, and budget owners;
- required SLO/SLA, support hours, incident contacts, retention, export, and offboarding terms;
- local/private systems that cannot use a direct cloud integration and the approved minimum data flow;
- client technical owner, network prerequisites, and physical host owner only when a hybrid connector is approved.

A client device is not proposed simply as a privacy feature. The data-flow review must include hosted models, marketing platforms, telemetry, support access, and all subprocessors regardless of connector location.

## Policy and risk workshop

Agree on:

- total, monthly, platform, and campaign budget caps;
- action risk classes and approvers;
- public-content approval rules;
- sensitive claims and data;
- audience/customer-list restrictions;
- permitted experimental posture;
- platform-policy decision owner;
- legal questions requiring qualified review;
- notification and incident escalation;
- global and connector kill-switch owners;
- retention, export, deletion, and offboarding.

## Technical readiness audit

- Account IDs and ownership verified.
- OAuth/developer apps and scopes available.
- Domain and conversion ownership verified.
- Webhooks/callback domains and privacy-policy requirements identified.
- Historical-data availability measured.
- CRM/revenue keys can link to marketing touchpoints.
- Media assets have rights/provenance.
- Time zone and currency conflicts documented.
- Platform capability matrix populated from current official sources.
- Pooled hosting, region, account owner, support tier, cost limits, and offboarding owner approved.
- Vercel and Supabase environments isolated with tenant and recovery evidence.
- Internal usage and provider-cost records verified. Test automated invoices only after billing is enabled.
- Any hybrid connector passes outbound-only identity, update, allowlist, health, buffering, audit, expiry, revocation, and remote-disable tests.

## Launch stages and gates

### Read-only

- No external mutations.
- Reconcile data and validate context/metrics.
- Exit when quality and tenant/security checks pass.

### Shadow

- Agents generate recommendations and drafts.
- Humans record what they would do and why.
- Exit when recommendation/eval thresholds are met.

### Supervised website draft and lead follow-up

- Create an approved CMS draft without public publishing.
- Send one approved lead follow-up after consent and suppression checks.
- Exit when destination, execution, reconciliation, audit, and failure tests pass.

### Supervised advertising

- Start with one campaign pause through one approved provider and account.
- Test resume as rollback when current platform state permits it.
- Every action uses current AAL2, exact destination binding, approval, and reconciliation.

### Supervised acquisition workflow (D-044, accepted)

- The Director prepares a campaign package for the first channel; the owner approves the exact objects and caps.
- Create paused objects, verify, obtain or validate activation approval, activate, monitor, and reconcile.
- Observe mature outcomes before recommending the next change.
- Exit when a nontechnical owner completes the package approval and the execution, reconciliation, audit, and failure tests pass.

### First paid supervised pilot (D-049)

- Starts after the acquisition workflow's execution gates and minimum billing, support, recovery, and cancellation controls pass.
- One closely supervised customer. It does not require three to five existing customers or automatic campaign decisions.
- Record corrections, incidents, support effort, owner review minutes, and customer decisions.

### Repeatability (milestone E)

- Three to five similar customers for about 30 days, subject to their outcome window.
- Report mature outcomes, owner time, operator time, quality, cost, incidents, and renewal evidence. This tests repeatability; it cannot prove broad market fit.

### Bounded autonomy — expansion (L2 and L3)

- Only evidence-qualified, reversible action classes, per action and per customer, with the customer's authorization.
- Explicit scope, cap, expiry, notifications, and kill switch. Demotion is one switch.
- Not required for a paid launch.

## Pilot scorecard (D-049)

Set thresholds before the pilot starts. Do not select favorable definitions after observing results.

| Dimension | Measure | Interpretation |
|---|---|---|
| Activation | Setup completion and time to first approved useful artifact | Whether nontechnical customers can start |
| Work quality | Accept, edit, reject, and defer rates | Whether outputs reduce specialist labor |
| Customer effort | Review minutes and repeated clarification requests | Whether management burden falls |
| Operator effort | Support and intervention minutes per customer | Whether delivery can scale |
| Execution | Verified completion, uncertain outcomes, retries, and incidents | Whether the service operates reliably |
| Marketing outcome | Qualified acquisition cost, booked calls, sales, or the approved business metric | Whether work serves the customer goal |
| Learning | Repeated-error rate and held-out evaluation change | Whether updates improve behavior |
| Economics | Contribution, setup recovery, usage, and retention | Whether the subscription can sustain itself |

Measure time savings against the same task scope and quality level, including human review and correction time. Do not count generated content as saved labor when nobody would have produced it otherwise.

## Pilot acceptance evidence

- Signed business/metric/policy profile.
- Connection and capability inventory.
- Data reconciliation report.
- Agent eval report, including the Director's quiet-state and prediction tests.
- Security and tenant test report.
- CMS draft, lead follow-up, and campaign pause/resume execution records.
- Under D-044: campaign package creation, verification, activation, and reconciliation records.
- One controlled learning cycle record, including a rejected harmful candidate and a restored version.
- Audit reconstruction.
- Incident/kill-switch exercise.
- Pooled deployment, backup/restore, internal cost-limit, and offboarding evidence.
- User-journey usability results.
- Pilot outcome and lessons report.

## Offboarding

- Disable schedules and mutations.
- Revoke platform and provider credentials.
- Revoke deployment roles and deregister any approved hybrid connector.
- Export requested data and audit records.
- Enforce retention/deletion obligations.
- Confirm no orphaned campaigns, content schedules, webhooks, or agent jobs.
