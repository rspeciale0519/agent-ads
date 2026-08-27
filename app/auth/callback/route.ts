import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code) {
    const supabase = await getSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  const requestedNext = requestUrl.searchParams.get("next");
  const safeNext = requestedNext && ["/dashboard", "/onboarding", "/connections"].includes(requestedNext) ? requestedNext : "/dashboard";
  const response = NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
