import type { ConnectionProvider } from "../contracts";

export type AuthorizationContext = {
  state: string;
  codeChallenge: string;
  redirectUri: string;
};

export type ProviderResource = {
  resourceType: string;
  externalId: string;
  displayName: string;
  metadata?: Record<string, string>;
  eligibility: "eligible" | "ineligible" | "unknown";
};

export type TokenExchangeResult = {
  secret: string;
  secretKind: OAuthCredentialKind;
  grantedScopes: string[];
  principal: string;
  effectiveRole: string;
  expiresAt?: Date;
};

export type OAuthCredentialKind = "oauth_refresh_token" | "oauth_access_token";
export type ProviderCredentialKind = OAuthCredentialKind | "manual_inventory";

export type ProviderVerification = {
  outcomeCode: "verified" | "missing_scope" | "missing_role" | "provider_unavailable" | "invalid_grant";
  remediationCode?: string;
  effectiveRole?: string;
  grantedScopes?: string[];
  latencyMs: number;
};

export interface ProviderAdapter {
  readonly provider: ConnectionProvider;
  readonly version: string;
  readonly authorizationMethods: readonly string[];
  readonly requestedScopes: readonly string[];
  readonly supportsWriteOperations: false;
  buildAuthorizationUrl(context: AuthorizationContext): string;
  exchangeCode(code: string, verifier: string): Promise<TokenExchangeResult>;
  discoverResources(secret: string, credentialKind: ProviderCredentialKind): Promise<ProviderResource[]>;
  verify(secret: string, resources: ProviderResource[], credentialKind: ProviderCredentialKind): Promise<ProviderVerification>;
  revoke(secret: string, credentialKind: ProviderCredentialKind): Promise<void>;
}

export class ProviderAdapterError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "ProviderAdapterError";
    this.code = code;
  }
}

export function parseProviderCredentialKind(value: string | null | undefined): ProviderCredentialKind {
  if (value === undefined || value === null) return "manual_inventory";
  if (value === "oauth_refresh_token" || value === "oauth_access_token" || value === "manual_inventory") return value;
  throw new ProviderAdapterError("PROVIDER_CREDENTIAL_KIND_UNSUPPORTED");
}
