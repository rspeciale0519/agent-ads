# Phase 0 Readiness Workbook

## Purpose

This workbook keeps Phase 0 moving after the pilot packet arrives and while clarification and approval remain open. It separates work that can be completed from official documentation and internal decisions from evidence that only the client or an eligible client account can provide.

The workbook does not convert assumptions into facts. Every unresolved client value stays visibly marked `awaiting pilot response`, and no connector, metric, claim, or production action is approved from a default alone.

## Operating rule

Proceed now with reversible, platform-independent work:

- official API and policy research;
- access and systems inventory templates;
- default architecture and vendor boundaries;
- metric definitions and workshop preparation;
- internal role ownership;
- test, security, and readiness criteria.

Wait for client evidence before finalizing:

- business and marketing profile facts;
- account ownership, eligibility, roles, and identifiers;
- CRM, analytics, commerce, revenue, and asset-source selections;
- qualified outcome, economics, attribution use, and reconciliation tolerances;
- brand claims, rights, regulated-topic constraints, and approval owners;
- connector priority where it depends on the client's current activity or data.

## Status conventions

- `complete`: the Phase 0 artifact or decision is usable without client evidence.
- `prepared`: the worksheet, research, or decision frame is ready but needs client evidence.
- `awaiting pilot response`: only the client can provide or confirm the missing value.
- `account verification required`: official documentation was reviewed, but an eligible account and developer app must still prove the capability.
- `blocked`: a required external approval, contract, or capability is unavailable.

## Phase 0 dependency snapshot

| Deliverable | Work completed without the client | Client-dependent evidence | Current status |
|---|---|---|---|
| Pilot onboarding packet | Authenticated intake and submission workflow | Submitted answers, files, consent, and clarifications | Received; metadata and integrity review complete; attachment-content review, clarification, and approval pending |
| Platform account inventory | Inventory fields and official access gates | Account IDs, owners, roles, spend/history, business verification, and eligibility | Prepared |
| Business-system inventory | CRM, analytics, commerce, revenue, booking, call-tracking, and asset-source worksheet | Actual products, workspaces, owners, exports, API access, and data quality | Prepared |
| API capability and policy assessment | Initial official-source desk assessment for the full expansion catalog | Pilot website/CMS, GA4, Search Console, Google Ads, Meta Ads, and CRM evidence | Complete for desk research; pilot account verification required |
| Metric contract | Definition schema, prework, workshop agenda, and approval gate | Qualified outcome, economics, funnel ownership, tolerances, and decision uses | Prepared |
| Legal/platform/data ownership | Required role matrix and decision responsibilities | Named client and operator individuals plus escalation contacts | Prepared |
| Architecture/vendor decisions | Cloud, deployment, workflow, storage, secrets, identity, email, initial model provider, error monitoring, and native-first publishing policy | Creative/rendering vendor and client-specific channel exceptions | Partially complete |

## Pilot-response reconciliation

After the onboarding submission arrives, the onboarding owner completes this sequence:

1. Verify the submission belongs to the invited client and preserve its immutable submitted version.
2. Check required business, outcome, channel, system, brand, and approval fields for contradictions or missing evidence.
3. Copy client-provided facts into the inventories below with source and confirmation date.
4. Mark all inferred values `proposed` and route them to a client clarification list.
5. Schedule the metric and qualified-outcome workshop.
6. Start platform account discovery only through official authorization or administrator-mediated access.
7. Update the capability matrix with actual account eligibility and evidence links.
8. Obtain named owner acceptance for metrics, policy, data, incidents, and platform access.
9. Approve the Phase 0 business profile, metric contract, and open-risk acceptance.

Client-specific answers, identifiers, budgets, contact details, exports, and attachment contents must remain in protected tenant storage or an explicitly ignored private working directory. This repository is public; tracked documentation may record workflow status and generalized findings only.

## Platform and account inventory

Use one row per client account, Page, profile, channel, community, manager account, or business container. Never enter passwords, refresh tokens, client secrets, or API keys in this workbook.

| Field | Required value | Current pilot value |
|---|---|---|
| Platform and product | Paid API, organic API, analytics, conversions, or authorized provider | Awaiting pilot response |
| Business/container ID | Business Manager, manager account, Business Center, developer organization, or equivalent | Awaiting pilot response |
| Advertiser/page/profile/channel ID | Stable platform identifier | Awaiting pilot response |
| Display name and URL | Human-verifiable destination | Awaiting pilot response |
| Business owner | Legal/business owner of the account | Awaiting pilot response |
| Administrative owner | Person able to grant roles and complete verification | Awaiting pilot response |
| Operator role | Exact role to be granted to the service/operator | Awaiting pilot response |
| MFA and recovery | MFA status and recovery owner; no recovery secrets | Awaiting pilot response |
| Current activity | Active, inactive, new, historical-only, or unknown | Awaiting pilot response |
| Spend/content history | Approximate date range and export availability | Awaiting pilot response |
| Developer app | Existing app, new app required, owner, environment, and review state | Awaiting pilot response |
| Authorization route | OAuth, developer token, administrator grant, or authorized provider | Awaiting pilot response |
| Read scope | Minimum read/reporting scopes | Account verification required |
| Mutation scope | Minimum create/edit/publish scopes, separated from read where possible | Account verification required |
| Test route | Sandbox, test account, development tier, private-only publication, or controlled production test | Account verification required |
| Conversion source | Pixel/tag, CRM/offline conversion, commerce, app, call, or none | Awaiting pilot response |
| Geography/industry restriction | Region, age, regulated topic, or special category | Awaiting pilot response |
| Known blocker | Review, contract, role, funding, verification, policy, or technical gap | Awaiting pilot response |
| Evidence | Screenshot/export/test ID, reviewer, and verification date | Awaiting pilot response |

### Pilot and expansion platform checklist

Only Google Ads and Meta Ads are pilot advertising sources. The other rows preserve expansion research and do not block pilot release.

| Platform | Paid account evidence | Organic identity evidence | Developer access evidence | Initial action while waiting |
|---|---|---|---|---|
| Meta | Awaiting pilot response | Facebook Page and Instagram professional-account relationship awaiting pilot response | App type, business verification, permissions, and access level unverified | Prepare Meta business/app checklist and test assets |
| Google | Awaiting pilot response | YouTube channel awaiting pilot response | Ads developer token and YouTube OAuth project unverified | Create manager/test-account and OAuth consent checklists |
| Microsoft Advertising | Expansion | Not a pilot organic channel | Production developer token and sandbox credentials unverified | Retain for expansion planning |
| LinkedIn | Awaiting pilot response | Organization/Page and authorized member awaiting pilot response | Advertising and Community Management access are separate and unverified | Prepare separate app/access applications and test evidence plan |
| TikTok | Awaiting pilot response | Creator/business identity awaiting pilot response | API for Business app and Content Posting audit unverified | Prepare sandbox, domain verification, and audit UX evidence |
| Reddit | Awaiting pilot response | Approved communities and posting identity awaiting pilot response | Ads developer app and commercial Data API approval are distinct and unverified | Prepare business-admin app checklist and commercial-use request |
| X | Awaiting pilot response | Authorized X account awaiting pilot response | X API credits and separate Ads API approval unverified | Prepare developer/app approval and cost-cap checklist |

## Business-system inventory

Create one record for every source that may supply business context, spend, conversions, revenue, creative assets, or approvals.

| System class | Questions to answer | Pilot value |
|---|---|---|
| CRM | Product, workspace, owner, objects, pipeline stages, qualification fields, API/export, history, consent | Awaiting pilot response |
| Analytics | Product/property, owner, streams, events, conversions, channel tagging, API/export, retention | Awaiting pilot response |
| Commerce/revenue | Store/billing product, owner, orders/subscriptions/refunds, currency, margin fields, API/export | Awaiting pilot response |
| Booking/call tracking | Product, owner, appointment/call identifiers, dispositions, attribution fields, API/export | Awaiting pilot response |
| Ad tracking | Tags/pixels/CAPI/offline conversions, owner, domains, consent, diagnostics | Awaiting pilot response |
| Website/CMS | Domains, CMS, hosting, deployment owner, forms, redirects, analytics ownership | Awaiting pilot response |
| Asset source | DAM/Drive/storage, owner, rights metadata, formats, API/export, review process | Awaiting pilot response |
| Brand/legal source | Brand guide, claim evidence, required disclaimers, prohibited topics, review owner | Awaiting pilot response |
| Approval/communications | Current approvers, email/in-app needs, escalation and incident contacts | Awaiting pilot response |

For each selected system, record environment, stable identifiers, authentication method, least-privilege role, data owner, processor status, retention, export/deletion capability, rate limits, expected volume, freshness, historical depth, and sample evidence.

## Metric and qualified-outcome workshop

### Prework prepared now

- Draft the funnel as `delivery -> engagement -> visit -> conversion -> qualified outcome -> revenue -> retained value`.
- List candidate outcomes from the onboarding form without selecting one as authoritative.
- Prepare sample definitions for qualified lead, booked appointment, opportunity, purchase, recurring revenue, contribution margin, CAC, qualified CAC, ROAS, and pipeline value.
- Identify every source that could confirm or contradict an outcome.
- Prepare a seven-, thirty-, and ninety-day volume estimate worksheet.
- Prepare reconciliation samples for platform spend, website conversions, CRM outcomes, and revenue.

### Required workshop decisions

| Decision | Required output | Status |
|---|---|---|
| Primary qualified outcome | Stable name, business definition, inclusion and exclusion rules | Awaiting pilot response |
| Economics | Revenue/margin value, target cost, maximum acceptable cost, currency | Awaiting pilot response |
| Funnel ownership | Owner for each stage and handoff | Awaiting pilot response |
| Source of truth | Authoritative system and stable identifiers | Awaiting pilot response |
| Attribution use | Platform-reported, observed, modeled, and experimental views and their allowed decisions | Awaiting pilot response |
| Lookback and latency | Conversion windows, late-arriving outcomes, refresh/freshness threshold | Awaiting pilot response |
| Reconciliation tolerance | Allowed spend, conversion, and revenue variance before blocking decisions | Awaiting pilot response |
| Guardrails | Budget, quality, complaint, capacity, brand, and policy stop metrics | Awaiting pilot response |
| Minimum evidence | Volume, duration, confidence, and human-review requirements | Awaiting pilot response |

### Metric contract record

Every approved metric must contain:

- key and plain-language definition;
- business owner and data steward;
- formula, grain, filters, and deduplication key;
- authoritative datasets and join identifiers;
- currency, time zone, attribution, and lookback behavior;
- freshness threshold and reconciliation test;
- known limitations and permitted decision uses;
- effective date, version, approver, and superseded version.

The workshop is complete only when the client business owner and measurement owner approve the primary qualified outcome and the first reconciliation test can be executed from available data.

## Decision-owner matrix

Role definitions can be completed now. Named client assignments remain required before Phase 0 exit.

| Decision area | Accountable role | Responsible role | Client confirmation |
|---|---|---|---|
| Product scope and pilot acceptance | Product owner | Onboarding owner | Named individual required |
| Qualified outcome and economics | Client business owner | Measurement lead | Named individual required |
| Metric definitions and data quality | Measurement owner | Data/measurement lead | Named individual required |
| Paid account access and budgets | Client paid owner | Paid operations lead | Named individual required |
| Organic identity and publication | Client brand/channel owner | Publishing lead | Named individual required |
| Platform terms and app review | Platform-policy owner | Integrations lead | Named individual required |
| Legal claims, rights, and regulated content | Legal/compliance owner | Brand/creative owner | Named individual required |
| Privacy, retention, export, and deletion | Data/privacy owner | Security/data lead | Named individual required |
| Identity, authorization, and secrets | Security owner | Platform engineering | Operator name required |
| Incident response and kill switches | Incident commander | Operations lead | Client escalation contact required |
| Vendor and subprocessor approval | Product/commercial owner | Security/privacy review | Client approval when contractually required |

## Provisional vendor and route defaults

These defaults enable design and test work. They do not authorize client data processing or production external actions by themselves.

| Area | Default | Status and remaining gate |
|---|---|---|
| Identity | Supabase Auth for pilot and initial pooled service; application-owned organization/membership authorization | Accepted; invitation, MFA/step-up, CAPTCHA/rate limits, custom SMTP, retention, and tenant tests remain implementation gates |
| Email notifications | Resend for application email and Supabase Auth custom SMTP | Accepted; verified sending domain, DMARC, disabled link tracking for auth, idempotency, bounce handling, and delivery monitoring remain gates |
| In-app notifications | Durable application inbox is authoritative; email is a delivery convenience | Accepted architecture; implementation pending |
| Model provider | OpenAI is the first supported model provider behind the application-owned AI gateway | Accepted default; exact model routing requires supervisor eval, data-control, latency, and cost evidence |
| Customer-facing hosting and data | Vercel plus managed Supabase for the initial pooled service | Accepted; commercial-plan compliance, free-tier limit alerts, backup/restore, non-pausing production availability, budgets, and upgrade gates remain implementation gates |
| Automation hosting | No separate pilot automation host | Hermes, Temporal, Postiz, Coolify, workers, and a collector need a recorded post-pilot trigger and readiness gate |
| Error monitoring | Sentry Free alongside OpenTelemetry; self-hosted SigNoz after a measured upgrade trigger | Accepted default; PII/secrets scrubbing, sampling, tenant-safe tags, alert ownership, limit alerts, and retention review remain gates |
| Organic publishing | Native official APIs first; authorized provider route only when it improves eligible coverage or operations | Accepted route policy; exact per-channel route awaits client accounts and contract tests |
| Authorized publishing provider | Postiz remains an expansion candidate | Not a pilot dependency; evaluate only when organic publishing enters approved scope |
| Image generation | OpenAI image generation is the first technical adapter candidate | Proposed; client brand, rights, provenance, privacy, quality, moderation, and cost eval required before acceptance |
| Video/rendering | No production vendor selected | Awaiting client formats, volume, rights, budget, and quality requirements |

## Phase 0 exit checklist

- [x] Pilot submission received and authenticated identity linkage verified.
- [x] Private submission snapshot and attachment integrity manifest preserved for review.
- [ ] Client clarifications resolved and the approved profile frozen as evidence.
- [ ] Business and Marketing Profile approved by the client.
- [ ] Approved pilot sources recorded with owner, eligibility, and required/optional status.
- [ ] Every unknown or blocked API capability is visible in the capability matrix.
- [ ] CRM, analytics, commerce/revenue, booking/call, website, and asset sources confirmed or explicitly marked unavailable.
- [ ] Qualified outcome and metric contract approved.
- [ ] Named legal, platform, data, brand, budget, incident, and kill-switch owners assigned.
- [ ] Identity, notification, model, monitoring, AI Reach, CRM, CMS, and supervised-action decisions accepted or explicitly deferred.
- [ ] Critical/high Phase 0 risks reviewed and accepted or mitigated.
- [ ] No assumption is represented as client-confirmed evidence.

## Source and review cadence

- The [platform capability verification matrix](../capabilities/platform-capability-matrix.md) owns current official platform-source findings.
- The [decision register](../governance/decision-register.md) owns accepted and proposed vendor decisions.
- The [open questions](../governance/open-questions.md) file owns unresolved client and implementation choices.
- The [risk register](./risk-register.md) owns external approval, delay, and vendor risks.

Review this workbook when the pilot responds, when a platform changes access or policy, before each connector implementation, and before Phase 0 exit.
