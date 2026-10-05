# Agentic Marketing Strategy Report

Date: 2026-10-04
Repository: `agent-ads`, branch `cc/agentic-marketing-strategy-252a73`, HEAD `4358fdf`
Author: Claude (Fable 5.1), at the request of Rob Speciale

---

## 1. Executive summary

**Goal stated by the owner.** Build a product that lets any company or individual run their own digital marketing without marketing expertise. The shape is "Grok, but only for digital marketing": one Marketing Director LLM that manages smaller subagents, each owning one marketing channel. The product must replace a marketing team, or at least most of its work.

**Verdict.** Keep the subscription product. Do not replace it with a setup plan that runs on Claude, ChatGPT, or another model. Change what the repo builds next.

**Why.**

1. The repo's own design documents already describe the Marketing Director model (the "Hermes chief marketing orchestrator" with channel specialists). Decision D-036 deferred it. The code built so far is a secure, read-only foundation. It cannot change an ad, publish a post, or run a loop.
2. The bookmarked posts converge on one working pattern: one data layer, write-only platform APIs, a scheduled decision loop, and fresh external inputs to stop the agent from repeating itself. The repo has none of these four parts.
3. The products in the bookmarks (Graphed, CrowdReply, Gojiberry) sell to technical marketers who already run Claude Code. No product in the folder serves a non-expert owner. That gap is the opening.
4. A do-it-yourself setup plan cannot serve a non-expert. It needs an operator, has no spend caps or approvals, and makes every client a custom build that you must maintain.

**What to do next, in order.** Finish the open foundation gates. Build the data layer. Add the Director as a scheduled briefing-and-proposal agent. Add three supervised actions. Add channel subagents one at a time. Add the self-improvement system. Earn autonomy per action class. Add billing and launch.

---

## 2. Method and limits

### 2.1 What I examined

- The full repository: `app/`, `lib/`, `prisma/`, `supabase/`, `scripts/`, `.github/`, and all 42 markdown files under `docs/`. A read-only subagent produced a file-level inventory, and I verified the key claims.
- The X bookmark folder "Marketing" (`x.com/i/bookmarks/1981571955519025542`) through Claude in Chrome. I read every post the folder displayed, opened each linked X Article, and studied every image and sampled video frames.

### 2.2 Limits

- X displayed 14 posts in the folder. The repo's earlier audit (`docs/agentic-marketing/source-index.md`, dated 2026-08-06) counted 75 posts in the same folder ID. X virtualizes long lists, so my count may be incomplete. Eleven of the 14 posts I read are newer than that audit. (My short summary earlier in this session said nine. Eleven is correct.)
- For video posts I captured frames at fixed intervals. I did not hear audio or read transcripts.
- One linked podcast episode (YouTube, Spotify, Apple) was not played. I used its full X Article text instead.
- I did not consult any third party. The owner withdrew the request to ask "Gary".

---

## 3. Findings: the repository

### 3.1 What the product is meant to be

- **Vision** (`docs/development/product/product-brief.md`): give a nontechnical business owner "a capable, supervised marketing department". The owner receives plain-language recommendations and approved actions without code or prompt skills.
- **Target customer:** first pilot is a sales trainer, speaker, or similar expert-led service business. Long-term market is any owner-led service business with a measurable path from lead to revenue.
- **Pilot outcome loop:** discovery → website visit → qualified lead → booked call → closed-won deal → booked revenue.
- **Full scope** (D-001): a "governed marketing operating system" across paid ads, organic posting, creative, measurement, experiments, approvals, and reporting.
- **Pilot scope** (D-032): website/CMS, GA4, Search Console, Google Ads and/or Meta Ads (read adapters), and one CRM. The first useful release is read-only. The pilot MVP actions (D-037) are: create a CMS draft, send one approved lead follow-up, and pause one ad campaign with resume as rollback.
- **Pricing** (D-022): modular — one-time setup, recurring hosting subscription, optional management/SLA, metered AI/media/tool usage, dedicated/hybrid premiums. No prices are set. Stripe is deferred to a commercial gate (D-030/D-036).

### 3.2 What is actually built

**Stack:** Next.js 15, React 19, Prisma 6.19, Supabase (Auth, Postgres, Vault, Storage), Zod 4, Resend, `@anthropic-ai/sdk`, Vitest. No Stripe, Temporal, Hermes, OpenAI SDK, or Sentry dependency is installed.

**Pages:** `/auth` (with breached-password check), `/security/mfa`, `/organizations/select`, `/onboarding` (6-step intake with drafts and private uploads), `/dashboard`, `/ai-reach` (default landing; chat plus a Google Ads report panel), `/connections` (list, detail, setup, manual), `/settings/general` (AI model and key), `/settings/data`, `/invitations/accept`, `/access-pending`.

**API:** about 30 routes under `app/api/v1/*` for connections, invitations, organization settings, security step-up, `ai-reach/chat`, onboarding, plus internal maintenance and release attestation.

**Foundation, real and hardened:**

- 24 Prisma models, 33 forward-only migrations, forced row-level security per tenant.
- Audit chain (`lib/audit.ts`), MFA levels with action-bound step-up grants (`lib/auth/step-up.ts`).
- Durable idempotency, rate limits, CSRF/origin checks, SecretBroker on Supabase Vault (`lib/connections/secrets/`).
- Live Resend email in production only (D-042).
- CI with six jobs including a schema proof (`.github/workflows/validate.yml`).

**Platform integrations (`lib/connections/providers/`), all read-only:**

| Provider | OAuth | Discovery | Metric reads | Writes |
|---|---|---|---|---|
| Google | Yes | Google Ads customers, GA4 accounts, Tag Manager, Search Console sites | Google Ads campaign report only (impressions, clicks, cost, conversions; 500-row cap) | None |
| Meta | Yes | Ad assets | None | None |
| TikTok | Yes | Advertisers | None | None |
| Dubsado CRM | No API | CSV upload mapped to funnel stages | — | None |
| WordPress, VideoAsk, organic social | Manual inventory only | — | — | None |

Every provider sits behind a global kill switch, a per-provider switch, and an organization allowlist (`lib/connections/contracts.ts:118-130`). GA4 report data and Search Console query data are not read; only account discovery exists.

**AI layer (`lib/ai-reach/`):** one model call per chat question. The model returns only structured choices (which metric, which action number, which source is missing). The app writes every sentence from stored data (`model-answer.ts`, `grounded-answer.ts`) and falls back to rules if the model fails. The "three actions" briefing is rule-based (`briefing.ts`, `funnel.ts`). Adapters exist for Anthropic (default `claude-opus-5-5`) and an OpenAI-compatible endpoint covering OpenAI, Gemini, Mistral, Groq, xAI, DeepSeek, Together, and OpenRouter (`model-providers.ts`). Each organization can store its own provider and key (D-041). Token cost is recorded per answer.

**Not built:** any write to any platform; proposals and approvals; the three pilot actions; organic publishing; creative or image generation; website crawl or AI-answer sampling; GA4 or Search Console data sync; experiments; opportunity registry; scheduled jobs (`vercel.json` has no crons); billing; multi-agent orchestration.

### 3.3 Roadmap position

Gate order in `docs/development/delivery/implementation-roadmap.md`: F0 → F1 → P0 → P1 → P2 → P3 → P4 → E1. The project sits at **F0/F1**. Local proof passed on 2026-08-28. Staging revalidation (pooler, Vault lifecycle, compensation, concurrency), the restore drill, live Google credentials, Meta/TikTok external approvals, and the P0 pilot contract are all open. AI Reach exists ahead of its gate.

### 3.4 Governing decisions that matter here

- **D-007:** code-owned services hold all authority. Agent output is only a typed proposal.
- **D-010:** human approval is the default for paid changes and publishing. Autonomy is earned per action class and per organization.
- **D-037:** each write approval binds organization, account, destination, action, proposal hash, cap, and expiry, and requires current MFA plus an active session.
- **D-009:** official APIs only. No browser automation to bypass access limits.
- **D-002/D-003/D-018:** Hermes orchestrator with specialist agents (context, research, strategy, budget, creative, 7 paid and 7 organic channels, measurement, QA), always behind an app-owned gateway.
- **D-036:** all of the above is deferred. The pilot uses one supervisor.
- **D-039/D-041:** Anthropic first, model-agnostic, per-organization model choice. The product brief and open-questions file still say OpenAI; that text is stale.
- **D-029 (proposed):** OpenAI image generation.

### 3.5 Top risks already registered

R-003 cross-tenant access; R-004 unauthorized agent action; R-006 excess spend; R-013 secret or personal-data leakage; R-035 orchestrator or model lock-in; R-040 migration drift (high probability); R-044 a broad approval permitting unintended spend; R-001/R-037 platform API eligibility delays; R-042 AI Reach overstating evidence.

### 3.6 Size

| Measure | Count |
|---|---|
| Commits | 103 (2026-08-06 to 2026-09-30; 27 merged PRs) |
| Non-test source files | 186 |
| Test files / cases | 72 / about 448 |
| `app/` lines | 3,421 non-test |
| `lib/` lines | 6,249 non-test |
| `scripts/` lines | 12,306 |
| Docs | about 9,100 lines in 42 files |

The scripts folder is larger than `app/` and `lib/` combined. Two months of work went mostly into database safety and release proofs, not marketing capability.

---

## 4. Findings: the bookmarked posts

### 4.1 Inventory

| # | Author | Date | Topic | Media studied |
|---|---|---|---|---|
| 1 | Jack J. (@jack_9947) | 2026-09-28 | "7 Claude agents" marketing pipeline | Text |
| 2 | Cody Schneider | 2026-09-28 | Build-internally versus subscribe (quote chain) | Text |
| 3 | Paul Klay | 2026-09-28 | Cold outreach playbook (X Article) | Text |
| 4 | Guillaume Bardet | 2026-09-28 | Competitor-engagement lead signals | Text |
| 5 | Cody Schneider | 2026-09-28 | "What is a marketing engineer?" | Text |
| 6 | Cody Schneider | 2026-07-29 | Paid ads + visitor de-anonymization + cold email | Text |
| 7 | Cody Schneider | 2026-09-17 | ChatGPT's own web index ("Labrador") | Text |
| 8 | CrowdReply | 2026-08-26 | AI-search ranking via one MCP | 44-second video, 5 frames |
| 9 | Startup Ideas Podcast | 2026-07-29 | Warehouse-centered marketing agent + linked article | Video thumbnail diagram, article with 10 images |
| 10 | Cody Schneider | 2026-09-16 | Marketing engineering cloud components | Image |
| 11 | X Business | 2026-08-26 | X Lead Gen Ads launch (X Article) | Header image |
| 12 | Dan Rosenthal | 2026-07-27 | 12 GTM plays for 2026 | Text |
| 13 | Cody Schneider | 2026-09-15 | Tools for Claude Code marketing (Graphed demo) | Video, 3 frames |
| 14 | Cody Schneider | 2026-08-26 | What a coding agent needs to do marketing | Text |

Posts 3 and 11 are not agentic. Post 3 says to verify research by hand and not to hand the whole process to AI. Post 11 is a channel launch. Both are useful background.

### 4.2 The pattern every agentic source agrees on

The Startup Ideas Podcast article and its diagrams give the clearest version. The other posts restate it.

**Three required parts** ("Anatomy of an Agent" image): a unified data pipeline, an autonomous decision loop on a cadence, and cloud-hosted code reading live business data. The caption: it is not a linear workflow; it is a virtual employee optimizing for one outcome, revenue.

**The Infrastructure of Truth** (image): FB Ads, Google Analytics, Stripe, and HubSpot pipe into a data layer (Airbyte into ClickHouse in their build). The platform API is used strictly for writes: publish, pause, promote. Pulling massive row data through the marketing API causes bans. Insight: tie one specific ad creative to actual bank revenue.

**The five-step loop** (image): 1 research the pain, 2 generate creative, 3 publish through the API, 4 data warehouse, 5 cloud hosting, drawn as a continuous track.

**The daily cadence** (article): two ad sets per day, five ads per set. Run two to three days for signal. Switch off the worst. Winners enter a pool and compete for budget. Every ad ever made, including the JSON prompts and scripts that produced it, goes into a database the agent studies.

**Entropy** ("The Enemy of the Agent" image): the agent gets stuck in the same patterns and performance degrades after day three. Fix: inject new DNA — competitor ads from the Meta Ad Library, podcast and YouTube transcripts, TikTok trend scrapes.

**Signal over Noise** (image): research real dialogue (Reddit via Perplexity), rank-stack the top three pain points, generate statics with an image model from competitor examples and video with HeyGen or Seedance, then pass everything through a vision model as a brand filter.

**The Evolution of Growth** (image): old way — gut-feeling creative, static campaigns, agency retainers, 10 creatives per month. New way — market-driven signals, continuous feedback loops, owned cloud infrastructure, 1,000 creatives tested in 48 hours.

**Rise of the Agent Jockey** (image): put creative in the market and let the market answer; encode domain knowledge; deploy the loop; "turn $1 into $5".

**The video thumbnail** (post 9): a "Pipeline – Warehouse – Agent – Back" diagram with Sources (Facebook Ads, Google Analytics, PostHog, HubSpot CRM, Stripe) → Airbyte → ClickHouse → The Agent (reads the warehouse, publishes, pauses, promotes winners; hosted on Heroku or Railway), with "Facebook results flow back in". Two callouts: "The Ban Myth" (bans come from bulk reads, not agents) and "Free Upgrade" (ask the warehouse business questions in Claude Code; custom dashboards off the same data).

### 4.3 The "marketing engineering cloud" component list

Cody Schneider's image (post 10) and text (posts 13, 14) list what a coding agent needs to do marketing: data pipeline, data warehouse, cloud server, media storage, Postgres databases for agents, cron jobs, application authentication, sharable links, git manager, and a tailored tool API gateway (image generation, enrichment, video generation, scraping). Post 5 lists about 20 concrete jobs, including: generate 200 ad variations, pipe video generation through ffmpeg to the Facebook Ads API, build 500 long-tail landing pages from Search Console, server-side conversion tracking, push closed-won deals back to Google Ads as offline conversions, kill ad sets automatically at 30% over CPA target, cluster competitor ads from the Meta Ad Library, track which pages ChatGPT and Perplexity cite, build customer-match lists from the CRM, and audit the Google Ads account every morning.

The Graphed demo frames (post 13) show a tool catalog with 233 capabilities and 292 tools, grouped by LinkedIn, Instagram, Google, Business, Ads, Similarweb, TikTok, Email, People, Domain, Backlinks, Video, and more, each priced in credits per call (for example, Google search tools at 0.115 credits per search; Meta Ad Library scraper tools listed under `ads.meta`).

### 4.4 AI search as a channel

- Post 7: ChatGPT now runs its own index ("Labrador"). In the default mode it answered from a stored snippet without opening a page in 93% of cases. The snippet comes from the H1 and nearby text, not the meta description. It does not run JavaScript. Three bots matter: GPTBot (training), OAI-SearchBot (search eligibility), ChatGPT-User (live fetch). Advice: allow OAI-SearchBot, make the H1 self-explanatory, answer in the first paragraph, show date and author near the top, render on the server.
- Post 8 (CrowdReply video frames): a chat prompt "How do I rank higher in AI Answers" triggers "Initiating Actions…" with cards — Content Creation (12 pages live, 15 scheduled), Citations Outreach (9 mentions earned), Authority Backlinks (14 placed), PR Outreach (6 placements) — then a weekly visibility report as a DOCX "ready to drop in Slack". The first frame shows ChatGPT, Claude, Perplexity, Gemini, and Google as the tracked AI platforms.

This matches the repo's AI Reach concept (D-033) and extends it from observation into action.

### 4.5 Lead generation plays

- Post 4: track who likes and comments on competitors' LinkedIn posts, filter for ICP fit, reach out without naming the competitor. The author built this into Gojiberry.
- Post 6: paid ads → website visitor de-anonymization (RB2B or Warmly) → ICP filter → waterfall email enrichment → verification → cold email (Instantly) → an agent that manages the inbox and books demos.
- Post 12: twelve GTM plays, most doable with a CRM, Clay, Claude Code, and one or two tools: visitor de-anonymization, LinkedIn engagement, automated outbound, customer alumni, awareness scoring, LinkedIn content system, inbound orchestration, B2B ads funnel, ICP modeling, champion tracking, programmatic SEO, ABM plus ads.
- Post 1: seven scheduled Claude agents — blog and LinkedIn content from a positioning file, ad creative on a daily cadence, competitor ads and transcripts pulled in as input, email sequences from the same context, research against the warehouse.

Note: the repo's earlier research flagged several of these tactics as "supporting/risk" because of platform terms (for example, LinkedIn-derived audience building). D-006 keeps a tactic registry and blocks tactics that violate terms. Keep that rule.

### 4.6 Build versus buy, from the sources themselves

Post 2 is a quote chain. A user asks why pay $20 a month for SaaS when they can build it in 2–20 hours and $20–500 in tokens. One founder replies that such teams subscribe two weeks later. Cody Schneider replies that a team spent three months and about $30k in tokens trying to build their marketing engineering cloud internally while also maintaining their core product, then subscribed and onboarded the whole team in a day, with the first marketing agent shipped in 24 hours from a template.

### 4.7 The market gap

Graphed sells a tool gateway to "marketing engineers" who operate Claude Code or Codex. CrowdReply sells AI-search visibility with an MCP for Cursor or Claude. Gojiberry sells LinkedIn signal tracking. Jack J. and Dan Rosenthal sell templates to people who will run them. Every one of these assumes a technically capable operator. None of them serves an owner who wants to say "get me more booked calls" and approve what comes back. That owner is the repo's stated customer.

---

## 5. Gap analysis

| Required by the vision and the sources | Repo today |
|---|---|
| One data layer that ties ad spend to revenue | Google Ads campaign report only; CRM by CSV upload; no GA4 or Search Console data; no sync schedule |
| Write-only platform actions (publish, pause, promote, budget) | No writes anywhere |
| A decision loop on a cadence | No scheduled jobs; chat answers only when asked |
| A Director that plans and delegates | One stateless model call per question |
| Channel subagents with their own tools and playbooks | Designed in docs; deferred by D-036 |
| Creative generation at volume with a brand filter | Not built; D-029 still proposed |
| Fresh external input (competitor ads, transcripts, trends) | Not built |
| Memory of what worked, per client | Token usage only |
| Approvals, caps, audit, rollback | Designed in detail (D-010, D-037) and partly built (step-up grants, audit chain); no action to attach them to yet |
| Tenant isolation, secrets, MFA | Built and strong |
| Billing | Not built |

The repo has the governance half of the product. It has almost none of the marketing half.

---

## 6. Strategic assessment

### 6.1 Subscription product versus a model setup plan

A setup plan that configures Claude, ChatGPT, or another model for a client fails the stated goal in four ways:

1. **It needs an expert operator.** Every source in the folder assumes someone who can run Claude Code, connect MCP servers, host a loop, and read a warehouse. A non-expert owner cannot.
2. **It has no safety layer.** No tenant isolation, no spend caps, no approval record, no rollback. The repo's risk register (R-004, R-006, R-044) exists for exactly this reason.
3. **Someone must still host and maintain it.** A daily loop needs a server, stored credentials, platform developer approvals, and upkeep when APIs change. If you provide those, you have built the product anyway.
4. **It scales as an agency, not a product.** Each client becomes a custom build that only you can repair. Post 2 describes the outcome: teams that build their own burn months and tokens, then subscribe.

Use the setup-plan idea differently. Run your first two or three clients yourself with Claude Code and the tools in the sources. Every playbook that works becomes the skill file of a channel subagent. That is how the sources themselves say to start: "hand Claude Code a transcript of the process, ask it to walk you through the build".

### 6.2 Where the product's value sits

Meta's Andromeda and Google's AI campaign types already automate targeting and bidding inside each platform. Do not compete there. The durable value is in what the platforms do not do across each other:

- Creative volume and angle discovery, with results fed back.
- Budget allocation across channels, tied to revenue in the CRM.
- Measurement that connects an ad to a booked call and a closed deal, including offline conversions pushed back to the platforms.
- SEO and AI-search visibility (the only channel in the folder where a small brand can outrank a large one quickly).
- Email and follow-up automation from the same context as the ads.
- A plain-language briefing and approval interface for the owner.

### 6.3 What to keep from the repo

Keep everything in the foundation: tenant RLS, audit chain, step-up grants, Vault, idempotency, kill switches, model-agnostic adapter, per-organization model choice, onboarding intake, and the grounded-answer discipline (the model picks; code writes the facts). These are the parts the competitors lack and the parts that make "for non-experts" credible.

### 6.4 What to change

- Stop treating further governance proofs as the next milestone. Finish the open ones once, then build capability.
- Amend D-036 so the Director loop and the first channel subagents are pilot scope, not an expansion target.
- Replace the custom Hermes runtime plan with the Claude Agent SDK behind the existing gateway. The design stays; the runtime becomes a maintained product. Keep the model-agnostic adapter for the per-organization choice.
- Promote the data layer from "later" to "next".

---

## 7. Target architecture

```
Owner (chat + approvals, plain language)
        │
        ▼
Marketing Director agent  ── reads ──▶  Data layer (Postgres on Supabase)
  plans, delegates, briefs,                ▲ daily syncs: Google Ads, Meta,
  proposes, learns                         │ GA4, Search Console, CRM, Stripe,
        │                                  │ email, social, AI-search samples
        ├── Paid Search subagent (Google Ads)
        ├── Paid Social subagent (Meta; later TikTok, LinkedIn, X)
        ├── SEO + AI Reach subagent (site, Search Console, AI-answer sampling)
        ├── Email + follow-up subagent (CRM, Resend)
        ├── Organic social subagent (native APIs; Postiz fallback per D-028)
        ├── Creative subagent (images, video, copy variants, brand filter)
        └── Research subagent (competitor ads, transcripts, trends, Reddit)
        │
        ▼
Proposal → Approval (MFA-bound, capped, expiring; D-037) → Action gateway
        │                                                      │
        ▼                                                      ▼
Audit chain + outcome ledger                     Platform APIs (writes only)
```

**Rules that do not change:**

- Agents produce typed proposals. Code executes. (D-007)
- Reads come from the data layer. Platform APIs are used for writes and for the minimum metadata needed to write. (Source pattern; avoids bulk-pull bans.)
- Every action has a cap, an expiry, an idempotency key, and a rollback. (D-037)
- Official APIs only. (D-009)
- Tactics live in a registry; blocked tactics cannot be proposed. (D-006)

**Autonomy levels per action class and organization (D-010), made explicit:**

| Level | Behaviour |
|---|---|
| L0 Observe | Report only |
| L1 Propose | Owner approves each action |
| L2 Bounded auto | Auto-execute within a per-day cap and a per-action cap; owner sees a digest; any breach pauses the class |
| L3 Delegated | Auto-execute within a monthly budget; weekly review |

An organization starts at L0/L1 and earns L2 per class after a recorded track record (Section 9.6).

**Runtime choices:**

- Director and subagents: Claude Agent SDK, each with its own system prompt, tool allowlist, and skill files; model per organization through the existing adapter.
- Scheduling: Vercel cron for daily syncs and the Director run; Supabase `pg_cron` as the fallback. Durable multi-step runs: Vercel Workflow or Queues once a run exceeds a single function's limits.
- Data layer: Postgres on Supabase at pilot scale. Move hot analytics tables to ClickHouse only when query cost proves it.
- Media: Supabase Storage (already used for uploads).
- Tool gateway: a thin app-owned layer with per-organization credit metering, so third-party tools (image, video, enrichment, scraping) can be swapped.

---

## 8. Roadmap to launch

Durations assume one developer working with Claude Code. They are estimates, not commitments. Each phase ends with a gate; the next phase starts only when the gate passes.

### Phase 0 — Close the foundation (2 weeks)

Outcome: the open F0/F1 items are done once, and the team stops revisiting them.

- Run the staging revalidation (pooler, Vault lifecycle, compensation, concurrency) and record D-031 as accepted or rejected.
- Run the restore drill on the pilot's paid plan (D-038).
- Obtain the Google Ads developer token and complete the staging Google journey.
- File Meta app review and TikTok approvals now; they run in the background for weeks (R-001, R-037).
- Add Vercel cron and one scheduled job (the existing maintenance route) so scheduling exists.

Gate: CI green on staging, restore drill recorded, cron proven.

### Phase 1 — Data layer (3 weeks)

Outcome: every connected source lands in Postgres on a schedule, and one ad can be traced to a CRM outcome.

- Daily sync jobs: Google Ads (campaign, ad group, ad, keyword, daily metrics), Meta Insights (campaign, ad set, ad, daily metrics), GA4 Data API (sessions, conversions by source/medium/campaign), Search Console (queries, pages), CRM (Dubsado CSV now; HubSpot or GoHighLevel API next), Stripe or the CRM's revenue field.
- Canonical schema: `channel_account`, `campaign`, `ad_group`, `ad`, `creative`, `daily_metric`, `lead`, `deal`, `touch` (lead ↔ campaign link), `outcome_ledger`.
- UTM convention enforcement on every link the system creates; a report of "direct / none" share as a health metric.
- Offline conversion upload (Google Ads, Meta CAPI) as the first write-adjacent capability, since it is low risk and improves platform bidding.

Gate: a dashboard shows spend → leads → booked calls → closed-won by campaign for the pilot client, updated daily.

### Phase 2 — The Director as briefing and proposal agent (3 weeks)

Outcome: the owner receives a daily plain-language briefing and typed proposals, with evidence, and can approve or decline each one.

- Director agent on the Agent SDK with tools limited to: read the data layer, read the tactic registry, read the organization's context (offer, audience, brand rules, constraints), write a briefing, write proposals.
- Proposal schema with types: `pause_campaign`, `resume_campaign`, `set_budget`, `create_draft_creative`, `create_cms_draft`, `send_follow_up`, `request_research`. Each proposal carries evidence rows, expected effect, cap, expiry, and rollback.
- Replace the rule-based "three actions" briefing with the Director's output, grounded by the same discipline: the model selects and ranks, code renders the facts.
- Approval UI in the existing chat workspace; step-up grant bound to the proposal hash (D-037).
- Evals: a golden set of 30 scenarios built from the pilot's data; the briefing must pick the correct top issue in at least 90% of them before the owner sees it.

Gate: the pilot owner reads the briefing for ten consecutive working days and rates each day; acceptance rate of proposals is recorded.

### Phase 3 — First supervised actions (3 weeks)

Outcome: three action classes execute through the gateway after approval, with caps and rollback.

- Actions: pause/resume a campaign (Google Ads, Meta); change a daily budget within a cap; upload a creative as a paused ad. These match D-037's spirit and the sources' "publish, pause, promote".
- Action gateway: idempotent, capped, audited, with compensation on failure.
- Kill switch per action class, per organization.
- Negative tests: cap breach, expired approval, replay, cross-tenant proposal, provider error mid-action.

Gate: ten approved actions executed on live accounts with zero unintended changes; one rollback exercised on purpose.

### Phase 4 — Channel subagents, one at a time (8 weeks, two per subagent)

Outcome: the Director delegates to specialists that own a channel's playbook and tools.

Order, chosen by pilot value and API readiness:

1. **Paid Search (Google Ads):** account audit every morning; search-term mining to negatives; keyword and ad-copy variants; budget proposals; offline conversion feedback.
2. **SEO + AI Reach:** site crawl; H1 and first-paragraph checks for AI-snippet eligibility; robots rules for OAI-SearchBot and others; Search Console opportunity pages (page-2 keywords); AI-answer sampling across ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews; CMS drafts for pages and updates.
3. **Paid Social (Meta):** daily creative cadence (start at 1 ad set × 3 ads, scale toward 2 × 5 as the sources describe); loser shutoff rules; winner pool; Ad Library competitor pulls.
4. **Email and follow-up:** sequences written from the same context; lead-response within minutes; re-engagement of past leads (the "customer alumni" play).

Each subagent ships with: a system prompt, a skill folder (playbooks as versioned markdown), a tool allowlist, an eval suite, and its own entry in the tactic registry.

Gate per subagent: four weeks of proposals, measured acceptance rate and outcome lift versus the prior four weeks.

### Phase 5 — Creative pipeline (3 weeks, can overlap Phase 4)

Outcome: the system produces, filters, and stores creative at volume.

- Copy variants from the positioning file and pain-point research.
- Static images from an image model with competitor examples as references; video from a hosted video model when ready.
- Vision-model brand filter: fonts, colours, legibility, claim compliance, before anything reaches a proposal.
- The creative genome table: every asset with its prompt, angle, hook, format, audience, platform, and outcomes.
- Owner-set brand rules and claim rules in the organization context; blocked claims cannot pass the filter.

Gate: 50 creatives generated, filtered, and uploaded as paused ads for the pilot; owner approval rate recorded.

### Phase 6 — Self-improvement system (4 weeks; see Section 9)

Outcome: the Director measurably gets better at this client's marketing over time, without anyone editing prompts by hand.

Gate: the Section 9 metrics exist and show improvement over a four-week window.

### Phase 7 — Earned autonomy (2 weeks plus observation time)

Outcome: low-risk action classes run at L2 for organizations with a track record.

- Promotion rule per class: at least 20 approved actions, at least 90% acceptance, zero cap breaches, and measured outcome at or above forecast.
- Daily digest replaces per-action approval at L2; weekly review at L3.
- Automatic demotion on a cap breach, a rollback, or a negative outcome trend.

Gate: the pilot runs pause/resume and budget changes at L2 for two weeks with no manual intervention.

### Phase 8 — Launch readiness (4 weeks)

Outcome: a second and third client can be onboarded without custom work, and the business can bill.

- Stripe Billing with the D-022 structure: setup fee, platform subscription, metered AI/media/tool credits. Start with two tiers; defer management/SLA tiers.
- Self-serve onboarding: connect accounts, import the positioning file, set brand and claim rules, set caps, choose the model.
- Operations: Sentry (D-027), alerting on sync failures and cap events, status page, support inbox.
- Legal and policy: terms, privacy, data-processing terms, platform policy compliance review per channel, consent language for email and SMS.
- Security review of the action gateway and the tool gateway; a second restore drill.
- Marketing for the product itself: run the product on its own marketing from Phase 4 onward, and use the results as the case study.

Gate: three paying organizations live, each at L1 or above, with billing, alerts, and support working for 30 days.

**Total:** about 32 weeks of build to launch readiness, plus the external approval wait. Overlaps can shorten it to roughly 26 weeks.

---

## 9. Making the Marketing Director self-improving for digital marketing

"Self-improving" must mean something testable: on this client's data, the Director's proposals get better outcomes per dollar over time, and it does so through mechanisms that are recorded, reviewed, and reversible. It must not mean an agent that edits its own code or prompts in production.

### 9.1 The outcome ledger is the foundation

Every proposal gets a row before approval: what the Director expected (metric, direction, size, time window) and why (evidence rows, playbook used, tactic ID). After the window closes, a job writes the actual result next to the prediction. This ledger feeds everything below. Without it, "learning" is guesswork.

Fields: `proposal_id`, `org_id`, `subagent`, `tactic_id`, `playbook_version`, `model`, `prediction`, `confidence`, `approved_by`, `executed_at`, `window_end`, `actual`, `delta`, `attribution_quality`.

### 9.2 Playbooks are versioned files, and the Director proposes changes to them

Each subagent's domain knowledge lives in markdown skill files under version control: how to audit a Google Ads account, when to pause a campaign, how to structure a Meta creative test, how to write a first paragraph for AI snippets. The Director may propose a change to a playbook the same way it proposes an ad change: a diff, the evidence, and the expected effect. A human merges it. The new version must pass that subagent's eval suite before it is used. This is the only route by which the system's "rules" change.

### 9.3 Three memory layers

1. **Per-organization memory.** What worked for this client: winning angles, audiences, offers, days and hours, landing pages, seasonal patterns, and the owner's corrections ("never say guaranteed", "do not run ads on weekends"). Stored as structured facts with source and date, retrieved into each run. Corrections from the owner carry the highest weight.
2. **Cross-organization priors (opt-in, anonymized).** Aggregated benchmarks per vertical: typical CPL ranges, creative formats that win, structure patterns. No client content or identifiers leave the tenant. Used only as priors when a client has little data.
3. **Market intelligence feed.** The "new DNA" the sources insist on: competitor ads from the Meta Ad Library, industry podcast and YouTube transcripts, Reddit pain-point threads, trend scrapes, and platform policy or feature changes (for example, a new ad format or a new AI-search bot). Ingested weekly, summarized by the Research subagent, and offered to the Director as angles. This is the direct answer to entropy.

### 9.4 The weekly retrospective

Every week the Director runs a retrospective over the ledger for each client:

- Calibration: were its predictions right in direction and size? By tactic, by channel, by subagent.
- Winners and losers: which creatives, angles, keywords, and audiences won; what they have in common.
- Decisions it would now make differently, with evidence.
- Proposed memory updates (Section 9.3, layer 1) and proposed playbook diffs (Section 9.2).

The owner sees a one-page version. Memory updates with high confidence apply after a short review window; playbook diffs always wait for a merge.

### 9.5 Experiments with holdouts

Learning needs a counterfactual. Where the platform allows it, the system runs budget-split or geo-split tests with a holdout, so a lift is measured, not assumed. Creative tests follow the sources' cadence: fixed daily cohorts, a minimum run time before judgment, losers off, winners into a pool that competes for budget. Each test is a ledger row with a prediction.

### 9.6 Champion–challenger for the agents themselves

Prompts, playbook versions, and models are candidates, not constants. A challenger version of a subagent runs in shadow mode (it produces proposals that are logged but not shown) against the champion on the same days. Promote it only if its shadow proposals would have beaten the champion on the ledger and it passes the eval suite. This also gives a safe way to test a new model from any provider through the existing adapter.

### 9.7 Evaluation suites are the gate

Each subagent keeps a growing eval set built from real past situations with known good answers: "given this account state, what should the agent propose?" Every playbook change, prompt change, or model change must pass the suite before deployment. Failures from production (a bad proposal the owner rejected with a reason, or a prediction that missed badly) become new eval cases. This turns every mistake into a permanent test.

### 9.8 Creative genome

Every creative asset is stored with its full lineage: the pain point it targets, the angle, the hook, the format, the generation prompt, the brand-filter result, the platform, the audience, and its performance by day. The Creative subagent queries this table before generating anything new. It learns which angles are exhausted, which hooks still work, and which formats the brand filter keeps rejecting, and it uses the market feed to introduce new angles on purpose.

### 9.9 Attribution calibration

Platform-reported conversions, GA4 conversions, and CRM outcomes disagree. The system records all three and learns the ratio per channel over time, so proposals are judged on CRM revenue, not on the platform's own count. Offline conversion uploads close the loop in the other direction and improve the platforms' own optimization.

### 9.10 Guardrails on self-improvement

- No agent edits code, prompts, or playbooks in production directly. Changes are proposals, merged by a human, gated by evals.
- No learning from data the organization did not consent to share.
- Blocked tactics in the registry cannot be "learned" back in.
- A learned rule must cite the ledger rows that support it. Rules without evidence expire.
- Every promotion to a higher autonomy level is reversible by one switch.

### 9.11 Metrics that prove it is improving

Track these per organization and per subagent, monthly:

| Metric | Direction |
|---|---|
| Prediction calibration error | Down |
| Proposal acceptance rate | Up |
| Outcome lift versus holdout or prior period | Up |
| Cost per qualified lead, cost per booked call | Down |
| Time from signal to action | Down |
| Share of creatives that pass the brand filter on first try | Up |
| Eval suite pass rate on each change | 100% |
| Owner corrections per month | Down after the first months |

If these do not move, the system is not learning, whatever its prompts say.

---

## 10. Recommended decision-register changes

- **Amend D-036.** Move the Director loop, the action gateway, and the first two channel subagents into pilot scope. Keep Temporal, Postiz, Coolify, SigNoz, and AWS deferred.
- **Add a decision:** the orchestration runtime is the Claude Agent SDK behind the app-owned gateway, with the model-agnostic adapter preserved. Hermes remains a reference design, not a dependency.
- **Add a decision:** the data layer is Postgres on Supabase with scheduled syncs; ClickHouse only on measured need.
- **Add a decision:** autonomy levels L0–L3 and the promotion and demotion rules in Section 7.
- **Resolve D-029.** Pick an image model through the tool gateway so it can be swapped; do not hard-wire one provider.
- **Correct stale text.** The product brief and open-questions file still name OpenAI as the first provider; align them with D-039 and D-041.
- **Add a decision:** the self-improvement rules in Section 9.10 are product constraints, not optional features.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Platform AI (Andromeda, Google AI campaigns) absorbs the value | Compete on cross-channel budget, creative volume, revenue-linked measurement, SEO/AI search, and the owner interface; never on bid management |
| API eligibility delays (Meta, TikTok, LinkedIn) | File now; ship Google and SEO first; keep manual-mode fallbacks |
| Overspend or unauthorized action | Caps, expiry, idempotency, rollback, kill switches, L0/L1 defaults, demotion rules |
| Account bans from bulk API reads | Reads from the data layer only; respect rate limits; writes only through the API |
| Platform policy breaches (scraped audiences, claims) | Tactic registry with blocked tactics; claim rules in the brand filter; legal review per channel |
| Model cost at volume | Per-organization metering; cheaper models for subagents, stronger model for the Director; cache context |
| "Replace the team" over-promise | Position as replacing execution work; the owner still owns the offer, the brand, and spend approval at first; show the ledger |
| Repo drift back to proofs | Gate list in Section 8; one owner for the roadmap; monthly review against the gates |
| Single-developer bottleneck | Use Claude Code for subagent playbooks and evals; buy tools through the gateway instead of building them |

---

## 12. Launch-readiness checklist

- [ ] Phase 0 gates recorded (staging revalidation, restore drill, cron)
- [ ] Data layer live for all pilot sources; spend-to-revenue dashboard
- [ ] Director briefing and proposals, eval pass at or above 90%
- [ ] Three action classes live with caps, rollback, and kill switches
- [ ] At least two channel subagents with playbooks, tool allowlists, and evals
- [ ] Creative pipeline with brand filter and genome table
- [ ] Outcome ledger, weekly retrospective, champion–challenger, metrics dashboard
- [ ] One organization at L2 for two weeks without intervention
- [ ] Stripe Billing with two tiers and metered credits
- [ ] Self-serve onboarding, including caps and brand rules
- [ ] Sentry, alerting, status page, support inbox
- [ ] Terms, privacy, data-processing terms, channel policy review
- [ ] Three paying organizations live for 30 days

---

## 13. Open questions for the owner

1. Which CRM do the first three clients use? The CSV path for Dubsado will not scale.
2. Is the first client willing to run the daily creative cadence on Meta, with its spend, during the pilot?
3. What is the per-day spend cap you are comfortable with at L2 for the pilot?
4. Do you want the product to run its own marketing from Phase 4 as the case study?
5. Which two pricing tiers should ship first?

---

## 14. Sources

### Repository files (all paths relative to the worktree root)

- `docs/development/product/product-brief.md` — vision, customer, outcome loop.
- `docs/development/product/product-requirements.md`, `docs/development/product/ux-and-information-architecture.md`, `docs/development/product/opportunity-and-experiment-policy.md` — scope and UX intent.
- `docs/development/governance/decision-register.md` — D-001 to D-042 as cited.
- `docs/development/governance/open-questions.md` — pilot business questions; stale OpenAI reference.
- `docs/development/delivery/implementation-roadmap.md` — gate order and current position.
- `docs/development/delivery/risk-register.md` — risk IDs as cited.
- `docs/development/architecture/hermes-multi-agent-architecture.md` — orchestrator and specialist roles.
- `docs/development/architecture/agent-orchestration-architecture.md`, `docs/development/architecture/system-architecture.md`, `docs/development/architecture/cloud-hosting-and-service-delivery.md` — gateway, hosting, pricing structure (D-022).
- `docs/development/capabilities/ai-reach.md` — AI Reach concept (D-033).
- `docs/agentic-marketing/source-index.md`, `docs/agentic-marketing/research-synthesis.md` — the 2026-08-06 audit of 75 bookmarks.
- `package.json`, `vercel.json`, `prisma/schema.prisma`, `.github/workflows/validate.yml` — stack, scheduling, schema, CI.
- `lib/connections/providers/google.ts`, `meta.ts`, `tiktok.ts`, `dubsado-export.ts`, `manual.ts`, `mock-provider.ts`; `lib/connections/contracts.ts`; `lib/connections/secrets/` — integration state.
- `lib/ai-reach/model-answer.ts`, `grounded-answer.ts`, `briefing.ts`, `funnel.ts`, `anthropic-model-client.ts`, `model-providers.ts`, `google-ads-evidence.ts` — AI layer.
- `lib/audit.ts`, `lib/auth/step-up.ts`, `lib/auth/pwned-password.ts` — governance primitives.
- `app/api/v1/connections/[id]/reports/google-ads` — the only live metric read.
- `scripts/f0/*`, `scripts/release-evidence/*` — safety and release proofs.

### X bookmarks, folder "Marketing" (`https://x.com/i/bookmarks/1981571955519025542`), read 2026-10-04

1. Jack J., 2026-09-28 — `https://x.com/jack_9947/status/2104611522349584551` — seven scheduled marketing agents.
2. Cody Schneider, 2026-09-28 — `https://x.com/codyschneider/status/2104594140449423837` — build-internally versus subscribe; quotes Yahia Bakour and timo.
3. Paul Klay, 2026-09-28 — `https://x.com/PaulKlayVC/status/2104626545868394594` — cold outreach playbook (X Article).
4. Guillaume Bardet, 2026-09-28 — `https://x.com/GuillaumeBardet/status/2104597277419413723` — competitor-engagement signals; Gojiberry.
5. Cody Schneider, 2026-09-28 — `https://x.com/codyschneider/status/2104556760799338808` — "what is a marketing engineer?"
6. Cody Schneider, 2026-07-29 — `https://x.com/codyschneider/status/2082496371081310328` — paid ads plus de-anonymization plus cold email.
7. Cody Schneider, 2026-09-17 — `https://x.com/codyschneider/status/2100630871002820973` — ChatGPT "Labrador" index; credits Peec AI, Search Engine Land, RESONEO.
8. CrowdReply, 2026-08-26 — `https://x.com/Crowdreply_io/status/2092620056220090383` — 44-second product video; frames at 4 s, 12 s, 22 s, 32 s, 40 s.
9. The Startup Ideas Podcast, 2026-07-29 — `https://x.com/startupideaspod/status/2082571870268772358` — warehouse-centered agent post with video thumbnail; quotes the X Article "Build Marketing Agents", 2026-07-27 — `https://x.com/startupideaspod/status/2081813905979113629` — ten images: The Evolution of Growth; Beyond Automation: The Anatomy of an Agent; The Blue Ocean: AI for WordPress; The Autonomous Build: 5 Steps; Signal over Noise: Feeding the Machine; The Infrastructure of Truth; The Enemy of the Agent: Entropy; Rise of the Agent Jockey; and two header images. Episode links: Apple Podcasts id1593424985, Spotify 6khnXwvfQT34CsuLquzXkY, YouTube U2hogriGmEw (not played).
10. Cody Schneider, 2026-09-16 — `https://x.com/codyschneider/status/2100253388822675551` — "Marketing Engineering Cloud" component image.
11. X Business, 2026-08-26 — `https://x.com/XBusiness/status/2092614843220074912` — Lead Gen Ads launch (X Article).
12. Dan Rosenthal, 2026-07-27 — `https://x.com/dan__rosenthal/status/2081816983528514018` — twelve GTM plays.
13. Cody Schneider, 2026-09-15 — `https://x.com/codyschneider/status/2099981612733641190` — tools for Claude Code; Graphed catalog video frames (233 capabilities, 292 tools).
14. Cody Schneider, 2026-08-26 — `https://x.com/codyschneider/status/2092733833070153896` — what a coding agent needs to do marketing.

### Products named in the sources (not independently evaluated)

Graphed (`graphed.com/platform`), CrowdReply (`crowdreply.io`), Gojiberry, Airbyte, ClickHouse, RB2B, Warmly, Instantly, MillionVerifier, Findymail, LeadMagic, Apollo, Serper, Apify, DataForSEO, Higgsfield, Seedance, HeyGen, Kai AI, Viralo, Google Nano Banana, Clay, Perplexity.

### Session artefacts

- Subagent repository inventory, this session, 2026-10-04 (verified against the files above).
- Browser screenshots and zoomed frames of the posts and images listed, this session.
