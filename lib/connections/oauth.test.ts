import { beforeEach, describe, expect, it } from "vitest";
import { createOAuthState, createPkcePair, hashOAuthState, isBrowserTransactionId, safeReturnPath } from "./oauth";

describe("OAuth boundary", () => {
  beforeEach(() => { process.env.OAUTH_STATE_HMAC_KEY = "test-oauth-key"; });

  it("creates S256 PKCE material and one-way state hashes", () => {
    const pair = createPkcePair();
    expect(pair.verifier.length).toBeGreaterThan(40);
    expect(pair.challenge).not.toBe(pair.verifier);
    const state = createOAuthState();
    expect(hashOAuthState(state)).toHaveLength(64);
    expect(hashOAuthState(state)).toBe(hashOAuthState(state));
  });

  it("allows only same-origin connection return paths", () => {
    expect(safeReturnPath("/connections/abc")).toBe("/connections/abc");
    expect(safeReturnPath("https://evil.example")).toBe("/connections");
    expect(safeReturnPath("//evil.example")).toBe("/connections");
  });

  it("accepts only UUID browser transaction bindings", () => {
    expect(isBrowserTransactionId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isBrowserTransactionId("copied-state")).toBe(false);
    expect(isBrowserTransactionId(undefined)).toBe(false);
  });
});
