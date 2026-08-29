import { consumeStepUpGrant, stepUpGrantInputSchema } from "../../../../../../lib/auth/step-up";
import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { readOnlyRoleConfirmationSchema } from "../../../../../../lib/connections/contracts";
import { confirmConnectionReadOnlyRole } from "../../../../../../lib/connections/service";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`connection-role-confirm:${context.userId}`, 10, 60_000, context.organizationId);
    const body: unknown = await request.json().catch(() => null);
    const grant = stepUpGrantInputSchema.safeParse(body);
    const evidence = readOnlyRoleConfirmationSchema.safeParse(body);
    if (!grant.success) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    if (!evidence.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    return runIdempotentMutation(context, request, "connection.role.confirm", { id, evidence: evidence.data, grantId: grant.data.grantId }, async () => {
      await consumeStepUpGrant(context, grant.data.grantId, "connection_role_confirm");
      return noStoreJson({ confirmation: await confirmConnectionReadOnlyRole(context, id, evidence.data, correlationId(request)) }, { status: 201 });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
