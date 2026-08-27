# Agentic Marketing System — Development Documentation

## Purpose

This directory is the authoritative build specification for the agentic marketing system. It translates the bookmark research and the owner's subsequent product decisions into an implementation-ready contract.

Research evidence remains under [`docs/agentic-marketing`](../agentic-marketing/README.md). When a research-era recommendation conflicts with this directory, this directory controls product scope and implementation.

## Product definition

The product is a cloud-hosted marketing operating system for nontechnical business owners. It turns plain-language goals into measured, supervised marketing work.

AI Reach is a feature inside the product. It is the primary chat workspace and helps users improve search and AI discovery.

The first pilot serves a sales trainer or similar expert-led business. It proves one complete outcome loop from discovery to booked revenue.

The first useful release is read-only. It connects approved website, analytics, search, advertising, and CRM sources.

Connect Google Ads, Meta Ads, or both, as selected in the Pilot Scope Record. Both read adapters ship.

AI Reach explains what works, what wastes money, what limits discovery, and which three actions matter now.

The pilot MVP then adds three supervised actions:

- create a CMS draft without publishing it;
- send one approved lead follow-up after consent checks;
- pause one approved advertising campaign with a tested resume path.

Every external action needs deterministic policy, approval, execution, reconciliation, audit, and a kill switch.

The initial pooled service uses the current Next.js control plane on Vercel with managed Supabase. OpenAI and Resend remain managed services.

Hermes, Temporal, Postiz, Coolify, broad specialist teams, and AWS remain trigger-based target components. They are not pilot release gates.

The seven paid and seven organic platform plans remain expansion specifications. They do not block the narrow pilot MVP.

Availability still depends on eligible client accounts, granted permissions, and provider approval. Capability flags must show every limit honestly.

## Documentation map

### Product

- [Product brief and scope](./product/product-brief.md)
- [Personas and user journeys](./product/personas-and-user-journeys.md)
- [Product requirements](./product/product-requirements.md)
- [UX and information architecture](./product/ux-and-information-architecture.md)
- [Client onboarding form](./product/client-onboarding-form.md)
- [Opportunity and experiment policy](./product/opportunity-and-experiment-policy.md)

### Architecture

- [System architecture](./architecture/system-architecture.md)
- [Hermes multi-agent architecture](./architecture/hermes-multi-agent-architecture.md)
- [Agent orchestration architecture](./architecture/agent-orchestration-architecture.md)
- [Cloud hosting and service delivery](./architecture/cloud-hosting-and-service-delivery.md)
- [Domain data model](./architecture/domain-data-model.md)
- [API, event, and tool contracts](./architecture/api-event-and-tool-contracts.md)
- [Platform integration architecture](./architecture/platform-integration-architecture.md)

### Capabilities

- [Paid advertising specification](./capabilities/paid-advertising.md)
- [Organic publishing specification](./capabilities/organic-publishing.md)
- [Creative and content pipeline](./capabilities/creative-and-content-pipeline.md)
- [AI Reach](./capabilities/ai-reach.md)
- [Measurement, attribution, and experimentation](./capabilities/measurement-attribution-and-experimentation.md)
- [Platform capability verification matrix](./capabilities/platform-capability-matrix.md)

### Quality and operations

- [Security, privacy, compliance, and autonomy](./quality/security-privacy-compliance-and-autonomy.md)
- [Testing and agent evaluation](./quality/testing-and-agent-evaluation.md)
- [Deployment, environments, and operations](./quality/deployment-environments-and-operations.md)
- [Observability and incident response](./quality/observability-and-incident-response.md)

### Delivery and governance

- [Implementation roadmap](./delivery/implementation-roadmap.md)
- [Phase 0 readiness workbook](./delivery/phase-0-readiness-workbook.md)
- [Pilot onboarding and launch](./delivery/pilot-onboarding-and-launch.md)
- [Risk register](./delivery/risk-register.md)
- [Decision register](./governance/decision-register.md)
- [Requirements traceability](./governance/requirements-traceability.md)
- [Open questions](./governance/open-questions.md)

## Required reading order

1. Product brief
2. Product requirements
3. UX and information architecture
4. AI Reach
5. Implementation roadmap
6. System architecture
7. Agent orchestration architecture
8. Domain data model
9. Platform integration architecture
10. Security and autonomy
11. Testing and operations
12. Other capability specifications
13. Hermes and cloud expansion architecture

## Authority and change control

- Product decisions are recorded in the decision register.
- Requirements use stable identifiers and are mapped in the traceability document.
- Material scope, data, security, or autonomy changes require a new decision entry and corresponding requirement updates.
- Platform capability claims must be verified against current official documentation before connector implementation and again before release.
- Generated agent instructions and skills are versioned production artifacts with owners, evals, and rollback.

## Definition of implementation-ready

A work item is implementation-ready only when it identifies its requirement IDs, tenant and permission boundary, data inputs and outputs, API or event contract, failure behavior, observability, test evidence, rollout gate, and rollback behavior.
