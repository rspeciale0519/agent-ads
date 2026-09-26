import { assessReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot, type ReadOnlyMetric } from "./evidence-contract";

export type OutcomeTile = { label: string; value: string; detail: string };

const outcomeLabels: Record<ReadOnlyEvidenceSnapshot["primaryOutcomeKey"], string> = {
  qualified_leads: "Qualified leads",
  booked_calls: "Booked calls",
  closed_won_deals: "Closed-won deals",
  booked_revenue: "Booked revenue",
};

// The three supporting tiles always shown next to the primary outcome.
const supportingTiles = [
  { key: "completed_qualified_meetings", label: "Qualified meetings", missing: "Approved meeting evidence is not available here" },
  { key: "signed_engagements", label: "Signed engagements", missing: "Approved engagement evidence is not available here" },
  { key: "booked_revenue", label: "Booked revenue", missing: "Approved revenue evidence is not available here" },
] as const;

function formatValue(metric: ReadOnlyMetric) {
  if (metric.unit === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: metric.currency ?? "USD", maximumFractionDigits: 0 }).format(metric.value);
  if (metric.unit === "rate") return `${Math.round(metric.value * 1000) / 10}%`;
  return new Intl.NumberFormat("en-US").format(metric.value);
}

// Each metric carries its own window, which can differ from the snapshot's.
function formatWindow(metric: ReadOnlyMetric) {
  const format = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${format(metric.reportingWindow.start)} to ${format(metric.reportingWindow.end)}`;
}

// Builds the four outcome tiles from a saved snapshot. Without a snapshot,
// or without a metric, a tile says so instead of guessing a number. A snapshot
// that is incomplete, stale, or unreconciled is labeled as not decision-ready.
export function buildOutcomeTiles(snapshot: ReadOnlyEvidenceSnapshot | null, now = new Date()): OutcomeTile[] {
  if (!snapshot) {
    return [
      { label: "Primary outcome", value: "Needs confirmation", detail: "An approved outcome is not available in this view" },
      ...supportingTiles.map((tile) => ({ label: tile.label, value: "Not measured", detail: tile.missing })),
    ];
  }
  const metrics = new Map(snapshot.metrics.map((metric) => [metric.key, metric]));
  const assessment = assessReadOnlyEvidenceSnapshot(snapshot, now);
  const readiness = assessment.ready ? "decision-ready" : `not decision-ready: ${assessment.blockers.join(" ")}`;
  const primary = metrics.get(snapshot.primaryOutcomeKey);
  return [
    {
      label: `Primary outcome: ${outcomeLabels[snapshot.primaryOutcomeKey]}`,
      value: primary ? formatValue(primary) : "Not measured",
      detail: primary ? `${formatWindow(primary)} · ${readiness}` : "The saved snapshot has no metric for this outcome",
    },
    ...supportingTiles.map((tile) => {
      const metric = metrics.get(tile.key);
      return metric
        ? { label: tile.label, value: formatValue(metric), detail: assessment.ready ? formatWindow(metric) : `${formatWindow(metric)} · not decision-ready` }
        : { label: tile.label, value: "Not measured", detail: tile.missing };
    }),
  ];
}
