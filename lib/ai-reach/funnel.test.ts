import { describe, expect, it } from "vitest";
import { buildAiReachBriefing } from "./briefing";
import { parseReadOnlyEvidenceSnapshot } from "./evidence-contract";
import { buildOutcomeFunnel } from "./funnel";

const now = new Date("2026-09-02T12:00:00.000Z");
const window = { start: "2026-08-01T00:00:00.000Z", end: "2026-09-01T00:00:00.000Z" };

// Builds a snapshot from "records currently at each stage" counts,
// the same shape a Dubsado import saves.
function snapshot(counts: Record<string, number>, provider = "dubsado") {
  return parseReadOnlyEvidenceSnapshot({
    snapshotId: "snapshot-1",
    organizationId: "org-1",
    primaryOutcomeKey: "qualified_leads",
    reportingWindow: window,
    capturedAt: "2026-09-02T10:00:00.000Z",
    collectorVersion: "fixture-1.0.0",
    status: "partial",
    freshness: { state: "fresh", checkedAt: "2026-09-02T10:00:00.000Z", maxAgeHours: 48 },
    reconciliation: { state: "warning", limitation: "Not reconciled." },
    evidence: [{ id: "export-1", sourceClass: "business_outcome_observation", provider, method: "authorized_export", collectedAt: "2026-09-02T10:00:00.000Z", collectorVersion: "fixture-1.0.0", limitations: [] }],
    metrics: Object.entries(counts).map(([key, value]) => ({ key, value, unit: "count", reportingWindow: window, attribution: "direct_first_party", evidenceIds: ["export-1"], limitations: [] })),
    limitations: [],
  });
}

// The Test Inc. export: 2 inquiries, 4 qualified, 3 calls, 1 proposal, 2 won.
const testInc = { inquiries: 2, qualified_leads: 4, booked_calls: 3, proposals_issued: 1, closed_won_deals: 2, cancelled_engagements: 1 };

describe("buildOutcomeFunnel", () => {
  it("counts each stage as records at that stage or later", () => {
    const funnel = buildOutcomeFunnel(snapshot(testInc));
    expect(funnel?.steps.map((step) => [step.from, step.to, step.advanced, step.entered])).toEqual([
      ["inquiries", "qualified leads", 10, 12],
      ["qualified leads", "booked calls", 6, 10],
      ["booked calls", "proposals", 3, 6],
      ["proposals", "won deals", 2, 3],
    ]);
  });

  it("names the lowest step with enough records, ignoring small groups", () => {
    // proposals → won deals is 67% from only 3 records; booked calls → proposals is 50% from 6.
    expect(buildOutcomeFunnel(snapshot(testInc))?.weakest).toMatchObject({ from: "booked calls", to: "proposals", rate: 0.5 });
    // Every step below the minimum: no weakest step is named.
    expect(buildOutcomeFunnel(snapshot({ qualified_leads: 2, booked_calls: 1 }))?.weakest).toBeNull();
  });

  it("treats a saved zero as a real stage, not an unused one", () => {
    // 8 qualified leads and nobody booked a call: a 0% step, not "no funnel".
    expect(buildOutcomeFunnel(snapshot({ qualified_leads: 8, booked_calls: 0 }))?.weakest).toMatchObject({ from: "qualified leads", to: "booked calls", advanced: 0, entered: 8, rate: 0 });
    // An empty middle stage stays in the path, so the right step is named.
    const funnel = buildOutcomeFunnel(snapshot({ qualified_leads: 4, booked_calls: 0, proposals_issued: 3 }));
    expect(funnel?.steps.map((step) => `${step.from}>${step.to}`)).toEqual(["qualified leads>booked calls", "booked calls>proposals"]);
    expect(funnel?.weakest).toMatchObject({ from: "qualified leads", to: "booked calls" });
  });

  it("needs at least two saved stages and authorized Dubsado evidence", () => {
    expect(buildOutcomeFunnel(null)).toBeNull();
    expect(buildOutcomeFunnel(snapshot({ qualified_leads: 9 }))).toBeNull();
    expect(buildOutcomeFunnel(snapshot(testInc, "someone_else"))).toBeNull();
  });
});

describe("briefing with a sales funnel", () => {
  const base = {
    organization: { id: "org-1", name: "Test Inc.", role: "owner" },
    onboarding: { status: "submitted" as const, businessName: "Test Inc.", submittedAt: "2026-08-29T12:00:00.000Z" },
    connections: [],
    verifiedResourceCount: 0,
  };

  it("points the third action at the weakest step using the saved numbers", () => {
    const action = buildAiReachBriefing({ ...base, evidenceSnapshot: snapshot(testInc) }, now).recommendations[2];
    expect(action.title).toBe("Find out why booked calls stall before proposals");
    expect(action.reason).toContain("Only 3 of 6 records that reached booked calls went on to proposals (50%)");
    expect(action.evidence).toContain("inquiries → qualified leads: 10 of 12 (83%)");
    // The step is chosen by rate, so it must be described as a share, not a head count.
    expect(action.expectedEffect).toContain("largest share");
    // It reports what happened without claiming a cause or asking for a change.
    expect(JSON.stringify(action)).not.toMatch(/caused|because|increase|change your/i);
  });

  it("judges the export by its own age under the current 7-day window", () => {
    // The fixture was saved with a 48-hour window on Sep 2; three days later it is still usable.
    const action = buildAiReachBriefing({ ...base, evidenceSnapshot: snapshot(testInc) }, new Date("2026-09-05T12:00:00.000Z")).recommendations[2];
    expect(action.title).toBe("Find out why booked calls stall before proposals");
  });

  it("does not give step advice from an out-of-date export", () => {
    // More than 7 days after the export was collected on Sep 2.
    const action = buildAiReachBriefing({ ...base, evidenceSnapshot: snapshot(testInc) }, new Date("2026-09-10T12:00:00.000Z")).recommendations[2];
    expect(action.title).toBe("Upload a fresh Dubsado export");
    expect(action.reason).toContain("out of date");
  });

  it("says when there are too few records to compare", () => {
    const action = buildAiReachBriefing({ ...base, evidenceSnapshot: snapshot({ qualified_leads: 2, booked_calls: 1 }) }, now).recommendations[2];
    expect(action.title).toBe("Review Dubsado outcome evidence");
    expect(action.evidence.join(" ")).toContain("Too few records at each step");
  });
});
