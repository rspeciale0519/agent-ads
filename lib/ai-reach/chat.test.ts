import { describe, expect, it } from "vitest";
import { buildAiReachBriefing } from "./briefing";
import { answerAiReachQuestion } from "./chat";

const briefing = buildAiReachBriefing({
  organization: { id: "org-1", name: "Pilot company", role: "owner" },
  onboarding: { status: "submitted", businessName: "Pilot company", submittedAt: new Date().toISOString() },
  connections: [],
  verifiedResourceCount: 0,
});

describe("answerAiReachQuestion", () => {
  it("explains the read-only boundary", () => {
    expect(answerAiReachQuestion("Can I change my ads?", "Todd Speciale Inc", briefing)).toContain("read-only");
  });

  it("names the current missing evidence", () => {
    expect(answerAiReachQuestion("What is blocking good decisions?", "Todd Speciale Inc", briefing)).toContain("Google Ads");
  });

  it("does not promise business outcomes", () => {
    expect(answerAiReachQuestion("Will this make more revenue?", "Todd Speciale Inc", briefing)).toContain("remain unmeasured");
  });
});
