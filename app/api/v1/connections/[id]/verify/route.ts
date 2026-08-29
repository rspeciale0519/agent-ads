import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { verifyConnection } from "../../../../../../lib/connections/service";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`connection-verify:${context.userId}`, 10, 60_000, context.organizationId);
    return runIdempotentMutation(context, request, "connection.verify", { id }, async () =>
      noStoreJson({ result: await verifyConnection(context, id, correlationId(request)) }));
  } catch (error) {
    return errorResponse(error);
  }
}
