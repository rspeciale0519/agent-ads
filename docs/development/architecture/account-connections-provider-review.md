# Account Connections official-source review

Review date: 2026-08-11
Reviewer: implementation agent
Scope: adapter boundaries and read-only posture

GTM and TikTok are existing adapter research only. They do not block the pilot or receive production access without a scope decision.

The Supabase breaking-change feed was rechecked on 2026-08-11. The 2026 Data API exposure change reinforces the explicit-grant posture in the migrations: application tables are not assumed to be public, and the runtime grants only the server role required by Prisma/RLS. The current self-hosted Postgres 15-to-17 and Studio-role ownership changes remain staging/restore considerations. No current Supabase breaking change changes the adapter contracts below; staging still requires a fresh review before a provider flag is enabled.

This is an implementation-time review, not approval to enable a live provider. OAuth scopes, API versions, review status, token lifetime, and provider terms must be rechecked immediately before each provider flag is enabled.

| Provider/system | Official source reviewed | Adapter decision |
| --- | --- | --- |
| Google Ads | [OAuth overview](https://developers.google.com/google-ads/api/docs/oauth/overview), [access model](https://developers.google.com/google-ads/api/docs/oauth/access-model), [credential management](https://developers.google.com/google-ads/api/docs/oauth/credential-management) | Keep OAuth/manager-invitation routes behind the Google flag. The adapter requests Ads OAuth scope but must verify effective account role before calling the result read-only. Discovery and developer-token/account-role evidence remain staging gates. |
| Google Analytics 4 | [Google Analytics Admin API](https://developers.google.com/analytics/devguides/config/admin/v1) | Request the read-only Analytics scope only. Resource discovery and granted-scope fixtures are required before pilot enablement. |
| Google Tag Manager | [API authorization](https://developers.google.com/tag-platform/tag-manager/api/v2/authorization) | Request the read-only GTM scope only. Container/workspace discovery and role evidence remain a release gate. |
| Google Search Console | [Sites list](https://developers.google.com/webmaster-tools/v1/sites/list), [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) | Request `webmasters.readonly` only. Discover authorized properties through the Sites API; query data remains bounded by Search Console's documented row limits. |
| Meta Business | [Meta for Developers](https://developers.facebook.com/docs/), [Graph API access-token guidance](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/) | Keep disabled until app review, business verification, asset tasks, scope response parsing, discovery, and revoke behavior are evidenced. No mutation method is permitted. |
| TikTok for Business | [Business API portal](https://business-api.tiktok.com/portal), [Business Center account access](https://ads.tiktok.com/help/article/request-access-to-ad-accounts-in-business-center) | Keep disabled until eligible test advertiser, review, scope, discovery, and revoke evidence are recorded. |
| Dubsado | [CSV export](https://help.dubsado.com/en/articles/2779503-export-data-from-dubsado), [Zapier connection](https://help.dubsado.com/en/articles/15920600-connecting-with-zapier) | Use only an approved export/client-owned integration with source and date. Never repurpose a Zapier-only key as a generic credential route. |
| WordPress, VideoAsk, organic, asset sources | Provider invitation and operator verification | Inventory/invitation tracking only. Email or a manually marked invitation is not proof of access. |

## Adapter implementation notes

The adapters now use bounded, HTTPS-only requests to provider allowlists and return normalized resources and outcome codes only. Provider response bodies are never persisted or returned to the browser. Live authorization additionally requires the global/provider flag and the organization UUID in `ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS`; inventory remains available when live authorization is disabled. All live flags remain disabled until the corresponding environment-specific prerequisites and per-connection role evidence are accepted.

- Google Ads calls the code-supported v25 `customers:listAccessibleCustomers` endpoint with the server-side developer token. The July 2026 access-model review confirms that the same OAuth scope serves read and write operations, so an accessible customer is not labeled read-only until a current connection-specific `read_only_role` capability snapshot records the effective account role. Reconnect invalidates older evidence by requiring evidence at or after the active credential reference.
- Google Analytics uses `accountSummaries` and per-property `dataStreams`; Google Tag Manager uses account and container list endpoints. The adapters request only read-only scopes.
- Google Search Console uses the Sites list endpoint with the `webmasters.readonly` scope and returns only normalized property and permission metadata. Search performance queries remain a separate bounded read operation.
- Meta uses the code-validated `META_GRAPH_API_VERSION` and reads principal, business, ad-account, Page/Instagram, and pixel metadata. Verification requires current connection-specific read-only/analyst evidence; Meta app review, eligible assets, exact permissions, and live source revalidation remain external gates.
- TikTok uses the v1.3 `app_id`/`secret`/`auth_code` exchange, the authorized-advertiser list, and advertiser-info endpoints. `TIKTOK_AUTHORIZATION_ENDPOINT` and `TIKTOK_REQUESTED_SCOPES` are deployment inputs because authorization URL and permission availability vary by approved app. The March/May 2026 role review distinguishes Analyst view-only access from Operator/Admin mutation authority; activation therefore requires current connection-specific analyst/read-only evidence.
- Dubsado, WordPress, VideoAsk, organic, and asset routes use the manual lifecycle service. Dubsado records only an approved export or client-owned integration source and date; no Zapier-only key is accepted. The Dubsado export normalizer requires explicit stable/status mappings, rejects direct identity fields, validates dates and money, limits input size, and ignores unmapped columns.

The dated TikTok source review confirms that v1.3 returns authorized advertiser IDs and permission scopes during token exchange, exposes advertiser role/status through advertiser-info, and provides `/oauth2/revoke_token/` for long-lived token invalidation. Recheck the source immediately before enabling the provider flag.

## Common security sources

- [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres) and [Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting) govern pooled runtime versus direct migration connections.
- [Supabase Vault](https://supabase.com/docs/guides/database/vault) governs the broker's secret lifecycle and root-key recovery boundary.
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) and [sessions](https://supabase.com/docs/guides/auth/sessions) govern AAL2 and active-session validation.
- [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) informs OAuth state, PKCE, replay, redirect, and mix-up controls.
