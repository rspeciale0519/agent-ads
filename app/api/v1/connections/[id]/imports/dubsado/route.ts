import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../../lib/api/http";
import { runIdempotentMutation } from "../../../../../../../lib/api/idempotency";
import { enforceRateLimit } from "../../../../../../../lib/api/rate-limit";
import { importDubsadoExport } from "../../../../../../../lib/ai-reach/dubsado-import";

export const runtime = "nodejs";

// Imports one approved Dubsado export into a read-only AI Reach evidence snapshot.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`dubsado-import:${context.userId}`, 5, 60_000, context.organizationId);
    const body = await request.json().catch(() => null);
    return runIdempotentMutation(context, request, "ai_reach.dubsado_import", { id, body }, async () =>
      noStoreJson({ result: await importDubsadoExport(context, id, body, correlationId(request)) }));
  } catch (error) {
    return errorResponse(error);
  }
}
