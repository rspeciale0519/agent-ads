import { stepUpActionSchema } from "../../../../../../lib/connections/contracts";
import { contextOrResponse, errorResponse, noStoreJson, requireSameOrigin } from "../../../../../../lib/api/http";
import { getAssuranceStatus, requireAal2 } from "../../../../../../lib/auth/assurance";
import { issueStepUpGrant } from "../../../../../../lib/auth/step-up";
import { hasPermission, permissionForStepUpAction } from "../../../../../../lib/auth/permissions";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    await enforceRateLimit(`mfa-verify:${context.userId}`, 10, 60_000, context.organizationId);
    const parsed = stepUpActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    const requiredPermission = permissionForStepUpAction(parsed.data.actionClass);
    if (!hasPermission(context.permissions, requiredPermission)) return noStoreJson({ error: "PERMISSION_DENIED" }, { status: 403 });
    const assurance = await getAssuranceStatus(context);
    requireAal2(assurance);
    return runIdempotentMutation(context, request, "security.step-up.verify", parsed.data, async () => {
      const grant = await issueStepUpGrant({ ...context, sessionId: assurance.sessionId, assurance: assurance.aal }, parsed.data.actionClass);
      return noStoreJson({ grantId: grant.grantId, expiresAt: grant.expiresAt.toISOString() });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
