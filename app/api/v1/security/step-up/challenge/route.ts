import { stepUpActionSchema } from "../../../../../../lib/connections/contracts";
import { contextOrResponse, errorResponse, noStoreJson, requireSameOrigin } from "../../../../../../lib/api/http";
import { getAssuranceStatus } from "../../../../../../lib/auth/assurance";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { hasPermission, permissionForStepUpAction } from "../../../../../../lib/auth/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    await enforceRateLimit(`mfa-challenge:${context.userId}`, 10, 60_000, context.organizationId);
    const parsed = stepUpActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    const requiredPermission = permissionForStepUpAction(parsed.data.actionClass);
    if (!hasPermission(context.permissions, requiredPermission)) return noStoreJson({ error: "PERMISSION_DENIED" }, { status: 403 });
    const assurance = await getAssuranceStatus(context);
    if (!assurance.authenticated) return noStoreJson({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    return noStoreJson({ actionClass: parsed.data.actionClass, aal: assurance.aal, mfaRequired: assurance.aal !== "aal2", challenge: "Complete the Supabase MFA challenge in this browser, then call verify." });
  } catch (error) {
    return errorResponse(error);
  }
}
