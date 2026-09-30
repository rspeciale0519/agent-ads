import { describe, expect, it, vi } from "vitest";
import { createOpenAiCompatibleModelClient } from "./openai-compatible-model-client";

const draft = { isChangeRequest: false, metricKeys: ["qualified_leads"], nextActionNumbers: [1], missingSources: [] };

// A stand-in for the company's API that returns the given reply.
function fakeFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
const client = (fetchImpl: typeof fetch) => createOpenAiCompatibleModelClient({ provider: "openai", baseUrl: "https://api.openai.com/v1", apiKey: "sk-test-key", model: "gpt-test", fetchImpl });
const prompt = { system: "rules", facts: "{}", question: "How many leads?" };

describe("OpenAI-compatible model adapter", () => {
  it("asks the fixed address for JSON and returns the draft with billed tokens", async () => {
    const fetchImpl = fakeFetch(200, { model: "gpt-test-2026", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(draft) } }], usage: { prompt_tokens: 50, completion_tokens: 10 } });
    const result = await client(fetchImpl).draftAnswer(prompt);
    expect(result).toEqual({ draft, model: "gpt-test-2026", inputTokens: 50, outputTokens: 10, costUsd: null, pricingVersion: null });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-test-key");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("gpt-test");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("returns no draft, but keeps the tokens, for a cut-off, non-JSON, or wrong-shaped reply", async () => {
    for (const choice of [
      { finish_reason: "length", message: { content: JSON.stringify(draft) } },
      { finish_reason: "stop", message: { content: "not json" } },
      { finish_reason: "stop", message: { content: JSON.stringify({ answer: "hi" }) } },
    ]) {
      const result = await client(fakeFetch(200, { choices: [choice], usage: { prompt_tokens: 5, completion_tokens: 1 } })).draftAnswer(prompt);
      expect(result).toMatchObject({ draft: null, inputTokens: 5, outputTokens: 1 });
    }
  });

  it("fails with only the status code when the company rejects the call", async () => {
    await expect(client(fakeFetch(401, { error: { message: "bad key sk-test-key" } })).draftAnswer(prompt)).rejects.toMatchObject({ name: "ModelHttpError", message: "MODEL_HTTP_401" });
  });
});
