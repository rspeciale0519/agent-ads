import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { verifyManualInvitation } from "../../../../../../lib/connections/manual-lifecycle";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`manual-route-verify:${context.userId}`, 10, 60_000, context.organizationId);
    const body: unknown = await request.json().catch(() => null);
    return runIdempotentMutation(context, request, "manual.invitation.verify", { id, input: body }, async () =>
      noStoreJson({ invitation: await verifyManualInvitation(context, id, body, correlationId(request)) }));
  } catch (error) {
    return errorResponse(error);
  }
}
