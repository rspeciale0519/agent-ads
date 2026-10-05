# Decision Register

## Status conventions

- `accepted`: controls current implementation.
- `proposed`: awaiting owner decision.
- `superseded`: retained for history.
- `rejected`: considered and not selected.

## Recorded decisions

### D-001 — Product is a governed marketing operating system

- Status: accepted.
- Decision: build a client-facing system for paid, organic, creative, measurement, experiments, approvals, and reporting rather than a raw agent console.
- Reason: nontechnical users need outcomes and control, not prompting expertise.

### D-002 — Hermes is the chief marketing orchestrator

- Status: accepted.
- Clarification: D-018 defines the application-owned gateway and replaceability boundary around Hermes.
- Amendment: D-036 defers Hermes deployment and specialist coordination until a recorded post-pilot trigger.
- Decision: use Hermes to coordinate bounded specialist roles, skills, memory, schedules, and tools through an application-owned adapter.
- Constraint: Hermes is not the authorization, policy, credential, metric, or mutation authority.

### D-003 — Specialist-agent target architecture

- Status: accepted.
- Amendment: D-036 makes this an expansion target. One supervisor profile serves the pilot.
- Decision: use logical specialists for context, research, strategy, budget, creative, seven paid platforms, seven organic channels, measurement, and quality.
- Reason: platform-native expertise, smaller context/tool surface, and independent evaluation.

### D-004 — All seven paid platforms are MVP scope

- Status: superseded by D-032.
- Decision: Meta, Google, Microsoft, LinkedIn, TikTok, Reddit, and X advertising are available for user multi-selection in the MVP.
- Constraint: actual use requires eligible accounts, official/authorized access, and capability verification.

### D-005 — All seven organic channels are MVP scope

- Status: superseded by D-032.
- Decision: LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and authorized Reddit publishing are available in the MVP.
- Constraint: variants are platform-native and public actions initially require approval.

### D-006 — Performance-seeking risk posture

- Status: accepted.
- Decision: retain every legal and potentially useful tactic in an opportunity registry and test uncertain tactics under controlled experiments.
- Constraint: illegal, unauthorized, deceptive, or enforcement-evasive mechanisms cannot execute; platform-prohibited actions remain blocked.

### D-007 — Deterministic control plane owns authority

- Status: accepted.
- Decision: application services own metrics, policy, approvals, budgets, credentials, executions, audit, and rollback. Agent output is a typed artifact/proposal.

### D-008 — Multi-tenant foundations from the pilot

- Status: accepted.
- Decision: even the first-client deployment uses organization-scoped identity, data, secrets, agent context, policies, and audit.

### D-009 — Official or authorized platform routes

- Status: accepted.
- Decision: use official advertising APIs and official/authorized organic APIs or publishing providers. Do not use browser automation to bypass unavailable access.

### D-010 — Human approval is the default mutation mode

- Status: accepted.
- Decision: paid changes and public publishing require approval at launch. Autonomy is earned per action class and organization.

### D-011 — Common domain plus platform-native extensions

- Status: accepted.
- Decision: use common briefs, metrics, approvals, and audit while preserving platform-specific schemas, capabilities, agents, validation, and errors.

### D-012 — Initial application technology defaults

- Status: accepted.
- Amendment: D-018, D-019, and D-020 specify the Hermes boundary, AWS services, and deployment profiles.
- Amendment: D-030 supersedes the initial Temporal Cloud/AWS-first sequencing with the cost-conscious hybrid service mapping while retaining AWS as the scale and dedicated-deployment target.
- Decision: TypeScript strict, Next.js, Zod, PostgreSQL, Prisma, Temporal Cloud, AWS S3, OpenTelemetry, AWS managed secrets/KMS, and Hermes behind an application-owned gateway.
- Reason: fits project conventions and durable workflow/security needs.

### D-013 — Modular monolith with isolated workers

- Status: accepted.
- Amendment: D-036 keeps pilot modules together and defers separate workers until a recorded trigger.
- Decision: begin with strong code-module boundaries and separately deploy the Hermes gateway, connector/mutation, and workflow workers; avoid premature microservices.

### D-014 — Organic publishing route abstraction

- Status: accepted.
- Amendment: D-030 selects self-hosted Postiz as the first provider fallback and removes Blotato as a planned paid dependency.
- Decision: support native APIs and authorized providers such as Postiz or Blotato behind one capability-aware route contract.

### D-015 — Business outcomes are the optimization authority

- Status: accepted.
- Decision: optimize confirmed/qualified outcomes where available; label platform metrics and attribution separately.

### D-016 — Research-era single-Meta scope is superseded

- Status: superseded by D-032.
- Decision: the earlier conservative single-Meta pilot remains research evidence but no longer defines MVP scope.

### D-017 — Client onboarding form is a Phase 0 deliverable

- Status: accepted.
- Amendment: D-033 makes AI Reach the primary signed-in onboarding experience. The form remains the pre-login intake path until replaced.
- Decision: create a polished, shareable, save-and-resume web form for the pilot company's business, goal, channel, brand, system, and approval context.
- Constraint: the form never collects credentials; production submission is authenticated, tenant-scoped, versioned, audited, and backed by secure connection flows.

### D-018 — Hermes behind an application-owned gateway

- Status: accepted.
- Amendment: D-036 retains the boundary but defers a Hermes deployment until a recorded trigger.
- Context: the product needs a production chief orchestrator and specialist runtime without allowing it to become the authorization or operational control plane.
- Options: Hermes, Hyperagent, another hosted framework, or only custom agent workers.
- Decision: select Hermes as the production chief marketing orchestrator and agent runtime. Run it only through an isolated application-owned `hermes-gateway` that exposes versioned profiles, approved model providers, scoped read tools, and typed proposal tools. Hyperagent is not selected.
- Consequences: the application retains identity, tenancy, canonical state, durable workflows, policy, approvals, billing, credentials, execution, audit, observability, and rollback. Hermes remains replaceable through the stable gateway contract, exportable/versioned artifacts, and independent evaluations.
- Owner/date: product and engineering, 2026-08-07.
- Affects: AGT-001–AGT-010, OPS-001–OPS-004, SEC-001–SEC-008.
- Migration: retain Hermes as the runtime and keep Hermes/provider session details behind the application gateway contract; no control-plane migration is required.

### D-019 — AWS is the primary production cloud

- Status: accepted.
- Amendment: D-030 makes AWS the scale, compliance, residency, and dedicated-deployment target. The initial pooled service uses the approved hybrid service mapping and does not provision duplicate AWS capacity by default.
- Amendment: D-036 keeps the pilot on Vercel and managed Supabase. AWS and automated Stripe billing need separate triggers.
- Context: clients need an always-available managed service and the operator needs centralized deployment, monitoring, security, backup, and support.
- Options: operator-managed cloud, client device, or client-managed installation.
- Decision: run the authoritative service in AWS using ECS Fargate, RDS PostgreSQL, S3, Secrets Manager/KMS, CloudFront/WAF, and application observability. Use Temporal Cloud for durable workflows and Stripe Billing for commercial billing behind application-owned abstractions.
- Consequences: AWS operations and cost governance become core competencies; vendor-specific infrastructure stays behind domain and infrastructure-as-code boundaries.
- Owner/date: product and engineering, 2026-08-07.
- Affects: P-001–P-008, OPS-001–OPS-010, SEC-001–SEC-012.

### D-020 — Pooled, dedicated, and hybrid deployment profiles

- Status: accepted.
- Amendment: D-030 changes the initial pooled implementation from AWS-only to managed Vercel/Supabase plus an operator-controlled self-hosted automation plane. Dedicated AWS and the exception-only client-site bridge remain unchanged.
- Amendment: D-036 uses only the pooled managed profile for the pilot. Separate automation, dedicated, and hybrid profiles are triggered expansion.
- Context: most clients need economical managed hosting while some require stronger isolation or access to private/local systems.
- Options: one pooled service, dedicated environments for every client, client appliances, or a pool/silo/bridge model.
- Decision: pooled multi-tenant AWS is the default; dedicated AWS deployments are a premium option; a hybrid outbound-only client connector is an exception for approved local/private integrations.
- Consequences: one product and codebase must support all profiles; provisioning, testing, observability, billing, and offboarding must identify the deployment profile.
- Owner/date: product and engineering, 2026-08-07.
- Affects: P-001–P-008, OPS-001–OPS-010, SEC-001–SEC-012.

### D-021 — Client devices are edge connectors, not the product host

- Status: accepted.
- Context: a client-owned always-on device creates availability, patching, webhook, backup, credential, and support risks and does not ensure privacy when hosted services remain in the data path.
- Options: default device installation, fully local edition, or cloud authority with an optional edge connector.
- Decision: do not require clients to buy or operate a device. When local access is necessary, install a narrow outbound-only connector that cannot own canonical state, approvals, billing, policy, or audit.
- Consequences: a fully local edition is out of scope unless separately approved for a contractual or technical need.
- Owner/date: product and engineering, 2026-08-07.
- Affects: OPS-006–OPS-010, SEC-009–SEC-012.

### D-022 — Managed-service commercial model

- Status: accepted.
- Context: the business must recover onboarding labor, recurring hosting/operations, support, and variable provider usage.
- Options: one-time setup only, flat subscription only, or modular setup/subscription/management/usage pricing.
- Decision: package one-time setup, recurring platform hosting, optional recurring management/support/SLA, metered AI/media/tool usage, and dedicated/hybrid premiums as visible components.
- Consequences: the application needs entitlements, an immutable tenant-scoped usage ledger, allowances, limits, reconciliation, and billing audit. Exact price points and plan packaging remain open.
- Owner/date: product and commercial owner, 2026-08-07.
- Affects: P-007–P-008, OPS-006–OPS-010.

### D-023 — Dedicated cloud may be operator-owned or client-owned

- Status: accepted.
- Context: some clients require their own AWS account or direct infrastructure ownership while still purchasing management.
- Options: operator-owned only, client-owned only, or both through the same deployment contract.
- Decision: support operator-owned and client-owned dedicated AWS accounts. Client-owned deployments grant the operator a least-privilege management role and define cost, emergency access, evidence, transfer, and offboarding responsibilities contractually.
- Consequences: infrastructure modules and runbooks must support both ownership modes without relaxing security or creating a code fork.
- Owner/date: product and engineering, 2026-08-07.
- Affects: OPS-006–OPS-010, SEC-009–SEC-012.

### D-024 — Supabase Auth is the initial identity provider

- Status: accepted.
- Context: the pilot already uses Supabase Auth with cookie-based Next.js sessions, while the production product needs invitation, organization membership, MFA/step-up, revocation, and tenant-safe authorization.
- Options: continue with Supabase Auth, migrate immediately to Auth0/Clerk/Cognito, or build identity directly.
- Decision: retain Supabase Auth for the pilot and initial pooled service. Treat it only as the authentication/session provider; application-owned organization, membership, role, invitation, approval, and audit records remain the authorization authority. Preserve an identity-provider boundary for future OIDC/SAML or enterprise migration.
- Consequences: production readiness requires expiring invitations, server-validated claims, MFA/step-up for sensitive actions, CAPTCHA/rate limits, custom SMTP, short and reviewed session lifetimes, recovery ownership, tenant tests, and migration from legacy API keys before their announced end of support. User-editable metadata may never grant authorization.
- Evidence: [Supabase Auth](https://supabase.com/docs/guides/auth), [Next.js SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), and [2026 changelog](https://supabase.com/changelog?types=breaking-change).
- Owner/date: product, security, and engineering, 2026-08-07.
- Affects: P-002–P-005, ONB-001–ONB-016, APR-001–APR-010, SEC-001–SEC-012.
- Migration: identity-provider subject and session details stay behind application-owned user and membership identifiers; enterprise identity can be added without changing tenant or approval authority.

### D-025 — Resend is the initial transactional email provider

- Status: accepted.
- Context: the onboarding submission already sends staff email through Resend, and Supabase production guidance requires controlled custom email delivery for authentication flows.
- Options: Resend, AWS SES, another SMTP/API provider, or default Supabase email delivery.
- Decision: use Resend for application transactional email and configure the Supabase Auth integration/custom SMTP through a verified product-controlled sending domain. The durable in-app inbox and workflow state remain authoritative; an email is never proof that an action completed.
- Amendment: D-030 confirms that transactional email remains managed; self-hosted email is not planned. Resend tier upgrades are usage-triggered.
- Consequences: configure SPF/DKIM/DMARC, separate or clearly scoped transactional subdomains, disable link tracking for authentication mail, handle enterprise link scanners, use idempotency keys, monitor delivery/bounces, minimize message data, and define provider outage behavior. AWS SES remains the migration/fallback option if scale, residency, or contract requirements change.
- Evidence: [Resend SMTP](https://resend.com/docs/send-with-smtp), [Resend with Supabase](https://resend.com/docs/send-with-supabase-smtp), and [Supabase production email guidance](https://supabase.com/docs/guides/deployment/going-into-prod).
- Owner/date: product and operations, 2026-08-07.
- Affects: ONB-001–ONB-016, UX-006, OPS-003–OPS-005, SEC-005.
- Migration: notification events and templates remain provider-neutral; switching providers must not change workflow or audit state.

### D-026 — OpenAI is the first model provider behind the Hermes gateway

- Status: superseded by D-039 and D-041 for provider choice; the gateway, data-control, and usage-record constraints below remain in force.
- Amendment: D-036 allows the pilot application-owned AI gateway to call OpenAI without a separate Hermes deployment.
- Amendment: D-039 (2026-09-29) makes the gateway model-agnostic with Anthropic as the first adapter. D-041 (2026-09-30) lets each organization choose its provider and key. Documents that still name OpenAI as the first provider describe the 2026-08-07 state.
- Context: Phase 1 needs a concrete provider for schemas, cost controls, evals, and gateway integration without granting the provider or Hermes operational authority.
- Options: OpenAI first, another provider first, or postpone all provider integration until after the pilot response.
- Decision: implement OpenAI as the first supported model provider through the application-owned Hermes gateway. Use typed/strict structured outputs and scoped application tools. Exact model selection and task routing are configuration selected by eval, latency, data-control, and cost evidence rather than hard-coded product assumptions.
- Amendment: D-030 confirms that OpenAI remains the managed production model provider; local-model replacement is not planned. Provider abstraction remains for safety and architecture hygiene, not as a current migration objective.
- Consequences: no model receives raw production secrets or direct mutation tools; sensitive data is minimized and classified before requests; storage/retention controls are explicit; provider request IDs, cost, model/version, and eval evidence are recorded. The gateway retains a provider-neutral contract so another provider can be added or substituted without changing approval or execution authority.
- Evidence: [OpenAI API quickstart and tools](https://platform.openai.com/docs/quickstart), [Responses API](https://platform.openai.com/docs/api-reference/responses), and [API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint).
- Owner/date: product, agent platform, and security, 2026-08-07.
- Affects: AGT-001–AGT-010, OPS-007, OPS-009, SEC-001, SEC-007, SEC-011.
- Migration: versioned prompts, schemas, evals, and provider-neutral task records are exportable; no canonical business state is stored only in the provider.

### D-027 — Sentry is the initial application error-monitoring backend

- Status: accepted.
- Amendment: D-030 starts with Sentry's free tier and selects self-hosted SigNoz as the first alternative when team, volume, retention, or cost limits justify operating a telemetry backend.
- Context: AWS CloudWatch and OpenTelemetry provide infrastructure and vendor-neutral telemetry, but the product also needs application exception grouping, release correlation, and actionable error workflows.
- Options: Sentry, CloudWatch-only, another managed error platform, or a later selection.
- Decision: use Sentry for application error monitoring alongside OpenTelemetry and CloudWatch. OpenTelemetry remains the portable trace/metric boundary and CloudWatch remains the AWS operational log/alert foundation.
- Consequences: scrub secrets, personal data, client content, URLs, headers, and request bodies before export; use non-sensitive tenant correlation identifiers; define sampling and retention; connect release identifiers and source maps; and route alerts to named owners. Sentry availability may not block core workflows.
- Evidence: [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/) and [Sentry OpenTelemetry support](https://docs.sentry.io/concepts/key-terms/tracing/opentelemetry/).
- Owner/date: operations, security, and engineering, 2026-08-07.
- Affects: OPS-001–OPS-005, SEC-001–SEC-005, SEC-011.
- Migration: telemetry uses application-owned semantic conventions and OpenTelemetry identifiers so the error backend can be replaced.

### D-028 — Organic publishing is native-first with a provider fallback

- Status: accepted.
- Amendment: D-030 selects self-hosted Postiz as the first provider fallback. Blotato is no longer a planned comparison subscription and requires a new decision before adoption.
- Context: native APIs preserve capability and evidence, while authorized publishing providers may reduce approval, scheduling, and operational burden for some channels. Provider marketing claims do not prove client-account eligibility or complete reconciliation behavior.
- Options: native-only, Postiz-only, Blotato-only, or a capability-aware mixed route.
- Decision: use official native APIs as the preferred route. Evaluate Postiz as the first authorized-provider fallback because its current documentation advertises coverage for all committed organic channels and exposes an API, webhooks, analytics, and a self-hosted option. Keep Blotato as a comparison candidate. Select the route independently per client account and channel through the shared publishing contract.
- Consequences: provider token custody, tenant isolation, data terms, account limits, support, webhooks, publication receipts, analytics, deletion, outage behavior, and kill switches require contract tests and security review. A provider cannot bypass platform approval, content approval, application audit, or capability truthfulness. Native and provider routes must reconcile to the same canonical publication record.
- Evidence: [Postiz API overview](https://docs.postiz.com/public-api/introduction), [Postiz supported service](https://postiz.com/), and [Blotato publishing API](https://help.blotato.com/api/api-reference/publish-post).
- Owner/date: product, publishing, integrations, and security, 2026-08-07.
- Affects: ORG-001–ORG-011, OPS-001–OPS-005, SEC-001–SEC-008.
- Migration: provider-specific IDs and credentials remain behind the route adapter; canonical variants, approvals, schedules, and receipts stay application-owned.

### D-029 — First creative-provider candidates remain gated

- Status: proposed.
- Context: image and video generation choices depend on client brand assets, desired formats, rights, regulated topics, volume, latency, and budget that are not yet confirmed.
- Options: OpenAI image generation, specialist image/video/rendering vendors, client-provided creative only, or a combination behind adapters.
- Decision: use OpenAI image generation as the first technical image-adapter candidate because the selected initial model provider exposes image generation through the same provider boundary. Do not select or authorize a production video/rendering vendor until the pilot's brand, rights, format, volume, privacy, and quality requirements are known.
- Consequences: generated creative remains a draft requiring provenance, rights, claim, moderation, brand, and human review. Provider inputs and retention must pass security/privacy review. A second image provider and at least one video/rendering provider should be compared with a pilot-specific evaluation set before Phase 7 implementation.
- Evidence: [OpenAI image generation API](https://platform.openai.com/docs/guides/image-generation) and [API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint).
- Owner/date: proposed by product, creative, and security, 2026-08-07; client requirements pending.
- Affects: AGT-001–AGT-010, EXP-001–EXP-007, SEC-005–SEC-007.

### D-030 — Cost-conscious hybrid managed and self-hosted service policy

- Status: accepted.
- Amendment: D-036 keeps the initial pilot on Vercel and managed Supabase. Every self-hosted service needs a recorded post-pilot trigger.
- Amendment: D-036 does not require automated billing for the pilot. Stripe starts only after the commercial gate.
- Context: the product needs production-quality model inference, email delivery, customer-facing performance, durable automation, publishing, observability, and a future enterprise deployment path without purchasing unused managed capacity or creating unnecessary operator burden.
- Options: use managed services for every capability; self-host every open-source component; or use managed services where they preserve material quality/authority and self-host maintained automation components behind explicit production gates.
- Decision: keep OpenAI model APIs and Resend transactional/authentication email managed. Keep the customer-facing Next.js application on Vercel and initial PostgreSQL/Auth/Storage on managed Supabase. Add Stripe after the commercial gate. Keep source/CI on GitHub and error monitoring on Sentry while their tiers remain suitable. Self-host Coolify, Hermes, Temporal, Postiz, modular workers, and the OpenTelemetry collector only after their gates pass. Use self-hosted SigNoz when Sentry is no longer efficient. Provision AWS only after a scale, compliance, residency, or dedicated-deployment trigger. Do not adopt Blotato as a parallel paid dependency. Official platform APIs remain required.
- Consequences: the initial fixed managed cost stays low without replacing model quality or email deliverability. The operator assumes patching, capacity, backup/restore, secrets, monitoring, and incident duties for the automation plane. Free tiers require limit alerts and explicit upgrade gates. Duplicate infrastructure is prohibited without an approved migration, resilience, compliance, or performance reason.
- Evidence: [Vercel pricing](https://vercel.com/pricing), [Supabase pricing](https://supabase.com/pricing), [Resend pricing](https://resend.com/pricing), [Temporal self-hosting](https://docs.temporal.io/self-hosted-guide), [Postiz self-hosting](https://docs.postiz.com/installation/system-requirements), [Coolify introduction](https://coolify.io/docs/get-started/introduction), [Sentry pricing](https://sentry.io/pricing/), and [SigNoz self-hosting](https://signoz.io/docs/install/self-host/).
- Owner/date: product, engineering, operations, and commercial owner, 2026-08-07.
- Affects: P-001–P-008, AGT-001–AGT-010, ORG-001–ORG-011, OPS-001–OPS-010, SEC-001–SEC-012.
- Migration: service contracts, container definitions, telemetry semantics, workflow APIs, storage references, and tenant-scoped canonical records remain portable. A move to AWS or a managed alternative must retire replaced capacity after validation unless an approved resilience design requires temporary overlap.

### D-031 — Account Connections Gate F0 provisional database and secret architecture

- Status: proposed pending staging revalidation.
- Blocker: the local forward repair and disposable proof pass. Shared-target inventory, approved repair execution, and staging evidence remain incomplete.
- Context: Gate F0 requires tenant context, forced RLS, pooler-safe prepared statements, and least-privilege secret storage. These controls must pass before account-connection tables or provider credentials are enabled.
- Options: direct Prisma connections, Supabase transaction-mode pooling, session-mode pooling, Supabase Vault, or a dedicated external secret manager.
- Decision: use Prisma `6.19.3` with transaction-mode pooling, conservative connection limits, and a direct migration URL. Use a server-only SecretBroker backed by Supabase Vault in local and staging. Keep provider flags disabled until staging Supavisor, Vault compensation, and concurrency tests pass. Keep pilot access disabled until Gate F1 proves root-key recovery. AWS Secrets Manager/KMS remains the portable dedicated-deployment backend.
- Consequences: RLS is never weakened to fit a pooler. Staging pooler and Vault runtime evidence remain Gate F0 requirements. Cross-project Vault recovery remains a Gate F1 requirement.
- Evidence: `scripts/f0/` and the CI schema-proof job prove local schema, migration, role, and selected RLS behavior only. Prisma pooler, Vault lifecycle, compensation, and concurrency remain unverified Gate F0 requirements. Restore evidence remains an unverified Gate F1 requirement. Current references are [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres) and [Vault guidance](https://supabase.com/docs/guides/database/vault).
- Owner/date: engineering, database, and security owner, 2026-08-10.
- Affects: SEC-001–SEC-012, ORG-001–ORG-011, OPS-001–OPS-010.
- Migration: provider-neutral repository and SecretBroker contracts keep runtime and secret backends replaceable without changing connection-domain records.

### D-032 — Narrow sales-trainer pilot boundary

- Status: accepted.
- Amendment: D-043 (accepted 2026-10-04) narrows the first complete workflow to one paid channel, one website, and one outcome source. Expert-led services and Google Ads are the starting hypothesis, confirmed in milestone A. Meta connection discovery exists in code; Meta campaign reporting is not implemented, and a Meta connection is optional.
- Context: the prior MVP required fourteen platform connectors before one customer could receive value.
- Decision: use a sales trainer or similar expert-led business as the first pilot. Include website/CMS, GA4, Search Console, Google Ads, Meta Ads, and one selected CRM. Calendar and email remain conditional.
- Constraint: Google Ads and Meta Ads both have pilot read adapters, but an organization can connect either one or both.
- Consequence: every other paid and organic connector moves to expansion and does not block pilot release.
- Owner/date: product owner, 2026-08-27.
- Affects: PAID-001–PAID-014, ORG-001–ORG-011, DAT-001–DAT-012, UX-001–UX-009.

### D-033 — AI Reach is the chat-first pilot experience

- Status: accepted.
- Amendment: D-043 (accepted 2026-10-04) replaces "exactly three recommended actions" with a ranked decision list of at most three items, or an explicit statement that no decision needs attention today. The Marketing Director prepares the briefing inside the AI Reach workspace.
- Context: nontechnical owners need a guided experience, not an agent console or large operator dashboard.
- Decision: AI Reach is a feature inside the product and the default signed-in pilot workspace. It combines guided chat, one outcome dashboard, evidence, and exactly three recommended actions.
- Constraint: AI Reach measures access, index evidence, controlled answer samples, referrals, and CRM outcomes separately. It has no composite GEO score.
- Constraint: it never promises ranking, indexing, citation, recommendation, traffic, lead, revenue, or causality.
- Consequence: broad campaigns, content calendars, analytics, and agent-role views become expansion surfaces.
- Owner/date: product owner, 2026-08-27.
- Affects: AIR-001–AIR-015, UX-001–UX-009, DAT-001–DAT-012, AGT-001–AGT-010.

### D-034 — Foundation repair precedes pilot work

- Status: accepted.
- Context: migration and recovery evidence contains a database type mismatch and a prior wrong-target destructive operation.
- Decision: Gate F0 blocks staging promotion, pilot credentials, and Account Connections mutations until target inventory, schema repair, fresh migration, forced-RLS, role, and CI evidence pass.
- Recovery: disable affected features and use a compatible application build. Do not use an automatic database rollback.
- Owner/date: product, engineering, database, and security owners, 2026-08-27.
- Affects: OPS-001–OPS-011, SEC-001–SEC-012, P-001–P-009.

### D-035 — Shared database recovery is forward-only

- Status: accepted.
- Context: changing an applied migration can make environments disagree and can destroy recovery evidence.
- Decision: inspect every target before editing migration history. Never rewrite a migration already applied to a shared target.
- Migration: use expand-and-contract changes, validate backfills before constraint enforcement, keep one compatible release, and remove old fields later.
- Owner/date: engineering, database, security, and operations owners, 2026-08-27.
- Affects: OPS-001–OPS-011, SEC-003–SEC-004.

### D-036 — One supervisor and managed pilot services first

- Status: accepted.
- Amendment: D-043 (accepted 2026-10-04) names the supervisor the Marketing Director and allows one bounded paid-search specialist plus draft-only content and creative support in the first complete workflow. D-046 (accepted 2026-10-04) selects the runtime through a bounded prototype. Hermes, Temporal, Postiz, Coolify, separate workers, SigNoz, and AWS keep their trigger rule.
- Amendment: D-039 and D-041 replace "managed OpenAI" with the organization-selected model provider behind the same gateway.
- Context: the narrow read-only loop does not need a specialist team or a separate automation host.
- Decision: use one supervisor through the application-owned AI gateway. Keep the pilot on Vercel and managed Supabase with managed OpenAI and Resend.
- Trigger rule: add Hermes, specialist profiles, Temporal, Postiz, Coolify, separate workers, SigNoz, or AWS only after recorded quality, workflow, reliability, scale, compliance, residency, or cost evidence.
- Consequence: target contracts stay portable, but unneeded services do not become pilot gates or operating burden.
- Owner/date: product, engineering, and operations owners, 2026-08-27.
- Affects: AGT-001–AGT-010, OPS-001–OPS-011, P-007–P-009.

### D-037 — Pilot external actions are supervised and bounded

- Status: accepted; amended by D-044 (accepted by the owner on 2026-10-04). D-044 now defines the action-design boundary. The read-only adapter contract stays in force for each action until that action passes its own readiness gate.
- Context: the pilot must prove a complete loop without broad mutation authority.
- Decision: the first useful release is read-only. The pilot MVP can create a CMS draft, send one approved lead follow-up, and pause one approved advertising campaign with resume as rollback when supported.
- Constraint: each write approval binds one organization, account, destination, action, proposal hash, cap, and expiry. It also requires current AAL2 and active-session binding.
- Constraint: CMS publishing, budget changes, targeting changes, campaign creation, broad publishing, and bounded autonomy remain outside the pilot.
- Owner/date: product, security, and engineering owners, 2026-08-27.
- Affects: APR-001–APR-012, PAID-001–PAID-014, AIR-012–AIR-015, SEC-001–SEC-012.

### D-038 — Development stays on the Supabase Free plan until pilot

- Status: accepted.
- Context: the only hosted database is the development project `aiagent-ads`. It holds test accounts and no production customer data. The Free plan has no restorable backups or restore-to-new-project, and it limits active projects.
- Options: upgrade now for a physical-clone drill; run a logical drill in a second Free project; defer the restore drill to the pilot gate.
- Decision: keep all development work inside the Free plan. Rebuild proof comes from the CI `schema-proof` job, which applies the full migration history to a fresh database on every change. The Gate F1 restore drill runs before pilot credentials are enabled, on the paid plan the pilot requires.
- Consequence: the development recovery set is documented but its RPO and RTO stay unproven until the pilot drill. Development data is treated as recreatable.
- Owner/date: product owner, 2026-09-26.
- Affects: Gate F1.

### D-039 — Model-agnostic AI Reach answers, Anthropic first

- Status: accepted.
- Amends: D-026 (first model provider).
- Context: AI Reach chat answered only from fixed rules. The product owner wants model-generated answers and wants the system to stay model-agnostic.
- Decision: AI Reach answers go through a vendor-neutral contract (`AiReachModelClient`). The first adapter uses Anthropic (`claude-opus-5-5` by default, overridable with `AI_REACH_MODEL`). Other vendors, including OpenAI, plug in as further adapters without changing the safety checks.
- Safety:
  - The model writes no customer-facing text. It returns structured choices only: which saved results answer the question, which next actions help, which not-connected sources would help, and whether the question is a change request.
  - AI Reach writes every sentence from saved data, with each value under its own metric label. It adds citations, the readiness note, and the causation note itself.
  - A choice not present in the facts rejects the draft, and the deterministic answer is used instead. Model failures also fall back.
  - Recognized change requests never reach the model, and a question the model classifies as a change request gets the read-only answer. The model has no tools and writes no text, so it can neither change nor claim to change anything.
  - Models receive formatted aggregate saved metrics, source names and states, and next-action titles only. No business name is sent.
  - Before a question is sent, AI Reach replaces emails, phone numbers, and links with placeholders. People's names in free text cannot be reliably detected, so turning the model on means an organization accepts that its questions go to the chosen provider.
- Usage: every answer that called a model saves an immutable usage record with the answer (`ai_reach_messages.model_usage`): provider, the model that served the call, status (accepted, change_request, rejected, failed), the routing prompt version, billed input and output tokens, and the cost in USD with the price-list version used to compute it (no cost for a model missing from the price list). This meets P-008, AGT-004 and AGT-005 for chat.
- Switch: the model is used only when `AI_REACH_MODEL_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` are both set. Removing either restores deterministic answers.
- Owner/date: product owner, 2026-09-29.
- Affects: AI Reach chat, AGT-001–AGT-010.

### D-040 — Organization-set upload freshness window

- Status: accepted.
- Context: Uploaded Dubsado exports were fixed to a 7-day freshness window. The product owner wants each organization to choose how many days an upload stays current.
- Options: keep a fixed window; make it an environment setting; store it per organization.
- Decision: a new `organization_settings` table stores `stale_upload_days` (default 7, allowed 1–90). Owners and administrators with current MFA change it on Settings → Workspace settings, and every change is audited (`organization.settings_updated`). A missing row means the default applies.
- Consequences: AI Reach reads Dubsado-only snapshots with the organization's window, longer or shorter than when they were saved, so status, tiles, chat and actions agree. Combined snapshots keep their own window. The stale-upload action names the limit.
- Migration: `20260930120000_organization_settings` (tenant RLS, forced; the editor must be the signed-in user).
- Owner/date: product owner, 2026-09-30.
- Affects: AI Reach briefing and chat, ORG-001–ORG-011.

### D-041 — Organization-chosen AI model and API key

- Status: accepted.
- Amends: D-039 (switch).
- Context: The product owner wants each organization to choose any AI company's model and use its own API key, set in the app.
- Decision: Settings → Workspace settings lets owners and administrators pick a company from a fixed list, type a model name, and enter an API key. The companies are Anthropic, OpenAI, Google Gemini, Mistral, Groq, xAI, DeepSeek, Together and OpenRouter.
  - Anthropic uses the Anthropic SDK adapter. The others use one OpenAI-compatible adapter with fixed base URLs; custom URLs are never accepted.
  - The key is stored only in Supabase Vault through the secret broker. `private.organization_ai_credentials` holds the handle, a fingerprint, and the last four characters.
  - Saving or removing requires the settings permission, current MFA, and a single-use `ai_model_manage` step-up grant. Every change is audited without the key.
- Safety: all D-039 rules apply unchanged: the router writes no text, contact details are redacted, and usage is recorded. Non-Anthropic calls record tokens without a cost (`costUsd: null`), because prices vary by company. If a saved key cannot be read, rule-based answers are used rather than another company's model.
- Switch: an organization's saved choice takes precedence. Without one, the platform setting from D-039 (`AI_REACH_MODEL_PROVIDER` and `ANTHROPIC_API_KEY`) applies, and otherwise rule-based answers.
- Lifecycle:
  - A key that stops being used is recorded in `private.organization_ai_credential_cleanups`, in the same transaction that replaces or removes it. The record is removed only after the Vault delete succeeds.
  - A failed delete stays queued and is retried on the next save or removal. A failed save deletes the new key, or queues it if that delete also fails.
  - A new key's Vault name is recorded as pending (under the organization's shared lock) before the key is written, and cleared when the save commits or the unused key is deleted by name. Offboarding counts pending keys and deletes abandoned ones (older than 10 minutes), so no key is ever written without a record.
  - Offboarding stops, on every retry, until the queue is empty. Under the final exclusive lock it checks again for any saved or queued AI key before deactivating the workspace.
- Migrations: `20260930140000_organization_ai_credentials`, `20260930150000_ai_credential_cleanups` and `20260930160000_ai_credential_pending_keys` (private schema, forced tenant RLS; the editor must be the signed-in user).
- Owner/date: product owner, 2026-09-30.
- Affects: AI Reach chat, AGT-001–AGT-010, SEC-001–SEC-012.

### D-042 — Live email in production

- Status: accepted.
- Amends: D-025 (turns on the Resend path it chose).
- Context: Email was off, so organization invitations were created and immediately revoked, onboarding submissions were refused, and Supabase's built-in sender reached only the project team.
- Options: keep email off; send only to Resend test recipients (`resend-test`); turn on live sending in production only.
- Decision:
  - Production (`aiagent-ads.vercel.app`) sets `EMAIL_DELIVERY_MODE=live`. Preview deployments keep `disabled`, so test branches never email real people.
  - App email (invitations, onboarding notices) is sent through Resend from `onboarding@e.miodiollc.com`, a verified subdomain of `miodiollc.com`.
  - Supabase Auth (sign-up confirmation, password reset) uses custom SMTP through Resend (`smtp.resend.com`, port 465) with the same sender, shown as "MioDio Agent Ads".
  - Staging stays disabled as its release-evidence checker requires.
- Verified: 2026-09-30, a password-reset email and an onboarding notice were delivered to real inboxes.
- Consequences: an email is still only a notification. In-app records remain the source of truth (D-025). Resend's free plan covers 3,000 emails a month (100 a day).
- Migration: none (environment and Supabase Auth settings only).
- Owner/date: product owner, 2026-09-30.
- Affects: ONB-001–ONB-016, UX-006, OPS-003–OPS-005, SEC-005 (the same as D-025).

### D-043 — Marketing Director product direction and first complete workflow

- Status: accepted. Agreed between Codex and Claude on 2026-10-04 after the two research reports. Approved by Rob (product owner) on 2026-10-04 with the words "I approve all 7 of those." in the Codex chat, naming D-043 to D-049; Rob confirmed the approval in the Claude session the same day. Acceptance covers the product design only. It authorizes no live spending, deployment, protected Git action, or production data change, and marks no implementation or release gate complete.
- Amends: D-001 (scope statement), D-032 (pilot boundary), D-033 (briefing rule), D-036 (supervisor naming and specialists).
- Context: the owner's goal is a product that lets a nontechnical business owner run digital marketing without expertise. The repository's control-plane foundation is strong and read-only. The product needs one complete marketing workflow that creates, executes, and measures work.
- Options: keep the read-only pilot and add actions one at a time; replace the application with a configured Claude or ChatGPT workspace per customer; build the subscription product around one Marketing Director with bounded specialists.
- Decision:
  - Agent Ads is a subscription product with assisted setup. The current application remains the foundation for identity, tenancy, approvals, execution, records, and operations.
  - One Marketing Director coordinates bounded specialists. The owner has one relationship with the Director and never manages specialists directly.
  - The first complete workflow covers one customer type, one offer, one paid channel, one website, and one outcome source. Expert-led services and Google Ads are the starting hypothesis. Milestone A confirms or changes them against the first customer's need.
  - An approved CSV outcome export is an acceptable outcome source when its limits and age are visible. A CRM migration is not a prerequisite. Snapshot imports never invent historical stage transitions.
  - The first workflow uses the Director, one bounded paid-search specialist, and content or creative support in draft mode only. Draft content serves the same offer and acquisition workflow. Broad SEO delivery and sampling of several AI answer surfaces are not launch prerequisites.
  - The daily briefing shows ranked decisions (at most three) with evidence, or states in one line that no decision needs attention.
  - A configured Claude or ChatGPT workspace is a delivery method for assisted setup or an optional package. It is not the core architecture.
  - The product does not claim to replace a full marketing team. Success is measured by owner time, operator support, correction burden, task quality, and qualified outcomes.
- Consequences: the Hermes specialist catalog stays a reference design (D-003, D-036). Requirements that assumed "exactly three actions" change to "at most three ranked decisions or an explicit quiet state." New requirement families DIR, ACT, and LRN record the agreed design; they are planned behavior, not implemented behavior.
- Evidence: `docs/temp/agentic-marketing-strategy-report-2026-10-04.md` (Claude), `.Codex/plans/report-marketing-director-research-and-launch.md` (Codex), and `.Codex/plans/plan-joint-marketing-director-delivery.md`.
- Owner/date: proposed by Codex and Claude, 2026-10-04; accepted by Rob, 2026-10-04.
- Affects: P-009, ONB-001–ONB-016, PAID-001–PAID-014, AIR-011, AGT-001–AGT-010, UX-002–UX-006, DIR-001–DIR-010, ACT-001–ACT-012, LRN-001–LRN-012.

### D-044 — Supervised acquisition workflow and separate action definitions (accepted D-037 amendment)

- Status: accepted. Approved by Rob on 2026-10-04 as one of the seven decisions in "I approve all 7 of those." (Codex chat; confirmed in the Claude session the same day). This acceptance is the approved mutation plan for action design. Nothing is implemented. Every action still needs implementation, its own readiness evidence, and customer authorization before live execution. No live spending, deployment, protected Git action, or production data change is authorized by this acceptance.
- Amends: D-037 (pilot action boundary), D-010 (approval default remains).
- Context: a complete customer workflow needs an approved campaign package that the system creates, verifies, activates, monitors, and reconciles. Creating paused objects alone leaves the owner to launch through the advertising interface.
- Decision:
  - The first complete workflow is: prepare package → approve exact objects and caps → create paused objects → verify them against the approved package → obtain or validate activation approval → activate → monitor → reconcile → learn.
  - Core launch actions: `paid.campaign.create_paused`, `paid.campaign.activate`, `paid.campaign.pause`, `paid.campaign.resume`, verified results, and `cms.draft.create` where the chosen workflow uses that CMS.
  - Conditional actions, each with its own readiness gate: `paid.campaign.edit`, `paid.budget.decrease`, `paid.budget.increase`, `email.follow_up.send` (eligible leads with suppression), and `paid.conversion.upload` (offline outcome feedback). They are enabled only when the chosen funnel needs them and their gates pass.
  - Pause, resume, budget decrease, and budget increase are four separate action definitions with separate risk assessments and gates. Resume restarts spending. A budget decrease can harm delivery, learning, or contractual obligations. Gates may reuse infrastructure after their risks are assessed.
  - Approval binds the exact campaign package, account, destination, content version hash, caps, policy version, and expiry. A material change to any bound element requires new approval.
  - Account state and the approval are revalidated before every activation. Seven days is a provisional maximum approval age, not a proven safety threshold.
  - One explicit approval may cover package creation and activation together when it binds both steps and verification passes. The owner does not approve every API call.
  - Available budget is reserved across concurrent proposals and workers. Pending reservations count against limits. The local ledger records `dispatched` before the provider request is sent, and dispatched or uncertain exposure stays counted across failures. After independent provider reconciliation verifies activation, the local ledger updates atomically from `dispatched` to `committed` without reducing counted exposure. No transaction spans the application database and the provider API. Expiry alone never releases funds after dispatch or during an uncertain result.
  - A kill switch stops new dispatch and cancels queued work. An in-flight provider request may still finish; its result is reconciled and recovered through an approved action, not assumed stopped.
  - A timeout after a provider write is an uncertain result. The system reconciles provider state before any retry. Rollback has limits: a paused campaign can sometimes resume; incurred spend and public impressions cannot be recalled.
  - Outcome uploads are consequential writes. They validate event identity, mapping, duplicates, permissions, diagnostics, and the current official route before use. The system uploads the reliable approved outcome, not automatically the deepest event.
- Consequences: the root `AGENTS.md` instruction already keeps provider operations read-only until a separately approved mutation plan exists. D-044 satisfies that design condition; the instruction needs no change. Each action still needs implementation, customer authority, and its own readiness gate before it is enabled for an organization. No gate is complete.
- Owner/date: proposed by Codex and Claude, 2026-10-04; accepted by Rob, 2026-10-04.
- Affects: APR-001–APR-016, PAID-001–PAID-020, ACT-001–ACT-012, SEC-001–SEC-012.

### D-045 — Official read APIs and the canonical data layer

- Status: accepted by Rob, 2026-10-04 (same approval statement as D-043).
- Reaffirms: DAT-001.
- Context: one research source claimed that bulk reporting reads cause advertising-account bans and that platform APIs should be used for writes only. `docs/agentic-marketing/research-synthesis.md` records this claim as unsupported.
- Decision: use official platform APIs for reads and writes. Reads are scheduled, incremental, paginated, and quota-aware. The application data layer (PostgreSQL on Supabase) is the analytical system of record; the platforms remain the delivery systems of record. Add ClickHouse or another analytical store only after measured query cost requires it.
- Consequences: no "write-only API" rule exists. Freshness, completeness, and reconciliation status accompany every imported dataset. Required sources are capability-based: a source is required only when an enabled decision needs it.
- Owner/date: proposed by Codex and Claude, 2026-10-04; accepted by Rob, 2026-10-04.
- Affects: DAT-001–DAT-013, PAID-005, OPS-002.

### D-046 — Runtime selection through a bounded prototype

- Status: accepted by Rob, 2026-10-04 (same approval statement as D-043). The prototype has not run; the runtime is not selected.
- Amends: D-018 and D-036 expectations about the pilot runtime.
- Context: the Director and specialists need a runtime. The Claude Agent SDK is a leading candidate. Its documentation describes a library that runs Claude Code in an operated process; hosting, tool containment, recovery, and model portability are unverified for this product.
- Decision: build a small application-owned tool loop as the reference implementation. Run a prototype of at most two weeks, with an earlier decision when evidence suffices. Select the Agent SDK only if it shows a measured advantage and passes containment, hosting, recovery, cost, and tool-allowlist tests. Record exactly which runtime and provider combinations were tested and work. Do not present the Agent SDK's Claude runtime as automatically compatible with every provider in D-041.
- Consequences: durable task, proposal, and execution records stay application-owned so the runtime can change later. Hermes remains a reference design and expansion runtime (D-018, D-036). If the prototype fails, the application-owned loop is the runtime; no third option is searched for.
- Owner/date: proposed by Codex and Claude, 2026-10-04; accepted by Rob, 2026-10-04.
- Affects: AGT-001–AGT-012, OPS-001, OPS-011.

### D-047 — Marketing learning contract

- Status: accepted by Rob, 2026-10-04 (same approval statement as D-043). Not implemented.
- Context: the Director must improve its marketing decisions through measured feedback without changing its own permissions or production controls.
- Decision:
  - Every proposal records a prediction before approval: metric, direction, range, observation window, and confidence, or an explicit insufficient-evidence state.
  - An append-only learning record captures each completed task and experiment from the first task: business conditions, decision, inputs, versions, authority, execution, human feedback, mature outcomes, conclusion, and applicability.
  - Learning layers are separate, each with its own promotion authority: customer facts (customer confirmation only), customer preferences (recorded in that tenant), marketing hypotheses (approved experiment), supported practices (measurement review), skills and prompts (offline evaluation plus operator approval), model routing (quality, cost, and regression evaluation plus operator approval), and execution autonomy (separate capability and customer authorization).
  - Success at one layer never approves another layer. Silence never approves a change. Customer-confirmed facts remain authoritative until the customer corrects them.
  - Shadow proposals, including unexecuted alternatives, may receive offline review of reasoning, evidence use, and permission compliance. Outcome calibration applies only to the action actually executed, against its observed result. No shadow proposal proves hypothetical revenue. A claim about an unexecuted alternative needs a controlled experiment or an explicitly limited estimate.
  - New ideas enter through approved first-party material and a weekly research task. Repetition is a measured risk, not an assumed decay after a fixed number of days.
  - A critical safety failure blocks promotion regardless of average scores. Previous skill and prompt versions remain restorable.
  - Shared learning across customers is deferred until a separately approved data-use process exists.
- Consequences: new requirement family LRN-001–LRN-012. The learning record and evaluation library are build tasks D-01 and D-02 in the joint plan.
- Owner/date: proposed by Codex and Claude, 2026-10-04; accepted by Rob, 2026-10-04.
- Affects: AGT-004–AGT-007, EXP-001–EXP-007, LRN-001–LRN-012, SEC-007.

### D-048 — Autonomy levels

- Status: accepted by Rob, 2026-10-04 (same approval statement as D-043). Every organization still launches at L1; no L2 or L3 promotion exists.
- Amends: APR-006, APR-009 (bounded autonomy stays expansion scope; this decision defines the levels for later use).
- Decision: four levels per action class and per organization. L0 observe: report only. L1 propose: the owner approves each action. L2 bounded: execute inside a per-action cap and a per-period cap; the owner receives a digest; a breach pauses the class. L3 delegated: execute inside a period budget with a weekly review. Every organization launches at L1 for every enabled action class. L2 is an optional later gate per action and per customer; it needs the customer's authorization and action-specific evidence. No numeric floor is a universal mandatory threshold; counts and acceptance rates are examples in the per-action evidence table. Customer acceptance is a UX metric and never substitutes for action correctness, business quality, or permission. A critical failure blocks promotion. Demotion is one switch. A paid launch has no L2 prerequisite.
- Owner/date: proposed by Codex and Claude, 2026-10-04; accepted by Rob, 2026-10-04.
- Affects: APR-006–APR-016, ACT-001–ACT-012.

### D-049 — Pilot sequencing and planning allowance

- Status: accepted by Rob, 2026-10-04 (same approval statement as D-043). The planning ranges remain capacity allowances, not commitments.
- Decision: deliver through milestones A (scope and baseline), B (foundation and plumbing), C (supervised acquisition workflow), D (observe and learn), E (launch one package), and F (expand). Valid foundation evidence is reused; unfinished target and recovery gates still block live operation. A first paid supervised pilot may start after milestone C's execution gates and minimum billing, support, recovery, and cancellation controls pass; it does not require three to five existing customers. Milestone E validates repeatability across three to five similar customers for about thirty days, subject to their outcome window. The planning allowance is 12–17 engineering weeks to the first complete workflow and 20–29 weeks to broader launch readiness, assuming one engineer with Claude Code and part-time marketing support. These are capacity allowances, not commitments. Re-estimate after milestone A and the runtime prototype.
- Owner/date: proposed by Codex and Claude, 2026-10-04; accepted by Rob, 2026-10-04.
- Affects: implementation roadmap milestones; P-009.

## Decision process

New material decisions must state context, options, decision, consequences, owner, date, status, affected requirement IDs, and any migration. Superseded decisions are never deleted.
