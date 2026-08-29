import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";
import { getSupabaseServer } from "../../lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return <OnboardingForm applicantId={user.id} applicantEmail={user.email ?? ""} />;
}
