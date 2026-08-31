import { describe, expect, it } from "vitest";
import { GoogleAdsReportError, normalizeGoogleAdsReport, parseGoogleAdsReport } from "./google-ads-report";

function fixture() {
  return {
    customerId: "1234567890",
    currencyCode: "USD",
    reportingWindow: { start: "2026-08-01", end: "2026-08-31" },
    results: [{
      customer: { resourceName: "customers/1234567890", currencyCode: "USD" },
      campaign: { resourceName: "customers/1234567890/campaigns/42", id: "42", name: "Leadership keynote", status: "ENABLED", advertisingChannelType: "SEARCH", secret: "must-not-leave" },
      metrics: { impressions: "1000", clicks: "100", costMicros: "125000000", conversions: 12, ctr: "0.1", averageCpcMicros: "1250000", privateMetric: "ignored" },
      segments: { date: "2026-08-12", privateField: "ignored" },
      privateField: "ignored",
    }],
    privateResponseField: "ignored",
  };
}

describe("Google Ads read-only report contract", () => {
  it("normalizes a bounded SearchStream-style response", () => {
    const report = parseGoogleAdsReport(fixture());
    expect(report).toMatchObject({
      contractVersion: "google-ads-report-1.0.0",
      customerId: "1234567890",
      currencyCode: "USD",
      reportingWindow: { start: "2026-08-01", end: "2026-08-31" },
      totals: { impressions: 1000, clicks: 100, costMicros: 125000000, conversions: 12, ctr: 0.1, averageCpcMicros: 1250000 },
    });
    expect(report.rows[0]).toMatchObject({ campaignId: "42", campaignName: "Leadership keynote", date: "2026-08-12", metrics: { impressions: 1000, clicks: 100, costMicros: 125000000 } });
    expect(report).not.toHaveProperty("privateResponseField");
    expect(report.rows[0]).not.toHaveProperty("secret");
  });

  it("rejects malformed responses without exposing the upstream body", () => {
    expect(() => parseGoogleAdsReport({ results: "not-an-array" })).toThrowError(GoogleAdsReportError);
    expect(() => parseGoogleAdsReport({ results: "sensitive upstream body" })).toThrow("GOOGLE_ADS_REPORT_INVALID");
  });

  it("rejects a row that is missing a required metric", () => {
    const input = fixture();
    delete (input.results[0].metrics as { clicks?: unknown }).clicks;
    expect(() => parseGoogleAdsReport(input)).toThrow("GOOGLE_ADS_REPORT_INVALID");
  });

  it("does not mutate the provider response", () => {
    const input = fixture();
    const before = structuredClone(input);
    const normalized = normalizeGoogleAdsReport(input);
    expect(input).toEqual(before);
    expect(normalized.rows).not.toBe(input.results);
  });
});
