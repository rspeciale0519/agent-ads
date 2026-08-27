import { connectionProviderSchema, providerAuthorizeSchema } from "../../../../../../lib/connections/contracts";
import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin } from "../../../../../../lib/api/http";
import { consumeStepUpGrant } from "../../../../../../lib/auth/step-up";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { startOAuth } from "../../../../../../lib/connections/service";
import { OAUTH_BROWSER_COOKIE } from "../../../../../../lib/connections/oauth";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    await enforceRateLimit(`authorize:${context.userId}`, 10, 60_000, context.organizationId);
    const { id: rawProvider } = await params;
    const provider = connectionProviderSchema.parse(rawProvider);
    const parsed = providerAuthorizeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    if (!parsed.data.grantId) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    return runIdempotentMutation(context, request, "connection.authorize", { provider, input: parsed.data }, async () => {
      await consumeStepUpGrant(context, parsed.data.grantId!, "connection_authorize");
      const result = await startOAuth(context, { provider, operation: "authorize", requestId: parsed.data.requestId, connectionId: parsed.data.connectionId, returnPath: parsed.data.returnPath, redirectUri: new URL(`/api/v1/connections/${provider}/callback`, request.url).toString(), correlationId: correlationId(request) });
      const response = noStoreJson({ authorizationUrl: result.authorizationUrl, connectionId: result.connectionId, transactionId: result.transactionId });
      response.cookies.set(OAUTH_BROWSER_COOKIE, result.browserTransactionId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
      return response;
    });
  } catch (error) {
    return errorResponse(error);
  }
}
