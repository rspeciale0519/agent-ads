# Deployment, Environments, and Operations

## Deployment principles

- Cloud-managed authoritative state and workflows.
- Environment, tenant, and credential isolation.
- Immutable build artifacts and declarative infrastructure.
- No production agent or connector execution from developer laptops.
- Safe migrations, canary rollout, and tested rollback.
- Local/Mac workers may later handle explicitly authorized local-only tasks but never become the sole source of truth.

## Environments

### Local development

- Synthetic or explicitly approved test data.
- Mock connectors by default.
- No production platform credentials.
- Local PostgreSQL/object store/Temporal alternatives through reproducible setup.

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

- Web/API application.
- Durable workflow workers.
- Connector read workers.
- Paid execution workers isolated from read workers.
- Organic publishing workers.
- Hermes gateway and agent workers.
- Notification worker.
- PostgreSQL.
- Object storage.
- Temporal service/managed Temporal.
- OpenTelemetry collector and observability backend.
- Managed secret store/KMS.

Mutation workers use stricter network and identity policies than read workers.

## CI/CD

1. Build immutable artifacts from reviewed source.
2. Run required quality gates.
3. Generate dependency/SBOM and scan results.
4. Apply infrastructure and database changes in staging.
5. Run smoke, migration, connector, workflow, and agent eval checks.
6. Promote the same artifact to production.
7. Use canary/feature flags for connectors, agent versions, and mutation capabilities.
8. Monitor release health and automatically halt on critical thresholds.

Production secrets and credentials are resolved at runtime and never embedded in artifacts.

## Database changes

- Expand/contract migrations for zero-downtime compatibility.
- Backfills are durable, throttled workflows with progress and resume state.
- Destructive logical changes use archival/retention procedures, never ad hoc deletion.
- Migration rollback or forward-fix plan is documented before release.
- Restore rehearsal validates database and object references together.

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

- Encrypted automated PostgreSQL backups and point-in-time recovery.
- Versioned or recoverable object storage according to retention policy.
- Temporal/workflow backup appropriate to deployment.
- Secret-store and infrastructure recovery procedures.
- Regular restore tests with documented recovery time and recovery point results.
- Critical audit data replicated according to risk.

Initial targets, subject to pilot validation:

- Core control-plane RPO: 15 minutes or better.
- Core control-plane RTO: 4 hours or better.
- Audit and approval records: no acknowledged mutation without durable record.

## Operational jobs

- Connector sync and reconciliation.
- Capability and credential verification.
- Data-quality assessment.
- Scheduled publication.
- Daily/weekly reports.
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

