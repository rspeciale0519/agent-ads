import { z } from "zod";
import { contextOrResponse, errorResponse, noStoreJson, requireSameOrigin } from "../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../lib/api/rate-limit";
import { runIdempotentMutation } from "../../../../../lib/api/idempotency";

export const runtime = "nodejs";
const selectionSchema = z.object({ organizationId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = selectionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    const context = await contextOrResponse(parsed.data.organizationId);
    if (context instanceof Response) return context;
    await enforceRateLimit(`organization-select:${context.userId}`, 30, 60_000, context.organizationId);
    return runIdempotentMutation(context, request, "organization.select", parsed.data, async () => {
      const response = noStoreJson({ organization: { id: context.organizationId, name: context.organizationName } });
      response.cookies.set("miodio_organization", context.organizationId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      return response;
    });
  } catch (error) {
    return errorResponse(error);
  }
}
