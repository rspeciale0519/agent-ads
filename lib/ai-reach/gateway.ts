import { answerFromEvidence, type AiReachAnswer, type AiReachAnswerInput } from "./grounded-answer";

// The one place AI Reach turns a question into an answer. A language-model
// provider can replace the deterministic one later without changing callers,
// as long as it returns the same shape and cites only saved evidence.
export type AiReachAnswerProvider = {
  name: string;
  answer(input: AiReachAnswerInput): Promise<AiReachAnswer>;
};

export const deterministicAnswerProvider: AiReachAnswerProvider = {
  name: "deterministic-1.0.0",
  answer: async (input) => answerFromEvidence(input),
};

// No model provider is approved for the pilot yet, so this always returns the
// deterministic provider.
export function getAnswerProvider(): AiReachAnswerProvider {
  return deterministicAnswerProvider;
}
