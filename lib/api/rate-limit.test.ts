import { afterEach, describe, expect, it, vi } from "vitest";
import { hashRateLimitKey, requestRateLimitKey } from "./rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("durable rate-limit boundary", () => {
  it("HMACs identifiers before they reach durable storage", () => {
    vi.stubEnv("RATE_LIMIT_HMAC_KEY", "a-distinct-test-key-that-is-at-least-32-bytes");
    const raw = "invite:person@example.test";
    const hashed = hashRateLimitKey(raw);
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed).not.toContain("person");
    expect(hashed).toBe(hashRateLimitKey(raw));
  });

  it("uses only a validated proxy address in request keys", () => {
    const request = new Request("https://app.example.test", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } });
    expect(requestRateLimitKey(request, "accept")).toBe("accept:203.0.113.9");
    const spoofed = new Request("https://app.example.test", { headers: { "x-forwarded-for": "not-an-ip" } });
    expect(requestRateLimitKey(spoofed, "accept")).toBe("accept:unknown");
  });

  it("fails closed in production when the HMAC key is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_HMAC_KEY", "");
    expect(() => hashRateLimitKey("test")).toThrow("RATE_LIMIT_KEY_NOT_CONFIGURED");
  });
});
