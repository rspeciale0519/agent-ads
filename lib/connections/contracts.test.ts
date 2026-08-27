import { describe, expect, it } from "vitest";
import { connectionRequestInputSchema, connectionWorkspaceEnabled, findSecretPattern, normalizeProviderIdentifier, providerAuthorizationEnabled, readOnlyRoleConfirmationSchema, requestPatchSchema } from "./contracts";

const organizationId = "00000000-0000-4000-8000-000000000001";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("connection metadata boundaries", () => {
  it("rejects platform secret patterns in notes", () => {
    const result = connectionRequestInputSchema.safeParse({ system: "paid_media", provider: "google_ads", ownershipStatus: "administrator", preferredMethod: "oauth", knownIdentifiers: [{ kind: "account", notSure: true }], notes: "password: do-not-store" });
    expect(result.success).toBe(false);
    expect(findSecretPattern("-----BEGIN PRIVATE KEY-----")).toBe("private key");
  });

  it("normalizes provider identifiers without changing their meaning", () => {
    expect(normalizeProviderIdentifier("google_ads", "  123 456 ")).toBe("123456");
    expect(normalizeProviderIdentifier("meta", "  Business  Portfolio ")).toBe("Business Portfolio");
  });

  it("keeps inventory available while authorization remains organization allowlisted", () => {
    const previous = {
      enabled: process.env.ACCOUNT_CONNECTIONS_ENABLED,
      google: process.env.ACCOUNT_CONNECTIONS_GOOGLE_ENABLED,
      kill: process.env.ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH,
      allowed: process.env.ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS,
    };
    try {
      process.env.ACCOUNT_CONNECTIONS_ENABLED = "true";
      process.env.ACCOUNT_CONNECTIONS_GOOGLE_ENABLED = "true";
      process.env.ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH = "false";
      process.env.ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS = organizationId;
      expect(connectionWorkspaceEnabled()).toBe(true);
      expect(providerAuthorizationEnabled("google_ads", organizationId)).toBe(true);
      expect(providerAuthorizationEnabled("google_ads", "00000000-0000-4000-8000-000000000002")).toBe(false);
      process.env.ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH = "true";
      expect(connectionWorkspaceEnabled()).toBe(true);
      expect(providerAuthorizationEnabled("google_ads", organizationId)).toBe(false);
    } finally {
      restoreEnv("ACCOUNT_CONNECTIONS_ENABLED", previous.enabled);
      restoreEnv("ACCOUNT_CONNECTIONS_GOOGLE_ENABLED", previous.google);
      restoreEnv("ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH", previous.kill);
      restoreEnv("ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS", previous.allowed);
    }
  });

  it("accepts partial request updates without weakening secret checks", () => {
    expect(requestPatchSchema.parse({ state: "ready" })).toEqual({ state: "ready", purpose: "inventory", knownIdentifiers: [] });
    expect(requestPatchSchema.safeParse({ notes: "api_token: do-not-store" }).success).toBe(false);
  });

  it("requires recent secret-free evidence for a connection role confirmation", () => {
    expect(readOnlyRoleConfirmationSchema.safeParse({ evidenceSource: "provider_console", sourceDate: new Date(), evidenceNote: "Analyst role observed on the selected account." }).success).toBe(true);
    expect(readOnlyRoleConfirmationSchema.safeParse({ evidenceSource: "email", sourceDate: new Date(), evidenceNote: "Confirmed" }).success).toBe(false);
    expect(readOnlyRoleConfirmationSchema.safeParse({ evidenceSource: "provider_console", sourceDate: new Date(), evidenceNote: "access_token: do-not-store" }).success).toBe(false);
  });
});
