import type { ConnectionProvider } from "../contracts";
import type { AuthorizationContext, ProviderAdapter, ProviderCredentialKind, ProviderResource, ProviderVerification, TokenExchangeResult } from "./provider-adapter";
import { ProviderAdapterError } from "./provider-adapter";
import { configuredRedirectUri, isJsonObject, parseLatency, requestJson, safeProviderUrl, stringArray, stringValue } from "./http";

const TIKTOK_HOSTS = ["business-api.tiktok.com"] as const;
const API_ROOT = "https://business-api.tiktok.com/open_api/v1.3";

function apiUrl(path: string) {
  return `${API_ROOT}${path}`;
}

function assertSuccess(payload: unknown) {
  if (!isJsonObject(payload) || (typeof payload.code === "number" && payload.code !== 0)) throw new ProviderAdapterError("TIKTOK_PROVIDER_REJECTED");
  return payload;
}

function dataObject(payload: unknown) {
  return isJsonObject(payload) && isJsonObject(payload.data) ? payload.data : {};
}

function requestedScopes() {
  return (process.env.TIKTOK_REQUESTED_SCOPES ?? "").split(",").map((scope) => scope.trim()).filter(Boolean);
}

export class TikTokReadOnlyAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider = "tiktok";
  readonly version = "tiktok-read-only-1.1.0";
  readonly authorizationMethods = ["oauth", "provider_invitation"] as const;
  readonly requestedScopes: readonly string[] = requestedScopes();
  readonly supportsWriteOperations = false as const;

  buildAuthorizationUrl(context: AuthorizationContext) {
    const appId = process.env.TIKTOK_APP_ID;
    const endpoint = process.env.TIKTOK_AUTHORIZATION_ENDPOINT;
    if (!appId || !endpoint) throw new ProviderAdapterError("TIKTOK_APP_NOT_CONFIGURED");
    const url = safeProviderUrl(endpoint, TIKTOK_HOSTS);
    const redirectUri = configuredRedirectUri(process.env.TIKTOK_OAUTH_REDIRECT_URI, "TIKTOK_REDIRECT_URI_NOT_CONFIGURED");
    url.searchParams.set("app_id", appId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", context.state);
    url.searchParams.set("scope", this.requestedScopes.join(","));
    return url.toString();
  }

  async exchangeCode(code: string, verifier: string): Promise<TokenExchangeResult> {
    void verifier;
    const appId = process.env.TIKTOK_APP_ID;
    const secret = process.env.TIKTOK_CLIENT_SECRET;
    if (!appId || !secret) throw new ProviderAdapterError("TIKTOK_APP_NOT_CONFIGURED");
    const payload = assertSuccess(await requestJson(apiUrl("/oauth2/access_token/"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_id: appId, secret, auth_code: code }) }, "TIKTOK_TOKEN_EXCHANGE", TIKTOK_HOSTS));
    const data = dataObject(payload);
    const accessToken = stringValue(data.access_token);
    if (!accessToken) throw new ProviderAdapterError("TIKTOK_TOKEN_MISSING");
    const grantedScopes = Array.isArray(data.scope) ? data.scope.filter((scope): scope is string | number => typeof scope === "string" || typeof scope === "number").map(String) : stringValue(data.scope)?.split(",").filter(Boolean) ?? [];
    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : undefined;
    return { secret: accessToken, secretKind: "oauth_access_token", grantedScopes, principal: "tiktok-principal-pending", effectiveRole: "role_pending", expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined };
  }

  async discoverResources(secret: string, credentialKind: ProviderCredentialKind): Promise<ProviderResource[]> {
    if (!secret) throw new ProviderAdapterError("TIKTOK_SECRET_MISSING");
    if (credentialKind !== "oauth_access_token") throw new ProviderAdapterError("TIKTOK_CREDENTIAL_KIND_UNSUPPORTED");
    const advertiserPayload = assertSuccess(await requestJson(apiUrl("/oauth2/advertiser/get/"), { method: "GET", headers: { "Access-Token": secret } }, "TIKTOK_ADVERTISER_DISCOVERY", TIKTOK_HOSTS));
    const advertiserData = dataObject(advertiserPayload);
    const ids = stringArray(advertiserData.advertiser_ids);
    const infoUrl = new URL(apiUrl("/advertiser/info/"));
    infoUrl.searchParams.set("advertiser_ids", JSON.stringify(ids));
    infoUrl.searchParams.set("fields", JSON.stringify(["advertiser_id", "name", "status", "role", "owner_bc_id", "timezone", "currency"]));
    const infoPayload = assertSuccess(await requestJson(infoUrl.toString(), { method: "GET", headers: { "Access-Token": secret } }, "TIKTOK_ADVERTISER_INFO", TIKTOK_HOSTS));
    const list = isJsonObject(infoPayload) && isJsonObject(infoPayload.data) && Array.isArray(infoPayload.data.list) ? infoPayload.data.list.filter(isJsonObject) : [];
    return list.flatMap((item): ProviderResource[] => {
      const id = stringValue(item.advertiser_id);
      if (!id) return [];
      const status = stringValue(item.status) ?? "unknown";
      const role = stringValue(item.role) ?? "unknown";
      return [{ resourceType: "tiktok_advertiser", externalId: id, displayName: stringValue(item.name) ?? `TikTok advertiser ${id}`, eligibility: status === "STATUS_ENABLE" ? "eligible" : "ineligible", metadata: { status, role, ownerBusinessCenterId: stringValue(item.owner_bc_id) ?? "unknown" } }];
    });
  }

  async verify(secret: string, resources: ProviderResource[], credentialKind: ProviderCredentialKind): Promise<ProviderVerification> {
    const startedAt = Date.now();
    if (!secret) return { outcomeCode: "invalid_grant", remediationCode: "reconnect", latencyMs: 0 };
    if (!resources.length) return { outcomeCode: "missing_role", remediationCode: "select_eligible_resource", latencyMs: 0 };
    try {
      const discovered = await this.discoverResources(secret, credentialKind);
      const eligible = new Set(discovered.filter((resource) => resource.eligibility === "eligible").map((resource) => `${resource.resourceType}:${resource.externalId}`));
      if (resources.some((resource) => !eligible.has(`${resource.resourceType}:${resource.externalId}`))) return { outcomeCode: "missing_role", remediationCode: "advertiser_access_changed", latencyMs: parseLatency(startedAt) };
      return { outcomeCode: "verified", effectiveRole: "role_evidence_required", latencyMs: parseLatency(startedAt) };
    } catch (error) {
      const invalid = error instanceof ProviderAdapterError && error.code.includes("UNAUTHORIZED");
      return { outcomeCode: invalid ? "invalid_grant" : "provider_unavailable", remediationCode: invalid ? "reconnect" : "provider_retry", latencyMs: parseLatency(startedAt) };
    }
  }

  async revoke(secret: string, credentialKind: ProviderCredentialKind) {
    if (!secret) throw new ProviderAdapterError("TIKTOK_SECRET_MISSING");
    if (credentialKind !== "oauth_access_token") throw new ProviderAdapterError("TIKTOK_CREDENTIAL_KIND_UNSUPPORTED");
    try {
      const payload = assertSuccess(await requestJson(apiUrl("/oauth2/revoke_token/"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_token: secret }) }, "TIKTOK_REVOKE", TIKTOK_HOSTS));
      void payload;
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw new ProviderAdapterError("TIKTOK_REVOKE_UNAVAILABLE");
    }
  }
}
