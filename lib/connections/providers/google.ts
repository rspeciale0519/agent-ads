import type { ConnectionProvider } from "../contracts";
import type { AuthorizationContext, ProviderAdapter, ProviderResource, ProviderVerification, TokenExchangeResult } from "./provider-adapter";
import { ProviderAdapterError } from "./provider-adapter";
import { configuredRedirectUri, isJsonObject, parseLatency, requestJson, stringArray, stringValue } from "./http";
import { withRefreshLock } from "../refresh-lock";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_HOSTS = ["oauth2.googleapis.com", "accounts.google.com", "googleads.googleapis.com", "analyticsadmin.googleapis.com", "tagmanager.googleapis.com"] as const;
const SUPPORTED_GOOGLE_ADS_API_VERSIONS = ["v25"] as const;

function googleAdsApiVersion() {
  const value = process.env.GOOGLE_ADS_API_VERSION;
  if (!value) throw new ProviderAdapterError("GOOGLE_ADS_ACCESS_NOT_CONFIGURED");
  if (!SUPPORTED_GOOGLE_ADS_API_VERSIONS.includes(value as (typeof SUPPORTED_GOOGLE_ADS_API_VERSIONS)[number])) throw new ProviderAdapterError("GOOGLE_ADS_API_VERSION_UNSUPPORTED");
  return value;
}

function resourceId(value: unknown, prefix: string) {
  const name = stringValue(value);
  return name?.startsWith(prefix) ? name.slice(prefix.length) : undefined;
}

function googleErrorCode(error: unknown) {
  if (!(error instanceof ProviderAdapterError)) return "provider_unavailable";
  if (error.code.includes("UNAUTHORIZED")) return "invalid_grant";
  return "provider_unavailable";
}

export class GoogleReadOnlyAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider;
  readonly version = "google-read-only-1.1.0";
  readonly authorizationMethods = ["oauth", "provider_invitation"] as const;
  readonly requestedScopes: readonly string[];
  readonly supportsWriteOperations = false as const;

  constructor(provider: Extract<ConnectionProvider, "google_ads" | "google_analytics" | "google_tag_manager">) {
    this.provider = provider;
    this.requestedScopes = provider === "google_analytics" ? ["https://www.googleapis.com/auth/analytics.readonly"] : provider === "google_tag_manager" ? ["https://www.googleapis.com/auth/tagmanager.readonly"] : ["https://www.googleapis.com/auth/adwords"];
  }

  buildAuthorizationUrl(context: AuthorizationContext) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) throw new ProviderAdapterError("GOOGLE_CLIENT_NOT_CONFIGURED");
    const redirectUri = configuredRedirectUri(process.env.GOOGLE_OAUTH_REDIRECT_URI, "GOOGLE_REDIRECT_URI_NOT_CONFIGURED");
    const url = new URL(GOOGLE_AUTH_ENDPOINT);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", this.requestedScopes.join(" "));
    url.searchParams.set("state", context.state);
    url.searchParams.set("code_challenge", context.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  async exchangeCode(code: string, verifier: string): Promise<TokenExchangeResult> {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new ProviderAdapterError("GOOGLE_CLIENT_NOT_CONFIGURED");
    const redirectUri = configuredRedirectUri(process.env.GOOGLE_OAUTH_REDIRECT_URI, "GOOGLE_CLIENT_NOT_CONFIGURED");
    const payload = await requestJson(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }) }, "GOOGLE_TOKEN_EXCHANGE", GOOGLE_HOSTS);
    if (!isJsonObject(payload)) throw new ProviderAdapterError("GOOGLE_TOKEN_INVALID_RESPONSE");
    const refreshToken = stringValue(payload.refresh_token);
    const accessToken = stringValue(payload.access_token);
    const secret = refreshToken ?? accessToken;
    if (!secret) throw new ProviderAdapterError("GOOGLE_TOKEN_MISSING");
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : undefined;
    return { secret, secretKind: refreshToken ? "oauth_refresh_token" : "oauth_access_token", grantedScopes: stringValue(payload.scope)?.split(" ").filter(Boolean) ?? [], principal: "google-principal-pending", effectiveRole: "role_pending", expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined };
  }

  private async accessToken(secret: string) {
    return withRefreshLock(secret, async () => {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new ProviderAdapterError("GOOGLE_CLIENT_NOT_CONFIGURED");
      try {
        const payload = await requestJson(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: secret, grant_type: "refresh_token" }) }, "GOOGLE_TOKEN_REFRESH", GOOGLE_HOSTS);
        if (isJsonObject(payload) && stringValue(payload.access_token)) return stringValue(payload.access_token) as string;
      } catch (error) {
        if (error instanceof ProviderAdapterError && error.code === "GOOGLE_TOKEN_REFRESH_UNAVAILABLE") throw error;
      }
      return secret;
    });
  }

  async discoverResources(secret: string): Promise<ProviderResource[]> {
    if (!secret) throw new ProviderAdapterError("GOOGLE_SECRET_MISSING");
    const token = await this.accessToken(secret);
    if (this.provider === "google_ads") return this.discoverAds(token);
    if (this.provider === "google_analytics") return this.discoverAnalytics(token);
    return this.discoverTagManager(token);
  }

  private async discoverAds(token: string) {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken) throw new ProviderAdapterError("GOOGLE_ADS_ACCESS_NOT_CONFIGURED");
    const version = googleAdsApiVersion();
    const payload = await requestJson(`https://googleads.googleapis.com/${version}/customers:listAccessibleCustomers`, { headers: { Authorization: `Bearer ${token}`, "developer-token": developerToken } }, "GOOGLE_ADS_DISCOVERY", GOOGLE_HOSTS);
    const names = isJsonObject(payload) ? stringArray(payload.resourceNames) : [];
    return names.map((name) => ({ resourceType: "ads_customer", externalId: name.replace(/^customers\//, ""), displayName: `Google Ads customer ${name.replace(/^customers\//, "")}`, eligibility: "eligible" as const, metadata: { accessRole: "account_role_requires_confirmation" } }));
  }

  private async discoverAnalytics(token: string) {
    const resources: ProviderResource[] = [];
    const payload = await requestJson("https://analyticsadmin.googleapis.com/v1alpha/accountSummaries", { headers: { Authorization: `Bearer ${token}` } }, "GOOGLE_ANALYTICS_DISCOVERY", GOOGLE_HOSTS);
    const summaries = isJsonObject(payload) && Array.isArray(payload.accountSummaries) ? payload.accountSummaries.filter(isJsonObject) : [];
    for (const summary of summaries.slice(0, 50)) {
      const accountId = resourceId(summary.account, "accounts/");
      if (accountId) resources.push({ resourceType: "analytics_account", externalId: accountId, displayName: stringValue(summary.displayName) ?? `Analytics account ${accountId}`, eligibility: "eligible" });
      const properties = Array.isArray(summary.propertySummaries) ? summary.propertySummaries.filter(isJsonObject) : [];
      for (const property of properties.slice(0, 100)) {
        const propertyId = resourceId(property.property, "properties/");
        if (!propertyId) continue;
        resources.push({ resourceType: "analytics_property", externalId: propertyId, displayName: stringValue(property.displayName) ?? `GA4 property ${propertyId}`, eligibility: "eligible", metadata: { parentAccount: accountId ?? "unknown" } });
        try {
          const streams = await requestJson(`https://analyticsadmin.googleapis.com/v1alpha/properties/${encodeURIComponent(propertyId)}/dataStreams`, { headers: { Authorization: `Bearer ${token}` } }, "GOOGLE_ANALYTICS_STREAM_DISCOVERY", GOOGLE_HOSTS);
          const dataStreams = isJsonObject(streams) && Array.isArray(streams.dataStreams) ? streams.dataStreams.filter(isJsonObject) : [];
          for (const stream of dataStreams.slice(0, 100)) {
            const streamId = resourceId(stream.name, `properties/${propertyId}/dataStreams/`);
            if (streamId) resources.push({ resourceType: "analytics_data_stream", externalId: `${propertyId}/${streamId}`, displayName: stringValue(stream.displayName) ?? `GA4 data stream ${streamId}`, eligibility: "eligible", metadata: { propertyId } });
          }
        } catch (error) {
          if (error instanceof ProviderAdapterError && error.code.includes("UNAUTHORIZED")) throw error;
        }
      }
    }
    return resources;
  }

  private async discoverTagManager(token: string) {
    const resources: ProviderResource[] = [];
    const accounts = await requestJson("https://tagmanager.googleapis.com/tagmanager/v2/accounts", { headers: { Authorization: `Bearer ${token}` } }, "GOOGLE_GTM_DISCOVERY", GOOGLE_HOSTS);
    const accountList = isJsonObject(accounts) && Array.isArray(accounts.account) ? accounts.account.filter(isJsonObject) : [];
    for (const account of accountList.slice(0, 50)) {
      const accountId = resourceId(account.path, "accounts/") ?? stringValue(account.accountId);
      if (!accountId) continue;
      resources.push({ resourceType: "tag_manager_account", externalId: accountId, displayName: stringValue(account.name) ?? `GTM account ${accountId}`, eligibility: "eligible" });
      const containers = await requestJson(`https://tagmanager.googleapis.com/tagmanager/v2/accounts/${encodeURIComponent(accountId)}/containers`, { headers: { Authorization: `Bearer ${token}` } }, "GOOGLE_GTM_CONTAINER_DISCOVERY", GOOGLE_HOSTS);
      const containerList = isJsonObject(containers) && Array.isArray(containers.container) ? containers.container.filter(isJsonObject) : [];
      for (const container of containerList.slice(0, 100)) {
        const containerId = resourceId(container.path, `accounts/${accountId}/containers/`) ?? stringValue(container.containerId);
        if (containerId) resources.push({ resourceType: "tag_manager_container", externalId: `${accountId}/${containerId}`, displayName: stringValue(container.name) ?? `GTM container ${containerId}`, eligibility: "eligible", metadata: { accountId } });
      }
    }
    return resources;
  }

  async verify(secret: string, resources: ProviderResource[]): Promise<ProviderVerification> {
    const startedAt = Date.now();
    if (!secret) return { outcomeCode: "invalid_grant", remediationCode: "reconnect", latencyMs: 0 };
    if (!resources.length) return { outcomeCode: "missing_role", remediationCode: "select_eligible_resource", latencyMs: 0 };
    try {
      const discovered = await this.discoverResources(secret);
      const discoveredIds = new Set(discovered.filter((resource) => resource.eligibility === "eligible").map((resource) => `${resource.resourceType}:${resource.externalId}`));
      if (resources.some((resource) => !discoveredIds.has(`${resource.resourceType}:${resource.externalId}`))) return { outcomeCode: "missing_role", remediationCode: "resource_access_changed", latencyMs: parseLatency(startedAt) };
      return { outcomeCode: "verified", effectiveRole: this.provider === "google_ads" ? "role_evidence_required" : "read_only_scope", latencyMs: parseLatency(startedAt) };
    } catch (error) {
      const code = googleErrorCode(error);
      return { outcomeCode: code === "invalid_grant" ? "invalid_grant" : "provider_unavailable", remediationCode: code === "invalid_grant" ? "reconnect" : "provider_retry", latencyMs: parseLatency(startedAt) };
    }
  }

  async revoke(secret: string) {
    if (!secret) throw new ProviderAdapterError("GOOGLE_SECRET_MISSING");
    try {
      const response = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: secret }), signal: AbortSignal.timeout(10_000) });
      if (!response.ok && response.status !== 400) throw new ProviderAdapterError("GOOGLE_REVOKE_FAILED");
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw new ProviderAdapterError("GOOGLE_REVOKE_UNAVAILABLE");
    }
  }
}
