import { redirect } from "next/navigation";
import { getSupabaseServer } from "../../../lib/supabase-server";
import MfaPanel from "./MfaPanel";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return <main className="security-shell"><section className="security-card"><span className="eyebrow">Application security</span><h1>Protect connection actions with MFA.</h1><p>MioDio MFA authenticates your access to this workspace. It is never a platform password, provider MFA code, or recovery code.</p><MfaPanel /></section></main>;
}
