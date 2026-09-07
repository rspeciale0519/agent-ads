import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceRateLimit, hashRateLimitKey, requestRateLimitKey } from "./rate-limit";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock("../db/client", () => ({ prisma: { $queryRaw: queryRaw } }));

afterEach(() => {
  vi.unstubAllEnvs();
  queryRaw.mockReset();
});

describe("durable rate-limit boundary", () => {
  it("binds numeric parameters to the database function's integer signature", async () => {
    queryRaw.mockResolvedValue([{ allowed: true, retry_after_seconds: 60 }]);
    await enforceRateLimit("synthetic", 10, 60_000);
    const [parts, hash, limit, seconds, organization] = queryRaw.mock.calls[0];
    expect(parts.join("?")).toContain("consume_rate_limit(?, ?::integer, ?::integer, ?::uuid)");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect([limit, seconds, organization]).toEqual([10, 60, null]);
  });

  it("still blocks requests when the database denies the rate limit", async () => {
    queryRaw.mockResolvedValue([{ allowed: false, retry_after_seconds: 30 }]);
    await expect(enforceRateLimit("synthetic", 10, 60_000)).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429, retryAfterSeconds: 30 });
  });

  it("fails closed when the database query fails", async () => {
    queryRaw.mockRejectedValue(new Error("synthetic database failure"));
    await expect(enforceRateLimit("synthetic", 10, 60_000)).rejects.toThrow("synthetic database failure");
  });
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
