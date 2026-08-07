# Personas and User Journeys

## Personas

### Business owner

Needs business results, understandable recommendations, predictable spending, and minimal operational burden. Does not want to learn prompts or platform internals.

### Marketing operator

Needs campaign and content control, evidence, fast iteration, bulk workflows, platform-native previews, and an audit trail.

### Approver

Needs a concise decision, exact proposed change, risk, cost, evidence, expiry, and rollback information. May approve through desktop or mobile.

### Analyst

Needs canonical metrics, freshness, source lineage, filters, experiment results, and the ability to reconcile platform and revenue data.

### Agency administrator

Needs tenant isolation, role assignment, connector health, policy templates, client-specific approvals, and portfolio-level operations without sharing client data.

### System operator

Needs deployment status, queues, connector errors, agent traces, policy decisions, incidents, kill switches, and safe replay tools.

## Journey 1: Onboard a business

1. The owner creates an organization and invites collaborators.
2. A wizard collects the website, offers, prices, margins, target customers, locations, exclusions, goals, budgets, brand rules, competitors, and prohibited claims.
3. The owner connects advertising, social, CRM, analytics, commerce, and revenue accounts through authorized flows.
4. The system inventories permissions and capabilities without making external changes.
5. Hermes proposes a Business and Marketing Profile based on supplied and connected evidence.
6. The owner corrects assumptions; corrections become versioned organization context.
7. The system proposes metric definitions, attribution caveats, approval rules, and a starting autonomy profile.
8. The owner signs off before recommendations or publishing begin.

## Journey 2: Review the initial audit

1. The system checks data health, tracking, historical campaigns, content, creative fatigue, funnel stages, and competitor context.
2. The user receives findings ranked by potential value, confidence, effort, and risk.
3. Each finding can be accepted into the opportunity registry, rejected with a reason, postponed, or discussed with the agent team.
4. Accepted findings become proposals or controlled experiments; no external change occurs implicitly.

## Journey 3: Create a multiplatform paid campaign

1. The user enters an offer, objective, qualified outcome, geography, total budget, duration, and constraints.
2. The user selects one or more of the seven paid platforms.
3. Hermes asks only unresolved material questions.
4. Cross-channel, budget, creative, measurement, and selected platform agents prepare a coordinated plan.
5. The user reviews total and per-platform budget, audiences, campaign structures, creative, forecast assumptions, stop conditions, and tracking readiness.
6. The user edits or regenerates individual platform sections without invalidating unrelated approved work.
7. The system freezes a proposal snapshot and validates current platform capability and state.
8. Authorized approvers approve all or selected platform launches.
9. Deterministic executors create the campaigns and record every platform response.
10. The system reconciles delivered state and begins monitoring outcomes.

## Journey 4: Create an organic content program

1. The user starts from a topic, offer, source asset, campaign, transcript, announcement, or research request.
2. Research and brand agents create a source brief with claims and citations.
3. The creative team proposes concepts and assets.
4. Each selected channel specialist creates a native variant.
5. The user previews LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and Reddit versions.
6. The user edits, requests alternatives, approves, and schedules per channel.
7. The publishing service validates current permissions and media constraints before delivery.
8. Publication receipts and analytics flow back into the content record.
9. The system recommends repurposing winners, revising weak variants, or using strong organic concepts as paid hypotheses.

## Journey 5: Process an approval

1. The approver receives a notification with the action, reason, cost, confidence, risk, evidence, and expiry.
2. The approver opens an authenticated approval card.
3. They view the exact before-and-after state and any dependent actions.
4. They approve, reject, edit, defer, or ask for an explanation.
5. Approval creates an immutable decision record tied to a proposal hash.
6. Execution revalidates platform state and policy; material drift invalidates the approval.

## Journey 6: Daily operation

1. The command center summarizes spend, qualified outcomes, revenue, content status, experiments, anomalies, and pending decisions.
2. The user sees only material exceptions by default.
3. The daily briefing explains what changed and why it matters.
4. The user can ask questions in plain language; answers link to metrics and evidence.
5. State-changing requests become proposals unless already authorized by a bounded policy.

## Journey 7: Promote an action to bounded autonomy

1. The system accumulates shadow and approved-execution evidence for an action class.
2. Evaluation reports show precision, outcome impact, reversibility, and failure rate.
3. An administrator proposes limits by organization, platform, campaign, budget, and time window.
4. An authorized owner approves the policy version.
5. The system auto-executes only matching actions and immediately records and reports them.
6. Limit breach, data staleness, policy uncertainty, or incident state reverts the action class to approval-required.

## Journey 8: Investigate or reverse a change

1. The user opens an execution record from a campaign, post, alert, or audit log.
2. The record shows proposal, evidence, policy decision, approver, executor, platform request, and observed result.
3. If a compensating action exists, the user previews and approves it.
4. The system executes the reversal, verifies external state, and links both records.
5. The incident or correction becomes evaluation data.

## Experience requirements

- No required prompt engineering.
- Plain-language summaries with optional technical detail.
- Progressive disclosure: business outcome first, platform detail second, raw evidence last.
- Every external action is visible in an activity stream.
- Empty, stale, partial, and conflicting data states are explicit.
- Accessibility target is WCAG 2.2 AA.
- Desktop-first operational surfaces with mobile-capable approvals and alerts.

