# UX and Information Architecture

## Experience model

The product should feel like talking to a capable Marketing Director. The owner uses plain language and sees evidence before decisions. The Director is the owner's one relationship with the product; specialists work behind it (D-043, accepted).

AI Reach is a feature inside the product. It is the default pilot workspace, not the product name.

Agent runtimes, prompts, provider details, and specialist roles stay outside the normal customer experience.

### First screen

The first screen shows the goal, the current outcome, active work, and the decisions that need attention. The owner understands the next action without reading an advertising report.

### Daily briefing rule

The daily briefing shows ranked decisions, at most three, each with evidence, expected effect, cost exposure, and uncertainty. When no decision needs attention, the briefing says so in one line. A quiet day is a valid, complete briefing. Original rule: exactly three actions (D-033); amended by D-043.

## Global navigation

1. **AI Reach** — chat, current briefing, outcome dashboard, and ranked decisions.
2. **Work** — findings, drafts, campaign packages, proposals, completed actions, and activity.
3. **Decisions** — the single decision inbox: pending, expired, approved, rejected, and executed approvals.
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
- Ranked decisions (at most three) or the explicit no-decision state.
- Current mutation status, autonomy level per action class, and kill switch.

The default view leads with business outcomes. Platform details and raw evidence stay behind clear drill-down links.

The user can ask a question, choose a suggested question, or open an action card. The interface never requires a special prompt format.

## Campaign package artifact — first complete workflow (D-044, accepted)

The first useful release analyzes existing campaigns. It does not require campaign construction.

The first complete workflow adds the campaign package. The Director prepares it from the approved business memory; the owner reviews and approves it inside AI Reach or Work. The artifact retains these steps. Steps 2 and 3 use one paid channel in the first workflow.

### Package states

`drafting -> validated -> awaiting_package_approval -> approved -> creating_paused -> verifying -> awaiting_activation_approval | activation_bound -> activating -> live -> monitoring -> reconciled | failed | uncertain`

A changed object after approval returns the package to `validated` and requires new approval. The owner sees the exact difference.

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

### Step 6: Approval, creation, verification, and activation

- Approve the exact package, destination, and caps. One approval may bind creation and activation together.
- Require step-up authentication (current AAL2, active session, action-bound grant).
- Show paused objects as created, then the verification result against the approved package.
- Show the activation decision separately when the approval did not bind it, or when account state changed.
- Display execution progress, external identifiers, and the current reconciliation state.
- Show predictions beside results after the observation window.

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
- Give ranked decisions (at most three) in each formal briefing, or state that none is needed.
- Show the prediction that was recorded before approval and the observed result after the window.

## Autonomy settings

The pilot launches at L1 for every enabled action class. Later, users configure broader action classes through a policy builder (D-048, accepted).

| Level | Behavior | Owner view |
|---|---|---|
| L0 Observe | Report only | Briefing and evidence |
| L1 Propose | The owner approves each action | Decision inbox item per action |
| L2 Bounded | Execute inside a per-action cap and a per-period cap; a breach pauses the class | Daily digest; one switch to demote |
| L3 Delegated | Execute inside a period budget with a weekly review | Weekly review; one switch to demote |

`Prohibited` remains a policy result for blocked tactics. Policies display scope, thresholds, schedule, expiry, notification recipients, and recent evidence. The UI prevents contradictory policies and previews which actions a change would authorize. Promotion to L2 or L3 needs the customer's authorization and action-specific evidence; no numeric floor is universal.

## Empty and exceptional states

- Not connected: explain required account and permission.
- Optional connection missing: explain the reduced evidence and continue safely.
- Required CRM missing: show marketing signals but block booked-revenue claims.
- CRM stage map incomplete: block outcome optimization and request owner confirmation.
- Connected but ineligible: show platform-provided reason and remediation.
- Sync delayed: show last complete period and block affected optimization.
- Partial campaign support: expose capability limits before drafting.
- Approval expired: require regeneration/revalidation.
- Package changed after approval: show the exact difference and require new approval.
- Activation blocked by account drift: show what changed and the revalidation path.
- Budget reserved by another proposal: show the reservation and the remaining limit.
- Execution uncertain: never retry blindly; reconcile external state first.
- Insufficient evidence for a prediction: show the explicit state, not a guessed range.
- Work states: waiting, running, blocked, failed, uncertain, and complete, each with the next useful action.
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
