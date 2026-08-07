# Research Synthesis

## Executive conclusion

The bookmarks do not reveal a single turnkey “marketing agent.” They reveal a repeatable architecture for converting an expert marketing procedure into software:

1. Codify the human workflow and its exceptions.
2. Establish governed data and metric definitions.
3. Use deterministic services for repeatable operations.
4. Insert model judgment only where the input is genuinely ambiguous.
5. Execute through official APIs with scoped credentials.
6. Feed outcomes back into an evaluation loop.
7. Expand autonomy only after measured reliability.

The strongest sources converge on this pattern even when their tool choices differ. The weakest sources skip the first two steps, grant broad credentials to a general-purpose agent, and report activity or anecdotal wins without a counterfactual.

## What “agentic” should mean here

For this project, an agentic marketing system is a bounded software service that can observe state, choose among approved actions, act through a controlled interface, and evaluate the result. It is not made agentic merely because an LLM is present.

The practical decomposition is:

- **Sensors:** platform reporting APIs, web analytics, CRM, billing, search data, social analytics, call transcripts, and qualitative research.
- **State:** canonical warehouse tables, campaign taxonomy, brand assets, offer definitions, experiment registry, and memory of prior decisions.
- **Policy:** budgets, eligibility rules, legal and platform constraints, approval thresholds, brand standards, and evaluation criteria.
- **Reasoning:** qualitative research, creative ideation, diagnosis, prioritization, and explanation.
- **Actuators:** narrowly scoped API clients for ad platforms, schedulers, CMSs, CRM, and messaging tools.
- **Learning:** outcome ingestion, offline evals, shadow comparisons, corrections, and versioned skill updates.

## High-confidence findings

### 1. A governed data layer is more important than the model

The repeated “warehouse -> agent -> platform -> warehouse” model is directionally correct. Anthropic's own analytics implementation reports that ambiguity, staleness, and retrieval—not SQL generation—cause most errors. It recommends canonical datasets, explicit metric ownership, skill-based procedural routing, offline evals, provenance, and active correction harvesting. See [Anthropic's self-service analytics case study](https://claude.com/blog/how-anthropic-enables-self-service-data-analytics-with-claude).

Implication: the first project deliverable is a metric contract and event model, not an autonomous campaign manager.

### 2. Deterministic orchestration should carry most of the load

The sources' best phrase is “code, maybe a thinking loop, and a live data stream.” Schedules, pagination, joins, thresholds, retries, budget ceilings, negative keyword insertion, and publishing transactions should be code. Model inference is reserved for tasks where several defensible interpretations exist.

This matches Anthropic's guidance to begin with the simplest effective pattern and to distinguish workflows from open-ended agents. See [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents).

### 3. Skills are versioned operating procedures, not magic prompts

The most useful “skill” examples encode sources, routing rules, definitions, failure modes, output shape, and review criteria. Portable Markdown is valuable because it is inspectable and versionable, but it must be coupled to tests and tool permissions.

Hermes officially supports procedural skills, persistent memory, MCP integrations, messaging gateways, and scheduled automations. It can run with Nous Portal or other model providers. See [Hermes documentation](https://hermes-agent.nousresearch.com/docs/), [Hermes skills](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/guides/work-with-skills.md), and [Hermes cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron).

### 4. Feedback must terminate in a business outcome

An ad click is not a sufficient reward when the business needs qualified pipeline or revenue. The agent needs a defined attribution window, conversion hierarchy, delayed-conversion handling, and confidence rule. Google explicitly notes that conversion reporting is delayed and supports segmentation by conversion action; automation must not treat missing recent rows as failure. See [Google Ads conversion reporting](https://developers.google.com/google-ads/api/docs/conversions/reporting).

### 5. Human review is a product feature

The useful sources repeatedly use draft queues, shadow mode, review digests, or approval buttons. This is not merely a temporary inconvenience. Approval creates accountability, catches model and data errors, and produces correction labels that improve future evaluations.

OWASP recommends least-privilege tools, human confirmation for irreversible or high-impact actions, and auditable linkage between input and action. See the [OWASP agentic guidance](https://cornucopia.owasp.org/edition/companion/AAI2/1.0/en) and [AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html).

## Channel findings

### Meta ads

Useful pattern:

- research customer pain and competitor positioning
- generate a diverse but brand-constrained creative batch
- launch into a controlled test pool
- wait for a minimum evidence window
- pause clear losers
- promote proven assets into a budget-controlled winner pool
- retain prompt, source, asset, audience, spend, and outcome lineage

Corrections to the X narrative:

- Meta's official Marketing API supports both campaign creation/editing and insights reads. Reporting should be incremental and quota-aware, but “write only or get banned” is unsupported. Meta's [official Postman collection](https://www.postman.com/meta/facebook-marketing-api/overview?sideView=agentMode) includes insights calls.
- Andromeda is a personalized ad retrieval engine that benefits from creative diversity; Meta does not say the ad and landing-page copy “are the targeting.” See [Meta's Andromeda engineering article](https://engineering.fb.com/2024/12/02/production-engineering/meta-andromeda-advantage-automation-next-gen-personalized-ads-retrieval-engine/).
- Broad audiences are a supported current strategy, but hard constraints, exclusions, customer data rights, and experiment design still matter. See [Advantage+ audience](https://www.facebook.com/business/ads/meta-advantage-plus/audience).
- Customer-list audiences require necessary rights, permissions, and a lawful basis. Hashing is not a substitute for lawful collection. See [Meta Customer List Custom Audiences Terms](https://www.facebook.com/legal/terms/customaudience).

### Google Ads

Useful pattern:

- begin with bottom-funnel intent and coherent ad groups
- align ad and landing-page language to the query intent
- instrument a conversion as deep in the funnel as reliable volume permits
- use search-term data to add negatives
- separate discovery from proven terms only when the split has a clear measurement purpose

Corrections:

- Broad match is designed to work with Smart Bidding and conversion tracking; it is not a universal starting choice for accounts with weak signals. Google calls Smart Bidding critical with broad match. See [Google's broad-match guide](https://support.google.com/google-ads/answer/12159290?hl=en).
- Google supports exact, phrase, and broad match, and its own keyword guidance recommends beginning with exact for maximum control before expanding when appropriate. See [effective keyword lists](https://support.google.com/google-ads/answer/10039665?hl=en).
- Landing-page message match is supported as a relevance and experience practice, not as a guarantee of cheaper traffic. See [Google's Quality Score guidance](https://support.google.com/google-ads/answer/12732144?hl=en).

### Organic content

The durable content loop is:

> first-party source material -> insight extraction -> brand-constrained draft -> quality gate -> human approval -> scheduling -> analytics -> topic/format learning

The best source material is sales calls, customer interviews, internal decisions, product changes, and founder expertise. Generic model-generated posts are weak because they contain no proprietary observation. Reusing a validated theme later is reasonable; verbatim repetition and coordinated engagement are not required.

Postiz is a credible scheduler option because it is self-hostable, offers a public API, supports many channels, and exposes platform analytics. See [Postiz API](https://docs.postiz.com/public-api/introduction) and [Postiz analytics](https://docs.postiz.com/public-api/analytics/platform).

### SEO and AI search

Useful pattern:

- prioritize buyer-intent topics tied to an offer
- use Search Console and analytics data to find demand and decay
- analyze current results and content gaps
- create materially useful pages with explicit ownership and review
- refresh based on evidence, not an unconditional 30-day rewrite timer

Rejected pattern:

- bulk publishing thin third-party pages on high-authority platforms to borrow their reputation
- auto-generating location/keyword permutations without unique user value
- treating photo geotags, schema, posting times, or keyword stuffing as secret ranking levers

Google classifies large-scale low-value generation as scaled content abuse and third-party publishing intended to exploit host reputation as site reputation abuse. See [Google's spam policies](https://developers.google.com/search/docs/essentials/spam-policies) and [site reputation abuse clarification](https://developers.google.com/search/blog/2024/11/site-reputation-abuse).

Google's local guidance identifies relevance, distance, and prominence as the main local factors. It recommends accurate profiles, categories, reviews, and useful representative photos; it does not support the bookmark's geotag-metadata claims. See [local ranking guidance](https://support.google.com/business/answer/7091?hl=en-en).

### Outbound

Signal-based qualification and enrichment waterfalls can reduce wasted lookup cost, but the specific LinkedIn scraping workflow is not a safe baseline. LinkedIn prohibits unapproved automated crawling, third-party scraping software, and automation of site activity. See [LinkedIn crawling terms](https://www.linkedin.com/legal/crawling-terms) and [prohibited software](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions?lang=en).

For email, every commercial message must meet applicable law and jurisdictional rules. The FTC states CAN-SPAM applies to B2B messages and requires truthful headers and subjects, identification, a postal address, and a working opt-out. See the [FTC compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business). UK B2B rules vary by recipient and channel, and GDPR still requires a lawful basis and respect for objections. See the [ICO B2B guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/).

Recommendation: defer outbound automation until consent, lawful-basis, sourcing, suppression, platform-permission, and deliverability controls are designed and reviewed.

## Tool findings

### Hermes and Nous Portal

Hermes is a credible harness candidate when the project values provider choice, scheduled jobs, messaging control, procedural skills, and a VPS deployment. Nous Portal currently advertises a unified sign-in for models, tools, and cloud hosting. The bookmark's “244 models” is already stale; the current Portal page describes 252 models. Counts are not an architectural reason to choose it.

Hermes should orchestrate bounded skills, not hold every marketing credential in one general profile. Use separate profiles or processes for distinct trust boundaries and explicit tool allowlists.

### OpenClaw

OpenClaw provides useful skills, cron, messaging, memory, and local control, but its own security model treats the host and installed plugins as trusted code and is designed primarily around one trusted operator. It recommends separate hosts/users/gateways for separate trust boundaries. See [OpenClaw security](https://docs.openclaw.ai/gateway/security), [skills security](https://github.com/openclaw/openclaw/blob/main/docs/tools/skills.md), and [cron](https://docs.openclaw.ai/cron-jobs).

Therefore OpenClaw is viable for a personal operator console, not the sole authorization boundary for a multi-tenant marketing product.

### MCP

MCP is a useful integration protocol, not a security boundary. The official guidance warns that local MCP servers run with client privileges and recommends sandboxing, scope minimization, secure OAuth, audience-bound tokens, and no token passthrough. See [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) and [authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization).

### Creative and publishing tools

- Higgsfield MCP is a viable creative-generation adapter, but generated assets still need brand, claim, IP, likeness, and quality review. See [Higgsfield MCP](https://higgsfield.ai/mcp).
- Blotato exposes API and MCP publishing tools and documents an “AI Marketing Officer” workflow; treat it as a replaceable publisher, not the system of record. See [Blotato API](https://help.blotato.com/api/start) and [Claude Code integration](https://help.blotato.com/api/claude-code).
- `last30days` is a useful research-skill reference with multi-source recency and citation logic, but it requires platform credentials and third-party scraping providers for some sources. Review those dependencies and terms before adopting it. See the [official repository](https://github.com/mvanhorn/last30days-skill).

## Claims not accepted as facts

- “Bulk-reading Meta data is what gets accounts banned.” Unsupported; official insights access exists.
- “Meta ad copy now carries the targeting.” Overstatement of a creative-retrieval trend.
- “TikTok API posting is algorithmically penalized.” Unsupported. TikTok requires audited clients for public direct posting but does not document a reach penalty for compliant API posts. See [TikTok Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post).
- “224 micro-optimizations” proves the system improved performance. Activity count without outcome evidence.
- “$225K/year of tools replaced.” Promotional, with no independently auditable comparison.
- “A weekend build” or “five-day deployment” is a delivery claim, not a reliable estimate for a governed production system.
- “90 days to outrank competitors,” exact algorithm weights, geotagged-photo boosts, and guaranteed local SEO timing. Unsupported.
- “98% of users will see little model difference.” Opinion, not a measured requirement.

## Tactics rejected on policy or trust grounds

- Reddit account aging, VPN/proxy/fingerprint rotation, and enforcement evasion. Reddit prohibits masking identity, circumventing controls, scraping without consent, and API use for spam. See [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms) and [Developer Terms](https://redditinc.com/policies/developer-terms).
- Automated LinkedIn crawling or activity without express permission.
- Engagement pods, fake engagement, intentionally wrong content for outrage, and bot-operated account networks. TikTok explicitly bars fake engagement, high-volume automated commercial behavior, and recommendation manipulation. See [TikTok integrity guidelines](https://www.tiktok.com/community-guidelines/en/integrity-authenticity/).
- Storing chain-of-thought as organizational memory. Store decisions, evidence, constraints, and concise rationale instead.

## Final synthesis

The practical opportunity is not “replace the marketing team with one agent.” It is to create a series of measured marketing services, each with one job, a small tool surface, canonical data, and a visible approval boundary. The reusable asset is the operating system around the model: event contracts, skills, policies, evals, approvals, and outcome history.
