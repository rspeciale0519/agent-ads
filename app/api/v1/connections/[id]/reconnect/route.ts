import { contextOrResponse, correlationId, errorResponse, noStoreJson, requireSameOrigin, uuidPathParam } from "../../../../../../lib/api/http";
import { enforceRateLimit } from "../../../../../../lib/api/rate-limit";
import { providerAuthorizeSchema } from "../../../../../../lib/connections/contracts";
import { consumeStepUpGrant } from "../../../../../../lib/auth/step-up";
import { getConnectionDetail, startOAuth } from "../../../../../../lib/connections/service";
import { OAUTH_BROWSER_COOKIE } from "../../../../../../lib/connections/oauth";
import { runIdempotentMutation } from "../../../../../../lib/api/idempotency";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    await enforceRateLimit(`connection-reconnect:${context.userId}`, 10, 60_000, context.organizationId);
    const parsed = providerAuthorizeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    const body = parsed.data;
    if (!body.grantId) return noStoreJson({ error: "STEP_UP_REQUIRED" }, { status: 403 });
    return runIdempotentMutation(context, request, "connection.reconnect", { id, input: body }, async () => {
      await consumeStepUpGrant(context, body.grantId!, "connection_reconnect");
      const connection = await getConnectionDetail(context, id);
      const result = await startOAuth(context, { provider: connection.provider as import("../../../../../../lib/connections/contracts").ConnectionProvider, operation: "reconnect", connectionId: id, returnPath: body.returnPath, redirectUri: new URL(`/api/v1/connections/${connection.provider}/callback`, request.url).toString(), correlationId: correlationId(request) });
      const response = noStoreJson({ authorizationUrl: result.authorizationUrl, connectionId: result.connectionId, transactionId: result.transactionId });
      response.cookies.set(OAUTH_BROWSER_COOKIE, result.browserTransactionId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
      return response;
    });
  } catch (error) {
    return errorResponse(error);
  }
}
