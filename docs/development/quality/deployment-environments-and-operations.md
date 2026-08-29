# Deployment, Environments, and Operations

## Deployment principles

- Managed pilot services with durable, audited application handoffs.
- Environment, tenant, and credential isolation.
- Immutable build artifacts and declarative infrastructure.
- No production agent or connector execution from developer laptops.
- Safe migrations, canary rollout, and tested rollback.
- An approved client-site connector may handle narrowly scoped local-only integrations but never becomes the sole source of truth or authorization boundary.

## Accepted hosting profiles

- **Pooled managed cloud:** the pilot default uses Vercel and managed Supabase. A self-hosted automation plane or AWS needs a recorded trigger.
- **Dedicated managed cloud:** a premium profile with a separate AWS account, RDS database, S3 storage, KMS keys, secrets, workers, and network controls. The account may be operator-owned or client-owned with a restricted management role.
- **Hybrid bridge:** the cloud control plane remains authoritative while a signed, outbound-only client-site connector reaches an approved local/private system.

Client-owned always-on hardware is not a normal deployment target. Full local hosting requires a separately approved product, security, backup, model, observability, update, and support design.

## Environments

### Local development

- Synthetic or explicitly approved test data.
- Mock connectors by default.
- No production platform credentials.
- Local PostgreSQL and object storage through reproducible setup. Temporal is not a local pilot requirement.

### Preview

- One isolated build for branch and browser review.
- Separate Supabase project or approved disposable database boundary.
- Mock or non-production provider accounts only.
- No pilot or production credentials.

### Shared development

- Integration testing and team demos.
- Dedicated platform test accounts.
- Non-production identity and secrets.

### Staging

- Production-like infrastructure and policies.
- Sanitized fixtures and eligible sandbox/test accounts.
- Full E2E, connector, agent eval, security, migration, and rollback validation.

### Pilot production

- One real pilot organization with tenant-aware infrastructure.
- Mutations disabled by default until launch gates pass.
- Elevated logging/alerting and rapid operator response.

### General production

- Multi-tenant scale, defined SLOs, support rotation, disaster recovery, and change management.

## Initial deployable services

- Vercel-hosted web/API application.
- Managed Supabase PostgreSQL/Auth/Storage.
- Application-owned durable job state, outbox, and bounded scheduler.
- Pilot read connectors and AI Reach observation jobs.
- Application-owned AI gateway with one supervisor profile.
- Introduce each supervised executor during Gate P3 after that action's entry controls pass.
- Application telemetry and managed error monitoring.
- Managed OpenAI and Resend integrations.
- Managed secrets and the application `SecretBroker` boundary.

Coolify, Hermes, Temporal, Postiz, separate workers, an OpenTelemetry collector, SigNoz, and AWS are trigger-based services.

Mutation workers use stricter network and identity policies than read workers.

## Initial pooled mapping

- Vercel Pro hosts the commercial Next.js web/API with environment isolation, immutable releases, rollback, budgets, and usage alerts.
- Managed Supabase provides initial PostgreSQL, Auth, and Storage. Free is limited to controlled testing; production upgrade follows the documented backup, availability, storage, and support gates.
- Resend stays managed for transactional and authentication email. OpenAI stays managed for model and image-provider APIs.
- When commercial billing starts, Stripe processes payments while the application keeps authoritative entitlements and usage records.
- The application-owned AI gateway uses one supervisor profile. Bounded jobs run in approved application or scheduler services.
- GitHub and Sentry begin on safe managed tiers. Later self-hosting needs an explicit operational gate.

Any later automation plane needs versioned deployment definitions, least privilege, resource limits, backups, restore tests, patching, scanning, health checks, and degraded modes.

## AWS scale and dedicated mapping

- Route 53, CloudFront, AWS WAF, an Application Load Balancer, and ECS Fargate for ingress and application services.
- RDS PostgreSQL with encryption, automated backups, point-in-time recovery, and tested restores.
- S3 with encryption, tenant-aware prefixes, lifecycle/retention rules, and recoverability appropriate to each data class.
- AWS Secrets Manager and KMS with least-privilege access, rotation, and revocation procedures.
- Self-hosted Temporal on operator-managed AWS infrastructure behind an application-owned abstraction; Temporal Cloud requires a separate reliability/operations approval.
- OpenTelemetry and CloudWatch for telemetry, with a replaceable error-monitoring backend.
- Stripe Billing for subscription and usage invoicing, backed by the application's immutable entitlement and usage ledger.

Expansion container and infrastructure definitions must support later AWS profiles without forking application behavior. AWS provisioning begins only after an approved trigger.

## CI/CD

Record the branch-to-environment mapping before promotion.

The current GitHub deployment record maps the `develop` head to a Vercel `Production` deployment.

Treat `develop` as a shared deployment branch until verified configuration evidence proves otherwise. Do not merge until staging, recovery, and rollback gates pass.

1. Select one reviewed Git commit and lockfile for all environment builds.
2. Run every required pull-request gate.
3. Keep staging access, flags, schedulers, and external operations disabled.
4. Verify the staging target fingerprint and current recovery set.
5. Apply and verify the approved migration on staging.
6. Build and deploy that commit in staging.
7. Run catalog, RLS, role, connector, browser, and smoke checks.
8. Keep the pilot domain, organization access, flags, schedulers, and external operations disabled.
9. Verify the pilot target and recovery set.
10. Apply and verify the approved migration on the pilot target.
11. Build and deploy that commit in the pilot project.
12. Verify the resulting Production deployment.
13. Record separate staging and pilot deployment identifiers.
14. Enable read flags for one organization.
15. Enable each write flag only after its canary approval.
16. Halt on audit, policy, reconciliation, security, or spend failures.

Before step 4, record the private disabled-operations manifest defined in the deployment runbook.

Require evidence for disabled access, provider flags, schedulers, customer messages, and external operations. Do not accept configuration claims without observed evidence.

A Preview-to-Production promotion rebuilds with Production variables. Separate Vercel projects create separate deployments.

A staged Production promotion does not rebuild. Create it with `vercel --prod --skip-domain`, then promote it only after verification.

Production secrets and credentials are resolved at runtime and never embedded in artifacts.

## Database changes

- Expand/contract migrations for zero-downtime compatibility.
- Backfills are durable, throttled workflows with progress and resume state.
- Destructive logical changes use archival/retention procedures, never ad hoc deletion.
- Never rewrite a migration already applied to a shared target.
- Database recovery uses a later forward migration. Application rollback uses flags and a compatible build.
- Restore rehearsal validates database and object references together.

Each preflight records the target, migration, deployment, backup, owner, and UTC evidence in a private release record.

Keep infrastructure identifiers and owner details outside Git, pull requests, public documents, and ordinary logs.

A destructive local proof script needs a disposable-target marker. A production migration needs a database owner and operations reviewer.

## Feature and safety flags

Flags can control:

- organization access;
- connector visibility/read/write;
- platform-specific capabilities;
- agent profile/model/skill version;
- approval and autonomy classes;
- publishing routes;
- experiment eligibility.

Security authorization is never implemented only as a client-side feature flag.

## Backup and disaster recovery

- Supabase database backup or point-in-time recovery point.
- Separate Storage object backup, bucket configuration, access policy, and object-reference manifest.
- Vault root key through the approved out-of-band recovery process when the selected mode requires key transfer.
- Custom role definitions from reviewed role SQL and new role passwords from the secret manager.
- Auth settings, API keys, redirect, SMTP, Realtime, extension, database-setting, and provider-application configuration.
- Deployment variables, feature flags, scheduler configuration, immutable artifact, and migration revision.
- Regular restore tests with documented recovery time and recovery point results.
- Critical audit data replicated according to risk.

A database backup alone is not the complete recovery set. Supabase database backups do not contain Storage objects.

Choose one recovery mode before each operation.

Use only physical-clone or logical-restore modes with synthetic staging data for pre-pilot drills. Same-project restore is incident recovery.

- A same-project physical restore keeps its Vault root key. Plan downtime and manage custom subscriptions and replication slots around the restore.
- Supabase manages the Realtime replication slot. Recreate and verify other recorded subscriptions and slots after the restore.
- A physical clone copies roles, permissions, users, Auth data, and the Vault root key. Restrict access before recovery tests.
- Before cloning, confirm paid-plan access, physical backups, clone restrictions, and cost approval.
- For drills, clone only an inert staging source without active external jobs or real provider credentials.
- Before an incident clone, block external destinations outside the database.
- Apply production-class controls and retention when real data exists. Require explicit approval before target deletion.
- After cloning, disable copied `pg_cron`, `pg_net`, wrappers, and other external-operation extensions before testing.
- Reset every application-created login password before Supavisor or application tests.
- A logical restore does not carry custom role passwords. Restore role definitions from reviewed role SQL and create new passwords through the secret manager.
- Retrieve the source Vault root key before pausing or deleting the source. Verify the target has no differently encrypted data before replacement.

For every mode, rotate or reset application-created login-role passwords. Restore platform settings and Storage configuration separately when the mode does not include them.

The private recovery manifest states the mode, contents, exclusions, target, backup, deployment, migration revision, owners, and verification steps.

Manual logical restores must follow the nonlogging Vault key-transfer procedure in `account-connections-operations.md`.

Run a restore drill before pilot launch, after each recovery-design change, and quarterly during the pilot.

Initial targets, subject to pilot validation:

- Core control-plane RPO: 15 minutes or better.
- Core control-plane RTO: 4 hours or better.
- Audit and approval records: no acknowledged mutation without durable record.

The current targets remain unaccepted until a restore drill proves them.

## Operational jobs

- Connector sync and reconciliation.
- Website crawl and index diagnostics.
- AI Reach observation and assessment refresh.
- Capability and credential verification.
- Data-quality assessment.
- Requested, daily, and weekly AI Reach briefings.
- Agent skill/context/policy review reminders.
- Retention, suppression, and deletion workflows.
- Backup verification and audit integrity checks.

## Cost controls

- Per-organization model/tool budgets.
- Token and tool-call limits by role/task.
- Cached deterministic summaries with freshness controls.
- Batch connector reads within quota and latency requirements.
- Object lifecycle policies.
- Cost allocation tags for organization, workflow, connector, and agent role.
- Alerts on anomalous model, connector, storage, or workflow cost.
- Alerts before managed free-tier, storage, backup, CI, email, telemetry, and automation-host capacity limits are reached.
- A recorded upgrade gate for every managed-service tier change and a recorded total-cost/reliability review before self-hosting an additional customer-facing service.
- Tenant-scoped usage meters, included allowances, overage alerts, and configurable hard/soft limits.
- Margin reports that reconcile billable usage with cloud, model, media, messaging, and third-party tool cost.

## Client-site connector operations

- Connector enrollment binds a device identity to one organization and an allowlist of jobs and destinations.
- Connections are outbound and mutually authenticated; credentials are scoped, revocable, and excluded from cloud agent context.
- Signed updates, version enforcement, health checks, local buffering limits, audit forwarding, automatic expiry, and remote disablement are required.
- Loss of the connector degrades the affected integration visibly and never weakens policy or causes unverified retries.

## Service ownership and offboarding

The operator owns routine provisioning, releases, monitoring, backup/restore, incident response, capacity, and security patching for managed profiles. Contracts define client responsibilities, subprocessors, data ownership, usage and overage policy, support/SLA, residency, export, retention/deletion, credential revocation, and account transfer.

Offboarding disables mutations, revokes platform, hosting, automation-host, and conditional AWS roles, deregisters edge connectors, exports agreed data/evidence, applies retention/deletion policy, and preserves legally required audit and billing records.

## Production readiness checklist

- Infrastructure reproducible from code.
- Environment boundaries and access reviewed.
- Backups and restore tested.
- SLOs and alerts active.
- Secrets rotation and revocation tested.
- Connector and mutation kill switches tested.
- Incident runbooks exercised.
- On-call owner assigned.
- Pilot data and authorization approved.
- Rollback target and decision authority documented.
- Pooled profile, customer-facing host, region, residency, internal usage limits, support tier, and offboarding owner documented.
- Gate F0 database repair and target evidence pass.
- Complete recovery-set restore passes.
- Each enabled pilot read and write capability passes its own gate.
- Any enabled self-hosted service passes patching, capacity, backup, restore, secret recovery, and degraded-mode tests.
