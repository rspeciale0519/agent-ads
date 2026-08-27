# Personas and User Journeys

## Personas

### Sales trainer and business owner

Sells speeches, workshops, training programs, or consulting. Needs qualified leads, booked calls, closed deals, and clear marketing actions.

Does not want to learn prompts, code, campaign structures, attribution models, or agent roles.

### Assistant or marketer

Helps manage content, leads, schedules, and approvals. Needs clear ownership, evidence, and activity history.

### Approver

Needs the exact proposed change, destination, reason, risk, cost, expiry, and rollback. Can approve through desktop or mobile.

### System operator

Needs connector health, data quality, security events, failed workflows, kill switches, and safe recovery tools.

Agency administration, deep analysis workspaces, and broad channel operations are expansion personas.

## Journey 1: Onboard through AI Reach

1. The owner creates an organization and opens AI Reach.
2. AI Reach asks short questions about the offer, audience, location, funnel, goals, budget, brand, and claims.
3. Structured cards collect details that need exact values.
4. The owner connects the website, GA4, Search Console, the selected CRM, and the approved advertising sources.
5. The owner connects Google Ads, Meta Ads, or both, as selected in the Pilot Scope Record. Both read adapters ship.
6. AI Reach shows missing sources and the useful degraded mode for each gap.
7. The supervisor proposes a Business and Marketing Profile from approved evidence.
8. The owner corrects assumptions and approves the Pilot Scope Record.
9. The system makes no external change.

## Journey 2: Receive the first diagnosis

1. The system checks connector health, tracking, campaign results, landing pages, CRM stages, and AI Reach evidence.
2. AI Reach explains what works, what wastes money, and what blocks discovery.
3. The outcome dashboard shows leads, booked calls, closed-won deals, booked revenue, and data limitations.
4. AI Reach gives exactly three actions with evidence, expected value, effort, risk, and uncertainty.
5. The owner can ask plain questions without learning a prompt format.
6. No recommendation changes an external system.

## Journey 3: Improve advertising safely

1. AI Reach reads connected Google Ads, Meta Ads, or both.
2. The system links available campaigns to landing-page behavior and CRM outcomes.
3. AI Reach identifies a pause candidate and explains the evidence and uncertainty.
4. The owner opens the proposal inside the conversation.
5. The proposal shows the exact campaign, current state, expected effect, risk, and resume path.
6. The owner approves or rejects the proposal.
7. The executor rechecks permission, policy, capability, and current state.
8. The executor pauses the campaign and reconciles the provider result.
9. AI Reach monitors later outcomes and offers resume when evidence supports it.

## Journey 4: Improve website discovery

1. AI Reach finds a factual, technical, or content gap.
2. The owner sees the affected page, evidence, and business reason.
3. AI Reach prepares a source brief from approved claims and first-hand expertise.
4. The content service creates a website draft and validation report.
5. The owner reviews and approves the exact draft.
6. The CMS connector creates a draft without publishing it.
7. A subject expert reviews the CMS draft before any later publication proposal.
8. After a separate Stage 3 publication gate executes an approved publication, AI Reach rechecks the evidence.

## Journey 5: Process an approval in chat

1. The approver receives a notification with the action, reason, cost, confidence, risk, evidence, and expiry.
2. The approver opens the same authenticated card in AI Reach or the approval queue.
3. They view the exact before-and-after state and any dependent actions.
4. They approve, reject, edit, defer, or ask for an explanation.
5. Approval creates an immutable decision record tied to a proposal hash.
6. Execution revalidates platform state and policy; material drift invalidates the approval.

## Journey 6: Daily operation

1. The owner opens AI Reach.
2. The conversation shows the latest outcome briefing and one compact dashboard.
3. The briefing explains material changes, data gaps, pending decisions, and three actions.
4. The owner asks questions in plain language and can inspect the supporting evidence.
5. A state-changing request becomes a proposal and never becomes hidden permission.

## Journey 7: Follow up with a lead

1. AI Reach identifies an approved lead that needs follow-up.
2. The system checks consent, suppression, purpose, destination, and CRM state.
3. AI Reach prepares a draft in the conversation.
4. The owner edits and approves the exact message and destination.
5. A separate executor sends it and stores the delivery result.
6. An uncertain result blocks blind retry.
7. CRM and booking events show the later outcome.

## Journey 8: Investigate or reverse a change

1. The user opens an execution record from a campaign, post, alert, or audit log.
2. The record shows proposal, evidence, policy decision, approver, executor, platform request, and observed result.
3. If a compensating action exists, the user previews and approves it.
4. The system executes the reversal, verifies external state, and links both records.
5. The incident or correction becomes evaluation data.

## Experience requirements

- No required prompt engineering.
- AI Reach guides the next question and shows structured choices when precision matters.
- Conversations keep organization context, evidence links, artifacts, proposals, and outcomes.
- Plain-language summaries with optional technical detail.
- Progressive disclosure: business outcome first, platform detail second, raw evidence last.
- Every external action is visible in an activity stream.
- Empty, stale, partial, and conflicting data states are explicit.
- Accessibility target is WCAG 2.2 AA.
- Chat, alerts, and approvals work on mobile.
- Missing connections and partial data produce useful explanations instead of dead ends.

## Expansion journeys

Full campaign building, broad organic publishing, channel calendars, specialist teams, agency administration, and bounded autonomy remain expansion work.
