import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson, safeProviderUrl } from "./http";

const hosts = ["api.example.test"] as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider HTTP boundary", () => {
  it("accepts allowlisted HTTPS JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await expect(requestJson("https://api.example.test/v1", {}, "PROVIDER", hosts)).resolves.toEqual({ ok: true });
  });

  it("blocks non-HTTPS and unlisted hosts", () => {
    expect(() => safeProviderUrl("http://api.example.test/v1", hosts)).toThrow("PROVIDER_REDIRECT_BLOCKED");
    expect(() => safeProviderUrl("https://attacker.example/v1", hosts)).toThrow("PROVIDER_REDIRECT_BLOCKED");
  });

  it("rejects oversized provider responses before parsing", async () => {
    const oversized = JSON.stringify({ value: "x".repeat(1024 * 1024) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(oversized, { status: 200 })));
    await expect(requestJson("https://api.example.test/v1", {}, "PROVIDER", hosts)).rejects.toThrow("PROVIDER_RESPONSE_TOO_LARGE");
  });

  it("normalizes invalid JSON without returning the provider body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive upstream body", { status: 200 })));
    await expect(requestJson("https://api.example.test/v1", {}, "PROVIDER", hosts)).rejects.toThrow("PROVIDER_INVALID_RESPONSE");
  });

  it("maps an approved provider error code without exposing its response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant", detail: "sensitive detail" }), { status: 400 })));
    await expect(requestJson("https://api.example.test/v1", {}, "PROVIDER", hosts, {
      mapErrorCode: (payload) => typeof payload === "object" && payload !== null && "error" in payload && payload.error === "invalid_grant" ? "PROVIDER_INVALID_GRANT" : undefined,
    })).rejects.toThrow("PROVIDER_INVALID_GRANT");
  });
});
