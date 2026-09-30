import { createAnthropicModelClient } from "./anthropic-model-client";
import { answerFromEvidence, type AiReachAnswer, type AiReachAnswerInput } from "./grounded-answer";
import { createModelAnswerProvider } from "./model-answer";

// The one place AI Reach turns a question into an answer. Every provider
// returns the same shape and may cite only saved evidence.
export type AiReachAnswerProvider = {
  name: string;
  answer(input: AiReachAnswerInput): Promise<AiReachAnswer>;
};

export const deterministicAnswerProvider: AiReachAnswerProvider = {
  name: "deterministic-1.0.0",
  answer: async (input) => answerFromEvidence(input),
};

// Picks the answer provider from settings. A language model is used only
// when AI_REACH_MODEL_PROVIDER names a supported vendor and its key is set;
// otherwise, or with the setting removed, the deterministic answers apply.
export function getAnswerProvider(env: Record<string, string | undefined> = process.env): AiReachAnswerProvider {
  if (env.AI_REACH_MODEL_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY) {
    return createModelAnswerProvider(createAnthropicModelClient({ apiKey: env.ANTHROPIC_API_KEY, model: env.AI_REACH_MODEL || undefined }));
  }
  return deterministicAnswerProvider;
}
