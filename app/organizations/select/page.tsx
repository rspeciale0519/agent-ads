import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, listOrganizationChoices } from "../../../lib/auth/organization-context";
import OrganizationSelector from "./OrganizationSelector";

export const dynamic = "force-dynamic";

export default async function OrganizationSelectPage() {
  const authenticated = await getAuthenticatedUser();
  if (!authenticated) redirect("/auth");
  const choices = await listOrganizationChoices();
  return <main className="access-pending-shell"><section className="access-pending-card"><span className="eyebrow">Choose a workspace</span><h1>Select an organization to continue.</h1><p>Your account belongs to more than one organization. Choose one to set the server-validated workspace cookie.</p><OrganizationSelector choices={choices} /><div className="access-pending-actions"><Link className="text-link" href="/auth">Sign out →</Link></div></section></main>;
}
