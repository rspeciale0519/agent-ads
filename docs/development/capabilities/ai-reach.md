# AI Reach

## Objective

AI Reach is a feature inside the product. It helps a nontechnical owner understand and improve how people discover the business.

The feature covers classic search, AI-generated search answers, AI citations, referral traffic, and the business outcomes that follow.

AI Reach is also the primary conversational workspace for the first pilot. The Marketing Director briefs the owner here, shows evidence, and presents ranked decisions (at most three) or states that no decision needs attention (D-043, accepted).

## Implemented behavior today

The `/ai-reach` workspace exists with chat, a rule-based briefing, a Google Ads report panel, and a model router that returns structured choices only (D-039, D-041). Website crawl, AI-answer sampling, GA4 and Search Console data reads, and CMS drafts are not implemented.

## Customer promise

AI Reach answers five plain questions:

1. Can search and AI systems access the right pages?
2. Do they describe the business accurately?
3. Do they cite or recommend the business for relevant questions?
4. Does this visibility create useful visits, leads, bookings, and booked revenue?
5. Which decisions need my attention now, if any?

The user does not need prompt skills, code knowledge, or advertising-platform knowledge.

## Explicit non-promises

AI Reach does not promise a ranking, citation, recommendation, lead, or sale.

Controlled samples do not represent every consumer answer. Results can change by provider, model, interface, location, language, time, and user context.

Correlation does not prove that a website or campaign change caused an outcome.

The product must show uncertainty, missing data, sample size, and collection method beside each result.

## Pilot boundary

The first pilot uses a sales trainer, public speaker, or similar expert-led service business.

The first outcome loop is:

```text
discovery -> website visit -> qualified lead -> booked call -> closed-won deal -> booked revenue
```

The pilot uses these source classes:

- website and CMS;
- Google Analytics 4;
- Google Search Console;
- Google Ads;
- Meta Ads;
- one CRM selected in the approved Pilot Scope Record;
- calendar and email only when they supply required booking or follow-up evidence.

The source classes above are the earlier D-032 scope. Under D-043 (accepted 2026-10-04) the required sources follow the Pilot Scope Record: one selected paid channel, one website, and one outcome source (CRM or approved CSV). Implemented today: Google has a campaign report read; Meta has connection discovery only. One paid channel is enough for the first complete workflow; Google Ads is the starting hypothesis.

GA4 and Search Console are required only when an enabled decision needs them (DAT-014). Sampling of AI answer surfaces sits behind its own enabled-capability gate; it is not a launch prerequisite under D-043.

The first useful release is read-only. It collects evidence, explains results, and gives ranked decisions or an explicit quiet state.

## Staged execution

### Stage 1: read-only useful release

- Run a website and discovery audit.
- Read advertising, search, analytics, and outcome sources named in the Pilot Scope Record.
- Collect labeled AI Reach observations where that capability is enabled.
- Show one outcome dashboard.
- Explain results in chat.
- Give ranked evidence-linked decisions (at most three) or state that none is needed.
- Make no external change.

### Stage 2: supervised actions (D-037, accepted)

- Create a CMS draft without publishing it.
- Create and send an approved lead follow-up when consent and suppression checks pass.
- Pause one approved advertising campaign through one provider and account.
- Offer resume as the rollback when current platform state permits it.

Each action needs a typed proposal, exact destination, approval, idempotency, reconciliation, audit, and a kill switch.

### Stage 2b: supervised acquisition workflow (D-044, accepted amendment to D-037)

- The Director prepares a campaign package for the first paid channel; the owner approves the exact objects and caps.
- The system creates paused objects, verifies them, obtains activation approval, activates, monitors, and reconciles.
- Content and creative support works in draft mode for the same offer: landing-page drafts, copy variants, and creative briefs that reuse business memory. Nothing publishes.
- See the paid advertising specification for action definitions and gates.

### Stage 3: approved website publishing

One CMS route can publish approved content after separate readiness evidence passes.

### Stage 4: expansion

Add more advertising platforms, organic publishing, CRM providers, CMS providers, AI surfaces, and bounded action classes.

## Evidence classes

AI Reach keeps these evidence classes separate:

1. Official platform observation.
2. First-party website or analytics observation.
3. Controlled AI-surface sample.
4. Deterministic classification.
5. Human factual review.
6. Agent interpretation.
7. Business outcome observation.

The product must not merge these classes into one unexplained score.

## Discovery and content checks

The website audit checks:

- HTTP access, redirects, and canonical URLs;
- robots directives, `noindex`, sitemaps, and crawler access;
- server or protection rules that block approved search crawlers;
- index eligibility and Search Console evidence;
- important text, titles, headings, links, and page structure;
- structured data that matches visible content;
- current business identity, offer, location, author, and contact facts;
- approved claims, source quality, first-hand expertise, and content freshness;
- duplicate, thin, generic, or scaled low-value content;
- page experience and accessibility signals relevant to users.

Crawler access is a customer policy choice. Search discovery and model training are different purposes and require separate controls.

AI Reach must never change crawler, indexing, or training preferences without a reviewed proposal and approval.

## Question-set lifecycle

An approved question set defines the audience, offer, buyer stage, market, locale, and sample policy.

Each version is immutable after approval. A new version supersedes it without changing old observations.

Questions must reflect real buyer needs. The system must not create artificial query variations only to inflate coverage.

## Observation protocol

Each run records:

- question-set version;
- surface and provider;
- model or interface version when available;
- collection method;
- date and time;
- locale and location;
- sample number and repeat policy;
- answer evidence reference;
- citations and cited pages;
- brand mention and recommendation observations;
- factual assessment and limitations;
- cost, quota, partial state, and collector version.

Repeated samples remain separate. The system does not average unlike surfaces or hide failed samples.

Only official APIs, official reports, authorized exports, or approved collection methods can supply observations. The system does not automate consumer interfaces against their terms.

## Metrics

AI Reach can report:

- crawl eligibility;
- index eligibility;
- search impressions, clicks, click rate, and average position;
- AI answer coverage;
- brand mention rate;
- business recommendation rate;
- owned-domain citation rate;
- factual accuracy rate;
- AI referral sessions;
- AI referral qualified outcomes;
- AI referral booked calls;
- AI referral booked revenue;
- open content gaps and completed fixes.

Every rate shows its numerator, denominator, window, method, and limitations.

`Booked revenue` means the approved amount recorded when the selected CRM reaches the configured closed-won stage. It is not cash received.

For the pilot, Dubsado outcome observations use an approved export or client-owned read route. The export requires an explicit status map and produces qualified leads, booked calls, signed engagements, booked revenue, cancellations, and refunds as separate stages. The snapshot remains partial until persistence, reconciliation, and live source checks pass.

The organization approves the stage map, currency handling, event date, backfill window, corrections, duplicates, cancellations, and missing-value rules.

Attribution labels must separate direct first-party evidence, platform-reported attribution, modeled attribution, and unknown source.

## Read-only workflow

```text
approved scope
  -> connector synchronization
  -> website crawl
  -> controlled AI observations
  -> freshness and completeness checks
  -> outcome snapshot
  -> AI Reach assessment
  -> three recommendations
  -> chat briefing and dashboard
```

The system stops before recommendations when required evidence is stale or unsafe. It can still explain the missing data and the repair path.

## Website draft workflow

```text
AI Reach finding
  -> opportunity
  -> source brief
  -> website draft
  -> factual, brand, search, and policy validation
  -> approval
  -> CMS draft
  -> subject review
  -> later publication approval
  -> publication reconciliation
  -> new observation window
```

AI Reach owns findings and assessments. The content domain owns drafts. The control plane owns approvals and execution.

## Chat and dashboard experience

AI Reach is the default signed-in workspace for the pilot.

The chat guides the user with short questions and structured cards. It does not require the user to write an expert prompt.

Each briefing shows:

- the primary business outcome;
- important source contributions;
- AI Reach status;
- the most important data limitation;
- ranked decisions (at most three), or one line stating that no decision needs attention.

Each decision shows the reason, evidence, expected benefit with its range or an insufficient-evidence state, uncertainty, effort, risk, cost exposure, recovery limits, and next approval.

The same proposal and approval card appears in chat and in the approval queue.

## Agent and tool boundary

The Marketing Director prepares the briefing through scoped read and artifact tools. It delegates bounded tasks to the paid-search specialist and to draft-mode content and creative support through typed task contracts (D-043).

The agents can submit an assessment, recommendation, draft, campaign package, or action proposal. They cannot publish, send, spend, pause, resume, activate, or change external state directly.

Deterministic services calculate canonical metrics, validate policy, resolve destinations, reserve budget, execute approved actions, and reconcile results.

Further specialist profiles remain an expansion option when evaluation evidence proves that a separate role improves safety or quality.

## Security and policy

- Every record is tenant-scoped.
- Raw page captures and AI answers use classified evidence references.
- Private CRM identities do not enter agent context unless the approved task requires minimized fields.
- Only approved public facts can support factual assessments and drafts.
- Website, search, and AI content remains untrusted input.
- Lead follow-up needs consent, suppression, destination, and retention checks.
- CMS drafts and advertising actions use separate least-privilege principals.
- Public content and crawler-policy changes require separate approval classes.
- Logs and reports never expose secrets or raw provider responses.

## Testing and evaluation

Release evidence must cover:

- tenant isolation and evidence access;
- crawler and index classification fixtures;
- question-set versioning and repeated samples;
- citation extraction and canonical URL handling;
- factual accuracy against approved business truth;
- partial, stale, missing, conflicting, and corrected data;
- recommendation evidence, ranking, the at-most-three limit, and the explicit quiet state;
- no ranking or causality promise;
- prompt-injection and untrusted-content resistance;
- CRM outcome reconciliation and booked-revenue corrections;
- CMS draft idempotency and destination binding;
- lead consent and suppression denial;
- advertising pause, reconciliation, and resume rollback;
- chat loading, cancel, retry, failure, and support handoff states.

## Readiness gates

### Read-only gate

- The Pilot Scope Record names the organization, outcome, website, outcome source, connected sources, enabled capabilities, and owners.
- Required connector reads (those the record names) pass capability, tenant, freshness, and reconciliation tests.
- When AI-answer sampling is enabled, samples include method, version, window, limitations, and evidence. Sampling is not a prerequisite for this gate under D-043.
- The dashboard and chat use the same canonical outcome snapshot.
- Each briefing gives ranked, evidence-linked decisions or an explicit quiet state.
- No mutation credential or tool is enabled.

### Supervised-action gate

- Each action class passes its own security, policy, approval, execution, reconciliation, and rollback tests.
- One provider, account, and destination is allowlisted first.
- The user sees the exact before-and-after state.
- An uncertain result blocks blind retry.

## Current official guidance

- Google states that normal SEO foundations still apply to its generative search features. It also rejects special AI markup and ranking guarantees: [Google generative AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- OpenAI separates search discovery through `OAI-SearchBot` from possible training through `GPTBot`: [OpenAI publisher guidance](https://help.openai.com/en/articles/12627856).
- Bing now reports citations and cited pages in its AI Performance preview: [Bing AI Performance](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview).
- Perplexity documents separate search and user-request crawler behavior: [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).
- Search Console provides search-performance data with documented row limits: [Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics).
- IndexNow reports changed URLs but does not guarantee crawling or indexing: [IndexNow](https://www.bing.com/indexnow/getstarted).

Official behavior can change. Recheck each source before implementation and release.
