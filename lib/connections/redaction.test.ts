import { describe, expect, it } from "vitest";
import { containsSecret, redactSensitive } from "./redaction";

describe("secret redaction", () => {
  it("redacts token-like keys recursively", () => {
    const safe = redactSensitive({ provider: "mock", refresh_token: "token-value", nested: { authorization: "Bearer abc" } });
    expect(safe).toEqual({ provider: "mock", refresh_token: "[REDACTED]", nested: { authorization: "[REDACTED]" } });
    expect(containsSecret(safe)).toBe(false);
  });

  it("keeps normalized health metadata safe", () => {
    expect(redactSensitive({ outcomeCode: "verified", latencyMs: 20 })).toEqual({ outcomeCode: "verified", latencyMs: 20 });
  });
});
