import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../lib/api/rate-limit";
import { requestPatchSchema } from "../../../../../lib/connections/contracts";
import { updateConnectionRequest } from "../../../../../lib/connections/service";
import { runIdempotentMutation } from "../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`connection-request-update:${context.userId}`, 60, 60_000, context.organizationId);
    const parsed = requestPatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    return runIdempotentMutation(context, request, "connection.request.update", { id, input: parsed.data }, async () => {
      const updated = await updateConnectionRequest(context, id, parsed.data, correlationId(request));
      return noStoreJson({ request: { id: updated.id, state: updated.state } });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
