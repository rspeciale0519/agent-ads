import type { GoogleAdsReport } from "../connections/providers/google-ads-report";
import { evidenceReferenceSchema, readOnlyMetricSchema, type ReadOnlyMetric } from "./evidence-contract";

export type GoogleAdsEvidenceBundle = {
  evidence: ReturnType<typeof evidenceReferenceSchema.parse>;
  metrics: ReadOnlyMetric[];
  limitations: string[];
};

const baseLimitations = [
  "Google Ads conversions are platform-reported and do not prove qualified leads or revenue.",
  "This report does not prove that an advertising or website change caused an outcome.",
];

export function buildGoogleAdsEvidenceBundle(input: {
  report: GoogleAdsReport;
  evidenceId: string;
  collectedAt: string;
  collectorVersion: string;
}): GoogleAdsEvidenceBundle {
  const reportWindow = input.report.reportingWindow;
  if (!reportWindow) throw new Error("GOOGLE_ADS_EVIDENCE_WINDOW_REQUIRED");
  const evidence = evidenceReferenceSchema.parse({
    id: input.evidenceId,
    sourceClass: "official_platform_observation",
    provider: "google_ads",
    method: "official_api",
    collectedAt: input.collectedAt,
    collectorVersion: input.collectorVersion,
    limitations: baseLimitations,
  });
  const evidenceIds = [evidence.id];
  const metricLimitations = [...baseLimitations, "CRM stages, bookings, and closed-won values are not included in this platform report."];
  const metrics: ReadOnlyMetric[] = [
    readOnlyMetricSchema.parse({ key: "google_ads.spend", value: input.report.totals.costMicros / 1_000_000, unit: "currency", currency: input.report.currencyCode ?? undefined, reportingWindow: reportWindow, attribution: "platform_reported", evidenceIds, limitations: metricLimitations }),
    readOnlyMetricSchema.parse({ key: "google_ads.impressions", value: input.report.totals.impressions, unit: "count", reportingWindow: reportWindow, attribution: "platform_reported", evidenceIds, limitations: metricLimitations }),
    readOnlyMetricSchema.parse({ key: "google_ads.clicks", value: input.report.totals.clicks, unit: "count", reportingWindow: reportWindow, attribution: "platform_reported", evidenceIds, limitations: metricLimitations }),
    readOnlyMetricSchema.parse({ key: "google_ads.conversions", value: input.report.totals.conversions, unit: "count", reportingWindow: reportWindow, attribution: "platform_reported", evidenceIds, limitations: metricLimitations }),
  ];
  if (input.report.totals.impressions > 0 && input.report.totals.clicks <= input.report.totals.impressions) {
    metrics.push(readOnlyMetricSchema.parse({ key: "google_ads.click_rate", value: input.report.totals.ctr, unit: "rate", numerator: input.report.totals.clicks, denominator: input.report.totals.impressions, reportingWindow: reportWindow, attribution: "platform_reported", evidenceIds, limitations: metricLimitations }));
  }
  return { evidence, metrics, limitations: metricLimitations };
}
