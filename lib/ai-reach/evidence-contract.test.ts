import { describe, expect, it } from "vitest";
import { assessReadOnlyEvidenceSnapshot, combineReadOnlyEvidenceSnapshots, parseReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot } from "./evidence-contract";
import { buildAiReachBriefing } from "./briefing";

const now = new Date("2026-08-30T12:00:00.000Z");

function fixture(overrides: Partial<ReadOnlyEvidenceSnapshot> = {}): ReadOnlyEvidenceSnapshot {
  return parseReadOnlyEvidenceSnapshot({
    snapshotId: "snapshot-synthetic-1",
    organizationId: "org-synthetic-1",
    primaryOutcomeKey: "qualified_leads",
    reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" },
    capturedAt: "2026-08-30T10:00:00.000Z",
    collectorVersion: "fixture-1.0.0",
    status: "complete",
    freshness: { state: "fresh", checkedAt: "2026-08-30T10:00:00.000Z", maxAgeHours: 48 },
    reconciliation: { state: "passed", limitation: "Synthetic fixture only." },
    evidence: [{ id: "evidence-synthetic-1", sourceClass: "business_outcome_observation", provider: "synthetic-crm", method: "authorized_export", collectedAt: "2026-08-30T10:00:00.000Z", collectorVersion: "fixture-1.0.0", limitations: ["Synthetic fixture only."] }],
    metrics: [{ key: "qualified_leads", value: 12, unit: "count", reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" }, attribution: "direct_first_party", evidenceIds: ["evidence-synthetic-1"], limitations: ["Synthetic fixture only."] }],
    limitations: ["Synthetic fixture only."],
    ...overrides,
  });
}

describe("read-only evidence contract", () => {
  it("accepts a synthetic outcome snapshot and marks it ready", () => {
    expect(assessReadOnlyEvidenceSnapshot(fixture(), now)).toEqual({ ready: true, blockers: [] });
  });

  it("requires every metric to cite a known evidence reference", () => {
    expect(() => fixture({ metrics: [{ ...fixture().metrics[0], evidenceIds: ["missing-evidence"] }] })).toThrow();
  });

  it("requires rate metrics to expose a numerator and denominator", () => {
    expect(() => fixture({ metrics: [{ ...fixture().metrics[0], key: "answer_coverage", unit: "rate" }] })).toThrow();
  });

  it.each([
    [{ status: "partial" as const }, "incomplete"],
    [{ freshness: { state: "stale" as const, checkedAt: "2026-08-30T10:00:00.000Z", maxAgeHours: 48 } }, "stale"],
    [{ reconciliation: { state: "warning" as const, limitation: "Synthetic mismatch." } }, "warning"],
  ])("blocks a %s snapshot from decision use", (override, reason) => {
    const result = assessReadOnlyEvidenceSnapshot(fixture(override), now);
    expect(result.ready).toBe(false);
    expect(result.blockers.join(" ")).toContain(reason);
  });

  it("allows a validated snapshot to make a complete briefing ready", () => {
    const connection = (provider: string) => ({ id: `${provider}-1`, provider, product: null, status: "active_read_only", accessMode: "read_only", principal: null, selectedResourceCount: 1, resourceCount: 1, lastVerifiedAt: "2026-08-30T11:00:00.000Z", expiresAt: null, nextAction: "No action needed" });
    const briefing = buildAiReachBriefing({
      organization: { id: "org-synthetic-1", name: "Synthetic company", role: "owner" },
      onboarding: { status: "submitted", businessName: "Synthetic company", submittedAt: "2026-08-29T12:00:00.000Z" },
      connections: ["wordpress", "google_ads", "google_analytics", "google_search_console", "dubsado"].map(connection),
      verifiedResourceCount: 5,
      evidenceSnapshot: fixture(),
    }, now);
    expect(briefing.status).toBe("ready");
    expect(briefing.summary).toContain("qualified leads is 12");
    expect(briefing.limitation).toContain("does not prove");
    expect(briefing.recommendations).toHaveLength(3);
  });

  it("combines source snapshots without claiming cross-source reconciliation", () => {
    const advertising = fixture({
      snapshotId: "snapshot-advertising",
      primaryOutcomeKey: "closed_won_deals",
      evidence: [{ id: "evidence-advertising", sourceClass: "official_platform_observation", provider: "google_ads", method: "official_api", collectedAt: "2026-08-30T10:00:00.000Z", collectorVersion: "google-ads-1.0.0", limitations: ["Platform metrics do not prove revenue."] }],
      metrics: [{ key: "google_ads.clicks", value: 42, unit: "count", reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" }, attribution: "platform_reported", evidenceIds: ["evidence-advertising"], limitations: ["Platform metrics do not prove revenue."] }, { key: "closed_won_deals", value: 0, unit: "count", reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" }, attribution: "unknown", evidenceIds: ["evidence-advertising"], limitations: ["Business outcome evidence is not present."] }],
    });
    const combined = combineReadOnlyEvidenceSnapshots({ snapshotId: "snapshot-combined", organizationId: "org-synthetic-1", primaryOutcomeKey: "qualified_leads", reportingWindow: fixture().reportingWindow, capturedAt: "2026-08-30T12:00:00.000Z", collectorVersion: "combined-1.0.0", snapshots: [fixture(), advertising] });
    expect(combined.status).toBe("partial");
    expect(combined.reconciliation.state).toBe("warning");
    expect(combined.metrics.map((metric) => metric.key)).toEqual(["qualified_leads", "google_ads.clicks", "closed_won_deals"]);
    expect(combined.limitations).toContain("Cross-source reconciliation and advertising attribution are not established.");
  });

  it("rejects duplicate metric keys when combining sources", () => {
    const duplicate = fixture({ snapshotId: "snapshot-duplicate", evidence: [{ ...fixture().evidence[0], id: "evidence-duplicate" }], metrics: [{ ...fixture().metrics[0], evidenceIds: ["evidence-duplicate"] }] });
    expect(() => combineReadOnlyEvidenceSnapshots({ snapshotId: "snapshot-combined", organizationId: "org-synthetic-1", primaryOutcomeKey: "qualified_leads", reportingWindow: fixture().reportingWindow, capturedAt: "2026-08-30T12:00:00.000Z", collectorVersion: "combined-1.0.0", snapshots: [fixture(), duplicate] })).toThrow("EVIDENCE_SNAPSHOT_METRIC_DUPLICATE_qualified_leads");
  });

  it("rejects cross-tenant and cross-window inputs", () => {
    expect(() => combineReadOnlyEvidenceSnapshots({ snapshotId: "snapshot-combined", organizationId: "org-synthetic-1", primaryOutcomeKey: "qualified_leads", reportingWindow: fixture().reportingWindow, capturedAt: "2026-08-30T12:00:00.000Z", collectorVersion: "combined-1.0.0", snapshots: [fixture(), fixture({ snapshotId: "snapshot-other-org", organizationId: "org-other" })] })).toThrow("EVIDENCE_SNAPSHOT_ORGANIZATION_MISMATCH");
    expect(() => combineReadOnlyEvidenceSnapshots({ snapshotId: "snapshot-combined", organizationId: "org-synthetic-1", primaryOutcomeKey: "qualified_leads", reportingWindow: fixture().reportingWindow, capturedAt: "2026-08-30T12:00:00.000Z", collectorVersion: "combined-1.0.0", snapshots: [fixture(), fixture({ snapshotId: "snapshot-other-window", reportingWindow: { start: "2026-07-01T00:00:00.000Z", end: "2026-07-31T00:00:00.000Z" }, capturedAt: "2026-08-01T00:00:00.000Z" })] })).toThrow("EVIDENCE_SNAPSHOT_WINDOW_MISMATCH");
  });
});
