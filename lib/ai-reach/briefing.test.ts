import { describe, expect, it } from "vitest";
import type { DashboardConnectionSummary } from "../dashboard/dashboard-service";
import { buildAiReachBriefing } from "./briefing";
import { parseReadOnlyEvidenceSnapshot } from "./evidence-contract";

const now = new Date("2026-08-30T12:00:00.000Z");
const base = {
  organization: { id: "org-1", name: "Pilot company", role: "owner" },
  onboarding: { status: "submitted" as const, businessName: "Pilot company", submittedAt: "2026-08-29T12:00:00.000Z" },
  connections: [],
  verifiedResourceCount: 0,
};

function connection(provider: string, overrides: Partial<DashboardConnectionSummary> = {}): DashboardConnectionSummary {
  return {
    id: `${provider}-connection`, provider, product: null, status: "active_read_only", accessMode: "read_only",
    principal: null, selectedResourceCount: 1, resourceCount: 1,
    lastVerifiedAt: "2026-08-30T11:00:00.000Z", expiresAt: null, nextAction: "No action needed", ...overrides,
  };
}

const coreProviders = ["google_ads", "google_analytics", "google_search_console", "wordpress", "dubsado"];

describe("buildAiReachBriefing", () => {
  it("returns exactly three recommendations and stays limited without sources", () => {
    const briefing = buildAiReachBriefing(base, now);
    expect(briefing.status).toBe("limited");
    expect(briefing.recommendations).toHaveLength(3);
    expect(briefing.sources).toHaveLength(5);
    expect(briefing.sources.some((source) => source.state !== "connected")).toBe(true);
    expect(briefing.recommendations.every((recommendation) => recommendation.uncertainty.length > 0)).toBe(true);
    expect(briefing.recommendations.map((recommendation) => recommendation.uncertainty)).toEqual(["High", "High", "High"]);
  });

  it.each(["google_analytics", "google_search_console", "google_tag_manager", "google_ads_backup"])(
    "does not treat %s as Google Ads access",
    (provider) => {
      const briefing = buildAiReachBriefing({ ...base, connections: [connection(provider)] }, now);
      expect(briefing.sources.find((source) => source.name === "Google Ads")?.state).toBe("missing");
      expect(briefing.recommendations[1].title).toBe("Connect Google Ads read-only");
    },
  );

  it("does not count another Google source twice when Ads is absent", () => {
    const briefing = buildAiReachBriefing({
      ...base,
      connections: coreProviders.filter((provider) => provider !== "google_ads").map((provider) => connection(provider)),
      verifiedResourceCount: 4,
    }, now);
    expect(briefing.status).toBe("limited");
    expect(briefing.sources.filter((source) => source.state === "connected")).toHaveLength(4);
  });

  it.each([false, true])("finds qualifying Ads access regardless of connection order: %s", (reverse) => {
    const connections = [
      connection("google_analytics", { status: "revoked" }),
      connection("google_ads", { id: "older-ads", status: "degraded" }),
      connection("google_ads"),
    ];
    const briefing = buildAiReachBriefing({ ...base, connections: reverse ? connections.reverse() : connections }, now);
    expect(briefing.sources.find((source) => source.name === "Google Ads")?.state).toBe("connected");
    expect(briefing.recommendations[1].title).toBe("Review Google Ads reporting evidence");
    expect(briefing.recommendations[1].uncertainty).toBe("Medium");
  });

  it.each(["unknown", "read_write", "write", ""])("does not present %s access as read-only", (accessMode) => {
    const briefing = buildAiReachBriefing({ ...base, connections: [connection("google_ads", { accessMode })] }, now);
    expect(briefing.sources.find((source) => source.name === "Google Ads")?.state).toBe("needs_review");
  });

  it.each(["pending", "verifying", "degraded", "expired", "revoked", "archived"])(
    "keeps a %s connection under review",
    (status) => {
      const briefing = buildAiReachBriefing({ ...base, connections: [connection("google_ads", { status })] }, now);
      expect(briefing.sources.find((source) => source.name === "Google Ads")?.state).toBe("needs_review");
    },
  );

  it.each([
    { lastVerifiedAt: null },
    { lastVerifiedAt: "not-a-date" },
    { lastVerifiedAt: "2026-08-30T12:00:00.001Z" },
    { expiresAt: "not-a-date" },
    { expiresAt: "2026-08-30T11:59:59.999Z" },
    { expiresAt: "2026-08-30T12:00:00.000Z" },
  ])("does not trust a missing, invalid, future, or expired check: %j", (overrides) => {
    const briefing = buildAiReachBriefing({ ...base, connections: [connection("google_ads", overrides)] }, now);
    expect(briefing.sources.find((source) => source.name === "Google Ads")?.state).toBe("needs_review");
  });

  it("accepts verification at now and an expiry strictly after now", () => {
    const briefing = buildAiReachBriefing({
      ...base,
      connections: [connection("google_ads", { lastVerifiedAt: now.toISOString(), expiresAt: "2026-08-30T12:00:00.001Z" })],
    }, now);
    expect(briefing.sources.find((source) => source.name === "Google Ads")?.state).toBe("connected");
  });

  it("labels an old access check as a record, not fresh performance evidence", () => {
    const briefing = buildAiReachBriefing({
      ...base,
      connections: [connection("google_ads", { lastVerifiedAt: "2025-01-01T00:00:00.000Z" })],
    }, now);
    expect(briefing.status).toBe("limited");
    expect(briefing.sources.find((source) => source.name === "Google Ads")?.state).toBe("connected");
    expect(briefing.sources.find((source) => source.name === "Google Ads")?.detail).toContain("recorded");
    expect(briefing.limitation).toContain("Data age");
  });

  it("does not claim evidence readiness from complete connection metadata", () => {
    const briefing = buildAiReachBriefing({
      ...base,
      connections: coreProviders.map((provider) => connection(provider)),
      verifiedResourceCount: 500,
    }, now);
    expect(briefing.sources.every((source) => source.state === "connected")).toBe(true);
    expect(briefing.status).toBe("limited");
    expect(briefing.recommendations).toHaveLength(3);
    expect(briefing.summary).toContain("access records");
    expect(briefing.limitation).toContain("Approved business results are not available");
  });

  it.each([
    ["google_search_console", "Search Console"],
    ["wordpress", "Website"],
    ["dubsado", "Dubsado outcomes"],
  ])("recognizes a verified manual %s route without resource rows", (provider, name) => {
    const briefing = buildAiReachBriefing({
      ...base,
      connections: [connection(provider, { resourceCount: 0, selectedResourceCount: 0 })],
    }, now);
    expect(briefing.sources.find((source) => source.name === name)?.state).toBe("connected");
    expect(briefing.status).toBe("limited");
  });

  it("does not treat a lookalike provider as a Dubsado connection", () => {
    const briefing = buildAiReachBriefing({ ...base, connections: [connection("dubsado_backup")] }, now);
    expect(briefing.sources.find((source) => source.name === "Dubsado outcomes")?.state).toBe("missing");
  });

  it("does not infer a customer's stage-map approval from Dubsado access", () => {
    const briefing = buildAiReachBriefing({ ...base, connections: [connection("dubsado")] }, now);
    const recommendation = briefing.recommendations[2];
    expect(recommendation.title).toBe("Review Dubsado outcome definitions");
    expect(recommendation.evidence).toContain("An approved stage map is not available in this view.");
    expect(JSON.stringify(recommendation)).not.toMatch(/definitions remain unapproved|access is recorded without an approved stage map/i);
  });

  it("does not infer an offer or approved profile from submission metadata", () => {
    const briefing = buildAiReachBriefing(base, now);
    expect(briefing.recommendations[0].title).toBe("Confirm the offer for the first test");
    expect(briefing.recommendations[0].evidence.join(" ")).toContain("no approved offer decision");
    expect(JSON.stringify(briefing)).not.toMatch(/Onboarding lists|Several offer families are listed/);
  });

  it("surfaces official Google Ads metrics included in an evidence snapshot", () => {
    const evidenceSnapshot = parseReadOnlyEvidenceSnapshot({
      snapshotId: "snapshot-google-ads",
      organizationId: "org-1",
      primaryOutcomeKey: "qualified_leads",
      reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" },
      capturedAt: "2026-08-30T10:00:00.000Z",
      collectorVersion: "google-ads-reader-1.0.0",
      status: "partial",
      freshness: { state: "fresh", checkedAt: "2026-08-30T10:00:00.000Z", maxAgeHours: 48 },
      reconciliation: { state: "warning", limitation: "Business outcome sources are still pending." },
      evidence: [{ id: "evidence-google-ads", sourceClass: "official_platform_observation", provider: "google_ads", method: "official_api", collectedAt: "2026-08-30T10:00:00.000Z", collectorVersion: "google-ads-reader-1.0.0", limitations: ["Platform metrics do not prove revenue."] }],
      metrics: [
        { key: "google_ads.impressions", value: 1000, unit: "count", reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" }, attribution: "platform_reported", evidenceIds: ["evidence-google-ads"], limitations: ["Platform metrics do not prove revenue."] },
        { key: "qualified_leads", value: 0, unit: "count", reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" }, attribution: "unknown", evidenceIds: ["evidence-google-ads"], limitations: ["Business outcome sources are still pending."] },
      ],
      limitations: ["Business outcome sources are still pending."],
    });
    const briefing = buildAiReachBriefing({ ...base, evidenceSnapshot }, now);
    expect(briefing.sources.find((source) => source.name === "Google Ads")?.detail).toContain("Campaign performance metrics are included");
    expect(briefing.recommendations[1].title).toBe("Review Google Ads reporting evidence");
    expect(briefing.recommendations[1].reason).toContain("Campaign metrics are present");
  });

  it("surfaces authorized Dubsado outcome metrics without claiming complete reconciliation", () => {
    const evidenceSnapshot = parseReadOnlyEvidenceSnapshot({
      snapshotId: "snapshot-dubsado",
      organizationId: "org-1",
      primaryOutcomeKey: "closed_won_deals",
      reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" },
      capturedAt: "2026-08-30T10:00:00.000Z",
      collectorVersion: "dubsado-export-1.0.0",
      status: "partial",
      freshness: { state: "fresh", checkedAt: "2026-08-30T10:00:00.000Z", maxAgeHours: 48 },
      reconciliation: { state: "warning", limitation: "Advertising reconciliation is still pending." },
      evidence: [{ id: "evidence-dubsado", sourceClass: "business_outcome_observation", provider: "dubsado", method: "authorized_export", collectedAt: "2026-08-30T10:00:00.000Z", collectorVersion: "dubsado-export-1.0.0", limitations: ["The export does not prove advertising causality."] }],
      metrics: [{ key: "closed_won_deals", value: 1, unit: "count", reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" }, attribution: "direct_first_party", evidenceIds: ["evidence-dubsado"], limitations: ["The export does not prove advertising causality."] }],
      limitations: ["Advertising reconciliation is still pending."],
    });
    const briefing = buildAiReachBriefing({ ...base, connections: [connection("dubsado", { resourceCount: 0, selectedResourceCount: 0 })], evidenceSnapshot }, now);
    expect(briefing.sources.find((source) => source.name === "Dubsado outcomes")?.detail).toContain("Commercial outcome metrics are included");
    expect(briefing.recommendations[2].title).toBe("Review Dubsado outcome evidence");
    expect(briefing.recommendations[2].reason).toContain("reporting window");
    expect(briefing.recommendations).toHaveLength(3);
    expect(JSON.stringify(briefing)).not.toMatch(/complete reconciliation|caused the outcome/i);
  });

  it.each(["not_started", "in_progress"] as const)("does not claim a submitted profile when onboarding is %s", (status) => {
    const briefing = buildAiReachBriefing({
      ...base,
      onboarding: { ...base.onboarding, status },
      connections: [connection("wordpress", { resourceCount: 0, selectedResourceCount: 0 })],
    }, now);
    expect(briefing.recommendations[0].title).toBe("Complete your business profile");
    expect(briefing.recommendations[0].evidence.join(" ")).not.toContain("Onboarding is marked submitted");
    expect(briefing.sources.find((source) => source.name === "Website")?.state).toBe("connected");
    expect(briefing.sources.filter((source) => source.state === "connected")).toHaveLength(1);
    expect(briefing.summary).toContain("Business results are not measured in this view");
    expect(briefing.recommendations).toHaveLength(3);
  });
});
