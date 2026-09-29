import { parseReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot, type ReadOnlyMetric } from "./evidence-contract";
import type { DubsadoOutcomeStage, MappedDubsadoOutcomeRecord } from "../connections/providers/dubsado-export";

const stageMetricMap: Partial<Record<DubsadoOutcomeStage, string>> = {
  inquiry: "inquiries",
  qualified_opportunity: "qualified_leads",
  booked_call: "booked_calls",
  completed_qualified_meeting: "completed_qualified_meetings",
  proposal_issued: "proposals_issued",
  signed_engagement: "signed_engagements",
  booked_revenue: "booked_revenue",
  cancelled: "cancelled_engagements",
  refunded: "refunded_engagements",
};

// Exports are uploaded by hand, often weekly, so they stay usable for a week
// before AI Reach asks for a new one.
export const DUBSADO_EXPORT_MAX_AGE_HOURS = 7 * 24;

// True while the newest authorized Dubsado export in the snapshot is inside
// today's export window. It uses the export's own collection time, so older
// saved snapshots follow the current policy and a combined snapshot's shorter
// window does not make the Dubsado part look out of date.
export function isDubsadoExportFresh(snapshot: ReadOnlyEvidenceSnapshot, now = new Date()) {
  const collectedTimes = snapshot.evidence
    .filter((evidence) => evidence.provider === "dubsado" && evidence.sourceClass === "business_outcome_observation" && evidence.method === "authorized_export")
    .map((evidence) => Date.parse(evidence.collectedAt))
    .filter((time) => Number.isFinite(time) && time <= now.getTime());
  if (collectedTimes.length === 0) return false;
  return now.getTime() - Math.max(...collectedTimes) <= DUBSADO_EXPORT_MAX_AGE_HOURS * 60 * 60 * 1000;
}

type Input = {
  snapshotId: string;
  organizationId: string;
  evidenceId: string;
  reportingWindow: { start: string; end: string };
  capturedAt: string;
  collectorVersion: string;
  primaryOutcomeKey: "qualified_leads" | "booked_calls" | "closed_won_deals" | "booked_revenue";
  records: MappedDubsadoOutcomeRecord[];
  // Stages named in the approved status map. Their count metrics are saved
  // even at zero; other stages are saved only when they have records.
  configuredStages?: readonly string[];
};

function countStage(records: MappedDubsadoOutcomeRecord[], stage: DubsadoOutcomeStage) {
  return records.filter((record) => record.outcomeStage === stage).length;
}

// A closed-won deal is a record at the configured closed-won stage, which is
// the stage that records booked revenue (see docs/development/capabilities/ai-reach.md).
const closedWonStages: DubsadoOutcomeStage[] = ["booked_revenue"];

function countMetric(records: MappedDubsadoOutcomeRecord[], metricKey: string) {
  if (metricKey === "closed_won_deals") return closedWonStages.reduce((total, stage) => total + countStage(records, stage), 0);
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
  const configured = new Set(input.configuredStages ?? []);
  // A metric is configured when any stage feeding it is in the approved map.
  const isConfigured = (key: string) => key === "closed_won_deals"
    ? closedWonStages.some((stage) => configured.has(stage))
    : Object.entries(stageMetricMap).some(([stage, metricKey]) => metricKey === key && configured.has(stage));
  for (const [key, value] of counts) {
    if (value > 0 || isConfigured(key)) metrics.push({ key, value, unit: "count", reportingWindow: input.reportingWindow, attribution: "direct_first_party", evidenceIds: [input.evidenceId], limitations });
  }
  const revenue = buildRevenueMetric(input.records, input.evidenceId, input.reportingWindow, limitations);
  if (revenue) metrics.push(revenue);
  // The main outcome still needs at least one record: a count saved as zero is
  // not enough. Revenue is saved only when booked records exist, even at $0.
  if (!metrics.some((metric) => metric.key === input.primaryOutcomeKey && (metric.unit === "currency" || metric.value > 0))) throw new Error("DUBSADO_EVIDENCE_PRIMARY_METRIC_MISSING");
  return parseReadOnlyEvidenceSnapshot({
    snapshotId: input.snapshotId,
    organizationId: input.organizationId,
    primaryOutcomeKey: input.primaryOutcomeKey,
    reportingWindow: input.reportingWindow,
    capturedAt: input.capturedAt,
    collectorVersion: input.collectorVersion,
    status: "partial",
    freshness: { state: "fresh", checkedAt: input.capturedAt, maxAgeHours: DUBSADO_EXPORT_MAX_AGE_HOURS },
    reconciliation: { state: "warning", limitation: "Cross-system advertising reconciliation is not complete." },
    evidence,
    metrics,
    limitations,
  });
}
