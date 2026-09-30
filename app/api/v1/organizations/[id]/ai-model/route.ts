import { z } from "zod";
import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { hashIdempotencyValue, runIdempotentMutation } from "../../../../../../lib/api/idempotency";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { consumeStepUpGrant } from "../../../../../../lib/auth/step-up";
import { getSecretBroker } from "../../../../../../lib/connections/secrets/supabase-vault";
import { readAiModelSettings, removeAiModelSettings, saveAiModelSettings } from "../../../../../../lib/organizations/ai-model-settings";

export const runtime = "nodejs";

// Every change needs a fresh MFA step-up grant for this action.
const grantSchema = z.object({ grantId: z.string().uuid() });

// Returns the saved company, model, and last four key characters (never the key).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const context = await contextOrResponse(uuidPathParam(rawId));
    if (context instanceof Response) return context;
    return noStoreJson({ settings: await readAiModelSettings(context) });
  } catch (error) {
    return errorResponse(error);
  }
}

// Saves the company, model, and (optionally) a new API key.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    await enforceRateLimit(`ai-model-settings:${context.userId}`, 10, 60_000, context.organizationId);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const grant = grantSchema.safeParse(body);
    if (!grant.success) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    // Everything but the grant is the settings input (validated in the service).
    const settings = Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => key !== "grantId"));
    // The key is only ever hashed (keyed HMAC) for replay protection.
    const fingerprint = { id, grantId: grant.data.grantId, provider: settings.provider, model: settings.model, apiKey: typeof settings.apiKey === "string" ? hashIdempotencyValue(settings.apiKey) : null };
    return runIdempotentMutation(context, request, "organization.ai_model.save", fingerprint, async () => {
      await consumeStepUpGrant(context, grant.data.grantId, "ai_model_manage");
      return noStoreJson({ settings: await saveAiModelSettings(context, settings, correlationId(request), getSecretBroker()) });
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// Removes the saved model and destroys its API key.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const context = await contextOrResponse(id);
    if (context instanceof Response) return context;
    await enforceRateLimit(`ai-model-settings:${context.userId}`, 10, 60_000, context.organizationId);
    const grant = grantSchema.safeParse(await request.json().catch(() => null));
    if (!grant.success) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    return runIdempotentMutation(context, request, "organization.ai_model.remove", { id, grantId: grant.data.grantId }, async () => {
      await consumeStepUpGrant(context, grant.data.grantId, "ai_model_manage");
      return noStoreJson({ result: await removeAiModelSettings(context, correlationId(request), getSecretBroker()) });
    });
  } catch (error) {
    return errorResponse(error);
  }
}
