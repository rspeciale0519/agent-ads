# Domain Data Model

## Modeling rules

- Use UUID/ULID-style opaque identifiers; never expose database sequences as security boundaries.
- Every tenant-owned record carries `organization_id`.
- Store timestamps in UTC and retain the platform's original time zone where relevant.
- Use immutable versions for policies, metric definitions, proposals, skills, and approved content.
- Store platform payload references and external IDs without making provider schemas the domain model.
- Use explicit state machines and append audit events; do not infer lifecycle only from nullable fields.

## Identity and tenancy

### Organization

Fields: id, name, status, default currency, time zone, locale, retention policy, created_at.

### User

Fields: id, identity-provider subject, email, display name, MFA status, status.

### Membership

Fields: organization_id, user_id, role, custom permissions, status, invited_by, accepted_at.

Roles: owner, administrator, strategist, creator, analyst, approver, viewer, system operator. Sensitive capabilities remain explicit permissions rather than role-name assumptions.

## Business context

### BusinessProfileVersion

Fields: organization_id, version, legal/business names, website, description, markets, locations, constraints, sources, confidence, approved_by, effective_at.

### BrandProfileVersion

Fields: voice, tone, visual rules, vocabulary, prohibited language, regulated topics, accessibility rules, examples, source assets.

### Offer

Fields: name, description, price model, unit economics, margin, eligibility, availability, destinations, claims policy, status.

### Audience

Fields: name, type, needs, qualifiers, exclusions, geographies, consent/provenance requirements, lifecycle stage.

### Claim

Fields: text, category, evidence source, approved channels, required qualification, expiry, status.

### Goal

Fields: objective, primary metric definition, target, time window, budget, guardrails, owner, status.

### KnowledgeRecord

Fields: type, title, content reference, source, trust classification, effective date, review date, supersedes, status.

## Connections and capabilities

### Connection

Fields: provider, purpose, credential reference, granted scopes, principal, status, expiry, last verified, created_by.

### PlatformAccount

Fields: connection_id, provider, external_account_id, name, currency, time zone, account type, eligibility, status.

### CapabilitySnapshot

Fields: platform_account_id, connector version, capability key, support level, limitation reason, verified_at, expires_at, raw evidence reference.

Support levels: supported, read_only, provider_limited, account_ineligible, approval_required, temporarily_unavailable, unknown.

### SyncCursor

Fields: connector, account, resource, cursor/window, watermark, last success, last error, reconciliation state.

## Paid advertising

### CampaignBrief

Fields: goal, offer, audience, destination, selected platforms, total budget, schedule, constraints, tracking plan, created_by, version.

### CrossChannelPlan

Fields: brief version, strategy summary, assumptions, per-platform roles, allocation, forecast range, stop conditions, evidence snapshot.

### PlatformCampaignDraft

Fields: plan, provider, account, objective, structure, targeting, placements, schedule, budget, creative assignments, tracking, validation result, version.

### Campaign, AdGroup, Ad

Canonical mirrors with provider, external ID, hierarchy, status, normalized settings, raw state reference, created origin, last reconciled.

Platform-specific configuration remains in a versioned validated JSON field governed by the connector's Zod schema.

## Organic and creative

### SourceBrief

Fields: objective, audience, key message, approved claims, evidence, call to action, source assets, channel intent, owner, version.

### ContentVariant

Fields: source brief version, channel, account, text, metadata, asset assignments, locale, model/skill provenance, validation, edit history, status.

### EditorialSlot

Fields: channel, account, scheduled time, time zone, campaign, content variant, status, conflict key.

### Publication

Fields: variant version, provider, account, requested time, published time, external ID, public URL, state, attempt count, request/response references.

### CreativeAsset

Fields: media type, storage reference, checksum, dimensions, duration, codec, transcript, alt text, rights/provenance, generator, source assets, review status.

### CreativeConcept

Fields: audience insight, angle, hook, message, proof, format, hypothesis, risk markers, source evidence.

## Measurement

### MetricDefinitionVersion

Fields: key, name, formula, grain, dimensions, sources, owner, tests, effective period, version, status.

### MetricObservation

Fields: organization, provider, account, entity, metric key, interval, value, currency, source timestamp, ingested timestamp, quality flags, raw reference.

### ConversionEvent

Fields: event type, occurred_at, source, subject pseudonym, value, currency, campaign/content attribution keys, consent/provenance, deduplication key.

### CustomerOutcome

Fields: lead/customer reference, funnel stage, qualification, pipeline value, revenue, margin, occurred_at, source, correction history.

### AttributionRecord

Fields: outcome, touchpoint, model, credit, confidence, lookback, evidence, model version. Attribution is modeled evidence, never indistinguishable from observed fact.

### DataQualityAssessment

Fields: dataset/metric, freshness, completeness, duplication, reconciliation, severity, affected window, blocker status.

## Decisions and execution

### Recommendation

Fields: type, summary, evidence snapshot, expected effect, confidence, alternatives, agent run, status.

### ProposalVersion

Fields: action type, destination, canonical desired state, dependencies, evidence snapshot, cost exposure, risk class, rollback plan, hash, expiry, policy version.

### ApprovalDecision

Fields: proposal hash, user, decision, reason, scope, decided_at, authentication context. Approval rows are immutable.

### Execution

Fields: proposal, executor, idempotency key, preflight result, attempt, request reference, platform request ID, response reference, final state, reconciliation, rollback linkage.

### AutonomyPolicyVersion

Fields: scope, action classes, constraints, thresholds, schedule, expiry, notifications, approvers, version, status.

### PolicyDecision

Fields: proposal, policy versions, result, matched rules, obligations, reason codes, decided_at.

## Opportunities and experiments

### Opportunity

Fields: objective, tactic, evidence tier, expected upside, legal status, platform status, prerequisites, effort, risk, reversibility, alternatives, owner, state.

### Experiment

Fields: opportunity, hypothesis, population, design, primary metric, guardrails, budget, sample rule, duration, stop rules, approver, status.

### ExperimentVariant and Assignment

Fields: experiment, variant, treatment definition, unit, assignment key, assigned_at. Assignment must be reproducible and auditable.

### ExperimentResult

Fields: analysis window, sample counts, metric estimates, uncertainty, guardrail results, data quality, conclusion, analyst/agent, approval.

## Agents and governance

### AgentProfileVersion

Fields: role, instructions reference, allowed skill versions, tool policy, memory policy, model policy, owner, eval release, version.

### SkillVersion

Fields: name, purpose, inputs, outputs, instructions reference, allowed tools, tests, owner, review date, version, status.

### AgentRun and AgentTask

Fields: role/profile version, model/provider, task envelope, parent run, inputs, evidence, artifacts, token/cost, started/ended, status, failure class.

### MemoryRecord

Fields: role scope, type, content, source, confidence, retention, review state, supersedes. Never stores secrets or undisclosed private reasoning.

### AuditEvent

Fields: organization, actor type/id, action, resource, timestamp, correlation, request context, prior hash, event hash, metadata reference.

### Incident

Fields: severity, category, affected organizations/connectors, detected_at, status, owner, timeline, containment, recovery, root cause, follow-ups.

## Required uniqueness and integrity constraints

- Organization plus provider plus external account ID is unique.
- Provider/account/resource/external ID is unique for canonical mirrors.
- Idempotency key is unique within organization and executor.
- Proposal hash cannot be mutated after approval begins.
- Publication conflict key prevents duplicate scheduled delivery.
- Conversion deduplication key is unique within its source scope.
- Active autonomy policies may not overlap ambiguously for the same action scope.
- Every execution references one proposal and one policy decision.
- Every approved proposal references at least one approval unless policy explicitly authorized bounded autonomy.

## Retention classes

- Security and financial audit: longest required policy/legal period.
- Platform raw payloads: bounded by platform terms and diagnostic need.
- Customer/person-level data: minimized and deleted according to purpose and request.
- Creative and public content: retained while licensed and useful.
- Agent working data: short-lived by default.
- Eval artifacts: de-identified where possible and version-linked.

