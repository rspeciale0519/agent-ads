import { contextOrResponse, errorResponse, noStoreJson, requireSameOrigin } from "../../../../../lib/api/http";
import { runIdempotentMutation } from "../../../../../lib/api/idempotency";
import { enforceRateLimit } from "../../../../../lib/api/rate-limit";
import { askAiReach, readLatestConversation } from "../../../../../lib/ai-reach/chat-service";

export const runtime = "nodejs";

// Returns the caller's newest saved AI Reach conversation.
export async function GET() {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    return noStoreJson({ conversation: await readLatestConversation(context) });
  } catch (error) {
    return errorResponse(error);
  }
}

// Asks AI Reach one question and saves the question and answer.
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    await enforceRateLimit(`ai-reach-chat:${context.userId}`, 30, 60_000, context.organizationId);
    const body = await request.json().catch(() => null);
    return runIdempotentMutation(context, request, "ai_reach.chat_ask", { body }, async () =>
      noStoreJson({ result: await askAiReach(context, body) }));
  } catch (error) {
    return errorResponse(error);
  }
}
