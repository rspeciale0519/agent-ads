import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const withTenantContextMock = vi.hoisted(() => vi.fn());
const dashboardMock = vi.hoisted(() => vi.fn());
const snapshotMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/organization-context", () => ({ withTenantContext: withTenantContextMock }));
vi.mock("../dashboard/dashboard-service", () => ({ getDashboardData: dashboardMock }));
vi.mock("./evidence-store", () => ({ readAiReachEvidence: snapshotMock }));
// Keep the real error type and permission check without loading provider adapters.
vi.mock("../connections/service", () => {
  class ConnectionServiceError extends Error {
    constructor(readonly code: string, readonly status = 400) { super(code); }
  }
  return {
    ConnectionServiceError,
    requireConnectionPermission: (context: { permissions: string[] }, permission: string) => {
      if (!context.permissions.includes(permission)) throw new ConnectionServiceError("PERMISSION_DENIED", 403);
    },
  };
});

import { askAiReach, readLatestConversation } from "./chat-service";
import type { AiReachAnswerProvider } from "./gateway";

const organizationId = "11111111-1111-4111-8111-111111111111";
const conversationId = "66666666-6666-4666-8666-666666666666";
const context = {
  organizationId,
  organizationName: "Test organization",
  userId: "22222222-2222-4222-8222-222222222222",
  authSubject: "33333333-3333-4333-8333-333333333333",
  email: "test@example.test",
  role: "member" as const,
  permissions: ["connections.view"],
  sessionId: "session-1",
  assurance: "aal1" as const,
};
const provider: AiReachAnswerProvider = {
  name: "test",
  answer: vi.fn(async () => ({ text: "Twelve leads.", kind: "evidence" as const, citations: [{ evidenceId: "e-1", provider: "dubsado", method: "authorized_export", collectedAt: "2026-08-30T10:00:00.000Z" }] })),
};

function mockDatabase(existingConversation: { id: string } | null = null) {
  let sequence = 0;
  const models = {
    aiReachConversation: {
      findFirst: vi.fn().mockResolvedValue(existingConversation),
      create: vi.fn().mockResolvedValue({ id: conversationId }),
    },
    aiReachMessage: {
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: `message-${++sequence}`, answerKind: null, citations: [], createdAt: new Date("2026-08-30T12:00:00.000Z"), ...data })),
      findMany: vi.fn(),
    },
  };
  withTenantContextMock.mockImplementation(async (_context, callback) => callback(models));
  return models;
}

function mockAnswerInputs() {
  dashboardMock.mockResolvedValue({ organization: { id: organizationId, name: "Test organization", role: "member" }, onboarding: { status: "submitted", businessName: null, submittedAt: null }, connections: [], verifiedResourceCount: 0 });
  snapshotMock.mockResolvedValue({ snapshot: null, uploadMaxAgeHours: 168 });
}

afterEach(() => vi.clearAllMocks());

describe("AI Reach chat service", () => {
  it("starts a conversation owned by the caller and saves the question and cited answer", async () => {
    mockAnswerInputs();
    const models = mockDatabase();
    const result = await askAiReach(context, { question: "How many leads?" }, provider);
    expect(models.aiReachConversation.create.mock.calls[0][0].data).toEqual({ organizationId, userId: context.userId });
    expect(result.conversationId).toBe(conversationId);
    expect(result.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(result.messages[1]).toMatchObject({ content: "Twelve leads.", kind: "evidence" });
    expect(result.messages[1].citations[0].evidenceId).toBe("e-1");
    // The answer is stamped after the question so reloads keep their order.
    const [asked, answered] = models.aiReachMessage.create.mock.calls.map((call) => call[0].data.createdAt.getTime());
    expect(answered).toBeGreaterThan(asked);
  });

  it("saves the model usage record with the answer, and none for rule-based answers", async () => {
    mockAnswerInputs();
    const models = mockDatabase();
    const modelUsage = { provider: "anthropic", model: "claude-opus-5-5", status: "accepted" as const, promptVersion: "router-2026-09-30", inputTokens: 900, outputTokens: 40, costUsd: 0.0044, pricingVersion: "anthropic-2026-09" };
    const modelProvider: AiReachAnswerProvider = { name: "model", answer: vi.fn(async () => ({ text: "Answer.", kind: "guidance" as const, citations: [], modelUsage })) };
    await askAiReach(context, { question: "How many leads?" }, modelProvider);
    expect(models.aiReachMessage.create.mock.calls[1][0].data.modelUsage).toEqual(modelUsage);
    // The question row never carries usage.
    expect(models.aiReachMessage.create.mock.calls[0][0].data.modelUsage).toBeUndefined();

    const ruleModels = mockDatabase();
    await askAiReach(context, { question: "How many leads?" }, provider);
    expect(ruleModels.aiReachMessage.create.mock.calls[1][0].data.modelUsage).toBe(Prisma.DbNull);
  });

  it("adds to an existing conversation the caller can see", async () => {
    mockAnswerInputs();
    const models = mockDatabase({ id: conversationId });
    await askAiReach(context, { question: "And revenue?", conversationId }, provider);
    expect(models.aiReachConversation.create).not.toHaveBeenCalled();
    expect(models.aiReachMessage.create.mock.calls[0][0].data.conversationId).toBe(conversationId);
  });

  it("refuses a conversation the caller cannot see", async () => {
    mockAnswerInputs();
    const models = mockDatabase(null);
    await expect(askAiReach(context, { question: "Hi", conversationId }, provider)).rejects.toMatchObject({ code: "AI_REACH_CONVERSATION_NOT_FOUND", status: 404 });
    expect(models.aiReachMessage.create).not.toHaveBeenCalled();
    // The answer (and any billable model call) never runs for it.
    expect(provider.answer).not.toHaveBeenCalled();
  });

  it("refuses a question containing a password before answering or saving it", async () => {
    await expect(askAiReach(context, { question: "my password: hunter2hunter2" }, provider)).rejects.toMatchObject({ code: "AI_REACH_QUESTION_CONTAINS_SECRET", status: 422 });
    expect(provider.answer).not.toHaveBeenCalled();
    expect(withTenantContextMock).not.toHaveBeenCalled();
  });

  it("requires the view permission", async () => {
    await expect(askAiReach({ ...context, permissions: [] }, { question: "Hi" }, provider)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("rejects empty and overlong questions", async () => {
    await expect(askAiReach(context, { question: "   " }, provider)).rejects.toThrow();
    await expect(askAiReach(context, { question: "x".repeat(501) }, provider)).rejects.toThrow();
  });

  it("returns the newest conversation's messages oldest first", async () => {
    const models = mockDatabase({ id: conversationId });
    models.aiReachMessage.findMany.mockResolvedValue([
      { id: "m-2", role: "assistant", content: "Answer", answerKind: "guidance", citations: [], createdAt: new Date("2026-08-30T12:00:01.000Z") },
      { id: "m-1", role: "user", content: "Question", answerKind: null, citations: [], createdAt: new Date("2026-08-30T12:00:00.000Z") },
    ]);
    const conversation = await readLatestConversation(context);
    expect(conversation?.messages.map((message) => message.id)).toEqual(["m-1", "m-2"]);
    expect(models.aiReachConversation.findFirst.mock.calls[0][0].where).toEqual({ organizationId, userId: context.userId });
  });
});
