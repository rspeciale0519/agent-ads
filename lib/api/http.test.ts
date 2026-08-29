import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { CredentialReferenceIntegrityError } from "../connections/credential-reference-scope";
import { errorResponse, HttpError, noStoreJson, noStoreResponse, requireSameOrigin } from "./http";

describe("request security helpers", () => {
  it("rejects cross-origin state changes", () => {
    const request = new Request("https://app.example.test/api/action", { method: "POST", headers: { origin: "https://evil.example.test" } });
    expect(() => requireSameOrigin(request)).toThrowError(new HttpError("CSRF_ORIGIN_MISMATCH", 403));
  });

  it("rejects browser cross-site fetches even without an origin header", () => {
    const request = new Request("https://app.example.test/api/action", { method: "POST", headers: { "sec-fetch-site": "cross-site" } });
    expect(() => requireSameOrigin(request)).toThrowError(new HttpError("CSRF_ORIGIN_MISMATCH", 403));
  });

  it("rejects mutation requests without browser origin metadata", () => {
    const request = new Request("https://app.example.test/api/action", { method: "POST" });
    expect(() => requireSameOrigin(request)).toThrowError(new HttpError("CSRF_ORIGIN_MISMATCH", 403));
  });

  it("requires mutation identity headers after the origin check", () => {
    const missing = new Request("https://app.example.test/api/action", { method: "POST", headers: { origin: "https://app.example.test" } });
    expect(() => requireSameOrigin(missing)).toThrow("IDEMPOTENCY_KEY_REQUIRED");
    const valid = new Request("https://app.example.test/api/action", { method: "POST", headers: {
      origin: "https://app.example.test",
      "idempotency-key": "01J123456789ABCDEFGHJKMNPQ",
      "x-correlation-id": "browser.01J123456789ABCDEFGHJKMNPQ",
    } });
    expect(() => requireSameOrigin(valid)).not.toThrow();
  });

  it("marks response bodies as non-cacheable and non-referrable", async () => {
    const response = noStoreJson({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("applies the same protections to redirect responses", () => {
    const response = noStoreResponse(NextResponse.redirect("https://app.example.test/clean"));
    expect(response.status).toBe(307);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns a stable error for an invalid credential-reference owner", async () => {
    const response = errorResponse(new CredentialReferenceIntegrityError());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "SECRET_REFERENCE_INVALID" });
  });
});
