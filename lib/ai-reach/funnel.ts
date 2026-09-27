import type { ReadOnlyEvidenceSnapshot } from "./evidence-contract";

// The sales stages in order, with the plain words shown to customers.
// Each Dubsado count is "records currently at this stage", so a stage's
// "reached" total is its own count plus every later stage's count.
const stageOrder: Array<{ key: string; label: string }> = [
  { key: "inquiries", label: "inquiries" },
  { key: "qualified_leads", label: "qualified leads" },
  { key: "booked_calls", label: "booked calls" },
  { key: "completed_qualified_meetings", label: "completed meetings" },
  { key: "proposals_issued", label: "proposals" },
  { key: "signed_engagements", label: "signed engagements" },
  { key: "closed_won_deals", label: "won deals" },
];

// A step needs at least this many records entering it before its rate is
// compared. Smaller groups swing too much to point at a real problem.
export const minimumStepRecords = 5;

export type FunnelStep = { from: string; to: string; entered: number; advanced: number; rate: number };
export type OutcomeFunnel = { steps: FunnelStep[]; weakest: FunnelStep | null };

// Builds stage-to-stage progress from authorized Dubsado export metrics only.
// Returns null when fewer than two stages have saved records.
export function buildOutcomeFunnel(snapshot: ReadOnlyEvidenceSnapshot | null | undefined): OutcomeFunnel | null {
  if (!snapshot) return null;
  const dubsadoEvidenceIds = new Set(snapshot.evidence
    .filter((evidence) => evidence.provider === "dubsado" && evidence.sourceClass === "business_outcome_observation" && evidence.method === "authorized_export")
    .map((evidence) => evidence.id));
  const counts = stageOrder
    .map((stage) => ({
      ...stage,
      metric: snapshot.metrics.find((metric) => metric.key === stage.key && metric.unit === "count" && metric.evidenceIds.some((id) => dubsadoEvidenceIds.has(id))),
    }))
    // Skip stages this business does not use. Imports save a zero for every
    // stage in the approved map, so a missing metric means "not used".
    .filter((stage) => stage.metric !== undefined)
    .map((stage) => ({ label: stage.label, count: stage.metric!.value }));
  if (counts.length < 2) return null;

  // "Reached" = records at this stage or any later stage.
  const reached = counts.map((_, index) => counts.slice(index).reduce((total, stage) => total + stage.count, 0));
  const steps = counts.slice(1).map((stage, index) => ({
    from: counts[index].label,
    to: stage.label,
    entered: reached[index],
    advanced: reached[index + 1],
    rate: reached[index] === 0 ? 0 : reached[index + 1] / reached[index],
  }))
    // A step nobody entered has no rate to show.
    .filter((step) => step.entered > 0);
  if (steps.length === 0) return null;
  // The weakest step is the lowest rate among steps with enough records;
  // ties go to the earlier step because it affects more records.
  const weakest = steps
    .filter((step) => step.entered >= minimumStepRecords)
    .reduce<FunnelStep | null>((lowest, step) => (lowest === null || step.rate < lowest.rate ? step : lowest), null);
  return { steps, weakest };
}

export function formatRate(rate: number) {
  return `${Math.round(rate * 100)}%`;
}
