import type { ConnectionProvider } from "../contracts";
import type { AuthorizationContext, ProviderAdapter, ProviderResource, ProviderVerification, TokenExchangeResult } from "./provider-adapter";
import { ProviderAdapterError } from "./provider-adapter";

export class ManualInventoryAdapter implements ProviderAdapter {
  readonly version = "manual-inventory-1.0.0";
  readonly authorizationMethods: readonly string[];
  readonly requestedScopes = [] as const;
  readonly supportsWriteOperations = false as const;
  constructor(readonly provider: ConnectionProvider) {
    this.authorizationMethods = provider === "dubsado" ? ["approved_export", "client_owned_integration"] : ["provider_invitation", "manual_inventory"];
  }
  buildAuthorizationUrl(context: AuthorizationContext): string { void context; throw new ProviderAdapterError("PROVIDER_MANUAL_ROUTE_ONLY"); }
  async exchangeCode(code: string, verifier: string): Promise<TokenExchangeResult> { void code; void verifier; throw new ProviderAdapterError("PROVIDER_MANUAL_ROUTE_ONLY"); }
  async discoverResources(secret: string): Promise<ProviderResource[]> { void secret; throw new ProviderAdapterError("PROVIDER_MANUAL_ROUTE_ONLY"); }
  async verify(secret: string, resources: ProviderResource[]): Promise<ProviderVerification> { void secret; void resources; return { outcomeCode: "provider_unavailable", remediationCode: "manual_verification_required", latencyMs: 0 }; }
  async revoke(secret: string) { void secret; return undefined; }
}
