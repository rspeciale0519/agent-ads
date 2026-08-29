# Paid Advertising Specification

## Objective

Use Google Ads and Meta Ads as pilot read sources. Explain performance through business outcomes before enabling any write.

The full paid connector catalog remains an expansion target.

## Pilot boundary

### Read-only release

- Discover eligible accounts and resources.
- Read campaign hierarchy, status, spend, delivery, performance, conversions, creative metadata, and landing-page links.
- Show freshness, completeness, capability, and reconciliation status.
- Explain tracking gaps, waste, creative fatigue, message mismatch, and lead follow-up gaps.
- Create recommendations without external side effects.

### Supervised action

Enable only `paid.campaign.pause` for one approved provider and account. Use `paid.campaign.resume` as rollback when current state permits it.

The action needs a current capability check, immutable proposal, AAL2 approval, destination binding, idempotency, reconciliation, audit, and kill switch.

### Expansion

Campaign creation, budget or bid changes, audience changes, creative upload, cross-platform allocation, and five additional ad platforms remain outside the pilot MVP.

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

Budget, bid, keyword, audience, placement, schedule, and cross-platform changes remain recommendation-only expansion classes.

Recommendations must state the authoritative metric window, sample sufficiency, expected benefit, risk, and alternate explanation.

## Read readiness gate

A pilot platform is read-ready when an eligible test account completes connection, capability discovery, historical read, insight ingestion, reconciliation, tenant tests, failure handling, and revocation.

## Pause and resume readiness gate

The selected provider and account must pass AAL2 approval, scope separation, destination binding, drift, idempotency, unknown-result, reconciliation, kill-switch, pause, and resume tests.

## Full mutation readiness gate — expansion

Each later action needs its own official capability, account eligibility, validation, approval, execution, reconciliation, audit, and rollback evidence.
