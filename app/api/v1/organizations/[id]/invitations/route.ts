import { z } from "zod";
import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { consumeStepUpGrant } from "../../../../../../lib/auth/step-up";
import { createOrganizationInvitation, listOrganizationInvitations } from "../../../../../../lib/organizations/invitations";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";
const invitationInput = z.object({ email: z.string().email().max(254), role: z.enum(["member", "operator", "administrator"]), grantId: z.string().uuid().optional() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    return noStoreJson({ invitations: await listOrganizationInvitations(context) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    await enforceRateLimit(`organization-invite:${context.userId}`, 10, 60 * 60_000, context.organizationId);
    const parsed = invitationInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    if (!parsed.data.grantId) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    return runIdempotentMutation(context, request, "organization.invitation.create", parsed.data, async () => {
      await consumeStepUpGrant(context, parsed.data.grantId!, "membership_manage");
      return noStoreJson({ invitation: await createOrganizationInvitation(context, { email: parsed.data.email, role: parsed.data.role }, correlationId(request)) }, { status: 201 });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
