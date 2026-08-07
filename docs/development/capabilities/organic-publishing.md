# Organic Publishing Specification

## Objective

Provide a unified but platform-native system for researching, creating, approving, scheduling, publishing, measuring, and learning from organic content across LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and authorized Reddit communities.

## Content hierarchy

```text
Content program
└── Source brief
    ├── Creative concepts and assets
    ├── LinkedIn variant
    ├── X variant or thread
    ├── Instagram post/reel/carousel variant
    ├── TikTok video variant
    ├── Facebook variant
    ├── YouTube video/Short variant
    └── Reddit community-specific variant
```

One source brief may produce multiple channel variants, but a variant is an independently versioned and approved artifact.

## Source brief requirements

- Objective and funnel role.
- Target audience and context.
- Key message, approved claims, and proof.
- Source links/assets and trust classification.
- Call to action and destination.
- Campaign/offer association.
- Brand and legal constraints.
- Desired channels, formats, locale, and timing.
- Success metric and repurposing hypothesis.

## Platform-native responsibilities

### LinkedIn

- Professional narrative, point of view, document/carousel, image/video, or eligible page/profile content.
- Preserve the author's voice and avoid unapproved impersonation.
- Keep paid LinkedIn operations and organic identity permissions separate.

### X

- Concise posts, threads, images, and video appropriate to current account capabilities.
- Avoid synthetic engagement and automatic mass replies.
- Track thread membership and prevent partial duplicate publication.

### Instagram

- Feed, carousel, story/reel-compatible planning where authorized publishing support exists.
- Validate visual dimensions, duration, captions, alt text, and account eligibility.
- Do not treat hashtags or engagement as business outcomes by themselves.

### TikTok

- Native short-video scripts, captions, covers, and approved publishing routes.
- Preserve authentic identity and prohibit fake engagement or bulk manipulation.
- Video rendering, review, and music/asset rights are pre-publication gates.

### Facebook

- Page-appropriate text, link, image, video, or eligible format.
- Coordinate organic and paid reuse while keeping separate approvals and records.

### YouTube

- Long-form or Short source package with title, description, thumbnail, captions/transcript, and rights review.
- Publishing must handle asynchronous processing and reconcile final visibility/state.

### Reddit

- Community-specific draft with subreddit allowlist, rules snapshot, disclosure, and participation context.
- No generic bulk cross-posting, fabricated users, account aging, proxy rotation, or enforcement avoidance.
- Community posting and comment/reply actions have separate approval classes.

## Editorial calendar

The calendar supports:

- day/week/month and channel views;
- organization time zone plus platform/account time zone;
- drag-to-reschedule with revalidation;
- campaign, offer, audience, owner, status, and format filters;
- collision and frequency warnings;
- blackout periods and quiet hours;
- content dependencies and embargoes;
- approval deadlines;
- cancellation and replacement history.

## Approval rules

At launch, every public item requires approval of the exact variant and asset versions. Separate approvals may be required for:

- customer names or testimonials;
- regulated or financial/medical/legal claims;
- crisis or reputation-sensitive responses;
- newly generated video/image likenesses;
- Reddit community participation;
- replies and direct interaction;
- edits to already published content where the platform permits them.

Routine content may later use bounded autonomy only after organization-specific evaluation.

## Publishing workflow

1. Resolve current route and capability.
2. Validate text/media/account constraints.
3. Freeze variant and asset hashes.
4. Evaluate policy and obtain approval.
5. Revalidate at scheduled time.
6. Publish using idempotency/duplicate guard.
7. Poll or consume webhook to terminal state.
8. Reconcile public ID, URL, visibility, and processing status.
9. Notify on completion, rejection, or uncertain state.
10. Ingest available analytics on scheduled windows.

## Analytics and learning

Track available impressions, reach, views, watch behavior, clicks, engagement, followers, destination sessions, conversions, qualified outcomes, and revenue. Label platform-reported, observed, and attributed data separately.

The system recommends:

- platform-native revisions;
- source-brief improvements;
- repurposing into another format or channel;
- paid amplification tests;
- follow-up topics;
- retirement of stale content;
- changes to cadence based on qualified outcomes and audience health.

## Community management boundary

The MVP may ingest comments and prepare reply drafts where authorized, but replies are a separate capability and approval class. Automated high-volume commenting, unsolicited interaction, or reputation-sensitive responses are not implied by organic publishing support.

## Minimum channel readiness gate

A channel counts as MVP-ready when an eligible account can connect, expose capabilities, validate an applicable content type, publish an approved test item through an authorized route, reconcile terminal state, ingest available analytics, prevent duplicate delivery, surface a realistic failure, and honor the kill switch.

