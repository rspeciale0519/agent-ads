import Link from "next/link";
import { redirect } from "next/navigation";
import { isOrganizationAccessError, requireOrganizationContext } from "../../../lib/auth/organization-context";
import DataLifecyclePanel from "./DataLifecyclePanel";

export const dynamic = "force-dynamic";

export default async function DataSettingsPage() {
  let context;
  try {
    context = await requireOrganizationContext();
  } catch (error) {
    if (isOrganizationAccessError(error)) {
      if (error.code === "AUTHENTICATION_REQUIRED") redirect("/auth");
      if (error.code === "ORGANIZATION_SELECTION_REQUIRED") redirect("/organizations/select");
      redirect("/access-pending");
    }
    throw error;
  }
  if (context.role !== "owner" && context.role !== "administrator") redirect("/dashboard");
  return <main className="workspace-shell">
    <header className="workspace-header"><div><span className="eyebrow">Data controls</span><h1>Export and offboarding</h1><p className="workspace-muted">Protected lifecycle controls for {context.organizationName}. Every action requires current MFA and an action-bound grant.</p></div><Link className="secondary-button" href="/dashboard">Dashboard</Link></header>
    <DataLifecyclePanel organizationId={context.organizationId} organizationName={context.organizationName} canOffboard={context.role === "owner"} />
  </main>;
}
