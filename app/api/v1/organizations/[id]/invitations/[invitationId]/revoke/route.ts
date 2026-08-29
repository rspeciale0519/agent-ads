import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../../../lib/api/rate-limit";
import { consumeStepUpGrant, stepUpGrantInputSchema } from "../../../../../../../../lib/auth/step-up";
import { revokeOrganizationInvitation } from "../../../../../../../../lib/organizations/invitations";
import { runIdempotentMutation } from "../../../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  try {
    requireSameOrigin(request);
    const { id: rawId, invitationId: rawInvitationId } = await params;
    const id = uuidPathParam(rawId);
    const invitationId = uuidPathParam(rawInvitationId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    await enforceRateLimit(`organization-invite-revoke:${context.userId}`, 10, 60_000, context.organizationId);
    const parsed = stepUpGrantInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    return runIdempotentMutation(context, request, "organization.invitation.revoke", { invitationId, grantId: parsed.data.grantId }, async () => {
      await consumeStepUpGrant(context, parsed.data.grantId, "membership_manage");
      return noStoreJson({ invitation: await revokeOrganizationInvitation(context, invitationId, correlationId(request)) });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
