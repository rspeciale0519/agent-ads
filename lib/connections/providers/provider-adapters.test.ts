import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleReadOnlyAdapter } from "./google";
import { MetaReadOnlyAdapter } from "./meta";
import { TikTokReadOnlyAdapter } from "./tiktok";
import { getProviderAdapter } from "./index";
import { connectionProviders } from "../contracts";

const originalEnv = { ...process.env };

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("Google read-only adapter", () => {
  it("discovers Ads customers while leaving role evidence to the connection service", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_ADS_API_VERSION = "v25";
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) return json({ access_token: "access" });
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access");
      return json({ resourceNames: ["customers/123"] });
    });
    const adapter = new GoogleReadOnlyAdapter("google_ads");
    const resources = await adapter.discoverResources("refresh", "oauth_refresh_token");
    expect(resources[0]).toMatchObject({ resourceType: "ads_customer", externalId: "123", eligibility: "eligible" });
    expect(resources[0]?.metadata).not.toHaveProperty("token");
    expect((await adapter.verify("refresh", resources, "oauth_refresh_token")).outcomeCode).toBe("verified");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("discovers Analytics properties and data streams without returning tokens", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) return json({ access_token: "access" });
      if (url.endsWith("accountSummaries")) return json({ accountSummaries: [{ account: "accounts/1", displayName: "Account", propertySummaries: [{ property: "properties/2", displayName: "Property" }] }] });
      return json({ dataStreams: [{ name: "properties/2/dataStreams/3", displayName: "Web" }] });
    });
    const resources = await new GoogleReadOnlyAdapter("google_analytics").discoverResources("refresh", "oauth_refresh_token");
    expect(resources.map((resource) => resource.resourceType)).toEqual(["analytics_account", "analytics_property", "analytics_data_stream"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("discovers Search Console sites with the read-only scope", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ siteEntry: [
      { siteUrl: "https://example.test/", permissionLevel: "siteOwner" },
      { siteUrl: "sc-domain:example.test", permissionLevel: "siteFullUser" },
      { permissionLevel: "siteRestrictedUser" },
    ] }));
    const adapter = new GoogleReadOnlyAdapter("google_search_console");

    expect(adapter.requestedScopes).toEqual(["https://www.googleapis.com/auth/webmasters.readonly"]);
    const resources = await adapter.discoverResources("access", "oauth_access_token");

    expect(resources).toEqual([
      { resourceType: "search_console_site", externalId: "https://example.test/", displayName: "https://example.test/", eligibility: "eligible", metadata: { permissionLevel: "siteOwner" } },
      { resourceType: "search_console_site", externalId: "sc-domain:example.test", displayName: "sc-domain:example.test", eligibility: "eligible", metadata: { permissionLevel: "siteFullUser" } },
    ]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://www.googleapis.com/webmasters/v3/sites");
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer access");
  });

  it("uses the lifetime that belongs to the stored Google credential", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://example.test/google/callback";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ access_token: "access", refresh_token: "refresh", expires_in: 3600, refresh_token_expires_in: 7200 }))
      .mockResolvedValueOnce(json({ access_token: "access", expires_in: 3600 }));
    const adapter = new GoogleReadOnlyAdapter("google_analytics");

    const durableRefresh = await adapter.exchangeCode("code", "verifier");
    const expiringRefresh = await adapter.exchangeCode("code", "verifier");
    const accessOnly = await adapter.exchangeCode("code", "verifier");

    expect(durableRefresh).toMatchObject({ secretKind: "oauth_refresh_token", expiresAt: undefined });
    expect(expiringRefresh.secretKind).toBe("oauth_refresh_token");
    expect(expiringRefresh.expiresAt?.getTime()).toBeGreaterThan(Date.now() + 7_100_000);
    expect(accessOnly.secretKind).toBe("oauth_access_token");
    expect(accessOnly.expiresAt?.getTime()).toBeGreaterThan(Date.now() + 3_500_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([429, 500])("keeps a temporary Google refresh failure retryable for status %s", async (status) => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_ADS_API_VERSION = "v25";
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: "temporarily_unavailable" }, status));
    const adapter = new GoogleReadOnlyAdapter("google_ads");
    const result = await adapter.verify("refresh", [{ resourceType: "ads_customer", externalId: "123", displayName: "Customer", eligibility: "eligible" }], "oauth_refresh_token");

    expect(result).toMatchObject({ outcomeCode: "provider_unavailable", remediationCode: "provider_retry" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: 400, error: "invalid_grant", outcomeCode: "invalid_grant", remediationCode: "reconnect" },
    { status: 401, error: "invalid_client", outcomeCode: "provider_unavailable", remediationCode: "provider_retry" },
    { status: 500, error: "invalid_grant", outcomeCode: "provider_unavailable", remediationCode: "provider_retry" },
  ])("maps Google refresh error $error without blaming the user incorrectly", async ({ status, error, outcomeCode, remediationCode }) => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_ADS_API_VERSION = "v25";
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error }, status));
    const adapter = new GoogleReadOnlyAdapter("google_ads");
    const result = await adapter.verify("refresh", [{ resourceType: "ads_customer", externalId: "123", displayName: "Customer", eligibility: "eligible" }], "oauth_refresh_token");

    expect(result).toMatchObject({ outcomeCode, remediationCode });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses a stored Google access token without calling the refresh endpoint", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_ADS_API_VERSION = "v25";
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ resourceNames: ["customers/123"] }));

    await new GoogleReadOnlyAdapter("google_ads").discoverResources("access", "oauth_access_token");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("googleads.googleapis.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Meta read-only adapter", () => {
  it("uses the configured graph version and parses safe asset metadata", async () => {
    process.env.META_APP_ID = "app";
    process.env.META_APP_SECRET = "secret";
    process.env.META_GRAPH_API_VERSION = "v26.0";
    process.env.META_OAUTH_REDIRECT_URI = "https://example.test/meta/callback";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("oauth/access_token")) return json({ access_token: "access", scope: "ads_read,business_management" });
      if (url.includes("/me?")) return json({ id: "user-1", name: "Operator" });
      if (url.includes("/businesses?")) return json({ data: [{ id: "business-1", name: "Business" }] });
      if (url.includes("/adaccounts?")) return json({ data: [{ id: "act-1", name: "Ads", account_status: 1, tasks: ["ANALYZE"] }] });
      if (url.includes("/pixels?")) return json({ data: [{ id: "pixel-1", name: "Pixel" }] });
      return json({ data: [{ id: "page-1", name: "Page" }] });
    });
    const adapter = new MetaReadOnlyAdapter();
    const token = await adapter.exchangeCode("code", "verifier");
    const resources = await adapter.discoverResources(token.secret, token.secretKind);
    expect(token.secret).toBe("access");
    expect(resources.map((resource) => resource.resourceType)).toContain("meta_ad_account");
    expect(resources.find((resource) => resource.resourceType === "meta_ad_account")?.metadata).toMatchObject({ accountStatus: "1", tasks: "ANALYZE" });
    expect(fetchMock).toHaveBeenCalled();
    await expect(adapter.discoverResources(token.secret, "oauth_refresh_token")).rejects.toThrow("META_CREDENTIAL_KIND_UNSUPPORTED");
  });

  it("does not call Meta when revocation receives the wrong credential kind", async () => {
    process.env.META_GRAPH_API_VERSION = "v26.0";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(new MetaReadOnlyAdapter().revoke("access", "oauth_refresh_token")).rejects.toThrow("META_CREDENTIAL_KIND_UNSUPPORTED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("TikTok read-only adapter", () => {
  it("uses the official app_id/auth_code exchange and discovers authorized advertisers", async () => {
    process.env.TIKTOK_APP_ID = "app";
    process.env.TIKTOK_CLIENT_SECRET = "secret";
    process.env.TIKTOK_REQUESTED_SCOPES = "read-account";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("access_token")) return json({ code: 0, data: { access_token: "access", scope: [4], advertiser_ids: ["adv-1"] } });
      if (url.includes("advertiser/get")) return json({ code: 0, data: { advertiser_ids: ["adv-1"] } });
      return json({ code: 0, data: { list: [{ advertiser_id: "adv-1", name: "Advertiser", status: "STATUS_ENABLE", role: "ROLE_CHILD_ADVERTISER" }] } });
    });
    const adapter = new TikTokReadOnlyAdapter();
    const token = await adapter.exchangeCode("auth-code", "verifier");
    const resources = await adapter.discoverResources(token.secret, token.secretKind);
    expect(token.grantedScopes).toEqual(["4"]);
    expect(resources[0]).toMatchObject({ externalId: "adv-1", eligibility: "eligible" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await expect(adapter.discoverResources(token.secret, "oauth_refresh_token")).rejects.toThrow("TIKTOK_CREDENTIAL_KIND_UNSUPPORTED");
  });

  it("does not call TikTok when revocation receives the wrong credential kind", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(new TikTokReadOnlyAdapter().revoke("access", "oauth_refresh_token")).rejects.toThrow("TIKTOK_CREDENTIAL_KIND_UNSUPPORTED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("provider registry contract", () => {
  it("keeps every registered adapter mutation-free", () => {
    for (const provider of connectionProviders) {
      const adapter = getProviderAdapter(provider);
      expect(adapter.supportsWriteOperations).toBe(false);
    }
  });

  it("advertises the supported manual route methods", () => {
    expect(getProviderAdapter("dubsado").authorizationMethods).toEqual(["approved_export", "client_owned_integration"]);
    expect(getProviderAdapter("wordpress").authorizationMethods).toEqual(["provider_invitation", "manual_inventory"]);
  });

  it("forbids the mock adapter in production even when its flag is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.ACCOUNT_CONNECTIONS_MOCK_PROVIDER = "true";
    expect(() => getProviderAdapter("google_ads")).toThrow("MOCK_PROVIDER_FORBIDDEN");
  });
});

describe("provider OAuth redirect boundaries", () => {
  it("requires configured HTTPS callback URIs and an allowlisted TikTok authorization host", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    expect(() => new GoogleReadOnlyAdapter("google_ads").buildAuthorizationUrl({ state: "state", codeChallenge: "challenge", redirectUri: "https://request.example/callback" })).toThrow("GOOGLE_REDIRECT_URI_NOT_CONFIGURED");

    process.env.META_APP_ID = "app";
    process.env.META_GRAPH_API_VERSION = "v26.0";
    process.env.META_OAUTH_REDIRECT_URI = "http://insecure.example/callback";
    expect(() => new MetaReadOnlyAdapter().buildAuthorizationUrl({ state: "state", codeChallenge: "challenge", redirectUri: "https://request.example/callback" })).toThrow("META_REDIRECT_URI_NOT_CONFIGURED_INVALID");

    process.env.TIKTOK_APP_ID = "app";
    process.env.TIKTOK_AUTHORIZATION_ENDPOINT = "https://evil.example/authorize";
    process.env.TIKTOK_OAUTH_REDIRECT_URI = "https://app.example/callback";
    expect(() => new TikTokReadOnlyAdapter().buildAuthorizationUrl({ state: "state", codeChallenge: "challenge", redirectUri: "https://request.example/callback" })).toThrow("PROVIDER_REDIRECT_BLOCKED");
  });

  it("rejects unsupported provider API versions before making a request", async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "developer-token";
    process.env.GOOGLE_ADS_API_VERSION = "v999";
    await expect(new GoogleReadOnlyAdapter("google_ads").discoverResources("access", "oauth_access_token")).rejects.toThrow("GOOGLE_ADS_API_VERSION_UNSUPPORTED");

    process.env.META_GRAPH_API_VERSION = "../../oauth";
    process.env.META_APP_ID = "app";
    process.env.META_OAUTH_REDIRECT_URI = "https://example.test/meta/callback";
    expect(() => new MetaReadOnlyAdapter().buildAuthorizationUrl({ state: "state", codeChallenge: "challenge", redirectUri: "https://request.example/callback" })).toThrow("META_GRAPH_VERSION_INVALID");
  });
});
