# Agentic Marketing System — Development Documentation

## Purpose

This directory is the authoritative build specification for the agentic marketing system. It translates the bookmark research and the owner's subsequent product decisions into an implementation-ready contract.

Research evidence remains under [`docs/agentic-marketing`](../agentic-marketing/README.md). When a research-era recommendation conflicts with this directory, this directory controls product scope and implementation.

## Product definition

The product is a multi-tenant marketing operating system for nontechnical business users. A Hermes-centered team of specialist agents researches, plans, drafts, analyzes, and recommends. Deterministic application services own identity, canonical metrics, policy, approvals, credentials, execution, audit, and rollback.

The MVP includes:

- Paid campaign management for Meta Ads, Google Ads, Microsoft Advertising, LinkedIn Ads, TikTok Ads, Reddit Ads, and X Ads.
- User selection of any one or any combination of those paid platforms for a campaign.
- Organic publishing for LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and authorized Reddit communities.
- Hermes as the chief marketing orchestrator with bounded specialist-agent roles.
- Unified business context, creative production, measurement, recommendations, approvals, experimentation, and reporting.
- A performance-seeking operating posture: retain and test every legal, permitted, potentially useful tactic; never execute illegal, unauthorized, deceptive, or enforcement-evasive mechanisms.

Availability is subject to the client holding eligible accounts, granting required permissions, and receiving any platform or developer approvals. Unsupported platform operations must be represented honestly through capability flags; browser automation must not impersonate unavailable official advertising APIs.

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
- [Domain data model](./architecture/domain-data-model.md)
- [API, event, and tool contracts](./architecture/api-event-and-tool-contracts.md)
- [Platform integration architecture](./architecture/platform-integration-architecture.md)

### Capabilities

- [Paid advertising specification](./capabilities/paid-advertising.md)
- [Organic publishing specification](./capabilities/organic-publishing.md)
- [Creative and content pipeline](./capabilities/creative-and-content-pipeline.md)
- [Measurement, attribution, and experimentation](./capabilities/measurement-attribution-and-experimentation.md)
- [Platform capability verification matrix](./capabilities/platform-capability-matrix.md)

### Quality and operations

- [Security, privacy, compliance, and autonomy](./quality/security-privacy-compliance-and-autonomy.md)
- [Testing and agent evaluation](./quality/testing-and-agent-evaluation.md)
- [Deployment, environments, and operations](./quality/deployment-environments-and-operations.md)
- [Observability and incident response](./quality/observability-and-incident-response.md)

### Delivery and governance

- [Implementation roadmap](./delivery/implementation-roadmap.md)
- [Pilot onboarding and launch](./delivery/pilot-onboarding-and-launch.md)
- [Risk register](./delivery/risk-register.md)
- [Decision register](./governance/decision-register.md)
- [Requirements traceability](./governance/requirements-traceability.md)
- [Open questions](./governance/open-questions.md)

## Required reading order

1. Product brief
2. Product requirements
3. UX and information architecture
4. System architecture
5. Hermes multi-agent architecture
6. Domain data model
7. Platform integration architecture
8. Security and autonomy
9. Capability specifications
10. Testing, operations, and implementation roadmap

## Authority and change control

- Product decisions are recorded in the decision register.
- Requirements use stable identifiers and are mapped in the traceability document.
- Material scope, data, security, or autonomy changes require a new decision entry and corresponding requirement updates.
- Platform capability claims must be verified against current official documentation before connector implementation and again before release.
- Generated agent instructions and skills are versioned production artifacts with owners, evals, and rollback.

## Definition of implementation-ready

A work item is implementation-ready only when it identifies its requirement IDs, tenant and permission boundary, data inputs and outputs, API or event contract, failure behavior, observability, test evidence, rollout gate, and rollback behavior.
