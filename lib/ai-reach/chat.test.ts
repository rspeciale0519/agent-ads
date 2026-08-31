import { describe, expect, it } from "vitest";
import { buildAiReachBriefing } from "./briefing";
import { answerAiReachQuestion } from "./chat";
import { parseReadOnlyEvidenceSnapshot } from "./evidence-contract";

const now = new Date("2026-08-30T12:00:00.000Z");
const base = {
  organization: { id: "org-1", name: "Pilot company", role: "owner" },
  onboarding: { status: "submitted" as const, businessName: "Pilot company", submittedAt: "2026-08-29T12:00:00.000Z" },
  connections: [],
  verifiedResourceCount: 0,
};
const briefing = buildAiReachBriefing(base, now);
const accessRecords = ["google_ads", "google_analytics", "google_search_console", "wordpress", "dubsado"].map((provider) => ({
  id: `${provider}-connection`, provider, product: null, status: "active_read_only", accessMode: "read_only",
  principal: null, selectedResourceCount: 1, resourceCount: 1,
  lastVerifiedAt: "2026-08-30T11:00:00.000Z", expiresAt: null, nextAction: "No action needed",
}));
const evidenceSnapshot = parseReadOnlyEvidenceSnapshot({
  snapshotId: "snapshot-synthetic-1",
  organizationId: "org-1",
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
});

describe("answerAiReachQuestion", () => {
  it("explains the read-only boundary", () => {
    expect(answerAiReachQuestion("Can I change my ads?", "Pilot company", briefing)).toContain("read-only");
  });

  it("names the current missing evidence", () => {
    expect(answerAiReachQuestion("What is blocking good decisions?", "Pilot company", briefing)).toContain("Google Ads");
  });

  it("does not promise business outcomes", () => {
    expect(answerAiReachQuestion("Will this make more revenue?", "Pilot company", briefing)).toContain("remain unmeasured");
  });

  it("explains a validated outcome without claiming causation", () => {
    const ready = buildAiReachBriefing({ ...base, connections: accessRecords, verifiedResourceCount: 5, evidenceSnapshot }, now);
    const answer = answerAiReachQuestion("What is the revenue?", "Pilot company", ready);
    expect(answer).toContain("complete read-only outcome snapshot");
    expect(answer).toContain("does not prove that a marketing change caused the outcome");
    expect(answer).not.toContain("remain unmeasured");
  });

  it("still names missing Ads access when Analytics is connected", () => {
    const analyticsOnly = buildAiReachBriefing({ ...base, connections: accessRecords.filter((record) => record.provider === "google_analytics") }, now);
    const answer = answerAiReachQuestion("Why is access limited?", "Pilot company", analyticsOnly);
    expect(answer).toContain("Google Ads");
    expect(answer).not.toContain("Google Analytics 4");
    expect(answer).toContain(analyticsOnly.limitation);
  });

  it.each(["Are the results ready?", "What sources are connected?", "What is the revenue?"])(
    "does not promote connection metadata to business evidence: %s",
    (question) => {
      const connected = buildAiReachBriefing({ ...base, connections: accessRecords, verifiedResourceCount: 5 }, now);
      const answer = answerAiReachQuestion(question, "Pilot company", connected);
      expect(answer).toContain(connected.limitation);
      expect(answer).not.toContain("definitions remain unapproved");
      expect(answer).not.toContain("Evidence ready");
    },
  );

  it("keeps an empty question harmless", () => {
    expect(answerAiReachQuestion("  ", "Pilot company", briefing)).toBe("Ask a question about your sources, results, or next safe action.");
  });
});
