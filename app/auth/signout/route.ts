import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase-server";

export const runtime = "nodejs";

// Logs the person out and sends them to the login page. It's a POST from the
// "Log out" button's form, and only accepted from this site's own pages, so
// another website can't silently log someone out.
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== requestUrl.origin) || fetchSite === "cross-site") {
    return new NextResponse(null, { status: 403 });
  }
  // Clears the session on Supabase and removes the login cookies.
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  // 303 turns the POST into a normal page visit to the login screen.
  const response = NextResponse.redirect(new URL("/auth?mode=login&signedout=1", requestUrl.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
