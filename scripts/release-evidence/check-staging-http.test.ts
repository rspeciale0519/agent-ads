import { describe, expect, it } from "vitest";
import { checkStagingHttp } from "./check-staging-http.mjs";

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(null, {
    status,
    headers,
  });
}

describe("checkStagingHttp", () => {
  it("accepts the anonymous auth redirect and required security headers", async () => {
    const result = await checkStagingHttp({
      url: "https://staging.example.com/",
      fetchImpl: async (input) => input.toString().endsWith("/")
        ? response(307, { location: "/auth" })
        : response(200, {
          "content-security-policy": "default-src 'self'",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
          "cache-control": "private, no-cache, no-store",
          "strict-transport-security": "max-age=63072000",
        }),
    });

    expect(result.codes).toEqual(["STAGING_HTTP_VALID"]);
    expect(result.rootStatus).toBe(307);
    expect(result.authStatus).toBe(200);
    expect(result.redirectPath).toBe("/auth");
  });

  it("reports a missing or unsafe header without returning response content", async () => {
    const result = await checkStagingHttp({
      url: "https://staging.example.com/",
      fetchImpl: async (input) => input.toString().endsWith("/")
        ? response(302, { location: "/auth" })
        : response(200, { "referrer-policy": "origin" }),
    });

    expect(result.codes).toContain("STAGING_HTTP_CACHE_CONTROL_INVALID");
    expect(result.codes).toContain("STAGING_HTTP_SECURITY_HEADER_MISSING");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("rejects non-HTTPS or credential-bearing URLs", async () => {
    await expect(checkStagingHttp({ url: "http://staging.example.com/" }))
      .rejects.toThrow("STAGING_HTTP_URL_INVALID");
    await expect(checkStagingHttp({ url: "https://user:pass@staging.example.com/" }))
      .rejects.toThrow("STAGING_HTTP_URL_INVALID");
  });

  it("rejects redirects to another origin and redacts network failures", async () => {
    const redirect = await checkStagingHttp({
      url: "https://staging.example.com/",
      fetchImpl: async () => response(307, { location: "https://other.example.com/auth" }),
    });
    expect(redirect.codes).toEqual(["STAGING_HTTP_AUTH_REDIRECT_INVALID"]);
    expect(redirect.authStatus).toBeNull();

    const failed = await checkStagingHttp({
      url: "https://staging.example.com/",
      fetchImpl: async () => { throw new Error("network secret must not escape"); },
    });
    expect(failed.codes).toEqual(["STAGING_HTTP_REQUEST_FAILED"]);
    expect(JSON.stringify(failed)).not.toContain("network secret");
  });
});
