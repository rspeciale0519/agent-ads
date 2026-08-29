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

- Status: accepted.
- Amendment: D-036 allows the pilot application-owned AI gateway to call OpenAI without a separate Hermes deployment.
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
- Context: the prior MVP required fourteen platform connectors before one customer could receive value.
- Decision: use a sales trainer or similar expert-led business as the first pilot. Include website/CMS, GA4, Search Console, Google Ads, Meta Ads, and one selected CRM. Calendar and email remain conditional.
- Constraint: Google Ads and Meta Ads both have pilot read adapters, but an organization can connect either one or both.
- Consequence: every other paid and organic connector moves to expansion and does not block pilot release.
- Owner/date: product owner, 2026-08-27.
- Affects: PAID-001–PAID-014, ORG-001–ORG-011, DAT-001–DAT-012, UX-001–UX-009.

### D-033 — AI Reach is the chat-first pilot experience

- Status: accepted.
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
- Context: the narrow read-only loop does not need a specialist team or a separate automation host.
- Decision: use one supervisor through the application-owned AI gateway. Keep the pilot on Vercel and managed Supabase with managed OpenAI and Resend.
- Trigger rule: add Hermes, specialist profiles, Temporal, Postiz, Coolify, separate workers, SigNoz, or AWS only after recorded quality, workflow, reliability, scale, compliance, residency, or cost evidence.
- Consequence: target contracts stay portable, but unneeded services do not become pilot gates or operating burden.
- Owner/date: product, engineering, and operations owners, 2026-08-27.
- Affects: AGT-001–AGT-010, OPS-001–OPS-011, P-007–P-009.

### D-037 — Pilot external actions are supervised and bounded

- Status: accepted.
- Context: the pilot must prove a complete loop without broad mutation authority.
- Decision: the first useful release is read-only. The pilot MVP can create a CMS draft, send one approved lead follow-up, and pause one approved advertising campaign with resume as rollback when supported.
- Constraint: each write approval binds one organization, account, destination, action, proposal hash, cap, and expiry. It also requires current AAL2 and active-session binding.
- Constraint: CMS publishing, budget changes, targeting changes, campaign creation, broad publishing, and bounded autonomy remain outside the pilot.
- Owner/date: product, security, and engineering owners, 2026-08-27.
- Affects: APR-001–APR-012, PAID-001–PAID-014, AIR-012–AIR-015, SEC-001–SEC-012.

## Decision process

New material decisions must state context, options, decision, consequences, owner, date, status, affected requirement IDs, and any migration. Superseded decisions are never deleted.
