# UX and Information Architecture

## Experience model

The product should feel like managing a capable marketing team. Hermes and specialist-agent internals remain inspectable for operators but are not the primary client interface.

## Global navigation

1. **Home** — command center and daily briefing.
2. **Campaigns** — cross-platform paid plans, drafts, live campaigns, and changes.
3. **Content** — ideas, source briefs, assets, channel variants, and editorial calendar.
4. **Opportunities** — findings, experiment backlog, active tests, and learnings.
5. **Analytics** — canonical performance, attribution, funnel, and executive reporting.
6. **Approvals** — pending, expired, approved, rejected, and executed actions.
7. **Marketing Team** — conversational interface, agent roles, recent runs, and explanations.
8. **Knowledge** — business profile, brand, offers, audiences, claims, competitors, and corrections.
9. **Connections** — platform accounts, permissions, capabilities, sync health, and errors.
10. **Settings** — organization, users, roles, budgets, policies, autonomy, notifications, and billing.

## Home command center

### Required modules

- Spend and budget pacing.
- Qualified leads, customers, pipeline, revenue, margin, and target comparison.
- Platform and funnel summaries.
- Data freshness and connector health.
- Material changes since last visit.
- Creative fatigue and anomaly warnings.
- Organic publishing status.
- Active experiments and confidence.
- Pending approvals.
- Recommended next actions.
- Global mutation status and kill switch.

The default view leads with business outcomes. Platform metrics are drill-down details.

## Campaign builder

### Step 1: Goal

- Offer and destination.
- Business outcome and canonical conversion.
- Geography and audience constraints.
- Total budget and schedule.
- Risk and approval profile.

### Step 2: Platforms

- Multi-select the seven paid platforms.
- Show connection, eligibility, capability, data-quality, and historical-signal status.
- Let the user request or override a proposed allocation.

### Step 3: Strategy

- Cross-channel role of each selected platform.
- Audience and intent assumptions.
- Campaign structure.
- Measurement and attribution plan.
- Forecast range and uncertainty.
- Guardrails and stop conditions.

### Step 4: Creative

- Shared concepts and claims.
- Platform-native copy and assets.
- Asset provenance and rights.
- Brand, factual, policy, and technical validation.

### Step 5: Review

- Total and per-platform cost exposure.
- Exact objects to be created.
- Dependencies and tracking readiness.
- Warnings, unsupported features, and alternatives.

### Step 6: Approval and launch

- Approve all or selected platform proposals.
- Require step-up authentication for configured high-risk actions.
- Display execution progress and external identifiers.

## Content workspace

### Views

- Ideas and research inbox.
- Source briefs.
- Creative production board.
- Channel variants.
- Calendar by channel, campaign, owner, and status.
- Published library and performance.

### Composer

The composer begins with an approved source of truth, then displays channel tabs. Each tab includes a realistic preview, validation, edit history, approval status, and scheduled time. Users can regenerate one variant without overwriting manual edits elsewhere.

## Approval card

Every approval card must show:

- Action and destination.
- Reason and triggering condition.
- Evidence with freshness.
- Expected benefit and uncertainty.
- Cost and maximum exposure.
- Risk class and policy result.
- Exact before-and-after state.
- Dependencies and related approvals.
- Expiry.
- Rollback or mitigation.
- Approve, reject, edit, defer, and ask buttons.

Approval cannot be a vague confirmation of a conversational instruction.

## Conversational interface

The interface supports analysis, explanation, creation, and navigation. It must:

- Resolve the current organization and user permission before every answer.
- Cite internal metrics, sources, campaign objects, and research.
- Label assumptions and data limitations.
- Present structured controls for material choices.
- Create proposals for state changes.
- Never interpret conversational urgency as permission escalation.
- Offer links to inspect or edit generated artifacts.

## Autonomy settings

Users configure actions through a policy builder, not raw prompts. Levels are:

1. Observe only.
2. Recommend.
3. Approval required.
4. Bounded autonomy.
5. Prohibited.

Policies display scope, thresholds, schedule, expiry, notification recipients, and recent evidence. The UI prevents contradictory policies and previews which actions a change would authorize.

## Empty and exceptional states

- Not connected: explain required account and permission.
- Connected but ineligible: show platform-provided reason and remediation.
- Sync delayed: show last complete period and block affected optimization.
- Partial campaign support: expose capability limits before drafting.
- Approval expired: require regeneration/revalidation.
- Execution uncertain: never retry blindly; reconcile external state first.
- Platform rejection: preserve platform message, map to the proposal, and suggest compliant edits.
- Kill switch active: permit read, analysis, and drafts while clearly disabling execution.

## Notification model

### Immediate

- Security incident.
- Unauthorized or unexpected external state.
- Spend guardrail breach.
- Failed or uncertain high-impact execution.
- Platform enforcement warning.

### Batched

- Normal approvals.
- Data-quality issues.
- Content readiness.
- Experiment milestones.
- Daily and weekly summaries.

## Accessibility and internationalization

- WCAG 2.2 AA.
- Keyboard and screen-reader complete approval and campaign flows.
- Color is never the sole risk or status indicator.
- Currency, time zone, locale, and date formatting are organization-aware.
- Text generation stores source language and target locale; translation is a distinct reviewed transformation.

