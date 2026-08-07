# Platform Capability Verification Matrix

## Purpose

This is the release-controlled worksheet for converting the product's platform commitments into verified current API capabilities. It intentionally does not assert unstable API details before implementation-time review of official documentation, developer access, and eligible test accounts.

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

## Paid platform MVP matrix

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

## Organic channel MVP matrix

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

