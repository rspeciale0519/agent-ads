import { redirect } from "next/navigation";
import { getSupabaseServer } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  redirect("/ai-reach");
}
