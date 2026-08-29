import { NextResponse } from "next/server";
import { getAssuranceStatus, requireAal2 } from "../../../../../../lib/auth/assurance";
import { contextOrResponse, correlationId, errorResponse, noStoreResponse } from "../../../../../../lib/api/http";
import { connectionProviderSchema } from "../../../../../../lib/connections/contracts";
import { completeOAuth } from "../../../../../../lib/connections/service";
import { isBrowserTransactionId, OAUTH_BROWSER_COOKIE, OAuthError, safeReturnPath } from "../../../../../../lib/connections/oauth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestUrl = new URL(request.url);
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawProvider } = await params;
    const provider = connectionProviderSchema.parse(rawProvider);
    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    const browserTransactionId = (await cookies()).get(OAUTH_BROWSER_COOKIE)?.value;
    if (requestUrl.searchParams.get("error")) throw new OAuthError("OAUTH_DENIED");
    if (!code || !state) throw new OAuthError("OAUTH_CALLBACK_INVALID");
    if (!isBrowserTransactionId(browserTransactionId)) throw new OAuthError("OAUTH_BROWSER_TRANSACTION_INVALID");
    requireAal2(await getAssuranceStatus(context));
    const result = await completeOAuth(context, { provider, code, state, browserTransactionId, correlationId: correlationId(request) });
    const response = noStoreResponse(NextResponse.redirect(new URL(`${safeReturnPath(result.returnPath)}?connection=${encodeURIComponent(result.connectionId)}&status=${encodeURIComponent(result.state)}`, requestUrl.origin)));
    response.cookies.delete(OAUTH_BROWSER_COOKIE);
    return response;
  } catch (error) {
    const response = errorResponse(error); response.cookies.delete(OAUTH_BROWSER_COOKIE); return response;
  }
}
