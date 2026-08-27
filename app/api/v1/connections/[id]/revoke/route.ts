import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { consumeStepUpGrant, stepUpGrantInputSchema } from "../../../../../../lib/auth/step-up";
import { revokeConnection } from "../../../../../../lib/connections/service";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`connection-revoke:${context.userId}`, 10, 60_000, context.organizationId);
    const parsed = stepUpGrantInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    return runIdempotentMutation(context, request, "connection.revoke", { id, grantId: parsed.data.grantId }, async () => {
      await consumeStepUpGrant(context, parsed.data.grantId, "connection_revoke");
      return noStoreJson({ result: await revokeConnection(context, id, correlationId(request)) });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
