import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { ConnectionServiceError, requireConnectionPermission } from "../connections/service";
import { getDashboardData } from "../dashboard/dashboard-service";
import { findSecretPattern } from "../security/secret-material";
import { buildAiReachBriefing } from "./briefing";
import { readLatestEvidenceSnapshot } from "./evidence-store";
import { getAnswerProvider, type AiReachAnswerProvider } from "./gateway";
import type { AiReachAnswer, AiReachCitation } from "./grounded-answer";

export const askInputSchema = z.object({
  question: z.string().trim().min(1).max(500),
  conversationId: z.string().uuid().optional(),
}).strict();

export type AiReachChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind: AiReachAnswer["kind"] | null;
  citations: AiReachCitation[];
  createdAt: string;
};

const citationListSchema = z.array(z.object({ evidenceId: z.string(), provider: z.string(), method: z.string(), collectedAt: z.string() }));

function toChatMessage(row: { id: string; role: string; content: string; answerKind: string | null; citations: Prisma.JsonValue; createdAt: Date }): AiReachChatMessage {
  const citations = citationListSchema.safeParse(row.citations);
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    kind: (row.answerKind as AiReachAnswer["kind"] | null) ?? null,
    citations: citations.success ? citations.data : [],
    createdAt: row.createdAt.toISOString(),
  };
}

// Answers one question from this organization's saved evidence and saves the
// question and answer to the caller's own conversation. A question that looks
// like it contains a password or token is refused before anything is stored.
export async function askAiReach(context: OrganizationContext, input: unknown, provider: AiReachAnswerProvider = getAnswerProvider()) {
  requireConnectionPermission(context, "connections.view");
  const parsed = askInputSchema.parse(input);
  if (findSecretPattern(parsed.question)) throw new ConnectionServiceError("AI_REACH_QUESTION_CONTAINS_SECRET", 422);

  const [dashboard, snapshot] = await Promise.all([getDashboardData(context), readLatestEvidenceSnapshot(context)]);
  const briefing = buildAiReachBriefing({ ...dashboard, evidenceSnapshot: snapshot });
  const answer = await provider.answer({ question: parsed.question, organizationName: context.organizationName, briefing, snapshot });

  return withTenantContext(context, async (tx) => {
    // Row-level security only returns a conversation this user owns here.
    const existing = parsed.conversationId
      ? await tx.aiReachConversation.findFirst({ where: { id: parsed.conversationId, organizationId: context.organizationId }, select: { id: true } })
      : null;
    if (parsed.conversationId && !existing) throw new ConnectionServiceError("AI_REACH_CONVERSATION_NOT_FOUND", 404);
    const conversation = existing ?? await tx.aiReachConversation.create({
      data: { organizationId: context.organizationId, userId: context.userId },
      select: { id: true },
    });
    // Both rows are written in one transaction, where the database default
    // would give them the same timestamp. Set them explicitly, a millisecond
    // apart, so the question always sorts before its answer.
    const askedAt = new Date();
    const answeredAt = new Date(askedAt.getTime() + 1);
    const userMessage = await tx.aiReachMessage.create({
      data: { organizationId: context.organizationId, conversationId: conversation.id, role: "user", content: parsed.question, createdAt: askedAt },
    });
    const assistantMessage = await tx.aiReachMessage.create({
      data: { organizationId: context.organizationId, conversationId: conversation.id, role: "assistant", content: answer.text, answerKind: answer.kind, citations: answer.citations as Prisma.InputJsonArray, modelUsage: answer.modelUsage ?? Prisma.DbNull, createdAt: answeredAt },
    });
    return { conversationId: conversation.id, messages: [toChatMessage(userMessage), toChatMessage(assistantMessage)] };
  });
}

const historyLimit = 40;

// Returns the caller's newest conversation with its latest messages, oldest first.
export async function readLatestConversation(context: OrganizationContext) {
  return withTenantContext(context, async (tx) => {
    const conversation = await tx.aiReachConversation.findFirst({
      where: { organizationId: context.organizationId, userId: context.userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (!conversation) return null;
    const rows = await tx.aiReachMessage.findMany({
      where: { organizationId: context.organizationId, conversationId: conversation.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: historyLimit,
    });
    return { conversationId: conversation.id, messages: rows.reverse().map(toChatMessage) };
  });
}
