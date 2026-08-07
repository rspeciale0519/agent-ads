# Paid Advertising Specification

## Objective

Allow a client to plan, approve, launch, monitor, and improve a campaign on any one or any combination of Meta, Google, Microsoft, LinkedIn, TikTok, Reddit, and X from a single product while preserving platform-native behavior.

## Campaign brief

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

## Cross-channel planning

Hermes coordinates strategy, budget, creative, measurement, and selected platform specialists. The output must identify:

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

## Common capabilities

- Connect and verify advertiser accounts.
- Import existing campaign hierarchy and history.
- Create campaign drafts without external side effects.
- Manage supported text, image, video, destination, tracking, schedule, and budget fields.
- Display platform validation and policy feedback.
- Launch approved campaigns.
- Pause, resume, and edit supported properties through approved actions.
- Ingest delivery, spend, performance, creative, and available conversion data.
- Detect anomalies, fatigue, pacing, and tracking failures.
- Record external edits and reconcile actual state.
- Compare platform results through canonical qualified outcomes.

## Platform specialist responsibilities

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
- budget and bid changes;
- negative keyword/query proposals;
- audience expansion or exclusion;
- creative refresh and variant tests;
- placement or schedule changes;
- destination or message-match improvements;
- conversion tracking repair;
- cross-platform budget experiments.

Recommendations must state the authoritative metric window, sample sufficiency, expected benefit, risk, and alternate explanation.

## Minimum platform readiness gate

A platform counts as MVP-ready when an eligible test account can complete connection, capability discovery, historical read, draft validation, approved campaign creation, status change, insight ingestion, external-state reconciliation, audit reconstruction, failure handling, and kill-switch verification.

