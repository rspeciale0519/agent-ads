import { z } from "zod";

const isoDate = z.string().trim().refine((value) => Number.isFinite(Date.parse(value)), "Use an ISO date.");
const identifier = z.string().trim().min(1).max(160);

export const evidenceSourceClassSchema = z.enum([
  "official_platform_observation",
  "first_party_observation",
  "controlled_ai_sample",
  "deterministic_classification",
  "human_factual_review",
  "agent_interpretation",
  "business_outcome_observation",
]);

export const evidenceCollectionMethodSchema = z.enum([
  "official_api",
  "official_report",
  "authorized_export",
  "approved_collection_method",
]);

export const reportingWindowSchema = z.object({
  start: isoDate,
  end: isoDate,
}).superRefine((window, context) => {
  if (Date.parse(window.end) <= Date.parse(window.start)) context.addIssue({ code: "custom", path: ["end"], message: "The reporting window must end after it starts." });
});

export const evidenceReferenceSchema = z.object({
  id: identifier,
  sourceClass: evidenceSourceClassSchema,
  provider: identifier,
  method: evidenceCollectionMethodSchema,
  collectedAt: isoDate,
  collectorVersion: identifier,
  limitations: z.array(z.string().trim().min(1).max(240)).max(10),
});

export const readOnlyMetricSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_.-]{1,63}$/, "Use a stable metric key."),
  value: z.number().finite().nonnegative(),
  unit: z.enum(["count", "currency", "rate"]),
  currency: z.string().trim().regex(/^[A-Z]{3}$/, "Use an ISO currency code.").optional(),
  numerator: z.number().int().nonnegative().optional(),
  denominator: z.number().int().positive().optional(),
  reportingWindow: reportingWindowSchema,
  attribution: z.enum(["direct_first_party", "platform_reported", "modeled", "unknown"]),
  evidenceIds: z.array(identifier).min(1).max(20),
  limitations: z.array(z.string().trim().min(1).max(240)).max(10),
}).superRefine((metric, context) => {
  if (metric.unit === "currency" && !metric.currency) context.addIssue({ code: "custom", path: ["currency"], message: "Currency metrics require a currency code." });
  if (metric.unit === "rate" && (metric.numerator === undefined || metric.denominator === undefined)) context.addIssue({ code: "custom", path: ["denominator"], message: "Rate metrics require a numerator and denominator." });
  if (metric.unit !== "rate" && (metric.numerator !== undefined || metric.denominator !== undefined)) context.addIssue({ code: "custom", path: ["numerator"], message: "Only rate metrics may use a numerator and denominator." });
  if (metric.unit === "rate" && metric.numerator !== undefined && metric.denominator !== undefined && metric.numerator > metric.denominator) context.addIssue({ code: "custom", path: ["numerator"], message: "A rate numerator cannot exceed its denominator." });
});

export const readOnlyEvidenceSnapshotSchema = z.object({
  snapshotId: identifier,
  organizationId: identifier,
  primaryOutcomeKey: z.enum(["qualified_leads", "booked_calls", "closed_won_deals", "booked_revenue"]),
  reportingWindow: reportingWindowSchema,
  capturedAt: isoDate,
  collectorVersion: identifier,
  status: z.enum(["complete", "partial", "blocked"]),
  freshness: z.object({
    state: z.enum(["fresh", "stale", "unknown"]),
    checkedAt: isoDate,
    maxAgeHours: z.number().int().positive().max(24 * 365),
  }),
  reconciliation: z.object({
    state: z.enum(["passed", "warning", "blocked", "not_run"]),
    limitation: z.string().trim().min(1).max(500),
  }),
  evidence: z.array(evidenceReferenceSchema).min(1).max(100),
  metrics: z.array(readOnlyMetricSchema).min(1).max(100),
  limitations: z.array(z.string().trim().min(1).max(240)).max(20),
}).superRefine((snapshot, context) => {
  const evidenceIds = new Set(snapshot.evidence.map((evidence) => evidence.id));
  const metricKeys = new Set<string>();
  for (const metric of snapshot.metrics) {
    if (metricKeys.has(metric.key)) context.addIssue({ code: "custom", path: ["metrics"], message: `Metric ${metric.key} is duplicated.` });
    metricKeys.add(metric.key);
    for (const evidenceId of metric.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) context.addIssue({ code: "custom", path: ["metrics"], message: `Metric ${metric.key} references missing evidence.` });
    }
  }
  if (!metricKeys.has(snapshot.primaryOutcomeKey)) context.addIssue({ code: "custom", path: ["primaryOutcomeKey"], message: "The primary outcome must have a metric." });
  if (Date.parse(snapshot.capturedAt) < Date.parse(snapshot.reportingWindow.end)) context.addIssue({ code: "custom", path: ["capturedAt"], message: "The snapshot cannot be captured before its reporting window ends." });
});

export type ReadOnlyEvidenceSnapshot = z.infer<typeof readOnlyEvidenceSnapshotSchema>;
export type ReadOnlyMetric = z.infer<typeof readOnlyMetricSchema>;

export function parseReadOnlyEvidenceSnapshot(value: unknown): ReadOnlyEvidenceSnapshot {
  return readOnlyEvidenceSnapshotSchema.parse(value);
}

export function combineReadOnlyEvidenceSnapshots(input: {
  snapshotId: string;
  organizationId: string;
  primaryOutcomeKey: ReadOnlyEvidenceSnapshot["primaryOutcomeKey"];
  reportingWindow: ReadOnlyEvidenceSnapshot["reportingWindow"];
  capturedAt: string;
  collectorVersion: string;
  snapshots: ReadOnlyEvidenceSnapshot[];
}): ReadOnlyEvidenceSnapshot {
  if (input.snapshots.length === 0) throw new Error("EVIDENCE_SNAPSHOT_SOURCE_REQUIRED");
  const evidenceIds = new Set<string>();
  const metricKeys = new Set<string>();
  const evidence = [] as ReadOnlyEvidenceSnapshot["evidence"];
  const metrics = [] as ReadOnlyEvidenceSnapshot["metrics"];
  const limitations = new Set<string>();
  let allFresh = true;
  let hasStale = false;
  for (const snapshot of input.snapshots) {
    if (snapshot.organizationId !== input.organizationId) throw new Error("EVIDENCE_SNAPSHOT_ORGANIZATION_MISMATCH");
    if (Date.parse(snapshot.reportingWindow.start) !== Date.parse(input.reportingWindow.start) || Date.parse(snapshot.reportingWindow.end) !== Date.parse(input.reportingWindow.end)) {
      throw new Error("EVIDENCE_SNAPSHOT_WINDOW_MISMATCH");
    }
    for (const reference of snapshot.evidence) {
      if (evidenceIds.has(reference.id)) throw new Error("EVIDENCE_SNAPSHOT_EVIDENCE_DUPLICATE");
      evidenceIds.add(reference.id);
      evidence.push(reference);
    }
    for (const metric of snapshot.metrics) {
      if (metricKeys.has(metric.key)) throw new Error(`EVIDENCE_SNAPSHOT_METRIC_DUPLICATE_${metric.key}`);
      metricKeys.add(metric.key);
      metrics.push(metric);
    }
    allFresh = allFresh && snapshot.freshness.state === "fresh";
    hasStale = hasStale || snapshot.freshness.state === "stale";
    snapshot.limitations.forEach((limitation) => limitations.add(limitation));
  }
  limitations.add("Cross-source reconciliation and advertising attribution are not established.");
  return parseReadOnlyEvidenceSnapshot({
    snapshotId: input.snapshotId,
    organizationId: input.organizationId,
    primaryOutcomeKey: input.primaryOutcomeKey,
    reportingWindow: input.reportingWindow,
    capturedAt: input.capturedAt,
    collectorVersion: input.collectorVersion,
    status: "partial",
    freshness: { state: allFresh ? "fresh" : hasStale ? "stale" : "unknown", checkedAt: input.capturedAt, maxAgeHours: 48 },
    reconciliation: { state: "warning", limitation: "Cross-source reconciliation and advertising attribution are not established." },
    evidence,
    metrics,
    limitations: [...limitations].slice(0, 20),
  });
}

export function assessReadOnlyEvidenceSnapshot(snapshot: ReadOnlyEvidenceSnapshot, now = new Date()) {
  const blockers: string[] = [];
  const checkedAt = Date.parse(snapshot.freshness.checkedAt);
  if (snapshot.status !== "complete") blockers.push("The snapshot is incomplete.");
  if (snapshot.freshness.state !== "fresh" || now.getTime() > checkedAt + snapshot.freshness.maxAgeHours * 60 * 60 * 1000) blockers.push("The snapshot is stale or its freshness is unknown.");
  if (snapshot.reconciliation.state !== "passed") blockers.push(`Reconciliation is ${snapshot.reconciliation.state}.`);
  return { ready: blockers.length === 0, blockers };
}
