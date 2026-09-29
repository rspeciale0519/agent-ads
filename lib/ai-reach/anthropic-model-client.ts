import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { modelAnswerDraftSchema, type AiReachModelClient } from "./model-answer";

const draftSchema = z.object({ isChangeRequest: z.boolean(), metricKeys: z.array(z.string()), explanation: z.string() });

export const defaultAnthropicModel = "claude-opus-5-5";

// Anthropic adapter for AI Reach answers. It only drafts; model-answer.ts
// checks the draft before anyone sees it.
export function createAnthropicModelClient(options: { apiKey: string; model?: string; client?: Anthropic }): AiReachModelClient {
  // A short timeout and one retry keep the chat responsive; on failure the
  // caller falls back to the deterministic answer.
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey, timeout: 20_000, maxRetries: 1 });
  const model = options.model ?? defaultAnthropicModel;
  return {
    name: `anthropic:${model}`,
    draftAnswer: async ({ system, facts, question }) => {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: `Facts (JSON):\n${facts}\n\nCustomer question:\n${question}` }],
        // Low effort suits short chat answers; the reply must match the draft schema.
        output_config: { effort: "low", format: { type: "json_schema", schema: modelAnswerDraftSchema } },
        // If a safety check declines, the API retries on a suitable fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (response.stop_reason !== "end_turn") return null;
      const text = response.content.find((block) => block.type === "text");
      if (!text || text.type !== "text") return null;
      const parsed = draftSchema.safeParse(JSON.parse(text.text));
      return parsed.success ? parsed.data : null;
    },
  };
}
