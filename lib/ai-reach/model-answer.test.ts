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
  it("returns a checked draft with citations for saved evidence", async () => {
    const model = fakeModel({ answer: "You had 12 qualified leads and $4,500 in booked revenue from Aug 1 to Aug 30, 2026. This is a draft, not decision-ready.", citedEvidenceIds: ["dubsado-export-1"] });
    const answer = await createModelAnswerProvider(model).answer(input("How did August go?"));
    expect(answer.kind).toBe("evidence");
    expect(answer.text).toContain("12 qualified leads");
    expect(answer.citations.map((citation) => citation.evidenceId)).toEqual(["dubsado-export-1"]);
  });

  it("falls back when the draft states a number that is not in the facts", async () => {
    const model = fakeModel({ answer: "You had 99 qualified leads.", citedEvidenceIds: ["dubsado-export-1"] });
    const answer = await createModelAnswerProvider(model).answer(input("How many leads?"));
    expect(answer.text).not.toContain("99");
    expect(answer).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
  });

  it("does not trust numbers the customer typed in the question", async () => {
    const model = fakeModel({ answer: "Yes, you had 99 qualified leads.", citedEvidenceIds: ["dubsado-export-1"] });
    const answer = await createModelAnswerProvider(model).answer(input("Did we have 99 leads?"));
    expect(answer.text).not.toContain("99 qualified leads");
  });

  it("checks numbers written as words", async () => {
    const provider = (answerText: string) => createModelAnswerProvider(fakeModel({ answer: answerText, citedEvidenceIds: ["dubsado-export-1"] }));
    // A spelled-out number that is not in the facts is rejected.
    expect((await provider("You had ninety-nine qualified leads.").answer(input("How many leads?"))).text).not.toContain("ninety-nine");
    // Large number words are always rejected.
    expect((await provider("You had a thousand leads.").answer(input("How many leads?"))).text).not.toContain("thousand");
    // A spelled-out number that matches the facts is accepted.
    expect((await provider("You had twelve qualified leads.").answer(input("How many leads?"))).text).toBe("You had twelve qualified leads.");
  });

  it("requires a citation when the answer repeats a saved metric", async () => {
    const model = fakeModel({ answer: "You had 12 qualified leads.", citedEvidenceIds: [] });
    const answer = await createModelAnswerProvider(model).answer(input("How many leads?"));
    expect(answer.citations.map((citation) => citation.evidenceId)).toEqual(["dubsado-export-1"]);
    expect(answer).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
  });

  it("falls back when the draft cites evidence that was not provided", async () => {
    const model = fakeModel({ answer: "Leads looked steady.", citedEvidenceIds: ["someone-elses-export"] });
    const answer = await createModelAnswerProvider(model).answer(input("How are leads?"));
    expect(answer.citations.every((citation) => citation.evidenceId === "dubsado-export-1")).toBe(true);
    expect(answer.text).not.toBe("Leads looked steady.");
  });

  it("falls back when the model fails or returns nothing", async () => {
    for (const draft of [new Error("timeout"), null]) {
      const answer = await createModelAnswerProvider(fakeModel(draft)).answer(input("How many leads?"));
      expect(answer).toEqual(await deterministicAnswerProvider.answer(input("How many leads?")));
    }
  });

  it("never sends change requests or empty questions to the model", async () => {
    const model = fakeModel({ answer: "Done, budget raised.", citedEvidenceIds: [] });
    const provider = createModelAnswerProvider(model);
    expect((await provider.answer(input("Please increase my budget"))).kind).toBe("boundary");
    expect((await provider.answer(input("   "))).kind).toBe("guidance");
    expect(model.calls).toBe(0);
  });

  it("sends only aggregate numbers and source names as facts", () => {
    const facts = buildModelFacts(input("How many leads?"));
    expect(facts.savedResults?.metrics.map((metric) => metric.key)).toEqual(["qualified_leads", "booked_revenue"]);
    expect(Object.keys(facts)).toEqual(["today", "organizationName", "briefing", "savedResults"]);
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
    const { client, create } = fakeAnthropic({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ answer: "Twelve leads.", citedEvidenceIds: ["dubsado-export-1"] }) }] });
    const draft = await createAnthropicModelClient({ apiKey: "test-key", client }).draftAnswer({ system: "rules", facts: "{}", question: "How many leads?" });
    expect(draft).toEqual({ answer: "Twelve leads.", citedEvidenceIds: ["dubsado-export-1"] });
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
