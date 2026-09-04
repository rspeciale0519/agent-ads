import { describe, expect, it } from "vitest";
import { formatGoogleAdsMoney, formatGoogleAdsPercent, parseGoogleAdsReportPayload, visibleGoogleAdsReportRows } from "./google-ads-report-view";

const report = {
  contractVersion: "google-ads-report-1.0.0" as const,
  customerId: "1234567890",
  currencyCode: "USD",
  reportingWindow: { start: "2026-08-01", end: "2026-08-31" },
  rows: [
    { customerId: "1234567890", campaignId: "2", campaignResourceName: "customers/1234567890/campaigns/2", campaignName: "Older", campaignStatus: "ENABLED", advertisingChannelType: "SEARCH", date: "2026-08-02", metrics: { impressions: 2, clicks: 1, costMicros: 1000000, conversions: 1, ctr: .5, averageCpcMicros: 1000000 } },
    { customerId: "1234567890", campaignId: "1", campaignResourceName: "customers/1234567890/campaigns/1", campaignName: "Latest", campaignStatus: "ENABLED", advertisingChannelType: "SEARCH", date: "2026-08-31", metrics: { impressions: 10, clicks: 2, costMicros: 2000000, conversions: 0, ctr: .2, averageCpcMicros: 1000000 } },
  ],
  totals: { impressions: 12, clicks: 3, costMicros: 3000000, conversions: 1, ctr: .25, averageCpcMicros: 1000000 },
};

describe("Google Ads report view contract", () => {
  it("accepts only the bounded API envelope", () => {
    expect(parseGoogleAdsReportPayload({ report })).toEqual(report);
    expect(parseGoogleAdsReportPayload({ report: { ...report, rows: [{ unexpected: true }] } })).toBeNull();
    expect(parseGoogleAdsReportPayload(report)).toBeNull();
  });

  it("orders recent rows first and applies the view limit", () => {
    expect(visibleGoogleAdsReportRows(report, 1).map((row) => row.campaignName)).toEqual(["Latest"]);
  });

  it("formats platform metrics for plain-language display", () => {
    expect(formatGoogleAdsMoney(3000000, "USD")).toBe("$3.00");
    expect(formatGoogleAdsMoney(3000000, null)).toBe("Currency unavailable");
    expect(formatGoogleAdsPercent(.25)).toBe("25%");
  });
});
