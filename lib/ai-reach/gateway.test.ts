import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganizationContext } from "../auth/organization-context";

// Stand-in for the saved AI model choice.
const credentialMock = vi.hoisted(() => vi.fn());
vi.mock("../organizations/ai-model-settings", () => ({ readAiModelCredential: credentialMock }));

import { getAnswerProviderForOrganization } from "./gateway";

const context = { organizationId: "00000000-0000-4000-8000-000000000001" } as OrganizationContext;
const getBroker = vi.fn();

afterEach(() => vi.clearAllMocks());

describe("choosing the answer provider for an organization", () => {
  it("uses the organization's saved company and model", async () => {
    credentialMock.mockResolvedValue({ provider: "openai", model: "gpt-test", apiKey: "sk-test" });
    expect((await getAnswerProviderForOrganization(context, getBroker, {})).name).toBe("model:openai:gpt-test");
    credentialMock.mockResolvedValue({ provider: "anthropic", model: "claude-sonnet-5-5", apiKey: "sk-ant-test" });
    expect((await getAnswerProviderForOrganization(context, getBroker, {})).name).toBe("model:anthropic:claude-sonnet-5-5");
  });

  it("falls back to the platform setting when nothing is saved", async () => {
    credentialMock.mockResolvedValue(null);
    expect((await getAnswerProviderForOrganization(context, getBroker, {})).name).toBe("deterministic-1.0.0");
    expect((await getAnswerProviderForOrganization(context, getBroker, { AI_REACH_MODEL_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "platform-key" })).name).toBe("model:anthropic:claude-opus-5-5");
  });

  it("uses rule-based answers, not another company's model, when the saved key cannot be read", async () => {
    credentialMock.mockRejectedValue(Object.assign(new Error("AI_MODEL_KEY_UNREADABLE"), { name: "AiModelKeyUnreadable" }));
    const provider = await getAnswerProviderForOrganization(context, getBroker, { AI_REACH_MODEL_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "platform-key" });
    expect(provider.name).toBe("deterministic-1.0.0");
  });
});
