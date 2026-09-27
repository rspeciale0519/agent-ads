import { describe, expect, it } from "vitest";
import { parseDubsadoExport } from "../connections/providers/dubsado-export";
import { mapDubsadoOutcomeStages } from "../connections/providers/dubsado-export";
import { buildDubsadoEvidenceSnapshot } from "./dubsado-evidence";

const window = { start: "2026-08-01T00:00:00.000Z", end: "2026-08-31T00:00:00.000Z" };
const map = { recordId: "Project ID", status: "Status", bookedRevenue: "Revenue", currency: "Currency" };

function records(csv: string) {
  return mapDubsadoOutcomeStages(parseDubsadoExport(csv, map).records, { Inquiry: "inquiry", Qualified: "qualified_opportunity", Call: "booked_call", Meeting: "completed_qualified_meeting", Proposal: "proposal_issued", Signed: "signed_engagement", Booked: "booked_revenue", Cancelled: "cancelled", Refunded: "refunded" });
}

describe("buildDubsadoEvidenceSnapshot", () => {
  it("builds a partial source observation with explicit status mapping", () => {
    const snapshot = buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-1", organizationId: "org-1", evidenceId: "dubsado-1", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "qualified_leads", records: records("Project ID,Status,Revenue,Currency\nproj-0,Inquiry,,USD\nproj-1,Qualified,,USD\nproj-2,Meeting,,USD\nproj-3,Proposal,,USD\nproj-4,Signed,,USD\nproj-5,Cancelled,,USD\nproj-6,Refunded,,USD") });
    expect(snapshot.status).toBe("partial");
    expect(snapshot.reconciliation.state).toBe("warning");
    expect(snapshot.metrics.find((metric) => metric.key === "inquiries")?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.key === "qualified_leads")?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.key === "completed_qualified_meetings")?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.key === "proposals_issued")?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.key === "signed_engagements")?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.key === "cancelled_engagements")?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.key === "refunded_engagements")?.value).toBe(1);
    expect(snapshot.evidence[0].method).toBe("authorized_export");
  });

  it("counts booked calls and closed-won deals from their mapped stages", () => {
    const snapshot = buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-5", organizationId: "org-1", evidenceId: "dubsado-5", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_calls", records: records("Project ID,Status,Revenue,Currency\nproj-1,Call,,USD\nproj-2,Call,,USD\nproj-3,Booked,900,USD") });
    expect(snapshot.metrics.find((metric) => metric.key === "booked_calls")?.value).toBe(2);
    expect(snapshot.metrics.find((metric) => metric.key === "closed_won_deals")?.value).toBe(1);
    expect(() => buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-6", organizationId: "org-1", evidenceId: "dubsado-6", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "closed_won_deals", records: records("Project ID,Status,Revenue,Currency\nproj-3,Booked,900,USD") })).not.toThrow();
  });

  it("includes booked revenue only when currency is consistent", () => {
    const snapshot = buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-2", organizationId: "org-1", evidenceId: "dubsado-2", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_revenue", records: records("Project ID,Status,Revenue,Currency\nproj-1,Booked,1250,USD") });
    expect(snapshot.metrics.find((metric) => metric.key === "booked_revenue")).toMatchObject({ value: 1250, currency: "USD", attribution: "direct_first_party" });
  });

  it("rejects missing primary evidence and currency conflicts", () => {
    // A mapped stage with zero records is saved as zero, but the main outcome still needs a record.
    const zeroCalls = buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-7", organizationId: "org-1", evidenceId: "dubsado-7", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "qualified_leads", records: records("Project ID,Status,Revenue,Currency\nproj-1,Qualified,,USD"), configuredStages: ["qualified_opportunity", "booked_call", "booked_revenue"] });
    expect(zeroCalls.metrics.map((metric) => [metric.key, metric.value])).toEqual([["qualified_leads", 1], ["booked_calls", 0], ["closed_won_deals", 0]]);
    expect(() => buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-8", organizationId: "org-1", evidenceId: "dubsado-8", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_calls", records: records("Project ID,Status,Revenue,Currency\nproj-1,Qualified,,USD"), configuredStages: ["qualified_opportunity", "booked_call"] })).toThrow("DUBSADO_EVIDENCE_PRIMARY_METRIC_MISSING");
    // A booked record worth $0 still counts as booked revenue being present.
    expect(() => buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-9", organizationId: "org-1", evidenceId: "dubsado-9", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_revenue", records: records("Project ID,Status,Revenue,Currency\nproj-1,Booked,0,USD"), configuredStages: ["booked_revenue"] })).not.toThrow();
    expect(() => buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-3", organizationId: "org-1", evidenceId: "dubsado-3", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_calls", records: records("Project ID,Status,Revenue,Currency\nproj-1,Qualified,,USD") })).toThrow("DUBSADO_EVIDENCE_PRIMARY_METRIC_MISSING");
    expect(() => buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-4", organizationId: "org-1", evidenceId: "dubsado-4", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_revenue", records: records("Project ID,Status,Revenue,Currency\nproj-1,Booked,1250,USD\nproj-2,Booked,500,CAD") })).toThrow("DUBSADO_EVIDENCE_REVENUE_CURRENCY_CONFLICT");
  });
});
