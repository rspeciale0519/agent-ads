import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { submitConnectionRequest } from "../../../../../../lib/connections/service";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`connection-request-submit:${context.userId}`, 30, 60_000, context.organizationId);
    return runIdempotentMutation(context, request, "connection.request.submit", { id }, async () => {
      const updated = await submitConnectionRequest(context, id, correlationId(request));
      return noStoreJson({ request: { id: updated.id, state: updated.state } });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
