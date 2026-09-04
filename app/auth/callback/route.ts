import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase-server";
import { safeAuthCallbackNext, SIGNUP_CALLBACK_NEXT } from "../../../lib/auth/redirects";

export const runtime = "nodejs";

function loginErrorResponse(origin: string) {
  const response = NextResponse.redirect(new URL("/auth?mode=login&error=link", origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const safeNext = safeAuthCallbackNext(requestUrl.searchParams.get("next"));
  if (requestUrl.searchParams.has("error")) return loginErrorResponse(requestUrl.origin);
  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginErrorResponse(requestUrl.origin);
    if (safeNext === SIGNUP_CALLBACK_NEXT) await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
