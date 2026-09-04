import { describe, expect, it } from "vitest";
import { parseGoogleAdsReport } from "../connections/providers/google-ads-report";
import { buildGoogleAdsEvidenceBundle } from "./google-ads-evidence";

function report() {
  return parseGoogleAdsReport({
    customerId: "1234567890",
    currencyCode: "USD",
    reportingWindow: { start: "2026-08-01", end: "2026-08-31" },
    results: [{
      campaign: { id: "42", resourceName: "customers/1234567890/campaigns/42", name: "Leadership keynote", status: "ENABLED", advertisingChannelType: "SEARCH" },
      customer: { id: "1234567890", currencyCode: "USD" },
      metrics: { impressions: "1000", clicks: "100", costMicros: "125000000", conversions: "12" },
      segments: { date: "2026-08-12" },
    }],
  });
}

describe("Google Ads AI Reach evidence bundle", () => {
  it("keeps platform metrics separate from business outcomes", () => {
    const bundle = buildGoogleAdsEvidenceBundle({ report: report(), evidenceId: "google-ads-evidence-1", collectedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "google-ads-reader-1.0.0" });
    expect(bundle.evidence).toMatchObject({ sourceClass: "official_platform_observation", provider: "google_ads", method: "official_api" });
    expect(bundle.metrics.map((metric) => metric.key)).toEqual(["google_ads.spend", "google_ads.impressions", "google_ads.clicks", "google_ads.conversions", "google_ads.click_rate"]);
    expect(bundle.metrics.find((metric) => metric.key === "google_ads.spend")).toMatchObject({ value: 125, currency: "USD", attribution: "platform_reported" });
    expect(bundle.limitations.join(" ")).toContain("do not prove qualified leads");
  });

  it("does not create an invalid click-rate metric when clicks exceed impressions", () => {
    const source = report();
    source.totals.clicks = 1200;
    const bundle = buildGoogleAdsEvidenceBundle({ report: source, evidenceId: "google-ads-evidence-2", collectedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "google-ads-reader-1.0.0" });
    expect(bundle.metrics.some((metric) => metric.key === "google_ads.click_rate")).toBe(false);
  });
});
