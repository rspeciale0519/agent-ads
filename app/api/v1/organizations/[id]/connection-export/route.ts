import { consumeStepUpGrant, stepUpGrantInputSchema } from "../../../../../../lib/auth/step-up";
import { contextOrResponse, correlationId, errorResponse, noStoreJson, noStoreResponse, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { exportOrganizationConnectionData } from "../../../../../../lib/organizations/data-lifecycle";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    await enforceRateLimit(`organization-export:${context.userId}`, 5, 60 * 60_000, context.organizationId);
    const parsed = stepUpGrantInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    return runIdempotentMutation(context, request, "organization.connection.export", parsed.data, async () => {
      await consumeStepUpGrant(context, parsed.data.grantId, "organization_export");
      const payload = await exportOrganizationConnectionData(context, correlationId(request));
      return noStoreResponse(new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=account-connections-export.json" } }));
    });
  } catch (error) {
    return errorResponse(error);
  }
}
