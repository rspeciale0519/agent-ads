# Platform Capability Verification Matrix

## Purpose

This is the release-controlled worksheet for converting the product's platform commitments into verified current API capabilities. It intentionally does not assert unstable API details before implementation-time review of official documentation, developer access, and eligible test accounts.

The Phase 0 desk assessment below records access gates visible in official sources as of 2026-08-07. `Desk verified` means the official documentation was reviewed; it does not mean the product or pilot account has passed app review, obtained production access, or executed the capability. Those claims require the account evidence and connector acceptance record defined later in this document.

## Approved pilot capability matrix

The pilot includes the sources below. Calendar and email remain conditional. Every other connector is expansion work.

| Source | Read-only release | Supervised stage | Pilot release effect |
|---|---|---|---|
| Website | crawl, page content, status, redirects, canonical, robots, sitemap, index signals | none | required |
| Selected CMS | page and metadata reads where permitted | create draft only | provider named in Pilot Scope Record |
| Google Analytics 4 | traffic, landing-page, event, and referral evidence | none | required when selected as analytics source |
| Google Search Console | search performance, page and index evidence | none | required |
| Google Ads | account, campaign, insight, creative metadata, conversion, and landing-page reads | pause/resume only after a separate gate | adapter required; organization connection optional |
| Meta Ads | account, campaign, insight, creative metadata, conversion, and landing-page reads | pause/resume only after a separate gate | adapter required; organization connection optional |
| Selected CRM | lead, stage, booking, closed-won, booked-revenue, and correction reads | approved follow-up only after a separate gate | provider named in Pilot Scope Record |
| Calendar | booking evidence | no pilot calendar write | conditional |
| Email | delivery and follow-up evidence | approved send only after a separate gate | conditional |
| AI Reach observation source | labeled answers, citations, facts, method, version, locale, samples, and limits | none | approved method required |

The read-only release has no mutation principal. A missing optional connection reduces evidence and cannot silently create an all-platform gate.

## Verification record required per platform

- Product and API name/version.
- Official documentation and policy URLs.
- Verification date and reviewer.
- Developer application, review, certification, or contract requirements.
- Required OAuth scopes/permissions and whether read/write can be separated.
- Eligible account types and geographic limitations.
- Sandbox/test-account availability.
- Quotas, rate limits, batching, asynchronous jobs, and webhooks.
- Required business verification, privacy policy, terms, redirect domains, and data deletion callback.
- Supported objects/actions/content types.
- Unsupported or account-dependent operations.
- Error/rejection and reconciliation behavior.
- Data retention and permitted use constraints.
- Current connector version and test report.

## Phase 0 paid-platform access assessment

| Platform | Official access finding | Test/development route | Pilot-specific evidence still required | Status |
|---|---|---|---|---|
| Meta Ads | Marketing API access is permission and access-level gated; third-party client use must be validated through the Meta app, business verification, app review, and the minimum required `ads_read`, `ads_management`, and business permissions | App-role assets can be used during development; exact test-account and access-level behavior must be rechecked in the current Meta dashboard | Client Business/portfolio and ad account, roles, business verification, app ownership, approved permissions, production access, conversion assets | Desk verified; high external-review risk |
| Google Ads | A manager account typically owns the developer token. Test Account Access supports test accounts; production use requires Explorer, Basic, or Standard access and the approved permissible use | Dedicated Google Ads test accounts do not serve ads; initial Test Account Access has a documented daily operation limit | Client account linkage, manager access, developer token state, OAuth consent, permissible use, conversion actions, production approval | Desk verified; explicit test route available |
| Microsoft Advertising | Every call requires a developer token and OAuth token. Production and sandbox use separate credentials and endpoints | Microsoft Advertising provides a sandbox with the same OAuth pattern as production | Client customer/account IDs and roles, production token, consent, conversion/UET ownership, sandbox test evidence | Desk verified; explicit sandbox available |
| LinkedIn Ads | Advertising API access has Development and Standard tiers. Development supports read access to administered accounts and limited edits, while production multi-account management requires Standard. Calls use production data and scopes are granted after review | Development tier provides limited account mapping and one API-created test ad account; it is not a general isolated sandbox | Client ad account and Page, authorized member, app/company verification, tier approval, `r_ads`, `r_ads_reporting`, `rw_ads`, conversion and lead permissions | Desk verified; review and production-data risk |
| TikTok Ads | TikTok API for Business requires a business/developer account, developer app, authorization, authentication, and approved app permissions | API for Business documents sandbox accounts and Postman testing without affecting a real account | Client Business Center/advertiser, app approval, scopes, authorized identities, pixel/events, region and account eligibility | Desk verified; sandbox path available |
| Reddit Ads | The current Ads API is documented as open to developers without allowlisting, but developer apps are controlled by verified business administrators and all access remains subject to Ads API terms and account permissions | Developer application and OAuth can be exercised against an authorized Reddit Ads account; no independent no-spend sandbox is asserted | Client business and ad account, business admin, developer app, OAuth scopes, pixel/conversion ownership, test-spend approval | Desk verified; account verification required |
| X Ads | X requires an approved developer account and a separate application approved for Ads API access. Campaigns also require an existing funding instrument | Controlled development must use an approved app and eligible advertiser account; no isolated sandbox is asserted | Client advertiser account, app approval, funding instrument, OAuth authorization, account eligibility, cost/rate limits, conversion access | Desk verified; high access and account-eligibility risk |

### Paid official sources

- Meta: [Marketing APIs](https://developers.facebook.com/docs/marketing-apis/) and [Graph API access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/).
- Google: [access levels and permissible use](https://developers.google.com/google-ads/api/docs/api-policy/access-levels) and [account types and test accounts](https://developers.google.com/google-ads/api/docs/concepts/account-types).
- Microsoft: [OAuth quick start and sandbox](https://learn.microsoft.com/en-us/advertising/guides/authentication-oauth-quick-start?view=bingads-13) and [getting a production developer token](https://learn.microsoft.com/en-us/advertising/guides/get-started?view=bingads-13).
- LinkedIn: [Marketing API access tiers](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/marketing-tiers?view=li-lms-2026-06) and [increasing access and permissions](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-06).
- TikTok: [API for Business getting started](https://business-api.tiktok.com/gateway/docs/index?doc_id=1735713609895937&language=ENGLISH) and [authorization concepts](https://business-api.tiktok.com/gateway/docs/index?doc_id=1738928364967937&language=ENGLISH).
- Reddit: [Ads API overview and terms](https://ads-api.reddit.com/docs/v3/) and [developer-app authentication](https://ads-api.reddit.com/docs/v3/authenticate-your-developer-application).
- X: [Ads API authenticated-request requirements](https://docs.x.com/x-ads-api/fundamentals/making-authenticated-requests) and [campaign management](https://docs.x.com/x-ads-api/campaign-management).

## Phase 0 organic-channel access assessment

| Channel | Official access finding | Test/development constraint | Pilot-specific evidence still required | Status |
|---|---|---|---|---|
| LinkedIn | Community Management is a separately reviewed product with Development and Standard tiers, even when an Advertising API app already exists | Development tier is restricted and must be upgraded for unrestricted production use; LinkedIn may require a separate app and review evidence | Client Page, authorized member/admin, verified app/company, Community Management tier and scopes, approved content test | Desk verified; separate-review risk |
| X | The X API supports post creation through user-authorized access and currently uses pay-per-usage credits; Ads API approval does not substitute for organic API authorization | Development incurs endpoint costs and must use explicit spending limits; platform/account restrictions still apply | Client account authorization, app permissions, credit budget, media capabilities, analytics access, approved test post | Desk verified; cost and eligibility gated |
| Instagram | Meta's Instagram API supports professional accounts. Facebook Login-based access requires a linked Page and professional account; third-party accounts require Advanced Access for applicable permissions | App-owned/managed assets can be used before third-party Advanced Access; exact format support is account and API-version dependent | Client professional account and Page relationship, roles, app review, content-publish and insight permissions, approved media tests | Desk verified; Meta review risk |
| TikTok | Content Posting requires an approved `video.publish` scope and user authorization. Unaudited clients can post only with private visibility and are subject to user/creator/post caps | Private-only test posts are available before audit; public posting requires the TikTok audit and verified domains/URLs for URL-based media | Client creator/business account, authorization, domain verification, audit approval, current creator capability query, public test post | Desk verified; public-release audit required |
| Facebook | Page publishing is available through the Pages API with Page authorization and content-management permissions; third-party use remains subject to Meta app access/review | Development can use app-role Pages; production third-party Pages require current access and permission verification | Client Page and business relationship, Page roles/tasks, app review, Page token lifecycle, approved text/media tests | Desk verified; Meta review risk |
| YouTube | The Data API supports video upload with OAuth. Uploads from unverified projects are forced private until the API project passes a compliance audit | Private uploads provide a controlled test route; public visibility requires audit evidence | Client channel, OAuth consent, brand account roles, quota, verified project/audit, approved upload and processing reconciliation | Desk verified; public-release audit required |
| Reddit | Reddit provides post actions, but commercial use of Reddit developer services and Reddit data requires explicit approval; the 2026 Responsible Builder Policy requires approved, transparent access | Devvit playtesting and reviewed user actions may support controlled tests, but no commercial production path is assumed without Reddit approval | Client posting identity, approved communities and rules, commercial-use approval/contract, app review, authorized test post | Desk verified; commercial approval is a critical gate |

### Organic official sources

- LinkedIn: [Community Management migration and access review](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api-migration-guide?view=li-lms-2026-06) and [Marketing API access](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-06).
- X: [X API pricing](https://docs.x.com/x-api/getting-started/pricing) and [create-post API reference](https://docs.x.com/x-api/posts/create-post).
- Instagram: Meta's official [Instagram API workspace](https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00) and [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/).
- TikTok: [Content Posting getting started](https://developers.tiktok.com/doc/content-posting-api-get-started/) and [content-sharing guidelines and audit limits](https://developers.tiktok.com/doc/content-sharing-guidelines/).
- Facebook: [Pages API posts](https://developers.facebook.com/docs/pages-api/posts/) and [Graph API access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/).
- YouTube: [`videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert) and [quota and compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits).
- Reddit: [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy), [developer interfaces and commercial use](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Reddit-Developer-Interfaces), and [user actions](https://developers.reddit.com/docs/capabilities/server/userActions).

## Expansion sequencing from the access assessment

1. Build shared contracts, a mock connector, and recorded-payload tests before any production authorization.
2. Use Google Ads and Meta Ads for the pilot read contract. Keep Microsoft sandbox work in expansion.
3. Use private-only TikTok and YouTube publication tests while audit packages are prepared.
4. Start LinkedIn, Meta, X Ads, and commercial Reddit access work early because review or account eligibility may determine the critical path.
5. Keep paid and organic credentials, apps, scopes, capability snapshots, and release evidence separate even when the same platform brand owns both products.
6. Do not substitute a third-party publishing provider's advertised channel list for platform or client-account eligibility evidence.

## Paid platform expansion matrix

`Required` means the connector must implement the product behavior where the current official API and eligible account permit it. `Capability-gated` means the UI and policy engine must truthfully expose account/API limits.

| Platform | Connect/account discovery | Campaign/performance read | Offline draft/validation | Approved launch | Pause/resume | Supported edits | Creative upload | Conversion/outcome read | Reconciliation | Verification status |
|---|---|---|---|---|---|---|---|---|---|---|
| Meta Ads | Required | Required | Required | Required | Required | Capability-gated | Required | Required | Required | Implementation-time official verification required |
| Google Ads | Required | Required | Required | Required | Required | Capability-gated | Required | Required | Required | Implementation-time official verification required |
| Microsoft Advertising | Required | Required | Required | Required | Required | Capability-gated | Required | Required | Required | Implementation-time official verification required |
| LinkedIn Ads | Required | Required | Required | Required | Required | Capability-gated | Required | Required | Required | Implementation-time official verification required |
| TikTok Ads | Required | Required | Required | Required | Required | Capability-gated | Required | Required | Required | Implementation-time official verification required |
| Reddit Ads | Required | Required | Required | Required | Required | Capability-gated | Required | Required | Required | Implementation-time official verification required |
| X Ads | Required | Required | Required | Required | Required | Capability-gated | Required | Required | Required | Implementation-time official verification required |

## Organic channel expansion matrix

| Channel | Connect/identity discovery | Text | Image | Carousel/document | Short video | Long video | Schedule/immediate publish | Publication reconciliation | Analytics | Comments/replies | Initial route decision | Verification status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LinkedIn | Required | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Required route | Required | Required where available | Separate approval capability | Native/provider evaluation | Official verification required |
| X | Required | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Required route | Required | Required where available | Separate approval capability | Native/provider evaluation | Official verification required |
| Instagram | Required | N/A standalone | Capability-gated | Capability-gated | Capability-gated | N/A/limited by current API | Required route | Required | Required where available | Separate approval capability | Native/provider evaluation | Official verification required |
| TikTok | Required | Metadata only | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Required route | Required | Required where available | Separate approval capability | Native/provider evaluation | Official verification required |
| Facebook | Required | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Required route | Required | Required where available | Separate approval capability | Native/provider evaluation | Official verification required |
| YouTube | Required | Metadata/community capability-gated | Thumbnail/metadata | N/A | Capability-gated | Capability-gated | Required route | Required | Required where available | Separate approval capability | Native/provider evaluation | Official verification required |
| Reddit | Required | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Capability-gated | Required route | Required | Required where available | Separate approval capability | Native/provider evaluation | Official verification required |

`N/A` is not an exemption from channel support; it identifies a content form that may not make sense or may not be exposed by the current official API. The platform specialist and UI must offer only verified, meaningful capabilities.

## Connector acceptance record

For each platform, the implementation pull request and release packet must link:

- completed verification record;
- connector capability snapshot fixtures;
- official test/sandbox evidence;
- recorded-payload normalization tests;
- successful approved action/publication and reconciliation;
- insufficient-scope and ineligible-account behavior;
- quota, timeout, retry, duplicate, and unknown-result tests;
- current limitations shown in the UI;
- security and tenant test results;
- kill-switch evidence;
- owner and next policy/API review date.

## Change management

Capability status is runtime data as well as documentation. The connector refreshes account capability snapshots; a material API/policy change can disable a capability through a safety flag. Documentation and test fixtures must be updated before re-enabling it.
