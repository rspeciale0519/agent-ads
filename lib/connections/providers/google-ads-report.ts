import { z } from "zod";

/**
 * This contract accepts only the small result set needed by the pilot.
 * It never stores or returns the original Google Ads response.
 */
export const GOOGLE_ADS_REPORT_CONTRACT_VERSION = "google-ads-report-1.0.0";
export const GOOGLE_ADS_REPORT_MAX_ROWS = 500;

const customerIdSchema = z.string().trim().regex(/^\d{1,20}$/, "Use a Google Ads customer ID.");
const campaignIdSchema = z.string().trim().regex(/^\d{1,20}$/, "Use a Google Ads campaign ID.");
const currencyCodeSchema = z.string().trim().regex(/^[A-Z]{3}$/, "Use an ISO currency code.");
const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date.").refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid calendar date.");

const numericValueSchema = z.union([
  z.number().finite().nonnegative(),
  z.string().trim().regex(/^\d+(?:\.\d+)?$/, "Use a non-negative decimal number."),
]);

const rawWindowSchema = z.object({
  start: dateSchema,
  end: dateSchema,
}).superRefine((window, context) => {
  if (window.end < window.start) context.addIssue({ code: "custom", path: ["end"], message: "The reporting window must end after it starts." });
});

const rawCustomerSchema = z.object({
  id: customerIdSchema.optional(),
  resourceName: z.string().trim().regex(/^customers\/\d{1,20}$/, "Use a Google Ads customer resource name.").optional(),
  currencyCode: currencyCodeSchema.optional(),
}).passthrough();

const rawCampaignSchema = z.object({
  id: campaignIdSchema,
  resourceName: z.string().trim().regex(/^customers\/\d{1,20}\/campaigns\/\d{1,20}$/, "Use a Google Ads campaign resource name.").optional(),
  name: z.string().trim().min(1).max(160).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  advertisingChannelType: z.string().trim().min(1).max(80).optional(),
}).passthrough();

const rawMetricsSchema = z.object({
  // These four fields are the minimum report contract. Optional platform fields are ignored.
  impressions: numericValueSchema,
  clicks: numericValueSchema,
  costMicros: numericValueSchema,
  conversions: numericValueSchema,
  ctr: numericValueSchema.optional(),
  averageCpcMicros: numericValueSchema.optional(),
}).passthrough();

const rawRowSchema = z.object({
  customer: rawCustomerSchema.optional(),
  campaign: rawCampaignSchema,
  metrics: rawMetricsSchema,
  segments: z.object({ date: dateSchema.optional() }).passthrough().optional(),
}).passthrough();

/** The supported, bounded subset of a Google Ads Search/SearchStream response. */
export const googleAdsReportResponseSchema = z.object({
  customerId: customerIdSchema.optional(),
  currencyCode: currencyCodeSchema.optional(),
  reportingWindow: rawWindowSchema.optional(),
  results: z.array(rawRowSchema).max(GOOGLE_ADS_REPORT_MAX_ROWS),
}).passthrough();

const normalizedMetricSchema = z.object({
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  costMicros: z.number().int().nonnegative(),
  conversions: z.number().finite().nonnegative(),
  ctr: z.number().finite().min(0).max(1),
  averageCpcMicros: z.number().int().nonnegative(),
});

export const googleAdsReportRowSchema = z.object({
  customerId: customerIdSchema,
  campaignId: campaignIdSchema,
  campaignResourceName: z.string().regex(/^customers\/\d{1,20}\/campaigns\/\d{1,20}$/),
  campaignName: z.string().min(1).max(160).nullable(),
  campaignStatus: z.string().min(1).max(40),
  advertisingChannelType: z.string().min(1).max(80).nullable(),
  date: dateSchema.nullable(),
  metrics: normalizedMetricSchema,
});

const normalizedWindowSchema = z.object({ start: dateSchema, end: dateSchema });
const normalizedTotalsSchema = normalizedMetricSchema;

export const googleAdsReportSchema = z.object({
  contractVersion: z.literal(GOOGLE_ADS_REPORT_CONTRACT_VERSION),
  customerId: customerIdSchema,
  currencyCode: currencyCodeSchema.nullable(),
  reportingWindow: normalizedWindowSchema.nullable(),
  rows: z.array(googleAdsReportRowSchema).max(GOOGLE_ADS_REPORT_MAX_ROWS),
  totals: normalizedTotalsSchema,
});

export type GoogleAdsReportResponse = z.infer<typeof googleAdsReportResponseSchema>;
export type GoogleAdsReportRow = z.infer<typeof googleAdsReportRowSchema>;
export type GoogleAdsReport = z.infer<typeof googleAdsReportSchema>;

export class GoogleAdsReportError extends Error {
  readonly code = "GOOGLE_ADS_REPORT_INVALID";

  constructor() {
    super("GOOGLE_ADS_REPORT_INVALID");
    this.name = "GoogleAdsReportError";
  }
}

function numericValue(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) && !Number.isFinite(parsed)) throw new GoogleAdsReportError();
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > Number.MAX_SAFE_INTEGER) throw new GoogleAdsReportError();
  return parsed;
}

function integerMetric(value: number | string): number {
  const parsed = numericValue(value);
  if (!Number.isSafeInteger(parsed)) throw new GoogleAdsReportError();
  return parsed;
}

function customerIdFromResourceName(resourceName: string | undefined): string | undefined {
  return resourceName?.match(/^customers\/(\d{1,20})$/)?.[1];
}

function customerIdFromCampaignResourceName(resourceName: string | undefined): string | undefined {
  return resourceName?.match(/^customers\/(\d{1,20})\/campaigns\/\d{1,20}$/)?.[1];
}

function resolveCustomerId(response: GoogleAdsReportResponse, row: z.infer<typeof rawRowSchema>): string | undefined {
  const candidates = [
    response.customerId,
    row.customer?.id,
    customerIdFromResourceName(row.customer?.resourceName),
    customerIdFromCampaignResourceName(row.campaign.resourceName),
  ].filter((value): value is string => value !== undefined);
  if (candidates.some((value) => value !== candidates[0])) throw new GoogleAdsReportError();
  return candidates[0];
}

function resolveCurrencyCode(response: GoogleAdsReportResponse, row: z.infer<typeof rawRowSchema>): string | undefined {
  const candidates = [response.currencyCode, row.customer?.currencyCode].filter((value): value is string => value !== undefined);
  if (candidates.some((value) => value !== candidates[0])) throw new GoogleAdsReportError();
  return candidates[0];
}

function resolveReportingWindow(response: GoogleAdsReportResponse, rows: readonly GoogleAdsReportRow[]) {
  if (response.reportingWindow) return response.reportingWindow;
  const dates = rows.map((row) => row.date).filter((date): date is string => date !== null).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  return start && end ? { start, end } : null;
}

/**
 * Parse and normalize a bounded Google Ads report without mutating the input.
 * Only campaign identifiers, labels, dates, and read-only metrics leave this function.
 */
export function parseGoogleAdsReport(value: unknown): GoogleAdsReport {
  const parsed = googleAdsReportResponseSchema.safeParse(value);
  if (!parsed.success) throw new GoogleAdsReportError();

  try {
    const response = parsed.data;
    const rows: GoogleAdsReportRow[] = response.results.map((rawRow) => {
      const customerId = resolveCustomerId(response, rawRow);
      if (!customerId) throw new GoogleAdsReportError();
      const campaignId = rawRow.campaign.id;
      const campaignResourceName = rawRow.campaign.resourceName ?? `customers/${customerId}/campaigns/${campaignId}`;
      const resourceCustomerId = customerIdFromCampaignResourceName(campaignResourceName);
      const resourceCampaignId = campaignResourceName.match(/\/campaigns\/(\d{1,20})$/)?.[1];
      if (resourceCustomerId !== customerId || resourceCampaignId !== campaignId) throw new GoogleAdsReportError();

      const impressions = integerMetric(rawRow.metrics.impressions);
      const clicks = integerMetric(rawRow.metrics.clicks);
      const costMicros = integerMetric(rawRow.metrics.costMicros);
      const conversions = numericValue(rawRow.metrics.conversions);
      const suppliedCtr = rawRow.metrics.ctr === undefined ? undefined : numericValue(rawRow.metrics.ctr);
      const suppliedAverageCpc = rawRow.metrics.averageCpcMicros === undefined ? undefined : integerMetric(rawRow.metrics.averageCpcMicros);
      const ctr = suppliedCtr ?? (impressions === 0 ? 0 : clicks / impressions);
      const averageCpcMicros = suppliedAverageCpc ?? (clicks === 0 ? 0 : Math.round(costMicros / clicks));
      const normalized = googleAdsReportRowSchema.safeParse({
        customerId,
        campaignId,
        campaignResourceName,
        campaignName: rawRow.campaign.name ?? null,
        campaignStatus: rawRow.campaign.status ?? "UNKNOWN",
        advertisingChannelType: rawRow.campaign.advertisingChannelType ?? null,
        date: rawRow.segments?.date ?? null,
        metrics: { impressions, clicks, costMicros, conversions, ctr, averageCpcMicros },
      });
      if (!normalized.success) throw new GoogleAdsReportError();
      return normalized.data;
    });

    const totals = rows.reduce((aggregate, row) => ({
      impressions: aggregate.impressions + row.metrics.impressions,
      clicks: aggregate.clicks + row.metrics.clicks,
      costMicros: aggregate.costMicros + row.metrics.costMicros,
      conversions: aggregate.conversions + row.metrics.conversions,
      ctr: 0,
      averageCpcMicros: 0,
    }), { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, ctr: 0, averageCpcMicros: 0 });
    if (!Number.isSafeInteger(totals.impressions) || !Number.isSafeInteger(totals.clicks) || !Number.isSafeInteger(totals.costMicros) || !Number.isFinite(totals.conversions)) throw new GoogleAdsReportError();
    totals.ctr = totals.impressions === 0 ? 0 : totals.clicks / totals.impressions;
    totals.averageCpcMicros = totals.clicks === 0 ? 0 : Math.round(totals.costMicros / totals.clicks);

    const firstRow = response.results[0];
    const customerId = firstRow ? resolveCustomerId(response, firstRow) : response.customerId;
    if (!customerId) throw new GoogleAdsReportError();
    const currencies = response.results.map((row) => resolveCurrencyCode(response, row)).filter((currency): currency is string => currency !== undefined);
    if (currencies.some((currency) => currency !== currencies[0])) throw new GoogleAdsReportError();
    const currencyCode = currencies[0] ?? response.currencyCode ?? null;
    const report = { contractVersion: GOOGLE_ADS_REPORT_CONTRACT_VERSION, customerId, currencyCode, reportingWindow: resolveReportingWindow(response, rows), rows, totals };
    const normalized = googleAdsReportSchema.safeParse(report);
    if (!normalized.success) throw new GoogleAdsReportError();
    return normalized.data;
  } catch (error) {
    if (error instanceof GoogleAdsReportError) throw error;
    throw new GoogleAdsReportError();
  }
}

export const normalizeGoogleAdsReport = parseGoogleAdsReport;
