import { parseReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot, type ReadOnlyMetric } from "./evidence-contract";
import type { DubsadoOutcomeStage, MappedDubsadoOutcomeRecord } from "../connections/providers/dubsado-export";

const stageMetricMap: Partial<Record<DubsadoOutcomeStage, string>> = {
  inquiry: "inquiries",
  qualified_opportunity: "qualified_leads",
  completed_qualified_meeting: "completed_qualified_meetings",
  proposal_issued: "proposals_issued",
  signed_engagement: "signed_engagements",
  booked_revenue: "booked_revenue",
  cancelled: "cancelled_engagements",
  refunded: "refunded_engagements",
};

type Input = {
  snapshotId: string;
  organizationId: string;
  evidenceId: string;
  reportingWindow: { start: string; end: string };
  capturedAt: string;
  collectorVersion: string;
  primaryOutcomeKey: "qualified_leads" | "booked_calls" | "closed_won_deals" | "booked_revenue";
  records: MappedDubsadoOutcomeRecord[];
};

function countStage(records: MappedDubsadoOutcomeRecord[], stage: DubsadoOutcomeStage) {
  return records.filter((record) => record.outcomeStage === stage).length;
}

function countMetric(records: MappedDubsadoOutcomeRecord[], metricKey: string) {
  const stages = Object.entries(stageMetricMap).filter(([, key]) => key === metricKey).map(([stage]) => stage as DubsadoOutcomeStage);
  return stages.reduce((total, stage) => total + countStage(records, stage), 0);
}

function buildRevenueMetric(records: MappedDubsadoOutcomeRecord[], evidenceId: string, reportingWindow: Input["reportingWindow"], limitations: string[]): ReadOnlyMetric | null {
  const revenueRecords = records.filter((record) => record.outcomeStage === "booked_revenue" && record.bookedRevenue !== null);
  if (revenueRecords.length === 0) return null;
  const currencies = new Set(revenueRecords.map((record) => record.currency));
  if (currencies.size !== 1 || currencies.has(null)) throw new Error("DUBSADO_EVIDENCE_REVENUE_CURRENCY_CONFLICT");
  const currency = [...currencies][0];
  if (!currency) throw new Error("DUBSADO_EVIDENCE_REVENUE_CURRENCY_MISSING");
  const value = revenueRecords.reduce((total, record) => total + (record.bookedRevenue ?? 0), 0);
  if (value < 0) throw new Error("DUBSADO_EVIDENCE_REVENUE_NEGATIVE");
  return { key: "booked_revenue", value, unit: "currency", currency, reportingWindow, attribution: "direct_first_party", evidenceIds: [evidenceId], limitations };
}

export function buildDubsadoEvidenceSnapshot(input: Input): ReadOnlyEvidenceSnapshot {
  const limitations = [
    "This snapshot uses an approved export and explicit status mapping.",
    "It does not prove advertising attribution, causality, or future revenue.",
  ];
  const evidence = [{ id: input.evidenceId, sourceClass: "business_outcome_observation" as const, provider: "dubsado", method: "authorized_export" as const, collectedAt: input.capturedAt, collectorVersion: input.collectorVersion, limitations }];
  const metrics: ReadOnlyMetric[] = [];
  const counts: Array<[string, number]> = [["inquiries", countMetric(input.records, "inquiries")], ["qualified_leads", countMetric(input.records, "qualified_leads")], ["booked_calls", countMetric(input.records, "booked_calls")], ["completed_qualified_meetings", countMetric(input.records, "completed_qualified_meetings")], ["proposals_issued", countMetric(input.records, "proposals_issued")], ["signed_engagements", countMetric(input.records, "signed_engagements")], ["closed_won_deals", countMetric(input.records, "closed_won_deals")], ["cancelled_engagements", countMetric(input.records, "cancelled_engagements")], ["refunded_engagements", countMetric(input.records, "refunded_engagements")]];
  for (const [key, value] of counts) {
    if (value > 0) metrics.push({ key, value, unit: "count", reportingWindow: input.reportingWindow, attribution: "direct_first_party", evidenceIds: [input.evidenceId], limitations });
  }
  const revenue = buildRevenueMetric(input.records, input.evidenceId, input.reportingWindow, limitations);
  if (revenue) metrics.push(revenue);
  if (!metrics.some((metric) => metric.key === input.primaryOutcomeKey)) throw new Error("DUBSADO_EVIDENCE_PRIMARY_METRIC_MISSING");
  return parseReadOnlyEvidenceSnapshot({
    snapshotId: input.snapshotId,
    organizationId: input.organizationId,
    primaryOutcomeKey: input.primaryOutcomeKey,
    reportingWindow: input.reportingWindow,
    capturedAt: input.capturedAt,
    collectorVersion: input.collectorVersion,
    status: "partial",
    freshness: { state: "fresh", checkedAt: input.capturedAt, maxAgeHours: 48 },
    reconciliation: { state: "warning", limitation: "Cross-system advertising reconciliation is not complete." },
    evidence,
    metrics,
    limitations,
  });
}
