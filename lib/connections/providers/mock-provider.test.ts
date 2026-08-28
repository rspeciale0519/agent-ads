import { describe, expect, it } from "vitest";
import { MockProviderAdapter } from "./mock-provider";

describe("mock provider contract", () => {
  it("exposes discovery and verification without mutation methods", async () => {
    const adapter = new MockProviderAdapter();
    expect(adapter.supportsWriteOperations).toBe(false);
    const token = await adapter.exchangeCode("mock-code", "verifier");
    const resources = await adapter.discoverResources(token.secret, token.secretKind);
    expect(resources[0]?.eligibility).toBe("eligible");
    expect((await adapter.verify(token.secret, resources, token.secretKind)).outcomeCode).toBe("verified");
    await expect(adapter.revoke(token.secret, token.secretKind)).resolves.toBeUndefined();
  });
});
