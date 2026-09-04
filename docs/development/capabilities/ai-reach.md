# AI Reach

## Objective

AI Reach is a feature inside the product. It helps a nontechnical owner understand and improve how people discover the business.

The feature covers classic search, AI-generated search answers, AI citations, referral traffic, and the business outcomes that follow.

AI Reach is also the primary conversational workspace for the first pilot. It explains results, shows evidence, and recommends three actions.

## Customer promise

AI Reach answers five plain questions:

1. Can search and AI systems access the right pages?
2. Do they describe the business accurately?
3. Do they cite or recommend the business for relevant questions?
4. Does this visibility create useful visits, leads, bookings, and booked revenue?
5. What are the three best actions now?

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

Google Ads and Meta Ads must both have read adapters. A pilot organization can connect Google only, Meta only, or both.

The first useful release is read-only. It collects evidence, explains results, and gives exactly three recommended actions.

## Staged execution

### Stage 1: read-only useful release

- Run a website and discovery audit.
- Read advertising, search, analytics, and CRM outcomes.
- Collect labeled AI Reach observations.
- Show one outcome dashboard.
- Explain results in chat.
- Give three evidence-linked recommended actions.
- Make no external change.

### Stage 2: supervised actions

- Create a CMS draft without publishing it.
- Create and send an approved lead follow-up when consent and suppression checks pass.
- Pause one approved advertising campaign through one provider and account.
- Offer resume as the rollback when current platform state permits it.

Each action needs a typed proposal, exact destination, approval, idempotency, reconciliation, audit, and a kill switch.

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
- exactly three recommended actions.

Each recommendation shows the reason, evidence, expected benefit, uncertainty, effort, risk, and next approval.

The same proposal and approval card appears in chat and in the approval queue.

## Agent and tool boundary

One supervisor profile prepares the first-release briefing through scoped read and artifact tools.

The agent can submit an assessment, recommendation, draft, or action proposal. It cannot publish, send, spend, pause, resume, or change external state directly.

Deterministic services calculate canonical metrics, validate policy, resolve destinations, execute approved actions, and reconcile results.

Specialist profiles remain an expansion option when evaluation evidence proves that a separate role improves safety or quality.

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
- recommendation evidence and exactly-three selection;
- no ranking or causality promise;
- prompt-injection and untrusted-content resistance;
- CRM outcome reconciliation and booked-revenue corrections;
- CMS draft idempotency and destination binding;
- lead consent and suppression denial;
- advertising pause, reconciliation, and resume rollback;
- chat loading, cancel, retry, failure, and support handoff states.

## Readiness gates

### Read-only gate

- The Pilot Scope Record names the organization, outcome, website, CRM, connected sources, and owners.
- Required connector reads pass capability, tenant, freshness, and reconciliation tests.
- AI Reach samples include method, version, window, limitations, and evidence.
- The dashboard and chat use the same canonical outcome snapshot.
- Each briefing gives three useful, evidence-linked actions.
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
