import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicModelClient } from "./anthropic-model-client";
import { buildAiReachBriefing } from "./briefing";
import { isActionRequest } from "./chat";
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
function fakeModel(draft: ModelAnswerDraft | null | Error): AiReachModelClient & { calls: number; questions: string[] } {
  const client = {
    provider: "fake",
    model: "test-model",
    calls: 0,
    questions: [] as string[],
    draftAnswer: async ({ question }: { question: string }) => {
      client.calls += 1;
      client.questions.push(question);
      if (draft instanceof Error) throw draft;
      return { draft, inputTokens: 100, outputTokens: 20 };
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
      modelUsage: { provider: "fake", model: "test-model", status: "accepted", inputTokens: 100, outputTokens: 20 },
    });
  });

  it.each([
    ["a saved result that does not exist", draft({ metricKeys: ["booked_calls"] })],
    ["a next action that does not exist", draft({ nextActionNumbers: [7] })],
    ["a source that is not missing or not real", draft({ missingSources: ["Facebook"] })],
    ["nothing at all", draft()],
  ])("falls back when the model chooses %s", async (_label, badDraft) => {
    const answer = await createModelAnswerProvider(fakeModel(badDraft)).answer(input("How many leads?"));
    expect({ ...answer, modelUsage: undefined }).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
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
      expect({ ...answer, modelUsage: undefined }).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
    }
  });

  it.each(["Please increase my budget", "Set my budget to 500", "Create an ad", "Create a Google Ads campaign", "Can you update my bids?", "Could my campaign be put on hold?", "Put the search campaign on hold", "Can the budget be raised?", "   "])(
    "never sends recognized change requests or empty questions to the model: %s",
    async (question) => {
      const model = fakeModel(draft({ metricKeys: ["qualified_leads"] }));
      const answer = await createModelAnswerProvider(model).answer(input(question));
      expect(["boundary", "guidance"]).toContain(answer.kind);
      expect(model.calls).toBe(0);
    },
  );

  // Read-only questions that use the same words must still reach the model.
  it.each(["Create a summary of last month's results", "When did we put the campaign on hold?", "Can the report be updated?", "Set up a weekly report", "Create a Google Ads report", "Create an ad performance summary"])(
    "does not treat read-only questions as change requests: %s",
    (question) => {
      expect(isActionRequest(question.toLowerCase())).toBe(false);
    },
  );

  it("records provider usage for every model call, whatever happens to the draft", async () => {
    const tokens = { provider: "fake", model: "test-model", inputTokens: 100, outputTokens: 20 };
    expect((await createModelAnswerProvider(fakeModel(draft({ metricKeys: ["qualified_leads"] }))).answer(input("How many leads?"))).modelUsage).toEqual({ ...tokens, status: "accepted" });
    expect((await createModelAnswerProvider(fakeModel(draft({ isChangeRequest: true }))).answer(input("Make my budget higher"))).modelUsage).toEqual({ ...tokens, status: "change_request" });
    expect((await createModelAnswerProvider(fakeModel(draft({ metricKeys: ["unknown"] }))).answer(input("How many leads?"))).modelUsage).toEqual({ ...tokens, status: "rejected" });
    expect((await createModelAnswerProvider(fakeModel(new Error("timeout"))).answer(input("How many leads?"))).modelUsage).toEqual({ ...tokens, status: "failed", inputTokens: null, outputTokens: null });
    // Answers that never call a model carry no usage record.
    expect((await createModelAnswerProvider(fakeModel(draft())).answer(input("Pause my ads"))).modelUsage).toBeUndefined();
  });

  it("shows, cites, and qualifies the saved metrics behind a suggested step", async () => {
    const recommendations = briefing.recommendations.map((recommendation, index) => index === 2 ? { ...recommendation, metricKeys: ["qualified_leads"] } : recommendation) as typeof briefing.recommendations;
    const answer = await createModelAnswerProvider(fakeModel(draft({ nextActionNumbers: [3] }))).answer({ ...input("What should I do next?"), briefing: { ...briefing, recommendations } });
    expect(answer.kind).toBe("evidence");
    expect(answer.text).toContain("Qualified leads: 12 (Aug 1, 2026 to Aug 30, 2026).");
    expect(answer.text).not.toContain("doesn't cover this");
    expect(answer.text).toContain("does not prove a marketing change caused it");
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it("brings the saved Dubsado metrics along with the Dubsado review step", async () => {
    expect(briefing.recommendations[2].metricKeys).toEqual(["qualified_leads", "booked_revenue"]);
    const answer = await createModelAnswerProvider(fakeModel(draft({ nextActionNumbers: [3] }))).answer(input("What should I do next?"));
    expect(answer.kind).toBe("evidence");
    expect(answer.text).toContain("Qualified leads: 12");
    expect(answer.text).not.toContain("doesn't cover this");
  });

  it("records the model that actually served the call", async () => {
    const model = fakeModel(draft({ metricKeys: ["qualified_leads"] }));
    const draftAnswer = model.draftAnswer;
    model.draftAnswer = async (prompt) => ({ ...(await draftAnswer(prompt)), model: "fallback-model" });
    expect((await createModelAnswerProvider(model).answer(input("How many leads?"))).modelUsage?.model).toBe("fallback-model");
  });

  it("removes emails, phone numbers, and links before the question leaves AI Reach", async () => {
    const model = fakeModel(draft({ metricKeys: ["qualified_leads"] }));
    await createModelAnswerProvider(model).answer(input("Did jane.doe@example.com or (555) 123-4567 or +44 20 7946 0958 or 020 7946 0958 or 555-1212 from https://acme.test/x, portal.example.com/customers/alice or example.com/reset?token=abc or portal.example.com?customer=alice or example.com#reset become a lead between 2026-08-01 and 2026-08-30, or in the last 30 days?"));
    expect(model.questions[0]).toBe("Did [email] or [phone] or [phone] or [phone] or [phone] from [link] [link] or [link] or [link] or [link] become a lead between 2026-08-01 and 2026-08-30, or in the last 30 days?");
  });

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
    const { client, create } = fakeAnthropic({ stop_reason: "end_turn", model: "claude-opus-5-5", usage: { input_tokens: 900, output_tokens: 40 }, content: [{ type: "text", text: JSON.stringify({ isChangeRequest: false, metricKeys: ["qualified_leads"], nextActionNumbers: [1], missingSources: [] }) }] });
    const result = await createAnthropicModelClient({ apiKey: "test-key", client }).draftAnswer({ system: "rules", facts: "{}", question: "How many leads?" });
    expect(result).toEqual({ draft: { isChangeRequest: false, metricKeys: ["qualified_leads"], nextActionNumbers: [1], missingSources: [] }, model: "claude-opus-5-5", inputTokens: 900, outputTokens: 40 });
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.output_config.format.type).toBe("json_schema");
    expect(request.fallbacks).toBe("default");
    expect(request.betas).toEqual(["server-side-fallback-2026-07-01"]);
  });

  it("returns no draft, but keeps the billed tokens, when the model declines, stops early, or sends bad JSON", async () => {
    const responses = [
      { stop_reason: "refusal", content: [] },
      { stop_reason: "max_tokens", content: [] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] },
    ];
    for (const response of responses) {
      // A fallback model served these calls; its name is what gets recorded.
      const { client } = fakeAnthropic({ ...response, model: "claude-sonnet-5-5", usage: { input_tokens: 5, output_tokens: 1 } });
      expect(await createAnthropicModelClient({ apiKey: "test-key", client }).draftAnswer({ system: "rules", facts: "{}", question: "Hi" })).toEqual({ draft: null, model: "claude-sonnet-5-5", inputTokens: 5, outputTokens: 1 });
    }
  });
});
