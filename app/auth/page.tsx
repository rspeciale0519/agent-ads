import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";
import { getSupabaseServer } from "../../lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return <AuthForm />;
}
