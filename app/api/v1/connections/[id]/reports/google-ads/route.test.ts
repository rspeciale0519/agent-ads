import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contextOrResponse: vi.fn(),
  errorResponse: vi.fn((error: unknown) => new Response(JSON.stringify({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }), { status: 500 })),
  noStoreJson: vi.fn((body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Cache-Control": "no-store" } })),
  uuidPathParam: vi.fn((value: string) => value),
  readGoogleAdsCampaignReport: vi.fn(),
}));

vi.mock("../../../../../../../lib/api/http", () => mocks);
vi.mock("../../../../../../../lib/connections/service", () => ({ readGoogleAdsCampaignReport: mocks.readGoogleAdsCampaignReport }));

import { GET } from "./route";

describe("Google Ads report route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contextOrResponse.mockResolvedValue({ organizationId: "org-1", permissions: ["connections.view"] });
    mocks.readGoogleAdsCampaignReport.mockResolvedValue({ contractVersion: "google-ads-report-1.0.0", customerId: "123", currencyCode: "USD", reportingWindow: { start: "2026-08-01", end: "2026-08-31" }, rows: [], totals: { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, ctr: 0, averageCpcMicros: 0 } });
  });

  it("returns a no-store normalized report for a valid read request", async () => {
    const response = await GET(new Request("https://app.example.test/api/v1/connections/connection-1/reports/google-ads?customerId=123&startDate=2026-08-01&endDate=2026-08-31"), { params: Promise.resolve({ id: "connection-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.readGoogleAdsCampaignReport).toHaveBeenCalledWith(expect.anything(), "connection-1", { customerId: "123", startDate: "2026-08-01", endDate: "2026-08-31" });
  });

  it("rejects incomplete query parameters without calling the report service", async () => {
    const response = await GET(new Request("https://app.example.test/api/v1/connections/connection-1/reports/google-ads?customerId=123&startDate=2026-08-01"), { params: Promise.resolve({ id: "connection-1" }) });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "VALIDATION_FAILED" });
    expect(mocks.readGoogleAdsCampaignReport).not.toHaveBeenCalled();
  });
});
