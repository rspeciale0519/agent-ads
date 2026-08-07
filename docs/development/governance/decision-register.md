# Decision Register

## Status conventions

- `accepted`: controls current implementation.
- `proposed`: awaiting owner decision.
- `superseded`: retained for history.
- `rejected`: considered and not selected.

## Accepted decisions

### D-001 — Product is a governed marketing operating system

- Status: accepted.
- Decision: build a client-facing system for paid, organic, creative, measurement, experiments, approvals, and reporting rather than a raw agent console.
- Reason: nontechnical users need outcomes and control, not prompting expertise.

### D-002 — Hermes is the chief marketing orchestrator

- Status: accepted.
- Decision: use Hermes to coordinate bounded specialist roles, skills, memory, schedules, and tools through an application-owned adapter.
- Constraint: Hermes is not the authorization, policy, credential, metric, or mutation authority.

### D-003 — Specialist-agent target architecture

- Status: accepted.
- Decision: use logical specialists for context, research, strategy, budget, creative, seven paid platforms, seven organic channels, measurement, and quality.
- Reason: platform-native expertise, smaller context/tool surface, and independent evaluation.

### D-004 — All seven paid platforms are MVP scope

- Status: accepted.
- Decision: Meta, Google, Microsoft, LinkedIn, TikTok, Reddit, and X advertising are available for user multi-selection in the MVP.
- Constraint: actual use requires eligible accounts, official/authorized access, and capability verification.

### D-005 — All seven organic channels are MVP scope

- Status: accepted.
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

- Status: accepted pending implementation validation.
- Decision: TypeScript strict, Next.js, Zod, PostgreSQL, Prisma, Temporal, S3-compatible storage, OpenTelemetry, managed secrets, and Hermes gateway.
- Reason: fits project conventions and durable workflow/security needs.

### D-013 — Modular monolith with isolated workers

- Status: accepted.
- Decision: begin with strong code-module boundaries and separately deploy Hermes, connector/mutation, and workflow workers; avoid premature microservices.

### D-014 — Organic publishing route abstraction

- Status: accepted.
- Decision: support native APIs and authorized providers such as Postiz or Blotato behind one capability-aware route contract.

### D-015 — Business outcomes are the optimization authority

- Status: accepted.
- Decision: optimize confirmed/qualified outcomes where available; label platform metrics and attribution separately.

### D-016 — Research-era single-Meta scope is superseded

- Status: accepted.
- Decision: the earlier conservative single-Meta pilot remains research evidence but no longer defines MVP scope.

### D-017 — Client onboarding form is a Phase 0 deliverable

- Status: accepted.
- Decision: create a polished, shareable, save-and-resume web form for the pilot company's business, goal, channel, brand, system, and approval context.
- Constraint: the form never collects credentials; production submission is authenticated, tenant-scoped, versioned, audited, and backed by secure connection flows.

## Decision process

New material decisions must state context, options, decision, consequences, owner, date, status, affected requirement IDs, and any migration. Superseded decisions are never deleted.
