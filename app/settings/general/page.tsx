import Link from "next/link";
import { redirect } from "next/navigation";
import { isOrganizationAccessError, requireOrganizationContext } from "../../../lib/auth/organization-context";
import { MAX_STALE_UPLOAD_DAYS, MIN_STALE_UPLOAD_DAYS, readOrganizationSettings } from "../../../lib/organizations/settings";
import { AI_MODEL_PROVIDERS } from "../../../lib/ai-reach/model-providers";
import { readAiModelSettings } from "../../../lib/organizations/ai-model-settings";
import AiModelPanel from "./AiModelPanel";
import GeneralSettingsPanel from "./GeneralSettingsPanel";

export const dynamic = "force-dynamic";

// Organization settings that owners and administrators can change.
export default async function GeneralSettingsPage() {
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
  const [settings, aiModel] = await Promise.all([readOrganizationSettings(context), readAiModelSettings(context)]);
  return <main className="workspace-shell">
    <header className="workspace-header"><div><span className="eyebrow">Settings</span><h1>Workspace settings</h1><p className="workspace-muted">Settings for {context.organizationName}. Saving a change requires current 2-step login.</p></div><Link className="secondary-button" href="/ai-reach">AI Reach</Link></header>
    <GeneralSettingsPanel organizationId={context.organizationId} staleUploadDays={settings.staleUploadDays} minDays={MIN_STALE_UPLOAD_DAYS} maxDays={MAX_STALE_UPLOAD_DAYS} />
    <AiModelPanel organizationId={context.organizationId} providers={AI_MODEL_PROVIDERS.map(({ id, label, exampleModel }) => ({ id, label, exampleModel }))} saved={aiModel} />
  </main>;
}
