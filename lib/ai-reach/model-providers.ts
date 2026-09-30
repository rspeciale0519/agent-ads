// The AI companies an organization can pick for AI Reach. Each has a fixed
// address; people choose a company and a model name, never a custom URL, so
// questions can only go to these known services.
export const AI_MODEL_PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", baseUrl: "https://api.anthropic.com", exampleModel: "claude-opus-5-5" },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", exampleModel: "gpt-4.1-mini" },
  { id: "google", label: "Google (Gemini)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", exampleModel: "gemini-2.5-flash" },
  { id: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1", exampleModel: "mistral-large-latest" },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", exampleModel: "llama-3.3-70b-versatile" },
  { id: "xai", label: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", exampleModel: "grok-3-mini" },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", exampleModel: "deepseek-chat" },
  { id: "together", label: "Together AI", baseUrl: "https://api.together.xyz/v1", exampleModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", exampleModel: "anthropic/claude-sonnet-4.5" },
] as const;

export type AiModelProviderId = (typeof AI_MODEL_PROVIDERS)[number]["id"];

export const AI_MODEL_PROVIDER_IDS = AI_MODEL_PROVIDERS.map((provider) => provider.id) as [AiModelProviderId, ...AiModelProviderId[]];

// Model names are typed by people, so only plain name characters are allowed.
export const AI_MODEL_NAME_PATTERN = /^[A-Za-z0-9._:/@-]{1,200}$/u;

export function aiModelProvider(id: AiModelProviderId) {
  return AI_MODEL_PROVIDERS.find((provider) => provider.id === id)!;
}
