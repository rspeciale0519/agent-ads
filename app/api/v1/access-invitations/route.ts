import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin } from "../../../../lib/api/http";
import { createManualInvitation, listManualInvitations } from "../../../../lib/connections/manual-lifecycle";
import { enforceRateLimit } from "../../../../lib/api/rate-limit";
import { runIdempotentMutation } from "../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    await enforceRateLimit(`manual-route-create:${context.userId}`, 20, 60_000, context.organizationId);
    return noStoreJson({ invitations: await listManualInvitations(context) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const body: unknown = await request.json().catch(() => null);
    return runIdempotentMutation(context, request, "manual.invitation.create", body, async () =>
      noStoreJson({ invitation: await createManualInvitation(context, body, correlationId(request)) }, { status: 201 }));
  } catch (error) {
    return errorResponse(error);
  }
}
