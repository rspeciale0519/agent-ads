import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseProviderCredentialKind } from "./providers/provider-adapter";

const root = process.cwd();
const adapterContract = readFileSync(
  path.join(root, "lib", "connections", "providers", "provider-adapter.ts"),
  "utf8",
);
const connectionService = readFileSync(
  path.join(root, "lib", "connections", "service.ts"),
  "utf8",
);

describe("provider credential-kind contract", () => {
  it("requires credential context for provider reads and verification", () => {
    expect(adapterContract).toContain(
      "discoverResources(secret: string, credentialKind: ProviderCredentialKind)",
    );
    expect(adapterContract).toContain(
      "verify(secret: string, resources: ProviderResource[], credentialKind: ProviderCredentialKind)",
    );
    expect(adapterContract).toContain(
      "revoke(secret: string, credentialKind: ProviderCredentialKind)",
    );
    expect(adapterContract).not.toContain("credentialKind?:");
  });

  it("forwards exchanged and stored credential kinds from the connection service", () => {
    expect(connectionService).toContain(
      "adapter.discoverResources(exchanged.secret, exchanged.secretKind)",
    );
    expect(connectionService).toContain(
      "parseProviderCredentialKind(reference?.credentialKind)",
    );
  });

  it("rejects unknown stored credential kinds instead of treating them as manual inventory", () => {
    expect(parseProviderCredentialKind(undefined)).toBe("manual_inventory");
    expect(parseProviderCredentialKind("oauth_refresh_token")).toBe("oauth_refresh_token");
    expect(() => parseProviderCredentialKind("untrusted_kind")).toThrow("PROVIDER_CREDENTIAL_KIND_UNSUPPORTED");
  });
});
