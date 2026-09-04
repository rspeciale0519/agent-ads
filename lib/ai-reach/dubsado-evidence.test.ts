import { describe, expect, it } from "vitest";
import { parseDubsadoExport } from "../connections/providers/dubsado-export";
import { mapDubsadoOutcomeStages } from "../connections/providers/dubsado-export";
import { buildDubsadoEvidenceSnapshot } from "./dubsado-evidence";

const window = { start: "2026-08-01T00:00:00.000Z", end: "2026-08-31T00:00:00.000Z" };
const map = { recordId: "Project ID", status: "Status", bookedRevenue: "Revenue", currency: "Currency" };

function records(csv: string) {
  return mapDubsadoOutcomeStages(parseDubsadoExport(csv, map).records, { Inquiry: "inquiry", Qualified: "qualified_opportunity", Meeting: "completed_qualified_meeting", Proposal: "proposal_issued", Signed: "signed_engagement", Booked: "booked_revenue", Cancelled: "cancelled", Refunded: "refunded" });
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

  it("includes booked revenue only when currency is consistent", () => {
    const snapshot = buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-2", organizationId: "org-1", evidenceId: "dubsado-2", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_revenue", records: records("Project ID,Status,Revenue,Currency\nproj-1,Booked,1250,USD") });
    expect(snapshot.metrics.find((metric) => metric.key === "booked_revenue")).toMatchObject({ value: 1250, currency: "USD", attribution: "direct_first_party" });
  });

  it("rejects missing primary evidence and currency conflicts", () => {
    expect(() => buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-3", organizationId: "org-1", evidenceId: "dubsado-3", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_calls", records: records("Project ID,Status,Revenue,Currency\nproj-1,Qualified,,USD") })).toThrow("DUBSADO_EVIDENCE_PRIMARY_METRIC_MISSING");
    expect(() => buildDubsadoEvidenceSnapshot({ snapshotId: "snapshot-4", organizationId: "org-1", evidenceId: "dubsado-4", reportingWindow: window, capturedAt: "2026-08-31T12:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", primaryOutcomeKey: "booked_revenue", records: records("Project ID,Status,Revenue,Currency\nproj-1,Booked,1250,USD\nproj-2,Booked,500,CAD") })).toThrow("DUBSADO_EVIDENCE_REVENUE_CURRENCY_CONFLICT");
  });
});
