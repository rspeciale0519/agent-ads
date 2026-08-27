import { z } from "zod";
import { errorResponse, noStoreJson, requireSameOrigin } from "../../../../../lib/api/http";
import { acceptOrganizationInvitation } from "../../../../../lib/organizations/invitations";
import { enforceRateLimit, requestRateLimitKey } from "../../../../../lib/api/rate-limit";
import { mutationMetadata } from "../../../../../lib/api/idempotency";

export const runtime = "nodejs";
const codeSchema = z.object({ code: z.string().trim().min(20).max(200) });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = codeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    await enforceRateLimit(requestRateLimitKey(request, "invitation-accept"), 10, 15 * 60_000);
    return noStoreJson({ organization: await acceptOrganizationInvitation(parsed.data.code, mutationMetadata(request)) });
  } catch (error) {
    return errorResponse(error);
  }
}
