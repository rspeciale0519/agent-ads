import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";
import { getSupabaseServer } from "../../lib/supabase-server";

export const dynamic = "force-dynamic";

type AuthPageProps = { searchParams?: Promise<{ mode?: string; verified?: string; reset?: string; error?: string }> };

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const params = searchParams ? await searchParams : {};
  const initialMode = params.mode === "login" ? "login" : "signup";
  const initialNotice = params.verified === "1"
    ? "Your email is confirmed. Sign in to continue."
    : params.reset === "success"
      ? "Your password was changed. Sign in with your new password."
      : "";
  const initialError = params.error === "link" ? "That confirmation link is invalid or expired. Request a new link and try again." : "";
  return <AuthForm initialMode={initialMode} initialNotice={initialNotice} initialError={initialError} />;
}
