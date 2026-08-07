# Agentic Marketing Bookmark Research Goal

Conduct an exhaustive, read-only research audit of the **Marketing** bookmark category in the user’s existing authenticated X.com browser session. The purpose is to discover, study, verify, and synthesize everything relevant to designing, building, and operating a reliable AI-agentic marketing platform—especially systems that monitor and manage advertising campaigns using agents such as Hermes.

Use an inventory-first, two-pass workflow so coverage is measurable, resumable, and auditable.

## Phase 1: Complete bookmark inventory

Before conducting deep research, inventory every unique bookmarked post in the Marketing category.

- Traverse the category from beginning to end.
- Record each post’s canonical URL or post ID, author, visible date, brief subject, and discovery order.
- Deduplicate posts using their canonical post IDs while preserving any meaningful cross-references.
- Maintain a persistent, restartable research ledger under `docs/temp/` so progress survives interruptions.
- Assign every discovered bookmark an initial status: pending review, relevant, unrelated, duplicate, inaccessible, or uncertain.
- Continue loading and scrolling until X displays a clear end or three consecutive bottom-of-feed loading attempts reveal no new unique post IDs.
- Perform an independent second inventory pass and reconcile it against the ledger. Any newly discovered posts must be added and reviewed before inventory is considered complete.

Do not begin final synthesis until the initial inventory has been completed. Research may occur during discovery when necessary to classify an item, but every bookmark must remain tracked in the ledger.

## Phase 2: Exhaustive research

Review every inventoried bookmark and give it a documented final disposition. For every relevant or potentially relevant item:

- Read the complete post and full relevant thread.
- Inspect quoted posts, referenced posts, substantive author follow-ups, and replies that materially clarify the system or technique.
- Follow and study all relevant linked articles, documentation, repositories, demonstrations, videos or available transcripts, podcasts or available transcripts, and other substantive resources.
- Record every linked resource separately with its URL, type, access status, and relationship to the original bookmark.
- If a resource is deleted, private, truncated, paywalled, unavailable, or otherwise inaccessible, record the limitation and continue with all other accessible sources.
- Do not treat post previews, search snippets, headlines, or third-party summaries as substitutes for reading the underlying material.

Research topics should include:

- Agent architecture and orchestration.
- Hermes and comparable agent systems.
- Persistent business context and memory.
- Scheduled and event-driven operating loops.
- Google Ads, Meta Ads, and other advertising-platform integrations.
- Campaign analysis and optimization.
- Budget allocation, pacing, forecasting, and anomaly detection.
- Creative research, generation, testing, and iteration.
- Reporting, attribution, lead quality, and business-outcome measurement.
- Competitor monitoring and market intelligence.
- SEO and content operations where they support the marketing system.
- Human approvals and controlled autonomous execution.
- Permissions, audit logs, rollback mechanisms, and safety guardrails.
- Observability, evaluation, failure recovery, and operational reliability.
- Security, privacy, compliance, and advertising-platform policies.
- Deployment on an always-on Mac versus cloud or hybrid infrastructure.
- Model selection, token usage, infrastructure requirements, and operating costs.
- Client onboarding, multi-tenancy, customization, and productization.
- User experience for people who do not understand AI or prompting.

## Phase 3: Verification and critical analysis

Verify consequential technical and platform claims using current primary sources whenever possible, including official documentation, API references, platform policies, and original repositories.

Give particular attention to:

- Hermes capabilities, limitations, deployment requirements, and security model.
- Google Ads and Meta Ads API capabilities, approval requirements, rate limits, automation policies, and prohibited behavior.
- Model-provider tool-use, memory, scheduling, and agent capabilities.
- Any third-party orchestration, browser automation, MCP, analytics, or creative-generation tools being recommended.

Clearly distinguish:

- Verified facts and documented capabilities.
- Reproducible practices supported by credible evidence.
- Reasonable architectural opinions.
- Experimental or emerging techniques.
- Promotional claims and marketing hype.
- Unsupported, contradicted, outdated, or unverifiable claims.

Compare sources to identify recurring patterns, disagreements, hidden tradeoffs, missing operational details, and ideas that appear popular but would be unsafe or unreliable in production.

## Phase 4: Project synthesis

Translate the research into actionable context for this project. Determine:

- The recommended product architecture and component boundaries.
- Appropriate agent roles and responsibilities.
- Data, memory, orchestration, approval, and execution flows.
- Advertising-platform integration requirements.
- Permissions, budget controls, safety guardrails, and rollback behavior.
- Evaluation, observability, alerting, and failure-recovery requirements.
- Recommended technologies and credible alternatives, with tradeoffs.
- A practical MVP scope and prioritized implementation sequence.
- Operational, security, financial, compliance, and reliability risks.
- Decisions that can be made confidently from the evidence.
- Open questions, assumptions, and areas requiring prototypes or further validation.
- Future opportunities for turning the initial friend deployment into a reusable multi-client product.

Inspect the existing project documentation and implementation where relevant, then map the research findings to the current project. Identify alignment, gaps, conflicts, obsolete assumptions, and requirements that are not yet represented. Do not modify product code as part of this research goal.

## Permanent project documentation

Create well-organized, durable documentation in the repository’s appropriate permanent documentation structure. Temporary notes and working artifacts must remain under `docs/temp/`.

At minimum, produce:

1. A research index and completeness audit containing every discovered bookmark, canonical URL, author, date where available, classification, final disposition, and access status.
2. Detailed source notes covering every relevant post and linked resource.
3. A cross-source synthesis separating verified practices, promising experiments, opinions, contradictions, and hype.
4. A proposed system architecture and agent operating model.
5. Product requirements covering integrations, workflows, approvals, guardrails, security, observability, and nontechnical user experience.
6. Technology recommendations with alternatives, evidence, and tradeoffs.
7. A prioritized MVP roadmap, risks, unresolved questions, validation needs, and future opportunities.
8. A concise context document that future agents can use to understand the research and project direction without repeating the investigation.

Cite direct source URLs throughout the documentation. Preserve source attribution while paraphrasing rather than reproducing long copyrighted passages. Do not include unrelated private bookmark content in the permanent research documents beyond the minimal classification needed to prove coverage.

## Completion requirements

The goal is complete only when:

- The Marketing bookmark category has undergone an initial inventory pass and an independent reconciliation pass.
- Every unique discovered bookmark has a documented final disposition.
- Every accessible relevant post and relevant thread has been read.
- Every substantive linked resource has been read or assigned a documented access limitation.
- Important technical claims have been checked against current primary sources where possible.
- Exact totals are reported for discovered, relevant, unrelated, duplicate, inaccessible, and fully reviewed bookmarks, along with linked-resource totals.
- All permanent research and project-context documents have been completed and cross-checked against the source ledger.
- Remaining uncertainty and coverage limitations are explicitly documented.

Do not stop after sampling representative posts or reaching an arbitrary quantity. If the work is interrupted, resume from the persistent ledger and continue until the completion requirements are satisfied.

## Browser and account constraints

Treat X and every linked service as strictly read-only. Do not like, repost, reply, bookmark, unbookmark, follow, unfollow, message, subscribe, purchase, sign in to a new service, or change any account or content state. Preserve the authenticated browser session, remain within the user-provided Marketing bookmark scope except when following relevant source links, and leave all browser tabs open when finished.
