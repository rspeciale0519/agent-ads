import { describe, expect, it } from "vitest";
import { buildAiReachBriefing } from "./briefing";

const base = {
  organization: { id: "org-1", name: "Pilot company", role: "owner" },
  onboarding: { status: "submitted" as const, businessName: "Pilot company", submittedAt: new Date().toISOString() },
  connections: [],
  verifiedResourceCount: 0,
};

describe("buildAiReachBriefing", () => {
  it("returns exactly three recommendations and stays limited without sources", () => {
    const briefing = buildAiReachBriefing(base);
    expect(briefing.status).toBe("limited");
    expect(briefing.recommendations).toHaveLength(3);
    expect(briefing.sources).toHaveLength(5);
    expect(briefing.sources.some((source) => source.state !== "connected")).toBe(true);
  });

  it("does not claim readiness until every core source is read-only", () => {
    const briefing = buildAiReachBriefing({
      ...base,
      connections: [
        { id: "g", provider: "google_ads", product: null, status: "active_read_only", accessMode: "read_only", principal: null, selectedResourceCount: 1, resourceCount: 1, lastVerifiedAt: null, expiresAt: null, nextAction: "No action needed" },
        { id: "d", provider: "dubsado", product: null, status: "active_read_only", accessMode: "read_only", principal: null, selectedResourceCount: 1, resourceCount: 1, lastVerifiedAt: null, expiresAt: null, nextAction: "No action needed" },
      ],
      verifiedResourceCount: 2,
    });
    expect(briefing.status).toBe("limited");
    expect(briefing.recommendations).toHaveLength(3);
    expect(briefing.recommendations[2].title).toContain("Map");
  });

  it("recognizes a verified Search Console inventory route", () => {
    const briefing = buildAiReachBriefing({
      ...base,
      connections: [
        { id: "s", provider: "google_search_console", product: null, status: "active_read_only", accessMode: "read_only", principal: null, selectedResourceCount: 1, resourceCount: 1, lastVerifiedAt: null, expiresAt: null, nextAction: "No action needed" },
      ],
      verifiedResourceCount: 1,
    });
    expect(briefing.sources.find((source) => source.name === "Search Console")?.state).toBe("connected");
  });
});
