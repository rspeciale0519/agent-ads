import { contextOrResponse, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { requireConnectionPermission } from "../../../../../../lib/connections/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    requireConnectionPermission(context, "connections.secrets.rotate");
    const { id } = await params;
    uuidPathParam(id);
    await enforceRateLimit(`disabled-secret-route:${context.userId}`, 10, 60_000, context.organizationId);
    return noStoreJson({ error: "PROVIDER_SECRET_ROUTE_DISABLED", message: "This release does not accept generic provider secrets. Use the provider authorization or approved invitation route." }, { status: 403 });
  } catch (error) {
    return errorResponse(error);
  }
}
