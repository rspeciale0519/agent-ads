import { z } from "zod";
import { consumeStepUpGrant } from "../../../../../../lib/auth/step-up";
import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { offboardOrganization } from "../../../../../../lib/organizations/data-lifecycle";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

const requestSchema = z.object({ grantId: z.string().uuid(), confirmation: z.string().trim().min(1).max(300) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    await enforceRateLimit(`organization-offboard:${context.userId}`, 10, 60 * 60_000, context.organizationId);
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    return runIdempotentMutation(context, request, "organization.offboard", parsed.data, async () => {
      await consumeStepUpGrant(context, parsed.data.grantId, "organization_offboard");
      return noStoreJson({ result: await offboardOrganization(context, parsed.data.confirmation, correlationId(request)) });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
