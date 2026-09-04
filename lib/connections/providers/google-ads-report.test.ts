import { describe, expect, it } from "vitest";
import { emptyGoogleAdsReport, GoogleAdsReportError, normalizeGoogleAdsReport, parseGoogleAdsReport } from "./google-ads-report";

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

function streamFixture() {
  const first = fixture();
  const second = structuredClone(first);
  second.results[0].campaign = {
    ...second.results[0].campaign,
    id: "43",
    resourceName: "customers/1234567890/campaigns/43",
    name: "Sales training",
  };
  second.results[0].segments = { ...second.results[0].segments, date: "2026-08-13" };
  return [first, { results: second.results }];
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

  it("accepts the official averageCpc field and preserves the derived metric contract", () => {
    const input = fixture();
    Object.assign(input.results[0].metrics, { averageCpc: "1250000" });
    const report = parseGoogleAdsReport(input);
    expect(report.rows[0]?.metrics.averageCpcMicros).toBe(1250000);
  });

  it("creates a bounded empty report for an authorized customer with no campaigns", () => {
    expect(emptyGoogleAdsReport({ customerId: "1234567890", startDate: "2026-08-01", endDate: "2026-08-31" })).toMatchObject({
      customerId: "1234567890",
      currencyCode: null,
      reportingWindow: { start: "2026-08-01", end: "2026-08-31" },
      rows: [],
    });
  });

  it("flattens the documented array of SearchStream response chunks", () => {
    const report = parseGoogleAdsReport(streamFixture());
    expect(report.rows).toHaveLength(2);
    expect(report.rows.map((row) => row.campaignId)).toEqual(["42", "43"]);
    expect(report.totals).toMatchObject({ impressions: 2000, clicks: 200, costMicros: 250000000, conversions: 24 });
    expect(report.customerId).toBe("1234567890");
    expect(report.currencyCode).toBe("USD");
  });

  it("rejects malformed responses without exposing the upstream body", () => {
    expect(() => parseGoogleAdsReport({ results: "not-an-array" })).toThrowError(GoogleAdsReportError);
    expect(() => parseGoogleAdsReport({ results: "sensitive upstream body" })).toThrow("GOOGLE_ADS_REPORT_INVALID");
    expect(() => parseGoogleAdsReport([fixture(), { results: "sensitive upstream body" }])).toThrow("GOOGLE_ADS_REPORT_INVALID");
  });

  it("rejects response streams that exceed the chunk or flattened-row bounds", () => {
    expect(() => parseGoogleAdsReport(Array.from({ length: 101 }, () => ({ results: [] })))).toThrow("GOOGLE_ADS_REPORT_INVALID");
    const oversizedRows = Array.from({ length: 501 }, () => fixture().results[0]);
    expect(() => parseGoogleAdsReport([{ results: oversizedRows }])).toThrow("GOOGLE_ADS_REPORT_INVALID");
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
