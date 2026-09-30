import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { modelAnswerDraftSchema, type AiReachModelClient } from "./model-answer";

const draftSchema = z.object({ isChangeRequest: z.boolean(), metricKeys: z.array(z.string()), nextActionNumbers: z.array(z.number().int()), missingSources: z.array(z.string()) });

export const defaultAnthropicModel = "claude-opus-5-5";

// Anthropic list prices in USD per million tokens. Update the version with
// any price change; a served model not listed here is saved with no cost.
export const anthropicPricingVersion = "anthropic-2026-09";
const pricesPerMillionTokens: Array<{ model: string; input: number; output: number }> = [
  { model: "claude-opus-5-5", input: 4, output: 20 },
  { model: "claude-sonnet-5-5", input: 2, output: 10 },
  { model: "claude-opus-5", input: 5, output: 25 },
  { model: "claude-fable-5-1", input: 10, output: 50 },
];

// The call's cost from its billed tokens, or null for an unlisted model.
// Dated model ids ("claude-opus-5-5-20260901") match their base name.
export function anthropicCallCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const price = pricesPerMillionTokens.find((entry) => model === entry.model || model.startsWith(`${entry.model}-2`));
  if (!price) return null;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

// Anthropic adapter for AI Reach answers. It only drafts; model-answer.ts
// checks the draft before anyone sees it.
export function createAnthropicModelClient(options: { apiKey: string; model?: string; client?: Anthropic }): AiReachModelClient {
  // A short timeout and one retry keep the chat responsive; on failure the
  // caller falls back to the deterministic answer.
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey, timeout: 20_000, maxRetries: 1 });
  const model = options.model ?? defaultAnthropicModel;
  return {
    provider: "anthropic",
    model,
    draftAnswer: async ({ system, facts, question }) => {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: `Facts (JSON):\n${facts}\n\nCustomer question:\n${question}` }],
        // Low effort suits routing a short question; the reply must match the draft schema.
        output_config: { effort: "low", format: { type: "json_schema", schema: modelAnswerDraftSchema } },
        // If a safety check declines, the API retries on a suitable fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      // Billed tokens are kept even when the draft is unusable.
      // The served model is recorded, since a fallback may answer instead.
      const tokens = {
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        costUsd: anthropicCallCostUsd(response.model, response.usage.input_tokens, response.usage.output_tokens),
        pricingVersion: anthropicPricingVersion,
      };
      if (response.stop_reason !== "end_turn") return { draft: null, ...tokens };
      const text = response.content.find((block) => block.type === "text");
      if (!text || text.type !== "text") return { draft: null, ...tokens };
      let json: unknown;
      try {
        json = JSON.parse(text.text);
      } catch {
        return { draft: null, ...tokens };
      }
      const parsed = draftSchema.safeParse(json);
      return { draft: parsed.success ? parsed.data : null, ...tokens };
    },
  };
}
