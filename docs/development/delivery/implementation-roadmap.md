# Implementation Roadmap

## Delivery rule

The approved pilot boundary controls release. The full connector catalog is a later expansion target.

The pilot includes the website/CMS, GA4, Google Search Console, Google Ads, Meta Ads, and one selected CRM.

Calendar and email are conditional. No unselected connector can block pilot release or receive production credentials.

Each gate needs an owner, environment, Git revision, date, evidence link, and accepted limitations.

## Workstreams

1. Foundation truth, database repair, recovery, and environment isolation.
2. AI Reach chat, one outcome dashboard, onboarding, and three actions.
3. Website, analytics, search, advertising, and CRM read sources.
4. Canonical outcomes, booked revenue, evidence, and data quality.
5. One supervisor profile, typed tools, and evaluations.
6. Proposals, approvals, supervised actions, reconciliation, and audit.
7. Pilot support, observability, security, backup, and restore.
8. Later paid, organic, specialist, workflow, and hosting expansion.

Workstreams run in parallel after the shared contracts stabilize.

## Account Connections delivery overlay (2026-08-10)

This overlay records existing local Account Connections work. It does not prove staging, pilot, or release readiness.

A checked item means only the state written in that item. Release evidence must also record the Git revision, environment, date, owner, and evidence link.

- [x] Gate F0 local migration proof: full SQL migration order, UUID repair branches, permission-role login guards, catalog definitions, role constraints, forced-RLS flags, and low-privilege tenant behavior on a disposable target.
- [ ] Gate F0 local runtime proof: Prisma transaction reuse, pooler behavior, Vault lifecycle, failure compensation, and concurrent rotation/revocation need a safe, tracked harness and durable evidence.
- [x] Phase 1 local foundation: Prisma schema/migrations, tenant-context membership resolution under forced RLS, authenticated-subject RLS for global user identity, cross-tenant relationship constraints, organization permissions/invitations, audit chain, AAL2/active-session checks, action-bound step-up grants, and direct-maintenance bootstrap script.
- [x] Phase 2 local workspace: `/dashboard`, `/onboarding`, `/connections`, inventory/request APIs, safe redirects, non-secret metadata contracts, DLP rejection, responsive empty/error states, and MFA screen.
- [x] Phase 3 local authorization boundary: adapter contract, deterministic mock provider, OAuth state/PKCE/replay controls, SecretBroker/Vault boundary, redaction, rate limits, CSRF/origin checks, and lifecycle APIs.
- [ ] Gate F0 staging revalidation: target Supavisor behavior, Vault lifecycle, failure compensation, rotation/revocation concurrency, and migration-target proof.
- [x] Phase 4 local Google adapter slice: bounded Ads/GA4/GTM discovery, token exchange/revoke normalization, read-only role confirmation gate, and mocked redacted fixtures.
- [ ] Phase 4 Google supervised pilot: live application credentials, approved scopes, Ads role/developer-token evidence, and staging Chrome DevTools journey.
- [x] Phase 5 local Meta adapter slice: configured Graph-version allowlist, safe asset discovery/verification/revoke paths, and explicit role-confirmation gate.
- [x] Phase 6 local TikTok adapter slice: official v1.3 exchange, advertiser discovery/info/revoke paths, and explicit role-confirmation gate.
- [x] Phase 7 local manual lifecycle: Dubsado approved-export/client-owned source metadata, invitation statuses, method-bound external/operator verification, archive/revoke, stale/expiry dashboard summaries, customer controls, and audit-safe evidence handling.
- [ ] Phase 5–7 external gates: provider approvals/test assets, approved Dubsado route, and externally verified manual lifecycle evidence.
- [x] Phase 8 local static hardening: bounded secret scan, migration/RLS and relationship audit, provider-source review, explicit non-secret connection API projections, kill-switch enforcement, origin/no-store protections, step-up boundaries, OAuth browser-transaction binding, nonce CSP/security headers, serialized cleanup, safe broker compensation, dependency audit, and operational runbooks.
- [ ] Phase 8 durable runtime evidence: desktop and mobile browser checks, accessibility results, console and network checks, and security-header results need a retained release record.
- [x] Cross-phase local mutation safety: tenant/user/action-scoped durable idempotency with HMAC-only request/key fingerprints, forced RLS, retained client identities, invitation row locking, exclusive final-offboarding locking, terminal ledger finalization, bounded scheduled cleanup, route/client contract audit, and safe reconciliation outcomes without response or secret replay.
- [x] Cross-phase onboarding containment: applicant-bound server drafts, no form payload in browser storage, shared free-text and filename secret rejection, private attachment isolation from automation pending authorized review, and atomic pre-notification submission upsert.
- [ ] Phase 8 general release: Supabase advisors, dependency review, retention/export/offboarding acceptance, seven-day observation window, and named rollback owners.

## Controlling delivery gates

| Gate | Outcome | Required exit evidence |
|---|---|---|
| F0 | Foundation truth and repair | target inventory, database type repair, fresh migration, forced-RLS proof, required CI gates |
| F1 | Recovery and isolated environments | complete recovery set, restore drill, target fingerprint, staging revalidation |
| P0 | Approved pilot contract | sales-trainer scope, owners, outcome definitions, connections, approvals, data uses |
| P1 | Read-only outcome loop | scoped sources connect, synchronize, reconcile, and produce one canonical outcome snapshot |
| P2 | AI Reach useful release | chat and dashboard explain evidence, limits, and exactly three actions without mutation access |
| P3 | Supervised actions | CMS draft, approved lead follow-up, and one campaign pause/resume path pass separate gates |
| P4 | Pilot observation and exit | agreed duration, volume, outcomes, incidents, support, recovery, and user evidence |
| E1 | Expansion | each later connector, agent role, action, or service passes an independent readiness gate |

Gates run in this order. A later gate cannot waive an earlier failure.

## Gate F0: Foundation truth and repair

### Current repair state

The original Account Connections migration defines `credential_references.id` as UUID and `connections.credential_reference_id` as TEXT.

The local repair now converts the pointer before later comparisons. Prisma maps it as UUID and the database enforces same-connection ownership.

A disposable PostgreSQL 17 single-user run applied every SQL migration and passed UUID upgrade, relationship, index, RLS-flag, and role-attribute assertions. A separate mark command inventories `postgres`, `template1`, and selected shared and database-local catalogs before the proof creates databases from `template1`. The proof does not clone `template0`.

The networked CI jobs add Prisma checksum history and low-privilege RLS behavior. [GitHub run 33204340209](https://github.com/rspeciale0519/agent-ads/actions/runs/33204340209) passed `validate`, `guard-proof`, and `schema-proof` at commit `bff8b60f69ae3e0c58279ebb87f8be3f58457b7f` on 2026-08-28. This run proves only its disposable CI target.

Do not expose pilot credentials or promote this schema until shared-target inspection, approved repair execution, and staging proof pass.

### Required work

- Inventory `_prisma_migrations` in every known target.
- Record each target fingerprint, environment class, expected migration head, and current migration head.
- Inspect live column types, constraints, RLS state, roles, and grants.
- If no shared target applied the migration, correct it before first shared use.
- If any shared target applied it, keep that migration immutable and add a forward expand-and-contract repair.
- Apply the full migration history to a fresh disposable target. This passes locally and now runs in CI.
- Verify every protected table has enabled and forced RLS.
- Verify `app_runtime` has no superuser or `BYPASSRLS` authority.
- Run cross-tenant, missing-context, relationship, migration, and pooler tests.
- Observe the new test, security, build, and disposable-schema jobs in GitHub CI.

Application rollback uses feature flags and a compatible build. Database recovery uses a later forward migration.

## Gate F1: Recovery and isolated environments

- Use separate Supabase projects, OAuth applications, credentials, and redirect URLs for local, preview, staging, and pilot.
- Require a disposable-target marker for destructive local proof scripts.
- Define the recovery set for database, Storage objects, Vault root key, custom roles, configuration, scheduler, flags, artifact, and migration revision.
- Complete a restore drill before pilot credentials are enabled.
- Prove the current recovery-time and recovery-point targets with evidence.

## Gate P0: Pilot contract

- Confirm the sales-trainer offer, audience, markets, lead definition, booking event, sales cycle, and baseline.
- Name the selected CRM and CMS in the private Pilot Scope Record.
- Approve the CRM stage map and booked-revenue definition.
- Approve required and optional sources, owners, data uses, retention, and support paths.
- Connect Google Ads, Meta Ads, or both, as selected in the Pilot Scope Record. Both read adapters ship.

## Gate P1: Read-only outcome loop

- Connect the website/CMS, GA4, Search Console, selected CRM, and approved advertising sources.
- Read and reconcile the available source evidence.
- Show freshness, completeness, duplicate, correction, and attribution status.
- Produce one canonical snapshot for qualified leads, booked calls, closed-won deals, and booked revenue.
- Provide useful degraded states for optional missing sources.
- Enable no external mutation principal.

## Gate P2: AI Reach useful release

- Make AI Reach the default signed-in workspace.
- Provide guided onboarding, persistent chat, one outcome dashboard, and evidence links.
- Run approved website and AI Reach observations.
- Show the primary outcome and the most important limitation.
- Select exactly three useful recommendations.
- Pass factual, evidence, abstention, prompt-injection, tenant, latency, retry, and cancellation evaluations.

## Gate P3: Supervised actions

Enable each action only after its separate gate passes:

1. Create an approved CMS draft without public publishing.
2. Send an approved lead follow-up after consent and suppression checks.
3. Pause one approved campaign through one provider and account.
4. Resume that campaign as rollback when current state permits it.

Each action requires current AAL2, active-session binding, an action-bound grant, exact destination, immutable proposal hash, expiry, idempotency, reconciliation, audit, and kill switch.

## Gate P4: Pilot observation and exit

- Run the approved observation window and volume.
- Record useful briefings, accepted actions, corrections, failures, incidents, support load, and business outcomes.
- Repeat backup, restore, revocation, and rollback exercises.
- Obtain owner acceptance for known limitations and the next release scope.

## Supporting work packages

These work packages support the controlling gates. Their number does not set release order.

## Work package 0: Pilot and access discovery

### Deliverables

- [x] Client-facing pilot onboarding form prototype with guided six-step intake, responsive presentation, and review/send flow.
- [x] Server-backed onboarding submission path with Supabase persistence, private business-file uploads (including Excel/CSV exports), Resend notification wiring, and GitHub Actions validation.
- [x] Onboarding question schema and intake requirements documented for the pilot.
- [x] Phase 0 readiness workbook with client-dependency boundaries, platform/system inventory templates, metric-workshop prework, and decision-owner roles.
- [x] Pilot onboarding receipt and aggregate structure confirmed without disclosing payload values: one applicant-bound sent submission, all 21 expected fields, channel/system metadata, eight private attachment records, valid applicant/submission storage paths, and no payload-level secret-detector finding.
- [ ] Completed pilot onboarding packet (authorized attachment/content review, clarification, and approval remain).
- [x] Account and developer-access inventory template covering the connector catalog.
- [ ] Approved pilot inventory for website/CMS, GA4, Search Console, Google Ads, Meta Ads, and selected CRM.
- [x] CRM, analytics, commerce/revenue, booking/call, website, and asset-source inventory template.
- [ ] CRM, analytics, commerce/revenue, and asset-source inventory.
- [x] Initial official-source desk assessment for the planned paid and organic expansion catalog.
- [ ] Current pilot-specific access evidence for each approved source.
- [x] Metric and qualified-outcome workshop agenda, definition template, and reconciliation prework.
- [ ] Pilot metric and qualified-outcome workshop completed and approved.
- [x] Legal/platform/data decision-owner role matrix.
- [ ] Named operator and client legal/platform/data decision owners.
- [x] Cloud hosting, deployment-profile, secrets, storage, and AI-gateway boundaries documented.
- [x] Identity, email-notification, initial model-provider, error-monitoring, and native-first publishing-route defaults.
- [x] Cost-conscious managed pilot policy: Vercel/Supabase with managed OpenAI, Resend, GitHub, and Sentry where their limits remain safe.
- [ ] Recorded trigger and owner before adding Coolify, Hermes, Temporal, Postiz, separate workers, SigNoz, or AWS.

### Exit criteria

- Pilot business profile and metric contract approved.
- Unknown API eligibility is visible in the platform-access matrix.
- No dependency is represented as guaranteed without evidence.

## Work package 1: Engineering foundation

### Deliverables

- TypeScript/Next.js workspace with strict mode and module boundaries.
- Managed Supabase PostgreSQL/Auth/Storage with Prisma, identity, secrets, backup/export controls, and CI/CD foundations.
- Vercel deployment baseline for the customer-facing application, including commercial-plan compliance, environment isolation, rollback, budgets, and usage alerts.
- Application-owned AI gateway, bounded job state, outbox, scheduler, and telemetry contracts.
- Organization/membership/role model.
- Audit event framework.
- Zod contract packages for API, events, tools, and connectors.
- Feature and kill-switch framework.
- Documented AWS migration constraints. Do not implement pooled or dedicated AWS modules before a recorded trigger.
- Tenant quotas, immutable usage records, and cost attribution. Plan entitlements and Stripe billing begin only after a commercial gate.
- Managed-service limit monitoring for pilot services. Add Stripe monitoring only after the commercial gate.
- Record the hybrid connector boundary as expansion. Do not implement it without an approved client need.

### Exit criteria

- Tenant isolation, authorization, audit, schema, migration, and deployment tests pass.
- Development, staging, and pilot environments are isolated and reproducible.
- Initial pooled provisioning, quota enforcement, usage reconciliation, backup/restore, and offboarding tests pass.
- Trigger-based Hermes, Temporal, Postiz, Coolify, and AWS target designs remain portable and documented.

## Work package 2: AI Reach onboarding and business context

### Deliverables

- Guided AI Reach onboarding with short questions and structured cards.
- Business, brand, offer, audience, claim, goal, and policy records.
- Document/website ingestion with untrusted-content handling.
- Proposed Business and Marketing Profile with confirmation/corrections.
- Knowledge workspace and version history.
- Pilot Scope Record and first loop-readiness diagnosis.

### Exit criteria

- A nontechnical pilot user completes onboarding.
- Material inferred assumptions require confirmation.
- Corrections persist, supersede prior context, and remain auditable.

## Work package 3: Data and measurement foundation

### Deliverables

- Raw payload/object-storage pattern.
- Canonical campaign, website, AI Reach, metric, conversion, and outcome entities.
- Selected CRM, GA4, Search Console, Google Ads, and Meta Ads source mapping.
- Metric-definition service and data-quality assessments.
- Attribution views and evidence lineage.
- AI Reach briefing and one outcome-dashboard contract.

### Exit criteria

- Pilot spend and outcomes reconcile within approved tolerances.
- Metric definitions and freshness blockers are approved and tested.
- Aggregates trace back to observations and definitions.

## Work package 4: Pilot connector frameworks

### Deliverables

- Capability registry.
- Paid connector interface and contract test suite.
- Website, AI Reach observation, selected CRM, and draft-only CMS connector contracts.
- OAuth/API-key lifecycle, account discovery, scopes, health, webhook, rate-limit, error, and reconciliation components.
- Mock connector and recorded-payload harness.

### Exit criteria

- Google Ads and Meta Ads read adapters pass the pilot paid contract.
- Website, GA4, Search Console, selected CRM, and AI Reach observation sources pass their read contracts.
- Unknown-result, duplicate, revocation, quota, and capability-change tests pass.

## Expansion work package 5: Additional paid adapters

Implement after the pilot gate:

- Google Ads and Meta Ads full mutation capabilities beyond pause/resume.
- Microsoft Advertising.
- LinkedIn Ads.
- TikTok Ads.
- Reddit Ads.
- X Ads.

### Per-adapter deliverables

- Authorization and account discovery.
- Capability/eligibility snapshot.
- Incremental read synchronization and normalization.
- Offline campaign draft schema and validation.
- Approved create/pause/resume/supported-edit executor.
- Reconciliation, error normalization, and user remediation.
- Sandbox/test evidence and current official documentation record.

### Exit criteria

- Every eligible test account completes the paid connector readiness gate.
- Ineligible or unavailable capabilities are correctly displayed and blocked.
- Multiplatform partial-launch saga passes E2E tests.

## Expansion work package 6: Organic adapters and content workspace

Implement and verify:

- LinkedIn.
- X.
- Instagram.
- TikTok.
- Facebook.
- YouTube.
- Reddit.

### Deliverables

- Source briefs, channel variants, previews, approvals, editorial calendar, scheduling, delivery, receipts, and analytics.
- Native and authorized-provider route selection, including a security-reviewed self-hosted Postiz deployment and adapter.
- Asset technical validation and duplicate protection.
- Per-channel limitations and remediation.

### Exit criteria

- Every eligible test account completes the organic readiness gate.
- Scheduled, canceled, failed, rejected, and uncertain publication paths pass.
- Public content cannot bypass approval or kill switches.

## Expansion work package 7: Broad creative and experiment system

### Deliverables

- Research package, concept, asset, variant, provenance, rights, and review workflows.
- Multimodal asset providers behind adapters.
- Platform-native preview and validation.
- Opportunity registry and assessment workflow.
- Experiment design, assignment, monitoring, analysis, and promotion records.
- Paid-organic learning linkage.

### Exit criteria

- Every asset and claim is traceable.
- An experiment can run from hypothesis through approved conclusion.
- Illegal/prohibited mechanisms are blocked without erasing the underlying objective.

## Expansion work package 8: Hermes specialist team

### Deliverables

- Isolated Hermes runtime behind the application-owned gateway.
- Chief orchestrator and specialist profiles.
- Versioned skills, task/output schemas, memory policy, model routing, cost limits, and schedules.
- Read, analysis, artifact, and proposal tools.
- Golden and adversarial eval suites.
- Conversational “Ask Your Marketing Team” interface.

### Exit criteria

- Every role meets eval thresholds.
- No agent has a direct production mutation tool or raw secret.
- Cross-tenant, prompt-injection, fabricated-evidence, and unauthorized-action tests pass.

## Work package 9: Proposals, approvals, and supervised execution

### Deliverables

- Immutable proposals and evidence snapshots.
- Policy engine, risk classes, legal/platform/data gates.
- Approval inbox, step-up authentication, expiry, drift invalidation, and notifications.
- CMS-draft, approved lead-follow-up, and campaign pause/resume executors with idempotency and reconciliation.
- Global, connector, organization, and action kill switches.
- Rollback/compensation proposals.

### Exit criteria

- Audit reconstruction explains every tested mutation.
- Stale approval, destination substitution, budget bypass, and replay tests fail safely.
- Policy outage and audit outage fail closed.

## Work package 10: AI Reach experience and operational hardening

### Deliverables

- AI Reach chat, one outcome dashboard, Work, Decisions, Connections, and Settings.
- Requested, daily, and weekly briefings with exactly three actions.
- SLO dashboards, alerting, runbooks, backups, restore, and disaster recovery tests.
- Accessibility, performance, security, and load testing.
- Internal usage records, cost limits, alerts, and cost reporting. Automated plans and billing require the commercial gate.
- Initial Vercel/Supabase runbooks, managed-service upgrade gates, and total-cost reporting.
- Record AWS and hybrid triggers and owners. Create their runbooks only when those profiles are enabled.

### Exit criteria

- WCAG 2.2 AA checks pass for core flows.
- Pilot SLOs and incident exercises pass.
- A nontechnical pilot user completes onboarding, briefing, evidence review, CMS draft, lead follow-up, campaign pause/resume, and outcome review.

## Work package 11: Pilot operation and release

### Pilot stages

1. Foundation and recovery validation.
2. Read-only source and outcome validation.
3. AI Reach shadow briefings and recommendations.
4. CMS draft and approved lead follow-up.
5. One supervised advertising pause with tested resume.
6. Pilot observation and exit review.

### Pilot release gate

- Gates F0, F1, P0, P1, P2, P3, and P4 pass in order.
- Only the approved pilot sources affect release.
- Pilot measurement contract and data quality pass.
- Critical agent, security, tenant, approval, execution, and incident tests pass.
- No unresolved critical/high vulnerability.
- Support, monitoring, backup, restore, and rollback ownership established.
- Pooled hosting, internal cost-limit, backup/restore, and offboarding evidence accepted.
- Known limitations and open risks accepted by the product owner.
- Seven paid and seven organic coverage remains outside this gate.

## Post-MVP candidates

- Pinterest, Snapchat, and Amazon Ads connectors.
- Additional CRM/commerce/data providers.
- Agency portfolio and white-label capabilities.
- Advanced incrementality and media-mix modeling.
- Additional languages and regions.
- Carefully evaluated autonomous action classes.
