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
  secretKind: "oauth_refresh_token" | "oauth_access_token";
  grantedScopes: string[];
  principal: string;
  effectiveRole: string;
  expiresAt?: Date;
};

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
  discoverResources(secret: string): Promise<ProviderResource[]>;
  verify(secret: string, resources: ProviderResource[]): Promise<ProviderVerification>;
  revoke(secret: string): Promise<void>;
}

export class ProviderAdapterError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "ProviderAdapterError";
    this.code = code;
  }
}
