import { connectionRequestInputSchema } from "../../../../lib/connections/contracts";
import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin } from "../../../../lib/api/http";
import { createConnectionRequest, listConnectionRequests } from "../../../../lib/connections/service";
import { enforceRateLimit } from "../../../../lib/api/rate-limit";
import { runIdempotentMutation } from "../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    return noStoreJson({ requests: await listConnectionRequests(context) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    await enforceRateLimit(`connection-request-create:${context.userId}`, 30, 60_000, context.organizationId);
    const parsed = connectionRequestInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    return runIdempotentMutation(context, request, "connection.request.create", parsed.data, async () => {
      const created = await createConnectionRequest(context, parsed.data, correlationId(request));
      return noStoreJson({ request: { id: created.id, state: created.state } }, { status: 201 });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
