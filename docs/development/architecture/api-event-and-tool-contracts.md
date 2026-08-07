# API, Event, and Tool Contracts

## Contract rules

- TypeScript strict mode and Zod validation at every trust boundary.
- Version contracts explicitly; additive changes remain backward compatible within a version.
- Never accept `organization_id`, authorization level, or credential reference from an agent as authoritative.
- Every mutation accepts an idempotency key and correlation ID.
- Errors use stable machine codes plus safe user-facing detail.
- Large, sensitive, or raw payloads are referenced by authorized object IDs rather than embedded in events or prompts.

## Public application API groups

### Identity and organizations

- `GET /organizations`
- `GET /organizations/{id}`
- `POST /organizations/{id}/members`
- `PATCH /organizations/{id}/members/{userId}`

### Onboarding and context

- `GET /context/profile`
- `POST /context/profile/proposals`
- `POST /context/profile/versions/{version}/approve`
- `POST /context/corrections`
- `GET /offers`, `/audiences`, `/claims`, `/goals`

### Connections

- `POST /connections/{provider}/authorize`
- `GET /connections/{provider}/callback`
- `GET /connections`
- `GET /platform-accounts`
- `GET /platform-accounts/{id}/capabilities`
- `POST /platform-accounts/{id}/verify`
- `POST /connections/{id}/revoke`

### Campaigns

- `POST /campaign-briefs`
- `POST /campaign-briefs/{id}/plan`
- `GET /cross-channel-plans/{id}`
- `POST /cross-channel-plans/{id}/platform-drafts`
- `POST /platform-campaign-drafts/{id}/validate`
- `POST /platform-campaign-drafts/{id}/proposals`
- `GET /campaigns` and `GET /campaigns/{id}`

### Content

- `POST /source-briefs`
- `POST /source-briefs/{id}/variants`
- `PATCH /content-variants/{id}`
- `POST /content-variants/{id}/validate`
- `POST /content-variants/{id}/proposal`
- `GET /editorial-calendar`
- `POST /editorial-slots`
- `GET /publications/{id}`

### Proposals and approvals

- `GET /approvals`
- `GET /proposals/{id}`
- `POST /proposals/{id}/approve`
- `POST /proposals/{id}/reject`
- `POST /proposals/{id}/defer`
- `POST /proposals/{id}/request-explanation`
- `POST /executions/{id}/rollback-proposal`

### Opportunities and experiments

- `GET /opportunities`
- `POST /opportunities`
- `POST /opportunities/{id}/assess`
- `POST /experiments`
- `POST /experiments/{id}/launch-proposal`
- `GET /experiments/{id}/results`

### Analytics and audit

- `GET /metrics`
- `GET /reports/daily`
- `GET /reports/weekly`
- `GET /data-quality`
- `GET /audit-events`
- `GET /agent-runs/{id}`

## Standard mutation response

```json
{
  "request_id": "req_...",
  "correlation_id": "cor_...",
  "resource": {"type": "proposal", "id": "prop_...", "version": 3},
  "status": "accepted",
  "workflow_id": "wf_..."
}
```

`accepted` means durably accepted for processing, not externally completed.

## Event envelope

```json
{
  "event_id": "evt_...",
  "event_type": "proposal.approved.v1",
  "occurred_at": "2026-08-06T18:00:00Z",
  "organization_id": "org_...",
  "actor": {"type": "user", "id": "usr_..."},
  "resource": {"type": "proposal", "id": "prop_...", "version": 3},
  "correlation_id": "cor_...",
  "causation_id": "evt_...",
  "data": {}
}
```

Events are immutable facts. Consumers must be idempotent and tolerate redelivery.

## Core events

### Context and connections

- `context.version_approved.v1`
- `connection.authorized.v1`
- `connection.capabilities_changed.v1`
- `connector.sync_completed.v1`
- `connector.sync_failed.v1`
- `data_quality.blocker_detected.v1`

### Campaigns and content

- `campaign.plan_created.v1`
- `campaign.platform_draft_validated.v1`
- `content.variant_ready.v1`
- `content.publication_scheduled.v1`
- `publication.completed.v1`
- `publication.failed.v1`

### Decisions and execution

- `proposal.created.v1`
- `proposal.policy_evaluated.v1`
- `proposal.approved.v1`
- `proposal.rejected.v1`
- `proposal.expired.v1`
- `execution.started.v1`
- `execution.reconciled.v1`
- `execution.failed.v1`
- `execution.uncertain.v1`
- `execution.rollback_completed.v1`

### Agents and experiments

- `agent.run_requested.v1`
- `agent.run_completed.v1`
- `agent.run_failed.v1`
- `experiment.started.v1`
- `experiment.decision_boundary_reached.v1`
- `experiment.concluded.v1`

## Agent-facing tool design

Tool responses include `evidence_id`, source/freshness, tenant-scoped resource IDs, and machine-readable limitations. Tools never return secrets.

### Read tools

- `get_business_context`
- `get_brand_profile`
- `get_offer`
- `get_audience`
- `get_metric_snapshot`
- `get_campaign_performance`
- `get_content_performance`
- `get_platform_capabilities`
- `get_active_experiments`
- `search_approved_knowledge`
- `get_opportunity_registry`

### Deterministic analysis tools

- `calculate_budget_pacing`
- `detect_performance_anomalies`
- `detect_creative_fatigue`
- `compare_variants`
- `validate_tracking_readiness`
- `forecast_budget_scenarios`
- `validate_platform_draft`
- `validate_content_variant`

### Artifact and proposal tools

- `submit_business_profile_proposal`
- `submit_recommendation`
- `submit_cross_channel_plan`
- `submit_platform_campaign_draft`
- `submit_source_brief`
- `submit_content_variant`
- `submit_opportunity_assessment`
- `submit_experiment_design`
- `request_action_proposal`

There is intentionally no `run_sql`, `call_platform_api`, `publish_post`, `increase_budget`, or general shell tool in a production agent profile.

## Proposal action schema

```json
{
  "action_type": "paid.campaign.pause",
  "destination": {
    "platform": "meta",
    "account_id": "acct_...",
    "resource_id": "campaign_..."
  },
  "desired_state": {"status": "paused"},
  "reason": "Qualified acquisition cost exceeded the approved loss threshold",
  "evidence_ids": ["evi_..."],
  "expected_effect": {"metric": "avoidable_spend", "range": [250, 410], "currency": "USD"},
  "confidence": 0.86,
  "maximum_exposure": {"amount": 0, "currency": "USD"},
  "risk_class": "low_reversible",
  "rollback": {"action_type": "paid.campaign.resume"},
  "expires_at": "2026-08-06T20:00:00Z"
}
```

The proposal service normalizes and hashes the request, evaluates policy, and decides whether approval can be requested.

## Error model

Categories:

- `AUTHENTICATION_REQUIRED`
- `PERMISSION_DENIED`
- `TENANT_SCOPE_VIOLATION`
- `CAPABILITY_UNSUPPORTED`
- `ACCOUNT_INELIGIBLE`
- `VALIDATION_FAILED`
- `POLICY_BLOCKED`
- `APPROVAL_REQUIRED`
- `APPROVAL_STALE`
- `DATA_STALE`
- `RATE_LIMITED`
- `EXTERNAL_REJECTED`
- `EXTERNAL_STATE_UNCERTAIN`
- `RETRY_SCHEDULED`
- `INTERNAL_FAILURE`

External provider messages are preserved in restricted diagnostic storage and redacted before user or agent display.

## Contract testing

- Schema fixtures for every version.
- Consumer-driven tests for UI, workers, Hermes tools, and connectors.
- Replay tests against recorded redacted provider payloads.
- Forward/backward compatibility tests for events.
- Authorization tests for every endpoint and tool.
- Idempotency tests for all mutations and event consumers.

