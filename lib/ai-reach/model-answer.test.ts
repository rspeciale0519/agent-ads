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
  const draft = (choices: Partial<ModelAnswerDraft> = {}): ModelAnswerDraft => ({ isChangeRequest: false, metricKeys: [], nextActionNumbers: [], missingSources: [], ...choices });

  it("writes every sentence itself from the chosen results, cites them, and adds the notes", async () => {
    const answer = await createModelAnswerProvider(fakeModel(draft({ metricKeys: ["qualified_leads", "booked_revenue"], nextActionNumbers: [2] }))).answer(input("How did August go?"));
    expect(answer.kind).toBe("evidence");
    expect(answer.text).toContain("Qualified leads: 12 (Aug 1, 2026 to Aug 30, 2026). Booked revenue: $4,500 (Aug 1, 2026 to Aug 30, 2026).");
    expect(answer.text).toContain(`Suggested next step: ${briefing.recommendations[1].title}.`);
    expect(answer.text).toContain("Treat these numbers as a draft, not a decision-ready result:");
    expect(answer.text).toContain("does not prove a marketing change caused it");
    expect(answer.citations.map((citation) => citation.evidenceId)).toEqual(["dubsado-export-1"]);
  });

  it("shows a result under its own label whatever the question asked", async () => {
    const answer = await createModelAnswerProvider(fakeModel(draft({ metricKeys: ["qualified_leads"] }))).answer(input("How many booked calls?"));
    expect(answer.text).toContain("Qualified leads: 12");
    expect(answer.text).not.toMatch(/booked calls/u);
  });

  it("points to missing sources and next actions without saved results", async () => {
    const answer = await createModelAnswerProvider(fakeModel(draft({ missingSources: ["Google Ads"], nextActionNumbers: [2] }))).answer(input("How much did I spend on ads?"));
    expect(answer).toEqual({
      text: `Your saved evidence doesn't cover this yet. Connecting Google Ads would help answer this. Suggested next step: ${briefing.recommendations[1].title}.`,
      kind: "guidance",
      citations: [],
    });
  });

  it.each([
    ["a saved result that does not exist", draft({ metricKeys: ["booked_calls"] })],
    ["a next action that does not exist", draft({ nextActionNumbers: [7] })],
    ["a source that is not missing or not real", draft({ missingSources: ["Facebook"] })],
    ["nothing at all", draft()],
  ])("falls back when the model chooses %s", async (_label, badDraft) => {
    const answer = await createModelAnswerProvider(fakeModel(badDraft)).answer(input("How many leads?"));
    expect(answer).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
  });

  it("does not tell the customer to connect a source that only needs review", async () => {
    const withReview = { ...briefing, sources: briefing.sources.map((source) => source.name === "Google Ads" ? { ...source, state: "needs_review" as const } : source) };
    const answer = await createModelAnswerProvider(fakeModel(draft({ missingSources: ["Google Ads"] }))).answer({ ...input("How much did I spend?"), briefing: withReview });
    expect(answer.text).not.toContain("Connecting Google Ads");
  });

  it("gives the read-only answer when the model marks a change request", async () => {
    const answer = await createModelAnswerProvider(fakeModel(draft({ isChangeRequest: true }))).answer(input("Please make my budget higher"));
    expect(answer.kind).toBe("boundary");
  });

  it("falls back when the model fails or returns nothing", async () => {
    for (const result of [new Error("timeout"), null]) {
      const answer = await createModelAnswerProvider(fakeModel(result)).answer(input("How many leads?"));
      expect(answer).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
    }
  });

  it.each(["Please increase my budget", "Set my budget to 500", "Create an ad", "Can you update my bids?", "Could my campaign be put on hold?", "Put the search campaign on hold", "Can the budget be raised?", "   "])(
    "never sends recognized change requests or empty questions to the model: %s",
    async (question) => {
      const model = fakeModel(draft({ metricKeys: ["qualified_leads"] }));
      const answer = await createModelAnswerProvider(model).answer(input(question));
      expect(["boundary", "guidance"]).toContain(answer.kind);
      expect(model.calls).toBe(0);
    },
  );

  it("sends only labeled, formatted aggregate values, source names, and next actions as facts", () => {
    const facts = buildModelFacts(input("How many leads?"));
    expect(facts.savedResults?.metrics).toEqual([
      { key: "qualified_leads", label: "qualified leads", value: "12", period: "Aug 1, 2026 to Aug 30, 2026" },
      { key: "booked_revenue", label: "booked revenue", value: "$4,500", period: "Aug 1, 2026 to Aug 30, 2026" },
    ]);
    expect(facts.briefing.nextActions.map((action) => action.number)).toEqual([1, 2, 3]);
    expect(Object.keys(facts)).toEqual(["briefing", "savedResults"]);
    expect(JSON.stringify(facts)).not.toContain("Pilot company");
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
    const { client, create } = fakeAnthropic({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ isChangeRequest: false, metricKeys: ["qualified_leads"], nextActionNumbers: [1], missingSources: [] }) }] });
    const draft = await createAnthropicModelClient({ apiKey: "test-key", client }).draftAnswer({ system: "rules", facts: "{}", question: "How many leads?" });
    expect(draft).toEqual({ isChangeRequest: false, metricKeys: ["qualified_leads"], nextActionNumbers: [1], missingSources: [] });
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
