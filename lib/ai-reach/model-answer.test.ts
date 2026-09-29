import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicModelClient } from "./anthropic-model-client";
import { buildAiReachBriefing } from "./briefing";
import { parseReadOnlyEvidenceSnapshot } from "./evidence-contract";
import { deterministicAnswerProvider, getAnswerProvider } from "./gateway";
import { buildModelFacts, createModelAnswerProvider, type AiReachModelClient, type ModelAnswerDraft } from "./model-answer";

const now = new Date("2026-08-30T12:00:00.000Z");
const window = { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" };
const snapshot = parseReadOnlyEvidenceSnapshot({
  snapshotId: "snapshot-1",
  organizationId: "org-1",
  primaryOutcomeKey: "qualified_leads",
  reportingWindow: window,
  capturedAt: "2026-08-30T10:00:00.000Z",
  collectorVersion: "fixture-1.0.0",
  status: "partial",
  freshness: { state: "fresh", checkedAt: "2026-08-30T10:00:00.000Z", maxAgeHours: 168 },
  reconciliation: { state: "warning", limitation: "Synthetic fixture only." },
  evidence: [{ id: "dubsado-export-1", sourceClass: "business_outcome_observation", provider: "dubsado", method: "authorized_export", collectedAt: "2026-08-30T10:00:00.000Z", collectorVersion: "fixture-1.0.0", limitations: [] }],
  metrics: [
    { key: "qualified_leads", value: 12, unit: "count", reportingWindow: window, attribution: "direct_first_party", evidenceIds: ["dubsado-export-1"], limitations: [] },
    { key: "booked_revenue", value: 4500, unit: "currency", currency: "USD", reportingWindow: window, attribution: "direct_first_party", evidenceIds: ["dubsado-export-1"], limitations: [] },
  ],
  limitations: [],
});
const briefing = buildAiReachBriefing({
  organization: { id: "org-1", name: "Pilot company", role: "owner" },
  onboarding: { status: "submitted", businessName: "Pilot company", submittedAt: "2026-08-29T12:00:00.000Z" },
  connections: [],
  verifiedResourceCount: 0,
  evidenceSnapshot: snapshot,
}, now);
const input = (question: string) => ({ question, organizationName: "Pilot company", briefing, snapshot, now });

// A stand-in model that returns whatever draft the test gives it.
function fakeModel(draft: ModelAnswerDraft | null | Error): AiReachModelClient & { calls: number } {
  const client = {
    name: "fake",
    calls: 0,
    draftAnswer: async () => {
      client.calls += 1;
      if (draft instanceof Error) throw draft;
      return draft;
    },
  };
  return client;
}

describe("model answers", () => {
  const draft = (metricKeys: string[], explanation: string, isChangeRequest = false): ModelAnswerDraft => ({ isChangeRequest, metricKeys, explanation });

  it("writes the result lines itself, cites their evidence, and adds the readiness and causation notes", async () => {
    const answer = await createModelAnswerProvider(fakeModel(draft(["qualified_leads", "booked_revenue"], "August brought steady interest; add Google Ads to compare with ad activity."))).answer(input("How did August go?"));
    expect(answer.kind).toBe("evidence");
    expect(answer.text).toContain("Qualified leads: 12 (Aug 1, 2026 to Aug 30, 2026). Booked revenue: $4,500 (Aug 1, 2026 to Aug 30, 2026).");
    expect(answer.text).toContain("August brought steady interest");
    expect(answer.text).toContain("Treat these numbers as a draft, not a decision-ready result:");
    expect(answer.text).toContain("does not prove a marketing change caused it");
    expect(answer.citations.map((citation) => citation.evidenceId)).toEqual(["dubsado-export-1"]);
  });

  it.each([
    ["a number in digits", draft(["qualified_leads"], "That is 99 more than usual.")],
    ["a number written as a word", draft([], "You had ninety-nine booked calls.")],
    ["a small number word", draft([], "You had one booked call.")],
    ["a saved result that does not exist", draft(["booked_calls"], "Here are your calls.")],
    ["a claim that an account was changed", draft([], "Done. I have paused your campaign.")],
    ["a passive claim of a change", draft([], "Your campaign is now on hold.")],
    ["a causal claim", draft(["qualified_leads"], "Google Ads drove these qualified leads.")],
    ["another causal claim", draft(["qualified_leads"], "Leads rose because of your new offer.")],
    ["nothing at all", draft([], "")],
  ])("falls back when the model writes %s", async (_label, badDraft) => {
    const answer = await createModelAnswerProvider(fakeModel(badDraft)).answer(input("How many leads?"));
    expect(answer).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
  });

  it("can never put a value under the wrong label", async () => {
    // The model only picks keys; the label always comes from the metric itself.
    const answer = await createModelAnswerProvider(fakeModel(draft(["qualified_leads"], "Here is the closest saved result."))).answer(input("How many booked calls?"));
    expect(answer.text).toContain("Qualified leads: 12");
    expect(answer.text).not.toMatch(/12 booked calls/u);
  });

  it("gives the read-only answer when the model marks a change request", async () => {
    const answer = await createModelAnswerProvider(fakeModel(draft([], "Sure.", true))).answer(input("Is it possible to hold my campaign?"));
    expect(answer.kind).toBe("boundary");
  });

  it("returns an explanation without saved results as uncited guidance", async () => {
    const answer = await createModelAnswerProvider(fakeModel(draft([], "Connect Google Ads next so campaign results can be compared with your sales."))).answer(input("What should I connect first?"));
    expect(answer).toEqual({ text: "Connect Google Ads next so campaign results can be compared with your sales.", kind: "guidance", citations: [] });
  });

  it("falls back when the model fails or returns nothing", async () => {
    for (const result of [new Error("timeout"), null]) {
      const answer = await createModelAnswerProvider(fakeModel(result)).answer(input("How many leads?"));
      expect(answer).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
    }
  });

  it.each(["Please increase my budget", "Set my budget to 500", "Create an ad", "Can you update my bids?", "Could my campaign be put on hold?", "Put the search campaign on hold", "Can the budget be raised?", "   "])(
    "never sends change requests or empty questions to the model: %s",
    async (question) => {
      const model = fakeModel(draft([], "Done, budget raised."));
      const answer = await createModelAnswerProvider(model).answer(input(question));
      expect(["boundary", "guidance"]).toContain(answer.kind);
      expect(model.calls).toBe(0);
    },
  );

  it("sends only labeled, formatted aggregate values and source names as facts", () => {
    const facts = buildModelFacts(input("How many leads?"));
    expect(facts.savedResults?.metrics).toEqual([
      { key: "qualified_leads", label: "qualified leads", value: "12", period: "Aug 1, 2026 to Aug 30, 2026" },
      { key: "booked_revenue", label: "booked revenue", value: "$4,500", period: "Aug 1, 2026 to Aug 30, 2026" },
    ]);
    expect(Object.keys(facts)).toEqual(["organizationName", "briefing", "savedResults"]);
  });
});

describe("answer provider selection", () => {
  it("uses deterministic answers unless a model provider and its key are both set", () => {
    expect(getAnswerProvider({}).name).toBe("deterministic-1.0.0");
    expect(getAnswerProvider({ AI_REACH_MODEL_PROVIDER: "anthropic" }).name).toBe("deterministic-1.0.0");
    expect(getAnswerProvider({ ANTHROPIC_API_KEY: "test-key" }).name).toBe("deterministic-1.0.0");
    expect(getAnswerProvider({ AI_REACH_MODEL_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key" }).name).toBe("model:anthropic:claude-opus-5-5");
    expect(getAnswerProvider({ AI_REACH_MODEL_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key", AI_REACH_MODEL: "claude-sonnet-5-5" }).name).toBe("model:anthropic:claude-sonnet-5-5");
  });
});

describe("Anthropic model adapter", () => {
  function fakeAnthropic(response: unknown) {
    const create = vi.fn().mockResolvedValue(response);
    return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
  }

  it("requests a structured draft with fallbacks and parses it", async () => {
    const { client, create } = fakeAnthropic({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ isChangeRequest: false, metricKeys: ["qualified_leads"], explanation: "Leads look steady." }) }] });
    const draft = await createAnthropicModelClient({ apiKey: "test-key", client }).draftAnswer({ system: "rules", facts: "{}", question: "How many leads?" });
    expect(draft).toEqual({ isChangeRequest: false, metricKeys: ["qualified_leads"], explanation: "Leads look steady." });
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.output_config.format.type).toBe("json_schema");
    expect(request.fallbacks).toBe("default");
    expect(request.betas).toEqual(["server-side-fallback-2026-07-01"]);
  });

  it("returns nothing when the model declines or stops early", async () => {
    for (const stopReason of ["refusal", "max_tokens"]) {
      const { client } = fakeAnthropic({ stop_reason: stopReason, content: [] });
      expect(await createAnthropicModelClient({ apiKey: "test-key", client }).draftAnswer({ system: "rules", facts: "{}", question: "Hi" })).toBeNull();
    }
  });
});
