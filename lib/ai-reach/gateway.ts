import type { OrganizationContext } from "../auth/organization-context";
import type { SecretBroker } from "../connections/secrets/secret-broker";
import { readAiModelCredential } from "../organizations/ai-model-settings";
import { createAnthropicModelClient } from "./anthropic-model-client";
import { aiModelProvider, type AiModelProviderId } from "./model-providers";
import { createOpenAiCompatibleModelClient } from "./openai-compatible-model-client";
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

// Builds the adapter for a company the organization chose in Settings.
export function createModelClientFor(choice: { provider: AiModelProviderId; model: string; apiKey: string }) {
  if (choice.provider === "anthropic") return createAnthropicModelClient({ apiKey: choice.apiKey, model: choice.model });
  return createOpenAiCompatibleModelClient({ provider: choice.provider, baseUrl: aiModelProvider(choice.provider).baseUrl, apiKey: choice.apiKey, model: choice.model });
}

// The organization's own model when it saved one in Settings; otherwise the
// platform setting above. If the saved key cannot be read, rule-based answers
// are used rather than another company's model.
export async function getAnswerProviderForOrganization(context: OrganizationContext, getBroker: () => SecretBroker, env: Record<string, string | undefined> = process.env): Promise<AiReachAnswerProvider> {
  let choice;
  try {
    choice = await readAiModelCredential(context, getBroker);
  } catch (error) {
    console.warn(`AI Reach model settings could not be read: ${error instanceof Error ? error.name : "unknown error"}`);
    return deterministicAnswerProvider;
  }
  return choice ? createModelAnswerProvider(createModelClientFor(choice)) : getAnswerProvider(env);
}
