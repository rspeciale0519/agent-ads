import OnboardingForm from "./onboarding/OnboardingForm";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return <OnboardingForm applicantId={user.id} applicantEmail={user.email || ""} />;
}
