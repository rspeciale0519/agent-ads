import type { ConnectionProvider } from "../contracts";
import type { AuthorizationContext, ProviderAdapter, ProviderResource, ProviderVerification, TokenExchangeResult } from "./provider-adapter";

export class MockProviderAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider = "google_ads";
  readonly version = "mock-1.0.0";
  readonly authorizationMethods = ["oauth"] as const;
  readonly requestedScopes = ["mock.readonly"] as const;
  readonly supportsWriteOperations = false as const;

  buildAuthorizationUrl(context: AuthorizationContext) {
    const url = new URL("https://mock.provider.example/authorize");
    url.searchParams.set("state", context.state);
    url.searchParams.set("code_challenge", context.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("redirect_uri", context.redirectUri);
    return url.toString();
  }

  async exchangeCode(code: string, verifier: string): Promise<TokenExchangeResult> {
    if (code !== "mock-code" || !verifier) throw new Error("MOCK_CODE_REJECTED");
    return { secret: "mock-refresh-token-value", secretKind: "oauth_refresh_token", grantedScopes: ["mock.readonly"], principal: "mock-principal@example.test", effectiveRole: "read_only" };
  }

  async discoverResources(secret: string): Promise<ProviderResource[]> {
    if (!secret) throw new Error("MOCK_SECRET_MISSING");
    return [{ resourceType: "advertiser_account", externalId: "mock-123", displayName: "Mock read-only account", metadata: { currency: "USD" }, eligibility: "eligible" }];
  }

  async verify(secret: string, resources: ProviderResource[]): Promise<ProviderVerification> {
    const started = Date.now();
    if (!secret) return { outcomeCode: "invalid_grant", remediationCode: "reconnect", latencyMs: Date.now() - started };
    if (!resources.some((resource) => resource.eligibility === "eligible")) return { outcomeCode: "missing_role", remediationCode: "select_eligible_resource", latencyMs: Date.now() - started };
    return { outcomeCode: "verified", latencyMs: Date.now() - started };
  }

  async revoke(secret: string) {
    if (!secret) throw new Error("MOCK_SECRET_MISSING");
  }
}
