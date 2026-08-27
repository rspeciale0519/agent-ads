# Security, Privacy, Compliance, and Autonomy

## Security objectives

- Prevent cross-tenant access.
- Prevent agents from acquiring or escalating authority.
- Protect platform, customer, and business secrets.
- Make every external action attributable and policy-controlled.
- Minimize personal data and enforce its permitted purpose.
- Preserve platform-account health and user trust.
- Fail closed for mutations without disabling legitimate monitoring.

## Trust boundaries

Untrusted inputs include websites, ads, social posts, comments, emails, transcripts, uploaded files, retrieved documents, connector payload text, AI answers, citations, and model-generated content.

They may inform analysis but cannot modify instructions, permissions, policies, tool scope, crawler policy, or destinations.

Trusted authorities are versioned application records approved by authorized humans and deterministic services.

## Authentication and authorization

- Standards-based identity provider with MFA support.
- Short-lived application sessions and secure refresh handling.
- Step-up authentication for high-risk approvals and security changes.
- Server-side RBAC plus resource/organization checks on every request.
- Explicit permissions for connections, audiences, budgets, approvals, policies, secrets, exports, and incidents.
- No administrative privilege inferred from an agent message or client-supplied role field.
- Periodic membership and permission review.

## Tenant isolation

- Organization context established from authenticated membership.
- All service and repository calls require scoped context.
- Database row-level security as defense in depth where practical.
- Separate object-storage namespace and signed access.
- Tenant-scoped workflow queues, agent workspaces, memory, caches, and search indexes.
- Cross-tenant test corpus is a release blocker.

## Secret handling

- Managed secret store and KMS-backed encryption.
- Database stores opaque references, scopes, principal, expiry, and verification metadata.
- Workers obtain secrets only for the exact connector operation.
- Secrets never enter prompts, agent memory, analytics, ordinary logs, client errors, or support exports.
- Rotation and revocation procedures per provider.
- Separate development, staging, pilot, and production credentials.

## Agent and tool security

- One pilot supervisor behind an application-owned, replaceable AI gateway.
- Hermes and specialist runtimes use the same boundary when enabled later.

## Cloud and edge isolation

- Pooled production uses explicit organization context, row-level defense in depth, tenant-scoped storage, secrets, agent context, budgets, queues, telemetry, and usage records.
- Dedicated production isolates the AWS account, RDS database, S3 storage, KMS keys, Secrets Manager secrets, worker identities, and network controls.
- Client-owned dedicated accounts grant only a documented least-privilege management role with auditable emergency access and revocation.
- A hybrid connector initiates outbound mutually authenticated sessions and receives only allowlisted jobs for its organization. It cannot own canonical state, approve actions, relax policy, or retain the only audit copy.
- A client device is not considered private merely because it is physically local; all model, platform, support, telemetry, and subprocessor data flows remain disclosed and governed.
- Signed, short-lived, purpose-bound tool tokens.
- Role and task tool allowlists.
- No general production shell, SQL, browser, or arbitrary HTTP mutation tool.
- Destination/account derived server-side.
- Input/output size and type limits.
- Model, recursion, time, tool-call, and spend budgets.
- External-content prompt-injection detection and adversarial evals.
- Tool response redaction and evidence references.
- Human escalation for uncertain high-impact decisions.

## Data privacy

Each personal-data category records source, purpose, legal/permission status, retention, permitted uses, sharing, and deletion behavior. Required workflows include:

- subject/customer export and deletion where applicable;
- suppression and do-not-contact enforcement;
- consent/provenance correction;
- audience-upload eligibility and deletion;
- connector revocation and downstream cleanup;
- retention expiry;
- incident identification and notification support.

Raw personal data should not be sent to a model when aggregation, pseudonymization, or a deterministic query can answer the task.

## Legal and platform policy model

- Policies are versioned, dated, owned, and linked to sources.
- Platform capability and policy are checked during connector design and rechecked before release.
- Legal uncertainty routes to a qualified owner; a model cannot provide final clearance.
- A tactic can remain in the opportunity registry while execution is blocked.
- Platform prohibition or missing permission blocks production execution even when the underlying tactic may be legal.
- The system never implements enforcement evasion, synthetic identity, fake engagement, or unauthorized scraping.
- Search discovery crawlers and model-training crawlers are separate policy purposes.
- Crawler, `noindex`, sitemap, canonical, and structured-data changes require evidence and an approved action class.
- Controlled AI Reach observations use official APIs, official reports, authorized exports, or approved methods.
- AI Reach cannot promise ranking, citation, recommendation, traffic, revenue, or causality.

## Risk classes

| Class | Examples | Authorization when enabled |
|---|---|---|
| Read-only | reporting, research, website crawl, AI Reach observations | role permission; logged |
| Draft-only | campaign plan, copy, source brief, local website draft | role permission; no external effect |
| Low reversible | pause/resume within an approved campaign | human approval; later bounded autonomy after eval |
| Medium | budget/bid edit, scheduled public post, targeting change | Stage 4 expansion; human approval and limits |
| High | new campaign, new public claim, customer-list audience, large budget change | designated approver and step-up authentication |
| Restricted | sensitive data, regulated claims, crisis reply | specialized approval; may be prohibited |
| Prohibited | illegal, unauthorized, deceptive, evasive | cannot execute |

## Approval and autonomy rules

- Approval binds to proposal hash, policy version, destination, maximum exposure, and expiry.
- Pilot write approval also binds to organization, account, action type, current AAL2, and active session.
- Agent confidence never substitutes for authorization.
- Policy evaluates both the action and all dependencies.
- Changed platform state, stale evidence, expired credentials, or increased exposure invalidates approval.
- Bounded autonomy is outside the pilot. Any later policy is opt-in per organization, platform, account, and action.
- Bounded actions require notification and periodic review.
- Users can disable all mutations globally or per connector.
- The agent cannot edit, approve, or activate its own autonomy policy.

## Audit

Record authentication, membership, context, connection, data access, agent run, proposal, policy, approval, execution, publication, export, deletion, and administrative events. Audit events are append-only, hash-linked or equivalently tamper-evident, access-controlled, and exportable.

Do not store private chain-of-thought. Store concise rationale, evidence, inputs, outputs, policy reason codes, and human decisions.

## Threat scenarios and controls

| Threat | Primary controls |
|---|---|
| Prompt injection requests credential/action | instruction separation, allowlisted tools, proposal-only agents |
| Website or AI answer injects instructions | untrusted evidence references, content isolation, scoped extraction, adversarial tests |
| Cross-tenant ID substitution | server-derived organization, scoped repositories, RLS, tests |
| Stolen platform token | secret store, least privilege, rotation, anomaly detection, revocation |
| Duplicate campaign/post | idempotency, publication conflict key, reconciliation |
| Approval replay | proposal hash, nonce/idempotency, expiry, state revalidation |
| Compromised skill/plugin | signed/versioned skills, review, allowlists, sandboxing, evals |
| Excessive spend | layered caps, fresh spend checks, approval, kill switch |
| Personal-data misuse | provenance, purpose limitation, policy gate, audit, deletion |
| External account changed manually | sync/reconciliation, origin marker, approval invalidation |
| Audit unavailable | fail closed for mutations |
| AI Reach overstates sampled evidence | separate evidence classes, sample metadata, no composite score, claims tests |
| Broad approval changes another target | action-bound grant, exact destination, expiry, drift check, AAL2 |

## Security release gate

- Threat model reviewed.
- Tenant and authorization tests pass.
- Secrets scan and dependency/security scans pass.
- Agent prompt-injection and tool-abuse evals pass.
- Mutation destination and budget tests pass.
- AI Reach provenance, factual-limit, crawler-policy, and no-guarantee tests pass.
- Lead consent and suppression tests pass when follow-up is enabled.
- Audit reconstruction succeeds.
- Kill switches and token revocation tested.
- Data export/deletion/suppression flows tested.
- No critical/high unresolved vulnerability in the release scope.
