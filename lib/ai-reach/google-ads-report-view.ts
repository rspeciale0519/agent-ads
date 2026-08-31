import { googleAdsReportSchema, type GoogleAdsReport, type GoogleAdsReportRow } from "../connections/providers/google-ads-report";

export const GOOGLE_ADS_REPORT_VIEW_ROW_LIMIT = 8;

/**
 * Parse the API envelope before rendering it in the browser.
 * The client only receives the bounded report contract, never a provider response.
 */
export function parseGoogleAdsReportPayload(value: unknown): GoogleAdsReport | null {
  if (!value || typeof value !== "object" || !("report" in value)) return null;
  const parsed = googleAdsReportSchema.safeParse(value.report);
  return parsed.success ? parsed.data : null;
}

export function visibleGoogleAdsReportRows(report: GoogleAdsReport, limit = GOOGLE_ADS_REPORT_VIEW_ROW_LIMIT): GoogleAdsReportRow[] {
  return [...report.rows]
    .sort((left, right) => {
      const dateOrder = (right.date ?? "").localeCompare(left.date ?? "");
      if (dateOrder !== 0) return dateOrder;
      return (left.campaignName ?? `Campaign ${left.campaignId}`).localeCompare(right.campaignName ?? `Campaign ${right.campaignId}`);
    })
    .slice(0, Math.max(0, limit));
}

export function formatGoogleAdsMoney(costMicros: number, currencyCode: string | null): string {
  if (!currencyCode) return "Currency unavailable";
  return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(costMicros / 1_000_000);
}

export function formatGoogleAdsNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}

export function formatGoogleAdsPercent(value: number): string {
  return new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 2 }).format(value);
}
