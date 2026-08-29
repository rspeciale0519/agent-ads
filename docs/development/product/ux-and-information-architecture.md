# UX and Information Architecture

## Experience model

The product should feel like talking to a capable marketing manager. The owner uses plain language and sees evidence before decisions.

AI Reach is a feature inside the product. It is the default pilot workspace, not the product name.

Agent runtimes, prompts, provider details, and specialist roles stay outside the normal customer experience.

## Global navigation

1. **AI Reach** — chat, current briefing, outcome dashboard, and three actions.
2. **Work** — findings, drafts, proposals, completed actions, and activity.
3. **Decisions** — pending, expired, approved, rejected, and executed approvals.
4. **Connections** — accounts, permissions, capabilities, sync health, and errors.
5. **Settings** — business profile, users, roles, notifications, policies, plan, and billing.

Expansion workspaces can add campaigns, content calendars, experiments, deep analytics, and agency administration without changing this simple top level.

The UI never requires direct cloud, database, provider-console, or agent-runtime access.

## AI Reach home

### Required modules

- Persistent conversation with organization context.
- Latest requested, daily, or weekly briefing.
- Qualified leads, booked calls, closed-won deals, and booked revenue.
- Google Ads and Meta Ads source contribution where connected.
- Search and AI Reach discovery status.
- Data freshness, missing sources, and connector health.
- Material changes and pending decisions.
- Exactly three recommended actions.
- Current mutation status and kill switch.

The default view leads with business outcomes. Platform details and raw evidence stay behind clear drill-down links.

The user can ask a question, choose a suggested question, or open an action card. The interface never requires a special prompt format.

## Paid campaign artifact — expansion

The first useful release analyzes existing Google Ads and Meta Ads campaigns. It does not require campaign construction.

Later, AI Reach can start a structured campaign artifact from chat. The artifact retains these steps.

### Step 1: Goal

- Offer and destination.
- Business outcome and canonical conversion.
- Geography and audience constraints.
- Total budget and schedule.
- Risk and approval profile.

### Step 2: Platforms

- Select only connected and eligible platforms.
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

## Content workspace — expansion

The pilot uses a website-draft artifact inside Work. A broad social content workspace is expansion scope.

### Views

- Ideas and research inbox.
- Source briefs.
- Creative production board.
- Channel variants.
- Calendar by channel, campaign, owner, and status.
- Published library and performance.

### Composer

The later social composer begins with an approved source of truth and displays channel-specific tabs. Each tab preserves preview, validation, history, and approval.

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

The same immutable approval card appears inside AI Reach and in Decisions. Both views show the same state.

## AI Reach conversation

The conversation supports onboarding, analysis, explanation, drafting, proposals, approvals, progress, results, and navigation. It must:

- Resolve the current organization and user permission before every answer.
- Cite internal metrics, sources, campaign objects, and research.
- Label assumptions and data limitations.
- Present structured controls for material choices.
- Create proposals for state changes.
- Never interpret conversational urgency as permission escalation.
- Offer links to inspect or edit generated artifacts.
- Show loading, cancel, retry, partial-result, and support-handoff states.
- Keep prior context visible without treating old context as current permission.
- Give exactly three actions in each formal briefing.

## Autonomy settings — expansion

The pilot uses observe, recommend, and approval-required levels. Later, users configure broader action classes through a policy builder.

The complete levels are:

1. Observe only.
2. Recommend.
3. Approval required.
4. Bounded autonomy.
5. Prohibited.

Policies display scope, thresholds, schedule, expiry, notification recipients, and recent evidence. The UI prevents contradictory policies and previews which actions a change would authorize.

## Empty and exceptional states

- Not connected: explain required account and permission.
- Optional connection missing: explain the reduced evidence and continue safely.
- Required CRM missing: show marketing signals but block booked-revenue claims.
- CRM stage map incomplete: block outcome optimization and request owner confirmation.
- Connected but ineligible: show platform-provided reason and remediation.
- Sync delayed: show last complete period and block affected optimization.
- Partial campaign support: expose capability limits before drafting.
- Approval expired: require regeneration/revalidation.
- Execution uncertain: never retry blindly; reconcile external state first.
- Platform rejection: preserve platform message, map to the proposal, and suggest compliant edits.
- Kill switch active: permit read, analysis, and drafts while clearly disabling execution.
- Conversation interrupted: preserve completed artifacts and offer a safe retry.
- AI Reach sample partial: show the sample count and never present it as complete coverage.

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
- Mobile-complete AI Reach chat and approval flows.
- Color is never the sole risk or status indicator.
- Currency, time zone, locale, and date formatting are organization-aware.
- Text generation stores source language and target locale; translation is a distinct reviewed transformation.
