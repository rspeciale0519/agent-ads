# Technology Options

> **Research options:** Retained for tradeoff evidence. Current implementation defaults and decisions are maintained under [`docs/development`](../development/README.md).

## Decision criteria

Choose technology by reliability, data rights, control, auditability, and replacement cost—not by how many models or integrations a post advertises.

The MVP should minimize operational surface area. A tool belongs in the first release only if it solves a current requirement better than a small typed service.

## Agent harness

| Option | Strengths | Constraints | Recommended role |
|---|---|---|---|
| Hermes Agent | Provider-neutral; skills, memory, cron, MCP, messaging gateway; VPS-friendly | Broad capabilities require careful profiles, allowlists, and secret isolation | Internal research, diagnostics, and approval-digest harness |
| OpenClaw | Strong personal operator experience; skills, messaging, cron, local control | One-user trust model; installed plugins/skills are trusted code; not a multi-tenant authorization boundary | Optional personal operator console |
| Custom application worker | Typed contracts, exact authorization, predictable deployment, easiest to test | More engineering work; less ad-hoc flexibility | Required policy, execution, approval, and audit services |
| Claude Code/Codex-style coding agent | Excellent for building connectors, skills, tests, and analysis code | Interactive development surface, not production authorization | Development and controlled analyst workflows |

Recommendation: a custom application owns production state and permissions; Hermes may operate as a bounded internal harness over its read and proposal APIs.

Hermes officially documents more than 60 built-in tools, skills, memory, MCP, security controls, messaging, and cron. See [Hermes docs](https://hermes-agent.nousresearch.com/docs/) and [features](https://hermes-agent.nousresearch.com/docs/user-guide/features/overview/).

OpenClaw's own documentation says plugins are part of the trusted computing base and separate gateways/hosts are recommended across trust boundaries. See [OpenClaw security model](https://github.com/openclaw/openclaw/security).

## Model provider

| Approach | Use | Recommendation |
|---|---|---|
| Premium frontier model | complex diagnosis, research synthesis, creative strategy, policy-sensitive review | Default for high-impact judgment while evals are small |
| Smaller hosted model | classification, extraction, tagging, simple rewriting | Adopt after task-specific evals show parity |
| Local model | low-sensitivity extraction or high-volume bounded tasks | Optional; avoid if it weakens tool-use or injection resistance |
| Model router / Nous Portal | operational provider choice and consolidated access | Useful convenience, but not a governance layer |

Do not hard-code one model name into skills. Store task class, required capabilities, approved model set, fallback, cost ceiling, and eval threshold.

The current Nous Portal page advertises 252 accessible models, not the 244 shown in the bookmark. See [Nous Portal](https://portal.nousresearch.com/info). This illustrates why volatile catalog counts belong in operational configuration, not durable architecture.

## Ingestion

| Option | Strengths | Constraints | Recommendation |
|---|---|---|---|
| Airbyte | Open source; broad replication catalog; incremental sync patterns | Connector quality and schema semantics vary; operational footprint | Use for supported read replication after connector validation |
| Direct API clients | Exact schemas, quotas, permissions, and execution semantics | More code and maintenance | Use for platform mutations and critical/poor-fit sources |
| Managed ELT vendor | Fast setup and support | Cost and vendor dependency | Consider if time-to-value outweighs self-hosting |
| Browser automation | Works when no API exists | Fragile, policy-sensitive, high security risk | Last resort; never default for ad-platform management |

Airbyte's official documentation positions it as both a data replication platform and a context layer for agents. See [Airbyte docs](https://docs.airbyte.com/).

## Warehouse

| Option | Strengths | Constraints | Best fit |
|---|---|---|---|
| PostgreSQL | Simple, transactional, familiar, adequate for modest event volume | Less efficient for large analytical scans | MVP and low-volume businesses |
| ClickHouse | Fast columnar analytics, high ingestion, strong event workloads | Additional modeling/operations; not OLTP | Larger multi-channel event history and interactive analytics |
| BigQuery/Snowflake | Managed scale and ecosystem | Cost governance and vendor dependency | Existing enterprise data platform |

Recommendation: use the project's existing warehouse if it can enforce canonical models and freshness. If greenfield, start with managed Postgres unless expected data volume or query latency already justifies ClickHouse. Preserve an interface that permits later migration.

## Transformation and semantic metrics

| Option | Recommendation |
|---|---|
| SQL migrations + typed metric functions | Best for a small MVP with few governed metrics |
| dbt or equivalent transformation framework | Add when model lineage, tests, ownership, and CI scale beyond simple migrations |
| Dedicated semantic layer | Add when many surfaces must produce the exact same metric definitions |

The non-negotiable element is governance: one owned definition per decision metric, versioned and tested.

## Scheduling and queues

| Option | Strengths | Recommendation |
|---|---|---|
| Application scheduler + durable queue | Typed jobs, retry control, observable | Preferred production core |
| Hermes cron | Skills and messaging delivery; supports no-agent script mode | Good for internal reports and bounded analysis |
| OpenClaw cron | Persistent gateway jobs and delivery | Good for personal/operator automations |
| Cloud cron alone | Simple | Only for enqueueing idempotent jobs, not carrying business state |

Hermes's no-agent cron mode is particularly useful for deterministic scripts that need no inference. See [Hermes scheduled tasks](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron). OpenClaw stores schedules and run history durably and separates command payloads from model-visible exec tools. See [OpenClaw cron](https://docs.openclaw.ai/cron-jobs).

## API and tool protocol

Use ordinary internal HTTP/queue APIs for application services. Add MCP adapters when an agent client needs discoverable tools.

MCP requirements:

- one narrow server per trust boundary or clear per-tool scopes
- OAuth 2.1 for remote servers
- audience-bound tokens and no token passthrough
- short-lived credentials
- sandboxed local servers with restricted filesystem/network access
- explicit approval for high-impact tools
- schemas enforced server-side

See [MCP security practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) and [authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization).

## Social scheduling and analytics

| Option | Strengths | Constraints | Recommendation |
|---|---|---|---|
| Postiz | Open source/self-hosted, public API, many platforms, analytics | Platform-specific API limitations remain | Preferred open scheduler candidate |
| Blotato | API, MCP, content automation courses/workflows | SaaS dependency; verify each platform permission | Viable managed publisher |
| Native platform APIs | Maximum control and audit | Higher engineering burden and app review | Required for critical/high-scale channels |

Postiz documents API-key/OAuth authentication, cloud/self-hosted endpoints, batching, platform integrations, and analytics. See [Postiz API overview](https://docs.postiz.com/public-api/introduction) and [platform analytics](https://docs.postiz.com/public-api/analytics/platform).

## Creative generation

| Option | Use | Controls required |
|---|---|---|
| Image/video model through Higgsfield MCP | concept exploration and asset variants | brand template, claim review, likeness/IP review, disclosure, human selection |
| React/HTML templates rendered to image | repeatable branded statics at volume | responsive text constraints, snapshot tests, accessible source data |
| Native Meta Advantage+ creative | placement adaptation and variations | verify previews, brand settings, account policy |
| Human design tools | hero assets and high-risk claims | ordinary design QA |

The X thread confirmed a practical static path: React components with text variants rendered to 1080x1080 PNGs. This is more deterministic than asking an image model to reproduce typography. Use generative models for concept imagery and templates for exact copy/layout.

Higgsfield's official MCP page confirms agent-compatible image/video generation. See [Higgsfield MCP](https://higgsfield.ai/mcp). Meta itself offers automated creative variations and placement adaptation through [Advantage+ creative](https://www.facebook.com/business/ads/meta-advantage-plus/creative).

## Ad-platform execution

### Meta

- Use the official Marketing API.
- Create a dedicated app/integration and request only required permissions.
- Separate reporting and mutation services.
- Use incremental insights reads; comply with quotas and data-use checks.
- Avoid browser automation for Ads Manager when an API path exists.

The official [Meta Marketing API Postman collection](https://www.postman.com/meta/facebook-marketing-api/overview?sideView=agentMode) demonstrates campaign/ad creation and insights retrieval.

### Google Ads

- Use the official Google Ads API and OAuth/developer-token flow.
- Query conversions and search terms with data-lag awareness.
- Apply typed mutations and keep change-event history.
- Treat platform recommendations as inputs, not mandatory truth.

Google exposes services to retrieve, apply, dismiss, and subscribe to eligible recommendations, and change events identify auto-applied changes. See [Google Ads recommendations](https://developers.google.com/google-ads/api/docs/recommendations).

### Microsoft Advertising

The bookmark's core feature claim is real: Microsoft Advertising supports LinkedIn profile targeting by company, industry, and job function. The “literally new in June 2026” framing was not independently verified and should not drive urgency. See [Microsoft audience targeting](https://about.ads.microsoft.com/en/tools/performance/audience-targeting).

## Research tooling

Useful components:

- official ad libraries and platform APIs
- Search Console, analytics, CRM, call transcripts, customer interviews
- approved web/search providers
- `last30days`-style multi-source research with clear source provenance

Do not assume third-party scrapers have platform permission. The `last30days` repository is valuable as a design reference for entity resolution, cross-source deduplication, engagement weighting, and citations, but some sources rely on optional credentials or scraping providers. See [last30days repository](https://github.com/mvanhorn/last30days-skill).

## Secrets and approvals

Recommended:

- managed secret store or platform-native secret references
- one credential per service and environment
- short lifetimes and rotation where possible
- environment-level approval gates for production write secrets
- no secrets in skills, prompts, memory, or logs

GitHub environments can withhold environment secrets until required reviewers approve a job; this is useful for deployment, though application-time marketing approvals should live in the product. See [GitHub Actions secrets](https://docs.github.com/en/enterprise-cloud%40latest/actions/concepts/security/secrets).

## Recommended MVP stack

Technology-agnostic baseline:

- existing project application/runtime
- managed PostgreSQL for raw/canonical MVP data
- durable queue and scheduler
- direct Meta Marketing API read/write clients with separate credentials
- CRM and billing webhooks/direct connectors
- versioned SQL/typed metric service
- typed proposal/policy/approval/audit services
- frontier model through a provider-neutral adapter
- optional Hermes profile for research and digest generation
- object storage for assets and raw payload archives
- standard logs, metrics, and traces

Add ClickHouse, Airbyte, Postiz, Higgsfield, OpenClaw, or a model router only when a measured requirement justifies each operational dependency.
