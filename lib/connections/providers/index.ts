import type { ConnectionProvider } from "../contracts";
import { MockProviderAdapter } from "./mock-provider";
import { GoogleReadOnlyAdapter } from "./google";
import { MetaReadOnlyAdapter } from "./meta";
import { TikTokReadOnlyAdapter } from "./tiktok";
import { ManualInventoryAdapter } from "./manual";
import type { ProviderAdapter } from "./provider-adapter";
import { ProviderAdapterError } from "./provider-adapter";

export function getProviderAdapter(provider: ConnectionProvider): ProviderAdapter {
  if (provider === "google_ads" && process.env.NODE_ENV === "test") return new MockProviderAdapter();
  if (provider === "google_ads" && process.env.ACCOUNT_CONNECTIONS_MOCK_PROVIDER === "true") {
    if (process.env.NODE_ENV === "production") throw new ProviderAdapterError("MOCK_PROVIDER_FORBIDDEN");
    return new MockProviderAdapter();
  }
  if (provider === "google_ads" || provider === "google_analytics" || provider === "google_tag_manager" || provider === "google_search_console") return new GoogleReadOnlyAdapter(provider);
  if (provider === "meta") return new MetaReadOnlyAdapter();
  if (provider === "tiktok") return new TikTokReadOnlyAdapter();
  if (provider === "dubsado" || provider === "wordpress" || provider === "videoask" || provider === "organic_social" || provider === "asset_source") return new ManualInventoryAdapter(provider);
  throw new ProviderAdapterError("PROVIDER_ADAPTER_NOT_ENABLED");
}

export { parseProviderCredentialKind } from "./provider-adapter";
export type { OAuthCredentialKind, ProviderAdapter, ProviderCredentialKind, ProviderResource, ProviderVerification, TokenExchangeResult } from "./provider-adapter";
