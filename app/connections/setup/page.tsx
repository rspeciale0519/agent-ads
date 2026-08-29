import { redirect } from "next/navigation";
import { isOrganizationAccessError, requireOrganizationContext } from "../../../lib/auth/organization-context";
import ConnectionSetupForm from "./ConnectionSetupForm";

export const dynamic = "force-dynamic";

export default async function ConnectionSetupPage() {
  try { await requireOrganizationContext(); } catch (error) { if (isOrganizationAccessError(error)) { if (error.code === "AUTHENTICATION_REQUIRED") redirect("/auth"); if (error.code === "ORGANIZATION_SELECTION_REQUIRED") redirect("/organizations/select"); redirect("/access-pending"); } throw error; }
  return <main className="security-shell"><section className="security-card connection-setup-card"><span className="eyebrow">Account Connections</span><h1>Tell us which system needs access.</h1><p>Record the system, ownership, and non-secret identifiers. Authorization happens later through the provider or an official invitation.</p><ConnectionSetupForm /></section></main>;
}
