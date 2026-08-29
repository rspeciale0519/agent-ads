# Measurement, Attribution, and Experimentation

## Objective

Make the system optimize trustworthy business outcomes while clearly separating observed facts, platform attribution, internal attribution models, forecasts, and agent interpretation.

## Measurement hierarchy

1. Revenue, margin, retained value, and other confirmed business outcomes.
2. Qualified opportunities, pipeline, purchases, or booked appointments.
3. Validated conversion events.
4. Sessions, clicks, views, and engagement.
5. Delivery diagnostics.

The optimization target is defined per organization and goal. Lower-level metrics are useful leading indicators but cannot silently replace the target.

## Narrow pilot outcome model

The pilot uses one approved business outcome and one selected CRM.

The default sales-trainer funnel is qualified lead, booked call, closed-won deal, and booked revenue.

`Booked revenue` is the approved CRM amount at the configured closed-won stage. It is not cash received.

GA4, Search Console, Google Ads, and Meta Ads link source activity to that funnel where evidence permits it.

Each briefing shows one outcome snapshot, its freshness and reconciliation state, and exactly three evidence-linked actions.

## Canonical metric contract

Every metric has:

- stable key and plain-language definition;
- formula and grain;
- source datasets and joins;
- currency/time-zone treatment;
- attribution and lookback behavior;
- owner and approver;
- effective version and change history;
- quality tests and freshness threshold;
- known limitations;
- allowed decision uses.

Examples include spend, qualified leads, qualified acquisition cost, customer acquisition cost, contribution margin, pipeline value, return on ad spend, creative fatigue, content-assisted pipeline, and budget pacing.

## AI Reach measurement

| Layer | Measures | Does not prove |
|---|---|---|
| Crawl access | robots rules, fetch status, server access | indexing or citation |
| Index evidence | Search Console status, impressions, clicks | AI answer inclusion |
| Controlled answer samples | brand mention, recommendation, citation, factual accuracy | rank or market share |
| Referral evidence | GA4 and server referral sessions | complete AI traffic |
| Outcome evidence | CRM-qualified outcomes and booked revenue | causality without a controlled design |

AI Reach rates include answer coverage, brand mention, recommendation, owned citation, factual accuracy, and referral outcome rates.

Each rate shows its numerator, denominator, time window, question-set version, sample method, and limitations.

Do not combine these layers into one unexplained visibility or GEO score.

### Observation classes

Keep official platform facts, first-party observations, controlled AI samples, deterministic classifications, human reviews, agent interpretations, and business outcomes separate.

Do not scrape consumer result interfaces or claim access to unavailable private metrics.

## Data reconciliation

- Compare connector totals with native platform reports for sampled periods.
- Deduplicate conversion and customer events.
- Preserve late-arriving and corrected outcomes.
- Track currency conversion and source.
- Record platform attribution windows separately.
- Detect external campaign changes and classification drift.
- Surface unattributed and multiply attributed outcomes.

## Attribution views

- Platform-reported attribution.
- Last-touch and first-touch internal views.
- Multi-touch/model-based view where justified.
- Incrementality/holdout evidence.
- Unattributed outcome view.

Reports must state which view is displayed. The agent cannot present modeled credit as observed causality.

## Experiment types

- Creative concept and variant.
- Audience/targeting.
- Offer and message.
- Landing page.
- Channel/platform allocation.
- Bid/budget/pacing.
- Organic format, topic, hook, cadence, and paid amplification.
- Operational workflow and agent recommendation quality.

## Design requirements

- Predeclare hypothesis and primary metric.
- Define unit of assignment and avoid cross-variant contamination where possible.
- Set maximum budget/duration and guardrails.
- Establish minimum evidence or sequential decision rule.
- Freeze material treatment differences.
- Record concurrent changes and external interference.
- Use holdouts or geo/time designs when direct randomization is unavailable.
- Require qualified-outcome follow-up before durable adoption.

## Recommendation evaluation

Measure:

- recommendation precision and usefulness;
- approval, edit, reject, and defer rates;
- time to decision and execution;
- predicted versus observed direction and magnitude;
- false-positive cost;
- rollback and incident rate;
- performance compared with human or deterministic baselines;
- calibration by confidence range.

Shadow recommendations are stored even when humans take different actions. They are evaluated against later outcomes without claiming counterfactual certainty.

## Data quality gates

Optimization is blocked when:

- required sources are stale beyond policy;
- spend or conversion reconciliation exceeds tolerance;
- metric definition is unapproved or changed after evidence capture;
- CRM qualification is incomplete for the decision window;
- identity/deduplication failure materially affects results;
- experiment assignment or treatment integrity is broken.
- AI Reach question-set versions differ inside one comparison;
- the provider, surface, method, locale, or sample count is missing;
- an observation run is partial but presented as complete;
- crawl or index evidence exceeds its freshness limit;
- factual assessment lacks approved business truth;
- referral lineage or CRM outcome mapping is incomplete for the claim.

The system may still report descriptive platform data with a clear warning.

## Reporting

The pilot dashboard shows:

- the primary outcome;
- available source contribution;
- AI Reach status;
- the most important data limitation;
- exactly three recommended actions.

A broad analytics workspace is expansion scope.

### Daily operational report

- spend and pacing;
- qualified outcomes and leading indicators;
- material anomalies;
- creative/content status;
- pending approvals;
- connector/data health;
- recommended actions.

### Weekly executive report

- investment and business outcomes;
- channel and funnel contribution;
- experiments concluded and learned;
- actions taken and their observed aftermath;
- major risks and data limitations;
- next priorities and required decisions.

## Promotion rule

A tactic may move from experiment to supported practice only when its effect is meaningful, data quality passes, guardrails remain acceptable, the result is reproducible or sufficiently credible for the risk, and the applicable business/platform conditions are recorded. Promotion to supported practice is separate from promotion to autonomous execution.
