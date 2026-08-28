import type { ConnectionProvider } from "../contracts";
import type { AuthorizationContext, ProviderAdapter, ProviderCredentialKind, ProviderResource, ProviderVerification, TokenExchangeResult } from "./provider-adapter";
import { ProviderAdapterError } from "./provider-adapter";
import { configuredRedirectUri, isJsonObject, nextPageUrl, parseLatency, requestJson, stringArray, stringValue } from "./http";

const META_HOSTS = ["www.facebook.com", "graph.facebook.com"] as const;

function version() {
  const value = process.env.META_GRAPH_API_VERSION;
  if (!value) throw new ProviderAdapterError("META_GRAPH_VERSION_NOT_CONFIGURED");
  if (!/^v\d+\.\d+$/.test(value)) throw new ProviderAdapterError("META_GRAPH_VERSION_INVALID");
  return value;
}

function graphUrl(path: string) {
  return `https://graph.facebook.com/${version()}${path}`;
}

function collection(payload: unknown) {
  return isJsonObject(payload) && Array.isArray(payload.data) ? payload.data.filter(isJsonObject) : [];
}

async function listGraph(path: string, token: string) {
  const rows: Record<string, unknown>[] = [];
  let next: string | undefined = graphUrl(path);
  for (let page = 0; page < 5 && next; page += 1) {
    const payload = await requestJson(next, { headers: { Authorization: `Bearer ${token}` } }, "META_DISCOVERY", META_HOSTS);
    rows.push(...collection(payload));
    next = nextPageUrl(payload, META_HOSTS);
  }
  return rows;
}

export class MetaReadOnlyAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider = "meta";
  readonly version = "meta-read-only-1.1.0";
  readonly authorizationMethods = ["oauth", "provider_invitation"] as const;
  readonly requestedScopes = ["ads_read", "business_management", "read_insights"] as const;
  readonly supportsWriteOperations = false as const;

  buildAuthorizationUrl(context: AuthorizationContext) {
    const clientId = process.env.META_APP_ID;
    if (!clientId) throw new ProviderAdapterError("META_APP_NOT_CONFIGURED");
    const redirectUri = configuredRedirectUri(process.env.META_OAUTH_REDIRECT_URI, "META_REDIRECT_URI_NOT_CONFIGURED");
    const url = new URL(`https://www.facebook.com/${version()}/dialog/oauth`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", context.state);
    url.searchParams.set("code_challenge", context.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("scope", this.requestedScopes.join(","));
    return url.toString();
  }

  async exchangeCode(code: string, verifier: string): Promise<TokenExchangeResult> {
    const clientId = process.env.META_APP_ID;
    const clientSecret = process.env.META_APP_SECRET;
    if (!clientId || !clientSecret) throw new ProviderAdapterError("META_APP_NOT_CONFIGURED");
    const redirectUri = configuredRedirectUri(process.env.META_OAUTH_REDIRECT_URI, "META_APP_NOT_CONFIGURED");
    const payload = await requestJson(graphUrl("/oauth/access_token"), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code, code_verifier: verifier }) }, "META_TOKEN_EXCHANGE", META_HOSTS);
    if (!isJsonObject(payload)) throw new ProviderAdapterError("META_TOKEN_INVALID_RESPONSE");
    const secret = stringValue(payload.access_token);
    if (!secret) throw new ProviderAdapterError("META_TOKEN_MISSING");
    const scopes = typeof payload.scope === "string" ? payload.scope.split(",").map((scope) => scope.trim()).filter(Boolean) : stringArray(payload.scopes);
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : undefined;
    return { secret, secretKind: "oauth_access_token", grantedScopes: scopes, principal: "meta-principal-pending", effectiveRole: "role_pending", expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined };
  }

  async discoverResources(secret: string, credentialKind: ProviderCredentialKind): Promise<ProviderResource[]> {
    if (!secret) throw new ProviderAdapterError("META_SECRET_MISSING");
    if (credentialKind !== "oauth_access_token") throw new ProviderAdapterError("META_CREDENTIAL_KIND_UNSUPPORTED");
    const resources: ProviderResource[] = [];
    const me = await requestJson(graphUrl("/me?fields=id,name"), { headers: { Authorization: `Bearer ${secret}` } }, "META_DISCOVERY", META_HOSTS);
    if (isJsonObject(me) && stringValue(me.id)) resources.push({ resourceType: "meta_principal", externalId: stringValue(me.id) as string, displayName: stringValue(me.name) ?? "Meta principal", eligibility: "eligible" });
    const businesses = await listGraph("/me/businesses?fields=id,name", secret);
    for (const business of businesses) {
      const id = stringValue(business.id);
      if (id) resources.push({ resourceType: "meta_business", externalId: id, displayName: stringValue(business.name) ?? `Meta business ${id}`, eligibility: "eligible" });
    }
    const adAccounts = await listGraph("/me/adaccounts?fields=id,name,account_status,tasks", secret);
    for (const account of adAccounts) {
      const id = stringValue(account.id);
      if (!id) continue;
      const tasks = stringArray(account.tasks);
      resources.push({ resourceType: "meta_ad_account", externalId: id, displayName: stringValue(account.name) ?? `Meta ad account ${id}`, eligibility: account.account_status === 1 ? "eligible" : "ineligible", metadata: { accountStatus: String(account.account_status ?? "unknown"), tasks: tasks.join(",") } });
      try {
        const pixels = await listGraph(`/${encodeURIComponent(id)}/pixels?fields=id,name`, secret);
        for (const pixel of pixels) {
          const pixelId = stringValue(pixel.id);
          if (pixelId) resources.push({ resourceType: "meta_pixel", externalId: pixelId, displayName: stringValue(pixel.name) ?? `Meta pixel ${pixelId}`, eligibility: "eligible", metadata: { adAccountId: id } });
        }
      } catch (error) {
        if (error instanceof ProviderAdapterError && error.code.includes("UNAUTHORIZED")) throw error;
      }
    }
    const pages = await listGraph("/me/accounts?fields=id,name,instagram_business_account", secret);
    for (const page of pages) {
      const pageId = stringValue(page.id);
      if (!pageId) continue;
      resources.push({ resourceType: "meta_page", externalId: pageId, displayName: stringValue(page.name) ?? `Meta Page ${pageId}`, eligibility: "eligible" });
      if (isJsonObject(page.instagram_business_account) && stringValue(page.instagram_business_account.id)) resources.push({ resourceType: "meta_instagram_account", externalId: stringValue(page.instagram_business_account.id) as string, displayName: "Instagram account linked to Meta Page", eligibility: "eligible", metadata: { pageId } });
    }
    return resources;
  }

  async verify(secret: string, resources: ProviderResource[], credentialKind: ProviderCredentialKind): Promise<ProviderVerification> {
    const startedAt = Date.now();
    if (!secret) return { outcomeCode: "invalid_grant", remediationCode: "reconnect", latencyMs: 0 };
    if (!resources.length) return { outcomeCode: "missing_role", remediationCode: "select_eligible_resource", latencyMs: 0 };
    try {
      const discovered = await this.discoverResources(secret, credentialKind);
      const eligible = new Set(discovered.filter((resource) => resource.eligibility === "eligible").map((resource) => `${resource.resourceType}:${resource.externalId}`));
      if (resources.some((resource) => !eligible.has(`${resource.resourceType}:${resource.externalId}`))) return { outcomeCode: "missing_role", remediationCode: "asset_access_changed", latencyMs: parseLatency(startedAt) };
      return { outcomeCode: "verified", effectiveRole: "role_evidence_required", latencyMs: parseLatency(startedAt) };
    } catch (error) {
      const invalid = error instanceof ProviderAdapterError && error.code.includes("UNAUTHORIZED");
      return { outcomeCode: invalid ? "invalid_grant" : "provider_unavailable", remediationCode: invalid ? "reconnect" : "provider_retry", latencyMs: parseLatency(startedAt) };
    }
  }

  async revoke(secret: string, credentialKind: ProviderCredentialKind) {
    if (!secret) throw new ProviderAdapterError("META_SECRET_MISSING");
    if (credentialKind !== "oauth_access_token") throw new ProviderAdapterError("META_CREDENTIAL_KIND_UNSUPPORTED");
    try {
      const response = await fetch(graphUrl("/me/permissions"), { method: "DELETE", headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok && response.status !== 400) throw new ProviderAdapterError("META_REVOKE_FAILED");
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw new ProviderAdapterError("META_REVOKE_UNAVAILABLE");
    }
  }
}
