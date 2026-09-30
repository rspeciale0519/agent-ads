import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const UUID = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  contextOrResponse: vi.fn(),
  correlationId: vi.fn(() => "corr-1"),
  errorResponse: vi.fn((error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 500 })),
  noStoreResponse: vi.fn((response: Response) => response),
  getAssuranceStatus: vi.fn(),
  requireAal2: vi.fn(),
  completeOAuth: vi.fn(),
  resolveGoogleCallbackProvider: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: UUID }) }) }));
vi.mock("../../../../../../lib/api/http", () => ({ contextOrResponse: mocks.contextOrResponse, correlationId: mocks.correlationId, errorResponse: mocks.errorResponse, noStoreResponse: mocks.noStoreResponse }));
vi.mock("../../../../../../lib/auth/assurance", () => ({ getAssuranceStatus: mocks.getAssuranceStatus, requireAal2: mocks.requireAal2 }));
vi.mock("../../../../../../lib/connections/service", () => ({ completeOAuth: mocks.completeOAuth, resolveGoogleCallbackProvider: mocks.resolveGoogleCallbackProvider }));

import { GET } from "./route";

const call = (id: string) => GET(new Request(`https://app.example.test/api/v1/connections/${id}/callback?code=abc&state=xyz`), { params: Promise.resolve({ id }) });

describe("OAuth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contextOrResponse.mockResolvedValue({ organizationId: "org-1" });
    mocks.completeOAuth.mockResolvedValue({ returnPath: "/connections", connectionId: "c-1", state: "discovering" });
  });

  it("resolves the shared google alias to the provider stored with the OAuth state", async () => {
    mocks.resolveGoogleCallbackProvider.mockResolvedValue("google_ads");
    const response = await call("google");
    expect(response.status).toBe(307);
    expect(mocks.resolveGoogleCallbackProvider).toHaveBeenCalledWith(expect.anything(), "xyz");
    expect(mocks.completeOAuth).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ provider: "google_ads", code: "abc", state: "xyz" }));
  });

  it("uses a concrete provider segment directly without a state lookup", async () => {
    await call("meta");
    expect(mocks.resolveGoogleCallbackProvider).not.toHaveBeenCalled();
    expect(mocks.completeOAuth).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ provider: "meta" }));
  });

  it("does not complete the flow when the alias state is unknown", async () => {
    mocks.resolveGoogleCallbackProvider.mockRejectedValue(new Error("OAUTH_STATE_INVALID"));
    const response = await call("google");
    expect(response.status).toBe(500);
    expect(mocks.completeOAuth).not.toHaveBeenCalled();
  });
});
