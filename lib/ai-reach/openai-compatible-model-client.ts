import { z } from "zod";
import { modelAnswerDraftSchema, type AiReachModelClient } from "./model-answer";

const draftSchema = z.object({ isChangeRequest: z.boolean(), metricKeys: z.array(z.string()), nextActionNumbers: z.array(z.number().int()), missingSources: z.array(z.string()) });

// The reply shape most AI companies share (OpenAI's "chat completions").
const responseSchema = z.object({
  model: z.string().optional(),
  choices: z.array(z.object({ finish_reason: z.string().nullable().optional(), message: z.object({ content: z.string().nullable().optional() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() }).optional(),
});

// Adapter for companies that offer an OpenAI-style API (OpenAI, Gemini,
// Mistral, Groq, xAI, DeepSeek, Together, OpenRouter). It asks for a JSON
// reply, and model-answer.ts checks the draft before anyone sees it.
// Prices differ by company and change often, so no cost is computed here;
// billed tokens are still recorded.
export function createOpenAiCompatibleModelClient(options: { provider: string; baseUrl: string; apiKey: string; model: string; fetchImpl?: typeof fetch; timeoutMs?: number }): AiReachModelClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    provider: options.provider,
    model: options.model,
    draftAnswer: async ({ system, facts, question }) => {
      const response = await fetchImpl(`${options.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
        body: JSON.stringify({
          model: options.model,
          messages: [
            // The schema is spelled out because not every company enforces it.
            { role: "system", content: `${system}\nReply with one JSON object that matches this JSON schema and nothing else:\n${JSON.stringify(modelAnswerDraftSchema)}` },
            { role: "user", content: `Facts (JSON):\n${facts}\n\nCustomer question:\n${question}` },
          ],
          response_format: { type: "json_object" },
          max_tokens: 1000,
        }),
        // A short timeout keeps the chat responsive; on failure the caller
        // falls back to the rule-based answer.
        signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
      });
      // Only the status is kept; the body could echo the question or key.
      if (!response.ok) throw Object.assign(new Error(`MODEL_HTTP_${response.status}`), { name: "ModelHttpError" });
      const parsed = responseSchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) return { draft: null, inputTokens: null, outputTokens: null };
      const tokens = {
        model: parsed.data.model ?? options.model,
        inputTokens: parsed.data.usage?.prompt_tokens ?? null,
        outputTokens: parsed.data.usage?.completion_tokens ?? null,
        costUsd: null,
        pricingVersion: null,
      };
      const choice = parsed.data.choices[0];
      if (choice.finish_reason && choice.finish_reason !== "stop") return { draft: null, ...tokens };
      let json: unknown;
      try {
        json = JSON.parse(choice.message.content ?? "");
      } catch {
        return { draft: null, ...tokens };
      }
      const draft = draftSchema.safeParse(json);
      return { draft: draft.success ? draft.data : null, ...tokens };
    },
  };
}
