import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { resourceSelectionSchema } from "../../../../../../lib/connections/contracts";
import { getConnectionDetail, selectConnectionResources } from "../../../../../../lib/connections/service";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const connection = await getConnectionDetail(context, id);
    return noStoreJson({ resources: connection.resources });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`connection-resources:${context.userId}`, 30, 60_000, context.organizationId);
    const parsed = resourceSelectionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    return runIdempotentMutation(context, request, "connection.resources.select", { id, resourceIds: parsed.data.resourceIds }, async () =>
      noStoreJson({ result: await selectConnectionResources(context, id, parsed.data.resourceIds, correlationId(request)) }));
  } catch (error) {
    return errorResponse(error);
  }
}
