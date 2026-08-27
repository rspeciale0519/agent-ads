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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) return json({ access_token: "access" });
      return json({ resourceNames: ["customers/123"] });
    });
    const adapter = new GoogleReadOnlyAdapter("google_ads");
    const resources = await adapter.discoverResources("refresh");
    expect(resources[0]).toMatchObject({ resourceType: "ads_customer", externalId: "123", eligibility: "eligible" });
    expect(resources[0]?.metadata).not.toHaveProperty("token");
    expect((await adapter.verify("refresh", resources)).outcomeCode).toBe("verified");
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
    const resources = await new GoogleReadOnlyAdapter("google_analytics").discoverResources("refresh");
    expect(resources.map((resource) => resource.resourceType)).toEqual(["analytics_account", "analytics_property", "analytics_data_stream"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
    const resources = await adapter.discoverResources(token.secret);
    expect(token.secret).toBe("access");
    expect(resources.map((resource) => resource.resourceType)).toContain("meta_ad_account");
    expect(resources.find((resource) => resource.resourceType === "meta_ad_account")?.metadata).toMatchObject({ accountStatus: "1", tasks: "ANALYZE" });
    expect(fetchMock).toHaveBeenCalled();
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
    const resources = await adapter.discoverResources(token.secret);
    expect(token.grantedScopes).toEqual(["4"]);
    expect(resources[0]).toMatchObject({ externalId: "adv-1", eligibility: "eligible" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
    await expect(new GoogleReadOnlyAdapter("google_ads").discoverResources("access")).rejects.toThrow("GOOGLE_ADS_API_VERSION_UNSUPPORTED");

    process.env.META_GRAPH_API_VERSION = "../../oauth";
    process.env.META_APP_ID = "app";
    process.env.META_OAUTH_REDIRECT_URI = "https://example.test/meta/callback";
    expect(() => new MetaReadOnlyAdapter().buildAuthorizationUrl({ state: "state", codeChallenge: "challenge", redirectUri: "https://request.example/callback" })).toThrow("META_GRAPH_VERSION_INVALID");
  });
});
