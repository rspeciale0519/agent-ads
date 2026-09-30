import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { readOrganizationSettings, updateOrganizationSettings } from "../../../../../../lib/organizations/settings";

export const runtime = "nodejs";

// Returns the organization's settings, with defaults for anything never saved.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const context = await contextOrResponse(uuidPathParam(rawId));
    if (context instanceof Response) return context;
    return noStoreJson({ settings: await readOrganizationSettings(context) });
  } catch (error) {
    return errorResponse(error);
  }
}

// Saves new settings (owners and administrators with current MFA only).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    await enforceRateLimit(`organization-settings:${context.userId}`, 20, 60_000, context.organizationId);
    const body = await request.json().catch(() => null);
    return runIdempotentMutation(context, request, "organization.settings.update", { id, body }, async () =>
      noStoreJson({ settings: await updateOrganizationSettings(context, body, correlationId(request)) }));
  } catch (error) {
    return errorResponse(error);
  }
}
