# Paid Advertising Specification

## Objective

Use Google Ads as the first paid channel. Explain performance through business outcomes before enabling any write. Then run one complete supervised acquisition workflow on the first channel (D-043, D-044, accepted 2026-10-04).

The full paid connector catalog remains an expansion target.

## Implemented behavior today (audit source: HEAD `4358fdf`, 2026-10-04)

Google: OAuth, account discovery, and the campaign report read (`lib/connections/providers/google-ads-report.ts`), verified locally only. Meta and TikTok: OAuth and asset discovery only; no campaign reporting. No write exists. Nothing is verified in a target environment. Everything under "Supervised action" and "First complete workflow" is design.

Under D-043 the required paid source is the one channel named in the Pilot Scope Record. Under earlier D-032 scope, Google Ads and/or Meta Ads reads are pilot sources.

## Pilot boundary

### Read-only release

- Discover eligible accounts and resources.
- Read campaign hierarchy, status, spend, delivery, performance, conversions, creative metadata, and landing-page links through official reporting APIs with scheduled, incremental, quota-aware synchronization (D-045).
- Show freshness, completeness, capability, and reconciliation status.
- Explain tracking gaps, waste, creative fatigue, message mismatch, and lead follow-up gaps.
- Create recommendations without external side effects.

### Supervised action (D-037, accepted)

Enable only `paid.campaign.pause` for one approved provider and account. Use `paid.campaign.resume` as rollback when current state permits it.

The action needs a current capability check, immutable proposal, AAL2 approval, destination binding, idempotency, reconciliation, audit, and kill switch.

### First complete workflow (D-044, accepted amendment to D-037)

The supervised acquisition workflow on Google Ads:

1. Review the approved offer, business memory, and customer goal.
2. Inspect existing campaign and website evidence.
3. Identify one useful acquisition experiment with a prediction.
4. Prepare the campaign package: structure, keywords or search themes, negatives, ads and assets, destination, tracking requirements, budget cap, schedule, and stop rules.
5. Produce a small creative batch and a landing-page draft sized to the test budget and conversion maturity.
6. Validate claims, brand, links, formats, and destination behavior.
7. Show complete previews, the exact objects, and the maximum spend exposure.
8. Obtain the owner's approval of the package, destination, and caps.
9. Create paused objects.
10. Verify the created objects against the approved package; show any difference.
11. Obtain or validate activation approval; revalidate account state.
12. Activate through the separately gated action.
13. Monitor pacing, delivery, rejection, and tracking health.
14. Reconcile provider state into canonical records.
15. Measure mature outcomes before recommending the next change.

### Action definitions

Each action is a separate definition with its own risk assessment, approval binding, tests, and gate. Gates may reuse infrastructure after their risks are assessed.

| Action | Class | Launch status | Notes |
|---|---|---|---|
| `paid.campaign.create_paused` | core | first workflow | Creates objects in a paused state only |
| `paid.campaign.activate` | core | first workflow | Separately gated; revalidates account state and approval before every activation |
| `paid.campaign.pause` | core | D-037 pilot | Low reversible |
| `paid.campaign.resume` | core | D-037 pilot | Restarts spending; separate from pause |
| `paid.budget.decrease` | conditional | own gate | Can harm delivery, learning, or contractual obligations; separate from pause |
| `paid.budget.increase` | conditional | own gate | Increases exposure; stale spend data blocks it |
| `paid.campaign.edit` | conditional | own gate | Supported properties only; changed objects invalidate earlier approval |
| `paid.conversion.upload` | conditional | own gate | Consequential write; see outcome uploads |
| Bid, audience, creative upload at volume, cross-platform allocation | expansion | later | Separate decision |

### Expansion

Bid changes, audience changes, creative upload at volume, cross-platform allocation, Meta supervised campaign work, and five additional ad platforms remain outside the first complete workflow.

## Campaign brief — supervised and expansion work

The read-only release does not require campaign construction.

Required inputs:

- organization and owner;
- offer and destination;
- primary business outcome and conversion definition;
- selected paid platforms;
- total budget, currency, schedule, and pacing preference;
- audience, geography, language, and exclusions;
- approved claims and prohibited content;
- creative inputs and rights;
- attribution and tracking plan;
- approval/autonomy profile;
- maximum loss and stopping rules.

## Cross-channel planning — expansion

The later orchestrator coordinates strategy, budget, creative, measurement, and selected platform profiles. The output must identify:

- the role of each platform in the funnel;
- per-platform budget range and rationale;
- audience overlap and cannibalization risk;
- platform-native objective and structure;
- creative concept reuse versus native variation;
- conversion signals and attribution limitations;
- forecast assumptions and uncertainty;
- test design and minimum learning budget;
- platform-specific and portfolio-level stop rules.

The user can remove a platform, lock an allocation, or request an alternative without regenerating unrelated approved sections.

## Shared lifecycle

`brief -> cross_channel_plan -> platform_drafts -> validation -> proposal -> approval -> execution -> reconciliation -> monitoring -> recommendation -> experiment/result`

No draft reaches a platform before proposal authorization.

## Pilot read capabilities

- Connect and verify advertiser accounts.
- Import existing campaign hierarchy and history.
- Ingest delivery, spend, performance, creative, and available conversion data.
- Detect anomalies, fatigue, pacing, and tracking failures.
- Record external edits and reconcile actual state.
- Compare platform results through canonical qualified outcomes.
- Display capability limits and provider errors in plain language.

## Supervised pause and resume

- Allowlist one provider, account, action type, and destination class first.
- Show the exact current and proposed state.
- Recheck current state immediately before execution.
- Reconcile before any retry.
- Resume only through a separate approved proposal unless the original approval explicitly binds a valid rollback.

## Approval binding and activation (D-044)

- Approval binds the exact package, account, destination, content version hash, caps, policy version, and expiry.
- A material change to any bound element, or to the account state, requires new approval. The owner sees the exact difference.
- Account state and the approval are revalidated before every activation. Seven days is a provisional maximum approval age, not a proven safety threshold.
- One explicit approval may cover package creation and activation together when it binds both steps and verification passes.
- Available budget is reserved across concurrent proposals and workers. Pending reservations count against limits. The local ledger records `dispatched` before the activation request is sent, and dispatched or uncertain exposure stays counted across failures. After independent provider reconciliation verifies activation, the local ledger updates atomically from `dispatched` to `committed` without reducing counted exposure; no transaction spans the database and the provider API. Expiry alone never releases funds after dispatch or during an uncertain result.
- A kill switch stops new dispatch and cancels queued work. An in-flight provider request may finish; its result is reconciled and recovered through an approved action.
- Provider reporting delays prevent an exact real-time spend guarantee. Combine platform caps, application reservations, pacing checks, and conservative buffers, and explain the remaining limit to the owner.
- A timeout after a provider write is an uncertain result. Reconcile provider state before retrying. Never create duplicate campaigns.
- Rollback has limits. A paused campaign can sometimes resume. Incurred spend and impressions cannot be recalled. Record recovery actions without promising full reversal.

## Outcome uploads (D-044, conditional)

`paid.conversion.upload` sends approved outcomes to the platform as offline conversions. It is a consequential write because it affects bidding and transmits customer event data.

- Validate event identity, mapping, duplicates, permissions, and diagnostics before use.
- Verify the current official route at implementation time. Google's current documentation directs new restricted upload integrations to Data Manager; the connector must follow the route that is current when it is built.
- Upload the reliable approved outcome, not automatically the deepest event.
- An approved fresh CSV can supply outcomes for an assisted pilot when its lag is visible.
- This action does not block a pilot whose chosen funnel does not need it.

## Working with platform automation

Meta's delivery optimization and Google's AI campaign types already automate targeting and bidding. The product works with native optimization. It improves the offer, creative inputs, conversion signals, landing experience, and business constraints. Repeated bid changes are not a substitute for this work. Conversion delays can make recent cost-per-result figures look worse; the Director needs mature decision windows before changing campaigns.

## Expansion capabilities

- Create campaign drafts without external side effects.
- Manage supported text, image, video, destination, tracking, schedule, and budget fields.
- Display platform validation and policy feedback.
- Launch approved campaigns.
- Edit supported properties through approved actions.

## Platform analysis responsibilities

Meta Ads and Google Ads are pilot analysis profiles. The other platform profiles are expansion work.

### Meta Ads

- Translate into account-eligible campaign, ad-set, ad, audience, placement, and creative structures.
- Support broad/automated and explicit targeting strategies as capabilities allow.
- Validate pixel/conversion and CRM/offline outcome readiness.
- Treat customer-list audiences as sensitive data operations.
- Analyze creative fatigue, placement, delivery, and qualified outcomes.

### Google Ads

- Translate funnel intent into eligible search, shopping, video, display, or automated campaign structures.
- Handle keywords/search themes, negatives, match behavior, ads/assets, feeds, bidding, and conversion actions as supported.
- Preserve search-query evidence and landing-page/message alignment.
- Treat platform recommendations as evidence, not commands.

### Microsoft Advertising

- Translate eligible search/audience plans and available professional-profile targeting.
- Preserve provider-specific import, targeting, reporting, and conversion semantics.
- Never assume parity with Google or LinkedIn capabilities.

### LinkedIn Ads

- Support account-eligible B2B objectives, professional audiences, company/page identity, creative, forms, and conversion signals.
- Apply high-cost and narrow-audience guardrails.
- Separate authorized advertising operations from prohibited profile scraping or user automation.

### TikTok Ads

- Emphasize video-native creative iteration, rapid fatigue monitoring, and platform-eligible objectives/audiences.
- Validate media and identity requirements before approval.
- Distinguish paid campaign operations from organic publishing permissions.

### Reddit Ads

- Support authorized paid placements, targeting, creative, and conversion measurement.
- Preserve community and brand-context concerns in creative review.
- Never use aged accounts, fake participation, proxy rotation, or enforcement evasion.

### X Ads

- Support account-eligible campaign objectives, audiences, creatives, budgets, and reporting.
- Separate advertising access from organic publishing credentials and actions.
- Surface any account/API eligibility limitations before campaign planning is approved.

## Budget controls

- Total campaign and per-platform hard caps.
- Daily and lifetime caps where supported.
- Organization and account monthly ceilings.
- Maximum change amount and percentage.
- Minimum data and confidence thresholds.
- No reallocation that increases total approved exposure.
- Reallocation proposals include the losing and receiving platforms, expected effect, uncertainty, and test consequences.
- Currency conversion source and timestamp are explicit.
- Spend data staleness beyond policy threshold blocks automatic increases.

## Creative controls

- Every asset has provenance and rights status.
- Each claim maps to approved evidence.
- Technical validation is platform/account specific.
- Platform-native previews are shown before approval when available; otherwise the UI labels its preview as an approximation.
- Generated variants retain source concept and transformation lineage.
- Sensitive or regulated content routes to required human review.

## Optimization recommendations

Supported recommendation classes include:

- pause/resume;
- creative refresh and variant tests;
- destination or message-match improvements;
- conversion tracking repair;
- lead follow-up repair;
- AI Reach content-gap repair.

Budget decrease, budget increase, and campaign edit become conditional action classes under D-044. Bid, audience, placement, and cross-platform changes remain recommendation-only expansion classes.

Recommendations must state the authoritative metric window, sample sufficiency, expected benefit, risk, and alternate explanation. Every proposal records its prediction before approval (LRN-001).

## Read readiness gate

A pilot platform is read-ready when an eligible test account completes connection, capability discovery, historical read, insight ingestion, reconciliation, tenant tests, failure handling, and revocation.

## Pause and resume readiness gate

The selected provider and account must pass AAL2 approval, scope separation, destination binding, drift, idempotency, unknown-result, reconciliation, kill-switch, pause, and resume tests.

## Campaign package readiness gate (D-044, accepted)

The first channel must pass: package validation against current account capability; exact-package approval binding; paused creation; verification against the package; activation revalidation after account drift; stale-approval rejection; edited-package invalidation; budget reservation under concurrent proposals; uncertain-result reconciliation; restart during execution; kill switch after queueing and before execution; and audit reconstruction of the whole history.

## Conditional action gates (D-044)

Existing-campaign edit, budget decrease, budget increase, and outcome upload each need their own official capability, account eligibility, validation, approval, execution, reconciliation, audit, and recovery evidence before they are enabled for an organization.

## Full mutation readiness gate — expansion

Each later action needs its own official capability, account eligibility, validation, approval, execution, reconciliation, audit, and rollback evidence.
